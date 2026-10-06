'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Archive, Download, FlaskConical, RefreshCw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatTile } from '@/components/ui/StatTile';
import { isCloudEnabled } from '@/lib/db/supabase';
import { deleteExperiment } from '@/lib/experiments';
import { EASE_APPLE } from '@/lib/motion';
import { formatPct, formatPValue, formatSignedDecimal, formatSignedPct } from '@/lib/stats/format';
import type { Verdict } from '@/lib/stats/narrative';
import { syncArchive, useAuth } from '@/lib/store/auth';
import { useWorkspace, useWorkspaceHydrated } from '@/lib/store/workspace';
import { hypothesisStatement, type ExperimentRecord } from '@/types/experiment';

type Filter = 'all' | Verdict;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ship', label: 'Wins' },
  { value: 'rollback', label: 'Losses' },
  { value: 'inconclusive', label: 'Flat' },
  { value: 'invalid', label: 'SRM' },
] as const;

const VERDICT: Record<Verdict, { label: string; tone: BadgeTone }> = {
  ship: { label: 'Shipped', tone: 'positive' },
  rollback: { label: 'Rolled back', tone: 'negative' },
  inconclusive: { label: 'Inconclusive', tone: 'neutral' },
  invalid: { label: 'SRM detected', tone: 'warning' },
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function exportJson(records: ExperimentRecord[]) {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 3, experiments: records }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `experiment-archive-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function HistoryView() {
  const hydrated = useWorkspaceHydrated();
  return hydrated ? <Ledger /> : <PageSkeleton />;
}

function Ledger() {
  const experiments = useWorkspace((s) => s.experiments);
  const user = useAuth((s) => s.user);
  const syncing = useAuth((s) => s.syncing);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingDelete, setPendingDelete] = useState<ExperimentRecord | null>(null);

  const stats = useMemo(() => {
    const valid = experiments.filter((e) => e.summary.verdict !== 'invalid');
    const wins = valid.filter((e) => e.summary.verdict === 'ship').length;
    const uplifts = experiments.map((e) => e.summary.relativeUplift).filter((u): u is number => u != null);
    return {
      total: experiments.length,
      winRate: valid.length ? wins / valid.length : null,
      significant: experiments.filter((e) => e.summary.isSignificant).length,
      medianUplift: median(uplifts),
    };
  }, [experiments]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiments.filter(
      (e) =>
        (filter === 'all' || e.summary.verdict === filter) &&
        (!q || e.name.toLowerCase().includes(q) || hypothesisStatement(e.hypothesis).toLowerCase().includes(q)),
    );
  }, [experiments, filter, query]);

  return (
    <>
      <PageHeader
        eyebrow="Phase 4 · Institutional memory"
        title="Experiment Archive"
        description="Every concluded test, its hypothesis and its verdict — so the next team doesn’t re-run a failed idea."
        actions={
          <>
            {isCloudEnabled && user && (
              <Button variant="secondary" icon={<RefreshCw className={syncing ? 'animate-spin' : ''} />} onClick={() => void syncArchive()} disabled={syncing}>
                Sync
              </Button>
            )}
            <Button variant="secondary" icon={<Download />} onClick={() => exportJson(experiments)} disabled={experiments.length === 0}>
              Export JSON
            </Button>
          </>
        }
      />

      {experiments.length === 0 ? (
        <GlassCard padding="lg" className="flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-fill text-muted">
            <Archive className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">No experiments yet</h2>
          <p className="mt-2 max-w-sm text-[15px] text-muted">Analyse a test and choose “Save to archive” to start building your team’s knowledge base.</p>
          <Link href="/analyzer/" className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-medium text-white">
            <FlaskConical className="size-4" /> Open Analyzer
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Experiments" value={String(stats.total)} caption="Saved in this archive" />
            <StatTile label="Win rate" value={formatPct(stats.winRate, 0)} caption="At Microsoft, about ⅓ of ideas win (Kohavi)" />
            <StatTile label="Significant" value={String(stats.significant)} caption="Either direction" />
            <StatTile label="Median uplift" value={formatSignedPct(stats.medianUplift, 1)} caption="Relative, all tests" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search experiments</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or hypothesis"
                className="h-10 w-full rounded-full border border-hairline bg-surface pl-9 pr-4 text-[14px] outline-none backdrop-blur-xl transition placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </label>
            <div className="overflow-x-auto">
              <SegmentedControl<Filter> ariaLabel="Filter by verdict" options={FILTERS} value={filter} onChange={setFilter} size="sm" />
            </div>
          </div>

          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {visible.map((e) => {
                const verdict = VERDICT[e.summary.verdict];
                const statement = hypothesisStatement(e.hypothesis);
                const uplift = e.summary.relativeUplift;
                return (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: EASE_APPLE }}
                  >
                    <GlassCard interactive padding="sm" className="sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[16px] font-semibold tracking-tight">{e.name}</h3>
                            <Badge tone={verdict.tone}>{verdict.label}</Badge>
                            <Badge>{e.metric === 'binary' ? 'Conversion' : 'Revenue'}</Badge>
                          </div>
                          <p className="mt-1 text-[12px] text-faint">
                            {new Date(e.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            {' · '}
                            {e.summary.source === 'scipy' ? 'SciPy' : 'On-device'}
                          </p>
                          {statement && <p className="mt-2 line-clamp-2 text-[13px] italic leading-relaxed text-muted">“{statement}”</p>}
                        </div>
                        <div className="flex items-center gap-6 sm:gap-8">
                          <div className="text-right">
                            <p className="text-[11px] text-faint">Uplift</p>
                            <p
                              className={`tabular text-[17px] font-semibold tracking-tight ${
                                !e.summary.isSignificant ? 'text-fg' : e.summary.absoluteDiff > 0 ? 'text-positive' : 'text-negative'
                              }`}
                            >
                              {uplift != null ? formatSignedPct(uplift, 1) : formatSignedDecimal(e.summary.absoluteDiff)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-faint">p-value</p>
                            <p className="tabular text-[17px] font-semibold tracking-tight">{formatPValue(e.summary.pValue)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(e)}
                            aria-label={`Delete ${e.name}`}
                            className="grid size-9 place-items-center rounded-full text-faint transition hover:bg-negative-soft hover:text-negative"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {visible.length === 0 && <p className="py-10 text-center text-[14px] text-muted">No experiments match these filters.</p>}
        </div>
      )}

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete experiment?"
        description={
          <>
            “{pendingDelete?.name}” will be removed from this archive{user ? ' and your cloud backup' : ''}. This can’t be undone.
          </>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void deleteExperiment(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
