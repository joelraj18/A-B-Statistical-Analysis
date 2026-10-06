/**
 * Every persona story makes statistical claims in its prose. These tests pin
 * those claims to the engine so the stories can never contradict the charts.
 */
import { describe, expect, it } from 'vitest';
import { computeStory } from '@/lib/stories/compute';
import { STORY_IDS } from '@/lib/stories/ids';
import { getStory, STORIES } from '@/lib/stories/personas';

describe('persona stories', () => {
  it('covers every id exactly once', () => {
    expect(STORIES.map((s) => s.id).sort()).toEqual([...STORY_IDS].sort());
  });

  it('Priya ships a significant, well powered win', () => {
    const c = computeStory('priya');
    expect(c.narrative.verdict).toBe('ship');
    expect(c.primary.arms.b.n).toBeGreaterThanOrEqual(c.plan.perVariant);
  });

  it('Marcus: raw revenue lift is not significant, CUPED makes it significant', () => {
    const c = computeStory('marcus');
    expect(c.cuped!.original.relativeUplift!).toBeGreaterThan(0.035);
    expect(c.cuped!.original.relativeUplift!).toBeLessThan(0.045);
    expect(c.cuped!.original.pValue).toBeGreaterThan(0.1);
    expect(c.cuped!.adjusted.pValue).toBeLessThan(0.03);
    expect(c.primary.pValue).toBeCloseTo(c.cuped!.original.pValue, 2);
  });

  it('Aisha rolls back a significant loss', () => {
    expect(computeStory('aisha').narrative.verdict).toBe('rollback');
  });

  it('Diego trips the SRM guard before the planned sample', () => {
    const c = computeStory('diego');
    expect(c.primary.kind === 'binary' && c.primary.srm.detected).toBe(true);
    expect(c.primary.isSignificant).toBe(true);
    expect(c.primary.arms.b.n).toBeLessThan(c.plan.perVariant);
    expect(c.narrative.verdict).toBe('invalid');
  });

  it('Elena: a +25% naive lift is fully cannibalised from control', () => {
    const i = computeStory('elena').interference!;
    expect(i.naive.relativeUplift).toBeCloseTo(0.25, 6);
    expect(i.spillover).toBe(true);
    expect(Math.abs(i.global.absoluteDiff)).toBeLessThan(1e-12);
    expect(i.cannibalizedShare).toBeCloseTo(1, 6);
  });

  it('James: Simpson’s paradox, every segment wins while the pooled rate falls', () => {
    const s = computeStory('james').segments!;
    expect(s.simpsonsParadox).toBe(true);
    expect(s.pooled.absoluteDiff).toBeLessThan(0);
    expect(s.segments.every((r) => r.result.absoluteDiff > 0 && r.result.isSignificant)).toBe(true);
    expect(s.stratified.isSignificant).toBe(true);
    expect(s.mixImbalance.detected).toBe(true);
  });

  it('Sarah: whales make ARPU look highly significant, Winsorization removes it', () => {
    const r = computeStory('sarah').robust!;
    expect(r.raw.relativeUplift!).toBeGreaterThan(0.35);
    expect(r.raw.pValue).toBeLessThan(0.01);
    expect(r.winsorized.isSignificant).toBe(false);
    expect(r.outlierDriven).toBe(true);
    expect(r.topKShare!).toBeGreaterThan(0.95);
  });

  it('David: interference inflates the rider level win, the switchback effect is much smaller', () => {
    const c = computeStory('david');
    expect(c.interference!.spillover).toBe(true);
    expect(c.switchback!.result.isSignificant).toBe(true);
    expect(c.switchback!.result.absoluteDiff).toBeLessThan(c.interference!.naive.absoluteDiff / 5);
  });

  it('Chen: a primacy effect turns −12% into a significant +8%', () => {
    const c = computeStory('chen');
    expect(c.primary.relativeUplift!).toBeCloseTo(-0.12, 2);
    expect(c.primary.isSignificant).toBe(true);
    expect(c.trend!.pattern).toBe('primacy');
    expect(c.trend!.post.relativeUplift!).toBeCloseTo(0.08, 2);
    expect(c.trend!.post.isSignificant).toBe(true);
  });

  it('produces a finite, positive impact and prose for every story', () => {
    for (const id of STORY_IDS) {
      const story = getStory(id);
      const c = computeStory(id);
      const amount = story.impact.amount(c);
      expect(Number.isFinite(amount), id).toBe(true);
      expect(amount, id).toBeGreaterThan(0);
      for (const text of [story.chapters.plan(c), story.chapters.analyze(c), story.impact.explain(c)]) {
        expect(text, id).not.toMatch(/NaN|undefined|—/);
      }
    }
  });

  it('keeps headings and descriptions free of dashes and trailing full stops', () => {
    for (const s of STORIES) {
      for (const text of [s.title, s.summary, s.trap, s.outcome.label, s.impact.label, s.experimentName]) {
        expect(text, s.id).not.toMatch(/—|–| - |\.$/);
      }
    }
  });
});
