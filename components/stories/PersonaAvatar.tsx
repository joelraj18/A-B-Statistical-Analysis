import { cn } from '@/lib/cn';

/** Monogram avatar; persona identity never relies on colour alone. */
export function PersonaAvatar({ initials, size = 'md', className }: { initials: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-fg font-semibold tracking-tight text-bg',
        size === 'sm' && 'size-8 text-[12px]',
        size === 'md' && 'size-11 text-[14px]',
        size === 'lg' && 'size-16 text-[20px]',
        className,
      )}
    >
      {initials}
    </span>
  );
}
