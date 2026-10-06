import type { BadgeTone } from '@/components/ui/Badge';
import type { Narrative } from '@/lib/stats/narrative';
import type { DiagnosticsDraft, DiagnosticTab, PlanState } from '@/lib/store/workspace';
import type { Hypothesis } from '@/types/experiment';
import type {
  BinaryInput,
  BinaryResult,
  ContinuousInput,
  ContinuousResult,
  CupedResult,
  InterferenceResult,
  RobustResult,
  SampleSizeResult,
  SegmentAnalysisResult,
  SwitchbackResult,
  TrendResult,
} from '@/types/stats';
import type { StoryId } from './ids';

export type StoryAnalysis =
  | { metric: 'binary'; binary: Omit<BinaryInput, 'confidence'> }
  | { metric: 'continuous'; continuous: Omit<ContinuousInput, 'confidence'> };

/** Everything the engine says about a story, computed live. */
export interface StoryComputed {
  plan: SampleSizeResult;
  primary: BinaryResult | ContinuousResult;
  narrative: Narrative;
  segments?: SegmentAnalysisResult;
  robust?: RobustResult;
  trend?: TrendResult;
  interference?: InterferenceResult;
  switchback?: SwitchbackResult;
  cuped?: CupedResult;
}

export type StoryFocus = DiagnosticTab | 'cuped' | null;

export interface Story {
  id: StoryId;
  persona: { name: string; initials: string; role: string; company: string };
  /** Heading: no trailing full stop, no dashes. */
  title: string;
  /** One-line card description: no trailing full stop, no dashes. */
  summary: string;
  trap: string;
  outcome: { label: string; tone: BadgeTone };
  problem: string;
  plan: Pick<PlanState, 'baselineRate' | 'mde' | 'power' | 'alpha' | 'dailyTraffic'>;
  /** Shown when the planner sizes a proxy conversion metric. */
  planNote?: string;
  experimentName: string;
  hypothesis: Hypothesis;
  confidence: number;
  analysis: () => StoryAnalysis;
  diagnostics?: Partial<DiagnosticsDraft>;
  focus: StoryFocus;
  chapters: {
    plan: (c: StoryComputed) => string;
    hypothesis: string;
    analyze: (c: StoryComputed) => string;
    decide: string;
  };
  impact: {
    kind: 'gain' | 'avoided' | 'saved';
    label: string;
    assumptions: { label: string; value: string }[];
    amount: (c: StoryComputed) => number;
    explain: (c: StoryComputed) => string;
  };
  lesson: string;
  reference: { cite: string; href: string };
}
