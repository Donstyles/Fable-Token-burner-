# Claude working notes

Read `docs/DESIGN.md` (decisions) and `docs/PLAN.md` (phases) before changing
anything. Both are the source of truth; update them when a decision changes.

## Rules

- No placeholder assets in shipped builds. Dev-only test scenes are named
  `dev-*`, excluded from production, and deleted when the real thing lands.
- Secrets live only in environment variables. Never print, commit or bundle
  them. `npm run secrets:guard` must stay clean.
- Meshy API calls happen only for an owner-approved batch file, through
  `npm run asset -- run <nnn>` (`--dry-run` first). The key is a network
  secret the cloud proxy injects; it is never in the container, so never ask
  for it, look for it or paste it anywhere.
- Never text-to-3D, no exceptions (owner, 2026-10-17; again 2026-10-19:
  "Never ever do text to 3d. No exceptions"). Every model, character or prop,
  starts as a low-poly text-to-image concept (`--ai-model nano-banana-2-lite`,
  the cheapest), then image-to-3D; the image is reviewed first. The tooling
  refuses text-to-3D: no batch step, no Meshy client call; keep it that way.
- Work on the designated branch; commit in logical steps.
- Before building any system, check whether Babylon.js or an established
  library already provides it, and prefer that (owner, 2026-10-15, after a
  hand-rolled sound chain cost hours). Sound is Babylon's audio engine.

## Commands

- `npm run check` – lint, typecheck, unit tests, secrets guard
- `npm run e2e` – Playwright smoke tests against a production build
- `npm run dev` – dev server; `?dev` shows the stats overlay
- `npm run level:build` – compile `levels/*` to `public/levels/` (run before
  `build`, `build:dev` or `dev`; CI and Pages do)
- `npm run textures` – fetch the CC0 role textures listed in
  `pipeline/textures.json`
- `npm run portrait -- <appearance> [<expression>...]` – cut the owner's
  portraits in `pipeline/inbox/portraits/<appearance>/` to the band's oval
  (head box in `pipeline/portraits.json`)
- `npm run asset -- <command>` – asset pipeline: `manifest`, `validate`,
  `card <kind> <id> "<subject>"`, `batch new <name> <id>:<height-m>[:civilian]|props|creatures|icons|show|approve|approve-images`, `inbox <id> <picture>` (keys the owner's fuchsia-ground concept picture into `pipeline/inbox/<id>.png`), `run <nnn> [--dry-run] [--force]` (runs only a batch the owner approved by number; props and creatures stop after their concept pictures until `approve-images`)

## Layout

See "Repository layout" in `docs/PLAN.md`.
