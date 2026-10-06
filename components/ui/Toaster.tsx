'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { useToasts } from '@/lib/store/toast';

const ICONS = {
  neutral: <Info className="size-5 text-accent" />,
  positive: <CheckCircle2 className="size-5 text-positive" />,
  negative: <XCircle className="size-5 text-negative" />,
};

/** Notification-centre style toasts, top-centre, swipe-free. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            type="button"
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={spring}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-hairline bg-surface-strong px-4 py-3 text-left shadow-lift',
              'backdrop-blur-2xl backdrop-saturate-150',
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight">{t.title}</span>
              {t.description && <span className="mt-0.5 block truncate text-[13px] text-muted">{t.description}</span>}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
