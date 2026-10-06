'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { EASE_APPLE } from '@/lib/motion';

type Tone = 'warning' | 'negative' | 'accent' | 'positive';

const TONES: Record<Tone, string> = {
  warning: 'bg-warning-soft text-warning',
  negative: 'bg-negative-soft text-negative',
  accent: 'bg-accent-soft text-accent',
  positive: 'bg-positive-soft text-positive',
};

export function Callout({ tone, icon, title, children, className }: { tone: Tone; icon: React.ReactNode; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <motion.div
      role={tone === 'negative' || tone === 'warning' ? 'alert' : 'status'}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: EASE_APPLE }}
      className="overflow-hidden"
    >
      <div className={cn('flex gap-3 rounded-2xl px-4 py-3.5', TONES[tone], className)}>
        <span className="mt-0.5 shrink-0 [&>svg]:size-[18px]">{icon}</span>
        <div className="min-w-0 text-[13px] leading-relaxed">
          <p className="font-semibold">{title}</p>
          {children && <div className="mt-0.5 text-fg-secondary">{children}</div>}
        </div>
      </div>
    </motion.div>
  );
}
