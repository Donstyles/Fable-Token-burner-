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
  where the level is static.
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

Key observation: the game is first-person, so the **party is never seen in
3D**. Like MM6, party members exist as portraits and paper dolls. 3D
humanoids (pipeline 10.1) are for NPCs and enemies only. The party pipeline
is therefore 2D, which is what makes coherence and modularity tractable.

### 12.1 Body template

- One canonical doll canvas (for example 768×1536): front view, A-pose, feet
  on a fixed baseline, head top at a fixed height, with named anchors (head,
  neck, shoulders, chest, hands, waist, knees, feet).
- Body types: **humans only, two sexes** (decided 2026-10-11). So two base
  dolls, each in underclothes, generated by ChatGPT from the template prompt
  and normalised by code (silhouette detection, scale and translate onto the
  anchors). Every wearable item therefore needs exactly two overlays.

### 12.2 Portraits

- For each playable appearance, one ChatGPT **character sheet**: portrait
  bust and full-body base doll of the same person in one image, same style
  tokens. Portrait is cropped to 256×256 and run through the posterize
  filter; the doll is normalised onto the template. Because both come from
  one image, face and body always match.
- Character creation offers several appearances per body type.
- Optional later: expression variants (hurt, casting, dead) by re-prompting
  ChatGPT with the sheet as reference.

### 12.3 Equipment overlays by diff-extraction

- Every wearable item gets one overlay per body type. The owner pastes the
  base doll into ChatGPT with the prompt "draw this exact figure wearing X,
  change nothing else". Code aligns the result to the base (anchor
  normalisation, cross-correlation check), computes an alpha mask by
  thresholded difference with morphological clean-up, and saves the overlay
  PNG. If alignment error is too high the image is rejected and regenerated.
- Slots with fixed layer order per body type: boots, legs, chest, belt,
  gloves, cloak, helmet, amulet, rings, left hand, right hand.
- An item is `{ icon, overlay × 2, stats }`. Roughly 30 items in the slice
  means about 60 overlay images.

### 12.4 Item icons

ChatGPT with a fixed icon template (item alone, transparent background, same
angle and lighting), processed to the inventory grid: items occupy w×h cells
as in MM6. Shop shelves show the same icons.

### 12.5 Style coherence across 2D and 3D

A **style bible** (`pipeline/style.md`) holds the prompt prefix every prompt
card starts with: palette, painterly late-90s fantasy look, lighting,
forbidden elements. NPC and enemy concept images, portraits, dolls, overlays
and icons all share it, so world and UI agree.

## 13. Decision log

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
