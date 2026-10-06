import type { Verdict } from '@/lib/stats/narrative';
import type { BinaryInput, ContinuousInput, EngineSource, Interval, MetricKind } from './stats';

export type ExperimentStatus = 'draft' | 'running' | 'concluded';

/**
 * Structured hypothesis, declared before looking at results to avoid HARKing:
 * "If we [change], then [metric] will [effect] because [rationale]."
 */
export interface Hypothesis {
  change: string;
  metric: string;
  effect: string;
  rationale: string;
}

export const EMPTY_HYPOTHESIS: Hypothesis = { change: '', metric: '', effect: '', rationale: '' };

export function hypothesisStatement(h: Hypothesis): string {
  if (!h.change && !h.metric && !h.effect && !h.rationale) return '';
  return `If we ${h.change || '…'}, then ${h.metric || '…'} will ${h.effect || '…'} because ${h.rationale || '…'}.`;
}

export interface ExperimentSummary {
  pValue: number;
  isSignificant: boolean;
  absoluteDiff: number;
  relativeUplift: number | null;
  ciAbsolute: Interval;
  probBBeatsA: number;
  verdict: Verdict;
  source: EngineSource;
  /** Present for binary metrics. */
  srmDetected?: boolean;
}

interface ExperimentBase {
  id: string;
  name: string;
  hypothesis: Hypothesis;
  status: ExperimentStatus;
  summary: ExperimentSummary;
  createdAt: string;
  updatedAt: string;
}

export type ExperimentRecord =
  | (ExperimentBase & { metric: Extract<MetricKind, 'binary'>; inputs: BinaryInput })
  | (ExperimentBase & { metric: Extract<MetricKind, 'continuous'>; inputs: ContinuousInput });
