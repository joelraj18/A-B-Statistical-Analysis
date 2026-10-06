'use client';

import { Area, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatSignedPct } from '@/lib/stats/format';
import type { TrendResult } from '@/types/stats';
import { ChartTooltip } from './ChartTooltip';

/** Daily relative lift with its interval band; the learning period is shaded. */
export function TrendChart({ result, learningDays, height = 240 }: { result: TrendResult; learningDays: number; height?: number }) {
  const data = result.days.map((d) => ({
    day: d.day,
    lift: d.relativeUplift,
    band: d.ciRelative ? [d.ciRelative[0], d.ciRelative[1]] : null,
  }));
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`Daily relative lift over ${data.length} days, pattern ${result.pattern}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: 'var(--hairline-strong)' }} tick={{ fontSize: 11, fill: 'var(--faint)' }} dy={6} />
          <YAxis tickFormatter={(v: number) => formatSignedPct(v, 0)} axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
          <ReferenceArea x1={1} x2={learningDays} fill="var(--fill)" fillOpacity={1} />
          <ReferenceLine y={0} stroke="var(--hairline-strong)" />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: 'var(--hairline-strong)' }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { day: number; lift: number | null } | undefined;
              if (!active || !p) return null;
              return <ChartTooltip title={`Day ${p.day}${p.day <= learningDays ? ' · learning' : ''}`} rows={[{ key: 'l', label: 'Relative lift', value: formatSignedPct(p.lift, 1) }]} />;
            }}
          />
          <Area dataKey="band" stroke="none" fill="var(--chart-variant)" fillOpacity={0.12} isAnimationActive={false} />
          <Line dataKey="lift" stroke="var(--chart-variant)" strokeWidth={2} dot={{ r: 3, fill: 'var(--chart-variant)', strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
