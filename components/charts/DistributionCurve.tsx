'use client';

import { useMemo } from 'react';
import { Area, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { normCdf, normPdf } from '@/lib/stats/distributions';
import { formatPct } from '@/lib/stats/format';
import { ChartTooltip, LegendItem } from './ChartTooltip';

interface Arm {
  mean: number;
  se: number;
}

export interface DistributionCurveProps {
  control: Arm;
  variant: Arm;
  formatValue: (value: number) => string;
  labels?: { control: string; variant: string };
  height?: number;
}

interface Point {
  x: number;
  control: number;
  variant: number;
  overlap: number;
}

const POINTS = 161;
const CONTROL = 'var(--chart-control)';
const VARIANT = 'var(--chart-variant)';

/** Guards a zero SE (e.g. 0 conversions) so the PDF stays finite. */
function safeSe(arm: Arm, other: Arm): number {
  if (arm.se > 0) return arm.se;
  return Math.max(other.se * 0.05, Math.abs(arm.mean) * 1e-4, 1e-9);
}

/**
 * Sampling distributions of each arm's estimate, N(mean, SE²).
 *
 * Unlike the v2 template, densities are properly normalised — an arm with a
 * larger SE has a lower, wider curve — and the shared area (the overlap
 * coefficient) is shaded with a texture rather than a third hue.
 */
export function DistributionCurve({ control, variant, formatValue, labels = { control: 'Control (A)', variant: 'Variant (B)' }, height = 280 }: DistributionCurveProps) {
  const seA = safeSe(control, variant);
  const seB = safeSe(variant, control);

  const { data, yMax, overlapCoefficient, domain } = useMemo(() => {
    const lo = Math.min(control.mean - 4 * seA, variant.mean - 4 * seB);
    const hi = Math.max(control.mean + 4 * seA, variant.mean + 4 * seB);
    const step = (hi - lo) / (POINTS - 1);
    const points: Point[] = [];
    let peak = 0;
    let shared = 0;
    for (let i = 0; i < POINTS; i++) {
      const x = lo + i * step;
      const c = normPdf(x, control.mean, seA);
      const v = normPdf(x, variant.mean, seB);
      const o = Math.min(c, v);
      peak = Math.max(peak, c, v);
      shared += o * step;
      points.push({ x, control: c, variant: v, overlap: o });
    }
    return { data: points, yMax: peak, overlapCoefficient: Math.min(1, shared), domain: [lo, hi] as [number, number] };
  }, [control.mean, variant.mean, seA, seB]);

  const sigmaTicks = (arm: Arm, se: number) => [-3, -2, -1, 1, 2, 3].map((k) => arm.mean + k * se);

  return (
    <figure className="w-full">
      <div style={{ height }} className="w-full" role="img" aria-label={`Sampling distributions: ${labels.control} centred at ${formatValue(control.mean)}, ${labels.variant} centred at ${formatValue(variant.mean)}. Overlap ${formatPct(overlapCoefficient, 0)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="dist-fill-control" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CONTROL} stopOpacity={0.18} />
                <stop offset="100%" stopColor={CONTROL} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="dist-fill-variant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VARIANT} stopOpacity={0.2} />
                <stop offset="100%" stopColor={VARIANT} stopOpacity={0.02} />
              </linearGradient>
              <pattern id="dist-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--fg)" strokeWidth="1" strokeOpacity="0.35" />
              </pattern>
            </defs>

            <XAxis
              dataKey="x"
              type="number"
              domain={domain}
              tickFormatter={formatValue}
              tickCount={6}
              axisLine={{ stroke: 'var(--hairline-strong)' }}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--faint)' }}
              dy={6}
            />
            <YAxis hide domain={[0, yMax * 1.1]} />

            <Tooltip
              cursor={{ stroke: 'var(--hairline-strong)', strokeWidth: 1 }}
              isAnimationActive={false}
              content={({ active, label }) => {
                if (!active || typeof label !== 'number') return null;
                return (
                  <ChartTooltip
                    title={formatValue(label)}
                    rows={[
                      { key: 'a', swatch: CONTROL, label: `${labels.control} below`, value: formatPct(normCdf(label, control.mean, seA), 1) },
                      { key: 'b', swatch: VARIANT, label: `${labels.variant} below`, value: formatPct(normCdf(label, variant.mean, seB), 1) },
                    ]}
                  />
                );
              }}
            />

            <Area type="monotone" dataKey="control" name={labels.control} stroke={CONTROL} strokeWidth={2} fill="url(#dist-fill-control)" isAnimationActive animationDuration={700} dot={false} activeDot={{ r: 4, fill: CONTROL, stroke: 'var(--bg-elevated)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="variant" name={labels.variant} stroke={VARIANT} strokeWidth={2} fill="url(#dist-fill-variant)" isAnimationActive animationDuration={700} dot={false} activeDot={{ r: 4, fill: VARIANT, stroke: 'var(--bg-elevated)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="overlap" name="Overlap" stroke="none" fill="url(#dist-hatch)" isAnimationActive={false} activeDot={false} tooltipType="none" />

            <ReferenceLine x={control.mean} stroke={CONTROL} strokeWidth={1} />
            <ReferenceLine x={variant.mean} stroke={VARIANT} strokeWidth={1} />
            {sigmaTicks(control, seA).map((x) => (
              <ReferenceLine key={`a${x}`} segment={[{ x, y: 0 }, { x, y: yMax * 0.04 }]} stroke={CONTROL} strokeWidth={1.5} />
            ))}
            {sigmaTicks(variant, seB).map((x) => (
              <ReferenceLine key={`b${x}`} segment={[{ x, y: 0 }, { x, y: yMax * 0.04 }]} stroke={VARIANT} strokeWidth={1.5} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <LegendItem swatch={CONTROL} label={labels.control} value={formatValue(control.mean)} />
        <LegendItem swatch={VARIANT} label={labels.variant} value={formatValue(variant.mean)} />
        <LegendItem hatch label="Overlap" value={formatPct(overlapCoefficient, 0)} />
        <span className="text-[11px] text-faint sm:ml-auto">Ticks mark ±1, 2, 3 standard errors</span>
      </figcaption>
    </figure>
  );
}
