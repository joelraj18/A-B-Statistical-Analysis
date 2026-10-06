/**
 * Wire types for the FastAPI service — snake_case, mirroring `backend/schemas.py`.
 * Converted to the camelCase domain types in `types/stats.ts` by `lib/api/mappers.ts`.
 */

type Pair = [number, number];

export interface SampleSizeRequest {
  baseline_rate: number;
  mde: number;
  power?: number;
  alpha?: number;
}

export interface SampleSizeResponse {
  per_variant: number;
  total: number;
  control_rate: number;
  variant_rate: number;
  absolute_effect: number;
  z_alpha: number;
  z_beta: number;
}

export interface BinaryAnalysisRequest {
  visitors_a: number;
  conversions_a: number;
  visitors_b: number;
  conversions_b: number;
  confidence?: number;
  expected_share_a?: number;
}

export interface ContinuousAnalysisRequest {
  mean_a: number;
  sd_a: number;
  n_a: number;
  mean_b: number;
  sd_b: number;
  n_b: number;
  confidence?: number;
}

export interface CupedRequest {
  y_control: number[];
  x_control: number[];
  y_variant: number[];
  x_variant: number[];
  confidence?: number;
}

export interface ArmEstimateWire {
  estimate: number;
  se: number;
  ci: Pair;
  n: number;
}

interface ComparisonWire {
  confidence: number;
  alpha: number;
  absolute_diff: number;
  relative_uplift: number | null;
  p_value: number;
  is_significant: boolean;
  ci_absolute: Pair;
  ci_relative: Pair | null;
  prob_b_beats_a: number;
  arms: { a: ArmEstimateWire; b: ArmEstimateWire };
}

export interface BinaryAnalysisResponse extends ComparisonWire {
  kind: 'binary';
  rate_a: number;
  rate_b: number;
  z_score: number;
  z_critical: number;
  se_pooled: number;
  se_unpooled: number;
  srm: {
    chi_square: number;
    p_value: number;
    expected_share_a: number;
    observed_share_a: number;
    detected: boolean;
  };
}

export interface ContinuousAnalysisResponse extends ComparisonWire {
  kind: 'continuous';
  mean_a: number;
  mean_b: number;
  t_stat: number;
  df: number;
  t_critical: number;
  se: number;
}

export interface CupedResponse {
  theta: number;
  correlation: number;
  original: ContinuousAnalysisResponse;
  adjusted: ContinuousAnalysisResponse;
  variance_reduction: { control: number; variant: number; estimator: number };
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  engine: Record<string, string>;
}

/** FastAPI error bodies: a string for 400s, a list of issues for 422s. */
export interface ApiErrorBody {
  detail?: string | { loc?: (string | number)[]; msg?: string }[];
  message?: string;
}
