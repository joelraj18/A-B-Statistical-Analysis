import type { BinaryResult, ContinuousResult } from '@/types/stats';
import { formatDecimal, formatNum, formatPct, formatPoints, formatPStatement, formatSignedDecimal, formatSignedPct } from './format';

export type Verdict = 'ship' | 'rollback' | 'inconclusive' | 'invalid';

export interface Narrative {
  verdict: Verdict;
  headline: string;
  action: string;
  paragraphs: string[];
}

export interface NarrativeContext {
  /** Planned users per arm from the Sample Planner, if any. */
  plannedSampleSize?: number | null;
  /** Human label of the metric, e.g. "conversion rate" or "revenue per user". */
  metricLabel?: string;
}

/**
 * Plain-English executive summary that is direction-aware: a significant
 * *negative* result is a roll-back, not a "safe to deploy".
 */
export function buildNarrative(result: BinaryResult | ContinuousResult, ctx: NarrativeContext = {}): Narrative {
  const metric = ctx.metricLabel ?? (result.kind === 'binary' ? 'conversion rate' : 'average value per user');
  const confidencePct = Math.round(result.confidence * 100);
  const [lo, hi] = result.ciAbsolute;
  const isBinary = result.kind === 'binary';
  const fmtDiff = (v: number) => (isBinary ? formatPoints(v) : formatSignedDecimal(v));
  const valueA = isBinary ? formatPct(result.rateA) : formatDecimal(result.meanA);
  const valueB = isBinary ? formatPct(result.rateB) : formatDecimal(result.meanB);
  const direction = result.absoluteDiff > 0 ? 'higher' : result.absoluteDiff < 0 ? 'lower' : 'identical';
  const uplift = result.relativeUplift;
  const minArm = Math.min(result.arms.a.n, result.arms.b.n);
  const underpowered = ctx.plannedSampleSize != null && minArm < ctx.plannedSampleSize;

  const observed =
    direction === 'identical'
      ? `Variant B and Control A produced an identical ${metric} (${valueB}).`
      : `Variant B's ${metric} was ${valueB} versus ${valueA} for Control A — ${
          uplift == null ? '' : `${formatSignedPct(uplift)} relative, `
        }${isBinary ? 'an absolute difference of ' : 'a difference of '}${fmtDiff(result.absoluteDiff)} (${direction}).`;

  const interval = `The ${confidencePct}% confidence interval for the difference runs from ${fmtDiff(lo)} to ${fmtDiff(hi)}; ${formatPStatement(result.pValue)} against α = ${result.alpha.toFixed(2)}.`;

  const paragraphs = [observed, interval];

  if (result.kind === 'binary' && result.srm.detected) {
    paragraphs.push(
      `Traffic split is ${formatPct(result.srm.observedShareA, 1)} / ${formatPct(1 - result.srm.observedShareA, 1)} against an expected ${formatPct(result.srm.expectedShareA, 0)} / ${formatPct(1 - result.srm.expectedShareA, 0)} (χ² ${formatPStatement(result.srm.pValue)}). A sample ratio mismatch almost always indicates a bug in assignment or logging — Twyman's law applies.`,
    );
    return {
      verdict: 'invalid',
      headline: 'Sample ratio mismatch detected',
      action: 'Do not make a decision. Audit randomisation and telemetry, then re-run.',
      paragraphs,
    };
  }

  if (underpowered) {
    paragraphs.push(
      `Only ${formatNum(minArm)} users per arm have been observed against a planned ${formatNum(ctx.plannedSampleSize)}. Stopping before the planned horizon ("peeking") inflates the false-positive rate well beyond α.`,
    );
  }

  if (result.isSignificant && result.absoluteDiff > 0) {
    return {
      verdict: underpowered ? 'inconclusive' : 'ship',
      headline: underpowered ? 'Promising, but stopped early' : 'Variant B wins',
      action: underpowered
        ? 'Keep the test running until the planned sample size is reached before shipping.'
        : 'The improvement is statistically significant. Ship Variant B.',
      paragraphs,
    };
  }

  if (result.isSignificant && result.absoluteDiff < 0) {
    return {
      verdict: 'rollback',
      headline: 'Variant B is worse',
      action: 'The decline is statistically significant. Do not ship — roll back and revisit the hypothesis.',
      paragraphs,
    };
  }

  paragraphs.push(
    underpowered
      ? 'The difference is within the range expected from random noise, and the test has not yet reached the power it was designed for.'
      : 'The difference is within the range expected from random noise. If a real effect exists, it is likely smaller than the test was powered to detect.',
  );
  return {
    verdict: 'inconclusive',
    headline: 'Not statistically significant',
    action: underpowered
      ? 'Collect the planned sample before deciding.'
      : 'Do not ship on this evidence. Iterate on the hypothesis or test a bolder change.',
    paragraphs,
  };
}
