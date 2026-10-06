'use client';

import { motion } from 'framer-motion';
import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Accessible label when `label` is icon-only. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
}

/** iOS-style segmented control: a sliding thumb shared via `layoutId`. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('relative inline-flex rounded-[10px] bg-fill p-[2px]', fullWidth && 'flex w-full', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'relative z-0 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] font-medium tracking-tight transition-colors duration-200',
              size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3.5 text-[13px]',
              fullWidth && 'flex-1',
              selected ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segment-${id}`}
                transition={spring}
                className="absolute inset-0 -z-10 rounded-[8px] bg-elevated shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]"
              />
            )}
            {option.icon && <span className="[&>svg]:size-3.5">{option.icon}</span>}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
