'use client';

import { Sparkles, X } from 'lucide-react';
import { useMemo } from 'react';
import { ConfidenceIntervalPlot } from '@/components/charts/ConfidenceIntervalPlot';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Callout } from '@/components/ui/Callout';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { remoteEngine } from '@/lib/api/statsService';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { cuped } from '@/lib/stats/abEngine';
import { formatDecimal, formatPct, formatSignedDecimal } from '@/lib/stats/format';
import { useWorkspace } from '@/lib/store/workspace';
import { resolveCuped } from '@/lib/stories/datasets';
import { ComparisonTable } from './diagnostics/ComparisonTable';
import { DatasetInput } from './diagnostics/DatasetInput';

/**
 * CUPED (Deng et al., 2013): re-analyse a continuous metric after removing the
 * variance explained by each user's pre-experiment behaviour.
 */
export function CupedPanel({ confidence }: { confidence: number }) {
  const source = useWorkspace((s) => s.draft.diagnostics.cuped.source);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);
  const text = useDebouncedValue(source.kind === 'csv' ? source.text : '', 300);
  const parsed = useMemo(() => (source.kind === 'story' ? resolveCuped(source) : resolveCuped({ kind: 'csv', text })), [source, text]);
  const input = useMemo(() => (parsed.data ? { ...parsed.data, confidence } : null), [parsed.data, confidence]);
  const { data: result, error, source: engine } = useHybridResult(input, cuped, remoteEngine.cuped, 400);
  const vr = result?.varianceReduction.estimator ?? 0;

  return (
    <GlassCard id="cuped" className="scroll-mt-56">
      <CardHeader
        icon={<Sparkles />}
        title="CUPED variance reduction"
        description="Paste per user rows of group, metric and pre-experiment metric to tighten the interval without more traffic"
        action={result && <EngineStatusBadge source={engine} />}
      />

      <DatasetInput
        source={source}
        onChange={(next) => setDiagnostics({ cuped: { source: next } })}
        exampleStory="marcus"
        exampleLabel="Load Marcus’s accounts"
        label={parsed.label}
        rows={parsed.rows}
        ariaLabel="CUPED data (CSV)"
        placeholder={'group,metric,pre_metric\ncontrol,42.10,38.50\nvariant,47.80,40.20'}
      />

      {(parsed.error || error) && (
        <div className="mt-4">
          <Callout tone="negative" icon={<X />} title="CUPED can’t run on this data">
            {parsed.error ?? error}
          </Callout>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Variance reduction', value: formatPct(vr, 1) },
              { label: 'Traffic equivalent', value: vr > 0 && vr < 1 ? `${formatDecimal(1 / (1 - vr), 2)}×` : '—' },
              { label: 'θ (theta)', value: formatDecimal(result.theta, 3) },
              { label: 'Correlation ρ', value: formatDecimal(result.correlation, 3) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-fill px-4 py-3">
                <p className="text-[12px] text-muted">{s.label}</p>
                <p className="tabular mt-1 text-[22px] font-semibold tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          <ConfidenceIntervalPlot
            formatValue={(v) => formatSignedDecimal(v)}
            rows={[
              { key: 'raw', label: 'Unadjusted Δ', estimate: result.original.absoluteDiff, ci: result.original.ciAbsolute },
              { key: 'cuped', label: 'CUPED Δ', estimate: result.adjusted.absoluteDiff, ci: result.adjusted.ciAbsolute, emphasis: true },
            ]}
            caption={`${Math.round(confidence * 100)}% confidence intervals for the mean difference B minus A`}
          />

          <ComparisonTable
            rows={[
              { name: 'Unadjusted', r: result.original },
              { name: 'CUPED', r: result.adjusted },
            ]}
          />
        </div>
      )}
    </GlassCard>
  );
}
