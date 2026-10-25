# Implementation Plan (for approval)

Companion to `DESIGN.md`. This is the step-by-step plan for everything
between now and the first playable. **Approved by the owner on 2026-10-14.**
Work starts on the owner's START, and each phase is still approved
separately at its kickoff.

## The senate's roadmap (2026-10-19)

The owner scrapped the valley and convened the agentic senate to plan a full,
playable MM6 game. Its plan is `docs/ROADMAP.md`: Act One as release 1.0,
milestones M0 to M5, each accepted by a play script on the owner's phone.
It replaces Phase 5b and the order of Phases 6 and 7 once the owner answers
its fourteen decisions (section 2). **Answered 2026-10-19** (our own world,
not called Enroth; hand-designed 640 m maps; the rest as recommended): the
roadmap is the plan from here, starting with the starting region in place of
the valley. **2026-10-19:** Gullhaven is in (DESIGN 17): the region builder for
hand-written 640 m maps, the harbour town, the goblin hills' cave into the
dungeon, the headland's dead; the valley and the desert are gone.

## How approval works

1. Before a phase starts, Claude posts a kickoff note: the exact steps from
   this plan, anything that changed, and what the owner must provide.
2. The phase ends with a demo: screenshots or a short capture from headless
   Chromium, plus a URL to try on the iPhone. The owner signs off or sends
   changes.
3. `DESIGN.md` and this plan are updated whenever a decision changes.
4. Meshy batches are a separate approval each time (DESIGN.md 10.9), inside
   whichever phase needs them.

Size key: S = hours, M = a day or two of work, L = several days, XL = a
week-plus. These are effort sizes, not calendar promises.

## Progress

| Phase | Status                                                                      |
| ----- | --------------------------------------------------------------------------- |
| 0     | Accepted 2026-10-14                                                         |
| 1     | Accepted 2026-10-14 (stair feel to be settled by ramp colliders in Phase 2) |
| 2     | Accepted 2026-10-15 on device (walking good, mood fine for now)             |
| 3     | Built 2026-10-15, awaiting on-device frame rate and look sign-off           |
| 4–7   | Not started                                                                 |

## Phase overview

| #   | Phase                    | Goal                                                                       | Size | Needs from owner                                                               |
| --- | ------------------------ | -------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------ |
| 0   | Foundation               | Repo, toolchain, safety rails, PWA shell on the phone                      | M    | App icon image, enable GitHub Pages and push protection                        |
| 1   | Look and feel            | MM6 render filter, touch controls, character controller, tuned on device   | M    | On-device feel test, look sign-off                                             |
| 2   | Geometry kernel          | Parametric architecture + caves, compile step, viewer, showcase level      | XL   | Sign-off on showcase, authoring API review                                     |
| 3   | Water, light, atmosphere | Real water, waterfalls, torch light, particles, fog                        | L    | On-device perf and look sign-off                                               |
| 4   | Asset pipelines          | Tooling for textures, Meshy, dolls, icons, audio, fonts; first real assets | L    | `MESHY_API_KEY` in environment, Freesound key, ChatGPT images, batch approvals |
| 5   | Game systems             | Party, stats, combat, inventory, spells, dialog, shops, quests, save, HUD  | XL   | Rules decisions where MM6 is ambiguous, UI sign-offs                           |
| 6   | Slice content            | Town, dungeon, quest, NPCs, monsters, music                                | XL   | Content approvals, asset batches, music tracks                                 |
| 7   | Polish and release       | Performance, offline, iOS and Android quirks, full playthrough             | L    | Device testing, final sign-off                                                 |

Phases 2 and 4 can interleave: pipeline tooling needs nothing from the
kernel, and the kernel showcase is the first consumer of real textures.

## Repository layout (created in Phase 0)

```
docs/            DESIGN.md, PLAN.md, ROADMAP.md (the senate's plan), MM6-GAPS.md (what MM6 has that we lack), prompt-cards/
src/
  app/           bootstrap, PWA glue, orientation, input zones
  render/        filter pipeline, animation stepping, material presets
  world/         level loading, water, lighting, props, triggers
  game/          rules: party, stats, combat, items, spells, quests, dialog
  ui/            HTML/CSS HUD and screens
  data/          tables: classes, skills, spells, items, monsters, NPCs
kernel/          geometry kernel (pure TypeScript, runs in Node and browser)
levels/          level scripts: gullhaven (region.ts, the starting region)
tools/           pipeline CLIs, manifest, validation
assets/          committed generated assets (textures/ with manifest.json)
pipeline/        inbox/ (owner images), batches/, style.md
public/          PWA manifest, icons, splash; levels/ is generated (git-ignored)
```

MM6's own material (the reference pages, screenshots and spell icons the critics
measure against, and the critics' reports and scripts) lives in the private
repository `Donstyles/fable-mm6-reference`, never here: this repository is public
for GitHub Pages. A critic round clones it beside the game and points at its
`screenshots/`.

---

## Phase 0 – Foundation

**Goal:** a repo that builds, tests, deploys and installs on the iPhone as a
landscape PWA, with the key-safety rails in place before any pipeline code
exists.

**Steps**

1. Scaffold: Vite, TypeScript (strict), Babylon.js (`@babylonjs/core`,
   `@babylonjs/loaders`, `@babylonjs/materials`, `@babylonjs/havok`),
   `vite-plugin-pwa`, ESLint, Prettier, Vitest, Playwright (uses the
   pre-installed Chromium for smoke tests and screenshots).
2. Safety rails:
   - `.gitignore` covering `.env*`, local caches, build output.
   - gitleaks as a pre-commit hook (lefthook) and as a CI job.
   - A CI test that fails if anything shaped like a Meshy or Freesound key
     appears anywhere in the tree or build output.
   - Owner enables GitHub secret-scanning push protection on the repo.
3. CI (GitHub Actions): lint, typecheck, unit tests, build, gitleaks, on
   every push.
4. Hosting: GitHub Pages deployed by Actions from the working branch (HTTPS
   is required for a service worker). Owner enables Pages with source
   "GitHub Actions". Note: the working branch is currently the repository's
   default branch.
5. Cloud session hook so every Claude session installs dependencies and can
   run tests and lint.
6. PWA shell: web manifest (standalone, landscape), iOS meta tags, real app
   icon and splash from an owner-supplied image (prompt card provided in the
   kickoff), portrait-mode overlay asking to rotate, safe-area handling,
   audio unlock on first touch.
7. Boot scene: Babylon engine on a full-screen canvas with hardware scaling,
   resize handling, dev-only FPS and stats overlay.

**Deliverables:** green CI, a Pages URL, installable PWA showing an empty
scene.

**Acceptance:** owner adds it to the home screen, it launches full-screen in
landscape, no browser chrome, no scroll bounce.

**Risks:** iOS standalone mode quirks (handled by the overlay and meta tags).

---

## Phase 1 – Look and feel

**Goal:** the MM6 render look and the control scheme, tuned by hand on the
device, before any real content exists.

**Steps**

1. Render filter pipeline (`src/render`):
   - World rendered at a fixed line count, **1080 lines by default**
     (2340×1080 on the iPhone 14 Pro Max), with a **720-line** performance
     preset; width follows the display aspect. Upscaled to the display with
     nearest-neighbour. At these densities the scale factor need not be an
     integer; any unevenness is below what the eye resolves at 460 ppi. The
     retro look comes from posterize, dither, texture filtering and low-fps
     animation, so the dither cell size is a separate setting (1 or 2 px) to
     keep the pattern visible at 1080. Exposed as a player setting and on
     the dev panel. **UI and text are HTML at native resolution.**
   - Post-process chain: posterize (configurable levels per channel),
     4×4 ordered dither, optional palette LUT (a starting palette is
     extracted from the reference screenshots; a palette is not copyrightable),
     distance fog.
   - Material defaults: nearest-neighbour sampling, no anisotropy, limited
     mipmaps, per-vertex lighting shader variant.
   - Animation stepping helper: quantise animation time to 8, 10 or 12 fps.
   - Dev panel with sliders for all of the above, so tuning happens on
     device.
2. Input zones (`src/app/input`): exact implementation of DESIGN.md 7.1 with
   multi-touch. Desktop keyboard and mouse fallback for development only.
3. Character controller: Havok capsule, forward and one-third backward
   speeds, turn rate while walking, stationary detection switching look
   mode, stair climbing, gravity, fall-damage hook.
4. Dev test arena: a room with stairs, a ledge and a ramp built from Babylon
   primitives. **Development-only**, never shipped, deleted once the Phase 2
   showcase level exists. This is the one exception to "no placeholders" and
   it never leaves the dev build. The dev build is a separate Vite build
   (`npm run build:dev`) deployed under `/dev/` on Pages, so the production
   URL never contains it; the owner tests at `…/dev/`. The production service
   worker's scope contains `/dev/`, so it is configured never to answer a
   `/dev/` navigation with its own cached page (learned the hard way on
   2026-10-14: Safari showed the cached production page at the dev URL).
5. Capture pipeline: Playwright screenshots at device resolution for every
   review, so look changes are compared side by side.

**Deliverables:** walkable test arena on the phone with the filter and
controls.

**Acceptance:** owner approves the control feel (speeds, turn rate, look
sensitivity) and the filter strength from on-device play.

---

## Phase 2 – Geometry kernel

**Goal:** DESIGN.md section 11 made real: generated architecture with
curves, booleans and caves, compiled to GLB with colliders, navmesh and
baked light, viewable in a browser and on the phone.

**Steps**

1. Core (`kernel/core`): mesh buffers, transforms, 2D profiles with arcs,
   extrude, sweep along path, loft, revolve, radial and linear arrays,
   mirror, bevel, world-unit UV generation, normals, material slots. Unit
   tests on every operation (vertex counts, volumes, watertightness).
2. Booleans (`kernel/csg`): Manifold WASM in Node; conversion both ways;
   union, subtract, intersect; tests with known volumes.
3. SDF caves (`kernel/sdf`): primitives (capsule along path, sphere,
   ellipsoid), smooth union, noise displacement, marching cubes at
   0.25–0.5 m, Laplacian smoothing, triplanar material tag.
4. Element library (`kernel/elements`), each parametric with material roles:
   wall with plinth and cornice, floor and ceiling slabs, doorway, round and
   pointed arch, barrel and ribbed vault, column, buttress, balustrade,
   straight and switchback stair, spiral stair, balcony on corbels, bridge
   and walkway, shaft, basin and canal.
5. Spaces and connectors (`kernel/plan`): hall, gallery, corridor,
   undercroft, shaft, cistern, cavern; stair, ramp, bridge, balcony opening,
   doorway, tunnel, ledge drop, channel. Placement in metres with rotation.
6. Level script format and the compile CLI (`npm run level:build`): script →
   merged meshes per material and region → GLB via gltf-transform → sidecar
   JSON (spawns, triggers, lights, automap slices).
7. Colliders and navmesh: static mesh colliders; Recast navmesh baked in Node
   (`recast-navigation-js`); reachability validation from entrance to every
   marked point, failing the build on a miss.
8. Baked per-vertex lighting with occlusion rays against a BVH.
9. Fly-through viewer: a dev page that loads a level script, rebuilds on
   save, free camera, filter toggle, wireframe and navmesh overlays.
10. **Showcase level**: a vaulted hall with a gallery around it, a shaft with
    a spiral stair, a bridge over a chasm into a cavern, a flooded undercroft
    reached by a switchback stair. Water is a flat surface until Phase 3.

**Authoring preview** (what a level script will look like):

```ts
const hall = plan.hall({ size: [18, 12], height: 9, vault: 'ribbed', material: 'ashlar' });
const gallery = plan.gallery({ around: hall, level: 4.5, width: 2.5, balustrade: 'stone' });
const shaft = plan.shaft({ at: hall.edge('north', 6), radius: 3, from: -12, to: 4.5 });
plan.spiralStair({ in: shaft, from: -12, to: 4.5, turns: 2.5, rail: 'iron' });
const cavern = plan.cavern({ at: [40, -12, 0], seed: 7, roughness: 0.6 });
plan.bridge({ from: hall.edge('east'), to: cavern.edge('west'), width: 2.5, rail: 'stone' });
water.river({
  through: cavern,
  path: [
    [30, -14, -20],
    [50, -15, 25],
  ],
  width: 4,
  flow: 1.2,
});
water.fall({ from: cavern.ledge('north', 8), into: 'river' });
```

**Status 2026-10-14:** steps 1–8 and 10 built (see DESIGN.md decision log).
Step 9 is the dev build itself: it loads `levels/showcase` with a fly-camera
toggle, wireframe and navmesh overlays and a baked-light slider in the tune
panel; rebuild on save is `npm run level:build` plus a reload. Left for
later phases: automap floor-plan slices (Phase 5 needs them), ribbed and
groin vaults, buttresses, basins and canals (Phase 3 water), rubble and
stalactite props (Phase 6 content). Real textures (Phase 4 interleave) are
in: `npm run textures` fetches CC0 Poly Haven sets listed in
`pipeline/textures.json`.

**Deliverables:** kernel with tests, compile CLI, viewer, showcase level on
the phone.

**Acceptance:** owner walks the showcase on device; architecture reads as
real (arches, vaults, stairs, rails), caves read as rock, performance within
DESIGN.md 11.9. Owner reviews the authoring API.

**Risks:** Manifold robustness on degenerate input (mitigated by validation
and tests); kernel scope creep (mitigated by the fixed element list above).

---

## Phase 3 – Water, light, atmosphere

**Goal:** real water and waterfalls, the lighting model, particles and fog,
all within budget on the phone. (2026-10-14: the look target changed to the
reference images in `artwork/reference/look/`; bloom, grading, sky dome,
point lights and emissives were pulled forward into Phase 1 so they can be
tuned in the arena. Phase 3 adds wet-surface specular, fog banks and cloud
texture on top.)

**Steps**

1. Water: Babylon `WaterMaterial` tuned under the filter; planar pools and
   lakes; swept river and canal surfaces with flow; one reflection and
   refraction pass per level.
2. Waterfalls: swept ribbon with scrolling foam and vertex ripple, spray and
   mist particle systems, plunge-pool disturbance, looping sound with
   distance attenuation.
3. Wading rules: shallow slows, deep damages without Water Walk; underwater
   tint.
4. Torch light around the party, brazier point lights, emissive magic,
   particle fire, smoke.
5. Fog presets per space type; darkness beyond torch range.
6. Showcase level gains its river, waterfall and flooded undercroft.

**Accepted 2026-10-15 with notes** (owner: "Go next. I want to play a game").
Steps 1–6 built (see DESIGN.md 11.3 and 11.6 status notes); water motion,
the mirror plane, the ripples and the sound were fixed the same day after
the owner's on-device reports (DESIGN.md decision log). Sound runs on
Babylon's audio engine. Not yet: the disturbed-water patch under the waterfall, swept river
surfaces with their own flow (rivers share the one flow direction of their
material), and deep-water damage, which waits for hit points in Phase 5.

**Deliverables:** showcase level with live water and lighting.

**Acceptance:** on-device frame rate holds with water on screen; owner
approves the look.

**Risks:** reflection and refraction cost on mobile (fallback: half-resolution
water passes, or refraction only).

---

## Phase 4 – Asset pipelines

**Goal:** every pipeline in DESIGN.md section 10 as working tooling, proven
with first real assets.

**Steps**

1. Framework (`tools/`): CLI entry points, manifest read and write, batch
   files with credit estimates, `validate` command, prompt-card generator,
   `pipeline/style.md` style bible.
2. Textures: Poly Haven and ambientCG fetchers; processor (seam repair,
   power-of-two resize, optional palette quantisation, atlas packing);
   ChatGPT texture prompt cards. First texture batch for the showcase
   materials (ashlar, flagstone, plank, iron, rock, plaster). No credits.
3. Meshy client: the official `@meshy-ai/cli` through the cloud proxy, which
   injects the key from a network secret (the key never enters the
   container); `--dry-run` prints the commands; outputs are downloaded at
   once; operation ids and task records in the batch file make every step
   resumable. Chain: image-to-3D (Smart Topology, `meshy-t2.5`, 4000 polys,
   A-pose) → rigging → animation (standard 10-clip set) → gltf-transform
   post-process → manifest. First batch: one humanoid enemy (the bandit), approved separately.
4. Characters: doll template with anchors; character-sheet prompt card;
   portrait cropper and posterizer; diff-extraction overlay tool with
   alignment check; icon processor. First pass: two base dolls, two
   portraits, three items with overlays, to prove the chain.
5. Audio: Freesound fetcher with CC0 filter (`FREESOUND_API_KEY` from the
   environment), trim, normalise, encode to AAC; owner-track importer.
6. Fonts: Google Fonts OFL download and subset.

**Status 2026-10-15:** started. Step 1 built: `npm run asset` CLI with
`manifest`, `validate` (texture sizes and attribution, asset files, licences,
GLB polycounts), `card` (prompt cards from the style bible into
`pipeline/cards/`) and `batch new|show|approve` (humanoid batches with the
three Meshy steps and credit estimates; image-to-3D and rigging prices are
assumptions until the first batch confirms them). Step 2's Poly Haven fetcher
already exists from Phase 2. Step 3 built (2026-10-15): `run <nnn>
[--dry-run] [--force]` on the official CLI through the proxy, dry run
verified against the live balance (4,790 credits); concept-image prompts
became photographic after the owner rejected the painted innkeeper. The innkeeper needs no rig (service NPCs are portraits); her photograph is in `pipeline/inbox/` for step 4. Batch 001 (the bandit, combat set) ran 2026-10-15: 50 credits, 3,641 triangles, ten clips; the credit cost per humanoid is now known (15 + 5 + 3 per clip) and used for estimates. The bandit walks in the dev viewer (Babylon's glTF loader, retro material with bone skinning, clips by name through the stepper; e2e covers it). On the phone the bandit showed gaps between Meshy's parts and a bow-legged walk; owner's call: no patching, regenerate from a clean stylised concept render with fitted clothing (new reference prefix). Batch 002 (2026-10-16) from the clean render: no gaps at belt or collar, straight legs, 50 credits; the regenerated bandit is live in the viewer. Next: step 4 (dolls, portraits, icons) with the innkeeper's photograph as the first portrait, and the sword prop with the hand attachment.

**Deliverables:** `npm run asset:*` commands, first real textures in the
showcase, one rigged and animated enemy walking in the viewer, two dolls with
overlays rendering in a test screen.

**Acceptance:** owner reviews the first outputs of each pipeline; credit
cost per humanoid is now known and recorded.

**Needs from owner:** the Meshy network secret (added 2026-10-15) and
`FREESOUND_API_KEY` in the cloud environment; ChatGPT images for each prompt
card; batch approvals.

**Risks:** Meshy output variance (regeneration budget set per batch); ChatGPT
moving the figure between base and dressed doll (alignment check rejects and
retries).

---

## Phase 5 – Game systems

**Goal:** the rules and screens of an MM6-style RPG, data-driven, with no
content yet beyond test data.

**Steps**

1. Data model (`src/data`, `src/game`): the seven MM6 stats, classes
   (Knight, Paladin, Archer, Cleric, Sorcerer, Druid), skills with Normal,
   Expert and Master ranks, spell schools, items with slots and grid sizes,
   monster and NPC records, conditions (Good, Unconscious, Dead at minimum).
   MM6 formulas are followed where known from community documentation and
   recorded in DESIGN.md where we deviate.
2. Character creation: four characters, portrait and sex choice, class,
   stat point allocation, starting skills, name entry.
3. Party and movement integration: party position, resting (the MM6 rest
   screen), time of day, food.
4. Real-time combat: recovery times, selected member auto-advance, melee and
   ranged attacks, hit and damage resolution, monster AI on the navmesh
   (idle, chase, attack, flee), damage, death, loot drops.
5. Inventory: per-character grid, drag and drop, equip rules, paper-doll
   screen composited from base doll and overlays.
6. Spellbook and casting: schools, SP cost, rank effects, the slice spell
   list (including Torch Light, Water Walk, Jump, Heal, Fire Bolt).
7. Dialogue and services: NPC talk, tavern (rent, food, drink), temple
   (heal), guild (buy spells), trainer (level up), shops (buy, sell,
   identify, repair) using the wooden dialogue panel from the references.
8. Quest log and automap.
9. Save and load: IndexedDB, multiple slots, autosave on scene change.
10. HUD (`src/ui`): the marble frame adapted to 19.5:9: viewport, right
    panel with minimap and book shelf, bottom portrait row with HP/SP bars,
    status strip. Built from pipeline textures and SVG ornaments.

**Deliverables:** every screen working against test data in the showcase
level.

**Acceptance:** owner plays through creation, a fight, resting, shopping and
saving, and approves each screen's layout on device.

**Status 2026-10-16:** started with step 4 ahead of the rest (owner: "I want
to play a game"). Rules in `src/game/` (stats, to-hit, damage, recovery,
party selection) with unit tests; runtime navmesh on recast-navigation;
monster state machine; the bandit chases, swings and falls to taps in the
dev build with a party strip; e2e covers it. The terrain system (DESIGN 15)
is interleaved for the outdoor slice.

**Status 2026-10-16, night:** the rules of steps 1 to 3 and 5 to 9 exist as
`src/game/` (DESIGN 14.5, 192 tests in all) without screens; hit feedback
(DESIGN 14.4) is in. Screens for steps 2, 3, 5, 6, 7 and 8 exist in
`src/ui/` and open from a book shelf in the dev build (247 tests in all).
Left: dialogue with NPCs (step 7's talk), save slots in IndexedDB (step 9),
the HUD frame (step 10), the paper doll, drag and drop, promotions.

**Status 2026-10-24:** step 10's frame is MM6's (DESIGN 16.34): the right
panel the screen's height with the minimap, the two windows, the clock, the
four books (quests, notes, map, calendar), the purse and the four ovals (cast,
rest, quick reference, options); every screen in the view's box in MM6's
arrangement, houses and talk on a board over the panel. Talk (step 7) is in.
Left: save slots, the paper doll, interior and school pictures, drag and drop,
promotions, party spells kept to show in the windows.

**Risks:** touch layout of dense screens (inventory grid, spellbook); solved
by designing at device resolution from the start, with the phone's safe areas:
every screen and service is checked at 932 by 430 with the insets forced
(`tests/e2e/screens-fit.spec.ts`, DESIGN 16.33).

---

## Phase 5b – Outdoor world (added 2026-10-16)

**Goal:** the sprawling world the owner asked for: generated regions at
near-real scale with forests, rivers, roads, passes, peaks, towns, caves,
waterfalls and deserts, walkable end to end.

**Steps**

1. Terrain kernel: valley generator, splat, forests, river, road, LOD chunks,
   quantized export, runtime terrain material and instancing. **Done
   2026-10-16** (DESIGN 15.1).
2. Village of generated houses on the valley floor, solid, with a well.
   **Done 2026-10-16** (DESIGN 15.2): seven timber-framed houses round the
   well, the road starts at the well, the party wakes in the square.
3. Cave mouth at the ravine head and a scene transition into the dungeon;
   the dungeon's exit back to the valley. **Done 2026-10-16** (DESIGN 15.3):
   portals with arrival points, a fade and reload between levels, e2e both
   ways.
4. Cascades in the ravine stream (Phase 3 waterfalls on terrain). **Done
   2026-10-16** (DESIGN 15.4): a terraced brook, eight falls, a plunge pool.
5. Desert region beyond the pass with its own textures and a transition.
   **Done 2026-10-16** (DESIGN 15.5): dunes, mesas, an oasis, the road from
   the pass, portals both ways.
6. Far-mountain backdrop; day sky tuning; performance pass on device.
   **Backdrop done 2026-10-16** (DESIGN 15.6); the device pass waits for
   the owner's phone.
7. Weather and motion: wind in the canopies, drifting cloud shadows, the
   desert's heat shimmer, mirage, glint, low sun and blowing sand; the
   sun's disc in the sky. **Done 2026-10-17** (DESIGN 15.7).
8. Meshy trees and bushes (batch 003) as the forest's prototypes in place
   of the generated ones, with far detail. **Done 2026-10-17** (DESIGN
   15.1, 10.3).
9. The village rebuilt: Meshy buildings and props (batch 004) along the
   street with a square, lanes, the temple's knoll and the farm. **Done
   2026-10-17** (DESIGN 15.2).
10. Shell polish from the wow audit: loading veil, fonts, the marble HUD
    band with sigils, HP/SP bars and condition gems, the spine shelf, the
    status line, melee reach, the sun's size, debug toasts gone. **Done
    2026-10-17** (DESIGN 16).
11. Creatures image first (batch 005): goblin scout, skeleton warrior,
    nomad raider, two villagers, placed in the regions; villagers answer
    a tap. **Done 2026-10-17** (DESIGN 16.1, 16.2).
12. Wow audit (2026-10-17): loading veil, day and night with a moving sun,
    stars and dusk lanterns, the screens in marble, leather and parchment,
    autosave through portals, the synthesised soundscape, doors opening the
    shops. **Done 2026-10-17** (DESIGN 16.3 to 16.6).
13. Talk and the first quests: the wooden talk panel with the villager's
    living face, topics, rumours, Henrik's Sheep and the goblins at the
    forest edge, experience for kills. **Done 2026-10-17** (DESIGN 16.7).
14. The UI craft pass the owner asked for: press travel and click, the
    leather inventory with drawn glyphs, the type. **Done 2026-10-17**
    (DESIGN 16.8). Spells with visible effects: bolts, torch light, stun,
    cures. **Done 2026-10-17** (DESIGN 16.9).
15. Hand-painted 1998 UI (owner, 2026-10-17): "the text and fonts in MM6 are
    pixelated with heavy aliasing"; "the marble in MM6 is defined and hand
    painted, yours is generative noise"; "every button and element needs to
    be artisanal like someone from 1998 drew it by hand". Every surface
    painted as pixel art on a 1998 pixel grid (marble with deliberate veins,
    wood with drawn grain, leather, gold rails, buttons with painted
    highlights, brass plates) and bitmap text with hard edges; checked
    against the MM6 crops. **First pass 2026-10-17** (DESIGN 16.10): the
    surfaces, the buttons and the type; the HUD's frames, gems, bars,
    spines, plates, pillars and rails still to paint.
16. The first phone pass (owner, 2026-10-17, "abysmal", "unplayable fps in
    the village"): the rolled horizon, the dither static, the black shade,
    the banded sky, the empty talk window, the cut skill names and the frame
    cost found and set. **Done 2026-10-17** (DESIGN 16.11); the owner's next
    phone shot, with the overlay's numbers, says whether the frame is there.
17. The critic loop (owner, 2026-10-17): screenshots of every screen judged
    against the MM6 reference shots by independent critics until they rate
    the hand-painted feel at the original's level. **Round 1 done
    2026-10-17** (DESIGN 16.12): scored 2.5 to 3 of 10; the gold ramp, the
    marble, the slots, the cells, the tubes, the shelf, the slabs, the
    bevels, the talk panel and the sky repainted. **Round 2 done 2026-10-17**: still 3 of
    10; stone edges in place of gold, soft marble, stone ovals, navy tube
    wells, dark oak and a key light on the talk panel, open books, the
    panel above the band. **Round 3 done 2026-10-17**: 3.5, 3,
    3; three-pass marble and slate, chipped stone ovals, volute capitals,
    an architrave frame, books with page edges and a watermark, a painted
    face, level cirrus, painted world textures (DESIGN 16.13). **Round 4 done 2026-10-17**: 3, 3, 3; the loop
    is paused for the owner's decision (DESIGN 16.12): what remains is
    hand-made art (portraits, item sprites, a paper doll, embossed
    emblems, a cut bitmap face, tree billboards, baked building faces)
    and fixed non-scrolling layouts. **Round 5, world, done 2026-10-17**
    under the owner's free rein (DESIGN 16.14): tree sprites, bitmap
    skins, a painted sky strip, stepped and flat light, hard pixel grain;
    the clamped tiles and the empty sprites fixed. **Round 5, shell, done
    2026-10-17** (DESIGN 16.15): one sunk band with pilasters, tubes in a
    trough, the clock on a tablet, acanthus capitals, outlined emblems,
    members by portrait, a glyph for Close, books with boards, mahogany
    talk panel. **Round 5 scored 2026-10-17**: 3, 3, 4 (talk) and 3
    (world), no; the critics measured MM6 pixel by pixel and the asks
    reversed round 4's. **Round 6 done 2026-10-17** (DESIGN 16.16): the
    measurements followed. **Round 6 scored 2026-10-17**: 4, 4, 5
    (talk), 3 (world), no. **Round 7 done 2026-10-17** (DESIGN 16.17):
    the palette filter by default, figured marble, measured tones
    throughout, carved boxes, white type. **Round 7 scored 2026-10-17**:
    3, 4, 5 (talk), 4 (world), no; all three critics measured MM6's
    surfaces as soft many-level clouds. **Round 8 done 2026-10-17**
    (DESIGN 16.18): the shell's surfaces as value-noise clouds, measured
    HUD tones, nearest upscale, no fog. **Round 8 scored 2026-10-17**:
    4, 3, 4 (talk), 3 (world), no; the averages match MM6, the pixels do
    not: MM6's surfaces are palettised paintings with hard per-pixel
    detail. **Round 9 done 2026-10-17** (DESIGN 16.19): five-bit
    quantise, speckle, wandering veins, fissures, crazed rose marble,
    capped tubes, line-art emblems, one-spread book. **Round 9 scored
    2026-10-17**: 4, 4, 5 (talk), 4 (world), no; the view had been
    rendering at three times MM6's pixel density all along, and the
    valley's sidecar had been overriding the sky. **Round 10 done
    2026-10-17** (DESIGN 16.20): the `css` pitch, the sidecar sky, the
    critics' measured recipes for marble, cells, wells, pillars,
    emblems, stone, page, crazing and gold. **Round 10 scored
    2026-10-17**: 5, 5, 5 (talk), 5 (world), no; values and layout are
    MM6's, the brushwork is not. **Round 11 done 2026-10-17** (DESIGN
    16.21): no light dither, blended clouds, continuous veins, cosine
    pillars, a one-pixel pen, fractured-plate stone, hue-zoned crazing.
    **Round 11 scored 2026-10-17**: 6, 5, 6 (talk), 6 (world), no.
    **Round 12** (DESIGN 16.22): MM6's spellbook spread with bookmarks,
    spell icons dialled in under the owner's 100-credit grant (pass 1
    27 credits, pass 2 33), the shell on one pixel grid, finer ground,
    streaked clouds, a centred portrait. **Round 12 scored 2026-10-18**:
    6, 6, 7 (talk), 6 (world), no; icons pass 2 a median 5. **Round 13**
    (DESIGN 16.23): the page's shadow under the spells, MM6's pennants,
    whole-pixel lengths, the critics' recipes across the shell and the
    world; icon pass 3a (15 credits). **Round 13 scored 2026-10-18**:
    6.5, 6.5, 7.5 (talk), 6 (world), no; icons pass 3a a median 6.
    **Round 14** (DESIGN 16.24): monoline bitmap type on the line box,
    every screen fitted to its frame, MM6's capital, slab, rings, gold
    and clock, the book's foot, softer rose marble, the critics' ground,
    grass, splat edges, sky, room and face; icon pass 3b (15 credits, 10
    of the grant left). **Round 14 scored 2026-10-18**: 7, 7.5, 8 (talk),
    6.5 (world), no; icons pass 4 a median 6. **Round 15** (DESIGN 16.25):
    coherent stone, the clock, tubes and plinth, stops kept, the sky's
    cover, wall detail, sealed seams, townsfolk's skins; icon passes 5 and
    6 (9 credits; 99 of 100 spent, the recipe recorded). **Round 15
    scored 2026-10-18**: 7.5, 7.8, 8.5 (talk), 6.5 (world), no; icons
    final a median 6. **Round 16** (DESIGN 16.26): the capital's crown,
    polished brass, MM6's gem and sans quest log, the talk window on the
    shared grid in MM6's frame, a side key, ranked tree crowns, larger
    bare banks, an even sky, the icons' grain. **Round 16 scored
    2026-10-18**: HUD 7.8, screens 8.3, no. **Round 17** (DESIGN 16.27): an
    open crown, banded brass, a second pillar collar, the rose's contrast,
    MM6's binding, the quest log at MM6's size, every word on the grid.
    **Round 16's talk and world scored 2026-10-18**: 8.5, 7.0. **Round 17
    scored**: HUD 8.1. **Round 18** (DESIGN 16.28): MM6's brass ramp, the
    talk bust in its own light, the wall tile on each face's plane, crowns
    ranked by light, height and side. **Scored 2026-10-18, the night's
    last**: HUD 8.2 (round 18), screens 8.5, talk 9.0, world 7.5 (round
    17), no; the bust's light then kept inside its own pass. **After the
    night, with the owner (2026-10-18)**: the shell's pixel down to one CSS
    pixel, the view's (DESIGN 16.29); the band at MM6's share with MM6's
    ovals; the portrait tool's first cut and Alric's face in the band
    (DESIGN 12.2). The owner's phone then showed what the captures never
    had (DESIGN 16.30): stale saved tuning, a horizon rolled after combat,
    the band under the shelf inside the safe areas, the inn on its posts,
    a portrait too fine for the shell; all five fixed the same evening.
    Then the view past the pillars and walls a step short (DESIGN 16.31):
    marble over the safe areas, buildings colliding as their models. Then
    the talking head (DESIGN 16.32): the bust's camera a frame behind the
    head, and the look-around idle in the window; both fixed.
18. Remaining, in order: lasting buffs and Jump; weather states (rain, a
    sandstorm); music; the smith's hammer and the temple bell.

**Status 2026-10-24:** the town keeps the hour (DESIGN 17.4, 17.6): smoke
from every chimney found on the houses' roofs, lit windows from dusk on
the five houses whose panes pass the window screen and the night review,
and shadows cast for the morning's, noon's and the evening's sun, blended
by the hour. Then Gullhaven rebuilt packed (DESIGN 17.2): the square and a
high street built up house to house, the farm, crossroads, cave, stones,
camps and ruin a minute apart, woods between; and the regions the right
way round (DESIGN 17.1), east on the screen's right and the sun rising there.
Then trees that stop the party at their drawn trunks (DESIGN 17.7), and the
test dungeon scrapped (owner): the showcase level and its portal are gone,
the cave's tunnel ends in rock, and its tests run in Gullhaven. Then the
smithy's room from the owner's ChatGPT picture, its forge, coals and lamp
burning at MM6's step (Phase 6a, DESIGN 17.8), then the inn, the store,
the temple, the training hall and a guild of air beside the inn, lit
moodily, the guild's orb alive.

**Status, night of 2026-10-16 (owner asleep, best judgement):** steps 1 to 6
are in: the valley (village, road, pass, gorge with eight cascades, cave
mouth), the showcase dungeon reached through the cave and left through
its door, the desert beyond the pass, far backdrops, bandits about both
regions, hit feedback, the rules layer and its screens. Live at `/dev/`
(the valley is the default level; `?level=showcase` the dungeon,
`?level=desert` the desert). Not done: performance on the owner's phone (untested; the
valley carries 300 chunk meshes, 2500 thin-instanced trees, 9 water
bodies and 8 falls), party state across a portal reload, NPC dialogue,
a desert town, Meshy spends (none of the 900 credits used: generated
houses, trees and the cave looked acceptable, and a second creature
unattended risked another broken rig).

## Phase 6a – Interiors (added 2026-10-24)

**Goal:** a room behind every door, as MM6's houses: the owner's picture of the room in the
view's box, its fires moving, the keeper's portrait on the board (DESIGN 17.8).

**Steps**

1. Done 2026-10-25: the room view (src/world/room.ts), `npm run room` (tools/room.ts), and the
   smithy from the owner's picture, with an end-to-end test at its door.
2. Done 2026-10-25: the inn, the store, the temple and the training hall, each from the
   owner's picture (drop it in pipeline/inbox/rooms/<house>.png and run
   `npm run room -- <house>`); candles, firelight pooled on the floor and the rooms darker
   away from their fires.
3. Done 2026-10-25: the guild, the townhouse beside the inn (the Initiate Guild of Air), its
   orb throbbing in its own colour with motes and crackles.
4. MM6-style guild rooms (DESIGN 17.8), each with an effect for its centrepiece over a region
   marked in pipeline/rooms.json. Done 2026-10-25: the air guild (Gullhaven's), its clouds
   bobbing and churning with mist drifting by, and the light guild (`?room=guild-light`), its
   vapour climbing with sparks; then the fire, water, earth, spirit and dark guilds and three
   homes, made ahead of their houses (a pillar of fire, falling water with spray and
   ripples, floating rocks, a turning ring of crystals, smoke with bright sparks).
5. The keeper's portrait and "Converse with" on the board.
6. Later: the homes behind the town's houses' doors, the stock on its shelf for Buy, the
   cave's "Enter?" picture.

**Credits:** none; the pictures are the owner's.

**Acceptance:** on the owner's phone every house with a service opens its room at once, its
fires moving, and leaving puts the party back at the door.

---

## Phase 6 – Slice content

**Goal:** the first town, one dungeon and one quest, fully assetised.

**Steps**

1. Content design docs (`docs/content/`): town plan (buildings, services,
   NPC roster), dungeon plan (spaces graph, encounters, loot, objective),
   quest script (giver, steps, rewards). Owner approves before building.
2. Asset list with credit estimate: NPCs, monsters (humanoid), props,
   buildings, textures, portraits, items, SFX, music. Split into numbered
   batches.
3. Town level script: terrain, walls, streets, building shells from the
   kernel, interiors as separate scenes (Phase 6a), placed props, NPC spawns.
4. Dungeon level script: authored to the plan, validated by the compile
   step.
5. Prompt cards and Meshy batches, run on approval; assets validated and
   committed.
6. Quest, dialogue and encounter data wired in.
7. Music and SFX placed; owner-generated tracks imported.

**Deliverables:** the slice playable end to end from the home screen.

**Acceptance:** owner completes the quest on the iPhone.

---

## Phase 7 – Polish and release

**Steps**

1. Profiling on device: draw calls, memory, load time; fix the worst
   offenders.
2. Offline play: service worker precaches all assets; cache size verified
   against iOS limits.
3. iOS and Android quirks: audio, orientation, safe areas, install prompts,
   back gesture on Android.
4. Save robustness and migration.
5. Full playthrough QA and a bug-fix pass.
6. Tag a release; Pages serves it.

**Acceptance:** owner's final sign-off.

---

## Cross-cutting rules

- **No placeholders in shipped builds.** Dev-only test scenes are allowed
  while a system is under construction, are clearly named `dev-*`, are
  excluded from production builds, and are deleted when the real thing lands.
- **Testing:** unit tests for the kernel and game rules; Playwright smoke
  tests for boot, controls and each screen; screenshot comparisons for the
  filter; on-device checks by the owner for feel and performance.
- **Performance budget:** DESIGN.md 11.9, checked every phase on device.
- **Design doc first:** any change of decision lands in `DESIGN.md` before
  code.

## Owner actions, by when they are needed

| When    | Action                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 0 | Enable GitHub Pages (source: GitHub Actions) and secret-scanning push protection; supply the app icon image from a prompt card                         |
| Phase 1 | Test controls and look on the iPhone, give feedback                                                                                                    |
| Phase 2 | Review the authoring API and the showcase                                                                                                              |
| Phase 4 | Meshy key as a network secret (done 2026-10-15); `FREESOUND_API_KEY` as an environment secret; return ChatGPT images for prompt cards; approve batches |
| Phase 5 | Decide rule questions as they come up; approve screens                                                                                                 |
| Phase 6 | Approve content docs; supply music; approve batches                                                                                                    |
| Phase 7 | Final device testing                                                                                                                                   |

## Decisions approved with this plan (2026-10-14)

1. The phase order above, with 2 and 4 interleaved.
2. GitHub Pages as the hosting for on-device testing.
3. World rendered at 1080 lines by default with a 720-line performance
   preset; UI and text at native resolution. (Decided 2026-10-14.)
4. Dev-only test arena in Phase 1, deleted in Phase 2.
