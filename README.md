# Fable Token Burner

A Might and Magic VI inspired first-person party RPG for phones, built with
Babylon.js as an installable web app. The name is ironic: the project is built
on Fable, so it burns tokens.

- Design: [`docs/DESIGN.md`](docs/DESIGN.md)
- Plan: [`docs/PLAN.md`](docs/PLAN.md)
- Reference screenshots: [`artwork/reference/`](artwork/reference/)

## Develop

```
npm ci
npm run dev        # http://localhost:5173, add ?dev for the stats overlay
npm run check      # lint, typecheck, unit tests, secrets guard
npm run e2e        # Playwright smoke test (builds and previews first)
npm run build      # production build in dist/
```

Node 22 or newer. The pre-commit hook (lefthook) scans staged files for
secrets, lints and checks formatting.

## Secrets

API keys are never committed, logged or shipped. Pipeline tools read them from
the environment only (`MESHY_API_KEY`, `FREESOUND_API_KEY`). See
`docs/DESIGN.md` section 6.

## Icons

Generate PWA and iOS icons from a square source image:

```
npm run icons -- path/to/app-icon.png
```
