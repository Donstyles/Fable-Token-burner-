# Claude working notes

Read `docs/DESIGN.md` (decisions) and `docs/PLAN.md` (phases) before changing
anything. Both are the source of truth; update them when a decision changes.

## Rules

- No placeholder assets in shipped builds. Dev-only test scenes are named
  `dev-*`, excluded from production, and deleted when the real thing lands.
- Secrets live only in environment variables. Never print, commit or bundle
  them. `npm run secrets:guard` must stay clean.
- Meshy API calls happen only for an owner-approved batch file.
- Work on the designated branch; commit in logical steps.

## Commands

- `npm run check` – lint, typecheck, unit tests, secrets guard
- `npm run e2e` – Playwright smoke tests against a production build
- `npm run dev` – dev server; `?dev` shows the stats overlay

## Layout

See "Repository layout" in `docs/PLAN.md`.
