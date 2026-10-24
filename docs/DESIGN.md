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

| Decision         | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Primary target   | iPhone 14 Pro Max, landscape, launched from the home screen                    |
| Secondary target | Android phones, landscape                                                      |
| Delivery         | Installable web app (PWA). No app-store build for now.                         |
| Graphics API     | WebGL2 (works on iOS Safari and Android Chrome today). WebGPU later if useful. |

## 3. Stack

| Decision             | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| Engine               | **Babylon.js** (confirmed 2026-10-11 after comparison with Three.js) |
| Language             | TypeScript                                                           |
| Bundler / dev server | Vite                                                                 |
| HUD                  | HTML/CSS overlay on top of the canvas (touch-friendly, crisp text)   |

## 4. Art direction

**Structure, interface and tone** come from Might and Magic VI. **The 3D
rendering look** comes from the five images in `artwork/reference/look/`
(owner, 2026-10-14), to be emulated precisely: early-2000s 3D realism, not
1998 software rendering. The MM6 posterize and dither filter stays available
as an option but is off.

The look, as a checklist for the renderer:

- **Geometry**: low-poly but complete; hard silhouettes; a few hundred to a
  few thousand triangles per model. **No billboard enemies.**
- **Textures**: low resolution (128–512 px) with visible texels up close,
  sampled nearest-neighbour with mipmaps so distance stays calm. Painterly or
  photo-sourced.
- **Lighting**: per-vertex key and ambient; **warm point lights** from
  lanterns and windows pooling on nearby surfaces (per pixel, up to four per
  object); cool blue-violet dusk ambient; no real-time shadows, baked light
  where the level is static, and outdoors a shade painted on the ground under
  every tree and house (17.4).
- **Glow**: emissive windows and lanterns with soft bloom.
- **Atmosphere**: heavy distance fog tinted like the sky, fog banks lying in
  valleys and between trees, gradient skies with cloud texture, overcast or
  dusk by default.
- **Grade**: cool shadows and warm highlights, slightly lifted blacks, gentle
  vignette, soft overall. No dithering or posterisation by default.
- **Wet surfaces**: cobbles after rain reflect the lamps (specular pass,
  Phase 3).
- **Resolution**: 720 lines by default since the owner's 2026-10-15 tuning
  (1080 preset available), **linear** upscale so the frame is
  slightly soft rather than pixelated as a whole; UI and text native.
- **Animation**: sampled at a low frame rate for creatures, as before.
- **UI**: adapted for touch and modern screens (19.5:9) but the MM6
  influence and the marble decor are incorporated: marble pillar framing,
  gold-framed oval portraits with HP/SP bars, stone panels with gold borders
  for tooltips, the book-shelf buttons, blackletter headings.

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

| Topic          | Decision                                                                           | Date       |
| -------------- | ---------------------------------------------------------------------------------- | ---------- |
| Combat         | Real-time only. No turn-based mode.                                                | 2026-10-11 |
| Party size     | Exactly four.                                                                      | 2026-10-11 |
| Party creation | Full character creation (no pre-made party).                                       | 2026-10-11 |
| Enemies        | Humanoids first; animals and monsters planned, may be absent from the first slice. | 2026-10-11 |
| Controls       | Invisible tank-style stick plus look area; full spec in 7.1.                       | 2026-10-11 |
| Jump           | A spell, not a button.                                                             | 2026-10-11 |
| Races          | Humans only, two sexes.                                                            | 2026-10-11 |

### 7.1 Controls (touch, landscape)

- **Left half of the screen – invisible move stick.** Touch anywhere on the
  left, hold and drag forward to walk. Drag backward to walk backward at
  **one third** of forward speed. Drag sideways to **strafe at two thirds**
  of forward speed (added 2026-10-14, doubled the same day). Each stick gesture is one axis: whichever
  direction leaves the dead zone first wins until the stick returns to
  centre, so strafing never combines with forward or backward movement.
  Strafing cannot start while the right thumb is looking around. Strafing
  counts as moving, so the right thumb turns rather than looks during it.
  Nothing is drawn on screen.
- **Right half of the screen – invisible look area.** Free look (yaw and
  pitch) works **only while stationary**. **Magnetic level view** exists as
  an optional toggle, **off by default** (2026-10-14): when on, a look drag
  that ends within a few degrees of level eases back to exactly level.
- **Turning while walking.** While the left thumb is held and the party is
  walking, dragging the right thumb left or right turns the party. Vertical
  drag does nothing in this state.
- **Tap to interact.** A tap (no drag) on a door, NPC, item or sign
  interacts with it.
- **Tap a monster to attack** with the currently selected party member. After
  the attack the selection automatically advances to the next _ready_ party
  member (one not in recovery), MM6-style.

## 8. First playable (vertical slice)

A full vertical: the first town, one dungeon and one quest, playable end to
end on the primary target device from the home screen.

## 9. Open questions

- Animal / monster animation: proposal in 10.2 awaiting sign-off.
- Save system details (IndexedDB in the PWA).

## 10. Asset pipelines (proposed 2026-10-11, pending sign-off)

Principle: **no placeholder assets.** Every asset that enters the repo is the
real thing, produced by one of the pipelines below and recorded in the
manifest. Nothing is scraped from Google Images: results there are
copyrighted and scraping is brittle. The sources below are free, legal and
scriptable.

### 10.0 Sources

| Source                                     | Used for                                                                   | Cost                  | Access                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| ChatGPT image generation (owner's account) | Concept images for Meshy, tileable textures, UI art, portraits, icons, sky | Free                  | Claude writes the exact prompt, owner returns the image                            |
| Meshy text-to-image                        | Same as above when the owner is unavailable                                | 3–9 credits per image | Official CLI through the cloud proxy, see below                                    |
| Meshy image-to-3D (Smart Topology)         | All 3D models                                                              | Credits, see 10.1     | API                                                                                |
| Meshy rigging + animation library          | Humanoid rigs and clips                                                    | Credits, see 10.1     | API                                                                                |
| Poly Haven, ambientCG                      | Photo-based tileable materials (stone, wood, dirt, marble…)                | Free, CC0             | Public HTTPS API, no key; verified reachable from the build environment 2026-10-11 |
| Freesound (CC0 filter)                     | Sound effects                                                              | Free                  | API key, free account                                                              |
| Google Fonts (OFL)                         | Blackletter / serif UI fonts                                               | Free                  | Download script                                                                    |

CC0 library access (verified 2026-10-11 from this environment, no key needed):

- **Poly Haven**: `GET https://api.polyhaven.com/assets?t=textures` lists
  all textures (867 today) with categories and tags.
  `GET https://api.polyhaven.com/files/<id>` returns, per map (Diffuse,
  Rough, AO, nor_gl, Displacement…) and per resolution (1k–8k), a direct PNG
  or JPG link on `dl.polyhaven.org`. The pipeline fetches the 1k diffuse
  (and a normal map only when needed), then runs the texture processor.
- **ambientCG**: `GET https://ambientcg.com/api/v2/full_json?type=Material&include=downloadData,tagData`
  (filterable by `q`, `limit`, `offset`) lists materials with zip download
  links per resolution (`1K-JPG` ≈ 10 MB). The pipeline downloads the 1K zip,
  extracts the colour map, and runs the processor. ambientCG asks for a
  descriptive User-Agent, which the script sets.
- Both are CC0; the manifest still records asset id, source URL and licence.

Meshy API facts verified 2026-10-11:

- Smart Topology is `model_type: "smart-topology"` with `ai_model` `meshy-t2`
  (100–15,000 triangles) or `meshy-t2.5` (100–30,000, the default; verified
  2026-10-15 through the official CLI, which corrects the 2026-10-11 note that
  no T2.5 existed). Triangle-only output, parts natively separated. We use
  `meshy-t2.5` at `target_polycount` 4,000.
- Image-to-3D accepts `pose_mode: "a-pose" | "t-pose"`, `texture_resolution`
  2k/4k/8k, `auto_size` with `origin_at: "bottom"`, `target_formats`.
- Text-to-image models: `nano-banana` (3 cr), `nano-banana-2` (6),
  `nano-banana-pro` / `gpt-image-2` family (9). Options `generate_multi_view`,
  `pose_mode`, `remove_background`.
- Rigging is **humanoid (biped) only**, needs a textured model facing +Z;
  returns rigged GLB/FBX and optional walk/run.
- Animation library is free to list (categories WalkAndRun, BodyMovements,
  DailyActions, Fighting, Dancing); 3 credits per action; up to 10 actions
  merged into one GLB per request. Non-humanoid rigs are not supported.
- Download URLs expire. Outputs are fetched immediately and committed.

Meshy access (decided 2026-10-15): the API key is a **network secret** of the
cloud environment (allowed host `api.meshy.ai`, header
`Authorization: Bearer …`). The outbound proxy injects it; the key never
enters the container, the repo, the logs or the chat, and nobody asks the
owner to paste it anywhere else. The client is the official `@meshy-ai/cli`
(devDependency, per the library-first rule), driven by `tools/lib/meshy.ts`
with a placeholder `MESHY_API_KEY`, `NODE_USE_ENV_PROXY=1` and the proxy's
CA bundle, always with `--format json --output-schema v1` and one
`--operation-id` per step so a repeated request replays the journal instead
of billing again. Verified through the proxy: `balance` (4,790 credits on
2026-10-15) and the animation catalog (678 actions).

### 10.1 Humanoids (party, NPCs, humanoid enemies)

1. **Concept image.** Claude writes a prompt card (exact prompt + required
   framing: full body, A-pose with straight legs, straight front view, neutral grey background, flat even lighting, single subject). Meshy's single-image guidance is a clear front-facing image; a three-quarter view is kept only for props and buildings, where it shows depth. Reference style (2026-10-15): a clean stylised concept render with fitted clothing and no loose cloth; a reenactment photograph gave separated parts with gaps and a splayed stance. Owner generates it in
   ChatGPT and returns it. **One concept image per model** (decided
   2026-10-11); no turnaround sheets.
2. **Image-to-3D.** `model_type: smart-topology`, `ai_model: meshy-t2.5`,
   `target_polycount: 4000`, `pose_mode: a-pose`, `should_texture: true`,
   `texture_resolution: 2k`, `enable_pbr: false`, `auto_size: true`,
   `origin_at: bottom`, `target_formats: ["glb"]`.
3. **Rigging.** `height_meters` per character.
4. **Animation.** One request per character with its clip set, names fixed project-wide. Combat set (enemies, guards): idle, walk, run, attack_1, attack_2, hit, death, cast, talk, block. Civilian set (walking townsfolk): idle, walk, talk. Service NPCs behind a counter (innkeeper, shopkeepers, trainers, guild masters) are house-screen portraits with no 3D model, as in MM6 (decided 2026-10-15). Library `action_id`s chosen 2026-10-15 and
   fixed in `HUMANOID_ACTIONS`: idle 0 (Idle), walk 30 (Casual Walk), run 14
   (Run 2), attack_1 97 (Left Slash), attack_2 240 (Thrust Slash), hit 178
   (Hit Reaction), death 188 (Fall Dead from Abdominal Injury), cast 125
   (Charged Spell Cast), talk 313 (Talk with Hands Open), block 138 (Block1).
5. **Post-process (code).** gltf-transform (`tools/lib/postprocess.ts`): clips renamed to the standard names in request order, dedup, prune, textures scaled to 512 PNG. The mesh is never patched: `validate` measures open boundary loops and notes loops up to 30 cm (with a ray test's guess whether something backs them) for the owner to judge in the viewer; a visible gap means regenerating from a cleaner reference (owner, 2026-10-15 and 2026-10-16). `validate` checks triangles (at most 4,400, a
   tenth over the 4,000 target), clip names and texture size. Quantisation
   and meshopt compression wait until file size matters (meshopt needs a
   decoder on the Babylon side).
6. **Commit** to `assets/characters/<id>/` with a manifest entry.
7. **Weapons in hand** (2026-10-16): never part of the character mesh. A
   weapon is a prop (pipeline 10.3, a few hundred triangles) attached to the
   `RightHand` (or `LeftHand`) joint's transform node with a per-prop grip
   offset tuned once in the dev panel and stored with the prop. The attack,
   block and idle clips move the hand; the prop follows. This keeps one
   bandit mesh for a club, a sword or a bow, and keeps the auto-rigger away
   from held objects, which it handles badly. A sheathed weapon drawn in the
   concept image is part of the body and stays sheathed.

Credit cost per humanoid, confirmed by batch 001 (2026-10-15, `consumed_credits` and the balance delta agree): image-to-3D 15, rigging 5, animation 3 per clip. A combat humanoid costs 50 credits, a civilian 29. The bandit came back with 3,641 triangles against the 4,000 target.

### 10.2 Animals and monsters

Meshy produces the mesh and texture but cannot rig or animate them.
Plan: animate in code. Smart Topology delivers natively separated parts, so
jaws, legs, wings and tails become pivot-driven parts animated by small
procedural motion programs (bob, lunge, bite, flap) stepped at the low frame
rate. Combined with the MM6 filter this reads like the original's 4–8 frame
creature animations. Revisit if Meshy adds non-humanoid rigging. Not needed
for the first slice.

### 10.3 Props and buildings

ChatGPT concept image → Meshy image-to-3D (Smart Topology, polycount 300–3000
by size) → post-process → `assets/props/<id>/`. Buildings are exterior shells;
interiors are separate scenes, as in MM6. `auto_size` keeps real-world scale.

Vegetation and small props need no concept image: a prompt is enough, so
they go through Meshy text-to-3D (`meshy-t2.5`, smart topology, 300–800
triangles, preview then refine without PBR) as a `props` batch
(`npm run asset -- batch props <name> <specs.json>`, specs in
`pipeline/props/`). The runner submits every preview, waits, then every
refine, so twenty trees take as long as one; Meshy queues about ten tasks
per account, and when it refuses more the runner waits for the oldest
pending task and goes on (owner, "Run the trees!", 2026-10-17; batch 003,
twenty trees and bushes). Measured cost: a preview is 5 credits, a refine
10, a quarter of the dry-run estimate.

Owner, 2026-10-17, after batches 003 and 004: **never text-to-3D again**.
Every model starts as a low-poly text-to-image concept through Meshy's
cheapest image model (`text-to-image create --ai-model nano-banana-2-lite`,
multi-view for creatures), the image is reviewed, then image-to-3D. The
trees and buildings already made stay unless they fail inspection.

Concept pictures stand on a plain fuchsia (#FF00FF) ground (owner,
2026-10-19: "We do fuchsia backgrounds"): no tree, rock or house is magenta,
where white would key out a birch's bark or a lime wall. The owner makes
most of them free in ChatGPT from the prompt cards in `docs/prompt-cards/`;
`npm run asset -- inbox <id> <picture>` keys each into
`pipeline/inbox/<id>.png` (`tools/lib/key.ts`): cover from the pixel's
spill (red and blue above green) against the ground's, the edge's colour
bled in from the clean subject beside it, since a generated picture's chroma
runs a few pixels past its outline and an unmixed edge stays pink; pockets
of ground caught between needles, which never clear, are edge too. A batch
skips the text-to-image step of any prop whose picture is in the inbox; a
Meshy picture is keyed the same way (its own alpha passes through).

Catalogue: `npm run props:catalogue` measures every GLB in `assets/props`
at the nominal height in `kernel/terrain/props.ts` and writes
`assets/props/catalogue.json` (footprint, scale to metres, triangles).
Trees and bushes also get `<id>.lod.glb`, a far-detail copy at a third of
the triangles with textures stripped (meshoptimizer through gltf-transform).
The kernel lays out the village from the footprints; the runtime
(`src/world/props.ts`) loads each model once, bakes the loader's handedness
mirror into the vertices (reversing the winding, or every face culls
inside out), scales it to metres with the foot at y = 0, and draws it as
thin instances. The dev build shows one model with `?prop=<id>`.

### 10.4 Dungeons and world geometry

Dungeon geometry is **generated**, never modelled; the full system is in
section 11. Outdoor areas are heightmap terrain with tiled ground textures
and placed Meshy buildings and props.

### 10.5 Tileable textures

Two inputs, one processor:

- ChatGPT: prompt card asks for a seamless, top-down, flat-lit texture with
  no vignette or perspective.
- Poly Haven / ambientCG: CC0 PBR sets fetched by script (base colour only
  unless a normal map earns its place).

Processor (`tools/textures.ts`, `npm run textures`): `pipeline/textures.json`
maps each material role to a source asset; the tool fetches the 1k diffuse
map, area-averages it down to 256 px (low-res texels read correctly under
nearest sampling), and writes `assets/textures/<role>.png` plus
`manifest.json` with name, authors, licence and metres per tile. Outputs are
committed (CC0). Seam repair, palette quantization and atlasing come when a
texture needs them. First set (2026-10-14): Poly Haven `large_sandstone_blocks_01`
(ashlar), `monastery_stone_floor` (flagstone), `brown_planks_09` (plank),
`metal_plate_02` (iron), `beige_wall_001` (plaster), `cliff_side` (rock),
`marble_01` (marble), `stone_brick_wall_001` (trim). Lamp panes and the
interim still-water surface are generated in code.

### 10.6 2D art

- **HUD materials** (marble, stone panels, parchment, wood, gold trim): ChatGPT
  images through the texture processor, used as CSS backgrounds. Ornaments and
  frames as SVG or background-removed PNGs.
- **Portraits, paper dolls, equipment overlays and item icons**: section 12.
- **Spell and skill icons**: ChatGPT with a style template and transparent
  background.
- **Sky**: ChatGPT panoramic sky processed into an equirectangular map, or a
  procedural gradient dome.

### 10.7 Audio

- SFX: Freesound CC0 via API, processed (trim, normalise, encode to AAC/MP3 for
  iOS Safari).
- Music: the owner generates some tracks; the rest comes from CC0 sources.
  Owner-generated tracks are delivered as files and recorded in the manifest
  like any other asset.

### 10.8 Fonts

OFL fonts from Google Fonts: a blackletter for headings, a serif italic for
stats, a readable sans for tooltips. Downloaded and subset by script.

### 10.9 Mechanics shared by all pipelines

- Scripts live in `tools/`, written in TypeScript, run with `npm run asset:*`.
  Keys are read from the environment only and never printed.
- `pipeline/inbox/` receives owner-provided images (uploaded in chat), named
  by asset id.
- `pipeline/batches/NNN-name.json` lists each Meshy batch with estimated
  credits. Claude writes the batch, the owner approves it by number, only then
  does Claude run it. No batch runs twice without `--force`.
- `assets/manifest.json` records for every asset: id, kind, source, prompt,
  Meshy task ids and parameters, licence, consumed credits, date.
- A `validate` script enforces polycount, texture size, bounds, clip names and
  manifest completeness before commit.

Status 2026-10-15: the first character, the bandit, loads and walks in the dev viewer (`src/world/character.ts`, clip sets in `kernel/characters/clips.ts`). `tools/asset.ts` (`npm run asset`) provides `manifest`,
`validate`, `card`, `batch new|show|approve` and `run`; libraries in
`tools/lib/` (`manifest.ts`, `batch.ts`, `cards.ts`, `meshy.ts`, `run.ts`,
`postprocess.ts`) with unit tests. Prompt cards land in
`pipeline/cards/<id>.md` and the owner's images in `pipeline/inbox/<id>.png`.
`run <nnn> [--dry-run] [--force]` runs an approved batch through the CLI:
image-to-3D → rigging → animation → download → post-process → manifest entry
(task ids, parameters, credits per task; balance before and after in the
batch's run record). Task records are written after every step, so an
interrupted run resumes where it stopped and never resubmits; a finished
batch needs `--force`. `--dry-run` prints every command and the balance and
submits nothing (verified 2026-10-15 against the live balance). Work files
land in the ignored `pipeline/work/`. Concept images for Meshy use the
photographic "3D reference prefix" of `pipeline/style.md`.

## 11. Dungeon environments (generated, real 3D architecture)

Requirements (2026-10-11): real 3D environments, not a cell maze. Walkways,
balconies, staircases (straight, winding, spiral), bridges over chasms,
galleries overlooking lower halls, flooded undercrofts, caverns, waterfalls
and real water. Geometry is still **generated**: nothing is hand-modelled,
but the generator works in metres and curves, not in cells.

### 11.1 Geometry kernel

A TypeScript procedural-modelling kernel, run offline at compile time:

- **Mesh operations**: extrude a profile along a path (sweeps), loft, revolve,
  arrays and radial repeats, mirror, bevel. Profiles are 2D polylines with
  arcs, so mouldings, cornices, rails and arches are real curved geometry.
- **Booleans**: Manifold (the same library behind Babylon's `CSG2`), run in
  Node through its WASM build. Output is watertight, which the navmesh and
  colliders need.
- **Signed distance fields** for organic shapes: caves are sculpted as SDFs
  (tunnels as capsules along paths, chambers as blended spheres and
  ellipsoids, noise displacement for rock), then surfaced with marching cubes
  at 0.25–0.5 m resolution and smoothed. Built structures are booleaned into
  or placed inside the cave mass.
- **Element library** built on the above, each element parametric and
  textured per material role (wall block, flagstone, plank, iron, plaster):
  wall segments with plinth and cornice; round and pointed arches; barrel,
  groin and ribbed vaults; columns with base, shaft and capital; buttresses;
  doorways and windows; floor and ceiling slabs; balustrades (repeated
  balusters plus rail); straight, L, U, switchback and **spiral staircases**
  with stringers and rails; **balconies** on corbels; **bridges and
  walkways** with deck, supports and rails; shafts and pits; canals, drains
  and basins; rubble and stalactites as props.

### 11.2 Spaces and connectors

A dungeon is a graph of **spaces** placed in 3D with real dimensions and
rotations, joined by **connectors**:

- Spaces: hall, gallery, corridor, undercroft, shaft, cistern, cavern,
  crypt, throne room, each with its own vault style, ceiling height and
  material set.
- Connectors: staircase (any type), ramp, bridge, balcony opening, doorway,
  tunnel, ledge drop, water channel.
- Verticality is designed, not emergent: a gallery is a space whose floor
  is a balcony around a lower hall; a shaft is a space whose connectors are a
  spiral stair; a bridge crosses a chasm between two caverns with the river
  visible below.

### 11.3 Water and waterfalls

- **Real water**: Babylon's `WaterMaterial` (reflection, refraction, animated
  waves, flow direction), tuned under the MM6 filter so it reads as a crisp
  late-90s surface. Pools and lakes are planar surfaces in basins; rivers and
  canals are swept surfaces along paths with a flow vector.
- **Waterfalls**: a ribbon mesh swept from lip to plunge pool with scrolling
  foam texture and vertex ripple, plus particle spray and mist at the base,
  a looping sound with distance attenuation, and a disturbed water patch in
  the pool.
- Rules as in MM6: wading slows, deep water damages without Water Walk.

Status 2026-10-15 (Phase 3): built as above with these specifics. Reflection
and refraction render at a quarter of the world resolution by default (half
and eighth selectable; never full, owner's call). One water material per
body, each reflecting only the chunks within 45 m, passes switched off
beyond 60 m. Each water mesh sits at its water level, which is where Babylon
puts the mirror and clip planes. The surface is flat (no vertex waves); its
motion is two ripple layers, specified in metres and seconds and driven by
our own clock (see the 2026-10-15 decision-log entries on still water and
kaleidoscope reflections). The ripple normal map and the waterfall foam
streaks are generated in code. The waterfall sound is synthesised (filtered brown noise
with a slow swell) and placed in 3D with inverse-distance attenuation, so no
audio file is needed. Wading: over 0.25 m halves walking speed, over 1.3 m
drops it to a third and counts as deep; the hit points that deep water
should damage arrive with the party in Phase 5, so for now the dev build
only announces it. The disturbed patch in the plunge pool is still to do.

### 11.4 Authoring: level scripts

Source of truth per dungeon is `levels/<id>/level.ts`, written against the
kernel's API. Quest-critical layout is authored explicitly; seeded helpers
fill in rubble, stalactite fields, cave wall noise and ornament repeats.
The script reads like a plan: place a hall, wrap a gallery around it, drop a
spiral stair in the north shaft, bridge the chasm, flood the undercroft,
hang a waterfall off the east ledge.

Design rule, "no rat maze": every space has an identity and a sightline to
another level; corridors are short and purposeful; the player should be able
to see where they are going before they get there.

### 11.5 Compile step

`npm run level:build`, offline: script → kernel → merged meshes per material
and region → static mesh colliders → Recast navmesh → baked per-vertex
lighting (ray-tested against the geometry, dense tessellation where light
changes fast) → automap data (floor-plan slices per height band) → GLB
plus sidecar data. Validation runs navmesh reachability from the entrance
to every door, spawn, trigger and loot point, and fails the build on any
miss. Generated artifacts are build outputs; only scripts are committed.

### 11.6 Lighting

Baked per-vertex lighting from the level's light list, with occlusion, gives
the moody MM6 falloff cheaply. On top: a dynamic torch light around the
party, point lights on braziers and under waterfalls, emissive glow for
magical features, particle fire. Dark beyond torch range.

Status 2026-10-15: the torch is a live per-pixel point light carried just
ahead of the eyes with a candle flicker; braziers burn with additive flame
particles and thin smoke (the compile step tags each light as lantern,
brazier or glow); fog eases toward the preset of whichever space the party
stands in (each hall, shaft, corridor and cavern has bounds and an optional
fog preset in the sidecar; the smallest containing space wins).

### 11.7 Movement and navigation

- Party: Havok character controller (capsule) against the static mesh
  colliders; stairs climb smoothly because the steps are real geometry with a
  ramp collider. Falls from ledges cause fall damage. **Jump is a spell**,
  not a button (decided 2026-10-11).
- NPCs and enemies: Recast navmesh from the generated mesh; multi-level and
  over-and-under are native.

### 11.8 Tooling

- In-browser **fly-through viewer** for any level script, hot-reloading on
  save, with the MM6 filter togglable.
- Floor-plan slices rendered to PNG at compile time for review, doubling as
  the in-game automap source.
- A visual editor only if script authoring proves too slow.

### 11.9 Performance targets (iPhone 14 Pro Max)

Meshes merged per material and region, frustum culled by region; under 150
draw calls and about 300k visible triangles; one water material per level
(reflection and refraction render passes are the costly part); textures
atlased per material family.

### 11.10 Honest sizing

The kernel and element library are the largest single system in the
project. They are also the thing that makes "real 3D environments that are
generated" true, and they are reused by the town (building shells, walls,
bridges, fountains) and later dungeons.

## 12. Characters: portrait, paper doll and equipment

Rewritten 2026-10-18 with the owner. It supersedes the first plan (ChatGPT
character sheets with 2D equipment overlays cut out by difference) and, for
party faces, 16.5's "portraits stay crests; no generated faces".

The party is never seen in 3D in play; like MM6, members exist as portraits
and paper dolls. A member is a neutral person, a face and hair, plus their
equipment: the class is the equipment, so any face can play any class.

### 12.1 Bodies

- One shared base body per sex (humans only, two sexes, decided
  2026-10-11): a neutral figure in an undyed linen shirt and breeches,
  barefoot, A-pose, front view, made through the Meshy pipeline (a
  `nano-banana-2-lite` concept the owner reviews, image-to-3D, rig) and
  rigged once. Every garment is built on it, so anything fits anyone of
  that sex. One build per sex for now; a second build would mean fitting
  every garment again.

### 12.2 Portraits: 2D, made by the owner

- Each appearance starts as a neutral head-and-shoulders portrait the owner
  makes in ChatGPT image with the portrait prefix (`pipeline/style.md`):
  photographic, as MM6's filmed actors were, in a plain linen collar with no
  class costume.
- Expressions are edits of the neutral portrait in the same chat (prompt
  card `docs/prompt-cards/portrait-alric.md`): a blink, eyes closed, two
  glances, two winces, smile, cast, talk, refuse, afraid, weak, sick, drunk
  and insane.
- The portrait tool (`npm run portrait -- <appearance>`, `tools/portrait.ts`)
  cuts every picture by the appearance's head box, set once on the neutral
  one (`pipeline/portraits.json`), to the band ring's opening, 56 by 80 UI
  pixels, one image pixel to the UI pixel (lanczos3, then the shell's sixteen
  bits, no posterising), keyed to the oval by whole UI pixels so its edge
  steps with the ring's. The owner on 2026-10-18: with the shell at one and a
  half CSS pixels and the face posterised to 128 colours it was "still too
  pixelated"; cut at three image pixels to the UI pixel it was "too high res,
  not matching the UI". With the expressions the tool will also align each
  edit to the neutral image, keep only what changed (eyes, brows, mouth) and
  reject an edit that moved the face.
- Alric's neutral portrait is cut and shows in the dev party's first oval;
  a member without a portrait shows their class sigil.
- The game makes the rest: asleep and unconscious from eyes closed (the
  second tipped and darkened), poisoned and diseased as tints over sick,
  stoned, paralysed and cursed as tints over neutral, a drawn gravestone for
  dead and ash for eradicated.
- The worst condition (the severity order in `src/game/conditions.ts`) holds
  its face; idle blinks and glances, winces sized to the blow, casting,
  smiling and talking play over it, as MM6's face animations do.

### 12.3 Heads

- Each appearance's 3D head comes from its flat-lit portrait reference
  through Meshy image-to-3D (the owner's image is the reviewed concept; never
  text-to-3D), cut at the neck and seated on the base body's head bone, the
  body's skin tinted to match. A helmet switches the head to a variant with
  the hair under it.

### 12.4 The paper doll: 3D, shown as a still

- The doll is the base body, the member's head and their equipment,
  assembled in 3D in the doll pose and rendered to a still through the
  game's own render chain whenever the equipment changes. MM6's doll was a
  still picture too.
- Garments (shirts, jerkins, hauberk, tabard, robe, cuirass, coif, hood,
  cloak, boots, gauntlets) are shells fitted on the base body, bound to its
  skeleton and layered in a fixed order: body, under-layer, armour,
  over-garment, cloak. Rigid items (weapons, shields, helmets) are separate
  models on the hand, forearm and head bones. Variants within a class are
  recolours.
- Pack icons are rendered from the same pieces, so an icon and the worn
  item agree.
- The same bodies, heads and garments can dress townsfolk and guards later.

### 12.5 Status on the band

- The face carries the condition (12.2).
- The gem is MM6's: green, yellow or red by the nearest hostile, dark while
  the member recovers, never a condition light.
- The hit point tube turns yellow under half and red under a quarter.
- A press and hold on a face (MM6's right button) shows its conditions with
  their durations and its active spells.
- Buff marks on the band for Bless, Heroism, Haste, Shield and Stone Skin.

### 12.6 Style coherence

The style bible (`pipeline/style.md`) holds three prefixes: the painted one
for illustrations, the 3D reference one for Meshy concepts, and the portrait
one for faces. Every portrait, head, body and garment goes through the
game's own palette and light afterwards, so the band, the doll and the world
agree.

## 14. Game rules (Phase 5)

Data-driven, MM6 where the community documents it, recorded here where we
deviate. Code: `src/game/`.

### 14.1 Statistics

The seven MM6 statistics: Might, Intellect, Personality, Endurance,
Accuracy, Speed, Luck. The bonus table is the MM6 to MM8 one as the community
documents it (11–12 is 0, then +1 per two points to 20, +1 per five to 40,
wider steps above; 3 is −5, 0 is −6). Should the manual differ, the table in
`src/game/stats.ts` changes and this entry records it.

### 14.2 Combat resolution

- Chance to hit: (15 + 2 × attack bonus) / (30 + 2 × attack bonus + armour
  class), the documented MM6 formula. Melee attack bonus = Accuracy bonus +
  weapon skill; armour class = Speed bonus + armour, where armour is each
  piece's value plus the body armour's skill at every rank and the Shield
  skill × 1 / 2 / 3 by rank (MM6-GAPS.md 4, RPGC).
- Weapon skills (MM6-GAPS.md 4, RPGC) add their level to attack at every
  rank, never doubled; from Expert, Mace adds it to damage, Staff and Spear
  to armour class, and Sword, Axe and Bow take it off recovery; at Master,
  Axe and Spear add it to damage. Not built yet: Master Staff and Mace
  stun, Master Dagger's triple damage (RPGC and GF-M disagree on its
  chance), Master Bow's two arrows and a weapon in the left hand.
- A monster hits a member with chance (5 + 2 × monster level) / (10 + 2 ×
  monster level + armour class) (MM6-GAPS.md 8, GF-M): a level-2 bandit
  against armour class 10 hits 9 times in 24. `resolveMonsterAttack` in
  `src/game/combat.ts` holds it; until `src/world/monster.ts` calls it, the
  world's monsters still roll the party formula with their attack bonus.
- Damage: the weapon's dice plus bonuses, at least 1 on a hit.
- A member with a bow shoots with the bow's numbers (MM6-GAPS.md 8): the
  Shoot bonus (Accuracy effect + Bow skill), the bow's dice without Might
  (MM6's rule on Might for bows is unverified) and the bow's recovery.
  `Party.attack` shoots whenever a bow is slung, as the runtime lets a bow
  reach anything in view; `ranged: false` strikes in melee instead, for
  when MM6's rule for a bow at arm's length is known.
- Falling and death (docs/gaps/characters.md 12.1): a member at 0 hit
  points or less is Unconscious (MM6's own help text); at minus its base
  Endurance score, before conditions, it is Dead (MW6 and the MM7 engine:
  at Endurance 30, death at −30; corrected 2026-10-18 from MMW's "−31").
- Recovery is MM6's sum in its units (MM6-GAPS.md 8, GF-M): the weapon
  type's base (Staff, Axe, Bow and bare hands 100, Sword 90, Spear and Mace
  80, Dagger 60) plus worn armour (Shield and Leather 10, Chain 20, Plate
  30; whole at Normal in its skill, gone at Master, and halved at Expert,
  which is ours: MM6 reduces it by an amount no source gives), less the
  Speed effect and, from Expert in Sword, Axe or Bow, the skill; at least
  30 for melee, 0 for a bow. A struck member recovers 20 − Endurance effect
  (nothing from Endurance 350), keeping any longer recovery, and a
  selected member left recovering hands the selection to the next ready
  one (GF-P); `Party.takeDamage` does this when the runtime passes the
  simulated time, which `src/dev` does not yet. MM6's real-time rate is
  unverified; we run 60 units a second, as MM7's engine does (OpenEnroth
  multiplies recovery by 2.1333 at MMX's 128 ticks a second). MM6-GAPS.md
  8's reading of 128 alone would halve every recovery.
- Tapping a monster attacks with the selected member if ready, otherwise
  the next ready one; the selection then advances to the next ready member
  (DESIGN 7.1). A fallen member is skipped.
- Monsters pick a living member uniformly for each blow. (MM6 favours the
  front row; later.)

### 14.3 Monsters

A monster record holds level, hit points, armour class, attack bonus (not
MM6's: its to-hit comes from its level, 14.2),
damage dice, walk and run speeds, aggro and attack ranges, the pause
between swings, experience and its character asset. In the world a monster
is a Meshy character on a recast-navigation crowd agent over the level's
Detour navmesh (the binary the compile step writes, imported as is; the
WASM module loads once), with a state machine: idle until the party is
within aggro range; chase (running from afar, walking near); attack when in
reach (swings alternate between the two attack clips at 1.5× speed, the blow
lands 40 % into the swing, then a pause); hit (a flinch, but only between
the monster's own swings: a blow never breaks a swing, and the pause after a
swing runs on through the flinch, so a party striking in turn cannot hold a
monster off; 2026-10-23, after a play-through took no damage over five
kills); dead (the death clip holds, the agent leaves the crowd, the body
stays). Every one of these timers runs on the world's step, never on the
clips' clock, so a slow phone lands the same blows as a fast one. Test data:
the bandit, level 2, 25 hp, AC 8, attack 3, 1d6+1. Regions carry `spawns`
in their sidecar (kind, position, facing), and a planned level may export
its own: Gullhaven's packs stand about its hills and roads; the halls keep
the test bed's one bandit six metres ahead and six skeletons beyond it. A
fallen monster is searched with a tap within 6 m for the gold on it
(`gold` in `src/game/monsters.ts`), once.

### 14.4 Hit feedback (2026-10-16)

From the owner's reel on punchy hits, all five, for every landed blow
(`src/world/combat-feedback.ts`, clocks in `feedback-timing.ts`):

1. **Flash.** The struck monster is painted white for 0.08 s: a `flash`
   uniform in the retro material mixes the lit colour to white, so it works
   on every character material without a second shader.
2. **Sound on the impact frame.** A whack (noise crack over a short low
   thump) when a blow lands, a heavier thud when it kills or when the party
   is struck, a whoosh for a miss; synthesised buffers played through
   Babylon's audio engine until recordings land.
3. **Particles in the blow's direction.** A one-shot blood burst (16
   particles, 32 on a kill) from the monster's chest along the line from
   the attacker, falling under gravity, dark red.
4. **Knockback.** The monster is shoved 0.45 m (0.7 m on a kill) away from
   the attacker over a few frames, then its crowd agent is teleported to
   where it ended up.
5. **Shake and freeze.** The game freezes for 0.07 s (0.14 s on a kill):
   the world's step is zero and the animation stepper's time scale is zero,
   so clips, monsters and water hold; the camera jitters 4.5 cm (9 cm when
   the party is struck) resampled at 30 Hz, fading over 0.22 s, with a
   little roll.

The party being struck gets the thud, the shake and a red wash over the
view (35 % at most, fading in 0.18 s), as MM6 tinted the screen; a blend
mode cannot reach the canvas from the UI layer, so it is a plain wash. Misses get the
whoosh only. Tuning values are in `DEFAULT_FEEDBACK`.

### 14.5 Rules and data layer

`src/game/` holds the MM6 rules as pure TypeScript with a test beside each
module: skills and classes, conditions, items and the 14 × 9 inventory
grid with equipment slots, the character sheet (HP, SP, attack, damage,
armour, recovery from stats, skills and equipment), creation (class base
stats plus a 50-point pool, two fixed and two picked skills), experience
(1000 × L × (L − 1) / 2, levels at a trainer), spells and the spellbook
(24 spells across the nine schools, Normal/Expert/Master tiers; MM6's
spell point costs by level, 1, 2, 3, 4, 5, 8, 10, 15, 20, 25 and 30, with
Spirit Arrow at 1 / 1 / 0 by rank and Cure Disease at Body 8, MM6-GAPS.md
7), the calendar clock and rest, town services (tavern, temple, guild,
trainer, shop with Merchant), quests, the automap and versioned save
files. Skills as MM6 (MM6-GAPS.md 4, RPGC): Body Building adds skill × the
class's hit points a level and Meditation skill × its spell points a
level, doubled at Expert and tripled at Master; Learning adds 9 % of
experience plus 1 % per skill point, the skill part doubled and tripled.
Every rule followed and every simplification is tabled in
`src/game/README.md`. The combat party (`party.ts`) is backed by a
character sheet or, for test data, a plain definition.

Screens (`src/ui/`, 2026-10-16): plain DOM and CSS in the dev build's
house style (dark stone panels, gold rules, amber selection, monospace
numbers), phone landscape with the safe areas kept. A book-shelf bar at
the bottom right opens the character sheet, inventory (the 14 × 9 grid,
tap to select then tap a cell or slot; equipment slots as a list, no
paper doll yet), spellbook (schools as tabs, cast reports a `CastEvent`
whose effects the runtime performs: healing now, the rest toasted), rest
(8 hours, wait until dawn), quest log and automap; town services (tavern,
temple, guild, trainer, shop) open from a house record; character
creation (`?create` in the dev build) makes the four sheets before the
world starts. Every screen's rows and actions come from a pure
`*-model.ts` with tests; the DOM is thin. An open screen pauses the
world, as MM6's books did. The dev party is the four test characters
(Alric the knight, Mira the archer, Tobin the cleric, Sera the sorcerer)
outfitted by `newGame`. Known: the dev build's mute button overlaps the
screen title; portraits are a text initial until the pipeline delivers
them.

## 15. Outdoor regions (generated terrain, 2026-10-16)

**Superseded 2026-10-19:** the owner scrapped the valley ("Scrap the
valley"); the senate's roadmap (`docs/ROADMAP.md`) proposes authored regions
on a 640 m grid instead, the desert going too, and lists what of this section's
code is kept and generalised. The text below records what was built.

Owner's ask: vast landscapes with ravines, serpentines, woods, passes, alpine
ridges, peaks, valleys and rivers, at near-real scale, with sprawling forests
of low-polygon trees; towns, caves, tunnels, waterfalls and deserts to
follow. Like the dungeons (section 11), nothing is hand-modelled: a region is
generated from a seed by `kernel/terrain/` and compiled by
`npm run level:build <id>` from `levels/<id>/terrain.ts`.

### 15.1 The valley

- A heightfield 1.6 km square at 5 m cells (`generateValley`): a river
  meandering south to north on a flat floor (bed −1.6 m, water at 0.7 m,
  banks at 2.5 m), convex slopes rising to crags and four peaks (ridged
  multifractal noise), a V-shaped ravine cut into the eastern slope, a
  serpentine road of nine control points climbing the western slope to a
  pass (a Gaussian saddle in the ridge; the road's grade is capped at 22°,
  never drops, and the land is cut or filled to match it within 22 m).
- Splat weights per vertex: path (within the road), scree (slopes over
  32°, full at 46°), snow (above 235 m, full at 268 m, thinning on steep
  faces), grass as the remainder. The material blends four Poly Haven
  textures (`leafy_grass`, `dirt_floor`, `rocky_terrain`, `snow_02`) by
  those weights, UVs in world metres from the shader.
- Forests: a jittered 5 m grid over a mask (slope under 30°, between the
  floor and 205 m, clear of road, river and ravine, noise over 0.1), 80 %
  of the candidates kept (about 9,500 trees, a Black Forest; 4.5 m and 90 %
  gave 13,000 and halved the frame rate for no visible gain, 2026-10-17);
  conifers above 110 m and a
  third of the rest, broadleaf otherwise. Four generated low-polygon
  models (about 110 to 200 triangles each: a lathed trunk with
  `pine_bark`; a three-tier pine, a five-tier spruce, a broadleaf with an
  ellipsoid crown and a broad flat-topped oak with `forest_leaves_02`),
  were the first forest; since 2026-10-17 the trees are the Meshy models of
  batch 003 (18 trees of five classes: pine, spruce, broadleaf, oak, palm,
  plus two bushes), each class drawn from its models by a hash of the
  position, scaled 0.85–1.15 about the catalogue height, carried in the
  sidecar as instances and drawn as thin instances in thirty-six regions:
  the full model within 260 m, the far copy to 700 m, nothing beyond; a cylinder per trunk in static
  physics bodies built lazily, one per 200 m cell the first time the eye
  comes within 60 m of it, so the load pays for none of them. The navmesh
  takes only trunks within 150 m of the road or the ravine: the full set
  made recast drop the road at the pass.
- Chunks: 32 cells per side, three detail levels (every vertex, every
  second, every fourth) with skirts wound outward and hung 12 m below the
  lowest border any level reaches nearby (round 15: 6 m inward skirts let
  the sky through the seams), so cracks between levels never show the sky; the loader enables one level per chunk by distance (2.2 and 5
  chunk widths). Quantized GLB (16-bit positions, 8-bit normals and
  colours), no stored UVs: 2.8 MB for the region, 230k triangles at full
  detail but under 100k on screen.
- Collision: the full-detail chunks as static mesh shapes. Navmesh: recast
  at 1.5 m cells, 1.8 m climb (one cell's rise on a 48° slope), agent 0.45
  m; the road is checked walkable from the spawn to the pass at build time.
- Light: a sun (direction, warm colour), a sky ambient, exponential fog
  thin enough to see 600 m with the far ridges fading; the sky dome from
  the `mm6-day` preset. No shadows, as in MM6.

### 15.2 The village (rebuilt 2026-10-17)

A ring of houses round a well is a diagram, not a village (owner: "don't you
dare put some houses in a circle and call it a circle"). The village is laid
out the way one grows (`kernel/terrain/village.ts`, `layoutVillage`):

- The road is its main street: it now starts beyond the farm at the river
  end, crosses the square and climbs toward the pass. The party wakes in the
  square looking back along the street.
- The square: the street widens to a dirt oval (34 × 24 m) with the well
  off the carriageway, a market stall, two lantern posts and a cart; the inn
  (the largest model, 20 m along the square's left side) and the trader's
  store across from it both face the square.
- Toward the pass: the stables beside the inn, a two-storey house and a
  cottage across the street with its woodpile, the smithy last (its noise
  and fire bother nobody; the forge glows in its arch), a wayside shrine
  where the road leaves.
- Toward the river: the temple on a 2.5 m knoll up a short lane, a cottage
  and a second cottage, then the farm: farmhouse on one side, barn across
  with its lane, two haystacks, a cart, and a fenced yard of twenty fence
  sections.
- Every door faces the street or its lane (a building's yaw is set from
  its side of the street). Models are the Meshy buildings and props of
  batch 004 (10.3), placed by their catalogue footprints; nothing here is
  generated geometry any more (`town.ts` is gone).
- Ground: the floor is levelled along the street with a 40 m soft edge, a
  dead-level pad (footprint + 2.5 m) under every building, and the knoll
  fades over 8 m; this runs after the road is laid so the road's cut cannot
  undo it. Dirt (the path splat) covers the square, the two lanes and an
  apron before each door; the ground between houses stays grass. The forest
  keeps 18 m clear of the village rectangle (156 × 72 m).
- Each building and prop contributes a footprint box to the navmesh, so
  bandits path round the houses; the party collides with the model itself,
  its triangles in the lazy cell colliders (15.1, 16.31), so it walks up to
  a wall or the well and under the eaves, not up to a box round them.
- Lights: the two lantern posts (warm, range 9) and the forge glow.
- Points: `square`, `temple`, `inn`, `store`, `smithy`, `stables`, `barn`,
  `farmhouse`, `cottage-01`… for teleports and tests. Tests: nothing on
  the carriageway, every building faces the street, no two overlap, pads
  level at the real cell size, the temple on its knoll.
- Not yet: doors that open into shops (the services screen exists; a tap
  on a building should open it), villagers, chimney smoke.

### 15.3 The cave mouth and portals

Rebuilt 2026-10-23 after the owner's phone screenshot of the first one from
Gullhaven's north road ("WTF is that shit?"): a box of stone on the slope, a
slab front with a hole, sloped planes for sides, a dirt slab before it and a
lit corridor inside. The first mouth (2026-10-16, at the valley's ravine head)
was that knoll: a stone-shored tunnel under four sloped quads, the terrain cut
6 m down under it, a warm glow at the back. Now (`kernel/terrain/cave.ts`):

- **Set into the slope.** The mouth faces down the hill and its tunnel runs up
  into it; in Gullhaven it faces heading 140 toward the north road's end, where
  at 225 it had run along the contour and shown the road its side. The floor is
  dug 3.2 m below the ground at the threshold point, so the hill stands round
  the mouth rather than a mound on it.
- **The ground drawn again, finer.** The terrain is a heightfield of 5 m cells
  and holds no hole, so a sheet of the terrain's own material on a 1.2 m grid
  covers 43 by 55 m round the mouth: it follows the land, is dug into an apron
  that falls gently from the floor (full across the mouth, running out over
  12 m down the slope and 11 m to the sides), and rises behind into a brow
  5.9 m over the floor, a little lumpy and higher on one side, that runs back
  into the hill. Its splat is the terrain's own (`splatAt` in `region.ts`), with
  dirt on the apron and the brown scree at the foot of the face and on the
  brow; its normals follow the coarse terrain's span where it only follows the
  land, and at its edges it sinks under the coarse ground, so it has no seam.
  The coarse ground is pressed under it (`press`): 0.4 m under the sheet, every
  vertex of a cell the tunnel touches below the floor, so no 5 m triangle rises
  into the tunnel. No tree grows on it.
- **The face.** The sheet is cut along the face line, 16.8 m wide, and the rock
  face fills the cut exactly: its outer edge runs through the sheet's own
  vertices, its inner edge is the arch's rim, and four rings between bulge into
  a lip over the arch, each vertex pushed by its own amount, flat-shaded, in the
  rock role. A floor of earth runs from the apron in under the arch.
- **The tunnel.** Ten rings of a 13-point arch (6.4 m wide, 4.5 m to the crown
  at the mouth, narrowing to 5.2 m and lowering a little toward the end), every
  vertex pushed out 0.12 to 0.5 m (the rim up to 0.75), closed at 17 m by a cap.
  Vertex colours carry the daylight that reaches each point, full at the rim
  and none ten metres in (`caveShade`), the ceiling a quarter darker, and a warm
  grey-brown (1, 0.9, 0.78) sets the painted rock beside Meshy's outcrops: from
  outside the tunnel reads as depth, inside only the party's torch shows its
  walls, and the end is black. There is no light inside any more. The outdoor
  visual carries COLOR_0 for this (Babylon multiplies a role material's light
  by it; the fences' are white), and the terrain material reads the sheet's as
  splat weights, as it reads the coarse terrain's.
- **The rocks.** Twelve of Meshy's rocks (`rock-outcrop-01`, `rock-boulder-01`
  and `-02`, `rock-cluster-01`, scaled 0.9 to 1.9 and turned) stand as the
  cheeks, a brow over the arch, slabs of bedrock (the angular block sunk to
  three fifths, its flat top having read as cut stone) and stones on the apron's
  edges and the slope, each sunk below the lowest ground under its footprint.
  They are props of the sidecar with the runtime's box colliders; the same boxes
  go into the navmesh, and a test keeps every one out of the tunnel and of a
  6.4 m lane 14 m out before the mouth.
- **Solid as drawn.** The sheet, the face, the floor and the tunnel's walls are
  the collider and the navmesh's, so the party walks the brow and the apron and
  stops at the rock where it is drawn, and the goblins below come up the apron
  and in through the arch (an end-to-end test).
- Portals (`PortalRecord`): a trigger disc with a target level and entry
  name, and an arrival point for the party coming the other way. The
  region's `cave` portal lies 4.5 m before the tunnel's end (clear
  of a navmesh cell's erosion), 2.4 m across so nobody walks past it along the
  narrowing wall, and leads to the showcase dungeon's `exit`;
  the showcase's `exit` portal at its spawn leads back to the region's
  `cave`, arriving on the apron 3.5 m out, facing out. A portal arms only once
  the party has stood 1.5 m clear of it, so arriving through it does not
  bounce the party straight back.
- The transition is a fade to black with a line of text and a fresh load
  of the page on the target level (`?level=<id>&entry=<portal>`); MM6 had
  a loading screen between maps too, and a reload keeps the level code
  simple. Party state does not yet survive it (the dev party is test
  data); the save module will carry it once screens exist.
- Build: the cave's visual and collider ride with the village's, the
  portal is a point in the reachability check, and `levels/<id>/level.ts`
  exports `portals` for dungeons.

### 15.4 The ravine brook and its cascades

- The ravine is a flat-bottomed gorge (26 m floor, walls rising
  parabolically to 75 m out) whose floor climbs 0.15 m per metre toward
  the head. A brook runs down its middle in terraces 60 m long
  (`kernel/terrain/stream.ts`): each terrace is a level pool 7 m wide in a
  trough cut 2.5 m under the water (shallowing to a 0.5 m sill at the
  lip, so nothing shows under the water from the terrace below), the water
  at the height of the banks at the terrace's foot, so it spills over the
  lip there, and sitting ever deeper below the banks toward its head, where
  the fall from the terrace above lands. Water surfaces are never drawn
  from below. A
  waterfall sheet (Phase 3's ribbon, shared with the dungeons through
  `kernel/elements/waterfall.ts`) joins each terrace to the one below,
  about 9 m high, and the lowest drops 5 m into a plunge pool 20 m across
  cut into the ravine floor near the valley. Eight cascades in the valley.
- Each pool is a water body with the Phase 3 material (reflection and
  refraction passes switch on only within the active distance), with flow
  down the gorge; each fall has spray, mist and its sound. The banks on
  both sides stay walkable, so the gorge is the road to the cave.
- Known limits: the 5 m heightfield makes the trough a V groove rather
  than a channel, and the planar texture projection stretches the scree on
  the gorge walls; a triplanar projection is the fix when the look pass
  comes.

### 15.5 The desert

- A second region, 1.6 km square (`kernel/terrain/desert.ts`,
  `levels/desert/terrain.ts`): dune fields as ridged noise elongated
  north to south with slowly varying height, three flat-topped mesas with
  steep sides, an escarpment rising to the eastern edge where the pass
  from the valley arrives, and an oasis: a bowl in the dunes with a pool
  in its floor and a ring of broadleaf trees. One road, allowed to descend,
  runs from the pass down the escarpment, across the dunes past the oasis
  and on to the mesas; its grade is capped at 20°.
- Regions are a `region` field in the terrain spec; the build (`buildTerrainLevel`)
  switches generators and every region carries its own terrain textures
  (role names for the material's four slots: sand, dirt, sandstone, and
  sand again in the unused snow slot) and its own environment (light,
  ambient, fog, sky, clouds) in the sidecar, which the runtime applies.
  Textures: Poly Haven `sand_01` and `sandstone_cracks`, CC0.
- The pass joins the two regions: the valley's `pass` portal at the end
  of its road leads to the desert's `pass` portal on its eastern edge and
  back, each arriving on the road a few metres in, facing along it.
- Not yet: creatures, ruins or a town in the desert; the oasis has no
  interior; the sky stays the valley's dome shape with warmer colours.

### 15.6 The far backdrop

- Beyond each region's edge a square ring of far mountains
  (`kernel/terrain/backdrop.ts`): about 5000 triangles reaching 2.6 km
  out, drawn with the terrain material (snow on the tops, scree on the
  steep) and never collided with. Its inner ring takes the map's exact
  edge height, giving way within 150 m to a profile averaged along the
  edge (a sharp ridge on the rim must not be extruded into a blade), rolls
  on for a few hundred metres, then climbs to ridged peaks (950 m in the
  valley, 260 m low hills in the desert, no snow there). The ring winds
  counter-clockwise like the terrain (a first version was wound inside
  out, so only the dark back faces drew). Openings: where the pass meets
  the edge the rim gives way to lower land (120 m below the saddle) and
  the ridges beyond stay low, so the pass looks out over the desert's
  plateau rather than at a wall.
- The fog is thinned to let it show: valley 0.0009, desert 0.0008 (from
  0.0017), so the far ridges two kilometres out read through the haze and
  the map's edge never shows as a cut. The fog colour is the sky's own
  horizon colour, so haze and dome meet without a band; the ambient is
  lifted (valley 0.46, 0.48, 0.54) so walls in shade still read.
- From a summit near the rim the inner ring's 34 m facets are visible as
  facets; a finer inner ring or a second detail level is the fix if that
  bothers on device.

### 15.7 Weather and motion (2026-10-17)

A still landscape reads as a photograph; these make it a place. All of it
lives in the one world shader (`src/render/materials.ts`), fed by a
`time` uniform and a `Weather` record (`heat`, `cloudShadow`) the dev
entry sets per region; no new render pass and nothing the phone measures.

- Wind: the leaves material sways. A vertex above a metre moves up to
  twelve centimetres in the plane, phased by its place in the world, so
  neighbouring crowns differ; trunks and everything else stand still.
  **2026-10-23 (owner: "Tie it to wind gusts"):** the sway follows the
  gusts you hear. The soundscape's wind loop has two gusts in sixteen
  seconds; `gustAt` reads its gain curve at the loop's playback time (a
  clock of its own until the phone's audio is unlocked, eased so the switch
  never shows) and the materials' `gust` uniform carries it: in a lull the
  crowns sway 8 cm, at a gust's peak 32 cm and lean 35 cm downwind. Only the
  size follows the gust, never the rate, so no tree jerks.
- Cloud shadows (`cloudShadow`, 0.6 in the valley, 0.2 in the desert):
  two octaves of value noise over world XZ, drifting with the sky's
  clouds, darken the light by up to a quarter where they pass. They fall
  on terrain, trees, houses and bandits alike.
- Heat (`heat` = 1 in the desert): what is more than 40 m away wavers by
  a pixel or two in the vertex shader (near geometry stays sharp, so it
  never reads as being under water); sand seen at a grazing angle more
  than 60 m off mirrors the sky's colour (the mirage, the silver "wet
  road"), and the sun glints off the dunes. The desert's sun hangs low
  ahead of the spawn so the glint and the sky's disc are in the first
  view, and a sand particle system of 500 small dim grains blows past
  the eye downwind (`dust()` in `src/world/particles.ts`).
- Sky: a hard sun disc, a tight corona and a wide glow at the light's
  direction, dimmed behind clouds.

Kept deliberately small (wow-idea review, 2026-10-17): no bloom or god
rays, canopy sway under 15 cm (35 cm in a gust since 2026-10-23), shimmer under 2 px, shadows never darker
than 0.55 and never hard-edged; the fog density stays as tuned so the
far ridges show.

### 15.8 Plans

A triplanar projection for the whole terrain (steep faces now use a
wall projection for the rock slot only); a desert town and dungeon when
Phase 6 content comes; creatures per region.

## 16. The shell as built (2026-10-17)

- **Loading veil** (`src/app/veil.ts`): a black cloth with the place's name
  in Pirata One and a thin gold rule that fills as the level, its paths and
  its people load; it lifts over half a second when the level is ready, and
  portal travel lowers the same veil with the destination's name. The dev
  chrome (stats box, sound test) shows only with `?dev`; Babylon's own
  unmute button is off; the version tag sits bottom left.
- **Fonts** (`npm run fonts`, `src/ui/fonts/`): Tinos regular, italic and
  bold and Arimo (Apache 2.0, its text in `LICENSE-Apache-2.0.txt`) and
  Pirata One for headings (SIL OFL, `OFL.txt`), woff2, 72 KiB in all,
  precached by the service worker; IM Fell English was the first body face
  (see below).
- **HUD band** (`src/ui/hud.ts`, DESIGN 9 realised): MM6's marble foot along
  the bottom of the view (the repo's `marble_01`), four cells each with a
  gold oval frame holding the member's class sigil in gold line art (sword,
  shield, bow, ankh, star, leaf; the owner's portrait art drops into the same
  frame later), the name on a plate in IM Fell italic, a green hit point bar
  and a blue spell point bar standing beside the frame with gold caps, and a
  condition gem above them (green good, yellow weak, red poisoned or
  diseased, grey out, black dead). A tap selects the member for the next
  blow; a second tap opens their sheet. The book shelf stands on the band's
  right end: leather spines with gold glyphs for Sheet, Items, Spells, Quests
  and Map, and a round gold button for Rest.
- **Status line** (`src/ui/status.ts`): MM6's one-line stone bar on the
  band's top edge, IM Fell italic in yellow. A tapped model is named there
  ("The Inn", "A Spruce", "The Village Well"), the fight is told there
  ("Alric hits Bandit for 7", "Bandit falls"), and so are falls, deep
  water, spells and rest. Nothing else pops up over the view; the dev
  panel's toasts are for development notices only.
- **Reach**: a sword reaches 3.5 m. A tap on a bandit farther off answers
  "Alric cannot reach Bandit" instead of killing it from across the field;
  a member with a bow equipped shoots at any range.
- **Sun**: a disc about a degree across with a tight corona (it was a fist).
- **Debug toasts** ("tapped chunk-14 at 3.2 m", "fell 0.6 m") are gone; a
  fall of three metres or more says "The party falls".
- The tuning panel no longer remembers the sky preset, ambient, fog scale or
  exposure between launches: the region sets those.

### 16.1 Creatures image first (batch 005)

`npm run asset -- batch creatures <name> <specs.json>` plans a creature or
villager from `{ id, height, prompt, set? }`: a text-to-image concept
(`nano-banana-2-lite`, A-pose, white background, background removed, the
pose and look appended from `CONCEPT_STYLE`), then image-to-3D, rig and
the clip set. A run stops after the images, which land in `pipeline/inbox/`
like an owner's, until `batch approve-images <n>`; the next run builds the
models. Batch 005: goblin scout, skeleton warrior, nomad raider (combat
set), a village man and woman (civilian set), 223 credits estimated.

### 16.2 Creatures and townsfolk in the world

- Monsters (`src/game/monsters.ts`): bandits on the valley road, goblin
  scouts at the forest's edge and up the gorge (level 1, quick, weak),
  nomad raiders on the desert road (level 3), skeleton warriors (level 3,
  slow, armoured) for the dungeons. Each kind loads its own model from
  `assets/characters/<id>/`; the kernel's spawn records name the kind.
- Townsfolk (`src/world/npc.ts`, `NPCS`): Greta by the well and Old Henrik
  at his farm gate. They idle, turn to face the party within six metres,
  and answer a tap with their next line in the status bar while the talk
  clip plays. No quests yet: the lines are the village's voice until
  dialogue lands (the audit's next step).

### 16.3 Day and night

The game clock runs while the party walks, a game minute per real second
(a day in 24 minutes; the rest screen jumps it). `src/world/daylight.ts`
turns the minute of the day into the sun's place (east at dawn, high in
the south at noon, west at dusk; dawn 5:00 and dusk 21:00 from the rules
layer) and a blend of three keyframes for light, ambient, fog and sky: the
region's own day, a warm dusk with a violet zenith, a blue night. The key
light never comes from below: at night a faint moon-blue from high up
keeps the slopes' shape. Stars come out in the sky shader as the day goes
(a sparse hash over the dome, never through cloud); the sun's disc sets
with the light. The village's lanterns and the forge glow come up as the
daylight fades (live lights scaled by the night) and the HUD band shows
the hour and the date in its left corner. Tested: dawn, noon, dusk and
two in the morning.

### 16.4 The soundscape

All synthesised through Babylon's audio engine like the impacts and the
falls (`src/world/soundscape.ts`): a wind loop of brown noise through a
lowpass whose cut-off and gain gust together over sixteen seconds, rising
with the party's height above the floor and stronger in the desert; birds
in the valley by day, three rising chirps placed up in the trees twenty to
forty metres off every four to twelve seconds; the party's footsteps every
0.78 m read from the ground under its feet (the terrain's splat weights on
the face under a ray: grass, gravel for path and scree, snow; stone on
walls and floors; a splash while wading), two takes per surface at a
slightly random rate.

### 16.5 Handcrafted (owner, 2026-10-17)

"Nothing AI slop; true handcrafted everything; 1998 artisanal UI." The UI
uses no generated or photographed texture: the marble is drawn in
`src/ui/stone.css` with turbulence filters (cloudy tone, thin wandering
veins, no tile seams), the crests, the shelf's glyphs and the ornaments
are hand-drawn SVG paths, and every edge carries the period's bevel: a
light top-left and a dark bottom-right line, gold rails as a bright line
over a dark one, sunken recesses for the cells, turned metal rings round
the crests, brass plates with engraved text, glass tube bars with gold
beads. Portraits stay crests until painted ones exist; no generated faces
(for party portraits superseded 2026-10-18: the owner makes them, DESIGN 12).

Period edges, period cost: every bevel is a hard line (`box-shadow` with a
zero blur, no `drop-shadow` filters), and the marble is painted once at
startup (`src/ui/stone.ts` rasterises the SVG to a 512² bitmap and hands
that to CSS). WebKit without a GPU had repainted the turbulence filters and
blurred shadows for whole frames whenever a panel changed, which stalled
the world for over a second after a screen closed (CI run 93).

### 16.6 Doors and the autosave

- A tap on the inn, the temple, the trader's store or the smithy within nine
  metres of it opens that house's service screen (`src/game/content.ts`:
  rooms and food at the inn, healing at the temple, goods at the store,
  arms at the smithy); farther off the status line names the house and
  asks the party to come to the door.
- The game state autosaves to the browser's storage (`src/app/autosave.ts`)
  when a screen closes, after a rest, before the party steps through a
  portal and once a minute on the walk. Arriving through a portal (or
  `?continue`) restores it, so the party, its gold, its clock and its quests
  cross between the valley, the dungeon and the desert instead of starting
  over on each load.

### 16.7 Talk and the first quests (2026-10-17)

- A tapped villager with a script opens the talk panel (`src/ui/dialogue.ts`):
  MM6's wooden window at the right of the view, the villager's living face in
  a square cut through the planks, their name and calling on a brass plate,
  their words beside it and the topics below in the yellow italic, Farewell at
  the foot. The world waits while they speak (the step is zero, as for a book)
  but the clips keep stepping, so the villager mouths the talk clip.
- The face is the model itself (`src/world/bust.ts`): a second camera held
  before the eyes renders the character alone into a 256² texture each frame,
  and a Babylon `Layer` composes it onto the view inside the window before the
  retro filter, so it dithers and posterises like the world. No portrait is
  generated or photographed (16.5); MM6 played film loops of its faces, ours
  turn to the party and talk. A layer samples its texture by screen position,
  so the texture matrix maps the window's span back onto the whole texture.
  While the panel is open the villager keeps the talk clip between lines, and
  the camera reads the head bone where this frame's pose puts it (16.32).
- Dialogue data (`src/game/dialogue.ts`): a greeting and topics of three kinds,
  plain talk, rumours told in turn (the turn kept in the state's flags) and a
  quest, which carries its own stages: the offer takes the quest, the active
  line adds the count so far, the ready line feeds the quest log the talk
  event, ends the quest and pays the reward, the done line closes it. The
  greeting changes when the party comes back with news. The view-model
  (`src/ui/dialogue-model.ts`) is pure and tested.
- First quests (`QUESTS`): Henrik's Sheep, three bandits on the valley road for
  150 gold and 300 experience; Goblins at the Forest Edge, two goblin scouts
  past the smithy for 80 gold and 150 experience. A kill now pays the
  monster's experience to the party (14.3) and feeds the quest log; the status
  line reports the count and the next objective; the quest log screen lists
  the quests with their objectives.
- Villagers without a script (none yet) keep their line in the status bar.

### 16.8 The press, the leather and the type (owner, 2026-10-17)

"The buttons, how they move when pressed, the inventory, the colour, the
font: everything needs to be wow."

- Every button clicks on the finger's touch, not the release (`src/ui/press.ts`,
  one listener on the UI layer), a dry wooden tick synthesised like the
  impacts (`src/app/audio.ts`). The CSS gives the travel: a gold button goes
  down a pixel and its bevel turns over, light below and dark above, the gold
  a shade deeper; a book spine pushes two pixels into the shelf; a HUD cell
  sinks; a topic line dips. No fades, no glows: 1998 moved things.
- The inventory's grid is MM6's hide: a mottled dark leather drawn in
  `leather.css` with turbulence, painted once, orange cell lines, a dark rim
  pressed into the top left. Items carry hand-drawn line art per kind
  (`src/ui/glyphs.ts`: sword, cuirass, shield, helm, boots, belt, cloak,
  gauntlets, ring, amulet, phial, scroll, pouch) in gold stroke on the leather
  tile, until an artist paints the pieces; the two-letter marks are gone.
- Type: the house italic is a size larger (16 px), and the labels are in a
  yellow of their own beside the brighter values, as MM6's sheet set every
  line in yellow italic rather than cream and gold.

### 16.9 Spells you can see (2026-10-17)

- A cast from the book pays its points (14.5) and the runtime performs the
  effects (`src/dev/index.ts`, `performCast`): a bolt spell (Fire Bolt, Sparks,
  Spirit Arrow) leaves the book, the hand throws one bolt per count from
  beside the eye at the living monster nearest the middle of the view within
  40 m and a 28° cone (`src/world/spell-target.ts`, tested), and each bolt that
  lands rolls the spell's dice against the monster, with the hit feedback of a
  blow (14.4); a bolt with nothing in the cone flies out 45 m and dies.
- The bolt (`src/world/spellfx.ts`) is a glowing core, a point light of its
  school's colour through the retro materials, a particle trail behind it and
  a burst where it lands, all Babylon particle systems, posterised and
  dithered by the same filter as the world. Each school has its palette.
- Torch Light brightens the party's torch, whiter, steadier and farther, by
  rank for an hour per skill point (`Torch.brighten`); Stun throws the nearest
  monster within arm's reach back and holds it reeling (`Monster.stun`); the
  heals, cures and afflictions change the member. Jump and the lasting buffs
  spend their points and say plainly that they take no hold yet, until the
  buff system lands (PLAN 5b step 14).
- The cast has its sound, a rising sweep with a shimmer of noise, synthesised
  like the impacts.

### 16.10 The paint shop and the bitmap type (owner, 2026-10-17)

"The text and fonts in MM6 are pixelated with heavy aliasing"; "the marble
in MM6 is defined and hand painted, yours is generative noise"; "every
button and element needs to be artisanal like someone from 1998 drew it by
hand."

- The grid: the shell had a pixel of 1.5 CSS px (`PX` in
  `src/ui/pixel-text.ts`), so the 932 px phone screen was 621 columns, MM6's 640;
  since 16.29 it is one CSS px, the view's own. Everything painted is drawn at that
  grid and shown pixel for pixel (`image-rendering: pixelated`).
- The paint shop (`src/ui/paint.ts`) paints every surface once at startup as
  a painter would: a base coat, dabs of a wide brush, veins or grain drawn
  stroke by stroke, a knot or a scuff here and there, then the whole
  posterised into a short ramp of tones warm and cool, as an 8-bit palette
  did. The marble (cream to rose, grey-brown veins with a pale edge), the
  sheet's grey-green stone, oak planks with grain lines and seams, the
  inventory's hide, parchment with its fibres. The strokes' jitter comes
  from a seeded die, so every build paints the same picture; nothing is a
  turbulence filter any more. The CSS variables `--stone`, `--stone-dark`,
  `--wood`, `--leather`, `--parchment` carry the bitmaps and their sizes.
- Buttons are painted ovals per size: bands of gold light above and dark
  below, a highlight crescent at the top left, a darker recess for the
  label, a black rim; the pressed face turns the bands over and dulls the
  gold. A ResizeObserver paints each `.ui-btn` as it appears (`--btn-up`,
  `--btn-down`); the shelf's spines stay leather.
- The type is bitmap (`src/ui/pixel-text.ts`): every run of text in the UI
  layer is painted onto a canvas at the grid, the alpha cut hard, a dark
  shadow one pixel down and right, pale ink; dark ink on gold casts none.
  Words stay separate canvases in a span so the browser still wraps lines,
  and a MutationObserver repaints whatever the screens change. The dev
  chrome is marked `data-native` and stays smooth.
- The body face is Tinos (Steve Matteson, Apache 2.0): a Times-metric serif
  with lining figures and a true italic, given a hair of stroke so it holds
  at 13 pixels, which is what MM6's bitmap font was in spirit. IM Fell
  English clogged at that size (old-style figures, thin strokes) and is
  gone. Headings stay Pirata One at 18 pixels. Sizes in CSS are set in CSS
  pixels (19.5 for 13, 18 for 12, 27 for 18) and the painter clamps upward.
  The quest log alone is set in Arimo (Steve Matteson, Apache 2.0), Tinos's
  sans sibling, as MM6 sets its quest text in a sans (round 16).
- The HUD's pieces are painted too, each at its own size through
  `data-paint` and the same observer: the portrait frame a turned gold ring
  round a leather recess under glass, the brass plates of the names and the
  clock, the glass tubes and their green and blue fills, the condition gems
  as beads lit at the top left, the shelf's leather spines with gold bands,
  the fluted pillars over the marble, the volutes cut as pixels. The sigils
  and glyphs, inline SVG, are drawn with `shape-rendering: crispEdges` so
  their strokes carry no anti-aliasing either. Left smooth: the gold rails
  and bevels, which are already single CSS lines.

### 16.11 The first phone pass (owner, 2026-10-17)

The owner opened the dev build on the phone: "abysmal", "ultra low
unplayable fps in the village", the horizon rolled thirty degrees against
the band, dither static over everything, the shaded sides of the houses
pure black, the sky in purple and cyan bands, the talk window showing the
hillside instead of the face, the sheet's skill names cut short. Each cause
found and set, in `src/render/filter.ts`, `grade.ts`, `resolution.ts`,
`src/world/water.ts`, `level.ts`, `combat-feedback.ts`, `bust.ts`, and
`src/ui/dialogue.ts`:

- The roll: the hit shake added its roll to the camera each frame instead
  of setting it, so a stale roll was never undone; it is set absolutely now
  and left alone while the world is paused.
- Static: dither off (0) and the posterise step finer (8 levels, was 5),
  which also takes the bands out of the sky. The posterise still gives the
  flat 8-bit tones; the dither was reading as noise on a phone's pixels.
- Black shade: the outdoor ambient lifted by half, so the shaded sides keep
  their colour as MM6's did.
- The frame: measured at 2.7 million triangles a frame where the main pass
  draws 690 thousand; the two mirror passes of the river and the pools
  tripled the scene. Outdoors the water now draws its flat painted texture
  with no reflection or refraction pass, the bloom pass is off, the
  default preset is 540 lines (`lines-540`), and the forests draw to 180 m
  (far 450 m). The dev overlay prints draws, active meshes, triangles,
  render-target count, particle systems and frame and render milliseconds
  so the next phone shot carries its own numbers.
- The talk window: a bounding box is reported in viewport pixels and the
  rotated phone layout turns it a quarter; `toLocalRect` and `toAppPoint`
  (`src/app/orientation.ts`) now map both the mask hole in the planks and
  the bust layer on the canvas into the rotated frame.
- The sheet: the raise buttons are a bare "+" and the cost moved into the
  rank line, so the skill names have their room; the name column wraps.

### 16.12 The critic loop (owner, 2026-10-17)

"I thought you had agentic critics? You need to run these critic-feedback
loops till they say it's on the same hand-painted feel and level as the
original MM6 reference shots." Each round: the dev build is captured at one
UI pixel per image pixel (the village with the HUD, every screen, the talk
panel) beside crops of the MM6 shots at one game pixel per image pixel
(`artwork/reference`), and three critics with no other context, one each
for the HUD, the screens and the talk panel with the world, score every
element from 1 to 10 against MM6's craft and rank the changes. The reports
are kept with the session's scratch; what they said and what changed is
logged here.

Round 1 (build 0695715): 2.5, 3 and 3 out of 10, "bordered boxes with a
gradient filter", "a themed web UI with a noise filter", "a smooth 3D scene
wearing a posterise filter". What they named, and what the paint shop
(`src/ui/paint.ts`) now does:

- One gold, one light: a seven-swatch bronze-gold ramp (`GOLD`) for every
  rail, ring, plate, fillet and button, and every bevel lit from the top
  left, a recess the other way about. No CSS hairline stands alone.
- The marble was a cool three-tone clouds filter: now warm putty in eight
  tones, mottled at the scale of a thumb, with one-pixel diagonal branching
  veins each carrying a pale halo, tiled through the band, the pillars and
  the screens' frames.
- The clock's LCD-looking numerals and the ochre name plates: now gold
  serif in near-black recessed slots, as MM6 set its numbers.
- The cells: recessed dark-grey plates with a one-pixel bevel; the portrait
  an oval opening in a turned gold ring three pixels wide (the owner's
  "gold frames"); the corner curls gone.
- The tubes in recessed slots with a stone cap, the cylinder in MM6's dark,
  mid and bright stripes, no gold brackets; the gems beads in sockets with
  a white speck.
- The shelf: an alcove under an arched marble lintel that shadows the book
  tops, cylinder-shaded spines with crimson bands between gold fillets,
  the emblems gilded (gold strokes over the same strokes a pixel down in
  bronze), the rest button a gold cartouche in a dark socket with the moon
  stamped dark and lit from below.
- The pillars sixteen pixels wide, shaded as cylinders in five bands with
  capitals and plinths ringed in gold; a painted rail along the band's top
  and under the lintel.
- Buttons: the gold shaded round a hot spot a third in from the top left
  to bronze at the bottom right, pressed the other way; buttons too wide
  for an oval (the rest screen's) are dark red-brown slabs with a bevel
  and cream lettering, as MM6's were, never a stretched oval.
- The screens: the slate repainted as fine grain with soft diagonal
  smudges, no scribble lines; a marble frame nine pixels wide painted at
  the panel's size with the slate recessed into it; every inset box a
  two-tone engraved bevel instead of a gold line; titles in the yellow
  italic as MM6's (blackletter kept for banners to come); rust inventory
  lines; the sheet's hit point line a painted tube in a slot.
- The talk panel: the frame a mitred bevel with a glint and a shadow where
  the planks meet the glass; the plate a brass bar with a highlight band,
  a dark lower bevel and rivets, the name engraved (`--engrave: 1` paints
  a pale line under each dark stroke); planks with staggered ends, nails
  and knots; the face on a flat dark umber ground, cropped tighter.
- The sky (`src/render/sky.ts`): the blue field in five flat bands and the
  cloud field cut hard into cumulus with a lit edge toward the sun and a
  grey underside, so the screen posteriser has no gradient to turn into
  contour blobs.

Round 2 (build fb155e7): 3, 3 and 3. The gold went too far and the veins
read as cracks. What they named, and what changed:

- MM6 edges everything with stone, a dark line over a cream one; gold is
  for rings, capitals and buttons. The gold rails are gone; the band and
  the lintel carry stone lips.
- The marble's one-pixel veins read as cracked flagstone: now broad clouds
  of a wide brush and soft veins two to four pixels wide, quantised to
  nine warm tones, as a 1998 scan of a slab. The slate is smoke patches
  with a few hairline cracks, the leather rust mottling at the scale of a
  thumb, the parchment broad stains; no grain, no speckle anywhere.
- MM6's portrait frame is an oval cut from grey stone, lit cream at the
  top left, with a wire of gold inside, and white for the member in hand;
  it sits in a panel of the marble sunk a step, not a grey box. So do ours.
- The tubes: a pale highlight, a saturated core (MM6's green and cobalt), a
  dark edge, a light cap, in a navy well lit at the lower right; the fourth
  member's tubes had been hidden under the shelf, which now stands inside
  the band. The wells slate, not black, so the gold's shadow shows.
- Spines chocolate to umber with a bright rim along a rounded top, maroon
  bands ruled with gold, the emblems in relief (bronze below, cream above);
  the alcove a warm dark recess; capitals as an abacus over a flared bell
  and plinths as two steps, each with a three-tone gold ring.
- Buttons as MM6's: a black outline and five bands top to bottom, pressed
  uniformly brighter; wide buttons stone insets with dark lettering.
- The body type white (`#f4f0e2`) at 14 pixels with its hard shadow,
  values and modifiers white, headings yellow, no underline rules, no hit
  point bar on the sheet; the boxes' bevels near-white and near-black with
  a mid rim, their faces darker. The panel replaces the view only, the
  portrait band stays, as MM6 kept its rail.
- The talk panel: MM6's wood is dark oak standing on end; the planks are
  repainted umber to near-black with long irregular grain, no seams or
  nails, and the panel has no gold border. MM6 set the villager's name in
  cyan on the wood, with no plate; so do we. The face has a key light of
  its own (`RetroMaterials.setKeyLight`, on the subject's materials only),
  warm from the camera's upper left, over a near-black ground, with the
  fill down to 0.3.
- The spellbook and the quest log are open books (`paintBook`): a leather
  cover with brass corners, two pages meeting at a shadowed gutter, the
  stack stepping out below and right, and a carved stone banner for the
  quest headings in the blackletter.
- The sky's clouds stretched along the wind, ragged at the edges and
  dithered there as a 1998 painter did, the sun's disc gone; the far ridges
  fade into the sky's own horizon colour instead of a lavender haze.

Round 3 (build after fb155e7, the stone-edged shell): 3.5, 3 and 3. The
critics now asked for what a painter's hand leaves that a rule cannot, and
for the world itself. What changed:

- The marble in three passes, as a 1998 scan: clouds of a wide brush, a
  fine grain of near-white and oatmeal, soft veins that fade in and out
  with broken pale threads beside them; twelve tones, ivory to grey-pink.
  The slate likewise: clouds, a one-pixel speckle, broken pale veins; the
  leather dark cordovan with a directional grain.
- The portrait ovals without the gold wire: a thread of white light along
  the upper-left inner edge (white for the member in hand), a chip or two
  in the stone; the wells without bright lips; the tube wells with a gold
  cap at the base; the spines with raised bands and the neighbour's shadow
  down the left; the pillars with MM6's own shading (a dark edge, an
  off-white band a third in, falling to dark); capitals as an abacus over
  a bell with a volute at each corner, plinths as two steps, both with a
  six-row gold collar; the rest button a domed coin on the marble beside
  the alcove, not between the books; the band's shadow falling onto the
  view.
- The screens' frame as a carved architrave: a fluted pilaster down each
  side, a block at each corner, the top rail casting a shadow onto the
  slate; the box bevels two pixels deep; no headings inside boxes (MM6 has
  none); the body type thinned to one-pixel stems; the member in hand's tab
  in the brighter gold with dark ink; wide buttons MM6's dark green slabs
  with white lettering; the books with eight page edges, curled corners,
  cloth tabs and a faint engraved rose-compass watermark; the automap on
  the book too, its debug caption gone; no point bars anywhere.
- The talk panel: oak from near black to orange-tan with a heavy speckle;
  the topics cream, yellow only for the one asked, as MM6's; no rule under
  the words. The face: a keyed material is also painted
  (`paint` uniform in `src/render/materials.ts`): its light quantised into
  three flat tones and its colour deepened, so the head reads as a
  portrait and not a render.
- The sky as MM6 painted it: an ultramarine field in flat bands and cirrus
  brushed level across it, mapped on a cylinder so the strokes run along
  the horizon, ragged at their edges, dithered along their undersides,
  thinning toward the horizon; no sun disc.
- The world's textures painted (16.13), the ground texels at four metres a
  tile, the sun harder (ambient 1.15, light 1.15) so each box has a lit and
  a shaded face.

Round 4 (the build of 16.13 with the painted world): 3, 3 and 3. The
automap now draws in sepia ink on the book's page. Where the loop stands
after four rounds: the HUD went from 2.5 to 3.5 and back to 3, the screens
and the talk panel held at 3. The critics' asks have begun to contradict
one another between rounds (a gold wire on the frames, then none; grain in
the marble, then none, then "fine grain"; heavier type, then thinner;
plank seams, then a seamless slab; real-time shading, then none) and what
remains on every list is artwork, not painting rules: portraits painted by
hand per villager, item sprites spanning cells, a paper doll, embossed
emblems, Corinthian capitals, a one-bit bitmap face cut by hand, tree
billboards, baked building faces, screens laid out to fit without
scrolling and without tabs. Those are the owner's call: they are days of
pixel art or purchased sprite sets, not another pass of the brushes here.
The loop is paused at this build for that decision.
The owner answered the same day with free rein over anything, the brief
"looks just like MM6": round 5 is the world (16.14) and the shell
(16.15).

### 16.13 Painted textures (2026-10-17)

The world's textures were photographs: the CC0 scans of `npm run textures`
(ashlar, planks, grass, a path) at 256 pixels, which under the posteriser
read as "smooth 3D with a filter" (critics, round 2) and sat oddly beside
the rule that the shell uses no photographed texture (16.5). MM6's ground,
walls and roofs were small bitmaps a painter speckled and ruled by hand.
`src/world/painted-textures.ts` now paints every material role at startup
with the shell's brushes (`src/render/brush.ts`, shared with the paint
shop), 128 pixels to a tile, sampled nearest so the texels show:

- Grass, dirt, sand, snow and scree as fields of specks over soft blobs in
  four or five tones; the dirt with pebbles, each a dark dot with a lit
  crown.
- Flagstones and ashlar drawn stone by stone on a grid: mortar between,
  every stone its own tone, lit along its top and left, in shade along its
  bottom and right, a chip or two of wear; the ashlar and sandstone in
  running courses, the flagstones staggered.
- Planks as boards with grain lines and knots; bark as vertical ridges;
  plaster as cream with broad soft patches and a hairline crack; rock with
  the beds of a cliff running a little downhill; iron as plates with seams
  and rivets; a cool white marble; a moulded trim; leaves as clumps over
  dark gaps.

The role's metres per tile stay as the manifest had them. The CC0 files
remain in `assets/textures` for the pipeline's record but nothing loads
them; a later cleanup can drop them.

### 16.14 The world as sprites and bitmaps (owner, 2026-10-17)

Round 5 of the critic loop, under the owner's free rein. The outdoor
critic's list was the renderer's, not the painter's: a smooth-shaded 3D
world under a filter is not a 1998 one however its tiles are painted.
MM6 drew trees as sprites, lit its ground flat, painted its sky once on a
strip, and skinned its models in a few hundred texels. So:

- **Tree and bush sprites** (superseded 2026-10-23, below: trees and bushes
  are real 3D models again, a full model within 180 m and the far-detail
  copy to 450 m). Each
  Meshy tree is drawn once from the side, orthographic, into 128 pixels
  under its own light (a key from the picture's upper left over a grey
  fill, no fog, no wind, no lanterns), quantised to ten tones a channel,
  and a quad cropped to the painted pixels stands in for every instance:
  the vertex shader's `BILLBOARD` path turns the quad about its foot to
  face the eye, `ALPHATEST` cuts the air away. The scene's light and fog
  then fall on the finished sprite as on anything else. The forest's
  thousands of trees cost two triangles each and the model's own picture
  is the art; no far models (`far: null`). **2026-10-23:** the sprite keeps
  the model's own colours. The repaint of rounds 9 to 16 (every leaf into
  MM6's six greens by rank, the lowest 35% of a sprite into bark browns)
  turned the owner's dead trees and the birch's bark green and the willow's
  and larch's feet brown, and the palette snap below took the light
  yellow-greens to tan; both are gone for trees and bushes (their skins and
  sprites skip the palette), and the sprite's tint is a grey 0.76, not
  green.
  **Superseded the same day** (owner: "If we have these expensive textured
  3d models we should do real 3d"): the sprites are gone. Every tree and
  bush is drawn as its model, thin-instanced per region like the rocks and
  houses, the full model within 180 m of the eye and the far copy (`<id>.lod.glb`,
  a third of the triangles) out to 450 m, swaying in the wind. Gullhaven's
  1,027 trees cost about 300k triangles in its busiest views against 20k to
  50k as sprites, with the same draw calls (about 125); the iPhone 14 Pro
  Max carries that, and `?dev` shows the frame rate to check it there.
  Their skins keep their own colours (no palette snap), lit as other models.
- **Bitmap skins** (superseded 2026-10-23, owner: "Building look like shit. You've
  overdone it with the filtering": the models' skins are 1024 pixels for a house and 512
  for the rest, JPEG, from Meshy's own downloads, and the runtime keeps their colours at
  thirty-two tones a channel with no grain, no palette snap and no speckle; the walls lit
  flat as before, a fifth darker). Every loaded albedo (houses,
  props, characters) is read back from the GPU's own mip level nearest
  the target (512 pixels for a building or a townsperson, 256 for a
  creature, 192 for a prop; round 15: townsfolk and buildings in sixteen
  tones with a grain, the rest ten), posterised to ten tones a channel and re-uploaded as a
  nearest-sampled bitmap, once per source file. The texels show and the
  shading steps as a painter's did.
- **A painted sky strip** (`paintSkyStrip` in `src/render/brush.ts`). The
  sky is one bitmap, 4096 by 512, wrapped round the horizon and sampled
  by azimuth and height: sixty long strokes at every height, ragged along
  their tops, a few small cumulus; the red channel the cloud's density
  (cut at a threshold the weather sets), the green its tone, lit top,
  body, shaded underside. The far backdrop ring is off; the sky's bands
  and the fog colour meet the hills.
- **Light in steps**. Every material quantises its light into five tones
  (`toon`), so a face is lit or in shade with no gradient for the
  posteriser to smear; the terrain is lit nearly flat (`ndl` mixed 35 %
  toward 0.8), as MM6's ground was, the slope showing only a little.
- **Hard pixel grain** (`grain` in `brush.ts`). The ground tiles are no
  longer soft dabs: clods a tone up or down, then single pixels and short
  dashes in every tone of the ramp, snapped to the ramp, ten metres to a
  128-pixel tile for grass and dirt. The ground samplers take a mip bias
  of -1 so the grain shows down the road, at the price of a little
  shimmer far off, as in 1998.
- The posteriser at 12 levels (was 8), to keep the ramps' tones apart.

Two bugs found on the way, both of which had hidden the painted world
since 16.13: a dynamic texture clamps at its edges unless told to wrap,
so every painted tile had shown one corner texel over the whole ground
(the smooth brown wash the critics saw); and the sprite read-back had not
been awaited, so every sprite was built from an empty buffer and the
quads, scaled by the catalogue's normalising factor a second time, were
268 metres wide and filled the frame with invisible fragments (3.3 s a
frame in software, "0 fps" on the overlay). A sprite is now measured in
the catalogue's metres and cropped to its painted pixels.

### 16.15 The shell as MM6 built it (owner, 2026-10-17)

Round 5's shell pass, the HUD critic's and the screens critic's lists
taken as read against the MM6 shots rather than argued with:

- **One sunk band.** The four cells and their name plates are gone. The
  band is one dark umber trough (`trough` in `src/ui/paint.ts`) across
  the marble, a marble pilaster between each member and at the ends
  (`pilaster`), as MM6's. The frames grow to 36 by 48 pixels; MM6 named
  nobody in the band and neither do we, the name is on the sheet and in
  the cell's label for a screen reader.
- **Tubes in a trough with a brass foot.** The point tubes stand in a
  near-black well with a four-course brass foot; the gem above them is
  nine pixels with a two-pixel spark.
- **The clock on a stone tablet**, the hour engraved into the marble
  (pixel-text's `--engrave`), not gold on black.
- **Acanthus capitals.** The pillars' capitals carry three leaf lobes,
  each a pale tongue with a dark edge, a vein and a shaded half, in place
  of the volutes.
- **Emblems in solid gold with an outline**: the shelf's glyphs filled,
  stroked gold, the same strokes wider and dark beneath.
- **Members by portrait.** The sheet, the inventory and the spellbook have
  no tab strip: a tap on a portrait in the band selects that member and
  the open screen turns to them (`onSelect` on the HUD's hooks, wired in
  `src/dev/index.ts`). Town services keep their member tabs, since a
  service screen belongs to a house, not a member.
- **Close as a glyph**: a cross in dark ink on the gold oval, labelled
  for a screen reader, no word.
- **Books with boards**: the cover's thickness drawn as a raised ridge
  four pixels in, the cloth tabs full size, the corner ornaments a
  stepped gold angle with a boss; the rose-compass watermark gone.
- **The talk panel on one slab of mahogany** (`--mahogany`): long slow
  grain in eight reds and browns, no boards, no seams; the frame a
  two-tone bevel tight on the wood; the name alone under the window.

Not done, and said so: portraits painted by hand, item sprites spanning
cells and a paper doll remain artwork the owner commissions; the rest
screen's landscape inset and hourglass wait on that art too.

### 16.16 Round 6: the critics' measurements (2026-10-17)

Round 5 scored 3 (HUD), 3 (screens), 4 (talk) and 3 (world), verdict no,
but for the first time the critics measured the originals pixel by pixel
rather than describing them, and their measurements contradicted the
previous round's words: MM6's band is light marble with each member in a
recessed rectangle and no trough or pilaster at all; its stone is a mid
grey with blotches and dark veins, nothing green; its pages are a greyer,
cloudier parchment; its day sky is a dusky blue of low saturation with
cream clouds; its dirt is near-black cracked earth; its talk panel is a
near-black wood. Round 6 follows the measurements:

- **Marble** repainted darker and greyer (twelve tones from 46 to 206,
  warm and cool drifts), long diagonal dark veins with a one-pixel
  falloff, the pillar shafts and the band with it.
- **The band** back to recessed rectangles on marble (one-pixel dark
  outline, one-pixel light line inside, the marble a shade darker within,
  marble gutters between), the trough and pilasters gone. The tubes six
  pixels wide with gold caps top and bottom and a light centre stripe,
  both in one recessed slot; the clock a recessed plaque with bold gold
  numerals; the capital a dark carved silhouette, twenty-four pixels tall,
  overhanging the shaft, with volutes and leaf tongues in deep shadow; the
  shelf a plain dark recess with a one-pixel border; the spines mottled
  leather with gold-red-gold bands at 15 % and 85 %; the emblems thin gold
  line art again.
- **Screens**: the stone a mid-grey marble with blotches at three scales
  and dark veins; the boxes cut with a two-pixel near-black groove above
  and left and a light line below and right, nearly touching; no title
  band, the title on the stone beside the exit oval; gold ovals with a
  radial glint in their upper-left third, a black line and a darker
  lower-right rim; pages a cloudy, greyer parchment in six close tones,
  the left edge darkening, three stacked page edges below, no cover band
  above; parchment tabs full size with a chevron edge and a shadow;
  headings as white script on a ribbon with rounded ends.
- **Spellbook**: spells as grey ellipses in a grid, the name and cost on
  each; the Target row gone: a spell on one member waits for a tap on a
  portrait in the band (`claimPortraits` on the screen context, routed by
  `Screens.pickMember`), as MM6 cast its buffs.
- **World**: the day a dusky low-saturation blue with cream clouds, the
  horizon only a little paler, no haze band; the clouds' tones closer so
  no edge reads as an outline; dirt as near-black cracked earth with
  fissures, grass a dark olive, both at fourteen metres a tile and sampled
  without mipmaps so the foreground blows up into blocks; props and
  buildings lit flat (`flatLight`), so no posterised band crosses a curve;
  sprites baked under a flatter light and tinted toward MM6's dark green.
- **Talk**: the wood near black with a fine high-contrast grain and
  knots; the window a two-pixel dark-grey bevel, no gold; the face closer
  (a fifth of the model's height in frame) on a warm dark ground; the name
  in MM6's blue.

### 16.17 Round 7: measured again (2026-10-17)

Round 6 scored 4 (HUD), 4 (screens), 5 (talk) and 3 (world), verdict no,
every shell score a point up on the measurements. Round 7 follows the
next set:

- **The view in MM6's own colours.** The retro filter's default is now
  the palette mode: the 256-colour look-up table that `tools/palette.ts`
  built from the 3D viewport of the reference shots (`public/filter/
lut-mm6.png`, since Phase 1, never the default until now). Every frame
  is quantised to the colours MM6 used, which is what "quantise
  everything" meant.
- **Marble as figure, not line**: the HUD marble in sixteen tones with
  soft diagonal streaks three to six pixels wide, lighter and darker, a
  pixel-wide grain over it; the pillars lit at the left edge sliding to
  shade at the right; the band one continuous surface with a seam of a
  dozen lum steps round each member; the oval a seven-pixel grey stone
  bevel in MM6's measured tones, never white; the tubes six columns of
  MM6's greens and blues on the marble with a shadow at the left and a
  highlight at the right, no well; the clock a grey recess with yellow
  numerals; the spines near-black leather with dark-red bands and a gold
  line; the emblems filled gold silhouettes spanning the spine (a sword,
  a satchel, an open book, a scroll, a compass rose); the shelf a light
  lip over a black shadow with a ledge below.
- **Screens**: the stone speckled and blotched with no linework in
  sixteen greys; boxes carved with three lines inside their top and left
  and nothing outside; pure white type with a black shadow and pale
  lemon titles; the spell slots outline-less ovals a dozen steps darker
  than the page; the wide buttons marble slabs with a one-pixel bevel;
  gold ovals blooming to near white; inventory cells thirty pixels, dark
  leather with grain, a rust line and a near-black shadow right and
  below; the gutter darkening forty pixels each side; the rest screen on
  a rose marble.
- **World**: the hills grass with dirt scars, scree only on cliffs and no
  snow (the valley rebuilt); the clouds one soft run from a beige-white
  top to a violet-grey underside with no rim; the blue never above MM6's
  measured dusk; fog thinner; walls at a thousand texels and a darker
  plaster; the ground back on mipmaps (a magnified texel is a block
  either way, and without mipmaps the distance was colour noise).
- **Talk**: the wood's highlights raised toward MM6's chestnut with
  knots; a thin dark-gold line round the face over black with a harder
  key; "Greta the Goodwife" in MM6's blue.

### 16.18 Round 8: surfaces as clouds (2026-10-17)

Round 7 scored 3 (HUD), 4 (screens), 5 (talk) and 4 (world), verdict no.
All three critics measured the same thing: MM6's shell surfaces are
soft, warm, hundreds of levels deep, the marble a luminance spread of 24
to 45 with veins as smudges, the sheet stone a 14-step mottle of
olive and blue patches, the page a 25-level cloud, the leather a 2 to 4
pixel mottle; nothing is a ramp of tones. The posteriser was the wrong
model for the shell (it stays right for the world's tiles). Round 8:

- **`cloudy` in `src/render/brush.ts`**: tiling value noise in octaves
  of a period and an amplitude, a slow per-channel tint, a pixel of
  grain; `smudge` lays soft wide strokes over it. The HUD marble
  (159,151,148), the frames' and pillars' darker marble (122,113,108),
  the sheet stone (74,72,68), the page (200,190,172), the rose
  (174,123,100) and the inventory leather (35,12,2) are all clouds now,
  to the critics' bases, spreads and periods.
- **HUD**: the oval in MM6's bands from the marble in, with the gold
  thread and the lit member's thread brighter; a gold rail across the
  band at the ovals' top; the blue tube a cylinder in MM6's six tones,
  the empty glass neutral, matte caps, the tubes seventeen percent of
  the screen tall; the gem a soft blob beside the oval, no bezel; the
  pillars lit at the left and in shade at the right through the marble's
  grain; eight-row matte bands with one highlight row; the clock a brass
  plaque with dark serif numerals; the gold a bronze with a light lower
  rim; the emblems line art in MM6's two golds.
- **Screens**: the right page a hard step darker, the gutter one line;
  spell ovals the page's own mottle a dozen steps darker; the rest
  screen's choices rose-marble slabs with MM6's bevel and white text in
  a plain column; quest headings over a rule in place of the pills;
  skills as plain rows.
- **World and talk**: the canvas upscaled nearest by default, so the
  palette's colours reach the screen unblended (the critic counted nine
  thousand colours where MM6 has six hundred: the smooth upscale had
  blended them back); the sky MM6's measured blue flat to the treeline,
  no fog, no glow; cream lobed clouds; the frame round the face a dark
  line and two of pewter; the village behind the party showing round
  the head; a softer key; the wood's highlights to chestnut.

### 16.19 Round 9: palettised paint (2026-10-17)

Round 8 scored 4 (HUD), 3 (screens), 4 (talk) and 3 (world), verdict no.
The averages now match MM6 to the unit; the pixels do not. The critics'
common finding: MM6's surfaces are palettised paintings with hard
per-pixel detail (a one-pixel speckle, crisp veins, fissures and cracks,
three quarters of the channel values on a 32-level grid), where ours
were smooth clouds counting two thousand colours. Round 9:

- **Brushes** (`src/render/brush.ts`): `quantise` rounds every channel
  to the five-bit grid; `cracks` walks one-pixel lines twenty to sixty
  pixels long (with an optional soft halo for marble veins); `crazed`
  breaks a slab into cells of uneven size with bent boundaries, each a
  shade lighter or darker, their edges crisp pale lines with a dark
  pixel beside; `speck` is an unblurred per-pixel nudge; `veins` draws
  the isolines of a noise field (kept, unused: the loops read as a
  contour map).
- **HUD**: the marble a small mottle at ±8 with sweeps no wider than
  ±10, veins as wandering warm-grey streaks (123,113,107) with a soft
  halo, quantised; the active thread capped at (222,215,181); seams one
  line of (49,48,41) with a three-pixel shadow; tube caps of five shaded
  gold rows with a highlight, the fill standing in a track between them
  so a full tube keeps its cap; the empty glass a warm black
  (33,28,24)-(57,52,49), the tube slot marble with a left shadow and no
  stripe; the gem a flat (0,195-235,0) lozenge in a one-pixel bezel;
  the clock white type in a (16,28,24) well; the band's edge a two-row
  lip, a groove and a five-row trough; the lintel seven flat light rows;
  six rows of wood under the books; the pillar ten pixels wide shaded
  198 to 132, its collar turning with it; the spines a cylinder with
  ±6 noise on every pixel; the emblems gold line art two pixels wide in
  a gradient of the golds over a dark shade with a bright top-left
  edge, solid where the object is solid (the sword's blade), as the
  reference shelf's sword, leaf, globe and key.
- **Screens**: the stone cool green-grey (68,72,68) with a ±12
  per-pixel speckle and hairline fissures, quantised; the leather
  near-black (35,12,0) with a one-pixel mottle and rust grid lines of
  (105,38,8) with a dark edge, no glint; the book a dark green leather
  cover round one parchment spread bowed across its width (164 at the
  left, 210 at the middle, 174 at the right), seven stacked page edges
  along the foot and the right, ribbon tabs cut on the slant, no corner
  brackets, no gutter line; the rose marble (177,124,95) crazed; rest
  text white, the rest clock in the dark well; gold ovals the full
  range from a near-white specular at the upper left to (90,60,10) at
  the lower right inside a black outline, their glyphs black; spell
  ovals flat 26 levels darker with a two-pixel soft edge; the frame
  round a screen one dark line with a lit lip, no corner blocks (the
  critic's "translucent rectangle" was the corner block); skill rows
  are the buttons (MM6 had no "+" ovals); Farewell a line of the list.
- **World and talk** (already in the tree before this round's
  scoring): the grade pass neutral (it had been lifting the sky); the
  filter posterising at 32 levels; ground tiles in 16-tone ramps,
  palettised; bitmap skins snapped to the palette; sprites without
  mipmaps, nearest; the bust over black with a softer key; the
  mahogany with blacks, slanted grain and knots.

### 16.20 Round 10: MM6's pitch (2026-10-17)

Round 9 scored 4 (HUD), 4 (screens), 5 (talk) and 4 (world), verdict no.
The world critic found the view rendering at 720 lines and upscaled
1.194 times nearest: three times MM6's pixel density, with every fifth
row doubled, so every texel step and sprite edge was finer and uneven.
The valley's sidecar also turned out to carry its own sky and fog (a
pale haze band) over the `mm6-day` preset, which is why the deep blue
of rounds 7 to 9 never reached the screen. Round 10:

- **Pitch**: a `css` render preset renders the view at the CSS size
  (932 by 430 on the phone, about 330 lines of view above the band
  against MM6's 342) and the display's integer ratio upscales it; it
  is the default and the `?lite` preset. The talking head's target is
  96 pixels, the window's size.
- **Sky**: one blue (41,69,140), a step darker above 30 degrees, in the
  valley's own sidecar (`kernel/terrain/build.ts`), the fog the same
  blue and thin; the strip 2048 by 256 sampled nearest, its rows by the
  elevation angle so the horizon's rows do not stretch, its masses
  stippled at the edges so the weather's cut lands ragged, its tone a
  top-light gradient with a mottle.
- **Ground and light**: dirt (57,28,16) to (107,73,57) with no black
  confetti, grass (61,84,45), olive scree, tiles half the size; the
  five light steps split per pixel by a four-by-four Bayer; the
  posterise in 5-6-5; flat light at 0.5 and the building lift at 0.5
  (walls at a luminance near MM6's 65); tree sprites in six greens and
  a bark ramp with low ambient; the bust's key fill 0.3, a dimmer key,
  a dark brown ground, a speckle over the window; the mahogany with a
  one-pixel grain stretched along the wood, steeper lines, knots as
  eyes.
- **HUD** (to the critic's measured recipe): marble as a mottle at
  fourteen and six pixels with a warm-cool tint and veins as two-pixel
  walks stamped three wide as a multiply, a Bayer checker, RGB565 with
  bit replication (the highlights reach the 180s); MM6's cell edges
  (groove, dark line, three rows of shadow, light right and foot); the
  tubes in a well with walls and a line under the caps, the caps an
  overlay over the fill; the trough and the lintel the marble itself;
  the pillar on MM6's convex profile with the highlight one pixel in;
  an eleven-row collar lit from below with a highlight column; the
  capital three leaf lobes; the rest oval with a specular a fifth down
  and a sunk foot; spines flat with a mottle and dark edges, the emblems
  painted as two-pixel gold line drawings (sword, satchel, book,
  scroll, compass) with a shade and a thread of light, as the reference
  shelf's; the shelf's recess dark brown, not black.
- **Screens**: 64 levels with a Bayer checker instead of 32; the stone
  with both tails (lichen and pits); worn patches on the leather; the
  page a tenth darker with a crease near the left edge, a hump across
  the right page, MM6's page-stack greys down the right and a crease
  and ramp along the foot, page-coloured bookmarks cut on the slant
  with black marks, as many as the schools known; the rose marble
  crazed by cracks that broaden and fade with uneven cells; the gold
  ovals on the measured recipe (a body of (156,130,74) lifted by a
  specular and sunk at the lower right, a dark rim, a black outline, a
  shadow into the stone), the close oval two to one; the frame a
  shaded column straight into the stone; rows on the bare stone with a
  rule; the clock's well a dark green marble with veins.

### 16.21 Round 11: brushwork (2026-10-17)

Round 10 scored 5 on all four (HUD, screens, talk, world), verdict no.
The values, layout and edges are MM6's; what remains is the brushwork
on the surfaces. The world critic reversed its round-9 ask for a Bayer
on the light steps (a screen door over every wall) and the screens
critic retracted the leather's worn patches (they were item sprites).
Round 11:

- **World**: sixteen flat light steps, no dither; the cloud cover
  blended in four steps round the weather's threshold in MM6's tones
  (lit (198,186,140), underside (132,117,140), blue pinned at 140), the
  strip uploaded flipped so the masses are lit from above, its mottle
  stretched two to one; one blue with no darker step; tiles back at
  fourteen metres with pits and pebbles as blobs; mips sampled nearest;
  hill scars at a third over 30 to 50 degrees (the valley rebuilt);
  crowns as a per-leaf stipple of six greens, the lit side a step up;
  a dimmer key, a two-pixel speckle of sixteen levels over the talk
  window, the window a tenth of the width; the mahogany as forty to
  sixty parallel bands sharing one wobble, grain after the colour.
- **HUD**: veins as one-pixel walks with overlapping stamps (continuous,
  twenty levels deep), twice as many, the mottle deeper, the trough and
  lintel painted at their own size with a wider spread; the pillar on
  the cosine profile over a 150-base marble with the highlight one
  pixel in, the right pillar mirrored; the collar MM6's five row bands
  turned with the cosine; the capital with volute spirals and outlined
  leaf tips and no washes; the rest oval a muted (140,114,71) gold with
  a three-pixel mottle, a (230,215,170) specular and a sunk foot, the
  moon near black with a lower-right edge only; the emblems a one-pixel
  pen (a diagonal rapier, a satchel, a leaf, a key, a globe) with a
  half-strength thread; the spines a pixel apart; the band, clock and
  shelf on whole UI pixels.
- **Screens**: the stone as fractured plates (a Worley field of
  eighteen to thirty-six pixel cells, each offset and sloped, fissures
  with a lit lip where they meet) with lichen and pits, a red-blue
  jitter, a Bayer and 64 levels; the rose marble in zones swinging rust
  to pale pink with dark veins along the stronger cracks and a few of
  their own; the book's crease with a ridge and a warm valley, an
  irregular page stack with a cut corner and a wandering foot, tab
  icons in three or four colours, the page to the left edge; the frame
  as pillars of desaturated rose marble with gold bands straight into
  the stone; the gold ovals with a 247 peak (the dark socket taken out 2026-10-23: the owner saw a black speck on every button), no rim
  rings; the clock's well with fading wisps and a red-brown lip under a
  highlight; the leather's shadow below and right of its rust line,
  more flecks.

### 16.22 Round 12: MM6's book and its pictures (2026-10-17)

Round 11 scored HUD 6, screens 5, talk 6, world 6, verdict no. Round 12
acts on its asks and adds the spell pictures (owner, 2026-10-17: a 100
credit grant to dial in the icons' style, one or two per school).

- **Spellbook**: one spread as MM6's: the school's plate (its name, the
  member's rank and spell points) in the first place, then a place for
  each of the school's eleven spells by level, in two rows of six on the
  phone's wide page right of the crease; a known spell shows its picture
  and name, dim when it cannot be cast (a tap gives the reason and the
  cost in the book's foot line), a place not yet learnt is the bare oval.
  The schools are bookmarks down the book's right edge, painted with
  their pictures (`book:<schools>@<open>`), the open one lighter, clear
  buttons over them. No title; the close is a gold oval on the foot. The
  spellbook's page is MM6's lighter one (lifted 28 levels). The ovals are
  MM6's: flat (184,172,150), 68 by 52.
- **Spell icons** (pipeline/style.md "Spell icons"): one text-to-image
  picture each on the cheapest model, generated on a plain parchment
  ground and keyed by colour (Meshy's background removal strips halos),
  composited by its soft alpha onto the same oval as an empty slot, 255
  colours, a bolt overhanging the oval. Pass 1 (batch 006, 27 credits)
  scored 2 to 4: dark, saturated, hard-edged, no glow, a chibi dwarf.
  Pass 2 (batch 007, 33 credits) took the critic's style text (high-key,
  warm mid-tone shadows, slim adults, magic as light with a halo, no
  floor) and subject sentences; every subject came out light enough
  without the lift. The grant's spend is in pipeline/budget.json.
- **HUD**: the class sigils painted in gold pixels (`sigil-<class>`), no
  SVG; the shadow strip under the band dropped; the tube fills in whole
  UI pixels of their track; the rest button's moon painted on its gold.
- **One grid**: the UI layer is a whole number of UI pixels wide and tall
  (CSS `round()`), the safe areas rounded up to whole UI pixels, the band
  100.5 px (67 UI pixels) tall, so right- and bottom-anchored pieces sit
  on the same pixel phase as the left (the round-11 critic found five
  phases).
- **Rest screen**: its own plaque (`plaque-rest`): wisps over a dark
  well with the rose lip.
- **World** (the round-11 world critic's five changes): grass and road
  tiles five metres (about four centimetres a texel) and the sandstone
  two; the dirt snapped to sixteen steps of its ramp plus a pit tone
  (38,16,8) over four per cent and two pebble tones over two; a
  one-texel grain inside each cobble with fourteen tones; mip levels that
  pick one texel in four by a hash instead of averaging, uploaded into
  the WebGL texture, so the far ground keeps its grain; the grass a step
  darker in clumps of eight to twelve texels; the hill's scars as
  patches of nearly bare earth past 26 degrees, the scree in the earth's
  browns. Clouds: three masses in four wind-swept streaks, the tone lit
  at a mass's top and falling to the body over a third of its own
  height, the grey a rim along its foot, the mottle four to one with
  striations two texels tall, the edge feathered a third wider. The
  talk portrait aimed at the rig's head bone, the head three fifths of
  the window, a painted room behind it on a layer only the portrait's
  camera sees. The mahogany: fifty bands three to eight pixels wide, a
  third the slab's full height, one gentle wobble, a chestnut top
  (150,110,80), the grain as short vertical specks after the colour.

### 16.23 Round 13: the page's shadow and the critics' recipes (2026-10-18)

Round 12 scored HUD 6, screens 6, talk 7, world 6, verdict no; the spell
icons' second pass a median 5 (the first 3). Round 13:

- **Spellbook**: a place is the page's own shadow, the oval multiplied
  (227,219,212) with a softer rim so the page's grain and light show, and
  the icons' parchment keyed out so they sit in the same shadow; places on
  84-pixel columns; the type upright and black; MM6's pennants for the
  bookmarks, page-textured and swallowtailed, coming out from under the
  page, all seven schools (Body's had not fitted); the page brightest a
  quarter of the way across and falling to the stack; the lift on the
  spellbook only; the stack's edges drifting without crossing over a
  mid-grey backing, the foot's seven lines sharing one bow, the page
  running on under it.
- **Spell icons**: pass 3a (batch 008, 15 credits) on the critic's second
  style text (mid-tones on a mid-tone ground, coarse textures, an uneven
  glow, nothing unnamed, spread wide): fire bolt, sparks, stun, bless and
  torch light. The post-process maps the picture's tones onto the
  parchment, fits 68 by 50 and takes the glow with it; batch 007's
  pictures were reprocessed at no cost.
- **Shell grid**: every length in the screens' styles a whole UI pixel,
  the line heights too; the close cross painted in whole pixels.
- **HUD**: the portrait rings MM6's five bands, grey stone for the others
  and silver and gold for the member in hand, a 26 by 38 opening; MM6's
  cell top (light, dark, gold) run across the band and a gold spandrel in
  each cell's top-left corner; the capital's bell irregular leaves on a
  mid grey with a few tips over the view; the rest oval MM6's 22 by 40,
  lit from the top with its rim light at the lower right; the gold of the
  emblems and sigils toned by the way each pixel faces; a sword that reads
  as one.
- **Screens**: the slate warmer with darker seams, blotches and streaks,
  the rose marble's crazing wider and softer with fewer pale veins, the
  leather's lights without blue, the rest clock's wisps over a quarter of
  its well, the frame pillars calmer with MM6's eleven-row gold bands.
- **Talk**: the wood's darks dark brown and dashed, finer and more of
  them, the grain multiplied; the face under a warmer, harder key with
  almost no fill; a painted room of planks and a shelf behind it; the
  head with headroom; the topic lines a lighter ink.
- **World**: the sky strip 512 texels round (four by two pixels a texel)
  with a hundred masses, lit from a blurred density; the ground's mips
  averaged and snapped to each tile's colours, sampled at the level the
  horizontal footprint asks for; the dirt's variance in blobs over 32
  tones with cool twins and brighter pebbles; the hill's bare patches
  gated on a slope smoothed over thirty metres, at full weight; the grass
  lifted back.

### 16.24 Round 14: monoline type and MM6's capital (2026-10-18)

Round 13 scored HUD 6.5, screens 6.5, talk 7.5, world 6, verdict no; the
spell icons' third pass a median 6. Round 14:

- **Type** (pixel-text.ts): Tinos is set at four times the size, cut at
  half cover, thinned to a one-pixel skeleton (Zhang and Suen) and pooled
  four to one, so every stroke is a pixel wide and every hairline, dot
  and stop survives; Pirata One keeps its weight. A word's canvas is the
  element's line box with the baseline where the browser puts it, so a
  line's pitch is the CSS line height; descenders hang into the leading.
  Spaces are two UI pixels and words even widths, so text stays on the
  grid. The stone screens' italic is drawn a quarter wider and a pixel
  apart, as MM6's is wider than Tinos; the book's type is upright, black
  and 14 pixels; the talk names upright and tracked, the topics a size
  up.
- **Screens**: everything fits its frame (MM6 clips nothing): lines of
  16 UI pixels (15 on the sheet), a skill on one line with its rank only
  above Normal, a resting member on one line, the bag in cells of 18
  pixels, the bodies unscrolled, paddings on the three-pixel grid. The
  book's foot is MM6's band of page edges over the cover; the page holds
  a few broad tones on RGB565; the rose marble calmer with long straight
  pale veins and half-strength cracks; the slate lighter, the leather's
  flecks fewer, the frame pillar averaged over three rows, the rest
  clock's wisps more; a bolt icon at most the place's 84 pixels.
- **HUD**: MM6's capital, thirty-one rows from the screen's top over an
  eleven-row collar: a carved dark mass of curls lit on their upper left,
  seven breaking its outline with the sky under them, an astragal, and
  MM6's collar bands; the band one marble slab with MM6's concave
  spandrel; the rings radial, flat inside; the emblems' gold as rods two
  pixels wide; the clock's figures MM6's yellow on a dark well.
- **Talk**: the wood's grain stronger over two rows, its darks broken,
  its broad figure in five long dabs; the room behind the head at full
  size and the right way up; the face in five light levels with deeper
  accents, the chest fading under it.
- **World**: the dirt's variance in noise, cracks and veins over 32 tones
  without pebbles; the grass back to MM6's olive, its marks near their
  base tone; both ground tiles keep their own colours (the frame's
  palette had cut the dirt to 17); mips keep half the picked texel's
  contrast; splat edges hard on a wandering threshold; bare patches read
  through the height, fewer on steep ground; the clouds soft-clipped in
  five coverage steps, their texels shrinking toward the horizon.
- **Spell icons**: pass 3b (batch 009, 15 credits, 10 of the grant left)
  on the critic's third style text: people and things mid-tones, magic
  on its own pale and wide; meditation, water walk, stun, sparks and
  spirit arrow; a speck-proof subject box.

### 16.25 Round 15: the stone made coherent, the sky thinned (2026-10-18)

Round 14 scored HUD 7, screens 7.5, talk 8, world 6.5, verdict no; the
spell icons a median 6. Round 15:

- **HUD**: the capital's mass a smooth field instead of a two-pixel
  mottle (MM6's stone correlates with the pixel below; ours had been white
  noise), twenty short curls hanging down, each lit three pixels up its
  upper left, two flares, the breakers at MM6's rows, no lone specks; the
  spines' gold rules and red bands lit as a round back; the clock's plain
  zero, even gaps, a whole-pixel margin; the tubes four pixels wide; the
  plinth MM6's turned base of tori and grooves; the band's top rows over
  the clock; the emblems' gold a tenth lower; the rings' outer band
  darkening toward the top.
- **Screens**: every stop kept (the marks found before thinning); four
  pixels between words on the stone screens; the quest log upright and
  black; the slate's plates flat with wandering seams; the rose's pale
  veins few, long and on the stone's flow, branching once; the foot's
  edges parting and meeting; the page grain at half a level; the knot
  strip on the spellbook alone; the sheet, the bag's slots and the rest
  well on the three-pixel grid.
- **Talk**: hue in the wood's grain and the room's planks; the portrait
  well snapped to the grid; townsfolk's skins at 512 pixels in sixteen
  tones with a grain; a cooler, weaker key without the extra gain; the
  room billboard a texel larger than the window.
- **World**: the sky's cover back to MM6's third (fifty masses, lower and
  flatter, a wider feather); a world-space detail tile on building walls;
  the meadow a step darker; the hill's bare patches on the scree channel
  in a warm bank brown with their own colours and calmer far mips, the
  valley's fog halved; tree crowns shaded by the light that rendered them;
  terrain skirts wound outward and deep enough to seal every seam.
- **Spell icons**: the critic's style text the house recipe (the colours
  only those the description names; only the magic glows); the soft key
  and a shadows-only lift; pass 5 (batch 010) water walk and stun, pass 6
  (batch 011) meditation; 99 of the 100 credits spent.

### 16.26 Round 16: the capital's crown, polished brass, ranked crowns, a side key (2026-10-18)

Round 15 scored HUD 7.5, screens 7.8, talk 8.5, world 6.5, verdict no.
Round 16:

- **HUD**: the capital's crown fourteen pixels past the shaft over the
  lintel, a dark scroll curling down at each end, the bell kept at six;
  the rest button polished brass (MM6's darker top, a stretched tone ramp,
  wider dies, a small hot specular, a lit upper-left rim); the tube caps
  turned with the tube's cylinder; the gem MM6's upright lit stone, five
  by seven; the clock's figures and day on the device grid of UI pixels;
  a dark and a mid row at the band's foot; the spines' red band peaking
  at MM6's (107, 20, 16).
- **Screens**: the rose marble's cracks coarser, its grain fourteen, its
  pale veins straight runs with kinks, its dark veins fewer and softer;
  the binding's break MM6's olive corner fittings and an olive S, no
  bright gold; each edge of the book's foot its own unrounded line and
  tone; the quest log in Arimo; the equipment rows six to the box and the
  last lengths on the sheet, rows, rest slabs and buttons on the
  three-pixel grid; the rule under headings a shadow; the leather's worn
  zones broader.
- **Talk**: the window snapped to three CSS pixels, the grid the canvas
  and the UI share, with the frame moved to ring it (the bust 192 device
  pixels square, the bevel three all round); the frame MM6's rod, dark,
  pewter and mid, its foot lit; the key 1.6 times stronger from 74
  degrees off the lens, the fill 0.02, the colour deepened by a power of
  1.9 and no saturation, the light's soft knee skipped on the keyed bust;
  the room behind a step darker. Measured: face p5/50/95 22/98/154 (round
  15: 46/116/160; MM6 5-13/46-73/188-201), so the shade landed and the
  highlight did not.
- **World**: tree crowns ranked by their own rendered light, the darkest
  12% black and the rest stepped with a lift toward the top (round 15's
  fixed cut had turned 40 to 67% of a crown black); the hill's bare earth
  darker (the bank ramp times (0.90, 0.86, 0.86)) with a scree pick share
  of 0.4, in half as many patches twice the size (noise period 140 m);
  the wall tile laid along each wall's own horizontal; the sky's 55
  masses spread round the horizon in jittered strata, so the talk view
  has cloud; the meadow and hill green back to round 14's ramp.
- **Spell icons**: the pictures' own grain kept inside a mapped subject
  (half of a box sample over each pixel's middle third), reprocessed from
  the paid pictures with no credits.
- Deferred: the critic's one-pixel stair-step for the type, a small gain
  that would change every screen's letters with no screens critic left to
  check them before the morning.

### 16.27 Round 17: an open crown, banded brass, the rose's contrast, MM6's binding (2026-10-18)

Round 16 scored HUD 7.8 and screens 8.3, verdict no (talk and world: see
the next entry). Round 17:

- **HUD**: the capital's crown with lit leaf heads and an open scroll of
  five by eight where it had ended in a closed ring that read as a "6",
  the curls back to twenty and the field on the bell's grid (the bell had
  darkened, 22% of it under 40); the rest button with MM6's dark band and
  second lit band and a body die of twenty (its grain had overshot to 52%);
  a second gold collar on both pillars at rows 120 to 130, as MM6's left
  pillar has; a four-pixel shadow down the alcove's left inside (107, 57,
  33, 16); the tube bars sixty CSS pixels, so the band's new foot clears
  the slots' lip.
- **Screens**: the rose's cracks in MM6's shade (92, 72, 62) and its pale
  web whiter and stronger (a tint of (0.8, 0.95, 1), a lift of 14 to 52,
  capped at the mean plus 85); the quest log in Arimo at sixteen UI pixels,
  untracked; the binding's fittings point-symmetric as MM6's, two bars a
  row apart over a corner with a lit slope and a groove, and an S eleven by
  twenty-three drawn with a two-pixel pen; the foot's edges in dashes of
  tone, two to six columns long; every word canvas an even height, a run
  that lands half a UI pixel off the grid moved back onto it, the head's
  gap six; the school names on one line; a spell's name with no added word
  space.
- Deferred: the clock as one canvas on whole CSS pixels (the HUD critic's
  fourth change, +0.03), which needs the word painter exported from
  pixel-text.ts and an e2e check of the box.

### 16.28 Round 18: MM6's brass ramp, and the talk bust in its own light (2026-10-18)

Round 17 scored HUD 8.1 (the frame and band read as MM6's at a glance for
the first time); round 16 scored talk 8.5 and world 7.0. Round 18 for the
HUD and round 17 for the talk panel and the world:

- **HUD**: the gold collars and plinth rings on MM6's brass ramp (seven
  stops, 84 to 219, cream in the light and ochre in the shade, blue over
  red from a third to four fifths by brightness, as MM6's) where they had
  been one colour times the turn; the rest button's lower lit band down to
  MM6's level (it reached 144, MM6's 104 to 113); the spandrels' slope a
  soft lit edge (148, 134, 123) on their upper rows. The moon stays on the
  rest button: the critic's tent is MM6's own icon, for the owner to
  decide.
- **Talk**: the bust lit by its own light alone, with no torch, lantern or
  cloud shade riding on it (the talk-world critic's recalibrated simulator
  found round 15's extra light was the party's torch and round 16's missing
  highlight a passing cloud shadow); a darker key, 60 degrees off the lens,
  over a warm fill (0.253, 0.152, 0.076); a highlight in three flat steps
  on the brightest skin; the room behind darker again (fill 34/22/13, lamp
  5, a wider plank tone); the frame's lit foot lines against the portrait,
  as MM6's. Measured: face p5/50/95 17/69/189, 36% under 60, 6% over 180
  (round 16: 22/98/154, 18%, 1%; MM6 5-13/46-73/188-201, 38-58%, 6-9%).
- **World**: the wall tile laid on each face's own plane from its geometric
  normal, measured from the building's foot, at half again the contrast
  (Meshy's smoothed normals had collapsed it to flat); tree crowns ranked
  by light, height and side together, so the black sits in the shaded
  lower core, not on the rims; the meadow 0.86 on ground under eight
  degrees, full on slopes past 23; the scree's mips picking their own
  colours at 0.7; the sky's 48 masses with thicker, shorter streaks.
- **After scoring**: the bust's key and warm fill applied only inside its
  own render pass (the render target's before- and after-render hooks), as
  the talk-world critic's round-17 report asked: sharing the villager's
  materials, the bust's light had made her glossy in the view behind the
  panel.
- **Scores, the night's last**: HUD 8.2 (round 18), screens 8.5 (round 17),
  talk 9.0 and world 7.5 (round 17), each verdict still "not MM6 yet". The
  critics' remaining asks are in their reports; the next round starts from
  them: the clock as one canvas and every painted box on even UI pixels,
  the rose's veins on its crack network, the type's stroke ends regrown,
  the bust's camera position inside its pass, far crowns keeping their
  black, the scree's ramp darker, the sky's streaks capped.

### 16.29 The shell at the view's pitch (owner, 2026-10-18)

"The portrait is still too pixelated. The whole UI is too pixelated." The
shell's pixel had been one and a half CSS pixels while the view rendered at
one (16.20), so the HUD and the screens were half again coarser than the
world, and on the phone (three device pixels to the CSS pixel) every UI
pixel was four and a half device pixels, drawn alternately four and five
wide.

- **One pitch**: `PX` is one CSS pixel, the view's: three device pixels on
  the phone, a whole number on any screen; 430 rows against MM6's 480.
  The half-pixel snaps (the text runs, the talk window, the even word
  canvases) are gone with the half pixels; every length in the styles is a
  whole CSS pixel.
- **What keeps its size and gains pixels**: the type (its CSS sizes, so its
  glyphs are drawn half again as many pixels tall, monoline, never under 18
  or 27 for Pirata One, the old floor), the buttons, the panels, the shelf's
  books (their emblems on the 18 by 28 grid drawn half again as large), the
  rest button (MM6's 22 by 40 drawn 33 by 60), the clock (figures seven by
  twelve), the close cross (eleven), the spell places and their icons (re-cut
  from their pictures at 108 by 81, no credits spent), and the spellbook's
  bookmarks (half again MM6's, as touch targets).
- **What keeps its pixel counts**: every one-pixel line, bevel and shadow,
  the ring's five bands, the tube caps, the spandrels, the book's frame and
  stack, the view's pillars (15 wide), capitals (42 rows), plinths (32) and
  lintel (7), and the critics' recipes for marble, slate, hide, rose and
  mahogany, which were MM6's own pixel counts and now land at MM6's share
  of the screen. The surface tiles are half again as wide, so they repeat
  as seldom.
- **The band at MM6's share**: 114 pixels tall (MM6's 128 of 480), ovals 66
  by 90 (MM6's 68 by 91), tubes six by 78 on MM6's whole six-tone ramp, gems
  eight by eleven, cells 110 apart (MM6's 113) from ten pixels past the
  clock, so all four clear the shelf inside the phone's safe areas (16.30).
- **Portraits** on the shell's grid (12.2): Alric's in the first oval.

### 16.30 The phone, not the test browser (owner, 2026-10-18)

The owner's phone after 16.29: "How the fuck can your critics miss all that
shit?", then "house floating, portrait too high res not matching the UI,
after combat the view port is tilted permanently". The critics only ever
judged our captures, and the captures were not the phone: a fresh desktop
browser with nothing saved, no safe areas, a standing party at one spot in
the village that never fought, a software renderer. Each fault below lived in
that gap.

- **Saved tuning from other builds**: the phone still held tuning saved days
  before, a five-level posterise with dither (its sky's pixels sat on exactly
  those levels), over every look shipped since, so it showed the checkered
  static and the pink ground no capture had. Settings and the tuning panel's
  values now carry the build that saved them and are dropped by any other
  build (`src/app/settings.ts`, `src/dev/panel.ts`).
- **The rolled horizon**: Babylon turns a camera's up vector only when its
  roll changes, by the whole rotation, so the hit shake's last roll left it
  tilted by the pitch of that moment (looking down at a bandit) and every
  later turn rolled the view, 23 degrees in the test. The camera's up vector
  now follows its rotation every frame (`updateUpVectorFromRotation`).
- **The band under the shelf**: with the phone's insets (59 pixels each side
  in landscape) the fourth member's tubes sat under the books; the cells are
  narrower and start closer to the clock, and an end-to-end test forces the
  insets and checks every cell clears the shelf.
- **The floating inn**: the inn's model stands on posts, its walls 1.6 m up,
  and props stand on their lowest point. The prop catalogue measures each
  building's wall base (the first height at which it spans three fifths of
  its footprint both ways) and the village sinks it by that, the posts into
  the ground; only the inn had one.
- **The portrait** back on the shell's grid (12.2).
- **From now on** a look is judged on what the phone shows: captures take the
  phone's insets, a fight and a walk through the village as well as the
  standing view, and the owner's own screenshots are the last word.

### 16.31 The frame and the walls (owner, 2026-10-18)

The owner's phone after 16.30: "Viewport extending past the pillars? Bad
collision on the houses".

- **The view past the pillars**: the pillars stand inside the safe areas (59
  pixels each side in landscape) while the view ran to the screen's edges,
  so the world showed outside the frame, where MM6 had none. The band's
  marble now runs up outside each pillar to the screen's edge, its tile
  carried on from the band's so the veins run on as one slab (`.view-margin`,
  `src/ui/hud.css`). An end-to-end test forces the insets and checks that
  hiding the view changes nothing outside the pillars.
- **Walls a step short**: each building collided as a box round its whole
  model, eaves, porches and posts included, so the party stopped short of
  the wall: by up to 2.15 m at the barn, 1.5 m at the stables, 1.3 m at the
  store and the third cottage. Buildings and props now collide as their own
  models' triangles: one Havok mesh shape a model, placed in the cell
  colliders at each instance's position, turn and scale
  (`src/world/level.ts`); the walk collider keeps the cave mouth only.
  Rays fired at every building and prop from all round meet the collider
  within a centimetre of the drawn surface; walked up to, the party stops at
  the wall, under the eaves and on the porches. Rocks
  keep their boxes (a rock is its box near enough). The footprint boxes
  still go to the navmesh, so bandits path round the houses as before.
- **Why the checks missed them**: neither shows standing in the square in a
  desktop browser; the first needs the phone's insets, the second a walk up
  to a wall. The walk is now part of 16.30's routine: every building
  approached from each side and the gap to the drawn wall measured, and an
  end-to-end test fires rays at the barn and checks its collider meets the
  drawn walls.

### 16.32 The talking head held still (owner, 2026-10-18)

The owner's phone: "Portrait of the village woman is twitching. Very
scary". Two faults, one on top of the other:

- **A frame behind**: the bust's camera is set before the head each frame
  from the rig's head bone, read in the frame's hook. Babylon keeps a node's
  world matrix for the render it was last computed in and counts renders only
  when a camera draws, after the hooks, so the bone read where the last frame
  had left it. At every step of the clip (ten a second) the head stood up to
  4 cm off the window's middle for a frame, 11 of its 96 pixels, and snapped
  back. The bust now recomputes the bone's chain from the root
  (`headOf`, `src/world/bust.ts`, with a unit test): the camera holds the
  head to a tenth of a millimetre.
- **The look-around idle**: a line's talk clip lasted 3.5 s, then the
  villager went back to idle with the panel still open. Meshy's Idle (action
  0, shared by every humanoid) is a look-around: the hips swing a quarter
  turn and the neck twists up to about 96 degrees more, the head ending up
  over the shoulder. The bust's camera stays square to the body, so in the
  close-up she whipped from profile to the back of her bonnet and round
  again in ten-a-second steps. A villager in the panel now keeps the talk
  clip till it shuts (`Npc.engage`, with a unit test), and faces the party
  throughout.
- **Still open**: in the world the same idle turns every villager and bandit
  well past the shoulder. A calmer idle is a new animation request to Meshy,
  for the owner to approve.

### 16.33 Every screen in one frame (owner, 2026-10-23)

The owner's phone, landscape with its insets (59 pixels each side, 21 below):
"Formatting is off everywhere". The spellbook's last column ran off the page,
the bag's last rows and the equipment below Helmet were cut, the sheet's last
stat line was cut and its skills ran into their prices, the Training Hall's
rows ran off the box, and the close oval stood beside the title on some screens,
at the top right on others and at the foot of the book. The screens had been
laid out for the test browser's 316 rows; inside the insets a screen has 295,
and the frame had taken the bottom inset a second time (21 rows lost).

- **One frame** (`createFrame`, `src/ui/dom.ts`): the title at the head's top
  left with the screen's own line beside it (the sheet's sex and age, the
  spellbook's rank and points, a shop's or guild's members); the foot holds the
  message line at the left, the screen's buttons (an item's actions) and the
  close oval at the bottom right, where MM6 put its Exit. The books (spellbook,
  quest log, map) are the same, the title on the page, the close standing on
  the page edges at the foot and the message line beside the title. The panel
  runs to the band's top; the bottom inset is the band's.
- **Fitted, not clipped**: the head 27 rows, the foot 30, the body the rest
  (222 rows inside the insets, 243 without). The screens' body type is a size
  down (20 pixels on lines of 22; 18 on the sheet and the members' tables), never
  under the type's 18. The sheet heads itself "Alric the Knight" as MM6 did and
  sets three boxes: points, armour, recovery, level and condition; the seven
  statistics and the fighting numbers; the skills, each a name, a price and a
  level in columns, a long name wrapping. The bag's cell is the largest whole
  pixel that shows all nine rows (`bagCell`, `src/ui/layout-model.ts`: 23 inside
  the insets, 25 without, MM6's 27 when there is room); the worn slots stand in
  two columns, the glyph and the item or the slot's name dim, with the armour and
  attack beside the heading; the selection is named on the message line and its
  actions stand in the foot. The spellbook's places are as wide as the page
  allows in two rows of six (`spellPlace`: 110 inside the insets, 130 without);
  the school's plate left the first place for the head. The rest screen keeps a
  line a member; the daylight stands with the choices.
- **Services in columns**: each list one table, so names, figures, prices and
  buttons align whatever wraps (a subgrid kept its rows at one line's height once
  the pixel text replaced the words); a member a line, the four in sight;
  every action MM6's gold oval with its word alone (a price or a reason inside a
  button had made it a wide slab of the rest screen's style), dim when it cannot
  be taken and saying why on the message line when tapped.
- **Lists that are longer than their box** (a smithy's stock, a long quest log,
  many skills or rings) scroll under a finger with no bar, the talk panel's gold
  marks at their corners while there is more that way (`watchScrolls`).
- **Checked on the phone's size**: `tests/e2e/screens-fit.spec.ts` opens every
  screen and service with the insets forced and fails on anything outside its
  panel or cut by a box that does not scroll, on words over words, and on a title
  or close oval out of its place.

### 16.34 MM6's layout, screen for screen (owner, 2026-10-24)

"You have the reference images. I want all menus and UI to be the exact same layout as the
original." Every screen was laid against its MM6 shot (the private reference's `screenshots/`)
and rebuilt to MM6's arrangement; the phone's 2:1 screen keeps MM6's places, each piece at
MM6's share of the height, the view taking the extra width.

- **The frame** (`src/ui/hud.ts`, `hud.css`): MM6's three marble pillars stand the screen's
  height, one at each side and one between the view and the panel; the lintel runs over the
  view; under the view the band holds MM6's message bar along its top (the status line writes
  in it, and every screen's messages go there) and the four members, their cells tiling the
  band as MM6's do. The view is the box between the side pillar and the middle one, under the
  lintel and over the band: 641 by 288 pixels inside the phone's insets.
- **The panel** (`src/ui/panel.ts`, painted by `paint-panel.ts`), top to bottom as MM6's: the
  minimap through a cusped arch, the heading on a plate at its apex and a − and a + cut into
  its shoulders (the sky shows past the arch's crown); two stained-glass windows; the clock in
  a darkened well (MM6 had none on its panel; the hour must show somewhere, and MM6's bar there
  stood empty); the four books, quests, notes, map and calendar; the food by its apple and the
  gold by its coins; the four gold ovals, cast, rest, quick reference and options. The minimap
  draws the region's picture from above (`levels/<id>.mini.png`, written by `level:build`, a
  pixel a metre, north up), or below ground the cells walked, the party's white arrowhead at
  its middle.
- **The view's lens**: the canvas still covers the screen (the sky behind the arch, the talking
  head composed into the panel), so the camera's centre of projection moves to the view box's
  middle (`src/app/view-box.ts`, off-centre terms only: field of view, depth and picking
  unchanged) and the touch zones split at the view's middle.
- **A member's pages** (`src/ui/character.ts`, `inventory.ts`; references mm6-stats,
  mm6-skills, mm6-inventory), opened by a second tap on a portrait: the statistics in six carved
  boxes in two columns under the name and the skill points (statistics, points, condition; age
  and level, the fighting figures, the five resistances, all nought until items and spells give
  them, MM6-GAPS.md 8); the skills in two boxes, weapons over magic and armour over the rest;
  the inventory's grid filling the view, the item in hand and its actions beside it; the
  awards, the quests seen through. Along the foot MM6's five gold ovals: head, hand, sword and
  shield, medal, door. Over the panel stands the member, face, name and worn slots, where MM6
  drew the figure; the figure itself waits on the paper doll (12.4).
- **The spellbook** (reference mm6-spellbook): three places across and four down, the first
  the school's (name, rank and points where MM6 hung the school's picture, until pictures
  come), the bookmarks down the right edge.
- **The books** (`src/ui/books.ts`, `journal.ts`; reference mm6-quests): the title on a
  knotwork banner. Current Quests lists what is in hand (what is done goes to the awards);
  Auto Notes lists what people told the party (a topic's `note`, made once, "Note added" on the
  bar); the Calendar lays the month out in four weeks, today ringed and the moon's quarters on
  their days; the Map shows the walked land in the region's picture, north up as the minimap
  (it had been drawn south up, a mirror).
- **Rest** (reference mm6-rest): the mountains across the top (painted, `paintPanorama`), Rest
  & Heal 8 Hours with the food beside it, the box of waits without healing (until dawn, an hour,
  five minutes; the last two are new), the hourglass with the hour, day, month and year, and
  Exit Rest. A choice applies at once and the screen stays, as MM6's.
- **Houses** (`src/ui/services.ts`; references mm6-smith-menu, mm6-tavern-talk): the house's
  wooden board over the panel, its name at the head, its choices down it, the door oval at the
  foot; the view keeps the street, where MM6 showed the room, until a choice opens a list
  there (the stock, the member's pack to sell, identify or repair, the guild's books). The
  member is the one picked in the band; a tap on a portrait turns the house to them.
- **Talk** (`src/ui/dialogue.ts`): the same board, the calling at its head, the living face in
  its window, the name in MM6's blue, the topics, the door oval; the words in a box along the
  view's foot, five lines at most before they scroll.
- **Quick reference and options** (`reference.ts`, `options.ts`; reference mm6-main-menu): the
  party in four columns, a line a figure; the game's name on a stone plaque over six slabs in
  two columns, Resume, Controls, New, Load, Save and Quit.
- **The type at MM6's size**: 15 pixels on lines of 16 on the screens (the floor for bitmap
  type goes to ten pixels; at three device pixels to one it reads on the phone), so MM6's boxes
  hold MM6's lines (owner, 2026-10-23: "type is large for the space").
- **Not as MM6, and why**: no interior pictures, house keepers' portraits, school pictures or
  paper doll exist yet, and no placeholders stand in for them; the panel's two windows are
  ornament, as no party spells are kept yet to show there.
- **Checked on the phone's size**: `tests/e2e/screens-fit.spec.ts` opens every screen and
  house with the insets forced and fails on anything outside the view's box or the panel's
  cover; `hud-fit.spec.ts` holds the band and the panel between their pillars.
- **Found on the way**: the world is drawn as the mirror image of the region script (the
  kernel's x is the scene's -x, 15.2), so a villager's "the temple at the west end" stands east
  on the minimap and the compass. The maps follow what is drawn; the new region (owner,
  2026-10-24) is the place to set the two right.

## 17. Regions by hand (owner, 2026-10-19)

"Hand design 640 m maps." The generated valley and desert are gone (section 15
records them); every outdoor map is written by hand.

### 17.1 The region script

A region is `levels/<id>/region.ts`, a `RegionScript` (`kernel/terrain/region.ts`)
in metres on a 640 m square of 5 m cells, drawn as a map: x east, z north, headings a
compass's (2026-10-24). The kernel's own frame is glTF's, right-handed, so with z north its x
runs west; `fromMap` turns a script over into it as level:build reads it, and the runtime's
handedness mirror turns it back, so what was drawn east stands on the right of a party facing
north. Until then every region stood mirrored: Gullhaven's temple, "at the west end" in the
script and the townsfolk's talk, stood east on the compass, the minimap and the screen, and the
sun rose over the western hills. The sun now rises at the scene's +x (`daylight.ts`), and the
map sheet is drawn the way the minimap is.

- **Land**: a base height and a little ripple; hills (round or stretched bumps)
  and ridges (along a line); a coast polygon with the sea outside it, the shore
  coming down over `shore` metres and the bed ankle-deep for six metres off the
  beach before it falls away; flats levelled for a town or a yard.
- **Ways**: roads as curves through control points, cut into the land and never
  steeper than 14 degrees; dirt squares and lanes.
- **Woods**: outlines with a spacing, a density and the tree kinds; trees keep
  off roads, pads, squares, the cave, the water and the **clearings** (a camp's glade, a ring
  of stones'). **Trees set by hand** stand one by one: an orchard's rows, the crossroads' oak.
- **Plots**: each building or prop at a point, facing the point its door faces,
  on a dead-level pad, sunk by its wall base (`kernel/terrain/plots.ts`); a named
  point on the apron before each door. A building carries its name (its model's without
  `building-` unless the plot gives one) into the level and onto its copy at runtime, and the
  houses' services go by it (`src/game/content.ts`): one townhouse is the training hall, its
  twins along the street are only houses.
- **The cave**: its threshold and the heading it faces, down the slope; the floor is
  dug in, the ground round the mouth drawn again finer with an apron and a brow, the
  rock face, the dark tunnel and Meshy's rocks about it, and the portal at its back
  leads into the dungeon (15.3).
- **People**: townsfolk facing a point; monster packs, a count round a centre.
- **Named points**, the start and its facing, the light, fog and sky, and the
  terrain textures (the fourth slot is the beach's sand).

`npm run level:build` compiles it through the same kernel as before (chunks,
roads, trees, backdrop, cave, navmesh, reachability of every named point) and
writes a **map sheet**, `public/levels/<id>.map.png`: the region from above at a
pixel a metre, shaded by slope and tinted by splat, buildings red with their door
side marked, trees, monsters red, townsfolk yellow, doors violet, the start a
white cross. It is the review copy of a map and the automap's picture later.

- **The sea** is one sheet of water out to the horizon, a grid twenty metres fine
  near the land and coarser beyond, because the materials reckon fog at the
  vertices: a single quad's far corners fogged the whole sea into the sky's own
  blue and the land seemed to end in sky. Outdoors it wears the painted water, as
  MM6's did; it mirrors only the sky if the mirror passes are ever turned on.
- An invisible wall stands seven metres off the beach, so the party wades the
  shallows to the ankles and no further, and another at the map's rim.
- Tests (`kernel/terrain/region.test.ts`): land and sea, the levelled floor and
  the road's splat, a cottage on its pad facing the road, trees only in the wood,
  the cave, people on the ground, the backdrop under the sea on the shore's side;
  for Gullhaven, no two buildings overlapping or standing on a road, every door
  facing its street, the start above the sea, every kind of person known.

### 17.2 Gullhaven, packed (owner, 2026-10-24)

The starting region, our own (not Enroth): a harbour town on the north shore of a bay, the
sea south and east to the horizon, ridges closing the land to the north and west. Rebuilt close
(owner: "Village is extremely spaced out. Wide empty spaces in map. I want the maps to feel
packed and hand crafted"): the first town had thirteen buildings along 220 m of street and
open meadow to the hills, a lone tree every fourteen metres.

- **The town** (150 by 60 m): a square 26 by 18 m with the well, three stalls, a cart and
  lanterns, the inn on its north side with the training hall at its shoulder, the trader
  across. The high street runs east and west from it, built up house to house on both sides,
  two to three metres apart, 28 houses in four rows (cottages 1, 2 and 3 in turn, a script
  helper laying each by its own width), the stables at the west gate, the smithy and its yard
  at the east. Behind the rows, yards and gardens: wood against the back walls, hay by the
  stables, carts, hedges of bushes, a tree or two, the stables' paddock. The temple stands on
  its knoll over the west end, up a lane, a shrine at the lane's top. Below, the quay: stalls
  for the catch, carts, three lanterns along the water, two fishers' huts on the beach. The
  party wakes on the lane up from the quay, the square ahead and Maren by the well.
- **The farm**, 50 m up the north road between hedges: Old Tobin's farmhouse west of the road,
  the barn east, his orchard of twenty trees in rows behind the house, two fenced fields with
  haystacks, carts and wood in the yard.
- **The crossroads**, 100 m on: the shrine and a lantern under an old oak, stones by the road.
  North-east through the wood to the goblin hills, their camp (a stolen cart, hay, rocks) at the
  cave's mouth 130 m from the crossroads. West, a track past the woodcutter's glade (his
  cottage, stacks, a cart, stumps) to a ring of nine stones round an outcrop on the downs. East,
  the track through the oaks to the ruin on the headland, tumbled outcrops in a ring where a
  watchtower stood, and its six skeletons. The coast road runs west past the bandits' camp, its
  carts drawn up by a lookout's rock.
- **Between them, woods**: the west wood from the coast road to the hills, the oaks east of the
  farm, scrub and pines over the goblin hills, a fringe of trees between the town's gardens and
  the farm, and woods on the ridges that close it all in; 1,794 trees in all, every glade cut
  for a camp, the stones and the crossroads. Rocks along the shore and the woods' edges. No
  site stands more than a minute's walk from the next.
- **People**: Maren by the well (the goblins in the hills, eighty gold), Old Tobin at his farm
  gate (three bandits off the coast road, a hundred and fifty gold). Goblin scouts at the cave,
  on the slope toward the road and at the stones; bandits at their camp and further west.
- Tests (`kernel/terrain/region.test.ts`): no two buildings overlapping or on a road, every
  door facing its street, the high street's four rows of at least six houses never more than a
  yard's width apart, one each of the inn, temple, trader, smithy and training hall, the cave
  facing its road, the start within twenty metres of the square.

### 17.3 Not yet

Every house in the rows is one of three cottages; more house models (a guild, a bank, a town
hall, a pier, a boat, barrels and crates for the quay) wait on a Meshy batch the owner approves.
The coast road's west end has no portal until the second region exists, and the headland's
ruin is outcrops until it has a model of its own.

### 17.4 Shade under trees and houses (owner, 2026-10-23)

"I want shadows under trees and buildings." The shade is **painted**, once, as the level
loads, not cast by a real-time shadow map:

- **Why not a shadow map.** Babylon's shadow generators (plain or cascaded) only reach its own
  materials; ours is a ShaderMaterial, so the depth lookup and its filtering would be written
  by hand into the terrain shader, and the generator re-renders its casters every frame: every
  near tree and house again, on a phone that already draws about a thousand trees and 300k
  triangles. Frozen to one render, a map at the shade's grain is a 2048-texel depth target with
  a filtered lookup at every ground pixel, hard-edged and biased, and still no soft pool under
  a crown. Babylon's other tools fit worse: a decal is a mesh each (a thousand of them), its
  SSAO is a full-screen depth pass every frame that the posteriser would band, and it has no
  lightmap baker. A painted texture costs one read per ground pixel and nothing else.
- **The texture** (`src/world/ground-shade.ts`): one 2048-texel square over the 640 m map, 31 cm
  a texel, four bytes a texel, mipmapped and read bilinear: the share of the **sun** a caster
  takes three times over, under the morning's sun (8:30), noon's (13:00) and the evening's
  (17:30), in red, green and blue, and the share of the **sky** in alpha. 21.3 MiB on the GPU
  with its mips (10.7 when it held one sun).
- **Casters are the models.** Each loaded model's own triangles, placed by the very matrix its
  thin instance is drawn with, so the shade lines up with what is drawn by construction, the
  kernel's mirror on X included (a unit test checks the placement against Babylon's own
  transform, an end-to-end test that every house's foot and nine trees in ten stand in shade).
- **Under a crown**: the crown seen from straight above, each layer of leaves deepening the
  shade (two layers take three quarters of the sun), so a dense oak is dark and a bare tree
  dapples; the sun's pool is set north by a quarter of the day's average sun for the crown's
  height (about 1.5 m under a big oak), soft over 60 cm; a broader, lighter sky pool under it.
- **Round a house, a prop or a rock**: its triangles laid on the ground along each of the three
  suns from `daylight.ts`'s path (owner, 2026-10-24: "shadows for time of day"; four fifths of
  the true length and never more than 1.6 m a metre, so the low suns' casts stay on the town's
  ground) for the sun's shadow, and straight down for the skirt: the roof's outline with its
  eaves, spread over three metres and lifted so it holds dark a good way past the eaves and is
  gone by about nine (a first pass of two metres hid under the eaves and did not read from the
  street). Overlapping shade keeps the darker, never the sum, so a wood's
  floor is no darker than its densest crown and keeps its colour.
- **The hour.** The shader weighs the three casts by the hour (`sunBlend`, set with the daylight
  every game quarter hour): all the morning's until 8:30, easing into noon's and on into the
  evening's, all the evening's after 17:30. So a house's shadow lies west of it in the morning,
  draws in under it towards noon and swings out east through the afternoon. The pools under
  the crowns move the same way.
- **The terrain shader** takes up to three quarters of the key light in the sun's shade and, in
  the skirt, two thirds of the ambient and over half the key; never the lanterns or the torch. It
  is reckoned as a share of the light and laid on after the light's knee, which would otherwise
  flatten the first third of it on sunlit ground; the ground keeps at least 0.45 of its light,
  which a dense crown's heart and a north wall's foot reach (the first pass held 15.7's 0.55 and
  its shade hardly showed round a house in the sun). The sun's part
  fades as the sun sinks below about 25 degrees, since its real shadows then reach far off to
  the east; the skirt holds at every hour, so at night only a faint pool under a crown and the
  walls' foot remain. Every terrain chunk at every detail level shares the one material, so
  the road, the dirt and the grass darken alike; the sea is its own water material and is
  never shaded.
- **Cost**, measured on the shared cloud box: painting Gullhaven's 1,050 casters took about
  200 ms at load in headless Chromium with one sun (180 to 490 as the box was busy; about 100
  in Node once warm), the crowns' stamps most of it, and the upload with its mipmaps 4 ms; with
  three suns 686 ms and 11 ms (2026-10-24, one run). The packed town's 1,982 casters first took
  1.2 to 1.4 s, nine tenths of it the 149 houses, props and rocks: their four tiles' blurs, a
  call a texel. Now each solid's place is snapped to the texture's texels (16 cm at most) and
  its painting kept for every copy of the model turned the same way, a street of row houses
  painted once; the blur runs in a tight loop and the tiles are written straight in: 0.80 to
  0.93 s (three runs). A frame's
  render with and without the shade's lookup compiled in is the same within the noise (7.3
  and 7.1 ms in the square, 7.5 and 7.5 in the wood, software GL, `gl.finish` timed).
- **Not yet**: the kernel's fences and the cave mouth cast none; nothing shades a wall or a
  trunk; between the three hours the shadow is a cross-fade of two casts, not one moving cast.

### 17.5 Lights on the models (owner, 2026-10-23)

A model's lights are part of the model, like its door: `lights` in `kernel/terrain/props.ts`,
each a point in metres in the model's own frame and a kind. Every copy carries them, turned
with it, so a second lantern post or smithy needs nothing more.

- **Where they come from.** Meshy paints lit things warm and bright, so `tools/lib/glow.ts`
  samples every triangle in the model's colour picture and gives the middle of each warm bright
  patch (the smithy's coals under its lean-to). Pale glass escapes it, as the inn's cream
  plaster would not, so a lantern is read off the model's square-on front view (`tools/review`
  with `?front`) instead. Either way the point is checked as a mark on the review render
  (`?marks=`) before it goes in.
- **What they make.** A lantern is a warm point light in the materials (the four nearest a
  model light it, coming up as the day goes, 15.7) and a halo: one of Babylon's sprites, the
  particles' soft dot tinted gold, added to what is behind it, nothing by day and strongest at
  night (`src/world/halos.ts`). A forge is a brazier: its light 0.28 m over the coals, and
  flames and smoke from the particle helpers.
- **Since then**: chimney smoke and windows that glow after dark (17.6).

### 17.6 Chimney smoke and lit windows (owner, 2026-10-24)

"Chimney smoke, window lights and shadows for time of day" (the shadows are 17.4). Like the
lights, both belong to the models and are found on the models themselves.

- **Chimneys.** `tools/lib/chimney.ts` draws a model's roof from above as a height map, ten
  centimetres a cell. A chimney is a short column clear of its roof. Its top stands highest
  within a metre and at least forty centimetres over the ring of roof a metre and a half out;
  a ridge, as high along itself, never counts. Its top must be under three square metres. The
  points went into `kernel/terrain/props.ts` as each house's `chimneys` once marked review
  renders showed them right. The temple's candidate was its spire's cross, and the barn's and
  stables' were ridge vents, so those three carry none. The plots turn each point with its
  copy, the region lists them as the level's `smoke`, and level:build writes them to the
  sidecar.
- **Smoke** (`chimneySmoke` in `src/world/particles.ts`, `ChimneySmoke` in
  `src/world/atmosphere.ts`): Babylon's own particles, the particles' soft dot. Each chimney
  has 36 grey puffs swelling from 0.6 to 3.2 times their size as they rise for five to seven
  seconds, already rising when the level loads. They lean downwind the way the canopies sway,
  further in a gust, from the wind sound's gust. Particles take no light, so their grey is
  scaled by the daylight: pale by day, dim at night, never a white column against a dark sky.
- **Windows.** Meshy paints panes dark, not bright, so they are found by
  `tools/lib/windows.ts` on the model's own skin, and checked against the model:
  - **Glass** is cooler than the timber and plaster round it: bluer than red by twelve tones
    more than the mean within ten pixels. Grey stone, as cool all over, never counts. A pane's
    bars are bridged by a pixel, so a window's panes count as one. The panes must carry a blue
    cast on average, which drops grey stone that only reads cool against brown timber. Only
    the panes are lit; the leading stays dark.
  - **Dark panes** sit in a pale wall: under 72 in tone, the wall round them over 105.
  - **On the model**, a pane must lie on upright faces, at no less than a quarter of the
    skin's usual pixels a square metre. A patch smeared over a soffit, which once lit a whole
    gable's underside, is dropped. In metres, a dark pane must be a window's size, at least
    35 cm each way, which drops a timber post in the plaster; glass may be a hand across.
  - A solid pane's soft-painted outline is tidied by a pixel; a leaded grid is left as it is.
- **Checked by eye first.** `npm run asset -- windows <id>...` writes each mask to
  pipeline/work/windows/ and draws the review sheet with a third row: the eight sides at night
  with the panes lit. `--accept` puts the looked-at mask beside the model as
  `<id>.windows.png`, a grey picture of about 4 KB. Five houses have one: the inn, the store,
  the farmhouse and cottages 1 and 3. Cottage 2's panes are not found, and the smithy, temple,
  barn and stables show none worth lighting.
- **Lit at night.** The world shader's `WINDOWS` path reads the mask on the model's skin and
  adds a candle's gold over the pane's own paint, so leading and curtains still show. It is
  added after the light, so a wall in the dark keeps its lit window, and it fades with the fog.
  It comes up as the day goes, as the lanterns do (`setWindowGlow`, from 1 − daylight): faint
  at sunset, full at night.
- **Not yet**: the lit panes cast no light on the ground outside; every lit house is lit every
  night, all night.

## 13. Decision log

- 2026-10-24 – Gullhaven packed close, and the world the right way round (owner: "Then you
  make a new concept for the starting area. Village is extremely spaced out. Wide empty spaces
  in map. I want the maps to feel packed and hand crafted"; 17.1, 17.2). The town is a square
  and a high street built up house to house, 28 houses in four rows with yards, gardens and a
  quay, where it had been thirteen buildings along 220 m; the farm, the crossroads, the cave,
  the stones, the camps and the ruin each stand a minute from the next, woods fill the ground
  between and ridges close it in, where open meadow had run to the hills. Region scripts are
  drawn as maps and turned into the kernel's right-handed frame at build: every region had
  stood mirrored, its west on the screen's east and its sun rising in the west. Houses go by
  their plot's name, so one townhouse trains and its twins do not.

- 2026-10-24 – Chimney smoke, lit windows and shadows that follow the sun (owner: "Then
  Chimney smoke, window lights and shadows for time of day"; 17.4, 17.6). The ground shade
  holds three suns' casts, morning, noon and evening, which the terrain shader blends by the
  hour; it was one cast along the day's average sun. Chimneys are found on each house's roof
  from its own geometry and smoke with Babylon's particles, leaning with the wind's gusts.
  Window panes are found on each house's own skin, checked on its faces and sizes and by eye
  on a night review row, and glow gold from dusk. Loading the shade costs about three times
  what it did.

- 2026-10-24 – MM6's layout, screen for screen (owner: "I want all menus and UI to be the
  exact same layout as the original"; 16.34). The book shelf at the band's end and the clock
  in the band gave way to MM6's right-hand panel the screen's height (minimap, windows, clock,
  four books, purse, four ovals); screens open in the view's box between the pillars, a member's
  four pages with MM6's five ovals, the books on banners, rest, houses and talk as MM6's
  screens, their boards over the panel. The camera's centre moves to the view's middle with
  the frame. New on the way: auto notes, the calendar, the quick reference, the game menu,
  waits of an hour and five minutes, a minimap, the walked land on the map, north up.

- 2026-10-23 – Lights belong to the models (owner: "How do you plan to implant lighting on
  features and buildings (lamps, forge, fire, hearth, etc)", "How will you manage lighting
  features on houses and lanterns etc?"; 17.5). Each model names its lights in
  `kernel/terrain/props.ts`, found on its own paint (`tools/lib/glow.ts`: the smithy's coals)
  or read off its square-on front (the lantern post's lantern), and checked as marks on its
  review render; the plots turn them with every copy. The two lights the town had were guesses
  in code, the lantern's over the middle of its post and the forge's in the arched front. A
  lantern carries a warm halo too, Babylon's sprites brightening as the day goes; the forge
  burns as a brazier, flames and smoke on its coals.

- 2026-10-23 – Shade under trees and houses (owner: "I want shadows under trees and
  buildings", 17.4): painted once at load into one ground-shade texture over the map from the
  models' own triangles and their instance matrices, and multiplied into the terrain's light;
  not a real-time shadow map, which would need a hand-written shadow lookup in the terrain
  shader and re-render every near tree and house each frame on a phone drawing a thousand
  trees. Soft pools under the crowns set a little north, a skirt seating every wall and a short
  cast to the north; the sun's part fades as the sun goes down. No frame cost measured.

- 2026-10-23 – The cave mouth rebuilt (owner, of a phone screenshot from the north road:
  "WTF is that shit?"; 15.3). It was a box of stone on the slope, side-on to the road: at
  heading 225 its tunnel ran along the contour. It now faces down the hill to the road's end
  (140), its floor dug 3.2 m in; the ground round it is drawn again on a 1.2 m grid in the
  terrain's own material and splat, an apron before the mouth and a brow over it, the coarse
  ground pressed under it; a faceted rock face fills the cut in that ground round a rough
  arch; the tunnel's rings fall off into black by vertex colour, with no light inside; twelve
  of Meshy's rocks stand as its cheeks and brow, none of their boxes in the tunnel or the way
  in. The goblins below path up the apron and in (a new end-to-end test). A Meshy model of a
  whole cave mouth was considered and not needed: image-to-3D would likely close the hole or
  leave a see-through gap, and a rock's box collider would shut the mouth.

- 2026-10-23 – The trees sway more (owner: "I want tree swaying to be more pronounced"): the
  movement now grows with height instead of stopping at eight metres, so a twenty-metre
  spruce's top leans some 1.1 m downwind at a gust's peak and swings about 60 cm either way, a
  ten-metre oak half that and a bush a little; a lull still sways a quarter as much as a peak
  (`src/render/materials.ts`).

- 2026-10-23 – Houses open only from their doors (owner: "I want Houses only enterable from
  door"). Each building names its door in `kernel/terrain/props.ts` (`door`: across the front,
  its width and height, read off a square-on front view, `tools/review` with `?front`). A tap
  on a house is taken into that copy's own frame and opens the house only when it lands on the
  door, within 40 cm round it and on the front, from no further than the door reach; anywhere
  else the status line names the house. The place named after a house now stands 2.5 m before
  its door rather than before the front's middle (`kernel/terrain/plots.ts`).

- 2026-10-23 – Every generated model is checked before it goes into the game (owner: "This
  house has gaps you can see through the model is shit", "Always retry model generation till
  the model has no see through gaps", "You need automatic quality checker for generated
  models"). Cottage-01 came back from batch 013 with its back wall folded into the house and
  the store with its back gable open; I had looked at four sides and missed the first. Two
  parts (`tools/lib/quality.ts`, `tools/lib/review.ts`, CLAUDE.md):
  - A geometric screen: rays at the model from sixteen sides, level and from thirty degrees
    above, each noting the first face it meets. Meshy's triangles are wound consistently, so a
    ray that meets the inside of a face well behind the model's convex hull has gone in where
    a wall should be; such rays side by side are a gap in square metres. It flags both broken
    models (4 and 10 m²) and passes fifteen sound ones, but also flags a face turned over in a
    hollow of the hull that draws as if nothing were wrong (the inn's back gable behind its
    verge, a patch of the barn's roof above its lean-to), so it cannot be the verdict alone.
    Other tests were tried and dropped: open edges (roof eaves and awnings are single sheets
    too), the winding number (Meshy's shells are too open for "inside" to mean anything), a
    depth step at the patch's rim (it ran the wrong way between sound and broken models).
  - The verdict, by eye: `npm run asset -- review <id>...` draws each model's sheet, its eight
    sides as the game draws them and again with the inside of every face in magenta, under the
    screen's findings; `run` logs the screen for every new prop and points at its sheet. A
    model goes into the game only once its sheet has been looked at, and one with a gap is
    generated again, each retry its own small batch under the owner's standing word.
  - Batch 015 regenerated cottage-01 and the store from the same pictures, 30 credits (balance
    1243); both came back sound on every side.

- 2026-10-23 – Batches 013 and 014 run (owner: "Run the meshy batch", "Approve 14"): the ten
  buildings, six village props, the woodpile and four rocks from the owner's own fuchsia
  pictures, image-to-3D only, 315 credits (balance 1273). The fence picture is filed and not
  modelled: the kernel builds fences. The woodpile at 600 triangles and the stone cluster at
  500, so five stones and the split logs keep their shapes. Image-to-3D keeps the picture's
  framing, and from a three-quarter picture the door can come out on a gable: `front` in
  `kernel/terrain/props.ts` names the side Meshy delivered it on and post-processing turns
  the model round (`turnModel`; the temple, the barn and cottage-03 by a quarter, cottage-02
  by a half, the cart with its shafts to the front). The models keep the pictures'
  proportions at the catalogue's heights: the inn is now 9.9 by 8 m (was 19.6 by 12.2), the
  farmhouse a long house of 11 by 21.6 m; every plot still clears the others.

- 2026-10-23 – A placed model takes the kernel's yaw as it is. The kernel turns a model's
  front (+Z) to (-sin, cos) and Babylon's rotation turns it to (sin, cos); kernel space is
  mirrored on X, so the two flips cancel, and the runtime's negating the yaw as well had
  stood every house facing east or west backwards and mirrored the diagonal ones (the
  farmhouse showed the north road its back wall; the temple stood some fifty degrees off its
  path), the navmesh's footprints out of line with the walls. The instances, the model
  colliders and the rocks' boxes in `src/world/level.ts` now carry the yaw unchanged.

- 2026-10-23 – The automap pinches, drags and double-taps (owner: "Auto maps needs pinch and
  zoom controls"): two fingers zoom about the point between them and pan as they move, one
  finger pans (a finger that moves under 10 pixels is still a tap and names a mark), a double
  tap steps in at the finger; gold + and − ovals and a find-the-party oval down the page's
  right edge. The zoom runs from the whole level on the page to eight times that, cells,
  marks and the arrow on whole pixels; the map opens on the party at about a pixel a metre
  and keeps each level's view for the session, back on the party if it has walked off it
  (`src/ui/map-view.ts`). Pointer Events only; nothing reaches the world under the page.

- 2026-10-23 – Every screen in one frame (owner: "Formatting is off everywhere", 16.33): the
  title at the top left, the close oval at the bottom right with the message line, as MM6's
  Exit; every screen fits its box at 932 by 430 with the phone's insets, a longer list
  scrolling with gold marks; the services' rows in aligned columns with gold ovals only.

- 2026-10-23 – Fences are the kernel's (owner: "I think you have to generate fences
  yourselves, you haven't managed with the fence model"). A region lists `fences` as lines
  of corners; `kernel/terrain/fence.ts` stands a post every 2.5 m (0.3 m sunk, 1.25 m out)
  with two split rails at 0.45 and 0.95 m that follow the ground, in the plank role, and a
  slab collider along the line for the party and the navmesh; no tree grows within 3 m of a
  fence. Gullhaven's farm yard is the first; the Meshy fence model is no longer placed.

- 2026-10-23 – The buildings' filtering undone (owner: "Building look like shit. You've
  overdone it with the filtering"). At 256 pixels a whole inn was painted from one small
  skin, and the rounds-9-to-14 filters (MM6's palette, a grain, sixteen tones, a grey
  speckle in world metres) made mud of it. The 22 town models are post-processed again
  from Meshy's downloads (houses 1024 px, props and rocks 512, JPEG) and the 20 trees at
  512; the skins keep their own colours at thirty-two tones; new props get the same sizes.

- 2026-10-23 – The gold oval buttons lose their dark socket (owner: "What's that black
  speck on the gold buttons?"): round 10's near-black pool at each button's lower right read
  as a smudge, over the word on Yes and No. The rest button's moon stays.

- 2026-10-23 – The second demo (owner: "Prepare the next demo for me to play"), from a
  play-through audit. A plain visit to `/dev/` opens on a title (Continue, New Game); the
  autosave keeps the party's place, and Continue stands it there, on the ground; `?dev`
  still starts a new game at once for the tests and shows the tuning button, which the
  player's view hides. Houses open their service at the door (inn, temple, store, smithy,
  and a training hall in the waterfront townhouse until the town has one of its own); a
  tap out of a sword's reach goes to the bow; a corpse is searched for its gold; monsters
  land their blows at any frame rate and a blow never breaks their swing; a wiped party
  wakes a week later at the temple without its carried gold (MM6's rule); rest is refused
  with a monster within 30 m; the halls hold six skeletons and Old Tobin pays 300 gold for
  five of the dead; the band shows gold and food, the map marks the villagers, those with
  a quest waiting, and the portals; the talk panel shows every line whole.

- 2026-10-23 – Batch 012 run (owner: "Run all 20 through meshy and put them in the game"):
  the twenty trees and bushes made image-to-3D from the owner's own pictures, 300 credits.
  Their sprites keep the models' own colours (16.14): no repaint into six greens and no
  palette snap for trees and bushes, a grey tint.
- 2026-10-23 – Trees and bushes are real 3D models, not sprites (owner: "If we have these
  expensive textured 3d models we should do real 3d"): full detail within 180 m, the far
  copy to 450 m, about 300k triangles in Gullhaven's busiest view (16.14).

- 2026-10-19 – Fuchsia backgrounds for every concept picture (owner: "We do fuchsia
  backgrounds"). The owner makes the tree pictures free in ChatGPT
  (`docs/prompt-cards/trees.md`); `asset inbox` keys the fuchsia out with an alpha bleed on
  the edge (10.3); the prop style and batch 012's prompts ask for it too.

- 2026-10-19 – Never text-to-3D, no exceptions (owner: "They look like shit because they
  were text to 3d"; "Never ever do text to 3d. No exceptions"). The pipeline cannot make
  one: props go image first like creatures (a concept picture, the owner's look, then
  image-to-3D; `tools/lib/run-props.ts`), the batch tool has no text-to-3D step, the runner
  refuses batches 003 and 004, and the Meshy client refuses any text-to-3D call (tests in
  `tools/lib/image-first.test.ts`). The trees and bushes of batch 003 are redone as batch
  012; the buildings and props of batch 004 are text-to-3D too and are next.

- 2026-10-19 – Gullhaven (17): hand-written regions on the 640 m grid compiled by
  the terrain kernel, with a map sheet each; Gullhaven replaces the valley as the
  starting region; the valley, the desert, the river and the ravine's stream are
  removed; Henrik and Greta became Old Tobin and Maren.

- 2026-10-19 – The owner's answers to the roadmap: "I just want to play some
  Might and Magic clone. Don't call it Enroth. Hand design 640 m maps." The
  world is ours, under our own names; every outdoor map is hand-designed on
  the 640 m grid; every other decision in `docs/ROADMAP.md` section 2 is taken
  as the senate recommended. The throwaway `dev-outdoor` scene is skipped: the
  real starting region replaces the valley directly.

- 2026-10-19 – The valley is scrapped (owner). The agentic senate's plan for
  a full, playable MM6 game is `docs/ROADMAP.md`, pending the owner's answers
  to its fourteen decisions.

- 2026-10-18 – The talking head held still (16.32): the bust's camera reads
  the head bone fresh each frame; a villager in the talk panel keeps the
  talk clip till it shuts.

- 2026-10-18 – The frame and the walls (16.31): the band's marble fills the
  safe areas outside the pillars; buildings and props collide as their own
  models' triangles, not boxes; the boxes stay on the navmesh.

- 2026-10-18 – The phone's faults (16.30): saved settings and tuning are
  dropped by any build but the one that saved them; the camera's up vector
  follows its rotation, so no shake leaves the view rolled; the band clears
  the shelf inside the safe areas; buildings sink by their wall base; the
  portrait is cut one image pixel to the UI pixel.

- 2026-10-18 – The shell's pixel is one CSS pixel, the view's (16.29; owner:
  "the whole UI is too pixelated"); the band at MM6's share with MM6's ovals;
  portraits cut at three image pixels to the UI pixel, smooth (12.2), Alric's
  in the band.
- 2026-10-18 – Party portraits and paper dolls (DESIGN 12, with the owner):
  portraits are the owner's ChatGPT images with their expressions; the paper
  doll is 3D (a shared base body per sex, the member's head, garments fitted
  on the body and rigid pieces on its bones) shown as a still; the class is
  equipment, so the base is neutral.

- 2026-10-18 – Round 18 (16.28): MM6's brass ramp, the rest button's
  lower band, a lit spandrel edge; the talk bust in its own light with a
  side key, a warm fill and a stepped highlight; the wall tile on each
  face's plane, crowns ranked by light, height and side, a darker meadow.

- 2026-10-18 – Round 17 (16.27): an open crown and banded brass, a second
  pillar collar, the alcove's shadow; the rose's contrast, MM6's binding,
  dashed foot edges, the quest log at MM6's size, every word on the grid.

- 2026-10-18 – Round 16 (16.26): the capital's crown and polished brass,
  MM6's gem and sans quest log; the talk window on the shared grid in MM6's
  frame rod, a side key; crowns ranked by their own light, darker and
  larger bare banks, an even sky; the icons' grain kept at no cost.

- 2026-10-18 – Death thresholds (docs/gaps/characters.md 12.1): down at 0
  hit points or less, dead at minus the base Endurance, a point each from
  step 1's reading of MMW.

- 2026-10-18 – Round 15 (16.25): coherent stone for the capital, MM6's
  clock figures, tubes and plinth; stops kept and the quest log upright;
  the sky's cover thinned, a wall detail tile, sealed terrain seams;
  townsfolk at full skin resolution; the spell-icon recipe recorded as
  dialled in (99 of 100 credits).

- 2026-10-18 – Round 14 (16.24): monoline bitmap type on the line box
  (a 4x skeleton pooled back), screens fitted to their frames, MM6's
  capital and band, the book's foot, the ground tiles on their own
  colours, icon pass 3b (spell-icons grant: 90 of 100 spent).

- 2026-10-18 – Round 13 (16.23): spell places as the page's multiplied
  shadow with keyed icons; MM6's pennants; the shell's lengths in whole
  UI pixels; the critics' recipes for rings, cells, capital, rest oval,
  gold, slate, rose, leather, wood, face, room, sky, ground and hills.

- 2026-10-18 – MM6 rules, step 1 (MM6-GAPS.md 38; DESIGN 14): unconscious
  below 0 hit points, dead below minus Endurance; monsters hit by level;
  MM6's spell costs, Cure Disease at Body 8; Body Building and Meditation
  × class factor, Learning 9 % + skill; recovery in MM6's units at 60 a
  second (ours), with hit recovery; armour skills add AC from Normal, the
  armour penalty halved at Expert (ours) and gone at Master; bows shoot
  with the bow's numbers; weapon skills by MM6's ranks.

- 2026-10-17 – Round 12 (16.22): the spellbook as MM6's one spread with
  bookmarks and a place per spell level; spell icons as one bitmap on
  MM6's parchment oval, generated on a parchment ground and keyed; the
  shell on one pixel grid; five-metre ground tiles with picked mips,
  patchy scars, streaked clouds, a centred portrait in a painted room.

- 2026-10-17 – Round 11 (16.21): no dither on the light steps (the
  critic's reversal); blended clouds lit from above; continuous veins,
  cosine pillars, a one-pixel pen for the emblems; fractured-plate
  stone; hue-zoned crazing; the HUD on whole UI pixels.

- 2026-10-17 – Round 10 (16.20): the view at MM6's pitch (the `css`
  preset, default); the valley's sidecar sky one deep blue; measured
  marble, cell, well, pillar and emblem recipes on the HUD; 64-level
  screens; 5-6-5 posterise; dithered light steps.

- 2026-10-17 – Round 9 (16.19): the shell's surfaces as palettised
  paintings: five-bit quantise, per-pixel speckle, wandering veins,
  fissures, crazed rose marble; tube caps over the fill; gold line-art
  emblems; one-spread book; skill rows as buttons; Farewell as a line.

- 2026-10-17 – Round 8 (16.18): the shell's surfaces painted as value
  noise clouds to the critics' measured bases and spreads, no ramps; the
  HUD's oval, rail, tubes, gem, pillars, bands, plaque and emblems in
  measured tones; the canvas upscaled nearest so the palette holds; no
  fog; the village behind the talking head.
- 2026-10-17 – Round 7 (16.17): the palette mode becomes the default
  filter (MM6's 256 colours on every frame); marble as soft figure; the
  ring, tubes, spines, emblems, clock and shelf in the critics' measured
  tones; stone with no linework; carved boxes; white type; leather grid;
  rose rest screen; grass hills without snow; soft clouds; the role back.
- 2026-10-17 – Round 6 (16.16): the shell and world redone to the
  critics' pixel measurements of MM6 rather than their words: grey veined
  marble, recessed cells (no trough), tube slots, stone screens with
  grooves and no title band, cloudy pages, spell ellipses targeted by
  portrait, a dusky day, cracked earth, flat-lit buildings, near-black
  wood.
- 2026-10-17 – Round 5, the shell (16.15): one sunk band with pilasters
  and no name plates, tubes in a trough with a brass foot, the clock on a
  stone tablet, acanthus capitals, outlined gold emblems, members picked
  by portrait with no tab strip, a glyph for Close, books with boards, the
  talk panel on seamless mahogany with the name alone.
- 2026-10-17 – Round 5, the world (16.14): trees as sprites drawn from
  the models, model skins as bitmaps, the sky a painted strip, light in
  five steps and the ground lit flat, hard pixel grain on the tiles; the
  clamped painted tiles and the empty sprites fixed.
- 2026-10-17 – The critic loop (16.12): three critics score each round
  against the MM6 shots; round 1 scored 2.5 to 3 and set the gold ramp,
  the warm marble, the slots, the recessed cells and tubes, the alcove
  shelf, the slabs, the engraved bevels, the painted sky.
- 2026-10-17 – First phone pass (16.11): dither off, posterise 8 levels,
  bloom off, 540 lines, outdoor water flat, forests nearer, ambient lifted,
  the shake roll set not added, the talk window mapped for the rotated
  phone, the dev overlay carrying the frame's numbers.
- 2026-10-17 – Hand-painted shell (16.10): surfaces painted stroke by stroke
  and posterised on a 1998 pixel grid, buttons painted per size, bitmap type
  with hard edges; Tinos replaces IM Fell English for the body.
- 2026-10-17 – Spells made visible (16.9): bolts fly from the hand at the
  monster nearest the middle of the view; buffs are not faked, they say they
  take no hold yet.
- 2026-10-17 – Press feel: buttons click on touch and travel with a turned
  bevel; the inventory on drawn leather with line-art item glyphs; the type a
  size larger and the labels in yellow (16.8), on the owner's note.
- 2026-10-17 – Talk: the villager's face in the talk panel is the model
  itself, rendered live (16.7), never a generated portrait (16.5). The panel
  is MM6's wooden window with its topics in the yellow italic; the first two
  quests are the valley's bandits and goblin scouts, and kills pay experience.
- 2026-10-17 – First look pass under the owner's thirty-minute "wow"
  deadline: a wow-idea review ranked ten ideas by effect per hour; the
  shader-only ones went in (15.7: wind in the canopies, drifting cloud
  shadows, heat shimmer, mirage and glint, the low desert sun), the dense
  forest settled at spacing 5 / density 0.8 (15.1) after 13,000 trees
  halved the frame rate, and trunk colliders became lazy per 200 m cell
  so the forest costs the load nothing. Not done in the window: the MM6
  restyle of the screens, the Meshy trees in the world (batch 003 running),
  campfire and chimney smoke, birdsong.
- 2026-10-11 – Platform, delivery (PWA), art direction, Meshy pipeline, key
  handling, real-time combat, party of four with full creation, enemies plan,
  HUD direction, design doc kept in repo.
- 2026-10-11 – Engine: Babylon.js. Controls: invisible tank-style move stick
  on the left, stationary-only free look on the right, turn-while-walking via
  right thumb, tap to interact, tap monster to attack with auto-advance to the
  next ready party member.
- 2026-10-11 – Backward walking at one third of forward speed. No strafing.
- 2026-10-11 – Asset pipelines proposed (section 10). Owner can supply ChatGPT
  images free of charge from prompts Claude writes. Meshy API verified:
  Smart Topology is `meshy-t2`, rigging is humanoid-only.
- 2026-10-11 – Dungeon geometry is generated from a 3D cell grid (section
  11), with multi-level, over-and-under, ledges, stairs, caverns and water.
  Characters are 2D portraits and paper dolls with diff-extracted equipment
  overlays (section 12). Music: owner-generated plus CC0. One concept image
  per Meshy model. CC0 texture libraries verified reachable.
- 2026-10-14 – World render resolution 1080 lines (720 preset); UI and text
  at native resolution.
- 2026-10-14 – Implementation plan (`PLAN.md`) approved: phase order with 2
  and 4 interleaved, GitHub Pages hosting, dev-only test arena in Phase 1.
- 2026-10-14 – **Rendering look re-targeted** to the owner's five reference
  images (early-2000s 3D realism: low-poly, low-res textures, warm point
  lights, bloom, tinted fog, split-toned grade, linear upscale). MM6 filter
  kept as an off-by-default option. Section 4 rewritten.
- 2026-10-14 – Sideways strafing on the left stick (one axis per gesture,
  blocked while looking), first at backward speed, then doubled to two
  thirds. Magnetic level view added, then made an off-by-default toggle. In
  the installed app, text selection, press-and-hold callouts and pinch or
  double-tap zoom are disabled everywhere except the diagnostic text boxes.
- 2026-10-14 – Phase 0 accepted on device. Phase 1 built: palette-LUT filter
  (256-colour palette extracted from the reference screenshots' viewport,
  64³ LUT, Bayer dither with cell size), posterize mode, vertex-lit fogged
  material, touch zones per 7.1, Havok capsule controller with instant
  start/stop, dev arena and tuning panel in a separate dev build at `/dev/`.
- 2026-10-15 – Water looked wrong from inside the undercroft (owner's
  screenshots): Babylon's water shader lifts vertices by five times its wave
  height, so a 5 cm setting folded the 1 m mesh into 25 cm ridges, and the
  clear water showed the torch-lit floor through them. Waves are now 3 cm
  with a 4 m wavelength, the water is more opaque (blend 0.72) with a softer
  ripple (0.08), and the dev slider range matches.
- 2026-10-15 – Water stood still on device (owner: "is the water supposed to
  not be moving?"). Two causes in Babylon's `WaterMaterial`: its `time`
  uniform counts hundreds of seconds, so with our metre-scaled ripple UVs the
  stock-sized wind force drifted 3 mm/s and a swell took 21 minutes; and it
  only advances that clock when a frame's delta differs from the previous
  one, which stalls on iOS Safari's millisecond timer. The look is now in
  metres and seconds (`water-motion.ts` converts: still ripples drift
  0.12 m/s, rivers 0.8 m/s along their flow, one swell per 3.5 s, 4 cm high),
  the materials read our own simulated clock, and a second ripple layer
  (`bumpSuperimpose`) stops the drift reading as one sliding sheet. The dev
  panel exposes wave period, ripple drift, river flow and ripple size.
- 2026-10-15 – **Kaleidoscope reflections fixed** (owner's screenshot from
  inside the undercroft, "looks like ass"). Babylon's `WaterMaterial` mirrors
  and clips the scene at its mesh's own position, and our water meshes sat at
  the origin with world-space vertices, so every body reflected about height
  zero (8.6 m above the undercroft pool) and refracted the whole room. Water
  meshes now sit at their water level with vertices relative to it. The
  vertex waves are gone for good: the shader lifts the mesh in a lattice of
  cusps and samples the mirror through them, which can only fold the image,
  so the surface is flat and all motion is the two ripple layers (a richer
  generated ripple map: 18 directional waves on a 2 m tile). Babylon's
  non-linear fresnel (`fresnelSeparate`) is on, so grazing views are a mirror
  with a tint of its own and looking down shows through. Dev panel: "mirror
  tint" replaces the wave sliders.
- 2026-10-15 – **Ripple slider slid the whole reflection** (owner's
  screenshots). Two causes. The water shader perturbs the reflection per
  pixel only when its NORMAL define is on, which Babylon sets only while a
  light reaches the mesh with lighting enabled; we had disabled lighting (so
  the torch would not light the water) and the shader fell into a branch
  that applies one constant offset. The shader never uses the light's diffuse
  result, so lighting is on again with one hemispheric light scoped to the
  water meshes and black specular. Second, `WaterMaterial.dispose()` disposes
  its bump texture, and ours is shared and outlives the materials, which are
  rebuilt when "water passes" changes; it is detached before a material is
  disposed. The e2e test toggles the passes and checks both. The ripple map
  is normalised to a typical 16° tilt so the default ripple is visible.
- 2026-10-15 – **Gap between the brook and the fall** (owner's screenshot).
  The brook ended 20 cm short of the lip, the foam faded in over the first
  12 % of the sheet (3 m on the chasm fall) and the sheet ran 2 m out
  horizontally before bending. Now the brook ends at the lip, the planner
  records each sheet's arc length so the runtime fades the foam in over
  0.6 m, and the first Bézier control point sits at 15 % of the run so the
  sheet bends down within a metre of the lip.
- 2026-10-15 – **No sound on the phone** (owner). Three iOS facts applied:
  Web Audio obeys the ring/silent switch unless the page asks for a playback
  audio session (`navigator.audioSession.type = 'playback'`, iOS 17+); the
  context is suspended when the app goes to the background, so every gesture
  and every return to the foreground resumes it, not only the first touch;
  and a low-passed brown-noise roar is almost inaudible on a phone speaker,
  so the waterfall gained a spray hiss band around 3 kHz. The context's
  state changes are written to the dev log ("audio: running").
- 2026-10-15 – **Audio on v59** (owner): sound starts on the first touch,
  which is the platform rule (no browser plays before a gesture); the
  playback session kept playing while the app was minimised, so the context
  is now suspended whenever the page is hidden; the fall was "way too loud",
  so each fall's loudness is lower and a master "waterfall volume" (default
  0.6) is in the dev panel; and the slow swell is gone because a fall is a
  continuous stream. The first cut (master 0.4, gentler falloff) left the
  hall silent on the phone, so the falloff is now steeper (reference 4 m,
  rolloff 1.6): clear at the fall, a murmur from the hall.
- 2026-10-15 – **Now Playing widget** (owner): the playback audio session
  makes iOS treat the page as media, with the widget in game and when
  minimised. The session is now "ambient" by default, which is what iOS
  games get: no widget, mixes with music, stops in the background, and is
  muted by the ring/silent switch. A dev-panel select switches between
  ambient and playback for comparison.
- 2026-10-15 – **Updates not reaching the phone**: the owner tested v59 for
  an hour after v62 was live; the prompt-mode worker waits for a tap on the
  "Update ready" bar, which was never seen. The development build now applies
  an update found within 20 s of launch by itself (a reload at launch, never
  mid-play); production keeps the bar.
- 2026-10-15 – **Still no sound on v62, phone loud and unmuted** (owner on
  the bridge). The emitter sat at the plunge pool, 23 m below the bridge, so
  with the steeper falloff the fall was near-silent everywhere a player can
  stand. The sheet is now a line source: the emitter follows the point of
  the sheet nearest the listener. The rumble's low-pass is raised to 1.6 kHz
  and the spray hiss mixed higher so phone speakers carry it.
- 2026-10-15 – **v64 log shows "audio: running" and still no sound.** On
  this phone the automatic and ambient sessions were silent and the
  playback session played, which is the ring/silent switch pattern: an
  ambient session is what the switch silences. The session type is now in
  the dev log; while the page is hidden a playback session drops to ambient
  so no Now Playing entry lingers when minimised.
- 2026-10-15 – **Playback session is the default.** The v65 log showed the
  ambient session accepted and the context running, with the phone loud and
  not on silent, and still no sound; the playback session is the only one
  that plays on the owner's iPhone (iOS 18.7). The price is the Now Playing
  widget while in game, which now carries the game's name and icon through
  the Media Session API; while hidden the session drops to ambient and the
  context is suspended, so nothing plays when minimised. The dev-panel
  select keeps ambient available for comparison.
- 2026-10-15 – **v66 silent with media volume at maximum, both sessions.**
  Measured in headless Chromium, the sound graph is healthy: the noise
  sources, gains and panner all carry signal at the level the distance maths
  predicts. What remains is either a level too low for the iPhone speaker
  (the cuts since v59 took about 12 dB off at the bridge) or iOS not
  delivering this context's output at all. A "test tone" button in the dev
  panel plays a 440 Hz beep straight to the output to tell those apart, and
  the fall is back near the v59 loudness (master 0.8, rolloff 1.3).
- 2026-10-15 – **No "turn your phone sideways" prompt** (owner). In a
  portrait viewport the page itself is rotated by CSS and the game runs
  landscape, top edge of the phone to the left; pointer coordinates, zone
  sizes and the safe-area variables are remapped to the rotated frame. The
  overlay is gone; the Android orientation lock attempt stays.
- 2026-10-15 – **Corners with torches too bright** (owner). The world
  material now has a soft light knee: the summed vertex and point light
  above the knee (default 0.9) compresses towards knee + 0.5, so a lamp in a
  corner brightens the wall without blowing it out to white. Dev panel
  "light knee" slider (2.5 is off); the torch power slider tops out at 2.
- 2026-10-15 – **v68 log: the session flipped to ambient at 0.64 s.** The
  dev panel persists its values per device and restored the owner's
  "ambient" choice from an earlier test at every launch, so every build
  since v65 ran the session that is silent on that phone, whatever the
  default. The audio session field no longer persists; fields can opt out.
  A "test sound" button sits on the main screen of development builds
  (two loud square-wave beeps straight to the output) because the one
  inside the long panel was never reached. The torch toggle now shows its
  real state, and the torch is a priority light: it always takes one of a
  material's four light slots, measured against the mesh's bounding box
  instead of its centre, so it no longer loses out to four lanterns on a
  12 m chunk.
- 2026-10-15 – **Test sound plays, the fall does not** (owner, v69). The
  phone's audio path, session and volume are therefore fine and the fall's
  own graph is what iOS refuses to play, although it measures healthy in
  Chromium. The graph no longer uses the 3D panner or the audio listener:
  distance attenuation and stereo placement are computed per frame from the
  nearest point of the sheet and applied to a gain and a stereo-pan node.
  The graph is built only once the context is running, and the dev log
  records when it is built and when it first becomes audible.
- 2026-10-15 – **Root cause of the silent fall, v60 to v70.** The dev panel's
  "waterfall sound" switch displayed "on" whatever its state, and its saved
  value was restored at every launch. The owner switched it off on v59 when
  the fall was too loud; every later build restored that "off" while the
  panel claimed "on". The audio chain was never the fault. Every switch now
  reports its real state and the sound switch no longer persists.
- 2026-10-15 – **Sound is Babylon's audio engine** (owner: "check each time
  whether Babylon already has it", now a rule in CLAUDE.md). The hand-rolled
  Web Audio chain is gone: Babylon's AudioV2 engine owns the context,
  resumes it on the first interaction, carries the listener on the camera
  and spatialises the fall (inverse model, 4 m reference, rolloff 1.3).
  Ours is only the iOS session type, pausing while hidden, and the
  synthesised loop (rumble and hiss rendered offline into one buffer) until
  Phase 4 brings recordings. Panel storage writes are debounced.
- 2026-10-15 – **v71 on device: the fall plays.** Three follow-ups from the
  owner: the loop's seam was audible every few seconds (the render is now
  12 s with an equal-power cross-fade of the tail into the head, applied
  after the filters and limiter); minimising left a short whine (the engine
  is silenced before it is paused); the torch slider showed nothing in lit
  rooms because the light knee swallowed it (priority lights are now added
  after the knee, with a hard cap of 1.6). The top "log" button is gone; the
  panel's "copy log" remains. Phase 3 is accepted with notes; Phase 4 starts.
- 2026-10-15 – **Meshy key is a network secret; the client is the official
  CLI.** The owner added the key as a network secret of the cloud environment
  (host `api.meshy.ai`, Bearer header); the proxy injects it and the key
  never enters the container. Per the library-first rule the client wraps
  `@meshy-ai/cli` (journal, polling, downloads, v1 JSON envelope) instead of
  a hand-written HTTP client, with Node routed through the proxy. `asset run
<nnn>` chains image-to-3D → rigging → animation → download → post-process →
  manifest, writes task records after every step, resumes an unfinished run
  and refuses to rerun a finished batch without `--force`. Dry run verified
  against the live balance (4,790 credits). The CLI exposes `meshy-t2.5` (up
  to 30,000 triangles), so humanoids use it at 4,000; the ten library actions
  are fixed in section 10.1.
- 2026-10-15 – **Concept images for Meshy are photographs, not paintings**
  (owner on the first innkeeper image: "Hate this image. Reeks of AI."). The
  painted style prefix produced generic AI art and would hand Meshy painterly
  texture to copy; humanoid, prop and building cards now use a photographic
  "3D reference prefix" (reenactment costume, real wear, no idealised face,
  flat lighting). The game's filter supplies the period look afterwards.
  `validate` accepts up to 4,400 triangles per character, a tenth over the
  target.
- 2026-10-15 – **Clip sets by role; the first rigged humanoid is an enemy**
  (owner: "Why does an innkeep need a rigged model?"). Service NPCs
  (innkeeper, shopkeepers, trainers, guild masters) are house-screen
  portraits with no 3D model, as in MM6; walking townsfolk get the civilian
  set (idle, walk, talk: three clips, 9 credits); enemies and guards get the
  combat set of ten. The owner's innkeeper photograph
  (`pipeline/inbox/innkeeper.png`) becomes her portrait reference for Phase
  4 step 4. Batch 001 is a bandit, the first slice's humanoid enemy, which
  exercises every clip. Concept images for single-image Meshy input are
  straight front views: Meshy's guidance is a clear front-facing image; the
  three-quarter view in the first card was an inference, kept only for props
  and buildings.
- 2026-10-15 – **First Meshy character: the bandit** (batch 001, approved
  by the owner). Image-to-3D, rigging and the ten combat clips ran through
  the official CLI in three minutes and cost 50 credits (15 + 5 + 30),
  below the 60 estimated; the estimates now use the reported prices. The
  post-processed GLB has 3,641 triangles, ten standard-named clips and one
  512 texture at 1.2 MiB; `validate` passes.
- 2026-10-15 – **The bandit walks in the viewer.** Characters load through
  Babylon's glTF loader (`src/world/character.ts`); the loader's PBR
  material is swapped for the world's retro material over the same
  base-colour texture, so characters get the per-pixel point lights, the
  knee and the fog like everything else. The retro vertex shader now carries
  Babylon's bone includes, which are empty for unskinned meshes. Clips play
  by name through the low-frame-rate stepper (10 steps per second, tunable);
  the dev panel selects the clip. The clip sets live in
  `kernel/characters/clips.ts`, shared by the tools and the runtime. The
  bandit stands four metres ahead of the showcase spawn, facing the party.
- 2026-10-15 – **The bandit on the phone: holes and a bow-legged walk**
  (owner). The holes are in Meshy's mesh: smart topology delivers separated
  parts and left gaps where the belt, the hilt and the collar meet the body
  (four boundary loops of 10 to 20 cm at the front, measured as open
  edges). Owner's call: **do not patch the model**; it is a generation
  problem, most likely the photographic reference (layered, loose costume)
  for a low-poly mode. `validate` now reports gaps between parts and the
  asset stays as Meshy delivered it until regenerated. The Meshy reference
  prefix becomes a clean stylised concept render with fitted clothing and no
  cloak (`pipeline/style.md`). Two rendering faults are fixed regardless: the
  material culled the back faces of the double-sided cloak and apron (now
  drawn two-sided, lit by the side facing the camera), and characters had no
  fill between lamps (a grey fill, 0.22, with a panel slider). The walk is
  bow-legged because the rest pose has the knees 10 cm wider than the hips,
  the photograph's stance kept by the retargeted clips; the card now asks for
  straight legs, and `batch new --pose t-pose` is available. Tapping a
  character in the dev build steps through its clips.
- 2026-10-16 – **Second bandit image, weapons as props.** The owner's clean
  concept render (fitted clothing, straight legs, A-pose) replaces the
  photograph; batch 002 regenerates the bandit from it. Owner's question
  "how will you put a weapon in his hand?": weapons are separate props
  attached to the hand joint (10.1 step 7), not modelled into the
  character.
- 2026-10-16 – **Batch 002: the clean render fixed it.** From the stylised
  concept render the bandit came back with 4,074 triangles, no gaps at the
  belt or collar (the only open loops are the hair piece's border and three
  slivers on the head) and a straight stance (knees 4 cm outside the hips
  instead of 10), so the walk is no longer bow-legged. Cost 50 credits again.
  A ray test's "backed or open" verdict on small loops is not reliable
  enough to fail a build, so `validate` prints small open loops as a note for
  the owner's eye in the viewer instead of a problem. Also learnt: the CLI
  journal refuses to reuse an operation id that was rejected (the first
  attempt hit Meshy's 402 while the subscription had lapsed), so each
  submission attempt gets its own id; and a run's cost is what its tasks
  reported, with the balance delta as a cross-check, since monthly credits
  changed under the run.
- 2026-10-16 – **Bandit v2 accepted as passable; clips to be re-picked.**
  Owner: "I don't like the animations you have chosen but it works and
  looks passable in game." The full Meshy catalog with preview GIFs is in
  `pipeline/animation-catalog.md` for the owner to pick from; swapping clips
  is an animation request on the existing rig (3 credits per clip), no new
  mesh.
- 2026-10-16 – **Overnight mandate.** Owner (going to bed): work through the
  night on best judgement; a full vertical slice without placeholders is
  wanted; up to **900 Meshy credits** may be spent without further approval
  (`pipeline/budget.json`, honoured by `asset run`); free CC0 models and
  textures from the internet are preferred over credits; agentic critics
  are to review the work. The owner also asked when the vast landscapes
  come (ravines, serpentines, woods, passes, ridges, peaks, valleys,
  rivers): the outdoor terrain system starts tonight (section 15). The
  session cannot switch its own model; the work continues on this one.
- 2026-10-16 – **Phase 5 started with combat.** Owner: "What's next?" The
  remaining Phase 4 pipelines (dolls, portraits, icons, audio, fonts) are
  pulled in when a screen needs them; the game itself comes first. Built:
  the rules in section 14 with unit tests, the navmesh runtime on
  recast-navigation, the monster state machine, tap-to-attack with the test
  party and a party strip in the dev build, an end-to-end test in which the
  bandit closes in, swings and falls to taps. "Tap cycles clips" is a panel
  toggle for reviewing animations.
- 2026-10-16 – **The valley: first outdoor region** (section 15). Built
  overnight from the owner's ask for vast landscapes: 1.6 km generated
  terrain with forests, river, serpentine road, pass, ravine and snow,
  distance detail levels and thin-instanced trees, 2.8 MB. The GLB exporter
  now shares vertices within groups and can quantize; the runtime parser
  reads quantized attributes; the retro shader gained a terrain mode (four
  textures by vertex weights, world-metre UVs) and instancing. Found on the
  way: Babylon defines VERTEXCOLOR itself for any mesh with colours, so the
  terrain mode must not redeclare the attribute; and the navmesh climb must
  cover one cell's rise on the steepest walkable slope or hillsides break
  into islands.
- 2026-10-16 – **The village and the road's start.** Seven generated
  timber-framed houses round a well on a flattened square; the road now
  begins at the well, so the party wakes in the village (section 15.2).
  Houses are kernel geometry with real textures, solid in physics and in
  the navmesh. Interiors wait for Phase 6.
- 2026-10-16 – **MM6 rules layer merged** (section 14.5): a background
  agent built `src/game/` (skills, classes, conditions, items, inventory,
  character, creation, experience, spells, spellbook, time, rest,
  services, quests, automap, save, state) with 71 tests; simplifications
  are tabled in `src/game/README.md` for the owner to accept or change.
- 2026-10-16 – **Hit feedback** after the owner's reel (section 14.4):
  flash, whack on the impact frame, blood in the blow's direction,
  knockback, shake and a few frames of freeze; the party struck gets a
  red flash. Sounds are synthesised through Babylon's audio engine until
  recordings land.
- 2026-10-16 – **Screens merged** (section 14.5): a background agent built
  `src/ui/` (sheet, inventory, spellbook, rest, services, creation, quest
  log, automap) over the rules layer with 47 model tests; wired into the
  dev build with a book shelf, pausing the world while open; the dev party
  is now four real character sheets.
- 2026-10-16 – **The desert** (section 15.5): a second generated region
  beyond the pass, joined to the valley by portals at both ends of the
  pass; regions carry their own textures and environment in the sidecar.
  Phase 5b steps 2 to 5 are in; the backdrop and the look pass remain.
- 2026-10-16 – **Backdrop and bandits** (sections 15.6, 14.3): a ring of
  far mountains beyond each region with thinner fog to show it; spawn
  records in the sidecar put eight bandits about the valley and four in
  the desert. Known rough edges for the morning: the backdrop's inner
  facets show from a summit; the scree texture stretches on the gorge
  walls (rock now uses a wall projection, the other slots do not yet);
  the mute button overlaps screen titles; the cave tunnel is sunlit
  inside (no shadows); party state resets on a portal reload.
- 2026-10-17 – **Critic review acted on.** An independent agent reviewed
  35 screenshots and the night's diffs. Fixed: outdoor water reflected an
  empty render target (black pools); the sky and the backdrop now sit in
  every mirror's render list and the passes clear to the fog colour. The
  spawn and portal-arrival headings were mirrored (the party woke facing
  a house wall); one `headingDeg` helper now maps kernel directions to
  headings, with tests that the party faces along the road. The camera
  shake accumulated during the hit stop (the controller now places the
  camera on a zero step); knockback moved per frame, now per second; the
  red flash used a blend mode that cannot reach the canvas; waterfalls
  ran particles and sound at any distance (now within 160 m); the brook's
  ribbon was narrower than its trough, so dry trough counted as wading;
  the automap was never fed; fog colour matched the sky. Left as design
  work: the brook reads as a trench, the cave knoll as a bunker, the
  village walls as plain boxes, the scree smear on gorge walls, salmon
  tint on paths under the palette filter, inventory label truncation.
- 2026-10-17 – **Last pass before the owner looks.** The valley is the
  dev build's default level. The backdrop ring was wound inside out (only
  its back faces drew) and now opens onto the desert at the pass. Four
  tree kinds (pine, spruce, broadleaf, oak) at 6 m spacing: 5,900 trees.
  The full forest's trunks in the navmesh made recast drop the road's
  polygons at the pass, a combination effect no single tree explains; the
  navmesh now takes only trunks within 150 m of the road or the gorge,
  physics keeps them all, and the build's reachability check guards it.
  The river ribbon is narrower than its bed; pools have a sill at the lip
  and water is never drawn from below. Not done: Meshy trees (none of the
  900 credits spent; twenty low-poly trees at about 15 credits each would
  have been the better call), MM6's wooden HUD frame and parchment
  screens (the books are plain dark panels), the brook's trench look, the
  cave knoll's bunker look.
- 2026-10-15 – **Owner's look tuning becomes the default** (sent from the
  dev panel after playing the water build, "looks moody"): posterize filter
  on at 5 levels with dither 0.45 (cell 2), bloom off, vignette 0.6, contrast
  1.0, exposure 0.85, split tone 11, saturation 0, 720-line render preset,
  live per-pixel lights on top of the baked light, fog about half as dense
  (0.016 in the hall), gravity 39, step height 0.4, look 0.33 °/px, turn
  0.23 °/px. The fog slider now scales the per-space presets instead of
  fighting them.
- 2026-10-15 – **Phase 3 built**: live water on every body (quarter-res
  reflection and refraction, clip planes honoured by the retro material),
  waterfall ribbons with scrolling foam, spray and mist, synthesised
  waterfall sound, wading rules, torch light, brazier fire and smoke, fog by
  space. Showcase gained a brook in a side tunnel that falls into the chasm.
- 2026-10-15 – **Phase 3 started.** Owner's call: water reflection and
  refraction render at half or quarter of the world resolution (quarter by
  default, selectable in the dev panel), never full.
- 2026-10-15 – **Phase 2 accepted** on the phone: stairs, spiral and bridge
  walk well; the mood is fine for now; the authoring API was judged by the
  result rather than read. Next: Phase 3 (water, light, atmosphere), with the
  Phase 4 asset pipelines interleaved.
- 2026-10-14 – **Phase 2 kernel built.** Pure-TypeScript geometry kernel
  (`kernel/`): flat-shaded mesh builder with ear clipping and world-unit
  planar UVs, profiles with arcs, extrude/sweep/revolve/loft/arrays, Manifold
  booleans (its zero-area T-junction triangles are kept so re-import stays
  manifold), SDF caves surfaced by marching cubes with smooth-shaded rock,
  element library (walls with plinth and cornice, slabs, columns, straight
  and spiral stairs with ramp colliders, balustrades, bridges, barrel vaults),
  level planner (halls with cut openings, galleries, shafts with portals
  that meet treads, corridors, switchbacks, caverns, water planes, lanterns,
  braziers). Compile step `npm run level:build`: bake per-vertex light with
  shadow rays (geometry first cut along a 1 m world grid so Gouraud light has
  vertices; lamp panes do not cast shadows), Recast navmesh at 0.1 m voxels
  (0.2 m lost the helical ramps to the ledge filter), reachability from
  spawn to every point fails the build, standard GLB (chunks of 12 m with one
  primitive per material role, collider and water nodes, COLOR_0 = baked
  light) plus sidecar JSON. Outputs in `public/levels/` are build artifacts.
  Runtime reads the GLB with a small parser of our own and mirrors X (kernel
  is right-handed like glTF, Babylon left-handed); baked light replaces the
  environment light on level materials; the collider is one static Havok
  mesh shape. The dev build now loads the showcase instead of the arena,
  which is deleted. Showcase: 98k triangles, 4.4 MB GLB.
- 2026-10-11 – Cell-grid dungeon approach rejected. Dungeons are real 3D
  architecture generated by a parametric geometry kernel with CSG and SDF
  caves, real water and waterfalls (section 11 rewritten). Jump is a spell.
  Humans only, two sexes.
