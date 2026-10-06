'use client';

import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ArmEstimate } from '@/types/stats';
import { ChartTooltip } from './ChartTooltip';

interface ErrorBarChartProps {
  arms: { a: ArmEstimate; b: ArmEstimate };
  confidence: number;
  formatValue: (value: number) => string;
  labels?: { a: string; b: string };
  height?: number;
}

const COLORS = ['var(--chart-control)', 'var(--chart-variant)'] as const;

/** Arm estimates with asymmetric CI whiskers (Wilson for rates, t for means). */
export function ErrorBarChart({ arms, confidence, formatValue, labels = { a: 'Control (A)', b: 'Variant (B)' }, height = 280 }: ErrorBarChartProps) {
  const data = [
    { name: labels.a, value: arms.a.estimate, ci: arms.a.ci, err: [arms.a.estimate - arms.a.ci[0], arms.a.ci[1] - arms.a.estimate] },
    { name: labels.b, value: arms.b.estimate, ci: arms.b.ci, err: [arms.b.estimate - arms.b.ci[0], arms.b.ci[1] - arms.b.estimate] },
  ];
  const pct = Math.round(confidence * 100);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="name"
            axisLine={{ stroke: 'var(--hairline-strong)' }}
            tickLine={false}
            interval={0}
            height={44}
            tick={({ x, y, payload, index }) => (
              <g transform={`translate(${x},${y})`}>
                <text textAnchor="middle" dy={14} fontSize={12} fill="var(--muted)" fontWeight={500}>
                  {payload.value}
                </text>
                <text textAnchor="middle" dy={31} fontSize={13} fill="var(--fg)" fontWeight={600} className="tabular">
                  {formatValue(data[index]?.value ?? 0)}
                </text>
              </g>
            )}
          />
          <YAxis domain={[0, 'auto']} tickFormatter={formatValue} axisLine={false} tickLine={false} width={56} tick={{ fontSize: 11, fill: 'var(--faint)' }} />
          <Tooltip
            cursor={{ fill: 'var(--fill)', radius: 8 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !row) return null;
              return (
                <ChartTooltip
                  title={row.name}
                  rows={[
                    { key: 'v', label: 'Estimate', value: formatValue(row.value) },
                    { key: 'ci', label: `${pct}% CI`, value: `${formatValue(row.ci[0])} – ${formatValue(row.ci[1])}` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={700}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
            <ErrorBar dataKey="err" width={10} strokeWidth={1.5} stroke="var(--fg-secondary)" direction="y" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
