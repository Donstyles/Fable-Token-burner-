# MM6 gap analysis

What Might and Magic VI: The Mandate of Heaven (New World Computing, 1998)
has, what this project has, and what is missing or wrong. Written
2026-10-17 against commit `da0cb19`. The owner wants a complete re-creation
of MM6's systems; this document measures the distance.

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

## Executive summary: the fifteen gaps that most change MM6

Ranked by how much each changes the experience of playing MM6.

1. **The world is a demo, not Enroth.** MM6 has 15 outdoor maps, about a
   dozen towns and several dozen dungeons, castles and temples. The project
   has two generated regions (a valley with one village, and a desert) and
   one test dungeon holding a single bandit. (Section 34.) XL, many weeks.
2. **The RPG loop cannot turn.** No trainer and no guild stand in the world.
   `VILLAGE_HOUSES` in `src/game/content.ts` holds an inn, a temple, a store
   and a smithy. Nobody can level up or buy a spell. No skill teacher
   exists, so Expert and Master can never be reached, and no new skill can
   be learnt. There are no promotions. (Sections 2, 5, 6, 16, 18.) M to put
   the houses in; L for teachers and promotions.
3. **Magic is a quarter built and half of that is inert.** 24 of MM6's 99
   spells exist. Light and Dark Magic are absent. Six of the 24 do nothing
   but print "takes no hold yet". Spells cost no recovery time. Costs above
   level 5 are far too low. Cures ignore MM6's time windows. There is no
   quick spell. (Section 7.) XL.
4. **Monsters are four kinds of melee humans.** MM6 has about 180 monster
   types in some 50 families, with ranged attacks, spells, 23 kinds of
   special attack (poison, disease, curse, paralysis, stoning, death,
   eradication, aging, mana drain, item breaking, theft), flyers, fleeing,
   groups and target preferences. The project's bandits, goblin scouts and
   nomad raiders walk up and swing. (Section 9.) XL.
5. **There is nothing to find.** No loot from monsters, no chests, no gold
   piles, no random items, no enchantments, no artifacts or relics. There
   are 17 hand-made items. Identify and repair have nothing to work on.
   (Sections 12 to 14.) XL.
6. **There is no story.** MM6's main quest (the six Lords, the High Council,
   the traitor, the Oracle's four crystals, the Control Center, the Blaster,
   Archibald, the Hive), its twelve promotion quests and its side quests are
   absent. Two small kill quests exist. There is no ending and no score.
   (Sections 27, 36.) XL.
7. **There is no danger beyond hit points.** Monsters inflict no
   conditions. A dead party has no consequence. Falls, deep water and lava
   do not hurt. There are no traps. (Sections 10, 11, 29.) M to L.
8. **The numbers are off.** The stat bonus table gives one point too much at
   most scores. The death threshold, the recovery model, armour skills,
   weapon rank effects, Learning, Body Building and Meditation all differ.
   Bows shoot with the melee weapon's numbers. Monsters use the party's
   to-hit formula. Being hit costs no recovery. (Sections 3, 4, 8.) M.
9. **Dungeons have no mechanics.** No doors that open, locks, keys, levers,
   secret doors, chests, traps, teleporters or pressure plates. The level
   format has no event scripting. (Section 29.) L.
10. **No permanent bonuses to hunt.** No wells, fountains, barrels,
    cauldrons, pedestals, monthly altars, Shrine of the Gods or obelisks.
    (Sections 23, 24.) L.
11. **No way to travel.** No stables, boats, Town Portal, Lloyd's Beacon,
    Fly, Water Walk, Jump or Feather Fall. (Sections 21, 28.) L.
12. **An empty society.** No hirelings, no reputation, no street people
    with professions and news, no begging, bribing or threatening, no
    proprietors in the houses, no bank. (Sections 20, 25, 26.) L.
13. **MM6's screen furniture is missing.** No minimap or compass, no food
    and gold counters, no portraits, expressions or voices, no paper doll,
    no Awards, Autonotes or Calendar, no quick reference, no information
    pop-ups for items, spells and skills. (Sections 30, 31.) L, mostly art.
14. **No turn-based mode.** The owner excluded it on 2026-10-11 (DESIGN 7).
    MM6 lets the player switch at any moment. A complete re-creation needs
    it, so the decision needs revisiting. (Section 8.) L.
15. **No game shell.** No title or game menu, no save slots or load screen,
    no options, no music, and the shipped app is empty. (Sections 32, 33
    and "First" above.) M.

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
- Seven statistics are set from a pool of bonus points. The pool size,
  whether it is shared by the party, and whether lowering a stat refunds a
  point are unverified for MM6. (MM7's reference card gives 50 points with
  refunds; that is MM7.)
- Each class has two fixed skills; the player picks two more from a class
  list (GOG thread via search; LP update 1). Screenshot-22 shows a level-1
  Paladin with Sword, Spirit Magic, Shield and Chain. Shield and Chain are
  the usual picks, so the Paladin's fixed pair is most likely Sword and
  Spirit Magic.
- Weapons and armour start unequipped in the pack. Spells start as
  spellbooks in the pack, to be read (LP update 1).
- The party starts with 200 gold and 7 food (screenshot-30 and others show
  7 and 200 on the counters).
- Screenshot-21 shows a level-1 Paladin aged 26. Whether every character
  starts at 26 is unverified.
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
  MM6 most likely gives Sword and Spirit.
- The kit is equipped for the player and the spells are pre-learnt. MM6
  hands over items and spellbooks.
- Age 20, where MM6 shows 26 (unverified for all).
- The pool rules may differ (unverified).
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
- Promotions raise the gains per level. Sorcerer 2 hit points and 3 spell
  points a level, Wizard 3 and 4, Archmage 4 and 5 (MMW, Sorcerer). Knight:
  Cavalier adds 2 hit points a level, Champion 4 (CYB). The other classes'
  numbers are unverified.
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
  - Archer: Lord Stromgard's quests: the keys to the Dragon Towers, then
    opening the towers (the guides disagree on which step gives which
    promotion).
  - Sorcerer: drink from the fountain outside Bootleg Bay, then see Lord
    Albert Newton (Wizard); Terrax's crystal from Corlagon's Estate
    (Archmage).
  - Cleric: hire a carpenter and a stone cutter to repair the Free Haven
    temple (Priest); the Sacred Chalice from the Temple of the Sun for Lord
    Anthony Stone (High Priest).
  - Druid: the Druid Circle in Silver Cove on set dates, for Lady Loretta
    Fleise (Great Druid); the altars of the Temple of the Moon in order
    (Arch Druid).
- Which skills each class can learn (RPGC characters):

| Class    | Weapons                     | Armour                        | Magic                                 |
| -------- | --------------------------- | ----------------------------- | ------------------------------------- |
| Knight   | all eight                   | Shield, Leather, Chain, Plate | none                                  |
| Paladin  | all eight                   | all four                      | Spirit, Mind, Body                    |
| Archer   | all eight                   | Leather, Chain                | Fire, Air, Water, Earth               |
| Cleric   | Staff, Bow, Mace, Blaster   | Shield, Leather, Chain        | Spirit, Mind, Body, Light, Dark       |
| Sorcerer | Staff, Dagger, Bow, Blaster | Leather                       | Fire, Air, Water, Earth, Light, Dark  |
| Druid    | Staff, Dagger, Bow, Blaster | Shield, Leather               | the seven non-Light, non-Dark schools |

- Which classes may learn each miscellaneous skill is unverified.

**Project**

- `src/game/classes.ts`: the six classes with hit and spell point base and
  factor, base stats, fixed and optional skills and a per-class rank cap
  per skill (`CLASS_DEFS`). No promotion exists anywhere.
- Skill lists differ from RPGC: the Cleric may learn Dagger and cannot
  learn Bow; the Druid may learn Mace and cannot learn Bow; the Paladin and
  the Archer cannot learn Staff; no class can learn Blaster, Light or Dark.
- The rank caps (for example Paladin Dagger and Bow only to Expert) are the
  project's invention. MM6 gates Masters by promotion, stats, reputation
  and quests instead (section 5).
- A check against screenshot-21: a level-1 Paladin with Endurance 15 has 31
  hit points in MM6. The project's formula gives 37 for the same Endurance
  (25 + (1 + 2) × 4), and 33 even with MM6's stat table. The Paladin's base
  or factor is wrong; which one is unverified. The same screenshot's 7
  spell points do fit the project's Paladin base 5 and factor 1 with MM6's
  stat table.

**Gap**

- Promotions, their quests, their per-level gains and the Master gates are
  missing.
- Class skill access deviates as listed.
- Hit point factors are suspect (unverified beyond the Paladin check).

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
  Old age weakens a character (DOB). The thresholds are unverified.
- The sheet lists five resistances: Fire, Electricity, Cold, Poison, Magic
  (screenshot-21; MMX `const.Damage` for MM6).

**Project**

- `BONUS_TABLE` in `src/game/stats.ts` (lines 20 to 51) is shifted: 11–12
  give 0 and 13–14 give +1. From 4 to 399 every score gets one point more
  than MM6. At 400 it gives 22 (MM6 25) and at 500 it gives 23 (MM6 30).
  DESIGN 14.1 records the shifted table as the community one; GrayFace's
  table says otherwise.
- `maxHp` and `maxSp` in `src/game/character.ts` (lines 70, 76) follow the
  MM6 shape: base + (level + bonus) × factor, plus Body Building or
  Meditation.
- Accuracy feeds the attack bonus. Speed feeds armour class and recovery.
  Might feeds melee damage. Luck does nothing. Endurance does not shorten
  hit recovery (there is no hit recovery, section 8).
- A stat is one number (`Character.stats`). There is no base and bonus
  split. The sheet shows "current (base)" only when a condition changes a
  value (`src/ui/sheet.ts`, `statsColumn`).
- The sheet has no resistances.

**Gap**

- The table, and with it every derived number, is wrong by one step for
  normal scores.
- Luck, hit recovery, the base and bonus split, resistances and aging are
  missing.

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
  Disarm Trap, Learning). No teacher of Thievery appears in the sources; it
  is probably unused (unverified).
- Three ranks: Normal, Expert, Master. What each rank does (RPGC skills;
  screenshot-23 for Shield):

| Skill                 | MM6 Normal / Expert / Master                                                                                                                       | Project                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Staff                 | attack / adds to armour class / stun chance equal to skill                                                                                         | attack; the generic Expert and Master below                                     |
| Sword                 | attack / shorter recovery / a sword in the left hand                                                                                               | generic; no left hand                                                           |
| Dagger                | attack / a dagger in the left hand / triple-damage chance equal to skill (GF-M instead says a flat 10 % chance at any skill; the sources conflict) | generic; no left hand; no triple damage                                         |
| Axe                   | attack / shorter recovery / skill added to damage                                                                                                  | generic                                                                         |
| Spear                 | attack / adds to armour class / skill added to damage; one or two hands                                                                            | generic; the spear is always two-handed (`items.ts`)                            |
| Bow                   | attack / shorter recovery / two arrows a shot                                                                                                      | generic; and bows use melee numbers (section 8)                                 |
| Mace                  | attack / skill added to damage / stun chance equal to skill                                                                                        | generic                                                                         |
| Blaster               | attack / double / triple; no distance penalty from Expert (GF-M)                                                                                   | Missing                                                                         |
| Shield                | skill added to armour class / double / triple                                                                                                      | Present                                                                         |
| Leather, Chain, Plate | skill added to armour class / recovery penalty reduced / removed                                                                                   | Normal adds no armour class; Expert removes the penalty; there is no plate item |
| Fire to Body          | rank changes spell effects                                                                                                                         | partly (section 7)                                                              |
| Light, Dark           | Clerics and Sorcerers only, learnt in play                                                                                                         | Missing                                                                         |
| Identify Item         | identify by inspecting; better items with skill; double / triple                                                                                   | no effect anywhere                                                              |
| Merchant              | better prices; double / triple (formula unverified)                                                                                                | 2 % per point of bonus, to 50 %                                                 |
| Repair Item           | repair by inspecting; better items with skill; double / triple                                                                                     | no effect anywhere                                                              |
| Body Building         | hit points + skill × class factor; double / triple                                                                                                 | hit points + skill × rank (no class factor)                                     |
| Meditation            | spell points + skill × class factor; double / triple                                                                                               | spell points + skill × rank (no class factor)                                   |
| Perception            | avoid trap damage, find hidden doors and treasure; double / triple                                                                                 | no effect anywhere                                                              |
| Diplomacy             | less reputation lost when begging, bribing or threatening                                                                                          | Missing                                                                         |
| Disarm Trap           | open trapped chests safely; double / triple                                                                                                        | no effect anywhere                                                              |
| Learning              | +(9 + skill) % experience; double / triple (5 skill gives 14 %; 10 at Master gives 39 %)                                                           | + skill × rank % (`experienceWithLearning`)                                     |
| Thievery              | in the table, apparently unused                                                                                                                    | Missing                                                                         |

- The "generic Expert and Master" in the project is this: every weapon
  skill is added to attack, doubled at Master (`weaponSkillToHit`,
  `character.ts` line 85), and every weapon's recovery drops 0.05 s per
  skill point from Expert (`recoverySec`, line 112). MM6 has no such
  blanket rule.
- Body armour adds level × 0, 1 or 2 by rank (`equipmentArmor`,
  `inventory.ts` line 209). So a Normal Leather skill adds nothing.
  Screenshot-21 fits MM6 adding the skill at Normal, if the starting chain
  mail gives 8 and the shield 4 (assumed): 8 + 4 + Chain 1 + Shield 1 = AC
  14 with Speed 13 (bonus 0).
- `equipmentRecoveryPenalty` (line 225) lifts the whole penalty at Expert.
  MM6 reduces it at Expert and removes it at Master.

**Gap**

- Blaster, Light, Dark, Diplomacy and Thievery are missing.
- Every weapon's Expert and Master effect is replaced by one invented rule.
- Armour at Normal, Body Building, Meditation and Learning use the wrong
  formulas.
- Identify Item, Repair Item, Perception and Disarm Trap are learnable but
  do nothing.

**Status:** Present but deviates; five skills Missing. **Size:** M for the
rules; the dependent systems are sized in their sections.
**Depends on:** dual wielding (section 8), items to identify and repair
(section 12), traps and secrets (section 29), reputation (section 25).

## 5. Skill points, teachers and prices

**MM6**

- Five skill points a level (LP update 1). Horseshoes from stables give two
  more (LP update 1).
- Raising a skill from n to n + 1 costs n + 1 points (screenshot-23: "You
  need 2 more Skill Points to advance here" at level 1).
- New skills at Normal are bought in houses in town, for example the
  miscellaneous skills at New Sorpigal's Buccaneers' Den (LP update 1).
  Prices are unverified.
- Expert needs skill 4 (player forums; unverified for every skill) and gold.
  Master needs a higher skill, gold and sometimes a stat, a promotion, a
  reputation, a quest or an item. There are two or three Expert teachers
  per skill and one Master teacher. From RPGC skills:

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

**Project**

- Raising a skill with points works on the sheet (`raise` in
  `src/ui/sheet-model.ts`, `raiseSkill` and `raiseCost` in
  `src/game/skills.ts`). There is no cap on the level.
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
- Each hall trains only up to a level, and prices rise with level. The caps,
  the prices and whether training takes days are unverified.
- Kill experience is shared by the party (MMX `AddKillExp`); the exact split
  is unverified.
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
- The price model and the hall caps are guesses.
- Learning is 9 points short (section 4).

**Status:** Partial. **Size:** S to place a hall; M for MM6's prices, caps
and time once known. **Depends on:** the world (section 34).

## 7. Magic: schools, spells, costs, recovery, quick spell

**MM6, general**

- Nine schools of eleven spells (RPGC; screenshot 2026-07-09-183355 shows
  the Water page and the nine school tabs).
- Spells come from spellbooks, bought at guilds or found, and read from
  the pack (LP update 1).
- Costs by spell level for the seven common schools: 1, 2, 3, 4, 5, 8, 10,
  15, 20, 25, 30. The elemental "arrow" spells at level 2 cost 2, 1 and 0
  by rank, and Spirit Arrow costs 1, 1 and 0. Light costs 20 to 75 and Dark
  20 to 200 (RPGC).
- Every spell has a recovery time, and most recover faster with rank
  (RPGC: "moderate / faster / fastest"). The numbers are unverified.
- Rank changes the effect: duration, party-wide reach, number of missiles.
  Which rank a spell needs before it can be learnt is unverified.
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

- `src/game/spells.ts`: 24 spells. The cost is the spell level at every
  rank (`flat`, line 98). Buff durations are 60 + 5 × skill minutes
  (`buffMinutes`, line 103). Spells of levels 1 to 4 need Normal, 5 to 8
  Expert and 9 to 11 Master (`rankForSpellLevel`, line 92; unverified).
- `src/game/spellbook.ts`: learning and casting checks; a Cursed caster
  fails half the time and still pays.
- The runtime (`performCast`, `src/dev/index.ts`) heals, cures, afflicts,
  brightens the torch, throws bolts and stuns. A bolt goes at the living
  monster nearest the middle of the view within 40 m and 28°
  (`BOLT_TARGETING`, `src/world/spell-target.ts` line 21). Buffs, party
  buffs and Jump print "takes no hold yet" (line 821).
- Casting sets no recovery. Only `Party.attack` sets `readyAt`
  (`src/game/party.ts` line 187).
- There is no quick spell, no buff store, no resistance and no cure window.
- `src/ui/spellbook.ts`: the known schools as tabs, spell ovals, member
  spells aimed by a tap on a portrait. Seven spell icons were added in
  `da0cb19`; the book's use of them was still uncommitted at the time of
  writing.
- In play only each starting school's first spell can be known, plus the
  store's two scrolls, because no guild stands in the world (section 16).

Legend for the tables: **Works** = the effect happens in the dev build;
**Inert** = defined, points spent, nothing happens; **Missing** = not
defined. Costs are MM6's (RPGC).

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
| 8   | Jump                        | 15        | the party leaps 60 feet with no fall damage                                                | Inert; cost 8                                |
| 9   | Implosion                   | 20        | 10 + 1–10 per skill                                                                        | Missing                                      |
| 10  | Fly                         | 25        | outdoors; 5 / 10 / 60 minutes per skill; 1 point every 5 minutes aloft                     | Missing                                      |
| 11  | Starburst                   | 30        | 8 / 12 / 16 stars of 20 + 1 per skill; outdoors                                            | Missing                                      |

### Water

| #   | Spell                | MM6 cost          | MM6 effect                                                                                                  | Project                                          |
| --- | -------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Awaken               | 1                 | wakes the sleeping party within the window                                                                  | Works, deviates: one member at Normal; no window |
| 2   | Cold Beam            | 2 / 1 / 0         | 2–6 cold; always hits                                                                                       | Missing                                          |
| 3   | Protection from Cold | 3 (RPGC prints 1) | resistance = skill × 1 / 2 / 3; 1 hour per skill                                                            | Missing                                          |
| 4   | Poison Spray         | 4                 | 1 / 3 / 5 shots of 2 + 1–2 per skill                                                                        | Missing                                          |
| 5   | Water Walk           | 5                 | outdoors; 5 / 10 / 60 minutes per skill; 1 point every 20 minutes on water                                  | Inert                                            |
| 6   | Ice Bolt             | 8                 | 1–7 per skill; always hits                                                                                  | Missing                                          |
| 7   | Enchant Item         | 10                | 10 % per skill to enchant; stronger at Expert; weapons at Master                                            | Missing                                          |
| 8   | Acid Burst           | 15                | 9 + 1–9 per skill; always hits                                                                              | Missing                                          |
| 9   | Town Portal          | 20                | 10 % per skill; to the fountain of the last town; outdoors at Normal, indoors at Expert, any town at Master | Missing                                          |
| 10  | Ice Blast            | 25                | 7 shards of 12 + 1–2 per skill                                                                              | Missing                                          |
| 11  | Lloyd's Beacon       | 30                | 1 / 3 / 5 beacons; last 1 hour / 1 day / 1 week per skill                                                   | Missing                                          |

### Earth

| #   | Spell                 | MM6 cost  | MM6 effect                                                     | Project                                                 |
| --- | --------------------- | --------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Stun                  | 1         | knocks a monster back and makes it recover; stronger with rank | Works, deviates: nearest monster within 4 m, held 1–3 s |
| 2   | Magic Arrow           | 2 / 1 / 0 | 3–8, rolls to hit like an arrow                                | Missing                                                 |
| 3   | Protection from Magic | 3         | magic resistance = skill × 1 / 2 / 3                           | Missing                                                 |
| 4   | Deadly Swarm          | 4         | 5 + 1–3 per skill; never misses                                | Missing                                                 |
| 5   | Stone Skin            | 5         | armour class +5 + skill; party from Expert                     | Missing                                                 |
| 6   | Blades                | 8         | 1–5 per skill; can miss                                        | Missing                                                 |
| 7   | Stone to Flesh        | 10        | cures stoning within the window                                | Works, deviates: no window; cost 7                      |
| 8   | Rock Blast            | 15        | 1–8 per skill, explodes                                        | Missing                                                 |
| 9   | Turn to Stone         | 20        | stones a monster 5 / 10 / 20 minutes per skill                 | Missing                                                 |
| 10  | Death Blossom         | 25        | 20 + 1 per skill; outdoors                                     | Missing                                                 |
| 11  | Mass Distortion       | 30        | 25 % of the target's hit points + 2 % per skill                | Missing                                                 |

### Spirit

| #   | Spell          | MM6 cost  | MM6 effect                                                                                          | Project                                                     |
| --- | -------------- | --------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Spirit Arrow   | 1 / 1 / 0 | 1–6; can miss                                                                                       | Works, deviates: 1d3 + skill; never free (MM6: 0 at Master) |
| 2   | Bless          | 2         | attack +5 + skill; 1 hour + 5 minutes per skill; party from Expert; +15 minutes per skill at Master | Inert; party only at Master                                 |
| 3   | Healing Touch  | 3         | heals 3–7 / 5–9 / 7–11                                                                              | Missing                                                     |
| 4   | Lucky Day      | 4         | Luck +10 + 2 or 3 per skill; party at Master                                                        | Missing                                                     |
| 5   | Remove Curse   | 5         | cures Cursed within the window                                                                      | Works, deviates: no window                                  |
| 6   | Guardian Angel | 8         | if the party dies it wakes at the temple for half its gold; 1 hour per skill                        | Missing                                                     |
| 7   | Heroism        | 10        | damage +5 + skill; party from Expert                                                                | Missing                                                     |
| 8   | Turn Undead    | 15        | undead flee for 3 minutes + 3 per skill                                                             | Missing                                                     |
| 9   | Raise Dead     | 20        | cures Dead within the window; leaves Weak                                                           | Works, deviates: no window; cost 9                          |
| 10  | Shared Life    | 25        | pools the party's hit points + 1 / 2 / 3 per skill and shares them                                  | Missing                                                     |
| 11  | Resurrection   | 30        | cures Eradicated within the window; leaves Weak                                                     | Works, deviates: no window; cost 11                         |

### Mind

| #   | Spell          | MM6 cost | MM6 effect                                                                          | Project                                                                                      |
| --- | -------------- | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Meditation     | 1        | Intellect and Personality +10 + 2 (Normal) or 3 (Expert) per skill; party at Master | Inert; +5 + skill                                                                            |
| 2   | Remove Fear    | 2        | cures Afraid within the window                                                      | Works, deviates: no window; reaches the party from Expert, which MM6's text does not mention |
| 3   | Mind Blast     | 3        | 5 + 1–2 per skill                                                                   | Missing                                                                                      |
| 4   | Precision      | 4        | Accuracy +10 + 2 or 3 per skill; party at Master                                    | Missing                                                                                      |
| 5   | Cure Paralysis | 5        | cures Paralyzed within the window                                                   | Works, deviates: no window                                                                   |
| 6   | Charm          | 8        | a monster fights for the party 3 / 6 / 12 minutes per skill                         | Missing                                                                                      |
| 7   | Mass Fear      | 10       | monsters flee 3 minutes per skill; not undead                                       | Missing                                                                                      |
| 8   | Feeblemind     | 15       | a monster cannot cast, 5 minutes per skill                                          | Missing                                                                                      |
| 9   | Cure Insanity  | 20       | cures Insane within the window                                                      | Works, deviates: no window; cost 9                                                           |
| 10  | Psychic Shock  | 25       | 12 + 1–12 per skill                                                                 | Missing                                                                                      |
| 11  | Telekinesis    | 30       | works objects at a distance; strength 1 / 2 / 3 per skill                           | Missing                                                                                      |

### Body

| #   | Spell                  | MM6 cost | MM6 effect                                                  | Project                                                             |
| --- | ---------------------- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Cure Weakness          | 1        | cures Weak within the window                                | Works, deviates: no window                                          |
| 2   | First Aid              | 2        | heals 5 / 7 / 10                                            | Works as "Heal", deviates: 5 + skill × rank                         |
| 3   | Protection from Poison | 3        | resistance = skill × 1 / 2 / 3                              | Missing                                                             |
| 4   | Harm                   | 4        | 8 + 1–2 per skill                                           | Missing                                                             |
| 5   | Cure Wounds            | 5        | heals 5 + 2 per skill                                       | Works, deviates: 10 + 2 × skill × rank                              |
| 6   | Cure Poison            | 8        | cures Poisoned within the window                            | Works, deviates: no window; cost 6                                  |
| 7   | Speed                  | 10       | Speed +10 + 2 or 3 per skill; party at Master               | Missing                                                             |
| 8   | Cure Disease           | 15       | cures Diseased within the window                            | Works, deviates: placed at level 10 (`spells.ts` line 357), cost 10 |
| 9   | Power                  | 20       | Might and Endurance +10 + 2 or 3 per skill; party at Master | Missing                                                             |
| 10  | Flying Fist            | 25       | 30 + 1–5 per skill                                          | Missing                                                             |
| 11  | Power Cure             | 30       | heals the party 10 + 2 per skill                            | Missing                                                             |

### Light (Clerics and Sorcerers)

| #   | Spell               | MM6 cost | MM6 effect                                                                    | Project |
| --- | ------------------- | -------- | ----------------------------------------------------------------------------- | ------- |
| 1   | Create Food         | 20       | 1 day of food + 1 / 2 / 3 days per 10 skill                                   | Missing |
| 2   | Golden Touch        | 25       | an item to gold at 40 / 60 / 80 % of value; 10 % per skill; failure breaks it | Missing |
| 3   | Dispel Magic        | 30       | removes the spells on monsters in sight                                       | Missing |
| 4   | Slow                | 35       | a monster at half speed and double recovery, 3 minutes per skill              | Missing |
| 5   | Destroy Undead      | 40       | 16 + 1–16 per skill to undead                                                 | Missing |
| 6   | Day of the Gods     | 45       | a party buff at 2 / 3 / 4 × skill (exact stats unverified)                    | Missing |
| 7   | Prismatic Light     | 50       | 25 + 1 per skill to all in sight; indoors                                     | Missing |
| 8   | Hour of Power       | 55       | Haste, Heroism, Shield, Stone Skin and Bless at 2 / 3 / 4 × skill             | Missing |
| 9   | Paralyze            | 60       | paralyses a monster 3 minutes per skill                                       | Missing |
| 10  | Sun Ray             | 70       | 20 + 1–20 per skill; outdoors by day                                          | Missing |
| 11  | Divine Intervention | 75       | 1 / 2 / 3 a day: full heal, points and cures; ages the caster 10 years        | Missing |

### Dark (Clerics and Sorcerers)

| #   | Spell             | MM6 cost | MM6 effect                                                                | Project |
| --- | ----------------- | -------- | ------------------------------------------------------------------------- | ------- |
| 1   | Reanimate         | 20       | a dead monster rises for the party with 10 / 20 / 30 hit points per skill | Missing |
| 2   | Toxic Cloud       | 30       | 25 + 1–10 per skill                                                       | Missing |
| 3   | Mass Curse        | 40       | curses monsters 2 / 3 / 4 minutes per skill                               | Missing |
| 4   | Shrapmetal        | 50       | 3 / 5 / 7 fragments of 6 + 1–6 per skill                                  | Missing |
| 5   | Shrinking Ray     | 60       | a monster to 1/2, 1/3 or 1/4 size and damage, 5 minutes per skill         | Missing |
| 6   | Day of Protection | 70       | protections at 2 / 3 / 4 × skill (exact effect unverified)                | Missing |
| 7   | Finger of Death   | 80       | 3 / 4 / 5 % per skill to kill outright                                    | Missing |
| 8   | Moon Ray          | 90       | monsters take 1–4 per skill, the party heals as much; outdoors at night   | Missing |
| 9   | Dragon Breath     | 100      | 1–25 per skill, with splash                                               | Missing |
| 10  | Armageddon        | 150      | 50 + 1 per skill to everything on the map; outdoors; 1 / 2 / 3 a day      | Missing |
| 11  | Dark Containment  | 200      | random effects on the target                                              | Missing |

**Gap, in short**

- 75 spells and two schools are missing. Six defined spells are inert.
- Nine defined spells have wrong costs. Damage and healing formulas differ
  for six.
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
- The first ready member acts. Attack or quick spell is one key or button
  (screenshot-21's quick spell line; key names unverified).
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
  enchantments and Heroism. Bows get no Might (unverified).
- Recovery is a sum, in game ticks (GF-M): weapon base (Staff 100, Sword
  90, Dagger 60, Axe 100, Spear 80, Bow 100, Mace 80, Blaster 30, club 100,
  bare hands 100), plus armour (Shield 10, Leather 10, Chain 20, Plate 30,
  reduced by the armour skills), minus the skill, minus the Speed effect,
  minus 25 for Haste and 20 for a "swift" weapon. The floor is 30 for melee;
  bows and blasters have none in real time. MMX gives 128 ticks to a real
  second (`const.RTSecond`), so a sword's 90 is about 0.7 s before
  modifiers (an inference; unverified).
- A struck member also gets recovery, cut by the Endurance effect: 20 −
  Endurance effect (GF-M). Monster blows switch the active member (GF-P).
- Melee reaches only a short way in front of the party; the range in game
  units is unverified. Shots reach 5119 units (above).
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
- The screen flashes red when the party is hit (DESIGN 14.4 cites MM6).

**Project**

- Tap a monster: the selected member if ready, else the next ready one,
  attacks; the selection moves on (`Party.attack`, `src/game/party.ts`).
  This matches MM6's flow.
- `hitChance` (`src/game/combat.ts` line 8) is MM6's party formula without
  Bonus and DistancePenalty.
- Monsters use the same party formula with an `attackBonus`
  (`resolveAttack(this.def.attackBonus, …)`, `src/world/monster.ts`
  line 227), not their level. For a level-2 bandit (bonus 3) against AC 10
  that is 46 % instead of MM6's 38 %.
- Damage: dice plus Might bonus for melee (`damageDice`). No skill damage,
  no enchantments, no Heroism, no resistances, no specials.
- Recovery: seconds per item (dagger 0.8, short sword 1.0, long sword 1.2,
  axe and staff and bow 1.3; `src/game/items.ts`), plus armour penalties
  (leather 0.1, chain 0.3, shield 0.1), minus 0.05 s per Speed bonus point
  and per skill point from Expert, at least 0.5 s (`recoverySec`,
  `character.ts` line 112). MM6 sets recovery by weapon type, not item, and
  its Speed and skill terms are about a quarter as strong relative to the
  base. Bare hands recover as fast as a dagger; in MM6 they are as slow as
  a staff.
- A member with a bow shoots at any range, and a member without one cannot
  hit beyond 3.5 m (`MELEE_REACH`, `src/dev/index.ts` line 593). But the
  shot uses melee numbers: `PartyMember.attackBonus`, `damage` and
  `recoverySec` read the melee weapon (`party.ts` lines 60, 63, 113, 123,
  128). The bow's Shoot bonus, dice and recovery are never used. No arrow
  flies; the result is instant.
- No hit recovery for struck members. No turn-based mode (DESIGN 7: "Real-
  time only", owner, 2026-10-11). No left-hand weapon (`inventory.ts`
  says "MM6 has none either", which GF-M and RPGC contradict).
- Feedback: flash, sound, blood, knockback, shake, hit stop and a red wash
  (`src/world/combat-feedback.ts`). MM6 has the red flash; the rest is the
  project's own feel.

**Gap**

- Turn-based mode is missing.
- Monster to-hit, recovery units and modifiers, hit recovery, ranged
  numbers and distance penalty, dual wielding, weapon specials, elemental
  damage and resistances are missing or wrong.
- The bow bug makes archers melee at range.

**Status:** Present but deviates (real-time); turn-based Missing.
**Size:** M for the formulas; L for turn-based mode.
**Depends on:** items with enchantments (section 12), monsters with
resistances (section 9), an owner decision on turn-based (section 37).

## 9. Monsters

**MM6**

- About 180 monster entries: 51 families of usually three ranks (for
  example Goblin, Goblin Shaman, Goblin King) and 15 unique monsters
  (RPGC monsters). Many are not humanoid: bats, rats, spiders, cobras,
  oozes, hydras, dragons, wyrms, elementals, gargoyles, flying eyes,
  medusas, ghosts, liches, devils, robots of the Control Center.
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
  spell points, Afraid. Theft takes an item (RPGC: "Steal Item"); whether
  any monster steals gold is unverified. The list has no stat drain; aging
  and spell-point drain are the nearest.
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
  (MMX `NoFlee`; AI types such as cowardly are unverified by name).
- Monsters stand in groups that react together (MMX `Group`, `Ally`).
  Peasants and guards are neutral until attacked (unverified detail).
- The dead can be searched for gold and items (MMX treasure fields).
- Maps refill with monsters after a period (unverified for MM6).

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
  the front row"; MM6's party has no rows, and target choice comes from
  preferences (MMX), so that note looks mistaken (unverified).
- Every monster respawns on every page load, and every portal reloads the
  page.
- Non-humanoid monsters are blocked by Meshy's humanoid-only rigging; the
  procedural plan (DESIGN 10.2) is unbuilt.

**Gap**

- 176 or so monster types, every non-humanoid body, ranged attacks,
  spells, special attacks, flying, fleeing, groups, hostility, preferences,
  resistances, treasure and refill timers are missing.

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
  GF-P lists "weakness, insanity" among new-day effects). How much each
  condition costs, Cursed's failure rate, and whether the tavern's drink
  makes a member Drunk, are unverified.
- Cures: a spell within its window (section 7), a temple, some potions,
  some hirelings. Immunity enchantments exist ("of Alarms", "of Antidotes",
  "of Immunity", "of Sanity", "of Freedom", "of the Medusa"; RPGC).
- The HUD gem shows the worst condition (screenshots).

**Project** (`src/game/conditions.ts`)

| MM6         | Project                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| Cursed      | Present: half of actions fail (`failChance` 0.5, line 84; MM6's rate unverified) |
| Weak        | Present but deviates: Might, Endurance, Accuracy, Speed × 0.75 (invented)        |
| Asleep      | Present: cannot act, ends when hit or at rest                                    |
| Afraid      | Present but deviates: cannot act; MM6 effect unverified                          |
| Drunk       | Present but deviates: invented stat changes; nothing makes the party drunk       |
| Insane      | Present but deviates: invented stat changes                                      |
| Poison 1–3  | Deviates: one "poisoned" with severity 1–3 that worsens at each rest (invented)  |
| Disease 1–3 | Deviates: as poison                                                              |
| Paralyzed   | Present: cannot act                                                              |
| Unconscious | Present, a hair off: at 0 hit points or below (MM6: below 0, MMW)                |
| Dead        | Deviates: at −½ of maximum hit points (section 11)                               |
| Stoned      | Present: out of the fight                                                        |
| Eradicated  | Present: differs only in its cure                                                |

- Nothing in play inflicts a condition except hunger at rest (Weak) and
  Raise Dead or Resurrection (Weak). No monster, trap, potion, drink or
  well does.
- No cure windows, no immunities, no new-day effects.

**Gap**

- Split poison and disease into MM6's three levels.
- Replace the invented penalties once MM6's are known.
- Add the sources of conditions (monsters, traps, drinks, wells, lack of
  rest) and the cure windows.

**Status:** Partial. **Size:** M. **Depends on:** monster specials
(section 9), time (section 22), items (section 12).

## 11. Damage, death and hazards

**MM6**

- Below 0 hit points a character is Unconscious. A character dies when hit
  points fall below minus their Endurance (MMW, "Character status": at
  Endurance 30, death at −31).
- When the whole party is down, MM6 plays a death film (GF-P: "Death movie
  played on every death"). The Guardian Angel spell brings the party back
  at the last temple for half its carried gold, at 1 hit point, half or
  full by rank (RPGC; DOB). What happens without the spell (most likely the
  temple and the loss of all carried gold, with banked gold safe) is
  unverified.
- Falling hurts; Feather Fall and Jump prevent it (RPGC).
- Water drowns the party without Water Walk (MMX `Party.Drowning`). MM6's
  terrain has no shallow wading in the sources (unverified).
- Lava burns (MMX `Party.InLava`).
- Traps hurt (section 29).

**Project**

- `damageCharacter` (`src/game/character.ts`): Unconscious at 0, Dead at
  `deathThreshold` = −⌈max ÷ 2⌉ (line 138).
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

- The death threshold is wrong. Party death, falling damage, drowning and
  lava are missing. Wading is an invention.

**Status:** Partial. **Size:** M. **Depends on:** temples (section 17),
Water Walk and Feather Fall (section 7), the game shell (section 32).

## 12. Items

**MM6**

- A large catalogue (RPGC weapons, armour, items): 66 plain weapons in nine
  kinds (clubs, swords, axes, spears, maces, daggers, staves, bows and two
  blasters), 43 plain armour pieces (leather, chain, plate, shields, helms,
  boots, gauntlets, cloaks), belts, hats and crowns, 10 rings, 5 amulets,
  10 gems, scrolls, spellbooks, 25 wands, potions and reagents, quest
  items.
- Artifacts: 12 weapons (Ares, Artemis, Conan, Cronos, Excalibur, Hades,
  Hercules, Merlin, Mordred, Percival, Poseidon, Thor) and 10 armour pieces
  (Aegis, Arthur, Atlas, Galahad, Hermes, Lucius, Pellinor, Pendragon,
  Valeria, Zeus), plus rings such as Guinevere, Igraine and Morgan. Some,
  the relics, carry penalties (RPGC; DOB section 7). The party tracks those
  found (MMX `ArtifactsFound`).
- Random items carry standard enchantments ("of Might", "of Protection",
  "of the Gods" and some 60 more, with a strength), special ones ("of
  Flame", "Vampiric", "of Carnage", "Dragon Slayer" and others) or
  "Antique" for ten times the value (RPGC enchantments). The item record
  has a bonus, a strength, a second bonus and charges (MMX `structs.Item`).
- Treasure comes from monsters and chests at a treasure level (MMX
  `TreasureItemLevel`); the levels' ranges and odds are unverified.
- Found items can be unidentified; Identify Item or a shop names them.
  Items break from monster attacks and need Repair Item or a smith (MMX
  `Broken`, `const.MonsterBonus`).
- The pack is 14 by 9 cells (screenshot-19). Items do not stack. Gold is
  a party counter, not an item. Gems are sold for gold.
- Items lie in the world to be picked up, and the player can throw an item
  out of the pack (unverified detail). Horseshoes and fruit are taken from
  stables and trees (LP update 1).
- An inspect view shows an item's type, description and value
  (screenshot-20).

**Project**

- `ITEMS` in `src/game/items.ts`: 17 items (8 weapons, leather and chain,
  a shield, a helmet, boots, a copper ring, a healing potion, two scrolls).
  No plate, belt, cloak, gauntlets or amulet item exists.
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
- MM6 has no Alchemy skill (MMX lists Alchemy from MM7). Whether a wrong mix
  explodes is unverified.

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
- 25 wands in five tiers, each with one spell (Fire Bolt to Finger of
  Death) and charges; the original deleted a spent wand (RPGC items; GF-P).

**Project**

- Two scrolls (Torch Light at skill 1, Fire Bolt at skill 4), read from the
  pack (`useSelected`, `inventory-model.ts`). Reading costs no recovery.
- No wands, no charges.

**Status:** Partial. **Size:** S once spells exist. **Depends on:** the
spells (section 7), charges on items (section 12).

## 15. Shops

**MM6**

- A shop is a screen with the proprietor's face, an interior picture and
  the choices Buy, Sell, Identify, Repair and Special (screenshot-28, "The
  Knife Shoppe"). Buying shows the goods on shelves (screenshot-29).
- There are several kinds of shop (weapons, armour, magic items, general
  goods; the exact set is unverified), and the guilds sell books. Whether a
  shop buys only its own kind of goods is unverified.
- Stock is restocked on a schedule; New Sorpigal's clerk says Tuesdays (LP
  update 1; unverified as a rule).
- Prices depend on the shop and the Merchant skill. The exact formula and
  any effect of reputation are unverified. Shops have opening hours
  (unverified hours).

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

- MM6's price formula is unknown here; the project's is a guess.
- Special stock, restocking, opening hours, the shop's kind and the
  proprietor screen are missing.

**Status:** Present but deviates. **Size:** M (rules); L with the house
art. **Depends on:** the item catalogue (section 12), time (section 22),
house screens (section 26).

## 16. Guilds and spellbooks

**MM6**

- A guild per school, and guilds of the elements and of the self (DOB
  names the Guild of the Self in New Sorpigal). Membership is needed to
  buy; how it is obtained is unverified.
- Spellbooks cost 100 to 5000 gold by level in the seven schools and 1000
  to 10000 in Light and Dark (RPGC items).
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
  (DOB section 2.2). Prices by condition are unverified.
- Whether MM6's temples take donations, and what a donation does, is
  unverified (none of the sources here covers it).
- Under Guardian Angel a dead party wakes at the last temple (section 11);
  without it, most likely too (unverified).

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

- Levels for gold at a hall in town; each hall trains up to a cap (section
  6; caps, prices and time unverified).

**Project**

- `train` and `renderTrainer` exist. No hall stands in the world.

**Status:** Partial. **Size:** S to M. **Depends on:** the world (section
34).

## 19. Taverns

**MM6**

- "A Lonely Knight" in New Sorpigal offers: Rent Room for 3 gold, Fill
  Packs to 6 days for 2 gold, Have a Drink, Tip Barkeep (screenshot-27).
  A drink can make a member Drunk (unverified detail); a tip buys a rumour
  (unverified detail). Prices vary by town (unverified).
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
  bank balance (MMX `Party.BankGold`). Interest is unverified.

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

- Prices are unverified. Hirelings shorten trips (Horseman, Navigator,
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
- The food a rest costs varies by place (screenshot-30 shows 2). Hirelings
  cut it (Porter, Quarter Master, Gypsy; RPGC). The per-place table is
  unverified for MM6 (MM8 uses the terrain: 1 for grass to 5 for desert).
- A new day applies effects: weakness, insanity (GF-P), from not resting
  (MMW). Characters age; magical aging comes from monsters and spells.
- Whether monsters can interrupt a rest, and whether hostile monsters
  nearby forbid it, is unverified.
- Timed things: monthly altars (section 23), the Circus by month, the
  Druid Circle on set dates, weekly coach days, fountains that refill.
- Houses keep opening hours (unverified hours).

**Project**

- `src/game/time.ts`: the same calendar, starting at 09:00 on 1 January 1165. Present.
- The clock runs at one game minute per real second
  (`MINUTES_PER_REAL_SECOND`, `src/world/daylight.ts` line 13): twice
  MM6's rate if the inference above holds.
- `src/game/rest.ts`: 8 hours, 1 food (`FOOD_PER_REST`, line 24), full
  healing; hungry rests heal nothing and make the party Weak. Wait until
  dawn. No 1-hour or 5-minute wait. Nothing forbids or interrupts a rest.
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
  update 1); the Luck well raises Luck permanently up to 16 (GOG thread).
  Some give temporary bonuses ("+100 Power temporary" in Paradise Valley,
  "Refreshing!" when spent; GF-P). Their uses reset with a timer (GF-P).
- Barrels raise a stat permanently; they are the early game's main source
  (GOG thread). Colours and amounts are unverified for MM6.
- Twelve altars, one per month: Might (Bootleg Bay, January), Intellect
  (Mist, February), Personality (Silver Cove, March), Endurance (White Cap,
  April), Accuracy (Free Haven, May), Speed (Darkmoor, June), Luck (New
  Sorpigal, July), Fire (Kriegspire, August), Electricity (Castle Ironfist,
  September), Cold (Kriegspire, October), Poison (Castle Alamos, November),
  Magic (Blackshire, December). Praying in the right month raises the stat
  or resistance for the party (DOB section 10; CYB; amounts unverified).
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
- Fragments are kept in the Autonotes (unverified).

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
  Diplomacy Master (section 5).

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
- Twelve promotion quests (section 2) and many side quests (Melody Silver,
  the Prince at the Circus, the Monolith and others; the full count is
  unverified).
- The quest log lists the current quests as text (screenshot-31).
- Autonotes gather what the party has learnt (one of the four books in the
  HUD; MMX `AutonotesBits`). Their categories are unverified.
- Awards record each character's deeds on a page of the character screen
  (screenshot-21's buttons; MMX `Player.Awards`; GF-P).
- Quest state is kept as bits (MMX `QBits`).
- Side activities: the Arena, reached by coach from Castle Ironfist on
  Sundays (MGW schedule), and the Circus, in Blackshire in April, Darkmoor
  in August and Bootleg Bay in December (DOB), with prizes such as
  trophies, pyramids and kegs of wine (GF-P). MMX keeps Arena wins by level
  (Page, Squire, Knight, Lord); that this applies to MM6 is unverified.
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
- Walking is the default. GF-P's always-run option says it was "always
  disabled before the patch", and that with it Shift walks; so in MM6 Shift
  most likely runs (unverified).
- The party can jump without the spell (GF-P: "Jumping height reduced a
  bit").
- Movement spells: Jump, Feather Fall, Fly, Water Walk, Town Portal,
  Lloyd's Beacon, Wizard Eye, Telekinesis (section 7). Telekinesis works
  levers and chests at a distance (unverified detail).
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
  and blowing chests hurt (DOB).
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
  `EnemyDetectorYellow`, `EnemyDetectorRed`; where it shows is unverified).
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
  condition gem and green and blue tubes. Dead members show a gravestone
  (screenshot 2026-07-09-183355). Faces change expression (MMX
  "Expression" fields) and speak reactions (MMX
  `StandardPlayerSoundsCount`); the exact set is unverified.
- The right panel: minimap, two hireling windows, a text strip, four books
  (Quests, Autonotes, Map, Calendar), food and gold counters, four gold
  buttons (labels unverified: likely spellbook, rest, quick reference and
  the game menu).
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
  button.
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
  and it autosaved on travel (GF-P). The slot count is unverified.
- Controls sets the keys. Sound, music and voice volume, turn rate (16, 32
  or smooth), always run, walk sound, show hits and flip on exit are MM7's
  options (MM7 reference card); MM6's exact set is unverified.
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

- CD music by region (GF-P mentions CD music and its volume). The track
  for each map is unverified.
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
  Water, Paradise Valley, Hermit's Isle, Dragonsand, and the map of Castle
  Alamos (named "Alamos" in the obelisk list; probably the Eel Infested
  Waters, unverified).
- Towns with coaches or ships (MGW schedule): New Sorpigal, Castle
  Ironfist, Free Haven, Silver Cove, Darkmoor, White Cap, Blackshire,
  Kriegspire, Mist, Bootleg Bay (two harbours), Hermit's Isle, Castle
  Alamos.
- What the sources place in each outdoor map, and what the project has of
  it:

| MM6 map                                   | Named in the sources                                                                                                                                                                                 | Project                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| New Sorpigal                              | the starting town; the Guild of the Self and the Buccaneers' Lair; a bank; the Luck well and the Luck altar (July); an abandoned Temple of Baa; Gharik's Forge nearby; an obelisk inside the volcano | none (the valley's village is an original stand-in) |
| Castle Ironfist                           | the castle: Regent Wilbur Humphrey, Archibald in the library; the well with the Third Eye; Corlagon's Estate; the Electricity altar (September); the coach to the Arena                              | none                                                |
| Mist                                      | Lord Albert Newton; the Silver Helm Outpost; the Intellect altar (February); docks                                                                                                                   | none                                                |
| Bootleg Bay                               | the Hall of the Fire Lord; the Temple of the Sun; the Sorcerer's fountain; the Might altar (January); the Circus in December                                                                         | none                                                |
| Free Haven                                | the High Council; the Free Haven Sewers; the temple the Cleric repairs; the Accuracy altar (May); two coach stations                                                                                 | none                                                |
| Mire of the Damned                        | Snergle's mines; the Axe, Spear, Chain and Perception Masters                                                                                                                                        | none                                                |
| Silver Cove                               | Lady Loretta Fleise; the Warlord's Fortress; the Druid Circle; the Monolith; the Personality altar (March)                                                                                           | none                                                |
| Blackshire                                | Lord Kilburn's shield in a chest; the Magic altar (December); the Circus in April                                                                                                                    | none                                                |
| Kriegspire                                | Castle Kriegspire; the Devil Outpost; the Fire and Cold altars (August, October)                                                                                                                     | none                                                |
| Frozen Highlands                          | White Cap; Castle Stromgard; the Endurance altar (April)                                                                                                                                             | none                                                |
| Sweet Water                               | the Hive                                                                                                                                                                                             | none                                                |
| Paradise Valley                           | a Temple of Baa; the Blaster and Dark Masters                                                                                                                                                        | none                                                |
| Hermit's Isle                             | the Supreme Temple of Baa; the Fountain of Youth; the boat from Castle Ironfist                                                                                                                      | none                                                |
| Dragonsand                                | the Tomb of VARN; the Shrine of the Gods; the obelisk treasure                                                                                                                                       | none                                                |
| Alamos (probably the Eel Infested Waters) | Castle Alamos; the Poison altar (November); the Light Master                                                                                                                                         | none                                                |
| Darkmoor (which map is unverified)        | Castle Darkmoor; the Speed altar (June); the dragon Longfang Witherhide; the Circus in August                                                                                                        | none                                                |

- Indoor maps named in the sources (about 45; the total is unverified):
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
  Fleise, Stromgard, Darkmoor, Kriegspire and Alamos, the Arena, the
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
**Size:** XL, many weeks: 15 regions, about 12 towns and some 45 indoor
maps. **Depends on:** dungeon mechanics (section 29), people
(section 26), monsters (section 9), the kernel's element library (DESIGN
11), asset batches.

## 35. Day and night

**MM6**

- Outdoors the light follows the clock and nights are dark, which is what
  Torch Light is for (RPGC). Some spells need the day or the night (Sun Ray,
  Moon Ray). The rest screen's hourglass shows time passing.
- Weather: snow falls in places (GF-P mentions the snow's drift; the
  Frozen Highlands' endless winter is a quest, MGW). Other weather is
  unverified.

**Project**

- `src/world/daylight.ts`: the sun crosses the sky, dusk, a blue night with
  stars, lanterns and the forge coming up at dusk. Torch Light brightens the
  party's torch. Present.
- The clock runs at twice MM6's rate (section 22, inference).
- Weather is drifting cloud shadows everywhere and blowing sand in the
  desert (DESIGN 15.7). No snowfall; rain and a sandstorm are planned
  (PLAN 5b step 18).

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
  the game writes a text copy of it.

**Project:** None. **Status:** Missing. **Size:** S for the score screen;
the ending depends on the main quest. **Depends on:** the main quest
(section 27).

## 37. Decisions the owner has to make

These DESIGN decisions conflict with "a complete re-creation of MM6's
systems":

1. **Turn-based mode.** DESIGN 7 (2026-10-11): "Real-time only." MM6 has
   both. Keep the exclusion, or build it.
2. **The jump button.** DESIGN 7: "Jump is a spell, not a button." MM6 has
   both.
3. **Wading.** DESIGN 11.3 calls wading an MM6 rule; the sources show
   drowning, not wading.
4. **Controls.** DESIGN 7.1's touch scheme is a good phone adaptation, but
   it has no run, no looking up or down while walking and no fly controls.
5. **The world and story.** Rebuild MM6's Enroth (rights questions), or an
   original world with MM6's structure: 15 regions, a dozen towns, the same
   kinds of dungeons, a main quest of the same shape.
6. **Art.** Portraits, expressions, the paper doll, item icons, proprietor
   pictures, monster bodies (non-humanoids need DESIGN 10.2's procedural
   rigs), music. Each is a pipeline decision.
7. **Rules that sources do not fix.** Creation pool, condition penalties,
   Merchant and temple prices, training prices and caps, food per rest.
   Pick a source (for example the MM6 manual) or accept guesses.

## 38. Suggested order of work

Each step makes the existing game more like MM6 before adding breadth. The
sizes are the key above.

**Step 1. Make what exists correct (M).**
Fix the stat table (`stats.ts`). Fix the death threshold. Make bows shoot
with the bow's numbers. Put MM6's spell costs and Cure Disease's level in.
Make armour skills add AC at Normal, and the penalty go by Master. Add the
class factor to Body Building and Meditation, and 9 to Learning. Use the
monster to-hit formula with the monster's level. Add hit recovery with the
Endurance term. Give spells and item use a recovery. Move recovery to MM6's
units. Update DESIGN 14 and `src/game/README.md` with each change.

**Step 2. Close the RPG loop in the village (M).**
Add a training hall, a guild with membership and books as items, and one
Expert teacher, with MM6's prices and levels. Add buying a Normal skill.
Add the buff store, so Bless, the Protections, Meditation and Wizard Eye
work. Add the quick spell.

**Step 3. Add danger and its cure (M).**
Party death with respawn at the temple; Guardian Angel later. Falling
damage. Drowning instead of wading, with Water Walk. Lava. The three levels
of poison and disease, the cure windows, new-day effects and aging.

**Step 4. The shell (M).**
A title and game menu, New Game through creation, save slots and a load
screen, the party placed from the save, killed monsters and opened things
kept per map, player options. Put the game in the production build.

**Step 5. Items and loot (XL).**
Item instances with enchantment, strength and charges. MM6's catalogue.
Random generation by treasure level. Gold piles and loot from monsters.
Unidentified and broken items in play, the Identify and Repair skills,
the inspect pop-up. Potions and mixing. Wands.

**Step 6. Monsters (XL).**
MM6's monster record: two attacks with elements, a spell, a special attack,
resistances, AI type and fleeing, flying, groups, preferences, treasure.
Projectiles shared with spells. The special-attack formula. Then the
families, starting with non-humanoids through DESIGN 10.2.

**Step 7. Magic, school by school (XL).**
All 99 spells with MM6's effects, ranks and recovery. Light and Dark with
their gates. Area, chain and per-day spells. Resistances.

**Step 8. Dungeon mechanics (L).**
Doors, locks, keys, levers, plates, teleporters, secret doors, chests,
traps, Perception and Disarm Trap, and an event script format in the level
compiler. Wells, fountains, barrels and altars on the same mechanism.

**Step 9. People and travel (XL).**
Proprietor screens, street people with professions and news, hirelings and
reputation, Diplomacy, the bank, coaches and boats with weekly days, Town
Portal, Lloyd's Beacon, Fly and Jump.

**Step 10. The HUD and books (L, art XL).**
Minimap with compass and Wizard Eye, food and gold counters, hireling
windows, Autonotes, Calendar, Awards, quick reference, the paper doll,
portraits with expressions and voices.

**Step 11. Turn-based mode (L), if the owner wants it.**

**Step 12. Content (XL, the longest).**
Towns and dungeons at MM6's scale, promotions and their quests, side
quests, obelisks, shrines and altars, the Arena and the Circus, the main
quest, the ending and the score. Music by region.

Steps 1 to 4 need no new art. Steps 5 to 10 need icons, portraits and
creatures in parallel; start those pipelines early. Step 12 runs alongside
everything from step 8 on.

## 39. Sources

All public; read on 2026-10-17.

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
