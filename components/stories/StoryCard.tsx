import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMoney } from '@/lib/stats/format';
import { computeStory } from '@/lib/stories/compute';
import type { Story } from '@/lib/stories/types';
import { PersonaAvatar } from './PersonaAvatar';

export function StoryCard({ story }: { story: Story }) {
  const amount = story.impact.amount(computeStory(story.id));
  return (
    <Link href={`/stories/${story.id}/`} className="group block h-full rounded-3xl">
      <GlassCard interactive className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <PersonaAvatar initials={story.persona.initials} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-tight">{story.persona.name}</p>
            <p className="truncate text-[12px] text-muted">
              {story.persona.role} · {story.persona.company}
            </p>
          </div>
        </div>
        <h2 className="mt-5 text-balance text-[19px] font-semibold leading-snug tracking-tight">{story.title}</h2>
        <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{story.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone="neutral">{story.trap}</Badge>
          <Badge tone={story.outcome.tone}>{story.outcome.label}</Badge>
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
          <div>
            <p className="text-[11px] text-faint">{story.impact.label}</p>
            <p className="tabular text-[22px] font-semibold tracking-tight">{formatMoney(amount)}</p>
          </div>
          <ArrowRight className="size-4 text-faint transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent" />
        </div>
      </GlassCard>
    </Link>
  );
}
