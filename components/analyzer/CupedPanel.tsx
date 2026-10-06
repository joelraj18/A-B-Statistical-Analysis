'use client';

import { Database, Sparkles, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ConfidenceIntervalPlot } from '@/components/charts/ConfidenceIntervalPlot';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { remoteEngine } from '@/lib/api/statsService';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { cuped, generateCupedDemo } from '@/lib/stats/abEngine';
import { cupedDatasetToCsv, parseCupedCsv } from '@/lib/stats/csv';
import { formatDecimal, formatNum, formatPct, formatPValue, formatSignedDecimal } from '@/lib/stats/format';

/**
 * CUPED (Deng et al., 2013): re-analyse a continuous metric after removing the
 * variance explained by each user's pre-experiment behaviour.
 */
export function CupedPanel({ confidence }: { confidence: number }) {
  const [csv, setCsv] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(csv, 300);
  const parsed = useMemo(() => parseCupedCsv(debounced), [debounced]);
  const input = useMemo(() => (parsed.data ? { ...parsed.data, confidence } : null), [parsed.data, confidence]);
  const { data: result, error, source } = useHybridResult(input, cuped, remoteEngine.cuped, 400);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setCsv(await file.text());
  };

  const vr = result?.varianceReduction.estimator ?? 0;

  return (
    <GlassCard>
      <CardHeader
        icon={<Sparkles />}
        title="CUPED variance reduction"
        description="Paste per-user rows — group, in-experiment metric, pre-experiment metric — to tighten the interval without more traffic."
        action={result && <EngineStatusBadge source={source} />}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<Database />} onClick={() => setCsv(cupedDatasetToCsv(generateCupedDemo(2000, 0.6, 42)))}>
          Load demo data
        </Button>
        <Button variant="secondary" size="sm" icon={<Upload />} onClick={() => fileRef.current?.click()}>
          Upload CSV
        </Button>
        {csv && (
          <Button variant="ghost" size="sm" icon={<X />} onClick={() => setCsv('')}>
            Clear
          </Button>
        )}
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={5}
        spellCheck={false}
        aria-label="CUPED data (CSV)"
        placeholder={'group,metric,pre_metric\ncontrol,42.10,38.50\nvariant,47.80,40.20'}
        className="mt-4 w-full resize-y rounded-xl border border-hairline bg-elevated/70 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg outline-none transition placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent-soft dark:bg-white/[0.04]"
      />
      {parsed.rows > 0 && !parsed.error && <p className="mt-1.5 text-[12px] text-faint">{formatNum(parsed.rows)} users parsed</p>}

      {(parsed.error || error) && (
        <div className="mt-4">
          <Callout tone="negative" icon={<X />} title="Can’t run CUPED">
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
            caption={`${Math.round(confidence * 100)}% confidence intervals for the mean difference (B − A)`}
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead className="text-[12px] text-muted">
                <tr className="border-b border-hairline">
                  <th className="py-2 font-medium">Analysis</th>
                  <th className="py-2 text-right font-medium">Mean A</th>
                  <th className="py-2 text-right font-medium">Mean B</th>
                  <th className="py-2 text-right font-medium">Δ</th>
                  <th className="py-2 text-right font-medium">p-value</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {[
                  { name: 'Unadjusted', r: result.original },
                  { name: 'CUPED', r: result.adjusted },
                ].map(({ name, r }) => (
                  <tr key={name} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 font-medium">{name}</td>
                    <td className="py-2.5 text-right">{formatDecimal(r.meanA)}</td>
                    <td className="py-2.5 text-right">{formatDecimal(r.meanB)}</td>
                    <td className="py-2.5 text-right">{formatSignedDecimal(r.absoluteDiff)}</td>
                    <td className={`py-2.5 text-right ${r.isSignificant ? 'font-semibold text-accent' : ''}`}>{formatPValue(r.pValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
