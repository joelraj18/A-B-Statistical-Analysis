'use client';

import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, LineChart, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { PowerCurve } from '@/components/charts/PowerCurve';
import { EngineStatusBadge } from '@/components/layout/EngineStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { NumberField, Slider } from '@/components/ui/Field';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { remoteEngine } from '@/lib/api/statsService';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { requiredSampleSize } from '@/lib/stats/abEngine';
import { formatNum, formatPct, formatPoints, formatSignedPct } from '@/lib/stats/format';
import { toast } from '@/lib/store/toast';
import { useWorkspace, useWorkspaceHydrated } from '@/lib/store/workspace';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import type { SampleSizeInput } from '@/types/stats';

const POWER = [
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 0.95, label: '95%' },
] as const;

const ALPHA = [
  { value: 0.1, label: '10%' },
  { value: 0.05, label: '5%' },
  { value: 0.01, label: '1%' },
] as const;

export function PlannerView() {
  const hydrated = useWorkspaceHydrated();
  return hydrated ? <PlannerWorkspace /> : <PageSkeleton />;
}

function PlannerWorkspace() {
  const plan = useWorkspace((s) => s.plan);
  const setPlan = useWorkspace((s) => s.setPlan);

  const input = useMemo<SampleSizeInput>(
    () => ({ baselineRate: plan.baselineRate, mde: plan.mde, power: plan.power, alpha: plan.alpha }),
    [plan.baselineRate, plan.mde, plan.power, plan.alpha],
  );
  const { data, error, source } = useHybridResult(input, requiredSampleSize, remoteEngine.sampleSize);

  const days = data && plan.dailyTraffic > 0 ? Math.ceil(data.total / plan.dailyTraffic) : null;
  const weeks = days ? Math.max(1, Math.ceil(days / 7)) : null;
  const adopted = data != null && plan.adoptedPerVariant === data.perVariant && plan.adoptedMde === plan.mde;

  const adopt = () => {
    if (!data) return;
    setPlan({ adoptedPerVariant: data.perVariant, adoptedMde: plan.mde });
    toast('Plan adopted', { description: `${formatNum(data.perVariant)} users per variant. The Analyzer will warn you about peeking.`, tone: 'positive' });
  };

  return (
    <>
      <PageHeader
        eyebrow="Phase 1 · Pre-experiment planning"
        title="Sample Planner"
        description="Size the experiment before writing code, because underpowered tests miss real effects and stopping early turns noise into false wins"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <GlassCard className="lg:sticky lg:top-8">
          <CardHeader title="Parameters" description="Two-sided test on a conversion rate" />
          <div className="space-y-6">
            <Slider
              label="Baseline conversion rate"
              min={0.005}
              max={0.5}
              step={0.001}
              value={plan.baselineRate}
              onChange={(baselineRate) => setPlan({ baselineRate })}
              format={(v) => formatPct(v, 1)}
              hint="Current performance of the control experience"
            />
            <Slider
              label="Minimum detectable effect"
              min={0.01}
              max={0.3}
              step={0.005}
              value={plan.mde}
              onChange={(mde) => setPlan({ mde })}
              format={(v) => formatSignedPct(v, 1)}
              hint="Smallest relative lift worth detecting"
            />
            <div>
              <p className="mb-1.5 text-[12px] font-medium tracking-tight text-muted">Statistical power (1 − β)</p>
              <SegmentedControl ariaLabel="Statistical power" options={POWER} value={plan.power} onChange={(power) => setPlan({ power })} fullWidth />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium tracking-tight text-muted">Significance level (α)</p>
              <SegmentedControl ariaLabel="Significance level" options={ALPHA} value={plan.alpha} onChange={(alpha) => setPlan({ alpha })} fullWidth />
            </div>
            <NumberField
              label="Eligible daily traffic"
              integer
              min={1}
              suffix="users"
              value={plan.dailyTraffic}
              onChange={(dailyTraffic) => setPlan({ dailyTraffic })}
              hint="Across both variants, used to estimate duration"
            />
          </div>
        </GlassCard>

        <div className="min-w-0 space-y-5">
          {error && (
            <Callout tone="negative" icon={<CircleAlert />} title="Can’t size this test">
              {error}
            </Callout>
          )}

          {data && (
            <>
              <GlassCard strong padding="lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold tracking-tight text-muted">Required sample size</p>
                  <EngineStatusBadge source={source} />
                </div>
                <p className="tabular mt-4 text-[56px] font-semibold leading-none tracking-[-0.035em] sm:text-[72px]">{formatNum(data.perVariant)}</p>
                <p className="mt-2 text-[17px] text-muted">users per variant</p>

                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-6 sm:grid-cols-4">
                  {[
                    { k: 'Total traffic', v: formatNum(data.total) },
                    { k: 'Control → Variant', v: `${formatPct(data.controlRate, 1)} → ${formatPct(data.variantRate, 2)}` },
                    { k: 'Absolute effect', v: formatPoints(data.absoluteEffect) },
                    { k: 'Duration', v: days ? `${formatNum(days)} day${days === 1 ? '' : 's'}` : '—' },
                  ].map(({ k, v }) => (
                    <div key={k}>
                      <dt className="text-[12px] text-muted">{k}</dt>
                      <dd className="tabular mt-1 text-[17px] font-semibold tracking-tight">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {adopted ? (
                    <Badge tone="positive" icon={<CheckCircle2 />}>
                      Adopted as the experiment plan
                    </Badge>
                  ) : (
                    <Button icon={<ShieldCheck />} onClick={adopt}>
                      Adopt plan
                    </Button>
                  )}
                  <Link href="/analyzer/" className="inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline">
                    Go to Analyzer <ArrowRight className="size-4" />
                  </Link>
                </div>
              </GlassCard>

              {weeks && (
                <Callout tone="accent" icon={<CalendarClock />} title={`Run for ${weeks} full week${weeks === 1 ? '' : 's'}`}>
                  Even if the sample fills sooner, cover whole weekly cycles to avoid day-of-week bias, and don’t evaluate before {formatNum(data.perVariant)}{' '}
                  users per arm.
                </Callout>
              )}

              <GlassCard>
                <CardHeader
                  icon={<LineChart />}
                  title="Power curve"
                  description={`Probability of detecting a ${formatSignedPct(plan.mde, 1)} lift as users accrue, far below ${formatPct(plan.power, 0)} at half the sample`}
                />
                <PowerCurve controlRate={data.controlRate} variantRate={data.variantRate} alpha={plan.alpha} targetPower={plan.power} requiredN={data.perVariant} />
              </GlassCard>

              <GlassCard>
                <CardHeader title="The formula" description="Pooled variance under H₀, unpooled under H₁" />
                <p className="overflow-x-auto rounded-xl bg-fill px-4 py-3 font-mono text-[13px] leading-relaxed text-fg-secondary">
                  n = ( z<sub>α/2</sub>·√(2p̄(1−p̄)) + z<sub>β</sub>·√(p₁(1−p₁) + p₂(1−p₂)) )² / (p₂ − p₁)²
                </p>
                <p className="tabular mt-3 text-[13px] text-muted">
                  z<sub>α/2</sub> = {data.zAlpha.toFixed(4)} · z<sub>β</sub> = {data.zBeta.toFixed(4)} · p̄ = {((data.controlRate + data.variantRate) / 2).toFixed(4)}
                </p>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </>
  );
}
