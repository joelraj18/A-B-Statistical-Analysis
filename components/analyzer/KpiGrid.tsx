'use client';

import { Activity, Gauge, Scale, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatTile } from '@/components/ui/StatTile';
import { EASE_APPLE } from '@/lib/motion';
import { formatDecimal, formatPoints, formatProbability, formatPValue, formatSignedDecimal, formatSignedPct } from '@/lib/stats/format';
import type { BinaryResult, ContinuousResult } from '@/types/stats';

export function KpiGrid({ result }: { result: BinaryResult | ContinuousResult }) {
  const isBinary = result.kind === 'binary';
  const fmtDiff = isBinary ? (v: number) => formatPoints(v) : (v: number) => formatSignedDecimal(v);
  const pct = Math.round(result.confidence * 100);
  const direction = result.absoluteDiff > 0 ? 'positive' : result.absoluteDiff < 0 ? 'negative' : 'neutral';
  const stat = isBinary ? `z = ${formatDecimal(result.zScore, 3)}` : `t = ${formatDecimal(result.tStat, 3)} · df ${formatDecimal(result.df, 1)}`;
  const win = result.probBBeatsA;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile
        icon={<Activity />}
        label="p-value"
        value={formatPValue(result.pValue)}
        tone={result.isSignificant ? 'accent' : 'neutral'}
        caption={`${stat} · α ${result.alpha.toFixed(2)}`}
      />
      <StatTile
        icon={<Gauge />}
        label="Chance B beats A"
        value={formatProbability(win)}
        caption="Normal approximation, flat prior"
        footer={
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-fill-strong">
            <motion.div
              className="h-full rounded-full"
              style={{ background: win >= 0.95 ? 'var(--positive)' : win <= 0.05 ? 'var(--negative)' : 'var(--accent)' }}
              initial={{ width: 0 }}
              animate={{ width: `${win * 100}%` }}
              transition={{ duration: 0.8, ease: EASE_APPLE }}
            />
          </div>
        }
      />
      <StatTile
        icon={<TrendingUp />}
        label="Relative uplift"
        value={formatSignedPct(result.relativeUplift)}
        tone={result.isSignificant ? direction : 'neutral'}
        caption={result.ciRelative ? `${pct}% CI ${formatSignedPct(result.ciRelative[0], 1)} to ${formatSignedPct(result.ciRelative[1], 1)}` : 'Undefined: control is zero'}
      />
      <StatTile
        icon={<Scale />}
        label={isBinary ? 'Absolute lift' : 'Mean difference'}
        value={fmtDiff(result.absoluteDiff)}
        tone={result.isSignificant ? direction : 'neutral'}
        caption={`${pct}% CI ${fmtDiff(result.ciAbsolute[0])} to ${fmtDiff(result.ciAbsolute[1])}`}
      />
    </div>
  );
}
