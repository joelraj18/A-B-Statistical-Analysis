# Experiment Lab — A/B Experimentation Engine v3

Plan, analyse and archive controlled experiments with exact frequentist inference.

- **Sample Planner** — users per variant for a target power, a power curve and a run-length estimate.
- **A/B Analyzer** — two-proportion Z-test (conversion) and Welch's t-test (revenue), structured hypotheses, SRM check, confidence-interval visualisations and a direction-aware plain-English verdict.
- **CUPED** — variance reduction from pre-experiment covariates (Deng et al., 2013).
- **Experiment Archive** — searchable ledger with win-rate stats and JSON export; optional Supabase sync.

```
                ┌──────────────────────────────────────────┐
                │ Next.js App Router (static export)       │
                │ Tailwind CSS · Framer Motion · Recharts  │
                │ Zustand workspace (localStorage)         │
                └───────────────┬──────────────────────────┘
          instant on-device     │      authoritative, when reachable
      ┌─────────────────────────┴───────────────────────────┐
      ▼                                                     ▼
┌───────────────────────────┐                 ┌───────────────────────────┐
│ lib/stats (TypeScript)    │   parity-tested │ backend/ FastAPI          │
│ Cody Φ · AS 241 Φ⁻¹ ·     │ ◀─────────────▶ │ SciPy · statsmodels       │
│ incomplete-beta t-dist    │   to ~1e-12     │ /api/v1/*                 │
└───────────────────────────┘                 └───────────────────────────┘
                                │
                                ▼ (optional)
                ┌──────────────────────────────────────────┐
                │ Supabase Postgres + RLS — archive sync   │
                └──────────────────────────────────────────┘
```

Every analysis is computed on-device first (instant, and it validates input), then re-requested from the SciPy service. If the service is offline the on-device result stays — the badge on each result says which engine produced it.

## Quick start

```bash
# Frontend
cp .env.example .env.local      # optional: API URL, Supabase keys
npm install
npm run dev                     # http://localhost:3000

# Statistics service
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --reload       # http://localhost:8000/docs
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | FastAPI base URL. Unset → fully on-device. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enables magic-link sign-in and cloud archive sync. |
| `NEXT_PUBLIC_BASE_PATH` | Sub-path for repository Pages hosting (set by `npm run predeploy`). |
| `ALLOWED_ORIGINS` (backend) | Comma-separated CORS origins. |

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Status and library versions |
| `POST` | `/api/v1/sample-size` | Users per variant (`baseline_rate`, `mde`, `power`, `alpha`) |
| `POST` | `/api/v1/analyze` | Two-proportion Z-test + Wilson CIs + SRM χ² (alias: `/analyze/binary`) |
| `POST` | `/api/v1/analyze/continuous` | Welch's t-test from summary statistics |
| `POST` | `/api/v1/analyze/cuped` | CUPED adjustment + Welch on raw and adjusted metric |

## Project layout

```
app/                    routes: / · planner · analyzer · history · guide
components/ui/          GlassCard, Button, SegmentedControl, Modal, Toaster, Field, StatTile…
components/charts/      DistributionCurve, ErrorBarChart, ConfidenceIntervalPlot, PowerCurve
components/analyzer/    form, KPI grid, verdict, narrative, CUPED panel
lib/stats/              distributions, abEngine, narrative, format, csv
lib/api/                fetch client, snake↔camel mappers, hybrid stats service
lib/db/ · lib/store/    Supabase repository · Zustand stores (workspace, theme, auth, toasts)
types/                  domain, wire (API) and database types
backend/                FastAPI service, engine, schemas, tests, Dockerfile
supabase/migrations/    experiments table with RLS
tests/                  Vitest: SciPy parity vectors + engine/narrative tests
```

## Testing

```bash
npm run lint && npm run typecheck && npm test && npm run build
cd backend && pytest
```

`tests/fixtures/scipy_vectors.json` holds reference values from SciPy; regenerate with `cd backend && python scripts/gen_vectors.py`.

## Deployment

- **Frontend → GitHub Pages:** `npm run deploy` builds a static export under `/A-B-Statistical-Analysis` and publishes `out/` (with `.nojekyll`) to the `gh-pages` branch. Any static host (Vercel, Netlify) works with a plain `npm run build`.
- **Backend → Render / Fly.io / Hugging Face Spaces:** build `backend/Dockerfile`; set `ALLOWED_ORIGINS` to the frontend origin.
- **Database → Supabase:** run `supabase/migrations/0001_experiments.sql` in the SQL editor and enable email (magic link) auth.

## Upgrading from v2

On first load, v3 re-analyses experiments saved by the v2 prototype (`abtest_history_*` keys) with the corrected engine, imports them into the archive, and deletes the v2 `abtest_users` key, which held plaintext passwords.

## References

- Kohavi, Longbotham, Sommerfield & Henne (2009). *Controlled experiments on the web: survey and practical guide.* DMKD 18(1).
- Kohavi, Tang & Xu (2020). *Trustworthy Online Controlled Experiments.* Cambridge University Press.
- Deng, Xu, Kohavi & Walker (2013). *Improving the sensitivity of online controlled experiments by utilizing pre-experiment data.* WSDM.
- Johari, Koomen, Pekelis & Walsh (2017). *Peeking at A/B tests.* KDD.
- Fabijan et al. (2019). *Diagnosing sample ratio mismatch in online controlled experiments.* KDD.
