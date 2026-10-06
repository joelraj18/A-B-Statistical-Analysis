/**
 * Domain types shared by the on-device engine (`lib/stats`) and the FastAPI
 * engine adapter (`lib/api/statsService`). UI components only ever see these
 * camelCase shapes, so they are agnostic to which engine produced a result.
 */

export type EngineSource = 'scipy' | 'local';

export type MetricKind = 'binary' | 'continuous';

export type Interval = readonly [lower: number, upper: number];

/** Point estimate, standard error and confidence interval for one arm. */
export interface ArmEstimate {
  estimate: number;
  se: number;
  ci: Interval;
  n: number;
}

/** Sample Ratio Mismatch check (χ² goodness-of-fit on assignment counts). */
export interface SrmResult {
  chiSquare: number;
  pValue: number;
  expectedShareA: number;
  observedShareA: number;
  /** True when p < `SRM_ALPHA` — results should not be trusted. */
  detected: boolean;
}

interface ComparisonBase {
  confidence: number;
  alpha: number;
  /** B − A on the metric's natural scale. */
  absoluteDiff: number;
  /** (B − A) / A, or null when the control estimate is 0. */
  relativeUplift: number | null;
  pValue: number;
  isSignificant: boolean;
  /** CI for B − A. */
  ciAbsolute: Interval;
  /** Delta-method CI for (B − A) / A, or null when the control estimate is 0. */
  ciRelative: Interval | null;
  /**
   * Approximate P(B > A): the sampling distribution of B − A under a flat prior.
   * A frequentist p-value is *not* a probability of winning; this is reported
   * separately and labelled as an approximation.
   */
  probBBeatsA: number;
  arms: { a: ArmEstimate; b: ArmEstimate };
}

export interface BinaryInput {
  visitorsA: number;
  conversionsA: number;
  visitorsB: number;
  conversionsB: number;
  /** Two-sided confidence level, e.g. 0.95. */
  confidence: number;
  /** Planned share of traffic assigned to A (default 0.5) for the SRM check. */
  expectedShareA?: number;
}

export interface BinaryResult extends ComparisonBase {
  kind: 'binary';
  rateA: number;
  rateB: number;
  zScore: number;
  zCritical: number;
  /** Pooled SE under H₀ — used for the test statistic. */
  sePooled: number;
  /** Unpooled SE — used for the confidence interval of the difference. */
  seUnpooled: number;
  srm: SrmResult;
}

export interface ContinuousInput {
  meanA: number;
  sdA: number;
  nA: number;
  meanB: number;
  sdB: number;
  nB: number;
  confidence: number;
}

export interface ContinuousResult extends ComparisonBase {
  kind: 'continuous';
  meanA: number;
  meanB: number;
  tStat: number;
  /** Welch–Satterthwaite degrees of freedom. */
  df: number;
  tCritical: number;
  se: number;
}

export interface SampleSizeInput {
  /** Baseline conversion rate p₁ in (0, 1). */
  baselineRate: number;
  /** Relative minimum detectable effect, e.g. 0.05 for +5 %. */
  mde: number;
  /** 1 − β. */
  power: number;
  /** Two-sided α. */
  alpha: number;
}

export interface SampleSizeResult {
  perVariant: number;
  total: number;
  controlRate: number;
  variantRate: number;
  absoluteEffect: number;
  zAlpha: number;
  zBeta: number;
}

export interface CupedInput {
  yControl: number[];
  xControl: number[];
  yVariant: number[];
  xVariant: number[];
  confidence: number;
}

export interface CupedResult {
  /** θ = Cov(X, Y) / Var(X), estimated on pooled data. */
  theta: number;
  /** Pearson correlation between the covariate and the metric (pooled). */
  correlation: number;
  /** Welch's t-test on the raw metric. */
  original: ContinuousResult;
  /** Welch's t-test on the CUPED-adjusted metric. */
  adjusted: ContinuousResult;
  varianceReduction: {
    control: number;
    variant: number;
    /** 1 − Var(Δ̂_cuped) / Var(Δ̂): reduction in the variance of the estimator. */
    estimator: number;
  };
}

export interface EngineResponse<T> {
  data: T;
  source: EngineSource;
}

// ---------------------------------------------------------------------------
// Advanced diagnostics
// ---------------------------------------------------------------------------

export interface CountPair {
  visitors: number;
  conversions: number;
}

/** Compact effect summary used by the diagnostics. */
export interface EffectSummary {
  absoluteDiff: number;
  se: number;
  ciAbsolute: Interval;
  pValue: number;
  isSignificant: boolean;
}

export interface SegmentInput {
  name: string;
  visitorsA: number;
  conversionsA: number;
  visitorsB: number;
  conversionsB: number;
}

export interface SegmentAnalysisInput {
  segments: SegmentInput[];
  confidence: number;
}

export interface SegmentRow {
  name: string;
  result: BinaryResult;
  /** Share of each arm's traffic that falls in this segment. */
  shareA: number;
  shareB: number;
}

export interface SegmentAnalysisResult {
  pooled: BinaryResult;
  segments: SegmentRow[];
  /** Σ wₛ dₛ with wₛ the segment's share of all traffic. */
  stratified: EffectSummary;
  /** χ² test of independence between segment and arm. */
  mixImbalance: { chiSquare: number; df: number; pValue: number; detected: boolean };
  /** Every segment moves one way while the pooled result moves the other. */
  simpsonsParadox: boolean;
}

export interface RobustInput {
  valuesA: number[];
  valuesB: number[];
  confidence: number;
  /** Upper percentile the values are capped at, e.g. 0.99. */
  winsorizePercentile: number;
  topK: number;
}

export interface RobustResult {
  raw: ContinuousResult;
  winsorized: ContinuousResult;
  cap: number;
  /** Fisher–Pearson skewness of the pooled values. */
  skewness: number;
  /** Share of B's total lift over A contributed by its `topK` largest values. */
  topKShare: number | null;
  topValues: number[];
  outlierDriven: boolean;
}

export interface DailyCounts {
  visitorsA: number;
  conversionsA: number;
  visitorsB: number;
  conversionsB: number;
}

export interface TrendInput {
  days: DailyCounts[];
  confidence: number;
  /** Days excluded as a learning period before reading the result. */
  learningDays: number;
}

export type TrendPattern = 'primacy' | 'novelty' | 'stable';

export interface TrendDay {
  day: number;
  absoluteDiff: number;
  relativeUplift: number | null;
  ciRelative: Interval | null;
}

export interface TrendResult {
  days: TrendDay[];
  /** Weighted least-squares slope of the daily difference per day. */
  slope: number;
  slopeSe: number;
  slopePValue: number;
  pattern: TrendPattern;
  early: BinaryResult;
  post: BinaryResult;
  overall: BinaryResult;
}

export interface InterferenceInput {
  /** Control metric before the test, or from a global holdout. */
  baseline: CountPair;
  control: CountPair;
  treatment: CountPair;
  confidence: number;
}

export interface InterferenceResult {
  /** Treatment vs control — what a user-level dashboard shows. */
  naive: BinaryResult;
  /** Control during the test vs its own baseline. */
  controlShift: BinaryResult;
  /** Treatment vs baseline — the change the business actually sees. */
  global: BinaryResult;
  spillover: boolean;
  /** Fraction of the naive lift explained by control degrading. */
  cannibalizedShare: number | null;
}

export interface SwitchbackInput {
  blocks: { arm: 'A' | 'B'; value: number }[];
  confidence: number;
}

export interface SwitchbackResult {
  result: ContinuousResult;
  blocksA: number;
  blocksB: number;
}
