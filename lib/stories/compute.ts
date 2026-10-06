import { cuped, requiredSampleSize, twoProportionZTest, welchTTest } from '@/lib/stats/abEngine';
import { interferenceCheck, robustAnalysis, segmentAnalysis, switchbackAnalysis, trendAnalysis } from '@/lib/stats/diagnostics';
import { buildNarrative } from '@/lib/stats/narrative';
import { resolveCuped, resolveRobust, resolveSwitchback } from './datasets';
import type { StoryId } from './ids';
import { getStory } from './personas';
import type { StoryComputed } from './types';

const cache = new Map<StoryId, StoryComputed>();

/** Runs a story's data through the on-device engine. Pure and memoised. */
export function computeStory(id: StoryId): StoryComputed {
  const hit = cache.get(id);
  if (hit) return hit;

  const story = getStory(id);
  const confidence = story.confidence;
  const plan = requiredSampleSize(story.plan);
  const analysis = story.analysis();
  const primary =
    analysis.metric === 'binary' ? twoProportionZTest({ ...analysis.binary, confidence }) : welchTTest({ ...analysis.continuous, confidence });
  const narrative = buildNarrative(primary, { plannedSampleSize: analysis.metric === 'binary' ? plan.perVariant : null });

  const d = story.diagnostics ?? {};
  const computed: StoryComputed = { plan, primary, narrative };
  if (d.segments) computed.segments = segmentAnalysis({ segments: d.segments, confidence });
  if (d.trend) computed.trend = trendAnalysis({ ...d.trend, confidence });
  if (d.interference) computed.interference = interferenceCheck({ ...d.interference, confidence });
  if (d.robust) {
    const data = resolveRobust(d.robust.source).data!;
    computed.robust = robustAnalysis({ ...data, confidence, winsorizePercentile: d.robust.winsorizePercentile, topK: d.robust.topK });
  }
  if (d.switchback) computed.switchback = switchbackAnalysis({ blocks: resolveSwitchback(d.switchback.source).data!, confidence });
  if (d.cuped) computed.cuped = cuped({ ...resolveCuped(d.cuped.source).data!, confidence });

  cache.set(id, computed);
  return computed;
}
