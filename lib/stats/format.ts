const numberFormatter = new Intl.NumberFormat('en-US');

/** 0.1234 → "12.34%". */
export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** 0.1234 → "+12.34%", −0.05 → "−5.00%". */
export function formatSignedPct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value * 100).toFixed(digits)}%`;
}

/** Percentage-point difference: 0.014 → "+1.40 pp". */
export function formatPoints(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value * 100).toFixed(digits)} pp`;
}

export function formatNum(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return numberFormatter.format(value);
}

/**
 * 12_345 → "12.3K". Hand-rolled because ICU builds differ (Node prints
 * "912.0K", Chrome "912K"), which breaks hydration of static pages.
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const [div, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : abs >= 1e3 ? [1e3, 'K'] : [1, ''];
  const scaled = abs / div;
  const digits = scaled >= 100 || suffix === '' ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '');
  return `${value < 0 ? '−' : ''}${digits}${suffix}`;
}

export function formatDecimal(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function formatSignedDecimal(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}`;
}

/** P-values are shown to 4 dp, with a floor rather than a misleading "0.0000". */
export function formatPValue(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return '—';
  if (p < 0.0001) return '< 0.0001';
  return p.toFixed(4);
}

/** "p < 0.0001" or "p = 0.0123" — never the awkward "p = < 0.0001". */
export function formatPStatement(p: number): string {
  return p < 0.0001 ? 'p < 0.0001' : `p = ${formatPValue(p)}`;
}

/** Probabilities near certainty are capped so 0.999995 never reads as "100.0%". */
export function formatProbability(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return '—';
  if (p > 0.999) return '> 99.9%';
  if (p < 0.001) return '< 0.1%';
  return formatPct(p, 1);
}

const moneyExact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** 83_412 → "$83.4K". */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const compact = formatCompact(Math.abs(value));
  return `${value < 0 ? '−' : ''}$${compact}`;
}

/** 68 → "$68", 0.9 → "$0.90". */
export function formatMoneyExact(value: number): string {
  return moneyExact.format(value);
}
