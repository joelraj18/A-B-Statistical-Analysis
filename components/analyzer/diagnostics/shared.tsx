'use client';

import { cn } from '@/lib/cn';

export function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' | 'warning' }) {
  return (
    <div className="rounded-2xl bg-fill px-4 py-3">
      <p className="text-[12px] text-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-1 text-[20px] font-semibold tracking-tight',
          tone === 'positive' && 'text-positive',
          tone === 'negative' && 'text-negative',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Compact numeric cell input for dense tables. */
export function CellInput({ value, onChange, label, integer = true }: { value: number; onChange: (v: number) => void; label: string; integer?: boolean }) {
  return (
    <input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={label}
      value={Number.isFinite(value) ? value : ''}
      step={integer ? 1 : 'any'}
      min={0}
      onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      className="tabular h-9 w-full min-w-[84px] rounded-lg border border-hairline bg-elevated/70 px-2 text-right text-[13px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft dark:bg-white/[0.04]"
    />
  );
}
