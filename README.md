# pryces-web

Angular frontend for the **Pryces** portfolio tracker. Consumes the `pryces-api`
FastAPI HTTP API (`/portfolios`, `/portfolios/{name}`, …) and renders portfolios,
positions, and returns (XIRR / TWR).

Bootstrapped from [Sakai](https://github.com/primefaces/sakai-ng) by PrimeTek
(MIT-licensed Angular admin template, Angular 21 + PrimeNG). The upstream git
history has been removed — this is an independent repository.

## Relationship to the backend

This is one of two sibling repositories under the `pryces/` workspace container:

```
pryces/                 # workspace container (not a git repo)
├── pryces-api/         # backend  — Python, hexagonal, FastAPI   (git: antoiba86/pryces)
└── pryces-web/         # frontend — this repo, Angular + PrimeNG  (independent git)
```

## Develop

```bash
npm install
npm start            # ng serve → http://localhost:4200
```

The API runs separately:

```bash
cd ../pryces-api
uv run uvicorn pryces.presentation.api.main:app --port 8000
```

CORS in the API already allows `http://localhost:*`.

## License

App code derived from Sakai is MIT (© 2018–2026 PrimeTek); see `LICENSE.md`.
