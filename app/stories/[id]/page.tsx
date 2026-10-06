import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoryView } from '@/components/views/StoryView';
import { isStoryId, STORY_IDS } from '@/lib/stories/ids';
import { getStory } from '@/lib/stories/personas';

export const dynamicParams = false;

export function generateStaticParams() {
  return STORY_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isStoryId(id)) return {};
  const story = getStory(id);
  return { title: story.title, description: story.summary };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isStoryId(id)) notFound();
  return <StoryView id={id} />;
}
