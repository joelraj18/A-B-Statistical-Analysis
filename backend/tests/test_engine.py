import json
import math

import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy import stats

import engine
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


def test_binary_uses_pooled_se_for_test_and_unpooled_for_ci():
    res = engine.two_proportion_z_test(25_000, 3_500, 25_000, 3_850)
    pooled = 7_350 / 50_000
    se_pooled = math.sqrt(pooled * (1 - pooled) * (2 / 25_000))
    assert res["z_score"] == pytest.approx((0.154 - 0.14) / se_pooled, rel=1e-12)
    assert res["p_value"] == pytest.approx(2 * stats.norm.sf(abs(res["z_score"])), rel=1e-12)
    z = stats.norm.ppf(0.975)
    assert res["ci_absolute"][1] - res["absolute_diff"] == pytest.approx(z * res["se_unpooled"], rel=1e-12)
    assert res["is_significant"] is True
    assert isinstance(res["is_significant"], bool)


def test_binary_extreme_z_does_not_underflow_to_zero_via_cancellation():
    res = engine.two_proportion_z_test(100_000, 10_000, 100_000, 13_000)
    assert 0 < res["p_value"] < 1e-80


def test_binary_zero_baseline_returns_null_uplift():
    res = engine.two_proportion_z_test(500, 0, 520, 9)
    assert res["relative_uplift"] is None
    assert res["ci_relative"] is None


def test_binary_zero_variance_is_rejected():
    with pytest.raises(ValueError):
        engine.two_proportion_z_test(100, 0, 100, 0)


def test_srm_detects_skewed_split():
    assert engine.srm_check(50_000, 48_000)["detected"] is True
    assert engine.srm_check(50_000, 49_900)["detected"] is False


def test_welch_matches_scipy_and_has_correct_sign():
    res = engine.welch_t_test(10.0, 2.0, 12, 12.5, 5.0, 9)
    t, p = stats.ttest_ind_from_stats(12.5, 5.0, 9, 10.0, 2.0, 12, equal_var=False)
    assert res["t_stat"] == pytest.approx(t)
    assert res["p_value"] == pytest.approx(p)
    assert res["t_stat"] > 0  # B > A gives a positive statistic


def test_sample_size_matches_closed_form():
    res = engine.required_sample_size(0.2, 0.05)
    p1, p2 = 0.2, 0.21
    pbar = (p1 + p2) / 2
    n = (stats.norm.ppf(0.975) * math.sqrt(2 * pbar * (1 - pbar)) + stats.norm.ppf(0.8) * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2
    assert res["per_variant"] == math.ceil(n)
    assert res["total"] == 2 * res["per_variant"]


def test_sample_size_rejects_rate_above_one():
    with pytest.raises(ValueError):
        engine.required_sample_size(0.9, 0.2)


def test_cuped_reduces_variance_and_keeps_effect_direction():
    rng = np.random.default_rng(7)
    n = 4_000
    xc, xv = rng.normal(40, 15, n), rng.normal(40, 15, n)
    yc = 5 + 0.9 * xc + rng.normal(0, 6, n)
    yv = 5 + 0.9 * xv + 1.0 + rng.normal(0, 6, n)
    res = engine.cuped(yc, xc, yv, xv)
    assert res["variance_reduction"]["estimator"] > 0.7
    assert res["adjusted"]["absolute_diff"] > 0
    assert res["adjusted"]["t_stat"] > 0
    assert res["adjusted"]["p_value"] < res["original"]["p_value"]
    assert res["theta"] == pytest.approx(0.9, abs=0.05)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------


def test_health():
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert "scipy" in body["engine"]


def test_analyze_endpoint_serialises_native_types():
    payload = {"visitors_a": 25000, "conversions_a": 3500, "visitors_b": 25000, "conversions_b": 3850}
    for path in ("/api/v1/analyze", "/api/v1/analyze/binary"):
        res = client.post(path, json=payload)
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["is_significant"] is True
        assert body["srm"]["detected"] is False
        json.dumps(body)


def test_analyze_rejects_conversions_above_visitors():
    res = client.post(
        "/api/v1/analyze",
        json={"visitors_a": 100, "conversions_a": 101, "visitors_b": 100, "conversions_b": 5},
    )
    assert res.status_code == 422
    assert "conversions_a cannot exceed visitors_a" in res.text


def test_analyze_zero_variance_returns_400():
    res = client.post(
        "/api/v1/analyze",
        json={"visitors_a": 100, "conversions_a": 0, "visitors_b": 100, "conversions_b": 0},
    )
    assert res.status_code == 400
    assert "no variance" in res.json()["detail"]


def test_sample_size_endpoint():
    res = client.post("/api/v1/sample-size", json={"baseline_rate": 0.15, "mde": 0.05})
    assert res.status_code == 200
    assert res.json()["per_variant"] > 0
    assert client.post("/api/v1/sample-size", json={"baseline_rate": 0.15, "mde": 0}).status_code == 422


def test_continuous_endpoint():
    res = client.post(
        "/api/v1/analyze/continuous",
        json={"mean_a": 42.1, "sd_a": 18.3, "n_a": 5000, "mean_b": 43.0, "sd_b": 19.9, "n_b": 5100},
    )
    assert res.status_code == 200
    assert res.json()["kind"] == "continuous"


def test_cuped_endpoint_rejects_length_mismatch():
    res = client.post(
        "/api/v1/analyze/cuped",
        json={"y_control": [1, 2, 3], "x_control": [1, 2], "y_variant": [1, 2], "x_variant": [1, 2]},
    )
    assert res.status_code == 422


def test_cors_preflight_allows_configured_origin():
    res = client.options(
        "/api/v1/analyze",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "http://localhost:3000"
