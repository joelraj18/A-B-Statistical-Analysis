'use client';

import { FileText } from 'lucide-react';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import type { Narrative } from '@/lib/stats/narrative';

export function NarrativeSummary({ narrative }: { narrative: Narrative }) {
  return (
    <GlassCard>
      <CardHeader icon={<FileText />} title="Executive summary" description="Plain-English readout for stakeholders." />
      <div className="space-y-3 text-[15px] leading-relaxed text-fg-secondary">
        {narrative.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="font-semibold text-fg">{narrative.action}</p>
      </div>
    </GlassCard>
  );
}
