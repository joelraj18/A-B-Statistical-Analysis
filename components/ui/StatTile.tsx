'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { EASE_APPLE } from '@/lib/motion';
import { GlassCard } from './GlassCard';

export type StatTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent';

const VALUE_TONES: Record<StatTone, string> = {
  neutral: 'text-fg',
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
  accent: 'text-accent',
};

interface StatTileProps {
  label: string;
  value: string;
  caption?: React.ReactNode;
  tone?: StatTone;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** KPI tile: label, large tabular value that cross-fades on change, caption. */
export function StatTile({ label, value, caption, tone = 'neutral', icon, footer, className }: StatTileProps) {
  return (
    <GlassCard padding="sm" className={cn('flex min-h-[132px] flex-col justify-between sm:p-5', className)}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium tracking-tight text-muted [&>svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="relative mt-3 h-9 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE_APPLE }}
            className={cn('tabular absolute inset-0 text-[28px] font-semibold leading-9 tracking-tight', VALUE_TONES[tone])}
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>
      {caption && <div className="mt-1.5 text-[12px] leading-snug text-muted">{caption}</div>}
      {footer}
    </GlassCard>
  );
}
