/**
 * Parity tests: the on-device engine must agree with SciPy / statsmodels.
 * Regenerate the fixture with `cd backend && python scripts/gen_vectors.py`.
 */
import { describe, expect, it } from 'vitest';
import vectors from './fixtures/scipy_vectors.json';
import { cuped, requiredSampleSize, twoProportionZTest, welchTTest } from '@/lib/stats/abEngine';
import { normCdf, normPpf, normSf, tCdf, tPpf } from '@/lib/stats/distributions';
import { fromBinaryResponse, fromContinuousResponse, fromCupedResponse, fromSampleSizeResponse } from '@/lib/api/mappers';
import type { BinaryAnalysisResponse, ContinuousAnalysisResponse, CupedResponse, SampleSizeResponse } from '@/types/api';

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
