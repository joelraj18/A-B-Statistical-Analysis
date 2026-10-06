import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warning';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-fill text-fg-secondary',
  accent: 'bg-accent-soft text-accent',
  positive: 'bg-positive-soft text-positive',
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: BadgeTone; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium tracking-tight [&>svg]:size-3.5', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
