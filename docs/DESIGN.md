# Fable Token Burner – Design Document

Living document. Every decision made in conversation lands here, with the date.
The name is ironic: the project is built on Fable, so it burns tokens.

## 1. Vision

A heavily **Might and Magic VI: The Mandate of Heaven** inspired first-person
party RPG for phones. Full 3D world, real-time combat, party of four, towns,
dungeons and quests. The MM6 look is imitated as closely as possible through
rendering, filters and low-frame-rate animation rather than 2D sprites.

Reference screenshots live in `artwork/reference/` (third-party, never shipped).

## 2. Platform

| Decision | Value |
| --- | --- |
| Primary target | iPhone 14 Pro Max, landscape, launched from the home screen |
| Secondary target | Android phones, landscape |
| Delivery | Installable web app (PWA). No app-store build for now. |
| Graphics API | WebGL2 (works on iOS Safari and Android Chrome today). WebGPU later if useful. |

## 3. Stack

| Decision | Value |
| --- | --- |
| Engine | **Pending** – Babylon.js recommended; comparison in conversation 2026-10-11 |
| Language | TypeScript |
| Bundler / dev server | Vite |
| HUD | HTML/CSS overlay on top of the canvas (touch-friendly, crisp text) |

## 4. Art direction

- Full 3D with real lighting and particle systems, chosen for technical ease.
- MM6 look through the render path: low internal resolution upscaled with
  nearest-neighbour sampling, nearest-neighbour texture filtering, posterize
  and dither post-processing, fog, animation sampled at a low frame rate.
- **No billboard enemies.** Everything is a mesh.
- UI adapted for touch and modern screens (19.5:9), but the MM6 influence and
  the marble decor are incorporated: marble pillar framing, gold-framed oval
  portraits with HP/SP bars, stone panels with gold borders for tooltips,
  the book-shelf buttons, blackletter headings.

## 5. Asset pipeline (Meshy)

All 3D models come from Meshy. No other 3D source.

1. Concept image generated inside Meshy (Meshy's image generator).
2. Image-to-3D from that image. Generator model: **Smart Topology, T2.5**
   (exact API parameter mapping to be confirmed against Meshy docs before the
   first batch).
3. Target polycount about **4000** for human characters.
4. Textured by Meshy.
5. Rigged by Meshy; most animations from Meshy's animation library.
6. Output committed to the repo as finished model files only.

Known gap: Meshy rigging targets humanoids. Animals and monsters need a plan
(2026-10-11: planning required, the first vertical slice may ship without them).

### 5.1 Credit discipline

Meshy generation costs credits. No Meshy API call is ever made without the
owner approving a specific batch first: asset list plus expected credit cost.

## 6. Security / OPSEC for the Meshy key

- The key never enters the repo, the chat, logs, build output or the shipped
  game bundle. The game never calls Meshy at runtime; Meshy is an offline
  asset pipeline.
- The key is supplied only through the cloud environment's secrets as the
  environment variable `MESHY_API_KEY`. Never pasted into chat.
- Repo guards: `.env*` git-ignored from day one, a gitleaks pre-commit hook,
  GitHub secret-scanning push protection enabled.
- Pipeline scripts log Meshy task IDs, never request headers or the key.

## 7. Gameplay decisions

| Topic | Decision | Date |
| --- | --- | --- |
| Combat | Real-time only. No turn-based mode. | 2026-10-11 |
| Party size | Exactly four. | 2026-10-11 |
| Party creation | Full character creation (no pre-made party). | 2026-10-11 |
| Enemies | Humanoids first; animals and monsters planned, may be absent from the first slice. | 2026-10-11 |
| Controls | **Open.** Candidates: floating virtual stick + drag-to-look (recommended) vs tap-to-move. | 2026-10-11 |

## 8. First playable (vertical slice)

A full vertical: the first town, one dungeon and one quest, playable end to
end on the primary target device from the home screen.

## 9. Open questions

- Engine confirmation (Babylon.js vs Three.js).
- Control scheme (section 7).
- Animal / monster rigging and animation route outside Meshy's humanoid rig.
- Save system details (IndexedDB in the PWA).

## 10. Decision log

- 2026-10-11 – Platform, delivery (PWA), art direction, Meshy pipeline, key
  handling, real-time combat, party of four with full creation, enemies plan,
  HUD direction, design doc kept in repo.
