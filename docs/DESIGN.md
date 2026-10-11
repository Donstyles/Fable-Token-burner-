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
| Engine | **Babylon.js** (confirmed 2026-10-11 after comparison with Three.js) |
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
| Controls | Invisible tank-style stick plus look area; full spec in 7.1. | 2026-10-11 |

### 7.1 Controls (touch, landscape)

- **Left half of the screen – invisible move stick.** Touch anywhere on the
  left, hold and drag forward to walk. Nothing is drawn on screen. The stick
  is tank-style: it drives forward motion, not strafing.
- **Right half of the screen – invisible look area.** Free look (yaw and
  pitch) works **only while stationary**.
- **Turning while walking.** While the left thumb is held and the party is
  walking, dragging the right thumb left or right turns the party. Vertical
  drag does nothing in this state.
- **Tap to interact.** A tap (no drag) on a door, NPC, item or sign
  interacts with it.
- **Tap a monster to attack** with the currently selected party member. After
  the attack the selection automatically advances to the next *ready* party
  member (one not in recovery), MM6-style.

To confirm: whether dragging the left thumb backward walks backward, and
whether there is any strafing at all (the tank-style reading says no).

## 8. First playable (vertical slice)

A full vertical: the first town, one dungeon and one quest, playable end to
end on the primary target device from the home screen.

## 9. Open questions

- Controls: backward walking and strafing (section 7.1).
- Animal / monster rigging and animation route outside Meshy's humanoid rig.
- Save system details (IndexedDB in the PWA).

## 10. Decision log

- 2026-10-11 – Platform, delivery (PWA), art direction, Meshy pipeline, key
  handling, real-time combat, party of four with full creation, enemies plan,
  HUD direction, design doc kept in repo.
- 2026-10-11 – Engine: Babylon.js. Controls: invisible tank-style move stick
  on the left, stationary-only free look on the right, turn-while-walking via
  right thumb, tap to interact, tap monster to attack with auto-advance to the
  next ready party member.
