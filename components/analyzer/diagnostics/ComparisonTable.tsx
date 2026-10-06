import { formatDecimal, formatPValue, formatSignedDecimal } from '@/lib/stats/format';
import type { ContinuousResult } from '@/types/stats';

/** Side-by-side Welch results, e.g. raw vs adjusted. */
export function ComparisonTable({ rows }: { rows: { name: string; r: ContinuousResult }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[13px]">
        <thead className="text-[12px] text-muted">
          <tr className="border-b border-hairline">
            <th className="py-2 font-medium">Analysis</th>
            <th className="py-2 text-right font-medium">Mean A</th>
            <th className="py-2 text-right font-medium">Mean B</th>
            <th className="py-2 text-right font-medium">Δ</th>
            <th className="py-2 text-right font-medium">p-value</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map(({ name, r }) => (
            <tr key={name} className="border-b border-hairline last:border-0">
              <td className="py-2.5 font-medium">{name}</td>
              <td className="py-2.5 text-right">{formatDecimal(r.meanA)}</td>
              <td className="py-2.5 text-right">{formatDecimal(r.meanB)}</td>
              <td className="py-2.5 text-right">{formatSignedDecimal(r.absoluteDiff)}</td>
              <td className={`py-2.5 text-right ${r.isSignificant ? 'font-semibold text-accent' : ''}`}>{formatPValue(r.pValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
