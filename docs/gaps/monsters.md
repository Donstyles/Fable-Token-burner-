# MM6 monsters: a specification against this code

What Might and Magic VI keeps for each monster, the rules that read those
fields, the whole roster, and an order to build it in, each measured
against this project. Written 2026-10-18 on branch
`claude/quirky-darwin-ize34m`. It expands sections 8 to 11 of
`docs/MM6-GAPS.md` (cited as GAP) and does not change any decision in
`docs/DESIGN.md`; where it suggests one, it says so.

## Scope and method

- Code read: `src/game/monsters.ts`, `combat.ts`, `party.ts`,
  `character.ts`, `conditions.ts`, `items.ts`, `experience.ts`,
  `spells.ts`; `src/world/monster.ts`, `navigation.ts`, `spellfx.ts`,
  `spell-target.ts`; the spawning and combat glue in `src/dev/index.ts`;
  `kernel/plan/level.ts`, `kernel/terrain/build.ts`,
  `kernel/characters/clips.ts`; `tools/lib/batch.ts`;
  `assets/manifest.json`.
- Four public monster tables were compared row by row with a script:
  RPG Classics (RPGC), the table in J. Pike's walkthrough (PK), the table
  in Mike Marcelais's 1999 solution (MM), both hosted by RPG Gamers, and
  the table on mm6world.ru (MW6). MW6 is the only one that also gives
  speed, recovery, AI type, preferred targets, treasure, the second
  attack's chance, the spell's chance and the special attack's
  multiplier. Section 3.3 lists every disagreement.
- Rules come from GrayFace's mechanics page (GF-M), his MM6 patch read-me
  (GF-P) and the MMExtension reference (MMX). Where those say nothing, the
  OpenEnroth source (OE) is cited. OE re-implements the MM7 engine, the
  successor of MM6's; every OE fact is marked "MM7 engine" and is
  unverified for MM6.
- The Might and Magic Wiki (MMW) and mm6.wiki (M6W) refuse automated
  reading. Their facts come from search-engine extracts and serve only as
  spot checks of MW6.
- No game file or binary was opened. No build, test or script of this
  repository was run.
- Status words and sizes are GAP's: **Missing**, **Partial**, **Present
  but deviates**, **Present**; S hours, M a day or two, L several days,
  XL a week or more.
- "Unverified" marks anything no source here confirms. Do not build from
  an unverified line without an owner decision.

### Units used below

- Distance: MM6 counts game units. The MM7 party is 192 units tall with
  its eye at 160 (OE `Party.h`, MM7 engine). If that party is about 1.8 m
  tall, one unit is about 0.94 cm. This document rounds to 1 cm per unit.
  The factor is an inference, not a source.
- Time: 128 ticks to a real second and 256 ticks to a game minute (MMX
  `const.RTSecond`, `const.Minute`).
- Speed: in the MM7 engine a move takes distance × 128 / speed ticks, so
  speed is units per real second (OE `Actor.cpp`). A goblin's 160 is then
  about 1.6 m/s.
- Recovery: in the MM7 engine a monster waits its attack animation plus
  2.133 × recovery ticks after each attack in real time (OE
  `mm7_data.h`, `flt_debugrecmod3` = 128 / 60). One recovery point is then
  1/60 s: a goblin's 100 is 1.67 s after the swing. The party's recovery
  goes through the same factor, which puts a sword's 90 at 1.5 s, not the
  0.7 s GAP section 8 estimated without it. MM6 unverified.

## Summary

1. **The roster is 194 records**: 57 families of three tiers (171 types),
   17 named uniques and 6 quest variants that carry quest items (MW6;
   RPGC and the walkthroughs list the same families). The project has four
   monster kinds and two villagers. The goblin scout and the skeleton
   warrior match MM6 families; the bandit can serve the Cutpurse or Thug
   family and the villagers the two peasant families (section 3.4).
2. **Level drives the numbers.** For every one of the 171 tiered types,
   experience is L × (L + 10) and hit points are ⌊L × (L + 30) / 10⌋.
   This was derived here from all four tables; MW6 states that level sets
   HP and experience. Only uniques and one quest variant break it.
3. **Monsters hit with their level**: (5 + 2L) / (10 + 2L + AC) (GF-M).
   The project gives monsters the party's formula with an invented attack
   bonus (`src/world/monster.ts` line 227).
4. **Special attacks are frequent and late ones are lethal.** A hit tries
   its special with chance L × multiplier percent. A try succeeds with
   chance 30 / (30 + Luck effect + one more value of the member) (GF-M,
   MMX, OE). The roster uses all 23 MM6 kinds. A Terminator Unit tries
   Eradicate on 90 % of its hits, a Supreme Titan tries Death on 95 %. The
   project has no special attacks.
5. **Half the roster fights at range.** 78 tiered types shoot (RPGC and MM
   agree on every ranged flag) and 54 cast one of 19 spells, of which the
   project has one (Fire Bolt). The project's monsters only melee.
6. **AI type sets fleeing**: Wimp at 30 % hit points (MW6; the MM7 engine
   makes Wimps run at once), Normal at 20 %, Aggressive at 10 %, Suicidal
   never. 83 tiered types are Aggressive, 41 Suicidal, 30 Normal, 17 Wimp.
   The project never flees.
7. **Targets are not random.** 41 tiered types prefer a class or a sex and
   26 hit two to four members with one blow (MW6, MMX `PrefNum`). The
   project picks a conscious member uniformly.
8. **Maps refill on a timer**: 6, 8 or 24 months outdoors, 24 months in
   dungeons, 7 days in the Hive (MM, PK). Groups are rolled on the first
   visit and stay (MW6). The project respawns everything on each load.
9. **Bodies**: 33 families fit the Meshy humanoid pipeline as they are,
   5 more need procedural wings or a tail on top, and 19 need DESIGN
   10.2's procedural rigs, plus two unique bodies. Each family's three
   tiers share one body, and MM6 gave every sprite frame a palette (MMX
   `structs.SFTItem`), so one model per family with three tints is
   faithful.

**Recommended first step** (section 4): replace `MonsterDef` with the MM6
record of section 1, fill it from section 3 for the seven monster
families of the New Sorpigal region and its peasants, and switch to-hit,
resistances and the attack choice to MM6's rules. That is M, needs no
art, and every later system plugs into it.

---

## 1. The monster record

### 1.1 Field by field

MM6 keeps one row per monster type in its monster table (MMX
`structs.MonstersTxtItem`) and a copy with live state for every monster on
a map (MMX `structs.MapMonster`). Body size, sounds and animation frames
sit in a separate monster list (MMX `structs.MonListItem`). The project
keeps one record, `MonsterDef` in `src/game/monsters.ts` (line 7).

| Field             | MM6                                                                                                                                                           | Project (`MonsterDef`)                                                                           | Status                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Identity          | Name, picture, id; three tiers per family named A, B, C (MMX `ArcherA` in its example)                                                                        | `id`, `name`, `character`                                                                        | Partial: no family or tier          |
| Level             | `Level`, 1 to 100 in the roster (MMX, MW6)                                                                                                                    | `level`, read by nothing in combat                                                               | Present but deviates                |
| Hit points        | `FullHP`; ⌊L × (L + 30) / 10⌋ for every tiered type (derived, section 3.2)                                                                                    | `hp`                                                                                             | Present                             |
| Armour class      | `ArmorClass`                                                                                                                                                  | `armorClass`                                                                                     | Present                             |
| Experience        | `Experience`; L × (L + 10) for every tiered type (derived)                                                                                                    | `xp`                                                                                             | Present                             |
| Attack 1          | Element, dice count, sides, bonus and a missile (MMX `structs.MonsterAttackInfo`)                                                                             | `damage` (one `Dice`, no element, melee only) and `attackBonus`, which MM6 has no equivalent for | Partial                             |
| Attack 2          | `Attack2Chance` in percent, then the same fields; 39 tiered types have one (MW6)                                                                              | none                                                                                             | Missing                             |
| Spell             | `SpellChance` in percent, `Spell`, rank and `SpellSkill`; written "Lightning Bolt,M,10" in the table (MMX, CH); one spell in MM6 (`Spell2` is MM7+)           | none                                                                                             | Missing                             |
| Special attack    | `Bonus`, one of 23 kinds (MMX `const.MonsterBonus`), and `BonusMul` (MMX)                                                                                     | none                                                                                             | Missing                             |
| Resistances       | Fire, Elec, Cold, Poison, Magic, Phys, each a number or immune (MMX, `const.MonsterImmune`); energy cannot be resisted (MM)                                   | none                                                                                             | Missing                             |
| Speed             | `MoveSpeed`, 100 to 400 in the roster (MW6); units per real second (MM7 engine, OE)                                                                           | `walkSpeed` and `runSpeed` in m/s; the two gaits are the project's own                           | Present but deviates                |
| Recovery          | `AttackRecovery`, 40 to 100 (MW6); attack 2 waits 1.5 times as long (MW6)                                                                                     | `attackEverySec`, one value in seconds                                                           | Present but deviates                |
| AI type           | `AIType`: Suicidal, Wimp, Normal or Aggressive (MW6, OE)                                                                                                      | none                                                                                             | Missing                             |
| No flee           | `NoFlee` bit on a placed monster (MMX `const.MonsterBits`)                                                                                                    | none                                                                                             | Missing                             |
| Flying            | `Fly` (MMX)                                                                                                                                                   | none                                                                                             | Missing; per-type values unverified |
| Wander range      | `MoveType` (MMX); in MM7 short, medium, long, global, free or stationary (OE)                                                                                 | none                                                                                             | Missing; MM6 values unverified      |
| Hostility         | `HostileType` 0 (friendly) to 4 (MMX; its example sets 0 and 4 in MM6)                                                                                        | `aggroRange` in metres                                                                           | Present but deviates                |
| Preferred targets | `Prefers` bits Knight, Paladin, Archer, Druid, Cleric, Sorcerer, Male, Female (MMX `const.MonsterPref`); `PrefNum`, the number of members one blow hits (MMX) | none                                                                                             | Missing                             |
| Treasure          | Gold dice (`TreasureDiceCount`, `TreasureDiceSides`), item chance in percent, item level 1 to 6, item type (MMX; values MW6)                                  | none                                                                                             | Missing                             |
| Quest item        | `QuestItem` (MMX, MM6 only)                                                                                                                                   | none                                                                                             | Missing                             |
| Group and ally    | `Group` and `Ally` on a placed monster (MMX)                                                                                                                  | none                                                                                             | Missing                             |
| Group size        | Not per type but per map: each of a map's three families has a count range (MMX `Mon1Low`, `Mon1Hi`); spawn points roll within it (MM7 engine, OE)            | one monster per spawn record                                                                     | Missing                             |
| Guard point       | Start point, guard point and guard radius (MMX)                                                                                                               | spawn `position` and `yawDeg` (`kernel/plan/level.ts` line 147)                                  | Partial                             |
| Body size         | `Height`, `Radius`, `Velocity` in the monster list (MMX)                                                                                                      | `heightMetres`; crowd radius fixed at 0.35 m (`src/world/monster.ts` line 58)                    | Partial                             |
| Sounds            | Attack, die, got hit, fidget (MMX `MonListItem.Sounds`)                                                                                                       | the shared synthesised hit sounds (DESIGN 14.4)                                                  | Partial                             |
| Animations        | Stand, walk, attack, shoot, stun, die, dead, fidget, got hit (MMX); eight view angles, frame times in 1/32 s (MMX `structs.SFTItem`)                          | ten humanoid clips (`kernel/characters/clips.ts`)                                                | Partial: no set for other bodies    |
| Invisible         | `Invisible` bit (MMX)                                                                                                                                         | none                                                                                             | Missing                             |
| Reach             | Not a field. Melee reaches 307 units (about 3 m) and monsters engage up to 5120 (MM7 engine, OE); the party's longest shot is 5119 (GF-M)                     | `attackRange` 1.4 to 1.7 m, `MELEE_REACH` 3.5 m for the party (`src/dev/index.ts` line 593)      | Present but deviates                |

A placed monster also carries live state (MMX `structs.MapMonster`): hit
points, an AI state (MMX `const.AIState`: stand, active, melee, ranged,
dying, dead, pursue, flee, stunned, fidget, interact, removed, cast spell,
stoned, paralysed and more), spell buffs (MM6's `const.MonsterBuff`:
Charm, Curse, Shrinking Ray, Fear, Stoned, Paralyze, Slow, Feeblemind),
the last attacker, a treasure-generated bit, a seen-on-map bit and an
inside-the-active-radius bit. The project's `Monster` class
(`src/world/monster.ts`) has hit points, five states (idle, chase,
attack, hit, dead), a stun timer and knockback.

### 1.2 Proposed record

Keep MM6's units in the data so the tables in section 3 can be pasted,
and convert once at load: 0.01 m per unit and 1/60 s per recovery point
(both from the units note above). Drop `attackBonus`.

```ts
/** MM6 damage kinds (MMX const.Damage, MM6 tags). Energy has no resistance (MM). */
type Element = 'phys' | 'fire' | 'elec' | 'cold' | 'poison' | 'magic' | 'energy';
type Resisted = Exclude<Element, 'energy'>;

/** MMX const.MonsterBonus, in its order. */
type SpecialKind =
  | 'curse'
  | 'weak'
  | 'asleep'
  | 'drunk'
  | 'insane'
  | 'poison1'
  | 'poison2'
  | 'poison3'
  | 'disease1'
  | 'disease2'
  | 'disease3'
  | 'paralyze'
  | 'unconscious'
  | 'dead'
  | 'stone'
  | 'eradicate'
  | 'breakItem'
  | 'breakArmour'
  | 'breakWeapon'
  | 'steal'
  | 'age'
  | 'drainSp'
  | 'afraid';

interface MonsterAttack {
  element: Element;
  damage: Dice; // 1d9+2
  ranged: boolean; // a missile, not a blow
}

interface MonsterKind {
  id: string; // 'goblin-b'
  family: string; // 'goblin'
  tier: 'A' | 'B' | 'C' | 'unique' | 'quest';
  name: string;
  level: number;
  hp: number; // ⌊L(L+30)/10⌋ unless the source sets it
  armorClass: number;
  xp: number; // L(L+10) unless the source sets it
  attack1: MonsterAttack;
  attack2?: MonsterAttack & { chance: number }; // percent
  spell?: { spell: string; rank: 'normal' | 'master'; skill: number; chance: number };
  special?: { kind: SpecialKind; multiplier: number }; // multiplier 1 when the source gives none
  resist: Partial<Record<Resisted, number | 'immune'>>; // absent = 0
  speed: number; // MM6 units per second
  recovery: number; // MM6 points
  ai: 'suicidal' | 'wimp' | 'normal' | 'aggressive';
  fly: boolean; // unverified per type, see section 3
  wander: 'short' | 'medium' | 'long' | 'global' | 'free' | 'stationary';
  hostility: 0 | 1 | 2 | 3 | 4;
  prefers?: { classes?: ClassId[]; sex?: Sex };
  targetsPerBlow: number; // MMX PrefNum; 1 when absent
  treasure: { gold?: Dice; itemChance: number; itemLevel?: number; itemKind?: string };
  questItem?: string;
  body: { model: string; tint: 0 | 1 | 2; heightM: number; radiusM: number };
  sounds?: { attack?: string; die?: string; hit?: string; fidget?: string };
}

/** A monster placed on a map (MMX MapMonster): overrides on top of its kind. */
interface MonsterPlacement {
  kind: string;
  position: Vec3;
  yawDeg: number;
  group?: number;
  noFlee?: boolean;
  hostility?: 0 | 1 | 2 | 3 | 4;
  guardRadiusM?: number;
  invisible?: boolean;
}
```

`ClassId` already holds MM6's six classes, the same six `Prefers` can
name (`src/game/classes.ts`). `Sex` is in `src/game/character.ts`.

---

## 2. The rules

Each rule gives MM6's version, then the project's, then the gap. Sizes
count code only; art is in section 4.

### 2.1 A monster hits a party member

- Chance = (5 + 2 × L) / (10 + 2 × L + the member's AC), with L the
  monster's level (GF-M). It covers blows and elemental missiles. Spells
  skip the roll (GF-M).
- Examples: a Goblin (L4) against AC 10 hits 13 / 28 = 46 %; against AC 0,
  72 %. A Gold Dragon (L100) against AC 100 hits 205 / 310 = 66 %.
- Project: `resolveAttack(this.def.attackBonus, …)`
  (`src/world/monster.ts` line 227) uses the party's formula
  (15 + 2A) / (30 + 2A + AC) with an invented attack bonus. The level-2
  bandit (bonus 3) hits AC 10 46 % of the time; MM6's formula at L2 gives
  9 / 24 = 38 % (GAP 8).
- **Present but deviates. S.** Add `monsterHitChance(level, ac)` beside
  `hitChance` in `src/game/combat.ts` and call it from the monster.

### 2.2 The party hits a monster

- Chance = (15 + 2 × Attack + Bonus − DistancePenalty) / (30 + 2 × Attack
  - monster AC) (GF-M). The penalty is AC / 2 from 1024 to 2559 units
    (about 10 to 26 m) and AC + 15 from 2560 units on; 5119 units (about
    51 m) is the longest shot. Bonus is the Blaster skill at Master, or
    Blades' skill × 5 (GF-M).
- Project: `hitChance` (`src/game/combat.ts` line 8) is the base formula
  only; the bolt aim reaches 40 m (`BOLT_TARGETING`,
  `src/world/spell-target.ts` line 21).
- **Partial. S** (the distance term and the 51 m cap; bows are GAP 8).

### 2.3 Damage, elements and resistance

- A hit does the chosen attack's dice. No source says armour reduces
  damage; AC only changes the chance to hit.
- MM6 has seven damage kinds: Phys, Magic, Fire, Elec, Cold, Poison and
  Energy (MMX `const.Damage`, MM6 tags). Monsters resist the first six;
  nothing resists Energy (MM; no table has an energy column).
- The resistance roll (GF-M): for resistance R, roll a success with
  chance 1 − 30 / (30 + R). The first failure stops the rolls. Each
  success halves the damage, at most four times (100, 50, 25, 12.5 or
  6.25 %). At R = 0 the damage is always full. Average damage is 75 % at
  R 20, 60 % at 40, 50 % at 60 and 39 % at 100 (GF-M).
- Monsters roll with R alone. Party members add their Luck effect to every
  resistance that is not zero (GF-M). Only monsters resist physical damage
  (GF-M).
- "Immune" takes no damage (MMX `const.MonsterImmune`; its number in MM6
  is unverified).
- Which resistance a party spell meets (MM's spell table): Fire spells
  meet Fire, and so does Sunray. Air spells meet Elec, except Implosion
  (Phys). Water spells meet Cold, except Poison Spray and Acid Burst
  (Poison). Earth spells meet Phys, except Stun, Turn to Stone and Mass
  Distortion (Magic). Spirit, Mind and Body spells meet Magic. Light and
  Dark meet Magic, except Toxic Cloud and Dragon Breath (Poison),
  Shrapmetal (Phys) and Dispel Magic (none).
- Original bug: every spell a monster cast did Fire damage; GrayFace's
  patch fixes it (GF-P). Use the spell's own element.
- Project: no elements, no resistances. `SpellEffect.projectile` carries a
  school for its colour only (`src/game/spells.ts` line 67). The party has
  resistance buff names (`BuffStat`, line 48) but no resistance values.
- **Missing. M** (a resistance block on both sides, the roll, the spell
  to element table).

### 2.4 Choosing what to do

- Each action rolls in this order (MM7 engine, OE
  `special_ability_use_check`): the spell, with its chance; otherwise
  attack 2, with its chance; otherwise attack 1. A Fire Archer (spell 40 %,
  attack 2 30 %) thus casts Fireball 40 % of the time, shoots a fire
  arrow 18 % and an arrow 42 %.
- A missile or a spell is used from range; a blow needs melee reach,
  307 units, about 3 m (MM7 engine, OE `meleeRange`). Monsters engage up
  to 5120 units, about 51 m (MM7 engine).
- In recovery a monster stands or closes in; it acts when recovery ends
  (MM7 engine).
- Project: swings alternate between two clips (`src/world/monster.ts`
  line 216); there is no ranged attack and no spell.
- **Missing. M** with 2.5 (needs the projectiles of 2.12).

### 2.5 Recovery and attack rate

- Each type has a recovery value from 40 to 100 (MW6). Attack 2 waits
  1.5 times as long (MW6). Spells and movement lower the real rate (MW6).
- Real time in the MM7 engine: the attack animation plus 2.133 ×
  recovery ticks, so 100 is 1.67 s after the swing; Slow doubles it; in
  turn-based mode the value counts as is (OE). MM6 unverified.
- A struck party member cannot act for 20 − Endurance effect (GF-M; the
  MM7 engine scales it by the same 2.133, OE). A monster's blow makes the
  struck member the active one; GrayFace's patch stops that when Endurance
  removes the delay (GF-P).
- Project: `attackEverySec` (1.6 to 2.4 s) after a 1.5× speed swing
  (`src/world/monster.ts` lines 217 and 246). No hit recovery, no switch
  of the active member.
- **Present but deviates. S.**

### 2.6 Special attacks

- **Try**: after a hit, the monster tries its special with chance L ×
  multiplier percent (GF-M; MMX `BonusMul`; OE rolls
  `random(100) < level × multiplier`). The multiplier is 1 when MW6 shows
  none (an inference). The chance can reach 100 %.
- **Which hits carry it**: blows, and missiles of attack 1, but not attack
  2 missiles or spells (MM7 engine, OE). MM6 unverified.
- **Success**: 30 / (30 + Luck effect + X), X set by the kind (GF-M). In
  MM6 X is: the Endurance effect for Weak, Asleep, Drunk, Disease,
  Unconscious and Afraid; Personality for Curse; Intellect for Insane;
  poison resistance for Poison; magic resistance for Paralyze, Stone,
  Dead, Eradicate, Drain SP and Age; the item's strength for breaking;
  Accuracy for theft (GF-M). MM7 and MM8 use other stats for some of these
  (GF-M); do not mix the lists.

| Kind            | MM6 save (X)        | Effect                                                                                         | Used by (try chance)                                                                                                  |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Curse           | Personality effect  | Cursed                                                                                         | Skeleton Lord 28 %, Harpy Hag 51 %                                                                                    |
| Weak            | Endurance effect    | Weak                                                                                           | Head Hunter 8 % (sex disputed, 3.3), Stone Gargoyle 16 %, Master Monk 27 %                                            |
| Asleep          | Endurance effect    | Asleep                                                                                         | Flying Eye 30 %, Djinn 44 %                                                                                           |
| Drunk           | Endurance effect    | Drunk                                                                                          | Harpy 14 %                                                                                                            |
| Insane          | Intellect effect    | Insane                                                                                         | Warlock 50 %, Maddening Eye 50 %                                                                                      |
| Poison 1, 2, 3  | poison resistance   | Poisoned at that level                                                                         | Spider 25 %, Cobra 25 %, King Cobra 50 % (1); Giant Spider 24 %, Wyrm 50 % (2); Huge Spider 24 %, Great Wyrm 70 % (3) |
| Disease 1, 2, 3 | Endurance effect    | Diseased at that level                                                                         | Common Rat 4 %, Brain Sucker 20 % (1); Giant Rat 12 %, Wolfman 40 % (2); Devil Worker 40 %, Werewolf 60 % (3)         |
| Paralyze        | magic resistance    | Paralyzed                                                                                      | Agar's Pet 13 %, Marble Gargoyle 22 %, Diamond Gargoyle 33 %                                                          |
| Unconscious     | Endurance effect    | Unconscious                                                                                    | Specter 19 %, Greater Werewolf 40 %, Earth Elemental 40 %                                                             |
| Dead            | magic resistance    | Dead                                                                                           | Assassin 7 %, Supreme Titan 95 %                                                                                      |
| Stone           | magic resistance    | Stoned                                                                                         | Agar's Abomination 34 %, Medusa 35 %, Gorgon 45 %                                                                     |
| Eradicate       | magic resistance    | Eradicated                                                                                     | Terminator Unit 90 %                                                                                                  |
| Break Item      | the item's strength | One item breaks; the MM7 engine picks any unbroken item the member carries (OE)                | Goblin King 10 %, Air Elemental 33 %, Acidic Ooze 36 %, Titan 65 %, Blue Dragon 90 %, Gold Dragon 100 % (16 types)    |
| Break Armour    | the item's strength | Worn armour or shield breaks (MM7 engine, OE)                                                  | Earth Spirit 30 %, Captain 33 %, Dwarf Lord 60 %                                                                      |
| Break Weapon    | the item's strength | A wielded weapon breaks (MM7 engine, OE)                                                       | Master Swordsman 24 %, Veteran 35 %, Guardian of VARN 65 %                                                            |
| Steal           | Accuracy effect     | One item goes to the thief; the MM7 engine picks any item and a monster holds two at most (OE) | Cutpurse 6 %, Bounty Hunter 10 %, Thief 16 %, Burglar 24 %, Rogue 36 %                                                |
| Age             | magic resistance    | The member ages; one year a success in the MM7 engine (OE)                                     | Evil Spirit 26 %, Harpy Witch 57 %                                                                                    |
| Drain SP        | magic resistance    | Spell points drained; to zero in the MM7 engine (OE)                                           | Grand Druid 28 %, Devil Warrior 60 %, Devil King 70 %                                                                 |
| Afraid          | Endurance effect    | Afraid                                                                                         | Ghost 9 %, Skeleton Knight 10 %, Death Knight 40 %, Efreet 55 %, Cuisinart 80 %                                       |

- How MM6 measures an item's strength is unverified (the MM7 engine uses
  three times a rarity figure of the item; OE). Whether a thief runs off
  after stealing is unverified. In the original a stolen item could not be
  taken back from the thief's body; the patch allows it (GF-P). No source
  shows an MM6 monster stealing gold; pickpocketing came with MM7 (CH).
- How many years Age adds and how much Drain SP takes in MM6 are
  unverified.
- Project: every condition exists (`src/game/conditions.ts`), but Poison
  and Disease are one condition each with a severity instead of MM6's
  three levels (GAP 10). `ItemInstance.broken` exists
  (`src/game/items.ts` line 261), `Character.age` and `Character.sp`
  exist (`src/game/character.ts` lines 47 and 52), and
  `removeItem` exists (`src/game/inventory.ts`). Nothing tries or saves.
- **Missing. M** for tries, saves and condition effects; **S** each for
  breaking, theft, aging and draining once item instances can be picked
  from (GAP 12).

### 2.7 Fleeing

- By AI type (MW6): a Wimp runs at 30 % of its hit points, Normal at
  20 %, Aggressive at 10 %; a Suicidal monster fights to the end.
- The MM7 engine differs for Wimps: they run as soon as they are hostile,
  or stand still if stationary; its enum notes that only peasants use the
  type (OE `MonsterEnums.h`). Normal and Aggressive match MW6, and a
  monster only flees while its target is within 10 240 units (about
  100 m). Any monster under Fear (the party's spell, MMX
  `const.MonsterBuff`) flees.
- Sources disagree on Wimps. CH reports that MM6's peasants (Wimps in
  MW6) fight back when attacked instead of running as they do in MM7 and
  MM8, which fits MW6's 30 % rule.
- A placed monster can carry `NoFlee` (MMX `const.MonsterBits`).
- Whether a fled monster comes back when healed is unverified.
- Project: no flight. **Missing. S** for the rule, **M** with a flee
  behaviour on the navmesh (move away, keep line of sight broken).

### 2.8 Hostility, aggro and waking

- In MM6 only peasants are peaceful towards the party, there are no town
  guards, and monsters never fight one another; raiders ignore peasants
  (CH).
- Each type has a hostility value from 0 (friendly) to 4 (MMX
  `HostileType`). MMX's example script makes Free Haven's archers
  friendly (0) and female peasants hostile (4) on one map. What 1 to 3
  mean in MM6 is unverified. The MM7 engine turns a peaceful monster on a
  target within 1024 units (about 10 m) for short hostility, 2560 (26 m)
  for medium and 5120 (51 m) for long, and at any distance for close
  (OE `Actor.cpp`).
- Peasants: harming one makes everyone around hostile; Charm or leaving
  the map calms them (MW6). Killing one turns the town against the party
  (LR). Harming them costs reputation (MM).
- Waking (MM7 engine, OE `MakeActorAIList_ODM`, `_BLV`): outdoors only
  monsters within 5632 units (about 56 m) think. Indoors a monster thinks
  within 10 240 units if it can see the party or shares its room, the
  nearest 30 first. A configurable cap limits full AI to the nearest
  ones. Hostiles within 5120 units raise a yellow alert, within melee
  reach a red one. MM6's own radius is unverified; the original stopped
  drawing far monsters in dungeons, which the patch lifts (GF-P).
- Groups: a placed monster has a group and an ally (MMX). Whether MM6
  wakes a whole group when one member is hit is unverified.
- Project: a monster idles until the party is within `aggroRange` (8 to
  12 m), then chases for ever (`src/world/monster.ts` line 151). Nobody is
  friendly, there are no groups, and the crowd holds at most 32 agents
  (`src/world/navigation.ts` line 77).
- **Present but deviates. M** (hostility and waking radii, peasants
  turning hostile, an AI budget by distance that fits the 32-agent crowd).

### 2.9 Choosing a party member

- A type may prefer classes (Knight, Paladin, Archer, Druid, Cleric,
  Sorcerer) and a sex (MMX `const.MonsterPref`; values MW6). 41 tiered
  types do. Sources disagree on how well class preferences worked in MM6:
  one CH reply insists they did and wonders whether they were buggy;
  another CH post says MM6 used only sex.
- Rule (MM7 engine, OE `which_player_to_attack`): take the members who
  match any preference and are not Paralyzed, Unconscious, Dead, Stoned or
  Eradicated, and pick one at random. If none matches, pick at random from
  all members not in those conditions.
- `PrefNum`: one blow hits that many members (MMX). MW6 gives 2, 3 or 4
  for 26 tiered types; every dragon hits four. Whether each struck member
  gets its own to-hit roll is unverified.
- MW6's author judges the preferences weak in play (an opinion).
- Project: `randomLivingIndex` (`src/game/party.ts` line 220) picks a
  conscious member uniformly, paralysed ones included. DESIGN 14.2's note
  that "MM6 favours the front row" does not match any source; MM6's
  party has no rows (GAP 9).
- **Present but deviates. S.**

### 2.10 Spawns, groups and refills

- Each map names three monster families (MMX `structs.MapStatsItem`:
  `Monster1Pic` to `Monster3Pic`), a difficulty and a count range for
  each (`Mon1Dif`, `Mon1Low`, `Mon1Hi`), a refill period (`RefillDays`),
  a treasure level and encounter chances.
- A spawn point (MM7 engine, OE `SpawnEncounter`) names monster 1, 2 or 3
  with a random tier, or one of them at a fixed tier. A random point
  spawns between the low and high count. The tier comes from the
  difficulty:

| Difficulty | A    | B    | C    |
| ---------- | ---- | ---- | ---- |
| 1          | 90 % | 8 %  | 2 %  |
| 2          | 70 % | 20 % | 10 % |
| 3          | 50 % | 30 % | 20 % |
| 4          | 30 % | 40 % | 30 % |
| 5          | 10 % | 50 % | 40 % |

- (MM7 engine, OE table `word_4E8152`; MM6 unverified.) Spawned monsters
  scatter within 64 units indoors or 128 outdoors and are tethered to
  256 units of their point (OE).
- MM6: the game rolls the groups on the first visit and keeps them;
  reloading a save made before the first visit gives a new mix (MW6).
  Monsters released by events are fixed, such as the four Goblins that
  appear when the party crosses New Sorpigal's bridge (MW6).
- Refill (MM): the timer starts at the first visit. When it runs out the
  map's monsters and random treasure come back; placed treasure, most
  stat-raising drinks among it, does not. Dungeons refill after 24 months
  unless noted; outdoor maps after 6, 8 or 24 months; the Hive after
  7 days (MM, PK). Appendix A lists every map.
- The original restarted a map's timer on an early revisit, and late in
  the game let wells be used many times; the patch fixes both (GF-P).
- Uniques are placed by the map with their own numbers; Q is not in the
  monster table at all (CH).
- Project: spawn records (kind, position, facing) per level sidecar
  (`kernel/plan/level.ts` line 147, `kernel/terrain/build.ts`
  lines 251 and 334); one monster per record; no tiers, groups or
  counts; every monster returns on each page load and portal (GAP 9).
- **Missing. M** for groups, tiers and counts in the level format and the
  compiler; **M** for persistence and refill timers, which need the save
  slots of GAP step 4.

### 2.11 Death, experience and treasure

- A dead monster leaves a body the party clicks for gold and items (LR).
- Experience is shared equally among the conscious members (MW6). The
  project shares it among the living, unconscious ones included
  (`src/game/experience.ts` line 56): a small deviation.
- Gold is AdB (MW6). The item is a chance in percent, a level from 1 to 6
  and a type (MW6, MMX); random items by level are GAP 12.
- Original bug: gold dice counts above 255 wrap, so 300d10 becomes 44d10
  and 400d10 becomes 144d10 for the Noble and Supreme Titans and the Blue
  and Gold Dragons (MW6). Section 3 prints the wrapped values, as the
  game paid them.
- Original bug: Finger of Death gave no experience for its kills (GF-P).
- Uniques and quest variants carry quest items: the Spider Queen's heart,
  Ethric's Skull, the High Sorcerer and High Cleric keys, an Ankh, the
  Horn of Ros, the Pearl of Putrescence, Snergle's Axe and more (MW6).
- Bounty hunts: the town halls of New Sorpigal, the Misty Islands and
  Silver Cove each name a monster type a month; a kill pays gold and
  reputation of gold / 100 (PK). MW6 says the pay grows with the level;
  the amount is unverified.
- Project: a kill pays experience and counts for quests
  (`src/dev/index.ts` line 908); the body stays but holds nothing.
- **Partial. M** for treasure on bodies; the item side is GAP 12.

### 2.12 Monster spells and missiles

- 54 tiered types cast one of 19 spells, at Normal or Master rank with a
  skill from 1 to 25 (MW6, PK, MM agree):

| Spell           | School | Cast by (rank and skill)                                                                                                               | In the project    |
| --------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Flame Arrow     | Fire   | Apprentice Mage (N1)                                                                                                                   | no                |
| Fire Bolt       | Fire   | Goblin Shaman (N1), Goblin King (N2), the 1d9 cannibals' Witch Doctor (N2; 3.3), Novice Monk (N2), Devil Spawn (N4), Devil Worker (N8) | yes (`fire-bolt`) |
| Fireball        | Fire   | Fire Archer (N5), Devil Captain (N6), Grand Druid (M6), Terrible Eye (N8), Devil Warrior (N12), Efreet (M15)                           | no                |
| Meteor Shower   | Fire   | Devil Master (M10)                                                                                                                     | no                |
| Incinerate      | Fire   | Devil King, Demon Queen (M14)                                                                                                          | no                |
| Lightning Bolt  | Air    | Mage, Lizard Wizard (N2), Initiate Monk (N3), Sorcerer (M8), Magician, Minotaur Mage (M12), Djinn (M12), Warlock (M16)                 | no                |
| Cold Beam       | Water  | Journeyman Mage (N1)                                                                                                                   | no                |
| Ice Bolt        | Water  | Water Beast (N3), Water Spirit (N5), Master Monk (M6), Water Elemental (N7), Genie (M10)                                               | no                |
| Poison Spray    | Water  | Acidic Ooze (N4)                                                                                                                       | no                |
| Deadly Swarm    | Earth  | the 3d3 cannibals' Witch Doctor (N2; 3.3), Great Druid (N3)                                                                            | no                |
| Mind Blast      | Mind   | Mystic of Baa (N1), Agar's Pet (N10), Agar's Monster (N15), Agar's Abomination (N20)                                                   | no                |
| Psychic Shock   | Mind   | Defender (M7), Sentinel (M11), Guardian of VARN (M13), Gorgon (M9), Titans (M15, M18, M25)                                             | no                |
| Harm            | Body   | Druid (N2), Cleric of Baa (N3), Medusa (M12)                                                                                           | no                |
| Flying Fist     | Body   | Priest of Baa (N5)                                                                                                                     | no                |
| Paralyze        | Light  | Medusa Enchantress (M8)                                                                                                                | no                |
| Dispel Magic    | Light  | Lich, Greater Lich, Maddening Eye (N10)                                                                                                | no                |
| Toxic Cloud     | Dark   | Corrosive Ooze (M5)                                                                                                                    | no                |
| Mass Curse      | Dark   | Harpy Witch (N3)                                                                                                                       | no                |
| Finger of Death | Dark   | Minotaur King (N14), Q (N10)                                                                                                           | no                |

- A monster's spell presumably works as the party's spell at the
  monster's rank and skill: the table stores both, and a modder on CH
  expected Lightning Bolt at Master 10 to deal 10 to 80 (unverified). The
  formulas per spell are GAP 7.
- Original bugs: monster spells did Fire damage, and a monster's
  Paralyze did nothing (GF-P). Use the fixed behaviour.
- What a monster's Dispel Magic, Mass Curse or Finger of Death does to the
  party is unverified; read them as the party's spells turned round.
- Missiles: 78 tiered types have a ranged attack 1 or 2, each with a
  missile (MMX `MonsterAttackInfo.Missile`). MM6's missile list is
  unverified; MM7's is an arrow, a fire arrow and one bolt per school or
  energy (OE `MonsterProjectile`). The project's `spellfx.bolt` (22 m/s,
  45 m, `src/world/spellfx.ts` lines 92 and 93) can carry all of them
  with an element colour.
- **Missing. L**: missiles reuse `spellfx`; each spell reuses the party's
  code once GAP 7 has it.

### 2.13 Movement, flying and water

- Speeds run from 100 to 400 (MW6). Rats and blood suckers are fastest
  (300 to 400), oozes among the slowest (120 to 160); dragons move at 240
  to 300.
- No source gives the `Fly` flag per type. The likely flyers by body are
  bats, harpies, gargoyles, flying eyes, genies, ghosts, drakes, dragons
  and the winged Kreegans: all unverified. MM6's Fly spell works outdoors
  only (MMW extract), which suggests flying fights are an outdoor matter
  (an inference).
- Sea Serpents appear only on maps with open sea (MM). MM7 marks swimmers
  as a monster kind (MMX `MonsterKind`, MM7+); MM6 unverified.
- Monsters drop off ledges; in the original they jumped from bridges into
  lava, and the patch adds a 500-unit limit (GF-P).
- Idle wandering by move type (MM7 engine, OE): within 1024 units for
  short, 2560 medium, 5120 long, 10 240 free; stationary monsters stand.
- Project: a recast crowd agent per monster with walk and run gaits
  (`RUN_BEYOND` 5 m, `src/world/monster.ts` line 32); no wandering, no
  flying, no water rules.
- **Missing. L** for flyers (steering off the navmesh with height, and
  the party aiming up), **M** for wandering and water-bound monsters.

### 2.14 Animation and sound sets

- MM6 frame groups per type: stand, walk, attack, shoot, stun, die, dead,
  fidget and got hit (MMX `MonListItem`, `MapMonster.Frames`), drawn from
  eight angles with mirroring and timed in 1/32 s per frame (MMX
  `structs.SFTItem`). Sounds: attack, die, got hit, fidget (MMX).
- Map to the project's combat clips (`HUMANOID_CLIPS`,
  `kernel/characters/clips.ts`): stand → `idle`; walk → `walk`; attack →
  `attack_1` and `attack_2`; shoot → `cast`, or a new `shoot` clip for
  bow users (3 credits each, DESIGN 10.1); stun and got hit → `hit`; die
  and dead → `death`, which holds its last frame. MM6 has no run; ours is
  extra. Fidget has no clip yet; add one or vary `idle`.
- Non-humanoids need the same eight programs from DESIGN 10.2's
  procedural rigs: idle, move, attack, shoot, hit, death, dead (hold) and
  fidget.
- **Partial. M** for the sound set; the rigs are in section 4.

---

## 3. The roster

### 3.1 How to read the tables

- One family table and one stats table per group (3.6). The numbers are
  MW6's. HP, AC, experience, attacks, spells, specials and resistances
  agree across MW6, PK, MM and RPGC except where 3.3 says otherwise;
  levels agree between MW6 and PK. Speed, recovery, AI type, preferences,
  treasure, the chances of attack 2 and the spell, and the multipliers
  come from MW6 alone. They match every spot check: the three Goblins and
  the Apprentice Mage (M6W, MMW), the three Harpies (MMW), the Lich (MMW),
  Q (MMW) and the arena peasants (M6W).
- Tiers: A, B, C from left to right (MMX names them so).
- **Attack**: element and dice; "R" marks a missile (RPGC and MM, which
  agree on every flag). Attack 2 starts with its chance.
- **Spell**: chance, name, then N (Normal) or M (Master) and the skill.
- **Special**: the kind, then "×n" for a multiplier above 1. The try
  chance is level × n percent (2.6).
- **Resist F/E/C/P/M/Ph**: Fire, Elec, Cold, Poison, Magic, Phys; "I" is
  immune, "–" is no resistance at all. Energy is never resisted.
- **Speed/Rec**: MM6 units per second and recovery points (units note).
- **AI**: Wimp, Normal, Aggr (Aggressive), Suic (Suicidal); flee
  thresholds in 2.7.
- **Prefers**: classes or a sex the monster picks first, or "n at once"
  for a blow that hits n members (2.9).
- **Treasure**: gold dice, then the item chance, its level (L1 to L6) and
  its type; "misc" stands for MW6's catch-all for small items, "any" for
  no type given.
- **Moves** and the flying notes are this document's reading of the body;
  no source gives the flag per type (2.13).
- **Model route**: DESIGN 10.1 (Meshy image-to-3D plus the biped
  auto-rig) or 10.2 (procedural parts on pivots), or both.
- **Where**: the maps where MM and PK list the family; Appendix A has the
  same by map.

### 3.2 Rules the numbers follow

- Experience = L × (L + 10) for all 171 tiered types and, in MW6, for 18
  of the 23 one-offs.
- Hit points = ⌊L × (L + 30) / 10⌋ for all 171 tiered types and 12 of
  the one-offs. The exceptions are most uniques and the Warlock quest
  variant (350 instead of 400).
- MW6 says level sets hit points, experience and the bounty, and that a
  monster's resistances usually follow its own element, with undead immune
  to poison as the clearest case. The tables bear that out for the beasts:
  elementals, drakes, lizards and dragons are immune to their own element,
  spiders, cobras, oozes and wyrms to poison, and all three undead
  families to poison and magic. Human casters are not: Druids, Monks and
  Archers resist their own element only partly.
- Within every family the level rises from A to C and AC never falls
  (57 of 57). 48 families keep one attack element across their tiers;
  Druids, Liches and Monks are among those that change it. 21 families
  have a special attack at every tier, 15 only at C, 13 none.
- A data file can therefore store level, AC, attacks, resistances and
  behaviour, and derive HP and experience, with explicit values for the
  one-offs. The tables print both so either can be checked.

### 3.3 Where the sources disagree

- **RPGC is the outlier** on these; MW6, PK and MM agree with each other.
  The tables use the majority. RPGC gives the Swordsmen 3, 6 and 9 hit
  points (others 40, 79, 129); the Liches 56, 119 and 231 experience
  (others 600, 1200, 2000) and Fire for all three attacks (others Elec,
  Fire, Energy); the Greater Lich 4d8+16 (others 4d8+12); the Ghost
  family, the Medusa family and the Spiders lower dice (no +6, no +8 to
  +12, 2d2 for all spiders); the Soul Sucker 2d2, the King Cobra 2d3+4,
  the Patrol and Enforcer Units +5 and +10 (others +10, +15); the Oozes
  Phys instead of Poison; the Lesser Genie Phys instead of Cold; the
  Warlock Elec instead of Energy; the Earth Spirit Break Item instead of
  Break Armour; the Flying Eye 1300 experience (others 1200); the Djinn
  326 and the Efreet 465 hit points (others 325 and 467). RPGC also swaps
  the Blue and Gold Dragons' numbers.
- **Cannibals**: there are two families, one with 3d3 blows (Weak at B,
  Deadly Swarm at C) and one with 1d9 blows (Poison 1 at B, Fire Bolt at
  C). RPGC calls the 3d3 family male; MW6, which matches rows to sprite
  files, calls it female. PK lists only the 3d3 family, MM both without a
  sex. The tables follow MW6.
- **Peasants**: RPGC's male peasants (13, 17, 21 hit points) are MW6's
  arena men, not the town men (3, 6, 9).
- **Uniques**: levels differ between MW6 and PK for seven (Rogue Leader
  27 or 25, Snergle 20 or 27, Werewolf Leader 60 or 50, Lurch 79 or 85,
  Agar 40 or 50, Lich King 40 or 60, Lesser Genie 22 or 25). PK, MM and
  RPGC give no experience for seven uniques where MW6 gives the matching
  tier's (Rogue Leader, Snergle, Werewolf Leader, Fallen Defender, Devil
  of Baa, Queen Spider, Lesser Genie); Agar gives 11 000 in three sources
  and 2000 in MW6. For nine uniques the walkthroughs swap the magic and
  physical resistances against MW6 (MM also for the Demon Queen, where PK
  sides with MW6). The MMW extract for Q (immune to magic) and the family
  patterns favour MW6. Treat every unique number as unverified; the maps
  set them (CH).
- **Quest variants**: MW6 alone lists six; it says they only melee, so
  the tables drop their missiles.
- **Names**: Vampire Bat (MW6, PK, MM) or Vampiric Bat (RPGC); Lightning
  Lizard (RPGC misspells it); Agar's Abomination (RPGC misspells it);
  Specter or Spectre; the Tomb of Ethric's Power Lich is named Ethric in
  versions 1.1 and 1.2 (MW6).

### 3.4 What the project already has

| Project kind             | Model on disk                         | MM6 family it can serve                       | Notes                                                                                                                                     |
| ------------------------ | ------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `goblin-scout`           | `assets/characters/goblin-scout/`     | Goblin (A to C with tints)                    | Project: level 1, 14 HP, 1d4+1. MM6 Goblin: level 4, 13 HP, 1d9, Wimp.                                                                    |
| `skeleton-warrior`       | `assets/characters/skeleton-warrior/` | Skeleton                                      | Project: level 3, 32 HP, placed nowhere. MM6 Skeleton: level 6, 21 HP, 3d4, immune to poison and magic.                                   |
| `bandit`                 | `assets/characters/bandit/`           | Cutpurse (levels 3, 5, 7) or Thug (8, 14, 22) | No MM6 "bandit". The Cutpurse family is the early one and steals; pick by look.                                                           |
| `villager-man`, `-woman` | `assets/characters/villager-*/`       | Peasant (man), Peasant (woman)                | Civilian clip set only (idle, walk, talk). MM6 peasants fight back when hit (CH): add the combat clips on the existing rig (DESIGN 10.1). |
| `nomad-raider`           | `assets/characters/nomad-raider/`     | none                                          | MM6's desert holds lizards, wyrms and dragons. Keep it as the project's own or retire it.                                                 |

All six are Meshy humanoids (`assets/manifest.json`, batches 002 and 005).
No non-humanoid model exists.

### 3.5 Bodies and tints

- **Meshy humanoid as is (33 families)**: the four peasant families,
  Cutpurse, Thief, Thug, both Cannibals, Archer, Swordsman, Dwarf, Guard,
  Fighter, Magyar, Death Knight, Mage, Follower of Baa, Acolyte of Baa,
  Monk, Druid, Sorcerer, Goblin, Lizard Man, Ogre, Werewolf, Defender of
  VARN, Minotaur, Titan, Skeleton, Lich, Medusa and Devil Spawn. The
  goblin scout and the skeleton warrior went through Meshy's biped rig and
  play in the dev build (DESIGN 16.2), so non-human heads work. Test one
  very large body (Titan or Ogre) and one tailed body (Lizard Man) before
  a batch.
- **Humanoid plus procedural parts (5)**: Ghost, Harpy, Gargoyle, Genie
  and Devil Captain: a biped rig with wings, a tail or a vapour lower
  body moved by DESIGN 10.2's pivot programs. What these bodies look like
  below the waist is unverified.
- **Procedural rig (19)**: Rat, Blood Sucker, Bat, Spider, Cobra, Ooze,
  Agar's Pet (PK calls them cockatrices), Flying Eye (PK: beholders), the
  four elementals, Drake, Sea Serpent, Fire Lizard, Hydra, Wyrm, Dragon
  and Patrol Unit (spheres, LR). Plus two unique bodies: the Demon Queen
  (shape unverified) and the Reactor (a machine; MW6 gives it speed 100,
  whether it moves is unverified).
- **Tints**: MM6 shows one picture per tier (MW6) and gives every
  sprite-frame group a palette id (MMX `structs.SFTItem`). One model per
  family with three colourings therefore matches MM6; that no family's
  tiers differ in shape is unverified. The project bakes each albedo into
  a posterised bitmap (`src/render/bitmap.ts`); a per-tier colour ramp
  applied at that step, or a tint uniform beside the existing `flash`
  one, costs S to M.
- **Count**: 57 family models plus two unique bodies. Uniques and quest
  variants reuse their family's model (MW6 shows each with a family
  picture).

### 3.6 Families and stats by group

#### Townsfolk

| Family                | Tiers (A, B, C)                                                           | Body  | Model route (DESIGN)  | Moves | One model, three tints | Where in MM6 (MM, PK)                                  |
| --------------------- | ------------------------------------------------------------------------- | ----- | --------------------- | ----- | ---------------------- | ------------------------------------------------------ |
| Peasant (man)         | Peasant (man) A, Peasant (man) B, Peasant (man) C                         | human | Meshy humanoid (10.1) | walks | yes                    | every town; 48 named ones in New World Computing (MW6) |
| Peasant (woman)       | Peasant (woman) A, Peasant (woman) B, Peasant (woman) C                   | human | Meshy humanoid (10.1) | walks | yes                    | every town; 48 named ones in New World Computing (MW6) |
| Arena peasant (man)   | Arena peasant (man) A, Arena peasant (man) B, Arena peasant (man) C       | human | Meshy humanoid (10.1) | walks | yes                    | the Arena only (MW6)                                   |
| Arena peasant (woman) | Arena peasant (woman) A, Arena peasant (woman) B, Arena peasant (woman) C | human | Meshy humanoid (10.1) | walks | yes                    | the Arena only (MW6)                                   |

| Tier                    | Lv  | HP  | AC  | XP  | Attack 1   | Attack 2 | Spell | Special | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers | Treasure   |
| ----------------------- | --- | --- | --- | --- | ---------- | -------- | ----- | ------- | ------------------- | --------- | ------ | ------- | ---------- |
| Peasant (man) A         | 1   | 3   | 3   | 11  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 2d6 gold   |
| Peasant (man) B         | 2   | 6   | 5   | 24  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 3d6 gold   |
| Peasant (man) C         | 3   | 9   | 6   | 39  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 4d6 gold   |
| Peasant (woman) A       | 1   | 3   | 3   | 11  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 3d3 gold   |
| Peasant (woman) B       | 2   | 6   | 5   | 24  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 4d4 gold   |
| Peasant (woman) C       | 3   | 9   | 6   | 39  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 8d8 gold   |
| Arena peasant (man) A   | 4   | 13  | 4   | 56  | Phys 2d2   | –        | –     | –       | –                   | 140/50    | Wimp   | –       | 5d20 gold  |
| Arena peasant (man) B   | 5   | 17  | 6   | 75  | Phys 2d2+2 | –        | –     | –       | –                   | 140/50    | Normal | –       | 7d20 gold  |
| Arena peasant (man) C   | 6   | 21  | 8   | 96  | Phys 2d2+4 | –        | –     | –       | –                   | 140/50    | Normal | –       | 10d20 gold |
| Arena peasant (woman) A | 1   | 3   | 3   | 11  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 2d6 gold   |
| Arena peasant (woman) B | 2   | 6   | 5   | 24  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 3d6 gold   |
| Arena peasant (woman) C | 3   | 9   | 6   | 39  | Phys 2d2   | –        | –     | –       | –                   | 140/100   | Wimp   | –       | 4d6 gold   |

#### Human warriors and rogues

| Family           | Tiers (A, B, C)                                          | Body                    | Model route (DESIGN)  | Moves | One model, three tints | Where in MM6 (MM, PK)                                                         |
| ---------------- | -------------------------------------------------------- | ----------------------- | --------------------- | ----- | ---------------------- | ----------------------------------------------------------------------------- |
| Cutpurse         | Cutpurse, Bounty Hunter, Assassin                        | human                   | Meshy humanoid (10.1) | walks | yes                    | The Misty Islands; Free Haven Sewers; Shadow Guild                            |
| Thief            | Thief, Burglar, Rogue                                    | human                   | Meshy humanoid (10.1) | walks | yes                    | Shadow Guild Hideout; Free Haven Sewers; Shadow Guild                         |
| Thug             | Thug, Ruffian, Brigand                                   | human                   | Meshy humanoid (10.1) | walks | yes                    | Dragoons' Caverns; Shadow Guild Hideout; Warlord's Fortress                   |
| Cannibal (man)   | Cannibal male, Head Hunter male, Witch Doctor male       | human                   | Meshy humanoid (10.1) | walks | yes                    | Bootleg Bay; Temple of Tsantsa                                                |
| Cannibal (woman) | Cannibal female, Head Hunter female, Witch Doctor female | human                   | Meshy humanoid (10.1) | walks | yes                    | Bootleg Bay; Temple of Tsantsa                                                |
| Archer           | Archer, Master Archer, Fire Archer                       | human, elven look (MW6) | Meshy humanoid (10.1) | walks | yes                    | Free Haven; Frozen Highlands                                                  |
| Swordsman        | Swordsman, Expert Swordsman, Master Swordsman            | human                   | Meshy humanoid (10.1) | walks | yes                    | Silver Helm Outpost; Silver Helm Stronghold; Lair of the Wolf                 |
| Dwarf            | Dwarf, Dwarf Warrior, Dwarf Lord                         | short human             | Meshy humanoid (10.1) | walks | yes                    | Snergle's Caverns; Snergle's Iron Mines                                       |
| Guard            | Guard, Lieutenant, Captain                               | human                   | Meshy humanoid (10.1) | walks | yes                    | Silver Helm Outpost; Icewind Keep                                             |
| Fighter          | Fighter, Soldier, Veteran                                | human                   | Meshy humanoid (10.1) | walks | yes                    | Dragoons' Caverns; Dragoons' Keep; Warlord's Fortress; Silver Helm Stronghold |
| Magyar           | Magyar, Magyar Soldier, Magyar Matron                    | human                   | Meshy humanoid (10.1) | walks | yes                    | Frozen Highlands; Castle Alamos                                               |
| Death Knight     | Death Knight, Doom Knight, Cuisinart                     | armoured human          | Meshy humanoid (10.1) | walks | yes                    | Warlord's Fortress; Cave of the Dragon Riders                                 |

| Tier                | Lv  | HP  | AC  | XP   | Attack 1     | Attack 2         | Spell               | Special         | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers          | Treasure                   |
| ------------------- | --- | --- | --- | ---- | ------------ | ---------------- | ------------------- | --------------- | ------------------- | --------- | ------ | ---------------- | -------------------------- |
| Cutpurse            | 3   | 9   | 3   | 39   | Phys 2d2+3   | –                | –                   | Steal ×2        | –                   | 200/100   | Normal | –                | 3d6 gold; 10% L1 dagger    |
| Bounty Hunter       | 5   | 17  | 5   | 75   | Phys 2d2+5   | –                | –                   | Steal ×2        | –                   | 220/100   | Aggr   | –                | 5d6 gold; 20% L1 dagger    |
| Assassin            | 7   | 25  | 10  | 119  | Phys 2d2+10  | –                | –                   | Dead            | –                   | 240/90    | Aggr   | –                | 10d6 gold; 50% L2 dagger   |
| Thief               | 8   | 30  | 10  | 144  | Phys 3d4+3   | 20% Phys 3d4+1 R | –                   | Steal ×2        | –                   | 250/60    | Wimp   | –                | 3d10 gold; 5% L1 any       |
| Burglar             | 12  | 50  | 14  | 264  | Phys 3d4+6   | 20% Phys 3d4+3 R | –                   | Steal ×2        | –                   | 260/60    | Normal | –                | 4d10 gold; 10% L1 any      |
| Rogue               | 18  | 86  | 20  | 504  | Phys 3d4+12  | 20% Phys 3d4+6 R | –                   | Steal ×2        | –                   | 270/60    | Aggr   | –                | 5d10 gold; 20% L2 cloak    |
| Thug                | 8   | 30  | 12  | 144  | Phys 2d4+1   | –                | –                   | –               | –                   | 200/100   | Normal | –                | 3d20 gold; 5% L1 leather   |
| Ruffian             | 14  | 61  | 14  | 336  | Phys 2d4+5   | –                | –                   | –               | –                   | 220/90    | Aggr   | Archer, Sorcerer | 5d20 gold; 5% L2 leather   |
| Brigand             | 22  | 114 | 16  | 704  | Phys 2d4+10  | 10% Phys 2d4+20  | –                   | –               | 5/5/5/5/5/5         | 240/80    | Aggr   | Archer, Sorcerer | 10d20 gold; 10% L3 leather |
| Cannibal male       | 6   | 21  | 5   | 96   | Phys 1d9+2   | –                | –                   | –               | –                   | 220/90    | Suic   | –                | 2d6 gold; 5% L1 spear      |
| Head Hunter male    | 8   | 30  | 7   | 144  | Phys 1d9+4   | –                | –                   | Poison 1        | –                   | 250/90    | Suic   | –                | 4d6 gold; 10% L1 spear     |
| Witch Doctor male   | 10  | 40  | 9   | 200  | Phys 1d9+6   | –                | 30% Fire Bolt N2    | –               | 5/5/5/5/5/0         | 280/80    | Suic   | –                | 6d6 gold; 5% L2 ring       |
| Cannibal female     | 6   | 21  | 5   | 96   | Phys 3d3+2   | –                | –                   | –               | –                   | 220/90    | Suic   | –                | 2d6 gold; 5% L1 shield     |
| Head Hunter female  | 8   | 30  | 7   | 144  | Phys 3d3+4   | –                | –                   | Weak            | –                   | 250/90    | Suic   | –                | 4d6 gold; 10% L1 shield    |
| Witch Doctor female | 10  | 40  | 9   | 200  | Phys 3d3+6   | –                | 30% Deadly Swarm N2 | –               | 5/5/5/5/5/0         | 280/80    | Suic   | –                | 6d6 gold; 5% L1 amulet     |
| Archer              | 9   | 35  | 14  | 171  | Phys 1d6+1 R | –                | –                   | –               | 10/10/10/10/0/0     | 140/90    | Normal | –                | 3d20 gold; 5% L1 bow       |
| Master Archer       | 19  | 93  | 16  | 551  | Phys 2d6+2 R | 20% Fire 3d6 R   | –                   | –               | 20/20/20/20/0/0     | 150/90    | Aggr   | Archer           | 6d20 gold; 5% L2 bow       |
| Fire Archer         | 29  | 171 | 22  | 1131 | Phys 3d6+3 R | 30% Fire 4d6 R   | 40% Fireball N5     | –               | 30/30/30/30/10/0    | 160/80    | Aggr   | Archer           | 10d20 gold; 10% L3 bow     |
| Swordsman           | 10  | 40  | 10  | 200  | Phys 3d7+4   | –                | –                   | –               | 5/5/5/5/5/5         | 220/90    | Aggr   | –                | 10d10 gold; 5% L1 sword    |
| Expert Swordsman    | 17  | 79  | 15  | 459  | Phys 3d7+6   | –                | –                   | –               | 10/5/5/5/5/5        | 250/80    | Aggr   | –                | 15d10 gold; 5% L2 sword    |
| Master Swordsman    | 24  | 129 | 20  | 816  | Phys 3d7+8   | 20% Phys 3d7+20  | –                   | Break Weapon    | 15/10/10/10/10/10   | 280/70    | Aggr   | 2 at once        | 30d10 gold; 10% L3 sword   |
| Dwarf               | 10  | 40  | 6   | 200  | Phys 4d2+4   | 20% Phys 8d2+8   | –                   | –               | 20/20/20/I/30/0     | 160/70    | Normal | –                | 5d10 gold; 5% L1 any       |
| Dwarf Warrior       | 20  | 100 | 12  | 600  | Phys 4d2+8   | 20% Phys 8d2+16  | –                   | –               | 30/30/30/I/40/0     | 180/80    | Aggr   | –                | 10d10 gold; 10% L2 axe     |
| Dwarf Lord          | 30  | 180 | 20  | 1200 | Phys 4d2+16  | 20% Phys 8d2+32  | –                   | Break Armour ×2 | 40/40/40/I/50/0     | 200/80    | Suic   | Sorcerer         | 20d10 gold; 25% L3 axe     |
| Guard               | 11  | 45  | 16  | 231  | Phys 3d3+5   | –                | –                   | –               | 5/5/5/5/5/5         | 200/90    | Normal | –                | 3d20 gold; 5% L1 armour    |
| Lieutenant          | 19  | 93  | 24  | 551  | Phys 3d3+10  | 10% Phys 3d3+20  | –                   | –               | 10/10/10/10/10/10   | 220/90    | Normal | –                | 5d20 gold; 5% L2 armour    |
| Captain             | 33  | 207 | 32  | 1419 | Phys 3d3+20  | 10% Phys 3d3+40  | –                   | Break Armour    | 20/20/20/20/20/20   | 240/80    | Aggr   | –                | 10d20 gold; 10% L3 armour  |
| Fighter             | 14  | 61  | 18  | 336  | Phys 3d3+6   | –                | –                   | –               | 10/10/10/10/10/10   | 220/90    | Normal | –                | 10d10 gold; 5% L1 chain    |
| Soldier             | 24  | 129 | 24  | 816  | Phys 3d3+10  | –                | –                   | –               | 20/20/20/20/10/20   | 240/80    | Aggr   | Paladin, Cleric  | 20d10 gold; 5% L2 chain    |
| Veteran             | 35  | 227 | 30  | 1575 | Phys 3d3+14  | 20% Phys 3d3+45  | –                   | Break Weapon    | 30/30/30/30/10/30   | 260/70    | Aggr   | Paladin, Cleric  | 30d10 gold; 10% L3 chain   |
| Magyar              | 14  | 61  | 16  | 336  | Phys 3d7+3   | –                | –                   | –               | 20/20/20/20/0/10    | 260/80    | Aggr   | –                | 5d10 gold; 5% L2 misc      |
| Magyar Soldier      | 25  | 137 | 22  | 875  | Phys 3d7+6   | 10% Phys 3d7+18  | –                   | –               | 30/30/30/30/0/20    | 280/70    | Aggr   | Sorcerer         | 10d10 gold; 5% L3 misc     |
| Magyar Matron       | 37  | 247 | 28  | 1739 | Phys 3d7+12  | 20% Elec 7d8 R   | –                   | –               | 50/50/50/50/0/30    | 300/60    | Suic   | Sorcerer         | 20d10 gold; 10% L4 misc    |
| Death Knight        | 40  | 280 | 45  | 2000 | Phys 4d5+20  | 20% Magic 4d6 R  | –                   | Afraid          | 20/20/20/20/20/10   | 250/80    | Normal | –                | 10d100 gold; 10% L4 plate  |
| Doom Knight         | 60  | 540 | 65  | 4200 | Phys 4d5+30  | 20% Magic 6d6 R  | –                   | Afraid          | 30/30/30/30/30/20   | 300/70    | Aggr   | 2 at once        | 20d100 gold; 10% L5 plate  |
| Cuisinart           | 80  | 880 | 85  | 7200 | Phys 4d5+40  | 20% Magic 8d6 R  | –                   | Afraid          | 50/50/50/50/50/30   | 350/50    | Aggr   | 3 at once        | 40d100 gold; 30% L6 plate  |

#### Human casters

| Family          | Tiers (A, B, C)                                | Body  | Model route (DESIGN)  | Moves | One model, three tints | Where in MM6 (MM, PK)                                                           |
| --------------- | ---------------------------------------------- | ----- | --------------------- | ----- | ---------------------- | ------------------------------------------------------------------------------- |
| Mage            | Apprentice Mage, Journeyman Mage, Mage         | human | Meshy humanoid (10.1) | walks | yes                    | New Sorpigal; Free Haven                                                        |
| Follower of Baa | Follower of Baa, Mystic of Baa, Fanatic of Baa | human | Meshy humanoid (10.1) | walks | yes                    | Castle Ironfist; The Misty Islands                                              |
| Acolyte of Baa  | Acolyte of Baa, Cleric of Baa, Priest of Baa   | human | Meshy humanoid (10.1) | walks | yes                    | Temple of Baa; Free Haven Sewers; Superior Temple of Baa; Supreme Temple of Baa |
| Monk            | Novice Monk, Initiate Monk, Master Monk        | human | Meshy humanoid (10.1) | walks | yes                    | Silver Helm Outpost; Temple of the Sun; Temple of the Fist                      |
| Druid           | Druid, Great Druid, Grand Druid                | human | Meshy humanoid (10.1) | walks | yes                    | Temple of the Moon; Silver Cove; Monolith; Superior Temple of Baa               |
| Sorcerer        | Sorcerer, Magician, Warlock                    | human | Meshy humanoid (10.1) | walks | yes                    | Gharik's Forge; Silver Helm Stronghold; Superior Temple of Baa; Castle Alamos   |

| Tier            | Lv  | HP  | AC  | XP   | Attack 1       | Attack 2 | Spell                  | Special  | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers        | Treasure                 |
| --------------- | --- | --- | --- | ---- | -------------- | -------- | ---------------------- | -------- | ------------------- | --------- | ------ | -------------- | ------------------------ |
| Apprentice Mage | 2   | 6   | 3   | 24   | Phys 2d4       | –        | 20% Flame Arrow N1     | –        | –                   | 140/100   | Wimp   | –              | 2d6 gold; 5% L1 staff    |
| Journeyman Mage | 6   | 21  | 5   | 96   | Phys 2d4+2     | –        | 30% Cold Beam N1       | –        | –                   | 140/100   | Normal | –              | 5d6 gold; 5% L1 staff    |
| Mage            | 10  | 40  | 7   | 200  | Phys 2d4+6     | –        | 50% Lightning Bolt N2  | –        | –                   | 140/100   | Aggr   | –              | 10d6 gold; 10% L1 misc   |
| Follower of Baa | 3   | 9   | 3   | 39   | Phys 2d4       | –        | –                      | –        | –                   | 140/100   | Normal | –              | 2d6 gold                 |
| Mystic of Baa   | 5   | 17  | 5   | 75   | Phys 2d4+2     | –        | 30% Mind Blast N1      | –        | –                   | 160/90    | Aggr   | –              | 3d6 gold; 5% L1 staff    |
| Fanatic of Baa  | 7   | 25  | 6   | 119  | Phys 2d4+4     | –        | –                      | –        | –                   | 200/70    | Suic   | –              | 4d6 gold; 5% L2 staff    |
| Acolyte of Baa  | 8   | 30  | 14  | 144  | Elec 2d4 R     | –        | –                      | –        | –                   | 160/90    | Wimp   | –              | 5d10 gold; 5% L1 mace    |
| Cleric of Baa   | 15  | 67  | 18  | 375  | Elec 2d4+4 R   | –        | 20% Harm N3            | –        | –                   | 180/90    | Normal | –              | 10d10 gold; 5% L2 mace   |
| Priest of Baa   | 25  | 137 | 22  | 875  | Elec 2d4+8 R   | –        | 30% Flying Fist N5     | –        | –                   | 200/80    | Aggr   | 2 at once      | 20d10 gold; 10% L3 misc  |
| Novice Monk     | 8   | 30  | 16  | 144  | Fire 2d4+2 R   | –        | 20% Fire Bolt N2       | –        | 10/0/0/0/0/0        | 200/100   | Normal | –              | 5% L1 amulet             |
| Initiate Monk   | 16  | 73  | 19  | 416  | Elec 2d4+8 R   | –        | 20% Lightning Bolt N3  | –        | 0/10/0/0/0/0        | 220/90    | Aggr   | –              | 5% L2 amulet             |
| Master Monk     | 27  | 153 | 28  | 999  | Cold 2d4+16 R  | –        | 20% Ice Bolt M6        | Weak     | 5/5/20/5/I/0        | 240/80    | Suic   | –              | 10% L3 amulet            |
| Druid           | 10  | 40  | 12  | 200  | Fire 2d4+3 R   | –        | 40% Harm N2            | –        | 10/10/10/10/10/0    | 160/90    | Normal | Knight         | 10d10 gold; 5% L1 misc   |
| Great Druid     | 16  | 73  | 16  | 416  | Cold 2d4+6 R   | –        | 40% Deadly Swarm N3    | –        | 20/20/20/20/20/0    | 180/90    | Aggr   | Knight         | 20d10 gold; 10% L2 misc  |
| Grand Druid     | 28  | 162 | 22  | 1064 | Magic 2d4+12 R | –        | 30% Fireball M6        | Drain SP | 30/30/30/30/30/0    | 200/80    | Aggr   | 2 at once      | 50d10 gold; 20% L3 misc  |
| Sorcerer        | 25  | 137 | 14  | 875  | Elec 9d4 R     | –        | 20% Lightning Bolt M8  | –        | 10/I/10/10/10/0     | 200/90    | Aggr   | Knight, Archer | 10d10 gold; 10% L2 staff |
| Magician        | 35  | 227 | 18  | 1575 | Elec 12d4 R    | –        | 20% Lightning Bolt M12 | –        | 20/I/20/20/20/0     | 220/80    | Aggr   | 2 at once      | 20d10 gold; 10% L3 staff |
| Warlock         | 50  | 400 | 30  | 3000 | Ener 16d4 R    | –        | 20% Lightning Bolt M16 | Insane   | 30/I/30/30/30/0     | 240/70    | Aggr   | 2 at once      | 40d10 gold; 20% L5 staff |

#### Humanoid monsters

| Family           | Tiers (A, B, C)                                      | Body                                    | Model route (DESIGN)  | Moves | One model, three tints | Where in MM6 (MM, PK)                                                 |
| ---------------- | ---------------------------------------------------- | --------------------------------------- | --------------------- | ----- | ---------------------- | --------------------------------------------------------------------- |
| Goblin           | Goblin, Goblin Shaman, Goblin King                   | small biped                             | Meshy humanoid (10.1) | walks | yes                    | New Sorpigal; Goblinwatch; Hall of the Fire Lord                      |
| Lizard Man       | Lizard Man, Lizard Archer, Lizard Wizard             | reptile biped                           | Meshy humanoid (10.1) | walks | yes                    | Castle Ironfist; Bootleg Bay                                          |
| Ogre             | Ogre, Ogre Raider, Ogre Chieftain                    | large biped                             | Meshy humanoid (10.1) | walks | yes                    | Hall of the Fire Lord; Castle Darkmoor; Icewind Keep                  |
| Werewolf         | Wolfman, Werewolf, Greater Werewolf                  | wolf-headed biped                       | Meshy humanoid (10.1) | walks | yes                    | Blackshire; Lair of the Wolf                                          |
| Defender of VARN | Defender of VARN, Sentinel of VARN, Guardian of VARN | jackal-headed biped (Pike: "Jackalmen") | Meshy humanoid (10.1) | walks | yes                    | Tomb of VARN                                                          |
| Minotaur         | Minotaur, Minotaur Mage, Minotaur King               | bull-headed biped                       | Meshy humanoid (10.1) | walks | yes                    | Temple of the Sun (Minotaur King only); Kriegspire; Castle Kriegspire |
| Titan            | Titan, Noble Titan, Supreme Titan                    | giant biped                             | Meshy humanoid (10.1) | walks | yes                    | Hermit's Isle; Paradise Valley                                        |

| Tier             | Lv  | HP   | AC  | XP   | Attack 1        | Attack 2       | Spell                   | Special      | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers         | Treasure                 |
| ---------------- | --- | ---- | --- | ---- | --------------- | -------------- | ----------------------- | ------------ | ------------------- | --------- | ------ | --------------- | ------------------------ |
| Goblin           | 4   | 13   | 6   | 56   | Phys 1d9        | –              | –                       | –            | –                   | 160/100   | Wimp   | –               | 4d4 gold                 |
| Goblin Shaman    | 6   | 21   | 10  | 96   | Phys 1d9+2      | –              | 10% Fire Bolt N1        | –            | –                   | 170/100   | Normal | –               | 8d4 gold                 |
| Goblin King      | 10  | 40   | 14  | 200  | Phys 1d9+4      | –              | 30% Fire Bolt N2        | Break Item   | 10/10/10/10/10/10   | 180/90    | Aggr   | Druid           | 15d4 gold; 10% L1 any    |
| Lizard Man       | 4   | 13   | 10  | 56   | Phys 1d6 R      | –              | –                       | –            | –                   | 140/100   | Wimp   | –               | 4d8 gold; 5% L1 bow      |
| Lizard Archer    | 7   | 25   | 15  | 119  | Phys 1d6+2 R    | 20% Fire 2d6 R | –                       | –            | –                   | 150/100   | Normal | –               | 6d8 gold; 5% L1 bow      |
| Lizard Wizard    | 11  | 45   | 20  | 231  | Phys 1d6+5 R    | –              | 50% Lightning Bolt N2   | –            | 10/10/10/10/0/0     | 160/90    | Aggr   | Archer          | 10d8 gold; 5% L2 bow     |
| Ogre             | 15  | 67   | 12  | 375  | Phys 2d5+10     | –              | –                       | –            | –                   | 240/90    | Aggr   | –               | 10d10 gold; 5% L1 weapon |
| Ogre Raider      | 20  | 100  | 14  | 600  | Phys 2d5+15     | –              | –                       | –            | 10/10/10/10/10/10   | 260/80    | Aggr   | –               | 20d10 gold; 5% L2 weapon |
| Ogre Chieftain   | 28  | 162  | 16  | 1064 | Phys 2d5+25     | –              | –                       | Poison 2     | 20/20/20/20/20/20   | 280/70    | Aggr   | 2 at once       | 30d10 gold; 5% L3 weapon |
| Wolfman          | 20  | 100  | 20  | 600  | Phys 2d12+12    | –              | –                       | Disease 2 ×2 | 5/5/5/5/5/5         | 300/90    | Aggr   | Paladin, Cleric | 5d20 gold; 10% L3 misc   |
| Werewolf         | 30  | 180  | 25  | 1200 | Phys 2d12+16    | –              | –                       | Disease 3 ×2 | 10/10/10/10/10/10   | 320/80    | Aggr   | Paladin, Cleric | 10d20 gold; 10% L4 misc  |
| Greater Werewolf | 40  | 280  | 30  | 2000 | Phys 2d12+20    | –              | –                       | Unconscious  | 15/15/15/15/15/15   | 350/70    | Suic   | Paladin, Cleric | 20d20 gold; 10% L5 misc  |
| Defender of VARN | 35  | 227  | 40  | 1575 | Phys 3d6+20     | 20% Ener 5d6 R | 20% Psychic Shock M7    | –            | 20/20/20/20/I/10    | 220/60    | Normal | –               | 100d10 gold              |
| Sentinel of VARN | 55  | 467  | 50  | 3575 | Phys 3d6+35     | 20% Ener 6d6 R | 20% Psychic Shock M11   | –            | 30/30/30/30/I/20    | 240/60    | Aggr   | –               | 150d10 gold              |
| Guardian of VARN | 65  | 617  | 60  | 4875 | Phys 3d6+50     | 20% Ener 8d6 R | 20% Psychic Shock M13   | Break Weapon | I/I/I/I/I/30        | 280/60    | Aggr   | –               | 200d10 gold              |
| Minotaur         | 39  | 269  | 30  | 1911 | Phys 3d7+25     | –              | –                       | –            | 10/10/10/10/I/10    | 250/80    | Normal | –               | 10d20 gold; 10% L4 axe   |
| Minotaur Mage    | 59  | 525  | 35  | 4071 | Phys 3d7+40     | –              | 20% Lightning Bolt M12  | –            | 20/20/20/20/I/20    | 260/70    | Aggr   | –               | 20d20 gold; 10% L5 axe   |
| Minotaur King    | 79  | 861  | 40  | 7031 | Phys 3d7+60     | –              | 20% Finger of Death N14 | –            | 30/30/30/30/I/30    | 300/60    | Suic   | 2 at once       | 50d20 gold; 20% L6 axe   |
| Titan            | 65  | 617  | 60  | 4875 | Elec 2d20+60 R  | –              | 30% Psychic Shock M15   | Break Item   | 30/I/30/30/I/30     | 200/70    | Aggr   | Female          | 200d10 gold; 40% L5 any  |
| Noble Titan      | 75  | 787  | 70  | 6375 | Elec 2d20+80 R  | –              | 40% Psychic Shock M18   | Break Item   | 50/I/50/50/I/50     | 200/70    | Aggr   | Female          | 44d10 gold; 100% L5 any  |
| Supreme Titan    | 95  | 1187 | 80  | 9975 | Elec 2d20+120 R | –              | 50% Psychic Shock M25   | Dead         | 80/I/80/80/I/80     | 200/70    | Aggr   | Female          | 144d10 gold; 100% L6 any |

#### Undead

| Family   | Tiers (A, B, C)                          | Body                               | Model route (DESIGN)                               | Moves                | One model, three tints | Where in MM6 (MM, PK)                                                        |
| -------- | ---------------------------------------- | ---------------------------------- | -------------------------------------------------- | -------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| Skeleton | Skeleton, Skeleton Knight, Skeleton Lord | skeletal biped                     | Meshy humanoid (10.1)                              | walks                | yes                    | Temple of Baa; Corlagon's Estate; Tomb of Ethric the Mad; Mire of the Damned |
| Ghost    | Ghost, Evil Spirit, Specter              | floating spirit (unverified shape) | Meshy humanoid plus procedural parts (10.1 + 10.2) | floats? (unverified) | yes, with transparency | Corlagon's Estate; Tomb of Ethric the Mad; Mire of the Damned                |
| Lich     | Lich, Greater Lich, Power Lich           | robed biped                        | Meshy humanoid (10.1)                              | walks                | yes                    | Corlagon's Estate (Power Lich only); Tomb of Ethric the Mad; Castle Darkmoor |

| Tier            | Lv  | HP  | AC  | XP   | Attack 1      | Attack 2 | Spell                | Special     | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers          | Treasure                |
| --------------- | --- | --- | --- | ---- | ------------- | -------- | -------------------- | ----------- | ------------------- | --------- | ------ | ---------------- | ----------------------- |
| Skeleton        | 6   | 21  | 8   | 96   | Phys 3d4      | –        | –                    | –           | 0/0/0/I/I/0         | 220/100   | Aggr   | –                | 4d6 gold                |
| Skeleton Knight | 10  | 40  | 10  | 200  | Phys 3d4+2    | –        | –                    | Afraid      | 0/0/0/I/I/0         | 250/90    | Aggr   | –                | 7d6 gold                |
| Skeleton Lord   | 14  | 61  | 14  | 336  | Phys 3d4+6    | –        | –                    | Curse ×2    | 0/0/0/I/I/0         | 280/80    | Suic   | –                | 10d6 gold; 5% L2 sword  |
| Ghost           | 9   | 35  | 25  | 171  | Magic 1d6+6   | –        | –                    | Afraid      | 10/10/10/I/I/10     | 240/100   | Wimp   | –                | 5% L2 ring              |
| Evil Spirit     | 13  | 55  | 30  | 299  | Magic 2d6+6   | –        | –                    | Age ×2      | 15/15/15/I/I/15     | 260/90    | Normal | –                | 10% L3 ring             |
| Specter         | 19  | 93  | 35  | 551  | Magic 3d6+6   | –        | –                    | Unconscious | 20/20/20/I/I/20     | 300/90    | Suic   | –                | 20% L4 ring             |
| Lich            | 20  | 100 | 15  | 600  | Elec 3d8+6 R  | –        | 10% Dispel Magic N10 | –           | 10/10/10/I/I/0      | 180/90    | Aggr   | –                | 10d20 gold; 10% L3 misc |
| Greater Lich    | 30  | 180 | 20  | 1200 | Fire 4d8+12 R | –        | 10% Dispel Magic N10 | –           | 15/15/15/I/I/5      | 200/80    | Aggr   | Archer, Sorcerer | 15d20 gold; 10% L4 misc |
| Power Lich      | 40  | 280 | 25  | 2000 | Ener 5d8+20 R | –        | –                    | –           | 20/20/20/I/I/10     | 220/70    | Suic   | 2 at once        | 30d20 gold; 30% L5 misc |

#### Animals and vermin

| Family       | Tiers (A, B, C)                         | Body                            | Model route (DESIGN)                               | Moves                   | One model, three tints | Where in MM6 (MM, PK)                                                             |
| ------------ | --------------------------------------- | ------------------------------- | -------------------------------------------------- | ----------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| Rat          | Common Rat, Large Rat, Giant Rat        | quadruped                       | procedural rig (10.2)                              | walks                   | yes                    | Goblinwatch; Temple of Baa; Temple of the Fist; Dragoons' Keep; Free Haven Sewers |
| Blood Sucker | Blood Sucker, Brain Sucker, Soul Sucker | small vermin (shape unverified) | procedural rig (10.2)                              | unverified              | yes                    | Goblinwatch; Castle Ironfist                                                      |
| Bat          | Bat, Giant Bat, Vampire Bat             | winged flyer                    | procedural rig (10.2)                              | flies (unverified flag) | yes                    | Goblinwatch; Abandoned Temple; Snergle's Caverns                                  |
| Spider       | Spider, Giant Spider, Huge Spider       | eight legs                      | procedural rig (10.2)                              | walks                   | yes                    | Abandoned Temple; Temple of Baa                                                   |
| Cobra        | Cobra, King Cobra, Queen Cobra          | snake                           | procedural rig (10.2)                              | crawls                  | yes                    | Abandoned Temple; Temple of Tsantsa; Temple of the Moon                           |
| Ooze         | Ooze, Acidic Ooze, Corrosive Ooze       | blob                            | procedural rig (10.2)                              | creeps                  | yes                    | Dragoons' Caverns; Snergle's Iron Mines; Lair of the Wolf                         |
| Harpy        | Harpy, Harpy Hag, Harpy Witch           | winged woman                    | Meshy humanoid plus procedural parts (10.1 + 10.2) | flies? (unverified)     | yes                    | Mire of the Damned; Frozen Highlands                                              |

| Tier           | Lv  | HP  | AC  | XP  | Attack 1    | Attack 2       | Spell               | Special       | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers   | Treasure                |
| -------------- | --- | --- | --- | --- | ----------- | -------------- | ------------------- | ------------- | ------------------- | --------- | ------ | --------- | ----------------------- |
| Common Rat     | 2   | 6   | 4   | 24  | Phys 1d8    | –              | –                   | Disease 1 ×2  | –                   | 300/75    | Wimp   | –         | 2% L1 ring              |
| Large Rat      | 4   | 13  | 5   | 56  | Phys 1d8+2  | –              | –                   | Disease 1 ×2  | –                   | 350/75    | Normal | –         | 2% L1 ring              |
| Giant Rat      | 6   | 21  | 8   | 96  | Phys 1d8+6  | –              | –                   | Disease 2 ×2  | –                   | 400/75    | Aggr   | –         | 2% L1 ring              |
| Blood Sucker   | 2   | 6   | 6   | 24  | Phys 1d2    | –              | –                   | Disease 1 ×2  | –                   | 300/50    | Normal | –         | –                       |
| Brain Sucker   | 4   | 13  | 8   | 56  | Phys 1d2+2  | –              | –                   | Disease 1 ×5  | –                   | 350/50    | Aggr   | –         | 5% L1 ring              |
| Soul Sucker    | 8   | 30  | 10  | 144 | Phys 2d2+2  | –              | –                   | Disease 2 ×2  | –                   | 400/50    | Suic   | –         | 5% L2 ring              |
| Bat            | 3   | 9   | 5   | 39  | Phys 1d3    | –              | –                   | Disease 1     | –                   | 280/50    | Normal | –         | –                       |
| Giant Bat      | 6   | 21  | 8   | 96  | Phys 1d3+2  | –              | –                   | Disease 1     | –                   | 300/50    | Normal | –         | 5% L1 ring              |
| Vampire Bat    | 9   | 35  | 10  | 171 | Phys 2d3+2  | –              | –                   | Disease 2     | –                   | 320/50    | Aggr   | –         | 5% L2 ring              |
| Spider         | 5   | 17  | 10  | 75  | Phys 3d2    | –              | –                   | Poison 1 ×5   | 0/0/0/I/0/0         | 300/90    | Normal | –         | –                       |
| Giant Spider   | 8   | 30  | 12  | 144 | Phys 3d2+3  | 10% Pois 3d2 R | –                   | Poison 2 ×3   | 0/0/0/I/0/0         | 280/90    | Aggr   | –         | –                       |
| Huge Spider    | 12  | 50  | 16  | 264 | Phys 3d2+6  | 20% Pois 4d2 R | –                   | Poison 3 ×2   | 0/5/5/I/5/0         | 260/90    | Aggr   | –         | –                       |
| Cobra          | 5   | 17  | 10  | 75  | Phys 1d3+6  | 20% Pois 2d6   | –                   | Poison 1 ×5   | 0/0/0/I/0/0         | 300/70    | Normal | –         | 5% L1 misc              |
| King Cobra     | 10  | 40  | 12  | 200 | Phys 2d3+6  | 20% Pois 3d6   | –                   | Poison 1 ×5   | 0/0/0/I/0/0         | 270/70    | Aggr   | –         | 5% L2 misc              |
| Queen Cobra    | 14  | 61  | 16  | 336 | Phys 3d3+6  | 20% Pois 4d6   | –                   | Poison 2 ×2   | 0/0/0/I/0/0         | 240/50    | Suic   | –         | 10% L3 misc             |
| Ooze           | 12  | 50  | 8   | 264 | Pois 1d6    | –              | –                   | Poison 1 ×2   | 0/0/0/I/I/I         | 120/100   | Normal | 2 at once | 5% L2 any               |
| Acidic Ooze    | 18  | 86  | 10  | 504 | Pois 3d6    | –              | 20% Poison Spray N4 | Break Item ×2 | 0/0/0/I/I/I         | 140/100   | Suic   | 3 at once | 5% L3 any               |
| Corrosive Ooze | 25  | 137 | 12  | 875 | Pois 5d6    | –              | 20% Toxic Cloud M5  | Break Item ×2 | 0/0/0/I/I/I         | 160/100   | Suic   | 4 at once | 5% L4 any               |
| Harpy          | 14  | 61  | 12  | 336 | Phys 2d7+2  | –              | –                   | Drunk         | 0/0/0/0/10/0        | 250/90    | Aggr   | Male      | 4d10 gold               |
| Harpy Hag      | 17  | 79  | 14  | 459 | Phys 2d7+5  | –              | –                   | Curse ×3      | 0/0/0/0/20/0        | 300/90    | Aggr   | Male      | 6d10 gold               |
| Harpy Witch    | 19  | 93  | 16  | 551 | Phys 2d7+10 | –              | 10% Mass Curse N3   | Age ×3        | 0/0/0/0/30/0        | 350/80    | Suic   | Male      | 10d10 gold; 20% L2 ring |

#### Magical creatures

| Family     | Tiers (A, B, C)                                   | Body                                        | Model route (DESIGN)                               | Moves                    | One model, three tints         | Where in MM6 (MM, PK)                                     |
| ---------- | ------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- | ------------------------ | ------------------------------ | --------------------------------------------------------- |
| Agar's Pet | Agar's Pet, Agar's Monster, Agar's Abomination    | beast (Pike: "Cockatrices")                 | procedural rig (10.2)                              | walks                    | yes                            | Castle Kriegspire; Agar's Laboratory; Eel Infested Waters |
| Gargoyle   | Stone Gargoyle, Marble Gargoyle, Diamond Gargoyle | winged stone biped                          | Meshy humanoid plus procedural parts (10.1 + 10.2) | flies? (unverified)      | yes, as stone, marble, diamond | Silver Cove                                               |
| Flying Eye | Flying Eye, Terrible Eye, Maddening Eye           | floating eye (Pike: "Beholders")            | procedural rig (10.2)                              | floats (unverified flag) | yes                            | Castle Darkmoor; Agar's Laboratory                        |
| Genie      | Genie, Djinn, Efreet                              | humanoid upper body (lower body unverified) | Meshy humanoid plus procedural parts (10.1 + 10.2) | floats? (unverified)     | yes                            | Tomb of VARN                                              |
| Medusa     | Medusa, Medusa Enchantress, Gorgon                | woman with snake hair (body unverified)     | Meshy humanoid (10.1)                              | walks? (unverified)      | yes                            | Temple of the Moon; Temple of the Snake                   |

| Tier               | Lv  | HP  | AC  | XP   | Attack 1       | Attack 2 | Spell                  | Special  | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers         | Treasure                  |
| ------------------ | --- | --- | --- | ---- | -------------- | -------- | ---------------------- | -------- | ------------------- | --------- | ------ | --------------- | ------------------------- |
| Agar's Pet         | 13  | 55  | 13  | 299  | Phys 1d12      | –        | 30% Mind Blast N10     | Paralyze | 10/10/10/10/I/0     | 240/80    | Normal | Druid           | 4d20 gold                 |
| Agar's Monster     | 15  | 67  | 15  | 375  | Phys 1d12+6    | –        | 30% Mind Blast N15     | Paralyze | 20/20/20/20/I/0     | 260/80    | Aggr   | Druid           | 6d20 gold                 |
| Agar's Abomination | 17  | 79  | 17  | 459  | Phys 2d12+6    | –        | 30% Mind Blast N20     | Stone ×2 | 30/30/30/30/I/0     | 280/80    | Suic   | Druid           | 10d20 gold                |
| Stone Gargoyle     | 16  | 73  | 18  | 416  | Phys 2d12      | –        | –                      | Weak     | 10/10/10/I/10/20    | 300/80    | Aggr   | Cleric, Female  | 5d10 gold; 5% L2 amulet   |
| Marble Gargoyle    | 22  | 114 | 22  | 704  | Phys 2d12+4    | –        | –                      | Paralyze | 10/10/10/I/15/30    | 320/80    | Aggr   | Cleric, Female  | 10d10 gold; 10% L2 amulet |
| Diamond Gargoyle   | 33  | 207 | 26  | 1419 | Phys 2d12+8    | –        | –                      | Paralyze | 10/10/10/I/20/I     | 350/70    | Suic   | Cleric, Female  | 25d10 gold; 20% L3 amulet |
| Flying Eye         | 30  | 180 | 25  | 1200 | Cold 5d6 R     | –        | –                      | Asleep   | 20/20/I/0/I/30      | 140/70    | Aggr   | –               | 10% L4 ring               |
| Terrible Eye       | 40  | 280 | 30  | 2000 | Fire 6d6 R     | –        | 20% Fireball N8        | Afraid   | I/30/30/0/I/40      | 160/60    | Aggr   | –               | 20% L5 ring               |
| Maddening Eye      | 50  | 400 | 35  | 3000 | Elec 7d6 R     | –        | 20% Dispel Magic N10   | Insane   | 50/I/50/0/I/50      | 180/50    | Suic   | Druid, Sorcerer | 30% L6 ring               |
| Genie              | 33  | 207 | 35  | 1419 | Cold 8d4+8 R   | –        | 20% Ice Bolt M10       | –        | 0/30/I/30/I/30      | 200/60    | Aggr   | Male            | 30% L4 any                |
| Djinn              | 44  | 325 | 45  | 2376 | Elec 10d4+10 R | –        | 20% Lightning Bolt M12 | Asleep   | 30/I/30/0/I/30      | 220/50    | Aggr   | Male            | 30% L5 any                |
| Efreet             | 55  | 467 | 55  | 3575 | Fire 12d4+12 R | –        | 20% Fireball M15       | Afraid   | I/30/0/30/I/30      | 250/40    | Aggr   | Male            | 30% L6 any                |
| Medusa             | 35  | 227 | 20  | 1575 | Magic 4d4+8    | –        | 30% Harm M12           | Stone    | 0/0/0/0/I/0         | 200/80    | Normal | Knight          | 10d20 gold; 10% L3 misc   |
| Medusa Enchantress | 40  | 280 | 25  | 2000 | Magic 5d4+10   | –        | 30% Paralyze M8        | Stone    | 0/0/0/0/I/0         | 220/80    | Aggr   | Knight          | 15d20 gold; 10% L4 misc   |
| Gorgon             | 45  | 337 | 30  | 2475 | Magic 6d4+12   | –        | 30% Psychic Shock M9   | Stone    | 0/0/0/0/I/0         | 240/70    | Suic   | Knight          | 30d20 gold; 30% L5 misc   |

#### Elementals

| Family          | Tiers (A, B, C)                            | Body         | Model route (DESIGN)  | Moves               | One model, three tints | Where in MM6 (MM, PK)                 |
| --------------- | ------------------------------------------ | ------------ | --------------------- | ------------------- | ---------------------- | ------------------------------------- |
| Fire Elemental  | Fire Beast, Fire Spirit, Fire Elemental    | living flame | procedural rig (10.2) | unverified          | yes                    | Gharik's Forge; Supreme Temple of Baa |
| Air Elemental   | Dust Devil, Twister, Air Elemental         | whirlwind    | procedural rig (10.2) | unverified          | yes                    | Castle Alamos; Blackshire (PK)        |
| Water Elemental | Water Beast, Water Spirit, Water Elemental | living water | procedural rig (10.2) | unverified          | yes                    | Monolith; Eel Infested Waters         |
| Earth Elemental | Rock Beast, Earth Spirit, Earth Elemental  | living rock  | procedural rig (10.2) | walks? (unverified) | yes                    | Monolith; Kriegspire                  |

| Tier            | Lv  | HP  | AC  | XP   | Attack 1   | Attack 2        | Spell           | Special      | Resist F/E/C/P/M/Ph | Speed/Rec | AI   | Prefers  | Treasure   |
| --------------- | --- | --- | --- | ---- | ---------- | --------------- | --------------- | ------------ | ------------------- | --------- | ---- | -------- | ---------- |
| Fire Beast      | 13  | 55  | 12  | 299  | Fire 2d8 R | –               | –               | –            | I/10/10/I/I/10      | 200/90    | Suic | –        | –          |
| Fire Spirit     | 26  | 145 | 15  | 936  | Fire 5d8 R | –               | –               | –            | I/10/10/I/I/10      | 220/90    | Suic | –        | –          |
| Fire Elemental  | 39  | 269 | 18  | 1911 | Fire 8d8 R | –               | –               | Break Item   | I/10/10/I/I/10      | 240/80    | Suic | Sorcerer | –          |
| Dust Devil      | 16  | 73  | 10  | 416  | Elec 3d6 R | –               | –               | –            | 10/I/10/I/I/10      | 220/90    | Suic | –        | –          |
| Twister         | 22  | 114 | 12  | 704  | Elec 5d6 R | –               | –               | –            | 10/I/10/I/I/10      | 240/90    | Suic | –        | –          |
| Air Elemental   | 33  | 207 | 14  | 1419 | Elec 8d6 R | –               | –               | Break Item   | 10/I/10/I/I/10      | 260/80    | Suic | Sorcerer | –          |
| Water Beast     | 14  | 61  | 10  | 336  | Phys 3d12  | –               | 30% Ice Bolt N3 | –            | 10/10/I/I/I/10      | 240/80    | Suic | –        | –          |
| Water Spirit    | 24  | 129 | 13  | 816  | Phys 4d12  | –               | 30% Ice Bolt N5 | –            | 10/10/I/I/I/10      | 260/80    | Suic | –        | –          |
| Water Elemental | 36  | 237 | 16  | 1656 | Phys 6d12  | –               | 30% Ice Bolt N7 | Break Item   | 10/10/I/I/I/10      | 280/70    | Suic | Sorcerer | –          |
| Rock Beast      | 25  | 137 | 20  | 875  | Phys 10d3  | 40% Phys 8d3 R  | –               | –            | 10/10/10/I/I/10     | 220/90    | Suic | –        | 10d20 gold |
| Earth Spirit    | 30  | 180 | 25  | 1200 | Phys 15d3  | 40% Phys 12d3 R | –               | Break Armour | 10/10/10/I/I/10     | 240/90    | Suic | –        | 15d20 gold |
| Earth Elemental | 40  | 280 | 30  | 2000 | Phys 25d3  | 40% Phys 20d3 R | –               | Unconscious  | 10/10/10/I/I/10     | 260/80    | Suic | Sorcerer | 30d20 gold |

#### Reptiles and dragons

| Family      | Tiers (A, B, C)                               | Body              | Model route (DESIGN)  | Moves                               | One model, three tints        | Where in MM6 (MM, PK)                                                |
| ----------- | --------------------------------------------- | ----------------- | --------------------- | ----------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| Drake       | Flame Drake, Frost Drake, Energy Drake        | small dragon      | procedural rig (10.2) | flies? (unverified)                 | yes, fire, frost, energy      | Kriegspire; Castle Kriegspire                                        |
| Sea Serpent | Sea Serpent, Sea Monster, Sea Terror          | sea serpent       | procedural rig (10.2) | swims (water only, unverified flag) | yes                           | Eel Infested Waters; Hermit's Isle; Paradise Valley                  |
| Fire Lizard | Fire Lizard, Lightning Lizard, Thunder Lizard | giant lizard      | procedural rig (10.2) | walks                               | yes, fire, lightning, thunder | Blackshire; Dragonsands                                              |
| Hydra       | Hydra, Venomous Hydra, Colossal Hydra         | many heads        | procedural rig (10.2) | walks                               | yes                           | Hermit's Isle; Paradise Valley                                       |
| Wyrm        | Wyrm, Giant Wyrm, Great Wyrm                  | serpentine dragon | procedural rig (10.2) | unverified                          | yes                           | Cave of the Dragon Riders; Dragonsands                               |
| Dragon      | Red Dragon, Blue Dragon, Gold Dragon          | winged dragon     | procedural rig (10.2) | flies? (unverified)                 | yes, red, blue, gold          | Temple of the Snake (Gold Dragon only); Dragonsands; Paradise Valley |

| Tier             | Lv  | HP   | AC  | XP    | Attack 1       | Attack 2        | Spell | Special    | Resist F/E/C/P/M/Ph | Speed/Rec | AI   | Prefers   | Treasure                 |
| ---------------- | --- | ---- | --- | ----- | -------------- | --------------- | ----- | ---------- | ------------------- | --------- | ---- | --------- | ------------------------ |
| Flame Drake      | 24  | 129  | 20  | 816   | Fire 10d4 R    | –               | –     | –          | I/10/10/30/10/20    | 240/70    | Aggr | –         | 30d10 gold; 10% L3 any   |
| Frost Drake      | 28  | 162  | 25  | 1064  | Cold 12d4 R    | –               | –     | –          | 10/10/I/10/10/30    | 260/60    | Aggr | –         | 60d10 gold; 10% L4 any   |
| Energy Drake     | 32  | 198  | 30  | 1344  | Ener 15d4 R    | –               | –     | Break Item | 20/20/20/10/10/40   | 280/50    | Suic | –         | 100d10 gold; 20% L5 any  |
| Sea Serpent      | 28  | 162  | 30  | 1064  | Cold 1d20+25 R | –               | –     | –          | 5/0/I/0/5/0         | 200/90    | Aggr | –         | –                        |
| Sea Monster      | 36  | 237  | 35  | 1656  | Cold 1d20+35 R | –               | –     | –          | 10/0/I/0/10/0       | 200/90    | Aggr | –         | –                        |
| Sea Terror       | 48  | 374  | 40  | 2784  | Cold 1d20+45 R | –               | –     | Afraid     | 20/0/I/0/10/0       | 200/80    | Aggr | 2 at once | –                        |
| Fire Lizard      | 40  | 280  | 40  | 2000  | Fire 10d6 R    | –               | –     | –          | I/30/30/30/30/20    | 200/70    | Aggr | 2 at once | 100d10 gold; 20% L4 any  |
| Lightning Lizard | 50  | 400  | 50  | 3000  | Elec 12d6 R    | –               | –     | Break Item | 40/I/40/40/40/30    | 220/65    | Aggr | 2 at once | 150d10 gold; 20% L5 any  |
| Thunder Lizard   | 60  | 540  | 60  | 4200  | Cold 14d6 R    | –               | –     | Break Item | 50/50/I/50/50/40    | 240/60    | Aggr | 2 at once | 200d10 gold; 20% L5 any  |
| Hydra            | 45  | 337  | 22  | 2475  | Phys 15d5      | 30% Fire 8d5 R  | –     | –          | I/10/10/10/10/10    | 220/80    | Aggr | 2 at once | 50d10 gold; 100% L3 any  |
| Venomous Hydra   | 55  | 467  | 44  | 3575  | Phys 20d5      | 30% Pois 10d5 R | –     | Poison 3   | 20/20/20/I/20/20    | 240/80    | Aggr | 2 at once | 100d10 gold; 100% L4 any |
| Colossal Hydra   | 65  | 617  | 66  | 4875  | Phys 20d5      | 40% Ener 10d5 R | –     | Break Item | 30/30/30/30/30/30   | 260/80    | Aggr | 3 at once | 200d10 gold; 100% L5 any |
| Wyrm             | 50  | 400  | 40  | 3000  | Pois 10d10 R   | –               | –     | Poison 2   | 30/30/30/I/30/30    | 180/70    | Aggr | 2 at once | 100d10 gold; 100% L5 any |
| Giant Wyrm       | 60  | 540  | 50  | 4200  | Pois 10d10 R   | –               | –     | Poison 3   | 40/40/40/I/40/40    | 160/70    | Aggr | 3 at once | 150d10 gold; 100% L5 any |
| Great Wyrm       | 70  | 700  | 60  | 5600  | Pois 10d10 R   | –               | –     | Poison 3   | 50/50/50/I/50/50    | 140/70    | Aggr | 4 at once | 200d10 gold; 100% L6 any |
| Red Dragon       | 80  | 880  | 60  | 7200  | Fire 12d8 R    | –               | –     | –          | I/50/30/50/50/50    | 240/70    | Aggr | 4 at once | 250d10 gold; 100% L6 any |
| Blue Dragon      | 90  | 1080 | 80  | 9000  | Cold 14d8 R    | –               | –     | Break Item | 30/70/I/70/70/70    | 260/65    | Aggr | 4 at once | 44d10 gold; 100% L6 any  |
| Gold Dragon      | 100 | 1300 | 100 | 11000 | Ener 16d8 R    | –               | –     | Break Item | 90/90/90/90/I/90    | 300/60    | Aggr | 4 at once | 144d10 gold; 100% L6 any |

#### Kreegans (devils)

| Family        | Tiers (A, B, C)                          | Body                    | Model route (DESIGN)                               | Moves               | One model, three tints | Where in MM6 (MM, PK)                                                               |
| ------------- | ---------------------------------------- | ----------------------- | -------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Devil Spawn   | Devil Spawn, Devil Worker, Devil Warrior | Kreegan, wingless (MW6) | Meshy humanoid (10.1)                              | walks               | yes                    | Snergle's Iron Mines; Devil's Outpost; Supreme Temple of Baa; Sweet Water; The Hive |
| Devil Captain | Devil Captain, Devil Master, Devil King  | Kreegan, winged (MW6)   | Meshy humanoid plus procedural parts (10.1 + 10.2) | flies? (unverified) | yes                    | Sweet Water; The Hive                                                               |

| Tier          | Lv  | HP  | AC  | XP   | Attack 1    | Attack 2       | Spell                 | Special   | Resist F/E/C/P/M/Ph | Speed/Rec | AI   | Prefers | Treasure |
| ------------- | --- | --- | --- | ---- | ----------- | -------------- | --------------------- | --------- | ------------------- | --------- | ---- | ------- | -------- |
| Devil Spawn   | 20  | 100 | 20  | 600  | Phys 2d6+8  | 20% Fire 3d6 R | 20% Fire Bolt N4      | Disease 2 | I/20/20/20/20/50    | 200/70    | Aggr | –       | –        |
| Devil Worker  | 40  | 280 | 30  | 2000 | Phys 2d6+14 | 20% Fire 4d6 R | 20% Fire Bolt N8      | Disease 3 | I/30/30/30/30/50    | 250/60    | Aggr | –       | –        |
| Devil Warrior | 60  | 540 | 40  | 4200 | Phys 2d6+20 | 20% Fire 5d6 R | 20% Fireball N12      | Drain SP  | I/50/50/50/I/50     | 300/50    | Suic | –       | –        |
| Devil Captain | 30  | 180 | 25  | 1200 | Phys 2d8+10 | 20% Fire 3d8 R | 20% Fireball N6       | Disease 2 | I/30/30/30/30/50    | 250/60    | Aggr | –       | –        |
| Devil Master  | 50  | 400 | 35  | 3000 | Phys 2d8+15 | 20% Fire 4d8 R | 20% Meteor Shower M10 | Disease 3 | I/40/40/40/40/50    | 300/50    | Aggr | –       | –        |
| Devil King    | 70  | 700 | 45  | 5600 | Phys 2d8+20 | 20% Fire 5d8 R | 20% Incinerate M14    | Drain SP  | I/50/50/50/I/50     | 350/40    | Suic | –       | –        |

#### Machines

| Family      | Tiers (A, B, C)                             | Body                                        | Model route (DESIGN)  | Moves                | One model, three tints | Where in MM6 (MM, PK)        |
| ----------- | ------------------------------------------- | ------------------------------------------- | --------------------- | -------------------- | ---------------------- | ---------------------------- |
| Patrol Unit | Patrol Unit, Enforcer Unit, Terminator Unit | robot (Richardson: Terminators are spheres) | procedural rig (10.2) | hovers? (unverified) | yes                    | Control Center; Tomb of VARN |

| Tier            | Lv  | HP   | AC  | XP   | Attack 1       | Attack 2 | Spell | Special    | Resist F/E/C/P/M/Ph | Speed/Rec | AI   | Prefers | Treasure |
| --------------- | --- | ---- | --- | ---- | -------------- | -------- | ----- | ---------- | ------------------- | --------- | ---- | ------- | -------- |
| Patrol Unit     | 50  | 400  | 60  | 3000 | Ener 10d5+10 R | –        | –     | Break Item | 30/10/30/I/I/20     | 200/50    | Aggr | –       | –        |
| Enforcer Unit   | 70  | 700  | 80  | 5600 | Ener 12d5+15 R | –        | –     | Break Item | 40/20/40/I/I/30     | 200/50    | Suic | –       | –        |
| Terminator Unit | 90  | 1080 | 100 | 9000 | Ener 20d5+20 R | –        | –     | Eradicate  | 60/30/60/I/I/50     | 200/50    | Suic | –       | –        |

#### Uniques and quest variants

| Monster                          | Where (MW6)                                                   | Body of             | Lv  | HP    | AC  | XP    | Attack 1       | Attack 2 | Spell                   | Special         | Resist F/E/C/P/M/Ph | Speed/Rec | AI     | Prefers         | Treasure                           |
| -------------------------------- | ------------------------------------------------------------- | ------------------- | --- | ----- | --- | ----- | -------------- | -------- | ----------------------- | --------------- | ------------------- | --------- | ------ | --------------- | ---------------------------------- |
| Rogue Leader                     | Shadow Guild                                                  | Thief               | 27  | 133   | 20  | 504   | Phys 2d10+12   | –        | –                       | Steal ×2        | –                   | 270/90    | Aggr   | –               | 5d10 gold; 20% L2 cloak            |
| Snergle                          | Snergle's Caverns                                             | Dwarf               | 20  | 150   | 20  | 1200  | Phys 4d2+10    | –        | –                       | Break Armour ×2 | 40/40/40/I/50/0     | 200/80    | Suic   | –               | 25d5 gold; 100% Snergle's Axe      |
| Priest of Baa (quest variant)    | Superior Temple of Baa                                        | Acolyte of Baa      | 25  | 137   | 22  | 875   | Phys 2d4+8     | –        | –                       | –               | –                   | 200/80    | Aggr   | 2 at once       | 20d10 gold; 100% High Sorcerer key |
| Priest of Baa (quest variant)    | Superior Temple of Baa                                        | Acolyte of Baa      | 25  | 137   | 22  | 875   | Phys 2d4+8     | –        | –                       | –               | –                   | 200/80    | Aggr   | 2 at once       | 100d10 gold; 100% High Cleric key  |
| Slicker Silvertongue             | Supreme Temple of Baa                                         | Acolyte of Baa      | 25  | 137   | 22  | 875   | Phys 2d4+8     | –        | –                       | –               | –                   | 200/60    | Aggr   | 2 at once       | 20d10 gold; 10% L3 misc            |
| Master Monk (quest variant)      | Temple of the Sun                                             | Monk                | 27  | 153   | 28  | 999   | Cold 2d4+16    | –        | –                       | Weak            | 0/0/0/0/I/0         | 240/100   | Suic   | 2 at once       | 10% L3 amulet                      |
| Warlock (quest variant)          | Silver Helm Stronghold                                        | Sorcerer            | 50  | 350   | 30  | 3000  | Phys 16d4      | –        | –                       | Insane          | 30/I/30/30/30/0     | 240/90    | Aggr   | 2 at once       | 40d10 gold; 100% Ankh              |
| Q                                | Temple of the Snake                                           | Arena peasant (man) | 100 | 16000 | 60  | 75    | Magic 10d5+2 R | –        | 70% Finger of Death N10 | –               | 0/0/0/0/I/0         | 140/50    | Suic   | –               | 7d20 gold; 100% Horn of Ros        |
| Jon Van Caneghem                 | New World Computing                                           | Goblin              | 6   | 36    | 10  | 96    | Phys 1d9+2     | –        | –                       | –               | –                   | 170/100   | Normal | –               | 2d10 gold                          |
| Trip Hawkins                     | New World Computing                                           | Goblin              | 10  | 60    | 14  | 200   | Phys 1d9+4     | –        | –                       | –               | –                   | 180/90    | Aggr   | –               | 3d10 gold                          |
| Werewolf Leader                  | Lair of the Wolf                                              | Werewolf            | 60  | 420   | 30  | 2000  | Phys 3d12+25   | –        | –                       | Unconscious     | 10/10/10/10/10/15   | 350/80    | Suic   | Paladin, Cleric | 100% Pearl of Putrescence          |
| Sentinel of VARN (quest variant) | Tomb of VARN                                                  | Defender of VARN    | 35  | 227   | 40  | 1575  | Magic 3d6+20   | –        | –                       | –               | 20/20/20/20/I/10    | 220/60    | Normal | –               | 100% Back Door Key                 |
| Fallen Defender                  | Hall of the Fire Lord                                         | Defender of VARN    | 35  | 227   | 40  | 1575  | Phys 3d6+20    | –        | –                       | –               | 20/20/20/20/I/0     | 220/80    | Normal | –               | 100d20 gold; 100% Chest Key        |
| Lurch                            | Castle Kriegspire                                             | Minotaur            | 79  | 2000  | 40  | 7031  | Phys 3d7+60    | –        | –                       | –               | 30/30/30/30/I/30    | 300/60    | Suic   | 2 at once       | 50d20 gold; 20% L6 axe             |
| Power Lich (quest variant)       | Tomb of Ethric the Mad (named Ethric in versions 1.1 and 1.2) | Lich                | 40  | 280   | 25  | 2000  | Ener 5d8+20    | –        | –                       | –               | 20/20/20/20/I/10    | 220/90    | Suic   | 2 at once       | 100% Ethric's Skull                |
| Agar                             | Agar's Laboratory                                             | Lich                | 40  | 320   | 25  | 2000  | Phys 5d9+30    | –        | –                       | –               | 20/20/20/20/I/10    | 220/90    | Suic   | 2 at once       | 30% L5 misc                        |
| Lich King                        | Castle Darkmoor                                               | Lich                | 40  | 600   | 60  | 2000  | Phys 5d8+20    | –        | –                       | –               | 20/20/20/I/I/10     | 220/70    | Suic   | 2 at once       | 30d20 gold; 100% Mystic Wand       |
| Reactor                          | The Hive                                                      | Reactor             | 100 | 1300  | 40  | 11000 | Ener 20d5+20 R | –        | –                       | –               | I/I/I/I/I/I         | 100/60    | Suic   | –               | –                                  |
| Devil of Baa                     | Devil's Outpost                                               | Devil Spawn         | 60  | 540   | 40  | 4200  | Phys 2d6+20    | –        | –                       | Drain SP        | 30/30/30/30/30/0    | 300/90    | Suic   | –               | –                                  |
| Demon Queen                      | The Hive                                                      | Demon Queen         | 100 | 1300  | 40  | 11000 | Phys 2d8+20    | –        | 40% Incinerate M14      | Drain SP        | I/50/50/50/I/50     | 100/70    | Suic   | –               | –                                  |
| Longfang Witherhide              | Dragon's Lair                                                 | Dragon              | 80  | 880   | 60  | 7200  | Fire 12d8 R    | –        | –                       | –               | I/50/30/50/50/50    | 240/70    | Aggr   | 4 at once       | 250d10 gold; 100% Dragon Claw      |
| Queen Spider                     | Abandoned Temple                                              | Spider              | 12  | 50    | 16  | 264   | Phys 3d2+6     | –        | –                       | Poison 3 ×2     | 0/0/0/I/0/0         | 260/100   | Aggr   | –               | 100% Spider Queen heart            |
| Lesser Genie                     | Shadow Guild                                                  | Genie               | 22  | 136   | 35  | 1419  | Cold 6d4+8     | –        | –                       | –               | 0/0/I/0/75/0        | 200/80    | Aggr   | –               | 30% L4 any                         |

---

## 4. Recommended build order

The order follows MM6's own: the party meets the families of New
Sorpigal, Goblinwatch and the Abandoned Temple first, and those
families already exercise most of the shared mechanics. Rules come
before art, because every body plugs into them.

### 4.1 Mechanics

| #   | Work                                                                                                                                              | Size   | Needs                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| 1   | The record of 1.2 as data (`src/data/` per PLAN's layout), loaded and converted once; HP and experience derived and tested; `attackBonus` removed | M      | nothing                              |
| 2   | Monster to-hit by level (2.1); the party's distance penalty and 51 m cap (2.2)                                                                    | S      | 1                                    |
| 3   | Elements and resistances on both sides, the halving roll, immunity, energy unresisted, the spell-to-element table (2.3)                           | M      | 1; character resistances (GAP 3)     |
| 4   | Action choice by chance, recovery in MM6 points, attack 2 at 1.5× (2.4, 2.5)                                                                      | S      | 1                                    |
| 5   | Hit recovery for struck members and the switch of the active member (2.5)                                                                         | S      | part of GAP step 1                   |
| 6   | Target choice: preferences, excluded conditions, several members per blow (2.9)                                                                   | S      | 1                                    |
| 7   | AI types and fleeing on the navmesh (2.7)                                                                                                         | M      | 1                                    |
| 8   | Hostility and waking radii, friendly peasants who turn hostile, an AI budget by distance for the 32-agent crowd (2.8)                             | M      | 1                                    |
| 9   | Monster missiles through `spellfx.bolt`, line of sight, range, the to-hit roll for elemental missiles (2.12)                                      | M      | 3, 4                                 |
| 10  | Special attacks: try and save, conditions at MM6's levels (2.6)                                                                                   | M      | 6; poison and disease split (GAP 10) |
| 11  | Breaking, theft, aging and draining (2.6)                                                                                                         | S      | 10; item instances (GAP 12)          |
| 12  | Treasure on bodies: gold dice, item chance, level and type; searching a body (2.11)                                                               | M      | random items by level (GAP 12)       |
| 13  | Spawn groups in the level format and compiler: three families per map, difficulty odds, counts, fixed-tier points (2.10)                          | M      | 1                                    |
| 14  | Killed monsters kept per map, groups rolled once, refill timers (2.10)                                                                            | M      | save slots (GAP step 4)              |
| 15  | Tints: one model, three colourings (3.5)                                                                                                          | S–M    | nothing                              |
| 16  | Procedural rigs (DESIGN 10.2): a parts-on-pivots loader and the eight programs of 2.14, first for a quadruped                                     | L      | one body from Meshy                  |
| 17  | Each further body plan on 16: flyer, eight legs, snake, blob, many heads, big winged reptile                                                      | M each | 16                                   |
| 18  | Flying monsters: steering off the navmesh with height, attacking from the air, the party aiming up (2.13)                                         | L      | 9, 17 (flyer)                        |
| 19  | Monster spells, one by one with the party's (2.12)                                                                                                | L      | 9; GAP 7                             |
| 20  | Sounds per type: attack, die, got hit, fidget (2.14)                                                                                              | M      | audio pipeline (DESIGN 10.7)         |
| 21  | Wandering by move type and water-bound monsters (2.13)                                                                                            | M      | 13                                   |
| 22  | Bounty hunts at town halls (2.11)                                                                                                                 | S      | towns (GAP 34)                       |

Rows 1 to 8 need no art and nothing from GAP beyond step 1: one to two
weeks in all. Rows 9 to 14 make the roster dangerous and rewarding: one
to two weeks more, gated by GAP 10, 12 and step 4.

### 4.2 Families

Waves follow MM6's map order (Appendix A). Model work per family is one
Meshy batch line: about 53 credits for a humanoid (a 3-credit concept,
image-to-3D 15, rig 5, ten clips at 3; DESIGN 10.1 and
`tools/lib/batch.ts`) and about 18 for a procedural body (concept and
image-to-3D only). Code sizes assume rows 1 to 10 of 4.1 exist.

| Wave | Families                                                                                             | Where (MM6)                                                                                 | New mechanics it exercises                                                                           | Art                                                                                                  | Size |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---- |
| 1a   | Goblin, Peasant (man), Peasant (woman)                                                               | New Sorpigal, Goblinwatch                                                                   | melee, Fire Bolt from range, Break Item, Wimp and Normal flight, friendly townsfolk who turn hostile | reuse `goblin-scout` and the villagers with tints; combat clips for the villagers (about 42 credits) | M    |
| 1b   | Mage                                                                                                 | New Sorpigal, Free Haven                                                                    | three spells (Flame Arrow, Cold Beam, Lightning Bolt), Wimp flight                                   | one humanoid (about 53 credits)                                                                      | M    |
| 1c   | Rat, Blood Sucker                                                                                    | Goblinwatch, Castle Ironfist                                                                | Disease 1 and 2 with multipliers, very fast movers, the first procedural rig                         | two procedural bodies (about 36 credits)                                                             | L    |
| 1d   | Bat                                                                                                  | Goblinwatch, Abandoned Temple                                                               | the first flyer                                                                                      | one procedural body (about 18 credits)                                                               | L    |
| 1e   | Spider, Cobra, and the Queen Spider                                                                  | Abandoned Temple                                                                            | Poison 1 to 3, a ranged poison spit, a unique with a quest item, eight legs and a snake              | two procedural bodies (about 36 credits)                                                             | L    |
| 2    | Follower of Baa, Lizard Man, Cutpurse, both Cannibals                                                | Castle Ironfist, the Misty Islands, Bootleg Bay                                             | Mind Blast, arrows and fire arrows, theft and instant death, class and sex preferences               | four new humanoids and the bandit (about 210 credits)                                                | M    |
| 3    | Skeleton, Acolyte of Baa, Thug, Fighter, Ooze, Thief, Guard, Swordsman, Monk, Archer                 | Temple of Baa, Dragoons' Caverns, the Shadow Guild Hideout, Silver Helm Outpost, Free Haven | immunities, Afraid and Curse, several members per blow, the blob rig, Break Weapon and Armour        | eight humanoids and one procedural body (about 440 credits)                                          | L    |
| 4    | Ghost, Lich, Harpy, Dwarf, Druid, Sorcerer, Ogre, Fire Elemental, Medusa, Magyar, Gargoyle, Werewolf | Corlagon's Estate to Silver Cove                                                            | aging, Stone, Dispel Magic, Drain SP, winged humanoids, the first elemental                          | about 600 credits                                                                                    | XL   |
| 5    | the remaining 21 families and the uniques                                                            | Blackshire to the Hive                                                                      | Eradicate, multi-target dragons, swimmers, Psychic Shock, Meteor Shower, Incinerate                  | about 730 credits                                                                                    | XL   |

The whole roster comes to about 2,170 Meshy credits at those prices (28
new humanoid families, 5 humanoid with parts, 19 procedural bodies, the
two unique bodies, the villagers' clips). DESIGN 10.0 recorded a balance
of 4,790 on 2026-10-15. Every batch still needs the owner's approval by
number (CLAUDE.md).

### 4.3 The first step in detail

1. Write the 1.2 record and a data file with the 27 tiered types of
   waves 1a to 1e plus the Queen Spider (rows from 3.6, MM6 units).
2. Replace `resolveAttack(this.def.attackBonus, …)` in
   `src/world/monster.ts` with the level formula; add the action roll
   and the recovery conversion; give monsters resistances and roll them
   in `takeDamage`.
3. Map the four current kinds onto the new families (3.4) and keep the
   valley's and desert's spawns working.
4. Unit tests: the derived HP and experience, the to-hit examples of 2.1,
   the action odds of 2.4 (Fire Archer 40 / 18 / 42 %), the resistance
   averages of 2.3 (75 % at 20).
5. Update DESIGN 14.2 and 14.3 and `src/game/README.md` in the same
   change, as CLAUDE.md asks.

Size M. Non-humanoid families stay data-only until row 16 exists.

---

## 5. Decisions for the owner

1. **Wimps**: run at 30 % of their hit points (MW6, and CH's account of
   MM6 peasants) or as soon as they are hostile (the MM7 engine).
2. **Original bugs**: monster spells all Fire, a monster's Paralyze doing
   nothing, the wrapped gold of four monsters, Finger of Death giving no
   experience, stolen items lost with the thief (GF-P, MW6). The proposal
   is GrayFace's fixed behaviour, except the gold, which section 3
   already prints as paid.
3. **Cannibal sexes** (3.3): MW6's or RPGC's assignment.
4. **Unique numbers** (3.3): MW6's, PK's, or the project's own.
5. **Flyers** (2.13): which families fly, and whether only outdoors.
6. **Names**: two goblin uniques and 48 peasants are named after real
   developers (MW6), and the Cuisinart is named after a kitchen-appliance
   brand. The proposal is to leave the developer names out and rename the
   Cuisinart. The world and rights question of GAP 37 (5) covers every
   other name.
7. **The nomad raider** (3.4): keep it as the project's own or retire it.
8. **Turn-based mode** (GAP 37 (1)): there recovery counts as is (MM7
   engine, OE), which this specification does not cover.

---

## Appendix A. Maps and their monsters

From MM's location lists, with PK's one addition and MW6's uniques. The
lists name families, not counts or tiers; those come from each map's
difficulty and count range (2.10), which no source here gives (unverified).
Refill times are MM's and PK's.

| Map                       | Kind    | Refill                 | Families (A to C tiers)                                                      | Uniques                                           |
| ------------------------- | ------- | ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| New Sorpigal              | outdoor | 6 months               | Mage, Goblin                                                                 | –                                                 |
| Goblinwatch               | dungeon | 24 months (MM default) | Goblin, Rat, Bat, Blood Sucker                                               | –                                                 |
| Abandoned Temple          | dungeon | 24 months (MM default) | Spider, Cobra, Bat                                                           | Queen Spider                                      |
| Gharik's Forge            | dungeon | 24 months (MM default) | Fire Elemental, Sorcerer                                                     | –                                                 |
| Castle Ironfist           | outdoor | 24 months              | Follower of Baa, Lizard Man, Blood Sucker                                    | –                                                 |
| Dragoons' Caverns         | dungeon | 24 months (MM default) | Thug, Fighter, Ooze                                                          | –                                                 |
| Temple of Baa             | dungeon | 24 months (MM default) | Acolyte of Baa, Skeleton, Rat, Spider                                        | –                                                 |
| Shadow Guild Hideout      | dungeon | 24 months (MM default) | Thief, Thug                                                                  | –                                                 |
| Corlagon's Estate         | dungeon | 24 months (MM default) | Ghost, Skeleton, Power Lich only (Lich)                                      | –                                                 |
| Snergle's Caverns         | dungeon | 24 months (MM default) | Dwarf, Bat                                                                   | Snergle                                           |
| The Misty Islands         | outdoor | 24 months              | Follower of Baa, Cutpurse                                                    | –                                                 |
| Silver Helm Outpost       | dungeon | 24 months (MM default) | Guard, Swordsman, Monk                                                       | –                                                 |
| Bootleg Bay               | outdoor | 8 months               | Cannibal (MM does not say which sex), Lizard Man                             | –                                                 |
| Temple of Tsantsa         | dungeon | 24 months (MM default) | Cannibal (MM does not say which sex), Cobra                                  | –                                                 |
| Temple of the Sun         | dungeon | 24 months (MM default) | Monk, Minotaur King only (Minotaur)                                          | Master Monk quest variant (MW6)                   |
| Temple of the Fist        | dungeon | 24 months (MM default) | Rat, Monk                                                                    | –                                                 |
| Hall of the Fire Lord     | dungeon | 24 months (MM default) | Goblin, Ogre                                                                 | Fallen Defender                                   |
| Free Haven                | outdoor | 24 months              | Archer, Mage                                                                 | –                                                 |
| Temple of the Moon        | dungeon | 24 months (MM default) | Cobra, Druid, Medusa                                                         | –                                                 |
| Tomb of Ethric the Mad    | dungeon | 24 months (MM default) | Skeleton, Ghost, Lich                                                        | Power Lich quest variant (MW6)                    |
| Dragoons' Keep            | dungeon | 24 months (MM default) | Fighter, Rat                                                                 | –                                                 |
| Free Haven Sewers         | dungeon | 24 months (MM default) | Rat, Acolyte of Baa, Cutpurse, Thief                                         | –                                                 |
| Control Center            | dungeon | 24 months (MM default) | Patrol Unit                                                                  | –                                                 |
| Mire of the Damned        | outdoor | 6 months               | Skeleton, Ghost, Harpy                                                       | –                                                 |
| Snergle's Iron Mines      | dungeon | 24 months (MM default) | Dwarf, Ooze, Devil Spawn                                                     | –                                                 |
| Dragon's Lair             | dungeon | 24 months (MM default) | –                                                                            | Longfang Witherhide                               |
| Castle Darkmoor           | dungeon | 24 months (MM default) | Ogre, Lich, Flying Eye                                                       | Lich King                                         |
| Frozen Highlands          | outdoor | 24 months              | Harpy, Magyar, Archer                                                        | –                                                 |
| Icewind Keep              | dungeon | 24 months (MM default) | Ogre, Guard                                                                  | –                                                 |
| Shadow Guild              | dungeon | 24 months (MM default) | Thief, Cutpurse                                                              | Rogue Leader (MW6), Lesser Genie (MW6)            |
| Silver Cove               | outdoor | 24 months              | Gargoyle, Druid                                                              | –                                                 |
| Monolith                  | dungeon | 24 months (MM default) | Druid, Earth Elemental, Water Elemental                                      | –                                                 |
| Warlord's Fortress        | dungeon | 24 months (MM default) | Thug, Fighter, Death Knight                                                  | –                                                 |
| Silver Helm Stronghold    | dungeon | 24 months (MM default) | Swordsman, Fighter, Sorcerer                                                 | Warlock quest variant (MW6)                       |
| Blackshire                | outdoor | 24 months              | Werewolf, Air Elemental (PK only), Fire Lizard                               | –                                                 |
| Lair of the Wolf          | dungeon | 24 months (MM default) | Werewolf, Ooze, Swordsman                                                    | Werewolf Leader                                   |
| Temple of the Snake       | dungeon | 24 months (MM default) | Medusa, Gold Dragon only (Dragon)                                            | Q                                                 |
| Kriegspire                | outdoor | 8 months               | Minotaur, Earth Elemental, Drake                                             | –                                                 |
| Devil's Outpost           | dungeon | 24 months (MM default) | Devil Spawn                                                                  | Devil of Baa                                      |
| Superior Temple of Baa    | dungeon | 24 months (MM default) | Acolyte of Baa, Sorcerer, Druid                                              | two Priest of Baa quest variants (MW6)            |
| Castle Kriegspire         | dungeon | 24 months (MM default) | Minotaur, Agar's Pet, Drake                                                  | Lurch                                             |
| Agar's Laboratory         | dungeon | 24 months (MM default) | Flying Eye, Agar's Pet                                                       | Agar                                              |
| Cave of the Dragon Riders | dungeon | 24 months (MM default) | Wyrm, Death Knight                                                           | –                                                 |
| Eel Infested Waters       | outdoor | 8 months               | Agar's Pet, Sea Serpent, Water Elemental                                     | –                                                 |
| Castle Alamos             | dungeon | 24 months (MM default) | Magyar, Sorcerer, Air Elemental                                              | –                                                 |
| Dragonsands               | outdoor | 6 months               | Fire Lizard, Wyrm, Dragon                                                    | –                                                 |
| Tomb of VARN              | dungeon | 24 months (MM default) | Genie, Defender of VARN, Patrol Unit                                         | Sentinel of VARN quest variant (MW6)              |
| Hermit's Isle             | outdoor | 6 months               | Sea Serpent, Hydra, Titan                                                    | –                                                 |
| Supreme Temple of Baa     | dungeon | 24 months (MM default) | Acolyte of Baa, Devil Spawn, Fire Elemental                                  | Slicker Silvertongue                              |
| Paradise Valley           | outdoor | 6 months               | Dragon, Hydra, Titan, Sea Serpent                                            | –                                                 |
| Sweet Water               | outdoor | 8 months               | Devil Spawn, Devil Captain                                                   | –                                                 |
| The Hive                  | dungeon | 7 days                 | Devil Spawn, Devil Captain                                                   | Demon Queen, Reactor                              |
| New World Computing       | dungeon | unverified             | 48 peasants named after the developers (MW6)                                 | Jon Van Caneghem, Trip Hawkins (goblins, MW6; PK) |
| The Arena                 | dungeon | unverified             | Arena peasant (man), Arena peasant (woman) (MW6); other opponents unverified | –                                                 |

---

## Sources

All public; read on 2026-10-17 and 2026-10-18. Tags as used above.

- **GF-M**: GrayFace, "Game Mechanics" (MM6 to MM8): chance to hit,
  special-attack chances, resistances, recovery.
  https://grayface.github.io/mm/mechanics/
- **GF-P**: GrayFace, MM6 patch read-me; its fix list describes the
  original behaviour. https://grayface.github.io/mm/MM6PatchReadMe
- **MMX**: GrayFace, MMExtension reference: `structs.MonstersTxtItem`,
  `structs.MapMonster`, `structs.MonListItem`, `structs.MapStatsItem`,
  `structs.SFTItem`, `const.MonsterBonus`, `const.MonsterPref`,
  `const.MonsterBits`, `const.MonsterBuff`, `const.AIState`,
  `const.Damage`, time constants and the MM6 aggression example.
  https://grayface.github.io/mm/ext/ref/
- **RPGC**: RPG Classics, Might and Magic 6 shrine, monster table (HP,
  attacks with ranged flags, spell, special, experience); read from a
  local mirror made on 2026-10-17.
  http://tartarus.rpgclassics.com/mm6/monsters.shtml
- **MW6**: mm6world.ru, "Might and Magic VI. Таблица монстров" (Russian):
  level, HP, AC, resistances, experience, gold, item, special with
  multiplier, both attacks with chances, spell with chance, speed,
  recovery, preferences, AI type; notes on flee thresholds, groups,
  uniques, quest variants, peasants and the gold bug.
  http://mm6world.ru/6_monsters.htm
- **PK**: RPG Gamers, "Might & Magic 6: Mandate of Heaven" walkthrough,
  annotated by J. Pike: monster table with levels, resistances and
  spell ranks; per-map reset times and monster lists; bounty hunts.
  https://rpggamers.com/walkthrough/might-magic-vi-mandate-of-heaven
- **MM**: RPG Gamers, "Might and Magic VI solution" by Mike Marcelais,
  version 1.2 (1999): monster table with ranged flags, the spell
  resistance table, per-location monster lists, reset rules.
  https://rpggamers.com/walkthrough/might-and-magic-vi-solution
- **LR**: Lu Richardson, Might and Magic VI guide, served by RPG Gamers
  through The Spoiler: bodies to search, peasants and the town,
  Terminator Units as spheres.
  https://the-spoiler.com/RPG/New.World.Computing/might..magic.6.1.html
- **CH**: Celestial Heavens forum: "Comprehensive list of things each
  title from between MM6-8 gains and loses" (2025, peasants, hostility,
  target preferences); "MM6 new modding" (the spell format in the monster
  table); "MM6 - Q Not in Monsters.TXT?".
  https://www.celestialheavens.com/forum/topic/18827 ,
  https://www.celestialheavens.com/forum/topic/17559 ,
  https://www.celestialheavens.com/forum/topic/16262
- **OE**: OpenEnroth, an open re-implementation of the MM7 engine, master
  branch read on 2026-10-18: `src/Engine/Objects/Actor.cpp`,
  `MonsterEnums.h`, `Character.cpp`, `src/Engine/mm7_data.h`,
  `src/Engine/Party.h`. Every OE fact here is MM7's.
  https://github.com/OpenEnroth/OpenEnroth
- **MMW**: Might and Magic Wiki (fandom): pages for the Goblin shaman,
  Apprentice mage, Harpy, Harpy hag, Harpy witch, Lich and Q of MM6, and
  the MM6 Fly spell; search-engine extracts only, direct reading refused.
  https://mightandmagic.fandom.com/
- **M6W**: mm6.wiki: Goblins, Apprentice Mage, Arena peasants;
  search-engine extracts only, direct reading refused.
  https://mm6.wiki/
- **GAP**: this repository's `docs/MM6-GAPS.md`.
