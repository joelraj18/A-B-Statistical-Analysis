'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  /** Lifts on hover — use for cards that are clickable or invite exploration. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Stronger fill for content that sits on top of other glass. */
  strong?: boolean;
}

const PADDING = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' } as const;

/**
 * Frosted surface: translucent fill, hairline border, ambient backdrop blur.
 * The border sits inside the shadow so it reads as a 0.5px edge on retina.
 */
export function GlassCard({ interactive = false, padding = 'md', strong = false, className, children, ...props }: GlassCardProps) {
  return (
    <motion.div
      whileHover={interactive ? { y: -3 } : undefined}
      transition={spring}
      className={cn(
        'relative rounded-3xl border border-hairline shadow-card',
        'backdrop-blur-xl backdrop-saturate-150',
        strong ? 'bg-surface-strong' : 'bg-surface',
        interactive && 'transition-shadow duration-300 hover:shadow-lift',
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-fg">
          {icon && <span className="text-muted [&>svg]:size-[18px]">{icon}</span>}
          {title}
        </h3>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
