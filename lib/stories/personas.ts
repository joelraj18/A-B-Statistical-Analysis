/**
 * Persona stories. Every number quoted in the prose is computed from the
 * engine at render time (see `compute.ts`), so the copy can never drift from
 * the charts the reader sees.
 */

import { mean, variance } from '@/lib/stats/abEngine';
import {
  formatDecimal,
  formatMoney,
  formatMoneyExact,
  formatNum,
  formatPct,
  formatPoints,
  formatPStatement,
  formatSignedPct,
} from '@/lib/stats/format';
import type { ContinuousInput } from '@/types/stats';
import { chenDays, marcusAccounts, SARAH_WHALES, sarahTraders } from './datasets';
import type { StoryId } from './ids';
import type { Story, StoryComputed } from './types';

function summarize(a: readonly number[], b: readonly number[]): Omit<ContinuousInput, 'confidence'> {
  const round = (x: number) => Math.round(x * 100) / 100;
  return {
    meanA: round(mean(a)),
    sdA: round(Math.sqrt(variance(a))),
    nA: a.length,
    meanB: round(mean(b)),
    sdB: round(Math.sqrt(variance(b))),
    nB: b.length,
  };
}

const days = (c: StoryComputed, daily: number) => Math.ceil(c.plan.total / daily);
/** Unsigned percentage points, for phrases like "fell 4.0 pp". */
const pp = (x: number, digits: number) => `${Math.abs(x * 100).toFixed(digits)} pp`;
const z80 = 1.959963984540054 + 0.8416212335729143;

const chen = chenDays();
const chenFirst48h = chen.slice(0, 2).reduce(
  (t, d) => ({
    visitorsA: t.visitorsA + d.visitorsA,
    conversionsA: t.conversionsA + d.conversionsA,
    visitorsB: t.visitorsB + d.visitorsB,
    conversionsB: t.conversionsB + d.conversionsB,
  }),
  { visitorsA: 0, conversionsA: 0, visitorsB: 0, conversionsB: 0 },
);

export const STORIES: readonly Story[] = [
  {
    id: 'priya',
    persona: { name: 'Priya Raman', initials: 'PR', role: 'Checkout product manager', company: 'Fashion retailer' },
    title: 'A checkout button that paid for itself',
    summary: 'A higher contrast Pay button, sized properly and shipped with confidence',
    trap: 'None, done right',
    outcome: { label: 'Shipped', tone: 'positive' },
    problem:
      'Priya owns checkout for a mid-size fashion retailer. Mobile shoppers reach the payment step and hesitate, and the grey Pay button blends into the page. Leadership wants a quick redesign. Priya wants proof first.',
    plan: { baselineRate: 0.032, mde: 0.08, power: 0.8, alpha: 0.05, dailyTraffic: 40_000 },
    experimentName: 'Checkout Pay button contrast',
    hypothesis: {
      change: 'make the Pay button high contrast',
      metric: 'checkout conversion',
      effect: 'rise by at least 8%',
      rationale: 'shoppers will find the next step instantly',
    },
    confidence: 0.95,
    analysis: () => ({
      metric: 'binary',
      binary: { visitorsA: 80_000, conversionsA: 2_560, visitorsB: 80_200, conversionsB: 2_840, expectedShareA: 0.5 },
    }),
    focus: null,
    chapters: {
      plan: (c) =>
        `Checkout converts at ${formatPct(c.plan.controlRate, 1)}. A lift smaller than 8% would not pay for the redesign, so Priya sizes the test for exactly that: ${formatNum(c.plan.perVariant)} shoppers per variant at 80% power, about ${days(c, 40_000)} days of traffic.`,
      hypothesis: 'She writes the hypothesis down before launch, so nobody can move the goalposts after seeing the data.',
      analyze: (c) => {
        const r = c.primary;
        return `With ${formatNum(r.arms.b.n)} shoppers per arm, the new button converts at ${formatPct(r.arms.b.estimate)} against ${formatPct(r.arms.a.estimate)}. That is ${formatSignedPct(r.relativeUplift, 1)} with ${formatPStatement(r.pValue)}. The traffic split passes the SRM check and the sample matches the plan.`;
      },
      decide: 'Priya ships the high contrast button to every shopper and archives the test with its hypothesis.',
    },
    impact: {
      kind: 'gain',
      label: 'Extra gross profit per month',
      assumptions: [
        { label: 'Checkout sessions per month', value: formatNum(1_200_000) },
        { label: 'Average order value', value: formatMoneyExact(68) },
        { label: 'Gross margin', value: '30%' },
      ],
      amount: (c) => c.primary.absoluteDiff * 1_200_000 * 68 * 0.3,
      explain: (c) =>
        `${formatNum(Math.round(c.primary.absoluteDiff * 1_200_000))} extra orders a month at $68 and a 30% margin.`,
    },
    lesson: 'A pre-registered hypothesis and a fixed sample turn a design opinion into a measured, bankable result.',
    reference: {
      cite: 'Kohavi, Longbotham, Sommerfield & Henne (2009). Controlled experiments on the web: survey and practical guide.',
      href: 'https://doi.org/10.1007/s10618-008-0114-1',
    },
  },
  {
    id: 'marcus',
    persona: { name: 'Marcus Webb', initials: 'MW', role: 'Growth data scientist', company: 'B2B analytics SaaS' },
    title: 'CUPED rescues a noisy revenue test',
    summary: 'An annual plan default that looked inconclusive until pre-experiment data cut the noise',
    trap: 'High variance metric',
    outcome: { label: 'Shipped with CUPED', tone: 'positive' },
    problem:
      'Marcus wants the pricing page to preselect the annual plan. B2B contract sizes vary enormously, so revenue per account is so noisy that even a real lift can hide inside the confidence interval.',
    plan: { baselineRate: 0.22, mde: 0.1, power: 0.8, alpha: 0.05, dailyTraffic: 250 },
    planNote: 'Revenue per account cannot be sized in the conversion planner, so Marcus sizes on annual plan uptake.',
    experimentName: 'Pricing page annual plan default',
    hypothesis: {
      change: 'preselect the annual plan on the pricing page',
      metric: 'revenue per account',
      effect: 'grow by about 4%',
      rationale: 'defaults anchor buyers on the higher commitment',
    },
    confidence: 0.95,
    analysis: () => {
      const d = marcusAccounts();
      return { metric: 'continuous', continuous: summarize(d.yControl, d.yVariant) };
    },
    diagnostics: { cuped: { source: { kind: 'story', storyId: 'marcus' } } },
    focus: 'cuped',
    chapters: {
      plan: (c) =>
        `Sized on annual plan uptake (22% baseline, a 10% relative lift), the test needs ${formatNum(c.plan.perVariant)} accounts per variant. At about 250 sign ups a day that is roughly four weeks.`,
      hypothesis: 'The primary metric is revenue per account, the number finance actually cares about.',
      analyze: (c) => {
        const cu = c.cuped!;
        const extraWeeks = Math.max(0, 4 * ((z80 / Math.abs(cu.original.tStat)) ** 2 - 1));
        return `After four weeks revenue per account is up ${formatSignedPct(cu.original.relativeUplift, 1)}, but ${formatPStatement(cu.original.pValue)}. Reaching 80% power at this effect would need about ${Math.round(extraWeeks)} more weeks. Instead Marcus uses each account's spend in the 90 days before the test as a CUPED covariate. The correlation is ${formatDecimal(cu.correlation, 2)}, the variance of the estimate falls ${formatPct(cu.varianceReduction.estimator, 0)}, and ${formatPStatement(cu.adjusted.pValue)} without adding a single account.`;
      },
      decide: 'Marcus ships the annual default and frees the experiment slot two months early.',
    },
    impact: {
      kind: 'gain',
      label: 'Extra annual recurring revenue',
      assumptions: [
        { label: 'New accounts per month', value: formatNum(1_500) },
        { label: 'Lift per account per month', value: 'CUPED estimate' },
      ],
      amount: (c) => c.cuped!.adjusted.absoluteDiff * 1_500 * 12,
      explain: (c) =>
        `${formatMoneyExact(c.cuped!.adjusted.absoluteDiff)} more per account per month across 1,500 new accounts a month, a year earlier than waiting for power.`,
    },
    lesson: 'Variance reduction is free statistical power. Pre-experiment behaviour explains most of the noise in enterprise revenue.',
    reference: {
      cite: 'Deng, Xu, Kohavi & Walker (2013). Improving the sensitivity of online controlled experiments by utilizing pre-experiment data.',
      href: 'https://doi.org/10.1145/2433396.2433413',
    },
  },
  {
    id: 'aisha',
    persona: { name: 'Aisha Bello', initials: 'AB', role: 'Mobile product manager', company: 'Fitness app' },
    title: 'An onboarding redesign that had to be rolled back',
    summary: 'Five personalisation questions made activation significantly worse',
    trap: 'Confident team, negative result',
    outcome: { label: 'Rolled back', tone: 'negative' },
    problem:
      'Aisha owns onboarding for a fitness app. Her team rebuilt the first run flow with five personalisation questions and everyone was convinced it would raise 7 day activation.',
    plan: { baselineRate: 0.42, mde: 0.03, power: 0.8, alpha: 0.05, dailyTraffic: 10_000 },
    experimentName: 'Personalised onboarding flow',
    hypothesis: {
      change: 'ask five personalisation questions at sign up',
      metric: '7 day activation',
      effect: 'rise by 3%',
      rationale: 'tailored plans feel more relevant',
    },
    confidence: 0.95,
    analysis: () => ({
      metric: 'binary',
      binary: { visitorsA: 26_000, conversionsA: 10_920, visitorsB: 26_100, conversionsB: 10_310, expectedShareA: 0.5 },
    }),
    focus: null,
    chapters: {
      plan: (c) =>
        `Activation sits at ${formatPct(c.plan.controlRate, 0)}. To detect a 3% relative change Aisha needs ${formatNum(c.plan.perVariant)} new users per variant, about ${days(c, 10_000)} days of installs.`,
      hypothesis: 'The hypothesis predicts a lift, but a two-sided test is just as ready to detect harm.',
      analyze: (c) => {
        const r = c.primary;
        return `Activation falls from ${formatPct(r.arms.a.estimate, 1)} to ${formatPct(r.arms.b.estimate, 1)}, a ${formatSignedPct(r.relativeUplift, 1)} change with ${formatPStatement(r.pValue)}. The extra questions add friction before users see any value.`;
      },
      decide: 'Aisha rolls back to the original flow and tests a single optional question next.',
    },
    impact: {
      kind: 'avoided',
      label: 'Lifetime value protected per month',
      assumptions: [
        { label: 'Installs per month', value: formatNum(300_000) },
        { label: 'Lifetime value per activated user', value: formatMoneyExact(14) },
      ],
      amount: (c) => Math.abs(c.primary.absoluteDiff) * 300_000 * 14,
      explain: (c) => `${formatNum(Math.round(Math.abs(c.primary.absoluteDiff) * 300_000))} activations a month that a launch would have lost.`,
    },
    lesson: 'Testing protects you from your best ideas too. A significant loss caught early is one of the most valuable results a team can get.',
    reference: {
      cite: 'Kohavi, Tang & Xu (2020). Trustworthy Online Controlled Experiments. Cambridge University Press.',
      href: 'https://doi.org/10.1017/9781108653985',
    },
  },
  {
    id: 'diego',
    persona: { name: 'Diego Alvarez', initials: 'DA', role: 'Growth lead', company: 'Digital newsroom' },
    title: 'A newsletter win that was a logging bug',
    summary: 'A sample ratio mismatch and an early peek nearly produced a false launch',
    trap: 'SRM and peeking',
    outcome: { label: 'Blocked by SRM', tone: 'warning' },
    problem:
      'Diego runs growth for a news site. A new newsletter signup modal looked like a clear win after six days, and the editor wants to announce it in the Monday all-hands.',
    plan: { baselineRate: 0.05, mde: 0.05, power: 0.8, alpha: 0.05, dailyTraffic: 30_000 },
    experimentName: 'Newsletter signup modal',
    hypothesis: {
      change: 'show a newsletter modal after the second article',
      metric: 'newsletter signups',
      effect: 'rise by 5%',
      rationale: 'engaged readers are primed to subscribe',
    },
    confidence: 0.95,
    analysis: () => ({
      metric: 'binary',
      binary: { visitorsA: 52_000, conversionsA: 2_600, visitorsB: 48_500, conversionsB: 2_620, expectedShareA: 0.5 },
    }),
    focus: null,
    chapters: {
      plan: (c) =>
        `At a 5% signup rate, detecting a 5% lift needs ${formatNum(c.plan.perVariant)} readers per variant, about ${days(c, 30_000)} days. Diego adopts the plan, which arms the peeking guard.`,
      hypothesis: 'The hypothesis is fine. The trouble is in the data pipeline.',
      analyze: (c) => {
        const r = c.primary;
        const srm = r.kind === 'binary' ? r.srm : null;
        return `The dashboard shows ${formatSignedPct(r.relativeUplift, 1)} with ${formatPStatement(r.pValue)}. But Control received ${formatPct(srm?.observedShareA, 1)} of traffic instead of 50% (χ² ${formatPStatement(srm?.pValue ?? 1)}): a bot filter dropped variant sessions that loaded the modal script late. And at ${formatNum(r.arms.b.n)} readers per arm the test has reached only ${formatPct(r.arms.b.n / c.plan.perVariant, 0)} of its planned sample.`;
      },
      decide: 'Diego blocks the announcement, fixes the bot filter and restarts the test with a fixed horizon.',
    },
    impact: {
      kind: 'avoided',
      label: 'Phantom revenue not forecast per month',
      assumptions: [
        { label: 'Visitors per month', value: formatNum(900_000) },
        { label: 'Value per subscriber', value: formatMoneyExact(11) },
      ],
      amount: (c) => c.primary.absoluteDiff * 900_000 * 11,
      explain: () => 'Revenue the newsroom would have budgeted on a lift that came from broken assignment, not from readers.',
    },
    lesson: 'Check the sample ratio before the p-value. Twyman’s law: any figure that looks interesting is usually wrong.',
    reference: {
      cite: 'Fabijan et al. (2019). Diagnosing sample ratio mismatch in online controlled experiments. KDD.',
      href: 'https://doi.org/10.1145/3292500.3330722',
    },
  },
  {
    id: 'elena',
    persona: { name: 'Elena Petrova', initials: 'EP', role: 'Credit risk data scientist', company: 'Digital lender' },
    title: 'A loan approval model that only cannibalised control',
    summary: 'Treatment drained a shared capital pool, so its 25% lift was borrowed from control',
    trap: 'SUTVA violation',
    outcome: { label: 'Lift not booked', tone: 'warning' },
    problem:
      'Elena tests a new instant approval model for personal loans, randomised user by user. Both arms draw on the same monthly capital allocation, so every loan one arm approves is capital the other arm cannot lend.',
    plan: { baselineRate: 0.2, mde: 0.1, power: 0.8, alpha: 0.05, dailyTraffic: 2_000 },
    experimentName: 'Instant approval model',
    hypothesis: {
      change: 'approve applications with the new instant model',
      metric: 'loan origination rate',
      effect: 'rise by 10%',
      rationale: 'faster decisions reduce applicant drop off',
    },
    confidence: 0.95,
    analysis: () => ({
      metric: 'binary',
      binary: { visitorsA: 20_000, conversionsA: 3_200, visitorsB: 20_000, conversionsB: 4_000, expectedShareA: 0.5 },
    }),
    diagnostics: {
      tab: 'interference',
      interference: {
        baseline: { visitors: 40_000, conversions: 8_000 },
        control: { visitors: 20_000, conversions: 3_200 },
        treatment: { visitors: 20_000, conversions: 4_000 },
      },
    },
    focus: 'interference',
    chapters: {
      plan: (c) => `A 20% origination rate and a 10% target lift need ${formatNum(c.plan.perVariant)} applications per variant, a few days of volume.`,
      hypothesis: 'The hypothesis assumes one applicant’s treatment cannot affect another. That assumption, SUTVA, is the one that breaks.',
      analyze: (c) => {
        const i = c.interference!;
        return `Treatment originates ${formatPct(i.naive.rateB, 1)} of applications against ${formatPct(i.naive.rateA, 1)} for control, a ${formatSignedPct(i.naive.relativeUplift, 0)} lift with ${formatPStatement(i.naive.pValue)}. The interference check compares control with its own pre-test baseline of ${formatPct(i.controlShift.rateA, 1)}: control fell ${pp(i.controlShift.absoluteDiff, 1)} as faster approvals drained the shared pool. Against that baseline treatment changed by ${formatSignedPct(i.global.relativeUplift, 1)}, so ${formatPct(i.cannibalizedShare, 0)} of the apparent lift was taken from control.`;
      },
      decide: 'Elena does not book the lift. She ring-fences capital per arm and plans a market level rollout test.',
    },
    impact: {
      kind: 'avoided',
      label: 'Phantom revenue avoided per month',
      assumptions: [
        { label: 'Applications per month', value: formatNum(60_000) },
        { label: 'Revenue per originated loan', value: formatMoneyExact(380) },
      ],
      amount: (c) => c.interference!.naive.absoluteDiff * (c.interference!.cannibalizedShare ?? 0) * 60_000 * 380,
      explain: () => 'Origination revenue the finance plan would have counted, although total lending did not grow at all.',
    },
    lesson: 'When arms share a constrained resource, a user level test measures redistribution, not growth. Compare control with its own baseline.',
    reference: {
      cite: 'Imbens & Rubin (2015). Causal Inference for Statistics, Social, and Biomedical Sciences. Cambridge University Press.',
      href: 'https://doi.org/10.1017/CBO9781139025751',
    },
  },
  {
    id: 'james',
    persona: { name: 'James Okafor', initials: 'JO', role: 'AdTech ML engineer', company: 'Programmatic ad exchange' },
    title: 'Simpson’s paradox hides a better bidder',
    summary: 'The top line says roll back, yet the new model wins on mobile and desktop alike',
    trap: 'Simpson’s paradox',
    outcome: { label: 'Shipped after stratifying', tone: 'positive' },
    problem:
      'James built a predictive real time bidding model. The top line dashboard shows a lower conversion rate for the new bidder, and the team is preparing a rollback.',
    plan: { baselineRate: 0.052, mde: 0.06, power: 0.8, alpha: 0.05, dailyTraffic: 50_000 },
    experimentName: 'Predictive RTB bidder',
    hypothesis: {
      change: 'bid with the predictive conversion model',
      metric: 'conversion rate per won impression',
      effect: 'rise by 6%',
      rationale: 'the model prices each impression by its real conversion odds',
    },
    confidence: 0.95,
    analysis: () => ({
      metric: 'binary',
      binary: { visitorsA: 100_000, conversionsA: 5_200, visitorsB: 100_000, conversionsB: 3_160, expectedShareA: 0.5 },
    }),
    diagnostics: {
      tab: 'segments',
      segments: [
        { name: 'Mobile', visitorsA: 20_000, conversionsA: 400, visitorsB: 80_000, conversionsB: 1_840 },
        { name: 'Desktop', visitorsA: 80_000, conversionsA: 4_800, visitorsB: 20_000, conversionsB: 1_320 },
      ],
    },
    focus: 'segments',
    chapters: {
      plan: (c) => `A 5.2% conversion rate and a 6% target lift need ${formatNum(c.plan.perVariant)} won impressions per variant.`,
      hypothesis: 'The hypothesis is about conversion per impression. Which impressions the model wins is a second, hidden effect.',
      analyze: (c) => {
        const s = c.segments!;
        const [mobile, desktop] = s.segments;
        return `Overall conversion drops from ${formatPct(s.pooled.rateA, 1)} to ${formatPct(s.pooled.rateB, 1)}. Split by device, the story reverses: mobile ${formatSignedPct(mobile!.result.relativeUplift, 0)} and desktop ${formatSignedPct(desktop!.result.relativeUplift, 0)}. The new bidder wins far more cheap mobile inventory, so ${formatPct(mobile!.shareB, 0)} of its impressions are mobile against ${formatPct(mobile!.shareA, 0)} for control (χ² ${formatPStatement(s.mixImbalance.pValue)}). The stratified effect is ${formatPoints(s.stratified.absoluteDiff, 2)} with ${formatPStatement(s.stratified.pValue)}.`;
      },
      decide: 'James ships the new bidder and changes the dashboard to report device stratified conversion.',
    },
    impact: {
      kind: 'gain',
      label: 'Extra conversion value per month',
      assumptions: [
        { label: 'Won impressions per month', value: formatNum(4_000_000) },
        { label: 'Value per conversion', value: formatMoneyExact(22) },
      ],
      amount: (c) => c.segments!.stratified.absoluteDiff * 4_000_000 * 22,
      explain: (c) => `${formatNum(Math.round(c.segments!.stratified.absoluteDiff * 4_000_000))} extra conversions a month that a rollback would have thrown away.`,
    },
    lesson: 'When the mix of traffic differs between arms, a pooled rate compares different populations. Stratify by the variable that shifted.',
    reference: {
      cite: 'Pearl (2014). Comment: Understanding Simpson’s paradox. The American Statistician, 68(1).',
      href: 'https://doi.org/10.1080/00031305.2014.876829',
    },
  },
  {
    id: 'sarah',
    persona: { name: 'Sarah Lindqvist', initials: 'SL', role: 'Algorithmic trading data scientist', company: 'Retail brokerage' },
    title: 'A fee change carried by a handful of whales',
    summary: 'Revenue per trader jumped 40%, until Winsorization showed it was seven accounts',
    trap: 'Outlier skew',
    outcome: { label: 'Not shipped', tone: 'warning' },
    problem:
      'Sarah tests a new margin trading fee structure. Revenue per trader is extremely heavy tailed: a few institutional accounts trade more than thousands of retail users combined.',
    plan: { baselineRate: 0.12, mde: 0.08, power: 0.8, alpha: 0.05, dailyTraffic: 4_000 },
    planNote: 'Revenue per trader is sized through its conversion driver, margin account activation.',
    experimentName: 'Margin fee structure',
    hypothesis: {
      change: 'switch to tiered margin fees',
      metric: 'revenue per trader',
      effect: 'rise by 10%',
      rationale: 'lower entry fees bring more traders into margin products',
    },
    confidence: 0.95,
    analysis: () => {
      const d = sarahTraders();
      return { metric: 'continuous', continuous: summarize(d.valuesA, d.valuesB) };
    },
    diagnostics: {
      tab: 'outliers',
      robust: { source: { kind: 'story', storyId: 'sarah' }, winsorizePercentile: 0.99, topK: SARAH_WHALES },
    },
    focus: 'outliers',
    chapters: {
      plan: (c) => `Sized on margin activation (12% baseline, an 8% lift) the test needs ${formatNum(c.plan.perVariant)} traders per variant. She runs 20,000 per arm.`,
      hypothesis: 'The hypothesis is about typical traders. Averages are dominated by atypical ones.',
      analyze: (c) => {
        const r = c.robust!;
        return `Average revenue per trader jumps ${formatSignedPct(r.raw.relativeUplift, 0)} with Welch ${formatPStatement(r.raw.pValue)}. The outlier guardrail flags a skewness of ${formatDecimal(r.skewness, 0)}: the ${SARAH_WHALES} largest variant accounts, all institutional, explain ${formatPct(Math.min(1, r.topKShare ?? 0), 0)} of the lift. Capping every account at the 99th percentile (${formatMoneyExact(r.cap)}) leaves ${formatSignedPct(r.winsorized.relativeUplift, 1)} with ${formatPStatement(r.winsorized.pValue)}.`;
      },
      decide: 'Sarah keeps the current fees and reruns the test stratified by account tier, with institutional accounts randomised separately.',
    },
    impact: {
      kind: 'avoided',
      label: 'Phantom revenue avoided per month',
      assumptions: [{ label: 'Active traders', value: formatNum(250_000) }],
      amount: (c) => (c.robust!.raw.absoluteDiff - c.robust!.winsorized.absoluteDiff) * 250_000,
      explain: () => 'Revenue a 40% forecast would have promised, although it came from a few lucky assignments.',
    },
    lesson: 'With heavy tailed money metrics, random assignment of a few whales can manufacture significance. Cap, stratify, then decide.',
    reference: {
      cite: 'Kohavi, Deng, Longbotham & Xu (2014). Seven rules of thumb for web site experimenters. KDD.',
      href: 'https://doi.org/10.1145/2623330.2623341',
    },
  },
  {
    id: 'david',
    persona: { name: 'David Mensah', initials: 'DM', role: 'Marketplace optimisation data scientist', company: 'Ride hailing platform' },
    title: 'A dispatch win borrowed from the other arm',
    summary: 'Treatment riders were matched faster because they took drivers from control',
    trap: 'Marketplace interference',
    outcome: { label: 'Re-run as switchback', tone: 'accent' },
    problem:
      'David optimises dispatch for a ride hailing marketplace. A new matching algorithm promises shorter waits, but riders in both arms are served by the same pool of drivers.',
    plan: { baselineRate: 0.62, mde: 0.05, power: 0.8, alpha: 0.05, dailyTraffic: 20_000 },
    experimentName: 'Dispatch matching algorithm',
    hypothesis: {
      change: 'dispatch with the new matching algorithm',
      metric: 'rides matched within 5 minutes',
      effect: 'rise by 5%',
      rationale: 'it predicts where drivers will free up next',
    },
    confidence: 0.95,
    analysis: () => ({
      metric: 'binary',
      binary: { visitorsA: 30_000, conversionsA: 15_300, visitorsB: 30_000, conversionsB: 22_200, expectedShareA: 0.5 },
    }),
    diagnostics: {
      tab: 'interference',
      interference: {
        baseline: { visitors: 60_000, conversions: 37_200 },
        control: { visitors: 30_000, conversions: 15_300 },
        treatment: { visitors: 30_000, conversions: 22_200 },
      },
      switchback: { source: { kind: 'story', storyId: 'david' } },
    },
    focus: 'interference',
    chapters: {
      plan: (c) => `At a 62% on-time match rate, detecting a 5% lift needs ${formatNum(c.plan.perVariant)} ride requests per variant.`,
      hypothesis: 'The rider level design quietly assumes riders compete for nothing. In a marketplace they compete for drivers.',
      analyze: (c) => {
        const i = c.interference!;
        const sb = c.switchback!.result;
        return `In the rider level test ${formatPct(i.naive.rateB, 0)} of treatment rides are matched within five minutes against ${formatPct(i.naive.rateA, 0)} in control. But control fell ${pp(i.controlShift.absoluteDiff, 0)} below its pre-test baseline: treatment was pulling drivers away. A one week switchback that alternates the whole city between algorithms every hour measures the real effect: ${formatPoints(sb.absoluteDiff, 1)} with ${formatPStatement(sb.pValue)}.`;
      },
      decide: 'David ships the algorithm city wide, but forecasts on the switchback estimate rather than the rider level one.',
    },
    impact: {
      kind: 'avoided',
      label: 'Overstated gain avoided per month',
      assumptions: [
        { label: 'Ride requests per month', value: formatNum(3_000_000) },
        { label: 'Value per on-time match', value: formatMoneyExact(0.9) },
      ],
      amount: (c) => (c.interference!.naive.absoluteDiff - c.switchback!.result.absoluteDiff) * 3_000_000 * 0.9,
      explain: (c) =>
        `The real gain of ${formatMoney(c.switchback!.result.absoluteDiff * 3_000_000 * 0.9)} a month is still worth shipping, without promising leadership ten times more.`,
    },
    lesson: 'When units share supply, randomise the supply: switchbacks by time or city measure the global effect the business will actually see.',
    reference: {
      cite: 'Bojinov, Simchi-Levi & Zhao (2023). Design and analysis of switchback experiments. Management Science, 69(7).',
      href: 'https://doi.org/10.1287/mnsc.2022.4583',
    },
  },
  {
    id: 'chen',
    persona: { name: 'Chen Wei', initials: 'CW', role: 'Deep learning data scientist', company: 'Streaming platform' },
    title: 'A recommendation model saved from a premature kill',
    summary: 'Click-through fell 12% in two days, then beat control by 8% once users adapted',
    trap: 'Primacy effect',
    outcome: { label: 'Shipped after learning period', tone: 'positive' },
    problem:
      'Chen deployed a reinforcement learning model that reorders the entire home screen. Within 48 hours the numbers look disastrous and the team wants it switched off.',
    plan: { baselineRate: 0.1, mde: 0.05, power: 0.8, alpha: 0.05, dailyTraffic: 80_000 },
    experimentName: 'RL home screen ranking',
    hypothesis: {
      change: 'rank the home screen with the RL model',
      metric: 'home screen click-through',
      effect: 'rise by 5%',
      rationale: 'it learns each viewer’s taste across sessions',
    },
    confidence: 0.95,
    analysis: () => ({ metric: 'binary', binary: { ...chenFirst48h, expectedShareA: 0.5 } }),
    diagnostics: { tab: 'trend', trend: { days: chen, learningDays: 14 } },
    focus: 'trend',
    chapters: {
      plan: (c) =>
        `A 10% click-through rate and a 5% target need ${formatNum(c.plan.perVariant)} sessions per variant, under two days of traffic. Chen also pre-registers a 14 day learning period because the change is radical.`,
      hypothesis: 'The hypothesis is about steady state behaviour, not the first impression.',
      analyze: (c) => {
        const t = c.trend!;
        return `In the first 48 hours click-through falls ${formatSignedPct(c.primary.relativeUplift, 0)} with ${formatPStatement(c.primary.pValue)}. The trend diagnostic shows the daily lift climbing steadily (${formatPStatement(t.slopePValue)}), the signature of a primacy effect: viewers were relearning the layout. After the 14 day learning period the model lifts click-through ${formatSignedPct(t.post.relativeUplift, 0)} with ${formatPStatement(t.post.pValue)}.`;
      },
      decide: 'Chen keeps the model, reads results only after the learning window and ships it in week three.',
    },
    impact: {
      kind: 'gain',
      label: 'Extra ad revenue per month',
      assumptions: [
        { label: 'Home screen sessions per month', value: formatNum(400_000_000) },
        { label: 'Revenue per click', value: formatMoneyExact(0.05) },
      ],
      amount: (c) => c.trend!.post.absoluteDiff * 400_000_000 * 0.05,
      explain: () => 'Revenue the team would have abandoned by trusting the first two days.',
    },
    lesson: 'Big interface changes provoke change aversion. Pre-register a learning period and judge on the stable window.',
    reference: {
      cite: 'Hohnhold, O’Brien & Tang (2015). Focusing on the long-term: it’s good for users and business. KDD.',
      href: 'https://doi.org/10.1145/2783258.2788583',
    },
  },
];

const BY_ID = new Map<StoryId, Story>(STORIES.map((s) => [s.id, s]));

export function getStory(id: StoryId): Story {
  return BY_ID.get(id)!;
}

