# MM6 gap analysis

What Might and Magic VI: The Mandate of Heaven (New World Computing, 1998)
has, what this project has, and what is missing or wrong. Written
2026-10-17 against commit `da0cb19` and consolidated on 2026-10-18 against
commit `9962ada` with the six deep dives below and the night's fixes. Where
a deep dive showed this overview wrong, the text says so ("corrected
2026-10-18"). The owner wants a complete re-creation of MM6's systems; this
document measures the distance.

## Scope and method

- Every MM6 system was listed from public sources (see Sources at the end)
  and compared with the code. File paths and functions are cited.
- No game binary or data file was opened. The Might and Magic Wiki refuses
  automated reading, so its facts come from search-engine extracts and are
  marked "(MMW)".
- The owner's MM6 screenshots in `artwork/reference/` were used to check
  numbers. They are third-party reference images, cited as "screenshot-NN".
- "Unverified" marks MM6 behaviour no source here confirms. Nothing marked
  unverified should be built from this document alone.
- Status words:
  - **Missing**: no code, or a stub.
  - **Partial**: some of it exists; the missing part is named. Code that
    exists but cannot be reached in the playable build is Partial.
  - **Present but deviates**: it exists and works, but plays differently.
  - **Present**: it matches MM6 as far as the sources show.
- Size key, as in `docs/PLAN.md`: S hours, M a day or two, L several days,
  XL a week or more.
- Build artefacts in `public/levels/` were read for spawn counts. No build,
  test or script was run.

## Deep dives

Each area below has its own report in `docs/gaps/`, written against the
code with MM6's numbers, sources, file and line references, sized fixes
and the checks the owner can run in the original:

- `monsters.md`: the monster record, special attacks, AI and the roster.
- `magic.md`: all 99 spells, costs, recovery, resistances and cures.
- `items.md`: the catalogue, enchantments, treasure, shops and alchemy.
- `world.md`: the regions, towns, dungeons, houses, quests and services.
- `characters.md`: creation, statistics, classes, skills, training, the
  combat model, conditions, death, hazards, food and rest.
- `interface.md`: movement, the controls and their touch translation, the
  HUD's live parts, every screen, sound, music, day and night.

The deep dives are later and fuller than this overview. Where they
disagree, the deep dive holds; the sections below were corrected to match.

## First: what "the playable build" is

This frames every section below.

- The production build contains no game. `src/main.ts` loads the game only
  when `import.meta.env.DEV` is true or the build mode is `devbuild`
  (line 62). Production boots an empty scene. `vite.config.ts` also leaves
  the levels out of the production precache (`globIgnores`, line 88).
- The game is the development build at `/dev/`: `startDev` in
  `src/dev/index.ts`, with the tuning panel and the test hooks.
- A fresh launch starts a new game with four fixed test characters
  (`testCharacters()`, `src/dev/index.ts` line 286). Character creation
  appears only with `?create` (line 279).
- A fresh launch does not load the save. Only a portal arrival or
  `?continue` reads it (line 289). The next autosave then overwrites it.
- "Present" below therefore means "present in the dev build".

## Executive summary: the twenty gaps that most change MM6

Re-ranked on 2026-10-18 with the six deep dives, by how much each changes
the experience of playing MM6. Each names the deep dive that holds the
numbers, the sources and the files. Sizes use the key in "Scope and
method"; hours are the deep dives' estimates of one person's code and
tests. Section 38 turns the list into milestones and section 37 lists the
decisions they wait on.

1. **Enroth's shape is missing.** MM6 is fifteen outdoor maps on a five
   by three grid, harder from east to west (monsters of levels 2 to 11
   round the start, 16 to 100 in the six western maps), joined by 17
   walked edges of five days and 5 sea crossings, with 15 settlements
   (447 numbered places), 39 dungeons and the Arena. Early regions hide
   late dungeons, so the party comes back. The project has a generated
   valley with one village of four working houses, a desert, the
   showcase dungeon and two portals. Detail: `docs/gaps/world.md` 1, 2
   and 5. Size: about 210 working days of content (±50 %) on top of the
   systems below, new kinds of terrain included (sea and islands, a
   crater, a swamp, a snowfield); the first slice (world.md 6) about 16
   days.
2. **The RPG loop cannot turn.** No training hall (MM6 has ten, capped
   from level 15 to none, priced at the hall's base × the current level
   × the promotion tier, eight days a visit); no guild (eleven magic
   guilds of two halls each and six skill guilds; books are items read
   from the pack); no teacher (Normal skills at the guilds, Expert at
   skill 4 for a fee per skill, Master behind a skill level, a fee and a
   statistic, promotion, reputation, quest or item); no promotion (each
   tier raises the hit and spell point factors for past levels too, and
   other classes get honorary titles); and 5 skill points a level where
   MM6 gives 5 + ⌊L ÷ 10⌋. Detail: `docs/gaps/characters.md` 5.2, 7 and
   8.3; `docs/gaps/world.md` 4.3, 4.4 and 4.9; `docs/gaps/magic.md` 5.1.
   Size: L in code (about 40 hours), plus the houses and teachers placed.
3. **Four humanoid melee kinds stand in for 194 monster records.** MM6
   has 57 families of three tiers (52 by the wiki's count), 17 uniques
   and 6 quest variants. Level sets hit points and experience; 78 tiered
   types shoot and 54 cast one of 19 spells; a hit tries one of 23
   special attacks with chance level × multiplier, and the late ones are
   lethal; AI types flee at 30, 20 or 10 % of hit points or never; 41
   types prefer a class or a sex and 26 strike several members at once;
   each map rolls its three families by difficulty on the first visit
   and refills after 6 to 24 months. 19 families need non-humanoid
   bodies, and MM6's first two dungeons are mostly animals. Detail:
   `docs/gaps/monsters.md` summary, 1.2, 2, 3.5 and 4. Size: XL: rules
   without art in two blocks of one to two weeks; procedural rigs L, then
   M per body plan; flyers L; the roster about 2,170 Meshy credits in
   five waves.
4. **There is nothing to find.** MM6 has about 570 item records, 14
   standard and 59 special enchantments, treasure levels 1 to 6 and 30
   artifacts and relics, drops set per monster, chests trapped at each
   map's strength, identify and repair by skill against each item's
   difficulty, 47 shops of four kinds with regular and special stock,
   restocks and hours, six banks, and a mixing table whose wrong pairs
   explode. The project has 17 hand-made items, most with MM6's numbers
   wrong, and no loot. Detail: `docs/gaps/items.md` summary, 8, 9 and 10.
   Size: XL in code (ten steps, about three weeks); XL in art (231 icons,
   92 paper-doll overlays, ground sprites).
5. **Magic is a quarter built, and a cast costs no time.** 24 of 99
   spells, six of them inert; no Light or Dark; casts set no recovery
   (MM6's run from 60 to 1,000 ticks by spell and rank, read from the
   game), so spell points are the only limit; no buff store, no quick
   spell, no damage types or resistances on either side, no cure windows,
   no place or time gates, and a learning gate by spell level that MM6
   does not have. Detail: `docs/gaps/magic.md` 2, 3, 5 and 7. Size: XL in
   ten groups; the first (the shared base and the 24 made right) M.
6. **There is no story.** MM6 logs 56 quests (17 main, 12 promotion, 27
   side) before the Hive. The main quest is a funnel with four gates (six
   council votes, the traitor, four crystals, the cube and the blasters);
   promotions are quests with places and dates; six activities repeat
   (Arena, Circus, bounties, obelisks, pilgrimages, collectors); the
   ending has two outcomes and a score screen. The project has two kill
   quests. Detail: `docs/gaps/world.md` 3 and 5.3. Size: XL of content;
   the quest engine exists but needs item, reach, deliver and promotion
   objectives fed in play.
7. **Dungeons have no mechanics.** MM6's maps run event scripts: doors
   locked by key or code, levers, puzzles solved in order, timed steps,
   teleporters, secret doors found by Perception, trapped chests opened
   with Disarm Trap, spawn triggers and hazards; any decoration or wall
   can carry an event and a name. The project's door, loot and trigger
   points are markers for the build's check. Detail:
   `docs/gaps/world.md` 2.6; `docs/gaps/items.md` 4.7 and 4.10;
   `docs/gaps/interface.md` 6.3 and 6.5. Size: L for the runtime, the
   kernel elements and an event format in the level compiler; content on
   top.
8. **There is no danger beyond hit points.** MM6's table of condition
   effects is known and the project's is invented: Weak halves damage,
   Afraid members still act, poison and disease come in three levels set
   by the attacker, never worsen, and rest heals them only to ½, ⅓ or ¼.
   Nothing in play causes a condition; a wiped party loses nothing (MM6
   wakes it a week later at the start without its carried gold); falls,
   deep water and lava do not hurt; rest has no rules (food by the ground,
   no rest with monsters near, ambushes in camp, Weak after a day awake).
   Detail: `docs/gaps/characters.md` 10 and 12 to 14;
   `docs/gaps/monsters.md` 2.6. Size: M to L (about 35 hours), plus the
   monsters' special attacks (M).
9. **There is no turn-based mode.** MM6 switches between real time and
   turns at any moment, and veterans fight most dungeon rooms in turns.
   DESIGN 7 excludes it (owner, 2026-10-11). Detail:
   `docs/gaps/characters.md` 9.9; `docs/gaps/interface.md` 7.3. Size: L
   (40 to 60 hours, after the recovery and monster actions of gaps 3 and
   5); decision 37.3.
10. **The party is made by the wrong numbers.** Every figure on a level-1
    sheet differs from MM6's: the stat table is one step high (the fix
    waits in `docs/held/0001-mm6-stat-table.patch`); every class's hit
    point base or factor is wrong, as is the Cleric's spell point factor;
    creation gives each member 50 points between −5 and +15 over starts
    of 79, where MM6 gives the whole party one pool of 50 between −2 and
    a cap of 25 over starts of 73. Starting skills, class skill access
    and the invented rank caps differ, and the night's new thresholds are
    a point off at both ends. Detail: `docs/gaps/characters.md` 2 to 5,
    12.1, 15 and 16. Size: M (about 20 hours, no art): the cheapest large
    change in this list.
11. **The HUD lacks MM6's live parts.** No minimap or compass, no food or
    gold on screen, no Cast, Rest, Quick Reference and Options ovals; the
    shelf paints MM6's book emblems on the wrong books; the gem by each
    portrait shows the condition, where MM6's is an enemy detector and a
    recovery light; no faces that move or speak, no buff icons; and the
    phone's shape forces a choice of where MM6's right panel goes.
    Detail: `docs/gaps/interface.md` 2, 3 and 8. Size: L (about 50 hours)
    plus painted faces and recordings.
12. **MM6's controls and view do not carry across.** No run (MM6 doubles
    the walk); backing at a third of the walk where MM6 backs at full
    pace; looking 60° up and down where MM6 stops at 22.5° and centres
    with a key; a view about 106° wide with the horizon two thirds down
    where MM6 shows about 75° (the MM7 engine's figure) with the horizon
    centred; no jump key, no attack-the-nearest, no quick spell, a book
    that casts on the first tap; and nothing in place of the right mouse
    button, which explains every item, spell, skill, statistic, monster
    and portrait. Detail: `docs/gaps/interface.md` 4, 5, 6.1, 6.4, 7,
    9.3 and 13.5. Size: L (about 45 hours), most of it touch design the
    owner decides.
13. **No game shell, and no map remembers.** The shipped app boots an
    empty scene. MM6 has an intro, a briefing, Create Party or Quick
    Start, the game menu, named saves with the autosave first, a Controls
    screen, death and win screens, and a map that keeps its dead monsters
    and opened chests until its refill time. The project starts four
    equipped test members, keeps one autosave, puts a loaded party at the
    spawn and respawns every monster on each load, so kill quests can be
    farmed. Detail: "First" above and section 32;
    `docs/gaps/interface.md` 11; `docs/gaps/monsters.md` 2.10. Size: L
    (about 40 hours).
14. **No travel, and time runs wrong.** MM6 runs 9 coach stables and 11
    ships on weekday timetables (1 to 21 days, 25 to 400 gold), asks
    before the party walks off a map and passes five days, and has Town
    Portal, Lloyd's Beacon, Fly, Water Walk, Jump and Feather Fall; its
    clock gives a game minute two real seconds, and the calendar drives
    coaches, circuses, pilgrimages, solstices and refills. The project
    has two portal discs, none of the spells, and a clock at twice MM6's
    rate. Detail: `docs/gaps/world.md` 1.1 and 4.8; `docs/gaps/magic.md`
    4.2 and 4.3; `docs/gaps/interface.md` 4.3 to 4.6, 10.5 and 13.1.
    Size: L to XL.
15. **Society is empty.** No hirelings (two places; about 50 professions
    that heal, cast once a day, add skills, shorten travel or save food),
    no reputation (named ranks from Notorious to Saintly with numeric
    bounds; it gates the Light, Dark and Diplomacy Masters), no street
    people with professions and news, no Beg, Threaten or Bribe, no bank.
    Detail: sections 20, 25 and 26; `docs/gaps/world.md` 4.5, 4.7 and
    4.10; `docs/gaps/items.md` 6.4 and 6.8; `docs/gaps/interface.md` 8.9
    and 10.4. Size: L, plus the people as content.
16. **No music, and the sound is a sketch.** MM6's map table names a CD
    track for every map (about nine moods across twelve tracks); spells,
    monsters, doors and chests have their own sounds; faces speak
    reactions. The project synthesises footfalls, three impacts and one
    cast sweep. Detail: `docs/gaps/interface.md` 12;
    `docs/gaps/monsters.md` 2.14. Size: M of code (about 20 hours) plus
    the owner's tracks and recordings.
17. **No permanent bonuses to hunt.** Wells, fountains and barrels (the
    early game's main source of statistics), twelve monthly shrines that
    answer only the pilgrimage the Seer names (+10 the first time, +3
    after), the Shrine of the Gods, and fifteen obelisks with their
    treasure, all recorded in the Notes book. Detail: sections 23 and 24;
    `docs/gaps/world.md` 3.4; `docs/gaps/interface.md` 9.4. Size: M on
    the event layer of gap 7, then content.
18. **Houses and passages are forms, not places.** MM6 enters a house
    into its keeper's room (portrait, name, a short menu), keeps hours by
    kind of house, lays a shop's goods on shelves, turns the party round
    on leaving, shows each dungeon's entrance with Enter and Leave, and
    gives the rest screen three waits, an hourglass and a clock that
    runs. Detail: `docs/gaps/interface.md` 9.7 and 10;
    `docs/gaps/items.md` 6.1, 6.2 and 6.7. Size: M (about 25 hours) plus
    pictures of rooms, keepers and entrances.
19. **The fight's finer rules are missing.** Arrows do not fly; there is
    no 51 m cap or distance penalty; a member with a bow shoots at arm's
    length where MM6 strikes; no second weapon (a dagger from Expert, a
    sword from Master); no Master stun, triple strike or second arrow; no
    Blaster; no character resistances, typed damage or Luck. Detail:
    `docs/gaps/characters.md` 4.5, 6.2, 9 and 11; `docs/gaps/items.md`
    1.2 and 3.4. Size: L (about 40 hours).
20. **The character screens and books are thin.** MM6's character screen
    has Stats, Skills, Inventory and Awards pages with the paper doll
    beside each; an item lifted from the pack stays in hand to give,
    drop, equip or mix; the Notes, Calendar, Quick Reference and a
    zooming Map book exist; the sheet shows current and base values,
    resistances and the quick spell. Detail: `docs/gaps/interface.md` 9;
    `docs/gaps/characters.md` 4.6; `docs/gaps/items.md` 5.6 and 10.
    Size: L (about 45 hours) plus the doll's art.

### Fixed on the night of 2026-10-17, and what is still open

Most of step 1 of the old order of work landed overnight (`git log
--since="2026-10-17 20:00"`):

- `af9d537`: a member falls below 0 hit points and dies below minus the
  Endurance score. Still a point off at both ends: MM6's own help puts a
  member down at 0 or less, and death comes at minus the base Endurance
  (characters.md 12.1; an hour's fix).
- `0f27705` and `70fb3b9`: monsters hit by their level, in the world's
  swing too; a struck member's hit recovery and the clock's minute now
  reach play.
- `3c8d1a7`: MM6's spell point costs; Cure Disease at Body 8; Spirit
  Arrow free at Master.
- `bcf5745`: Body Building and Meditation by the class factor; Learning
  9 % plus the skill.
- `1fd089f`: recovery in MM6's units by weapon type, armour, Speed and
  Expert skill, converted at 60 units a second (marked ours: the MM7
  engine's rate), with hit recovery.
- `30b3f56`: armour skills add their level to AC at every rank; the
  penalty is halved at Expert (the Russian table bears this out,
  characters.md 6.3) and gone at Master.
- `44455cd`: a bow shoots with its own bonus, dice and recovery. Still
  open: MM6 strikes a near foe even with a bow (characters.md 9.1).
- `348770d`: weapon skills by MM6's ranks. The Master specials and the
  left hand are not built.
- `ac0420e`: the clock runs while the party walks. It had stood still
  outside rests and waits (magic.md 5.5), so no buff or cure window could
  have ended.
- Held, not on the branch: MM6's stat table, as
  `docs/held/0001-mm6-stat-table.patch`. It changes two src/ui
  assertions that the night's session could not edit (decision 37.4).
- Not judged here: the look rounds 13 to 15 and the spell icon passes.

## Contents

1. Character creation
2. Classes and promotions
3. Statistics and derived values
4. Skills: the list and the rank effects
5. Skill points, teachers and prices
6. Experience, levels and training
7. Magic: schools, spells, costs, recovery, quick spell
8. Combat
9. Monsters
10. Conditions
11. Damage, death and hazards
12. Items
13. Potions and alchemy
14. Scrolls and wands
15. Shops
16. Guilds and spellbooks
17. Temples
18. Training halls
19. Taverns
20. Banks
21. Stables and boats
22. Calendar, time, food, rest, aging and opening hours
23. Wells, fountains, barrels, cauldrons, pedestals, altars and shrines
24. Obelisks
25. Hirelings and reputation
26. People, dialogue topics and news
27. Quests, quest log, autonotes and awards
28. Movement, controls and movement spells
29. Dungeon mechanics: traps, locks, keys, levers, secret doors
30. Automap, minimap and compass
31. HUD and screens
32. Save, load, menu and options
33. Music and sound
34. The world: regions and dungeons
35. Day and night
36. The ending and the score
37. Decisions the owner has to make
38. Suggested order of work
39. Sources

---

## 1. Character creation

**MM6**

- The party is four humans made on one screen. Each has a name, a sex, a
  face and a class (LP update 1; MMX `structs.Player` has Face and Sex).
- The voice belongs to the face. MMExtension lists a separate Voice field
  only from MM7 on (MMX).
- Seven statistics are set from a pool of bonus points. Corrected
  2026-10-18 (characters.md 3.2, two sources): one pool of 50 serves the
  whole party; a statistic may fall at most 2 below its class start, each
  point going back to the pool, and none may pass 25. Every class starts on
  73 points, the values 14, 14, 11, 11, 9, 7 and 7 in its own order.
- Each class has two fixed skills; the player picks two more from a class
  list of nine (GOG thread via search; LP update 1). Screenshot-22 shows a
  level-1 Paladin with Sword, Spirit Magic, Shield and Chain; MM6's class
  text confirms Sword and Spirit as the Paladin's pair, and the Archer
  starts with Bow and Air Magic (characters.md 3.3).
- Weapons and armour start unequipped in the pack. Spells start as
  spellbooks in the pack, to be read (LP update 1).
- The party starts with 200 gold and 7 food (screenshot-30 and others show
  7 and 200 on the counters).
- Screenshot-21 shows a level-1 Paladin aged 26; the Russian character
  tables give starting ages of 20 to 25. Unverified (characters.md 3.4).
- Light and Dark Magic cannot be chosen at creation (RPGC skills).

**Project**

- `src/game/creation.ts`: name of at most 15 letters, sex, portrait id,
  class. A pool of 50 points per character (`CREATION_POOL`, line 17). Each
  stat may go from base −5 to base +15. Every point must be spent. Two
  fixed skills and two picks. Age 20 (`STARTING_AGE`, line 21). The first
  spell of each starting school is learnt at once (`startingSpells`,
  line 112).
- `src/ui/creation.ts` and `creation-model.ts`: the four characters as
  tabs. The portrait is a text initial (`TEXT_PORTRAIT`). No voice.
- `starterKit` in `src/game/state.ts` (line 74) gives the fixed weapon,
  leather armour when the class starts with Leather, and a healing potion;
  `outfit` equips them.
- Starting gold 200 and food 7 (`STARTING_GOLD`, `STARTING_FOOD`) match
  MM6.
- The screen appears only with `?create`. A normal launch skips it.

**Gap**

- No faces and no voices. The party has class sigils in the HUD.
- The Paladin's fixed skills are Mace and Spirit (`classes.ts` line 117);
  MM6 gives Sword and Spirit, and the Archer starts with Air Magic, not
  Leather. Every class's list of optional picks differs (characters.md
  3.3).
- The kit is equipped for the player and the spells are pre-learnt. MM6
  hands over items and spellbooks.
- Age 20, where MM6 shows 26 (unverified for all).
- The pool is per member, with a range of −5 to +15 over starts of 79,
  where MM6 shares one pool across the party: a project party carries about
  four times MM6's bonus points (characters.md 3.2).
- Creation is not part of the normal start.

**Status:** Partial. **Size:** M for the code; L for faces (art).
**Depends on:** the portrait pipeline (DESIGN 12), the game shell
(section 32).

## 2. Classes and promotions

**MM6**

- Six classes, each with two promotions (MMX `const.Class`):
  - Knight → Cavalier → Champion
  - Paladin → Crusader → Hero
  - Archer → Battle Mage → Warrior Mage
  - Cleric → Priest → High Priest
  - Sorcerer → Wizard → Archmage
  - Druid → Great Druid → Arch Druid
- Promotions raise the gains per level, for the levels already gained too.
  Corrected 2026-10-18 (characters.md 4.3 has the table): Knights gain 4, 6
  and 8 hit points a level by tier; every other class gains one more hit
  point and one more spell point a level per tier. Members of the other
  classes get an honorary title that opens the same Master teachers.
- Promotions gate Master teachers (RPGC skills): Sword and Spear need
  Cavalier, Bow needs Battle Mage, Chain needs Crusader, Plate needs Hero,
  Air needs Archmage, Spirit needs High Priest.
- Promotion quests (DOB, CYB, MGW High Council; details per fan guides):
  - Knight: a nomination scroll from Chadwick Blackpoole for Lord Osric
    Temper (Cavalier); discharge papers from the Warlord's Fortress
    (Champion).
  - Paladin: rescue Melody Silver from the Silver Helm Outpost (Crusader);
    kill the dragon Longfang Witherhide and bring its claw to Regent
    Wilbur Humphrey (Hero).
  - Archer: Lord Stromgard's quests: the keys to the Dragon Towers give
    Battle Mage, and resetting six towers gives Warrior Mage (settled in
    world.md 3.2).
  - Sorcerer: drink from the fountain outside Bootleg Bay, then see Lord
    Albert Newton (Wizard); Terrax's crystal from Corlagon's Estate
    (Archmage).
  - Cleric: hire a carpenter and a stone cutter to repair the Free Haven
    temple (Priest); the Sacred Chalice from the Temple of the Sun for Lord
    Anthony Stone (High Priest).
  - Druid: prayer at a circle of stones on an equinox or a solstice, for
    Lady Loretta Fleise (Great Druid); prayer at the Temple of the Moon's
    altar at midnight under a full moon (Arch Druid) (world.md 3.2).
- Which skills each class can learn (RPGC characters, with the Druid's Mace
  added below):

| Class    | Weapons                           | Armour                        | Magic                                 |
| -------- | --------------------------------- | ----------------------------- | ------------------------------------- |
| Knight   | all eight                         | Shield, Leather, Chain, Plate | none                                  |
| Paladin  | all eight                         | all four                      | Spirit, Mind, Body                    |
| Archer   | all eight                         | Leather, Chain                | Fire, Air, Water, Earth               |
| Cleric   | Staff, Bow, Mace, Blaster         | Shield, Leather, Chain        | Spirit, Mind, Body, Light, Dark       |
| Sorcerer | Staff, Dagger, Bow, Blaster       | Leather                       | Fire, Air, Water, Earth, Light, Dark  |
| Druid    | Staff, Dagger, Mace, Bow, Blaster | Shield, Leather               | the seven non-Light, non-Dark schools |

- Corrected 2026-10-18 (characters.md 5.1): the Druid may learn Mace (RPGC
  says no; three sources and the Druid's starting picks say yes). Every
  class may learn the miscellaneous skills except Meditation, which the
  Knight cannot, and any class that may learn a skill may master it.

**Project**

- `src/game/classes.ts`: the six classes with hit and spell point base and
  factor, base stats, fixed and optional skills and a per-class rank cap
  per skill (`CLASS_DEFS`). No promotion exists anywhere.
- Skill lists differ from MM6's: the Cleric may learn Dagger and cannot
  learn Bow; the Druid cannot learn Bow (its Mace is right); the Paladin and
  the Archer cannot learn Staff; no class can learn Blaster, Light or Dark.
- The rank caps (for example Paladin Dagger and Bow only to Expert) are the
  project's invention. MM6 gates Masters by promotion, stats, reputation
  and quests instead (section 5).
- A check against screenshot-21: a level-1 Paladin with Endurance 15 has 31
  hit points in MM6. The project's formula gives 37 for the same Endurance
  (25 + (1 + 2) × 4), and 33 even with MM6's stat table. Corrected
  2026-10-18: the factor is wrong; MM6's Paladin gains 3 a level, so
  25 + (1 + 1) × 3 = 31, and every class's base or factor differs
  (characters.md 4.3). The same screenshot's 7 spell points do fit the
  project's Paladin base 5 and factor 1 with MM6's stat table.

**Gap**

- Promotions, their quests, their per-level gains and the Master gates are
  missing.
- Class skill access deviates as listed.
- Hit point bases or factors are wrong for all six classes, and so is the
  Cleric's spell point factor (characters.md 4.3).

**Status:** Classes Present but deviate; promotions Missing.
**Size:** M for the rules; XL for the quests and their places.
**Depends on:** quests and dialogue (sections 26, 27), castles in the world
(section 34), teachers (section 5).

## 3. Statistics and derived values

**MM6** (GF-M, unless noted)

- The seven statistics map to an effect value by thresholds:

| Score | 0   | 3   | 5   | 7   | 9   | 11  | 13  | 15  | 17  | 19  | 21  | 25  | 30  | 35  | 40  | 50  | 75  | 100 | 125 | 150 | 175 | 200 | 225 | 250 | 275 | 300 | 350 | 400 | 500 |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MM6   | −6  | −5  | −4  | −3  | −2  | −1  | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  | 14  | 15  | 16  | 17  | 18  | 19  | 20  | 25  | 30  |

- Might adds to melee damage. Intellect or Personality, times the class
  multiplier, adds spell points. Accuracy adds to Attack and Shoot.
  Endurance, times the class multiplier, adds hit points, and cuts the
  recovery a character suffers when hit by (20 − Endurance effect). Speed
  adds to armour class and takes off recovery. Luck adds to every non-zero
  resistance (not shown on the sheet) and helps resist monster specials.
- Screenshot-21 agrees with the table. Accuracy 15 and Sword 1 give Attack
  +2, so 15 gives +1. Might 17 with a sword of 3–9 gives Damage 5–11, so 17
  gives +2 (the sword's dice are inferred from the range).
- Statistics have a base and a bonus part (MMX `Player` Base and Bonus).
  The sheet shows both ("17 / 17", screenshot-21).
- Age has a natural part and a magical one (MMX `BirthYear`, `AgeBonus`).
  Old age weakens a character (DOB) in steps at 50, 100 and 150
  (characters.md 12.4; corrected 2026-10-18).
- The sheet lists five resistances: Fire, Electricity, Cold, Poison, Magic
  (screenshot-21; MMX `const.Damage` for MM6).

**Project**

- `BONUS_TABLE` in `src/game/stats.ts` (lines 20 to 51) is shifted: 11–12
  give 0 and 13–14 give +1. From 4 to 399 every score gets one point more
  than MM6. At 400 it gives 22 (MM6 25) and at 500 it gives 23 (MM6 30).
  DESIGN 14.1 records the shifted table as the community one; GrayFace's
  table says otherwise. MM6's table waits in
  `docs/held/0001-mm6-stat-table.patch` (decision 37.4).
- `maxHp` and `maxSp` in `src/game/character.ts` (lines 70, 76) follow the
  MM6 shape: base + (level + bonus) × factor, plus Body Building or
  Meditation.
- Accuracy feeds the attack bonus. Speed feeds armour class and recovery.
  Might feeds melee damage. Luck does nothing. Endurance shortens hit
  recovery since `1fd089f`, applied in play since `70fb3b9` (2026-10-18).
- A stat is one number (`Character.stats`). There is no base and bonus
  split. The sheet shows "current (base)" only when a condition changes a
  value (`src/ui/sheet.ts`, `statsColumn`).
- The sheet has no resistances.

**Gap**

- The table, and with it every derived number, is wrong by one step for
  normal scores.
- Luck, the base and bonus split, resistances and aging are missing (hit
  recovery landed on 2026-10-18).

**Status:** Present but deviates. **Size:** S for the table; M for the
split, Luck and resistances. **Depends on:** items and buffs for the bonus
part (sections 7, 12).

## 4. Skills: the list and the rank effects

**MM6**

- 31 skills (MMX `const.Skills` for MM6): eight weapon skills (Staff, Sword,
  Dagger, Axe, Spear, Bow, Mace, Blaster), four armour skills (Shield,
  Leather, Chain, Plate), nine magic schools (Fire, Air, Water, Earth,
  Spirit, Mind, Body, Light, Dark) and ten others (Identify Item, Merchant,
  Repair Item, Body Building, Meditation, Perception, Diplomacy, Thievery,
  Disarm Trap, Learning). No teacher of Thievery appears in the sources,
  and MM6's own skill table marks it unused (characters.md 6.1).
- Three ranks: Normal, Expert, Master. What each rank does (RPGC skills;
  screenshot-23 for Shield):

| Skill                 | MM6 Normal / Expert / Master                                                                                                                                                           | Project                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Staff                 | attack / adds to armour class / stun chance equal to skill                                                                                                                             | attack; Expert armour class (`348770d`); no Master stun                                      |
| Sword                 | attack / shorter recovery / a sword in the left hand                                                                                                                                   | attack; Expert recovery (`1fd089f`); no left hand                                            |
| Dagger                | attack / a dagger in the left hand / triple damage with chance equal to skill, by the help text; the original code uses a flat 10 % and the patch follows the text (characters.md 6.2) | attack; no left hand; no triple damage                                                       |
| Axe                   | attack / shorter recovery / skill added to damage                                                                                                                                      | Present since `348770d`                                                                      |
| Spear                 | attack / adds to armour class / skill added to damage; one or two hands                                                                                                                | Present since `348770d`; the spear is always two-handed (`items.ts`; items.md 1.2)           |
| Bow                   | attack / shorter recovery / two arrows a shot                                                                                                                                          | attack and Expert recovery; the bow's own numbers since `44455cd`; no second arrow           |
| Mace                  | attack / skill added to damage / stun chance equal to skill                                                                                                                            | attack and Expert damage (`348770d`); no Master stun                                         |
| Blaster               | attack / double / triple; no distance penalty from Expert (GF-M)                                                                                                                       | Missing                                                                                      |
| Shield                | skill added to armour class / double / triple                                                                                                                                          | Present                                                                                      |
| Leather, Chain, Plate | skill added to armour class / recovery penalty halved / removed (characters.md 6.3)                                                                                                    | Present since `30b3f56`; there is no plate item                                              |
| Fire to Body          | rank changes spell effects                                                                                                                                                             | partly (section 7)                                                                           |
| Light, Dark           | Clerics and Sorcerers only, learnt in play                                                                                                                                             | Missing                                                                                      |
| Identify Item         | identify by inspecting; better items with skill; double / triple                                                                                                                       | no effect anywhere                                                                           |
| Merchant              | better prices; double / triple; MM7's formulas reproduce MM6's prices (items.md 6.3)                                                                                                   | 2 % per point of bonus, to 50 %                                                              |
| Repair Item           | repair by inspecting; better items with skill; double / triple                                                                                                                         | no effect anywhere                                                                           |
| Body Building         | hit points + skill × class factor; double / triple                                                                                                                                     | skill × class factor × rank since `bcf5745`; the class factors are wrong (characters.md 4.3) |
| Meditation            | spell points + skill × class factor; double / triple                                                                                                                                   | skill × class factor × rank since `bcf5745`; the class factors are wrong (characters.md 4.3) |
| Perception            | avoid trap damage, find hidden doors and treasure; double / triple                                                                                                                     | no effect anywhere                                                                           |
| Diplomacy             | less reputation lost when begging, bribing or threatening                                                                                                                              | Missing                                                                                      |
| Disarm Trap           | open trapped chests safely; double / triple                                                                                                                                            | no effect anywhere                                                                           |
| Learning              | +(9 + skill) % experience; double / triple (5 skill gives 14 %; 10 at Master gives 39 %)                                                                                               | Present since `bcf5745`                                                                      |
| Thievery              | listed, but MM6's own skill table marks it unused (characters.md 6.1)                                                                                                                  | absent, correctly                                                                            |

- The project's "generic Expert and Master" (every weapon skill added to
  attack and doubled at Master, and recovery cut by 0.05 s a point from
  Expert for every weapon) gave way on 2026-10-18 to MM6's rank effects
  (`348770d`, `1fd089f`).
- Body armour adds its skill at every rank since `30b3f56`; before, a
  Normal Leather skill added nothing. Screenshot-21 fits: 8 + 4 + Chain 1 +
  Shield 1 = AC 14 with Speed 13 (bonus 0), the chain mail's 8 and the
  shield's 4 being assumed.
- `equipmentRecoveryPenalty` halves the penalty at Expert and removes it at
  Master since `30b3f56`; the Russian character tables confirm the halving
  (characters.md 6.3).

**Gap**

- Blaster, Light, Dark and Diplomacy are missing; Thievery's absence is
  right (characters.md 6.1).
- Fixed on 2026-10-18: the weapons' rank effects, armour at Normal, Body
  Building, Meditation and Learning. Still missing: the Master specials and
  the left hand (characters.md 6.2); the class factors under Body Building
  and Meditation are wrong (characters.md 4.3).
- Identify Item, Repair Item, Perception and Disarm Trap are learnable but
  do nothing.

**Status:** Present but deviates; four skills Missing. **Size:** M for the
rules; the dependent systems are sized in their sections.
**Depends on:** dual wielding (section 8), items to identify and repair
(section 12), traps and secrets (section 29), reputation (section 25).

## 5. Skill points, teachers and prices

**MM6**

- Corrected 2026-10-18: reaching level L gives 5 + ⌊L ÷ 10⌋ skill points,
  not five (characters.md 7.1; two sources' totals fit the formula
  exactly). Horseshoes from stables give two more (LP update 1).
- Raising a skill from n to n + 1 costs n + 1 points (screenshot-23: "You
  need 2 more Skill Points to advance here" at level 1).
- New skills at Normal are bought in guild halls once membership is paid:
  six skill guilds teach weapons, armour and the miscellaneous skills, and
  the magic guilds their schools, for example the Buccaneers' Lair in New
  Sorpigal (LP update 1; world.md 4.3 has every hall, price and hour).
- Expert needs skill 4 in every skill (verified; characters.md 7.3) and gold.
  Master needs a higher skill, gold and sometimes a stat, a promotion, a
  reputation, a quest or an item. There are two Expert teachers per skill
  and one Master teacher, 90 in all (world.md 4.1). From RPGC skills:

| Skill         | Expert: towns, price                       | Master: place, requirements, price              |
| ------------- | ------------------------------------------ | ----------------------------------------------- |
| Staff         | New Sorpigal, Mist; 2000                   | Silver Cove; skill 8; 5000                      |
| Sword         | Castle Ironfist, Free Haven; 2000          | Blackshire; skill 8, Cavalier                   |
| Dagger        | Castle Ironfist, Free Haven; 2000          | Frozen Highlands; skill 8, Speed 40; 5000       |
| Axe           | Castle Ironfist, Mire of the Damned; 2000  | Mire of the Damned; a quest                     |
| Spear         | Mist, Silver Cove; 2000                    | Mire of the Damned; skill 8, Cavalier; 5000     |
| Bow           | Castle Ironfist, Frozen Highlands; 2000    | Kriegspire; skill 8, Battle Mage                |
| Mace          | Mire of the Damned, Frozen Highlands; 2000 | Kriegspire; skill 8, Might 40; 5000             |
| Blaster       | New Sorpigal, Eel Infested Waters; 2000    | Paradise Valley; a blaster in hand; 5000        |
| Shield        | Castle Ironfist, Free Haven; 2000          | Blackshire; skill 10; 5000                      |
| Leather       | Castle Ironfist, Mist; 1000                | Frozen Highlands; skill 10; 3000                |
| Chain         | Castle Ironfist, Bootleg Bay; 1000         | Mire of the Damned; skill 10, Crusader          |
| Plate         | Castle Ironfist, Free Haven; 1000          | Free Haven; Hero                                |
| Fire          | New Sorpigal, Free Haven; 1000             | Mist; skill 12; 4000                            |
| Air           | New Sorpigal, Free Haven; 1000             | Mist; Archmage; 4000                            |
| Water         | New Sorpigal, Free Haven; 1000             | Mist; skill 12; 4000                            |
| Earth         | New Sorpigal, Free Haven; 1000             | Silver Cove; skill 12; 4000                     |
| Spirit        | New Sorpigal, Free Haven; 1000             | Castle Ironfist; High Priest                    |
| Mind          | New Sorpigal, Free Haven; 1000             | Silver Cove; skill 12; 4000                     |
| Body          | New Sorpigal, Free Haven; 1000             | Silver Cove; skill 12; 4000                     |
| Light         | Silver Cove, Kriegspire; 2000              | Eel Infested Waters; Saintly reputation         |
| Dark          | Frozen Highlands, Blackshire; 2000         | Paradise Valley; Notorious reputation           |
| Identify Item | New Sorpigal, Castle Ironfist; 500         | Free Haven; skill 7, Intellect 30; 2500         |
| Merchant      | Free Haven, Mire of the Damned; 2000       | Silver Cove; skill 7, Personality 30; 4000      |
| Repair Item   | Mist, Silver Cove; 500                     | Frozen Highlands; skill 7, Accuracy 30; 2500    |
| Body Building | New Sorpigal, Castle Ironfist; 500         | Free Haven; skill 7, Endurance 30; 2500         |
| Meditation    | New Sorpigal, Silver Cove; 500             | Mist; skill 7, Personality 30; 2500             |
| Perception    | New Sorpigal, Bootleg Bay; 500             | Mire of the Damned; skill 7, Luck 30; 2500      |
| Diplomacy     | Castle Ironfist, Free Haven; 500           | Frozen Highlands; skill 7, reputation 200; 2500 |
| Disarm Trap   | Castle Ironfist, Free Haven; 500           | Frozen Highlands; skill 7, Accuracy 30; 2500    |
| Learning      | New Sorpigal, Castle Ironfist; 2000        | Silver Cove; skill 7, Intellect 30; 5000        |

- The sources split on four gates (characters.md 7.3; decision 37.12):
  the Fire and Water Masters at skill 12 or Archmage, the Body Master at
  skill 12 or no gate, the Diplomacy Master at reputation 200 or fame 200,
  and the Dark Expert at 2,000 or free. world.md 4.9 places every teacher
  by town.

**Project**

- Raising a skill with points works on the sheet (`raise` in
  `src/ui/sheet-model.ts`, `raiseSkill` and `raiseCost` in
  `src/game/skills.ts`). There is no cap on the level; MM6's stops at 60
  (characters.md 6.4).
- `PROMOTIONS` (`skills.ts` line 147): Expert at level 4 for 1000 gold,
  Master at level 7 for 2000, for every skill. `canPromote`, `promoteSkill`
  and `learnSkill` are never called outside tests. No teacher, no house and
  no screen offers them.

**Gap**

- Learning a new skill after creation is impossible.
- Expert and Master are unreachable.
- The project's single price and level rule replaces MM6's per-skill
  prices, levels, stat gates, promotion gates, reputation gates and quests.

**Status:** Partial (raising Present; teaching Missing). **Size:** M for the
rules and one teacher screen; L for every teacher in the world.
**Depends on:** house screens with proprietors (section 26), promotions
(section 2), reputation (section 25), the world (section 34).

## 6. Experience, levels and training

**MM6**

- Experience to reach level N is N × (N − 1) × 500 (GF-M).
- Levels rise only at a training hall, for gold (LP update 1).
- Each hall trains only up to a level, and prices rise with level.
  Corrected 2026-10-18: ten halls with caps of 15, 20, 30, 40, 50, 60, 80,
  100, 200 and none; a level costs the hall's base × the current level ×
  the promotion tier (1, 2 or 3); Merchant cuts that to as little as a
  third; a visit passes eight days (world.md 4.4; characters.md 8.3).
- Kill experience is split equally among the members who can receive it:
  unconscious, dead, stoned and eradicated members get none. A quest's
  experience goes to every member in full (MMX `AddKillExp`;
  characters.md 8.2, reported).
- Some rewards are large: each Oracle crystal gives 100,000 experience
  (CYB).

**Project**

- `src/game/experience.ts`: the same curve (`xpForLevel`). `levelUp` adds
  five skill points and the class gains. `trainingCost` is 25 gold × new
  level × the hall's multiplier (`TRAINING_GOLD_PER_LEVEL`, line 15).
  `shareExperience` splits equally among members not dead, stoned or
  eradicated.
- Kills pay the monster's experience (`src/dev/index.ts` line 908).
- `renderTrainer` in `src/ui/services.ts` and `train` in
  `src/game/services.ts` work in tests, but no trainer stands in the world.

**Gap**

- Levels never rise in play.
- The project's price model is a guess and its halls have no caps; MM6's
  caps, prices and eight days are known (above).
- Unconscious members share kills, and quest experience is divided
  (characters.md 8.2). Learning's 9 points landed on 2026-10-18
  (`bcf5745`).

**Status:** Partial. **Size:** S to place a hall; M for MM6's prices, caps
and time. **Depends on:** the world (section 34).

## 7. Magic: schools, spells, costs, recovery, quick spell

**MM6, general**

- Nine schools of eleven spells (RPGC; screenshot 2026-07-09-183355 shows
  the Water page and the nine school tabs).
- Spells come from spellbooks, bought at guilds or found, and read from
  the pack (LP update 1).
- Costs by spell level for the seven common schools: 1, 2, 3, 4, 5, 8, 10,
  15, 20, 25, 30. The elemental "arrow" spells at level 2 cost 2, 1 and 0
  by rank, and Spirit Arrow costs 1, 1 and 0. Light costs 20 to 70 in steps
  of 5 and Dark 20 to 200 (MM6's spell table; corrected 2026-10-18,
  magic.md 2: RPGC's 70 and 75 for the top two Light spells are wrong).
- Every spell has a recovery time, and most recover faster with rank. The
  numbers per spell and rank are known from the game's executable, from 60
  ticks (Torch Light) to 1,000 (Resurrection) (magic.md 3.3 and 4;
  corrected 2026-10-18).
- Rank changes the effect: duration, party-wide reach, number of missiles.
  MM6 asks no rank to learn a spell, by inference: every spell has a Normal
  effect, and the rank gate came with MM7 (magic.md 3.1).
- Cures work only within a window since the condition began: 3 minutes
  per skill point at Normal, 1 hour at Expert, 1 day at Master (RPGC, DOB).
  GF-P notes that the original game, by a bug, gave 3 hours and 3 days per
  point at Expert and Master instead of 1.
- Each character has a quick spell, set from the book and cast with one
  button (screenshot-21 "Quick Spell: None"; the book's buttons in
  screenshot-25; GF-P).
- Buffs are timed, on the party or a member (MMX `SpellBuffs`).
- Monster spells always hit the party (GF-M). Of the party's spells, the
  arrow spells, Spirit Arrow and Blades can miss; most other attack spells
  always hit (RPGC; GF-M for Blades' to-hit bonus).
- Monster resistances halve spell damage in steps (section 8).
- Divine Intervention and Armageddon have uses per day (MMX
  `DevineInterventionCasts`, `ArmageddonCasts`).

**Project, general**

- `src/game/spells.ts`: 24 spells. Costs are MM6's since `3c8d1a7`
  (2026-10-18); before, every spell cost its level at every rank. Buff
  durations are 60 + 5 × skill minutes (`buffMinutes`). Spells of levels 1
  to 4 need Normal, 5 to 8 Expert and 9 to 11 Master to be learnt
  (`rankForSpellLevel`), a gate MM6 does not have.
- `src/game/spellbook.ts`: learning and casting checks; a Cursed caster
  fails half the time and still pays.
- The runtime (`performCast`, `src/dev/index.ts`) heals, cures, afflicts,
  brightens the torch, throws bolts and stuns. A bolt goes at the living
  monster nearest the middle of the view within 40 m and 28°
  (`BOLT_TARGETING`, `src/world/spell-target.ts` line 21). Buffs, party
  buffs and Jump print "takes no hold yet" (line 821).
- Casting sets no recovery. Only `Party.attack` and, since 2026-10-18, a
  blow taken set `readyAt` (`src/game/party.ts`).
- There is no quick spell, no buff store, no resistance and no cure window.
  Until `ac0420e` (2026-10-18) the clock also stood still while the party
  walked, so no buff or window could have run out (magic.md 5.5).
- `src/ui/spellbook.ts`: the known schools as tabs, spell ovals, member
  spells aimed by a tap on a portrait. Seven spell icons were added in
  `da0cb19`; the book's use of them was still uncommitted at the time of
  writing.
- In play only each starting school's first spell can be known, plus the
  store's two scrolls, because no guild stands in the world (section 16).

Legend for the tables: **Works** = the effect happens in the dev build;
**Inert** = defined, points spent, nothing happens; **Missing** = not
defined. Costs are MM6's (RPGC, with Sun Ray and Divine Intervention
from MM6's spell table; magic.md 2).

### Fire

| #   | Spell                | MM6 cost  | MM6 effect                                                            | Project                           |
| --- | -------------------- | --------- | --------------------------------------------------------------------- | --------------------------------- |
| 1   | Torch Light          | 1         | more light, 1 hour per skill; brighter at Expert, brightest at Master | Works                             |
| 2   | Flame Arrow          | 2 / 1 / 0 | 1–8 fire, rolls to hit like an arrow                                  | Missing                           |
| 3   | Protection from Fire | 3         | fire resistance = skill × 1 / 2 / 3; 1 hour per skill                 | Inert; duration 60 + 5 × skill    |
| 4   | Fire Bolt            | 4         | 1–4 per skill point; faster recovery with rank                        | Works, deviates: skill d3 + skill |
| 5   | Haste                | 5         | faster recovery; party from Expert; 6 hours of weakness after         | Missing                           |
| 6   | Fireball             | 8         | 1–6 per skill; the blast can hit the party                            | Missing                           |
| 7   | Ring of Fire         | 10        | 6 + 1 per skill to all near; wider at Expert                          | Missing                           |
| 8   | Fire Blast           | 15        | 3 / 5 / 7 streaks of 4 + 1–3 per skill                                | Missing                           |
| 9   | Meteor Shower        | 20        | 8 / 12 / 16 meteors of 8 + 1 per skill; outdoors                      | Missing                           |
| 10  | Inferno              | 25        | 12 + 1 per skill to all in sight; indoors                             | Missing                           |
| 11  | Incinerate           | 30        | 15 + 1–15 per skill to one target                                     | Missing                           |

### Air

| #   | Spell                       | MM6 cost  | MM6 effect                                                                                 | Project                                      |
| --- | --------------------------- | --------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1   | Wizard Eye                  | 1         | the map shows monsters; treasure at Expert; points of interest at Master; 1 hour per skill | Inert (no minimap)                           |
| 2   | Static Charge               | 2 / 1 / 0 | 2–6 electricity; always hits                                                               | Missing                                      |
| 3   | Protection from Electricity | 3         | resistance = skill × 1 / 2 / 3                                                             | Missing                                      |
| 4   | Sparks                      | 4         | 3 / 5 / 7 sparks of 2 + 1 per skill; they bounce                                           | Works, deviates: 1d3 + skill each; no bounce |
| 5   | Feather Fall                | 5         | no fall damage; 5 / 10 / 60 minutes per skill                                              | Missing                                      |
| 6   | Shield                      | 8         | missile damage halved; party from Expert                                                   | Missing                                      |
| 7   | Lightning Bolt              | 10        | 1–8 per skill; always hits                                                                 | Missing                                      |
| 8   | Jump                        | 15        | the party leaps 60 feet with no fall damage                                                | Inert (cost 15 since `3c8d1a7`)              |
| 9   | Implosion                   | 20        | 10 + 1–10 per skill                                                                        | Missing                                      |
| 10  | Fly                         | 25        | outdoors; 5 / 10 / 60 minutes per skill; 1 point every 5 minutes aloft                     | Missing                                      |
| 11  | Starburst                   | 30        | 8 / 12 / 16 stars of 20 + 1 per skill; outdoors                                            | Missing                                      |

### Water

| #   | Spell                | MM6 cost  | MM6 effect                                                                                                  | Project                                          |
| --- | -------------------- | --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Awaken               | 1         | wakes the sleeping party within the window                                                                  | Works, deviates: one member at Normal; no window |
| 2   | Cold Beam            | 2 / 1 / 0 | 2–6 cold; always hits                                                                                       | Missing                                          |
| 3   | Protection from Cold | 3         | resistance = skill × 1 / 2 / 3; 1 hour per skill                                                            | Missing                                          |
| 4   | Poison Spray         | 4         | 1 / 3 / 5 shots of 2 + 1–2 per skill                                                                        | Missing                                          |
| 5   | Water Walk           | 5         | outdoors; 5 / 10 / 60 minutes per skill; 1 point every 20 minutes on water                                  | Inert                                            |
| 6   | Ice Bolt             | 8         | 1–7 per skill; always hits                                                                                  | Missing                                          |
| 7   | Enchant Item         | 10        | 10 % per skill to enchant; stronger at Expert; weapons at Master                                            | Missing                                          |
| 8   | Acid Burst           | 15        | 9 + 1–9 per skill; always hits                                                                              | Missing                                          |
| 9   | Town Portal          | 20        | 10 % per skill; to the fountain of the last town; outdoors at Normal, indoors at Expert, any town at Master | Missing                                          |
| 10  | Ice Blast            | 25        | 7 shards of 12 + 1–2 per skill                                                                              | Missing                                          |
| 11  | Lloyd's Beacon       | 30        | 1 / 3 / 5 beacons; last 1 hour / 1 day / 1 week per skill                                                   | Missing                                          |

### Earth

| #   | Spell                 | MM6 cost  | MM6 effect                                                     | Project                                                 |
| --- | --------------------- | --------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Stun                  | 1         | knocks a monster back and makes it recover; stronger with rank | Works, deviates: nearest monster within 4 m, held 1–3 s |
| 2   | Magic Arrow           | 2 / 1 / 0 | 3–8, rolls to hit like an arrow                                | Missing                                                 |
| 3   | Protection from Magic | 3         | magic resistance = skill × 1 / 2 / 3                           | Missing                                                 |
| 4   | Deadly Swarm          | 4         | 5 + 1–3 per skill; never misses                                | Missing                                                 |
| 5   | Stone Skin            | 5         | armour class +5 + skill; party from Expert                     | Missing                                                 |
| 6   | Blades                | 8         | 1–5 per skill; can miss                                        | Missing                                                 |
| 7   | Stone to Flesh        | 10        | cures stoning within the window                                | Works, deviates: no window                              |
| 8   | Rock Blast            | 15        | 1–8 per skill, explodes                                        | Missing                                                 |
| 9   | Turn to Stone         | 20        | stones a monster 5 / 10 / 20 minutes per skill                 | Missing                                                 |
| 10  | Death Blossom         | 25        | 20 + 1 per skill; outdoors                                     | Missing                                                 |
| 11  | Mass Distortion       | 30        | 25 % of the target's hit points + 2 % per skill                | Missing                                                 |

### Spirit

| #   | Spell          | MM6 cost  | MM6 effect                                                                                          | Project                                                                       |
| --- | -------------- | --------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Spirit Arrow   | 1 / 1 / 0 | 1–6; can miss                                                                                       | Works, deviates: 1d3 + skill and never misses; free at Master since `3c8d1a7` |
| 2   | Bless          | 2         | attack +5 + skill; 1 hour + 5 minutes per skill; party from Expert; +15 minutes per skill at Master | Inert; party only at Master                                                   |
| 3   | Healing Touch  | 3         | heals 3–7 / 5–9 / 7–11                                                                              | Missing                                                                       |
| 4   | Lucky Day      | 4         | Luck +10 + 2 or 3 per skill; party at Master                                                        | Missing                                                                       |
| 5   | Remove Curse   | 5         | cures Cursed within the window                                                                      | Works, deviates: no window                                                    |
| 6   | Guardian Angel | 8         | if the party dies it wakes at the temple for half its gold; 1 hour per skill                        | Missing                                                                       |
| 7   | Heroism        | 10        | damage +5 + skill; party from Expert                                                                | Missing                                                                       |
| 8   | Turn Undead    | 15        | undead flee for 3 minutes + 3 per skill                                                             | Missing                                                                       |
| 9   | Raise Dead     | 20        | cures Dead within the window; leaves Weak                                                           | Works, deviates: no window                                                    |
| 10  | Shared Life    | 25        | pools the party's hit points + 1 / 2 / 3 per skill and shares them                                  | Missing                                                                       |
| 11  | Resurrection   | 30        | cures Eradicated within the window; leaves Weak                                                     | Works, deviates: no window; also cures Dead                                   |

### Mind

| #   | Spell          | MM6 cost | MM6 effect                                                                                                                                           | Project                                                                                      |
| --- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Meditation     | 1        | Intellect and Personality +10 + 2 (Normal) or 3 (Expert) per skill; party at Master                                                                  | Inert; +5 + skill                                                                            |
| 2   | Remove Fear    | 2        | cures Afraid within the window                                                                                                                       | Works, deviates: no window; reaches the party from Expert, which MM6's text does not mention |
| 3   | Mind Blast     | 3        | 5 + 1–2 per skill                                                                                                                                    | Missing                                                                                      |
| 4   | Precision      | 4        | Accuracy +10 + 2 or 3 per skill; party at Master                                                                                                     | Missing                                                                                      |
| 5   | Cure Paralysis | 5        | cures Paralyzed within the window                                                                                                                    | Works, deviates: no window                                                                   |
| 6   | Charm          | 8        | a monster stops being hostile for 3 / 6 / 12 minutes per skill; damage ends it (corrected 2026-10-18: it does not fight for the party; magic.md 4.6) | Missing                                                                                      |
| 7   | Mass Fear      | 10       | monsters flee 3 minutes per skill; not undead                                                                                                        | Missing                                                                                      |
| 8   | Feeblemind     | 15       | a monster cannot cast, 5 minutes per skill                                                                                                           | Missing                                                                                      |
| 9   | Cure Insanity  | 20       | cures Insane within the window                                                                                                                       | Works, deviates: no window                                                                   |
| 10  | Psychic Shock  | 25       | 12 + 1–12 per skill                                                                                                                                  | Missing                                                                                      |
| 11  | Telekinesis    | 30       | works objects at a distance; strength 1 / 2 / 3 per skill                                                                                            | Missing                                                                                      |

### Body

| #   | Spell                  | MM6 cost | MM6 effect                                                  | Project                                                          |
| --- | ---------------------- | -------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Cure Weakness          | 1        | cures Weak within the window                                | Works, deviates: no window                                       |
| 2   | First Aid              | 2        | heals 5 / 7 / 10                                            | Works as "Heal", deviates: 5 + skill × rank                      |
| 3   | Protection from Poison | 3        | resistance = skill × 1 / 2 / 3                              | Missing                                                          |
| 4   | Harm                   | 4        | 8 + 1–2 per skill                                           | Missing                                                          |
| 5   | Cure Wounds            | 5        | heals 5 + 2 per skill                                       | Works, deviates: 10 + 2 × skill × rank                           |
| 6   | Cure Poison            | 8        | cures Poisoned within the window                            | Works, deviates: no window; one poison state, not three          |
| 7   | Speed                  | 10       | Speed +10 + 2 or 3 per skill; party at Master               | Missing                                                          |
| 8   | Cure Disease           | 15       | cures Diseased within the window                            | Works, deviates: no window (level 8 and cost 15 since `3c8d1a7`) |
| 9   | Power                  | 20       | Might and Endurance +10 + 2 or 3 per skill; party at Master | Missing                                                          |
| 10  | Flying Fist            | 25       | 30 + 1–5 per skill                                          | Missing                                                          |
| 11  | Power Cure             | 30       | heals the party 10 + 2 per skill                            | Missing                                                          |

### Light (Clerics and Sorcerers)

| #   | Spell               | MM6 cost | MM6 effect                                                                                            | Project |
| --- | ------------------- | -------- | ----------------------------------------------------------------------------------------------------- | ------- |
| 1   | Create Food         | 20       | 1 day of food + 1 / 2 / 3 days per 10 skill                                                           | Missing |
| 2   | Golden Touch        | 25       | an item to gold at 40 / 60 / 80 % of value; 10 % per skill; failure breaks it                         | Missing |
| 3   | Dispel Magic        | 30       | removes the spells on monsters in sight                                                               | Missing |
| 4   | Slow                | 35       | a monster at half speed and double recovery, 3 minutes per skill                                      | Missing |
| 5   | Destroy Undead      | 40       | 16 + 1–16 per skill to undead                                                                         | Missing |
| 6   | Day of the Gods     | 45       | Power, Meditation, Speed, Lucky Day, Precision and Guardian Angel at 2 / 3 / 4 × skill (magic.md 4.8) | Missing |
| 7   | Prismatic Light     | 50       | 25 + 1 per skill to all in sight; indoors                                                             | Missing |
| 8   | Hour of Power       | 55       | Haste, Heroism, Shield, Stone Skin and Bless at 2 / 3 / 4 × skill                                     | Missing |
| 9   | Paralyze            | 60       | paralyses a monster 3 minutes per skill                                                               | Missing |
| 10  | Sun Ray             | 65       | 20 + 1–20 per skill; outdoors by day                                                                  | Missing |
| 11  | Divine Intervention | 70       | 1 / 2 / 3 a day: full heal, points and cures; ages the caster 10 years                                | Missing |

### Dark (Clerics and Sorcerers)

| #   | Spell             | MM6 cost | MM6 effect                                                                                                          | Project |
| --- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Reanimate         | 20       | a corpse rises with 10 / 20 / 30 hit points per skill and is not made friendly (corrected 2026-10-18; magic.md 4.9) | Missing |
| 2   | Toxic Cloud       | 30       | 25 + 1–10 per skill                                                                                                 | Missing |
| 3   | Mass Curse        | 40       | curses monsters 2 / 3 / 4 minutes per skill                                                                         | Missing |
| 4   | Shrapmetal        | 50       | 3 / 5 / 7 fragments of 6 + 1–6 per skill                                                                            | Missing |
| 5   | Shrinking Ray     | 60       | a monster to 1/2, 1/3 or 1/4 size and damage, 5 minutes per skill                                                   | Missing |
| 6   | Day of Protection | 70       | the five Protections, Feather Fall and Wizard Eye at 2 / 3 / 4 × skill (magic.md 4.9)                               | Missing |
| 7   | Finger of Death   | 80       | 3 / 4 / 5 % per skill to kill outright                                                                              | Missing |
| 8   | Moon Ray          | 90       | monsters take 1–4 per skill, the party heals as much; outdoors at night                                             | Missing |
| 9   | Dragon Breath     | 100      | 1–25 per skill, with splash                                                                                         | Missing |
| 10  | Armageddon        | 150      | 50 + 1 per skill to everything on the map; outdoors; 1 / 2 / 3 a day                                                | Missing |
| 11  | Dark Containment  | 200      | random effects on the target                                                                                        | Missing |

**Gap, in short**

- 75 spells and two schools are missing. Six defined spells are inert.
- The wrong costs were fixed on 2026-10-18 (seven spells and Spirit Arrow,
  not the nine counted here before; magic.md 6). Damage and healing
  formulas differ for six.
- No recovery, no quick spell, no buff store, no cure windows, no
  resistances, no indoor or outdoor limits, no area or chain spells, no
  per-day limits, no targeting by the player.
- No guild in the world, so even the defined spells cannot be learnt.

**Status:** Partial. **Size:** XL (each school is an M of rules and a
runtime effect type; the shared parts, buffs and recovery, are M).
**Depends on:** buff store, recovery (section 8), resistances (section 8),
monsters that can be charmed, slowed or turned (section 9), minimap
(section 30), travel (sections 21, 28), items (Enchant Item, Golden Touch),
guilds (section 16).

## 8. Combat

**MM6**

- Real-time by default. The player can switch to turn-based at any time
  (LP introduction). In turn-based mode a round has phases: monsters move,
  combat, the party walks (MMX `Game.TurnBasedPhase`). GF-P says the
  original's turns took twice as long as intended.
- The first ready member acts. A attacks the nearest foe and S casts the
  quick spell (the manual's key chart; interface.md 5.1; corrected
  2026-10-18).
- Chance that the party hits a monster: (15 + 2 × Attack + Bonus −
  DistancePenalty) / (30 + 2 × Attack + monster AC). Bonus is the Blaster
  skill at Master, or skill × 5 for Blades. DistancePenalty is AC / 2 at
  1024 to 2559 game units, AC + 15 beyond, and 5119 units is the longest
  shot; none for a Blaster from Expert (GF-M).
- Chance that a monster hits a member: (5 + 2 × monster level) / (10 + 2 ×
  monster level + member AC). Monster elemental shots use it too. Spells
  always hit (GF-M).
- Damage: the weapon's dice, plus the Might effect for melee, plus skill
  bonuses (Mace from Expert, Axe and Spear at Master), elemental
  enchantments and Heroism. Bows get no Might (MM6's own help text names
  none; characters.md 4.2).
- Recovery is a sum, in game ticks (GF-M): weapon base (Staff 100, Sword
  90, Dagger 60, Axe 100, Spear 80, Bow 100, Mace 80, Blaster 30, club 100,
  bare hands 100), plus armour (Shield 10, Leather 10, Chain 20, Plate 30,
  reduced by the armour skills), minus the skill, minus the Speed effect,
  minus 25 for Haste and 20 for a "swift" weapon. The floor is 30 for melee;
  bows and blasters have none in real time. Corrected 2026-10-18: the MM7
  engine counts a recovery point as a sixtieth of a second (2.133 of MMX's
  128 ticks a second), so a sword's 90 is 1.5 s, not 0.7 s (monsters.md,
  units; magic.md 3.3). The project uses that rate, marked as its own,
  until it is timed in MM6 (decision 37.5).
- A struck member also gets recovery, cut by the Endurance effect: 20 −
  Endurance effect (GF-M). In the original every monster blow moved the
  selection to another member; the patch moves it only when the member is
  left recovering (GF-P; characters.md 9.7).
- A near foe is struck even by a member carrying a bow; only a far one is
  shot; with neither, the member passes (the manual; characters.md 9.1).
  Melee reaches only a short way; MM6's range is unverified (the MM7
  engine: monsters 307 units, the party about 407 from the foe's edge;
  interface.md 6.2). Shots reach 5119 units (above).
- A second weapon: a sword (Master Sword) or a dagger (Expert Dagger) in the
  left hand (RPGC). In the original MM6 the second weapon's recovery was
  added on, a bug GrayFace's patch fixes (GF-M).
- Specials: daggers triple damage (see section 4), Master Mace and Staff
  stun, vampiric weapons heal 20 % of the damage (GF-M), "of Carnage"
  explodes, slayers do double damage to demons or dragons (RPGC
  enchantments). There is no general critical hit in the sources.
- Resistances: each step of damage reduction succeeds with chance 1 −
  30 / (30 + resistance + Luck effect) for the party, 1 − 30 / (30 +
  resistance) for monsters; each success halves the damage again (GF-M).
  Average damage at resistance 20 is 75 %, at 40 60 %, at 100 39 %.
- Paralyse and Slow land with chance 30 / (30 + monster resistance +
  monster level) in MM6 (GF-M).
- DESIGN 14.4 says the screen flashes red when the party is hit; no source
  the deep dives read confirms it (interface.md 7.4).

**Project**

- Tap a monster: the selected member if ready, else the next ready one,
  attacks; the selection moves on (`Party.attack`, `src/game/party.ts`).
  This matches MM6's flow.
- `hitChance` (`src/game/combat.ts`) is MM6's party formula without Bonus
  and DistancePenalty, and it clamps a negative attack bonus to 0, which
  MM6's does not (characters.md 4.5).
- Monsters hit by their level since `0f27705` and `70fb3b9` (2026-10-18;
  `resolveMonsterAttack`): a level-2 bandit against AC 10 hits 9 times in
  24, where the party's formula with its attack bonus gave 21 in 46.
- Damage: dice plus Might bonus for melee (`damageDice`). No skill damage,
  no enchantments, no Heroism, no resistances, no specials.
- Recovery is MM6's sum in MM6's units, by weapon type, since `1fd089f`
  (2026-10-18), converted at 60 units a second; before, it was seconds per
  item with terms of our own.
- A member with a bow shoots at any range, a near foe included, and a
  member without one cannot hit beyond 3.5 m (`MELEE_REACH`,
  `src/dev/index.ts`). Since `44455cd` (2026-10-18) the shot uses the bow's
  Shoot bonus, dice and recovery; before, it used the melee weapon's. No
  arrow flies; the result is instant.
- Struck members get hit recovery in play since `70fb3b9`. No turn-based
  mode (DESIGN 7: "Real-time only", owner, 2026-10-11). No left-hand
  weapon; the code's claim that MM6 has none was withdrawn in `348770d`.
- Feedback: flash, sound, blood, knockback, shake, hit stop and a red wash
  (`src/world/combat-feedback.ts`). DESIGN 14.4 credits MM6 with the red
  flash, which no source confirms (above); the rest is the project's own
  feel.

**Gap**

- Turn-based mode is missing.
- Fixed on 2026-10-18: monster to-hit, recovery units, hit recovery and
  the bow's own numbers. Still missing or wrong: Haste and swift weapons in
  recovery, the distance penalty and the 51 m cap, flying arrows, striking
  a near foe with a bow, dual wielding, weapon specials, elemental damage
  and resistances (characters.md 9).

**Status:** Present but deviates (real-time); turn-based Missing.
**Size:** M for the formulas; L for turn-based mode.
**Depends on:** items with enchantments (section 12), monsters with
resistances (section 9), an owner decision on turn-based (section 37).

## 9. Monsters

**MM6**

- Corrected 2026-10-18 (monsters.md, summary): 194 monster records, that
  is 57 families of three tiers (for example Goblin, Goblin Shaman, Goblin
  King) making 171 types, 17 uniques and 6 quest variants (the Russian
  monster table; the wiki counts 52 families). For every tiered type the
  level sets hit points and experience. Many are not humanoid: bats, rats,
  spiders, cobras, oozes, hydras, dragons, wyrms, elementals, gargoyles,
  flying eyes, medusas, ghosts, liches, devils, robots of the Control
  Center.
- A monster record holds (MMX `structs.MapMonster`): hit points, level,
  experience, armour class; two attacks with dice and element and the
  second's chance; a spell with chance and skill; a ranged attack; attack
  recovery; move speed and move type; AI type; hostility and its range;
  group and ally; preferred targets (`PrefClass`, `Prefers.*`); resistances
  per element; a special attack with a multiplier; treasure (gold dice, item
  chance, item level, item type); a guard point and radius; flags for
  flying, no fleeing and invisibility.
- Special attacks (MMX `const.MonsterBonus`): Curse, Weak, Asleep, Drunk,
  Insane, Poison 1–3, Disease 1–3, Paralyze, Unconscious, Dead, Stone,
  Eradicate, Break Item, Break Armour, Break Weapon, Steal, Age, Drain
  spell points, Afraid. Theft takes an item (RPGC: "Steal Item"); no source
  shows an MM6 monster stealing gold (monsters.md 2.6). The list has no
  stat drain; aging and spell-point drain are the nearest.
- A blow tries the special attack with chance monster level × multiplier.
  It lands with chance 30 / (30 + Luck effect + other). In MM6 "other" is
  the Endurance effect for Weak, Asleep, Drunk, Disease, Unconscious and
  Afraid; Personality for Curse; Intellect for Insane; poison resistance
  for Poison; magic resistance for Paralyze, Stone, Dead, Eradicate, Drain
  and Age; the item's strength for breaking; Accuracy for theft (GF-M).
- Many shoot or cast: archers, mages, druids, devils (Fire Bolt, Fireball,
  Meteor, Incinerate), dragons (breath), liches (Dispel Magic), medusas
  (Paralyze, Psychic Shock), minotaurs (Finger of Death) (RPGC monsters).
- Flying monsters exist (MMX `Fly`). Monsters flee unless flagged not to
  (MMX `NoFlee`): by AI type, a Wimp at 30 % of its hit points, Normal at
  20 %, Aggressive at 10 %, Suicidal never (monsters.md 2.7).
- Monsters stand in groups that react together (MMX `Group`, `Ally`).
  Corrected 2026-10-18: only peasants are peaceful, MM6 has no town guards,
  and monsters never fight one another; harming a peasant turns the people
  around hostile (monsters.md 2.8).
- The dead can be searched for gold and items (MMX treasure fields).
- Maps refill with monsters and random treasure a fixed time after the
  first visit: 6, 8 or 24 months outdoors, 24 months in dungeons, a week in
  the Hive and a day in the Arena; the groups are rolled once, on the first
  visit (monsters.md 2.10 and Appendix A; items.md 4.10; corrected
  2026-10-18).

**Project**

- `MONSTERS` in `src/game/monsters.ts` (line 30): bandit, goblin scout,
  nomad raider and skeleton warrior, all humanoid Meshy models. The
  skeleton warrior is placed nowhere. The compiled sidecars hold 5 bandits
  and 4 goblin scouts in the valley and 4 nomad raiders in the desert
  (`public/levels/*.json`). The dungeon has no spawns, so the dev build
  puts one bandit 6 m ahead (`src/dev/index.ts` line 417).
- A record: level, hit points, AC, attack bonus, one damage die, walk and
  run speeds, aggro and attack ranges, the pause between swings,
  experience, model, height.
- AI (`src/world/monster.ts`): idle until the party is within aggro range;
  chase on the navmesh; swing in reach; flinch when hit; fall and stay
  down. Targets are drawn uniformly from conscious members
  (`randomLivingIndex`, `party.ts` line 220). DESIGN 14.2 says "MM6 favours
  the front row"; MM6's party has no rows, and monsters choose by class and
  sex preferences, so that note is mistaken (monsters.md 2.9).
- Every monster respawns on every page load, and every portal reloads the
  page.
- Non-humanoid monsters are blocked by Meshy's humanoid-only rigging; the
  procedural plan (DESIGN 10.2) is unbuilt.

**Gap**

- About 190 monster types, every non-humanoid body, ranged attacks,
  spells, special attacks, flying, fleeing, groups, hostility, preferences,
  resistances, treasure and refill timers are missing (monsters.md 4 orders
  the work).

**Status:** Partial. **Size:** XL (rules L; art and animation XL).
**Depends on:** conditions (section 10), items to break and steal (section
12), projectiles shared with spells (section 7), the non-humanoid
animation plan (DESIGN 10.2).

## 10. Conditions

**MM6**

- Seventeen conditions besides Good (MMX `const.Condition`): Cursed, Weak,
  Asleep, Afraid, Drunk, Insane, Poison 1, Disease 1, Poison 2, Disease 2,
  Poison 3, Disease 3, Paralyzed, Unconscious, Dead, Stoned, Eradicated.
  The three poison and disease levels are separate conditions, inflicted
  at that level by monsters.
- Effects (DOB, MMW): conditions lower hitting, endurance and casting. A
  long lack of rest brings Weak, then Insane, then possibly death (MMW;
  GF-P lists "weakness, insanity" among new-day effects). Corrected
  2026-10-18: MM6's table of effects is known and matches the MM7 engine's
  cell for cell (characters.md 10.2). Weak halves the damage a member deals,
  Afraid members still act, poison and disease never worsen and a rest heals
  them only to ½, ⅓ or ¼, and an Insane member wakes with no spell points.
  Cursed's failure rate is in conflict (about two casts in three, or one in
  two). A tavern's drink can make a member Drunk.
- Cures: a spell within its window (section 7), a temple, some potions,
  some hirelings. Immunity enchantments exist ("of Alarms", "of Antidotes",
  "of Immunity", "of Sanity", "of Freedom", "of the Medusa"; RPGC).
- The sheet names the worst condition, in green, yellow or red. Corrected
  2026-10-18: the gem beside each portrait is not a condition light but the
  enemy detector, dark while the member recovers (characters.md 10.5;
  interface.md 8.2).

**Project** (`src/game/conditions.ts`)

| MM6         | Project                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Cursed      | Present: half of actions fail (`failChance` 0.5, line 84; MM6's rate unverified)                                    |
| Weak        | Deviates: Might, Endurance, Accuracy and Speed × 0.75; MM6 halves the damage dealt instead                          |
| Asleep      | Present but deviates: cannot act and ends when hit, but runs on a timer (MM6's: unverified)                         |
| Afraid      | Deviates: cannot act; MM6's Afraid acts, with Might and Speed raised and Intellect, Personality and Accuracy halved |
| Drunk       | Deviates: Might raised, where MM6 halves it and doubles Luck; nothing makes the party drunk                         |
| Insane      | Deviates: invented stat changes; MM6's are known (characters.md 10.2)                                               |
| Poison 1–3  | Deviates: one "poisoned" with severity 1–3 that worsens at each rest (invented)                                     |
| Disease 1–3 | Deviates: as poison                                                                                                 |
| Paralyzed   | Present but deviates: cannot act, but timed; MM6's lasts until cured                                                |
| Unconscious | Deviates: below 0 since `af9d537`; MM6's own help says at 0 or below (corrected 2026-10-18)                         |
| Dead        | Deviates: below minus the current Endurance since `af9d537`; MM6 at minus the base Endurance (section 11)           |
| Stoned      | Present: out of the fight                                                                                           |
| Eradicated  | Present: differs only in its cure                                                                                   |

- Nothing in play inflicts a condition except hunger at rest (Weak) and
  Raise Dead or Resurrection (Weak). No monster, trap, potion, drink or
  well does.
- No cure windows, no immunities, no new-day effects.

**Gap**

- Split poison and disease into MM6's three levels.
- Replace the invented penalties with MM6's table (characters.md 10.2).
- Add the sources of conditions (monsters, traps, drinks, wells, lack of
  rest) and the cure windows.

**Status:** Partial. **Size:** M. **Depends on:** monster specials
(section 9), time (section 22), items (section 12).

## 11. Damage, death and hazards

**MM6**

- Corrected 2026-10-18 (characters.md 12.1): a character is Unconscious at
  0 hit points or less (MM6's own help text) and dies when hit points reach
  minus the base Endurance score (the Russian tables and the MM7 engine
  agree). The wiki's wording used here before ("below 0"; at Endurance 30,
  death at −31) is a point off at both ends, and commit `af9d537` followed
  it.
- When the whole party is down, MM6 plays a death film (GF-P: "Death movie
  played on every death"). The Guardian Angel spell brings the party back
  at the last temple for half its carried gold, at 1 hit point, half or
  full by rank (RPGC; DOB). Without the spell the party wakes a week later
  at the game's starting point in New Sorpigal without the gold it carried;
  banked gold is kept (reported; characters.md 12.2).
- Falling hurts; Feather Fall and Jump prevent it (RPGC).
- Water drowns the party without Water Walk (MMX `Party.Drowning`); MM6 has
  no swimming and no wading (interface.md 4.6). The MM7 engine takes a
  tenth of each member's maximum hit points a second, and a fall of more
  than 5 m a share of them by height (characters.md 13; MM6's numbers are
  unverified).
- Lava burns (MMX `Party.InLava`).
- Traps hurt (section 29).

**Project**

- `damageCharacter` (`src/game/character.ts`): since `af9d537`
  (2026-10-18) Unconscious below 0 and Dead below minus the current
  Endurance; before, Unconscious at 0 and Dead at −⌈max ÷ 2⌉.
- When everyone is down, monsters find no target and stop. Nothing else
  happens.
- Falls of 3 m or more say "The party falls" and hurt no one
  (`src/dev/index.ts` line 934; `fallDamageMinM`, `src/world/player.ts`).
- Water: over 0.25 m the party walks at half speed, over 1.3 m at about a
  third, and the status line says "Deep water" (`wadeSpeedFactor`,
  `src/world/wading.ts`; `src/dev/index.ts` line 852). No damage. DESIGN
  11.3 calls wading MM6's rule; the sources do not show it.
- No lava.

**Gap**

- The thresholds are a point off at both ends, and death reads the
  current Endurance (characters.md 12.1). Party death, falling damage,
  drowning and lava are missing. Wading is an invention.

**Status:** Partial. **Size:** M. **Depends on:** temples (section 17),
Water Walk and Feather Fall (section 7), the game shell (section 32).

## 12. Items

**MM6**

- A large catalogue. Corrected 2026-10-18 (items.md, summary and 2): about
  570 records: 65 weapons and a quest axe, 54 pieces of armour and clothing
  (belts, hats and crowns among them), 15 rings and amulets, 10 gems, 25
  wands, 99 spell scrolls, 99 spellbooks, 3 herbs, a bottle and 25
  potions, 3 gold piles, 30 artifacts and relics, and about 140 quest and
  other items.
- Artifacts and relics: fifteen of each, one copy each per game. Twelve
  are weapons (Ares, Artemis, Conan, Cronos, Excalibur, Hades, Hercules,
  Merlin, Mordred, Percival, Poseidon, Thor), twelve armour (Aegis, Apollo,
  Arthur, Atlas, Galahad, Hermes, Lucius, Odin, Pellinore, Pendragon,
  Valeria, Zeus) and six jewellery (Aphrodite, Athena, Guinevere, Hera,
  Igraine, Morgan); the relics carry penalties (RPGC; DOB section 7;
  items.md 3.6; the list here was short before 2026-10-18). The party
  tracks those found (MMX `ArtifactsFound`).
- Random items carry one of 14 standard bonuses ("of Might", "of
  Protection", "of the Gods" and others, each with a strength; never on a
  weapon), one of 59 special enchantments ("of Flame", "Vampiric", "of
  Carnage", "Dragon Slayer" and others) or "Antique" for ten times the
  value (RPGC enchantments; corrected 2026-10-18 from "some 60" standard
  ones, items.md 3). The item record
  has a bonus, a strength, a second bonus and charges (MMX `structs.Item`).
- Treasure comes from monsters and chests at a treasure level (MMX
  `TreasureItemLevel`). The bonus strengths per level and every monster's
  drop are published, the chances of an enchantment come from a merged
  table, and each item's weight per level is not public (items.md 4).
- Found items can be unidentified; Identify Item or a shop names them.
  Items break from monster attacks and need Repair Item or a smith (MMX
  `Broken`, `const.MonsterBonus`).
- The pack is 14 by 9 cells (screenshot-19). Items do not stack. Gold is
  a party counter; on the ground or in a chest it lies as a gold-pile item
  (items.md 2.8). Gems are sold for gold.
- Items lie in the world to be picked up, and the player can throw an item
  out of the pack (unverified detail). Horseshoes and fruit are taken from
  stables and trees (LP update 1).
- An inspect view shows an item's type, description and value
  (screenshot-20).

**Project**

- `ITEMS` in `src/game/items.ts`: 17 items (8 weapons, leather and chain,
  a shield, a helmet, boots, a copper ring, a healing potion, two scrolls).
  No plate, belt, cloak, gauntlets or amulet item exists. Most of their
  names, dice and values differ from MM6's (items.md 2.11).
- `ItemInstance` is `{ id, identified, broken }`. No bonus, strength,
  charges or value of its own. Nothing ever sets `identified` false or
  `broken` true in play.
- The 14 × 9 grid and the slots (main hand, off hand, bow, armour, helmet,
  boots, belt, cloak, gauntlets, amulet, six rings) match MM6
  (`src/game/inventory.ts`). The slots are a list; there is no paper doll.
- The inventory screen moves, equips, removes, uses and gives items by
  taps (`src/ui/inventory-model.ts`). No drag and drop, no drop to the
  ground, no inspect pop-up (only a browser `title`).
- No loot of any kind. The showcase's `loot` point is a marker for the
  build's reachability test only (`kernel/plan/level.ts`).

**Gap**

- The catalogue, random generation, enchantments, artifacts and relics,
  loot, unidentified and broken states in play, gems, world pickups and the
  inspect view are missing.

**Status:** Partial. **Size:** XL (data and rules L; icons and doll art
XL). **Depends on:** monster treasure (section 9), chests (section 29), the
icon and doll pipelines (DESIGN 12), shops (section 15).

## 13. Potions and alchemy

**MM6** (RPGC recipes)

- Reagents (Widoweeps Berries, Poppysnaps, Phirna Root) go into an empty
  bottle to make the three basic potions: Cure Wounds (red, 10 hit
  points), Magic (blue, 10 spell points), Energy (yellow).
- Mixing two potions makes the next tier: three more basics (Protection,
  Resistance, Cure Poison), eight white ones (Bless, Haste, Heroism, Stone
  Skin, Restoration and others) and eleven black ones. Black essences raise
  one stat by 15 for good and lower another. Divine Cure, Magic and Power
  add a year of age. Rejuvenation removes magical aging.
- MM6 has no Alchemy skill (MMX lists Alchemy from MM7). A wrong mix
  explodes in four grades set by the two potions' tiers, from 10 to 20
  fire damage up to an eradicated mixer with every item in the pack broken
  (items.md 7.2; corrected 2026-10-18).

**Project**

- One potion (Potion of Healing, 10 hit points). `ItemUse` supports heal,
  spell points, a cure and a scroll's spell (`items.ts`). No reagents, no
  bottles, no mixing, no permanent effects, no aging.

**Status:** Missing (one potion Present). **Size:** M.
**Depends on:** items (section 12), buffs (section 7), aging (section 22).

## 14. Scrolls and wands

**MM6**

- A scroll casts its spell once. Scrolls of the seven schools cost 10 to
  500 gold by level, Light and Dark 100 to 1000 (RPGC items). The skill a
  scroll casts at is unverified.
- 25 wands in five tiers, each with one spell (from Flame Arrow up to
  Finger of Death; two wands differ between sources) and charges; the
  original deleted a spent wand (RPGC items; GF-P; magic.md 5.6).

**Project**

- Two scrolls (Torch Light at skill 1, Fire Bolt at skill 4), read from the
  pack (`useSelected`, `inventory-model.ts`). Reading costs no recovery,
  where MM6 charges a pause for each use (characters.md 9.2).
- No wands, no charges.

**Status:** Partial. **Size:** S once spells exist. **Depends on:** the
spells (section 7), charges on items (section 12).

## 15. Shops

**MM6**

- A shop is a screen with the proprietor's face, an interior picture and
  the choices Buy, Sell, Identify, Repair and Special (screenshot-28, "The
  Knife Shoppe"). Buying shows the goods on shelves (screenshot-29).
- Corrected 2026-10-18 (items.md 6; world.md 4.2): 47 shops of four kinds
  (14 weapon, 14 armour, 13 magic shops and 6 general stores), and the
  guilds sell books. Smiths and magic shops buy, identify and repair only
  their own kind; a general store sells first-tier goods, bottles and
  herbs.
- Each shop has a regular and a special list, renewed on its own period
  when the party next opens it (New Sorpigal's clerk speaks of Tuesdays;
  LP update 1).
- Prices: MM7's formulas from each house's factor and the Merchant skill
  reproduce MM6's tavern and fare prices, so they are the best model
  (items.md 6.3). Opening hours by kind: weapon and armour shops 6 to 18,
  magic shops 8 to 16 (interface.md 10.1).

**Project**

- `src/game/services.ts`: buy at value × markup × (1 − Merchant factor);
  sell at half value × (1 + Merchant factor), capped at value, halved when
  broken; identify for a flat fee; repair for a fraction of value
  (`buyPrice`, `sellPrice`, lines 230, 234). Any shop buys anything.
- Two shops in the village: the Trader's Store and the Smithy
  (`src/game/content.ts`), opened by tapping the door within 9 m.
- A plain list screen with member tabs (`renderShop`, `src/ui/services.ts`).
  No proprietor, no interior picture, no shelves, no Special stock, no
  restock, no hours.

**Gap**

- The project's price formulas deviate from MM6's model (items.md 6.3).
- Special stock, restocking, opening hours, the shop's kind and the
  proprietor screen are missing.

**Status:** Present but deviates. **Size:** M (rules); L with the house
art. **Depends on:** the item catalogue (section 12), time (section 22),
house screens (section 26).

## 16. Guilds and spellbooks

**MM6**

- Eleven magic guilds, each with an Initiate and an Adept hall that sell a
  range of books at a price factor and keep hours (Light 10 to 14, Dark 22
  to 2), and six skill guilds (magic.md 5.1; world.md 4.3; items.md 6.6).
  Membership is bought from a townsperson: per character by MM6's award
  table and manual, once for the party by the Let's Play (decision
  37.11).
- Corrected 2026-10-18: the 100 to 5000 gold by level (1000 to 10000 in
  Light and Dark) are the books' values; a guild charges the value times
  its factor (MM7's rule; items.md 6.6). The eleventh Light and Dark books
  are not sold.
- The top books also turn up as treasure, for example Divine Intervention
  and Dark Containment in the obelisk treasure (DOB section 3).

**Project**

- `joinGuild`, `buySpellbook` and `guildSpells` (`src/game/services.ts`);
  `SPELLBOOK_PRICES` 50 to 10000 (line 135). Buying teaches at once.
- `renderGuild` (`src/ui/services.ts`) works in tests.
- No guild stands in the world.

**Gap**

- No guild to visit, so no spell beyond level 1 can be learnt.
- Prices differ from MM6's. Books are not items to read.

**Status:** Partial. **Size:** S to place one; M for MM6's prices and book
items. **Depends on:** the world (section 34), items (section 12).

## 17. Temples

**MM6**

- A temple heals hit points and spell points and cures conditions for gold
  (DOB section 2.2). Corrected 2026-10-18: each temple has a base fee; a
  condition costs that fee times the weekday it began (Monday 1 to Sunday
  7), stone and death five times that and eradication ten times, and
  temples open 5 to 1 (characters.md 10.6, one source). Only Temple Stone
  in Free Haven, once the Clerics' quest repairs it, cures eradication, and
  Free Haven has no working temple before that; Temples of Baa
  outside the towns heal cheaply, cost reputation and cure neither death
  nor stone (world.md 4.5).
- The temple's menu offers Donate, and donations raise reputation
  (world.md 4.5, one source).
- Under Guardian Angel a dead party wakes at the last temple (section 11);
  without it, a week later at the start in New Sorpigal (corrected
  2026-10-18; characters.md 12.2).

**Project**

- `templeHeal` (`src/game/services.ts`): one member, full hit and spell
  points, every condition cured, including Dead and Eradicated, at a price
  from `TEMPLE_PRICES` by the worst condition (line 82; invented).
- One temple in the village.

**Gap**

- No donations, no respawn role. Prices are invented.

**Status:** Present but deviates. **Size:** S to M. **Depends on:**
reputation (section 25), party death (section 11).

## 18. Training halls

**MM6**

- Levels for gold at a hall in town; each hall trains up to a cap. The ten
  halls, their caps and base prices, and the eight days a visit takes are
  known (section 6; world.md 4.4).

**Project**

- `train` and `renderTrainer` exist. No hall stands in the world.

**Status:** Partial. **Size:** S to M. **Depends on:** the world (section
34).

## 19. Taverns

**MM6**

- "A Lonely Knight" in New Sorpigal offers: Rent Room for 3 gold, Fill
  Packs to 6 days for 2 gold, Have a Drink, Tip Barkeep (screenshot-27).
  A drink costs 1 gold and can make a member Drunk; what a tip gives is
  unverified. Inns come in nine price tiers, from 3 gold a room to 360
  (world.md 4.6), and MM7's tavern formulas give A Lonely Knight's numbers
  from its house factor (items.md 6.3). MM6 has no card game.
- The tavern screen has the innkeeper's face and an interior picture.

**Project**

- The Inn (`src/game/content.ts`): a room for 10 gold (a rest that eats no
  food) and food at 2 gold a unit up to 14 (`rentRoom`, `buyFood`).
- A list screen without the innkeeper.

**Gap**

- Drinks, tips, MM6's prices and the innkeeper screen are missing.

**Status:** Present but deviates. **Size:** S for the rules; the art with
the houses. **Depends on:** conditions (Drunk), rumours (section 26).

## 20. Banks

**MM6**

- Banks hold gold (DOB mentions New Sorpigal's). The party record has a
  bank balance (MMX `Party.BankGold`). Six banks share one balance, open 9
  to 17, and banked gold survives the party's death (items.md 6.8;
  world.md 4.7). Interest is unverified.

**Project:** None. **Status:** Missing. **Size:** S.
**Depends on:** party death (gold kept safe), house screens.

## 21. Stables and boats

**MM6**

- Coaches and ships leave on fixed days of the week and take a number of
  days, which pass on the calendar (MGW schedule). Some routes:

| From                    | To                                | Days of the week                    | Travel days |
| ----------------------- | --------------------------------- | ----------------------------------- | ----------- |
| New Sorpigal (coach)    | Castle Ironfist                   | Mon, Wed, Fri                       | 2           |
| Castle Ironfist (coach) | Free Haven                        | Tue, Sat                            | 4           |
| Castle Ironfist (coach) | Arena                             | Sun                                 | 1           |
| Free Haven (coach)      | Darkmoor                          | Wed, Sat                            | 5           |
| Free Haven (coach)      | Blackshire, Kriegspire, White Cap | two days a week each                | 3           |
| New Sorpigal (boat)     | Mist                              | Tue, Thu, Sat                       | 3           |
| Mist (boat)             | Silver Cove                       | Mon, Thu                            | 3           |
| Silver Cove (boat)      | Castle Alamos                     | Wed                                 | 1           |
| Castle Ironfist (boat)  | Hermit's Isle                     | daily, after the traitor is exposed | 21          |

- Prices are known (world.md 4.8): coaches 25 to 250 gold, ships 100 to
  400, the royal yacht free; some routes open only once the party has
  walked to the far end. Hirelings shorten trips (Horseman, Navigator,
  Sailor, Pirate, Explorer; RPGC hirelings).

**Project:** The stables are a building model with a name
(`propLabel`, `src/world/props.ts`). No travel. **Status:** Missing.
**Size:** M (rules and screen); the destinations need the world.
**Depends on:** the world (section 34), time (section 22), hirelings
(section 25).

## 22. Calendar, time, food, rest, aging and opening hours

**MM6**

- The calendar starts on 1 January 1165 (screenshot-30; MMX
  `Game.Time`). Twelve months of four seven-day weeks: 336 days (MMX time
  constants).
- One game minute is 256 ticks and a real second 128 (MMX `const.Minute`,
  `const.RTSecond`): a game minute passes in two real seconds, a day in 48
  real minutes (an inference from the constants; unverified in play).
- The rest screen (screenshot-30): Rest and Heal 8 hours (it showed a cost
  of 2 food, on the first morning of a new game), Wait until Dawn, Wait 1
  Hour, Wait 5 Minutes, Exit Rest, with an hourglass and the time and date.
- The food a rest costs varies with the ground under the party: grass 1;
  bare ground, road, buildings and indoors 2; swamp and snow 3; cooled lava
  4; sand 5 (reported; characters.md 14.2; corrected 2026-10-18).
  Screenshot-30 shows 2. Hirelings cut it (Porter, Quarter Master, Gypsy;
  RPGC).
- A new day applies effects: weakness, insanity (GF-P), from not resting
  (MMW). Characters age; magical aging comes from monsters and spells.
- The party cannot rest with monsters near (the gems must be green), and a
  camp can be attacked, the members waking one by one; an inn is safe (the
  manual; characters.md 14.1; corrected 2026-10-18).
- Timed things: monthly altars (section 23), the Circus by month, the
  Druid Circle on set dates, weekly coach days, fountains that refill.
- Houses keep opening hours by kind: weapon and armour shops 6 to 18,
  magic shops 8 to 16, temples 5 to 1, taverns 5 to 2, banks 9 to 17,
  training halls 6 to 18, town halls 10 to 14, coaches and ships 5 to 18;
  guilds as section 16 (interface.md 10.1; corrected 2026-10-18).

**Project**

- `src/game/time.ts`: the same calendar, starting at 09:00 on 1 January 1165. Present.
- The clock runs at one game minute per real second
  (`MINUTES_PER_REAL_SECOND`, `src/world/daylight.ts` line 13): twice
  MM6's rate if the inference above holds. Until `ac0420e` (2026-10-18) it
  did not run at all while the party walked, because each frame's fraction
  of a minute was dropped (magic.md 5.5).
- `src/game/rest.ts`: 8 hours, 1 food (`FOOD_PER_REST`, line 24), full
  healing; hungry rests heal nothing and make the party Weak, which the
  manual does not ask (characters.md 14.1). Wait until dawn, to 5:00 (MM6's
  card says 6:00). No 1-hour or 5-minute wait. Nothing forbids or
  interrupts a rest.
- Age never changes. No new-day effects. No timed events. No hours.
- The HUD shows the hour and the date (`setClock`, `src/ui/hud.ts`); MM6's
  HUD does not (it shows food and gold).

**Gap**

- Clock rate, food by place, short waits, new-day effects, aging, rest
  rules, timed events and hours are missing or different.

**Status:** Partial. **Size:** M. **Depends on:** conditions (section 10),
the world (section 34).

## 23. Wells, fountains, barrels, cauldrons, pedestals, altars and shrines

**MM6**

- Fountains and wells: New Sorpigal has a healing fountain, a spell-point
  fountain with a few sips a day and a Luck well with limited charges (LP
  update 1); the Luck well raises Luck permanently up to 16 (GOG thread) or
  15 (MMW; world.md 7).
  Some give temporary bonuses ("+100 Power temporary" in Paradise Valley,
  "Refreshing!" when spent; GF-P). Their uses reset with a timer (GF-P).
- Barrels raise a stat permanently; they are the early game's main source
  (GOG thread). Colours and amounts are unverified for MM6.
- Twelve altars, one per month: Might (Bootleg Bay, January), Intellect
  (Mist, February), Personality (Silver Cove, March), Endurance (White Cap,
  April), Accuracy (Free Haven, May), Speed (Darkmoor, June), Luck (New
  Sorpigal, July), Fire (Kriegspire, August), Electricity (Castle Ironfist,
  September), Cold (Kriegspire, October), Poison (Castle Alamos, November),
  Magic (Blackshire, December). Prayer works only on the pilgrimage the
  Seer names for the month: +10 to the party's stat or resistance the first
  time and +3 later, each shrine once a year (DOB section 10; CYB; world.md
  3.4; corrected 2026-10-18).
- The Shrine of the Gods raises every stat by 20 for good (DOB, CYB).
- The Fountain of Youth on Hermit's Isle (DOB); the Monolith's +5
  Personality for Clerics and Druids; Agar's Laboratory's Intellect
  (GF-P).
- Cauldrons and pedestals in MM6: unverified.

**Project:** The village well and a wayside shrine are names on the status
line (`propLabel`). Nothing else. **Status:** Missing. **Size:** M for the
mechanism (an object with a timer, a once-per-character flag and an
effect); L to place them. **Depends on:** level event scripting (section
29), the stat base and bonus split (section 3), the calendar (section 22).

## 24. Obelisks

**MM6**

- Fifteen obelisks, one in each outdoor map, each shows a fragment of a
  message (RPGC obelisk; MGW obelisks). Read together they point to a
  stone in Dragonsand.
- The Captain's Treasure: the books Divine Intervention and Dark
  Containment, 250,000 gold and the artifacts Guinevere, Morgan and Igraine
  (DOB section 3; MGW).
- Fragments are kept in the Notes book, which has a category for them
  (interface.md 9.4); the treasure opens only after all fifteen (world.md
  3.4).

**Project:** None. **Status:** Missing. **Size:** S for the mechanism; the
places need the world. **Depends on:** autonotes (section 27), the world
(section 34).

## 25. Hirelings and reputation

**MM6**

- Two hireling places beside the minimap (screenshot-17; the GOG thread:
  four characters and two NPC slots).
- Street people can be hired for a one-time fee and then take a share of
  all gold found (RPGC hirelings; LP update 1). Whether any also take a
  daily wage is unverified.
- About 50 professions (RPGC hirelings), for example: Smith, Armorer and
  Alchemist repair; Scholar identifies; Cook and Chef make food; Porter,
  Quarter Master and Gypsy save food at rest; Guide, Tracker, Pathfinder,
  Horseman, Sailor, Navigator and Explorer shorten travel; Merchant,
  Trader, Duber and Negotiator add Merchant; Counselor and Barrister add
  Diplomacy; Tinker, Locksmith and Burglar add Disarm Trap; Scout and
  Psychic add Perception; Arms Master, Weapons Master, Squire, Apprentice,
  Mystic and Spell Master add skill levels; Teacher and Instructor add
  experience; Banker and Factor add gold found; Healer, Expert Healer and
  Master Healer heal once a day; Acolyte (Bless), Piper (Heroism),
  Cartographer (Wizard Eye), Water Master (Water Walk), Wind Master (Fly)
  and Gate Master (Town Portal) cast once a day; Bard raises reputation.
- Reputation has named ranks from Saintly to Notorious; the number is not
  shown (GF-P). Begging, bribing and threatening, stealing, looting the
  dead and helping Baa lower it; exposing the traitor raises it (DOB
  section 2.6, 9; CYB). It gates the Light and Dark Masters and the
  Diplomacy Master (section 5). Its ranks have numeric bounds (Saintly above
  999, Notorious below −999), and exposing the traitor gives +800
  (world.md 4.10).

**Project:** None (no hirelings, no reputation, no Diplomacy).
**Status:** Missing. **Size:** L. **Depends on:** street people (section
26), travel (section 21), skills (section 4), the gold-found hook (loot,
section 12).

## 26. People, dialogue topics and news

**MM6**

- Houses open a screen with an interior picture, the proprietor's face,
  the house's name and its choices (screenshots 27 and 28). DESIGN 16.7
  says the faces were film loops (unverified here).
- People walk the streets (screenshot-17, 32). Each has a name and a
  profession and can be talked to; many can be hired (LP update 1).
- Talk offers topics, news or rumours, quest topics, and the
  begging, bribing and threatening that Diplomacy softens (RPGC skills;
  DOB section 2.6).
- Named people in houses give and close quests (MGW High Council).

**Project**

- Two villagers, Greta and Old Henrik (`NPCS`, `src/game/monsters.ts`;
  `src/world/npc.ts`). They idle, turn to face the party within 6 m and
  talk when tapped.
- The talk panel (`src/ui/dialogue.ts`, `dialogue-model.ts`): name and
  calling, the living 3D face rendered into the window
  (`src/world/bust.ts`), a greeting, topics of three kinds (plain talk,
  rumours in turn, a quest with offer, active, ready and done lines), and
  Farewell. The world waits while they talk.
- No proprietors: houses open plain service lists. No street crowd, no
  professions, no hiring, no begging, bribing or threatening, no news that
  changes with events.

**Gap**

- Proprietor screens, street people, professions and the Diplomacy actions
  are missing. Two people exist.

**Status:** Partial. **Size:** L (system M; people and text L).
**Depends on:** hirelings and reputation (section 25), quests (section
27), portrait art (DESIGN 12).

## 27. Quests, quest log, autonotes and awards

**MM6**

- The main quest (MGW High Council, Oracle and Archibald guides; search
  extract of the main line):
  1. Win the favour of the High Council's members: Lord Kilburn's shield
     for Regent Wilbur Humphrey; the demons of the Devil Outpost for Lord
     Osric Temper; the Hourglass of Time from Gharik's Forge for Lord
     Albert Newton; the stables' prices for Lady Loretta Fleise; the Prince
     of Thieves from the Free Haven Sewers for Lord Anthony Stone; the
     endless winter for Lord Stromgard (seven tasks with Humphrey's second).
  2. Learn why Representative Slicker Silvertongue bars the Oracle: the
     Superior Temple of Baa; expose the traitor.
  3. The Oracle, Melian, needs four memory crystals: from the Supreme Temple
     of Baa on Hermit's Isle, Castle Alamos, Castle Darkmoor and Castle
     Kriegspire.
  4. The Control Center needs the Control Cube from the Tomb of VARN in
     Dragonsand and passwords found inside; robot guardians; the Blaster
     skill and blasters.
  5. Free Archibald Ironfist: the Third Eye from a well near Castle
     Ironfist, Tanir's Bell from Prince Nicolai; Archibald gives the Ritual
     of the Void.
  6. Destroy the reactor in the Hive near Sweet Water and kill the Demon
     Queen.
- Twelve promotion quests (section 2) and 27 side quests (Melody Silver,
  the Prince at the Circus, the Monolith and others): the log holds 56
  quests, 17 of them main, before the Hive (world.md 3; corrected
  2026-10-18).
- The quest log lists the current quests as text (screenshot-31).
- Autonotes gather what the party has learnt (the Notes book, one of the
  four in the HUD; MMX `AutonotesBits`): about 115 notes in five
  categories, potions, fountains, obelisks, seers and the rest
  (interface.md 9.4).
- Awards record each character's deeds on a page of the character screen
  (screenshot-21's buttons; MMX `Player.Awards`; GF-P).
- Quest state is kept as bits (MMX `QBits`).
- Side activities: the Arena, reached by coach from Castle Ironfist on
  Sundays (MGW schedule), and the Circus, in Blackshire in April, Darkmoor
  in August and Bootleg Bay in December (DOB), with prizes such as
  trophies, pyramids and kegs of wine (GF-P); one walkthrough gives
  four-month seasons instead (world.md 3.4). MMX keeps Arena wins by level
  (Page, Squire, Knight, Lord), and MM6's Arena fights at those levels
  (world.md 3.4).
- New Sorpigal also has a town hall with the mayor and a clerk (LP update
  1); its services are unverified.

**Project**

- Two quests (`QUESTS`, `src/game/dialogue.ts` line 11): three bandits for
  Henrik, two goblin scouts for Greta. Both are kill-then-talk, with gold and
  experience rewards.
- `src/game/quests.ts`: ordered objectives (talk, kill, reach, deliver)
  driven by events. Reach and deliver are never fed in play.
- The quest log (`src/ui/journal.ts`) shows active and completed quests with
  the current objective and count. MM6's log is plainer: current quests as
  text.
- Kill counts can be farmed, because monsters respawn on every load.
- No autonotes, no awards, no Arena, no Circus.

**Gap**

- The main quest, the promotion quests, the side quests, the Arena, the
  Circus, autonotes and awards are missing.

**Status:** Partial (the engine is Present; the content is Missing).
**Size:** XL. **Depends on:** nearly everything: the world, people,
monsters, items, travel, the Blaster, the ending.

## 28. Movement, controls and movement spells

**MM6**

- Keyboard and mouse: walk, turn with the arrows, strafe with Ctrl and the
  arrows, look up and down, centre the view, jump, fly up and down and land
  while flying, switch to turn-based (GF-P; LP; the Steam thread: look down
  is Delete). Mouse look came only with GrayFace's patch (GF-P).
- Walking is the default, and Shift with an arrow runs at twice the pace
  (the manual's key chart and the reference card; interface.md 4.1;
  corrected 2026-10-18). The view tilts only 22.5° up or down, and a key
  centres it (interface.md 4.2).
- The party can jump without the spell, with the X key (the manual; GF-P:
  "Jumping height reduced a bit").
- Movement spells: Jump, Feather Fall, Fly, Water Walk, Town Portal,
  Lloyd's Beacon, Wizard Eye, Telekinesis (section 7). Telekinesis works
  switches, doors and chests and picks up items at a distance (MM6's spell
  table; magic.md 4.6).
- Leaving a house always turned the party round in MM6; the patch made it
  an option (GF-P: FlipOnExit "Always enabled before the patch").

**Project**

- Touch controls as DESIGN 7.1 (`src/app/input/zones.ts`): an invisible
  stick on the left (forward, back at a third, strafe at two thirds), look
  on the right only while stationary, turn while walking, tap to act.
  Keyboard for development. This is a phone adaptation, not MM6's scheme.
- One speed, 4.5 m/s (`DEFAULT_TUNING`, `src/world/player.ts` line 49). No
  run. No jump: "Jump is a spell, not a button" (DESIGN 7, owner,
  2026-10-11), and the spell is inert.
- No flying, no water walking, no teleports.

**Gap**

- Run, jump, fly and every movement spell are missing.

**Status:** Present but deviates (walking); Missing (the rest).
**Size:** L (Fly alone is M: vertical control on touch, an outdoor
ceiling, spell point drain). **Depends on:** buffs and spells (section 7),
towns with fountains (Town Portal), beacon storage in the save (section
32), an owner decision on the jump button.

## 29. Dungeon mechanics: traps, locks, keys, levers, secret doors

**MM6**

- Chests can be trapped. Disarm Trap is checked on opening, and Perception
  softens or avoids trap damage (RPGC skills; DOB section 2.6). Floor traps
  and blowing chests hurt (DOB). Each map sets one difficulty and one
  strength for all its chests' traps (items.md 4.7 and 4.10).
- Locked doors open with keys found in chests or on bodies, such as the
  High Cleric's and High Sorcerer's keys in the Superior Temple of Baa
  (DOB). Some doors open with levers, switches or plates; warded doors need
  an item, such as the amber in the Hall of the Fire Lord (DOB).
- Secret doors and hidden treasure are found with Perception (RPGC).
- Teleporters move the party within a map (MGW obelisk locations mention
  them in Castle Ironfist and Mist).
- Each map runs its own event scripts (MMX "evt" commands).

**Project**

- None of it. `kernel/plan/level.ts` builds openings, not doors. Its
  `NamedPoint` kinds `door`, `loot` and `trigger` (line 143) are markers for
  the build's reachability check and do nothing at runtime.

**Gap**

- Doors, locks, keys, levers, plates, teleporters, secret doors, chests,
  traps and a per-level event script format are missing.

**Status:** Missing. **Size:** L for the runtime and the kernel elements;
content on top. **Depends on:** items (keys, loot), skills (Perception,
Disarm Trap), the level compiler (`tools/level-build.ts`).

## 30. Automap, minimap and compass

**MM6**

- A minimap in the top right of every view, with zoom buttons and a
  compass band naming the facing (N, NW, "W·N") (screenshots 17, 25, 30).
- The minimap outdoors is the terrain's own picture with roads and
  buildings (screenshots). GF-P mentions its zoom. The Map book shows the
  map larger; indoors it draws the walls the party has seen (unverified
  detail).
- Wizard Eye marks monsters, treasure and points of interest.
- An enemy detector lights yellow and red as monsters come near (MMX
  `EnemyDetectorYellow`, `EnemyDetectorRed`): it is the gem beside each
  portrait (the manual; interface.md 8.2; corrected 2026-10-18).
- Notes on the map: unverified for MM6.

**Project**

- `src/game/automap.ts`: a bitset of cells revealed in a disc round the
  party (40 m outdoors, 6 m indoors, every half second; `src/dev/index.ts`).
- The Map screen (`renderMap`, `src/ui/journal.ts`) draws walked cells in
  sepia with an arrow for the party. No terrain picture, no walls, no zoom,
  no marks.
- No minimap, no compass, no detector.

**Status:** Partial. **Size:** M for the minimap and compass; M for a real
map picture. **Depends on:** level data for map art (the floor-plan slices
of DESIGN 11.5 are unbuilt), Wizard Eye (section 7).

## 31. HUD and screens

**MM6** (screenshots 17 to 31 unless noted)

- The bottom band: four oval portraits of photographed actors, each with a
  gem and green and blue tubes (corrected 2026-10-18: the gem is the enemy
  detector, dark while the member recovers, not a condition light;
  interface.md 8.2). Dead members show a gravestone
  (screenshot 2026-07-09-183355). Faces change expression (MMX
  "Expression" fields) and speak reactions (MMX
  `StandardPlayerSoundsCount`); the exact set is unverified.
- The right panel: minimap, two hireling windows, the strip of party
  spells, four books (Quests, Notes, Map, Calendar), food and gold
  counters, and four gold buttons: Cast Spell, Rest, Quick Reference and
  Game Options (interface.md 8.8; corrected 2026-10-18).
- The status line names what the cursor is over and gives prompts
  ("Select Torch Light", "You need 2 more Skill Points to advance here").
- The character screen has five buttons: Stats, Skills, Inventory, Awards,
  Exit, with the paper doll beside every page (screenshots 19, 21, 22).
  Stats shows current and base values, age, level, experience, Attack,
  Damage, Shoot, the five resistances, the condition and the quick spell.
- Right-clicking shows a pop-up for an item (screenshot-20), a spell
  (screenshot-25) or a skill with its three ranks (screenshot-23).

**Project**

- `src/ui/hud.ts`: the marble band, four recessed cells with an oval frame
  holding a gold class sigil, the condition gem, the two tubes and a clock
  plaque. A tap selects; a second tap opens the sheet. The book shelf
  (`src/ui/screens.ts`): Sheet, Items, Spells, Quests, Map and a Rest
  button. The spines carry MM6's book emblems on the wrong books
  (interface.md 2, finding 3).
- `src/ui/status.ts`: the status line for taps, fights, quests and rest.
  Present (a phone has no hover).
- The sheet (`src/ui/sheet.ts`): identity, points, level, experience,
  condition, stats with bonuses, Armour class, Attack, Shoot, Recovery,
  skills with a raise action. No resistances, no quick spell line, no
  Awards page, no doll.
- No portraits, expressions or voices; no hireling windows; no food or gold
  on the HUD; no Autonotes or Calendar; no quick reference; no pop-ups.

**Gap**

- Most of MM6's furniture is missing. The look of what exists is the
  subject of the critic loop (DESIGN 16.12 to 16.21) and is not judged
  here.

**Status:** Partial. **Size:** L for the code; XL with portraits, doll and
icons. **Depends on:** the portrait, doll and icon pipelines (DESIGN 12),
hirelings (section 25), autonotes and awards (section 27).

## 32. Save, load, menu and options

**MM6**

- The game menu: Resume Game, Controls, New Game, Load Game, Save Game,
  Quit (screenshot-18).
- Save slots; the original had no quick save, slots could not have gaps,
  and it autosaved on every exit from a level and after travel (GF-P; the
  reference card). The slot count is unverified.
- Controls (MM6's reference card): music, sound and voice volume, detail,
  turn rate (16 or 32 facings, or smooth), walking sounds and show damage.
  Always run, flip on exit and the key settings are MM7's or the patch's
  (interface.md 11.4; corrected 2026-10-18).
- Lloyd's beacons and quest bits live on the characters and the party (MMX
  fields), so a save carries them. Changes to a map, such as killed
  monsters and opened chests, also persist (the mechanism is unverified).

**Project**

- `src/app/autosave.ts`: one slot in `localStorage` (`ftb-autosave`),
  written when a screen closes, after a rest, before a portal and every
  60 s. `src/game/save.ts` serialises and validates the state, with a
  version and a `migrate` stub.
- The save holds the party, gold, food, clock, quests, automap, level and
  position, guild memberships and flags. It does not hold killed monsters,
  opened things or map state.
- On `?continue` the party is placed at the level's spawn, not at the saved
  position, and the level comes from the URL, not the save
  (`src/dev/index.ts` line 473).
- No menu, no slots, no load screen, no new game choice, no options for
  the player. Settings are render presets and the filter
  (`src/app/settings.ts`); tuning lives in the dev panel.

**Gap**

- The menu, slots, a load screen, placing the party from the save, map
  state in the save, and player options are missing. A relaunch starts a
  new game.

**Status:** Partial. **Size:** M. **Depends on:** the production shell
("First" above).

## 33. Music and sound

**MM6**

- CD music by map: MM6's map table names a track for each (interface.md
  12.6 lists them; corrected 2026-10-18). The original played CD audio at
  half the system volume (GF-P).
- Sound effects for blows, spells, doors, chests, footsteps, monsters (each
  family its own) and the interface; character voices; spoken lines in the
  house films (unverified detail).

**Project**

- Synthesised sound through Babylon's audio engine (`src/app/audio.ts`,
  `src/world/soundscape.ts`, `src/world/ambience.ts`): impacts (whack,
  thud, whoosh), a cast sweep, a button click, wind, birds by day, footsteps
  by surface, waterfalls.
- No music. No monster sounds. No voices. No door, chest or spell-specific
  sounds.

**Status:** Partial. **Size:** M for the code; the recordings and music
are owner or CC0 work (DESIGN 10.7). **Depends on:** the asset pipeline
(PLAN Phase 4 step 5).

## 34. The world: regions and dungeons

**MM6**

- Fifteen outdoor maps, one obelisk each (MGW obelisks; DOB): New Sorpigal,
  Castle Ironfist, Mist, Bootleg Bay, Free Haven, Mire of the Damned,
  Silver Cove, Blackshire, Kriegspire, Frozen Highlands (White Cap), Sweet
  Water, Paradise Valley, Hermit's Isle, Dragonsand, and the Eel-infested
  Waters, where Castle Alamos stands (world.md 7; corrected 2026-10-18).
  They form a five by three grid, harder from east to west (world.md 1).
- Towns with coaches or ships (MGW schedule): New Sorpigal, Castle
  Ironfist, Free Haven, Silver Cove, Darkmoor, White Cap, Blackshire,
  Kriegspire, Mist, Bootleg Bay (two harbours), Hermit's Isle, Castle
  Alamos.
- What the sources place in each outdoor map, and what the project has of
  it:

| MM6 map                                     | Named in the sources                                                                                                                                                                                 | Project                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| New Sorpigal                                | the starting town; the Guild of the Self and the Buccaneers' Lair; a bank; the Luck well and the Luck altar (July); an abandoned Temple of Baa; Gharik's Forge nearby; an obelisk inside the volcano | none (the valley's village is an original stand-in) |
| Castle Ironfist                             | the castle: Regent Wilbur Humphrey, Archibald in the library; the well with the Third Eye; Corlagon's Estate; the Electricity altar (September); the coach to the Arena                              | none                                                |
| Mist                                        | Lord Albert Newton; the Silver Helm Outpost; the Intellect altar (February); docks                                                                                                                   | none                                                |
| Bootleg Bay                                 | the Hall of the Fire Lord; the Temple of the Sun; the Sorcerer's fountain; the Might altar (January); the Circus in December                                                                         | none                                                |
| Free Haven                                  | the High Council; the Free Haven Sewers; the temple the Cleric repairs; the Accuracy altar (May); two coach stations                                                                                 | none                                                |
| Mire of the Damned                          | Snergle's mines; the Axe, Spear, Chain and Perception Masters                                                                                                                                        | none                                                |
| Silver Cove                                 | Lady Loretta Fleise; the Warlord's Fortress; the Druid Circle; the Monolith; the Personality altar (March)                                                                                           | none                                                |
| Blackshire                                  | Lord Kilburn's shield in a chest; the Magic altar (December); the Circus in April                                                                                                                    | none                                                |
| Kriegspire                                  | Castle Kriegspire; the Devil Outpost; the Fire and Cold altars (August, October)                                                                                                                     | none                                                |
| Frozen Highlands                            | White Cap; Castle Stromgard; the Endurance altar (April)                                                                                                                                             | none                                                |
| Sweet Water                                 | the Hive                                                                                                                                                                                             | none                                                |
| Paradise Valley                             | a Temple of Baa; the Blaster and Dark Masters                                                                                                                                                        | none                                                |
| Hermit's Isle                               | the Supreme Temple of Baa; the Fountain of Youth; the boat from Castle Ironfist                                                                                                                      | none                                                |
| Dragonsand                                  | the Tomb of VARN; the Shrine of the Gods; the obelisk treasure                                                                                                                                       | none                                                |
| Eel-infested Waters (Alamos)                | Castle Alamos; the Poison altar (November); the Light Master                                                                                                                                         | none                                                |
| Darkmoor (the Mire of the Damned's village) | Castle Darkmoor; the Speed altar (June); the dragon Longfang Witherhide; the Circus in August                                                                                                        | none                                                |

- Indoor maps: 39 dungeons and the Arena (world.md 2 and 7; corrected
  2026-10-18); the lords' castles are entered as house screens. Named in
  the sources:
  Goblinwatch, the abandoned Temple of Baa and the other Temples of Baa,
  the Superior and the Supreme Temple of Baa, Gharik's Forge, the Shadow
  Guild Hideout, Dragoons' Caverns, Dragoons' Keep, the Silver Helm
  Outpost and Stronghold, the Hall of the Fire Lord, the Temples of the
  Sun, the Moon, the Fist, Tsantsa and the Snake, the Tomb of Ethric the
  Mad, Snergle's Caverns, Snergle's Iron Mines, Corlagon's Estate, Agar's
  Laboratory, the Caves of the Dragon Riders, the Dragon's Lair, the Lair
  of the Wolf, Icewind Keep, the Warlord's Fortress, the Devil Outpost, the
  Monolith, the Free Haven Sewers, the Tomb of VARN, the Oracle, the
  Control Center, the Hive, the castles Ironfist, Stone, Newton, Temper,
  Fleise and Stromgard (house screens), Darkmoor, Kriegspire and Alamos,
  the Arena, the
  Shrine of the Gods and the secret NWC dungeon. The project has none.
- Each town has its houses: shops, guilds, temple, tavern, training hall,
  bank, stables or docks, teachers, people (LP update 1; screenshots).

**Project** (DESIGN 15, `kernel/terrain/`, `levels/`)

| Project region                             | What it is                                                                                                                                                                                                                                             | MM6 counterpart |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| The Valley (`levels/valley/terrain.ts`)    | 1.6 km generated: a village of Meshy buildings (inn, temple, store, smithy, stables, barn, farmhouse, cottages, well, shrine), a river, a ravine with eight cascades, a cave mouth, a pass, about 9,500 trees; 5 bandits, 4 goblin scouts, 2 villagers | none            |
| The Desert (`levels/desert/terrain.ts`)    | 1.6 km generated: dunes, mesas, an oasis, a road; 4 nomad raiders                                                                                                                                                                                      | none            |
| The Old Halls (`levels/showcase/level.ts`) | the Phase 2 showcase: hall, gallery, spiral shaft, flooded undercroft, switchback, chasm bridge, cavern; one bandit                                                                                                                                    | none            |

- Four of the village's buildings open a service; the rest are scenery.

**Gap**

- Every MM6 map, town and dungeon is missing. The project's three areas are
  original.
- A note on rights: MM6's names, maps, quests and text belong to its rights
  holder. A systems re-creation can carry an original world of the same
  size and shape; copying the original world is a separate decision for the
  owner (section 37).

**Status:** Missing (as MM6's world); the project's own world is Partial.
**Size:** XL, about 210 working days of content (±50 %; world.md 5.2): 15
regions, 15 settlements and 39 dungeons. **Depends on:** dungeon mechanics
(section 29), people (section 26), monsters (section 9), the kernel's
element library (DESIGN 11), asset batches.

## 35. Day and night

**MM6**

- Outdoors the light follows the clock and nights are dark, which is what
  Torch Light is for (RPGC). Some spells need the day or the night (Sun Ray,
  Moon Ray). The rest screen's hourglass shows time passing.
- Weather: snow falls in places (GF-P mentions the snow's drift; the
  Frozen Highlands' endless winter is a quest, MGW), switched on and off by
  map scripts, and fog comes by chance per map; no rain is known
  (interface.md 13.4).

**Project**

- `src/world/daylight.ts`: the sun crosses the sky, dusk, a blue night with
  stars, lanterns and the forge coming up at dusk. Torch Light brightens the
  party's torch. Present.
- The clock runs at twice MM6's rate (section 22, inference).
- Weather is drifting cloud shadows everywhere and blowing sand in the
  desert (DESIGN 15.7). No snowfall; rain and a sandstorm are planned
  (PLAN 5b step 18), though MM6 has neither (decision 37.42).

**Status:** Present but deviates (rate; weather partial). **Size:** S for
the rate; M for snowfall. **Depends on:** nothing.

## 36. The ending and the score

**MM6** (MGW endings)

- In the Hive the party destroys the reactor and kills the Demon Queen,
  then steps through a black portal.
- With the Ritual of the Void scroll, a shield holds the blast over Sweet
  Water; Prince Nicolai knights the party. Without it, Enroth is destroyed.
- After the good ending a "Congratulations" screen lists the characters,
  their levels and promotions, the total game time and a final score, and
  the game saves a copy of it (as a picture, by MM6's own strings;
  interface.md 11.5). Only blasters hurt the reactor (world.md 3.5).

**Project:** None. **Status:** Missing. **Size:** S for the score screen;
the ending depends on the main quest. **Depends on:** the main quest
(section 27).

## 37. Decisions the owner has to make

Rewritten on 2026-10-18 from this overview's first seven and the deep
dives' own lists (monsters.md 5, magic.md 8, items.md 11, interface.md 14,
and the conflicts and checks in characters.md and world.md), merged where
they ask the same thing. Each gives the options and a recommendation;
"for" names the milestone of section 38 that waits on it.

### Decide first

1. **The world and its story** (for M2's names and everything from M7;
   world.md 5.3 and 5.4; items.md 11.7; monsters.md 5.6). Rebuild Enroth
   with MM6's names, maps, quests and text, which belong to its rights
   holder while this repository is public; or build an original world with
   MM6's exact structure: the grid, the edges and their days, the
   east-to-west gradient, the counts, the gates, the timetables and the
   quest shapes, under names of our own. World.md finds the two about
   equal in effort. Recommendation: the original world with MM6's
   structure and every MM6 system and number. It also settles the item
   and quest-item names, the uniques, the monsters named after real
   developers and the one named after a kitchen brand (drop or rename
   them), and the joke dungeon (drop it; about four days saved).
2. **Original or patched behaviour, as one rule** (for M1 onward;
   magic.md 8.1; monsters.md 5.2; items.md 11.2, 11.3 and 11.6;
   characters.md 6.2, 9.2 and 10.5; interface.md 14.14). The game as
   shipped in 1998, bugs and all, or as GrayFace's patch plays it. The
   bugs: cure windows three times too long at Expert and Master; a weaker
   buff blocking a stronger one; Water Walk draining four times too fast;
   no range limit on Meteor Shower and Starburst; every monster spell
   doing fire damage; a monster's Paralyze doing nothing; gold dice
   wrapping above 255; no experience from Finger of Death; stolen items
   lost with the thief; weapon elements ignoring resistance; spent wands
   vanishing; a second essence wasted; artifacts lost in chests nobody can
   reach; the off-hand weapon's recovery added on; the Master Dagger's
   triple strike at a flat 10 %; "of Recovery" doing nothing. The patch's
   additions: always run, an optional turn on leaving a house, the
   column-first pack, a wider look, a new condition order, quick saves.
   Recommendation: fix every bug as the patch does, since that is the game
   as designed (monsters.md would keep the wrapped gold as the game paid
   it; one rule is simpler); keep the original wherever the patch only
   adds a choice (walking by default, the turn on leaving, the row-first
   pack, the ±22.5° look, the old condition order); take the comforts a
   phone needs (a quick save, run as a control).
3. **Turn-based mode** (for M4's design and M9; characters.md 9.9;
   interface.md 7.3; monsters.md 5.8; magic.md 8.7). DESIGN 7 says real
   time only; MM6 has both, and its veterans fight most dungeon rooms in
   turns. Options: keep it out; or build MM6's mode (turns of 100 recovery
   units, the party unable to move, monsters frozen between phases, a
   toggle and an indicator). Recommendation: build it after M4, and build
   M4's monster actions so that a turn queue can drive them.
4. **The held stat table** (for M1; characters.md 4.1;
   `docs/held/README.md`). Apply `docs/held/0001-mm6-stat-table.patch`
   with `git am` and change the two src/ui assertions it names (Might 17
   gives +2 at creation, Might 32 gives +6 on the sheet); let a session do
   both; or drop it. Recommendation: apply it; GrayFace's mechanics page,
   a second table, the Let's Play and screenshot-21 agree.
5. **Recovery and clock rates** (for M1; magic.md 3.3 and 8.3;
   characters.md 9.2 and 17.1; interface.md 13.1). Recovery is counted at
   60 units a second since `1fd089f` (the MM7 engine's rate, marked ours);
   128 a second is the other reading. The clock gives one game minute a
   real second (DESIGN 16.3); MM6's constants give two seconds a minute, a
   day in 48 real minutes. Recommendation: keep 60 a second; move the
   clock to MM6's rate so that buffs and cure windows last as MM6's do;
   settle both by timing a staff swing and an hour in the original.
6. **The spell learning gate** (for M1; magic.md 3.1 and 8.2). MM6 has
   none, by inference: any rank may learn any spell of its school, and
   the rank changes only the effect. Options: drop the project's gate by
   spell level, or keep it as a recorded change. Recommendation: drop it.
7. **Data or manual** (for M1 onward; magic.md 8.4). Where the printed
   manual and MM6's own tables differ (costs, durations, formulas),
   follow the tables. Recommendation: the tables, as the deep dives do.
8. **Where MM6's right panel goes** (for M5 and the critic loop;
   interface.md 3 and 14.1). A true right panel, which shrinks the view to
   about 70 % of the width; or MM6's furniture over a full-width view (the
   minimap as an arched inset at the top right with the compass, the
   counters by the clock, the ovals and the books in the shelf, the
   hireling windows by the portraits). Recommendation: furniture over the
   view.
9. **Faces** (for M5's faces, M6's creation and M12's hirelings;
   interface.md 8.1 and 12.4; characters.md 3.1; DESIGN 12.2 and 16.5).
   MM6's portraits are filmed actors with idle, wince, talk, cast and
   condition expressions (the MM7 engine names about forty states), and
   each face has its voice; DESIGN 16.5 allows no generated faces.
   Options: portraits painted by a person the owner engages; generated
   faces finished through the critic loop, as the spell icons are (which
   needs 16.5 relaxed); live 3D busts, as the villagers have in the talk
   panel; crests only, which is not MM6. Recommendation: painted faces, a
   small cast to start (say four of each sex) with a reduced set of about
   twelve frames each; M5 builds the expression player either way.
10. **The critic loop** (PLAN 5b step 17). Its HUD and screens rounds
    polish a frame that M5 will reshape: the panel, the ovals, the book
    emblems, the gem. Recommendation: pause those rounds until 8 and 9 are
    decided and resume them on M5's frame; keep the world rounds.

### Rules where the sources split or are silent

11. **Guild membership** (for M2; magic.md 5.1; world.md 4.3). Per
    character, as MM6's award table and manual imply, or once for the
    party, as the Let's Play reports. Recommendation: per character;
    confirm it in the original.
12. **Teacher gates in conflict** (for M2; characters.md 7.3). The Fire and
    Water Masters at skill 12 or Archmage; the Body Master at skill 12 or
    no gate; the Diplomacy Master at reputation 200 or fame 200; the Dark
    Expert at 2,000 gold or free. Recommendation: skill 12 for all seven
    common schools, fame 200, 2,000 gold; check one teacher of each.
13. **Wimps** (for M4; monsters.md 2.7 and 5.1). Run at 30 % of hit points
    (the Russian table and players' accounts of MM6) or as soon as hostile
    (the MM7 engine). Recommendation: 30 %.
14. **Monster data where the tables split** (for M4 and M13; monsters.md
    2.13, 3.3 and 5.3 to 5.5). The uniques' numbers (the Russian table's,
    the walkthrough's or our own), the two cannibal families' sexes, and
    which families fly and where. Recommendation: the Russian table's
    numbers and assignment, which match the sprite files; flyers by body
    as monsters.md 2.13 lists them, outdoors and in tall rooms.
15. **Cursed** (for M4; characters.md 10.2 and 17.5). About two casts in
    three fail and attacks suffer too (the Russian table), or one in two
    (the MM7 engine). Recommendation: the Russian table's; check it.
16. **Wading or drowning** (for M4; characters.md 13; interface.md 4.6;
    DESIGN 11.3). MM6 neither swims nor wades: deep water drowns a party
    without Water Walk. Recommendation: drowning, with water a party can
    stand in walked at full speed; drop the slowdown.
17. **The nomad raider** (for M4; monsters.md 3.4 and 5.7). MM6's desert
    holds lizards, wyrms and dragons. Keep the raider as the project's own
    or retire it. Recommendation: retire it when the desert moves to its
    western place; reuse the model as a tier of a human family if it fits.
18. **Item weights per treasure level** (for M7; items.md 4.2 and 11.1).
    MM6's are not public. Use the proposal in items.md 4.2, or have
    someone with a copy read the numbers (numbers only; no file enters the
    repository). Recommendation: the proposal now, the numbers when read.
19. **Prices** (for M2 and M7; items.md 6.3 and 11.5). MM7's formulas
    reproduce MM6's tavern and fare prices from each house's factor.
    Recommendation: adopt them for shops, guild books, training, taverns
    and transport; add reputation when it exists.
20. **Scrolls and wands** (for M7; items.md 11.8; magic.md 5.6). The skill
    and rank they cast at in MM6 is unknown (MM7: scrolls at Master 5,
    wands at Normal 8). Recommendation: MM7's values, marked ours.
21. **Items on the ground** (for M7; items.md 4.8 and 11.4). Icon
    billboards, as the tree sprites, or Meshy props. Recommendation:
    billboards; no credits.
22. **Quick Start** (for M6; interface.md 11.1; DESIGN 7). MM6 offers four
    ready-made members beside creation; DESIGN 7 says full creation and no
    pre-made party. Recommendation: offer Quick Start, with four of our
    own.
23. **World facts in conflict** (for M10; world.md 7). The Luck well's cap
    (15 or 16) and the circus's season (a month at each site, or four).
    Recommendation: 15 and a month, the majority of the sources.

### Touch, view and feel

Interface.md 14 states each in full.

24. **Field of view** (for M5; interface.md 13.5). Recommendation: the
    horizon centred in the visible view, about 90° across outdoors and 75°
    indoors, judged on the phone against MM6.
25. **Run** (for M5; interface.md 4.1). Recommendation: a push past 90 px
    runs at twice the walk; MM6 walks unless Shift is held.
26. **Backing and diagonals** (for M5; interface.md 4.1; DESIGN 7.1's
    third and one axis). MM6 backs at the full walk and combines keys.
    Recommendation: back at the full walk; keep one axis per gesture.
27. **Looking** (for M5; interface.md 4.2). Recommendation: ±22.5° by
    default with the patch's range as an option, pitch while walking for
    mostly vertical drags, and a two-finger tap to centre.
28. **Jump** (for M5 and M11; interface.md 4.3; magic.md 8.6; DESIGN 7: a
    spell, not a button). MM6 has a jump key and a Jump spell.
    Recommendation: MM6's small hop on an upward flick of the left thumb,
    the spell's long leap on top.
29. **Attack the nearest** (for M5; interface.md 7.1). Recommendation: a
    gold attack oval; a tap on open ground fires too easily.
30. **Press and hold** (for M5; interface.md 5.4 and 6.4).
    Recommendation: it stands for the right mouse button everywhere
    (examine) and never means anything else.
31. **The quick spell** (for M3 and M5; interface.md 7.2; magic.md 5.2 and
    8.5). Recommendation: a Cast oval, a tap casting the quick spell and a
    hold opening the book; a long press in the book sets it.
32. **The item in hand** (for M5 and M7; interface.md 9.2).
    Recommendation: build it; give, drop, equip and mix through it.
33. **The HUD clock** (for M5; interface.md 8.6). MM6 shows none and tells
    the time on hover. Recommendation: keep it, in MM6's am and pm.
34. **The hit reel** (for M5; interface.md 7.4; DESIGN 14.4). The freeze,
    the shake and the red wash are the owner's; no source the deep dives
    read shows MM6's red flash. Recommendation: keep them, with an off
    switch in Controls.
35. **Gravity** (for M5; interface.md 4.3). The owner's 39 m/s² is three
    times the MM7 engine's, so a fall ends in a third of MM6's time.
    Recommendation: try MM6's with the hop on the phone and keep whichever
    feels right.

### Art, audio, credits and content

36. **Item icons and the paper doll** (for M7; items.md 10; DESIGN 12.3
    and 12.4). DESIGN 12 planned ChatGPT images; the spell icons went
    through Meshy text-to-image with the critics. Recommendation: the
    icons by the spell icons' house recipe, the village's forty first; the
    doll waits for 9, since it shows the same people.
37. **Non-humanoid bodies** (for M10 and M13; monsters.md 3.5 and 4;
    DESIGN 10.2, awaiting sign-off since 2026-10-11). Recommendation:
    approve the procedural rigs, with the rat as the first test (wave 1c).
38. **Meshy grants** (for M4, M7, M10, M11 and M13). Every batch stays
    approved by number (CLAUDE.md); a grant per milestone, as the spell
    icons had, keeps unattended sessions moving. Section 38 estimates
    each. Recommendation: a grant at each milestone's kickoff.
39. **Music and recordings** (for M6, M10 and the sound track;
    interface.md 12; DESIGN 10.7). About nine moods cover MM6's twelve map
    tracks, plus the title, the briefing and the ending; CC0 recordings
    need `FREESOUND_API_KEY` in the environment (PLAN Phase 4).
    Recommendation: the owner supplies the slice's moods before M10 and
    adds the key; the voices wait for 9.
40. **Pictures that may not be placeholders** (for M6, M8 and M10;
    interface.md 10 and 11; CLAUDE.md). The title, the death message, the
    house rooms, the keepers, the dungeon entrances, the rest screen's
    landscape. Recommendation: text-only screens until the owner supplies
    or approves painted stills, one per kind of house and one per
    entrance.
41. **The first slice's shape** (for M10; world.md 6; PLAN Phase 6 step
    1). The valley becomes the start region and its cave leads to the
    goblin fort; the showcase stays a kernel demo outside the world; the
    desert's pass closes until the desert moves west. Recommendation: as
    world.md 6, with the content documents (town plans, dungeon plans,
    quest script) approved before building.
42. **Weather** (for M14; interface.md 13.4; PLAN 5b step 18). MM6 has fog
    days and snow, and no rain or sandstorm. Recommendation: fog and snow
    first; rain and a sandstorm only as the project's own, later.
43. **Checks in the original** (any time; characters.md 17; interface.md
    16). Forty-five checks, most of them minutes with GrayFace's patch and
    MMExtension's console; note that the reference screenshots show the
    patched game. Recommendation: first the recovery rate, being down at
    0, the death depth, food per rest, the walking speeds and the field of
    view, each recorded in DESIGN 14 as it lands.

## 38. Suggested order of work

Rewritten on 2026-10-18. The twelve steps of 2026-10-17 become fourteen
milestones; most of the old step 1 landed overnight (see the executive
summary). Each milestone leaves the game playable and ends as PLAN's
phases do: a kickoff note, a demo on the phone, the owner's sign-off.

How to read them:

- **Kind** says what a milestone needs: **Code** (rules, runtime and
  screens; no art and no authored content), **Content** (places, people,
  quests or data tables authored), **Owner** (the decisions of section 37,
  by number), **Art** (pictures or recordings the owner supplies or
  approves) and **Credits** (Meshy).
- Sizes use the key above; hours are the deep dives' estimates of one
  person's code and tests. A Claude session gets through hours faster,
  but the order and the dependencies hold.
- Every Credits line follows CLAUDE.md: a batch file the owner approves
  by number, run through `npm run asset -- run <nnn>` after `--dry-run`,
  and never text-to-3D: each model starts as a low-poly text-to-image
  concept made with `--ai-model nano-banana-2-lite`, the owner reviews
  the image, then image-to-3D. Prices from the ledger (DESIGN 10.0;
  monsters.md 4.2): a concept image about 3 credits, image-to-3D 15, a rig
  5, a clip 3; so a humanoid with ten clips is about 53, a body for a
  procedural rig or a building about 18, an icon about 3. Batches 001 to
  011 spent about 1,050 credits; the dry run reports the live balance.
- One session per area at a time keeps edits from colliding: rules
  (`src/game`, `src/world`), interface (`src/ui`, `src/app`), world
  (`levels`, `kernel`) and assets (`pipeline`, `assets`). Milestones in
  different areas may overlap where marked.

### Part A: what exists, by MM6's rules (no new art)

**M1. The party by MM6's numbers.** L, about 35 hours. Code. Owner 2 and
4 to 7.

- The held stat table; the class table by tier (characters.md 4.3);
  creation as MM6 makes it (one party pool of 50, −2, a cap of 25, MM6's
  starts and starting skills, Diplomacy learnable); the kit in the pack,
  one basic item per weapon and armour skill, with the first spells still
  learnt at creation until M2 makes books items; class skill access as a
  yes or no table without rank caps (characters.md 3 and 5.1).
- Down at 0 hit points, dead at minus the base Endurance; 5 + ⌊L ÷ 10⌋
  skill points; kill experience only for members who can take it, quest
  experience to each member in full (characters.md 7.1, 8.2 and 12.1).
- Recovery on every cast, scroll and potion by MM6's table; no learning
  gate; First Aid by its name; the 24 spells' formulas; cure windows;
  timed conditions ending in the world (magic.md 7, group 1).
- A near foe struck even by a member with a bow; no clamp on a negative
  attack bonus; Weak halving damage (characters.md 4.5 and 9.1).
- The clock at the chosen rate. DESIGN 14 and `src/game/README.md`
  corrected as characters.md 18 lists.
- Playable: screenshot-21's Paladin comes out of creation with MM6's
  figures, and a cast costs its recovery.
- Unblocks: every judgement of balance; M2 to M4.

**M2. The loop turns in the village.** L, about 40 hours. Code, and
Content (house records with MM6's numbers, the teachers' lines in our own
words). Owner 1 (names), 11, 12 and 19. No credits if the existing
building models house the new services; a new building is about 18.

- A training hall (cap, price by hall, level and tier, Merchant, eight
  days, hours); the Initiate halls of the Elements and of the Self, with
  books as items read from the pack, membership, prices and restocks; a
  skill guild selling Normal skills; Expert and Master teachers with
  MM6's fees and gates per skill and a refusal that names what is
  missing; promotion tiers with the factors for past levels, honorary
  titles and a promotion reward for quests (characters.md 5.2, 7 and 8.3;
  magic.md 5.1; world.md 4.3 and 4.4).
- The village grows from four working houses to about eight.
- Playable: levels rise at the hall, Expert can be bought, spells beyond
  the first are learnt from books.
- Unblocks: M3; the slice's towns (M10).

**M3. Spells that hold.** L, about 50 hours. Code. Owner 2 and 31.

- The buff store, with Bless, Heroism, Stone Skin, Haste (Weak after),
  the five Protections, Lucky Day, Meditation, Precision, Speed, Power
  and Torch Light in it; buff icons; each statistic split into a base and
  a bonus (magic.md 5.5; characters.md 4.2; interface.md 8.4).
- Damage types, the five character resistances with Luck, the halving
  roll, and an element on every source of damage (magic.md 5.4;
  characters.md 11).
- The quick spell and its Cast oval (on the band until M5 places it); a
  book that selects, then casts (magic.md 5.2; interface.md 7.2 and 9.3).
- The party's light by MM6's rule (interface.md 13.3).
- Playable: buffs show and run out on the game clock; a quick spell takes
  one tap.
- Unblocks: monster resistances and Guardian Angel (M4), potions (M7),
  the rest of magic (M11).

**M4. MM6's monsters and their dangers.** XL, about three weeks. Code.
Owner 2, 3 and 13 to 17. Credits: about 42 for the two villagers' combat
clips on their existing rigs (optional; MM6's peasants fight back).

- The monster record as data and the four current kinds mapped onto MM6's
  families with tints; monsters.md 4.1 rows 1 to 10: the distance penalty
  and the 51 m cap, resistances and immunities, the action roll and
  recovery, target preferences and blows that strike several members, AI
  types and fleeing, hostility, waking and peasants who turn, missiles on
  `spellfx`, special attacks with MM6's saves.
- MM6's seventeen conditions with their table, the main condition and the
  rest effects; the gem as enemy detector and recovery light; the
  temple's weekday prices (characters.md 10).
- Party death and the waking a week later, Guardian Angel; falls,
  drowning and lava; the rules of rest (characters.md 12 to 14).
- Playable: the valley's goblins flee and their shamans throw Fire Bolt;
  a rest near monsters is refused; a wiped party wakes a week later.
- Unblocks: loot on bodies (M7), traps (M8), turn-based play (M9).

**M5. MM6's frame and controls on the phone.** XL, about 80 hours. Code.
Owner 8 to 10 and 24 to 35. Art: none to start; faces plug in when
decision 9 delivers them. Runs alongside M3 and M4 (the interface area).

- The layout of decision 8; the view box, the horizon and the field of
  view; ±22.5° looking with a centre gesture; run, and MM6's back and side
  speeds; the hop (interface.md 3, 4 and 13.5).
- The minimap with its compass strip, arrow and zoom; the Map book; food
  and gold; the four ovals; the four books with their own emblems
  (interface.md 8.5 to 8.8 and 9.5).
- Press-and-hold examine for items, spells, skills, statistics, monsters,
  portraits and buffs; the status strip always present; attack the
  nearest; the rest screen's three waits, hourglass and running clock;
  the character screen's pages, Awards and the Quick Reference; the
  tubes' colours; the expression player, waiting for faces (interface.md
  6, 7, 8.1, 8.3 and 9).
- Playable: a veteran plays by MM6's habits with two thumbs.
- Unblocks: identify and repair by examining (M7); the critic loop's HUD
  rounds on the new frame.

**M6. The shell, and maps that remember.** L, about 40 hours. Code. Owner
22, 39 and 40 (title and death screens text-only until pictures come).
Runs alongside M4 and M5 (the app area).

- The shipped app carries the game, with the levels precached and the dev
  panel left out; title, briefing, Create Party in MM6's layout or Quick
  Start; the game menu; named saves in IndexedDB with the autosave
  first, the load screen, the party placed from its save; Controls
  (volumes, detail, sensitivity, walking sounds, show damage, the reel's
  switches); death and win screens (interface.md 11).
- Per map: dead monsters, opened chests and taken items kept; groups
  rolled once; refills after MM6's periods (monsters.md 2.10; items.md
  4.10).
- Playable: from the home screen, saved and resumed; kill quests no
  longer farm.
- Unblocks: PLAN Phase 6's acceptance on the phone; chests that stay open
  (M8).

At the end of Part A the valley, the desert and the showcase play by
MM6's rules, from the home screen.

### Part B: MM6's first loop

**M7. Loot and the item economy.** XL, about three weeks. Code, and
Content (MM6's item, enchantment, shop and mixing tables as data, under
decision 1's names). Owner 2, 18 to 21, 32, 36 and 38. Credits: about
120 for the village's first forty icons, plus rerolls.

- items.md 9, steps 1 to 8 and 10: the record and the catalogue; generic
  names, the inspect view (on M5's hold) and identify and repair by
  skill; the treasure generator; drops on bodies and gold to the purse;
  items and gold on the ground; shops of four kinds with regular and
  special stock, restocks, hours and MM7's prices; the bank; enchantments
  at work; alchemy and its explosions; wands, scrolls and books; breaking
  and theft; save version 2.
- Playable: a goblin drops gold and a dagger, a shop identifies it, a
  wrong mix explodes.
- Unblocks: chests (M8), the item spells (M11), the slice's rewards.

**M8. The event layer.** L, about a week and a half. Code (the runtime
and the kernel elements) and Content (each dungeon's script). Owner 40.
Art: entrance pictures, or text-only entrances.

- An event format in the level scripts and the compiler: doors with keys
  and codes, levers and plates, puzzles in order, timed steps,
  teleporters, secret doors found by Perception, spawn triggers, hazards,
  messages and typed answers; chests filled on first opening and trapped
  at the map's strength, Disarm Trap and Perception, the chest window
  (world.md 2.6; items.md 4.7 and 4.10; interface.md 6.3 and 6.5).
- Wells, fountains, barrels, pedestals, shrines and obelisks on the same
  mechanism, with timers and once-per-character flags; the Notes book;
  dungeon entrance screens and the map-edge prompt; a reach of 5 m
  (interface.md 6.2, 9.4 and 10.5).
- Playable: the showcase gains a locked door, a lever, a trapped chest and
  a secret wall; the village well gives its bonus once.
- Unblocks: MM6-shaped dungeons in M10; the permanent bonuses.

**M9. Turn-based mode, if decision 3 says so.** L, 40 to 60 hours. Code.
After M4; it may run alongside M7 and M8.

- A turn queue over the recovery counters, monsters frozen between
  phases, the party unable to move, a toggle and an indicator, rest
  refused in turns (characters.md 9.9; interface.md 7.3).
- Playable: any fight switches modes at a tap.
- Unblocks: tuning the slice's dungeons for both modes.

**M10. The first slice: MM6's first loop, levels 1 to 10.** XL, about
four weeks. Content, Art and Credits, with some Code (a second region from
the valley generator, edge travel with days passing, one weekday coach,
the monthly bounty, the Seer's pilgrimage). Owner 1, 23 and 37 to 41.
Credits: about 400 to 600 (the mage, the thieves and thugs, the cultists
and the lizard men as humanoids, about 270; rats, blood suckers, bats,
spiders and cobras for the procedural rig, about 90; about ten new kinds
of building, about 180).

- world.md 6: two regions, two towns of about twenty working places each,
  three medium dungeons (the goblin fort, the infested shrine, the
  thieves' den) and the cult temple if wanted, seven quests, two
  obelisks, a shrine; the monsters of monsters.md waves 1a to 1e, with the
  followers of Baa and lizard men of wave 2 and the thieves and thugs of
  wave 3; the rig for the first animal (monsters.md 4.1 row 16, L); music
  for the slice's moods.
- The content documents first (PLAN Phase 6 step 1), approved by the
  owner.
- Playable: MM6's opening hours, from the start town to the capital and
  back, trained to level 12.
- Unblocks: PLAN Phase 6's acceptance and a first release through PLAN
  Phase 7; the pattern every later region repeats.

### Part C: the breadth of MM6

**M11. All 99 spells.** XL, three to four weeks. Code. Owner 2, 28 and 38.
Credits: about 260 for the remaining spell icons.

- magic.md 7, groups 3 to 10: the single-target bolts, the heals, the
  great buffs, volleys and areas, monster states, Jump, Feather Fall,
  Water Walk, Fly, Town Portal and Lloyd's Beacon, the item spells,
  Divine Intervention with aging; Light and Dark as skills with their
  guilds, hours and reputation gates; monsters casting through the same
  code.
- Unblocks: travel by spell (M12), the late roster (M13).

**M12. People, travel and society.** XL, about three weeks. Code and
Content. Owner 9 (the hirelings' faces) and 38. Credits: about 30 for each
walking townsperson's model with the civilian clips (DESIGN 10.1), a few
models reused with tints.

- Hirelings and their professions; reputation with its ranks and moves;
  street people with professions and news; Join, Beg, Threaten and Bribe;
  the Temples of Baa and donations; coaches and ships on weekday
  timetables with fares and gates; the Arena, the Circus and the
  collectors (sections 21, 25 and 26; world.md 3.4 and 4.5 to 4.10;
  items.md 6.4).
- Unblocks: the Light and Dark Masters; the middle of the main quest.

**M13. The roster.** XL, several weeks. Code and Credits (about 1,700 for
waves 2 to 5 beyond M10's share). Owner 14, 37 and 38.

- The rest of monsters.md 4.1 and its waves 2 to 5 (4.2): aging and
  draining, spawn groups by each map's difficulty, wandering and
  water-bound monsters, one body plan at a time on the procedural rigs,
  flyers, monster spells through M11's code, sounds per kind, bounties.

**M14. Enroth's breadth, the story and the ending.** XL many times over:
about 190 working days of content. Content and Credits (buildings and
props per region, roughly 100 to 300 credits a region). Owner 1, 23 and 42.

- The remaining regions in MM6's order of play (world.md 3.6), each with
  its towns, dungeons, people and quests; the main quest's gates, the
  twelve promotion quests, the 27 side quests, the activities, the ending
  and the score; fog and snow; a precache planned for 130 to 265 MB of
  levels (world.md 5.1).

### Alongside, all the way

- **Faces and voices** (decision 9): into M5's expression player, M6's
  creation and M12's hirelings.
- **Music and sound** (decision 39): the title in M6, the slice's moods in
  M10, spell and monster sounds with M11 and M13.
- **The critic loop** (PLAN 5b step 17; decision 10): the look only; it
  closes no gap in this document.
- **Checks in the original** (decision 43), recorded in DESIGN 14.
- **PLAN 5b step 18**, mapped: the lasting buffs are M3; Jump is decision
  28 and M11; rain and a sandstorm are not MM6's (decision 42); music is
  the track above; the smith's hammer and the temple bell are ambience,
  with dawn and dusk cues (interface.md 12.5).

The old steps map onto the milestones as follows: step 1 is done overnight
and finished in M1; 2 is M2 and M3; 3 is M4; 4 is M6; 5 is M7; 6 is M4
and M13; 7 is M3 and M11; 8 is M8; 9 is M12; 10 is M5 and the faces; 11
is M9; 12 is M10 and M14.

## 39. Sources

All public; read on 2026-10-17. The deep dives in `docs/gaps/` add their
own (among them MM6's published text tables, the Russian monster and
character tables, the manual and the reference card, and OpenEnroth for the
MM7 engine) and list them at their ends.

- **GF-M**: GrayFace, "Game Mechanics" (MM6–8).
  https://grayface.github.io/mm/mechanics/
- **GF-P**: GrayFace, MM6 Patch read-me (its change list describes the
  original's behaviour). https://grayface.github.io/mm/MM6PatchReadMe
- **MMX**: GrayFace, MMExtension reference (constants and structures, with
  MM6 tags). https://grayface.github.io/mm/ext/ref/
- **RPGC**: RPG Classics, Might and Magic 6 shrine: elemental, clerical and
  dark/light spells, skills, characters, enchantments, items, weapons,
  armour, hirelings, recipes, monsters, obelisk.
  http://tartarus.rpgclassics.com/mm6/
- **DOB**: D. G. Dobrev, "Complete Guide to Might and Magic VI" (fan
  guide). https://www.cheathappens.com/text/mm6guide.zip.txt
- **CYB**: "Might and Magic 6 FAQ" (fan FAQ).
  https://www.cyberly.org/game-cheats/pc-walkthroughs/might-and-magic-6-faq.html
- **MGW**: Magic Game World, MM6 guides: boat and stagecoach schedule
  (https://www.magicgameworld.com/?p=37768), High Council quests (?p=37776),
  Oracle quests (?p=37780), endings (?p=37782), releasing Archibald
  (?p=80938), obelisks (?p=37759).
- **LP**: Let's Play Archive, Might and Magic 6, introduction and update 1.
  https://lparchive.org/Might-and-Magic-6/
- **MMW**: Might and Magic Wiki (fandom), "Character status" and "Sorcerer
  (MM6)", as quoted by search results; direct reading was refused.
  https://mightandmagic.fandom.com/
- **GOG**: GOG forum threads on raising attributes and on the party, as
  quoted by search results. https://www.gog.com/forum/might_and_magic_series
- **MM7 reference card** (for comparisons marked as MM7 only).
  https://mocagh.org/nwc/mm7-refcard.pdf
- **Screenshots**: the owner's MM6 captures in `artwork/reference/`
  (third-party, reference only), numbered as in its README.
