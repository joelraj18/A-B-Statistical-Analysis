import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageHeader';
import { StoryCard } from '@/components/stories/StoryCard';
import { STORIES } from '@/lib/stories/personas';

export const metadata: Metadata = {
  title: 'Story Guide',
  description: 'Nine practitioners, nine different problems, each followed through all four phases',
};

export default function StoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Story guide"
        title="Learn from real scenarios"
        description="Nine practitioners with nine different problems, each followed from plan to decision with their own data"
      />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STORIES.map((s) => (
          <li key={s.id}>
            <StoryCard story={s} />
          </li>
        ))}
      </ul>
    </>
  );
}
