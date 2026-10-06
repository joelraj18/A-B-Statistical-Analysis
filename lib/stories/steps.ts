import type { ActiveStory } from '@/lib/store/workspace';
import type { Story, StoryFocus } from './types';

export interface StoryStep {
  step: ActiveStory['step'];
  phase: string;
  title: string;
  route: '/planner/' | '/analyzer/' | '/history/';
  anchor?: string;
  instruction: (story: Story) => string;
}

const FOCUS_LABEL: Record<Exclude<StoryFocus, null>, string> = {
  cuped: 'CUPED',
  segments: 'Segments',
  outliers: 'Outliers',
  trend: 'Time trend',
  interference: 'Interference',
  switchback: 'Switchback',
};

export const STORY_STEPS: readonly StoryStep[] = [
  {
    step: 1,
    phase: 'Phase 1',
    title: 'Plan the sample',
    route: '/planner/',
    instruction: (s) =>
      `${s.persona.name.split(' ')[0]}’s inputs are loaded and the plan is adopted. Check the required sample, the run time and the power curve.${s.planNote ? ` ${s.planNote}` : ''}`,
  },
  {
    step: 2,
    phase: 'Phase 2',
    title: 'Declare the hypothesis',
    route: '/analyzer/',
    instruction: (s) => `Read the Hypothesis card on the left. ${s.chapters.hypothesis}`,
  },
  {
    step: 3,
    phase: 'Phase 3',
    title: 'Analyse the results',
    route: '/analyzer/',
    anchor: 'results',
    instruction: (s) =>
      s.focus
        ? `Start with the verdict and KPI tiles, then scroll to the ${FOCUS_LABEL[s.focus]} panel: it shows the trap behind ${s.persona.name.split(' ')[0]}’s numbers.`
        : 'Read the verdict, the KPI tiles and the distribution chart. This one is a clean, well powered test.',
  },
  {
    step: 4,
    phase: 'Phase 4',
    title: 'Decide and archive',
    route: '/history/',
    instruction: (s) => `${s.chapters.decide} The experiment is saved to your archive with its hypothesis.`,
  },
];

export function focusAnchor(focus: StoryFocus): string | undefined {
  if (!focus) return undefined;
  return focus === 'cuped' ? 'cuped' : 'diagnostics';
}
