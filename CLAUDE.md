# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CaudalNet is the **web frontend** for a self-hosted, multi-broker net-worth dashboard. It is a
read-mostly UI: nearly all logic (P&L, XIRR/TWR returns, price fetching, broker-file parsing)
lives in the companion backend `pryces-api`. This app's job is to fetch already-computed numbers
and render them. Don't reimplement financial calculations here.

## Commands

```bash
npm start            # ng serve → http://localhost:4200 (needs the API running, see below)
npm run build        # production build → dist/caudalnet-web
npm run watch        # dev build, rebuild on change
npm test             # Karma + Jasmine (Chrome)
npm run format       # Prettier over all source

ng test --include='**/some.spec.ts'   # run a single spec file
```

There is no separate lint script; ESLint config lives in `eslint.config.js` (run via `npx eslint`).

### Backend dependency

The app is useless without `pryces-api`. Run it from the sibling repo:

```bash
cd ../pryces-api
uv run python -m uvicorn pryces.presentation.api.main:app --port 8000
```

API base URL is set per-environment in `src/environments/`: `http://localhost:8000` in dev,
`/api` in prod (`environment.prod.ts` is swapped in by the production build config).

## Architecture

**Angular 21, fully standalone, zoneless, signal-based.** There are no NgModules. Key consequences:

- `provideZonelessChangeDetection()` is set in `src/app.config.ts`. Use **signals** (`signal()`,
  `computed()`) for reactive state — do not rely on Zone.js auto-detection for plain mutations.
- Every component is `standalone: true` and declares its own `imports`.
- Component classes use an **empty class suffix** (enforced by ESLint), e.g. `OverviewPage`,
  `Portfolios`, `PositionsTable` — not `OverviewComponent`.
- Selector prefixes: components `app-`, but note the ESLint rule expects `p` prefix in some
  template contexts — match existing files.
- Import alias `@/*` maps to `src/*` (see `tsconfig.json`).

### Layout vs. app code — two distinct trees

- `src/app/layout/` — the chrome (topbar, sidebar, menu, theme configurator). This is adapted
  from the PrimeNG **Sakai** admin template. `LayoutService` (`layout/service/layout.service.ts`)
  holds layout/theme state as signals (dark mode via `.app-dark` selector). Touch this only for
  navigation/theming changes; the nav menu is hardcoded in `app.menu.ts`.
- `src/app/pryces/` — the actual product. Everything domain-specific lives here:
  - `services/portfolio-api.service.ts` — the single HTTP client for the backend. All API calls
    go through this; add new endpoints here, not ad-hoc in components.
  - `models/portfolio.models.ts` — TypeScript interfaces mirroring the API's JSON shapes.
  - `pages/` — routed pages (`overview`, `portfolios`, `portfolio-detail`) plus shared
    presentational `components/` (stat-cards, positions-table, allocation-chart, etc.).
  - `util/format.ts` — money/percent/P&L formatting helpers.

### Routing

`src/app.routes.ts` is the root: `AppLayout` wraps all in-app routes. `/` lazy-loads the
overview page; `/portfolios` lazy-loads `pryces/pages/pryces.routes.ts` (list + `:name` detail).
SPA deep links are handled by `vercel.json` rewrites (deploys to Vercel).

### Critical data convention: money values are strings

The API returns all monetary/decimal fields (`value_base`, `unrealized_pnl_base`,
`total_return_pct`, `quantity`, `price`, …) as **strings**, to preserve decimal precision.
Never do arithmetic on them directly. Run them through `toNum()` from `util/format.ts`, and render
with `money()` / `percent()` / `pnlClass()`. Preserve this string typing in `portfolio.models.ts`
when adding fields.

## Styling

Tailwind CSS v4 (via `@tailwindcss/postcss`, configured in `.postcssrc.json`) plus PrimeNG
components themed with the **Aura** preset (`providePrimeNG` in `app.config.ts`). Charts use
Chart.js. Global styles in `src/assets/`.
