# MM6 characters and combat: the members' rules against the code

What Might and Magic VI does with the four party members (creation, statistics, classes and
promotions, skills, teachers, levels, the fight, conditions, death, age, hazards, food and rest),
with exact numbers wherever a source gives them, measured against this project. Written
2026-10-18 against commit `d770e33` on branch `claude/quirky-darwin-ize34m`. It deepens sections
1 to 6, 8, 10, 11 and 22 of `docs/MM6-GAPS.md` (cited as GAPS) and changes no decision in
`docs/DESIGN.md`; where it suggests one, it says so.

Not repeated here, only pointed to: the monster record, special attacks, target choice, fleeing
and monster recovery (`docs/gaps/monsters.md`); spells, spell recovery, the quick spell, the
resistance formula and cure windows (`docs/gaps/magic.md`); the item catalogue, slots,
enchantments, Identify, Repair and prices (`docs/gaps/items.md`); training halls, guilds,
teachers by town, temples and taverns as places (`docs/gaps/world.md`).

## Contents

1. How to read this
2. Findings
3. Character creation
4. Statistics and derived values
5. Classes and promotions
6. Skills and their ranks
7. Skill points, teachers and prices
8. Experience, levels and training
9. The combat model
10. Conditions
11. Damage types and resistances
12. Death, eradication and aging
13. Hazards
14. Food and rest as they touch the members
15. Values the project already flags
16. Ranked: the twenty gaps a player of the original notices most
17. What the owner should check in the original
18. Corrections to GAPS, DESIGN 14 and `src/game/README.md`
19. Sources

## 1. How to read this

- **Code read**: `src/game/*.ts`; `src/world/monster.ts`, `player.ts`, `wading.ts`; the combat
  glue in `src/dev/index.ts`; `src/ui/hud.ts`, `sheet-model.ts`, `creation-model.ts`.
  `npx vitest run src/game` passes (17 files, 100 tests). Screenshot-21's Paladin was recomputed
  with the project's own functions by a throwaway script outside the repository.
- **Confidence** of each MM6 rule:
  - **verified**: two independent sources agree, or MM6's own data, help text or screens show it;
  - **reported**: one source states it;
  - **inferred**: derived here, or read from the MM7 engine as OpenEnroth rebuilds it [OE]. That
    engine grew out of MM6's, but it is a later game; an [OE] fact is never proof for MM6.
- **Status** words as in GAPS: Missing, Partial, Present but deviates, Present.
- **Size**: hours of code and tests for one person, no art. "+ content" marks a rule that also
  needs places, people or quests in the world.
- **Notice**: when a player of the original would notice the gap. **N1** at creation or in the
  first fight; **N2** in the first town; **N3** by mid-game; **N4** late, rarely, or only an
  expert.
- **Units**: recovery in MM6's own units (the manual calls them ticks); distance in game units of
  about 1 cm each (an inference, as in monsters.md).
- Source tags are in square brackets; section 19 lists them with addresses. Where sources
  disagree, both values are given.

## 2. Findings

1. **Every number on the character sheet is wrong.** Screenshot-21 is a level-1 Paladin (Might
   17, Intellect 5, Personality 15, Endurance 15, Accuracy 15, Speed 13, Luck 6; Sword, Spirit,
   Shield, Chain). MM6 shows HP 31, SP 7, AC 14, Attack +2, Damage 5–11, Shoot +1. The project's
   functions give 37, 8, 15, +3, 6–12, +2. MM6's stat table (4.1) and class table (4.3)
   reproduce the screenshot exactly.
2. **The party is built about four times too strong.** MM6 has one pool of 50 bonus points for
   the whole party, lets a stat fall at most 2 below the class start and caps creation at 25;
   every class starts on 73 points. The project gives 50 points to each member, a range of −5 to
   +15 and starts of 79 (`src/game/creation.ts` lines 17–19).
3. **Class data is wrong in most rows.** Hit point base or factor is wrong for all six classes and
   the Cleric's spell point factor too; all six starting skill lists differ (the Paladin starts
   with Sword, not Mace; the Archer with Air Magic, not Leather); the per-class rank caps are
   invented (in MM6 any class that may learn a skill may master it); Clerics may learn Bow but
   not Dagger; Druids may learn Bow; Paladins and Archers Staff; every class Blaster.
4. **Skill points**: MM6 gives 5 + ⌊L ÷ 10⌋ on reaching level L. Two sources' totals match the
   formula exactly (634 points by level 76, 955 by level 100). The project gives 5 forever.
5. **Conditions are mostly invented.** MM6's table of condition effects is known [MW6] and agrees
   line for line with the MM7 engine's [OE]. Weak halves the damage a member deals; Drunk halves
   Might, where the project raises it; Afraid members still act; poison and disease come at three
   levels set by the attacker and never worsen; resting while poisoned or diseased heals to ½, ⅓
   or ¼ instead of not at all; rest cures Weak, Afraid, Drunk, Asleep and Unconscious; an Insane
   member wakes with no spell points.
6. **Going down and dying are each one point off, and death uses the wrong Endurance.**
   MM6's own help text puts a member down at 0 hit points or less; MW6 and the MM7 engine kill
   at minus the base Endurance. The step-1 commit `af9d537` followed the wiki's "below 0" and
   "below minus Endurance". A wiped party has no consequence; MM6 revives it a week later in New
   Sorpigal without its carried gold [MW6].
7. **The runtime ignores rules the code already has.** A struck member gets no hit recovery and a
   condition no start time, because `src/dev/index.ts` line 395 calls `takeDamage` without either;
   monsters still roll the party's formula (`src/world/monster.ts` line 227); a bow shoots at arm's
   length, where MM6 strikes; kills pay unconscious members; quest experience is divided, where
   MM6 pays each member the full sum.
8. **Recovery.** 60 units a second stays unverified for MM6 (it is the MM7 engine's rate, read from
   its code). The Expert armour halving, marked "ours" in the code, is exactly MW6's table. The
   original game's dual wielding added the off-hand weapon's recovery on top (a sword with a dagger
   in the left hand: 150; a dagger with a sword in the left: 180), which GrayFace's patch removes.
9. **Training** costs the hall's base price × the current level × the promotion tier (1, 2 or 3),
   Merchant cuts it to as little as a third, and a visit passes 8 days. The project charges 25
   gold × the new level and passes no time.
10. **What a veteran misses within the hour**: turn-based mode; the gem beside each portrait as an
    enemy detector (the project shows the condition there); faces with expressions and voices;
    the rules of rest (food by terrain, 1 to 5; no rest with monsters near; ambushes in camp).
11. **Promotions** raise the per-level factor for every level already gained (Knight 4, 6, 8 hit
    points a level; every other class one more hit point and one more spell point a level per
    tier); members of other classes get an honorary title that opens the same Master teachers.
12. Section 18 lists corrections to GAPS, DESIGN 14 and `src/game/README.md`.

## 3. Character creation

### 3.1 Identity: name, face, sex, voice

MM6:

- Four characters are made on one screen: portrait arrows and portraits, class, name, the
  selected statistic, the class box, the available skills, the bonus point box and OK [MAN, creation].
  The manual's diagram has no sex control, so the face carries the sex (inferred; the character
  record keeps a `Sex` field [MMX]). LP names the choices as name, gender, picture and class [LP].
- The voice belongs to the face. Choosing a voice apart from the face came with MM7: MMExtension's
  face module marks its voice options as MM7 and later and keeps MM6 faces' own expression and
  sound lists [MMX]. Reported.
- Unverified: the number of faces, and the length limit of a name.

Project: a name of at most 15 letters (`creation.ts` line 20); sex as its own toggle
(`src/ui/creation-model.ts` line 47); a text initial in place of the face (`TEXT_PORTRAIT`,
line 26). The screen appears only with `?create` (`src/dev/index.ts` line 279); a plain launch
uses `testCharacters()` (`src/game/fixtures.ts` line 91).

Gap: no faces; sex not bound to a face; no voices.

Fix: a face list that carries sex and a voice set; drop the toggle. 3 h of code; the art is DESIGN
12.2's pipeline. **N1.**

### 3.2 Statistics at creation

MM6, class starting statistics [MMW class pages, read through search-engine extracts]:

| Class    | Might | Intellect | Personality | Endurance | Accuracy | Speed | Luck | Sum |
| -------- | ----- | --------- | ----------- | --------- | -------- | ----- | ---- | --- |
| Knight   | 14    | 7         | 7           | 14        | 11       | 11    | 9    | 73  |
| Paladin  | 14    | 7         | 14          | 11        | 11       | 9     | 7    | 73  |
| Archer   | 9     | 14        | 7           | 11        | 14       | 11    | 7    | 73  |
| Cleric   | 7     | 9         | 14          | 11        | 11       | 7     | 14   | 73  |
| Sorcerer | 7     | 14        | 9           | 11        | 7        | 14    | 11   | 73  |
| Druid    | 7     | 14        | 14          | 11        | 7        | 11    | 9    | 73  |

- Every class uses the same seven values (14, 14, 11, 11, 9, 7, 7) in its own order. Reported:
  one source family, but internally consistent.
- **One pool of 50 bonus points serves the whole party**; any statistic may be **lowered by up to
  2** below its start, each point returning to the pool; **nothing may exceed 25** at creation
  [DCC; MMW gives each class's minimum as start − 2 and maximum 25]. Reported, two sources.
- A point buys one step (MM6 has no races, so MM7's per-race costs do not arise). Inferred.
- Whether every point must be spent before OK is unverified (MM7 demands it [MM7 card]).
- Check against screenshot-21: Roderick, a ready-made Paladin, has Intellect 5 (the Paladin's
  floor) and a net 13 points spent. Nothing contradicts the rules above.

Project (`src/game/classes.ts`, each class's `baseStats`; `src/game/creation.ts`):

| Class    | Project start, M/I/P/E/A/S/L | Sum | Pool and range                               |
| -------- | ---------------------------- | --- | -------------------------------------------- |
| Knight   | 17/7/9/15/13/11/7            | 79  | 50 per member, start −5 to start +15         |
| Paladin  | 15/7/13/15/11/11/7           | 79  | (`CREATION_POOL`, `STAT_BELOW_BASE`,         |
| Archer   | 13/13/7/11/15/13/7           | 79  | `STAT_ABOVE_BASE`, lines 17–19); every point |
| Cleric   | 11/9/17/13/9/11/9            | 79  | must be spent (line 94)                      |
| Sorcerer | 7/17/9/9/13/13/11            | 79  |                                              |
| Druid    | 9/15/15/11/9/11/9            | 79  |                                              |

Gap: an MM6 party gets 50 points and starts on 292; a project party gets 200 and starts on 316,
so it carries 516 points where MM6's carries 342. The first region's fights are far easier than
MM6's. **Present but deviates.**

Fix: a party-wide pool held by the creation model (a set of four drafts), floor start − 2, cap 25,
MM6's starts. 4 h with tests. **N1** for the screen, **N2** for the difficulty.

### 3.3 Starting skills

MM6: two fixed skills and two picked from a class list of nine [DCC]. Screenshot-22 shows the
Paladin's Sword and Spirit Magic fixed and Shield and Chain picked; MM6's class text says the
Archer begins with Air Magic and the Druid may begin with Learning [TXT `Class.txt`]. Reported,
consistent with the screens and texts.

| Class    | MM6 fixed      | MM6 picks (two of nine)                                                                 | Project fixed | Project picks against MM6's                                                                                  |
| -------- | -------------- | --------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| Knight   | Sword, Leather | Dagger, Axe, Spear, Bow, Shield, Chain, Body Building, Perception, Disarm Trap          | same          | adds Mace, Merchant, Repair, Learning                                                                        |
| Paladin  | Sword, Spirit  | Dagger, Spear, Mace, Shield, Leather, Chain, Perception, Diplomacy, Disarm Trap         | Mace, Spirit  | adds Sword, Axe, Mind, Body, Body Building, Merchant, Repair, Learning; lacks Dagger, Diplomacy, Disarm Trap |
| Archer   | Bow, Air       | Sword, Dagger, Axe, Leather, Fire, Identify Item, Perception, Diplomacy, Disarm Trap    | Bow, Leather  | adds Spear, Chain, Air, Water, Earth, Merchant, Learning; lacks Diplomacy                                    |
| Cleric   | Mace, Body     | Staff, Shield, Leather, Spirit, Mind, Identify Item, Repair Item, Meditation, Diplomacy | same          | adds Dagger, Chain, Body Building, Merchant, Learning; lacks Diplomacy                                       |
| Sorcerer | Dagger, Fire   | Staff, Leather, Air, Water, Earth, Identify Item, Repair Item, Meditation, Diplomacy    | same          | adds Bow, Merchant, Perception, Disarm Trap, Learning; lacks Repair, Diplomacy                               |
| Druid    | Staff, Earth   | Mace, Leather, Water, Spirit, Body, Identify Item, Repair Item, Meditation, Learning    | same          | adds Dagger, Shield, Fire, Air, Mind, Merchant, Perception; lacks Repair                                     |

Project lists: `fixedSkills` and `optionalSkills` in `src/game/classes.ts` (the Paladin's fixed
pair at line 117, the Archer's at line 170). Diplomacy does not exist in the project
(`src/game/skills.ts` lines 12–21).

Fix: data, 1 h (Diplomacy as a learnable skill with no effect until reputation exists). **N1.**

### 3.4 Starting kit, spells, purse, level and age

MM6:

- Screenshots 21 and 22 show the level-1 Paladin with a longsword (3d3: Damage 5–11 less Might's
  +2), chain mail and a wooden shield (AC 8 + 4 + Chain 1 + Shield 1 = 14): one basic item for
  each weapon and armour skill, the picked ones included. Inferred from one character.
- The items start in the pack, unequipped; spells start as spellbooks to be read [LP]. Reported.
  Which books (the first spell of each starting school?) is unverified. Screenshot-19 shows one
  spellbook, two scrolls (the letters) and a small jewel; DCC mentions starting rings worth only
  their sale price.
- 200 gold and 7 food (screenshots 21, 22, 30): verified. Level 1, no experience, no skill points
  (screenshot-22).
- Age: screenshot-21 shows 26 for a new Paladin; MW6 says characters start aged 20 to 25. The
  record keeps a birth year and a magical age bonus [MMX]. Unverified.

Project: `starterKit` (`src/game/state.ts` line 74) gives the weapon of the fixed weapon skill,
leather armour when the class starts with Leather, and a potion; `outfit` (line 91) equips them.
`startingSpells` teaches each starting school's first spell at once (`creation.ts` line 112). Age
20 (`STARTING_AGE`, line 21). Gold and food match (`state.ts` lines 21–22).

Gap: the kit ignores the picked skills; everything is worn and learnt for the player.

Fix: one basic item per weapon and armour skill, all in the pack; spellbooks once items.md 2.6
adds them. 3 h. Age: owner check (section 17). **N1.**

## 4. Statistics and derived values

### 4.1 The bonus table

MM6: the table in GAPS section 3 is MM6's (verified: [GF-M]; David Potts's tables [POT]; LP's
note that 13 and 14 share one effect and that 15 and 17 each add a point [LP]; screenshot-21
reproduces with
it, section 4.3). Thirteen is the first score with no penalty.

Project: `BONUS_TABLE` (`src/game/stats.ts` lines 20–51) is one step high for every score from 4
to 399 (13 gives +1, 15 +2, 17 +3) and gives 22 at 400 and 23 at 500 (MM6: 25 and 30). DESIGN 14.1
calls it the community table; three MM6 sources and a screenshot say otherwise. **Present but
deviates.**

Fix: replace the table; update the tests whose expectations follow from it. 1.5 h. **N1.**

### 4.2 What each statistic does

| Statistic   | MM6                                                                                                                                                                                      | Project                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Might       | Effect added to melee damage only; bows get none (MM6's own help for Shoot Damage lists spells and weapon bonuses, no Might [TXT `stats.txt`]; the MM7 engine adds none [OE]). Reported. | Present (`damageDice`, `src/game/character.ts` line 138).                                                 |
| Intellect   | Effect × the class's SP factor for Archers, Sorcerers and Druids; the save against Insanity [GF-M].                                                                                      | SP Present; the save Missing.                                                                             |
| Personality | Effect × the SP factor for Paladins, Clerics and Druids; the save against Curse [GF-M].                                                                                                  | SP Present; the save Missing.                                                                             |
| Endurance   | Effect × the HP factor; hit recovery 20 − effect; the save against Weak, Asleep, Drunk, Disease, Unconscious and Afraid; the score itself is the depth of death (12.1) [GF-M; MW6].      | HP Present; hit recovery in the rules but not applied (9.7); saves Missing; death uses the current score. |
| Accuracy    | Effect added to Attack and Shoot [GF-M].                                                                                                                                                 | Present.                                                                                                  |
| Speed       | Effect added to AC and taken off weapon recovery [GF-M]. POT says a negative effect counts as 0 for AC (one source); the MM7 engine only floors the total AC at 0 [OE].                  | Present; AC floored at 0 (`armorClass`, line 151).                                                        |
| Luck        | Effect added to every non-zero resistance, unseen on the sheet; part of every save against a monster's special attack; helps against trap damage [GF-M; TXT `stats.txt`].                | Missing: Luck does nothing.                                                                               |

- No statistic falls below 1 [CH tips]. Present (`effectiveStats`, `src/game/conditions.ts`
  line 348).
- Each statistic has a permanent base and a temporary bonus; the sheet shows "current / base"
  (the manual: the left number as changed by spells and conditions, the right the normal one)
  [MAN, character screen; MMX `MightBase`, `MightBonus`; screenshot-21]. The project keeps one number
  (`Character.stats`) and shows a second only when a condition changes it. **Partial.** The split
  is needed by every potion, well, buff and item bonus: 3 h, with the save migrated.

### 4.3 Hit points and spell points

MM6: HP = the class base + the HP factor × (level + Endurance effect + the Body Building bonus);
SP = the class base + the SP factor × (level + the magic statistic's effect + the Meditation
bonus); the Body Building and Meditation bonuses are the skill × 1, 2 or 3 by rank. Knights have
no spell points; Druids add the effects of Intellect and Personality [POT; KAS; DCC; TXT
`SKILDES.TXT`]. Verified for the shape.

| Class line                        | HP base | HP a level, by tier | SP base | SP a level, by tier | SP from                 |
| --------------------------------- | ------- | ------------------- | ------- | ------------------- | ----------------------- |
| Knight, Cavalier, Champion        | 30      | 4, 6, 8             | 0       | none                | none                    |
| Paladin, Crusader, Hero           | 25      | 3, 4, 5             | 5       | 1, 2, 3             | Personality             |
| Archer, Battle Mage, Warrior Mage | 25      | 3, 4, 5             | 5       | 1, 2, 3             | Intellect               |
| Cleric, Priest, High Priest       | 20      | 2, 3, 4             | 10      | 3, 4, 5             | Personality             |
| Sorcerer, Wizard, Archmage        | 20      | 2, 3, 4             | 10      | 3, 4, 5             | Intellect               |
| Druid, Great Druid, Arch Druid    | 20      | 2, 3, 4             | 10      | 3, 4, 5             | Intellect + Personality |

- Factors by tier [MW6; KAS; DCC]; MM6's own class texts give the same steps (Knight +2 hit points
  a level per tier, every other class +1 hit point and +1 spell point a level per tier) [TXT
  `Class.txt`; MAN, classes]. Bases from POT's level-1 formulas (the Knight's 34 + 4 × effect is
  30 + 4 × (1 + effect)). Verified; the Paladin also by screenshot-21: 25 + 3 × (1 + 1) = 31 and
  5 + 1 × (1 + 1) = 7.
- After a promotion the base stays the class line's and only the factor rises. KAS found his
  level-1 formulas running about 10 high for many characters near level 50; an unchanged base
  predicts exactly that for every second-tier class and for the Cavalier, and the MM7 engine keeps
  its base per class line [OE]. Inferred.
- MM6's Body Building help gives the Knight's multiplier as 4 and the Sorcerer's as 1, and its
  Meditation help the Sorcerer's as 4. The Knight's 4 fits; the Sorcerer's numbers contradict
  every other source (2
  and 3). The help text reads like an earlier draft.

Project (`src/game/classes.ts`): Knight 30 + 5; Paladin 25 + 4 and 5 + 1; Archer 20 + 3 and 5 + 1;
Cleric 20 + 3 and 10 + 2; Sorcerer 15 + 2 and 10 + 3; Druid 15 + 2 and 10 + 3. Each at its own
class starts and stat table, level-1 hit points are Knight 45 (MM6 34), Paladin 37 (25),
Archer 23 (25), Cleric 26 (20), Sorcerer 15 (20), Druid 17 (20); spell points Paladin 7 (6),
Archer 7 (6), Cleric 18 (13), Sorcerer 22 (13), Druid 25 (13). The formulas themselves
(`maxHp`, `maxSp`, lines 94–106; Body Building and Meditation, lines 85–92) are MM6's.
**Present but deviates.**

Fix: the table above, with a tier field (5.2). 2 h. **N1.**

### 4.4 Armour class

MM6: the AC of every worn piece + the body armour skill (× 1 at every rank) + the Shield skill × 1,
2 or 3 + the Staff or Spear skill from Expert while that weapon is held + the Speed effect +
temporary bonuses (Stone Skin, items) [TXT `SKILDES.TXT`; screenshot-21: 8 + 4 + 1 + 1 + 0 = 14].
Verified.

Project: `armorClass` (`character.ts` line 151) and `equipmentArmor` (`src/game/inventory.ts`,
line 212) do exactly this; only the Speed effect is wrong, through the table. No temporary AC (no
buff store, magic.md 5.5). **Present** once 4.1 is fixed.

### 4.5 Attack, Shoot and damage

MM6:

- **Attack** = Accuracy effect + the weapon skill (× 1 at every rank; Blaster × 1, 2, 3) + item and
  spell bonuses [TXT; GF-M]. With two weapons, MM6 takes Attack from the left-hand weapon's skill
  [GF-M; MW6]. Verified.
- **Shoot** = Accuracy effect + Bow skill + bonuses. The sheet shows Shoot even without a bow
  (screenshot-21: +1, damage "N/A").
- **Melee damage** is the sum of: the weapon's dice (one die more for a spear held in both hands,
  items.md 1.2) and its own bonus; the Might effect; the skill where the rank adds it (Mace from
  Expert, Axe and Spear at Master; with two weapons, the right-hand weapon's skill [GF-M]); and,
  when dual wielding, the second weapon's dice and bonus (the MM7 engine sums both [OE]; inferred
  for MM6). A Master Dagger's triple strike multiplies the dagger's own damage only [GF-M];
  slaying weapons double their own damage against their kind; elemental enchantments add
  separately resisted damage; Weak halves the total [MW6; OE]; a hit does at least 1.
- **Shoot damage** = the bow's dice + its bonus; no Might.
- The sheet shows damage as a range ("5 - 11", screenshot-21).

Project: `attackBonus` (line 133) and `damageDice` (line 138) are right for one weapon;
`hitChance` (`src/game/combat.ts` line 76) clamps a negative attack bonus to 0, which MM6's formula
does not: a member with Accuracy 7 fighting bare-handed hits armour class 5 with chance 9 ÷ 29 =
31 % in MM6 and 15 ÷ 35 = 43 % here. No second weapon, no Master specials, Weak not applied. The
sheet prints dice text (`src/ui/sheet-model.ts` line 189). **Partial.**

Fix: drop the clamp (0.5 h); Weak halving (0.5 h); the range on the sheet (0.5 h); the rest in 9.4
and 6.2. **N2.**

### 4.6 The character sheet

MM6 (screenshot-21; [MAN, character screen]; [TXT `stats.txt`]): name and class, unspent skill
points; the
seven statistics as current / base; hit points current / maximum, spell points, armour class
current / base; the condition (the worst) and the quick spell; age current / real; level current /
base; experience (shown green when a trainer can raise the level [DOB]; its help gives the
experience still needed); Attack, Damage as a range, Shoot, Shoot Damage; the five resistances as
current / base. No recovery figure: GrayFace's patch adds it to the help of Attack and Shoot
[GF-P].

Project (`sheetView`, `src/ui/sheet-model.ts` lines 166–197): recovery in seconds (line 192), dice
text (189), one age (179), one level, no resistances, no quick spell; the condition name is shown.
**Partial.**

Fix: the current / base pairs, resistances, quick spell, damage range; keep the recovery line as a
dev aid or move it into a help pop-up as the patch does. 4 h. **N1.**

## 5. Classes and promotions

### 5.1 What each class may learn

MM6 [MW6's class table; MAN, creation and classes, and TXT `Class.txt` for the weapon and armour
lists; DCC's
starting lists confirm Mace for Druids]:

| Skill group             | Knight                                                                           | Paladin | Archer | Cleric  | Sorcerer | Druid | Project differs                                                |
| ----------------------- | -------------------------------------------------------------------------------- | ------- | ------ | ------- | -------- | ----- | -------------------------------------------------------------- |
| Staff                   | yes                                                                              | yes     | yes    | yes     | yes      | yes   | Paladin and Archer cannot learn it                             |
| Sword, Axe, Spear       | yes                                                                              | yes     | yes    | no      | no       | no    | same                                                           |
| Dagger                  | yes                                                                              | yes     | yes    | no      | yes      | yes   | Cleric may learn it (to Expert)                                |
| Bow                     | yes                                                                              | yes     | yes    | yes     | yes      | yes   | Cleric and Druid cannot; Paladin and Sorcerer capped at Expert |
| Mace                    | yes                                                                              | yes     | yes    | yes     | no       | yes   | Archer and Druid capped at Expert                              |
| Blaster                 | yes                                                                              | yes     | yes    | yes     | yes      | yes   | the skill does not exist                                       |
| Shield                  | yes                                                                              | yes     | no     | yes     | no       | yes   | Druid capped at Expert                                         |
| Leather                 | yes                                                                              | yes     | yes    | yes     | yes      | yes   | same                                                           |
| Chain                   | yes                                                                              | yes     | yes    | yes     | no       | no    | same                                                           |
| Plate                   | yes                                                                              | yes     | no     | no      | no       | no    | same                                                           |
| Fire, Air, Water, Earth | no                                                                               | no      | yes    | no      | yes      | yes   | same                                                           |
| Spirit, Mind, Body      | no                                                                               | yes     | no     | yes     | no       | yes   | same                                                           |
| Light, Dark             | spells by rank; Clerics and Sorcerers only, learnt in play and never at creation |         |        | Missing |
| Meditation              | no                                                                               | yes     | yes    | yes     | yes      | yes   | Paladin and Archer capped at Expert                            |
| The other nine          | yes                                                                              | yes     | yes    | yes     | yes      | yes   | Diplomacy missing; many capped at Expert per class             |

- Any class that may learn a skill may raise it to Master; there is no per-class cap [LP
  introduction; world.md 4.3 citing JP]. Verified.
- The sources conflict on two cells: RPGC and MM6's class text deny the Druid the Mace, DOB and MW6
  give it, and DCC lists it among the Druid's starting picks, which settles it; DOB alone gives the
  Cleric the Dagger.

Project: the class `skills` maps in `src/game/classes.ts` hold a rank cap per skill (lines 85–358;
the misc set at lines 41–49). `canLearn` and `maxRank` (lines 370–376) read them. **Present but
deviates.**

Fix: one boolean table; delete the caps and `canPromote`'s class check against them. 2 h. **N2.**

### 5.2 Promotion tiers

MM6:

| Class    | First promotion | Second promotion | Promoted by            | Experience from the quests [DCC] |
| -------- | --------------- | ---------------- | ---------------------- | -------------------------------- |
| Knight   | Cavalier        | Champion         | Lord Osric Temper      | 15,000; 40,000                   |
| Paladin  | Crusader        | Hero             | Regent Wilbur Humphrey | 15,000 (and 5,000 gold); 30,000  |
| Archer   | Battle Mage     | Warrior Mage     | Lord Stromgard         | 15,000; 40,000                   |
| Cleric   | Priest          | High Priest      | Lord Anthony Stone     | 15,000; 30,000                   |
| Sorcerer | Wizard          | Archmage         | Lord Albert Newton     | 15,000; 30,000                   |
| Druid    | Great Druid     | Arch Druid       | Lady Loretta Fleise    | 15,000; 40,000                   |

- The quests themselves: GAPS section 2 and world.md section 3.
- A promotion raises the hit and spell point factors (4.3) for every level, past ones included
  [DCC]. Verified. Body Building and Meditation follow the new factor [KAS]. Reported.
- The second tier needs the first [MGW]. Reported.
- Finishing a promotion quest promotes the members of that class; the other members receive an
  honorary title [MGW; DCC]. An honorary title changes no factor but opens the same doors: an
  honorary Cavalier may become a Master of Sword [MW6]. Reported.
- Nothing else changes: skills, statistics and the skill list stay [MW6]. Reported.
- Master teachers gated by a tier (GAPS section 5): Sword and Spear by Cavalier, Bow by Battle
  Mage, Chain by Crusader, Plate by Hero, Spirit by High Priest, Air by Archmage (and Fire and
  Water by Archmage too in DCC, against skill 12 in RPGC and JP; section 7.3).

Project: no tier, no title, no promotion anywhere (`ClassDef` has no tier, `src/game/classes.ts`
lines 19–36). **Missing.**

Fix: `tier: 0 | 1 | 2` and `honorary: Set<promotion>` on the character, the factor table by tier,
the title on the sheet, the gate in the teacher check (7.3), a `promote` reward kind for quests.
6 h for the rules and 2 h for the screens, + content (the twelve quests). **N3.**

## 6. Skills and their ranks

### 6.1 The 31 skills

MM6 has 31 skills [MMX `const.Skills`]; the rank texts are MM6's own [TXT `SKILDES.TXT`], the same
as RPGC's and the manual's. "Skill" below is the skill level.

| Skill                                       | Normal                                                           | Expert                            | Master                              | Project                                                            |
| ------------------------------------------- | ---------------------------------------------------------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Staff                                       | skill to Attack                                                  | skill to AC                       | stun with chance skill % (6.2)      | Normal, Expert Present; Master Missing                             |
| Sword                                       | skill to Attack                                                  | skill off recovery                | a one-handed sword in the left hand | Normal, Expert Present; Master Missing                             |
| Dagger                                      | skill to Attack                                                  | a dagger in the left hand         | triple damage (6.2)                 | Normal Present; Expert, Master Missing                             |
| Axe                                         | skill to Attack                                                  | skill off recovery                | skill to damage                     | Present                                                            |
| Spear                                       | skill to Attack                                                  | skill to AC                       | skill to damage                     | Present (the one- or two-hand rule is items.md 1.2)                |
| Bow                                         | skill to Shoot                                                   | skill off recovery                | two arrows a shot                   | Normal, Expert Present; Master Missing                             |
| Mace                                        | skill to Attack                                                  | skill to damage                   | stun with chance skill %            | Normal, Expert Present; Master Missing                             |
| Blaster                                     | skill to Attack                                                  | skill × 2 to Attack               | skill × 3 to Attack                 | Missing                                                            |
| Shield                                      | skill to AC                                                      | skill × 2                         | skill × 3                           | Present                                                            |
| Leather, Chain, Plate                       | skill to AC                                                      | recovery penalty halved (6.3)     | no recovery penalty                 | Present (no Plate item exists)                                     |
| Fire, Air, Water, Earth, Spirit, Mind, Body | spells by rank                                                   |                                   |                                     | Partial (magic.md)                                                 |
| Light, Dark                                 | spells by rank; Clerics and Sorcerers only                       | learnt in play, never at creation |                                     | Missing                                                            |
| Identify Item                               | identify an item whose difficulty the skill meets                | skill × 2                         | skill × 3                           | no effect (items.md 5.2)                                           |
| Merchant                                    | better prices                                                    | × 2                               | × 3                                 | Present but deviates (items.md 6.3); not applied to training (8.3) |
| Repair Item                                 | repair an item whose difficulty the skill meets                  | × 2                               | × 3                                 | no effect (items.md 5.3)                                           |
| Body Building                               | skill × class HP factor                                          | × 2                               | × 3                                 | Present (wrong factors, 4.3)                                       |
| Meditation                                  | skill × class SP factor                                          | × 2                               | × 3                                 | Present (wrong factors)                                            |
| Perception                                  | notice traps, lessen or avoid their damage, find hidden treasure | × 2                               | × 3                                 | no effect                                                          |
| Diplomacy                                   | less reputation lost when begging, bribing or threatening        | × 2                               | × 3                                 | Missing                                                            |
| Disarm Trap                                 | disarm a trapped chest                                           | × 2                               | × 3                                 | no effect                                                          |
| Learning                                    | +(9 + skill) % experience                                        | skill part × 2                    | skill part × 3                      | Present (`learningPercent`, `src/game/experience.ts` line 44)      |
| Thievery                                    | listed but unused: MM6's own skill table marks it unused [TXT]   |                                   |                                     | absent, correctly                                                  |

Verified for the texts. Most of what the project marks Present here came with the step-1
commits (`348770d`, `30b3f56`, `bcf5745`).

### 6.2 Weapon specials and the left hand

- **Dagger, Master: triple damage.** The help text and RPGC say the chance equals the skill; GF-M
  says the original code uses a flat 10 % at any skill and triples only the dagger's own damage
  (dice and bonus, not Might or skill), and that the patch makes it skill %. The MM7 engine's
  rebuild notes the same flat 10 % as a vanilla bug [OE]. Reported (GF-M); the original game plays
  10 %.
- **Staff and Mace, Master: stun.** Chance equals the skill: a Master of Staff at 8 stuns 8 % of
  the monsters he hits [MAN, experience]. Verified. What a stun does in MM6 is unverified; in the MM7
  engine it adds 20 units to the monster's recovery (× 2.133 in real time) and gives the hit the
  full knock-back (9.8) [OE].
- **Bow, Master: two arrows** a shot, each its own missile and roll (MM7 engine [OE]; MM6
  inferred).
- **Left hand**: a dagger from Expert Dagger, a one-handed sword from Master Sword; a spear held
  one-handed may take a second weapon too [TXT; MW6's weapon table: daggers and long daggers from
  Expert, swords, cutlasses and broadswords from Master; two-handed swords, poleaxes and staves
  never]. Verified. Recovery, Attack and damage with two weapons: 9.2 and 4.5.
- **Blaster**: every class may learn it [MW6]; Normal comes from a late event, not a guild [DCC];
  Expert and Master multiply the Attack bonus; at Master the skill is added again inside the hit
  formula, and from Expert there is no distance penalty [GF-M]; recovery 30 with no floor in real
  time (the patch sets 5) [GF-M; GF-P]; the damage is "energy", which nothing resists [MW6].

Project: none of the five (`src/game/character.ts` header comment, lines 10–12; README "Not
done"). The off hand takes only a shield (`targetSlot`, `src/game/inventory.ts` line 152).
**Missing.** Fix: 9.4 sizes them.

### 6.3 Armour skills and the recovery penalty

MM6: the skill adds to AC at every rank; the penalty (Plate 30, Chain 20, Leather 10, Shield 10) is
whole at Normal, **halved at Expert** (Plate 15, Chain 10, Leather 5, Shield 5) and gone at Master
[MW6's recovery table]. Reported, one source.

- The MM7 engine differs: Leather and Shield lose the penalty at Expert, Chain halves it at Expert
  and loses it at Master, Plate halves it at Expert and Master [OE]. Do not mix the two.
- Mok's patch, folded into GrayFace's, corrects how shields and armour add recovery [GF-P]. The
  original's behaviour is therefore not the documented one, and no source says how. Owner check
  (17).

Project: `equipmentRecoveryPenalty` (`src/game/inventory.ts` line 232) halves at Expert, marked as
the project's guess. MW6 now supports it: **Present**, cite MW6.

### 6.4 Levels, cost and the ceiling

- Raising a skill from n to n + 1 costs n + 1 points [MAN, experience; screenshot-23; DCC]. Verified.
  Present (`raiseCost`, `src/game/skills.ts` line 117).
- The highest level is 60, and effects keep growing to it [MW6]. Reported. (MM6 keeps a skill in
  one byte with two rank bits, which would allow 63; an inference.) The project has no ceiling:
  1 h with the save check.

## 7. Skill points, teachers and prices

### 7.1 Skill points

- Reaching level L gives **5 + ⌊L ÷ 10⌋** skill points: 5 for levels 2 to 9, 6 for 10 to 19, 7 for
  20 to 29 and so on [MW6; DCC]. Both sources' totals fit the formula to the point: 634 by level 76
  [MW6], 955 by level 100 [DCC]. Verified.
- A horseshoe from a stable stall gives 2 points when used [LP]. Reported (an item, items.md).
- Project: `SKILL_POINTS_PER_LEVEL` = 5 (`src/game/experience.ts` line 15), its comment calling
  MM6's grant "not agreed". By level 50 an MM6 character has earned 350 points and a project
  one only 245. **Present but deviates.** Fix: 0.5 h. **N3.**

### 7.2 Learning a new skill at Normal

- New skills are bought at Normal in guild halls, after paying for membership: the skill guilds
  for weapons, armour and the miscellaneous skills, the magic guilds for their schools (Learning
  and Meditation at some of them) [MAN, exploring; world.md 4.3 has every hall, price and hour].
- Blaster comes from an event late in the game [DCC]; Light and Dark from their own guilds, for
  Clerics and Sorcerers only [TXT; world.md 4.3].
- Project: `learnSkill` (`src/game/skills.ts` line 135) exists and is never called outside tests.
  After creation no skill can be learnt. **Missing.** Fix: a guild-teaches-skill service on the
  existing guild screen, 4 h, + content. **N2.**

### 7.3 Expert and Master

MM6:

- **Expert**: skill 4 in every skill [DCC; JP via world.md 4.3] and a fee: 2,000 for weapons and
  Shield, 1,000 for Leather, Chain and Plate, 1,000 for the seven schools and 2,000 for Light and
  Dark, 500 for Identify Item, Repair Item, Body Building, Meditation, Perception, Diplomacy and
  Disarm Trap, 2,000 for Merchant and Learning [RPGC via GAPS 5; DCC]. Verified.
- **Master**: skill 8 for weapons, 10 for armour, 12 for magic, 7 for the miscellaneous skills,
  plus a fee (2,500 to 5,000, some free) and, for many, one more gate: a statistic of 30 or 40, a
  promotion, a reputation, a quest or an item [DCC; RPGC]. GAPS section 5 tabulates each skill and
  world.md 4.9 places each teacher.
- Where the sources disagree (owner to check one Master teacher each):
  - Fire and Water: skill 12 [RPGC; JP] or the Archmage promotion [DCC].
  - Body: skill 12 [RPGC] or no gate beyond the fee [DCC].
  - Diplomacy: reputation 200 [RPGC] or fame 200 [DCC; JP].
  - Dark at Expert: 2,000 [RPGC] or free [DCC].
- A teacher is a person in a house; talking to them offers the rank for its price [MAN,
  exploring; LP update 1]. How MM6 words a refusal for a missing requirement is unverified.

Project: `PROMOTIONS` (`src/game/skills.ts` line 147): Expert at skill 4 for 1,000, Master at 7 for
2,000, for every skill; `canPromote` and `promoteSkill` are never called outside tests; no teacher
exists. **Missing** in play, **deviates** in the rule.

Fix: a per-skill table (Expert fee; Master level, fee and gate of kind statistic, promotion,
reputation, fame, quest flag or item), a check that reports the missing requirement as MM6's
teachers do, and a teacher screen. 4 h for the rules, 6 h for the screen, + content. **N2.**

## 8. Experience, levels and training

### 8.1 The curve

MM6: reaching level N takes N × (N − 1) × 500 experience in all [GF-M; MW6]. Verified. (The
manual's own example, 4,000 for level 4, does not fit; it describes an earlier design.) Present
(`xpForLevel`, `src/game/experience.ts` line 19).

### 8.2 Earning experience

MM6:

- **Kills**: the monster's experience is split equally among the members who can receive it, then
  each adds their Learning bonus. Unconscious, stoned, dead and eradicated members receive none
  [MW6; the MM7 engine counts only members free of those four conditions and divides by their
  number, OE `GivePartyExp`]. Reported, consistent with OE.
- **Quests**: the stated sum goes to each member, not shared [MW6: walkthroughs give a quest's
  experience per character, the monster table per party]. Reported. Whether Learning applies to
  it is unverified.
- **Fame** rises by 1 for every 1,000 experience the party gains [MW6]; it may gate the Master of
  Diplomacy (7.3) and is shown on the party's page. Reported.

Project: `shareExperience` (`experience.ts` line 63) divides among members not dead, stoned or
eradicated, so the unconscious earn; `grantReward` divides a quest's experience the same way
(`src/game/state.ts` line 154); kills call it at `src/dev/index.ts` line 908. No fame.
**Present but deviates.** Fix: 1 h. **N3.**

### 8.3 Training

MM6:

- A training hall raises one level per payment when the experience is there, up to the hall's cap;
  the caps and base prices of all ten halls are in world.md 4.4.
- **Price = the hall's unpromoted base × the tier (1, 2 or 3) × the current level**; world.md
  lists the three resulting bases per hall [MW6; MMW via world.md]. Reported, two sources.
- Merchant lowers the price, to a third at best [MW6]. Reported.
- A visit to a hall passes **8 days**, however many members and levels are trained [MW6; LP via
  world.md]. Reported.
- Halls open 6:00 to 18:00 [MW6]. Reported.
- What a level brings: the factors of 4.3 (so the new maximum follows from the formula) and 7.1's
  skill points. Whether training also heals is unverified.

Project: `trainingCost` = 25 × the new level × the hall's multiplier (`experience.ts` lines 16 and
39); `train` (`src/game/services.ts` line 199) passes no time; `levelUp` adds 5 points (line 78).
No hall stands in the world (GAPS 18). **Partial.**

Fix: price by hall, current level and tier; Merchant; 8 days on the clock with its timed effects;
hours. 3 h, + content. **N2.**

## 9. The combat model

### 9.1 The flow of a real-time fight

MM6:

- Real time is the default. Each member has one recovery counter; while it runs the gem beside the
  portrait goes dark and the member cannot act [MAN, combat; MMX `RecoveryDelay`]. Verified.
- A member attacks the nearest monster with A, or the monster clicked. A near foe is struck; a far
  one is shot if the member carries a bow; otherwise the member dodges and passes the chance (the
  manual's key list gives A all three meanings) [MAN, keys and combat]. Reported. S casts the
  quick spell (magic.md section 5.2).
- After acting, the selection moves to a member who is ready. The MM7 engine takes the next member
  in order not yet picked this round, else the ready member with the highest Speed [OE
  `switchToNextActiveCharacter`]; MM6 unverified.
- In the original, members unable to act could be selected and could still attack; the patch
  closes both [GF-P].

Project: `Party.attack` (`src/game/party.ts` line 234) uses the selected member if ready, else the
next ready one, and moves the selection on; a member is tapped into action, there is no "attack
the nearest". A member with a bow always shoots, at any distance (`ranged = true` by default;
`attackMonster`, `src/dev/index.ts` line 594); one without a bow beyond 3.5 m is told it cannot
reach. **Present but deviates.**

Fix: strike when the foe is in reach even with a bow, shoot only beyond it, "pass" otherwise
(it answers DESIGN 14.2's open question); an "attack the nearest" control for touch. 2 h. **N1.**

### 9.2 Recovery

MM6 [GF-M unless noted]:

| Part                         | MM6                                                                                                                                                                                                     | Project                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Weapon                       | Staff 100, Sword 90, Dagger 60, Axe 100, Spear 80, Bow 100, Mace 80, Blaster 30, club 100, bare hands 100 (MM6 has no Unarmed skill). Verified [GF-M; MW6; OE].                                         | Present for the seven skills and bare hands (`src/game/items.ts` lines 270–281); no club or Blaster |
| Two weapons, original        | the slower weapon's base, then the left-hand weapon's base added on top: sword + left dagger 150, dagger + left sword 180, mace + left dagger 140, bare hand + left sword 190 [MW6's table; GF-M; GF-P] | no second weapon                                                                                    |
| Two weapons, patched         | the slower weapon only; its skill and properties count, the other weapon's do not [GF-M]                                                                                                                | no second weapon                                                                                    |
| Armour                       | Shield 10, Leather 10, Chain 20, Plate 30; halved at Expert, none at Master (6.3)                                                                                                                       | Present (`equipmentRecoveryPenalty`, `src/game/inventory.ts` line 232)                              |
| Speed                        | the Speed effect is subtracted                                                                                                                                                                          | Present (`recoveryUnits`, `src/game/character.ts` line 170), through the wrong table                |
| Skill                        | Sword, Axe or Bow from Expert subtract the skill; the original ignores item and hireling skill bonuses here [GF-M; GF-P]                                                                                | Present (line 167)                                                                                  |
| Haste                        | −25                                                                                                                                                                                                     | Missing (no buff store, magic.md 5.5)                                                               |
| Swift weapon                 | −20                                                                                                                                                                                                     | Missing (no enchantments)                                                                           |
| "Increases rate of Recovery" | does nothing in the original (rounding); the patch makes it 10 % faster [GF-M; GF-P]                                                                                                                    | absent, correctly for the original                                                                  |
| Floor                        | 30 for melee; none for bows and blasters in real time; 30 for every attack in turn-based play (MM7 engine, OE)                                                                                          | 30 and 0 (line 164); no turn-based play                                                             |
| Moving                       | a member who moves before the gem is lit recovers more slowly, and more slowly still when running [MAN, combat]; the MM7 engine counts recovery at half speed while running [OE]                        | Missing; the project has no running                                                                 |
| Spells                       | the spell's recovery by rank (magic.md 5.3)                                                                                                                                                             | Missing                                                                                             |
| Potions, scrolls, wands      | each use costs a pause [MW6]; 100 units in the MM7 engine [OE]                                                                                                                                          | Missing                                                                                             |
| Rest and waiting             | a rest clears recovery (MM7 engine); the original's waits did not count it down [GF-P]                                                                                                                  | not applicable yet                                                                                  |
| Rate                         | unverified for MM6. The MM7 engine multiplies by 2.133 game ticks at 128 a second, so 60 units a second [OE]                                                                                            | 60 a second (`RECOVERY_UNITS_PER_SECOND`, line 161), marked "ours"                                  |

- Worked example, MM6: a sword (90), chain mail at Normal (20), a shield at Normal (10), Speed 13
  (effect 0) recover in 120 units, 2.0 s at the MM7 engine's rate. The project gives 119 for the
  same Paladin, because Speed 13 gives +1 in its table.
- The patch shows the recovery value in the help of Attack and Shoot [GF-P], which makes most of
  this table checkable in the original in minutes (section 17).

Fix: the second weapon (9.4), Haste and Swift with buffs and items, moving and running (with a run
control, DESIGN 7.1), item use, spells (magic.md). 3 h here excluding those systems. **N2.**

### 9.3 Hitting

MM6:

- A member hits with chance (15 + 2 × Attack + bonus − distance penalty) ÷ (30 + 2 × Attack +
  monster AC); the bonus is the Blaster skill at Master, or 5 × skill for the Blades spell; the
  penalty is AC ÷ 2 at 1,024 to 2,559 units and AC + 15 beyond, 5,119 units being the longest
  engagement; a Blaster from Expert takes no penalty [GF-M]. Verified for the formula; the MM7
  engine rolls random(AC + 2 × Attack + 30) + bonus against AC + 15, and puts the middle band at
  (AC + 15) ÷ 2 [OE], a small difference.
- A monster hits a member with chance (5 + 2 × monster level) ÷ (10 + 2 × monster level + the
  member's AC), elemental missiles included; spells always hit [GF-M]. Verified.

Project: `hitChance` (`src/game/combat.ts` line 76) without bonus or distance, and with the clamp of
4.5; `monsterHitChance` (line 83) is right but the world's monsters still call `resolveAttack` with
an attack bonus (`src/world/monster.ts` line 227; monsters.md 2.1). **Partial.**

Fix: distance bands and the cap (2 h); the monster call (0.5 h). **N2.**

### 9.4 Damage

The formulas are in 4.5. Missing pieces and their size:

- A second weapon: the off-hand slot for daggers (Expert) and swords (Master); recovery by the
  original or the patched rule (an owner pick, items.md decision 11.2); Attack from the left hand's
  skill and damage from the right hand's in MM6; both weapons' dice summed. 8 h.
- Master Dagger's triple strike (10 % in the original): 1 h. Master Staff and Mace stun, once a
  stun on a monster means something in MM6 terms (6.2): 3 h. Master Bow's second arrow: 2 h with
  missiles (9.5). Blaster skill, weapons and their energy damage: 4 h, + items.
- Weak halves damage (10.2): 0.5 h. Slaying, elemental and vampiric enchantments: items.md 3.4.

**N3** for most; Weak **N2** once monsters cause it.

### 9.5 Ranged attacks

MM6:

- A bow shot uses Shoot, the bow's dice and the bow's recovery (4.5, 9.2). Verified.
- Only a far foe is shot; a near one is struck (9.1). Reported [MAN].
- Arrows are missiles that fly and can be seen; in real time the party dodges monster missiles by
  moving [LP introduction]. Missile speeds are not in any source here; the MM7 engine reads them
  from its object table [OE]. Unverified.
- Longest shot 5,119 units (about 51 m), with the distance bands of 9.3 [GF-M]. Verified.
- A Master Bow looses two arrows (6.2).

Project: the shot resolves at once with no missile; any monster in view may be shot; no penalty
(`attackMonster`, `src/dev/index.ts` lines 594–608). The step-1 commit `44455cd` already moved bows
onto their own numbers. **Partial.**

Fix: arrows as projectiles on the spell missile code (`src/world/spellfx.ts`), the cap and the
bands. 6 h. **N2.**

### 9.6 Melee reach

MM6: unverified for the party. The MM7 engine gives monsters a melee reach of 307.2 units, about
3 m [OE `mm7_data.h`]. The project lets a member strike up to 3.5 m (`MELEE_REACH`,
`src/dev/index.ts` line 593). Owner check; 0.5 h to change. **N4.**

### 9.7 A member is struck

MM6:

- The blow sets the member's recovery to at least 20 − Endurance effect, so nothing from
  Endurance 350 [GF-M]; a longer recovery already running is kept [OE `SetRecoveryTime`]; the MM7
  engine adds none in turn-based play [OE]. Verified.
- In the original a monster's blow always moved the selection to another member, even when
  Endurance left no recovery; the patch moves it only when the member is left recovering [GF-P].
- The portrait winces and the member cries out (the MM7 engine plays a "hurt" line [OE]; MM6's
  faces have their own sound lists [MMX]). Inferred for MM6.
- Asleep members wake when damaged [MW6; OE].

Project: `PartyMember.takeDamage` and `Party.takeDamage` (`src/game/party.ts` lines 193 and 275)
apply hit recovery and move the selection, as the patch does, when given the simulated time; the
world calls `roster.takeDamage(index, damage)` with neither the time nor the game minute
(`src/dev/index.ts` line 395). So there is no hit recovery in play, and every condition a blow
causes starts at minute 0. Asleep is woken (`damageCharacter`, `character.ts` line 228).
**Partial.**

Fix: pass `simTime` and the clock's minute. 1 h. **N1.**

### 9.8 A monster is struck

MM6 (inferred from the MM7 engine, [OE] `Actor.cpp`; no MM6 source):

- Every damaging blow makes the monster flinch, interrupting it.
- It is pushed away at 50 × the lesser of 10 and (20 × damage ÷ its maximum hit points) units a
  second: a blow for half its hit points or more gives the full shove, a scratch almost none.
- A stun adds recovery to the monster and gives the full shove (6.2).

Project: the hit clip interrupts (`src/world/monster.ts`); the shove is a fixed 0.45 m, 0.7 m on a
kill (DESIGN 14.4); stun exists only as a spell (`stun`, `monster.ts` line 112). **Present but
deviates.** Fix: scale the shove by the damage share, 1 h. **N4.**

### 9.9 Turn-based mode

MM6:

- Enter switches between real time and turns at any moment, and an indicator shows the mode [MAN,
  keys, screens and combat]. Verified.
- In turns the party cannot walk, run or fly; it can attack, cast and turn. Foes stand frozen while
  the members act, then the members stand frozen while the foes act [MAN, combat; WP6: movement
  is severely limited]. Reported.
- The engine keeps a phase: monsters moving, combat, the party walking [MMX `TurnBasedPhase`].
  Whether the party walking phase gives MM6's party any movement is unverified.
- The original's turns took twice as long as they should; the patch also adds speed options
  [GF-P].
- The engine's model, as the MM7 engine runs it [OE `TurnEngine.cpp`]: a turn is 100 recovery
  units; every member and monster waits out its recovery and acts in that order, so a dagger
  wielder may act twice in a turn; every attack's recovery is at least 30, bows included; blows
  cause no hit recovery; a movement stage follows, and each turn passes 213 game ticks. Inferred
  for MM6.

Project: **Missing**. DESIGN 7 excludes it ("Real-time only", owner, 2026-10-11); GAPS 37 decision
1 asks the owner to revisit.

Fix: a turn queue over the existing recovery counters, the crowd agents frozen between phases, the
movement allowance, a toggle on screen. 40–60 h. **N1** for veterans, who fight most dungeon rooms
in turns [LP introduction].

### 9.10 Fleeing and the monster's side

- The party has no flee command; walking or running away is the only escape, and running slows
  recovery (9.2).
- Monster fleeing, recovery, special attacks and target choice: monsters.md 2.5 to 2.9. DESIGN 14.2
  says MM6 favours the front row; MM6 has no rows [LP introduction] and its monsters choose by
  class and sex preferences (monsters.md 2.9).

## 10. Conditions

### 10.1 The seventeen

MM6 keeps one field per condition on the character: Cursed, Weak, Asleep, Afraid, Drunk, Insane,
Poison 1, Disease 1, Poison 2, Disease 2, Poison 3, Disease 3, Paralyzed, Unconscious, Dead,
Stoned, Eradicated [MMX]. A member may carry several at once [MW6]. The three levels of poison and
of disease are separate conditions, set by the attacker (monsters.md 2.6). Verified.

### 10.2 Effects

MM6 [MW6; the MM7 engine's table holds the same numbers, OE `pConditionAttributeModifier`].
Statistics as a percentage of their value; a dash means unchanged:

| Condition   | Acts? | Might | Int | Per | End | Acc | Spd | Luck | Other effects                                                                                                                      |
| ----------- | ----- | ----- | --- | --- | --- | --- | --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Cursed      | yes   | –     | –   | –   | –   | –   | –   | –    | spells fail: about two casts in three [MW6], one in two in the MM7 engine [OE]; attacks hit less often [MW6]                       |
| Weak        | yes   | –     | –   | –   | –   | –   | –   | –    | the member's damage is halved [MW6; OE]                                                                                            |
| Asleep      | no    |       |     |     |     |     |     |      | wakes when damaged; the last member able to act cannot be put to sleep, and a sleeper wakes when all the others are down [MW6; OE] |
| Afraid      | yes   | 120   | 50  | 50  | –   | 50  | 120 | –    |                                                                                                                                    |
| Drunk       | yes   | 50    | 25  | 25  | 50  | 10  | 20  | 200  | a tavern's drink may differ a little from a monster's [MW6]                                                                        |
| Insane      | yes   | 200   | 10  | 10  | 150 | –   | 120 | –    | wakes from a rest with no spell points                                                                                             |
| Poison 1    | yes   | 75    | –   | –   | 75  | 75  | 75  | –    | a rest heals to ½                                                                                                                  |
| Poison 2    | yes   | 50    | 75  | 75  | 50  | 50  | 50  | –    | a rest heals to ⅓                                                                                                                  |
| Poison 3    | yes   | 25    | 50  | 50  | 25  | 25  | 25  | –    | a rest heals to ¼                                                                                                                  |
| Disease 1   | yes   | 60    | –   | –   | 60  | 60  | 60  | –    | ½                                                                                                                                  |
| Disease 2   | yes   | 30    | 60  | 60  | 30  | 30  | 30  | –    | ⅓                                                                                                                                  |
| Disease 3   | yes   | 10    | 30  | 30  | 10  | 10  | 10  | –    | ¼                                                                                                                                  |
| Paralyzed   | no    |       |     |     |     |     |     |      |                                                                                                                                    |
| Unconscious | no    |       |     |     |     |     |     |      | at 0 HP or less; earns no combat experience                                                                                        |
| Dead        | no    |       |     |     |     |     |     |      | earns no experience                                                                                                                |
| Stoned      | no    |       |     |     |     |     |     |      | earns no experience                                                                                                                |
| Eradicated  | no    |       |     |     |     |     |     |      | earns no experience; no body                                                                                                       |

- The table is reported (MW6) and matches the MM7 engine cell for cell, so it is safe to build.
  Cursed's failure rate is the one open number (section 17).
- Only one condition sets the statistics: for MM7, MMExtension offers the condition that drives
  the statistics apart from the one displayed [MMX `GetMainCondition`], and the patch's note that
  MM6's stats page now names the condition behind the statistics implies the same for MM6 [GF-P]. Which
  condition wins when several are present is unverified; the original display order (10.5) is the
  likely rule. Inferred.
- Statistics never fall below 1 [CH].

### 10.3 Rest and time

MM6: a rest cures Unconscious (by its healing), Drunk, Afraid, Asleep and Weak; Cursed, Insane,
the poisons, the diseases, Paralyzed, Dead, Stoned and Eradicated stay [MW6; OE `restAndHeal`]. No
condition worsens with time or rest. Whether Asleep, Afraid or Drunk also wear off with time is
unverified (the MM7 engine keeps none on a timer). Reported.

### 10.4 Causes

- Monsters' special attacks, with the save each uses: monsters.md 2.6.
- Going without rest: Weak after 24 hours; more in 14.3.
- Haste wearing off: Weak (for six hours, says the manual; until cured or rested in the MM7
  engine) [MAN, Fire Magic; OE].
- Raise Dead and Resurrection: Weak, for a full day by the manual (magic.md 3.7).
- Wells, fountains, troughs (often poisonous) and skull piles (Weak, Insane): world.md and [CH].
- Drink: the Free Haven water guild's pools make members Drunk [MW6]; a tavern drink can too
  [MW6]. Eating a raw herb makes a member ill [CH]. A white and a black potion mixed explode and
  eradicate the mixer [MW6; items.md 7.2]. Traps: items.md 4.10.
- Divine Intervention ages its caster (12.4).

### 10.5 Display

- The sheet names the worst condition [TXT `stats.txt`], in green (Poison 1, Disease 1, Afraid,
  Insane, Drunk, Weak, Asleep, Cursed), yellow (Poison 2, Disease 2, Unconscious, Paralyzed) or
  red (Poison 3, Disease 3, Stoned, Dead, Eradicated) [MW6]. Reported.
- Which is "worst": the original's order is unverified. The patch's new order is Eradicated, Dead,
  Stoned, Unconscious, Paralyzed, Asleep, Weak, Cursed, Disease 3, Poison 3, Disease 2, Poison 2,
  Disease 1, Poison 1, Insane, Drunk, Afraid, and it says the change was made so that Weak and
  Cursed show [GF-P]. The original most likely took the condition with the highest number in 10.1,
  which puts Cursed and Weak last (inferred). That is the project's order (`CONDITIONS`,
  `src/game/conditions.ts` lines 16–31).
- A dead member's portrait becomes a gravestone and loses its gem (screenshot of 2026-07-09
  18:33). Verified. Faces for the other conditions (asleep, poisoned and so on) come from each
  face's expression set [MMX]; inferred for MM6.
- The gem is not a condition light. It is the enemy detector: green with no monster near, yellow
  with one some way off, red when one is close, unreliable indoors, and dark while the member
  recovers [MAN, combat; MMX party bits `EnemyDetectorRed`, `EnemyDetectorYellow`]. Verified.

### 10.6 Cures

- Spells, each with MM6's time window: magic.md 3.7. Drunk has no spell [MW6].
- Temples cure everything except Eradicated, which only Temple Stone in Free Haven cures, after
  the Clerics' quest repairs it (world.md 4.5). Price model [MW6], reported: every temple has a
  minimum donation X (New Sorpigal 10, Mist 20, Castle Ironfist, Silver Cove and White Cap 30,
  Bootleg Bay and Free Haven 40, Eel-Infested Waters 50, Blackshire 100). Hit and spell points cost
  X. A condition costs X times the day of the week it began (Monday 1 to Sunday 7); Stoned and Dead
  cost five times that, Eradicated ten. Several conditions cost the dearest one. Merchant does not
  apply. A Temple of Baa charges 2 on the same scale and cures neither death, stone nor
  eradication. Temples open 5:00 to 1:00.
- Potions: items.md 7.3. Hirelings: a Healer restores hit points only, an Expert Healer cures all
  but Stoned, Dead and Eradicated, a Master Healer everything [MW6].

### 10.7 Against the code

| MM6                           | Project (`src/game/conditions.ts`)                                                                 | Status              |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| Cursed: spells fail often     | half of all actions fail, attacks included (line 84)                                               | deviates; rate open |
| Weak halves damage            | Might, Endurance, Accuracy, Speed × 0.75 (line 91); damage untouched                               | wrong               |
| Asleep: wakes when hit        | cannot act; timed (line 100); woken by damage                                                      | deviates (timer)    |
| Afraid: acts, table above     | cannot act (line 109); timed                                                                       | wrong               |
| Drunk: Might 50 %, Luck 200 % | Might 125 %, wits and Accuracy 75 % (line 118)                                                     | wrong               |
| Insane: table above, SP 0     | Might 150 %, Endurance 125 %, wits 50 % (line 127)                                                 | wrong               |
| Poison 1–3, Disease 1–3       | one condition each with a severity that grows at each rest; all stats −15 % a step (lines 130–145) | wrong               |
| Rest: ½, ⅓, ¼; cures five     | a poisoned or diseased member does not heal at all (`src/game/rest.ts` lines 81–88); Weak stays    | wrong               |
| Paralyzed until cured         | timed (line 152)                                                                                   | deviates            |
| One condition sets stats      | every condition's factors multiply (`effectiveStats`, line 348)                                    | deviates            |
| Order and display             | the likely original order; the HUD gem shows the condition (`gemClass`, `src/ui/hud.ts` line 32)   | gem wrong           |
| Causes                        | only a hungry rest (Weak) and Raise Dead (Weak) cause one                                          | Partial             |
| Temple                        | one invented price by the worst condition, every temple cures all (`src/game/services.ts` line 82) | deviates            |

Fix: seventeen conditions with MM6's table and "acts" column, the main condition for statistics,
Weak halving damage, the rest rules of 10.3, no timers where MM6 has none, the colours, the save
migrated; 10 h. The temple model 2 h. The gem as enemy detector and recovery light 3 h. **N2**
(conditions arrive with monster specials, monsters.md 2.6), the gem **N1**.

## 11. Damage types and resistances

MM6:

- Damage types: physical, fire, electricity, cold, poison, magic and energy (blasters and a few
  monsters such as the Gold Dragon; nothing resists energy) [MMX `const.Damage`; MW6]. MMX also
  lists a dragon type. Which spell does which: magic.md 3.5.
- A member resists five: fire, electricity, cold, poison, magic; each has a base and a bonus and
  the sheet shows current / base [MMX; screenshot-21]. All start at 0 (screenshot-21); MW6 says a
  Knight starts with 10 magic resistance (one source). They rise to at most 255 by potions, wells,
  shrines, items and spells [MW6]. Luck adds to every non-zero one [GF-M].
- The reduction formula and its averages: magic.md 5.4.

Project: no resistance on `Character`; damage carries no type (`takeDamage(amount)`); Luck unused.
**Missing.** Fix: five base and bonus fields, typed damage on every source, the formula, the sheet
rows; 5 h. **N3.**

## 12. Death, eradication and aging

### 12.1 Unconscious and dead

MM6:

- A member is **unconscious at 0 hit points or less** [TXT `stats.txt`: MM6's own help for Hit
  Points]. The MM7 engine falls a member when health drops below 1 [OE `receiveDamage`].
  Verified.
- A member dies when hit points reach **minus the base Endurance score**: base Endurance 100, dead
  at −100 [MW6]. The MM7 engine kills when health + base Endurance falls below 1, the same rule;
  its base counts items but not conditions, age or spells [OE `GetBaseStat`]. Reported, two
  sources; whether MM6 counts items is open (17.4). MMW, quoted in GAPS 11, says "below minus
  Endurance" (at 30, death at −31): one point off against both.
- An unconscious member's hit points may be far below 0; healing must lift them above it before
  the member wakes [MW6].

Project: `isConscious` puts a member down only below 0 (`src/game/character.ts` line 204);
`deathThreshold` is minus the current Endurance, after conditions (line 217), and death needs hit
points below it (line 235). Both came from commit `af9d537`. **Present but deviates.**

Fix: down at 0 or less; dead at or below minus Endurance before conditions (items per 17.4). 1 h
with tests. **N2.**

### 12.2 The whole party down

MM6:

- When no member can act (asleep, paralyzed, unconscious, dead, stoned or eradicated), the party
  dies [MW6; OE `updatePartyDeathState`]. A death film plays [GF-P].
- Without Guardian Angel the party wakes a week later at the game's starting point in New
  Sorpigal and loses all the gold it carries; gold in the bank is kept [MW6]. Reported. In what
  state the members wake is unverified.
- With Guardian Angel: the last temple, half the gold, 1 HP, half or full by rank (magic.md 4.5;
  [MAN]).

Project: when every member is down the monsters find no target and stop; nothing else happens.
**Missing.** Fix: detection, a death screen (an original picture, no placeholder in shipped
builds), the move to the start, the week on the clock, the gold. 6 h. **N2.**

### 12.3 Eradication

MM6: no body remains; only Resurrection within its window, Divine Intervention or Temple Stone
after its repair bring the member back (12.2, 10.6) [MAN; world.md 4.5]. Monsters (monsters.md
2.6) and the white-and-black potion blast (items.md 7.2) cause it. Project: a condition that
differs from Dead only in its spell (`src/game/conditions.ts` lines 181–189), curable at any temple.
**Present but deviates.** 1 h with the temple model.

### 12.4 Aging

MM6:

- Age is the years since birth plus a magical part; the sheet shows current / real [MMX
  `BirthYear`, `AgeBonus`; TXT `stats.txt`]. Starting ages: 3.4.
- Natural aging over a game is small [MW6].
- Magical aging comes from some monsters (monsters.md 2.6) and from Divine Intervention, which adds
  10 years to its caster [MAN]; it stops at +120 years [MW6].
- At 50, 100 and 150 the statistics drop in steps [MW6; the MM7 engine's table is identical, OE
  `pAgingAttributeModifier`]:

| Age from | Might | Intellect | Personality | Endurance | Accuracy | Speed | Luck  |
| -------- | ----- | --------- | ----------- | --------- | -------- | ----- | ----- |
| 50       | 75 %  | 150 %     | 150 %       | 75 %      | 100 %    | 100 % | 100 % |
| 100      | 40 %  | 100 %     | 100 %       | 40 %      | 40 %     | 40 %  | 100 % |
| 150      | 10 %  | 10 %      | 10 %        | 10 %      | 10 %     | 10 %  | 100 % |

- The magical part is undone by the Rejuvenation potion and by the Fountain of Youth on Hermit's
  Isle [MW6].
- Death from age: unverified.

Project: `Character.age` is 20 and never changes; nothing reads it except the sheet. **Missing.**
Fix: birth year, magical age, the table, the sheet pair; 4 h. **N4.**

## 13. Hazards

- **Falling**: MM6 hurts a falling party; Feather Fall (spell or item) and the Jump spell prevent
  it [MAN, Air Magic; RPGC]. Numbers unverified for MM6. The MM7 engine hurts each member without
  feather fall for (drop × maximum HP ÷ 10) ÷ 256 when the drop exceeds 512 units, about 5 m, and
  gives the blow's hit recovery [OE `giveFallDamage`; `Indoor.cpp`, `Outdoor.cpp`]: a 6 m drop
  takes about a quarter of every member's hit points. Project: drops of 3 m or more print "The
  party falls" and hurt no one (`fallDamageMinM`, `src/world/player.ts` line 61; `src/dev/index.ts`
  line 933). **Missing.** 2 h. **N2.**
- **Deep water**: without Water Walk the party drowns; the party record has a drowning flag [MMX].
  The MM7 engine takes 10 % of each member's maximum HP every real second and prints "You are
  drowning" [OE `Engine.cpp`]. Amount unverified for MM6. Project: wading at half and about a third
  of walking speed and a "Deep water" line (`src/world/wading.ts` lines 26–29; `src/dev/index.ts`
  line 852). Owner decision 3 in GAPS 37. 3 h either way. **N2.**
- **Lava**: the party record has an in-lava flag [MMX]; the MM7 engine burns 10 % of maximum HP a
  second as fire damage [OE]. No lava exists in the project's levels yet. 2 h with the first lava.
  **N3.**
- **Poison** outside fights: troughs and raw herbs (10.4), traps (items.md 4.10), the poison spells
  of monsters (monsters.md 2.12).
- **Traps** and their Perception and Disarm Trap rolls: items.md 4.10, world.md.

## 14. Food and rest as they touch the members

### 14.1 Resting

MM6:

- Rest and Heal lasts 8 hours and needs food. Living members return to full hit and spell points,
  with the exceptions of 10.2 (poison and disease to ½, ⅓ or ¼; Insane to no spell points), and are
  cured of 10.3's five [MAN, rest; MW6; OE `restAndHeal`]. The MM7 engine also clears every
  recovery counter and ends the buffs [OE]; MM6 unverified for buffs.
- Without food the party sleeps but heals nothing [MAN, rest]. The manual does not make a hungry
  rest weaken anyone.
- **The party cannot rest with monsters near**: the gems must be green [MAN, rest]. Reported.
- Monsters may attack a camp; the members then wake one by one at a disadvantage [MAN, rest]; some
  places draw more attacks than others [CH]. An inn is safe.
- Waits: until dawn, an hour, five minutes; a wait uses no food and heals nothing (screenshot-30;
  [MAN]). In the original a wait did not count recovery down [GF-P].

Project (`src/game/rest.ts`): 8 hours, 1 food, full healing for members not poisoned or diseased,
Weak for everyone after a hungry rest (line 84), worsening sickness; only "wait until dawn"; nothing
forbids or interrupts a rest. **Present but deviates.**

### 14.2 Food

MM6: a rest eats food by the ground under the party: grass 1; bare ground, road, buildings and
indoors 2; swamp and snow 3; cooled lava 4; sand 5 [MW6; the manual names snow and desert as dearer
and the rest screen shows the number by the apple]. Reported. LP saw 1 at New Sorpigal;
screenshot-30 shows 2. An inn's room rests the party until 6:00 with no food eaten [MW6]. Fruit
trees give 2 food [LP]. Inn prices and how far each inn fills the packs: world.md 4.6.

Project: `FOOD_PER_REST` = 1 (`rest.ts` line 24); a room is an 8-hour rest for 10 gold
(`rentRoom`, `src/game/services.ts` line 51).

### 14.3 A new day without rest

MM6: after 24 hours without rest the members become Weak; spells can lift it only until the next
rest is overdue again [MAN, rest]. The patch's notes name weakness and insanity among MM6's new-day
effects [GF-P]. The MM7 engine runs a new day at 3:00. From the second day without rest every
member turns Weak and the party eats a ration; with no food left, each member's hit points fall to
one more than HP ÷ (days + 1). From the fourth day each member may die (chance 5 % × days) or go
insane (10 % × days) [OE `Engine.cpp`]. The MM6 numbers are unverified.

Project: no new-day effects. **Missing.**

Fix for 14.1 to 14.3: food by terrain (needs a ground kind per position; 3 h), no rest near
monsters (2 h), camp ambushes (4 h), the inn until 6:00 (0.5 h), the two short waits (1 h),
new-day effects (3 h), no Weak from a hungry rest (0.5 h). 14 h. **N2.**

## 15. Values the project already flags

| Value and place                                                                  | Marked as                    | Finding                                                                                                                     | Confidence    | Do                           |
| -------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------- |
| 60 recovery units a second (`RECOVERY_UNITS_PER_SECOND`, `character.ts` 161)     | "ours until MM6 is measured" | not confirmed for MM6; it is the MM7 engine's rate (× 2.133 at 128 ticks a second, read in [OE])                            | inferred      | keep; measure (17.1)         |
| Armour penalty halved at Expert (`equipmentRecoveryPenalty`, `inventory.ts` 232) | "half is ours"               | MW6's table halves every penalty at Expert; the MM7 engine differs; the original had an armour recovery bug the patch fixed | reported      | keep; cite MW6; check (17.2) |
| Unconscious below 0 (`isConscious`, `character.ts` 204)                          | "MM6" (from MMW)             | MM6's own help: at 0 or less                                                                                                | verified      | change                       |
| Dead below minus Endurance (`deathThreshold`, `character.ts` 217)                | "MM6-GAPS 11, MMW"           | at minus the base Endurance [MW6; OE]                                                                                       | reported, ×2  | change                       |
| Bow damage without Might (`damageDice`, `character.ts` 138)                      | "MM6's rule unverified"      | MM6's Shoot Damage help names no Might; the MM7 engine adds none                                                            | reported      | keep                         |
| Cursed fails 50 % (`conditions.ts` 84)                                           | "MM6's rate unverified"      | MW6: about one cast in three succeeds; the MM7 engine 50 %; MW6 says attacks also suffer                                    | conflict      | check (17.5)                 |
| Condition stat penalties (`conditions.ts` 87–145)                                | "ours"                       | MM6's table (10.2)                                                                                                          | reported + OE | replace                      |
| Poison and disease worsen at each rest (`conditions.ts`, `rest.ts`)              | "our reading"                | no worsening; three levels; partial healing                                                                                 | reported + OE | replace                      |
| Creation pool 50, range −5 to +15 (`creation.ts` 17–19)                          | "ours"                       | 50 for the party, −2, cap 25                                                                                                | reported, ×2  | replace                      |
| Starting age 20 (`creation.ts` 21)                                               | "ours"                       | 20 to 25 [MW6]; 26 on screenshot-21                                                                                         | unverified    | check (17.7)                 |
| 5 skill points a level (`experience.ts` 15)                                      | "not agreed"                 | 5 + ⌊L ÷ 10⌋                                                                                                                | verified      | replace                      |
| Training 25 × new level (`experience.ts` 16)                                     | "ours"                       | hall base × current level × tier; Merchant; 8 days                                                                          | reported, ×2  | replace                      |
| Expert at 4 for 1,000, Master at 7 for 2,000 (`skills.ts` 147)                   | "MM6's usual"                | Expert at 4 is right; fees by skill (500 to 2,000); Master at 8, 10, 12 or 7 with gates                                     | verified      | replace                      |
| Stat table (`stats.ts` 20–51)                                                    | DESIGN 14.1: "community"     | not MM6's                                                                                                                   | verified      | replace                      |
| Learning 9 % + skill (`experience.ts` 44)                                        | "MM6-GAPS 4, RPGC"           | MM6's own help text says the same                                                                                           | verified      | keep                         |
| Body Building and Meditation × class factor (`character.ts` 85–92)               | "RPGC"                       | the formula is right; the factors are not (4.3)                                                                             | verified      | keep the formula             |
| Hit recovery 20 − Endurance effect (`character.ts` 189)                          | "GF-M"                       | right; never applied in play (9.7)                                                                                          | verified      | wire it                      |
| Monster to-hit by level (`combat.ts` 83)                                         | "GF-M"                       | right; never called in play                                                                                                 | verified      | wire it                      |
| Food 1 per rest (`rest.ts` 24)                                                   | "ours" (README)              | 1 to 5 by terrain                                                                                                           | reported      | replace                      |
| Temple prices (`services.ts` 82)                                                 | "ours"                       | MW6's model (10.6)                                                                                                          | reported      | replace                      |
| Melee reach 3.5 m (`dev/index.ts` 593)                                           | none                         | unverified; the MM7 engine's monsters reach 307 units                                                                       | inferred      | check (17.15)                |
| A fall is reported from 3 m (`player.ts` 61)                                     | none                         | the MM7 engine hurts from 512 units                                                                                         | inferred      | change with fall damage      |

## 16. Ranked: the twenty gaps a player of the original notices most

Ranked by how soon and how strongly a player who knows MM6 would feel each one. Hours are code and
tests only. The cheapest of the high ranks (2, 3, 5, 9 and 13) come to about 10 hours together.

| Rank | Gap                                                                                                                                         | Section       | Size           | Notice | Confidence                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------- | ------ | ---------------------------- |
| 1    | Creation: one 50-point pool for the party, −2 and 25 limits, MM6's class starts; starting skill lists; the kit in the pack, spells as books | 3.2–3.4       | 8 h            | N1     | reported ×2                  |
| 2    | The stat table one step high                                                                                                                | 4.1           | 1.5 h          | N1     | verified                     |
| 3    | Class hit and spell point bases and factors                                                                                                 | 4.3           | 2 h            | N1     | verified                     |
| 4    | Turn-based mode                                                                                                                             | 9.9           | 40–60 h        | N1     | verified (exists)            |
| 5    | Class skill access and the invented rank caps                                                                                               | 5.1           | 2 h            | N2     | reported, consistent         |
| 6    | Teachers: Normal skills at guilds, Expert and Master by MM6's per-skill table, the teacher screen                                           | 7.2, 7.3      | 14 h + content | N2     | verified                     |
| 7    | Training: price by hall, level and tier; Merchant; 8 days                                                                                   | 8.3           | 3 h + content  | N2     | reported ×2                  |
| 8    | Conditions: MM6's seventeen, their table, rest effects, one main condition                                                                  | 10            | 10 h           | N2     | reported + OE                |
| 9    | Down at 0, dead at minus base Endurance                                                                                                     | 12.1          | 1 h            | N2     | reported ×2                  |
| 10   | Rest: food by terrain, no rest near monsters, ambushes, the inn, short waits, new-day weakness                                              | 14            | 14 h           | N2     | reported                     |
| 11   | Party death and the week-later revival                                                                                                      | 12.2          | 6 h            | N2     | reported                     |
| 12   | The gem as enemy detector and recovery light; portraits by condition; voices                                                                | 10.5, 3.1     | 6 h + art      | N1     | verified                     |
| 13   | The runtime: hit recovery and condition times, monster to-hit by level, strike when near even with a bow                                    | 9.1, 9.3, 9.7 | 3 h            | N1     | verified                     |
| 14   | Ranged: arrows that fly, the 5,119-unit cap, distance penalties                                                                             | 9.3, 9.5      | 8 h            | N2     | verified (missiles inferred) |
| 15   | The character sheet: current / base pairs, damage as a range, resistances, quick spell                                                      | 4.6           | 4 h            | N1     | verified                     |
| 16   | Skill points 5 + ⌊L ÷ 10⌋                                                                                                                   | 7.1           | 0.5 h          | N3     | verified                     |
| 17   | Promotions: tiers, factors, honorary titles, Master gates                                                                                   | 5.2           | 8 h + content  | N3     | verified (rules)             |
| 18   | A second weapon and the Master weapon specials, Blaster included                                                                            | 6.2, 9.4      | 16 h           | N3     | verified / reported          |
| 19   | Character resistances, typed damage, Luck                                                                                                   | 11            | 5 h            | N3     | verified                     |
| 20   | Falling and drowning damage                                                                                                                 | 13            | 5 h            | N2     | inferred (OE)                |

Below the cut: experience shares (8.2, 1 h), aging (12.4, 4 h), Cursed's rate (0.5 h), running
and moving slowing recovery (9.2, 2 h with a run control), item use costing recovery (1 h), the
negative attack clamp (4.5, 0.5 h), the shove by damage share (9.8, 1 h), the skill ceiling of 60
(6.4, 1 h), Diplomacy as a skill (3.3), the temple price model (10.6, 2 h), fame (8.2).

## 17. What the owner should check in the original

GrayFace's patch shows recovery in the help of Attack and Shoot [GF-P], and MMExtension's console
can set hit points, conditions and statistics directly [MMX]; with both, most of these take
minutes. Record each answer in DESIGN 14 when it lands.

1. **Recovery rate.** A Knight with a staff, no armour and Speed 13 recovers 100 units. Time twenty
   swings in real time. MM7's rate predicts 1.67 s a swing; 128 units a second would give 0.78 s.
2. **Expert armour.** Read the recovery in Attack's help in chain mail at Normal and at Expert
   Chain (MW6 predicts 20 and 10), and once unpatched if possible (Mok's fix).
3. **Down at 0?** Set a member to exactly 0 hit points; is the member unconscious?
4. **Death depth.** With base Endurance 15 and a ring of +10 Endurance, does the member die at −15,
   −16 or −25?
5. **Cursed.** Cast 30 cheap spells while cursed; count failures (MW6: about 20; MM7 engine: 15).
   Do attacks miss more?
6. **Creation.** Can OK be pressed with points left? Can a stat fall 3 below its start, or rise to
   26? How many faces, and does each have its own voice?
7. **Starting age** of a new character of each class, and whether it varies.
8. **Starting kit** of each class with different picks: which items, which spellbooks, any rings?
9. **Knight's magic resistance** at creation (MW6 says 10).
10. **Party death** without Guardian Angel: where, how many days later, what gold is left, in what
    state the members wake.
11. **Temple prices** for one condition caught on two different weekdays.
12. **Food per rest** on grass, road, indoors, snow, swamp and sand.
13. **New day**: stay awake 24, 48 and 96 hours; note Weak, food eaten, hit points, insanity, death.
14. **Fall damage** from three known heights, as a share of maximum hit points; drowning and lava
    damage per second.
15. **Melee reach**: the distance at which A changes from a swing to a shot or a pass.
16. **Turn-based**: can the party move at all; how many times a dagger fighter acts per turn.
17. **Training**: days passed per visit; whether training heals.
18. **Master Dagger**: count triple strikes in 100 hits (10 % or the skill %).
19. **Stun**: what a stunned monster does, and for how long.
20. **Experience**: does an unconscious member share a kill; does every member get a quest's full
    experience; does Learning apply to it?
21. **Speed below 13**: does it lower armour class (POT says no)?
22. **Conditions together**: a Drunk and Poison 1 member's Might (which one counts), and which name
    the portrait and sheet show for Weak with Afraid.
23. **Skill ceiling**: 60 or 63.

## 18. Corrections to GAPS, DESIGN 14 and `src/game/README.md`

| Place                  | Says                                                                                        | Finding                                                                                                         | Source                  |
| ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| GAPS 1                 | pool size, sharing and refunds unverified; Paladin's fixed pair "most likely" Sword, Spirit | 50 for the party, −2 a stat refunded, cap 25; Sword and Spirit confirmed                                        | DCC; MMW; screenshot-22 |
| GAPS 2                 | promotion gains known only for Sorcerer and Knight; Paladin's base or factor wrong          | every tier known (4.3); the Paladin is 25 + 3                                                                   | MW6; KAS; DCC; TXT      |
| GAPS 2                 | Druids cannot learn Mace (RPGC)                                                             | they can; it is among their starting picks                                                                      | DCC; MW6; DOB           |
| GAPS 3                 | old-age thresholds unverified                                                               | 50, 100, 150 with the table of 12.4                                                                             | MW6; OE                 |
| GAPS 4                 | Dagger triple chance: sources conflict                                                      | the help text says skill %; the original code uses 10 %; the patch follows the text                             | GF-M; OE                |
| GAPS 4                 | Expert armour reduction unverified                                                          | halved                                                                                                          | MW6                     |
| GAPS 5                 | five skill points a level; Expert at 4 unverified for every skill                           | 5 + ⌊L ÷ 10⌋; skill 4 for every Expert                                                                          | MW6; DCC; JP            |
| GAPS 6                 | the kill experience split unverified                                                        | equal among members who can receive it (not unconscious, dead, stoned, eradicated); quest experience per member | MW6; OE                 |
| GAPS 8                 | bows get no Might (unverified); melee range unverified                                      | no Might (MM6's help); a near foe is struck even with a bow; MM7 monsters reach 307 units                       | TXT; MAN; OE            |
| GAPS 10                | condition effects and Cursed's rate unverified; poison as levels                            | the full table (10.2); Cursed in conflict; Afraid acts; colours                                                 | MW6; OE                 |
| GAPS 11                | dead below minus Endurance (at 30, −31); unconscious below 0                                | dead at minus base Endurance; unconscious at 0 or less; the party revives a week later in New Sorpigal          | MW6; TXT; OE            |
| GAPS 17, world.md 4.5  | temple prices unverified                                                                    | the weekday model (10.6)                                                                                        | MW6                     |
| GAPS 22                | food per place unverified; whether monsters forbid or interrupt a rest unverified           | by terrain, 1 to 5; no rest with monsters near; camps can be attacked                                           | MW6; MAN                |
| DESIGN 14.1            | the community bonus table                                                                   | not MM6's                                                                                                       | GF-M; POT; LP           |
| DESIGN 14.2            | "MM6 favours the front row"                                                                 | MM6 has no rows; monsters choose by class and sex                                                               | LP; monsters.md 2.9     |
| DESIGN 14.2            | a bow at arm's length unverified                                                            | a near foe is struck                                                                                            | MAN                     |
| DESIGN 14.2, README    | down below 0, dead below minus Endurance                                                    | 12.1                                                                                                            | TXT; MW6; OE            |
| README `conditions.ts` | Afraid cannot act; the penalties are ours                                                   | Afraid acts; the penalties are known                                                                            | MW6; OE                 |
| README `classes.ts`    | the class table "as community tables give it"                                               | every class's hit points wrong (4.3)                                                                            | POT; MW6; DCC           |
| README `experience.ts` | MM6's per-level skill points "not agreed"                                                   | 5 + ⌊L ÷ 10⌋                                                                                                    | MW6; DCC                |

## 19. Sources

All public; read on 2026-10-18. Downloaded pages were read as data only; nothing from them is in
this repository.

- **[GF-M]** GrayFace, "Might and Magic Mechanics": the stat table, experience, hit chances, the
  MM6 saves, resistances, recovery, dual weapons, the dagger.
  https://grayface.github.io/mm/mechanics/
- **[GF-P]** GrayFace, MM6 Patch read-me (its fixes describe the original): condition order,
  recovery and dual-wield fixes, waits, new-day effects, the recovery shown in help.
  https://grayface.github.io/mm/MM6PatchReadMe
- **[MMX]** GrayFace, MMExtension reference: the character record (`structs.Player`), conditions,
  damage types, party state bits, turn-based phases, the faces module.
  https://grayface.github.io/mm/ext/ref/
- **[TXT]** MM6's own English text tables (`Class.txt`, `SKILDES.TXT`, `stats.txt`) as published
  by the mm678-i18n project, `source/en/mm6/data/10LocLANG.icons/`.
  https://github.com/might-and-magic/mm678-i18n
- **[MAN]** Might and Magic VI manual, The 3DO Company, 1998 (keys, creation, classes, skills,
  screens, exploring, combat and recovery, rest, experience, spells).
  https://mocagh.org/nwc/mm6-manual.pdf
- **[MW6]** mm6world.ru, "Персонажи и экипировка" (classes, levels, statistics,
  resistances, age, conditions, skills, weapons, armour, recovery) and "Сервис" (temples,
  training, taverns).
  http://mm6world.ru/6_characters.htm, http://mm6world.ru/6_services.htm
- **[POT]** David Potts, "MM6 Character Attributes" (the stat table, level-1 hit and spell point
  formulas). http://www.pottsland.com/mm6/attributes.shtml (also on Celestial Heavens:
  https://www.celestialheavens.com/mm-vi/general-mmvi/character-attributes)
- **[KAS]** David Kass, "MM6 More Character Attributes" (factors by tier, Body Building and
  Meditation in the formula). http://www.pottsland.com/mm6/attributes2.shtml
- **[DCC]** Dungeon Crawl Classics, MM6 pages: party planning (pool, starting skills),
  skills database (teachers, skill points, Expert and Master rules), building strength (promotion
  rewards). https://dungeoncrawl-classics.com/might-and-magic/mm6/mm6-party/,
  https://dungeoncrawl-classics.com/might-and-magic/mm6/mm6-skills-database/,
  https://dungeoncrawl-classics.com/might-and-magic/mm6/mm6-building-strength/
- **[MMW]** Might and Magic Wiki, the six MM6 class pages (attribute minimum, start, maximum), read
  through search-engine extracts because the site refuses automated reading (HTTP 402).
  https://mightandmagic.fandom.com/wiki/Knight_(MM6) and its siblings
- **[LP]** PurpleXVI, Let's Play Might and Magic 6: introduction and update 1.
  https://lparchive.org/Might-and-Magic-6/
- **[DOB]** D. G. Dobrev, "The Complete Guide to Might and Magic VI".
  https://www.cheathappens.com/text/mm6guide.zip.txt
- **[RPGC]** RPG Classics MM6 shrine (skills, characters). http://tartarus.rpgclassics.com/mm6/
- **[CH]** Celestial Heavens MM6 articles: basic tips, getting started, bugs.
  https://www.celestialheavens.com/mm-vi/general-mmvi/basic-tips
- **[MGW]** Magic Game World, MM6 promotion quests guide (honorary promotions).
  https://www.magicgameworld.com/?p=37773
- **[JP]** J. Pike's walkthrough, as cited by world.md.
- **[WP6]** Wikipedia, "Might and Magic VI: The Mandate of Heaven" (turn-based movement).
  https://en.wikipedia.org/wiki/Might_and_Magic_VI:_The_Mandate_of_Heaven
- **[MM7 card]** MM7 reference card (MM7 only). https://mocagh.org/nwc/mm7-refcard.pdf
- **[OE]** OpenEnroth, the open rebuild of the MM7 engine: `src/Engine/Objects/Character.cpp`
  (conditions, aging, damage, recovery, hit roll), `src/Engine/Party.cpp` (experience, rest, the
  active member, falls), `src/Engine/Engine.cpp` (new day, water, lava),
  `src/Engine/Objects/Actor.cpp` (pain, knock-back, stun), `src/Engine/mm7_data.cpp` and `.h`
  (recovery table, real-time factor, melee reach), `src/Engine/TurnEngine/TurnEngine.cpp`,
  `src/Engine/Graphics/Indoor.cpp` and `Outdoor.cpp`. MM7 only; never proof for MM6. https://github.com/OpenEnroth/OpenEnroth
- **Screenshots** in `artwork/reference/` (third-party, reference only): 19, 21, 22, 23, 30 and the
  capture of 2026-07-09 18:33.
- The project's files at commit `d770e33`, as cited.
