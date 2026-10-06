import type { ExperimentStatus, ExperimentSummary, Hypothesis } from './experiment';
import type { BinaryInput, ContinuousInput, MetricKind } from './stats';

/** Row shape of `public.experiments` (see supabase/migrations/0001_experiments.sql). */
export interface ExperimentRow {
  id: string;
  user_id: string;
  name: string;
  hypothesis: Hypothesis;
  metric: MetricKind;
  status: ExperimentStatus;
  inputs: BinaryInput | ContinuousInput;
  summary: ExperimentSummary;
  is_significant: boolean;
  verdict: ExperimentSummary['verdict'];
  created_at: string;
  updated_at: string;
}

/** `user_id` defaults to `auth.uid()` server-side, so clients never send it. */
export type ExperimentInsert = Omit<ExperimentRow, 'user_id' | 'updated_at'>;
