'use client';

import { AlertTriangle, GitCompareArrows, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { ConfidenceIntervalPlot } from '@/components/charts/ConfidenceIntervalPlot';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { remoteEngine } from '@/lib/api/statsService';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { interferenceCheck } from '@/lib/stats/diagnostics';
import { formatPct, formatPoints, formatPStatement } from '@/lib/stats/format';
import { useWorkspace, type DiagnosticsDraft } from '@/lib/store/workspace';
import { getStory } from '@/lib/stories/personas';
import { CellInput } from './shared';

type Group = keyof DiagnosticsDraft['interference'];

const GROUPS: { key: Group; label: string; hint: string }[] = [
  { key: 'baseline', label: 'Control baseline', hint: 'Pre-test period or global holdout' },
  { key: 'control', label: 'Control during test', hint: 'Arm A' },
  { key: 'treatment', label: 'Treatment during test', hint: 'Arm B' },
];

/** SUTVA: did treatment change what control experienced? */
export function InterferenceTab({ confidence }: { confidence: number }) {
  const value = useWorkspace((s) => s.draft.diagnostics.interference);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);
  const set = (group: Group, field: 'visitors' | 'conversions', v: number) =>
    setDiagnostics({ interference: { ...value, [group]: { ...value[group], [field]: v } } });
  const input = useMemo(() => ({ ...value, confidence }), [value, confidence]);
  const { data, error, source } = useHybridResult(input, interferenceCheck, remoteEngine.interference);

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-[13px]">
          <thead className="text-[12px] text-muted">
            <tr>
              <th className="pb-2 text-left font-medium">Group</th>
              <th className="pb-2 pl-2 text-right font-medium">Units</th>
              <th className="pb-2 pl-2 text-right font-medium">Conversions</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g.key}>
                <td className="py-1 pr-2">
                  <p className="font-medium">{g.label}</p>
                  <p className="text-[11px] text-faint">{g.hint}</p>
                </td>
                <td className="py-1 pl-2">
                  <CellInput label={`${g.label} units`} value={value[g.key].visitors} onChange={(v) => set(g.key, 'visitors', v)} />
                </td>
                <td className="py-1 pl-2">
                  <CellInput label={`${g.label} conversions`} value={value[g.key].conversions} onChange={(v) => set(g.key, 'conversions', v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<GitCompareArrows />} onClick={() => setDiagnostics({ interference: getStory('elena').diagnostics!.interference! })}>
          Load Elena’s loans
        </Button>
        <Button variant="secondary" size="sm" icon={<GitCompareArrows />} onClick={() => setDiagnostics({ interference: getStory('david').diagnostics!.interference! })}>
          Load David’s rides
        </Button>
      </div>

      {error && (
        <Callout tone="negative" icon={<AlertTriangle />} title="Check the group counts">
          {error}
        </Callout>
      )}

      {data && (
        <>
          {data.spillover ? (
            <Callout tone="warning" icon={<GitCompareArrows />} title="Interference between arms detected">
              Control fell {formatPoints(-data.controlShift.absoluteDiff, 1).replace('+', '')} below its own baseline ({formatPStatement(data.controlShift.pValue)}), so treatment and control are
              not independent. {data.cannibalizedShare != null && `${formatPct(data.cannibalizedShare, 0)} of the naive lift is explained by control getting worse. `}
              Randomise the shared resource instead: by market, cluster or time with a switchback.
            </Callout>
          ) : (
            <Callout tone="positive" icon={<ShieldCheck />} title="No sign of spillover">
              Control behaves like its baseline, consistent with independent arms.
            </Callout>
          )}
          <ConfidenceIntervalPlot
            formatValue={(v) => formatPoints(v, 1)}
            rows={[
              { key: 'naive', label: 'Naive, B vs A', estimate: data.naive.absoluteDiff, ci: data.naive.ciAbsolute },
              { key: 'shift', label: 'Control vs baseline', estimate: data.controlShift.absoluteDiff, ci: data.controlShift.ciAbsolute },
              { key: 'global', label: 'Global, B vs baseline', estimate: data.global.absoluteDiff, ci: data.global.ciAbsolute, emphasis: true },
            ]}
            caption={<EngineStatusBadge source={source} />}
          />
        </>
      )}
    </div>
  );
}
