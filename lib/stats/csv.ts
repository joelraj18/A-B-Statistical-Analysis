import type { CupedInput } from '@/types/stats';

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
