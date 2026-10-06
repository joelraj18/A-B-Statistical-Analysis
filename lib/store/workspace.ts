import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ExperimentRecord, Hypothesis } from '@/types/experiment';
import { EMPTY_HYPOTHESIS } from '@/types/experiment';
import type { StoryId } from '@/lib/stories/ids';
import type {
  BinaryInput,
  ContinuousInput,
  DailyCounts,
  InterferenceInput,
  MetricKind,
  SampleSizeInput,
  SegmentInput,
} from '@/types/stats';

export interface PlanState extends SampleSizeInput {
  dailyTraffic: number;
  /** Users per arm the experiment was designed for; set via "Adopt plan". */
  adoptedPerVariant: number | null;
  adoptedMde: number | null;
}

export type DiagnosticTab = 'segments' | 'outliers' | 'trend' | 'interference' | 'switchback';

/** Pasted CSV, or a reference to a seeded persona dataset (kept out of localStorage). */
export type DatasetSource = { kind: 'csv'; text: string } | { kind: 'story'; storyId: StoryId };

export interface DiagnosticsDraft {
  tab: DiagnosticTab;
  segments: SegmentInput[];
  trend: { days: DailyCounts[]; learningDays: number };
  interference: Omit<InterferenceInput, 'confidence'>;
  robust: { source: DatasetSource; winsorizePercentile: number; topK: number };
  switchback: { source: DatasetSource };
  cuped: { source: DatasetSource };
}

export interface ActiveStory {
  id: StoryId;
  step: 1 | 2 | 3 | 4;
}

export interface AnalyzerDraft {
  metric: MetricKind;
  name: string;
  hypothesis: Hypothesis;
  confidence: number;
  binary: Omit<BinaryInput, 'confidence'>;
  continuous: Omit<ContinuousInput, 'confidence'>;
  diagnostics: DiagnosticsDraft;
}

const EMPTY_CSV: DatasetSource = { kind: 'csv', text: '' };

export const DEFAULT_DIAGNOSTICS: DiagnosticsDraft = {
  tab: 'segments',
  segments: [
    { name: 'Mobile', visitorsA: 12_000, conversionsA: 360, visitorsB: 12_100, conversionsB: 400 },
    { name: 'Desktop', visitorsA: 13_000, conversionsA: 780, visitorsB: 12_900, conversionsB: 830 },
  ],
  trend: { days: [], learningDays: 7 },
  interference: {
    baseline: { visitors: 20_000, conversions: 3_000 },
    control: { visitors: 10_000, conversions: 1_490 },
    treatment: { visitors: 10_000, conversions: 1_560 },
  },
  robust: { source: EMPTY_CSV, winsorizePercentile: 0.99, topK: 3 },
  switchback: { source: EMPTY_CSV },
  cuped: { source: EMPTY_CSV },
};

export const DEFAULT_DRAFT: AnalyzerDraft = {
  metric: 'binary',
  name: '',
  hypothesis: EMPTY_HYPOTHESIS,
  confidence: 0.95,
  binary: { visitorsA: 25_000, conversionsA: 3_500, visitorsB: 25_000, conversionsB: 3_850, expectedShareA: 0.5 },
  continuous: { meanA: 42.1, sdA: 18.3, nA: 5_000, meanB: 43.2, sdB: 19.9, nB: 5_100 },
  diagnostics: DEFAULT_DIAGNOSTICS,
};

export const DEFAULT_PLAN: PlanState = {
  baselineRate: 0.15,
  mde: 0.05,
  power: 0.8,
  alpha: 0.05,
  dailyTraffic: 5_000,
  adoptedPerVariant: null,
  adoptedMde: null,
};

interface WorkspaceState {
  experiments: ExperimentRecord[];
  plan: PlanState;
  draft: AnalyzerDraft;
  legacyImported: boolean;
  activeStory: ActiveStory | null;
  upsertExperiment: (record: ExperimentRecord) => void;
  mergeExperiments: (records: ExperimentRecord[]) => void;
  deleteExperiment: (id: string) => void;
  setPlan: (patch: Partial<PlanState>) => void;
  setDraft: (patch: Partial<AnalyzerDraft>) => void;
  setDiagnostics: (patch: Partial<DiagnosticsDraft>) => void;
  setActiveStory: (story: ActiveStory | null) => void;
  resetDraft: () => void;
  markLegacyImported: () => void;
}

const MAX_RECORDS = 500;

const byNewest = (a: ExperimentRecord, b: ExperimentRecord) => b.createdAt.localeCompare(a.createdAt);

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      experiments: [],
      plan: DEFAULT_PLAN,
      draft: DEFAULT_DRAFT,
      legacyImported: false,
      activeStory: null,
      upsertExperiment: (record) =>
        set((s) => ({
          experiments: [record, ...s.experiments.filter((e) => e.id !== record.id)].sort(byNewest).slice(0, MAX_RECORDS),
        })),
      mergeExperiments: (records) =>
        set((s) => {
          const map = new Map(s.experiments.map((e) => [e.id, e]));
          for (const r of records) map.set(r.id, r);
          return { experiments: [...map.values()].sort(byNewest).slice(0, MAX_RECORDS) };
        }),
      deleteExperiment: (id) => set((s) => ({ experiments: s.experiments.filter((e) => e.id !== id) })),
      setPlan: (patch) => set((s) => ({ plan: { ...s.plan, ...patch } })),
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setDiagnostics: (patch) => set((s) => ({ draft: { ...s.draft, diagnostics: { ...s.draft.diagnostics, ...patch } } })),
      setActiveStory: (activeStory) => set({ activeStory }),
      resetDraft: () => set({ draft: DEFAULT_DRAFT }),
      markLegacyImported: () => set({ legacyImported: true }),
    }),
    {
      name: 'ab-engine:workspace',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ experiments, plan, draft, legacyImported, activeStory }) => ({ experiments, plan, draft, legacyImported, activeStory }),
      // Rehydrated in AppShell after mount so server HTML and first client render match.
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WorkspaceState>;
        return {
          ...current,
          ...p,
          plan: { ...current.plan, ...p.plan },
          draft: {
            ...current.draft,
            ...p.draft,
            binary: { ...current.draft.binary, ...p.draft?.binary },
            continuous: { ...current.draft.continuous, ...p.draft?.continuous },
            diagnostics: { ...current.draft.diagnostics, ...p.draft?.diagnostics },
          },
        };
      },
    },
  ),
);

/** True once persisted workspace state has been loaded into the store. */
export function useWorkspaceHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useWorkspace.persist.onFinishHydration(onChange),
    () => useWorkspace.persist.hasHydrated(),
    () => false,
  );
}
