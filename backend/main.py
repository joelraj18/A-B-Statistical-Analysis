"""
A/B Experimentation Engine — FastAPI service.

Run locally:
    cd backend && uvicorn main:app --reload

Interactive docs at http://localhost:8000/docs
"""

from __future__ import annotations

import os

import numpy as np
import scipy
import statsmodels
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import engine
from schemas import (
    BinaryAnalysisRequest,
    BinaryAnalysisResponse,
    ContinuousAnalysisRequest,
    ContinuousAnalysisResponse,
    CupedRequest,
    CupedResponse,
    HealthResponse,
    InterferenceRequest,
    InterferenceResponse,
    RobustRequest,
    RobustResponse,
    SampleSizeRequest,
    SampleSizeResponse,
    SegmentRequest,
    SegmentResponse,
    SwitchbackRequest,
    SwitchbackResponse,
    TrendRequest,
    TrendResponse,
)

VERSION = "3.0.0"

app = FastAPI(
    title="A/B Experimentation Engine",
    description="Exact p-values, sample sizing, SRM checks and CUPED variance reduction backed by SciPy and statsmodels.",
    version=VERSION,
)

# Browsers reject `Access-Control-Allow-Origin: *` together with credentials, so
# the origin list is explicit and credentials are not needed (the API is stateless).
_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=600,
)


@app.exception_handler(ValueError)
async def _value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "version": VERSION,
        "engine": {"numpy": np.__version__, "scipy": scipy.__version__, "statsmodels": statsmodels.__version__},
    }


v1 = APIRouter(prefix="/api/v1", tags=["statistics"])


@v1.post("/sample-size", response_model=SampleSizeResponse)
def sample_size(req: SampleSizeRequest) -> dict:
    """Users required per variant for a two-sided two-proportion test."""
    return engine.required_sample_size(req.baseline_rate, req.mde, req.power, req.alpha)


@v1.post("/analyze", response_model=BinaryAnalysisResponse)
@v1.post("/analyze/binary", response_model=BinaryAnalysisResponse, include_in_schema=False)
def analyze_binary(req: BinaryAnalysisRequest) -> dict:
    """Two-proportion Z-test for binary metrics (conversion rate, CTR) with an SRM check."""
    return engine.two_proportion_z_test(
        req.visitors_a,
        req.conversions_a,
        req.visitors_b,
        req.conversions_b,
        req.confidence,
        req.expected_share_a,
    )


@v1.post("/analyze/continuous", response_model=ContinuousAnalysisResponse)
def analyze_continuous(req: ContinuousAnalysisRequest) -> dict:
    """Welch's t-test for continuous metrics (revenue per user, session length) from summary stats."""
    return engine.welch_t_test(req.mean_a, req.sd_a, req.n_a, req.mean_b, req.sd_b, req.n_b, req.confidence)


@v1.post("/analyze/cuped", response_model=CupedResponse)
def analyze_cuped(req: CupedRequest) -> dict:
    """CUPED variance reduction followed by Welch's t-test on raw and adjusted metrics."""
    return engine.cuped(req.y_control, req.x_control, req.y_variant, req.x_variant, req.confidence)


@v1.post("/analyze/segments", response_model=SegmentResponse, tags=["diagnostics"])
def analyze_segments(req: SegmentRequest) -> dict:
    """Per-segment tests, stratified estimate, mix-shift check and Simpson's-paradox flag."""
    return engine.segment_analysis([s.model_dump() for s in req.segments], req.confidence)


@v1.post("/analyze/robust", response_model=RobustResponse, tags=["diagnostics"])
def analyze_robust(req: RobustRequest) -> dict:
    """Outlier concentration and Welch's test after Winsorizing the upper tail."""
    return engine.robust_analysis(req.values_a, req.values_b, req.confidence, req.winsorize_percentile, req.top_k)


@v1.post("/analyze/trend", response_model=TrendResponse, tags=["diagnostics"])
def analyze_trend(req: TrendRequest) -> dict:
    """Daily lift trend and primacy / novelty classification."""
    return engine.trend_analysis([d.model_dump() for d in req.days], req.confidence, req.learning_days)


@v1.post("/analyze/interference", response_model=InterferenceResponse, tags=["diagnostics"])
def analyze_interference(req: InterferenceRequest) -> dict:
    """SUTVA check comparing control against its own baseline."""
    return engine.interference_check(req.baseline.model_dump(), req.control.model_dump(), req.treatment.model_dump(), req.confidence)


@v1.post("/analyze/switchback", response_model=SwitchbackResponse, tags=["diagnostics"])
def analyze_switchback(req: SwitchbackRequest) -> dict:
    """Welch's test on time-block means from a switchback experiment."""
    return engine.switchback_analysis([b.model_dump() for b in req.blocks], req.confidence)


app.include_router(v1)
