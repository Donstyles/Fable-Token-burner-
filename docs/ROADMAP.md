<!-- Proposed 2026-10-19 by the agentic senate (six senators, a chair, two critics), at the owner's order: "Take 20 steps back. Call the agentic senate. Take 20 minutes to plan how you plan to ship a full and playable mm6 clone. Scrap the valley." Pending the owner's answers to section 2. Until he answers, docs/PLAN.md stands, but for the valley, which is scrapped. -->

# The Senate's plan: shipping a full, playable MM6-style game

Final plan, 2026-10-19. It replaces Phase 5b and the old order of Phases 6–7 in `docs/PLAN.md`. Sizes are in agent-days: S is a few hours, M is about 1.5, L is about 4, XL is 8 or more. One agent-day is about one long working session.

## 1. What we are shipping

"Full and playable" means a finished game. You install it from the home-screen icon at the root URL, create four characters, play to an ending, and keep your saves through every update. It is MM6's game: its rules and numbers, its interface and real-time party combat. Its towns have shops, guilds, teachers and homes. Its dungeons have doors, keys, traps and chests. It has wells and obelisks, and monsters come in packs, animals included. It is set in our own world under our own names.

- **Release 1.0, "Act One":** MM6's own first loop at MM6's size:
  - 2 regions and 2 towns, each town with about 20 working places and 10 homes.
  - 3 dungeons.
  - 8 quests, a monthly bounty, and an end screen with a score.
  - The 37 spells that the two towns' guilds sell, and about 100 base items.
  - Party levels 1 to about 12; the trainer's cap is 15.
- **Act Two:** the eastern 3 × 3 of a 5 × 3 grid of regions, with promotions, hirelings, ships and Master teachers, and levels up to about 60.
- **Act Three:** full parity: 15 regions, 39 dungeons, 56 quests, 99 spells, about 570 items and 194 monster records.

**The IP stance:**

- We use MM6's numbers, rules and structures freely, and keep generic names (Fire Bolt, Long Sword, Goblin).
- Every place, person, unique monster, artifact, quest, line of text and map layout is ours. Dungeons copy MM6's room counts and kinds of mechanism, never its floor plans.
- No MM6 image or prose goes into the public repository.
- In M0, `ip:guard` checks the shipped content and the build output against a list of hashed proper nouns. Because the list is hashed, it needs no secret and leaks no words. On a match it prints only the file and line. It does not scan the research docs, which have to name MM6.

## 2. Owner decisions needed now

**Answered 2026-10-19:** "I just want to play some Might and Magic clone.
Don't call it Enroth. Hand design 640 m maps." So: 2, our own world, not
called Enroth; 3, every outdoor map hand-designed on the 640 m grid; the
rest as recommended below. Meshy batches still go to the owner one by one.

1. **What ships first?** _Recommended:_ Act One as 1.0, then Acts Two and Three as later releases. _Otherwise_ (parity before any release): the same milestones, but nothing ships for about 18 months.
2. **Whose world?** _Recommended:_ ours, with MM6's structure and numbers. _Otherwise_ (Enroth itself): the repository and Pages go private, because a public Enroth invites a takedown of both. The effort is about the same (world.md 5.4).
3. **How far does the scrap go?** _Recommended:_
   - The desert goes too.
   - Every outdoor map is authored; nothing comes from a seed.
   - Maps use a 640 m grid (128 × 128 cells of 5 m) with about 450 m playable and the rim as backdrop. This is MM6's ±22,528-unit bound (interface.md 4.7).
   - You, or anyone with a copy of the original, time a walk across one map to confirm the scale.

   _Otherwise_ (keep 1.6 km): each map carries about 12 times the area to fill, and 13,000 trees already halved the valley's frame rate (DESIGN 15.1).

4. **Release channel.** _Recommended:_ from M1a, the root URL is the game, built from the latest tag you approve. `/dev/` builds from every push. The two channels use separate storage and database names. _Otherwise:_ your saves ride on half-finished changes.
5. **How work is accepted.** _Recommended:_
   - The critic loop closes and the look freezes.
   - Each milestone is accepted by a written play script you run on the phone, plus one screenshot of the self-test panel.
   - You play for 15 minutes every second day.

   _Otherwise:_ we go back to scoring stills, which is how the faults that only show on the phone were missed (DESIGN 16.30–16.32).

6. **Real time only?** _Recommended:_ keep DESIGN 7 for Act One. The simulation counts recovery in MM6's 100-unit turns, so adding a turn toggle later is an honest **L** (40–60 h, characters.md 9.9), not a rewrite. We ask again after M2. _Otherwise:_ add L to M2 and test both modes in every dungeon.
7. **Credits.**
   - The brief's 4,790 is stale: `pipeline/batches/011-spell-icons-pass-6.json` ends at **1,888**.
   - About 1,850 credits left the account between batch 001 (4,740 after) and batch 002 (2,890 before), across a lapse in the subscription. DESIGN 13 says "monthly credits changed under the run".
   - Repriced at measured rates (section 6), Act One costs **about 2,150 credits if icon sheets work, about 3,000 if not.**

   _Recommended:_
   - Confirm the live balance with a dry run, and tell us whether credits renew or expire monthly.
   - Approve M1's two batches (about 265 credits) during M0, before any reset.
   - Grant the rest per billing month, batch by batch.

   _Otherwise_ (stay within 1,888): drop the capital's stone buildings and the second dungeon kit, and build the capital from the timber kit.

8. **Monsters.** _Recommended:_
   - Monsters stay 3D (DESIGN 4).
   - You pick about 12 clips once from `pipeline/animation-catalog.md`, including a calm idle (36 credits).
   - All six models share one 24-joint skeleton, so the clips are retargeted by bone name. M0 proves this for 0 credits with the clips we already have.
   - Animals are an Act One deliverable through a procedural rig: rats and spiders at least.
   - If the rig fails, sprites come back to you as a DESIGN 4 decision. Act One does not quietly become humanoid-only.

   _Otherwise_ (sprites now): the 8-facing A/B test (L) goes into M2.

9. **Your art.**
   - **Portraits:** 2 faces per sex × 4 frames (neutral, hurt, down, dead), asked for today. M1a slips day for day without them, because the creation screen's text initial is a stand-in (`creation-model.ts:25`). By release: 8 faces × about 12 frames.
   - **Title image:** by M5.
   - **Music:** 4 tracks (town, wilds, dungeon, title) by M4.
   - **`FREESOUND_API_KEY`:** by M4.
   - **Barks** (character voice reactions): _recommended_ none in 1.0, recorded in DESIGN as a deviation from MM6.
10. **House screens.** _Recommended:_ the talk panel with the keeper's live bust over the dimmed town view, and no painted rooms in Act One. _Otherwise:_ about 14 room pictures from you, and each kind of house waits for its picture.
11. **Rules and feel.** _Recommended:_
    - Apply `docs/held/0001-mm6-stat-table.patch`.
    - Use MM6's numbers everywhere, with bugs fixed the way GrayFace's patch fixes them.
    - Take MM6's feel: walk 3.8 m/s with a run, back up at walking speed, pitch ±22.5°, MM6's field of view and centred horizon, and a 48-minute game day. This partly reverses DESIGN 7.1.
    - Whoever has a copy times the six checks in the Rules paper (recovery, being down at 0, death depth, food, walk speed, field of view). Until then, values are marked "ours".
12. **Quick Start** (four ready-made members) beside full creation. _Recommended:_ yes. _Otherwise:_ every playtest goes through creation.
13. **The old props.** The 42 props from batches 003 and 004 were made with text-to-3D, before the ban. _Recommended:_ keep them, and regenerate one only when it fails on the phone.
14. **Act One cuts.** _Recommended:_
    - No promotions, hirelings (the HUD keeps their two windows' space), ships, Arena, Light and Dark magic, or Masters.
    - No dressed-body doll: equipment slots show item icons.

    Kept in Act One: alchemy, scrolls, wands, homes, wells and obelisks.

## 3. Scrapping the valley

**Removed:**

- **Levels:** `levels/valley/`, `levels/desert/`.
- **Kernel:** `kernel/terrain/valley.ts`, `river.ts` and `desert.ts`.
- **Kernel tests:** the valley, desert, cave-placement, ravine-stream and headings blocks of `kernel/terrain/terrain.test.ts`.
- **Game content:**
  - `VILLAGE_HOUSES` (`src/game/content.ts`), which also removes the rules layer's import of `../ui/context`.
  - Henrik, Greta and the valley quests (`src/game/dialogue.ts`). The topic engine and the quest log stay.
  - `nomad-raider` from the spawns.
  - The 17 unused CC0 photos.
- **Harness:** `src/dev/index.ts:149–156` and its region checks near lines 187 and 254. `src/world/soundscape.ts:215` becomes per-region data.
- **Tests:**
  - `tests/e2e/dev-valley.spec.ts` and `dev-desert.spec.ts` are deleted, but only after their checks are ported to `dev-outdoor`.
  - `dev-dialogue.spec.ts` moves to `dev-outdoor`.
  - `src/ui/dialogue-model.test.ts` gets neutral sample data.
- **Docs:** DESIGN 15 and PLAN 5b are marked superseded, not erased.

**Generalised instead of deleted:**

- `village.ts` becomes plot layout. It takes street plots from a region script and keeps its pads, colliders and lanes, and its tests that doors face the street and nothing overlaps.
- In `trees.ts`, `placeTrees` takes polygon masks instead of `ValleyResult`. `TREE_KINDS` stays, because the sidecar encodes trees by that index.
- `build.ts` becomes the builder for authored regions.

**Moved first:** `kernel/terrain/props.ts` goes to `kernel/props.ts`. It is imported by `tools/props-catalogue.ts:16`, `src/world/props.ts:17` and `src/world/level.ts:22`.

**Kept:**

- **Kernel:** core, csg, sdf, elements, plan, light, nav and export, plus `tools/level-build.ts`.
- **Terrain:** heightfield, chunks, mesh, backdrop, spline, road, noise, solids, stream and cave. I checked each; none imports the valley.
- **Runtime:** the outdoor path in `src/world/level.ts`.
- **Assets:** all of them.

**Dev scenes:**

- `dev-outdoor` is new: a small authored map with two houses, a door, a villager, a pack of three skeletons, and a portal to `dev-showcase`. It keeps the outdoor runtime and talk under test during the refactor.
- The showcase becomes `dev-showcase`; its portal (`levels/showcase/level.ts:19`) now points at `dev-outdoor`. Its 4.68 MB GLB is exempt from the budgets.
- Both are deleted when the start region and the den land (CLAUDE.md), and their tests move with them.

**The new start:** an authored coastal region on the 640 m grid, with:

- a flat sea and a horizon backdrop;
- a harbour town built from the batch-004 timber kit plus batch 012;
- the goblin fort, with `cave.ts` as its mouth;
- the infested shrine;
- one pack far too strong for a new party;
- a walked edge west to the capital's region.

## 4. Milestones

Calendar figures assume about 6 working days a week, at most two lanes of agents that never touch the same files, and a third of each milestone redone after phone playtests.

### M0: Reset and spine (about 23 agent-days, 3–4 weeks, 0 credits spent)

**Goal:** the valley is gone, all gameplay runs outside the harness, the game boots through a real flow, and machines catch the faults that only the owner used to find.

**Work:**

- **Day 1, you:** open `/dev/?dev` at the heaviest spot in the valley and send a screenshot of the overlay. That is the baseline frame rate, taken before the valley is deleted. **S**
- **Scrap** as in section 3, `dev-outdoor` first. **M + M**
- **Generalise `village.ts` and `trees.ts`.** **M**
- **Move all gameplay out of `startDev`** into `Flow`, `Game` and `MapSession`, keeping its behaviour: melee (`:598`), doors (`:659`), spell effects (`:727–822`), the frame loop (`:833`), monster AI, portals and talk. `src/dev` keeps only the tuning panel and test hooks. No new features go into the harness meanwhile. **L–XL**
- **Fixed 60 Hz step** with `step(n)`, headless on `NullEngine` with Havok and recast, plus `?probe`. **M**
- **Settings:** player settings split from dev tuning, with a schema version (`src/app/settings.ts:41` now wipes them on every build), and a Settings screen with music and sound volume and look sensitivity. **S–M**
- **IndexedDB saves**, named per channel: an autosave, 10 slots, the party's position, and export to Files. **M**
- **Screens:** title, game menu, save, load and death, built from the frozen kit. **M**
- **`?selftest`:** a 60-second scripted run of walk, talk, fight 3 and change map (using today's reload path). It ends on one panel: build, insets, fps median and 95th percentile, draws, triangles, save schema, and pass or fail for each invariant. **M**
- **Invariant checks:**
  - no camera roll outside a shake;
  - in `level:build`, every placed instance sits on the ground and meets its collider from all sides;
  - upgrade e2e tests run on committed samples of old storage.

  **M**

- **`ip:guard`.** **S–M**
- **`batch props` made image-first** (`tools/lib/batch.ts:298`). **S**
- **Clip retargeting proof** with the existing clips: the bandit's clips on the goblin and the villager-woman. It gates batches 014 and 015. **M**
- **Docs:** a "current truth" page, the critic logs archived, PLAN's progress table fixed. **S**

**You:** decisions 1–14, the baseline, portraits started, and the contact sheets for batches 012 and 013.

**Exit test** (on `/dev/`):

1. Open the app: the title screen appears.
2. New Game, then create four: you arrive in `dev-outdoor`.
3. Talk to the villager, then kill the three skeletons.
4. Go through the portal to `dev-showcase`, then come back.
5. Save to slot 2, kill the app, reopen it and load slot 2: same spot, same hit points.
6. Set the music volume: after the next deploy it is still set.
7. Send the self-test screenshot.

### M1a: A town to live in (about 21 agent-days, 3 weeks, batch 012 ≈ 120 credits)

**Work:**

- **World outline:** the 5 × 3 grid, each region's theme and level band, the main thread, and where the hard places sit. You approve it. **S–M**
- **`RegionBuilder` v0**: coast, hills and sea level, roads as splines, forest polygons, plots from the building catalogue, entrances, an optional heightmap PNG. It writes a **map sheet** on every compile, a top-down PNG for your review and for the minimap. **L + M**
- **The start region and town:** 12 working places and 6 homes. Spawn groups with count ranges and A/B/C tiers drawn as tints. One overpowered group at the far end. **M–L + M**
- **One house template**, keyed by door instance. **L + S–M**
  - Tavern: rent a room, buy food.
  - Temple: heal, raise the dead.
  - Smith and store: buy and sell.
  - Guild: membership is bought from a resident in a home; books are bought there and learned.
  - Training hall: gold, a cap of 15, and days pass during training.
  - Bank.
  - Homes list their residents.
- **Party by MM6's numbers:** the held patch, the class table, one creation pool for the whole party, 5+⌊L/10⌋ skill points per level, and Quick Start. **M**
- **Feel and the band:** the feel numbers and the clock rate; attack-nearest and Cast ovals with a quick spell; food and gold on the band; the minimap. **M + M**
- **Release:** the root URL is the game, built from the tag; level files cache-first. `dev-outdoor` is deleted. **S–M**

**You:** 16 portrait frames, the map sheet and names sheet, the first tag.

**Exit test** (from the home-screen icon):

1. New Game, then create four in under 3 minutes (or use Quick Start).
2. Buy membership from a resident, then buy a spell at the guild, learn it, and set it as the quick spell.
3. Buy and equip a weapon. Deposit gold at the bank.
4. Kill a goblin pack outside town using the ovals. Train a level: the days pass.
5. Rent a room, then save, kill the app and Continue.
6. Send the self-test screenshot from the town: at least 30 fps median.

### M1b: The first complete loop (about 17 agent-days, 3 weeks, batch 013 ≈ 145 credits)

**Work:**

- **Doors and chests:** doors, keys, chests and levers. Doors are built by the kernel, as final art, like walls. Killed monsters and opened chests are remembered per map, in save v2 with committed fixtures. **M–L + M**
- **The den:** the goblin fort's first wing of 6 rooms, with a chief, a locked door and its key, and a chest. An entrance screen and a confirmation before leaving. **M + S–M**
- **Map changes without a reload:** Havok set up per scene (`src/app/physics.ts:8`), and a leak test of 20 transitions. **L**
- **The quest:** a three-step quest from the town hall, its reward, and the end screen with a score. **M**
- **MM6's wipe rule:** the party wakes a week later at the start town's temple, without its carried gold; banked gold is kept. Down and dead faces on the band. **S–M**
- **Content validator v0.** **M**
- **Start-region performance:** the budgets enforced in `level:build`. `dev-showcase` is deleted. **M–L**

**Exit test** (about week 9–11; the loop is complete here):

1. Continue the M1a save and take the town hall's quest.
2. Enter the den through its entrance screen and fight a pack. Find the key, open the door, kill the chief and open the chest. Leave through the confirmation: the audio keeps playing.
3. Save, kill the app and Continue: the chief stays dead and the chest stays open.
4. Get the party wiped on purpose: it wakes a week later, its carried gold gone and the bank intact.
5. Claim the reward: the end screen appears.
6. Send the self-test screenshot.

### M2: Danger (about 25 agent-days, 3–4 weeks, about 455 credits)

**Work:**

- **The simulation in `src/game`:**
  - Monsters and missiles become data.
  - Recovery on every action, counted in 100-unit turns, with a headless test that steps one fight turn by turn.
  - The monsters' action roll, ranged attacks, elements and resistances on both sides, preferred targets, blows that hit several members, and fleeing.
  - 23 special attacks with saving throws, monster spells, and hit points and experience derived from level.

  **L–XL**

- **The 17 conditions** with MM6's table. **M**
- **The full event layer:** traps, secret walls, teleporters, and wells, fountains, barrels and pedestals with once-per-character flags, refills and autonotes. **L**
- **Animals:** a procedural rig on the rat, then the spider, bat and snake. **L + M**
- **Packs:** evaluate Babylon's `BakedVertexAnimationManager` before writing anything of our own. The self-test fights 15–20 animated monsters. **M–L**
- **`src/data/`** with schemas and about 36 monster records. **M**
- **The gem** as enemy detector and recovery light, and the status strip. **S–M**
- **The infested shrine:** animals, poison and disease, and a teleporter back to the entrance. **M**
- **The encounter simulator in CI:** level 2 after the first fights, 5 after the fort, within ±1. **M**

**Exit test:**

1. In the shrine, a spider poisons a named member; the temple cures them.
2. A goblin of the shaman tier casts a spell, and archers shoot.
3. A trap fires, a secret wall opens, and the teleporter takes you back to the entrance.
4. A well raises a stat once, not twice.
5. The self-test fight of 15–20 monsters holds at least 30 fps.
6. You answer decision 6 again.

### M3: Progression and loot (about 23 agent-days, 3–4 weeks, about 325 credits)

**Work:**

- **Items:** about 100 base items, the 14 standard enchantments, treasure levels 1–3, the generator and loot. Items on the ground show their icon as a billboard. **L**
- **Shops** priced by MM7's formulas, with stock, restocks and opening hours; identify and repair; reputation and its ranks. **M–L + S**
- **Alchemy** (herbs, the bottle, 3 base potions and 10 mixes, with explosions), **scrolls and wands**. **M + S–M**
- **Item in hand and the slot doll.** **L**
- **Teaching:** Expert teachers living in homes, with their gates; guild membership per character; books read from the pack; the spell learning gate dropped. **M**
- **Spells:** the 37 guild spells, the buff store and buff icons. **L**
- **Rest:** food by terrain; rest refused with monsters near. **M**
- **Press and hold to examine.** **M–L**

**You:** first judge the existing 12 spell icons on the phone. No icon credits are spent until you have.

**Exit test** (with a new party):

1. Clear the den, sell the loot and identify a ring.
2. Mix a cure potion. Botch a mix and see it explode.
3. Learn Expert from a teacher in a home.
4. Read a book from the pack and cast it as the quick spell.
5. Train to level 5. Food goes down at rest, and resting near monsters is refused.
6. Send the self-test screenshot.

### M4: Act One content (about 22 agent-days, 4 weeks, about 860 credits)

**Work:**

- **The second region and the capital:** about 20 working places and homes, the castle as a house screen, a coach on a weekday timetable, the edge prompt that passes 5 days, and one overpowered site per region. One of these is a sealed Act Two door with its own entrance screen. **L + M**
- **Dungeons:** the fort grows to 11 rooms, with a lower level, coded doors and cells opened by switches. The thieves' den: 9 rooms, paired switches and one-way doors. **L**
- **Quests and sites:** 8 quests and the monthly bounty, two obelisks, and one monthly shrine. **L**
- **Books:** the Map book, Notes, Calendar, Quick Reference, and the character screen's Awards page. **L**
- **Sound:** music by map and sound effects from Freesound. **M**
- **The validator** over all content. **M**

**Exit test:**

1. Play from a fresh save to the end screen over several sittings.
2. Each dungeon takes about an hour, with a rest inside.
3. Take the coach once and walk the edge once.
4. You reach about level 10 by the third dungeon.
5. Send a self-test screenshot from the heaviest scene after 10 minutes of play.

### M5: Release 1.0 (about 9 agent-days, 2 weeks)

**Work:**

- **Packaging:** a manifest per map, meshopt geometry, gzipped navmeshes, Workbox, `storage.persist()`, and "Download all". **M–L**
- **Performance:** a pass on every map and a 10-minute soak. **L**
- **Fixes** from your playthrough. **M–L**
- **Your title art.**

**Exit test:**

1. Install fresh and choose Download all.
2. Turn on airplane mode and play from New Game to the end.
3. Saves survive killing the app and two updates.

## 5. Content bill

|             | Act One (1.0)                                                                                              | Act Two total   | Full set                            | How it is made                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------- | ------------------------------------------------------------ |
| Regions     | 2                                                                                                          | 9               | 15                                  | `RegionBuilder` script; you approve the map sheet before 3D  |
| Towns       | 2 (≈20 working + ≈10 homes each)                                                                           | 9 (≈180 places) | 15 (447 places, 234 homes)          | plots from the catalogue; `houses.ts` per town               |
| Dungeons    | 3                                                                                                          | 20              | 39 + Arena                          | `LevelBuilder` on kits (2 for 1.0, 6, then 8)                |
| Monsters    | 12 families × 3 tiers = 36 records (7 humanoid, 5 animal)                                                  | ≈25 families    | 194 records                         | data tables; Meshy image-first; shared clips; tiers as tints |
| People      | ≈40 keepers, ≈30 residents                                                                                 | ≈180            | all homes                           | typed data, a names sheet, live busts of tinted civilians    |
| Quests      | 8 + bounty                                                                                                 | ≈34             | 56 + finale                         | event data, proven completable by the validator              |
| Items       | ≈100 base + generated enchantments + ≈15 consumables (≈115 icons; enchanted items share their base's icon) | ≈400            | ≈570, 73 enchantments, 30 artifacts | data tables; icons by text-to-image                          |
| Spells      | 37 (what the guilds sell)                                                                                  | ≈80             | 99                                  | data and effects; icons by the measured recipe               |
| Bonus sites | 2 obelisks, 1 shrine, wells and fountains                                                                  | 9 + 9           | 15 + 12                             | event data                                                   |

## 6. Asset and credit plan

**Measured unit prices:**

- A prop is about 23–24 credits: a concept at about 8 with rerolls, plus 15 for image-to-3D.
- A rigged humanoid is about 28.
- An icon is about 8.25 on its own, or about 1 on a 3 × 3 sheet.

Every batch gets a dry run, a contact sheet, and your approval by number.

| M   | Batch | Contents                                                                  | Credits                        |
| --- | ----- | ------------------------------------------------------------------------- | ------------------------------ |
| M1a | 012   | guild hall, training hall, bank, town hall, pier                          | ≈120                           |
| M1b | 013   | den kit: chest, lever, sconce, crate, bones, beam                         | ≈145                           |
| M2  | 014   | clip library (≈12 clips, one rig)                                         | 36                             |
| M2  | 015   | mage, thug, guard, lizard man (a test of a tail on the rig)               | ≈112                           |
| M2  | 016   | rat, spider, bat, snake, blood sucker                                     | ≈115                           |
| M2  | 017   | shrine kit, 8 props                                                       | ≈190                           |
| M3  | 018   | 3 × 3 icon-sheet test                                                     | ≈10                            |
| M3  | 019   | ≈115 item and consumable icons                                            | ≈110 with sheets, ≈950 without |
| M3  | 020   | ≈25 spell icons                                                           | ≈205                           |
| M4  | 021   | castle and 5 stone buildings                                              | ≈145                           |
| M4  | 022   | 8 fixtures (fountain, obelisk, pedestal, barrel, coach and others)        | ≈190                           |
| M4  | 023   | fort and sewer kits, 16 props                                             | ≈385                           |
| M4  | 024   | 5 civilian bodies, so that no two keepers in a town share a body and tint | ≈140                           |
| All | –     | allowance for regenerations                                               | ≈250                           |

**Act One costs about 2,150 credits with icon sheets, about 3,000 without.** Add about 190 if retargeting fails. Acts Two and Three need about 6,000–8,000 more.

**Your part over Act One, about 55–70 hours:**

| Task                                         | Hours |
| -------------------------------------------- | ----- |
| Portraits (16 frames, then 96)               | 8–11  |
| Title image                                  | 1–2   |
| Music                                        | 4–6   |
| Decisions, the outline, map and names sheets | 4–5   |
| 13 contact sheets and approvals              | ≈7    |
| Playtests (15 min every second day)          | ≈21   |
| Six exit tests                               | ≈6    |
| Two full playthroughs                        | ≈10   |
| Timing checks in the original                | ≈2    |

## 7. Engineering backlog, in order

1. Scrap with `dev-outdoor` first; move the prop catalogue. **M + M**
2. All gameplay out of the harness, which takes no new features until this lands. **L–XL**
3. Fixed step, headless `NullEngine` tests, `?probe`. **M**
4. Player settings split from dev tuning, and the Settings screen. **S–M**
5. IndexedDB saves per channel; v2 with map state; committed fixtures for every version. **M**
6. `?selftest`, invariant checks, upgrade e2e, `ip:guard`. **M + M + S–M**
7. Release channel: `pages.yml` builds the root from the latest tag; level files cached cache-first. **S–M**
8. `RegionBuilder`, the map sheet, the content validator. **L + M + M**
9. Map changes without a reload, the Havok fix, the leak test. **L**
10. The simulation finished: monsters and missiles as data, recovery in turns. **L–XL**
11. The event VM. **L**
12. `src/data/` tables with schemas and count tests. **L, then ongoing**
13. Crowd rendering, and per-map budgets in `level:build`: at most 150 draws, 300k triangles and 3 MB. CI checks counts only; frame rate comes from the phone. **M–L**
14. CI cache of compiled levels, keyed by a hash of the level script and kernel. **M**
15. Measure boot time; bake `paint.ts` at build time if it costs more than 300 ms. **S / M**
16. Level packaging and offline play. **M–L**
17. A device performance pass for each kind of map, and soak runs. **L, recurring**

The iPhone-simulator CI job is dropped. It cannot test a home-screen app's safe areas, and Playwright cannot drive Simulator Safari.

## 8. How we work from now on

**Definition of done for a milestone:**

- The written play script passes on your phone from the root URL (`/dev/` for M0), and your self-test screenshot passes.
- The same script passes as a headless journey through `?probe` and `Game.step(n)`.
- Playwright layout passes run at 932×430 with insets forced, stale storage, and a fight before the walk: touch tests in Chromium, the subset without touch in WebKit.
- No placeholders, and no `dev-*` scene in production.
- At most one page of doc changes.

The next milestone starts only then.

**Rules:**

- **The look is frozen.** `paint.ts` and the CSS change only for a fault seen on the phone, or for these named functional pieces: minimap, compass, food and gold, the four ovals, the gem, the status strip, buff icons, the item in hand, examine. Each piece gets one look pass and then freezes too. No scored rounds until 1.0. After that, one capped round per milestone, judged on your phone's screenshots.
- **Critics play; they do not score stills.** They review code, run the journeys, check names and lines against the style sheet, and check for IP leaks. A critic never accepts a milestone.
- **Every fault you find gets a check,** in the same commit as its fix.
- **No scope enters mid-milestone.** Content documents (outline, map sheet, names sheet, quest outline) come before any content.
- **Research before building.** Check the original or the gap docs first, and use Babylon or an established library (VAT, Workbox, meshopt, retargeting).
- **At most two lanes,** split by files.
- **Each build comes with at most five "try this" items** for you.
- **`docs/MM6-GAPS.md` is the backlog,** not reading.
- **Credits are approved per billing month.**

## 9. Risks and the honest estimate

**Estimate:**

- **Act One:** about 140 agent-days of listed work, about 185 with rework.
  - **The first complete loop:** about week 9–11.
  - **Release 1.0:** in **22–28 calendar weeks**, around April–May 2027, or 30 or more if everything runs in one lane.
- **Act Two:** another 6–8 months.
- **Act Three:** another 5–7 months.
- **Full parity:** about 16–22 months from now, 450–600 agent-days, and 8,000–10,000 credits in total.

**What would blow it up:**

- **Phone performance with packs.** It has never been measured since "unplayable" (DESIGN 16.11). The baseline is taken on day 1; the M2 gate is 15–20 monsters at 30 fps.
- **The runtime move.** It touches everything. Mitigations: the harness freeze, `dev-outdoor`, and the e2e tests kept alive.
- **The animal rig failing.** It goes back to you as decision 8.
- **Credits** expiring, or icon sheets failing (about +840).
- **Your time:** portraits gate M1a, music gates M4.
- **iOS saves:** storage eviction, and deleting the icon deletes the saves. Mitigations: `storage.persist()` and export.
- **Heat, and download size** at Act Two's roughly 20 levels.
- **Content slop or IP leaks** at volume.
- **Merge conflicts** between the two lanes.
- **Polish relapse:** about 63 of the last 226 commits went to look polish and about 25 to the valley.

## The senate's answers to the critics

**Feasibility**

1. Accepted: M0 moves all of `startDev` (spells, melee, AI, doors, portals, talk, frame loop) into `Game`/`MapSession`, sized L–XL; M2's "spell effects leave the harness" line is deleted.
2. Accepted: the arithmetic was right. Act One now matches world.md 6's slice (3 dungeons, 8 quests). It is about 140 agent-days, and 22–28 weeks is published.
3. Accepted: `village.ts` and `trees.ts` are generalised, not deleted. `dev-outdoor` lands before the valley specs go. M1 is split into M1a (the town, about 3 weeks after M0) and M1b (the den and the ending).
4. Accepted: `dev-outdoor` provides the second map, the skeletons and the villager. The self-test changes map through the reload path until M1b. The 4.68 MB showcase is dev-only and exempt from the budgets.
5. Accepted: everything is repriced at measured reroll rates (about 2,150 or 3,000). You confirm whether credits renew. Batches are approved per billing month, and M1's two batches with stable specs are approved in M0. The M4 sum is corrected.
6. Accepted: doors, keys, chests and per-map persistence move into M1b. Kernel-built doors are accepted as final. Batches 012 (town services) and 013 (den kit, with chest and lever) are added in M1.
7. Accepted: an on-phone baseline on day 1, start-region performance work in M1b, and CI budgets on counts only. Corrected: 13,000 trees halved the frame rate; the valley settled at about 9,500.
8. Accepted: storage and databases are named per channel, `pages.yml` builds the root from the latest tag, and level files are cached cache-first from M1a.
9. Accepted: journeys run headless through `?probe` and `Game.step(n)`, WebKit runs the subset without touch, and the simulator item is dropped.
10. Accepted: an owner-hours table (55–70 h) is published, portraits are asked for on day 1, and M1a slips day for day without them.
11. Accepted, all six: `ip:guard` goes into M0, using a hashed list so it needs no token. The retargeting proof costs 0 credits and gates 014–015. A Settings screen with volume goes into M0. The balance bot becomes an encounter simulator (M). The quick spell, training caps and clock rate are each assigned once. Enchanted items share their base's icon.

**MM6 fidelity**

1. Accepted: homes on the house template listing their residents; teachers and membership sellers live in homes; about 30 doors per town; reputation in M3; batch 024 so no two keepers share a body and tint. Rejected: hirelings in 1.0. They are an L-sized system off the first loop's path; the HUD keeps their windows, and they open Act Two.
2. Accepted: animals are an Act One deliverable through a procedural rig (L): rat, spider, bat and snake in batch 016. If the rig fails, it goes back to you under DESIGN 4. The shrine holds animals, not cultists.
3. Accepted: groups, tiers and counts go into M1a's level format; M2 gates on 15–20 monsters at 30 fps; Babylon's `BakedVertexAnimationManager` is evaluated before anything of our own is written.
4. Accepted: MM6's wipe rule (a week later, carried gold lost, banked gold kept), plus gold and food counters and the bank, all in M1.
5. Accepted: the look freeze exempts these functional pieces by name. The minimap lands in M1a, the gem and status strip in M2, buff icons in M3.
6. Accepted: one overpowered site per region (a pack, and a sealed Act Two door); the edge prompt passes 5 days; the outline fixes where the hard sites sit.
7. Accepted: wells, fountains, barrels and pedestals go on M2's event layer with once-per-character flags; two obelisks, a monthly shrine and the monthly bounty in M4; all of them recorded in Notes.
8. Accepted: alchemy with its explosions, scrolls and wands in M3, with their icons in batch 019.
9. Accepted: Act One's spells are the 37 that the two towns' guilds sell; icon batch 020 follows them; membership is per character, bought from a resident.
10. Accepted: special attacks, preferred targets, blows that hit several members, monster spells, and HP and XP from level are named in M2, whose exit test shows a poisoning and a cast.
11. Accepted: the toggle is resized to L (40–60 h); M2 counts 100-unit turns, with a headless test that steps a fight turn by turn.
12. Accepted: a 640 m grid with about 450 m playable and the rim as backdrop, confirmed by a timed walk.
13. Accepted: the den is the fort's first wing and grows to 11 rooms in M4; the thieves' den has 9 rooms; room counts and mechanisms go into M4's exit test, and the layouts are ours.
14. Accepted: the simulator targets level 2 after the first fights, 5 after the fort, about 10 by the third dungeon and about 12 before leaving the capital's region, with CI failing outside ±1.
15. Accepted: decision 9 asks about barks; "none in 1.0" is recommended and recorded in DESIGN as a deviation.
