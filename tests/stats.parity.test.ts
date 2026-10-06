/**
 * Parity tests: the on-device engine must agree with SciPy / statsmodels.
 * Regenerate the fixture with `cd backend && python scripts/gen_vectors.py`.
 */
import { describe, expect, it } from 'vitest';
import vectors from './fixtures/scipy_vectors.json';
import { cuped, requiredSampleSize, twoProportionZTest, welchTTest } from '@/lib/stats/abEngine';
import { chi2Sf, normCdf, normPpf, normSf, tCdf, tPpf } from '@/lib/stats/distributions';
import { interferenceCheck, robustAnalysis, segmentAnalysis, switchbackAnalysis, trendAnalysis } from '@/lib/stats/diagnostics';
import {
  fromBinaryResponse,
  fromContinuousResponse,
  fromCupedResponse,
  fromInterferenceResponse,
  fromRobustResponse,
  fromSampleSizeResponse,
  fromSegmentResponse,
  fromSwitchbackResponse,
  fromTrendResponse,
} from '@/lib/api/mappers';
import type {
  BinaryAnalysisResponse,
  ContinuousAnalysisResponse,
  CupedResponse,
  InterferenceResponse,
  RobustResponse,
  SampleSizeResponse,
  SegmentResponse,
  SwitchbackResponse,
  TrendResponse,
} from '@/types/api';

/** Relative error with an absolute floor for values near zero. */
function close(actual: number, expected: number, rel: number, abs = 1e-300) {
  if (!Number.isFinite(expected)) return expect(actual).toBe(expected);
  const err = Math.abs(actual - expected);
  expect(err <= Math.max(abs, rel * Math.abs(expected)), `${actual} vs ${expected} (err ${err})`).toBe(true);
}

/** Deep numeric comparison of two result objects. */
function deepClose(actual: unknown, expected: unknown, rel: number, abs: number, path = '$') {
  if (typeof expected === 'number') {
    expect(typeof actual, path).toBe('number');
    close(actual as number, expected, rel, abs);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expected.forEach((v, i) => deepClose((actual as unknown[])[i], v, rel, abs, `${path}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    for (const [k, v] of Object.entries(expected)) deepClose((actual as Record<string, unknown>)[k], v, rel, abs, `${path}.${k}`);
  } else {
    expect(actual, path).toEqual(expected);
  }
}

describe('normal distribution', () => {
  it('cdf matches scipy.stats.norm.cdf', () => {
    for (const [x, p] of vectors.norm_cdf) close(normCdf(x!), p!, 1e-14);
  });
  it('sf matches scipy.stats.norm.sf in the far tail', () => {
    for (const [x, p] of vectors.norm_sf) close(normSf(x!), p!, 1e-13);
  });
  it('ppf matches scipy.stats.norm.ppf', () => {
    for (const [p, x] of vectors.norm_ppf) close(normPpf(p!), x!, 1e-14, 1e-15);
  });
});

describe("Student's t distribution", () => {
  it('cdf matches scipy.stats.t.cdf', () => {
    for (const [t, df, p] of vectors.t_cdf) close(tCdf(t!, df!), p!, 1e-12, 1e-15);
  });
  it('ppf matches scipy.stats.t.ppf', () => {
    for (const [p, df, x] of vectors.t_ppf) close(tPpf(p!, df!), x!, 1e-10, 1e-12);
  });
});

describe('engine parity with backend/engine.py', () => {
  it('two-proportion z-test', () => {
    for (const { input, output } of vectors.binary) {
      const local = twoProportionZTest({
        visitorsA: input.visitors_a,
        conversionsA: input.conversions_a,
        visitorsB: input.visitors_b,
        conversionsB: input.conversions_b,
        confidence: input.confidence,
      });
      deepClose(local, fromBinaryResponse(output as BinaryAnalysisResponse), 1e-9, 1e-14);
    }
  });

  it("Welch's t-test", () => {
    for (const { input, output } of vectors.continuous) {
      const local = welchTTest({
        meanA: input.mean_a,
        sdA: input.sd_a,
        nA: input.n_a,
        meanB: input.mean_b,
        sdB: input.sd_b,
        nB: input.n_b,
        confidence: input.confidence,
      });
      deepClose(local, fromContinuousResponse(output as ContinuousAnalysisResponse), 1e-9, 1e-14);
    }
  });

  it('sample size', () => {
    for (const { input, output } of vectors.sample_size) {
      const local = requiredSampleSize({
        baselineRate: input.baseline_rate,
        mde: input.mde,
        power: input.power,
        alpha: input.alpha,
      });
      deepClose(local, fromSampleSizeResponse(output as SampleSizeResponse), 1e-12, 1e-15);
    }
  });

  it('CUPED', () => {
    const { input, output } = vectors.cuped;
    const local = cuped({
      yControl: input.y_control,
      xControl: input.x_control,
      yVariant: input.y_variant,
      xVariant: input.x_variant,
      confidence: input.confidence,
    });
    deepClose(local, fromCupedResponse(output as CupedResponse), 1e-9, 1e-12);
  });
});

describe('diagnostics parity with backend/engine.py', () => {
  type Wire = Record<string, number>;
  const counts = (d: Wire) => ({ visitorsA: d.visitors_a!, conversionsA: d.conversions_a!, visitorsB: d.visitors_b!, conversionsB: d.conversions_b! });

  it('chi-square survival function', () => {
    for (const [x, df, p] of vectors.chi2_sf) close(chi2Sf(x!, df!), p!, 1e-11, 1e-300);
  });

  it('segment analysis', () => {
    const { input, output } = vectors.segments;
    const local = segmentAnalysis({
      segments: input.segments.map((s) => ({ name: s.name, ...counts(s as unknown as Wire) })),
      confidence: input.confidence,
    });
    deepClose(local, fromSegmentResponse(output as SegmentResponse), 1e-9, 1e-12);
  });

  it('robust analysis', () => {
    const { input, output } = vectors.robust;
    const local = robustAnalysis({
      valuesA: input.values_a,
      valuesB: input.values_b,
      confidence: input.confidence,
      winsorizePercentile: input.winsorize_percentile,
      topK: input.top_k,
    });
    deepClose(local, fromRobustResponse(output as RobustResponse), 1e-9, 1e-12);
  });

  it('trend analysis', () => {
    const { input, output } = vectors.trend;
    const local = trendAnalysis({ days: input.days.map((d) => counts(d as Wire)), confidence: input.confidence, learningDays: input.learning_days });
    deepClose(local, fromTrendResponse(output as TrendResponse), 1e-9, 1e-12);
  });

  it('interference check', () => {
    const { input, output } = vectors.interference;
    const local = interferenceCheck(input);
    deepClose(local, fromInterferenceResponse(output as InterferenceResponse), 1e-9, 1e-12);
  });

  it('switchback analysis', () => {
    const { input, output } = vectors.switchback;
    const local = switchbackAnalysis({ blocks: input.blocks as { arm: 'A' | 'B'; value: number }[], confidence: input.confidence });
    deepClose(local, fromSwitchbackResponse(output as SwitchbackResponse), 1e-9, 1e-12);
  });
});
