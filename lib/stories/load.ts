import { requiredSampleSize } from '@/lib/stats/abEngine';
import { DEFAULT_DIAGNOSTICS, DEFAULT_DRAFT, useWorkspace, type ActiveStory } from '@/lib/store/workspace';
import type { StoryId } from './ids';
import { getStory } from './personas';

/** Writes a persona's plan, hypothesis, data and diagnostics into the workspace. */
export function loadStory(id: StoryId, step: ActiveStory['step'] = 1): void {
  const story = getStory(id);
  const plan = requiredSampleSize(story.plan);
  const analysis = story.analysis();
  const { setPlan, setDraft, setActiveStory } = useWorkspace.getState();

  setPlan({ ...story.plan, adoptedPerVariant: plan.perVariant, adoptedMde: story.plan.mde });
  setDraft({
    ...DEFAULT_DRAFT,
    metric: analysis.metric,
    name: story.experimentName,
    hypothesis: story.hypothesis,
    confidence: story.confidence,
    ...(analysis.metric === 'binary' ? { binary: analysis.binary } : { continuous: analysis.continuous }),
    diagnostics: { ...DEFAULT_DIAGNOSTICS, ...story.diagnostics },
  });
  setActiveStory({ id, step });
}
