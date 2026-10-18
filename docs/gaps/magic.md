# MM6 magic: the 99 spells against the code

An implementation spec for all 99 spells of Might and Magic VI, and the
systems around them, measured against this project. It extends section 7
("Magic") and section 16 ("Guilds and spellbooks") of `docs/MM6-GAPS.md`;
read those first.

Written 2026-10-18 against commit `e9ee563`. Of the files cited, only the
spellbook screen (`src/ui/spellbook.ts`) changed since `1a91dcb`, the commit
MM6-GAPS was written against. No build, test or script was run. No game binary or
game data was opened; MM6 data files were read only as published by others
(section 9).

## 1. How to read this

- Status words, as in MM6-GAPS:
  - **Missing**: no code.
  - **Partial**: defined, but inert or only partly reachable.
  - **Present but deviates**: works, but plays differently.
  - **Present**: matches MM6 as far as the sources show.
- Size key, as in `docs/PLAN.md`: S hours, M a day or two, L several days,
  XL a week or more.
- Source tags are in square brackets; the list is in section 9.
- "Unverified" marks anything no source here confirms. "Conflict" marks
  sources that disagree; both values are given.
- Default rule for conflicts: follow [SPL] (MM6's own spell table) and [REC]
  (numbers read from MM6's executable). The printed manual [MAN] describes an
  earlier design in many places.
- Notation:
  - s is the caster's skill level in the spell's school.
  - N, E, M are the Normal, Expert and Master ranks.
  - "s d4" means roll s four-sided dice; "1d5+1" means one five-sided die
    plus one.
  - Recovery is in game ticks (section 3.3). Durations are game time.
  - "Window" is how long a condition may have lasted for its cure to work
    (section 3.7).

## 2. Findings

1. MM6's spell table [SPL] gives each spell's spell points per rank, damage
   type and rank effects. Only Flame Arrow, Static Charge, Cold Beam, Magic
   Arrow (2/1/0) and Spirit Arrow (1/1/0) get cheaper with rank. Sun Ray
   costs 65 and Divine Intervention 70, not the 70 and 75 that RPGC (and
   MM6-GAPS) give.
2. Every spell has a recovery per rank, read from the executable [REC]: from
   60 ticks (Torch Light) to 1000 (Resurrection). The project's casts set no
   recovery, so spell points are the only limit on casting.
3. MM6 has no rank gate on learning a spell (inferred, section 3.1). The
   project's `rankForSpellLevel` refuses spells of level 5 and up to Normal
   casters, which MM6 allows.
4. The project's game clock does not move while the party walks:
   `advanceClock` floors each frame's fraction of a minute to zero (section
   5.5). Every buff and cure window measured on that clock would never run
   out. Fix it before any buff work.
5. Guild membership is per character. Guilds come in tiers that sell
   different book ranges. Light and Dark guilds sell books 1–10 only, open
   for four hours a day and charge 1000 gold to join. The project keeps one
   party-wide membership list and teaches a spell on purchase.
6. MM6-GAPS needs corrections: Charm and Reanimate do not make allies;
   Awaken reaches the whole party at every rank; Remove Fear reaches one
   member at every rank; the Light costs (section 6).
7. The original game had spell bugs that GrayFace's patch fixes: cure
   windows three times too long at Expert and Master, Water Walk draining
   four times too fast, a weaker but longer buff blocking a stronger one, no
   range limit on Meteor Shower and Starburst, no experience from Finger of
   Death [GF-P]. The owner must pick original or patched rules; this spec
   follows the patched ones.
8. MM6's undead are immune to Magic damage [MON], yet Turn Undead and
   Destroy Undead are Magic spells [SPL]. How the game reconciles this is
   unverified.
9. The project defines 24 spells: 6 are inert, 18 work with deviations and
   none is fully Present, because no cast sets recovery. 75 are missing.
10. Of the 99 specs below, 68 are complete from the sources and 31 have at
    least one unverified part (column "Spec"). The rank needed to learn is
    inferred for all 99 (section 3.1).

## 3. Rules shared by every spell

### 3.1 Who can learn a spell

MM6:

- Schools by class [RPGC characters; DOB]: Knight none; Paladin Spirit,
  Mind, Body; Archer Fire, Air, Water, Earth; Druid the seven; Cleric
  Spirit, Mind, Body, Light, Dark; Sorcerer Fire, Air, Water, Earth, Light,
  Dark. Promotions keep the same schools [DOB].
- Light and Dark cannot be taken at creation; they are learnt in play
  [RPGC skills].
- Every school a class can learn can reach Master [JPK]. Master teachers ask
  for skill 12, a promotion (Air: Archmage; Spirit: High Priest) or a
  reputation (Light: Saintly; Dark: Notorious) [JPK; RPGC skills].
- A spell is learnt by reading its book. The character needs the class, the
  school skill at any rank, and the book (inferred). The evidence:
  - MMExtension hooks the game's "rank needed to learn" check only for MM7
    and MM8 (`if mmver > 6` in `Scripts/Core/events.lua`) [MMX].
  - [SPL] gives a Normal-rank effect for every spell, including the level 9
    to 11 ones: Town Portal works outdoors at Normal, Lloyd's Beacon keeps 1
    beacon at Normal, Armageddon allows one cast a day to Normal casters.
  - [WP7] calls MM7's rank gate a tightening of MM6's rules.
  - For comparison, MM7 gates spells 1–4 at Normal, 5–7 Expert, 8–10 Master
    and 11 Grandmaster [MMX].

Project:

- `canLearnSpell` (`src/game/spellbook.ts` line 31) applies
  `rankForSpellLevel` (`src/game/spells.ts` line 92): levels 1–4 Normal, 5–8
  Expert, 9–11 Master. That matches neither MM6 nor MM7.
- Light and Dark are not skills (`MAGIC_SKILLS`, `src/game/skills.ts` line
  11), so no class can learn them (`CLASS_DEFS`, `src/game/classes.ts` line
  51).

### 3.2 Spell points

- Costs per rank come from [SPL] and are in the tables of section 4.
- Cost by spell level, levels 1 to 11 [SPL]:
  - the seven common schools: 1, 2, 3, 4, 5, 8, 10, 15, 20, 25, 30;
  - Light: from 20 to 70 in steps of 5;
  - Dark: 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200.
- The unpatched game took costs from a table in its executable, not from
  [SPL]; its Static Charge cost at Expert was wrong (the value is
  unverified) [GF-P].
- [MAN] prints older costs in places: Remove Curse 10, Remove Fear 1,
  Resurrection 20, Town Portal 25, Sun Ray 130, and Armageddon free.
- Spell points come back by resting [MAN], by potions (MM6-GAPS 13), and
  by items that regenerate them ("of Mana", "of the Eclipse", "of the
  Unicorn") [RPGC enchantments].
- Project: every spell costs its level at every rank (`flat`, `spells.ts`
  line 98). Seven of the 24 costs are wrong (Jump, Stone to Flesh, Raise
  Dead, Resurrection, Cure Insanity, Cure Poison, Cure Disease), and Spirit
  Arrow is not free at Master.

### 3.3 Recovery

MM6:

- Each character has one recovery counter, shared by all their actions
  (MMX `Player.RecoveryDelay`) [MMX]. While it runs the character cannot
  act, and the gem by their portrait goes dark [MAN].
- A cast sets it to the spell's recovery for the caster's rank [REC]. An
  attack sets it from the weapon (section 5.3).
- Units are ticks. [MAN]'s example: a dagger thrust costs about 40.
- The real-time length of a tick is unverified for MM6. MMX counts 128
  ticks per real second [MMX `const.RTSecond`]. MM7 multiplies a recovery
  by 2.133 before counting it down in real time [OE]; 2.133 is 128/60, so
  MM7 reads recovery as sixtieths of a second (inference). Fire Bolt at
  Normal (110) then lasts 0.86 s or 1.83 s.
- What shortens spell recovery:
  - Rank (the tables in section 4).
  - First Aid, Healing Touch, Dispel Magic, Divine Intervention: their
    descriptions say skill shortens it [SPL], but [REC] holds one value each.
    MM7 subtracts the skill level in ticks for Dispel Magic [OE]; MM6's rule
    is unverified.
  - Haste: −25 for weapons [GF-M]. [SPL] says it speeds casting too; one
    player reports that nothing shortens MM6 spell recovery [CHF-R]; MM7
    uses the table value alone [OE]. Unverified.
  - Speed, weapon skill and armour change weapon recovery only [GF-M].
- Conflicts:
  - Deadly Swarm: 110/100/90 [REC]; 100/90/80 in the official strategy
    guide, page 112, as quoted in [CHF-R].
  - Cure Wounds and Dark Containment: [SPL] promises faster recovery at
    Expert and Master; [REC] has one value for all ranks.
- A Cursed caster fails half the time and still pays, with a recovery of
  100 ticks, in MM7 [OE]. MM6's rate is unverified; the project uses 50 %
  (`failChance`, `src/game/conditions.ts` line 84).

Project: `castSpell` (`spellbook.ts` line 75) sets no recovery. Only
`Party.attack` sets `readyAt` (`src/game/party.ts` line 187). A member can
cast and swing in the same instant.

### 3.4 Hitting

- An attack spell's missile hits what it reaches; there is no hit roll,
  except for four spells [SPL]:
  - Flame Arrow and Magic Arrow roll like an arrow, with the school skill as
    the hit bonus [SPL; MAN]. Exact formula unverified.
  - Spirit Arrow can miss; skill improves it [SPL]. Formula unverified.
  - Blades uses the party hit formula with a bonus of 5 × s [GF-M; MAN].
- Party hit formula [GF-M]: (15 + 2 × Attack + Bonus − DistancePenalty) /
  (30 + 2 × Attack + monster armour class).
- Monster spells always hit the party [GF-M].
- Range: up to 5119 game units [GF-M]. The patch limits Meteor Shower and
  Starburst to arrow range; the original had no limit [GF-P].
- Unpatched bugs [GF-P]: some spells could not target rats; area damage
  skipped paralysed monsters.
- No source here gives missile speeds, sizes, bounce counts or lifetimes,
  or blast radii in game units; they are tuning values (unverified). [MAN]
  gives some radii in feet, quoted per spell.
- Target kinds used in section 4:
  - **one monster**: a missile flies to one chosen monster.
  - **volley**: several missiles fly the way the party faces, unaimed.
  - **area at target**: damage falls round a chosen monster.
  - **in sight**: every creature the party can see.
  - **member**, **party**, **item**, **object**, **corpse**, **map**.
- Project: a bolt flies at the living monster nearest the middle of the
  view within 40 m and 28° (`BOLT_TARGETING`, `src/world/spell-target.ts`
  line 21), and every bolt that arrives hits (`performCast`,
  `src/dev/index.ts` line 752). No volley, area or "in sight" targeting.

### 3.5 Damage types

[SPL] gives each attack spell one of six types. Characters resist five
(Fire, Electricity, Cold, Poison, Magic); monsters also resist Physical
[GF-M; MON]. Formula in section 5.4.

- Fire: Flame Arrow, Fire Bolt, Fireball, Ring of Fire, Fire Blast, Meteor
  Shower, Inferno, Incinerate, Sun Ray.
- Electricity: Static Charge, Sparks, Lightning Bolt, Starburst.
- Cold: Cold Beam, Ice Bolt, Ice Blast.
- Poison: Poison Spray, Acid Burst, Toxic Cloud, Dragon Breath.
- Physical: Implosion, Magic Arrow, Deadly Swarm, Blades, Rock Blast, Death
  Blossom, Shrapmetal.
- Magic: Stun, Turn to Stone, Mass Distortion, Spirit Arrow, Turn Undead,
  Mind Blast, Charm, Mass Fear, Feeblemind, Psychic Shock, Harm, Flying
  Fist, Slow, Destroy Undead, Prismatic Light, Paralyze, Mass Curse,
  Shrinking Ray, Finger of Death, Moon Ray, Armageddon, Dark Containment.

Project: a projectile carries its school as `element` (`spells.ts` line
67); damage ignores it (`dev/index.ts` line 776).

### 3.6 Place, time and per-day gates

| Gate                                     | Spells                                                                               | Source                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Outdoors only                            | Meteor Shower, Fly, Starburst, Water Walk, Death Blossom, Armageddon                 | [SPL]                                                   |
| Indoors only                             | Inferno, Prismatic Light                                                             | [SPL]                                                   |
| Outdoors at Normal, anywhere from Expert | Town Portal                                                                          | [SPL]                                                   |
| Outdoors by day                          | Sun Ray                                                                              | [SPL]                                                   |
| Outdoors at night                        | Moon Ray                                                                             | [SPL]                                                   |
| Sunrise or sunset                        | Divine Intervention (the game's check is unverified)                                 | [SPL; MAN]                                              |
| 1/2/3 casts a day per caster             | Divine Intervention, Armageddon                                                      | [SPL; MMX `DevineInterventionCasts`, `ArmageddonCasts`] |
| Shows things only outdoors               | Wizard Eye                                                                           | [SPL]                                                   |
| Conflict                                 | Torch Light: indoors only [MAN]; at night (21:00–05:00) or indoors [JPK]; none [SPL] | [MAN; JPK; SPL]                                         |

Project: each level's sidecar has an `outdoor` flag (`src/world/level.ts`
line 72) and the rules know dawn and dusk (`DAWN_HOUR`, `DUSK_HOUR`,
`src/game/time.ts` line 16). No spell checks either.

### 3.7 Cure windows

- A cure works only if the condition began less than 3 min × s ago (N),
  1 h × s (E) or 1 day × s (M) [SPL]. This covers Awaken, Stone to Flesh,
  Remove Curse, Raise Dead, Resurrection, Remove Fear, Cure Paralysis, Cure
  Insanity, Cure Weakness, Cure Poison and Cure Disease.
- The unpatched game used 3 h × s and 3 days × s at Expert and Master
  [GF-P].
- After the window only a temple or Divine Intervention helps [SPL]. [MAN]
  says rest ends Weak instead.
- MM6 keeps one field per condition on the character (MMX `Player.Cursed`
  to `Player.Eradicated`) [MMX]; a game-time onset is what the windows need
  (inference from [SPL] and [GF-P]).
- Poison and disease have three levels each [MMX]. Whether one cure removes
  every level is unverified.
- Raise Dead and Resurrection leave the target Weak [SPL]; [MAN] says Weak
  for a full day. [JPK] says Cure Insanity leaves Weak too; [SPL] does not.
- Project: `ConditionState.since` (`conditions.ts` line 196) already holds
  the onset, but no cure checks it. Timed conditions expire only in rests
  and waits (`passTime`, `src/game/rest.ts` line 94).

## 4. The 99 spells

Each school has a table and then one entry per spell.

- **#**: school letter and spell level (1–11).
- **SP** and **Recovery**: Normal/Expert/Master, from [SPL] and [REC]. One
  number means the same at every rank.
- **Learn**: rank MM6 needs (N for all, section 3.1) / rank the project's
  gate asks.
- **Target**: section 3.4. **Element**: section 3.5.
- **Spec**: "full" if every part has a source; "gaps" if some part is
  unverified (named in the entry).
- **Project**: status. Line numbers are in `src/game/spells.ts` unless
  another file is named.

### 4.1 Fire

| #   | Spell                | SP    | Recovery    | Learn | Target            | Element | Spec | Project              |
| --- | -------------------- | ----- | ----------- | ----- | ----------------- | ------- | ---- | -------------------- |
| F1  | Torch Light          | 1     | 60          | N / N | party             | —       | full | Present but deviates |
| F2  | Flame Arrow          | 2/1/0 | 100/90/80   | N / N | one monster       | Fire    | gaps | Missing              |
| F3  | Protection from Fire | 3     | 120         | N / N | party             | —       | full | Partial              |
| F4  | Fire Bolt            | 4     | 110/100/90  | N / N | one monster       | Fire    | full | Present but deviates |
| F5  | Haste                | 5     | 140/120/120 | N / E | member; party E–M | —       | gaps | Missing              |
| F6  | Fireball             | 8     | 110/100/90  | N / E | area at target    | Fire    | full | Missing              |
| F7  | Ring of Fire         | 10    | 110/100/90  | N / E | ring round party  | Fire    | full | Missing              |
| F8  | Fire Blast           | 15    | 110/90/70   | N / E | volley            | Fire    | full | Missing              |
| F9  | Meteor Shower        | 20    | 120/110/100 | N / M | area at target    | Fire    | full | Missing              |
| F10 | Inferno              | 25    | 140/120/100 | N / M | in sight          | Fire    | full | Missing              |
| F11 | Incinerate           | 30    | 150/130/110 | N / M | one monster       | Fire    | full | Missing              |

- **F1 Torch Light.** The light round the party grows, for 1 h × s. It is
  brighter at Expert and brighter again at Master [SPL]. A party buff
  [MMX]. Place gate: conflict (section 3.6). Project: `torch-light` (at
  line 147) matches the cost, a light level of 1/2/3 and 1 h × s. The
  runtime (`Torch.brighten`, `src/world/atmosphere.ts` line 37) counts real
  seconds, so the light is lost on reload and ignores rests. No recovery.
  **Present but deviates.**
- **F2 Flame Arrow.** One flaming arrow for 1d8 Fire, with no skill
  scaling. It rolls to hit like an arrow (section 3.4) [SPL; MAN]. Gaps: the
  hit formula. The Wand of Flame casts it [ITM]. **Missing.**
- **F3 Protection from Fire.** The party's Fire resistance rises by s (N),
  2 × s (E) or 3 × s (M), for 1 h × s [SPL; MAN]. A party buff [MMX].
  Project: `protection-from-fire` (line 156) gives each member a buff of s ×
  1/2/3 for 60 + 5 × s minutes; the runtime prints "takes no hold yet"
  (`dev/index.ts` line 816). **Partial.**
- **F4 Fire Bolt.** One missile for s d4 Fire [SPL; MAN]. The Fairy Wand of
  Fire casts it [ITM]. Project: `fire-bolt` (line 172) rolls s d3 + s (mean
  3 × s against MM6's 2.5 × s); no resistance, no recovery. **Present but
  deviates.**
- **F5 Haste.** Recovery −25 ticks on attacks [GF-M]; spells, see section
  3.3. Normal: one member for 1 h + 1 min × s. Expert: the party, same
  duration. Master: the party for 1 h + 3 min × s [SPL]. When it ends the
  targets are Weak; [SPL] speaks of six hours of weakness. A member buff
  [MMX]. [MAN] differs: 4 min + 1 min × s, faster recovery at Expert, the
  party only at Master. Gaps: whether the Weak is timed or needs a cure,
  and the effect on spells. **Missing.**
- **F6 Fireball.** A missile that bursts on its target: s d6 Fire to every
  creature in the blast, the party too if it is close [SPL]. Blast radius
  10 ft (3 m) [MAN]. The Alacorn Wand of Fireballs casts it [ITM].
  **Missing.**
- **F7 Ring of Fire.** A ring round the party: 6 + s Fire to each monster
  it touches, never to the party. Normal small radius, Expert larger, Master
  the same radius with faster recovery [SPL]. Radius 5 ft at Normal and 10
  ft at Expert [MAN]. It burns through walls [RPGC]. **Missing.**
- **F8 Fire Blast.** 3/5/7 streaks fly the way the party faces; each deals
  4 + s d3 Fire to whatever is in its path; they are not guided [SPL]. The
  Arcane Wand of Blasting casts it [ITM]. **Missing.**
- **F9 Meteor Shower.** 8/12/16 meteors fall round the chosen target, each
  8 + s Fire; they can hit the party; outdoors only [SPL]. Radius 10 ft
  [MAN]. Patched: only at monsters within arrow range [GF-P]. **Missing.**
- **F10 Inferno.** Every monster in sight takes 12 + s Fire; never the
  party; indoors only [SPL]. **Missing.**
- **F11 Incinerate.** One missile for 15 + s d15 Fire [SPL]. [MG] says 20
  SP; [SPL] says 30. **Missing.**

### 4.2 Air

| #   | Spell                       | SP    | Recovery    | Learn | Target            | Element  | Spec | Project              |
| --- | --------------------------- | ----- | ----------- | ----- | ----------------- | -------- | ---- | -------------------- |
| A1  | Wizard Eye                  | 1     | 60          | N / N | party             | —        | full | Partial              |
| A2  | Static Charge               | 2/1/0 | 100/90/80   | N / N | one monster       | Elec.    | full | Missing              |
| A3  | Protection from Electricity | 3     | 120         | N / N | party             | —        | full | Missing              |
| A4  | Sparks                      | 4     | 110/100/90  | N / N | volley, bouncing  | Elec.    | full | Present but deviates |
| A5  | Feather Fall                | 5     | 120         | N / E | party             | —        | full | Missing              |
| A6  | Shield                      | 8     | 140/120/120 | N / E | member; party E–M | —        | full | Missing              |
| A7  | Lightning Bolt              | 10    | 110/100/90  | N / E | one monster       | Elec.    | full | Missing              |
| A8  | Jump                        | 15    | 110/90/70   | N / E | party             | —        | full | Partial              |
| A9  | Implosion                   | 20    | 120/110/100 | N / M | one monster       | Physical | full | Missing              |
| A10 | Fly                         | 25    | 250         | N / M | party             | —        | gaps | Missing              |
| A11 | Starburst                   | 30    | 150/130/110 | N / M | area at target    | Elec.    | full | Missing              |

- **A1 Wizard Eye.** The minimap marks monsters (N), then also treasure
  (E), then also points of interest (M), for 1 h × s; outdoors [SPL]. [MAN]
  says 1 hour flat. A party buff [MMX]. Project: `wizard-eye` (line 188),
  power 1/2/3 for 1 h × s, inert; there is no minimap (MM6-GAPS 30).
  **Partial.**
- **A2 Static Charge.** One bolt for 1d5+1 (2–6) Electricity; always hits
  [SPL; JPK; CHN]. [MAN] says 1 + s d5. The unpatched game charged a wrong
  cost at Expert [GF-P]. The Wand of Static casts it [ITM]. **Missing.**
- **A3 Protection from Electricity.** The party's Electricity resistance
  rises by s, 2 × s or 3 × s [SPL], for 1 h × s [MAN]. **Missing.**
- **A4 Sparks.** 3/5/7 small balls that bounce about until they hit
  something or die out, each 2 + s Electricity. Hard to aim; they can hit
  the party [SPL; MAN]. The Fairy Wand of Sparks casts it [ITM]. Project:
  `sparks` (line 204) sends 3/5/7 bolts of 1d3 + s (the same mean) straight
  at one monster; no bounce. **Present but deviates.**
- **A5 Feather Fall.** No damage from falls of more than 10 ft (3 m), for
  the party, for 5/10/60 min × s [SPL]. A party buff [MMX]. The project has
  no fall damage yet (MM6-GAPS 11). **Missing.**
- **A6 Shield.** Damage from missiles such as arrows and rocks is halved.
  Normal: one member for 1 h + 5 min × s. Expert: the party. Master: the
  party for 1 h + 15 min × s [SPL]. [MAN] differs: 5 min × s, 15 min × s at
  Expert, the party at Master. A member buff [MMX]; the "of Shielding"
  enchantment does the same [RPGC]. **Missing.**
- **A7 Lightning Bolt.** One target, s d8 Electricity; always hits [SPL].
  The Arcane Wand of Lightning casts it [ITM]. **Missing.**
- **A8 Jump.** The party leaps about 60 ft (18 m) [SPL], launched at 45°
  [MAN], and takes no fall damage. The party can also jump without the
  spell, with the X key [MAN; GF-P]. Project: `jump` (line 220) costs 8
  (MM6 15) and asks for 2 m of height; inert. DESIGN 7 makes jumping a spell
  only (owner decision; MM6-GAPS 37). **Partial.**
- **A9 Implosion.** One target, 10 + s d10, Physical damage [SPL]. The
  Mystic Wand of Implosion casts it [ITM]. **Missing.**
- **A10 Fly.** The party flies, outdoors only, for 5/10/60 min × s; it
  costs 1 SP every 5 minutes while off the ground [SPL]. Keys fly up, fly
  down and land [MAN]. A party buff [MMX]. Gaps: which member pays the
  drain. **Missing.**
- **A11 Starburst.** 8/12/16 stars fall round the target, each 20 + s
  Electricity; they can hit the party; outdoors only [SPL]. Radius 20 ft
  (6 m) [MAN]. Patched range limit as Meteor Shower [GF-P]. **Missing.**

### 4.3 Water

| #   | Spell                | SP    | Recovery    | Learn | Target          | Element | Spec | Project              |
| --- | -------------------- | ----- | ----------- | ----- | --------------- | ------- | ---- | -------------------- |
| W1  | Awaken               | 1     | 60          | N / N | party           | —       | full | Present but deviates |
| W2  | Cold Beam            | 2/1/0 | 90/80/80    | N / N | one monster     | Cold    | full | Missing              |
| W3  | Protection from Cold | 3     | 120         | N / N | party           | —       | full | Missing              |
| W4  | Poison Spray         | 4     | 110/100/90  | N / N | volley          | Poison  | full | Missing              |
| W5  | Water Walk           | 5     | 150/120/120 | N / E | party           | —       | full | Partial              |
| W6  | Ice Bolt             | 8     | 110/100/90  | N / E | one monster     | Cold    | full | Missing              |
| W7  | Enchant Item         | 10    | 140         | N / E | item            | —       | gaps | Missing              |
| W8  | Acid Burst           | 15    | 110/100/90  | N / E | one monster     | Poison  | full | Missing              |
| W9  | Town Portal          | 20    | 200         | N / M | party           | —       | full | Missing              |
| W10 | Ice Blast            | 25    | 120/110/100 | N / M | shattering ball | Cold    | full | Missing              |
| W11 | Lloyd's Beacon       | 30    | 250         | N / M | party           | —       | full | Missing              |

- **W1 Awaken.** Wakes every sleeping member; a magical sleep only within
  the window (section 3.7) [SPL; DOB]. [RPGC] prints 10 min × s at Expert;
  [SPL] says 1 h × s. [MAN] has it shorten the sleep instead. Project:
  `awaken` (line 229) wakes one member at Normal and the party from Expert;
  no window. **Present but deviates.**
- **W2 Cold Beam.** One target, 1d5+1 (2–6) Cold; always hits [SPL; MAN].
  The Wand of Cold casts it [ITM]. **Missing.**
- **W3 Protection from Cold.** The party's Cold resistance rises by s, 2 ×
  s or 3 × s, for 1 h × s [SPL]. [RPGC] prints a cost of 1. **Missing.**
- **W4 Poison Spray.** 1/3/5 shots straight ahead, each 2 + s d2 Poison
  [SPL]. The Fairy Wand of Poison casts it [ITM]. **Missing.**
- **W5 Water Walk.** The party walks on water, outdoors, for 5/10/60 min ×
  s; it costs 1 SP every 20 minutes while on water [SPL]. The unpatched game
  drained every 5 minutes [GF-P]. A party buff [MMX]. Project: `water-walk`
  (line 230) lasts 10 × s minutes and is inert; the project wades where MM6
  drowns (MM6-GAPS 11). **Partial.**
- **W6 Ice Bolt.** One target, s d7 Cold; always hits [SPL]. The Alacorn
  Wand of Ice casts it [ITM]. **Missing.**
- **W7 Enchant Item.** Tries to make a plain item magic; success 10 % × s.
  Normal gives weak enchantments, Expert stronger ones, Master can also
  enchant weapons [SPL]. [CHN]: Normal draws from treasure level 3, Expert
  from level 4. Gaps: what a failure does, and the enchantment tables. Needs
  item instances with enchantments (MM6-GAPS 12). **Missing.**
- **W8 Acid Burst.** One target, 9 + s d9 Poison; always hits [SPL].
  **Missing.**
- **W9 Town Portal.** Success 10 % × s. Takes the party to the central
  fountain of the last town visited. Normal: outdoors only. Expert: indoors
  too. Master: any town, by choice [SPL]. Towns with a portal fountain: New
  Sorpigal, Free Haven, Misty Islands, Silver Cove, Blackshire and the
  Frozen Highlands [JPK]. [MAN] and [MG] give a cost of 25. Patched:
  cancelling the town choice no longer costs the turn [GF-P]. **Missing.**
- **W10 Ice Blast.** A ball flies the way the caster faces and breaks on
  impact into 7 shards. They spread in every direction away from the caster
  and ricochet until they hit something or melt; each deals 12 + s d2 Cold
  [SPL]. Ricochets can hit the party [MAN]. **Missing.**
- **W11 Lloyd's Beacon.** Sets a beacon where the party stands, or returns
  the party to a beacon. 1/3/5 beacons per caster; each fades after 1 h × s,
  1 day × s or 1 week × s [SPL]. Beacons belong to the caster (MMX
  `Player.Beacons`) [MMX]. [MG] says 3 days × s at Expert. Unpatched: the
  game autosaved after paying the cost [GF-P]. **Missing.**

### 4.4 Earth

| #   | Spell                 | SP    | Recovery             | Learn | Target            | Element  | Spec | Project              |
| --- | --------------------- | ----- | -------------------- | ----- | ----------------- | -------- | ---- | -------------------- |
| E1  | Stun                  | 1     | 80                   | N / N | one monster       | Magic    | gaps | Present but deviates |
| E2  | Magic Arrow           | 2/1/0 | 100/90/80            | N / N | one monster       | Physical | gaps | Missing              |
| E3  | Protection from Magic | 3     | 120                  | N / N | party             | —        | full | Missing              |
| E4  | Deadly Swarm          | 4     | 110/100/90 (see 3.3) | N / N | one monster       | Physical | full | Missing              |
| E5  | Stone Skin            | 5     | 140/120/120          | N / E | member; party E–M | —        | full | Missing              |
| E6  | Blades                | 8     | 110/100/90           | N / E | one monster       | Physical | full | Missing              |
| E7  | Stone to Flesh        | 10    | 140                  | N / E | member            | —        | full | Present but deviates |
| E8  | Rock Blast            | 15    | 110/100/90           | N / E | rolling rock      | Physical | full | Missing              |
| E9  | Turn to Stone         | 20    | 130                  | N / M | one monster       | Magic    | gaps | Missing              |
| E10 | Death Blossom         | 25    | 120/110/100          | N / M | area where lands  | Physical | full | Missing              |
| E11 | Mass Distortion       | 30    | 140/120/100          | N / M | one monster       | Magic    | gaps | Missing              |

- **E1 Stun.** Strikes one monster, knocks it back a little and makes it
  recover before it can act again; the effect grows with rank [SPL; MAN].
  [MAN] calls it extra monster recovery. [JPK] lists it as a missile. Gaps:
  the push, the added recovery and the resistance roll (section 5.4). The
  Wand of Stunning casts it [ITM]. Project: `stun` (line 241); the runtime
  takes the nearest living monster within 4 m, holds it 1/2/3 s and pushes
  it 1/2/3 m (`dev/index.ts` line 795). **Present but deviates.**
- **E2 Magic Arrow.** One arrow for 1d6+2 (3–8) Physical. It rolls to hit
  like an arrow, with Earth skill as the hit bonus [SPL]. [MAN] says 2 + s
  d6. Gaps: the hit formula. The Wand of Arrows casts it [ITM]. **Missing.**
- **E3 Protection from Magic.** The party's Magic resistance rises by s, 2
  × s or 3 × s [SPL], for 1 h × s [MAN]. **Missing.**
- **E4 Deadly Swarm.** One target, 5 + s d3 Physical; never misses [SPL;
  MAN]. Recovery conflict in section 3.3. The Alacorn Wand of Swarms casts
  it [ITM]. **Missing.**
- **E5 Stone Skin.** Armour class +5 + s. Normal: one member for 1 h + 5
  min × s. Expert: the party. Master: the party for 1 h + 15 min × s [SPL].
  [MAN] differs: +5 flat, 4 min + 5 min × s, 15 min × s at Expert, the
  party at Master. A member buff [MMX]. **Missing.**
- **E6 Blades.** One spinning blade for s d5 Physical. It can miss; its hit
  bonus is 5 × s [GF-M; MAN]. The Alacorn Wand of Blades casts it [ITM].
  **Missing.**
- **E7 Stone to Flesh.** Cures Stoned within the window [SPL]. Project:
  `stone-to-flesh` (line 252) costs 7 (MM6 10); no window. **Present but
  deviates.**
- **E8 Rock Blast.** A rock is released ahead; it bounces and rolls, and
  explodes when it touches a creature or after a while, for s d8 Physical in
  the blast. The party can be caught [SPL]. Blast radius 20 ft (6 m) [MAN].
  The Arcane Wand of Rocks casts it [ITM]. **Missing.**
- **E9 Turn to Stone.** One monster becomes stone for 5/10/20 min × s;
  stone cannot be harmed [SPL]. The monster buff "Stoned" [MMX]. Gaps: the
  resistance roll. **Missing.**
- **E10 Death Blossom.** A stone thrown high explodes where it lands, for
  20 + s Physical; outdoors only; the blast widens at Expert and Master
  [SPL]: 40, 60 and 80 ft (12, 18, 24 m) [MAN]. **Missing.**
- **E11 Mass Distortion.** One target loses 25 % of its hit points plus 2 %
  × s more [SPL]. Gaps: current or full hit points; MMX passes the monster's
  hit points to the damage function [MMX `CalcSpellDamage`]. The Mystic
  Wand of Distortion casts it [ITM]. **Missing.**

### 4.5 Spirit

| #   | Spell          | SP    | Recovery    | Learn | Target            | Element | Spec | Project              |
| --- | -------------- | ----- | ----------- | ----- | ----------------- | ------- | ---- | -------------------- |
| S1  | Spirit Arrow   | 1/1/0 | 90/80/80    | N / N | one monster       | Magic   | gaps | Present but deviates |
| S2  | Bless          | 2     | 140/100/100 | N / N | member; party E–M | —       | full | Partial              |
| S3  | Healing Touch  | 3     | 140         | N / N | member            | —       | gaps | Missing              |
| S4  | Lucky Day      | 4     | 140/140/120 | N / N | member; party M   | —       | full | Missing              |
| S5  | Remove Curse   | 5     | 140         | N / E | member            | —       | full | Present but deviates |
| S6  | Guardian Angel | 8     | 120         | N / E | party             | —       | full | Missing              |
| S7  | Heroism        | 10    | 140/120/120 | N / E | member; party E–M | —       | full | Missing              |
| S8  | Turn Undead    | 15    | 140/120/100 | N / E | undead in sight   | Magic   | gaps | Missing              |
| S9  | Raise Dead     | 20    | 240         | N / M | member            | —       | full | Present but deviates |
| S10 | Shared Life    | 25    | 150         | N / M | party             | —       | gaps | Missing              |
| S11 | Resurrection   | 30    | 1000        | N / M | member            | —       | full | Present but deviates |

- **S1 Spirit Arrow.** One bolt for 1d6 Magic. It can miss; skill helps it
  hit [SPL]. Free at Master. Gaps: the hit formula. Project: `spirit-arrow`
  (line 253) costs 1 at every rank, deals 1d3 + s and never misses.
  **Present but deviates.**
- **S2 Bless.** Attack, melee and missile, +5 + s. Normal: one member for 1
  h + 5 min × s. Expert: the party. Master: the party for 1 h + 15 min × s
  [SPL]. [MAN] differs: +5 flat, 4 min + 5 min × s, 15 min × s at Expert,
  the party at Master. A member buff [MMX]. Project: `bless` (line 269)
  gives +5 + s for 1 h + 5 min × s at every rank and reaches the party only
  at Master; inert. **Partial.**
- **S3 Healing Touch.** One member heals 1d5+2, 1d5+4 or 1d5+6 (3–7, 5–9,
  7–11) [SPL; CHN]. [MAN] says 3–7, 5–11 and 7–13. Gaps: the description
  says skill shortens its recovery (section 3.3). **Missing.**
- **S4 Lucky Day.** Luck +10 + 2 × s (N), +10 + 3 × s (E, M). One member at
  Normal and Expert, the party at Master [SPL]. 1 h × s [MAN; JPK]. [CHN]
  says +10 + s and +10 + 2 × s. A member buff, "TempLuck" [MMX].
  **Missing.**
- **S5 Remove Curse.** Cures Cursed within the window [SPL]. [MAN] gives a
  cost of 10. Project: `remove-curse` (line 285) has no window. **Present
  but deviates.**
- **S6 Guardian Angel.** For 1 h × s: if the whole party dies, it wakes at
  the last temple it visited with 1 hit point each (N), half its hit points
  (E) or all of them (M), and loses half the gold it carries [SPL]. A party
  buff [MMX]. Needs party death (MM6-GAPS 11). **Missing.**
- **S7 Heroism.** Damage per hit +5 + s. Normal: one member for 1 h + 5 min
  × s. Expert: the party. Master: the party for 1 h + 15 min × s [SPL].
  [MAN] says +5 flat and the party only at Master. A member buff [MMX].
  **Missing.**
- **S8 Turn Undead.** Every undead monster in sight flees for 3 + 3 × s
  minutes [SPL; MAN]. It is a Magic spell [SPL], yet MM6's undead are immune
  to Magic [MON]. Gaps: how resistance applies. Needs a flee state and an
  undead flag; `MonsterDef` has neither (`src/game/monsters.ts` line 7).
  **Missing.**
- **S9 Raise Dead.** Cures Dead within the window; leaves Weak [SPL].
  Project: `raise-dead` (line 286) costs 9 (MM6 20); no window. **Present
  but deviates.**
- **S10 Shared Life.** Adds up the party's current hit points, adds s × 1/2/3
  more, then shares the total as evenly as possible, no one above their
  maximum [SPL]. Gaps: whether dead, stoned or unconscious members share.
  **Missing.**
- **S11 Resurrection.** Cures Eradicated within the window; leaves Weak
  [SPL]. It has the longest recovery in the game, 1000 [REC]. [MAN] gives
  a cost of 20. Project: `resurrection` (line 295) costs 11 and cures
  Eradicated and Dead; no window. **Present but deviates.**

### 4.6 Mind

| #   | Spell          | SP  | Recovery    | Learn | Target          | Element | Spec | Project              |
| --- | -------------- | --- | ----------- | ----- | --------------- | ------- | ---- | -------------------- |
| M1  | Meditation     | 1   | 140/140/120 | N / N | member; party M | —       | full | Partial              |
| M2  | Remove Fear    | 2   | 140         | N / N | member          | —       | full | Present but deviates |
| M3  | Mind Blast     | 3   | 110/100/90  | N / N | one monster     | Magic   | full | Missing              |
| M4  | Precision      | 4   | 140/140/120 | N / N | member; party M | —       | full | Missing              |
| M5  | Cure Paralysis | 5   | 140         | N / E | member          | —       | full | Present but deviates |
| M6  | Charm          | 8   | 100         | N / E | one monster     | Magic   | gaps | Missing              |
| M7  | Mass Fear      | 10  | 100/90/80   | N / E | in sight        | Magic   | gaps | Missing              |
| M8  | Feeblemind     | 15  | 110/100/90  | N / E | one monster     | Magic   | gaps | Missing              |
| M9  | Cure Insanity  | 20  | 140         | N / M | member          | —       | full | Present but deviates |
| M10 | Psychic Shock  | 25  | 130/120/110 | N / M | one monster     | Magic   | full | Missing              |
| M11 | Telekinesis    | 30  | 250         | N / M | object          | —       | gaps | Missing              |

- **M1 Meditation.** Intellect and Personality +10 + 2 × s (N), +10 + 3 × s
  (E, M). One member at Normal and Expert, the party at Master [SPL]. 1 h ×
  s [MAN; JPK]. Member buffs "TempIntellect" and "TempPersonality" [MMX].
  Project: `meditation` (line 308) gives +5 + s for 1 h + 5 min × s, the
  party at Master; inert. **Partial.**
- **M2 Remove Fear.** Cures Afraid within the window, on one member [SPL].
  [MAN] gives a cost of 1. Project: `remove-fear` (line 326) reaches the
  party from Expert; no window. **Present but deviates.**
- **M3 Mind Blast.** One bolt for 5 + s d2 Magic [SPL]; it always hits
  [MAN]. The Fairy Wand of Mind casts it [ITM]. **Missing.**
- **M4 Precision.** Accuracy +10 + 2 × s (N), +10 + 3 × s (E, M); the party
  at Master [SPL]; 1 h × s [MAN]. A member buff, "TempAccuracy" [MMX].
  **Missing.**
- **M5 Cure Paralysis.** Cures Paralyzed within the window [SPL]. Project:
  `cure-paralysis` (line 327) has no window. **Present but deviates.**
- **M6 Charm.** One monster drops its hostility for 3/6/12 min × s; any
  damage to it ends the charm [SPL; MAN]. It does not fight for the party.
  The unpatched game had wrong durations [GF-P]. The monster buff "Charm"
  [MMX]. Gaps: the resistance roll. The Alacorn Wand of Charms casts it
  [ITM]. **Missing.**
- **M7 Mass Fear.** Every creature in sight that is not undead flees for 3
  min × s; damage ends it for that creature [SPL]. The monster buff "Fear"
  [MMX]. Gaps: the resistance roll. **Missing.**
- **M8 Feeblemind.** One monster cannot cast spells for 5 min × s [SPL];
  its missile attacks still work [JPK]. A monster buff [MMX]. Gaps: the
  resistance roll. Needs monsters that cast (MM6-GAPS 9). **Missing.**
- **M9 Cure Insanity.** Cures Insane within the window [SPL]; [JPK] adds
  Weak afterwards. Project: `cure-insanity` (line 328) costs 9 (MM6 20); no
  window. **Present but deviates.**
- **M10 Psychic Shock.** One target, 12 + s d12 Magic [SPL]. **Missing.**
- **M11 Telekinesis.** Works an object from a distance: throws switches,
  opens doors and chests, picks up items; strength s × 1/2/3 [SPL]. Reach
  grows with skill too [MAN]. Gaps: what strength and reach decide. Needs
  dungeon mechanics (MM6-GAPS 29). **Missing.**

### 4.7 Body

| #   | Spell                  | SP  | Recovery      | Learn | Target          | Element | Spec | Project              |
| --- | ---------------------- | --- | ------------- | ----- | --------------- | ------- | ---- | -------------------- |
| B1  | Cure Weakness          | 1   | 140           | N / N | member          | —       | full | Present but deviates |
| B2  | First Aid              | 2   | 140 (see 3.3) | N / N | member          | —       | gaps | Present but deviates |
| B3  | Protection from Poison | 3   | 120           | N / N | party           | —       | full | Missing              |
| B4  | Harm                   | 4   | 110/100/90    | N / N | one monster     | Magic   | full | Missing              |
| B5  | Cure Wounds            | 5   | 140 (see 3.3) | N / E | member          | —       | full | Present but deviates |
| B6  | Cure Poison            | 8   | 140           | N / E | member          | —       | gaps | Present but deviates |
| B7  | Speed                  | 10  | 140/140/120   | N / E | member; party M | —       | full | Missing              |
| B8  | Cure Disease           | 15  | 140           | N / M | member          | —       | gaps | Present but deviates |
| B9  | Power                  | 20  | 140/140/120   | N / M | member; party M | —       | full | Missing              |
| B10 | Flying Fist            | 25  | 130/120/110   | N / M | one monster     | Magic   | full | Missing              |
| B11 | Power Cure             | 30  | 150/125/100   | N / M | party           | —       | full | Missing              |

- **B1 Cure Weakness.** Cures Weak within the window [SPL]. [MAN] says rest
  ends Weak after the window. Project: `cure-weakness` (line 329) has no
  window. **Present but deviates.**
- **B2 First Aid.** One member heals 5 (N), 7 (E) or 10 (M) hit points
  [SPL; MAN]. Gaps: the description says skill shortens its recovery
  (section 3.3). Project: the spell is named "Heal" (`heal`, line 330) and
  heals 5 + s × 1/2/3. **Present but deviates.**
- **B3 Protection from Poison.** The party's Poison resistance rises by s,
  2 × s or 3 × s [SPL], for 1 h × s [MAN]. **Missing.**
- **B4 Harm.** One target, 8 + s d2 Magic [SPL]; it never misses [MAN].
  [MAN] says 8 + 2 × s. The Fairy Wand of Harm casts it [ITM]. **Missing.**
- **B5 Cure Wounds.** One member heals 5 + 2 × s [SPL]. [MAN] says 5 + s
  d2. Project: `cure-wounds` (line 341) heals 10 + 2 × s × 1/2/3. **Present
  but deviates.**
- **B6 Cure Poison.** Cures Poisoned within the window [SPL]. Gaps: whether
  it removes all three poison levels. Project: `cure-poison` (line 356)
  costs 6 (MM6 8); the project has one poison state with a severity instead
  of three levels (MM6-GAPS 10); no window. **Present but deviates.**
- **B7 Speed.** Speed +10 + 2 × s (N), +10 + 3 × s (E, M); the party at
  Master [SPL]; 1 h × s [MAN]. A member buff, "TempSpeed" [MMX].
  **Missing.**
- **B8 Cure Disease.** Cures Diseased within the window [SPL]. Gaps: as
  Cure Poison. Project: `cure-disease` (line 357) is level 10 at 10 SP (MM6
  level 8 at 15 SP), so the project's gate asks Master instead of Expert; no
  window. **Present but deviates.**
- **B9 Power.** Might and Endurance +10 + 2 × s (N), +10 + 3 × s (E, M);
  the party at Master [SPL]; 1 h × s [MAN]. [MAN] has Normal raise
  Endurance only. Member buffs "TempMight" and "TempEndurance" [MMX].
  **Missing.**
- **B10 Flying Fist.** One target, 30 + s d5 Magic [SPL]; it cannot miss
  [MAN]. **Missing.**
- **B11 Power Cure.** Every member heals 10 + 2 × s [SPL; MAN].
  **Missing.**

### 4.8 Light (Clerics and Sorcerers only)

| #   | Spell               | SP  | Recovery    | Learn | Target      | Element | Spec | Project |
| --- | ------------------- | --- | ----------- | ----- | ----------- | ------- | ---- | ------- |
| L1  | Create Food         | 20  | 100/90/90   | N / N | party food  | —       | gaps | Missing |
| L2  | Golden Touch        | 25  | 100         | N / N | item        | —       | full | Missing |
| L3  | Dispel Magic        | 30  | 100/90/90   | N / N | in sight    | —       | gaps | Missing |
| L4  | Slow                | 35  | 120/100/80  | N / N | one monster | Magic   | full | Missing |
| L5  | Destroy Undead      | 40  | 120/110/100 | N / E | one undead  | Magic   | gaps | Missing |
| L6  | Day of the Gods     | 45  | 500         | N / E | party       | —       | gaps | Missing |
| L7  | Prismatic Light     | 50  | 150/135/120 | N / E | in sight    | Magic   | full | Missing |
| L8  | Hour of Power       | 55  | 250         | N / E | party       | —       | gaps | Missing |
| L9  | Paralyze            | 60  | 160/140/120 | N / M | one monster | Magic   | full | Missing |
| L10 | Sun Ray             | 65  | 180/165/150 | N / M | one monster | Fire    | full | Missing |
| L11 | Divine Intervention | 70  | 200         | N / M | party       | —       | gaps | Missing |

The gates of the whole school are in section 5.7.

- **L1 Create Food.** Gives the party 1 + k × s / 10 days of food (k =
  1/2/3 by rank), but only if it holds less than that [SPL; MAN]. Gaps: the
  rounding. **Missing.**
- **L2 Golden Touch.** One item in the pack: with chance 10 % × s it turns
  into gold worth 40/60/80 % of its value; otherwise the item breaks [SPL].
  Needs item values and broken items (MM6-GAPS 12). **Missing.**
- **L3 Dispel Magic.** Every creature in sight loses all spells on it, good
  and bad [SPL]. Its description says skill shortens its recovery (section
  3.3). [MAN] says it
  removes only helpful spells from monsters; [JPK] says it clears spells on
  the party. Gaps: whether the party is affected. Liches cast it [MON].
  **Missing.**
- **L4 Slow.** One monster walks at half speed and takes twice as long to
  recover, for 3 min × s [SPL] ([MAN] 1 min × s). It lands with chance 30 /
  (30 + the monster's resistance + its level) [GF-M]. A monster buff
  [MMX]. In [ITM] the Arcane Wand of Paralyzing casts this spell (section
  5.6). **Missing.**
- **L5 Destroy Undead.** One undead target takes 16 + s d16 Magic; nothing
  else is affected [SPL]. Gaps: the undead immunity to Magic in [MON]
  (finding 8). **Missing.**
- **L6 Day of the Gods.** Casts Power, Meditation, Speed, Lucky Day,
  Precision and Guardian Angel on every member at 2 × s (N), 3 × s (E) or 4
  × s (M) [SPL]. Gaps: the bonus and the duration. [CHN] reads +10 + k × s
  for k × s hours (k = 2/3/4); [JPK] says 2 h × s; [MAN] says one day.
  **Missing.**
- **L7 Prismatic Light.** Every creature in sight takes 25 + s Magic;
  indoors only [SPL]. **Missing.**
- **L8 Hour of Power.** Casts Haste, Heroism, Shield, Stone Skin and Bless
  on every member at 2/3/4 × s [SPL]. Gaps: the durations ([JPK] 2 h × s)
  and whether its Haste leaves the party Weak. **Missing.**
- **L9 Paralyze.** One monster can neither move nor attack for 3 min × s
  [SPL] ([MAN] 1 min × s). It lands as Slow does [GF-M]. A monster buff
  [MMX]. Unpatched: area spells skipped paralysed monsters, and monsters'
  Paralyze did nothing [GF-P]. **Missing.**
- **L10 Sun Ray.** One target, 20 + s d20 Fire; outdoors by day only
  [SPL]. Cost: 65 [SPL; CHN], 70 [RPGC], 130 [MAN]. **Missing.**
- **L11 Divine Intervention.** Every member is healed fully, gets all spell
  points back and loses every condition; the caster ages 10 years [SPL].
  1/2/3 casts a day per caster [SPL; MMX]. The description and [MAN] allow
  it only at sunrise or sunset. Gaps: whether the game checks that, and how
  aging is applied. Cost 70 [SPL; MAN] (RPGC 75). The book is not sold
  (section 5.1). Needs aging (MM6-GAPS 22). **Missing.**

### 4.9 Dark (Clerics and Sorcerers only)

| #   | Spell             | SP  | Recovery      | Learn | Target            | Element  | Spec | Project |
| --- | ----------------- | --- | ------------- | ----- | ----------------- | -------- | ---- | ------- |
| D1  | Reanimate         | 20  | 100           | N / N | corpse            | —        | gaps | Missing |
| D2  | Toxic Cloud       | 30  | 120/110/100   | N / N | drifting cloud    | Poison   | gaps | Missing |
| D3  | Mass Curse        | 40  | 120           | N / N | in sight          | Magic    | gaps | Missing |
| D4  | Shrapmetal        | 50  | 100/90/80     | N / N | volley            | Physical | full | Missing |
| D5  | Shrinking Ray     | 60  | 120           | N / E | one monster       | Magic    | gaps | Missing |
| D6  | Day of Protection | 70  | 500           | N / E | party             | —        | gaps | Missing |
| D7  | Finger of Death   | 80  | 130           | N / E | one monster       | Magic    | full | Missing |
| D8  | Moon Ray          | 90  | 150/140/130   | N / E | in sight, party   | Magic    | full | Missing |
| D9  | Dragon Breath     | 100 | 160/140/130   | N / M | target and splash | Poison   | full | Missing |
| D10 | Armageddon        | 150 | 250           | N / M | map               | Magic    | full | Missing |
| D11 | Dark Containment  | 200 | 300 (see 3.3) | N / M | exploding missile | Magic    | gaps | Missing |

- **D1 Reanimate.** Raises a corpse with 10/20/30 × s hit points, capped at
  its maximum [SPL]. The risen creature is not made friendly [SPL]; MM6-GAPS
  says it fights for the party. [MAN]: it works on monsters and characters
  with a body in view. Gaps: how the risen creature behaves. **Missing.**
- **D2 Toxic Cloud.** A cloud forms ahead and drifts slowly away; it lasts
  until it runs into something, then deals 25 + s d10 Poison [SPL]. Gaps:
  the size of that hit. **Missing.**
- **D3 Mass Curse.** Every monster in sight is Cursed for 2/3/4 min × s
  [SPL] ([MAN] 1/2/4). The monster buff "Curse" [MMX]. Gaps: what a curse
  does to a monster, and the resistance roll. **Missing.**
- **D4 Shrapmetal.** 3/5/7 fragments are fired ahead; each deals 6 + s d6
  Physical to what it strikes [SPL]. The Mystic Wand of Shrapmetal casts it
  [ITM]. **Missing.**
- **D5 Shrinking Ray.** One monster shrinks to 1/2, 1/3 or 1/4 of its size
  and deals that share of its damage, for 5 min × s [SPL]. A monster buff
  [MMX]. Gaps: the resistance roll. The Mystic Wand of Shrinking casts it
  [ITM]. **Missing.**
- **D6 Day of Protection.** Casts Protection from Fire, Electricity, Cold,
  Poison and Magic, Feather Fall and Wizard Eye on the party at 2/3/4 × s
  [SPL]; resistances +2 × s, +3 × s or +4 × s [MAN; CHN]. Gaps: the
  duration: one day [MAN]; 1 h × s [CHN]. **Missing.**
- **D7 Finger of Death.** One monster dies outright, with chance 3/4/5 % × s
  [SPL]. The unpatched game gave no experience for it [GF-P]. The Mystic
  Wand of Death casts it [ITM]. **Missing.**
- **D8 Moon Ray.** Outdoors at night only. Every monster in sight takes s
  d4 Magic and every member heals s d4 [SPL]. **Missing.**
- **D9 Dragon Breath.** A toxic cloud aimed at one monster: s d25 Poison to
  it and to creatures near it [SPL]; splash radius 10 ft [MAN].
  **Missing.**
- **D10 Armageddon.** 50 + s Magic to every creature on the map, the party
  included; outdoors only; 1/2/3 casts a day per caster [SPL; MMX]. [MAN]
  says it costs no spell points; [SPL] says 150. **Missing.**
- **D11 Dark Containment.** An exploding missile that strikes its victims
  with random effects; some creatures are immune [SPL; JPK]. Gaps: the
  effects; [MAN] describes nothing. The book is not sold (section 5.1).
  **Missing.**

## 5. Systems around the spells

### 5.1 Guilds, membership and spellbooks

MM6, the guild houses [HSE]:

| House                                       | Schools    | Books sold | Price factor | Open                    |
| ------------------------------------------- | ---------- | ---------- | ------------ | ----------------------- |
| Initiate Guild of Fire, Air, Water or Earth | one        | 1–7        | 2            | 06–18                   |
| Adept Guild of Fire, Air, Water or Earth    | one        | 1–11       | 3            | 06–18                   |
| Initiate Guild of Spirit, Mind or Body      | one        | 1–7        | 2            | 06–18                   |
| Adept Guild of Spirit, Mind or Body         | one        | 1–11       | 3            | 06–18                   |
| Initiate Guild of the Elements              | F, A, W, E | 1–4        | 1.5          | 06–18                   |
| Adept Guild of the Elements                 | F, A, W, E | 1–8        | 2.5          | 06–18                   |
| Initiate Guild of the Self                  | S, M, B    | 1–4        | 1.5          | 06–18                   |
| Adept Guild of the Self                     | S, M, B    | 1–8        | 2.5          | 06–18                   |
| Initiate Guild of Light or Dark             | one        | 1–6        | 3            | Light 10–14, Dark 22–02 |
| Adept Guild of Light or Dark                | one        | 1–10       | 4            | as above                |

- A magic guild also teaches its schools at Normal rank. The single-school
  Fire, Air, Water and Earth guilds also teach Learning; the Spirit, Mind and
  Body guilds also teach Meditation [HSE].
- Skill prices [JPK]: 750 at an Initiate Guild of the Elements or the Self,
  1250 at an Adept one, 1000 and 1500 at the single-school guilds, 1500 and
  2000 at Light and Dark. Each is 500 × the house's price factor
  (inference).
- Book base values by spell level: 100, 200, 300, 400, 500, 750, 1000,
  1500, 2000, 3000, 5000; Light and Dark 1000, 1500, 2000, 2500, 3000, 3500,
  4000, 5000, 6000, 7500, 10000 [ITM; RPGC]. How a guild prices a book from
  these is unverified.
- Membership:
  - A townsperson in an ordinary house sells it, as a dialogue topic; the
    guild does not [JPK].
  - It is per character: each member earns the award "Joined the … Guild"
    [AWD], and a guild serves the selected character only if that character
    belongs [MAN].
  - Prices: 100 for the Elements or the Self, 50 for a single school, 1000
    for Light or Dark [JPK].
- Buying: the guild shows its shelf of books when the selected member
  belongs and does not yet know all its spells. Pointing at a book names the
  spell and its price; a click buys it [MAN]. The book goes to the pack and
  is read, by clicking it on the member's portrait, to learn the spell
  [MAN].
- Stock: [JPK] gives magic guilds a 2-day reset; what resets is
  unverified.
- Where [JPK]: the Elements and the Self in New Sorpigal (Initiate);
  Elements Adept in the Frozen Highlands; Self Adept in Silver Cove; Fire,
  Water and Air Initiate in the Misty Islands; Earth Initiate in Silver
  Cove; Spirit, Mind and Body Initiate in Castle Ironfist; every
  single-school Adept in Free Haven; Light in Silver Cove (Initiate) and
  Blackshire (Adept); Dark in the Frozen Highlands (Initiate) and Blackshire
  (Adept).
- The eleventh Light and Dark books, Divine Intervention and Dark
  Containment, are not sold [HSE]. They lie in the Captain's treasure, the
  reward of the obelisk puzzle [DOB]. Other books turn up as treasure too
  (MM6-GAPS 16).

Project:

- `GuildDef` (`src/game/services.ts` line 124) has one school, a top spell
  level, a fee and a price factor. No guild of several schools, no Initiate
  and Adept tiers, no hours, no skill teaching, no Light or Dark.
- `SPELLBOOK_PRICES` (line 135) runs 50, 100, 200, 300, 400, 500, 700,
  1000, 2000, 5000, 10000 by level, times the factor. MM6's book values
  differ at every level, and Light and Dark have a scale of their own.
- `joinGuild` (line 143) adds the guild to `state.memberships`
  (`src/game/state.ts` line 44), shared by the whole party.
- `buySpellbook` (line 163) teaches the spell at once, after the rank gate
  of section 3.1. Books are not items.
- `renderGuild` (`src/ui/services.ts` line 112) works in tests; no guild
  stands in the world (MM6-GAPS 16).
- **Status:** Partial. **Size:** M for the rules; placing the houses
  depends on the world (MM6-GAPS 34).

### 5.2 The quick spell

MM6:

- Each character has one readied spell, the "quick spell"; the character
  sheet shows it ("Quick Spell: None" on screenshot-21) [SHOT].
- It is set in the spellbook: select a spell, then press the tab at the
  foot of the book, or Space [MAN].
- S casts it [MAN]. An attack spell goes at the nearest monster. A spell
  that needs a subject turns the pointer into a crosshair for the player to
  click. Ctrl and a click cast it at a chosen target [MAN].
- C opens the book to cast any other spell [MAN].
- It is stored per character (MMX `Player.QuickSpell`) [MMX].
- The patch fixes a wrong spell point check on quick casts and adds a
  separate "attack spell" cast by the attack key; the attack spell is not
  in the original [GF-P].

Project: none. `Character` (`src/game/character.ts` line 39) has no such
field, and the HUD has no cast control.

For a phone (a proposal, not MM6; owner decision):

- Set the readied spell with a long press on a spell in the book.
- Cast it from a small control on the member's HUD cell, or with a long
  press on a monster. Attack spells go at the pressed monster, or else at
  the monster the bolt cone picks (section 3.4). Member spells wait for a
  portrait tap, as the book already does (`src/ui/spellbook.ts` line 95).
- Bump the save version (`SAVE_VERSION`, `src/game/save.ts` line 19).
- **Size:** M.

### 5.3 Spell recovery and weapon recovery

MM6:

- One counter per character covers attacks, shots and casts (section 3.3)
  [MMX; MAN].
- Attack: weapon base + armour − skill − Speed effect − 25 under Haste − 20
  for a swift weapon; never below 30 in melee [GF-M].
- Cast: the [REC] value for the caster's rank. MM7 applies no Speed, armour
  or floor to it [OE]; MM6 is unverified.
- Being hit: + (20 − Endurance effect) [GF-M]. In the unpatched game a hit
  also moved the selection to another member [GF-P].
- Moving before the counter runs out slows its recovery, running more
  [MAN]. The amount is unverified.
- Unpatched: waiting in the rest screen did not count recovery down [GF-P].
- Lloyd's Beacon and Town Portal set their recovery before the party leaves
  [GF-P].

Project:

- `PartyMember.readyAt` (`src/game/party.ts` line 74) gates attacks only;
  `castSpell` never sets it.
- Weapon recovery is in seconds per item (MM6-GAPS 8).
- To do:
  - One function from ticks to seconds for weapons and spells, with the
    constant chosen once (section 3.3; owner decision).
  - Set `readyAt` on every cast: book, quick spell and scroll.
  - Make `canCast` refuse a member who is recovering.
  - Move the selection on after a cast, as after an attack.
- **Size:** S once the constant is chosen.

### 5.4 Resistances and the damage formula

MM6 [GF-M unless noted]:

- A spell's damage is its roll (section 4), then cut by the target's
  resistance to the spell's type (section 3.5).
- The cut comes in up to four steps. Each step succeeds with chance 1 −
  30 / (30 + R) and halves the damage; the first failed step stops it. The
  least a target can take is 1/16.
  - Monsters: R is the monster's resistance; "Imm" means no damage [MON].
  - Characters: R plus the Luck effect, but only when R is above 0; at R = 0
    the damage is full.
  - Mean share of damage taken: about 75 % at R = 20, 60 % at 40, 39 % at 100.
- Monster records hold six resistances: Fire, Electricity, Cold, Poison,
  Physical, Magic. Values run from 0 to 90, or "Imm" [MON]. The undead
  families in [MON] (skeletons, ghosts, liches) are immune to Poison and
  Magic; so are many others, such as elementals and medusas.
- Characters have five: Fire, Electricity, Cold, Poison, Magic. They start
  at 0 [SHOT]. Protection spells, items ("of Fire Resistance" and the like;
  "of Protection" +10 to all) [RPGC] and shrines raise them (MM6-GAPS 23).
- Status spells: Slow and Paralyze land with chance 30 / (30 + R + monster
  level) in MM6, where R is the monster's resistance [GF-M] to the spell's
  type, Magic [SPL]. Whether Charm, Mass Fear, Turn Undead, Feeblemind, Turn
  to Stone, Mass Curse, Shrinking Ray and Stun use the same roll is
  unverified; MMX exposes a per-type check (`CalcHitByEffect`) [MMX].
- Unpatched [GF-P]: elemental damage from weapon enchantments ignored
  resistances; every monster spell did Fire damage.
- Rounding is unverified; use whole points.

Project: no resistance on `Character` or `MonsterDef`; `takeDamage` gets a
number with no type (`src/world/monster.ts` line 87); Luck does nothing
(MM6-GAPS 3).

- To do: a pure `resistDamage(damage, resistance or 'imm', luckEffect, rng)`
  in `src/game/combat.ts`, tested at R = 0, 20, 40 and 100; six resistances
  on `MonsterDef`; five on `Character`; an element on every damaging effect.
- **Size:** M.

### 5.5 Buffs, durations and the game clock

MM6:

- Time: 256 ticks a game minute, 15360 an hour, 368640 a day [MMX]. At 128
  ticks a real second, a game minute lasts two real seconds (inference;
  MM6-GAPS 22).
- Three kinds of buff [MMX]:
  - **Party:** Fire, Electricity, Cold, Poison and Magic resistance; Feather
    Fall; Water Walk; Fly; Guardian Angel; Wizard Eye; Torch Light.
  - **Member:** Bless, Heroism, Haste, Shield, Stone Skin; temporary Luck,
    Intellect, Personality, Accuracy, Endurance, Speed and Might.
  - **Monster:** Charm, Curse, Shrinking Ray, Fear, Stoned, Paralyze, Slow,
    Feeblemind.
- A buff holds an end time, a power and the caster's skill [MMX
  `SpellBuff`].
- Casting a buff that is already on: the unpatched game kept the old one
  whenever it lasted longer, even if the new one was stronger; the patch
  lets the stronger one replace it [GF-P]. This spec follows the patch.
- Durations per spell are in section 4. Haste leaves Weak behind (F5).

Project:

- No buff store. `SpellEffect` has `buff` and `party-buff` kinds
  (`src/game/spells.ts` lines 68–69); the runtime drops them with "takes no
  hold yet" (`src/dev/index.ts` line 816).
- One duration for every buff: `buffMinutes` = 60 + 5 × s (`spells.ts` line
  103).
- **The clock does not advance in the world.** `advanceClock` adds
  `Math.floor(minutes)` (`src/game/time.ts` line 58). The frame loop passes
  the frame's seconds × 1 (`src/dev/index.ts` line 876), at most 0.05
  because the frame step is capped, and that floors to 0. Rests and waits
  move the clock; walking does not. DESIGN 16.3 and
  `MINUTES_PER_REAL_SECOND` (`src/world/daylight.ts` line 13) intend one
  game minute per real second. Found by reading, not by running; confirm
  with a unit test, then keep the fraction (fractional minutes, or a
  remainder carried between frames).
- Timed conditions expire only in rests and waits (`src/game/rest.ts` line
  94).
- Torch Light runs on real seconds outside any store
  (`src/world/atmosphere.ts` line 37).
- To do:
  - `Character.buffs` and `GameState.partyBuffs`, keyed by the MMX names
    above, each entry holding `until`, `power` and `skill`; monster buffs on
    the `Monster` instance (not saved: monsters respawn on load).
  - One `expireBuffs(now)` each game minute and after rests.
  - Active buffs on the character sheet.
  - Save version 2.
- **Size:** M for the store; S for each buff after it.

### 5.6 Scrolls and wands

MM6:

- One scroll for each of the 99 spells [ITM]. Values by spell level: 10,
  20, 30, 40, 50, 75, 100, 150, 200, 300, 500; Light and Dark 100, 150, 200,
  250, 300, 350, 400, 500, 600, 750, 1000 [ITM; RPGC].
- To read one, click it on the member's large portrait. Right-clicking a
  portrait while holding the scroll casts at that member [MAN].
- Unpatched [GF-P]: the right-click picked the target by itself; members
  who could not act could read scrolls; some scrolls never ran out in
  turn-based mode.
- The skill and rank a scroll casts at in MM6: unverified. MM7 casts
  scrolls at Master, skill 5 [OE].
- One spellbook item for each of the 99 spells [ITM].
- 25 wands in five tiers [ITM; RPGC]:

| Tier, value   | Wands and their spells [ITM]                                                                            | Number per wand [ITM] |
| ------------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| Wand, 1000    | Flame (Flame Arrow), Static (Static Charge), Cold (Cold Beam), Stunning (Stun), Arrows (Magic Arrow)    | 50                    |
| Fairy, 1500   | Fire (Fire Bolt), Sparks, Poison (Poison Spray), Mind (Mind Blast), Harm                                | 40                    |
| Alacorn, 2000 | Fireballs (Fireball), Ice (Ice Bolt), Swarms (Deadly Swarm), Blades, Charms (Charm)                     | 30                    |
| Arcane, 2500  | Blasting (Fire Blast), Lightning (Lightning Bolt), Rocks (Rock Blast), Paralyzing, Clouds               | 25                    |
| Mystic, 3000  | Implosion, Distortion (Mass Distortion), Shrapmetal, Shrinking (Shrinking Ray), Death (Finger of Death) | 15                    |

- The number per wand is most likely the charge count; unverified.
- Two wands disagree between sources. The Wand of Paralyzing casts spell 81
  (Slow) in [ITM] but Paralyze in [RPGC]. The Wand of Clouds holds "S09" in
  [ITM] (spell 9 is Meteor Shower; Toxic Cloud is 90) but Jump in [RPGC].
  Unverified.
- An empty wand vanished in the original; the patch keeps it, broken
  [GF-P].
- The skill and rank a wand casts at in MM6: unverified. MM7: Normal, skill
  8 [OE].
- MM6 has no spell to recharge a wand (MMX tags Recharge Item MM7 and later)
  [MMX].

Project:

- Two scrolls: Torch Light at skill 1 and Fire Bolt at skill 4, both at
  Normal (`src/game/items.ts` lines 240 and 249;
  `src/ui/inventory-model.ts` line 297).
- The reader is always the target (`src/ui/inventory.ts` line 103).
- Reading costs no spell points (right for MM6) and no recovery.
- No spellbook items, no wands, no charges.
- **Size:** S for a scroll of every spell once the spells exist; S to M for
  wands with charges, which need item instances (MM6-GAPS 12).

### 5.7 Light and Dark: the gates

- Classes: Clerics, Sorcerers and their promotions only [RPGC; DOB].
- Not at creation; learnt in play [RPGC skills].
- The Normal skill is taught at a Light or Dark guild, 1500 gold at an
  Initiate guild and 2000 at an Adept one, after a membership of 1000 gold
  [JPK].
- Light guilds open 10:00–14:00; Dark guilds 22:00–02:00 [HSE; JPK].
- Expert costs 2000: Light in Silver Cove or Kriegspire, Dark in the Frozen
  Highlands or Blackshire [JPK; RPGC skills].
- Master needs a reputation: Saintly for Light (taught in the Eel Infested
  Waters), Notorious for Dark (taught in Paradise Valley) [JPK]. On [JPK]'s
  scale Saintly lies beyond about +1000 and Notorious beyond about −1000.
  The project has no reputation (MM6-GAPS 25).
- Books: guilds sell 1–6 (Initiate) or 1–10 (Adept); book 11 only as
  treasure (section 5.1).
- MM6 asks no choice between Light and Dark; a character may master both
  [CHF-S]. MM7 made it a choice [WP7].
- Spell gates of the two schools (section 3.6): Sun Ray by day outdoors;
  Moon Ray at night outdoors; Prismatic Light indoors; Armageddon outdoors;
  Divine Intervention at sunrise or sunset; casts per day for Divine
  Intervention and Armageddon; Divine Intervention ages its caster.
- Project: none of this (section 3.1).

### 5.8 Monsters that cast

- A monster record names one spell with a rank and a skill, for example
  Lightning Bolt at Master 12 [MON]. The spells are the party's: Flame
  Arrow, Cold Beam, Fire Bolt, Fireball, Meteor Shower, Incinerate,
  Lightning Bolt, Ice Bolt, Poison Spray, Deadly Swarm, Mind Blast, Psychic
  Shock, Harm, Flying Fist, Toxic Cloud, Mass Curse, Paralyze, Finger of
  Death and Dispel Magic [MON].
- They always hit the party [GF-M]. The unpatched game made every monster
  spell do Fire damage [GF-P].
- So the effect code should take any caster and any target: the same
  Fireball for a monster as for the party (MM6-GAPS 9).

## 6. Corrections to MM6-GAPS

| MM6-GAPS (sections 7, 14, 16) says                 | This document finds                                                              | Source          |
| -------------------------------------------------- | -------------------------------------------------------------------------------- | --------------- |
| Nine defined spells have wrong costs               | Seven, plus Spirit Arrow, which should be free at Master                         | [SPL]           |
| Light costs 20 to 75                               | 20 to 70: Sun Ray 65, Divine Intervention 70                                     | [SPL]           |
| Recovery numbers unverified                        | Known per spell and rank                                                         | [REC]           |
| The rank a spell needs to be learnt: unverified    | None in MM6 (inferred); MM7 gates 1–4/5–7/8–10/11                                | [MMX; SPL; WP7] |
| Charm: a monster fights for the party              | It only stops being hostile                                                      | [SPL; MAN]      |
| Reanimate: a dead monster rises for the party      | It is not made friendly                                                          | [SPL]           |
| Day of the Gods: exact stats unverified            | Power, Meditation, Speed, Lucky Day, Precision and Guardian Angel at 2/3/4 × s   | [SPL]           |
| Day of Protection: exact effect unverified         | The five Protections, Feather Fall and Wizard Eye at 2/3/4 × s                   | [SPL]           |
| Guild membership: how it is obtained is unverified | Bought from a townsperson; per character                                         | [JPK; AWD; MAN] |
| Books cost 100–5000 and 1000–10000                 | Those are item values; the guild's price formula is unverified                   | [ITM]           |
| 25 wands from Fire Bolt to Finger of Death         | Five tiers from Flame Arrow up (section 5.6); two wands disagree between sources | [ITM; RPGC]     |
| Protection from Cold: 3 (RPGC prints 1)            | 3                                                                                | [SPL]           |

## 7. Recommended build order

Groups share mechanics, so each builds once what its spells need. Sizes as
in section 1. Numbers in brackets point to MM6-GAPS sections. Each group
also updates DESIGN 14 and `src/game/README.md`, as CLAUDE.md asks when a
rule changes.

1. **Make the 24 right and lay the shared base. Size M.**
   - One data row for each of the 99 spells: school, level, SP and recovery
     per rank, element, target kind, place and time gates, casts per day.
     The book can list every spell before its effect exists.
   - Costs, levels and names from [SPL]: seven costs (Jump among them),
     Cure Disease to level 8, "Heal" renamed First Aid, Spirit Arrow free at
     Master.
   - The formulas of the defined spells: Fire Bolt s d4; Sparks 2 + s;
     Spirit Arrow 1d6 with its hit roll; First Aid 5/7/10; Cure Wounds 5 + 2
     × s; Awaken the party at every rank; Remove Fear one member at every
     rank; Bless the party from Expert and 1 h + 15 min × s at Master;
     Meditation +10 + 2/3 × s for 1 h × s; Protection from Fire 1 h × s;
     Water Walk 5/10/60 min × s.
   - Drop the rank gate (decision 2 in section 8).
   - Recovery on every cast (section 5.3).
   - Fix the clock (section 5.5) and let timed conditions expire in the
     world.
   - Cure windows with the patched values (section 3.7).
   - Done when: unit tests cover each spell's cost and recovery by rank, a
     second cast before recovery is refused, and a cure outside its window
     fails.
2. **The quick spell. Size M.** Section 5.2. Right after group 1: every
   later group is played through it.
3. **Single-target bolts. Size M.** Flame Arrow, Static Charge, Cold Beam,
   Magic Arrow, Lightning Bolt, Ice Bolt, Acid Burst, Deadly Swarm, Blades,
   Mind Blast, Harm, Implosion, Psychic Shock, Flying Fist, Incinerate, Mass
   Distortion, Destroy Undead, Sun Ray, Finger of Death (19 spells).
   - Shared: resistances and the halving roll (section 5.4), six resistances
     on `MonsterDef`, the arrow hit roll, an undead flag, outdoor and
     daylight checks.
   - The runtime exists: `SpellEffects.bolt` (`src/world/spellfx.ts`, at
     line 187) flies, lights and bursts. Its palettes are per school; damage
     types need their own.
4. **Heals. Size S.** Healing Touch, Power Cure, Shared Life.
5. **The buff store and the buffs. Size L.** Section 5.5.
   - The five Protections, with the five character resistances.
   - Bless, Heroism and Stone Skin.
   - Shield, once monsters shoot [9].
   - Haste, with Weak when it ends.
   - Lucky Day, Meditation, Precision, Speed and Power, after the split of
     statistics into base and bonus [3].
   - Torch Light moved into the store.
   - Then Hour of Power, Day of the Gods and Day of Protection.
6. **Volleys and areas. Size L.**
   - Straight volleys: Fire Blast, Poison Spray, Shrapmetal.
   - Physics missiles: Sparks (bounce), Rock Blast (rolls, then a timer),
     Ice Blast (shatters, ricochets). Havok is already set up
     (`src/app/physics.ts`).
   - Blasts: Fireball, Dragon Breath, Toxic Cloud.
   - Round the party: Ring of Fire.
   - Falling areas, outdoors: Meteor Shower, Starburst, Death Blossom.
   - In sight: Inferno, Prismatic Light, Moon Ray.
   - The map: Armageddon, with its casts per day.
   - Shared: area queries, a line-of-sight test for "in sight", damage to
     the party from its own blasts, indoor and outdoor checks.
7. **Monster states. Size L; XL with monster spellcasting.** Stun's real
   effect, Slow, Paralyze, Turn to Stone, Charm, Mass Fear, Turn Undead,
   Shrinking Ray, Mass Curse, Feeblemind, Dispel Magic, Reanimate, and Dark
   Containment last. Needs monster states for fleeing, calm, paralysis and
   casting [9].
8. **Movement and travel. Size XL in all.**
   - Jump (after the decision on a jump key), Feather Fall with fall damage
     [11], Water Walk with drowning [11]: M together.
   - Fly: M alone (touch controls for up and down, a ceiling, the drain).
   - Town Portal and Lloyd's Beacon: M once towns have fountains [34];
     beacons are saved per character [32].
   - Telekinesis with the dungeon mechanics [29]; Wizard Eye with the
     minimap [30].
9. **Items, food and the last spells. Size M.**
   - Create Food (S); a scroll for every spell (S); wands with charges (S to
     M).
   - Golden Touch and Enchant Item, after item instances, values,
     enchantment tables and broken items [12].
   - Divine Intervention, after aging [22]; Guardian Angel, after party
     death [11].
10. **Guilds and books. Size M**, in parallel with groups 3 to 6: Light and
    Dark as skills for Clerics and Sorcerers, per-character membership, the
    guild tiers, hours and prices, books as items read from the pack
    (section 5.1).

Start with group 1: it touches only code that exists, needs no art and no
new systems, and every later group depends on its recovery, clock and data
table.

## 8. Decisions for the owner

1. **Original or patched rules**: cure windows, buff replacement, Water
   Walk's drain, the range of Meteor Shower and Starburst. This spec
   follows the patch [GF-P].
2. **The learning gate**: MM6 has none (inferred). The project's gate would
   go, or be recorded in DESIGN as a deliberate change.
3. **Ticks to seconds**: 128 ticks a second as in MMX, or MM7's sixtieths
   of a second (section 3.3). Weapons and spells must share it.
4. **Manual against data**: this spec follows the data [SPL; REC] wherever
   the manual disagrees.
5. **Quick spell on touch**: the control (section 5.2).
6. **Jumping**: MM6 has a jump key and a Jump spell; DESIGN 7 keeps the
   spell only.
7. **Turn-based mode** changes how recovery is spent; DESIGN 7 excludes it.

## 9. Sources

All public; read on 2026-10-17 and 2026-10-18. Downloaded pages were read as
data only; nothing from them is in this repository.

- **[SPL]** MM6's spell table (`Spells.txt`, English): per spell its level,
  damage type, spell points per rank and rank effects. As published by the
  might-and-magic/mm678-i18n project:
  https://github.com/might-and-magic/mm678-i18n
  (`source/en/mm6/data/10LocLANG.icons/Spells.txt`).
- **[ITM]** MM6's item table (`ITEMS.TXT`, same path): scrolls, books and
  wands with their spells, values and wand numbers.
- **[HSE]** MM6's house table (`2DEvents.txt`, same path): the guilds, their
  schools, book ranges, price factors and hours.
- **[MON]** MM6's monster table (`MONSTERS.TXT`, same path): resistances and
  monster spells.
- **[AWD]** MM6's award table (`Awards.txt`, same path): guild memberships.
- **[REC]** Spell recovery per rank as read from MM6.EXE, posted by
  tomchen1989 in "MM6-8 Spell recovery speed", Celestial Heavens, 2017:
  https://www.celestialheavens.com/forum/topic/13213
- **[CHF-R]** The same thread: the strategy guide's Deadly Swarm values and
  a player's report that nothing shortens spell recovery.
- **[CHF-S]** "MM6: Spell suggestions", Celestial Heavens (players on
  learning both Light and Dark):
  https://www.celestialheavens.com/forum/topic/7848
- **[MAN]** Might and Magic VI manual, The 3DO Company, 1998, scanned at
  https://mocagh.org/nwc/mm6-manual.pdf (keys, quick spell, guilds,
  recovery, every spell).
- **[GF-M]** GrayFace, "Game Mechanics": https://grayface.github.io/mm/mechanics/
- **[GF-P]** GrayFace, MM6 Patch read-me (its fixes describe the original's
  behaviour): https://grayface.github.io/mm/MM6PatchReadMe
- **[MMX]** GrayFace, MMExtension reference (`const.Spells`,
  `const.PartyBuff`, `const.PlayerBuff`, `const.MonsterBuff`, `structs.Player`,
  `structs.SpellBuff`, time constants): https://grayface.github.io/mm/ext/ref/
  and its source, `Scripts/Core/events.lua` (the CanLearnSpell hook):
  https://github.com/GrayFace/MMExtension
- **[OE]** OpenEnroth, an open reimplementation of the MM7 engine; used only
  for MM7 comparisons (`src/Engine/Spells/CastSpellInfo.cpp` and `.h`,
  `src/Engine/mm7_data.h`): https://github.com/OpenEnroth/OpenEnroth
- **[WP7]** Wikipedia, "Might and Magic VII: For Blood and Honor":
  https://en.wikipedia.org/wiki/Might_and_Magic_VII:_For_Blood_and_Honor
- **[RPGC]** RPG Classics, Might and Magic 6 shrine (elemental, clerical and
  dark/light spells, skills, characters, items, enchantments):
  http://tartarus.rpgclassics.com/mm6/
- **[DOB]** D. G. Dobrev, "Complete Guide to Might and Magic VI":
  https://www.cheathappens.com/text/mm6guide.zip.txt
- **[JPK]** Mark Marcelais's MM6 walkthrough, rebuilt by J. Pike (version
  2.0): guilds, memberships, teachers, towns. Copy at
  https://github.com/MacHu-GWU/mm6doc-project
  (`other-doc/Might and Magic VI 6.1.html`).
- **[CHN]** chiuinan, MM6 spell list (Chinese):
  https://chiuinan.github.io/game/game/intro/ch/c12/mm6/mm6/spell.htm
- **[MG]** Magic Grounds, MM6 spells page:
  https://user.xmission.com/~tnelson/mm6/magic/spells.html
- **[SHOT]** The owner's MM6 screenshots in `artwork/reference/`
  (screenshot-21, screenshot-25); reference only.
- The project's own files, as cited, at commit `e9ee563`.
