# CaudalNet

**See all your investments in one place.** CaudalNet is a self-hosted dashboard that
pulls your trades from every broker into a single view and shows what they're really
worth — current value, profit, dividends, and proper money- and time-weighted returns.

> CaudalNet is the web app. It talks to a small companion API ([`pryces-api`](#backend))
> that does the number-crunching and fetches live prices.

## What you get

- 📊 **Net-worth overview** — one dashboard rolling up every portfolio: total value,
  total profit, and a single XIRR / TWR across everything.
- 🏦 **A portfolio per broker** — DEGIRO, Interactive Brokers, Renta 4 funds, or a plain
  JSON ledger. Import the broker's export file and it's parsed automatically.
- 📈 **Real returns, not guesses** — realized + unrealized P&L, dividends, **XIRR**
  (money-weighted) and **TWR** (time-weighted), per position and per portfolio.
- 🧾 **Per-stock history** — click any holding to see its full buy/sell timeline and its
  lifetime return.
- 💸 **Closed positions** — sold-out holdings stay visible with their realized gains.
- 🌍 **Multi-currency & funds** — stocks, ETFs and mutual funds, priced live (and
  historically) via Yahoo Finance; foreign holdings converted to your base currency.
- 💾 **Backup & restore** — download all your data (or one portfolio) as a single JSON
  file from the toolbar, and restore it later; re-importing merges and skips duplicates.
- 🌗 **Light / dark theme**, responsive layout.

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org) 20+ and the running API (see below).

```bash
npm install
npm start          # http://localhost:4200
```

That's it — open the app, create your first portfolio, then import a broker file.

### Backend

CaudalNet needs the `pryces-api` service running (it serves your portfolios and prices):

```bash
cd ../pryces-api
uv run python -m uvicorn pryces.presentation.api.main:app --port 8000
```

The app talks to `http://localhost:8000` by default (configurable in
`src/environments/`). The API already allows requests from `http://localhost:*`.

## Tech stack

Angular 21 · PrimeNG · Chart.js · TypeScript. Bootstrapped from the
[Sakai](https://github.com/primefaces/sakai-ng) admin template.

## License

[MIT](LICENSE.md) © 2026 Antonio Ibáñez. Built on the MIT-licensed Sakai template and
PrimeNG (© PrimeTek) — thanks to the PrimeTek team.
