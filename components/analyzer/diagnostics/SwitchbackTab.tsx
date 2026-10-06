'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { ConfidenceIntervalPlot } from '@/components/charts/ConfidenceIntervalPlot';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Callout } from '@/components/ui/Callout';
import { remoteEngine } from '@/lib/api/statsService';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { interferenceCheck, switchbackAnalysis } from '@/lib/stats/diagnostics';
import { formatDecimal, formatNum, formatPoints, formatPStatement } from '@/lib/stats/format';
import { useWorkspace } from '@/lib/store/workspace';
import { resolveSwitchback } from '@/lib/stories/datasets';
import { DatasetInput } from './DatasetInput';
import { MiniStat } from './shared';

/** Switchback: randomise time blocks, not users, when arms share supply. */
export function SwitchbackTab({ confidence }: { confidence: number }) {
  const sb = useWorkspace((s) => s.draft.diagnostics.switchback);
  const interference = useWorkspace((s) => s.draft.diagnostics.interference);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);

  const text = useDebouncedValue(sb.source.kind === 'csv' ? sb.source.text : '', 300);
  const parsed = useMemo(() => (sb.source.kind === 'story' ? resolveSwitchback(sb.source) : resolveSwitchback({ kind: 'csv', text })), [sb.source, text]);
  const input = useMemo(() => (parsed.data ? { blocks: parsed.data, confidence } : null), [parsed.data, confidence]);
  const { data, error, source } = useHybridResult(input, switchbackAnalysis, remoteEngine.switchback);

  const naive = useMemo(() => {
    try {
      return interferenceCheck({ ...interference, confidence }).naive;
    } catch {
      return null;
    }
  }, [interference, confidence]);

  return (
    <div className="space-y-5">
      <DatasetInput
        source={sb.source}
        onChange={(next) => setDiagnostics({ switchback: { source: next } })}
        exampleStory="david"
        exampleLabel="Load David’s city blocks"
        label={parsed.label}
        rows={parsed.rows}
        ariaLabel="Time block values (CSV)"
        placeholder={'arm,value\nA,0.612\nB,0.641'}
      />

      {(parsed.error || error) && (
        <Callout tone="negative" icon={<AlertTriangle />} title="The switchback analysis can’t run">
          {parsed.error ?? error}
        </Callout>
      )}

      {data && (
        <>
          <Callout tone="accent" icon={<Clock />} title={`Global effect ${formatPoints(data.result.absoluteDiff, 1)}`}>
            Alternating the whole market between algorithms removes competition for shared supply. Across {formatNum(data.blocksA + data.blocksB)} time blocks the effect is{' '}
            {formatPoints(data.result.absoluteDiff, 2)} with {formatPStatement(data.result.pValue)}.
          </Callout>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Blocks A / B" value={`${data.blocksA} / ${data.blocksB}`} />
            <MiniStat label="Mean A" value={formatDecimal(data.result.meanA, 3)} />
            <MiniStat label="Mean B" value={formatDecimal(data.result.meanB, 3)} />
          </div>
          <ConfidenceIntervalPlot
            formatValue={(v) => formatPoints(v, 1)}
            rows={[
              ...(naive ? [{ key: 'naive', label: 'User level test', estimate: naive.absoluteDiff, ci: naive.ciAbsolute }] : []),
              { key: 'sb', label: 'Switchback', estimate: data.result.absoluteDiff, ci: data.result.ciAbsolute, emphasis: true },
            ]}
            caption={
              <span className="flex flex-wrap items-center gap-3">
                User level estimate from the Interference tab
                <EngineStatusBadge source={source} />
              </span>
            }
          />
        </>
      )}
    </div>
  );
}
