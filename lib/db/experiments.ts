/**
 * Supabase repository for the experiment archive. Row Level Security scopes
 * every query to the signed-in user, so no `user_id` filter is needed here.
 */

import type { ExperimentRecord } from '@/types/experiment';
import type { ExperimentInsert, ExperimentRow } from '@/types/database';
import type { BinaryInput, ContinuousInput } from '@/types/stats';
import { getSupabase } from './supabase';

const TABLE = 'experiments';

function toRow(record: ExperimentRecord): ExperimentInsert {
  return {
    id: record.id,
    name: record.name,
    hypothesis: record.hypothesis,
    metric: record.metric,
    status: record.status,
    inputs: record.inputs,
    summary: record.summary,
    is_significant: record.summary.isSignificant,
    verdict: record.summary.verdict,
    created_at: record.createdAt,
  };
}

function fromRow(row: ExperimentRow): ExperimentRecord {
  const base = {
    id: row.id,
    name: row.name,
    hypothesis: row.hypothesis,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return row.metric === 'binary'
    ? { ...base, metric: 'binary', inputs: row.inputs as BinaryInput }
    : { ...base, metric: 'continuous', inputs: row.inputs as ContinuousInput };
}

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cloud sync is not configured.');
  return supabase;
}

export const ExperimentRepository = {
  async list(): Promise<ExperimentRecord[]> {
    const { data, error } = await requireClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(`Could not load your archive: ${error.message}`);
    return (data as ExperimentRow[]).map(fromRow);
  },

  async upsert(record: ExperimentRecord): Promise<void> {
    const { error } = await requireClient().from(TABLE).upsert(toRow(record));
    if (error) throw new Error(`Could not sync “${record.name}”: ${error.message}`);
  },

  async remove(id: string): Promise<void> {
    const { error } = await requireClient().from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Could not delete the experiment: ${error.message}`);
  },
};
