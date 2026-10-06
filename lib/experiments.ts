import type { ExperimentRecord, ExperimentSummary, Hypothesis } from '@/types/experiment';
import type { BinaryInput, BinaryResult, ContinuousInput, ContinuousResult, EngineSource } from '@/types/stats';
import type { Verdict } from '@/lib/stats/narrative';
import { ExperimentRepository } from '@/lib/db/experiments';
import { useAuth } from '@/lib/store/auth';
import { toast } from '@/lib/store/toast';
import { useWorkspace } from '@/lib/store/workspace';

function summarize(result: BinaryResult | ContinuousResult, verdict: Verdict, source: EngineSource): ExperimentSummary {
  return {
    pValue: result.pValue,
    isSignificant: result.isSignificant,
    absoluteDiff: result.absoluteDiff,
    relativeUplift: result.relativeUplift,
    ciAbsolute: result.ciAbsolute,
    probBBeatsA: result.probBBeatsA,
    verdict,
    source,
    ...(result.kind === 'binary' ? { srmDetected: result.srm.detected } : {}),
  };
}

interface SaveArgs {
  name: string;
  hypothesis: Hypothesis;
  verdict: Verdict;
  source: EngineSource;
}

export function buildRecord(
  args: SaveArgs,
  analysis: { result: BinaryResult; input: BinaryInput } | { result: ContinuousResult; input: ContinuousInput },
): ExperimentRecord {
  const now = new Date().toISOString();
  const base = {
    id: crypto.randomUUID(),
    // The prototype spread `...data` after its default, so an empty name always won.
    name: args.name.trim() || `Experiment · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    hypothesis: args.hypothesis,
    status: 'concluded' as const,
    summary: summarize(analysis.result, args.verdict, args.source),
    createdAt: now,
    updatedAt: now,
  };
  return analysis.result.kind === 'binary'
    ? { ...base, metric: 'binary', inputs: analysis.input as BinaryInput }
    : { ...base, metric: 'continuous', inputs: analysis.input as ContinuousInput };
}

/** Saves locally first (instant), then mirrors to Supabase when signed in. */
export async function saveExperiment(record: ExperimentRecord): Promise<void> {
  useWorkspace.getState().upsertExperiment(record);
  toast('Saved to archive', { description: record.name, tone: 'positive' });
  if (useAuth.getState().user) {
    try {
      await ExperimentRepository.upsert(record);
    } catch (err) {
      toast('Saved locally only', { description: err instanceof Error ? err.message : undefined, tone: 'negative' });
    }
  }
}

export async function deleteExperiment(id: string): Promise<void> {
  useWorkspace.getState().deleteExperiment(id);
  if (useAuth.getState().user) {
    try {
      await ExperimentRepository.remove(id);
    } catch (err) {
      toast('Cloud delete failed', { description: err instanceof Error ? err.message : undefined, tone: 'negative' });
    }
  }
}
