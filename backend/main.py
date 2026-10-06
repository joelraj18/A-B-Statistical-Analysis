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
    SampleSizeRequest,
    SampleSizeResponse,
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


app.include_router(v1)
