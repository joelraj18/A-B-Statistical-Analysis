"""
Generates reference values from SciPy for the TypeScript parity tests.

    cd backend && python scripts/gen_vectors.py

Writes ../tests/fixtures/scipy_vectors.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import engine  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "scipy_vectors.json"


def main() -> None:
    xs = [-38.0, -12.5, -8.0, -5.5, -3.0, -1.96, -1.0, -0.3, 0.0, 0.25, 0.6744, 0.7, 1.645, 2.5, 4.0, 5.7, 8.0, 12.0]
    ps = [1e-300, 1e-20, 1e-10, 1e-5, 0.001, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.975, 0.99, 0.999, 1 - 1e-10]
    t_cases = [(t, df) for df in (1, 2.5, 5, 10, 29.7, 100, 1000, 48_000) for t in (-6.0, -2.0, -0.5, 0.0, 0.8, 1.96, 3.5, 10.0)]
    t_ppf_cases = [(p, df) for df in (1, 3, 9.4, 30, 250, 10_000) for p in (0.0005, 0.025, 0.1, 0.5, 0.8, 0.95, 0.975, 0.995)]

    binary_cases = [
        dict(visitors_a=25_000, conversions_a=3_500, visitors_b=25_000, conversions_b=3_850, confidence=0.95),
        dict(visitors_a=1_000, conversions_a=100, visitors_b=1_000, conversions_b=98, confidence=0.9),
        dict(visitors_a=50_000, conversions_a=1_250, visitors_b=48_900, conversions_b=1_140, confidence=0.99),
        dict(visitors_a=500, conversions_a=0, visitors_b=520, conversions_b=9, confidence=0.95),
        dict(visitors_a=10_000, conversions_a=1_000, visitors_b=10_500, conversions_b=1_100, confidence=0.8),
    ]
    continuous_cases = [
        dict(mean_a=42.1, sd_a=18.3, n_a=5_000, mean_b=43.0, sd_b=19.9, n_b=5_100, confidence=0.95),
        dict(mean_a=10.0, sd_a=2.0, n_a=12, mean_b=12.5, sd_b=5.0, n_b=9, confidence=0.9),
        dict(mean_a=3.2, sd_a=0.9, n_a=800, mean_b=3.1, sd_b=1.1, n_b=760, confidence=0.99),
    ]
    sample_cases = [
        dict(baseline_rate=0.2, mde=0.05, power=0.8, alpha=0.05),
        dict(baseline_rate=0.15, mde=0.05, power=0.9, alpha=0.05),
        dict(baseline_rate=0.03, mde=0.1, power=0.8, alpha=0.01),
        dict(baseline_rate=0.5, mde=-0.04, power=0.95, alpha=0.1),
    ]
    cuped_case = dict(
        y_control=[12.0, 15.5, 9.2, 22.1, 18.4, 7.7, 14.3, 19.9, 11.1, 16.0],
        x_control=[10.1, 14.2, 8.0, 20.5, 17.0, 6.1, 12.8, 18.2, 9.9, 15.1],
        y_variant=[13.4, 17.2, 10.9, 23.8, 19.1, 9.6, 15.0, 21.7, 12.5, 18.3],
        x_variant=[10.4, 15.0, 8.8, 20.9, 16.6, 7.2, 12.1, 18.9, 10.3, 15.8],
        confidence=0.95,
    )

    data = {
        "norm_cdf": [[x, float(stats.norm.cdf(x))] for x in xs],
        "norm_sf": [[x, float(stats.norm.sf(x))] for x in xs],
        "norm_ppf": [[p, float(stats.norm.ppf(p))] for p in ps],
        "t_cdf": [[t, df, float(stats.t.cdf(t, df))] for t, df in t_cases],
        "t_ppf": [[p, df, float(stats.t.ppf(p, df))] for p, df in t_ppf_cases],
        "binary": [{"input": c, "output": engine.two_proportion_z_test(**c)} for c in binary_cases],
        "continuous": [{"input": c, "output": engine.welch_t_test(**c)} for c in continuous_cases],
        "sample_size": [{"input": c, "output": engine.required_sample_size(**c)} for c in sample_cases],
        "cuped": {"input": cuped_case, "output": engine.cuped(**cuped_case)},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
