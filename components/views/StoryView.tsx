'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CircleDollarSign, Lightbulb, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfidenceIntervalPlot, type IntervalRow } from '@/components/charts/ConfidenceIntervalPlot';
import { DistributionCurve } from '@/components/charts/DistributionCurve';
import { PowerCurve } from '@/components/charts/PowerCurve';
import { TrendChart } from '@/components/charts/TrendChart';
import { KpiGrid } from '@/components/analyzer/KpiGrid';
import { VerdictCard } from '@/components/analyzer/VerdictCard';
import { PersonaAvatar } from '@/components/stories/PersonaAvatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { EASE_APPLE } from '@/lib/motion';
import { formatDecimal, formatMoney, formatNum, formatPct, formatPoints, formatSignedDecimal, formatSignedPct } from '@/lib/stats/format';
import { computeStory } from '@/lib/stories/compute';
import type { StoryId } from '@/lib/stories/ids';
import { loadStory } from '@/lib/stories/load';
import { getStory, STORIES } from '@/lib/stories/personas';
import type { Story, StoryComputed } from '@/lib/stories/types';
import { hypothesisStatement } from '@/types/experiment';

function Chapter({ phase, title, children, id }: { phase: string; title: string; children: React.ReactNode; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE_APPLE }}
      className="relative scroll-mt-24 pl-8 sm:pl-12"
    >
      <span aria-hidden className="absolute left-[7px] top-1.5 size-3 rounded-full bg-accent ring-4 ring-accent-soft sm:left-[15px]" />
      <p className="text-[13px] font-semibold text-accent">{phase}</p>
      <h2 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </motion.section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-[16px] leading-relaxed text-fg-secondary sm:text-[17px]">{children}</p>;
}

function DiagnosticEvidence({ story, c }: { story: Story; c: StoryComputed }) {
  if (story.focus === 'cuped' && c.cuped) {
    return (
      <GlassCard>
        <CardHeader title="What CUPED reveals" description={`Variance of the estimate falls ${formatPct(c.cuped.varianceReduction.estimator, 0)}`} />
        <ConfidenceIntervalPlot
          formatValue={(v) => formatSignedDecimal(v, 0)}
          rows={[
            { key: 'raw', label: 'Unadjusted Δ', estimate: c.cuped.original.absoluteDiff, ci: c.cuped.original.ciAbsolute },
            { key: 'cuped', label: 'CUPED Δ', estimate: c.cuped.adjusted.absoluteDiff, ci: c.cuped.adjusted.ciAbsolute, emphasis: true },
          ]}
          caption="Revenue per account, 95% intervals"
        />
      </GlassCard>
    );
  }
  if (story.focus === 'segments' && c.segments) {
    const rows: IntervalRow[] = [
      { key: 'p', label: 'Pooled', estimate: c.segments.pooled.absoluteDiff, ci: c.segments.pooled.ciAbsolute },
      ...c.segments.segments.map((s) => ({ key: s.name, label: s.name, estimate: s.result.absoluteDiff, ci: s.result.ciAbsolute })),
      { key: 's', label: 'Stratified', estimate: c.segments.stratified.absoluteDiff, ci: c.segments.stratified.ciAbsolute, emphasis: true },
    ];
    return (
      <GlassCard>
        <CardHeader title="What the segment check reveals" description="Every device improves while the pooled rate falls" />
        <ConfidenceIntervalPlot formatValue={(v) => formatPoints(v, 1)} rows={rows} caption="Conversion difference B minus A, 95% intervals" />
      </GlassCard>
    );
  }
  if (story.focus === 'outliers' && c.robust) {
    return (
      <GlassCard>
        <CardHeader title="What Winsorization reveals" description={`Skewness ${formatDecimal(c.robust.skewness, 0)}, capped at the 99th percentile`} />
        <ConfidenceIntervalPlot
          formatValue={(v) => formatSignedDecimal(v, 0)}
          rows={[
            { key: 'raw', label: 'Raw Δ', estimate: c.robust.raw.absoluteDiff, ci: c.robust.raw.ciAbsolute },
            { key: 'w', label: 'Winsorized Δ', estimate: c.robust.winsorized.absoluteDiff, ci: c.robust.winsorized.ciAbsolute, emphasis: true },
          ]}
          caption="Revenue per trader in dollars, 95% intervals"
        />
      </GlassCard>
    );
  }
  if (story.focus === 'trend' && c.trend) {
    return (
      <GlassCard>
        <CardHeader title="What the trend check reveals" description="The daily lift climbs from negative to positive as viewers adapt" />
        <TrendChart result={c.trend} learningDays={story.diagnostics?.trend?.learningDays ?? 14} />
      </GlassCard>
    );
  }
  if (story.focus === 'interference' && c.interference) {
    const rows: IntervalRow[] = [
      { key: 'n', label: 'Naive, B vs A', estimate: c.interference.naive.absoluteDiff, ci: c.interference.naive.ciAbsolute },
      { key: 'c', label: 'Control vs baseline', estimate: c.interference.controlShift.absoluteDiff, ci: c.interference.controlShift.ciAbsolute },
      c.switchback
        ? { key: 'sb', label: 'Switchback', estimate: c.switchback.result.absoluteDiff, ci: c.switchback.result.ciAbsolute, emphasis: true }
        : { key: 'g', label: 'Global, B vs baseline', estimate: c.interference.global.absoluteDiff, ci: c.interference.global.ciAbsolute, emphasis: true },
    ];
    return (
      <GlassCard>
        <CardHeader title="What the interference check reveals" description="Control got worse while the test ran, so the naive lift is borrowed" />
        <ConfidenceIntervalPlot formatValue={(v) => formatPoints(v, 0)} rows={rows} caption="Differences in percentage points, 95% intervals" />
      </GlassCard>
    );
  }
  return null;
}

export function StoryView({ id }: { id: StoryId }) {
  const router = useRouter();
  const story = getStory(id);
  const c = computeStory(id);
  const isBinary = c.primary.kind === 'binary';
  const fmtValue = isBinary ? (v: number) => formatPct(v, 2) : (v: number) => formatDecimal(v, 2);
  const amount = story.impact.amount(c);
  const index = STORIES.findIndex((s) => s.id === id);
  const next = STORIES[(index + 1) % STORIES.length]!;

  const follow = () => {
    loadStory(id);
    router.push('/planner/');
  };

  return (
    <article className="pb-8">
      <Link href="/stories/" className="mb-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline">
        <ArrowLeft className="size-4" /> All stories
      </Link>

      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_APPLE }} className="mb-12">
        <div className="flex items-center gap-4">
          <PersonaAvatar initials={story.persona.initials} size="lg" />
          <div>
            <p className="text-[17px] font-semibold tracking-tight">{story.persona.name}</p>
            <p className="text-[14px] text-muted">
              {story.persona.role} · {story.persona.company}
            </p>
          </div>
        </div>
        <h1 className="mt-6 max-w-3xl text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[48px]">{story.title}</h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[19px]">{story.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge>{story.trap}</Badge>
          <Badge tone={story.outcome.tone}>{story.outcome.label}</Badge>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" icon={<PlayCircle />} onClick={follow}>
            Follow in the tool
          </Button>
          <a href="#decide" className="inline-flex h-12 items-center gap-2 rounded-full bg-fill px-6 text-[15px] font-medium text-fg transition hover:bg-fill-strong">
            <CircleDollarSign className="size-4" /> {formatMoney(amount)} outcome
          </a>
        </div>
      </motion.header>

      <GlassCard className="mb-12" strong>
        <CardHeader title="The problem" />
        <Prose>{story.problem}</Prose>
      </GlassCard>

      <div className="relative space-y-16">
        <span aria-hidden className="absolute bottom-2 left-[12px] top-2 w-px bg-hairline-strong sm:left-[20px]" />

        <Chapter phase="Phase 1" title="Plan the sample">
          <Prose>{story.chapters.plan(c)}</Prose>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <GlassCard strong>
              <p className="text-[13px] font-semibold text-muted">Required sample size</p>
              <p className="tabular mt-3 text-[48px] font-semibold leading-none tracking-[-0.03em]">{formatNum(c.plan.perVariant)}</p>
              <p className="mt-1 text-[15px] text-muted">per variant</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-5 text-[13px]">
                {[
                  ['Baseline', formatPct(story.plan.baselineRate, 1)],
                  ['Target lift', formatSignedPct(story.plan.mde, 0)],
                  ['Power', formatPct(story.plan.power, 0)],
                  ['Alpha', formatPct(story.plan.alpha, 0)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="tabular mt-0.5 text-[15px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
            <GlassCard>
              <CardHeader title="Power curve" description={story.planNote ?? 'Probability of detecting the target lift as the sample grows'} />
              <PowerCurve controlRate={c.plan.controlRate} variantRate={c.plan.variantRate} alpha={story.plan.alpha} targetPower={story.plan.power} requiredN={c.plan.perVariant} height={200} />
            </GlassCard>
          </div>
        </Chapter>

        <Chapter phase="Phase 2" title="Declare the hypothesis">
          <Prose>{story.chapters.hypothesis}</Prose>
          <GlassCard strong>
            <p className="text-[20px] font-medium italic leading-relaxed tracking-tight sm:text-[22px]">“{hypothesisStatement(story.hypothesis)}”</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              {(
                [
                  ['If we', story.hypothesis.change],
                  ['then', story.hypothesis.metric],
                  ['will', story.hypothesis.effect],
                  ['because', story.hypothesis.rationale],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-fill px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{k}</dt>
                  <dd className="mt-1 text-fg-secondary">{v}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        </Chapter>

        <Chapter phase="Phase 3" title="Analyse the results">
          <Prose>{story.chapters.analyze(c)}</Prose>
          <p className="text-[13px] font-semibold text-muted">What the top line says</p>
          <VerdictCard narrative={c.narrative} source="local" />
          <KpiGrid result={c.primary} />
          <GlassCard>
            <CardHeader title="Distribution analysis" description="Sampling distribution of each arm’s estimate" />
            <DistributionCurve control={{ mean: c.primary.arms.a.estimate, se: c.primary.arms.a.se }} variant={{ mean: c.primary.arms.b.estimate, se: c.primary.arms.b.se }} formatValue={fmtValue} />
          </GlassCard>
          <DiagnosticEvidence story={story} c={c} />
        </Chapter>

        <Chapter phase="Phase 4" title="Decide and archive" id="decide">
          <Prose>{story.chapters.decide}</Prose>
          <GlassCard strong padding="lg">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <CircleDollarSign className="size-4" /> {story.impact.label}
            </p>
            <p className={`tabular mt-3 text-[56px] font-semibold leading-none tracking-[-0.035em] ${story.impact.kind === 'gain' ? 'text-positive' : 'text-accent'}`}>
              {formatMoney(amount)}
            </p>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-secondary">{story.impact.explain(c)}</p>
            <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-hairline pt-5 text-[13px] sm:grid-cols-3">
              {story.impact.assumptions.map((a) => (
                <div key={a.label}>
                  <dt className="text-muted">{a.label}</dt>
                  <dd className="tabular mt-0.5 text-[15px] font-semibold">{a.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12px] text-faint">Illustrative business assumptions; the statistical results are computed live from the data shown above.</p>
          </GlassCard>
          <GlassCard>
            <CardHeader icon={<Lightbulb />} title="The lesson" />
            <Prose>{story.lesson}</Prose>
            <p className="mt-4 text-[13px] text-muted">
              <BookOpen className="mr-1.5 inline size-4" />
              {story.reference.cite}{' '}
              <a href={story.reference.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                doi
              </a>
            </p>
          </GlassCard>
        </Chapter>
      </div>

      <div className="mt-16 flex flex-col gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Button size="lg" icon={<PlayCircle />} onClick={follow}>
          Follow {story.persona.name.split(' ')[0]} in the tool
        </Button>
        <Link href={`/stories/${next.id}/`} className="group inline-flex items-center gap-2 text-[15px] font-medium text-accent">
          Next: {next.title}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
