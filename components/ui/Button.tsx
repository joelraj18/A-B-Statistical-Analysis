'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-[0_1px_2px_rgb(0_0_0/0.12)]',
  secondary: 'bg-fill text-fg hover:bg-fill-strong',
  ghost: 'text-accent hover:bg-accent-soft',
  destructive: 'bg-negative text-white hover:opacity-90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-full',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-full',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-full',
};

export function Button({ variant = 'primary', size = 'md', icon, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={props.disabled ? undefined : { scale: 0.96 }}
      transition={spring}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium tracking-tight transition-colors duration-200',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon && <span className="-ml-0.5 [&>svg]:size-4">{icon}</span>}
      {children}
    </motion.button>
  );
}
