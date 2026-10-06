'use client';

import { AlertTriangle, ShieldCheck, Waves } from 'lucide-react';
import { useMemo } from 'react';
import { ConfidenceIntervalPlot } from '@/components/charts/ConfidenceIntervalPlot';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Callout } from '@/components/ui/Callout';
import { NumberField } from '@/components/ui/Field';
import { remoteEngine } from '@/lib/api/statsService';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { robustAnalysis } from '@/lib/stats/diagnostics';
import { formatDecimal, formatPct, formatPStatement, formatSignedDecimal, formatSignedPct } from '@/lib/stats/format';
import { useWorkspace } from '@/lib/store/workspace';
import { resolveRobust, SARAH_WHALES } from '@/lib/stories/datasets';
import { ComparisonTable } from './ComparisonTable';
import { DatasetInput } from './DatasetInput';
import { MiniStat } from './shared';

/** Heavy-tailed metrics: how much of the lift comes from a few accounts? */
export function OutliersTab({ confidence }: { confidence: number }) {
  const robust = useWorkspace((s) => s.draft.diagnostics.robust);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);
  const set = (patch: Partial<typeof robust>) => setDiagnostics({ robust: { ...robust, ...patch } });

  const text = useDebouncedValue(robust.source.kind === 'csv' ? robust.source.text : '', 300);
  const parsed = useMemo(() => (robust.source.kind === 'story' ? resolveRobust(robust.source) : resolveRobust({ kind: 'csv', text })), [robust.source, text]);
  const input = useMemo(
    () => (parsed.data ? { ...parsed.data, confidence, winsorizePercentile: robust.winsorizePercentile, topK: robust.topK } : null),
    [parsed.data, confidence, robust.winsorizePercentile, robust.topK],
  );
  const { data, error, source } = useHybridResult(input, robustAnalysis, remoteEngine.robust, 400);

  return (
    <div className="space-y-5">
      <DatasetInput
        source={robust.source}
        onChange={(next) => set(next.kind === 'story' ? { source: next, topK: SARAH_WHALES } : { source: next })}
        exampleStory="sarah"
        exampleLabel="Load Sarah’s traders"
        label={parsed.label}
        rows={parsed.rows}
        ariaLabel="Per user values (CSV)"
        placeholder={'group,value\ncontrol,28.40\nvariant,31.90'}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Cap at percentile"
          suffix="%"
          min={50}
          max={99.9}
          value={Math.round(robust.winsorizePercentile * 1000) / 10}
          onChange={(v) => set({ winsorizePercentile: v / 100 })}
        />
        <NumberField label="Largest accounts to inspect" integer min={1} max={100} value={robust.topK} onChange={(topK) => set({ topK })} />
      </div>

      {(parsed.error || error) && (
        <Callout tone="negative" icon={<AlertTriangle />} title="The outlier check can’t run">
          {parsed.error ?? error}
        </Callout>
      )}

      {data && (
        <>
          {data.outlierDriven ? (
            <Callout tone="warning" icon={<Waves />} title="The lift is driven by outliers">
              The {robust.topK} largest variant values explain {formatPct(Math.min(1, data.topKShare ?? 0), 0)} of the lift. After capping at{' '}
              {formatDecimal(data.cap, 2)} the effect is {formatSignedPct(data.winsorized.relativeUplift, 1)} with {formatPStatement(data.winsorized.pValue)}.
            </Callout>
          ) : (
            <Callout tone="positive" icon={<ShieldCheck />} title="The result survives Winsorization">
              Capping extreme values does not change the conclusion.
            </Callout>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Skewness" value={formatDecimal(data.skewness, 1)} tone={data.skewness > 5 ? 'warning' : undefined} />
            <MiniStat label={`Top ${robust.topK} share of lift`} value={data.topKShare == null ? '—' : formatPct(Math.min(1, data.topKShare), 0)} />
            <MiniStat label="Cap" value={formatDecimal(data.cap, 2)} />
            <MiniStat label="Largest value" value={formatDecimal(data.topValues[0] ?? 0, 2)} />
          </div>
          <ConfidenceIntervalPlot
            formatValue={(v) => formatSignedDecimal(v)}
            rows={[
              { key: 'raw', label: 'Raw Δ', estimate: data.raw.absoluteDiff, ci: data.raw.ciAbsolute },
              { key: 'w', label: 'Winsorized Δ', estimate: data.winsorized.absoluteDiff, ci: data.winsorized.ciAbsolute, emphasis: true },
            ]}
            caption={<EngineStatusBadge source={source} />}
          />
          <ComparisonTable
            rows={[
              { name: 'Raw', r: data.raw },
              { name: 'Winsorized', r: data.winsorized },
            ]}
          />
        </>
      )}
    </div>
  );
}
