'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { achievedPower } from '@/lib/stats/abEngine';
import { formatCompact, formatNum, formatPct } from '@/lib/stats/format';
import { ChartTooltip } from './ChartTooltip';

interface PowerCurveProps {
  controlRate: number;
  variantRate: number;
  alpha: number;
  targetPower: number;
  requiredN: number;
  height?: number;
}

/** Power as a function of users per arm — shows the cost of stopping early. */
export function PowerCurve({ controlRate, variantRate, alpha, targetPower, requiredN, height = 240 }: PowerCurveProps) {
  const data = useMemo(() => {
    const max = requiredN * 2;
    return Array.from({ length: 81 }, (_, i) => {
      const n = Math.round((max * i) / 80);
      return { n, power: i === 0 ? alpha / 2 : achievedPower(n, controlRate, variantRate, alpha) };
    });
  }, [controlRate, variantRate, alpha, requiredN]);

  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`Power curve: ${formatPct(targetPower, 0)} power is reached at ${formatNum(requiredN)} users per variant.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="n" type="number" domain={[0, 'dataMax']} tickFormatter={formatCompact} tickCount={5} axisLine={{ stroke: 'var(--hairline-strong)' }} tickLine={false} tick={{ fontSize: 11, fill: 'var(--faint)' }} dy={6} />
          <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => formatPct(v, 0)} axisLine={false} tickLine={false} width={44} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
          <Tooltip
            cursor={{ stroke: 'var(--hairline-strong)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { n: number; power: number } | undefined;
              if (!active || !p) return null;
              return <ChartTooltip title={`${formatNum(p.n)} users / variant`} rows={[{ key: 'p', label: 'Power', value: formatPct(p.power, 1) }]} />;
            }}
          />
          <ReferenceLine y={targetPower} stroke="var(--hairline-strong)" />
          <ReferenceLine x={requiredN} stroke="var(--hairline-strong)" />
          <Line type="monotone" dataKey="power" stroke="var(--chart-variant)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 2 }} animationDuration={700} />
          <ReferenceDot x={requiredN} y={targetPower} r={5} fill="var(--chart-variant)" stroke="var(--bg-elevated)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
