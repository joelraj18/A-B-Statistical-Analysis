/**
 * On-device A/B testing engine.
 *
 * Mirrors `backend/engine.py` formula-for-formula so the UI degrades gracefully
 * when the SciPy service is offline. Every function is pure and validates its
 * inputs, throwing `StatsInputError` with a user-facing message.
 */

import type {
  ArmEstimate,
  BinaryInput,
  BinaryResult,
  ContinuousInput,
  ContinuousResult,
  CupedInput,
  CupedResult,
  Interval,
  SampleSizeInput,
  SampleSizeResult,
  SrmResult,
} from '@/types/stats';
import { normCdf, normPpf, normSf, tCdf, tPpf, tSf } from './distributions';

/** Kohavi et al. recommend a strict threshold so SRM alarms are rarely false. */
export const SRM_ALPHA = 0.001;

export class StatsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatsInputError';
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new StatsInputError(message);
}

function assertConfidence(confidence: number) {
  assert(Number.isFinite(confidence) && confidence > 0 && confidence < 1, 'Confidence must be between 0 and 1.');
}

/** Two-sided critical value z_{1-α/2}. */
export function zCritical(confidence: number): number {
  assertConfidence(confidence);
  return normPpf(1 - (1 - confidence) / 2);
}

// Interval helpers ------------------------------------------------------------

/** Wilson score interval for a single proportion (statsmodels `method="wilson"`). */
export function wilsonInterval(successes: number, n: number, confidence: number): Interval {
  const z = zCritical(confidence);
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

/** Delta-method CI for the relative lift (B − A) / A. */
export function relativeInterval(
  meanA: number,
  seA: number,
  meanB: number,
  seB: number,
  z: number,
): { uplift: number | null; ci: Interval | null } {
  if (meanA === 0) return { uplift: null, ci: null };
  const uplift = (meanB - meanA) / meanA;
  const variance = (seB * seB) / (meanA * meanA) + (meanB * meanB * seA * seA) / meanA ** 4;
  const half = z * Math.sqrt(variance);
  return { uplift, ci: [uplift - half, uplift + half] };
}

// Sample ratio mismatch ---------------------------------------------------------

/** χ² goodness-of-fit (1 df) on the assignment counts. */
export function srmCheck(nA: number, nB: number, expectedShareA = 0.5): SrmResult {
  assert(expectedShareA > 0 && expectedShareA < 1, 'Expected traffic share must be between 0 and 1.');
  const total = nA + nB;
  const expA = total * expectedShareA;
  const expB = total - expA;
  const chiSquare = (nA - expA) ** 2 / expA + (nB - expB) ** 2 / expB;
  // P(χ²₁ > c) = 2·(1 − Φ(√c))
  const pValue = Math.min(1, 2 * normSf(Math.sqrt(chiSquare)));
  return {
    chiSquare,
    pValue,
    expectedShareA,
    observedShareA: nA / total,
    detected: pValue < SRM_ALPHA,
  };
}

// Binary metrics -----------------------------------------------------------------

export function validateBinaryInput(input: BinaryInput) {
  const { visitorsA, conversionsA, visitorsB, conversionsB, confidence } = input;
  for (const [label, v] of [
    ['Control visitors', visitorsA],
    ['Variant visitors', visitorsB],
    ['Control conversions', conversionsA],
    ['Variant conversions', conversionsB],
  ] as const) {
    assert(Number.isInteger(v) && v >= 0, `${label} must be a whole number ≥ 0.`);
  }
  assert(visitorsA > 0 && visitorsB > 0, 'Each arm needs at least one visitor.');
  assert(conversionsA <= visitorsA, 'Control conversions cannot exceed control visitors.');
  assert(conversionsB <= visitorsB, 'Variant conversions cannot exceed variant visitors.');
  assertConfidence(confidence);
}

/**
 * Two-proportion Z-test (two-tailed).
 *
 * Test statistic uses the pooled SE under H₀:
 *   Z = (p̂_B − p̂_A) / √( p̂(1 − p̂)(1/n_A + 1/n_B) )
 * The confidence interval for the difference uses the unpooled SE, because it
 * is constructed without assuming H₀.
 */
export function twoProportionZTest(input: BinaryInput): BinaryResult {
  validateBinaryInput(input);
  const { visitorsA: nA, conversionsA: xA, visitorsB: nB, conversionsB: xB, confidence } = input;

  const rateA = xA / nA;
  const rateB = xB / nB;
  const diff = rateB - rateA;

  const pooled = (xA + xB) / (nA + nB);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  assert(sePooled > 0, 'Both arms have a 0% or 100% rate, so there is no variance to test.');

  const seA = Math.sqrt((rateA * (1 - rateA)) / nA);
  const seB = Math.sqrt((rateB * (1 - rateB)) / nB);
  const seUnpooled = Math.sqrt(seA * seA + seB * seB);

  const zScore = diff / sePooled;
  const pValue = Math.min(1, 2 * normSf(Math.abs(zScore)));
  const alpha = 1 - confidence;
  const z = zCritical(confidence);

  const relative = relativeInterval(rateA, seA, rateB, seB, z);

  return {
    kind: 'binary',
    confidence,
    alpha,
    rateA,
    rateB,
    absoluteDiff: diff,
    relativeUplift: relative.uplift,
    zScore,
    zCritical: z,
    pValue,
    isSignificant: pValue < alpha,
    sePooled,
    seUnpooled,
    ciAbsolute: [diff - z * seUnpooled, diff + z * seUnpooled],
    ciRelative: relative.ci,
    probBBeatsA: seUnpooled > 0 ? normCdf(diff / seUnpooled) : diff > 0 ? 1 : diff < 0 ? 0 : 0.5,
    arms: {
      a: { estimate: rateA, se: seA, ci: wilsonInterval(xA, nA, confidence), n: nA },
      b: { estimate: rateB, se: seB, ci: wilsonInterval(xB, nB, confidence), n: nB },
    },
    srm: srmCheck(nA, nB, input.expectedShareA ?? 0.5),
  };
}

// Continuous metrics ---------------------------------------------------------------

function armFromSummary(mean: number, sd: number, n: number, confidence: number): ArmEstimate {
  const se = sd / Math.sqrt(n);
  const t = tPpf(1 - (1 - confidence) / 2, n - 1);
  return { estimate: mean, se, ci: [mean - t * se, mean + t * se], n };
}

/**
 * Welch's unequal-variance t-test from summary statistics
 * (equivalent to `scipy.stats.ttest_ind_from_stats(..., equal_var=False)`).
 */
export function welchTTest(input: ContinuousInput): ContinuousResult {
  const { meanA, sdA, nA, meanB, sdB, nB, confidence } = input;
  assertConfidence(confidence);
  assert(Number.isFinite(meanA) && Number.isFinite(meanB), 'Means must be finite numbers.');
  assert(sdA >= 0 && sdB >= 0, 'Standard deviations cannot be negative.');
  assert(Number.isInteger(nA) && Number.isInteger(nB) && nA >= 2 && nB >= 2, 'Each arm needs at least 2 users.');

  const vA = (sdA * sdA) / nA;
  const vB = (sdB * sdB) / nB;
  const se = Math.sqrt(vA + vB);
  assert(se > 0, 'Both arms have zero variance, so there is nothing to test.');

  const diff = meanB - meanA;
  const df = (vA + vB) ** 2 / ((vA * vA) / (nA - 1) + (vB * vB) / (nB - 1));
  const tStat = diff / se;
  const pValue = Math.min(1, 2 * tSf(Math.abs(tStat), df));
  const alpha = 1 - confidence;
  const tCrit = tPpf(1 - alpha / 2, df);
  const relative = relativeInterval(meanA, Math.sqrt(vA), meanB, Math.sqrt(vB), zCritical(confidence));

  return {
    kind: 'continuous',
    confidence,
    alpha,
    meanA,
    meanB,
    absoluteDiff: diff,
    relativeUplift: relative.uplift,
    tStat,
    df,
    tCritical: tCrit,
    se,
    pValue,
    isSignificant: pValue < alpha,
    ciAbsolute: [diff - tCrit * se, diff + tCrit * se],
    ciRelative: relative.ci,
    probBBeatsA: tCdf(tStat, df),
    arms: {
      a: armFromSummary(meanA, sdA, nA, confidence),
      b: armFromSummary(meanB, sdB, nB, confidence),
    },
  };
}

// Sample size & power --------------------------------------------------------------

/**
 * Required sample size per variant for a two-sided two-proportion test:
 *
 *   n = ( z_{α/2}·√(2p̄(1 − p̄)) + z_β·√(p₁(1 − p₁) + p₂(1 − p₂)) )² / (p₂ − p₁)²
 *
 * with p₂ = p₁(1 + MDE) and p̄ = (p₁ + p₂)/2.
 */
export function requiredSampleSize(input: SampleSizeInput): SampleSizeResult {
  const { baselineRate: p1, mde, power, alpha } = input;
  assert(p1 > 0 && p1 < 1, 'Baseline rate must be between 0% and 100%.');
  assert(mde !== 0 && Number.isFinite(mde), 'Minimum detectable effect must be non-zero.');
  assert(power > 0 && power < 1, 'Power must be between 0 and 1.');
  assert(alpha > 0 && alpha < 1, 'Alpha must be between 0 and 1.');

  const p2 = p1 * (1 + mde);
  assert(p2 > 0 && p2 < 1, 'This MDE pushes the variant rate outside 0–100%.');

  const pBar = (p1 + p2) / 2;
  const zAlpha = normPpf(1 - alpha / 2);
  const zBeta = normPpf(power);
  const numerator = (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
  // Guard against floating-point noise pushing an exact integer up by one.
  const perVariant = Math.ceil(numerator / (p2 - p1) ** 2 - 1e-9);

  return {
    perVariant,
    total: perVariant * 2,
    controlRate: p1,
    variantRate: p2,
    absoluteEffect: p2 - p1,
    zAlpha,
    zBeta,
  };
}

/** Power achieved with `n` users per arm (inverse of `requiredSampleSize`). */
export function achievedPower(n: number, p1: number, p2: number, alpha: number): number {
  if (!(n > 0) || p1 === p2) return alpha;
  const pBar = (p1 + p2) / 2;
  const zAlpha = normPpf(1 - alpha / 2);
  const z =
    (Math.abs(p2 - p1) * Math.sqrt(n) - zAlpha * Math.sqrt(2 * pBar * (1 - pBar))) /
    Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return normCdf(z);
}

// CUPED ---------------------------------------------------------------------------

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Sample variance (ddof = 1). */
function variance(xs: readonly number[], mu = mean(xs)): number {
  let s = 0;
  for (const x of xs) s += (x - mu) ** 2;
  return s / (xs.length - 1);
}

function covariance(xs: readonly number[], ys: readonly number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += (xs[i]! - mx) * (ys[i]! - my);
  return s / (xs.length - 1);
}

function welchFromSamples(a: readonly number[], b: readonly number[], confidence: number): ContinuousResult {
  return welchTTest({
    meanA: mean(a),
    sdA: Math.sqrt(variance(a)),
    nA: a.length,
    meanB: mean(b),
    sdB: Math.sqrt(variance(b)),
    nB: b.length,
    confidence,
  });
}

/**
 * CUPED (Deng, Xu, Kohavi & Walker, 2013).
 *
 *   Ŷ_cv = Y − θ (X − E[X]),   θ = Cov(X, Y) / Var(X)
 *
 * θ is estimated on pooled data so it is independent of the treatment
 * assignment, keeping the adjusted difference unbiased.
 */
export function cuped(input: CupedInput): CupedResult {
  const { yControl, xControl, yVariant, xVariant, confidence } = input;
  assertConfidence(confidence);
  assert(yControl.length === xControl.length, 'Control metric and covariate must have the same length.');
  assert(yVariant.length === xVariant.length, 'Variant metric and covariate must have the same length.');
  assert(yControl.length >= 2 && yVariant.length >= 2, 'Each arm needs at least 2 users.');
  for (const arr of [yControl, xControl, yVariant, xVariant]) {
    assert(arr.every(Number.isFinite), 'All values must be finite numbers.');
  }

  const xAll = [...xControl, ...xVariant];
  const yAll = [...yControl, ...yVariant];
  const varX = variance(xAll);
  const covXY = covariance(xAll, yAll);
  const varY = variance(yAll);
  const theta = varX > 0 ? covXY / varX : 0;
  const correlation = varX > 0 && varY > 0 ? covXY / Math.sqrt(varX * varY) : 0;
  const muX = mean(xAll);

  const adjust = (ys: readonly number[], xs: readonly number[]) => ys.map((y, i) => y - theta * (xs[i]! - muX));
  const yControlCv = adjust(yControl, xControl);
  const yVariantCv = adjust(yVariant, xVariant);

  const original = welchFromSamples(yControl, yVariant, confidence);
  const adjusted = welchFromSamples(yControlCv, yVariantCv, confidence);

  const reduction = (before: number, after: number) => (before > 0 ? 1 - after / before : 0);

  return {
    theta,
    correlation,
    original,
    adjusted,
    varianceReduction: {
      control: reduction(variance(yControl), variance(yControlCv)),
      variant: reduction(variance(yVariant), variance(yVariantCv)),
      estimator: reduction(original.se ** 2, adjusted.se ** 2),
    },
  };
}

// Synthetic data ----------------------------------------------------------------------

/** Deterministic PRNG (mulberry32) so demo datasets are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a revenue-per-user style dataset where the in-experiment metric is
 * strongly correlated with pre-experiment spend — the setting where CUPED shines.
 */
export function generateCupedDemo(n = 2000, lift = 0.6, seed = 42): Omit<CupedInput, 'confidence'> {
  const rand = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const arm = (effect: number) => {
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const pre = Math.max(0, 40 + 15 * gauss());
      x.push(Number(pre.toFixed(2)));
      y.push(Number(Math.max(0, 5 + 0.9 * pre + effect + 6 * gauss()).toFixed(2)));
    }
    return { x, y };
  };
  const control = arm(0);
  const variant = arm(lift);
  return { yControl: control.y, xControl: control.x, yVariant: variant.y, xVariant: variant.x };
}
