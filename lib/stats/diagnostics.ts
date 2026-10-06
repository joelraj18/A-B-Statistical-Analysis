/**
 * Advanced experiment diagnostics: the traps that a single top-line test
 * hides. Each mirrors a function in `backend/engine.py`.
 *
 *  - segmentAnalysis     Simpson's paradox and mix shift (Kohavi et al., 2020 §3)
 *  - robustAnalysis      heavy-tailed metrics and Winsorization
 *  - trendAnalysis       primacy and novelty effects
 *  - interferenceCheck   SUTVA violations through shared resources
 *  - switchbackAnalysis  time-sliced randomisation for marketplaces
 */

import type {
  BinaryResult,
  EffectSummary,
  InterferenceInput,
  InterferenceResult,
  RobustInput,
  RobustResult,
  SegmentAnalysisInput,
  SegmentAnalysisResult,
  SwitchbackInput,
  SwitchbackResult,
  TrendInput,
  TrendPattern,
  TrendResult,
} from '@/types/stats';
import { mean, relativeInterval, StatsInputError, twoProportionZTest, welchFromSamples, zCritical } from './abEngine';
import { chi2Sf, normSf } from './distributions';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new StatsInputError(message);
}

function effect(diff: number, se: number, confidence: number): EffectSummary {
  const z = zCritical(confidence);
  const pValue = se > 0 ? Math.min(1, 2 * normSf(Math.abs(diff / se))) : diff === 0 ? 1 : 0;
  return { absoluteDiff: diff, se, ciAbsolute: [diff - z * se, diff + z * se], pValue, isSignificant: pValue < 1 - confidence };
}

/** Z-test between two independent groups whose sizes are not meant to match. */
function compare(a: { visitors: number; conversions: number }, b: { visitors: number; conversions: number }, confidence: number): BinaryResult {
  return twoProportionZTest({
    visitorsA: a.visitors,
    conversionsA: a.conversions,
    visitorsB: b.visitors,
    conversionsB: b.conversions,
    confidence,
    // Neutralise the SRM check: unequal sizes are expected here.
    expectedShareA: a.visitors / (a.visitors + b.visitors),
  });
}

// Segments ---------------------------------------------------------------------

export function segmentAnalysis({ segments, confidence }: SegmentAnalysisInput): SegmentAnalysisResult {
  assert(segments.length >= 2, 'Add at least two segments.');
  const totals = segments.reduce(
    (t, s) => ({
      visitorsA: t.visitorsA + s.visitorsA,
      conversionsA: t.conversionsA + s.conversionsA,
      visitorsB: t.visitorsB + s.visitorsB,
      conversionsB: t.conversionsB + s.conversionsB,
    }),
    { visitorsA: 0, conversionsA: 0, visitorsB: 0, conversionsB: 0 },
  );
  const pooled = twoProportionZTest({ ...totals, confidence });
  const n = totals.visitorsA + totals.visitorsB;

  const rows = segments.map((s) => {
    assert(s.name.trim().length > 0, 'Every segment needs a name.');
    return {
      name: s.name,
      result: twoProportionZTest({ ...s, confidence }),
      shareA: s.visitorsA / totals.visitorsA,
      shareB: s.visitorsB / totals.visitorsB,
    };
  });

  let diff = 0;
  let variance = 0;
  segments.forEach((s, i) => {
    const w = (s.visitorsA + s.visitorsB) / n;
    diff += w * rows[i]!.result.absoluteDiff;
    variance += w * w * rows[i]!.result.seUnpooled ** 2;
  });

  // χ² independence test on the segment × arm traffic table.
  let chiSquare = 0;
  for (const s of segments) {
    const rowTotal = s.visitorsA + s.visitorsB;
    for (const [observed, colTotal] of [
      [s.visitorsA, totals.visitorsA],
      [s.visitorsB, totals.visitorsB],
    ] as const) {
      const expected = (rowTotal * colTotal) / n;
      chiSquare += (observed - expected) ** 2 / expected;
    }
  }
  const df = segments.length - 1;
  const mixP = chi2Sf(chiSquare, df);

  const signs = rows.map((r) => Math.sign(r.result.absoluteDiff));
  const pooledSign = Math.sign(pooled.absoluteDiff);
  const simpsonsParadox = pooledSign !== 0 && signs.every((s) => s === -pooledSign);

  return {
    pooled,
    segments: rows,
    stratified: effect(diff, Math.sqrt(variance), confidence),
    mixImbalance: { chiSquare, df, pValue: mixP, detected: mixP < 0.001 },
    simpsonsParadox,
  };
}

// Outliers -----------------------------------------------------------------------

/** Quantile with linear interpolation (NumPy's default method). */
export function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}

/** Fisher–Pearson coefficient of skewness (SciPy `skew`, bias=True). */
export function skewness(values: readonly number[]): number {
  const mu = mean(values);
  let m2 = 0;
  let m3 = 0;
  for (const v of values) {
    const d = v - mu;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= values.length;
  m3 /= values.length;
  return m2 > 0 ? m3 / m2 ** 1.5 : 0;
}

export function robustAnalysis({ valuesA, valuesB, confidence, winsorizePercentile, topK }: RobustInput): RobustResult {
  assert(valuesA.length >= 2 && valuesB.length >= 2, 'Each arm needs at least 2 users.');
  assert(winsorizePercentile > 0.5 && winsorizePercentile < 1, 'Winsorization percentile must be between 50% and 100%.');
  assert(Number.isInteger(topK) && topK >= 1, 'Top-k must be a positive whole number.');
  assert([...valuesA, ...valuesB].every(Number.isFinite), 'All values must be finite numbers.');

  const raw = welchFromSamples(valuesA, valuesB, confidence);
  const pooledValues = [...valuesA, ...valuesB];
  const cap = quantile(pooledValues, winsorizePercentile);
  const clip = (xs: readonly number[]) => xs.map((x) => Math.min(x, cap));
  const winsorized = welchFromSamples(clip(valuesA), clip(valuesB), confidence);

  const meanA = mean(valuesA);
  const totalLift = valuesB.reduce((s, v) => s + v, 0) - meanA * valuesB.length;
  const topValues = [...valuesB].sort((a, b) => b - a).slice(0, topK);
  const topLift = topValues.reduce((s, v) => s + (v - meanA), 0);
  const topKShare = totalLift > 0 ? topLift / totalLift : null;

  return {
    raw,
    winsorized,
    cap,
    skewness: skewness(pooledValues),
    topKShare,
    topValues,
    outlierDriven: raw.isSignificant && (!winsorized.isSignificant || (topKShare ?? 0) > 0.5),
  };
}

// Time trend ---------------------------------------------------------------------

function aggregate(days: TrendInput['days']) {
  return days.reduce(
    (t, d) => ({
      visitorsA: t.visitorsA + d.visitorsA,
      conversionsA: t.conversionsA + d.conversionsA,
      visitorsB: t.visitorsB + d.visitorsB,
      conversionsB: t.conversionsB + d.conversionsB,
    }),
    { visitorsA: 0, conversionsA: 0, visitorsB: 0, conversionsB: 0 },
  );
}

export function trendAnalysis({ days, confidence, learningDays }: TrendInput): TrendResult {
  assert(days.length >= 3, 'Add at least 3 days of data.');
  assert(Number.isInteger(learningDays) && learningDays >= 1 && learningDays < days.length, 'The learning period must leave at least one day to analyse.');

  const z = zCritical(confidence);
  const daily = days.map((d, i) => {
    const r = twoProportionZTest({ ...d, confidence });
    const rel = relativeInterval(r.rateA, r.arms.a.se, r.rateB, r.arms.b.se, z);
    return { day: i + 1, absoluteDiff: r.absoluteDiff, se: r.seUnpooled, relativeUplift: rel.uplift, ciRelative: rel.ci };
  });

  // Weighted least squares of the daily difference on the day index.
  const usable = daily.filter((d) => d.se > 0);
  assert(usable.length >= 3, 'At least 3 days need variance to estimate a trend.');
  const weights = usable.map((d) => 1 / (d.se * d.se));
  const sw = weights.reduce((s, w) => s + w, 0);
  const xBar = usable.reduce((s, d, i) => s + weights[i]! * d.day, 0) / sw;
  const yBar = usable.reduce((s, d, i) => s + weights[i]! * d.absoluteDiff, 0) / sw;
  let sxx = 0;
  let sxy = 0;
  usable.forEach((d, i) => {
    sxx += weights[i]! * (d.day - xBar) ** 2;
    sxy += weights[i]! * (d.day - xBar) * (d.absoluteDiff - yBar);
  });
  const slope = sxy / sxx;
  const slopeSe = Math.sqrt(1 / sxx);
  const slopePValue = Math.min(1, 2 * normSf(Math.abs(slope / slopeSe)));

  const early = twoProportionZTest({ ...aggregate(days.slice(0, learningDays)), confidence });
  const post = twoProportionZTest({ ...aggregate(days.slice(learningDays)), confidence });
  const overall = twoProportionZTest({ ...aggregate(days), confidence });

  // Classify on the fitted effect at the first day: users first dislike
  // (primacy) or over-engage with (novelty) a change, then the trend reverses.
  const start = yBar + slope * (daily[0]!.day - xBar);
  let pattern: TrendPattern = 'stable';
  if (slopePValue < 1 - confidence) {
    if (start < 0 && slope > 0) pattern = 'primacy';
    else if (start > 0 && slope < 0) pattern = 'novelty';
  }

  return {
    days: daily.map(({ day, absoluteDiff, relativeUplift, ciRelative }) => ({ day, absoluteDiff, relativeUplift, ciRelative })),
    slope,
    slopeSe,
    slopePValue,
    pattern,
    early,
    post,
    overall,
  };
}

// Interference -------------------------------------------------------------------

export function interferenceCheck({ baseline, control, treatment, confidence }: InterferenceInput): InterferenceResult {
  const naive = compare(control, treatment, confidence);
  const controlShift = compare(baseline, control, confidence);
  const global = compare(baseline, treatment, confidence);
  const spillover = controlShift.isSignificant && controlShift.absoluteDiff < 0;
  return {
    naive,
    controlShift,
    global,
    spillover,
    cannibalizedShare: naive.absoluteDiff > 0 ? Math.min(1, Math.max(0, -controlShift.absoluteDiff / naive.absoluteDiff)) : null,
  };
}

// Switchback ---------------------------------------------------------------------

export function switchbackAnalysis({ blocks, confidence }: SwitchbackInput): SwitchbackResult {
  const a = blocks.filter((b) => b.arm === 'A').map((b) => b.value);
  const b = blocks.filter((b) => b.arm === 'B').map((b) => b.value);
  assert(a.length >= 2 && b.length >= 2, 'Each algorithm needs at least 2 time blocks.');
  assert([...a, ...b].every(Number.isFinite), 'All block values must be finite numbers.');
  return { result: welchFromSamples(a, b, confidence), blocksA: a.length, blocksB: b.length };
}
