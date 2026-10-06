import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ExperimentRecord, Hypothesis } from '@/types/experiment';
import { EMPTY_HYPOTHESIS } from '@/types/experiment';
import type { BinaryInput, ContinuousInput, MetricKind, SampleSizeInput } from '@/types/stats';

export interface PlanState extends SampleSizeInput {
  dailyTraffic: number;
  /** Users per arm the experiment was designed for; set via "Adopt plan". */
  adoptedPerVariant: number | null;
  adoptedMde: number | null;
}

export interface AnalyzerDraft {
  metric: MetricKind;
  name: string;
  hypothesis: Hypothesis;
  confidence: number;
  binary: Omit<BinaryInput, 'confidence'>;
  continuous: Omit<ContinuousInput, 'confidence'>;
}

export const DEFAULT_DRAFT: AnalyzerDraft = {
  metric: 'binary',
  name: '',
  hypothesis: EMPTY_HYPOTHESIS,
  confidence: 0.95,
  binary: { visitorsA: 25_000, conversionsA: 3_500, visitorsB: 25_000, conversionsB: 3_850, expectedShareA: 0.5 },
  continuous: { meanA: 42.1, sdA: 18.3, nA: 5_000, meanB: 43.2, sdB: 19.9, nB: 5_100 },
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
  upsertExperiment: (record: ExperimentRecord) => void;
  mergeExperiments: (records: ExperimentRecord[]) => void;
  deleteExperiment: (id: string) => void;
  setPlan: (patch: Partial<PlanState>) => void;
  setDraft: (patch: Partial<AnalyzerDraft>) => void;
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
      resetDraft: () => set({ draft: DEFAULT_DRAFT }),
      markLegacyImported: () => set({ legacyImported: true }),
    }),
    {
      name: 'ab-engine:workspace',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ experiments, plan, draft, legacyImported }) => ({ experiments, plan, draft, legacyImported }),
      // Rehydrated in AppShell after mount so server HTML and first client render match.
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WorkspaceState>;
        return {
          ...current,
          ...p,
          plan: { ...current.plan, ...p.plan },
          draft: { ...current.draft, ...p.draft, binary: { ...current.draft.binary, ...p.draft?.binary }, continuous: { ...current.draft.continuous, ...p.draft?.continuous } },
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
