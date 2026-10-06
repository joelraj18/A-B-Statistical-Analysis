'use client';

import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, BarChart3, BrainCircuit, CircleAlert, RotateCcw, Save, Target } from 'lucide-react';
import { useMemo } from 'react';
import { ConfidenceIntervalPlot, type IntervalRow } from '@/components/charts/ConfidenceIntervalPlot';
import { DistributionCurve } from '@/components/charts/DistributionCurve';
import { ErrorBarChart } from '@/components/charts/ErrorBarChart';
import { CupedPanel } from '@/components/analyzer/CupedPanel';
import { ExperimentForm } from '@/components/analyzer/ExperimentForm';
import { KpiGrid } from '@/components/analyzer/KpiGrid';
import { NarrativeSummary } from '@/components/analyzer/NarrativeSummary';
import { VerdictCard } from '@/components/analyzer/VerdictCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { remoteEngine } from '@/lib/api/statsService';
import { buildRecord, saveExperiment } from '@/lib/experiments';
import { useHybridResult } from '@/lib/hooks/useHybridResult';
import { twoProportionZTest, welchTTest } from '@/lib/stats/abEngine';
import { formatDecimal, formatNum, formatPct, formatPoints, formatPStatement, formatSignedDecimal, formatSignedPct } from '@/lib/stats/format';
import { buildNarrative } from '@/lib/stats/narrative';
import { useWorkspace, useWorkspaceHydrated } from '@/lib/store/workspace';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import type { BinaryInput, BinaryResult, ContinuousInput, ContinuousResult } from '@/types/stats';

export function AnalyzerView() {
  const hydrated = useWorkspaceHydrated();
  return hydrated ? <AnalyzerWorkspace /> : <PageSkeleton />;
}

function AnalyzerWorkspace() {
  const draft = useWorkspace((s) => s.draft);
  const plan = useWorkspace((s) => s.plan);
  const resetDraft = useWorkspace((s) => s.resetDraft);

  const binaryInput = useMemo<BinaryInput | null>(
    () => (draft.metric === 'binary' ? { ...draft.binary, confidence: draft.confidence } : null),
    [draft.metric, draft.binary, draft.confidence],
  );
  const continuousInput = useMemo<ContinuousInput | null>(
    () => (draft.metric === 'continuous' ? { ...draft.continuous, confidence: draft.confidence } : null),
    [draft.metric, draft.continuous, draft.confidence],
  );

  const binary = useHybridResult(binaryInput, twoProportionZTest, remoteEngine.analyzeBinary);
  const continuous = useHybridResult(continuousInput, welchTTest, remoteEngine.analyzeContinuous);
  const active = draft.metric === 'binary' ? binary : continuous;
  const result: BinaryResult | ContinuousResult | null = active.data;

  // The adopted plan is a conversion-rate plan, so it only gates binary analyses.
  const plannedN = draft.metric === 'binary' ? plan.adoptedPerVariant : null;
  const narrative = useMemo(() => (result ? buildNarrative(result, { plannedSampleSize: plannedN }) : null), [result, plannedN]);

  const isBinary = result?.kind === 'binary';
  const fmtValue = isBinary ? (v: number) => formatPct(v, 2) : (v: number) => formatDecimal(v, 2);

  // Binary effects read best as relative uplift (comparable to the planned MDE);
  // fall back to percentage points when the control rate is 0.
  const showRelative = isBinary && result?.ciRelative != null && result.relativeUplift != null;
  const effectRow: IntervalRow | null = result
    ? showRelative
      ? { key: 'rel', label: 'Relative uplift', estimate: result.relativeUplift!, ci: result.ciRelative!, emphasis: true }
      : { key: 'abs', label: isBinary ? 'Absolute difference' : 'Mean difference', estimate: result.absoluteDiff, ci: result.ciAbsolute, emphasis: true }
    : null;
  const fmtEffect = showRelative ? (v: number) => formatSignedPct(v, 1) : isBinary ? (v: number) => formatPoints(v, 2) : (v: number) => formatSignedDecimal(v, 2);
  const mde = showRelative && plan.adoptedMde ? plan.adoptedMde : null;

  const onSave = () => {
    if (!result || !narrative || !active.source) return;
    const args = { name: draft.name, hypothesis: draft.hypothesis, verdict: narrative.verdict, source: active.source };
    const record =
      result.kind === 'binary' && binaryInput
        ? buildRecord(args, { result, input: binaryInput })
        : result.kind === 'continuous' && continuousInput
          ? buildRecord(args, { result, input: continuousInput })
          : null;
    if (record) void saveExperiment(record);
  };

  return (
    <>
      <PageHeader
        eyebrow="Phases 2 & 3 · Hypothesis and analysis"
        title="A/B Analyzer"
        description="Exact two-proportion Z-tests for conversion metrics and Welch’s t-test for revenue, with SRM guards and a plain-English verdict."
        actions={
          <>
            <Button variant="secondary" icon={<RotateCcw />} onClick={resetDraft}>
              Reset
            </Button>
            <Button icon={<Save />} onClick={onSave} disabled={!result}>
              Save to archive
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <ExperimentForm />
        </div>

        <div className="min-w-0 space-y-5">
          <AnimatePresence initial={false}>
            {active.error && (
              <Callout key="error" tone="negative" icon={<CircleAlert />} title="Check your inputs">
                {active.error}
              </Callout>
            )}
            {result?.kind === 'binary' && result.srm.detected && (
              <Callout key="srm" tone="warning" icon={<AlertTriangle />} title="Sample ratio mismatch">
                Observed split {formatPct(result.srm.observedShareA, 1)} / {formatPct(1 - result.srm.observedShareA, 1)} vs. planned{' '}
                {formatPct(result.srm.expectedShareA, 0)} / {formatPct(1 - result.srm.expectedShareA, 0)} (χ² {formatPStatement(result.srm.pValue)}).
                Results are untrustworthy until assignment is fixed.
              </Callout>
            )}
            {result && plannedN != null && Math.min(result.arms.a.n, result.arms.b.n) < plannedN && (
              <Callout key="power" tone="accent" icon={<Target />} title="Below planned sample size">
                {formatNum(Math.min(result.arms.a.n, result.arms.b.n))} of {formatNum(plannedN)} users per arm. Reading results now is peeking.
              </Callout>
            )}
          </AnimatePresence>

          {result && narrative ? (
            <>
              <VerdictCard narrative={narrative} source={active.source} />
              <KpiGrid result={result} />

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <GlassCard>
                  <CardHeader icon={<BrainCircuit />} title="Distribution analysis" description="Sampling distribution of each arm’s estimate." />
                  <DistributionCurve
                    control={{ mean: result.arms.a.estimate, se: result.arms.a.se }}
                    variant={{ mean: result.arms.b.estimate, se: result.arms.b.se }}
                    formatValue={fmtValue}
                  />
                </GlassCard>
                <GlassCard>
                  <CardHeader
                    icon={<BarChart3 />}
                    title="Rate comparison"
                    description={`${isBinary ? 'Conversion rates with Wilson' : 'Means with t'} ${Math.round(result.confidence * 100)}% intervals.`}
                  />
                  <ErrorBarChart arms={result.arms} confidence={result.confidence} formatValue={fmtValue} />
                </GlassCard>
              </div>

              <GlassCard>
                <CardHeader
                  title="Treatment effect"
                  description={`${Math.round(result.confidence * 100)}% confidence interval. If it excludes zero, the result is significant at α = ${result.alpha.toFixed(2)}.`}
                />
                <ConfidenceIntervalPlot
                  rows={effectRow ? [effectRow] : []}
                  formatValue={fmtEffect}
                  markers={mde ? [{ value: mde, label: `Planned MDE ${formatSignedPct(mde, 1)}` }] : []}
                />
              </GlassCard>

              <NarrativeSummary narrative={narrative} />
            </>
          ) : (
            !active.error && <GlassCard className="h-64 animate-pulse" />
          )}

          {draft.metric === 'continuous' && <CupedPanel confidence={draft.confidence} />}
        </div>
      </div>
    </>
  );
}
