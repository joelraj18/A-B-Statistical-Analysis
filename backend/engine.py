"""
Pure statistical routines for the A/B experimentation engine.

Every function takes plain Python numbers / sequences and returns plain
``dict``s of native ``float`` / ``bool`` values (never NumPy scalars, which
FastAPI cannot always serialise). Invalid input raises ``ValueError`` with a
user-facing message; the API layer maps that to HTTP 400.

The formulas intentionally mirror ``lib/stats/abEngine.ts`` so the browser
fallback and this service agree to floating-point precision.
"""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np
from scipy import stats
from statsmodels.stats.proportion import proportion_confint, proportions_ztest

#: Kohavi et al. recommend a strict SRM threshold so alarms are rarely false.
SRM_ALPHA = 0.001


def _z_critical(confidence: float) -> float:
    return float(stats.norm.ppf(1 - (1 - confidence) / 2))


def _relative_interval(
    mean_a: float, se_a: float, mean_b: float, se_b: float, z: float
) -> tuple[float | None, list[float] | None]:
    """Delta-method CI for the relative lift (B - A) / A."""
    if mean_a == 0:
        return None, None
    uplift = (mean_b - mean_a) / mean_a
    var = se_b**2 / mean_a**2 + mean_b**2 * se_a**2 / mean_a**4
    half = z * math.sqrt(var)
    return uplift, [uplift - half, uplift + half]


# ---------------------------------------------------------------------------
# Sample ratio mismatch
# ---------------------------------------------------------------------------


def srm_check(n_a: int, n_b: int, expected_share_a: float = 0.5) -> dict:
    """Chi-square goodness-of-fit test on the assignment counts (1 df)."""
    total = n_a + n_b
    expected = [total * expected_share_a, total * (1 - expected_share_a)]
    chi2, p_value = stats.chisquare([n_a, n_b], f_exp=expected)
    return {
        "chi_square": float(chi2),
        "p_value": float(p_value),
        "expected_share_a": float(expected_share_a),
        "observed_share_a": n_a / total,
        "detected": bool(p_value < SRM_ALPHA),
    }


# ---------------------------------------------------------------------------
# Binary metrics: two-proportion Z-test
# ---------------------------------------------------------------------------


def two_proportion_z_test(
    visitors_a: int,
    conversions_a: int,
    visitors_b: int,
    conversions_b: int,
    confidence: float = 0.95,
    expected_share_a: float = 0.5,
) -> dict:
    """
    Two-tailed two-proportion Z-test.

    The test statistic uses the pooled SE under H0; the confidence interval for
    the difference uses the unpooled SE because it does not assume H0.
    """
    if conversions_a > visitors_a or conversions_b > visitors_b:
        raise ValueError("Conversions cannot exceed visitors.")

    rate_a = conversions_a / visitors_a
    rate_b = conversions_b / visitors_b
    diff = rate_b - rate_a

    pooled = (conversions_a + conversions_b) / (visitors_a + visitors_b)
    se_pooled = math.sqrt(pooled * (1 - pooled) * (1 / visitors_a + 1 / visitors_b))
    if se_pooled == 0:
        raise ValueError("Both arms have a 0% or 100% rate, so there is no variance to test.")

    # statsmodels' default (prop_var=False) is exactly the pooled-variance Z-test.
    z_score, p_value = proportions_ztest(
        count=[conversions_b, conversions_a],
        nobs=[visitors_b, visitors_a],
        alternative="two-sided",
    )

    se_a = math.sqrt(rate_a * (1 - rate_a) / visitors_a)
    se_b = math.sqrt(rate_b * (1 - rate_b) / visitors_b)
    se_unpooled = math.sqrt(se_a**2 + se_b**2)

    alpha = 1 - confidence
    z = _z_critical(confidence)
    uplift, ci_relative = _relative_interval(rate_a, se_a, rate_b, se_b, z)

    if se_unpooled > 0:
        prob_b_beats_a = float(stats.norm.cdf(diff / se_unpooled))
    else:
        prob_b_beats_a = 1.0 if diff > 0 else 0.0 if diff < 0 else 0.5

    def arm(successes: int, n: int, rate: float, se: float) -> dict:
        lo, hi = proportion_confint(successes, n, alpha=alpha, method="wilson")
        return {"estimate": rate, "se": se, "ci": [float(lo), float(hi)], "n": n}

    return {
        "kind": "binary",
        "confidence": confidence,
        "alpha": alpha,
        "rate_a": rate_a,
        "rate_b": rate_b,
        "absolute_diff": diff,
        "relative_uplift": uplift,
        "z_score": float(z_score),
        "z_critical": z,
        "p_value": float(p_value),
        "is_significant": bool(p_value < alpha),
        "se_pooled": se_pooled,
        "se_unpooled": se_unpooled,
        "ci_absolute": [diff - z * se_unpooled, diff + z * se_unpooled],
        "ci_relative": ci_relative,
        "prob_b_beats_a": prob_b_beats_a,
        "arms": {
            "a": arm(conversions_a, visitors_a, rate_a, se_a),
            "b": arm(conversions_b, visitors_b, rate_b, se_b),
        },
        "srm": srm_check(visitors_a, visitors_b, expected_share_a),
    }


# ---------------------------------------------------------------------------
# Continuous metrics: Welch's t-test
# ---------------------------------------------------------------------------


def welch_t_test(
    mean_a: float,
    sd_a: float,
    n_a: int,
    mean_b: float,
    sd_b: float,
    n_b: int,
    confidence: float = 0.95,
) -> dict:
    """Welch's unequal-variance t-test from summary statistics."""
    v_a = sd_a**2 / n_a
    v_b = sd_b**2 / n_b
    se = math.sqrt(v_a + v_b)
    if se == 0:
        raise ValueError("Both arms have zero variance, so there is nothing to test.")

    t_stat, p_value = stats.ttest_ind_from_stats(
        mean_b, sd_b, n_b, mean_a, sd_a, n_a, equal_var=False
    )
    df = (v_a + v_b) ** 2 / (v_a**2 / (n_a - 1) + v_b**2 / (n_b - 1))
    diff = mean_b - mean_a
    alpha = 1 - confidence
    t_crit = float(stats.t.ppf(1 - alpha / 2, df))
    uplift, ci_relative = _relative_interval(
        mean_a, math.sqrt(v_a), mean_b, math.sqrt(v_b), _z_critical(confidence)
    )

    def arm(mean: float, sd: float, n: int) -> dict:
        arm_se = sd / math.sqrt(n)
        t = float(stats.t.ppf(1 - alpha / 2, n - 1))
        return {"estimate": mean, "se": arm_se, "ci": [mean - t * arm_se, mean + t * arm_se], "n": n}

    return {
        "kind": "continuous",
        "confidence": confidence,
        "alpha": alpha,
        "mean_a": mean_a,
        "mean_b": mean_b,
        "absolute_diff": diff,
        "relative_uplift": uplift,
        "t_stat": float(t_stat),
        "df": df,
        "t_critical": t_crit,
        "se": se,
        "p_value": float(p_value),
        "is_significant": bool(p_value < alpha),
        "ci_absolute": [diff - t_crit * se, diff + t_crit * se],
        "ci_relative": ci_relative,
        "prob_b_beats_a": float(stats.t.cdf(t_stat, df)),
        "arms": {"a": arm(mean_a, sd_a, n_a), "b": arm(mean_b, sd_b, n_b)},
    }


def _welch_from_samples(a: np.ndarray, b: np.ndarray, confidence: float) -> dict:
    return welch_t_test(
        float(np.mean(a)),
        float(np.std(a, ddof=1)),
        int(a.size),
        float(np.mean(b)),
        float(np.std(b, ddof=1)),
        int(b.size),
        confidence,
    )


# ---------------------------------------------------------------------------
# Sample size & power
# ---------------------------------------------------------------------------


def required_sample_size(baseline_rate: float, mde: float, power: float = 0.8, alpha: float = 0.05) -> dict:
    """
    Users per variant for a two-sided two-proportion test:

        n = (z_{a/2} sqrt(2 p(1-p)) + z_b sqrt(p1(1-p1) + p2(1-p2)))^2 / (p2 - p1)^2
    """
    p1 = baseline_rate
    p2 = p1 * (1 + mde)
    if not 0 < p2 < 1:
        raise ValueError("This MDE pushes the variant rate outside 0-100%.")

    p_bar = (p1 + p2) / 2
    z_alpha = float(stats.norm.ppf(1 - alpha / 2))
    z_beta = float(stats.norm.ppf(power))
    numerator = (
        z_alpha * math.sqrt(2 * p_bar * (1 - p_bar)) + z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
    ) ** 2
    # Guard against floating-point noise pushing an exact integer up by one.
    per_variant = math.ceil(numerator / (p2 - p1) ** 2 - 1e-9)

    return {
        "per_variant": per_variant,
        "total": per_variant * 2,
        "control_rate": p1,
        "variant_rate": p2,
        "absolute_effect": p2 - p1,
        "z_alpha": z_alpha,
        "z_beta": z_beta,
    }


# ---------------------------------------------------------------------------
# CUPED variance reduction
# ---------------------------------------------------------------------------


def cuped(
    y_control: Sequence[float],
    x_control: Sequence[float],
    y_variant: Sequence[float],
    x_variant: Sequence[float],
    confidence: float = 0.95,
) -> dict:
    """
    CUPED (Deng, Xu, Kohavi & Walker, WSDM 2013).

        Y_cv = Y - theta (X - mean(X)),   theta = Cov(X, Y) / Var(X)

    theta is estimated on pooled data so it is independent of assignment, which
    keeps the adjusted treatment effect unbiased.
    """
    yc, xc = np.asarray(y_control, float), np.asarray(x_control, float)
    yv, xv = np.asarray(y_variant, float), np.asarray(x_variant, float)
    if yc.size != xc.size or yv.size != xv.size:
        raise ValueError("Metric and covariate arrays must have the same length in each arm.")
    if yc.size < 2 or yv.size < 2:
        raise ValueError("Each arm needs at least 2 users.")
    if not all(np.isfinite(arr).all() for arr in (yc, xc, yv, xv)):
        raise ValueError("All values must be finite numbers.")

    x_all = np.concatenate([xc, xv])
    y_all = np.concatenate([yc, yv])
    cov = np.cov(x_all, y_all, ddof=1)
    var_x, cov_xy, var_y = float(cov[0, 0]), float(cov[0, 1]), float(cov[1, 1])
    theta = cov_xy / var_x if var_x > 0 else 0.0
    correlation = cov_xy / math.sqrt(var_x * var_y) if var_x > 0 and var_y > 0 else 0.0
    mu_x = float(np.mean(x_all))

    yc_cv = yc - theta * (xc - mu_x)
    yv_cv = yv - theta * (xv - mu_x)

    original = _welch_from_samples(yc, yv, confidence)
    adjusted = _welch_from_samples(yc_cv, yv_cv, confidence)

    def reduction(before: float, after: float) -> float:
        return 1 - after / before if before > 0 else 0.0

    return {
        "theta": theta,
        "correlation": correlation,
        "original": original,
        "adjusted": adjusted,
        "variance_reduction": {
            "control": reduction(float(np.var(yc, ddof=1)), float(np.var(yc_cv, ddof=1))),
            "variant": reduction(float(np.var(yv, ddof=1)), float(np.var(yv_cv, ddof=1))),
            "estimator": reduction(original["se"] ** 2, adjusted["se"] ** 2),
        },
    }


# ---------------------------------------------------------------------------
# Advanced diagnostics
# ---------------------------------------------------------------------------


def _effect(diff: float, se: float, confidence: float) -> dict:
    z = _z_critical(confidence)
    if se > 0:
        p_value = float(min(1.0, 2 * stats.norm.sf(abs(diff / se))))
    else:
        p_value = 1.0 if diff == 0 else 0.0
    return {
        "absolute_diff": diff,
        "se": se,
        "ci_absolute": [diff - z * se, diff + z * se],
        "p_value": p_value,
        "is_significant": bool(p_value < 1 - confidence),
    }


def _compare(a: dict, b: dict, confidence: float) -> dict:
    """Z-test between two groups whose sizes are not meant to match (no SRM alarm)."""
    return two_proportion_z_test(
        a["visitors"],
        a["conversions"],
        b["visitors"],
        b["conversions"],
        confidence,
        expected_share_a=a["visitors"] / (a["visitors"] + b["visitors"]),
    )


def segment_analysis(segments: Sequence[dict], confidence: float = 0.95) -> dict:
    """Per-segment Z-tests, a stratified estimate and a Simpson's-paradox check."""
    if len(segments) < 2:
        raise ValueError("Add at least two segments.")
    keys = ("visitors_a", "conversions_a", "visitors_b", "conversions_b")
    totals = {k: sum(s[k] for s in segments) for k in keys}
    pooled = two_proportion_z_test(*(totals[k] for k in keys), confidence)
    n = totals["visitors_a"] + totals["visitors_b"]

    rows = []
    diff = 0.0
    variance = 0.0
    for s in segments:
        if not str(s["name"]).strip():
            raise ValueError("Every segment needs a name.")
        result = two_proportion_z_test(*(s[k] for k in keys), confidence)
        w = (s["visitors_a"] + s["visitors_b"]) / n
        diff += w * result["absolute_diff"]
        variance += w * w * result["se_unpooled"] ** 2
        rows.append(
            {
                "name": s["name"],
                "result": result,
                "share_a": s["visitors_a"] / totals["visitors_a"],
                "share_b": s["visitors_b"] / totals["visitors_b"],
            }
        )

    table = np.array([[s["visitors_a"], s["visitors_b"]] for s in segments], dtype=float)
    chi2, mix_p, dof, _ = stats.chi2_contingency(table, correction=False)

    pooled_sign = np.sign(pooled["absolute_diff"])
    simpsons = bool(pooled_sign != 0 and all(np.sign(r["result"]["absolute_diff"]) == -pooled_sign for r in rows))

    return {
        "pooled": pooled,
        "segments": rows,
        "stratified": _effect(diff, math.sqrt(variance), confidence),
        "mix_imbalance": {"chi_square": float(chi2), "df": int(dof), "p_value": float(mix_p), "detected": bool(mix_p < 0.001)},
        "simpsons_paradox": simpsons,
    }


def robust_analysis(
    values_a: Sequence[float],
    values_b: Sequence[float],
    confidence: float = 0.95,
    winsorize_percentile: float = 0.99,
    top_k: int = 3,
) -> dict:
    """Skew and top-k concentration checks, then Welch's test after capping the upper tail."""
    a = np.asarray(values_a, float)
    b = np.asarray(values_b, float)
    if a.size < 2 or b.size < 2:
        raise ValueError("Each arm needs at least 2 users.")
    if not (np.isfinite(a).all() and np.isfinite(b).all()):
        raise ValueError("All values must be finite numbers.")

    raw = _welch_from_samples(a, b, confidence)
    pooled = np.concatenate([a, b])
    cap = float(np.quantile(pooled, winsorize_percentile))
    winsorized = _welch_from_samples(np.minimum(a, cap), np.minimum(b, cap), confidence)

    mean_a = float(np.mean(a))
    total_lift = float(np.sum(b)) - mean_a * b.size
    top = np.sort(b)[::-1][:top_k]
    top_lift = float(np.sum(top - mean_a))
    top_share = top_lift / total_lift if total_lift > 0 else None

    return {
        "raw": raw,
        "winsorized": winsorized,
        "cap": cap,
        "skewness": float(stats.skew(pooled, bias=True)),
        "top_k_share": top_share,
        "top_values": [float(v) for v in top],
        "outlier_driven": bool(raw["is_significant"] and (not winsorized["is_significant"] or (top_share or 0) > 0.5)),
    }


def trend_analysis(days: Sequence[dict], confidence: float = 0.95, learning_days: int = 7) -> dict:
    """Daily lift, a weighted trend in the daily difference, and pre/post learning-window tests."""
    if len(days) < 3:
        raise ValueError("Add at least 3 days of data.")
    if not 1 <= learning_days < len(days):
        raise ValueError("The learning period must leave at least one day to analyse.")
    keys = ("visitors_a", "conversions_a", "visitors_b", "conversions_b")
    z = _z_critical(confidence)

    daily = []
    for i, d in enumerate(days):
        r = two_proportion_z_test(*(d[k] for k in keys), confidence)
        uplift, ci_rel = _relative_interval(r["rate_a"], r["arms"]["a"]["se"], r["rate_b"], r["arms"]["b"]["se"], z)
        daily.append({"day": i + 1, "absolute_diff": r["absolute_diff"], "se": r["se_unpooled"], "relative_uplift": uplift, "ci_relative": ci_rel})

    usable = [d for d in daily if d["se"] > 0]
    if len(usable) < 3:
        raise ValueError("At least 3 days need variance to estimate a trend.")
    x = np.array([d["day"] for d in usable], float)
    y = np.array([d["absolute_diff"] for d in usable], float)
    w = 1 / np.array([d["se"] for d in usable], float) ** 2
    x_bar = np.sum(w * x) / np.sum(w)
    y_bar = np.sum(w * y) / np.sum(w)
    sxx = float(np.sum(w * (x - x_bar) ** 2))
    slope = float(np.sum(w * (x - x_bar) * (y - y_bar)) / sxx)
    slope_se = math.sqrt(1 / sxx)
    slope_p = float(min(1.0, 2 * stats.norm.sf(abs(slope / slope_se))))

    def agg(rows: Sequence[dict]) -> dict:
        return two_proportion_z_test(*(sum(r[k] for r in rows) for k in keys), confidence)

    early, post, overall = agg(days[:learning_days]), agg(days[learning_days:]), agg(days)
    # Classify on the fitted effect at the first day: users first dislike
    # (primacy) or over-engage with (novelty) a change, then the trend reverses.
    start = float(y_bar + slope * (daily[0]["day"] - x_bar))
    pattern = "stable"
    if slope_p < 1 - confidence:
        if start < 0 and slope > 0:
            pattern = "primacy"
        elif start > 0 and slope < 0:
            pattern = "novelty"

    return {
        "days": [{k: d[k] for k in ("day", "absolute_diff", "relative_uplift", "ci_relative")} for d in daily],
        "slope": slope,
        "slope_se": slope_se,
        "slope_p_value": slope_p,
        "pattern": pattern,
        "early": early,
        "post": post,
        "overall": overall,
    }


def interference_check(baseline: dict, control: dict, treatment: dict, confidence: float = 0.95) -> dict:
    """SUTVA check: did control degrade versus its own baseline while the test ran?"""
    naive = _compare(control, treatment, confidence)
    control_shift = _compare(baseline, control, confidence)
    global_ = _compare(baseline, treatment, confidence)
    share = None
    if naive["absolute_diff"] > 0:
        share = min(1.0, max(0.0, -control_shift["absolute_diff"] / naive["absolute_diff"]))
    return {
        "naive": naive,
        "control_shift": control_shift,
        "global": global_,
        "spillover": bool(control_shift["is_significant"] and control_shift["absolute_diff"] < 0),
        "cannibalized_share": share,
    }


def switchback_analysis(blocks: Sequence[dict], confidence: float = 0.95) -> dict:
    """Welch's test on time-block means from a switchback design."""
    a = np.array([b["value"] for b in blocks if b["arm"] == "A"], float)
    b = np.array([b["value"] for b in blocks if b["arm"] == "B"], float)
    if a.size < 2 or b.size < 2:
        raise ValueError("Each algorithm needs at least 2 time blocks.")
    return {"result": _welch_from_samples(a, b, confidence), "blocks_a": int(a.size), "blocks_b": int(b.size)}
