import type {
  ArmEstimateWire,
  BinaryAnalysisRequest,
  BinaryAnalysisResponse,
  ContinuousAnalysisRequest,
  ContinuousAnalysisResponse,
  CupedRequest,
  CupedResponse,
  EffectSummaryWire,
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
} from '@/types/api';
import type {
  ArmEstimate,
  BinaryInput,
  BinaryResult,
  ContinuousInput,
  ContinuousResult,
  CupedInput,
  CupedResult,
  EffectSummary,
  InterferenceInput,
  InterferenceResult,
  RobustInput,
  RobustResult,
  SampleSizeInput,
  SampleSizeResult,
  SegmentAnalysisInput,
  SegmentAnalysisResult,
  SwitchbackInput,
  SwitchbackResult,
  TrendInput,
  TrendResult,
} from '@/types/stats';

const arm = (w: ArmEstimateWire): ArmEstimate => ({ estimate: w.estimate, se: w.se, ci: w.ci, n: w.n });

export const toBinaryRequest = (i: BinaryInput): BinaryAnalysisRequest => ({
  visitors_a: i.visitorsA,
  conversions_a: i.conversionsA,
  visitors_b: i.visitorsB,
  conversions_b: i.conversionsB,
  confidence: i.confidence,
  expected_share_a: i.expectedShareA ?? 0.5,
});

export const toContinuousRequest = (i: ContinuousInput): ContinuousAnalysisRequest => ({
  mean_a: i.meanA,
  sd_a: i.sdA,
  n_a: i.nA,
  mean_b: i.meanB,
  sd_b: i.sdB,
  n_b: i.nB,
  confidence: i.confidence,
});

export const toSampleSizeRequest = (i: SampleSizeInput): SampleSizeRequest => ({
  baseline_rate: i.baselineRate,
  mde: i.mde,
  power: i.power,
  alpha: i.alpha,
});

export const toCupedRequest = (i: CupedInput): CupedRequest => ({
  y_control: i.yControl,
  x_control: i.xControl,
  y_variant: i.yVariant,
  x_variant: i.xVariant,
  confidence: i.confidence,
});

export function fromBinaryResponse(r: BinaryAnalysisResponse): BinaryResult {
  return {
    kind: 'binary',
    confidence: r.confidence,
    alpha: r.alpha,
    rateA: r.rate_a,
    rateB: r.rate_b,
    absoluteDiff: r.absolute_diff,
    relativeUplift: r.relative_uplift,
    zScore: r.z_score,
    zCritical: r.z_critical,
    pValue: r.p_value,
    isSignificant: r.is_significant,
    sePooled: r.se_pooled,
    seUnpooled: r.se_unpooled,
    ciAbsolute: r.ci_absolute,
    ciRelative: r.ci_relative,
    probBBeatsA: r.prob_b_beats_a,
    arms: { a: arm(r.arms.a), b: arm(r.arms.b) },
    srm: {
      chiSquare: r.srm.chi_square,
      pValue: r.srm.p_value,
      expectedShareA: r.srm.expected_share_a,
      observedShareA: r.srm.observed_share_a,
      detected: r.srm.detected,
    },
  };
}

export function fromContinuousResponse(r: ContinuousAnalysisResponse): ContinuousResult {
  return {
    kind: 'continuous',
    confidence: r.confidence,
    alpha: r.alpha,
    meanA: r.mean_a,
    meanB: r.mean_b,
    absoluteDiff: r.absolute_diff,
    relativeUplift: r.relative_uplift,
    tStat: r.t_stat,
    df: r.df,
    tCritical: r.t_critical,
    se: r.se,
    pValue: r.p_value,
    isSignificant: r.is_significant,
    ciAbsolute: r.ci_absolute,
    ciRelative: r.ci_relative,
    probBBeatsA: r.prob_b_beats_a,
    arms: { a: arm(r.arms.a), b: arm(r.arms.b) },
  };
}

export const fromSampleSizeResponse = (r: SampleSizeResponse): SampleSizeResult => ({
  perVariant: r.per_variant,
  total: r.total,
  controlRate: r.control_rate,
  variantRate: r.variant_rate,
  absoluteEffect: r.absolute_effect,
  zAlpha: r.z_alpha,
  zBeta: r.z_beta,
});

export const fromCupedResponse = (r: CupedResponse): CupedResult => ({
  theta: r.theta,
  correlation: r.correlation,
  original: fromContinuousResponse(r.original),
  adjusted: fromContinuousResponse(r.adjusted),
  varianceReduction: { ...r.variance_reduction },
});

// Advanced diagnostics ----------------------------------------------------------

const toArmCounts = (d: { visitorsA: number; conversionsA: number; visitorsB: number; conversionsB: number }) => ({
  visitors_a: d.visitorsA,
  conversions_a: d.conversionsA,
  visitors_b: d.visitorsB,
  conversions_b: d.conversionsB,
});

export const toSegmentRequest = (i: SegmentAnalysisInput): SegmentRequest => ({
  segments: i.segments.map((s) => ({ name: s.name, ...toArmCounts(s) })),
  confidence: i.confidence,
});

export const toRobustRequest = (i: RobustInput): RobustRequest => ({
  values_a: i.valuesA,
  values_b: i.valuesB,
  confidence: i.confidence,
  winsorize_percentile: i.winsorizePercentile,
  top_k: i.topK,
});

export const toTrendRequest = (i: TrendInput): TrendRequest => ({
  days: i.days.map(toArmCounts),
  confidence: i.confidence,
  learning_days: i.learningDays,
});

export const toInterferenceRequest = (i: InterferenceInput): InterferenceRequest => ({
  baseline: i.baseline,
  control: i.control,
  treatment: i.treatment,
  confidence: i.confidence,
});

export const toSwitchbackRequest = (i: SwitchbackInput): SwitchbackRequest => ({ blocks: i.blocks, confidence: i.confidence });

const effect = (w: EffectSummaryWire): EffectSummary => ({
  absoluteDiff: w.absolute_diff,
  se: w.se,
  ciAbsolute: w.ci_absolute,
  pValue: w.p_value,
  isSignificant: w.is_significant,
});

export const fromSegmentResponse = (r: SegmentResponse): SegmentAnalysisResult => ({
  pooled: fromBinaryResponse(r.pooled),
  segments: r.segments.map((s) => ({ name: s.name, result: fromBinaryResponse(s.result), shareA: s.share_a, shareB: s.share_b })),
  stratified: effect(r.stratified),
  mixImbalance: { chiSquare: r.mix_imbalance.chi_square, df: r.mix_imbalance.df, pValue: r.mix_imbalance.p_value, detected: r.mix_imbalance.detected },
  simpsonsParadox: r.simpsons_paradox,
});

export const fromRobustResponse = (r: RobustResponse): RobustResult => ({
  raw: fromContinuousResponse(r.raw),
  winsorized: fromContinuousResponse(r.winsorized),
  cap: r.cap,
  skewness: r.skewness,
  topKShare: r.top_k_share,
  topValues: r.top_values,
  outlierDriven: r.outlier_driven,
});

export const fromTrendResponse = (r: TrendResponse): TrendResult => ({
  days: r.days.map((d) => ({ day: d.day, absoluteDiff: d.absolute_diff, relativeUplift: d.relative_uplift, ciRelative: d.ci_relative })),
  slope: r.slope,
  slopeSe: r.slope_se,
  slopePValue: r.slope_p_value,
  pattern: r.pattern,
  early: fromBinaryResponse(r.early),
  post: fromBinaryResponse(r.post),
  overall: fromBinaryResponse(r.overall),
});

export const fromInterferenceResponse = (r: InterferenceResponse): InterferenceResult => ({
  naive: fromBinaryResponse(r.naive),
  controlShift: fromBinaryResponse(r.control_shift),
  global: fromBinaryResponse(r.global),
  spillover: r.spillover,
  cannibalizedShare: r.cannibalized_share,
});

export const fromSwitchbackResponse = (r: SwitchbackResponse): SwitchbackResult => ({
  result: fromContinuousResponse(r.result),
  blocksA: r.blocks_a,
  blocksB: r.blocks_b,
});
