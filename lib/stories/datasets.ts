/**
 * Deterministic datasets behind the persona stories. Seeds are fixed so every
 * visitor (and every test) sees exactly the same numbers.
 */

import { gaussian, mulberry32 } from '@/lib/stats/abEngine';
import { parseCupedCsv, parseTwoGroupCsv, type CupedDataset } from '@/lib/stats/csv';
import type { DatasetSource } from '@/lib/store/workspace';
import type { DailyCounts, SwitchbackInput } from '@/types/stats';

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Marcus: B2B revenue per account; pre-period spend explains most of the variance. */
export const MARCUS_SEED = 105;
export function marcusAccounts(seed = MARCUS_SEED): CupedDataset {
  const rand = mulberry32(seed);
  const arm = (lift: number) => {
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const pre = Math.exp(Math.log(900) + 0.55 * gaussian(rand));
      x.push(round2(pre));
      y.push(round2(Math.max(0, pre * (1 + lift) + 420 * gaussian(rand))));
    }
    return { x, y };
  };
  const c = arm(0);
  const v = arm(0.04);
  return { yControl: c.y, xControl: c.x, yVariant: v.y, xVariant: v.x };
}

/** Sarah: revenue per trader, with a handful of institutional whales in the variant. */
export const SARAH_WHALES = 7;
export function sarahTraders(): { valuesA: number[]; valuesB: number[] } {
  const rand = mulberry32(77);
  const user = () => round2(Math.exp(Math.log(28) + 0.9 * gaussian(rand)));
  const valuesA = Array.from({ length: 20000 }, user);
  const valuesB = Array.from({ length: 20000 }, user);
  for (let i = 0; i < SARAH_WHALES; i++) valuesB[i * 2857] = round2(46000 + 9000 * rand());
  return { valuesA, valuesB };
}

/** David: one week of hourly switchback blocks; value = share of rides matched within 5 minutes. */
export function davidBlocks(): SwitchbackInput['blocks'] {
  const rand = mulberry32(11);
  return Array.from({ length: 168 }, (_, h) => {
    const arm = h % 2 === 0 ? 'A' : 'B';
    const rush = 0.06 * Math.sin(((h % 24) / 24) * 2 * Math.PI);
    const value = 0.62 + rush + (arm === 'B' ? 0.018 : 0) + 0.025 * gaussian(rand);
    return { arm, value: Math.round(value * 10000) / 10000 };
  });
}

/** Chen: 21 days of home-screen click-through; users dislike the new layout before they adopt it. */
export function chenDays(): DailyCounts[] {
  const n = 40000;
  const base = 0.1;
  return Array.from({ length: 21 }, (_, i) => {
    const day = i + 1;
    // −12% on day 1–2, recovering linearly, plateauing at +8% from day 14.
    const lift = day <= 2 ? -0.12 : Math.min(0.08, -0.12 + ((day - 2) / 12) * 0.2);
    return { visitorsA: n, conversionsA: Math.round(n * base), visitorsB: n, conversionsB: Math.round(n * base * (1 + lift)) };
  });
}

// Resolution of dataset sources ---------------------------------------------------

const memo = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as T;
}

type Parsed<T> = { data: T | null; error: string | null; rows: number; label?: string };

export function resolveCuped(source: DatasetSource): Parsed<CupedDataset> {
  if (source.kind === 'story') {
    const data = cached('cuped:marcus', () => marcusAccounts());
    return { data, error: null, rows: data.yControl.length + data.yVariant.length, label: 'Marcus’s B2B accounts' };
  }
  return parseCupedCsv(source.text);
}

export function resolveRobust(source: DatasetSource): Parsed<{ valuesA: number[]; valuesB: number[] }> {
  if (source.kind === 'story') {
    const data = cached('robust:sarah', () => sarahTraders());
    return { data, error: null, rows: data.valuesA.length + data.valuesB.length, label: 'Sarah’s traders' };
  }
  const parsed = parseTwoGroupCsv(source.text);
  return { ...parsed, data: parsed.data ? { valuesA: parsed.data.a, valuesB: parsed.data.b } : null };
}

export function resolveSwitchback(source: DatasetSource): Parsed<SwitchbackInput['blocks']> {
  if (source.kind === 'story') {
    const data = cached('switchback:david', () => davidBlocks());
    return { data, error: null, rows: data.length, label: 'David’s hourly city blocks' };
  }
  const parsed = parseTwoGroupCsv(source.text);
  return {
    ...parsed,
    data: parsed.data
      ? [...parsed.data.a.map((value) => ({ arm: 'A' as const, value })), ...parsed.data.b.map((value) => ({ arm: 'B' as const, value }))]
      : null,
  };
}
