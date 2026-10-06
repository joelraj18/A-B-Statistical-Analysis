import { cn } from '@/lib/cn';

/** Glass tooltip shell shared by every chart. Text uses text tokens, never series colour. */
export function ChartTooltip({ title, rows, className }: { title: React.ReactNode; rows: { key: string; swatch?: string; label: React.ReactNode; value: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn('min-w-[180px] rounded-xl border border-hairline bg-surface-strong px-3 py-2.5 text-[12px] shadow-lift backdrop-blur-2xl', className)}>
      <p className="tabular mb-1.5 border-b border-hairline pb-1.5 font-semibold text-fg">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            {row.swatch && <span className="size-2 shrink-0 rounded-full" style={{ background: row.swatch }} />}
            <span className="text-muted">{row.label}</span>
            <span className="tabular ml-auto pl-3 font-medium text-fg">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LegendItem({ swatch, label, value, hatch }: { swatch?: string; label: string; value?: string; hatch?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-muted">
      {hatch ? (
        <span className="size-3 rounded-[3px] border border-hairline-strong bg-[repeating-linear-gradient(135deg,var(--fg)_0_1px,transparent_1px_4px)] opacity-60" />
      ) : (
        <span className="h-[3px] w-3.5 rounded-full" style={{ background: swatch }} />
      )}
      <span className="font-medium text-fg-secondary">{label}</span>
      {value && <span className="tabular text-faint">{value}</span>}
    </span>
  );
}
