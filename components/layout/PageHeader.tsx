'use client';

import { motion } from 'framer-motion';
import { EASE_APPLE } from '@/lib/motion';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_APPLE }}
      className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-[13px] font-semibold tracking-tight text-accent">{eyebrow}</p>}
        <h1 className="text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[40px]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-[17px]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}
