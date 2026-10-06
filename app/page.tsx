import { Archive, ArrowRight, BookOpen, FlaskConical, PenLine, Target } from 'lucide-react';
import Link from 'next/link';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { GlassCard } from '@/components/ui/GlassCard';

const PHASES = [
  {
    href: '/planner/',
    phase: 'Phase 1',
    title: 'Plan',
    body: 'Compute the exact traffic needed for 80–95% power before any code ships.',
    icon: Target,
  },
  {
    href: '/analyzer/',
    phase: 'Phase 2',
    title: 'Hypothesise',
    body: 'Declare change, metric, effect and rationale up front — no HARKing.',
    icon: PenLine,
  },
  {
    href: '/analyzer/',
    phase: 'Phase 3',
    title: 'Analyse',
    body: 'Exact Z and Welch tests, SRM checks, CUPED and a plain-English verdict.',
    icon: FlaskConical,
  },
  {
    href: '/history/',
    phase: 'Phase 4',
    title: 'Archive',
    body: 'Build a searchable ledger of every hypothesis and outcome.',
    icon: Archive,
  },
];

export default function OverviewPage() {
  return (
    <div className="pb-8">
      <section className="pb-12 pt-6 sm:pt-12">
        <EngineStatusBadge className="mb-6" />
        <h1 className="max-w-3xl text-balance text-[44px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[64px]">
          Experimentation,
          <br />
          <span className="text-muted">done rigorously.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[19px]">
          Plan, analyse and archive controlled experiments with mathematically exact inference — SciPy on the server, a double-precision engine in your
          browser when it’s offline.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/planner/" className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-medium text-white transition hover:bg-accent-hover">
            Start with a plan <ArrowRight className="size-4" />
          </Link>
          <Link href="/guide/" className="inline-flex h-12 items-center gap-2 rounded-full bg-fill px-6 text-[15px] font-medium text-fg transition hover:bg-fill-strong">
            <BookOpen className="size-4" /> Read the methodology
          </Link>
        </div>
      </section>

      <section aria-label="Experiment lifecycle" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PHASES.map(({ href, phase, title, body, icon: Icon }) => (
          <Link key={phase} href={href} className="group rounded-3xl">
            <GlassCard interactive className="h-full">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon className="size-5" />
              </span>
              <p className="mt-5 text-[12px] font-semibold text-faint">{phase}</p>
              <h2 className="mt-0.5 text-[20px] font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
              <ArrowRight className="mt-5 size-4 text-faint transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent" />
            </GlassCard>
          </Link>
        ))}
      </section>

      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { k: '1e-15', v: 'Agreement between the on-device normal CDF and SciPy' },
          { k: 'χ² SRM', v: 'Sample-ratio-mismatch check on every binary analysis' },
          { k: 'CUPED', v: 'Pre-experiment covariates for up to 50%+ variance reduction' },
        ].map((s) => (
          <div key={s.k} className="border-t border-hairline pt-4">
            <p className="tabular text-[24px] font-semibold tracking-tight">{s.k}</p>
            <p className="mt-1 text-[14px] text-muted">{s.v}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
