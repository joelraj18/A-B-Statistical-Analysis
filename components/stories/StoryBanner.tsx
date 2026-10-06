'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Check, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { buildRecord, saveExperiment } from '@/lib/experiments';
import { cn } from '@/lib/cn';
import { EASE_APPLE } from '@/lib/motion';
import { formatMoney } from '@/lib/stats/format';
import { useWorkspace, type ActiveStory } from '@/lib/store/workspace';
import { computeStory } from '@/lib/stories/compute';
import { getStory } from '@/lib/stories/personas';
import { focusAnchor, STORY_STEPS } from '@/lib/stories/steps';
import { PersonaAvatar } from './PersonaAvatar';

const TOOL_ROUTES = ['/planner', '/analyzer', '/history'];

function scrollToAnchor(id: string | undefined) {
  if (!id) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  // Wait for the route to render before scrolling.
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
}

/** Guided walkthrough of a persona's experiment inside the real tool. */
export function StoryBanner() {
  const active = useWorkspace((s) => s.activeStory);
  const setActiveStory = useWorkspace((s) => s.setActiveStory);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);
  const pathname = usePathname();
  const router = useRouter();

  const onToolPage = TOOL_ROUTES.some((r) => pathname.startsWith(r));
  if (!active || !onToolPage) return null;

  const story = getStory(active.id);
  const step = STORY_STEPS[active.step - 1]!;
  const computed = computeStory(active.id);
  const first = story.persona.name.split(' ')[0];

  const go = (next: ActiveStory['step']) => {
    const target = STORY_STEPS[next - 1]!;
    if (next === 3 && story.focus && story.focus !== 'cuped') setDiagnostics({ tab: story.focus });
    if (next === 4 && active.step === 3) {
      const analysis = story.analysis();
      const args = { name: story.experimentName, hypothesis: story.hypothesis, verdict: computed.narrative.verdict, source: 'local' as const };
      const record =
        analysis.metric === 'binary' && computed.primary.kind === 'binary'
          ? buildRecord(args, { result: computed.primary, input: { ...analysis.binary, confidence: story.confidence } })
          : analysis.metric === 'continuous' && computed.primary.kind === 'continuous'
            ? buildRecord(args, { result: computed.primary, input: { ...analysis.continuous, confidence: story.confidence } })
            : null;
      if (record) void saveExperiment(record);
    }
    setActiveStory({ id: active.id, step: next });
    if (!pathname.startsWith(target.route.slice(0, -1))) router.push(target.route);
    scrollToAnchor(next === 3 ? focusAnchor(story.focus) ?? 'results' : undefined);
  };

  return (
    <AnimatePresence>
      <motion.aside
        key={active.id}
        aria-label={`${first}’s story, step ${active.step} of 4`}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: EASE_APPLE }}
        className="no-print sticky top-16 z-20 mb-8 rounded-3xl border border-hairline bg-surface-strong p-4 shadow-lift backdrop-blur-2xl backdrop-saturate-150 sm:p-5 lg:top-4"
      >
        <div className="flex items-start gap-4">
          <PersonaAvatar initials={story.persona.initials} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[12px] font-semibold text-accent">
                {first}’s story · {step.phase}
              </p>
              <ol className="flex items-center gap-1.5" aria-label="Progress">
                {STORY_STEPS.map((s) => (
                  <li
                    key={s.step}
                    aria-current={s.step === active.step ? 'step' : undefined}
                    className={cn('h-1.5 rounded-full transition-all duration-300', s.step === active.step ? 'w-5 bg-accent' : s.step < active.step ? 'w-1.5 bg-accent/60' : 'w-1.5 bg-fill-strong')}
                  />
                ))}
              </ol>
            </div>
            <p className="mt-1 text-[16px] font-semibold tracking-tight">{step.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-fg-secondary">{step.instruction(story)}</p>
            {active.step === 4 && (
              <p className="mt-2 text-[14px] font-semibold">
                {story.impact.label}: <span className="tabular text-positive">{formatMoney(story.impact.amount(computed))}</span>
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {active.step > 1 && (
                <Button variant="secondary" size="sm" icon={<ArrowLeft />} onClick={() => go((active.step - 1) as ActiveStory['step'])}>
                  Back
                </Button>
              )}
              {active.step < 4 ? (
                <Button size="sm" onClick={() => go((active.step + 1) as ActiveStory['step'])}>
                  {active.step === 3 ? 'Save and decide' : 'Next step'}
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button size="sm" icon={<Check />} onClick={() => setActiveStory(null)}>
                  Finish story
                </Button>
              )}
              <Link href={`/stories/${story.id}/`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-accent hover:bg-accent-soft">
                <BookOpen className="size-4" /> Read the story
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStory(null)}
            aria-label="Exit story"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-fill text-muted transition hover:bg-fill-strong hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
