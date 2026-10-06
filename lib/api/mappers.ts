import type {
  ArmEstimateWire,
  BinaryAnalysisRequest,
  BinaryAnalysisResponse,
  ContinuousAnalysisRequest,
  ContinuousAnalysisResponse,
  CupedRequest,
  CupedResponse,
  SampleSizeRequest,
  SampleSizeResponse,
} from '@/types/api';
import type {
  ArmEstimate,
  BinaryInput,
  BinaryResult,
  ContinuousInput,
  ContinuousResult,
  CupedInput,
  CupedResult,
  SampleSizeInput,
  SampleSizeResult,
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
