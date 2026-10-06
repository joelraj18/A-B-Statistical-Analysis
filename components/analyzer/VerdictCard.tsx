'use client';

import { AlertTriangle, CheckCircle2, CircleSlash, Hourglass } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { cn } from '@/lib/cn';
import type { Narrative, Verdict } from '@/lib/stats/narrative';
import type { EngineSource } from '@/types/stats';

const STYLE: Record<Verdict, { icon: React.ReactNode; tint: string; ring: string }> = {
  ship: { icon: <CheckCircle2 />, tint: 'text-positive', ring: 'bg-positive-soft' },
  rollback: { icon: <CircleSlash />, tint: 'text-negative', ring: 'bg-negative-soft' },
  inconclusive: { icon: <Hourglass />, tint: 'text-muted', ring: 'bg-fill' },
  invalid: { icon: <AlertTriangle />, tint: 'text-warning', ring: 'bg-warning-soft' },
};

export function VerdictCard({ narrative, source }: { narrative: Narrative; source: EngineSource | null }) {
  const style = STYLE[narrative.verdict];
  return (
    <GlassCard strong className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl [&>svg]:size-6', style.ring, style.tint)}>{style.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[20px] font-semibold tracking-tight">{narrative.headline}</p>
        <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{narrative.action}</p>
      </div>
      <EngineStatusBadge source={source} className="shrink-0" />
    </GlassCard>
  );
}
