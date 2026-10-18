# MM6's world: structure and cost

A blueprint of the world of Might and Magic VI (Enroth): its regions, towns, dungeons, quests
and services, and what each would cost this project to build. It is the evidence for decision 5
in `docs/MM6-GAPS.md` section 37: rebuild Enroth, or build an original world with the same
structure. Written 2026-10-18 against commit `e9ee563`.

## Contents

1. Enroth's structure (the grid, the regions, a sheet per region)
2. The dungeon catalogue
3. The quest graph
4. Services and their rules
5. Against this project (what exists, what each region costs, the original-world variant)
6. Recommended first slice (levels 1 to 10)
7. Corrections and additions to MM6-GAPS.md
8. Sources

## Scope and method

- Facts only: names, counts, numbers, gates and structure. No story prose.
- No game file was opened. Nothing downloaded is in the repository.
- Source tags (full list in section 8):
  - **MMW**: the Might and Magic Wiki, read as page source through its public API.
  - **JP**: J. Pike's MM6 walkthrough, version 2.0 (after Mark Marcelais), with a table per
    region.
  - **LR**: Lu Richardson's MM6 guide.
  - **DOB**: D. G. Dobrev's guide. The Cyberly FAQ cited in GAPS as CYB is a copy of it.
  - **MGW**: Magic Game World's guides. Its obelisk page copies DOB.
  - **MG**: Magic Grounds, an MM6 fan site (1998 to 2004).
  - **LP**: PurpleXVI's Let's Play, 22 updates.
  - **RPGC**: the RPG Classics shrine. Its places, quests and walkthrough pages return
    "file not found" (checked 2026-10-17).
  - **GAPS**: `docs/MM6-GAPS.md`.
- MMW's quest table cites JP's source, and the two often give the same numbers. Treat them as
  one family of sources, not two.
- "Unverified" marks what no source confirms. Where sources disagree, both values are given.
- "Est." marks this document's own estimate.
- Monster levels are MMW's. A level **band** runs from the lowest to the highest monster level
  in a place, bosses included. Families are written as tier 1/2/3 levels, for example
  goblin 4/6/10.
- Dungeon size: small (one to five rooms), medium (six to fifteen), large (sixteen to thirty),
  huge (more). MMW numbers the rooms of five dungeons; the others are classed from the sources'
  descriptions and marked est.
- Effort sizes, as in `docs/PLAN.md`: S hours, M a day or two, L several days, XL a week or more.
- Grid codes: column a (west) to e (east), row 1 (north) to 3 (south). The obelisk numbers
  follow the same order: a1 is obelisk 1, e3 is obelisk 15.
- Item tiers: shops stock items of level 1 to 5, written T1 to T5; "S2" means special stock of
  tier 2.

## Summary

### Counts

| What                                    | Count                                                         | Source         |
| --------------------------------------- | ------------------------------------------------------------- | -------------- |
| Outdoor regions                         | 15, on a 5 × 3 grid                                           | MMW, JP        |
| Neighbour edges                         | 22: 17 walked (5 days each), 5 across the sea                 | MMW, JP        |
| Settlements                             | 15, of which 10 have a training hall; plus 1 ruined village   | MMW            |
| Numbered places in the settlements      | 447, of which 234 are homes                                   | MMW map guides |
| Dungeons                                | 39, plus the Arena                                            | JP             |
| Lords' castles                          | 6, entered as house screens (unverified for all six)          | MMW, JP        |
| Quests in the quest log                 | 56: 17 main, 12 promotion, 27 side; plus the final Hive       | MMW            |
| Repeatable or hidden activities         | 6: Arena, Circus, bounties, obelisks, pilgrimages, collectors | MMW, JP        |
| Training halls                          | 10, capped at 15, 20, 30, 40, 50, 60, 80, 100, 200 and none   | MMW            |
| Expert and Master teachers              | 60 and 30: two Experts and one Master for each of 30 skills   | JP             |
| Shops                                   | 47: 14 weapon, 14 armour, 13 magic, 6 general                 | MMW            |
| Magic guild halls and skill guild halls | 22 (11 guilds, two halls each) and 11 (6 guilds)              | MMW            |
| Inns                                    | 21, of which 6 stand outside towns                            | MMW            |
| Temples                                 | 9 in towns, plus a Temple of Baa in 6 regions                 | MMW            |
| Banks                                   | 6                                                             | MMW            |
| Coach stables and ships                 | 9 stables in 8 towns; 11 ships                                | MMW            |
| Obelisks                                | 15, one per region                                            | all            |
| Monthly shrines                         | 12, plus the Shrine of the Gods                               | JP, MG         |
| Circus sites                            | 3                                                             | LP, MMW        |
| Statuette pedestals                     | 5                                                             | MMW            |
| Dragon towers                           | 7, of which 6 are active                                      | MMW            |
| Monster families                        | 52 of three tiers, plus 17 unique monsters                    | MMW            |

### Five findings

1. **A grid with a gradient.** The 15 maps form a 5 × 3 grid. Difficulty rises from east to
   west: the four maps round the start (New Sorpigal, Castle Ironfist, the Misty Islands,
   Bootleg Bay) hold monsters of levels 2 to 11, the centre column 2 to 37, the north-eastern
   corner 10 to 48, the six western maps 16 to 100. Thirteen maps are joined on foot; the Misty
   Islands and the Eel-infested Waters are reached by ship.
2. **Revisits are built in.** Each early region hides one or two late dungeons (Gharik's Forge
   in the start region, the Temple of the Sun's minotaur king in very easy Bootleg Bay, a
   level-80 dragon in the easy marsh). The training hall caps (15 to unlimited) are the real
   level gates.
3. **Travel is a timetable.** 9 stables and 11 ships run on fixed weekdays, 1 to 21 days a trip.
   The coaches make a star round Free Haven, the ships a loop in the eastern sea. The west has
   no transport at all.
4. **The main quest is a funnel with four gates.** Six lords' tasks in eight regions, then a
   traitor in a late temple, then four crystals in four strongholds, then a key from the
   largest dungeon, then the weapons that alone can finish the last one. The 12 promotion and
   27 side quests hang off the same towns and dungeons. Quest rewards total about 1.9 million
   experience.
5. **A few kits make 39 dungeons.** Four cult temples, two raider bases, two thief dens, two
   zealot forts, two dwarf sites, two monk temples, three crystal castles and two
   ancient-technology sites; 52 monster families cover them all. The first two dungeons are
   mostly animals (bats, spiders, snakes, rats), which the project's humanoid-first pipeline
   cannot yet make.

### What it means here

- The project has 2 generated regions, 1 village with 4 working houses and 1 showcase dungeon.
- MM6's content at full scale is about 210 working days (est., ±50 %), on top of the shared
  systems sized in GAPS. Section 5.2 has the region-by-region table.
- An original world can keep every count and gate of MM6 with neutral names (section 5.3).
- The recommended first slice is two regions, two towns, three medium dungeons and seven
  quests: MM6's own first loop, levels 1 to 10 (section 6).

## 1. Enroth's structure

### 1.1 The grid

```
          a (west)          b                c                    d                  e (east)
1 north   Sweet Water ----- Kriegspire ----- Frozen Highlands --- Silver Cove ~~~~~~ Eel-infested Waters
              |                 |                 |                   ~                   ~
2         Paradise Valley - Blackshire ----- Free Haven --------- Bootleg Bay ~~~~~~ Misty Islands
              |                 |                 |                   |                   ~
3 south   Hermit's Isle --- Dragonsand ----- Mire of the Damned - Castle Ironfist -- New Sorpigal

---  walked edge (5 days on foot)          ~~~ and ~  sea edge (ship only)
```

- Every pair of neighbours on the grid is joined: 22 edges (MMW, from each region's list of
  neighbours).
- 17 edges are walked. JP gives 5 days for every walked crossing. Hirelings shorten it (GAPS
  section 25).
- 5 edges cross the sea. JP lists no foot travel for them; the Misty Islands and the
  Eel-infested Waters have ships only. Whether Water Walk or Fly crosses a sea edge is
  unverified.
- Each map refills its monsters after a fixed time (MMW, JP): 6 months (New Sorpigal, the Mire,
  Dragonsand, Hermit's Isle, Paradise Valley), 8 months (Bootleg Bay, Kriegspire, the
  Eel-infested Waters, Sweet Water) or 2 years (the other six). The Hive refills every 7 days
  (JP).
- JP rates each map from "very easy" to "extremely hard"; the ratings fall from west to east,
  as the table below shows.

### 1.2 Regions at a glance

In the order a party meets them.

| Grid | Region              | Role                                                      | Monster families (tier levels)                                  | Band   | JP rating      | Trainer cap | Settlements           | Dungeons | Shrine                 |
| ---- | ------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | ------ | -------------- | ----------- | --------------------- | -------- | ---------------------- |
| e3   | New Sorpigal        | start; first town and first two dungeons                  | apprentice mage 2/6/10; goblin 4/6/10                           | 2–10   | easy           | 15          | New Sorpigal          | 3        | Luck (July)            |
| d3   | Castle Ironfist     | capital; regent and prince; 13 Experts                    | lizard man 4/7/11; follower of Baa 3/5/7; blood sucker 2/4/8    | 2–11   | very easy      | 200         | Ironfist              | 5        | Electricity (Sep)      |
| e2   | Misty Islands       | first sea trip; the sorcerers' lord; 4 Masters            | follower of Baa 3/5/7; cutpurse 3/5/7                           | 3–7    | very easy      | 30          | Mist                  | 1        | Intellect (Feb)        |
| d2   | Bootleg Bay         | islands; four temples; Wizard fountain; circus            | cannibal 6/8/10; lizard man 4/7/11                              | 4–11   | very easy      | 20          | Harecksburg           | 4        | Might (Jan)            |
| c2   | Free Haven          | centre; High Council, Oracle; all Adept guilds; coach hub | archer 9/19/29; apprentice mage 2/6/10                          | 2–29   | easy           | 60          | Free Haven, Rockham   | 6        | Accuracy (May)         |
| c3   | Mire of the Damned  | undead marsh; 4 Masters; circus                           | skeleton 6/10/14; ghost 9/13/19; harpy 14/17/19                 | 6–19   | easy           | none        | Darkmoor              | 3        | Speed (June)           |
| c1   | Frozen Highlands    | two lords; endless winter; 5 Masters                      | harpy 14/17/19; magyar 14/25/37; archer 9/19/29                 | 9–37   | medium         | 50          | White Cap, Hargraeve  | 2        | Endurance (Apr)        |
| d1   | Silver Cove         | the druids' lady; 6 Masters; ships north                  | stone gargoyle 16/22/33; druid 10/16/28                         | 10–33  | medium         | 40          | Silver Cove           | 3        | Personality (Mar)      |
| b2   | Blackshire          | werewolf moor; Light and Dark Adept guilds; circus        | wolfman 20/30/40; dust devil 16/22/33; fire lizard 40/50/60     | 16–60  | hard           | 100         | Blackshire            | 2        | Magic (Dec)            |
| b1   | Kriegspire          | volcano; five dungeons; the traitor's temple              | minotaur 39/59/79; rock beast 25/30/40; drake 24/28/32          | 24–79  | hard           | 80          | Kriegspire            | 5        | Fire (Aug), Cold (Oct) |
| e1   | Eel-infested Waters | open sea; a crystal castle; the Light Master              | Agar's pet 13/15/17; sea serpent 28/36/48; water beast 14/24/36 | 13–48  | medium         | none        | Alamos                | 1        | Poison (Nov)           |
| b3   | Dragonsand          | dragon desert; the colony ship; the obelisk treasure      | fire lizard 40/50/60; wyrm 50/60/70; red dragon 80/90/100       | 40–100 | extremely hard | none        | Abdul's Desert Resort | 2        | Shrine of the Gods     |
| a3   | Hermit's Isle       | far island; a crystal temple; Fountain of Youth           | hydra 45/55/65; titan 65/75/95; sea serpent 28/36/48            | 28–95  | extremely hard | none        | none                  | 1        | none                   |
| a2   | Paradise Valley     | uncapped trainer; Blaster and Dark Masters                | red dragon 80/90/100; hydra 45/55/65; titan 65/75/95            | 45–100 | extremely hard | no cap      | Edenbrook             | 0        | none                   |
| a1   | Sweet Water         | the party's ruined home; the Hive                         | devil spawn 20/40/60; devil captain 30/50/70                    | 20–70  | very hard      | none        | ruins only            | 1        | none                   |

- Monster families per region: MMW region pages. JP adds sea serpents to Paradise Valley.
- Trainer cap: the highest cap of a training hall in the region (MMW).
- Dungeon counts: JP's region tables. Bands of the dungeons are in section 2.

### 1.3 Region sheets

Settlements are detailed in section 4.1; dungeons in section 2. Travel prices are in gold.

#### e3 New Sorpigal (obelisk 15)

| Item             | Detail                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The start: the first town, the first two dungeons and one late dungeon on an island                                                                                                                                                                                                                                    |
| Settlement       | New Sorpigal (31 places)                                                                                                                                                                                                                                                                                               |
| Dungeons         | Goblinwatch (medium, 2–10); Abandoned Temple (medium est., 3–14); Gharik's Forge (large est., 13–50)                                                                                                                                                                                                                   |
| Shrine           | Luck, July                                                                                                                                                                                                                                                                                                             |
| Wells, fountains | A Luck well: +2 Luck for good, 8 uses, no gain past 15, refills when the party leaves the map (MMW; GAPS quotes a GOG thread giving 16). Temporary +5 hit points, +5 spell points, +10 Might                                                                                                                           |
| Other            | Obelisk 15 inside the volcano (needs Fly). A hidden teleporter on the Buccaneers' Lair roof to the Shrine of the Gods in Dragonsand (DOB, MMW). A cooking pot that spawns 20 mages and 20 goblin kings (MMW). Falagar's house. A dragon tower. Three Expert teachers outside town (Water on an island, Staff, Blaster) |
| Travel           | On foot west to Castle Ironfist. Coach to Castle Ironfist Mon, Wed, Fri, 2 days, 25. Ship _Odyssey_ to Mist Tue, Thu, Sat, 3 days, 100                                                                                                                                                                                 |

#### d3 Castle Ironfist (obelisk 12)

| Item             | Detail                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role             | The capital. Regent Wilbur Humphrey and Prince Nicolai in the castle; Archibald, turned to stone, in the King's Library on its roof. Five dungeons round the town                                                                                                                                                                                                                                            |
| Settlement       | Ironfist (34 places)                                                                                                                                                                                                                                                                                                                                                                                         |
| Dungeons         | Temple of Baa (medium, 2–25); Shadow Guild Hideout (medium, 8–22); Dragoons' Caverns (large, 8–35); Snergle's Caverns (medium est., 3–30); Corlagon's Estate (medium est., 6–40)                                                                                                                                                                                                                             |
| Shrine           | Electricity, September                                                                                                                                                                                                                                                                                                                                                                                       |
| Wells, fountains | Temporary +10 Speed and +10 Accuracy in town; +10 hit points in the region. The well north-west of the castle hides the Third Eye                                                                                                                                                                                                                                                                            |
| Other            | The Seer (pilgrimages and hints). An inn outside town. A sword in a stone (Might 40). Teleport platforms (the amphitheatre) link parts of the region; obelisk 12 is reached through one (DOB, LR). A Temple of Baa                                                                                                                                                                                           |
| Travel           | On foot to New Sorpigal (east), the Mire (west) and Bootleg Bay (north). Coach (50): New Sorpigal Mon, Wed, Fri, 2 days; Free Haven Tue, Sat, 4 days, once walked to; the Arena Sun, 1 day. Ship _Zephyr_ (100): Mist Mon, Wed, Fri, 2 days; New Sorpigal Tue, Thu, Sat, 2 days; Bootleg Bay east docks Tue, Fri, 3 days. Royal yacht (free): Hermit's Isle every day, 21 days, after the traitor is exposed |

#### e2 Misty Islands (obelisk 14)

| Item             | Detail                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role             | The first sea trip. Lord Albert Newton in Castle Newton (Sorcerer promotions, a council vote). Masters of Fire, Water, Air and Meditation                                |
| Settlement       | Mist (28 places)                                                                                                                                                         |
| Dungeon          | Silver Helm Outpost (medium est., 8–33)                                                                                                                                  |
| Shrine           | Intellect, February                                                                                                                                                      |
| Wells, fountains | Temporary +20 Luck and +10 spell points in town; temporary +10 Intellect and Personality and +5 elemental resistance in the region                                       |
| Other            | A teleporter behind Castle Newton to a chain of outer islands held by thieves, with obelisk 14 on the last one (MMW). A dragon tower                                     |
| Travel           | No walked exits. Ship _Adventure_ (250): Castle Ironfist Mon, Wed, Fri, 2 days; Silver Cove Mon, Thu, 3 days, once visited; Bootleg Bay east docks Tue, Thu, Sat, 2 days |

#### d2 Bootleg Bay (obelisk 11)

| Item             | Detail                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | A bay of islands and a mainland coast. Four temples, the Wizard fountain, the circus in December                                                                                                                                                                                    |
| Settlement       | Harecksburg (14 places), on the mainland                                                                                                                                                                                                                                            |
| Dungeons         | Temple of the Fist (small est., 2–27); Temple of Tsantsa (medium est., 5–14); Hall of the Fire Lord (medium to large est., 4–35); Temple of the Sun (medium est., 8–79, one boss)                                                                                                   |
| Shrine           | Might, January (north-west island)                                                                                                                                                                                                                                                  |
| Wells, fountains | The Fountain of Magic in Harecksburg (+20 spell points; the Wizard promotion). +2 Intellect and +2 Personality for good, each to 16. Temporary +20 Might. Two poisoned wells                                                                                                        |
| Other            | A circus site. The dragon pedestal. An inn on the islands. A Temple of Baa                                                                                                                                                                                                          |
| Travel           | On foot south to Castle Ironfist and west to Free Haven. Ship _Tsunami_ from the east to the west docks Mon, Wed, 1 day, 150. Ship _Valkyrie_ from the west docks to Castle Ironfist Tue, Thu, 4 days, 150. Ships from Ironfist and Mist land on the islands, not the mainland (LP) |

#### c2 Free Haven (obelisk 8)

| Item             | Detail                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The centre. The High Council, with the Oracle and the Control Center beneath it. The Adept guilds of all seven schools. Two coach stations and a ship. Lord Osric Temper's castle                                                                                                                                                                   |
| Settlements      | Free Haven (79 places); Rockham (8 places), a village on the north-west road                                                                                                                                                                                                                                                                        |
| Dungeons         | Temple of the Moon (medium, 5–45); Tomb of Ethric the Mad (medium est., 6–40); Dragoons' Keep (medium est., 2–35); Free Haven Sewers (large est., 2–25); Oracle (small, no monsters); Control Center (large est., 50–90)                                                                                                                            |
| Castle           | Castle Temper (Knight promotions, a council vote; the Master of Plate on its roof)                                                                                                                                                                                                                                                                  |
| Shrine           | Accuracy, May                                                                                                                                                                                                                                                                                                                                       |
| Wells, fountains | +2 Might for good and temporary +25 hit points in the city; a well in Rockham that releases monsters                                                                                                                                                                                                                                                |
| Other            | Temple Stone, in ruins until the Cleric quest repairs it. Collectors who buy circus prizes and loot. A Temple of Baa. A dragon tower                                                                                                                                                                                                                |
| Travel           | On foot to all four neighbours. Coach west (100): Silver Cove Mon, Thu, 4 days; Castle Ironfist Tue, Fri, 4 days; Darkmoor Wed, Sat, 5 days. Coach east (150): Blackshire Mon, Thu; Kriegspire Tue, Fri; White Cap Wed, Sat; 3 days each. Ship _Windrunner_ (300): Mist Mon, Thu, 4 days; Silver Cove Tue, Thu, 3 days; Castle Ironfist Wed, 5 days |

#### c3 Mire of the Damned (obelisk 9)

| Item             | Detail                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The undead marsh beside the capital. Four Masters in Darkmoor; the second Paladin promotion and one of the crystal strongholds            |
| Settlement       | Darkmoor (30 places; no temple, no training hall)                                                                                         |
| Dungeons         | Snergle's Iron Mines (medium est., 10–60); Dragon's Lair (small, 80); Castle Darkmoor (large est., 15–60)                                 |
| Shrine           | Speed, June                                                                                                                               |
| Wells, fountains | +2 Endurance for good, to 16                                                                                                              |
| Other            | A circus site. The wolf pedestal. An invisible bridge. Obelisk 9 at the centre, through a maze (LR). An inn outside town. A Temple of Baa |
| Travel           | On foot north to Free Haven, east to Castle Ironfist, west to Dragonsand. Coach from Darkmoor to Free Haven Mon, Fri, 5 days, 250         |

#### c1 Frozen Highlands (obelisk 7)

| Item             | Detail                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The north. Two lords (Stromgard; Stone, at Castle Stone in Hargraeve). The endless winter is a quest state. Five Masters                                                                        |
| Settlements      | White Cap (33 places); Hargraeve (18 places, round Castle Stone)                                                                                                                                |
| Dungeons         | Icewind Keep (medium est., 11–33); Shadow Guild (medium est., 3–25)                                                                                                                             |
| Castles          | Castle Stromgard (Archer promotions, a council vote; the Master of Diplomacy on top); Castle Stone (Cleric promotions, a council vote)                                                          |
| Shrine           | Endurance, April                                                                                                                                                                                |
| Wells, fountains | In White Cap: +5 Might or +5 Endurance for good, but the drinker dies. In the region: temporary +30 Might, +10 levels, +20 Accuracy and Speed, +20 armour class; two fountains release monsters |
| Other            | A house outside town with the Expert teachers of Bow and Mace. Watch towers. A dragon tower                                                                                                     |
| Travel           | On foot east to Silver Cove, south to Free Haven, west to Kriegspire. Coach from White Cap to Free Haven Mon, Thu, 3 days, 200                                                                  |

#### d1 Silver Cove (obelisk 10)

| Item             | Detail                                                                                                                                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The druid coast. Lady Loretta Fleise (Druid promotions, a council vote). Six Masters. The ships to the Eel-infested Waters                                                                                                                                                                    |
| Settlement       | Silver Cove (68 places)                                                                                                                                                                                                                                                                       |
| Dungeons         | The Monolith (medium est., 10–40); Warlord's Fortress (medium to large est., 8–80); Silver Helm Stronghold (medium est., 10–50)                                                                                                                                                               |
| Shrine           | Personality, March                                                                                                                                                                                                                                                                            |
| Wells, fountains | +2 Accuracy and +2 Speed for good; temporary +20 Personality and Intellect; +25 spell points; one fountain causes insanity                                                                                                                                                                    |
| Other            | The Circle of Stones on the White Rock Islands (the Great Druid promotion), with an inn where the Master of Staff lives. A sword in a stone (Might 60). A dragon tower                                                                                                                        |
| Travel           | On foot west to the Frozen Highlands only. Coach to Free Haven Mon, Fri, 4 days, 200. Ship _Cerulean Skies_ (300): Mist Mon, Thu, Sat, 3 days; Free Haven Tue, Fri, 3 days; the Eel north island Wed, 1 day. Ship _Barracuda_ from a northern island to the Eel south island Thu, 2 days, 200 |

#### b2 Blackshire (obelisk 5)

| Item             | Detail                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The werewolf moor. Lord Kilburn's shield (the regent's vote), the Light and Dark Adept guilds, three Masters, the circus in April                                                                                                                   |
| Settlement       | Blackshire (35 places)                                                                                                                                                                                                                              |
| Dungeons         | Lair of the Wolf (medium est., 10–50); Temple of the Snake (small, 35–100, on an island in a lake)                                                                                                                                                  |
| Shrine           | Magic, December                                                                                                                                                                                                                                     |
| Wells, fountains | Temporary +50 Luck; +50 spell points; +30 magic resistance that also turns the drinker to stone; +5 magic resistance for good with disease; +5 Intellect and Personality for good with disease (JP); in the region a disease fountain and a dry one |
| Other            | Lord Kilburn's shield in a chest mid-region, guarded by werewolves. A circus site. An expensive inn in the south. A Temple of Baa. A dragon tower                                                                                                   |
| Travel           | On foot to all four neighbours. Coach to Free Haven Tue, Fri, 3 days, 250                                                                                                                                                                           |

#### b1 Kriegspire (obelisk 4)

| Item             | Detail                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The volcano highlands. Five dungeons: the traitor's temple, the devils' outpost and a crystal castle among them. The hermit who causes the winter                                                                                                                      |
| Settlement       | Kriegspire (23 places)                                                                                                                                                                                                                                                 |
| Dungeons         | Castle Kriegspire (large, 13–85); Agar's Laboratory (medium est., 13–50); Caves of the Dragon Riders (large est., 40–80); Devil's Outpost (small, 20–60); Superior Temple of Baa (medium est., 8–50)                                                                   |
| Shrines          | Fire, August; Cold, October                                                                                                                                                                                                                                            |
| Wells, fountains | In town: a well that teleports into Castle Kriegspire; +30 levels for a while (it also releases energy drakes); 5,000 experience for 5,000 gold; one that eradicates. In the region: temporary +40 armour class; +5 elemental resistance for good but the drinker dies |
| Other            | The hermit's hut on a mountain (Fly, or a Wind Master hireling). The bear pedestal. The Master of Bow on the castle walls. A dragon tower that is already switched off                                                                                                 |
| Travel           | On foot east to the Frozen Highlands, south to Blackshire, west to Sweet Water. Coach to Free Haven Wed, Sat, 3 days, 250                                                                                                                                              |

#### e1 Eel-infested Waters (obelisk 13)

| Item             | Detail                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | Open sea with islands. A crystal castle. The Light Master, for a Saintly party                                                                                                                                                                 |
| Settlement       | Alamos (12 places), on the north island                                                                                                                                                                                                        |
| Dungeon          | Castle Alamos (large, 14–50)                                                                                                                                                                                                                   |
| Shrine           | Poison, November (south island)                                                                                                                                                                                                                |
| Wells, fountains | Temporary +20 elemental and +20 magic resistance; three skull piles that cause weakness or insanity                                                                                                                                            |
| Other            | The sword Excalibur in a stone (Might 200). An inn on the south island, with the Light Master behind it                                                                                                                                        |
| Travel           | Ships only. _Tigershark_ from Alamos to Silver Cove Mon, 2 days, 400. _Cirrus_ from the south island to Alamos Sat, 1 day, 200. From Silver Cove: _Cerulean Skies_ to the north island Wed, 1 day; _Barracuda_ to the south island Thu, 2 days |

#### b3 Dragonsand (obelisk 6)

| Item             | Detail                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role             | The dragon desert. The colony ship (the Tomb of VARN), the Shrine of the Gods and the obelisk treasure                                                                                 |
| Settlement       | Abdul's Desert Resort (12 places): traders who swap circus prizes for armour, weapons and jewellery, and gems for magic lamps; hirelings; the bird pedestal. No trainer, temple or inn |
| Dungeons         | Tomb of VARN (huge, 33–90); New World Computing (large, 6–10, secret)                                                                                                                  |
| Shrine           | The Shrine of the Gods: +20 to every statistic for good. Reachable early through the New Sorpigal roof teleporter (DOB)                                                                |
| Wells, fountains | +50 hit points; +10 elemental resistance for good, and +10 to every statistic for good, each of which eradicates the drinker                                                           |
| Other            | The obelisk treasure under a stone in the north-east. A one-way teleporter to New Sorpigal                                                                                             |
| Travel           | On foot north to Blackshire, west to Hermit's Isle, east to the Mire. No coach, no ship                                                                                                |

#### a3 Hermit's Isle (obelisk 3)

| Item     | Detail                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role     | The far island. One crystal temple and the Fountain of Youth                                                                                                                                                  |
| Dungeon  | Supreme Temple of Baa (medium to large est., 8–60)                                                                                                                                                            |
| Fountain | Removes magical aging                                                                                                                                                                                         |
| Travel   | On foot north to Paradise Valley and east to Dragonsand. The royal yacht from Castle Ironfist (21 days). A secret teleporter between the temple and the Free Haven Sewers, opened from the temple's side (JP) |

#### a2 Paradise Valley (obelisk 2)

| Item       | Detail                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| Role       | The late town: training without a cap, the Masters of Blaster and Dark Magic |
| Settlement | Edenbrook (22 places)                                                        |
| Dungeons   | None                                                                         |
| Fountain   | Temporary +100 hit and spell points                                          |
| Other      | A chest that only Telekinesis opens. A Temple of Baa                         |
| Travel     | On foot north to Sweet Water, south to Hermit's Isle, east to Blackshire     |

#### a1 Sweet Water (obelisk 1)

| Item             | Detail                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| Role             | The end: the party's ruined home village and the Hive                        |
| Settlement       | The destroyed village and inn of Sweet Water; no services                    |
| Dungeon          | The Hive (large est., 20–100)                                                |
| Wells, fountains | Two poisoned fountains and a poisoned well; temporary +50 to every statistic |
| Other            | The tiger pedestal                                                           |
| Travel           | On foot south to Paradise Valley and east to Kriegspire                      |

## 2. The dungeon catalogue

### 2.1 How to read it

- 39 dungeons by JP's region counts, plus the Arena. The lords' castles are houses, not
  dungeons, and are listed in 2.5.
- Band: MMW monster levels, bosses included. "Seen" gives a party level where a source states
  one.
- Size: MMW numbers the rooms of Goblinwatch (11), the Temple of Baa (11 and four corner
  caves), the Shadow Guild Hideout (9), Dragoons' Caverns (23) and the Temple of the Moon
  (8 areas). Other sizes are est. from the sources' descriptions.
- "Disarm Trap n": the skill the chests need (MMW).
- Three tables. Early: bands that top out at 35 or less. Middle: the promotion and side
  dungeons whose bands reach 40 to 80. Late: the dungeons behind the main quest's later gates
  and in the western regions. Within a table the order is roughly the order of play
  (section 3.6).

### 2.2 Early dungeons

| #   | Dungeon               | Region              | Monsters (tier levels)                                             | Band                      | Size                       | Holds                                                                                                  | Mechanics                                                                                                                                                                                                                                         |
| --- | --------------------- | ------------------- | ------------------------------------------------------------------ | ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Abandoned Temple      | New Sorpigal        | spider 5/8/12; cobra 5/10/14; bat 3/6/9; queen spider 12           | 3–14 (first dungeon, LP)  | medium est.                | the candelabra (−200 reputation); Angela (rescue); the queen's heart; cobra eggs to sell               | every family poisons or diseases; a teleporter back to the entrance                                                                                                                                                                               |
| 2   | Goblinwatch           | New Sorpigal        | goblin 4/6/10; rat 2/4/6; blood sucker 2/4/8                       | 2–10 (seen 5, LP)         | medium (11 rooms)          | the vault combination (Town Hall quest)                                                                | entered with a key from the Town Hall (DOB); six coded doors set from a clue on a scroll; switch-opened cells; a chest that spawns shamans when closed; a shaft to a lower level; Disarm Trap 1                                                   |
| 3   | Temple of Baa         | Castle Ironfist     | acolyte of Baa 8/15/25; skeleton 6/10/14; rat 2/4/6; spider 5/8/12 | 2–25 (seen about 10, LP)  | medium (11 rooms, 4 caves) | the Chime of Harmony; a temple gong for a collector; a hidden 5,000 gold; two treasure rooms           | doors that must be touched in order (a wrong try hurts); a chain of six keys; a fireball trap avoided by walking on the water troughs; hordes spawned by a chest and a secret door; resistance cauldrons and condition skull piles; Disarm Trap 4 |
| 4   | Shadow Guild Hideout  | Castle Ironfist     | thief 8/12/18; thug 8/14/22                                        | 8–22                      | medium (9 rooms)           | Sharry (rescue); a letter that is not yet proof; the cell key                                          | paired switches that toggle a wall; doors that open from one side; a cell whose fireball trap cannot be avoided; stat barrels; Disarm Trap 4                                                                                                      |
| 5   | Dragoons' Caverns     | Castle Ironfist     | ooze 12/18/25; thug 8/14/22; fighter 14/24/35                      | 8–35 (upper part 10+, MG) | large (23 rooms)           | Andrew's harp; the Shadow Guild letter (evidence quest); a painting that gives +10 Luck                | switches open unseen doors; two lifts; decoy chests that teleport the party into a sewer; a water area; three bridges; Disarm Trap 4                                                                                                              |
| 6   | Silver Helm Outpost   | Misty Islands       | swordsman 10/17/24; guard 11/19/33; monk 8/16/27                   | 8–33                      | medium est.                | Melody Silver (Crusader); the enemies list (Mist's mayor); the key to Gharik's Forge                   | a wall that opens after a prisoner's hint; a lever that raises steps for a short time; rising platforms; a mural that teleports back down                                                                                                         |
| 7   | Temple of the Fist    | Bootleg Bay         | monk 8/16/27; rat 2/4/6                                            | 2–27                      | small est. (LR)            | a crystal to destroy (side quest)                                                                      | a hidden switch behind barrels opens the sanctum                                                                                                                                                                                                  |
| 8   | Temple of Tsantsa     | Bootleg Bay         | cannibal 6/8/10; cobra 5/10/14                                     | 5–14                      | medium est.                | Sherell (rescue); bones for a collector                                                                | three traps, each switched off at its own switch; levers in sequence; a prison opened with a key                                                                                                                                                  |
| 9   | Hall of the Fire Lord | Bootleg Bay         | goblin 4/6/10; ogre 15/20/28; fallen defender 35                   | 4–35                      | medium to large est.       | the Fire Lord's errand; a crystal skull that later shields from the Tomb of VARN's radiation; amber    | warded doors opened with amber; holes that drop to lower floors; stone faces that teleport back to the start; a boss carries the chest key                                                                                                        |
| 10  | Snergle's Caverns     | Castle Ironfist     | dwarf 10/20/30; bat 3/6/9; Snergle 27                              | 3–30                      | medium est.                | Snergle's axe (Master Axe quest); bones that give +5 Might, +5 magic and +5 poison resistance for good | entered by a teleporter (DOB); walls that pay gold or cave in; the inner door needs a key from Snergle's Iron Mines; twenty-odd dwarves ambush when it opens                                                                                      |
| 11  | Shadow Guild          | Frozen Highlands    | thief 8/12/18; cutpurse 3/5/7; lesser genie 25; rogue leader 25    | 3–25                      | medium est.                | a letter on the trail of the Prince of Thieves                                                         | a trap room of teleporting floor tiles; four riddle doors answered by typing; doors opened by pushing                                                                                                                                             |
| 12  | Free Haven Sewers     | Free Haven          | rat 2/4/6; acolyte of Baa 8/15/25; thief 8/12/18                   | 2–25                      | large est.                 | the Prince of Thieves (Stone's vote); a treasure room                                                  | entrances in several houses; grates that hide gold and a randomly placed key; monsters inside the walls; a secret teleporter to the Supreme Temple of Baa                                                                                         |
| 13  | Icewind Keep          | Frozen Highlands    | ogre 15/20/28; guard 11/19/33                                      | 11–33                     | medium est.                | the Dragon Tower keys (Battle Mage)                                                                    | two levers open the main hall; a lever on a throne's arm opens a secret room                                                                                                                                                                      |
| 14  | Dragoons' Keep        | Free Haven          | rat 2/4/6; fighter 14/24/35                                        | 2–35                      | medium est.                | the artifact Mordred (30,000 gold, and the party keeps it)                                             | levers far from their doors; a room that locks and sends waves of rats and fighters                                                                                                                                                               |
| 15  | New World Computing   | Dragonsand (secret) | goblin shaman 6; goblin king 10                                    | 6–10                      | large (DOB)                | gold, potions, endless food, a desk with a party-wide boost (JP)                                       | entered from inside the Shrine of the Gods; no traps; the developers as inhabitants                                                                                                                                                               |

### 2.3 Middle dungeons

| #   | Dungeon                | Region             | Monsters (tier levels)                                                          | Band            | Size                 | Holds                                                                                         | Mechanics                                                                                                                                                                                                                                                                 |
| --- | ---------------------- | ------------------ | ------------------------------------------------------------------------------- | --------------- | -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | Temple of the Moon     | Free Haven         | cobra 5/10/14; medusa 35/40/45; druid 10/16/28                                  | 5–45            | medium (8 areas)     | six altars that give every character +5 to six statistics; the Altar of the Moon (Arch Druid) | the altars must be used in the order a plaque gives to open the inner door; medusas turn characters to stone; a switch behind one altar                                                                                                                                   |
| 17  | Tomb of Ethric the Mad | Free Haven         | skeleton 6/10/14; ghost 9/13/19; lich 20/30/40; Ethric                          | 6–40            | medium est.          | Ethric's skull (7,500 gold); a wand                                                           | lifts; skull switches; a room crossed by fireballs (timing); burial niches that cause disease                                                                                                                                                                             |
| 18  | Corlagon's Estate      | Castle Ironfist    | ghost 9/13/19; skeleton 6/10/14; power lich 40                                  | 6–40            | medium est.          | the Crystal of Terrax (Archmage)                                                              | entered through a portal (DOB); skull switches open walls; a boss room                                                                                                                                                                                                    |
| 19  | Temple of the Sun      | Bootleg Bay        | monk 8/16/27; minotaur king 79                                                  | 8–79            | medium est.          | the Sacred Chalice (High Priest)                                                              | hidden doors in the main hall                                                                                                                                                                                                                                             |
| 20  | Snergle's Iron Mines   | Mire of the Damned | dwarf 10/20/30; ooze 12/18/25; devil spawn 20/40/60                             | 10–60 (25+, MG) | medium est.          | the key to Snergle's chamber (from a prisoner); a room of spellbooks                          | troughs that restore points; cabinets opened from the side; cells opened with a key                                                                                                                                                                                       |
| 21  | Dragon's Lair          | Mire of the Damned | Longfang Witherhide 80                                                          | 80 (30+, MG)    | small (one room, LR) | the dragon's claw (Hero)                                                                      | a single boss                                                                                                                                                                                                                                                             |
| 22  | The Monolith           | Silver Cove        | druid 10/16/28; rock beast 25/30/40; water beast 14/24/36                       | 10–40           | medium est.          | deface the altar: +5 Personality for good to Clerics and Druids, 3,000 gold                   | standing stones that open and close doors; a pool that opens a door; gold hidden in rocks and trees                                                                                                                                                                       |
| 23  | Silver Helm Stronghold | Silver Cove        | swordsman 10/17/24; fighter 14/24/35; sorcerer 25/35/50 (JP); Gerrard Blackames | 10–50           | medium est.          | the ankh (a side quest through Fleise and Stone)                                              | a ghost who answers to the Crusader quest                                                                                                                                                                                                                                 |
| 24  | Warlord's Fortress     | Silver Cove        | thug 8/14/22; fighter 14/24/35; death knight 40/40/80                           | 8–80            | medium to large est. | the discharge papers (Champion); a storage room                                               | two storage keys                                                                                                                                                                                                                                                          |
| 25  | Lair of the Wolf       | Blackshire         | wolfman 20/30/40; ooze 12/18/25; swordsman 10/17/24; werewolf leader 50         | 10–50           | medium est.          | the Pearl of Purity (lifts the curse); the Pearl of Putrescence (from the leader)             | a ghost's errand; a pearl used on an altar opens a wall; stairs that teleport; zones that respawn monsters when crossed                                                                                                                                                   |
| 26  | Devil's Outpost        | Kriegspire         | devil spawn 20/40/60; Devil of Baa 60                                           | 20–60           | small (one room, LR) | the devils' plans (Temper's vote)                                                             | a single fight                                                                                                                                                                                                                                                            |
| 27  | Castle Darkmoor        | Mire of the Damned | ogre 15/20/28; lich 20/30/40; eye 30/40/50; lich king 60                        | 15–60           | large est.           | memory crystal Delta; the Book of Liches (side quest)                                         | a plaque that reveals a lever; hanging cubes that act as switches and change colour; a cube that teleports; an invisible barrier lowered by a switch; secret doors; eyes that dispel buffs and cause insanity and fear; each robbed sarcophagus costs 200 reputation (JP) |

### 2.4 Late dungeons

| #   | Dungeon                    | Region                         | Monsters (tier levels)                                                                     | Band                                 | Size                       | Holds                                                                                        | Mechanics                                                                                                                                                                                                                                                  |
| --- | -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 28  | Superior Temple of Baa     | Kriegspire                     | acolyte of Baa 8/15/25; sorcerer 25/35/50; druid 10/16/28                                  | 8–50 (seen 50+, LP)                  | medium est.                | the letter that exposes the traitor                                                          | entry needs the Cloak of Baa; doors shock a party without Expert Perception; the chest needs two keys carried by priests; a spiral loop under falling sparks; an optional rite (+50,000 experience, −976 reputation, JP)                                   |
| 29  | Gharik's Forge             | New Sorpigal (island)          | fire beast 13/26/39; sorcerer 25/35/50                                                     | 13–50                                | large est.                 | the Hourglass of Time (Newton's vote)                                                        | on an island (Water Walk); locked until the key from the Silver Helm Outpost; a lava pool with a switch that lifts the party out; doors that only levers open; a sliding bridge set by levers on two floors; a lift; a secret room                         |
| 30  | Castle Kriegspire          | Kriegspire                     | minotaur 39/59/79; Agar's pet 13/15/17; drake 24/28/32; Lurch 85                           | 13–85                                | large                      | memory crystal Epsilon; the jewelled egg (side quest)                                        | entered by a well in the village or by the crater road; four round rooms crossed on narrow ledges to a switch on a pillar (or 50,000 gold to be put there); a healer at 10,000 gold and −976 reputation (JP); an exit through a puddle                     |
| 31  | Agar's Laboratory          | Kriegspire                     | eye 30/40/50; Agar's pet 13/15/17; Agar                                                    | 13–50                                | medium est. (8 points, MG) | Agar's journal                                                                               | switches that release eyes; two switches open a lift to a lower floor                                                                                                                                                                                      |
| 32  | Caves of the Dragon Riders | Kriegspire                     | wyrm 50/60/70; death knight 40/40/80                                                       | 40–80 (about 60, MG)                 | large est.                 | loot only                                                                                    | steep, winding caves                                                                                                                                                                                                                                       |
| 33  | Castle Alamos              | Eel-infested Waters            | magyar 14/25/37; sorcerer 25/35/50; dust devil 16/22/33                                    | 14–50                                | large (LR)                 | memory crystal Beta                                                                          | five trees outside give the clues to a five-letter password; a teleporter key and a teleporter room; a treasure room key; a lift to a guarded walkway above cages; a pool that releases monsters                                                           |
| 34  | Temple of the Snake        | Blackshire (island)            | medusa 35/40/45; gold dragon 100; Q 100 (16,000 hit points)                                | 35–100                               | small (MG)                 | Emmanuel (rescue); the Horn of Ros (from Q); chests of wands and books                       | reached by Water Walk or Fly; a pit under the dragon with a hidden button; peasants inside; stoning                                                                                                                                                        |
| 35  | Supreme Temple of Baa      | Hermit's Isle                  | acolyte of Baa 8/15/25; devil spawn 20/40/60; fire beast 13/26/39; Slicker Silvertongue 25 | 8–60                                 | medium to large est.       | memory crystal Alpha                                                                         | floors down to a magma level; bridges over a pit set by switches at the doors; an altar sequence (+10 elemental resistance for one character); a teleporter to the Free Haven Sewers                                                                       |
| 36  | Tomb of VARN               | Dragonsand                     | genie 33/44/55; defender of VARN 35/55/65; patrol unit 50; enforcer unit 70                | 33–70 (JP adds terminator units, 90) | huge (the largest, MMW)    | the Control Cube (500,000 experience)                                                        | radiation from the core, stopped by cleansing pools or absorbed by a crystal skull; six officers' codes found on scrolls and typed at five pools and a well; five keys; monsters that regenerate; holes to drop through                                    |
| 37  | Oracle                     | Free Haven (under the council) | none                                                                                       | none                                 | small                      | four altars for the memory crystals (100,000 experience each)                                | a power panel and a door panel; open only after all six votes and the traitor                                                                                                                                                                              |
| 38  | Control Center             | Free Haven (under the Oracle)  | patrol unit 50; enforcer unit 70; terminator unit 90                                       | 50–90 (about 75 to 81, LP)           | large est.                 | the Blaster skill (read at a terminal); 8 blasters and 4 blaster rifles; a hidden joke award | needs the Control Cube; terminator units eradicate                                                                                                                                                                                                         |
| 39  | The Hive                   | Sweet Water                    | devil spawn 20/40/60; devil captain 30/50/70; demon queen 100; reactor 100                 | 20–100                               | large est.                 | the end of the game                                                                          | spells blocked in places (LR); no Lloyd's Beacon (MG); pits that each hold a key or a switch; only blasters hurt the reactor; its death strips buffs, heals, teleports the party and spawns monsters; the queen blocks the exit; refills every 7 days (JP) |
| 40  | Arena                      | by coach from Ironfist         | scaled to the party's level                                                                | follows the party                    | small                      | gold; Page, Squire, Knight and Lord victories                                                | one fight per visit; one visit a week (Sunday coach)                                                                                                                                                                                                       |

### 2.5 Castles and special places that are not dungeons

| Place               | Where                                                                                          | What it does                                                                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Castle Ironfist     | Ironfist (d3)                                                                                  | Regent Wilbur Humphrey: Paladin promotions, a council vote, the traitor quests. Prince Nicolai: runs off to the circus; later the Third Eye. The castle is shut while the prince is missing. The King's Library with Archibald on the roof |
| Castle Temper       | Free Haven region (c2)                                                                         | Lord Osric Temper: Knight promotions, a council vote. The Master of Plate on the roof                                                                                                                                                      |
| Castle Newton       | Misty Islands (e2)                                                                             | Lord Albert Newton: Sorcerer promotions, a council vote                                                                                                                                                                                    |
| Castle Stone        | Hargraeve (c1)                                                                                 | Lord Anthony Stone: Cleric promotions, a council vote. The Masters of Dagger and Leather beside it                                                                                                                                         |
| Castle Stromgard    | Frozen Highlands (c1)                                                                          | Lord Erik Von Stromgard: Archer promotions, a council vote. The Master of Diplomacy on top                                                                                                                                                 |
| Castle Fleise       | Silver Cove (d1)                                                                               | Lady Loretta Fleise: Druid promotions, a council vote                                                                                                                                                                                      |
| High Council        | Free Haven                                                                                     | Six representatives, one per lord; the door to the Oracle                                                                                                                                                                                  |
| The Seer            | Castle Ironfist region                                                                         | Names the month's pilgrimage; gives the next main-quest hint (JP)                                                                                                                                                                          |
| The hermit's hut    | Kriegspire, on a mountain                                                                      | Ends the winter (Stromgard's vote)                                                                                                                                                                                                         |
| Circle of Stones    | Silver Cove, White Rock Islands                                                                | Great Druid on an equinox or solstice                                                                                                                                                                                                      |
| Shrine of the Gods  | Dragonsand                                                                                     | +20 to every statistic for good; hides the New World Computing dungeon                                                                                                                                                                     |
| Obelisks            | one per region                                                                                 | 15 fragments of one message; the treasure in Dragonsand                                                                                                                                                                                    |
| Dragon towers       | New Sorpigal, Mist, Free Haven, White Cap, Silver Cove, Blackshire; Kriegspire's is off        | Fire at a flying party; resetting the six makes Warrior Mages                                                                                                                                                                              |
| Statuette pedestals | Sweet Water, Kriegspire, Dragonsand, the Mire, Bootleg Bay                                     | Twillen's side quest                                                                                                                                                                                                                       |
| Circus              | Bootleg Bay, the Mire, Blackshire                                                              | Prince Nicolai; stat games for prizes (section 3.4)                                                                                                                                                                                        |
| Swords in stones    | Castle Ironfist (Might 40), Silver Cove (Might 60), Eel-infested Waters (Excalibur, Might 200) | A weapon for a strong enough character (MMW, DOB)                                                                                                                                                                                          |

### 2.6 Patterns worth copying

- **Kits.** Four cult temples of one god (the Abandoned Temple, the Temple of Baa, the Superior
  and the Supreme Temple). Two raider bases (Dragoons' Caverns and Keep). Two thief dens (the
  Shadow Guild and its Hideout) and a sewer. Two zealot forts (Silver Helm Outpost and
  Stronghold). Two dwarf sites (Snergle's Caverns and Iron Mines). Two monk temples (the Fist
  and the Sun). Two undead sites (Corlagon's Estate, Ethric's tomb). Two ancient-technology
  sites (the Tomb of VARN, the Control Center). Three of the four memory crystals lie in
  castles.
- **Late dungeons in early regions.** Gharik's Forge (13–50) in the start region; Corlagon's
  power lich (40) near the capital; the minotaur king (79) in very easy Bootleg Bay; a level-80
  dragon and Castle Darkmoor in the easy Mire. A party returns to each region.
- **Dungeons chained across regions.** A key or item from one opens another: the Silver Helm
  Outpost's key opens Gharik's Forge; the Iron Mines' key opens Snergle's chamber; the Hall of
  the Fire Lord's crystal skull eases the Tomb of VARN; the Superior Temple's letter opens the
  Oracle.
- **Gates inside dungeons.** Keys in chests or on monsters; levers and switches; puzzles with
  an order (doors, altars, codes, a password); timed steps; Perception checks; an item that
  must be worn (the Cloak of Baa); hazards (lava, radiation, deep water); spawn triggers.

## 3. The quest graph

Rewards are from MMW's quest table and JP; "exp" is experience, "rep" reputation. Whether quest
experience goes to each character in full is unverified.

### 3.1 The main quest

| Step | Milestone                                                         | Gate                                                                                                                     | Where                                                                                              | Reward                                                         |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | Show Sulman's letter to Andover Potbello (logged as a side quest) | the game's start                                                                                                         | New Sorpigal inn                                                                                   | 1,000 gold                                                     |
| 2    | Bring the letter to Regent Wilbur Humphrey                        | none                                                                                                                     | Castle Ironfist                                                                                    | 5,000 gold, 3,000 exp                                          |
| 2a   | Find and return Prince Nicolai                                    | he leaves with the party and slips away at the next rest; the castle stays shut until he is back (JP, DOB, LR)           | the circus, whichever site is open (section 3.4)                                                   | 7,500 exp                                                      |
| 3    | Win the six council votes, in any order                           | none                                                                                                                     | rows 3.1 to 3.6                                                                                    |                                                                |
| 3.1  | Humphrey: Lord Kilburn's shield                                   | werewolves guard the chest                                                                                               | mid-Blackshire                                                                                     | 40,000 exp, 5,000 gold, +200 rep                               |
| 3.2  | Newton: the Hourglass of Time                                     | the key from the Silver Helm Outpost; Water Walk to the island                                                           | Gharik's Forge                                                                                     | 50,000 exp, +200 rep                                           |
| 3.3  | Temper: the devils' plans                                         | none                                                                                                                     | Devil's Outpost, Kriegspire                                                                        | 40,000 exp, +200 rep                                           |
| 3.4  | Fleise: fix the prices at all nine stables                        | reach eight towns                                                                                                        | New Sorpigal, Ironfist, Free Haven (two), Silver Cove, Blackshire, White Cap, Kriegspire, Darkmoor | 25,000 exp; 5,000 gold (JP), or 5,000 or 25,000 by speed (DOB) |
| 3.5  | Stone: capture the Prince of Thieves                              | he flees the Dragoons' Caverns, the Shadow Guild Hideout and the Shadow Guild before he can be caught in the sewers (JP) | Free Haven Sewers                                                                                  | 30,000 exp, 10,000 gold, +200 rep                              |
| 3.6  | Stromgard: end the winter                                         | Fly, or a Wind Master hireling                                                                                           | the hermit, Kriegspire                                                                             | 50,000 exp, +200 rep                                           |
| 4    | Find out why Humphrey's representative refuses                    | the other five votes                                                                                                     | the Cloak of Baa from Humphrey, then the Superior Temple of Baa (Expert Perception, two keys)      | none                                                           |
| 5    | Expose Slicker Silvertongue                                       | the letter from the temple                                                                                               | High Council, Free Haven                                                                           | +800 rep; the Oracle opens; the royal yacht sails              |
| 6    | Restore the four memory crystals, in any order                    | the Oracle                                                                                                               | Supreme Temple of Baa (Hermit's Isle), Castle Alamos, Castle Darkmoor, Castle Kriegspire           | 100,000 exp each                                               |
| 7    | Bring the Control Cube                                            | the four crystals                                                                                                        | Tomb of VARN                                                                                       | 500,000 exp                                                    |
| 8    | Learn Blaster and take the blasters                               | the cube                                                                                                                 | Control Center                                                                                     | the skill, 8 blasters, 4 rifles                                |
| 9    | Free Archibald                                                    | the Oracle's task; the Third Eye from a well for Nicolai, who gives Tanir's Bell                                         | King's Library, Castle Ironfist                                                                    | the Ritual of the Void; 50,000 exp; −928 rep (JP)              |
| 10   | Destroy the reactor and the Demon Queen                           | blasters; the Ritual for the good ending                                                                                 | The Hive, Sweet Water                                                                              | the ending (3.5)                                               |

- The Oracle opens only after all of steps 3.1 to 3.6 and step 5 (JP).
- The Oracle gives its tasks in the order of steps 6 to 10 (MGW, JP's Seer hints). Whether
  Archibald can be freed before the cube is unverified.
- Hermit's Isle can also be reached on foot through Paradise Valley or Dragonsand, before the
  yacht sails.

### 3.2 The twelve promotion quests

| Class line                          | First step: task (place)                                                                              | Reward                                 | Second step: task (place)                                                                    | Reward     | Given by  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- | --------- |
| Knight → Cavalier → Champion        | a nomination from Chadwick Blackpoole (the inn in Rockham)                                            | 15,000 exp                             | the discharge papers (Warlord's Fortress, Silver Cove)                                       | 40,000 exp | Temper    |
| Paladin → Crusader → Hero           | rescue Melody Silver (Silver Helm Outpost, Misty Islands)                                             | 15,000 exp; 5,000 gold (MMW, JP: none) | Longfang Witherhide's claw (Dragon's Lair, the Mire)                                         | 30,000 exp | Humphrey  |
| Archer → Battle Mage → Warrior Mage | the Dragon Tower keys (Icewind Keep, Frozen Highlands)                                                | 15,000 exp                             | reset six dragon towers (New Sorpigal, Mist, Free Haven, Silver Cove, White Cap, Blackshire) | 40,000 exp | Stromgard |
| Sorcerer → Wizard → Archmage        | drink from the Fountain of Magic (Harecksburg, Bootleg Bay)                                           | 15,000 exp                             | the Crystal of Terrax (Corlagon's Estate, Castle Ironfist)                                   | 30,000 exp | Newton    |
| Cleric → Priest → High Priest       | hire a stonecutter and a carpenter in Free Haven and bring them to Temple Stone                       | 15,000 exp                             | the Sacred Chalice (Temple of the Sun, Bootleg Bay), returned to Temple Stone                | 30,000 exp | Stone     |
| Druid → Great Druid → Arch Druid    | pray at the Circle of Stones on an equinox or solstice (20 March, 21 June, 23 September, 21 December) | 15,000 exp                             | pray at the Altar of the Moon at midnight under a full moon (Temple of the Moon)             | 40,000 exp | Fleise    |

- Characters of other classes get an "honorary" promotion and the experience (JP, LP). The LP
  reports that an honorary rank also satisfies a Master gate (the Spirit Master).
- Promotions gate Masters: Sword and Spear need Cavalier, Bow Battle Mage, Chain Crusader,
  Plate Hero, Air Archmage, Spirit High Priest (GAPS section 5, JP).
- Doing the Druid's second step before the first breaks the promotion (DOB).
- The GAPS doubt on the Archer steps is settled: the keys give Battle Mage, the towers Warrior
  Mage (MMW, JP).
- Repairing Temple Stone and returning the chalice also make it the one temple that cures
  eradication (MMW, LR).

### 3.3 Side quests (27)

| Giver's town | Quest                                            | Place                                        | Reward                                                        |
| ------------ | ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| New Sorpigal | Show Sulman's letter to Andover Potbello         | the inn                                      | 1,000 gold                                                    |
| New Sorpigal | Retrieve the candelabra                          | Abandoned Temple                             | 2,000 exp, 1,000 gold, −200 rep                               |
| New Sorpigal | Rescue Angela                                    | Abandoned Temple                             | 1,000 exp, 590 gold (MMW) or 500 gold and 10 food (JP)        |
| New Sorpigal | Kill the queen of the spiders                    | Abandoned Temple                             | 3,000 exp, 1,000 gold                                         |
| New Sorpigal | Find the Goblinwatch combination                 | Goblinwatch                                  | 2,000 exp, 2,000 gold, +50 rep                                |
| New Sorpigal | Rescue Sharry                                    | Shadow Guild Hideout                         | 10,000 exp, 2,000 gold                                        |
| New Sorpigal | Find evidence against the Shadow Guild           | Dragoons' Caverns                            | 5,000 exp, 5,000 gold, +50 rep                                |
| New Sorpigal | Get the Chime of Harmony                         | Temple of Baa                                | 10,000 exp, 5,000 gold, +50 rep                               |
| Ironfist     | Retrieve Andrew's harp                           | Dragoons' Caverns                            | 10,000 exp, 5,000 gold, +50 rep                               |
| Mist         | Storm the Silver Helm Outpost (the enemies list) | Silver Helm Outpost                          | 15,000 exp, 3,000 gold, +50 rep                               |
| Mist         | Clear the thieves from the northern islands      | the outer islands                            | none; not in the log                                          |
| Harecksburg  | Destroy the crystal                              | Temple of the Fist                           | 10,000 exp, 3,000 gold, +50 rep                               |
| Bootleg Bay  | Unward the doors for the Fire Lord               | Hall of the Fire Lord                        | 10,000 exp                                                    |
| Free Haven   | Ethric's skull                                   | Tomb of Ethric the Mad                       | 15,000 exp, 7,500 gold                                        |
| Free Haven   | The lost artifact (Mordred)                      | Dragoons' Keep                               | 10,000 exp, 30,000 gold, +100 rep                             |
| Free Haven   | Rescue Sherell from the cannibals                | Temple of Tsantsa                            | 10,000 exp, 1,500 gold                                        |
| Silver Cove  | Deface the Monolith's altar                      | The Monolith                                 | 15,000 exp, 3,000 gold, +50 rep                               |
| Silver Cove  | The ankh, for John Silver's ghost                | Silver Helm Stronghold                       | 10,000 exp, 5,000 gold                                        |
| Blackshire   | Rescue Emmanuel                                  | Temple of the Snake                          | 20,000 exp and 5,000 gold (MMW); 25,000 exp and 500 gold (JP) |
| Blackshire   | Destroy the werewolves' altar                    | Lair of the Wolf                             | 20,000 exp, 4,000 gold, +100 rep                              |
| Blackshire   | Place five statuettes                            | the five pedestals                           | 75,000 exp, a chest of items                                  |
| Blackshire   | Deliver the Pearl of Purity to Humphrey          | Lair of the Wolf, then Castle Ironfist       | 10,000 exp                                                    |
| Blackshire   | The Pearl of Putrescence                         | Lair of the Wolf (the werewolf leader)       | 5,000 exp                                                     |
| Kriegspire   | The jewelled egg                                 | Castle Kriegspire                            | 50,000 exp, 5,000 gold, +100 rep                              |
| Kriegspire   | Become a follower of Baa                         | Superior Temple of Baa                       | 50,000 exp, −976 rep                                          |
| Darkmoor     | Destroy the Book of Liches                       | Castle Darkmoor                              | 50,000 exp, 5,000 gold, +100 rep                              |
| Darkmoor     | Kill Snergle                                     | Snergle's Iron Mines, then Snergle's Caverns | 20,000 exp, +100 rep; Master Axe opens                        |

Shapes, for a world of the same structure: fetch an item (11), rescue a person (4), destroy or
deface something (4), kill a named monster for a part (2), use or place objects (2), deliver
or show (2), clear an area (1), join a cult (1).

### 3.4 Repeatable and hidden activities

- **Arena.** By coach from Ironfist on Sundays (1 day, 50 gold). One fight per visit, at
  Page, Squire, Knight or Lord level; the opponents scale with the party's level; gold as the
  prize; victories count in the awards (MMW, JP).
- **Circus.** Three sites, one month each: Blackshire round April, the Mire round August,
  Bootleg Bay round December (LP, DOB; MMW gives 28 March to 27 April, 28 July to 27 August,
  28 November to 27 December). JP gives four-month windows instead (Bootleg Bay December to
  March, Blackshire April to July, the Mire August to November). Six or seven small tents
  (JP 6, LP 7) each test one statistic for 50 gold and pay in prizes: lodestone (1 point),
  harpy feather (3), four-leaf clover (5). The main tent trades points for a keg of wine (10)
  or a golden pyramid (30) (JP). Collectors in Free Haven and Rockham buy prizes; the traders in
  Dragonsand swap them for top items.
- **Bounties.** Three town halls (New Sorpigal, Mist, Silver Cove). Each names one random
  monster a month; killing it pays gold and reputation (MMW, JP).
- **Pilgrimages.** The Seer names the month's shrine. Praying there in that month gives the
  party +10 to the shrine's statistic or resistance the first time and +3 after (JP, MG); a
  shrine then waits a year (MG). Months: January Might (Bootleg Bay), February Intellect
  (Misty Islands), March Personality (Silver Cove), April Endurance (Frozen Highlands), May
  Accuracy (Free Haven), June Speed (the Mire), July Luck (New Sorpigal), August Fire
  (Kriegspire), September Electricity (Castle Ironfist), October Cold (Kriegspire), November
  Poison (Eel-infested Waters), December Magic (Blackshire).
- **Obelisk treasure.** Touch all 15 obelisks, in any order; the fragments are kept. The
  treasure opens only after all 15 (MMW). It lies under a stone in north-east Dragonsand:
  250,000 gold, the books Divine Intervention and Dark Containment (the eleventh Light and Dark
  spells; the guilds sell only ten), and the artifacts Guinevere, Morgan and Igraine (DOB, JP).
  JP reports that reopening the chest pays the gold again (a bug).
- **Collectors.** People in Free Haven and Rockham buy kegs of wine, teeth, temple gongs, harpy
  feathers, four-leaf clovers, amber, golden pyramids, bones and lodestones; a New Sorpigal man
  buys cobra eggs (MMW, JP).
- **Hidden.** A joke award in the Control Center; an altar sequence in the Supreme Temple; the
  rite in the Superior Temple; the New World Computing dungeon (JP, DOB).

### 3.5 The ending and the score

- Only blasters hurt the reactor (JP, LP). Without the Ritual of the Void, destroying it ends
  the game with the world destroyed. With it, the party fights the Demon Queen, steps through a
  portal, and Prince Nicolai knights them (MGW, LP).
- After the good ending a final screen lists the characters, their levels and promotions, the
  total game time and a score, and the game writes a text copy of it (MGW). The score formula
  is unverified.

### 3.6 A playable order, with levels

Levels are estimates unless a source is named. The estimate is the tier 1 to tier 2 monster
levels of the places in the stage.

| Stage | Party level                                                | Regions                                                  | What gets done                                                                                                                                                                 | What it opens                                  |
| ----- | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 1     | 1 to 5 (LP: 2 after the first fights, 5 at Goblinwatch)    | New Sorpigal                                             | the letter; the Abandoned Temple's three quests; Goblinwatch; training to 15; the first Expert ranks                                                                           | the coach and ship to Castle Ironfist and Mist |
| 2     | 5 to 12 (LP: about 10 at the Temple of Baa; trained to 12) | Castle Ironfist                                          | the regent; the prince runs off; Shadow Guild Hideout, Temple of Baa, the upper Dragoons' Caverns                                                                              | ships to Mist and Bootleg Bay                  |
| 3     | 10 to 20                                                   | Misty Islands, Bootleg Bay                               | Silver Helm Outpost (Crusader, the Gharik key); the Fountain of Magic (Wizard); Temples of the Fist and Tsantsa; Hall of the Fire Lord; the December circus (the prince)       | the castle reopens                             |
| 4     | 15 to 30                                                   | Free Haven, Rockham                                      | the council's six tasks; Cavalier; Temple Stone (Priest); Mordred; Ethric's skull; the Temple of the Moon's altars                                                             | the coach and ship hub (once walked to)        |
| 5     | 20 to 35 (MG: Iron Mines 25+, Dragon's Lair 30+)           | the Mire, Frozen Highlands, Silver Cove                  | the Snergle chain; Hero; Battle Mage; Great Druid; the Monolith; Silver Helm Stronghold; Champion; the Shadow Guild and the sewers (Stone's vote); the stables (Fleise's vote) | Masters gated by promotion                     |
| 6     | 30 to 50                                                   | Blackshire, Kriegspire                                   | Kilburn's shield; Lair of the Wolf; Devil's Outpost; the hermit; the dragon towers (Warrior Mage); Archmage; High Priest; Arch Druid                                           | five votes                                     |
| 7     | 45 to 60 (LP: 50+ at the Superior Temple)                  | Kriegspire, New Sorpigal                                 | the Superior Temple of Baa; the traitor; Gharik's Forge (Newton's vote) if not done                                                                                            | the Oracle; the royal yacht                    |
| 8     | 55 to 75                                                   | the Mire, Kriegspire, Eel-infested Waters, Hermit's Isle | the four crystals                                                                                                                                                              | the cube quest                                 |
| 9     | 65 to 81 (MG: Dragon Riders about 60; LP: 81 at the end)   | Dragonsand, Free Haven, Castle Ironfist, Sweet Water     | Tomb of VARN; Control Center; Archibald; the Hive                                                                                                                              | the end                                        |

- One real order (LP, from the places each update names): New Sorpigal and the Abandoned
  Temple; Goblinwatch; Castle Ironfist; the Temple of Baa, the Shadow Guild Hideout and Bootleg
  Bay; Free Haven; first promotions across Free Haven, Mist, Silver Cove and the Frozen
  Highlands; Snergle, Silver Helm and the Dragoons' Caverns; Corlagon and the Temple of the
  Sun; Icewind Keep; the Warlord's Fortress, the Monolith and the Silver Helm Stronghold;
  Longfang, the Temple of the Moon, Ethric and the Dragoons' Keep; Kriegspire and the Lair of
  the Wolf; Castle Darkmoor; Gharik's Forge; the Superior Temple and the Oracle; Agar's
  Laboratory and Castle Alamos; Paradise Valley and Dragonsand; Castle Kriegspire and Sweet
  Water; the Tomb of VARN; the Control Center and the Dragon Riders; the Hive.
- Experience: level N needs N × (N − 1) × 500 (GAPS). The quest table's rewards add up to about
  1.93 million, which is level 62 (1.89 million) if each character receives them in full
  (unverified). The LP party ended at level 81 (3.24 million).

## 4. Services and their rules

### 4.1 What each settlement has

From the MMW map guides, checked against JP's legends. "I" and "A" are a magic guild's
Initiate and Adept halls (4.3). Shop tiers as in "Scope and method".

| Settlement (grid)          | Places | Training cap | Temple       | Inns | Bank | Coach | Ships                        | Weapons                                  | Armour           | Magic        | General | Magic guild halls                                         | Skill guild halls                     | Town hall | Experts             | Masters                      |
| -------------------------- | ------ | ------------ | ------------ | ---- | ---- | ----- | ---------------------------- | ---------------------------------------- | ---------------- | ------------ | ------- | --------------------------------------------------------- | ------------------------------------- | --------- | ------------------- | ---------------------------- |
| New Sorpigal (e3)          | 31     | 15           | yes          | 1    | yes  | yes   | 1                            | T1 (S2 daggers)                          | T1 (S2)          | T1 (S2)      | yes     | Elements I, Self I                                        | Buccaneers' Lair, Blades' End         | yes       | 14 (3 outside town) | 0                            |
| Ironfist (d3)              | 34     | 200          | yes          | 1    | no   | yes   | 2 (one is the yacht)         | T1 swords and daggers (S2); T1 bows (S2) | T3 (S4); T2 (S3) | T2 (S3)      | no      | Spirit I, Mind I, Body I                                  | Berserkers' Fury                      | no        | 13                  | 1                            |
| Mist (e2)                  | 28     | 30 (MG: 32)  | yes          | 1    | yes  | no    | 1                            | T1 pole arms (S2)                        | T2 (S3)          | T1 (S2)      | yes     | Fire I, Water I, Air I                                    | Buccaneers' Lair, Duelists' Edge      | yes       | 4                   | 4                            |
| Harecksburg (d2)           | 14     | 20 (MG: 22)  | yes          | 1    | no   | no    | 2 in the region              | T2 (S2 maces)                            | T2 (S3)          | T1 (S2)      | no      | none                                                      | none                                  | no        | 2                   | 0                            |
| Free Haven (c2)            | 79     | 60           | after repair | 2    | yes  | 2     | 1                            | T2 swords and daggers (S3); T2 bows (S3) | T2 (S3); T3 (S4) | T3 (S4); T4  | yes     | Fire A, Air A, Water A, Earth A, Spirit A, Mind A, Body A | Duelists' Edge                        | no        | 14                  | 1, and 2 more in the region  |
| Rockham (c2)               | 8      | none         | no           | 1    | no   | no    | no                           | none                                     | none             | none         | no      | none                                                      | none                                  | no        | 0                   | 1                            |
| Darkmoor (c3)              | 30     | none         | no           | 1    | no   | yes   | no                           | T1 maces and axes (S2)                   | T2 (S3)          | T2 (S3)      | no      | none                                                      | none                                  | no        | 3                   | 4                            |
| White Cap (c1)             | 33     | 50           | yes          | 1    | yes  | yes   | no                           | T2 bows (S4)                             | T3 (S4)          | T2 (S3)      | yes     | Elements A, Dark I                                        | Blades' End                           | no        | 3 (2 outside town)  | 0                            |
| Hargraeve (c1)             | 18     | none         | no           | 1    | no   | no    | no                           | T2 pole arms (S3)                        | T3 (S4)          | none         | no      | none                                                      | Protection Services                   | no        | 0                   | 4, and 1 at Castle Stromgard |
| Silver Cove (d1)           | 68     | 40           | yes          | 1    | yes  | yes   | 1, and 1 on an island        | T2 maces and axes (S4)                   | T3 (S4)          | T1 (S2)      | yes     | Earth I, Light I, Self A                                  | Berserkers' Fury, Protection Services | yes       | 4                   | 5, and 1 on the islands      |
| Blackshire (b2)            | 35     | 100          | yes          | 1    | yes  | yes   | no                           | T2 staffs and spears (S4)                | T3 (S4)          | T3 (S4)      | yes     | Light A, Dark A                                           | Smugglers' Guild                      | no        | 1                   | 3                            |
| Kriegspire (b1)            | 23     | 80           | no           | 1    | no   | yes   | no                           | T2 maces and axes (S4)                   | T3 (S4)          | T3           | no      | none                                                      | none                                  | no        | 1                   | 1 (on the castle walls)      |
| Alamos (e1)                | 12     | none         | yes          | 1    | no   | no    | 1, and 1 on the south island | none                                     | none             | T4 (S5)      | no      | none                                                      | none                                  | no        | 1                   | 1 (south island)             |
| Abdul's Desert Resort (b3) | 12     | none         | no           | no   | no   | no    | no                           | traders only                             | traders only     | traders only | no      | none                                                      | none                                  | no        | 0                   | 0                            |
| Edenbrook (a2)             | 22     | no cap       | no           | 1    | no   | no    | no                           | T2 swords and daggers (S4)               | T4 (S5)          | T5           | no      | none                                                      | none                                  | no        | 0                   | 2                            |

- Free Haven has no working temple until the Cleric's first promotion quest repairs Temple
  Stone (MMW).
- Totals: 60 Expert and 30 Master teachers (JP), matching two Experts and one Master for each of
  the 30 skills that have teachers (GAPS: Thievery has none).
- Places outside the settlements (region map guides, MMW): 166 more, from shrines and fountains
  to hirelings' homes.

### 4.2 Shops

- Four kinds (MMW): the weapon smith and the armour smith; the alchemist, who sells scrolls,
  wands, potions, rings and amulets; the general store, with herbs, empty bottles and random
  first-tier items.
- Smiths and alchemists buy, sell, identify and repair only their own kind of goods (MMW).
  What a general store buys is unverified.
- Every smith and alchemist has a regular stock and a special stock one or two tiers higher
  (MMW).
- The best regular stock of each town rises across the map: T1 New Sorpigal; T2 Mist,
  Harecksburg, Darkmoor; T3 Ironfist, White Cap, Hargraeve, Silver Cove, Blackshire,
  Kriegspire; T4 Free Haven (one alchemist), Alamos; T5 Edenbrook (its alchemist).
- Shop hours and restock days are unverified (GAPS quotes a Tuesday restock in New Sorpigal).

### 4.3 Guilds

Magic guilds: eleven, each with two halls, an Initiate and an Adept one (MMW). Membership is
bought once for the whole party (LP). Spell stock renews every 2 days (MMW, JP). Opening hours
are JP's.

| Guild                                 | Initiate hall: spells sold | Adept hall: spells sold | Basic skill price (I / A) | Membership | Hours    |
| ------------------------------------- | -------------------------- | ----------------------- | ------------------------- | ---------- | -------- |
| Elements (Fire, Air, Water and Earth) | New Sorpigal: 1 to 4       | White Cap: 1 to 8       | 750 / 1,250               | 100        | 06 to 18 |
| Self (Spirit, Mind and Body)          | New Sorpigal: 1 to 4       | Silver Cove: 1 to 8     | 750 / 1,250               | 100        | 06 to 18 |
| Fire, Air, Water                      | Mist: 1 to 7               | Free Haven: all 11      | 1,000 / 1,500             | 50         | 06 to 18 |
| Earth                                 | Silver Cove: 1 to 7        | Free Haven: all 11      | 1,000 / 1,500             | 50         | 06 to 18 |
| Spirit, Mind, Body                    | Ironfist: 1 to 7           | Free Haven: all 11      | 1,000 / 1,500             | 50         | 06 to 18 |
| Light                                 | Silver Cove: 1 to 6        | Blackshire: 1 to 10     | 1,500 / 2,000             | 1,000      | 10 to 14 |
| Dark                                  | White Cap: 1 to 6          | Blackshire: 1 to 10     | 1,500 / 2,000             | 1,000      | 22 to 02 |

- Each school has 11 spells (GAPS: 99 spells in nine schools). The eleventh Light and Dark
  spells come only from the obelisk treasure (DOB).
- The single-school halls of Fire, Air, Water, Earth, Light and Dark also teach Learning;
  those of Spirit, Mind and Body teach Meditation (MMW).

Skill guilds: six (MMW; hours JP).

| Guild               | Halls: skills taught at Normal, price each                                                                                                             | Membership | Hours    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- |
| Buccaneers' Lair    | New Sorpigal: Dagger, Merchant, Identify Item, Perception, Disarm Trap, 150. Mist: Leather, Diplomacy, Identify Item, Perception, Disarm Trap, 200     | 25         | 18 to 06 |
| Blades' End         | New Sorpigal: Sword, Axe, Spear, Staff, Leather, 375. White Cap: Sword, Axe, Spear, Staff, Repair Item, 750                                            | 25         | 09 to 21 |
| Berserkers' Fury    | Ironfist: Chain, Bow, Shield, Plate, Repair Item, 500. Silver Cove: the same, 625                                                                      | 50         | 09 to 21 |
| Duelists' Edge      | Mist: Bow, Mace, Shield, Body Building, Chain, 500. Free Haven: the same, 625                                                                          | 50         | 09 to 21 |
| Protection Services | Hargraeve: Dagger, Merchant, Identify Item, Perception, Disarm Trap, 250. Silver Cove: Diplomacy, Leather, Identify Item, Perception, Disarm Trap, 300 | 50         | 18 to 06 |
| Smugglers' Guild    | Blackshire only: Leather, Diplomacy, Disarm Trap, Identify Item, Perception; 500 (MMW) or 250 (JP)                                                     | 50         | 18 to 06 |

- Expert needs skill 4 in every skill (JP). Every skill a class may learn can reach Master;
  MM6 has no Grandmaster (JP).

### 4.4 Training halls

| Town         | Hall                             | Cap         | Base price (unpromoted / once / twice) |
| ------------ | -------------------------------- | ----------- | -------------------------------------- |
| New Sorpigal | New Sorpigal Training Grounds    | 15          | 10 / 20 / 30                           |
| Harecksburg  | Training-by-the-Sea              | 20 (MG: 22) | 20 / 40 / 60                           |
| Mist         | Island Testing Center            | 30 (MG: 32) | 15 / 30 / 45                           |
| Silver Cove  | Abdul's Discount Training Center | 40          | 25 / 50 / 75                           |
| White Cap    | Riverside Academy                | 50          | 25 / 50 / 75                           |
| Free Haven   | Free Haven Academy               | 60          | 30 / 60 / 90                           |
| Kriegspire   | Lone Tree Training               | 80          | 30 / 60 / 90                           |
| Blackshire   | Wolf's Den                       | 100         | 40 / 80 / 120                          |
| Ironfist     | Royal Gymnasium                  | 200         | 30 / 60 / 90                           |
| Edenbrook    | The Sparring Ground              | none        | 50 / 100 / 150                         |

- Training from level n to n + 1 costs the base price times n (MMW: double from 2 to 3, triple
  from 3 to 4).
- A visit to a hall passes 8 days, however many levels are bought in it (LP).
- MG's table differs: Paradise Valley to 120 and an unlimited trainer in Dragonsand. MMW and JP
  give Edenbrook (in Paradise Valley) no cap and Dragonsand no trainer.
- The project's `trainingCost` (25 gold × new level × a multiplier, GAPS section 6) is close to
  MM6's shape; MM6 varies the base by hall and multiplies by the promotion.

### 4.5 Temples

- Nine in towns: New Sorpigal, Ironfist, Mist, Harecksburg, Free Haven (Temple Stone, after its
  repair), Silver Cove, White Cap, Blackshire and Alamos (MMW).
- They heal hit points and conditions for a fee. None restores an eradicated character except
  Temple Stone after the Cleric quests (MMW, LR).
- A Temple of Baa stands outside town in six regions (Blackshire, Bootleg Bay, Castle Ironfist,
  Free Haven, the Mire, Paradise Valley). It is cheaper, each use lowers reputation, and it
  cannot cure death or stone (MMW).
- Donations raise reputation; New Sorpigal's temple is the cheapest place to give (LR, one
  source).
- Temple prices are unverified.

### 4.6 Taverns

| Room / food (gold) | Food up to (days) | Inns                                                                                                                                                          |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3 / 2              | 6                 | A Lonely Knight, New Sorpigal (screenshot-27, via GAPS)                                                                                                       |
| 10 / 9             | 10                | The Goblin's Tooth (Harecksburg); The Rusted Shield (the Mire); The Will o' Wisp (Castle Ironfist region)                                                     |
| 14 / 17            | 12                | The Imp Slapper (Mist); The Grove (Silver Cove's islands)                                                                                                     |
| 19 / 27            | 14                | The Broken Cutlass (Bootleg Bay's islands); The Haunt (Darkmoor); Rime and Reason (Hargraeve); An Arrow's Flight (Alamos); A Stone's Throw (Eel south island) |
| 32 / 63            | 20                | Rockham's Pride (Rockham)                                                                                                                                     |
| 40 / 79            | 20                | Anchors Away (Silver Cove); The Broken Promise (Kriegspire); The Echoing Whisper (Free Haven)                                                                 |
| 90 / 269           | 30                | The Frosty Tankard (White Cap); The Howling Moon (Blackshire); Viktor's Hall (Free Haven)                                                                     |
| 160 / 639          | 40                | The Last Chance (Edenbrook)                                                                                                                                   |
| 360 / 2,159        | 60                | The Oasis (Blackshire region)                                                                                                                                 |
| unverified         | unverified        | The King's Crown (Ironfist)                                                                                                                                   |

- "Fill packs" tops the food up to the inn's number of days (MMW). A drink costs 1 gold at
  every inn MMW prices.
- Tipping the barkeeper is worth doing (LR); what it gives is unverified.
- No card game: Arcomage appears in MM7 and MM8 only (MMW).
- Six inns stand outside towns, as rest stops: The Will o' Wisp, The Rusted Shield, The Broken
  Cutlass, The Grove, The Oasis and A Stone's Throw.

### 4.7 Banks

- Six: Savings House (New Sorpigal), The Reserves (Mist), Foreign Exchange (Free Haven), The
  First Bank of Enroth (Silver Cove), Secure Trust (White Cap), The Depository (Blackshire)
  (MMW).
- Gold paid in at one bank can be drawn at any other, and banked gold is not lost when the party
  dies (MMW). Interest is unverified.

### 4.8 Coaches and ships

Days of the week and trip lengths from MGW, MMW and JP, which agree unless a note says
otherwise. Prices in gold (MMW, JP).

| Vehicle                         | From                              | To                                | Days          | Trip (days) | Price | Note                                                                                                                             |
| ------------------------------- | --------------------------------- | --------------------------------- | ------------- | ----------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| New Sorpigal Coach Company      | New Sorpigal                      | Castle Ironfist                   | Mon, Wed, Fri | 2           | 25    |                                                                                                                                  |
| Royal Lines (coach)             | Ironfist                          | New Sorpigal                      | Mon, Wed, Fri | 2           | 50    |                                                                                                                                  |
| Royal Lines (coach)             | Ironfist                          | Free Haven                        | Tue, Sat      | 4           | 50    | only after the party has walked to Free Haven (MMW, MG)                                                                          |
| Royal Lines (coach)             | Ironfist                          | Arena                             | Sun           | 1           | 50    |                                                                                                                                  |
| Free Haven Travel West          | Free Haven                        | Silver Cove                       | Mon, Thu      | 4           | 100   | JP calls the stations north and south                                                                                            |
| Free Haven Travel West          | Free Haven                        | Castle Ironfist                   | Tue, Fri      | 4           | 100   |                                                                                                                                  |
| Free Haven Travel West          | Free Haven                        | Darkmoor                          | Wed, Sat      | 5           | 100   |                                                                                                                                  |
| Free Haven Travel East          | Free Haven                        | Blackshire                        | Mon, Thu      | 3           | 150   |                                                                                                                                  |
| Free Haven Travel East          | Free Haven                        | Kriegspire                        | Tue, Fri      | 3           | 150   |                                                                                                                                  |
| Free Haven Travel East          | Free Haven                        | White Cap                         | Wed, Sat      | 3           | 150   |                                                                                                                                  |
| Abdul's Discount Travel         | Silver Cove                       | Free Haven                        | Mon, Fri      | 4           | 200   |                                                                                                                                  |
| White Cap Transport Co          | White Cap                         | Free Haven                        | Mon, Thu      | 3           | 200   |                                                                                                                                  |
| Darkmoor Travel                 | Darkmoor                          | Free Haven                        | Mon, Fri      | 5           | 250   | MMW's timetable page lists Monday only                                                                                           |
| Blackshire Coach and Buggy      | Blackshire                        | Free Haven                        | Tue, Fri      | 3           | 250   | MG: 4 days, 150 gold                                                                                                             |
| King's Highway                  | Kriegspire                        | Free Haven                        | Wed, Sat      | 3           | 250   |                                                                                                                                  |
| _Odyssey_                       | New Sorpigal                      | Mist                              | Tue, Thu, Sat | 3           | 100   |                                                                                                                                  |
| _Zephyr_                        | Ironfist                          | Mist                              | Mon, Wed, Fri | 2           | 100   |                                                                                                                                  |
| _Zephyr_                        | Ironfist                          | New Sorpigal                      | Tue, Thu, Sat | 2           | 100   |                                                                                                                                  |
| _Zephyr_                        | Ironfist                          | Bootleg Bay, east docks           | Tue, Fri      | 3           | 100   | MMW: 2 days on Friday                                                                                                            |
| _Queen Catherine_ (royal yacht) | Ironfist                          | Hermit's Isle                     | every day     | 21          | free  | only after the traitor is exposed; MMW and JP also list two Sunday trips to the New Sorpigal volcano (2 and 14 days), unverified |
| _Adventure_                     | Mist                              | Castle Ironfist                   | Mon, Wed, Fri | 2           | 250   |                                                                                                                                  |
| _Adventure_                     | Mist                              | Silver Cove                       | Mon, Thu      | 3           | 250   | only after the party has been to Silver Cove; MMW's timetable page lists Monday only                                             |
| _Adventure_                     | Mist                              | Bootleg Bay, east docks           | Tue, Thu, Sat | 2           | 250   |                                                                                                                                  |
| _Tsunami_                       | Bootleg Bay, east docks           | Bootleg Bay, west docks           | Mon, Wed      | 1           | 150   |                                                                                                                                  |
| _Valkyrie_                      | Bootleg Bay, west docks           | Castle Ironfist                   | Tue, Thu      | 4           | 150   |                                                                                                                                  |
| _Windrunner_                    | Free Haven                        | Mist                              | Mon, Thu      | 4           | 300   |                                                                                                                                  |
| _Windrunner_                    | Free Haven                        | Silver Cove                       | Tue, Thu      | 3           | 300   |                                                                                                                                  |
| _Windrunner_                    | Free Haven                        | Castle Ironfist                   | Wed           | 5           | 300   | MMW: 4 days                                                                                                                      |
| _Cerulean Skies_                | Silver Cove                       | Mist                              | Mon, Thu, Sat | 3           | 300   |                                                                                                                                  |
| _Cerulean Skies_                | Silver Cove                       | Free Haven                        | Tue, Fri      | 3           | 300   |                                                                                                                                  |
| _Cerulean Skies_                | Silver Cove                       | Eel-infested Waters, north island | Wed           | 1           | 300   |                                                                                                                                  |
| _Barracuda_                     | Silver Cove, a north island       | Eel-infested Waters, south island | Thu           | 2           | 200   |                                                                                                                                  |
| _Tigershark_                    | Alamos (north island)             | Silver Cove                       | Mon           | 2           | 400   |                                                                                                                                  |
| _Cirrus_                        | Eel-infested Waters, south island | Alamos (north island)             | Sat           | 1           | 200   |                                                                                                                                  |

- MG: no coach or ship goes to Free Haven or Silver Cove until the party has reached one of
  them on foot. MMW notes the same gate for the Ironfist coach and the Mist ship.
- The coaches make a star round Free Haven (two stations, six towns), with a second hub at
  Ironfist (New Sorpigal, Free Haven, the Arena).
- The ships make a loop in the eastern sea: New Sorpigal, Ironfist, Mist, Bootleg Bay, Free
  Haven, Silver Cove and the two Eel islands.
- Sweet Water, Paradise Valley and Dragonsand have no coach or ship; Hermit's Isle has only the
  yacht.
- Fleise's council task visits exactly the nine coach stables.
- A trip moves the calendar on by its days; hirelings shorten trips (GAPS section 21).

### 4.9 Teachers by town

Requirements are JP's and RPGC's (via GAPS section 5, which also has the prices).

| Town or place                   | Expert teachers                                                                                                                                                                        | Master teachers (requirement)                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| New Sorpigal                    | Fire, Air (on the bank's upper floor, Fly), Earth, Spirit, Mind, Body, Learning, Meditation, Body Building, Identify Item, Perception; outside town: Water (an island), Staff, Blaster | none                                                                                                                                          |
| Ironfist                        | Sword, Dagger, Axe, Bow, Shield, Leather, Chain, Plate, Disarm Trap, Identify Item, Body Building, Learning, Diplomacy                                                                 | Spirit (High Priest)                                                                                                                          |
| Mist                            | Staff, Spear, Leather, Repair Item                                                                                                                                                     | Fire (skill 12), Water (skill 12), Air (Archmage), Meditation (skill 7, Personality 30)                                                       |
| Harecksburg                     | Chain, Perception                                                                                                                                                                      | none                                                                                                                                          |
| Free Haven                      | Fire, Air, Water, Earth, Spirit, Mind, Body, Sword, Dagger, Shield, Plate, Merchant, Diplomacy, Disarm Trap                                                                            | Identify Item (skill 7, Intellect 30)                                                                                                         |
| Rockham                         | none                                                                                                                                                                                   | Body Building (skill 7, Endurance 30)                                                                                                         |
| Castle Temper                   | none                                                                                                                                                                                   | Plate (Hero)                                                                                                                                  |
| Darkmoor                        | Axe, Mace, Merchant                                                                                                                                                                    | Axe (the Snergle quest), Spear (skill 8, Cavalier), Chain (skill 10, Crusader), Perception (skill 7, Luck 30)                                 |
| White Cap and outskirts         | Dark; Bow and Mace in a house outside town                                                                                                                                             | none                                                                                                                                          |
| Hargraeve                       | none                                                                                                                                                                                   | Dagger (skill 8, Speed 40), Leather (skill 10), Disarm Trap (skill 7, Accuracy 30), Repair Item (skill 7, Accuracy 30)                        |
| Castle Stromgard                | none                                                                                                                                                                                   | Diplomacy (reputation 200 by RPGC; "fame 200" by JP)                                                                                          |
| Silver Cove                     | Spear, Repair Item, Meditation, Light                                                                                                                                                  | Earth, Mind and Body (skill 12 each), Learning (skill 7, Intellect 30), Merchant (skill 7, Personality 30); Staff (skill 8) at the island inn |
| Blackshire                      | Dark                                                                                                                                                                                   | Sword (skill 8, Cavalier), Mace (skill 8, Might 40), Shield (skill 10)                                                                        |
| Kriegspire                      | Light                                                                                                                                                                                  | Bow (skill 8, Battle Mage), on the castle walls                                                                                               |
| Alamos and the Eel south island | Blaster                                                                                                                                                                                | Light (Saintly reputation)                                                                                                                    |
| Edenbrook                       | none                                                                                                                                                                                   | Blaster (a blaster in hand), Dark (Notorious reputation)                                                                                      |

### 4.10 Other services and rules

- **Town halls**: New Sorpigal, Mist and Silver Cove. Quests and the monthly bounty (MMW).
- **Reputation ranks** (JP, as numbers): 0 to 199 Average; 200 Respectable; 400 Honorable; 600
  Glorious; 800 Angelic; above 999 Saintly. Below 0 Bad; −300 Vile; −600 Despicable; −800
  Monstrous; below −999 Notorious. The Light Master needs Saintly, the Dark Master Notorious,
  so one party cannot hold both rights at once.
- **What moves reputation** (JP, MMW): +50 to +200 for most quests; +800 for exposing the
  traitor; −200 for the candelabra and for each robbed sarcophagus; −928 for freeing Archibald;
  −976 for the Baa rite and for the Kriegspire healer; healing at a Temple of Baa; donations
  raise it (LR).
- **Town Portal**: JP marks arrival points in New Sorpigal, Mist, Free Haven and Silver Cove;
  its dragon-tower note implies White Cap and Blackshire too. Unverified.
- **Hirelings**: about 50 professions (GAPS section 25), living in town homes; the MMW map
  guides name one or two per house.

## 5. Against this project

### 5.1 What the project can generate today

| MM6 element             | MM6 count or need                                                                                                                                      | This project today                                                                                                                                                                                                                                                           | Gap                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Outdoor regions         | 15 on a grid                                                                                                                                           | 2 generated regions, 1.6 km square at 5 m cells (`kernel/terrain/`, `levels/valley/terrain.ts`, `levels/desert/terrain.ts`): the valley (river, road, ravine with 8 cascades, pass, about 9,400 trees, the village, a cave mouth) and the desert (dunes, mesas, oasis, road) | 13 regions; one generator per kind of land; a grid of neighbours                         |
| Sea, coasts and islands | 9 regions touch the sea; 2 are reached only by ship                                                                                                    | none; water is a river, terraced pools and an oasis (`river.ts`, `stream.ts`, `desert.ts`)                                                                                                                                                                                   | a sea level, coastlines, beaches, islands, docks                                         |
| Volcano and lava        | the New Sorpigal volcano, the Kriegspire crater; lava in two dungeons                                                                                  | none                                                                                                                                                                                                                                                                         | a crater generator; a lava surface that hurts                                            |
| Snow and winter         | the Frozen Highlands, under a winter that a quest ends                                                                                                 | a snow layer above 235 m in the valley                                                                                                                                                                                                                                       | a snowfield region; a weather state a quest switches                                     |
| Swamp                   | the Mire of the Damned                                                                                                                                 | none                                                                                                                                                                                                                                                                         | flat wet land with pools; an invisible bridge                                            |
| Settlements             | 15, with 447 numbered places and 234 homes                                                                                                             | 1 village (`layoutVillage`, `kernel/terrain/village.ts`): fixed slots along one street, 10 building models, 4 houses that open a service                                                                                                                                     | towns of 8 to 79 places; walls, bridges, docks, island towns; about 15 kinds of building |
| Services                | about 14 kinds: inn, temple, trainer, magic guild, skill guild, four shop kinds, bank, stable, ship, town hall, a teacher's home, castle, seer, trader | 5 kinds in code (tavern, temple, guild, trainer, shop: `src/ui/context.ts`, `src/game/services.ts`); 4 houses in the world (`VILLAGE_HOUSES`, `src/game/content.ts`)                                                                                                         | bank, stable, ship, teacher, town hall, castle, seer and trader screens                  |
| Travel between maps     | 22 edges (5 days on foot), 9 stables, 11 ships, Town Portal                                                                                            | portals: a trigger disc, a fade and a page reload (`src/world/portals.ts`); 2 links, each both ways: the cave to the showcase, the pass to the desert                                                                                                                        | edge travel with a prompt and days passing; timetables by weekday                        |
| Dungeon entrances       | 40                                                                                                                                                     | 1 (the cave mouth, `kernel/terrain/cave.ts`)                                                                                                                                                                                                                                 | doors in buildings, wells, teleport platforms, island entrances                          |
| Dungeon geometry        | 39 dungeons, from 1 room to the largest ship                                                                                                           | `LevelBuilder` (`kernel/plan/level.ts`): halls, galleries, shafts with spiral stairs, corridors, stairs, switchbacks, bridges, colonnades, SDF caverns, water planes, rivers, waterfalls, lights; 1 showcase level of 7 spaces                                               | lifts, moving bridges, holes between floors, rising steps                                |
| Dungeon mechanics       | doors, levers, keys, coded doors, traps, teleporters, secret doors, chests, spawn triggers, hazards                                                    | none: the `door`, `loot` and `trigger` points are markers for the build's reachability check (GAPS section 29)                                                                                                                                                               | the whole event layer and its authoring in level scripts                                 |
| Monsters                | 52 families of 3 tiers and 17 uniques; refill timers per map                                                                                           | 4 humanoid kinds (bandit 2, goblin scout 1, skeleton warrior 3, nomad raider 3; `src/game/monsters.ts`); spawns beside roads; everything respawns on each load                                                                                                               | non-humanoid bodies; groups by family and tier; refill timers                            |
| People                  | 234 homes with named people, many of them hirelings                                                                                                    | 2 villagers with dialogue (`src/world/npc.ts`, `src/game/dialogue.ts`)                                                                                                                                                                                                       | rosters per town; professions; hiring                                                    |
| Quests                  | 56 logged, the Hive, 6 activities                                                                                                                      | 2 kill quests on an engine with talk, kill, reach and deliver objectives (`src/game/quests.ts`)                                                                                                                                                                              | the content; reach and deliver fed in play; item objectives                              |
| Calendar triggers       | weekday timetables, circus months, shrine months, solstices, a full moon at midnight, map refills                                                      | the calendar and clock (`src/game/time.ts`), with days of the week                                                                                                                                                                                                           | date and weekday conditions on services and places                                       |

Measured cost of what exists (build logs and `public/levels/`):

- A region compiles in about 6 to 7 seconds and ships about 3.4 to 5.0 MB (a 2.7 to 3.0 MB GLB,
  a 0.6 to 1.6 MB navmesh, up to 0.4 MB of sidecar).
- The showcase dungeon compiles in about 11 seconds and ships about 4.8 MB.
- At those sizes, 15 regions and 40 dungeons come to roughly 130 to 265 MB of level data. The
  offline precache (PLAN Phase 7 step 2) has to plan for it; the iOS storage limit is
  unverified.

### 5.2 What each region would cost

Assumptions:

- Content only. The shared systems are sized in GAPS section 38 and are needed by either
  variant: dungeon mechanics (step 8, L), people and travel (step 9, XL), items, monsters and
  magic (steps 5 to 7, XL each).
- Unit sizes (est., at this project's pace so far): terrain from an existing generator with new
  settings S; a region that needs new terrain features M; a region that needs a new generator
  (sea with islands, a crater) L; a settlement of up to 15 places M; 16 to 35 places L; 60 or
  more XL; a small dungeon S; medium M; medium to large 3 days; large L; huge XL; a region's
  quests and people M, L for a hub; a circus site M.
- Building and prop models come from Meshy batches the owner approves; their credits are not in
  these sizes.
- For the totals, S counts as 0.25 day, M 1.5, L 4, XL 8.

| Region                                                               | Terrain                                            | Settlements    | Dungeons                    | Quests and people | Total (est.)                       |
| -------------------------------------------------------------------- | -------------------------------------------------- | -------------- | --------------------------- | ----------------- | ---------------------------------- |
| New Sorpigal                                                         | L (coast, islands, a volcano with an inside)       | L (31)         | M, M, L                     | M                 | XL, 16 days                        |
| Castle Ironfist                                                      | M (castle ridge, coast, docks, teleport platforms) | L (34)         | M, M, M, M, L; the Arena S  | M                 | XL, 17 days                        |
| Misty Islands                                                        | L (island chain, bridges, teleporters)             | L (28)         | M                           | M                 | XL, 11 days                        |
| Bootleg Bay                                                          | L (mainland and islands)                           | M (14)         | S, M, 3 days, M; a circus M | M                 | XL, 15 days                        |
| Free Haven                                                           | M (plain, lake, bridges)                           | XL (79), M (8) | M, M, M, L, L, S            | L                 | XL, 28 days                        |
| Mire of the Damned                                                   | M (swamp)                                          | L (30)         | M, S, L                     | M                 | XL, 13 days                        |
| Frozen Highlands                                                     | M (snowfield, winter state)                        | L (33), L (18) | M, M                        | M                 | XL, 14 days                        |
| Silver Cove                                                          | M (coast, river mouth, islands)                    | XL (68)        | 3 days, M, M                | M                 | XL, 17 days                        |
| Blackshire                                                           | M (moor, a lake with an island)                    | L (35)         | M, S; a circus M            | M                 | XL, 10 days                        |
| Kriegspire                                                           | L (crater, peaks, canyon)                          | L (23)         | L, M, L, S, M               | M                 | XL, 21 days                        |
| Eel-infested Waters                                                  | L (open sea, islands)                              | M (12)         | L                           | S                 | XL, 10 days                        |
| Dragonsand                                                           | M (the desert generator, a pyramid)                | M (12)         | XL, L                       | S                 | XL, 15 days                        |
| Hermit's Isle                                                        | M (an island)                                      | none           | 3 days                      | S                 | L, 5 days                          |
| Paradise Valley                                                      | M (the valley generator, a coast)                  | L (22)         | none                        | S                 | L, 6 days                          |
| Sweet Water                                                          | M (ruins, a lake)                                  | S (ruins)      | L                           | S                 | L, 6 days                          |
| New terrain features, once (sea and coast, crater, swamp, snowfield) |                                                    |                |                             |                   | XL, 9 days                         |
| **All**                                                              |                                                    |                |                             |                   | **about 210 working days (±50 %)** |

- Shares of the total (est.): dungeons about 42 %, settlements about 27 %, terrain about 21 %,
  quests, people and the circus about 10 %.
- The quests-and-people share assumes MM6's sparse lines (a name, a profession, a few topics).
  Written dialogue for every home would make it the largest share.
- Dropping the joke dungeon (New World Computing) saves about 4 days.

### 5.3 The original world with MM6's structure

The same grid, edges, refill periods, gradient, counts and gates, with neutral names. The names
in brackets are placeholders, not proposals.

```
[lost-home] ----- [volcano-marches] - [winter-highlands] - [druid-coast] ~~~~ [serpent-sea]
     |                   |                   |                  ~                  ~
[giant-valley] -- [wolf-heath] ------ [council-plain] ---- [pirate-bay] ~~~~~ [mist-isles]
     |                   |                   |                  |                  ~
[far-isle] ------ [dragon-desert] --- [haunted-marsh] ---- [crown-shire] ---- [start-coast]
```

| Grid | MM6 region          | Placeholder        | Settlements (MM6 size)                  | Dungeons                                                                                           |
| ---- | ------------------- | ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| e3   | New Sorpigal        | [start-coast]      | [start-town] (31)                       | [goblin-fort], [infested-shrine], [fire-forge]                                                     |
| d3   | Castle Ironfist     | [crown-shire]      | [crown-town] (34)                       | [cult-temple-1], [thieves-den-1], [raider-caves], [dwarf-halls], [haunted-manor]; [arena] by coach |
| e2   | Misty Islands       | [mist-isles]       | [mist-town] (28)                        | [zealot-outpost]                                                                                   |
| d2   | Bootleg Bay         | [pirate-bay]       | [bay-village] (14)                      | [monk-shrine], [cannibal-temple], [fire-hall], [sun-monastery]                                     |
| c2   | Free Haven          | [council-plain]    | [council-city] (79), [road-village] (8) | [moon-temple], [lich-tomb], [raider-keep], [city-sewers], [oracle-vault], [ancient-control-room]   |
| c3   | Mire of the Damned  | [haunted-marsh]    | [marsh-village] (30)                    | [dwarf-mines], [dragon-cave], [necromancer-castle]                                                 |
| c1   | Frozen Highlands    | [winter-highlands] | [snow-town] (33), [castle-hamlet] (18)  | [lost-keep], [thieves-den-2]                                                                       |
| d1   | Silver Cove         | [druid-coast]      | [coast-town] (68)                       | [stone-circle-temple], [warlord-fort], [zealot-stronghold]                                         |
| b2   | Blackshire          | [wolf-heath]       | [heath-town] (35)                       | [wolf-lair], [snake-temple]                                                                        |
| b1   | Kriegspire          | [volcano-marches]  | [crater-village] (23)                   | [beast-castle], [mad-lab], [rider-caves], [devil-outpost], [cult-temple-2]                         |
| e1   | Eel-infested Waters | [serpent-sea]      | [sea-village] (12)                      | [sea-castle]                                                                                       |
| b3   | Dragonsand          | [dragon-desert]    | [desert-bazaar] (12)                    | [ancient-ship], [makers-cave]                                                                      |
| a3   | Hermit's Isle       | [far-isle]         | none                                    | [cult-temple-3]                                                                                    |
| a2   | Paradise Valley     | [giant-valley]     | [last-town] (22)                        | none                                                                                               |
| a1   | Sweet Water         | [lost-home]        | ruins                                   | [invader-hive]                                                                                     |

People: the [regent] and the [prince] in [crown-town]; the [stone-uncle] in its library; six
lords, the [regent], [mage-lord], [knight-lord], [treasury-lady], [priest-lord] and
[march-lord]; the [traitor] on the [council]; the [oracle] beneath it; the [seer]; the
[hermit]; the [invader-queen].

The main quest, as a skeleton:

| Step | Placeholder milestone                                                                                                                                                                                                                       | Gate (as MM6)                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | carry the [start-letter] from [start-town] to the [regent]                                                                                                                                                                                  | none                                                                                               |
| 2    | the [prince] slips away to the [circus]; the castle shuts until he returns                                                                                                                                                                  | three circus sites, one month each                                                                 |
| 3    | six votes: the [heirloom-shield] (guarded chest, [wolf-heath]); the [time-relic] ([fire-forge]); the [devil-plans] ([devil-outpost]); price-fixing at the 9 stables; the [thief-prince] ([city-sewers]); the [winter] ended by the [hermit] | a key from [zealot-outpost]; island access; the thief flees three dens first; flight to the hermit |
| 4    | the [regent]'s seat refuses: the [cult-cloak], then the [proof] from [cult-temple-2]                                                                                                                                                        | five votes; Expert Perception; two keys                                                            |
| 5    | expose the [traitor]                                                                                                                                                                                                                        | the proof; opens the [oracle-vault] and the [royal-yacht]                                          |
| 6    | four [memory-crystals]: [cult-temple-3], [sea-castle], [necromancer-castle], [beast-castle]                                                                                                                                                 | the [oracle]                                                                                       |
| 7    | the [control-key] from [ancient-ship]                                                                                                                                                                                                       | the four crystals                                                                                  |
| 8    | the [ancient-weapon] skill and items in [ancient-control-room]                                                                                                                                                                              | the key                                                                                            |
| 9    | free the [stone-uncle]: the [third-eye] from a well, the [bell] from the [prince], the [ritual]                                                                                                                                             | the [oracle]'s task                                                                                |
| 10   | destroy the [reactor] and the [invader-queen] in [invader-hive]                                                                                                                                                                             | only [ancient-weapon]s hurt the reactor; the [ritual] decides the ending                           |

Promotions keep MM6's twelve shapes: a nomination fetched from an inn; a captive freed from
[zealot-outpost]; keys from [lost-keep], then six towers visited; a fountain drunk in
[bay-village]; an item from [haunted-manor]; two craftsmen hired to rebuild a temple; an item
from [sun-monastery]; prayer at a stone circle on four dates; prayer at an altar in
[moon-temple] at midnight under a full moon; papers from [warlord-fort]; a claw from the
[named-dragon] in [dragon-cave]. The 27 side quests keep the shapes counted in section 3.3.

### 5.4 The two variants side by side

| Aspect             | Rebuild Enroth                                                                                              | Original world, MM6's structure                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Design per place   | read the sources and follow them                                                                            | invent names, layouts and lines                                                             |
| Content effort     | about the same (section 5.2); a little less design, more checking against sources                           | about the same; a little more design, no checking                                           |
| Reference          | rich: per-house map guides, monster lists, timetables (this file)                                           | this file as the skeleton                                                                   |
| Rights             | MM6's names, maps, quests and text belong to its rights holder (GAPS section 34); this repository is public | names and text are the project's own; game systems are not owned                            |
| Fit to what exists | the start region and the next three need a sea generator first                                              | can start inland on the valley and add the sea later; the desert must move west (section 6) |
| Players            | MM6 players recognise every place                                                                           | new to everyone                                                                             |

## 6. Recommended first slice (levels 1 to 10)

The smallest set that plays MM6's own first loop: start town, first dungeons, the capital, its
first dungeon, and back. Names are the variant's placeholders; the MM6 originals follow in
parentheses.

### 6.1 The set

- **Two regions**, joined by one walked edge (5 days) and a coach (three weekdays, 2 days):
  - [start-coast] (New Sorpigal). The existing valley can serve: it has a river, a road, a
    village and a cave mouth. The coast and the volcano can wait for the sea generator.
  - [crown-shire] (Castle Ironfist). A new region from the valley generator: a castle on a
    ridge, a town below it, roads to two dungeons.
- **Two settlements**, each trimmed to about 20 working places:
  - [start-town] (New Sorpigal): training to 15; a temple; an inn; a bank; a general store;
    T1 weapon, armour and magic shops with T2 specials; the Initiate halls of the Elements and of
    the Self (spells 1 to 4); one skill guild; a town hall with quests and a monthly bounty; a
    coach stable; 6 to 8 Expert teachers; a Luck well; a hit point and a spell point fountain.
  - [crown-town] (Ironfist): the castle with the [regent]; the Initiate halls of Spirit, Mind
    and Body (spells 1 to 7); one skill guild; T1 to T2 shops; a temple; an inn; the coach; the
    [seer] nearby. MM6 caps this hall at 200; for the slice, cap it at 20.
- **Three dungeons, one optional fourth**, all medium:
  - [goblin-fort] (Goblinwatch): 11 rooms; goblins, rats, blood suckers (2 to 10); coded doors,
    switch-opened cells, one spawn trap; the combination quest.
  - [infested-shrine] (the Abandoned Temple): spiders, snakes, bats (3 to 14); poison and
    disease; three quests in one dungeon (an item that costs reputation, a rescue, a boss's
    heart); a teleporter back to the entrance.
  - [thieves-den-1] (the Shadow Guild Hideout): 9 rooms; thieves and thugs (8 to 22, use tiers
    1 and 2); paired wall switches, one-way doors, a locked cell with a trap; a rescue.
  - Optional: [cult-temple-1] (the Temple of Baa): 11 rooms; a key chain, doors touched in
    order, a fireball trap, spawn triggers. The LP party was about level 10 there.
- **Seven quests**: show the letter; bring it to the [regent]; the combination; the item; the
  rescue in the shrine; the boss's heart; the rescue from the den. An eighth with the optional
  temple. Plus the monthly bounty.
- **World features**: two obelisks (the mechanism; the treasure comes later), one monthly
  shrine and the [seer]'s pilgrimage, edge travel with days passing, one coach line on
  weekdays.

### 6.2 Why this set

- It is MM6's first loop, with its numbers: the LP party reached level 2 in the first fights, 5
  at Goblinwatch, about 10 at its third dungeon, and trained to 12 before leaving the capital's
  region. MM6's first trainer stops at 15.
- It touches every early system once: training, guilds and spell books, Expert teachers, the
  temple, the inn, the bank, shops by tier, a weekday coach, item and rescue quests, reputation,
  chests and traps, keys, switches, coded doors, a teleporter, obelisks and a shrine.
- It needs no ship and no sea.

### 6.3 What it changes in the project

- The valley becomes [start-coast]; its village grows from 4 working houses to about 20.
- The cave mouth leads to [goblin-fort] instead of the showcase. The showcase is a kernel demo,
  not an MM6-shaped dungeon.
- The desert: in MM6 the start region borders only the capital's region and the sea, and the
  desert (Dragonsand, levels 40 to 100) is in the far west. Close the pass for the slice, or
  move the desert to its grid slot (b3) later.
- Monsters: MM6's slice families are goblins 4/6/10, apprentice mages 2/6/10, lizard men
  4/7/11, followers of Baa 3/5/7, thieves 8/12/18 and thugs 8/14/22 (humanoids, which the
  pipeline makes), and blood suckers 2/4/8, rats 2/4/6, bats 3/6/9, spiders 5/8/12 and cobras
  5/10/14 (animals, which need DESIGN 10.2's non-humanoid rigs). The original world can fill
  the shrine with humanoids (cultists, skeletons) and take one animal family (rats or spiders)
  as the first test of the creature pipeline.

### 6.4 Size

- Content (est.): [start-town] grown L; [crown-shire] terrain M; [crown-town] L; three medium
  dungeons, M each; quests and people M; the obelisks, shrine, well and coach props S. About 16
  working days: XL.
- Systems it depends on (GAPS section 38): steps 1 to 4 (M each), the event layer from step 8
  (L), chests and gold from step 5, and creature rigs from step 6 if the animals stay.
  Together, XL.

## 7. Corrections and additions to MM6-GAPS.md

For the owner to fold in; this task changes no other file.

- Darkmoor is the village of the Mire of the Damned, and Castle Alamos stands in the
  Eel-infested Waters (GAPS section 34 marked both unverified; MMW, JP).
- The monthly altars work only on a pilgrimage from the Seer: +10 the first time and +3 later
  (JP, MG), each shrine once a year (MG). GAPS section 23 has the amounts as unverified.
- All ten training halls have known caps and base prices, and a visit passes 8 days (MMW, LP).
  GAPS sections 6 and 18 have them as unverified.
- Archer: the keys give Battle Mage and the towers Warrior Mage (MMW, JP). GAPS section 2 says
  the guides disagree.
- Coach and ship prices are known (MMW, JP); GAPS section 21 has them as unverified.
- Inns come in nine price tiers (MMW). MM6 has no Arcomage (MMW).
- The indoor maps are 39 dungeons and the Arena (JP), not "about 45".
- Expert needs skill 4 in every skill, and any skill a class may learn reaches Master (JP).
- Exposing the traitor gives +800 reputation, and the reputation ranks have numeric bounds (JP).
- Temples take donations that raise reputation (LR, one source). Temples of Baa heal cheaply,
  cost reputation and cannot cure death or stone (MMW).
- Free Haven has no working temple until the Cleric's first promotion quest (MMW).
- The Luck well's cap: 15 (MMW) against 16 (the GOG thread in GAPS).
- The circus: one month a site (LP, MMW, DOB) against four months (JP).

## 8. Sources

All public, read on 2026-10-17 and 2026-10-18. Downloaded pages were kept outside the
repository and read as data.

- **MMW**: Might and Magic Wiki (fandom), read through its public MediaWiki API
  (`api.php?action=parse`): the 15 region pages, the 15 town pages, every MM6 building,
  dungeon, castle and monster page, the "List of Might and Magic VI quests" and "Might and
  Magic VI travel schedules" pages, the Arcomage page. https://mightandmagic.fandom.com/
- **JP**: J. Pike, "Might and Magic 6: Mandate of Heaven walkthrough", version 2.0, after Mark
  Marcelais's (RPG Gamers archive).
  https://the-spoiler.com/RPG/New.World.Computing/might..magic.6.1/mm6.html
- **LR**: Lu Richardson, "Might and Magic VI" guide (RPG Gamers archive).
  https://the-spoiler.com/RPG/New.World.Computing/might..magic.6.1.html
- **DOB**: D. G. Dobrev, "Complete Guide to Might and Magic VI".
  https://www.cheathappens.com/text/mm6guide.zip.txt (a copy: Cyberly's "Might and Magic 6
  FAQ", https://www.cyberly.org/game-cheats/pc-walkthroughs/might-and-magic-6-faq.html)
- **MGW**: Magic Game World, MM6 guides: boat and stagecoach schedule
  (https://www.magicgameworld.com/?p=37768), the High Council quests (?p=37776), the Oracle
  quests (?p=37780), the endings (?p=37782), releasing Archibald (?p=80938), the obelisks
  (?p=37759, a copy of DOB).
- **MG**: Magic Grounds, MM6 places, shrines, training levels and travel pages.
  https://user.xmission.com/~tnelson/mm6/gameplay/
- **LP**: PurpleXVI, "Let's Play Might and Magic 6", 22 updates (Let's Play Archive).
  https://lparchive.org/Might-and-Magic-6/
- **RPGC**: RPG Classics, Might and Magic 6 shrine: the obelisk and monster pages.
  https://tartarus.rpgclassics.com/mm6/
- **GAPS**: `docs/MM6-GAPS.md` (2026-10-17), including screenshot-27 for New Sorpigal's inn.
- **Project**: the files cited in section 5.1, the level sidecars in `public/levels/` and the
  build logs of 2026-10-17.
