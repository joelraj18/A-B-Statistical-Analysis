'use client';

import { AlertTriangle, Layers, Plus, Shuffle, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { ConfidenceIntervalPlot } from '@/components/charts/ConfidenceIntervalPlot';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { remoteEngine } from '@/lib/api/statsService';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { segmentAnalysis } from '@/lib/stats/diagnostics';
import { formatPct, formatPoints, formatPStatement } from '@/lib/stats/format';
import { useWorkspace } from '@/lib/store/workspace';
import { getStory } from '@/lib/stories/personas';
import type { SegmentInput } from '@/types/stats';
import { CellInput } from './shared';

const COLUMNS: { key: keyof Omit<SegmentInput, 'name'>; label: string }[] = [
  { key: 'visitorsA', label: 'A visitors' },
  { key: 'conversionsA', label: 'A conversions' },
  { key: 'visitorsB', label: 'B visitors' },
  { key: 'conversionsB', label: 'B conversions' },
];

/** Simpson's paradox: does the pooled result agree with every segment? */
export function SegmentsTab({ confidence }: { confidence: number }) {
  const segments = useWorkspace((s) => s.draft.diagnostics.segments);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);
  const update = (next: SegmentInput[]) => setDiagnostics({ segments: next });
  const input = useMemo(() => ({ segments, confidence }), [segments, confidence]);
  const { data, error, source } = useHybridResult(input, segmentAnalysis, remoteEngine.segments);

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="text-[12px] text-muted">
            <tr>
              <th className="pb-2 text-left font-medium">Segment</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="pb-2 pl-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <input
                    aria-label={`Segment ${i + 1} name`}
                    value={seg.name}
                    onChange={(e) => update(segments.map((s, j) => (j === i ? { ...s, name: e.target.value } : s)))}
                    className="h-9 w-full min-w-[100px] rounded-lg border border-hairline bg-elevated/70 px-2 text-[13px] outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft dark:bg-white/[0.04]"
                  />
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="py-1 pl-2">
                    <CellInput
                      label={`${seg.name} ${c.label}`}
                      value={seg[c.key]}
                      onChange={(v) => update(segments.map((s, j) => (j === i ? { ...s, [c.key]: v } : s)))}
                    />
                  </td>
                ))}
                <td className="py-1 pl-1">
                  <button
                    type="button"
                    aria-label={`Remove ${seg.name}`}
                    disabled={segments.length <= 2}
                    onClick={() => update(segments.filter((_, j) => j !== i))}
                    className="grid size-8 place-items-center rounded-full text-faint transition hover:bg-negative-soft hover:text-negative disabled:opacity-30"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus />}
          onClick={() => update([...segments, { name: `Segment ${segments.length + 1}`, visitorsA: 1000, conversionsA: 50, visitorsB: 1000, conversionsB: 50 }])}
        >
          Add segment
        </Button>
        <Button variant="secondary" size="sm" icon={<Layers />} onClick={() => update(getStory('james').diagnostics!.segments!)}>
          Load James’s devices
        </Button>
      </div>

      {error && (
        <Callout tone="negative" icon={<AlertTriangle />} title="Check the segment counts">
          {error}
        </Callout>
      )}

      {data && (
        <>
          {data.simpsonsParadox ? (
            <Callout tone="warning" icon={<Shuffle />} title="Simpson’s paradox detected">
              Every segment moves {data.pooled.absoluteDiff < 0 ? 'up' : 'down'} while the pooled result moves {data.pooled.absoluteDiff < 0 ? 'down' : 'up'}. The arms
              contain different mixes of segments (χ² {formatPStatement(data.mixImbalance.pValue)}), so the pooled rate compares different populations. Decide on the
              stratified effect.
            </Callout>
          ) : data.mixImbalance.detected ? (
            <Callout tone="accent" icon={<Layers />} title="Segment mix differs between arms">
              The share of each segment is not the same in A and B (χ² {formatPStatement(data.mixImbalance.pValue)}). Prefer the stratified effect over the pooled one.
            </Callout>
          ) : (
            <Callout tone="positive" icon={<Layers />} title="Segments agree with the pooled result">
              The traffic mix is balanced and the stratified effect tells the same story as the top line.
            </Callout>
          )}

          <ConfidenceIntervalPlot
            formatValue={(v) => formatPoints(v, 1)}
            rows={[
              { key: 'pooled', label: 'Pooled', estimate: data.pooled.absoluteDiff, ci: data.pooled.ciAbsolute },
              ...data.segments.map((s) => ({
                key: s.name,
                label: `${s.name} · ${formatPct(s.shareA, 0)} / ${formatPct(s.shareB, 0)}`,
                estimate: s.result.absoluteDiff,
                ci: s.result.ciAbsolute,
              })),
              { key: 'strat', label: 'Stratified', estimate: data.stratified.absoluteDiff, ci: data.stratified.ciAbsolute, emphasis: true },
            ]}
            caption={
              <span className="flex flex-wrap items-center gap-3">
                Segment labels show each segment’s share of A / B traffic
                <EngineStatusBadge source={source} />
              </span>
            }
          />
        </>
      )}
    </div>
  );
}
