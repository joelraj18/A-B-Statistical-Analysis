'use client';

import { Stethoscope } from 'lucide-react';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useWorkspace, type DiagnosticTab } from '@/lib/store/workspace';
import { InterferenceTab } from './diagnostics/InterferenceTab';
import { OutliersTab } from './diagnostics/OutliersTab';
import { SegmentsTab } from './diagnostics/SegmentsTab';
import { SwitchbackTab } from './diagnostics/SwitchbackTab';
import { TrendTab } from './diagnostics/TrendTab';

const TABS = [
  { value: 'segments', label: 'Segments' },
  { value: 'outliers', label: 'Outliers' },
  { value: 'trend', label: 'Time trend' },
  { value: 'interference', label: 'Interference' },
  { value: 'switchback', label: 'Switchback' },
] as const;

const DESCRIPTIONS: Record<DiagnosticTab, string> = {
  segments: 'Check whether the pooled result agrees with every segment, Simpson’s paradox',
  outliers: 'Measure how much of a revenue lift a few extreme accounts explain',
  trend: 'Spot primacy and novelty effects before trusting early numbers',
  interference: 'Test whether treatment changed what control experienced, SUTVA',
  switchback: 'Estimate the global effect when arms compete for shared supply',
};

/** Guardrail diagnostics for the traps a single top-line test hides. */
export function DiagnosticsPanel({ confidence }: { confidence: number }) {
  const tab = useWorkspace((s) => s.draft.diagnostics.tab);
  const setDiagnostics = useWorkspace((s) => s.setDiagnostics);

  return (
    <GlassCard id="diagnostics" className="scroll-mt-56">
      <CardHeader icon={<Stethoscope />} title="Diagnostics" description={DESCRIPTIONS[tab]} />
      <div className="-mx-1 mb-6 overflow-x-auto px-1">
        <SegmentedControl<DiagnosticTab> ariaLabel="Diagnostic" options={TABS} value={tab} onChange={(t) => setDiagnostics({ tab: t })} size="sm" />
      </div>
      {tab === 'segments' && <SegmentsTab confidence={confidence} />}
      {tab === 'outliers' && <OutliersTab confidence={confidence} />}
      {tab === 'trend' && <TrendTab confidence={confidence} />}
      {tab === 'interference' && <InterferenceTab confidence={confidence} />}
      {tab === 'switchback' && <SwitchbackTab confidence={confidence} />}
    </GlassCard>
  );
}
