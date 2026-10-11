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
  left, hold and drag forward to walk. Drag backward to walk backward at
  **one third** of forward speed. Nothing is drawn on screen. The stick is
  tank-style: forward and backward only, **no strafing**.
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

## 8. First playable (vertical slice)

A full vertical: the first town, one dungeon and one quest, playable end to
end on the primary target device from the home screen.

## 9. Open questions

- Animal / monster animation: proposal in 10.2 awaiting sign-off.
- Jump (11.5). Number of body types for the slice (12.1).
- Save system details (IndexedDB in the PWA).

## 10. Asset pipelines (proposed 2026-10-11, pending sign-off)

Principle: **no placeholder assets.** Every asset that enters the repo is the
real thing, produced by one of the pipelines below and recorded in the
manifest. Nothing is scraped from Google Images: results there are
copyrighted and scraping is brittle. The sources below are free, legal and
scriptable.

### 10.0 Sources

| Source | Used for | Cost | Access |
| --- | --- | --- | --- |
| ChatGPT image generation (owner's account) | Concept images for Meshy, tileable textures, UI art, portraits, icons, sky | Free | Claude writes the exact prompt, owner returns the image |
| Meshy text-to-image | Same as above when the owner is unavailable | 3–9 credits per image | API (`MESHY_API_KEY`) |
| Meshy image-to-3D (Smart Topology) | All 3D models | Credits, see 10.1 | API |
| Meshy rigging + animation library | Humanoid rigs and clips | Credits, see 10.1 | API |
| Poly Haven, ambientCG | Photo-based tileable materials (stone, wood, dirt, marble…) | Free, CC0 | Public HTTPS API, no key; verified reachable from the build environment 2026-10-11 |
| Freesound (CC0 filter) | Sound effects | Free | API key, free account |
| Google Fonts (OFL) | Blackletter / serif UI fonts | Free | Download script |

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

- Smart Topology is `model_type: "smart-topology"` with `ai_model: "meshy-t2"`.
  `target_polycount` ranges 100–15,000, default 4,000, triangle-only output,
  parts natively separated. No "T2.5" exists in the API; the web app label
  maps to `meshy-t2`.
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

### 10.1 Humanoids (party, NPCs, humanoid enemies)

1. **Concept image.** Claude writes a prompt card (exact prompt + required
   framing: full body, A-pose, front three-quarter view, neutral grey
   background, flat even lighting, single subject). Owner generates it in
   ChatGPT and returns it. **One concept image per model** (decided
   2026-10-11); no turnaround sheets.
2. **Image-to-3D.** `model_type: smart-topology`, `ai_model: meshy-t2`,
   `target_polycount: 4000`, `pose_mode: a-pose`, `should_texture: true`,
   `texture_resolution: 2k`, `enable_pbr: false`, `auto_size: true`,
   `origin_at: bottom`, `target_formats: ["glb"]`.
3. **Rigging.** `height_meters` per character.
4. **Animation.** One request with the standard humanoid action set (up to
   10 clips, names fixed project-wide): idle, walk, run, attack_1, attack_2,
   hit, death, cast, talk, block. Exact library `action_id`s chosen once and
   reused.
5. **Post-process (code).** gltf-transform: prune, dedupe, quantize,
   meshopt compression, textures downscaled to 512 and optionally
   palette-quantized, clips renamed to the standard names, bounds and
   polycount validated.
6. **Commit** to `assets/characters/<id>/` with a manifest entry.

Credit cost per humanoid is confirmed from `consumed_credits` on the first
batch and then used for estimates.

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

Processor (`tools/texture`): seam repair, resize to a power of two (256 or
512), optional quantization to the project palette, atlas packing for
dungeon tilesets, PNG output (KTX2 later if memory demands it). Every
texture carries its source and licence in the manifest.

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

## 11. Dungeon generation (geometry is generated, never modelled)

Requirements (2026-10-11): elaborate dungeons with walkways, multiple levels,
verticality, over-and-under, ledges, stairs, caverns and water.

### 11.1 Representation: a 3D cell grid

- A dungeon is a 3D grid of 1 m cubic cells, stored in 16×16×16 chunks.
  Levels up to roughly 256×256×64 cells.
- Each cell holds: `material` (air, brick, stone, wood, rock, water, …),
  `shape` (full, ramp N/E/S/W, stairs N/E/S/W, half-slab, pillar, plank),
  `style` (built or cave), `light` (baked), `zone` id and flags (trigger,
  secret, no-fall-damage).
- Over-and-under, multi-level, ledges and bridges are inherent: a floor cell
  with air below it is a ledge; a plank cell over a void is a walkway.

### 11.2 Two meshers, one grid

- **Built areas**: greedy meshing produces large quads per face material,
  UVs in world units so pipeline textures tile across merged faces. Trims are
  added automatically along wall/floor and wall/ceiling edges for the MM6
  built look. Pillar cells become pillars.
- **Cave areas**: cells become a density field, smoothed and perturbed with
  noise, then surfaced with marching cubes and textured triplanar. Vertex
  jitter adds roughness. Stalactites and rubble are props.
- The two styles meet cleanly: cave cells mesh against built cells as flat
  faces.
- **Stairs and ramps**: visual steps, collider is a ramp, so movement is
  smooth.
- **Water**: contiguous water volumes get a surface mesh with a scrolling,
  distorted texture and an underwater tint. One-cell-deep water slows the
  party; deeper water damages it unless Water Walk is active, as in MM6.

### 11.3 Authoring: a level script compiled by generators

- Source of truth per dungeon: `levels/<id>/level.ts`, a script of ordered
  carve-and-fill operations on the grid: rooms (boxes, cylinders, with floor
  height), corridors (paths that may slope), stairs, bridges, shafts, pits,
  lakes (fill to a height), cave regions (noise parameters and seed), plus
  props, lights, doors, triggers, spawns, entrance and exits.
- Procedural helpers with seeds: room-and-corridor layouts, cellular-automata
  cave carving, lake filling, ledge and walkway generation. Quest-critical
  structure is hand-authored in the script; procedural passes add bulk and
  detail. Everything is deterministic from source plus seed.
- **Compile step** (`npm run level:build`, offline): script → grid → chunk
  meshes → colliders → Recast navmesh → baked light → automap data →
  validation. Validation flood-fills walkability from the entrance (stairs and
  ramps included) and fails the build if any quest cell, spawn, door or loot
  is unreachable.
- Generated artifacts are build outputs, not committed; the level script is.

### 11.4 Lighting

Baked per-vertex light: flood propagation from light sources through the
grid, attenuated and occluded by solid cells. On top: a dynamic torch light
around the party and particle fire on sconces. Beyond torch radius it is
dark, as in MM6.

### 11.5 Movement and navigation

- Party: capsule collision with gravity against the generated colliders.
  Falls from ledges cause fall damage, MM6-style.
- NPCs and enemies: Recast navmesh baked from the generated mesh; it handles
  multi-level and over-and-under natively.
- Jump: **open**. MM6 has it; the touch scheme has no jump gesture yet.

### 11.6 Automap and tooling

Top-down slices of the grid per height band give the in-game automap for
free (MM6 had one) and double as a dev tool: slices rendered to PNG for
review in the repo. Editor v1 is the level script plus these slices plus an
in-browser fly-through debug mode. A visual voxel editor comes only if
authoring pain justifies it.

### 11.7 Performance targets (iPhone 14 Pro Max)

Chunk frustum culling; under 150 draw calls and 300k visible triangles;
textures atlased per material family; internal resolution is low by design.

## 12. Characters: portrait, paper doll and equipment

Key observation: the game is first-person, so the **party is never seen in
3D**. Like MM6, party members exist as portraits and paper dolls. 3D
humanoids (pipeline 10.1) are for NPCs and enemies only. The party pipeline
is therefore 2D, which is what makes coherence and modularity tractable.

### 12.1 Body template

- One canonical doll canvas (for example 768×1536): front view, A-pose, feet
  on a fixed baseline, head top at a fixed height, with named anchors (head,
  neck, shoulders, chest, hands, waist, knees, feet).
- One **base doll** per body type (race × sex), in underclothes, generated by
  ChatGPT from the template prompt, then normalised by code (silhouette
  detection, scale and translate onto the anchors). Number of body types for
  the slice: **open** (MM6 has human, elf, dwarf, goblin × two sexes).

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
- An item is `{ icon, overlay per body type, stats }`. Cost control for the
  slice: a small set of body types and roughly 30 items.

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
