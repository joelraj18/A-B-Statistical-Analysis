'use client';

import { cn } from '@/lib/cn';
import { useEngineStatus } from '@/lib/store/engineStatus';
import type { EngineSource } from '@/types/stats';

const LABELS = {
  online: 'SciPy engine',
  offline: 'On-device engine',
  unconfigured: 'On-device engine',
  checking: 'Connecting…',
} as const;

/** Global engine indicator, or — given `source` — which engine produced a result. */
export function EngineStatusBadge({ source, className }: { source?: EngineSource | null; className?: string }) {
  const status = useEngineStatus((s) => s.status);
  const versions = useEngineStatus((s) => s.versions);

  const label = source ? (source === 'scipy' ? 'Computed with SciPy' : 'Computed on-device') : LABELS[status];
  const live = source ? source === 'scipy' : status === 'online';
  const title =
    status === 'online' && versions
      ? Object.entries(versions)
          .map(([k, v]) => `${k} ${v}`)
          .join(' · ')
      : status === 'offline'
        ? 'The FastAPI service is unreachable — results use the double-precision TypeScript engine.'
        : status === 'unconfigured'
          ? 'Set NEXT_PUBLIC_API_URL to use the SciPy service. Results use the double-precision TypeScript engine.'
          : undefined;

  return (
    <span title={title} className={cn('inline-flex items-center gap-1.5 text-[12px] font-medium tracking-tight text-muted', className)}>
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-40" />}
        <span className={cn('relative inline-flex size-2 rounded-full', live ? 'bg-positive' : status === 'checking' && !source ? 'bg-faint' : 'bg-accent')} />
      </span>
      {label}
    </span>
  );
}
