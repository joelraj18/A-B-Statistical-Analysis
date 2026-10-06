import type { CupedInput, DailyCounts } from '@/types/stats';

export type CupedDataset = Omit<CupedInput, 'confidence'>;

const CONTROL = new Set(['control', 'ctrl', 'a', '0', 'baseline']);
const VARIANT = new Set(['variant', 'treatment', 'test', 'b', '1']);

/**
 * Parses `group,metric,pre_metric` rows (header optional) into CUPED arrays.
 * Accepts comma, semicolon or tab delimiters.
 */
export function parseCupedCsv(text: string): { data: CupedDataset | null; error: string | null; rows: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { data: null, error: null, rows: 0 };

  const data: CupedDataset = { yControl: [], xControl: [], yVariant: [], xVariant: [] };
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i]!.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 3) return { data: null, error: `Line ${i + 1}: expected 3 columns (group, metric, pre-period metric).`, rows: 0 };
    const [g, yRaw, xRaw] = cells as [string, string, string];
    const y = Number(yRaw);
    const x = Number(xRaw);
    if (i === 0 && (Number.isNaN(y) || Number.isNaN(x))) continue; // header
    if (!Number.isFinite(y) || !Number.isFinite(x)) return { data: null, error: `Line ${i + 1}: metric values must be numbers.`, rows: 0 };
    const group = g.toLowerCase();
    if (CONTROL.has(group)) {
      data.yControl.push(y);
      data.xControl.push(x);
    } else if (VARIANT.has(group)) {
      data.yVariant.push(y);
      data.xVariant.push(x);
    } else {
      return { data: null, error: `Line ${i + 1}: unknown group “${g}”. Use control / variant (or A / B).`, rows: 0 };
    }
  }
  if (data.yControl.length < 2 || data.yVariant.length < 2) {
    return { data: null, error: 'Each group needs at least 2 users.', rows: data.yControl.length + data.yVariant.length };
  }
  return { data, error: null, rows: data.yControl.length + data.yVariant.length };
}

export function cupedDatasetToCsv(d: CupedDataset): string {
  const lines = ['group,metric,pre_metric'];
  d.yControl.forEach((y, i) => lines.push(`control,${y},${d.xControl[i]}`));
  d.yVariant.forEach((y, i) => lines.push(`variant,${y},${d.xVariant[i]}`));
  return lines.join('\n');
}

/**
 * Parses `group,value` rows (header optional) into two arrays. Group labels
 * accept control/variant, A/B or 0/1.
 */
export function parseTwoGroupCsv(text: string): { data: { a: number[]; b: number[] } | null; error: string | null; rows: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { data: null, error: null, rows: 0 };
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i]!.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 2) return { data: null, error: `Line ${i + 1}: expected 2 columns (group, value).`, rows: 0 };
    const value = Number(cells[1]);
    if (i === 0 && Number.isNaN(value)) continue;
    if (!Number.isFinite(value)) return { data: null, error: `Line ${i + 1}: the value must be a number.`, rows: 0 };
    const group = cells[0]!.toLowerCase();
    if (CONTROL.has(group)) a.push(value);
    else if (VARIANT.has(group)) b.push(value);
    else return { data: null, error: `Line ${i + 1}: unknown group “${cells[0]}”. Use control / variant (or A / B).`, rows: 0 };
  }
  if (a.length < 2 || b.length < 2) return { data: null, error: 'Each group needs at least 2 rows.', rows: a.length + b.length };
  return { data: { a, b }, error: null, rows: a.length + b.length };
}

/** Parses `visitorsA,conversionsA,visitorsB,conversionsB` rows (an optional leading day column is ignored). */
export function parseDailyCsv(text: string): { data: DailyCounts[] | null; error: string | null; rows: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { data: null, error: null, rows: 0 };
  const days: DailyCounts[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i]!.split(/[,;\t]/).map((c) => Number(c.trim()));
    const nums = cells.length >= 5 ? cells.slice(-4) : cells;
    if (nums.length !== 4) return { data: null, error: `Line ${i + 1}: expected visitors A, conversions A, visitors B, conversions B.`, rows: 0 };
    if (nums.some(Number.isNaN)) {
      if (i === 0) continue;
      return { data: null, error: `Line ${i + 1}: values must be numbers.`, rows: 0 };
    }
    const [visitorsA, conversionsA, visitorsB, conversionsB] = nums as [number, number, number, number];
    days.push({ visitorsA, conversionsA, visitorsB, conversionsB });
  }
  return { data: days, error: null, rows: days.length };
}

export function dailyToCsv(days: readonly DailyCounts[]): string {
  return ['day,visitors_a,conversions_a,visitors_b,conversions_b', ...days.map((d, i) => `${i + 1},${d.visitorsA},${d.conversionsA},${d.visitorsB},${d.conversionsB}`)].join('\n');
}
