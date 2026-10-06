'use client';

import { Percent, Sigma } from 'lucide-react';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { NumberField, Slider, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatPct } from '@/lib/stats/format';
import { useWorkspace, type AnalyzerDraft } from '@/lib/store/workspace';
import { hypothesisStatement, type Hypothesis } from '@/types/experiment';
import type { MetricKind } from '@/types/stats';

const METRICS = [
  { value: 'binary', label: 'Conversion', icon: <Percent /> },
  { value: 'continuous', label: 'Revenue / user', icon: <Sigma /> },
] as const;

function ArmHeading({ tone, children }: { tone: 'control' | 'variant'; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
      <span className="h-[3px] w-3.5 rounded-full" style={{ background: tone === 'control' ? 'var(--chart-control)' : 'var(--chart-variant)' }} />
      {children}
    </p>
  );
}

function binaryErrors(d: AnalyzerDraft['binary']) {
  return {
    a: d.conversionsA > d.visitorsA ? 'Cannot exceed visitors' : null,
    b: d.conversionsB > d.visitorsB ? 'Cannot exceed visitors' : null,
  };
}

export function ExperimentForm() {
  const draft = useWorkspace((s) => s.draft);
  const setDraft = useWorkspace((s) => s.setDraft);
  const setBinary = (patch: Partial<AnalyzerDraft['binary']>) => setDraft({ binary: { ...draft.binary, ...patch } });
  const setContinuous = (patch: Partial<AnalyzerDraft['continuous']>) => setDraft({ continuous: { ...draft.continuous, ...patch } });
  const setHypothesis = (patch: Partial<Hypothesis>) => setDraft({ hypothesis: { ...draft.hypothesis, ...patch } });
  const errors = binaryErrors(draft.binary);
  const statement = hypothesisStatement(draft.hypothesis);

  return (
    <div className="space-y-5">
      <GlassCard>
        <CardHeader title="Hypothesis" description="Declare it before you look at results — it prevents HARKing." />
        <div className="space-y-4">
          <TextField label="Experiment name" value={draft.name} onChange={(name) => setDraft({ name })} placeholder="Checkout CTA contrast" maxLength={200} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField label="If we…" value={draft.hypothesis.change} onChange={(change) => setHypothesis({ change })} placeholder="raise CTA contrast" />
            <TextField label="then…" value={draft.hypothesis.metric} onChange={(metric) => setHypothesis({ metric })} placeholder="checkout rate" />
            <TextField label="will…" value={draft.hypothesis.effect} onChange={(effect) => setHypothesis({ effect })} placeholder="rise by 5%" />
            <TextField label="because…" value={draft.hypothesis.rationale} onChange={(rationale) => setHypothesis({ rationale })} placeholder="it stands out" />
          </div>
          {statement && <p className="rounded-xl bg-fill px-3.5 py-3 text-[13px] italic leading-relaxed text-fg-secondary">“{statement}”</p>}
        </div>
      </GlassCard>

      <GlassCard>
        <CardHeader title="Results data" description="Enter the final counts once the planned sample is reached." />
        <SegmentedControl<MetricKind> ariaLabel="Metric type" options={METRICS} value={draft.metric} onChange={(metric) => setDraft({ metric })} fullWidth className="mb-5" />

        {draft.metric === 'binary' ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div>
              <ArmHeading tone="control">Control A</ArmHeading>
              <div className="space-y-3">
                <NumberField label="Visitors" integer min={1} value={draft.binary.visitorsA} onChange={(visitorsA) => setBinary({ visitorsA })} />
                <NumberField label="Conversions" integer min={0} value={draft.binary.conversionsA} onChange={(conversionsA) => setBinary({ conversionsA })} error={errors.a} />
              </div>
            </div>
            <div>
              <ArmHeading tone="variant">Variant B</ArmHeading>
              <div className="space-y-3">
                <NumberField label="Visitors" integer min={1} value={draft.binary.visitorsB} onChange={(visitorsB) => setBinary({ visitorsB })} />
                <NumberField label="Conversions" integer min={0} value={draft.binary.conversionsB} onChange={(conversionsB) => setBinary({ conversionsB })} error={errors.b} />
              </div>
            </div>
            <NumberField
              className="col-span-2"
              label="Planned traffic to Control"
              suffix="%"
              min={1}
              max={99}
              value={Math.round((draft.binary.expectedShareA ?? 0.5) * 1000) / 10}
              onChange={(v) => setBinary({ expectedShareA: v / 100 })}
              hint="Used for the sample-ratio-mismatch check. 50% for an even split."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div>
              <ArmHeading tone="control">Control A</ArmHeading>
              <div className="space-y-3">
                <NumberField label="Mean" value={draft.continuous.meanA} onChange={(meanA) => setContinuous({ meanA })} />
                <NumberField label="Std. deviation" min={0} value={draft.continuous.sdA} onChange={(sdA) => setContinuous({ sdA })} />
                <NumberField label="Users" integer min={2} value={draft.continuous.nA} onChange={(nA) => setContinuous({ nA })} />
              </div>
            </div>
            <div>
              <ArmHeading tone="variant">Variant B</ArmHeading>
              <div className="space-y-3">
                <NumberField label="Mean" value={draft.continuous.meanB} onChange={(meanB) => setContinuous({ meanB })} />
                <NumberField label="Std. deviation" min={0} value={draft.continuous.sdB} onChange={(sdB) => setContinuous({ sdB })} />
                <NumberField label="Users" integer min={2} value={draft.continuous.nB} onChange={(nB) => setContinuous({ nB })} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-hairline pt-5">
          <Slider
            label="Confidence level"
            min={0.8}
            max={0.99}
            step={0.01}
            value={draft.confidence}
            onChange={(confidence) => setDraft({ confidence })}
            format={(v) => formatPct(v, 0)}
            hint={`α = ${(1 - draft.confidence).toFixed(2)} · two-sided`}
          />
        </div>
      </GlassCard>
    </div>
  );
}
