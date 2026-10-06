import { describe, expect, it } from 'vitest';
import {
  achievedPower,
  cuped,
  generateCupedDemo,
  requiredSampleSize,
  srmCheck,
  StatsInputError,
  twoProportionZTest,
  welchTTest,
  zCritical,
} from '@/lib/stats/abEngine';
import { logBeta, logGamma } from '@/lib/stats/distributions';
import { buildNarrative } from '@/lib/stats/narrative';

const base = { visitorsA: 25_000, conversionsA: 3_500, visitorsB: 25_000, conversionsB: 3_850, confidence: 0.95 };

describe('twoProportionZTest', () => {
  it('uses the exact critical value for any confidence (not a 3-step lookup)', () => {
    expect(zCritical(0.8)).toBeCloseTo(1.2815515655446004, 14);
    expect(twoProportionZTest({ ...base, confidence: 0.8 }).zCritical).toBeCloseTo(1.2815515655446004, 14);
  });

  it('rejects impossible inputs', () => {
    expect(() => twoProportionZTest({ ...base, conversionsA: 25_001 })).toThrow(StatsInputError);
    expect(() => twoProportionZTest({ ...base, visitorsB: 0 })).toThrow(StatsInputError);
    expect(() => twoProportionZTest({ ...base, conversionsA: 1.5 })).toThrow(StatsInputError);
    expect(() => twoProportionZTest({ ...base, conversionsA: 0, conversionsB: 0 })).toThrow(/no variance/);
  });

  it('returns null relative uplift instead of Infinity when the baseline is 0', () => {
    const r = twoProportionZTest({ ...base, conversionsA: 0, conversionsB: 12 });
    expect(r.relativeUplift).toBeNull();
    expect(r.ciRelative).toBeNull();
  });

  it('keeps tiny p-values instead of collapsing to 0', () => {
    const r = twoProportionZTest({ ...base, visitorsA: 100_000, conversionsA: 10_000, visitorsB: 100_000, conversionsB: 13_000 });
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(1e-80);
  });
});

describe('srmCheck', () => {
  it('flags a 50k / 48k split and accepts a 50k / 49.9k split', () => {
    expect(srmCheck(50_000, 48_000).detected).toBe(true);
    expect(srmCheck(50_000, 49_900).detected).toBe(false);
  });
});

describe('welchTTest', () => {
  it('has a positive statistic when B > A', () => {
    const r = welchTTest({ meanA: 10, sdA: 2, nA: 12, meanB: 12.5, sdB: 5, nB: 9, confidence: 0.95 });
    expect(r.tStat).toBeGreaterThan(0);
    expect(r.df).toBeGreaterThan(9);
    expect(r.df).toBeLessThan(19);
  });
});

describe('requiredSampleSize', () => {
  it('rejects an MDE that pushes the variant rate past 100%', () => {
    expect(() => requiredSampleSize({ baselineRate: 0.9, mde: 0.2, power: 0.8, alpha: 0.05 })).toThrow(StatsInputError);
  });

  it('round-trips with achievedPower', () => {
    const r = requiredSampleSize({ baselineRate: 0.15, mde: 0.05, power: 0.8, alpha: 0.05 });
    expect(achievedPower(r.perVariant, r.controlRate, r.variantRate, 0.05)).toBeGreaterThanOrEqual(0.8);
    expect(achievedPower(r.perVariant - 50, r.controlRate, r.variantRate, 0.05)).toBeLessThan(0.8);
  });
});

describe('cuped', () => {
  it('substantially reduces variance on correlated demo data', () => {
    const demo = generateCupedDemo(3000, 1, 7);
    const r = cuped({ ...demo, confidence: 0.95 });
    expect(r.varianceReduction.estimator).toBeGreaterThan(0.7);
    expect(r.adjusted.se).toBeLessThan(r.original.se);
    expect(r.adjusted.pValue).toBeLessThan(r.original.pValue);
  });

  it('validates array lengths', () => {
    expect(() => cuped({ yControl: [1, 2], xControl: [1], yVariant: [1, 2], xVariant: [1, 2], confidence: 0.95 })).toThrow(
      StatsInputError,
    );
  });
});

describe('logBeta', () => {
  it('agrees with the lnΓ definition in every branch', () => {
    for (const [a, b] of [
      [2.5, 3],
      [0.5, 40],
      [12, 15],
      [300, 0.5],
    ] as const) {
      expect(logBeta(a, b)).toBeCloseTo(logGamma(a) + logGamma(b) - logGamma(a + b), 10);
    }
  });
});

describe('buildNarrative', () => {
  it('recommends shipping a significant win', () => {
    expect(buildNarrative(twoProportionZTest(base)).verdict).toBe('ship');
  });

  it('recommends rolling back a significant loss (the prototype said "safe to deploy")', () => {
    const r = twoProportionZTest({ ...base, conversionsB: 3_150 });
    const n = buildNarrative(r);
    expect(n.verdict).toBe('rollback');
    expect(n.action).toMatch(/Do not ship/);
  });

  it('withholds a decision when the sample ratio is mismatched', () => {
    const r = twoProportionZTest({ ...base, visitorsB: 23_000, conversionsB: 3_500 });
    expect(buildNarrative(r).verdict).toBe('invalid');
  });

  it('warns about peeking before the planned sample size', () => {
    const n = buildNarrative(twoProportionZTest(base), { plannedSampleSize: 40_000 });
    expect(n.verdict).toBe('inconclusive');
    expect(n.paragraphs.join(' ')).toMatch(/peeking/);
  });

  it('calls a null result inconclusive', () => {
    const r = twoProportionZTest({ ...base, conversionsB: 3_520 });
    expect(buildNarrative(r).verdict).toBe('inconclusive');
  });
});

describe('formatMoney / formatCompact', () => {
  it('is deterministic across ICU builds', async () => {
    const { formatCompact, formatMoney } = await import('@/lib/stats/format');
    expect(formatMoney(912_000)).toBe('$912K');
    expect(formatMoney(83_460)).toBe('$83.5K');
    expect(formatMoney(4_380_000)).toBe('$4.4M');
    expect(formatMoney(-1_000)).toBe('−$1K');
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(72_620)).toBe('72.6K');
  });
});
