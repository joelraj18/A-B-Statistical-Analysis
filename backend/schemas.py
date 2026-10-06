"""Pydantic v2 request/response models. Mirrored in ``types/api.ts``."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Confidence = Field(0.95, gt=0, lt=1, description="Two-sided confidence level (1 - alpha)")


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class SampleSizeRequest(BaseModel):
    baseline_rate: float = Field(..., gt=0, lt=1, description="Current conversion rate p1")
    mde: float = Field(..., gt=-1, description="Relative minimum detectable effect, e.g. 0.05 for +5%")
    power: float = Field(0.80, gt=0, lt=1, description="Statistical power (1 - beta)")
    alpha: float = Field(0.05, gt=0, lt=1, description="Two-sided significance level")

    @model_validator(mode="after")
    def _non_zero_effect(self) -> "SampleSizeRequest":
        if self.mde == 0:
            raise ValueError("mde must be non-zero")
        return self


class BinaryAnalysisRequest(BaseModel):
    visitors_a: int = Field(..., gt=0)
    conversions_a: int = Field(..., ge=0)
    visitors_b: int = Field(..., gt=0)
    conversions_b: int = Field(..., ge=0)
    confidence: float = Confidence
    expected_share_a: float = Field(0.5, gt=0, lt=1, description="Planned share of traffic in A (SRM check)")

    @model_validator(mode="after")
    def _conversions_within_visitors(self) -> "BinaryAnalysisRequest":
        if self.conversions_a > self.visitors_a:
            raise ValueError("conversions_a cannot exceed visitors_a")
        if self.conversions_b > self.visitors_b:
            raise ValueError("conversions_b cannot exceed visitors_b")
        return self


class ContinuousAnalysisRequest(BaseModel):
    mean_a: float
    sd_a: float = Field(..., ge=0)
    n_a: int = Field(..., ge=2)
    mean_b: float
    sd_b: float = Field(..., ge=0)
    n_b: int = Field(..., ge=2)
    confidence: float = Confidence


class CupedRequest(BaseModel):
    y_control: list[float] = Field(..., min_length=2, description="In-experiment metric (Control)")
    x_control: list[float] = Field(..., min_length=2, description="Pre-experiment covariate (Control)")
    y_variant: list[float] = Field(..., min_length=2, description="In-experiment metric (Variant)")
    x_variant: list[float] = Field(..., min_length=2, description="Pre-experiment covariate (Variant)")
    confidence: float = Confidence

    @model_validator(mode="after")
    def _matching_lengths(self) -> "CupedRequest":
        if len(self.y_control) != len(self.x_control):
            raise ValueError("y_control and x_control must have the same length")
        if len(self.y_variant) != len(self.x_variant):
            raise ValueError("y_variant and x_variant must have the same length")
        return self


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ArmEstimate(_Model):
    estimate: float
    se: float
    ci: tuple[float, float]
    n: int


class Arms(_Model):
    a: ArmEstimate
    b: ArmEstimate


class SrmResult(_Model):
    chi_square: float
    p_value: float
    expected_share_a: float
    observed_share_a: float
    detected: bool


class _Comparison(_Model):
    confidence: float
    alpha: float
    absolute_diff: float
    relative_uplift: float | None
    p_value: float
    is_significant: bool
    ci_absolute: tuple[float, float]
    ci_relative: tuple[float, float] | None
    prob_b_beats_a: float
    arms: Arms


class BinaryAnalysisResponse(_Comparison):
    kind: Literal["binary"]
    rate_a: float
    rate_b: float
    z_score: float
    z_critical: float
    se_pooled: float
    se_unpooled: float
    srm: SrmResult


class ContinuousAnalysisResponse(_Comparison):
    kind: Literal["continuous"]
    mean_a: float
    mean_b: float
    t_stat: float
    df: float
    t_critical: float
    se: float


class SampleSizeResponse(_Model):
    per_variant: int
    total: int
    control_rate: float
    variant_rate: float
    absolute_effect: float
    z_alpha: float
    z_beta: float


class VarianceReduction(_Model):
    control: float
    variant: float
    estimator: float


class CupedResponse(_Model):
    theta: float
    correlation: float
    original: ContinuousAnalysisResponse
    adjusted: ContinuousAnalysisResponse
    variance_reduction: VarianceReduction


class HealthResponse(_Model):
    status: Literal["ok"]
    version: str
    engine: dict[str, str]
