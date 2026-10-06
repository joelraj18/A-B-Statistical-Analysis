'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { EASE_APPLE } from '@/lib/motion';

export interface IntervalRow {
  key: string;
  label: string;
  estimate: number;
  ci: readonly [number, number];
  /** Emphasised rows use the accent; others are de-emphasised gray. */
  emphasis?: boolean;
}

interface ConfidenceIntervalPlotProps {
  rows: IntervalRow[];
  formatValue: (value: number) => string;
  /** Reference markers such as ±MDE. */
  markers?: { value: number; label: string }[];
  caption?: React.ReactNode;
}

function niceStep(span: number) {
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

/**
 * Forest-style interval plot of the treatment effect. Built in HTML so labels
 * stay crisp at any width; the zero line is the "no effect" reference.
 */
export function ConfidenceIntervalPlot({ rows, formatValue, markers = [], caption }: ConfidenceIntervalPlotProps) {
  const [hover, setHover] = useState<string | null>(null);

  const values = [0, ...rows.flatMap((r) => [r.ci[0], r.ci[1]]), ...markers.map((m) => m.value)].filter(Number.isFinite);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  lo -= pad;
  hi += pad;
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;

  return (
    <figure>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const crossesZero = row.ci[0] <= 0 && row.ci[1] >= 0;
          const color = row.emphasis ? 'var(--chart-variant)' : 'var(--chart-control)';
          return (
            <div
              key={row.key}
              className="grid grid-cols-1 gap-1.5 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-4"
              onMouseEnter={() => setHover(row.key)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-baseline justify-between gap-2 sm:block">
                <p className="text-[13px] font-medium text-fg-secondary">{row.label}</p>
                <p className="tabular text-[12px] text-faint">
                  {formatValue(row.ci[0])} to {formatValue(row.ci[1])}
                </p>
              </div>
              <div className="relative h-9" title={`${row.label}: ${formatValue(row.estimate)} [${formatValue(row.ci[0])}, ${formatValue(row.ci[1])}]`}>
                <div className="absolute inset-x-0 top-1/2 h-px bg-hairline" />
                <div className="absolute inset-y-0 w-px bg-hairline-strong" style={{ left: pos(0) }} />
                {markers.map((m) => (
                  <div key={m.label} className="absolute inset-y-1 w-px bg-warning/60" style={{ left: pos(m.value) }} />
                ))}
                <motion.div
                  className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full"
                  style={{ background: color, opacity: crossesZero ? 0.55 : 0.9 }}
                  initial={{ left: pos(row.estimate), width: 0 }}
                  animate={{ left: pos(row.ci[0]), width: `calc(${pos(row.ci[1])} - ${pos(row.ci[0])})` }}
                  transition={{ duration: 0.7, ease: EASE_APPLE, delay: i * 0.08 }}
                />
                <motion.div
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--bg-elevated)]"
                  style={{ background: color }}
                  initial={{ left: pos(0) }}
                  animate={{ left: pos(row.estimate), scale: hover === row.key ? 1.25 : 1 }}
                  transition={{ duration: 0.7, ease: EASE_APPLE }}
                />
                {hover === row.key && (
                  <div
                    className="tabular pointer-events-none absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-1.5 py-0.5 text-[11px] font-semibold text-bg"
                    style={{ left: pos(row.estimate) }}
                  >
                    {formatValue(row.estimate)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] sm:gap-4">
          <div className="hidden sm:block" />
          <div className="relative h-5 border-t border-hairline">
            {ticks.map((t) => (
              <span
                key={t}
                className={cn('tabular absolute top-1.5 -translate-x-1/2 text-[11px]', t === 0 ? 'font-semibold text-fg-secondary' : 'text-faint')}
                style={{ left: pos(t) }}
              >
                {formatValue(t)}
              </span>
            ))}
          </div>
        </div>
      </div>
      {(markers.length > 0 || caption) && (
        <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
          {markers.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-px bg-warning" /> {markers.map((m) => m.label).join(' / ')}
            </span>
          )}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
