import { AlertTriangle, BookOpen, Calculator, FlaskConical, Sigma, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { Formula } from '@/components/guide/Formula';
import { PageHeader } from '@/components/layout/PageHeader';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';

export const metadata: Metadata = { title: 'Methodology Guide' };

const WORKFLOW = [
  {
    phase: 'Phase 1',
    title: 'Plan the sample',
    body: 'Enter the baseline rate and the smallest relative lift worth shipping. Adopt the plan and the Analyzer will flag any read-out before that sample is reached.',
  },
  {
    phase: 'Phase 2',
    title: 'State the hypothesis',
    body: '“If we [change], then [metric] will [effect] because [rationale].” Written before data exists, it rules out HARKing, hypothesising after the results are known.',
  },
  {
    phase: 'Phase 3',
    title: 'Analyse once',
    body: 'Enter final counts. Check the SRM banner first, then the verdict, confidence interval and narrative. p < α and an interval that excludes zero mean the effect is unlikely to be noise.',
  },
  {
    phase: 'Phase 4',
    title: 'Archive the learning',
    body: 'Save every test, especially the losers. A searchable ledger of hypotheses and outcomes stops teams repeating failed ideas and enables meta-analysis.',
  },
];

const PITFALLS = [
  {
    title: 'Peeking',
    body: 'Re-checking a fixed-horizon test daily and stopping at the first p < 0.05 inflates the false-positive rate from 5% to well over 30%. Fix the sample in advance, or use a sequential method designed for continuous monitoring.',
  },
  {
    title: 'Sample ratio mismatch',
    body: 'If a 50/50 test delivers 50.8/49.2 on 100k users, the χ² test fails at p < 0.001. Something in assignment, redirects, bots or logging is broken, and any effect estimate is suspect.',
  },
  {
    title: 'Twyman’s law',
    body: '“Any figure that looks interesting or different is usually wrong.” A surprisingly large win deserves an audit before a launch.',
  },
  {
    title: 'Novelty & seasonality',
    body: 'Run whole weeks so weekday and weekend users are both represented, and watch for effects that fade as the novelty wears off.',
  },
  {
    title: 'Multiple comparisons',
    body: 'Testing 20 metrics at α = 0.05 yields one “significant” result by chance alone. Name a single primary metric up front; treat the rest as guardrails.',
  },
];

const REFERENCES = [
  {
    cite: 'Kohavi, R., Longbotham, R., Sommerfield, D., & Henne, R. M. (2009). Controlled experiments on the web: survey and practical guide. Data Mining and Knowledge Discovery, 18(1), 140–181.',
    href: 'https://doi.org/10.1007/s10618-008-0114-1',
  },
  {
    cite: 'Kohavi, R., Tang, D., & Xu, Y. (2020). Trustworthy Online Controlled Experiments: A Practical Guide to A/B Testing. Cambridge University Press.',
    href: 'https://doi.org/10.1017/9781108653985',
  },
  {
    cite: 'Deng, A., Xu, Y., Kohavi, R., & Walker, T. (2013). Improving the sensitivity of online controlled experiments by utilizing pre-experiment data (CUPED). WSDM ’13, 123–132.',
    href: 'https://doi.org/10.1145/2433396.2433413',
  },
  {
    cite: 'Johari, R., Koomen, P., Pekelis, L., & Walsh, D. (2017). Peeking at A/B tests: why it matters, and what to do about it. KDD ’17, 1517–1525.',
    href: 'https://doi.org/10.1145/3097983.3097992',
  },
  {
    cite: 'Fabijan, A., Gupchup, J., Gupta, S., Omhover, J., Qin, W., Vermeer, L., & Dmitriev, P. (2019). Diagnosing sample ratio mismatch in online controlled experiments. KDD ’19, 2156–2164.',
    href: 'https://doi.org/10.1145/3292500.3330722',
  },
];

export default function GuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        title="How the engine decides"
        description="Classical frequentist testing with the guardrails from the online experimentation literature, and the formula behind every number in the app"
      />

      <section aria-labelledby="workflow" className="mb-12">
        <h2 id="workflow" className="mb-4 text-[22px] font-semibold tracking-tight">
          The workflow
        </h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map((w) => (
            <li key={w.phase}>
              <GlassCard className="h-full">
                <p className="text-[12px] font-semibold text-accent">{w.phase}</p>
                <h3 className="mt-1 text-[17px] font-semibold tracking-tight">{w.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{w.body}</p>
              </GlassCard>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="maths" className="mb-12 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <h2 id="maths" className="sr-only">
          Mathematics
        </h2>
        <GlassCard>
          <CardHeader icon={<FlaskConical />} title="Two-proportion Z-test" description="Conversion rates, click-through and any yes or no metric" />
          <p className="text-[14px] leading-relaxed text-fg-secondary">
            H₀: p<sub>B</sub> − p<sub>A</sub> = 0 against H₁: p<sub>B</sub> − p<sub>A</sub> ≠ 0. Under H₀ both arms share one rate, so the test statistic uses the pooled
            standard error:
          </p>
          <Formula>
            p̂ = (x<sub>A</sub> + x<sub>B</sub>) / (n<sub>A</sub> + n<sub>B</sub>)
            <br />Z = (p̂<sub>B</sub> − p̂<sub>A</sub>) / √( p̂(1 − p̂)(1/n<sub>A</sub> + 1/n<sub>B</sub>) )
            <br />p = 2·(1 − Φ(|Z|))
          </Formula>
          <p className="text-[14px] leading-relaxed text-fg-secondary">
            The confidence interval does not assume H₀, so it uses the unpooled SE √(p̂<sub>A</sub>q̂<sub>A</sub>/n<sub>A</sub> + p̂<sub>B</sub>q̂<sub>B</sub>/n<sub>B</sub>). Per-arm intervals use the
            Wilson score method, which behaves well near 0% and 100%.
          </p>
        </GlassCard>

        <GlassCard>
          <CardHeader icon={<Sigma />} title="Welch’s t-test" description="Revenue per user, session length and any continuous metric" />
          <p className="text-[14px] leading-relaxed text-fg-secondary">Welch’s test does not assume equal variances, because revenue in a treatment arm is rarely spread like control.</p>
          <Formula>
            t = (x̄<sub>B</sub> − x̄<sub>A</sub>) / √(s²<sub>A</sub>/n<sub>A</sub> + s²<sub>B</sub>/n<sub>B</sub>)
            <br />ν = (s²<sub>A</sub>/n<sub>A</sub> + s²<sub>B</sub>/n<sub>B</sub>)² / [ (s²<sub>A</sub>/n<sub>A</sub>)²/(n<sub>A</sub>−1) + (s²<sub>B</sub>/n<sub>B</sub>)²/(n<sub>B</sub>−1) ]
          </Formula>
          <p className="text-[14px] leading-relaxed text-fg-secondary">Relative-lift intervals for both tests use the delta method on (B − A)/A.</p>
        </GlassCard>

        <GlassCard>
          <CardHeader icon={<Calculator />} title="Sample size & power" description="Fixed-horizon design for a two-sided test" />
          <Formula label="p₂ = p₁(1 + MDE), p̄ = (p₁ + p₂)/2">
            n = ( z<sub>α/2</sub>·√(2p̄(1 − p̄)) + z<sub>β</sub>·√(p₁(1 − p₁) + p₂(1 − p₂)) )² / (p₂ − p₁)²
          </Formula>
          <p className="text-[14px] leading-relaxed text-fg-secondary">
            Halving the MDE roughly quadruples the sample. Power is the probability of detecting the MDE if it is real; 80% means one in five true effects is
            missed.
          </p>
        </GlassCard>

        <GlassCard>
          <CardHeader icon={<Sparkles />} title="CUPED variance reduction" description="Deng, Xu, Kohavi and Walker, 2013" />
          <Formula>
            Ŷ<sub>cv</sub> = Y − θ(X − E[X]), θ = Cov(X, Y) / Var(X)
            <br />Var(Ŷ<sub>cv</sub>) = Var(Y)·(1 − ρ²)
          </Formula>
          <p className="text-[14px] leading-relaxed text-fg-secondary">
            X is the same metric measured before the experiment. Because X is unaffected by treatment, the adjusted estimate stays unbiased while variance falls by
            ρ². A correlation of 0.7 halves the variance, equivalent to doubling traffic. θ is estimated on pooled data.
          </p>
        </GlassCard>
      </section>

      <section aria-labelledby="pitfalls" className="mb-12">
        <GlassCard>
          <CardHeader icon={<AlertTriangle />} title="Pitfalls the engine guards against" />
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            {PITFALLS.map((p) => (
              <div key={p.title}>
                <dt className="text-[15px] font-semibold tracking-tight">{p.title}</dt>
                <dd className="mt-1 text-[14px] leading-relaxed text-muted">{p.body}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </section>

      <section aria-labelledby="references">
        <GlassCard>
          <CardHeader icon={<BookOpen />} title="References" />
          <ol className="list-decimal space-y-3 pl-5 text-[14px] leading-relaxed text-fg-secondary marker:text-faint">
            {REFERENCES.map((r) => (
              <li key={r.href}>
                {r.cite}{' '}
                <a href={r.href} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                  doi
                </a>
              </li>
            ))}
          </ol>
        </GlassCard>
      </section>
    </>
  );
}
