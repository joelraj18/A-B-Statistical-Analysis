'use client';

import { AlertTriangle, CalendarRange, Hourglass, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { NumberField } from '@/components/ui/Field';
import { remoteEngine } from '@/lib/api/statsService';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { dailyToCsv, parseDailyCsv } from '@/lib/stats/csv';
import { trendAnalysis } from '@/lib/stats/diagnostics';
import { formatPStatement, formatSignedPct } from '@/lib/stats/format';
import { useWorkspace } from '@/lib/store/workspace';
import { chenDays } from '@/lib/stories/datasets';
import { MiniStat } from './shared';

/** Primacy and novelty: is the effect still moving? */
export function TrendTab({ confidence }: { confidence: number }) {
  const trend = useWorkspace((s) => s.draft.diagnostics.trend);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);
  const [csv, setCsv] = useState<string | null>(null);

  const input = useMemo(
    () => (trend.days.length >= 3 && trend.learningDays < trend.days.length ? { ...trend, confidence } : null),
    [trend, confidence],
  );
  const { data, error, source } = useHybridResult(input, trendAnalysis, remoteEngine.trend);

  const onCsv = (text: string) => {
    setCsv(text);
    const parsed = parseDailyCsv(text);
    if (parsed.data) setDiagnostics({ trend: { ...trend, days: parsed.data } });
  };
  const parseError = csv != null ? parseDailyCsv(csv).error : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<CalendarRange />} onClick={() => { setCsv(null); setDiagnostics({ trend: { days: chenDays(), learningDays: 14 } }); }}>
          Load Chen’s 21 days
        </Button>
      </div>
      <textarea
        value={csv ?? (trend.days.length ? dailyToCsv(trend.days) : '')}
        onChange={(e) => onCsv(e.target.value)}
        rows={5}
        spellCheck={false}
        aria-label="Daily counts (CSV)"
        placeholder={'day,visitors_a,conversions_a,visitors_b,conversions_b\n1,40000,4000,40000,3520'}
        className="w-full resize-y rounded-xl border border-hairline bg-elevated/70 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg outline-none transition placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent-soft dark:bg-white/[0.04]"
      />
      <NumberField
        label="Learning period"
        integer
        min={1}
        suffix="days"
        value={trend.learningDays}
        onChange={(learningDays) => setDiagnostics({ trend: { ...trend, learningDays } })}
        hint="Days excluded before reading the result, declared in advance"
      />

      {(parseError || error) && (
        <Callout tone="negative" icon={<AlertTriangle />} title="The trend check can’t run">
          {parseError ?? error}
        </Callout>
      )}

      {data && (
        <>
          {data.pattern === 'primacy' ? (
            <Callout tone="warning" icon={<Hourglass />} title="Primacy effect detected">
              The lift starts negative and climbs steadily ({formatPStatement(data.slopePValue)}). Users are adapting to the change, so early losses overstate the harm. Judge
              on the window after the learning period.
            </Callout>
          ) : data.pattern === 'novelty' ? (
            <Callout tone="warning" icon={<TrendingUp />} title="Novelty effect detected">
              The lift starts positive and decays ({formatPStatement(data.slopePValue)}). Curiosity is fading, so early wins overstate the benefit.
            </Callout>
          ) : (
            <Callout tone="positive" icon={<TrendingUp />} title="The effect is stable over time">
              No significant trend in the daily lift, so the overall estimate is a fair summary.
            </Callout>
          )}

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Learning window" value={formatSignedPct(data.early.relativeUplift, 1)} />
            <MiniStat label="After learning" value={formatSignedPct(data.post.relativeUplift, 1)} tone={data.post.isSignificant ? (data.post.absoluteDiff > 0 ? 'positive' : 'negative') : undefined} />
            <MiniStat label="All days" value={formatSignedPct(data.overall.relativeUplift, 1)} />
          </div>

          <TrendChart result={data} learningDays={trend.learningDays} />
          <p className="flex flex-wrap items-center gap-3 text-[11px] text-faint">
            Shaded days are the learning period. Band shows the {Math.round(confidence * 100)}% interval for each day
            <EngineStatusBadge source={source} />
          </p>
        </>
      )}
      {!data && !error && !parseError && <p className="text-[13px] text-muted">Paste at least three days of counts, or load Chen’s example.</p>}
    </div>
  );
}
