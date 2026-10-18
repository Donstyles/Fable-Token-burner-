# MM6 items and treasure

A specification of Might and Magic VI's items, enchantments, treasure,
shops, bank and potions, measured against this code at commit `e9ee563`
(2026-10-18). It turns sections 12 to 15, 20 and 23 of
`docs/MM6-GAPS.md` into numbers a build can follow.

## How to read this

- Every fact carries a source tag in square brackets, such as [TXT-SPC].
  The tags are explained in section 12.
- **Unverified** marks MM6 behaviour that no source here confirms. Decide
  those before building them.
- Where sources disagree, both values are given. Tables print the
  recommended value first and the other in brackets.
- **MM7 rule** marks an algorithm read from OpenEnroth [OE], the open
  re-implementation of MM7's engine. MM6 and MM7 share that engine, and
  where MM6 numbers could be checked against these rules they matched
  (section 6.3). An MM7 rule still counts as unverified for MM6.
- **Ours** marks a value this document proposes where MM6's own value is
  not public.
- No game binary or archive was opened. Names and numbers come from
  public pages and from a public repository that publishes MM6's text
  tables [TXT]. No prose or picture from any source is reproduced.
- Status words and sizes as in `docs/MM6-GAPS.md`: Missing, Partial,
  Present but deviates, Present; S hours, M a day or two, L several days,
  XL a week or more.

## Summary

**What the project has.** 17 hand-made items in `src/game/items.ts`. An
item kind is `{ id, name, kind, w, h, value, skill, damage, twoHanded,
ranged, recoverySec, armor, recoveryPenaltySec, use }`; a copy is
`{ id, identified, broken }`. The 14 × 9 grid and the 16 equipment slots
match MM6 (`src/game/inventory.ts`). Shops buy anything, identify for a
flat fee and repair for a share of the value, with Merchant worth 2 % a
point (`src/game/services.ts`). There is no loot, no gold from monsters,
no chest, no enchantment, no artifact, no alchemy, no wand, no gem, no
spellbook item and no bank.

**What MM6 has.** About 570 item records: 65 weapons (and a quest axe),
54 pieces of armour and clothing, 15 rings and amulets, 10 gems, 25 wands,
99 spell scrolls, 99 spellbooks, 3 herbs, an empty bottle and 25 potions,
3 gold piles, 30 artifacts and relics, and about 140 quest and other
items. On top: 14 standard and 59 special enchantments, treasure levels 1
to 6 plus artifacts, 47 shops of four kinds, 22 guild bookshops, 6 banks
and a 25-potion mixing table.

**The five findings that matter most**

1. **Most of the item economy is public data, not guesswork.** MM6's own
   design tables are published: the 14 standard bonuses with their odds
   per slot and their strength per treasure level [TXT-STD], the 59
   special bonuses with slots, values and level groups [TXT-SPC], the full
   alchemy matrix with four grades of explosion [TXT-USE], and every
   shop's price factor, regular and special stock, restock days and
   opening hours [TXT-HOUSE]. Sections 3, 6 and 7 transcribe them.
2. **MM6's price code is MM7's.** The MM7 tavern formulas reproduce the
   owner's screenshot of A Lonely Knight (room 3 gold, fill packs to 6
   days for 2 gold at the house's factor 6), and the transport formulas
   reproduce the guides' coach and boat fares. The MM7 shop formulas
   (buy = value × factor less Merchant, never under value; sell =
   value ÷ (factor + 2) plus Merchant; identify = 50 × factor; repair =
   value ÷ (6 − factor)) are therefore the best model for MM6
   (section 6.3). The project's formulas differ.
3. **The 17 existing items are off.** Names, dice and values differ from
   MM6 (the longbow is 5d2, not 3d3; leather armour costs 150, not 30;
   chain mail 400, not 150; MM6 has no short sword and no copper ring; a
   level-1 scroll costs 10). Recovery belongs to the weapon family, not
   the item (dagger 60, sword 90, mace and spear 80, axe, staff, bow and
   club 100, blaster 30 [GF-M]). MM6 lets a dagger (Expert) or a sword
   (Master) go in the off hand, which `src/game/inventory.ts` says it
   does not (sections 1.2, 2.1 and 2.11).
4. **Treasure is half known.** Monster drops are known per monster (gold
   dice, item chance, level and kind [TXT-MON]); bonus strengths per
   level are known [TXT-STD]; identify and repair difficulty is known per
   item (1 to 20, artifacts 15, relics 20 [MMW]). Not public: the weight of
   each item per treasure level and MM6's chance of an enchantment per
   level. The merged MM6/7/8 game's chances (standard
   0/40/40/40/40/75 %, special 0/0/10/15/20/25 %, weapons
   0/0/10/20/30/50 %) are the nearest (section 4.3).
5. **Mixing is dangerous by design.** Wrong mixes explode in four grades,
   from 10–20 fire damage up to eradication with every item in the pack
   broken; the grade depends only on the two potions' tiers
   (section 7.2). The seven essences raise a stat by 15 once per
   character and lower another.

**Recommended first step.** Rebuild the item record and the catalogue
(section 9, step 1, size M): MM6's item types, per-kind fields (generic
name, +N, rarity, difficulty, weights, icon), per-copy enchantment and
charges, the corrected 65 weapons and 54 armour pieces, and one function
that sums worn bonuses into the character sheet. Every later step (loot,
shops, identify, alchemy) reads this record.

## Contents

1. The item record
2. The catalogue
3. Enchantments, artifacts and relics
4. Treasure generation
5. Identify, repair, breaking and theft
6. Shops, prices and the bank
7. Potions and alchemy
8. What to build: the gap table
9. Build order
10. Art needs
11. Decisions for the owner
12. Sources

## 1. The item record

### 1.1 One row per item kind

MM6 keeps one row per item kind [MMX `structs.ItemsTxtItem`]:

| MM6 field           | Meaning                                                                                                                   | Project (`ItemDef`)                       | Action                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| Picture             | Icon name. The icon's pixel size also fixes the footprint (1.3).                                                          | none; a line glyph per kind (`glyphs.ts`) | add `icon`                                            |
| Name                | Name once identified.                                                                                                     | `name`                                    | keep; fix names (2.11)                                |
| Not-identified name | Generic name until identified: "Longsword" for all long swords, "Strange Device" for blasters, "Artifact", "Relic" [MMW]. | none; the UI shows "Unknown weapon"       | add `unidentifiedName`                                |
| Notes               | Description in the inspect pop-up.                                                                                        | none; a browser `title` only              | add `description` (our own text)                      |
| Value               | Base value in gold.                                                                                                       | `value`                                   | keep; fix numbers                                     |
| EquipStat           | Item type (1.2).                                                                                                          | `kind` (13 kinds)                         | replace with MM6's types                              |
| Skill               | Skill needed to equip; for weapons also the skill added to attack.                                                        | `skill`                                   | keep                                                  |
| Mod1                | Weapons: damage dice. Armour: base armour class.                                                                          | `damage`, `armor`                         | keep                                                  |
| Mod2                | Weapons: the "+N" added to damage and to attack [SAS; DOB]. Armour: armour bonus over the base [MMW].                     | `damage.bonus` only                       | add `bonus`                                           |
| Material            | 0 normal, 1 artifact, 2 relic, 3 special.                                                                                 | none                                      | add `rarity`                                          |
| ChanceByLevel[1..6] | Weight of this kind in random generation at each treasure level.                                                          | none                                      | add `chanceByLevel` (4.2)                             |
| IdRepSt             | One difficulty for both identify and repair (5.1).                                                                        | none                                      | add `difficulty`                                      |
| SpriteIndex         | The sprite drawn when the item lies on the ground.                                                                        | none                                      | add `groundSprite`, or reuse the icon (decision 11.4) |
| EquipX, EquipY      | Offset of the item's picture on the paper doll.                                                                           | none                                      | add with the doll pipeline (DESIGN 12)                |

Not in MM6's per-kind row, and so not per item here either:

- **Recovery.** It comes from the weapon's family and the armour's family
  (2.1, 2.2) [GF-M]. Drop `recoverySec` and `recoveryPenaltySec` from
  `ItemDef`; put them on the family.
- **Requirements beyond the skill.** No source mentions a stat
  requirement; the guides describe each family as usable by anyone with
  its skill [SAS]. The note "no stat requirements yet" in
  `src/game/README.md` can go.

### 1.2 Types, slots and equip rules

MM6's item types [MMX `const.ItemType`] and slots [MMX `const.ItemSlot`]:

| MM6 type         | What                                                    | Slot                                  | Skill to equip                   | Project kind                 |
| ---------------- | ------------------------------------------------------- | ------------------------------------- | -------------------------------- | ---------------------------- |
| Weapon           | one-handed swords, daggers, axes, maces, hammers, clubs | main hand; some in the off hand       | the weapon's skill; clubs anyone | `weapon`                     |
| Weapon2H         | two-handed swords, poleaxes, staves                     | main hand, off hand stays empty       | Sword, Axe, Staff                | `weapon` + `twoHanded`       |
| one or two hands | spears, tridents, halberds (type name unverified)       | main hand; two hands if no shield     | Spear                            | `weapon` (`twoHanded` wrong) |
| Missile          | longbows, crossbows                                     | bow                                   | Bow                              | `weapon` + `ranged`          |
| Armor            | leather, chain and plate armour                         | armour                                | Leather, Chain, Plate            | `armor`                      |
| Shield           | small and large shields                                 | off hand                              | Shield                           | `shield`                     |
| Helm             | helms, hats, crowns                                     | helmet                                | none                             | `helmet`                     |
| Belt             | belts                                                   | belt                                  | none                             | `belt`                       |
| Cloak            | cloaks                                                  | cloak                                 | none                             | `cloak`                      |
| Gauntlets        | gauntlets                                               | gauntlets                             | none                             | `gauntlets`                  |
| Boots            | boots                                                   | boots                                 | none                             | `boots`                      |
| Ring             | rings                                                   | rings 1 to 6                          | none                             | `ring`                       |
| Amulet           | amulets                                                 | amulet                                | none                             | `amulet`                     |
| Wand             | 25 wands                                                | main hand, like a weapon [SAS]        | none                             | missing                      |
| Reagent          | 3 herbs                                                 | none                                  | none                             | missing                      |
| Potion           | empty bottle, 25 potions                                | none                                  | none                             | `potion`                     |
| Scroll           | 99 spell scrolls                                        | none                                  | none                             | `scroll`                     |
| Book             | 99 spellbooks                                           | none                                  | the school's skill, to learn     | missing                      |
| MScroll          | about 50 letters, journal pages and codes               | none                                  | none                             | missing                      |
| Gold             | 3 gold-pile items; the amount is stored on the copy     | none; picked up into the party's gold | none                             | missing                      |
| Gem, Misc        | gems, quest items, keys, souvenirs                      | none                                  | none                             | `misc`                       |

Equip rules:

- **Off hand.** A shield; or a dagger once Dagger is Expert; or a
  one-handed sword once Sword is Master [RPGC skills; MMW]. The project
  allows only a shield (`inventory.ts`, header comment): Present but
  deviates.
- **Dual wielding.** In MM6 the off-hand weapon's recovery was added to
  the main one, so a second weapon slowed the attack; GrayFace's patch
  makes it work as in MM7 [GF-M; GF-P]. Damage takes the right hand's
  skill and attack the left hand's in MM6 [GF-M]. Which behaviour to copy
  is decision 11.2.
- **Spears, tridents, halberds.** One hand with a shield, two hands
  without; two hands roll one more die (Spear 1d9 becomes 2d9, Trident
  2d6 becomes 3d6) [SAS; RPGC skills]. The project marks the spear
  two-handed: deviates.
- **Staves** are two-handed [MMW]. Two-handed swords and poleaxes too.
- **Bows and crossbows** go in the bow slot and fire with Shoot. Present.
- **Wands** are held like a weapon; each attack casts the wand's spell and
  spends a charge [SAS] (2.5).
- **Blasters** need the Blaster skill, which can only be learnt by someone
  who owns a blaster [MMW]. Their slot is unverified.
- **Broken items** give nothing while worn (MM7 rule, [OE]). The project
  already ignores them in armour and weapon sums and refuses to equip
  them; MM6's refusal is unverified.

### 1.3 Footprint on the grid

- The pack is 14 × 9 cells (screenshot-19). Present.
- An item's footprint comes from its icon: cells = ⌊(pixels − 14) ÷ 32⌋ +
  1, with pixels under 14 counted as 14, on each axis (MM7 rule, [OE]).
  So the footprint is set when the icon is processed (DESIGN 12.4), not
  typed by hand.
- Screenshot-19 shows two scrolls (most likely the starting letters) as
  2 × 1 cells each, a spellbook as 2 × 2 and a small jewel as 1 × 1. The
  project's scrolls are 1 × 1; a spell scroll's footprint is unverified.
- New items fill the pack row by row in MM6; MM7 and MM8 fill column by
  column, and GrayFace's patch switches MM6 to columns [GF-P]. The
  project fills row by row (`findFreeSlot`): Present.

### 1.4 One record per copy

MM6 keeps these per copy [MMX `structs.Item`]:

| MM6 field                | Meaning                                                              | Project (`ItemInstance`) |
| ------------------------ | -------------------------------------------------------------------- | ------------------------ |
| Number                   | the item kind                                                        | `id`                     |
| Bonus, BonusStrength     | standard enchantment (one of 14) and its +N                          | missing                  |
| Bonus2                   | special enchantment (one of 59); for a gold pile, the amount of gold | missing                  |
| Charges, MaxCharges      | wand charges                                                         | missing                  |
| Identified               | flag                                                                 | `identified`             |
| Broken                   | flag                                                                 | `broken`                 |
| Stolen                   | flag; MM6 has no theft skill, so its use in MM6 is unverified        | missing                  |
| TemporaryBonus, Hardened | flags in the record shared by MM6 to MM8; use in MM6 unverified      | missing                  |
| BodyLocation             | the slot when worn                                                   | the `Equipment` map      |
| Owner                    | unverified meaning                                                   | missing                  |

Proposed shape, JSON-safe as the save needs:

```ts
export interface ItemInstance {
  id: ItemId;
  identified: boolean;
  broken: boolean;
  /** One of the 14 standard bonuses (3.1), strength 1 to 25. */
  standard?: { bonus: StandardBonusId; strength: number };
  /** One of the 59 special enchantments (3.2). */
  special?: SpecialEnchantmentId;
  /** Wands only. */
  charges?: number;
  maxCharges?: number;
  /** Gold piles only: the amount. */
  gold?: number;
}
```

`src/game/save.ts` validates `{ id, identified, broken }` only; the new
fields need `SAVE_VERSION` 2 and a `migrate` step that maps the old ids
(2.11).

**Value of a copy** (MM7 rule [OE]; it matches MM6's own notes [TXT-STD;
TXT-SPC]):

- artifact or relic: its fixed value;
- standard enchantment: base value + 100 × strength;
- special enchantment: base value × multiplier + addition (Vampiric,
  Swiftness and the two slayers ×2, Darkness ×3, Antique ×10; the rest
  add a fixed sum, table 3.2);
- otherwise the base value.

**Name of a copy.** Identified: prefix, name, suffix. Seven special
enchantments are prefixes (Vampiric, Demon Slayer, Dragon Slayer, Rogues,
Warriors, Wizards, Antique); the other 52 and all standard bonuses are
"of …" suffixes [TXT-SPC; TXT-STD]. Unidentified: the generic name.

## 2. The catalogue

Sources for every table in this section: names, dice, armour and values
from [RPGC], [MPIKE], [SAS] and [MMW]; identify and repair difficulty
("Diff.") from [MMW]; the lowest treasure level the item appears at
("Lvl") from [CHI], which matches the shop stock levels in 6.5; generic
names from [MMW]; icon names from the MM6 block of a merged item table
[OY]. A value in brackets is the other source's figure.

### 2.1 Weapons (65, and one quest axe)

Families:

| Family            | Skill    | Hands                        | Recovery [GF-M] | Generic name     | Icons      |
| ----------------- | -------- | ---------------------------- | --------------- | ---------------- | ---------- |
| Longswords        | Sword    | one                          | 90              | Longsword        | lsword1–5  |
| Two-handed swords | Sword    | two                          | 90              | Two-Handed Sword | 2hsword1–3 |
| Broadswords       | Sword    | one                          | 90              | Broadsword       | brsword1–3 |
| Cutlasses         | Sword    | one                          | 90              | Cutlass          | cutlass1–3 |
| Daggers           | Dagger   | one                          | 60              | Dagger           | dagger1–5  |
| Long daggers      | Dagger   | one                          | 60              | Long Dagger      | ldagger1–3 |
| Axes              | Axe      | one                          | 100             | Axe              | axe1–5     |
| Poleaxes          | Axe      | two                          | 100             | Two-Handed Axe   | 2haxe1–3   |
| Spears            | Spear    | one or two (+1 die with two) | 80              | Spear            | spear1–5   |
| Halberds          | Spear    | one or two (+1 die with two) | 80              | Halberd          | halberd1–3 |
| Tridents          | Spear    | one or two (+1 die with two) | 80              | Trident          | trident1–3 |
| Longbows          | Bow      | bow slot                     | 100             | Longbow          | bow1–5     |
| Crossbows         | Bow      | bow slot                     | 100             | Crossbow         | crsbow1–3  |
| Maces             | Mace     | one                          | 80              | Mace             | mace1–5    |
| Hammers           | Mace     | one                          | 80              | Hammer           | hammer1–3  |
| Clubs             | none (1) | one                          | 100             | Club             | club1–3    |
| Staves            | Staff    | two                          | 100             | Staff            | staff1–3   |
| Blasters          | Blaster  | unverified                   | 30              | Strange Device   | raygun1–2  |

(1) MM7 gives clubs a hidden Club skill that every character knows, so
anyone can wield one and no skill adds to it [OE `Character.cpp`]. The
wiki gives MM6's clubs the skill "Club" [MMW], which no class learns;
MM6's rule is otherwise unverified.

Recovery is in MM6's units, where 100 is a staff blow before Speed and
skills [GF-M]; converting units to seconds is the combat document's
business. Armour adds: shield 10, leather 10, chain 20, plate 30; armour
skill at Expert reduces it and at Master removes it [GF-M; DOB].

| Weapon            | Damage          | Value     | Diff. | Lvl | Note                                          |
| ----------------- | --------------- | --------- | ----- | --- | --------------------------------------------- |
| Longsword         | 3d3             | 50        | 1     | 1   |                                               |
| Warrior Sword     | 3d3+3           | 200       | 3     | 2   |                                               |
| Crusader Sword    | 3d3+6           | 350       | 5     | 3   |                                               |
| Champion Sword    | 3d3+9           | 500       | 7     | 3   |                                               |
| Lionheart Sword   | 3d3+12          | 650       | 9     | 5   | no shop sells it [CHI]                        |
| Two-Handed Sword  | 4d5             | 400       | 1     | 2   |                                               |
| Great Sword       | 4d5+2           | 500       | 6     | 2   |                                               |
| Heroic Sword      | 4d5+8           | 800       | 8     | 4   |                                               |
| Broadsword        | 3d4             | 100       | 1     | 1   |                                               |
| Steel Broadsword  | 3d4+4           | 300       | 4     | 2   |                                               |
| Mighty Broadsword | 3d4+10          | 600       | 6     | 4   |                                               |
| Cutlass           | 2d4             | 40        | 1     | 1   |                                               |
| Pirate Cutlass    | 2d4+5           | 290       | 3     | 1   |                                               |
| Master Cutlass    | 2d4+11          | 590       | 5     | 4   |                                               |
| Dagger            | 2d2             | 8         | 1     | 1   |                                               |
| Blood Dagger      | 2d2+2           | 100       | 2     | 1   |                                               |
| Shadow Dagger     | 2d2+3           | 150       | 3     | 2   |                                               |
| Mage Dagger       | 2d2+5           | 250       | 4     | 3   |                                               |
| Jeweled Dagger    | 2d2+6           | 300       | 5     | 4   |                                               |
| Long Dagger       | 2d3             | 15        | 1     | 1   |                                               |
| Piercing Dagger   | 2d3+4           | 200       | 3     | 2   |                                               |
| Divine Dagger     | 2d3+7           | 350       | 5     | 4   |                                               |
| Hand Axe          | 4d2             | 30        | 1     | 1   |                                               |
| Battle Axe        | 4d2+2           | 100       | 2     | 1   |                                               |
| War Axe           | 4d2+5           | 250       | 4     | 2   |                                               |
| Dwarven Axe       | 4d2+8           | 400       | 5     | 2   |                                               |
| Supreme Axe       | 4d2+11          | 550       | 6     | 4   |                                               |
| Poleax            | 3d7             | 225 (300) | 1     | 2   | 225 in RPGC, MPIKE and SAS; 300 in MMW        |
| Heavy Poleax      | 3d7+3           | 450       | 5     | 2   |                                               |
| Grand Poleax      | 3d7+9           | 900 (750) | 8     | 4   | 750 in MMW                                    |
| Spear             | 1d9             | 15        | 1     | 1   |                                               |
| Stout Spear       | 1d9+1           | 50        | 2     | 1   |                                               |
| Serpent Spear     | 1d9+5           | 250       | 3     | 2   |                                               |
| Savage Spear      | 1d9+9           | 450       | 4     | 3   |                                               |
| Sacred Spear      | 1d9+13          | 650       | 6     | 4   |                                               |
| Halberd           | 3d6             | 200 (250) | 1     | 2   | 250 in MMW                                    |
| Massive Halberd   | 3d6+4           | 400 (450) | 4     | 2   | 450 in MMW                                    |
| Elite Halberd     | 3d6+10          | 700 (750) | 8     | 4   | 750 in MMW                                    |
| Trident           | 2d6             | 100       | 1     | 1   |                                               |
| Ornate Trident    | 2d6+6 (2d6+4)   | 400       | 3     | 3   | +4 in RPGC only                               |
| Titanic Trident   | 2d6+12          | 700       | 6     | 4   |                                               |
| Longbow           | 5d2             | 100       | 1     | 1   |                                               |
| Elven Bow         | 5d2+2           | 200       | 3     | 2   |                                               |
| Precision Bow     | 5d2+4           | 300       | 5     | 2   |                                               |
| Magic Bow         | 5d2+6           | 400       | 7     | 3   |                                               |
| Stellar Bow       | 5d2+8           | 500       | 9     | 4   |                                               |
| Crossbow          | 4d2             | 50        | 1     | 1   |                                               |
| Accurate Crossbow | 4d2+3           | 200       | 4     | 2   |                                               |
| True Crossbow     | 4d2+7           | 400       | 8     | 4   |                                               |
| Mace              | 2d4             | 50        | 1     | 1   |                                               |
| Wicked Mace       | 2d4+2           | 150       | 2     | 1   |                                               |
| Thunder Mace      | 2d4+5           | 300       | 3     | 2   |                                               |
| Wonder Mace       | 2d4+8           | 450       | 4     | 3   |                                               |
| Death Mace        | 2d4+11          | 600       | 6     | 4   |                                               |
| Hammer            | 2d5             | 120       | 1     | 1   |                                               |
| Dark Hammer       | 2d5+3           | 300       | 3     | 1   |                                               |
| Holy Hammer       | 2d5+9           | 600       | 5     | 4   |                                               |
| Club              | 1d3             | 1         | 0     | 1   | difficulty 0: always identified               |
| Spiked Club       | 1d3+3           | 40        | 2     | 1   |                                               |
| Killer Club       | 1d3+5           | 100       | 3     | 2   |                                               |
| Staff             | 2d4             | 40        | 1     | 1   |                                               |
| Emerald Staff     | 2d4+3           | 250 (200) | 4     | 2   | 200 in MMW                                    |
| Power Staff       | 2d4+7           | 500 (400) | 6     | 4   | 400 in MMW                                    |
| Blaster           | 3d5+8           | 0 (1)     | 20    | —   | no random weight [OY]; shops refuse it [GF-P] |
| Blaster Rifle     | 5d5+12 (4d5+12) | 0 (1)     | 20    | —   | 4d5+12 in MMW only                            |
| Snergle's Axe     | 4d2+9           | —         | —     | —   | quest item; uses the Dwarven Axe icon [OY]    |

The "+N" also adds to attack [SAS; DOB]. Two-handed spear damage: add one
die of the weapon's own size.

### 2.2 Armour and clothing (54)

Body armour and shields need their skill; the rest need none. Armour
class is the family's base plus the item's bonus [MMW]; the table gives
the total.

| Item                | AC      | Value       | Diff. | Lvl | Note                                         |
| ------------------- | ------- | ----------- | ----- | --- | -------------------------------------------- |
| Leather Armor       | 4       | 150         | 1     | 1   | Leather; generic "Leather Armor"; leather1–5 |
| Studded Leather     | 6       | 250         | 3     | 2   |                                              |
| Enchanted Leather   | 10      | 450         | 5     | 3   | "Enchanted Armor" in RPGC                    |
| Dragon Leather      | 16      | 750         | 7     | 4   |                                              |
| Imperial Leather    | 24      | 1150        | 9     | 5   | no shop sells it [CHI]                       |
| Chain Mail          | 8       | 400         | 1     | 1   | Chain; generic "Chain Mail"; chain1–5        |
| Steel Chain Mail    | 12      | 600         | 4     | 2   |                                              |
| Noble Chain Mail    | 18      | 900         | 6     | 3   |                                              |
| Royal Chain Mail    | 26      | 1300        | 8     | 4   |                                              |
| Majestic Chain Mail | 36      | 1800        | 10    | 5   | no shop sells it [CHI]                       |
| Plate Armor         | 20      | 1000        | 1     | 1   | Plate; generic "Plate Mail"; plate1–3        |
| Steel Plate Armor   | 28 (26) | 1400 (1300) | 6     | 4   | MMW gives 26 and 1300                        |
| Golden Plate Armor  | 54      | 2700        | 12    | 5   |                                              |
| Kite Shield         | 6       | 200         | 1     | 1   | Shield; generic "Large Shield"; lshield1–5   |
| Tower Shield        | 7       | 300         | 3     | 1   |                                              |
| Castle Shield       | 9       | 400         | 5     | 3   |                                              |
| Celestial Shield    | 13      | 500         | 7     | 3   |                                              |
| Olympian Shield     | 19      | 800         | 9     | 5   |                                              |
| Wooden Shield       | 4       | 100         | 1     | 1   | Shield; generic "Small Shield"; sshield1–5   |
| Bronze Shield       | 6       | 200         | 2     | 1   |                                              |
| Steel Shield        | 8       | 300         | 3     | 3   |                                              |
| Spirit Shield       | 12      | 450         | 4     | 3   |                                              |
| Astral Shield       | 18      | 750 (600)   | 5     | 5   | SAS guessed 600                              |
| Helm                | 2       | 60          | 1     | 1   | no skill; generic "Helm"; helm1–5            |
| Steel Helm          | 6       | 260         | 4     | 1   |                                              |
| Guardian Helm       | 8       | 460 (360)   | 6     | 2   | MMW 360                                      |
| Defender Helm       | 10      | 660 (460)   | 8     | 3   | MMW 460                                      |
| Angelic Helm        | 12      | 860 (560)   | 10    | 4   | MMW 560                                      |
| Cloth Hat           | 0       | 20          | 1     | —   | helmet slot; generic "Hat"; hat1–3           |
| Fancy Hat           | 0       | 100         | 2     | —   |                                              |
| Wizard Cap          | 0       | 200         | 3     | —   |                                              |
| Crown               | 0       | 250         | 12    | —   | helmet slot; generic "Crown"; crown1–3       |
| Regal Crown         | 0       | 450         | 14    | —   |                                              |
| Almighty Crown      | 0       | 650         | 16    | —   |                                              |
| Leather Belt        | 0       | 40          | 1     | —   | generic "Belt"; belt1–5                      |
| Mercenary Belt      | 0       | 100         | 2     | —   |                                              |
| Vanguard Belt       | 0       | 225         | 3     | —   |                                              |
| Warlord Belt        | 0       | 450         | 4     | —   |                                              |
| Sovereign Belt      | 0       | 600 (650)   | 5     | —   | SAS 650                                      |
| Leather Cloak       | 1       | 50          | 2     | 1   | generic "Cloak"; cape1–5                     |
| Phantom Cloak       | 3       | 150         | 3     | 1   |                                              |
| Elven Cloak         | 5       | 250         | 4     | 2   |                                              |
| Cardinal Cloak      | 7       | 450         | 5     | 3   |                                              |
| Doom's Day Cloak    | 9       | 750         | 6     | 3   |                                              |
| Gauntlets           | 3       | 100         | 2     | 1   | generic "Gauntlets"; gontlet1–5              |
| Knight Gauntlets    | 6       | 250         | 4     | 1   |                                              |
| Paladin Gauntlets   | 8       | 450         | 6     | 2   |                                              |
| Cavalier Gauntlets  | 10      | 650         | 8     | 3   | spelt "Cavaleer" in RPGC and CHI             |
| Ultimate Gauntlets  | 12      | 850         | 10    | 3   |                                              |
| Leather Boots       | 2       | 50          | 3     | 1   | generic "Boots"; boots1–5                    |
| Steel Boots         | 6       | 250         | 4     | 3   |                                              |
| Armored Boots       | 8       | 450         | 5     | 3   |                                              |
| Sterling Boots      | 10      | 650         | 6     | 4   |                                              |
| Ultimate Boots      | 12      | 850         | 7     | 4   |                                              |

A "—" in Lvl means no source gives it. Plain hats, crowns, belts, rings
and amulets do nothing; their worth is their value and their enchantments
[SAS].

### 2.3 Rings and amulets (15)

| Ring           | Value | Diff. |     | Amulet           | Value      | Diff. |
| -------------- | ----- | ----- | --- | ---------------- | ---------- | ----- |
| Fine Ring      | 100   | 2     |     | Turquoise Amulet | 500        | 2     |
| Sparkling Ring | 300   | 4     |     | Gothic Amulet    | 750 (7500) | 4     |
| Lunar Ring     | 500   | 6     |     | Claw Amulet      | 1000       | 6     |
| Witch Ring     | 700   | 8     |     | Ancient Amulet   | 1250       | 8     |
| Blessed Ring   | 900   | 10    |     | Ruby Star Amulet | 1500       | 10    |
| Valuable Ring  | 1100  | 12    |     |                  |            |       |
| Precious Ring  | 1300  | 14    |     |                  |            |       |
| Ethereal Ring  | 1500  | 16    |     |                  |            |       |
| Exquisite Ring | 1700  | 18    |     |                  |            |       |
| Scarab Ring    | 2000  | 20    |     |                  |            |       |

RPGC's 7500 for the Gothic Amulet is a slip; three sources give 750.
Generic names "Ring" and "Amulet"; icons ring1–10 and amulet1–5 [OY].

### 2.4 Gems (10)

Moonstone 1000, Topaz 1200, Amethyst 1400, Emerald 1600, Purple Topaz
1800, Sunstone 2000, Ruby 2200, a second Emerald 2500, Sapphire 3000,
Diamond 4000 [RPGC]; [SAS] confirms Moonstone, Topaz, Ruby and the 2500
Emerald. Gems only sell. Ten icons, gem1–10 [OY]. Which icon is which gem
is unverified. Gems drop from chests and some monsters [SAS].

### 2.5 Wands (25)

| Tier (value, icon)         | Wand and the spell it casts (school, spell level)                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wand (1000, wand1)         | of Flame: Flame Arrow (Fire 2); of Static: Static Charge (Air 2); of Cold: Cold Beam (Water 2); of Stunning: Stun (Earth 1); of Arrows: Magic Arrow (Earth 2)                            |
| Fairy Wand (1500, wand2)   | of Fire: Fire Bolt (Fire 4); of Sparks: Sparks (Air 4); of Poison: Poison Spray (Water 4); of Mind: Mind Blast (Mind 3); of Harm: Harm (Body 4)                                          |
| Alacorn Wand (2000, wand3) | of Fireballs: Fireball (Fire 6); of Ice: Ice Bolt (Water 6); of Swarms: Deadly Swarm (Earth 4); of Blades: Blades (Earth 6); of Charms: Charm (Mind 6)                                   |
| Arcane Wand (2500, wand4)  | of Blasting: Fire Blast (Fire 8); of Lightning: Lightning Bolt (Air 7); of Rocks: Rock Blast (Earth 8); of Paralyzing: Paralyze (Light 9); of Clouds: Jump (Air 8) per RPGC              |
| Mystic Wand (3000, wand5)  | of Implosion: Implosion (Air 9); of Distortion: Mass Distortion (Earth 11); of Shrapmetal: Shrapmetal (Dark 4); of Shrinking: Shrinking Ray (Dark 5); of Death: Finger of Death (Dark 7) |

Names, spells and values [RPGC; OY]; RPGC prints "Alacorn" for the
Blasting wand, the merged table "Arcane". A wand of Clouds casting Jump is
odd and unverified. Spell levels from the spell lists [RPGC spells].

Rules:

- Held in the hand like a weapon; every attack casts the spell at the
  target and spends one charge [SAS].
- The cast's skill and rank are fixed and high, whoever holds it [SAS];
  the numbers are unverified.
- Charges: unverified for MM6. MM7 rule: a wand from a monster or the map
  gets 1d6 + its +N charges, one from a chest 10 to 30 [OE].
- An empty wand vanished in the original; GrayFace's patch keeps it as a
  broken wand [GF-P]. MM6 has no recharging, and shops pay the same for a
  wand on its last charge as for a full one (player reports, [GOG]).
- Two hand-placed wands, one carried by a boss and one in a secret cache,
  come with no charges at all [GOG].

### 2.6 Spell scrolls and spellbooks (99 each)

One scroll and one book exist for each of the 99 spells [OY]: 11 levels
in each of Fire, Air, Water, Earth, Spirit, Mind, Body, Light and Dark.

| Spell level            | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    | 9    | 10   | 11    |
| ---------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ----- |
| Scroll, seven schools  | 10   | 20   | 30   | 40   | 50   | 75   | 100  | 150  | 200  | 300  | 500   |
| Scroll, Light and Dark | 100  | 150  | 200  | 250  | 300  | 350  | 400  | 500  | 600  | 750  | 1000  |
| Book, seven schools    | 100  | 200  | 300  | 400  | 500  | 750  | 1000 | 1500 | 2000 | 3000 | 5000  |
| Book, Light and Dark   | 1000 | 1500 | 2000 | 2500 | 3000 | 3500 | 4000 | 5000 | 6000 | 7500 | 10000 |

Values [RPGC; MPIKE]. A shop or guild charges a multiple of these
(6.3, 6.6).

| School | Spells, levels 1 to 11                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fire   | Torch Light, Flame Arrow, Protection from Fire, Fire Bolt, Haste, Fireball, Ring of Fire, Fire Blast, Meteor Shower, Inferno, Incinerate                 |
| Air    | Wizard Eye, Static Charge, Protection from Electricity, Sparks, Feather Fall, Shield, Lightning Bolt, Jump, Implosion, Fly, Starburst                    |
| Water  | Awaken, Cold Beam, Protection from Cold, Poison Spray, Water Walk, Ice Bolt, Enchant Item, Acid Burst, Town Portal, Ice Blast, Lloyd's Beacon            |
| Earth  | Stun, Magic Arrow, Protection from Magic, Deadly Swarm, Stone Skin, Blades, Stone to Flesh, Rock Blast, Turn to Stone, Death Blossom, Mass Distortion    |
| Spirit | Spirit Arrow, Bless, Healing Touch, Lucky Day, Remove Curse, Guardian Angel, Heroism, Turn Undead, Raise Dead, Shared Life, Resurrection                 |
| Mind   | Meditation, Remove Fear, Mind Blast, Precision, Cure Paralysis, Charm, Mass Fear, Feeblemind, Cure Insanity, Psychic Shock, Telekinesis                  |
| Body   | Cure Weakness, First Aid, Protection from Poison, Harm, Cure Wounds, Cure Poison, Speed, Cure Disease, Power, Flying Fist, Power Cure                    |
| Light  | Create Food, Golden Touch, Dispel Magic, Slow, Destroy Undead, Day of the Gods, Prismatic Light, Hour of Power, Paralyze, Sun Ray, Divine Intervention   |
| Dark   | Reanimate, Toxic Cloud, Mass Curse, Shrapmetal, Shrinking Ray, Day of Protection, Finger of Death, Moon Ray, Dragon Breath, Armageddon, Dark Containment |

Spell names and order [RPGC spells; OY] (RPGC repeats Torch Light at
Water 5, where the merged table has Water Walk).

- **Scroll.** Used on a member; casts its spell once, choosing a target if
  the spell needs one (cancel allowed), then disappears [TXT-USE]. The
  skill and rank it casts at are unverified; players report that Fly and
  Water Walk scrolls drain the reader's spell points and that a Lloyd's
  Beacon scroll uses the reader's Water skill [GOG]. Original bugs not to
  copy: inactive members could read scrolls, and some scrolls never ran
  out in turn-based mode [GF-P].
- **Book.** Used on a member who has the school's skill: teaches the
  spell; nothing happens if the spell is already known [TXT-USE]. That
  the book is then used up is unverified. The project's guild teaches on purchase instead
  (`buySpellbook`): deviates.
- **Icons.** Four scroll icons by spell level (levels 1–2, 3–4, 5–7,
  8–11) and five book icons (1–2, 3–4, 5–6, 7–8, 9–11) in the merged table
  [OY]; whether vanilla MM6 shares them the same way is unverified.
  Screenshot-19 shows two scrolls and a book in the pack.

### 2.7 Herbs, bottle and potions (29)

Poppysnaps 2, Phirna Root 3, Widoweeps Berries 4, Potion Bottle 5; red,
blue and yellow potions 10; orange, green and purple 25; white 50; black
100 [RPGC; MPIKE]. MM6 numbers them 160 to 188 in this order: three
herbs, the bottle, then Cure Wounds, Magic Potion, Energy, Protection,
Resistance, Cure Poison, eight whites and eleven blacks [TXT-USE]. Icons:
three herb icons and nine bottle icons, one per colour plus the empty
bottle; all whites share one icon and all blacks another [OY]. Effects
and mixing are in section 7.

### 2.8 Gold

Gold is a party counter. Gold on the ground or in a chest is an item with
the amount stored on the copy [MMX `structs.Item`], drawn with one of
three icons, small, medium and large [OY]. Picking it up adds it to the
party's gold, less the hirelings' share (6.4). Amounts by treasure level
are in 4.5.

### 2.9 Artifacts and relics (30)

Fifteen artifacts and fifteen relics, each existing once per game (3.6
lists them with their powers). Before identification they read
"Artifact" (value 20,000, difficulty 15) or "Relic" (value 30,000,
difficulty 20) [MMW]. All but two reuse the icon of their base kind's top
item; Apollo and Zeus have their own [OY].

### 2.10 Quest and other items (about 140)

These are content, but the item system must carry them:

- **Souvenirs sold to one buyer for a fixed sum** [MMW]: Temple Gong 2000,
  Bone 1000, Golden Pyramid 1000, Tooth 500, Amber 500, Keg of Wine 300,
  Cobra Egg 300, Four-Leaf Clover 25, Harpy Feather 10, Lodestone 5; the
  Magic Lamp buys gems. Several are Circus prizes [MMW].
- **Used on a member**: Magic Horseshoe, +2 skill points, found in stables
  [LP]; Deck of Fate (effect unverified); Flute (plays, no other use
  [SAS]); Crystal Skull, which shields its carrier from a late dungeon's
  radiation [SAS]; Horn of Ros, which shows enemies' wounds [MMW].
- **Quest items**: about 40, among them the Hourglass of Time, Sacred
  Chalice, Third Eye, Ankh, Candelabra, five statuettes, Dragon Claw,
  Control Cube, Crystal of Terrax, two pearls, Tanir's Bell, Ethric's
  Skull, Chime of Harmony, Harp, Spider Queen's Heart, Cloak of Baa,
  Jeweled Egg, Fire Amulet, four memory crystals, Snergle's Axe and Lord
  Kilburn's Shield [MMW; OY].
- **Keys**: about 30 named keys on six key icons [OY].
- **Message scrolls**: about 50 letters, journal pages and codes on one
  icon [OY]; read from the pack, some needed by quests [SAS].
- **Others**: Shovel, Lock Pick, Rope, Apple (picked from trees [LP]),
  three leather pouches, five maps; uses unverified.

Needed in code: a `misc` type with an optional use script, a value of 0
for unsellable items, and a quest flag. Whether MM6 forbids selling or
dropping quest items is unverified.

### 2.11 The project's 17 items against MM6

| Project id           | Project now                  | MM6 counterpart    | MM6                             | Change                      |
| -------------------- | ---------------------------- | ------------------ | ------------------------------- | --------------------------- |
| `dagger`             | 2d2, 15 g                    | Dagger             | 2d2, 8 g                        | value                       |
| `short-sword`        | 2d3, 30 g                    | none               | —                               | replace (Cutlass 2d4, 40 g) |
| `long-sword`         | 3d3, 50 g                    | Longsword          | 3d3, 50 g                       | none                        |
| `mace`               | 2d4, 50 g                    | Mace               | 2d4, 50 g                       | none                        |
| `axe`                | 3d2, 50 g                    | Hand Axe           | 4d2, 30 g                       | dice, value, name           |
| `spear`              | 1d9, 50 g, two-handed        | Spear              | 1d9, 15 g, one or two hands     | value, hands rule           |
| `staff`              | 2d4, 20 g                    | Staff              | 2d4, 40 g                       | value                       |
| `bow` (Long Bow)     | 3d3, 100 g                   | Longbow            | 5d2, 100 g                      | dice, name                  |
| `leather-armor`      | AC 4, 30 g                   | Leather Armor      | AC 4, 150 g                     | value                       |
| `chain-mail`         | AC 8, 150 g                  | Chain Mail         | AC 8, 400 g                     | value                       |
| `shield`             | AC 4, 40 g                   | Wooden Shield      | AC 4, 100 g                     | name, value                 |
| `helmet`             | AC 2, 30 g                   | Helm               | AC 2, 60 g                      | name, value                 |
| `boots`              | AC 2, 20 g                   | Leather Boots      | AC 2, 50 g                      | name, value                 |
| `copper-ring`        | 50 g                         | none               | cheapest ring: Fine Ring, 100 g | replace                     |
| `potion-healing`     | heals 10, 50 g               | Cure Wounds (red)  | heals 10, 10 g                  | name, value                 |
| `scroll-torch-light` | Torch Light at skill 1, 50 g | Torch Light scroll | 10 g; skill unverified          | value, footprint 2 × 1      |
| `scroll-fire-bolt`   | Fire Bolt at skill 4, 200 g  | Fire Bolt scroll   | 40 g; skill unverified          | value, footprint 2 × 1      |

Every weapon's `recoverySec` and armour's `recoveryPenaltySec` should move
to the family (2.1). The starting kit in `state.ts` (weapon, leather,
potion) would need these renamed ids; MM6's starting items are
unverified.

## 3. Enchantments, artifacts and relics

An item carries at most one standard bonus or one special enchantment,
never both (MM7 rule [OE]; MM6's record has a slot for each [MMX], so
"both" is possible in data but no source shows it). Artifacts and relics
carry fixed powers instead (3.6).

### 3.1 Standard bonuses (14)

Each adds +N to one value; N is the strength. Weapons never get one
[TXT-STD]. The numbers are the relative odds of each bonus on each slot
[TXT-STD]; a 0 means never.

| Bonus                  | Name                 | Armour | Shield | Helm | Belt | Cloak | Gauntlets | Boots | Ring | Amulet |
| ---------------------- | -------------------- | ------ | ------ | ---- | ---- | ----- | --------- | ----- | ---- | ------ |
| Might                  | of Might             | 5      | 0      | 10   | 10   | 10    | 10        | 5     | 10   | 10     |
| Intellect              | of Thought           | 5      | 0      | 10   | 10   | 10    | 10        | 5     | 10   | 10     |
| Personality            | of Charm             | 5      | 0      | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| Endurance              | of Vigor             | 5      | 0      | 10   | 10   | 10    | 10        | 5     | 10   | 10     |
| Accuracy               | of Precision         | 5      | 0      | 10   | 10   | 10    | 10        | 5     | 10   | 10     |
| Speed                  | of Speed             | 5      | 0      | 10   | 10   | 10    | 10        | 25    | 10   | 10     |
| Luck                   | of Luck              | 5      | 0      | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| Hit points             | of Health            | 10     | 5      | 5    | 0    | 10    | 5         | 10    | 10   | 10     |
| Spell points           | of Magic             | 10     | 5      | 10   | 0    | 10    | 10        | 10    | 10   | 10     |
| Armour class           | of Defense           | 20     | 20     | 10   | 0    | 10    | 10        | 5     | 10   | 10     |
| Fire resistance        | of Fire Resistance   | 10     | 10     | 5    | 0    | 10    | 15        | 5     | 10   | 10     |
| Electricity resistance | of Elec Resistance   | 10     | 10     | 5    | 0    | 10    | 15        | 5     | 10   | 10     |
| Cold resistance        | of Cold Resistance   | 10     | 10     | 5    | 0    | 10    | 15        | 5     | 10   | 10     |
| Poison resistance      | of Poison Resistance | 10     | 10     | 5    | 0    | 10    | 15        | 5     | 10   | 10     |
| Total                  |                      | 115    | 70     | 115  | 70   | 140   | 155       | 110   | 140  | 140    |

Strength by treasure level [TXT-STD]: level 1 none, level 2 1–5, level 3
3–8, level 4 6–12, level 5 10–17, level 6 15–25. Each point adds 100 gold
to the value [TXT-STD; MPIKE]. MM6 has five resistances (fire,
electricity, cold, poison, magic); no standard bonus raises magic
resistance. The project's spell buffs name MM7's six resistances
(`resistFire`, `resistAir`, `resistWater`, `resistEarth`, `resistMind`,
`resistBody` in `src/game/spells.ts`): deviates.

### 3.2 Special enchantments (59)

Effects in our own words; value is gold added (+) or the base value
multiplied (x); group sets the treasure levels (3.3) [TXT-SPC; MPIKE;
RPGC enchantments].

| #   | Enchantment     | Effect                                                                       | Value | Group |
| --- | --------------- | ---------------------------------------------------------------------------- | ----- | ----- |
| 1   | of Protection   | +10 to the four elemental resistances                                        | +1000 | B     |
| 2   | of the Gods     | +10 to all seven stats                                                       | +3000 | D     |
| 3   | of Carnage      | arrow bursts on impact over a fireball-sized area, dealing the weapon damage | +5000 | D     |
| 4   | of Cold         | +1d2+2 cold damage a hit (3-4)                                               | +500  | A     |
| 5   | of Frost        | +1d3+5 cold damage (6-8)                                                     | +1000 | C     |
| 6   | of Ice          | +1d4+8 cold damage (9-12)                                                    | +2000 | D     |
| 7   | of Sparks       | +1d4+1 electricity damage (2-5)                                              | +500  | A     |
| 8   | of Lightning    | +2d4+2 electricity damage (4-10)                                             | +1000 | C     |
| 9   | of Thunderbolts | +3d4+3 electricity damage (6-15)                                             | +2000 | D     |
| 10  | of Fire         | +1d6 fire damage (1-6)                                                       | +500  | A     |
| 11  | of Flame        | +2d6 fire damage (2-12)                                                      | +1000 | C     |
| 12  | of Infernos     | +3d6 fire damage (3-18)                                                      | +2000 | D     |
| 13  | of Poison       | +5 poison damage                                                             | +500  | A     |
| 14  | of Venom        | +8 poison damage                                                             | +1000 | C     |
| 15  | of Acid         | +12 poison damage                                                            | +2000 | D     |
| 16  | Vampiric        | wielder regains 20 % of the damage dealt                                     | x2    | D     |
| 17  | of Recovery     | shorter recovery after being hit (see 3.4)                                   | +200  | B     |
| 18  | of Immunity     | immune to disease                                                            | +1000 | C     |
| 19  | of Sanity       | immune to insanity                                                           | +1000 | C     |
| 20  | of Freedom      | immune to paralysis                                                          | +2000 | D     |
| 21  | of Antidotes    | immune to the poisoned condition                                             | +1000 | C     |
| 22  | of Alarms       | immune to sleep                                                              | +500  | B     |
| 23  | of the Medusa   | immune to stoning                                                            | +2000 | D     |
| 24  | of Force        | knockback ten times stronger                                                 | +500  | A     |
| 25  | of Power        | +5 to character level                                                        | +2500 | D     |
| 26  | of Air Magic    | Air spells 50 % stronger and longer                                          | +2000 | D     |
| 27  | of Body Magic   | Body spells 50 % stronger and longer                                         | +2000 | D     |
| 28  | of Dark Magic   | Dark spells 50 % stronger and longer                                         | +2000 | D     |
| 29  | of Earth Magic  | Earth spells 50 % stronger and longer                                        | +2000 | D     |
| 30  | of Fire Magic   | Fire spells 50 % stronger and longer                                         | +2000 | D     |
| 31  | of Light Magic  | Light spells 50 % stronger and longer                                        | +2000 | D     |
| 32  | of Mind Magic   | Mind spells 50 % stronger and longer                                         | +2000 | D     |
| 33  | of Spirit Magic | Spirit spells 50 % stronger and longer                                       | +2000 | D     |
| 34  | of Water Magic  | Water spells 50 % stronger and longer                                        | +2000 | D     |
| 35  | of Thievery     | doubles the Disarm Trap chance                                               | +2000 | B     |
| 36  | of Shielding    | halves damage from missiles; two such items do not stack                     | +1000 | B     |
| 37  | of Regeneration | regenerates hit points over time                                             | +1000 | B     |
| 38  | of Mana         | regenerates spell points over time                                           | +1000 | B     |
| 39  | Demon Slayer    | double damage against demons                                                 | x2    | A     |
| 40  | Dragon Slayer   | double damage against dragons                                                | x2    | A     |
| 41  | of Darkness     | Vampiric and Swiftness together                                              | x3    | D     |
| 42  | of Doom         | +1 to the seven stats, HP, SP, AC and the four resistances                   | +750  | B     |
| 43  | of Earth        | +10 Endurance, AC and HP                                                     | +2000 | D     |
| 44  | of Life         | +10 HP and hit point regeneration                                            | +2000 | D     |
| 45  | Rogues          | +5 Speed and Accuracy                                                        | +500  | A     |
| 46  | of the Dragon   | +10d2 fire damage and +25 Might                                              | +3000 | D     |
| 47  | of the Eclipse  | +10 SP and spell point regeneration                                          | +2000 | D     |
| 48  | of the Golem    | +15 Endurance and +5 AC                                                      | +1500 | C     |
| 49  | of the Moon     | +10 Intellect and Luck                                                       | +1000 | C     |
| 50  | of the Phoenix  | +30 fire resistance and hit point regeneration                               | +3000 | D     |
| 51  | of the Sky      | +10 SP, Speed and Intellect                                                  | +2500 | D     |
| 52  | of the Stars    | +10 Endurance and Accuracy                                                   | +1000 | C     |
| 53  | of the Sun      | +10 Might and Personality                                                    | +1000 | C     |
| 54  | of the Troll    | +15 Endurance and hit point regeneration                                     | +1500 | C     |
| 55  | of the Unicorn  | +15 Luck and spell point regeneration                                        | +1500 | C     |
| 56  | Warriors        | +5 Might and Endurance                                                       | +500  | A     |
| 57  | Wizards         | +5 Intellect and Personality                                                 | +500  | A     |
| 58  | Antique         | value ten times; no other effect                                             | x10   | B     |
| 59  | of Swiftness    | weapon recovery 20 shorter                                                   | x2    | B     |

Relative odds per slot [TXT-SPC] ("." means never). 1H and 2H are the
table's two weapon columns, read as one- and two-handed weapons; Bow is
its missile column.

| Enchantment     | 1H  | 2H  | Bow | Armour | Shield | Helm | Belt | Cloak | Gauntlets | Boots | Ring | Amulet |
| --------------- | --- | --- | --- | ------ | ------ | ---- | ---- | ----- | --------- | ----- | ---- | ------ |
| of Protection   | .   | .   | .   | 10     | 10     | 10   | .    | 10    | .         | .     | 10   | 10     |
| of the Gods     | 5   | 5   | 5   | 10     | 10     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| of Carnage      | .   | .   | 10  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Cold         | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Frost        | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Ice          | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Sparks       | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Lightning    | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Thunderbolts | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Fire         | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Flame        | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Infernos     | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Poison       | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Venom        | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Acid         | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| Vampiric        | 5   | 5   | 5   | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Recovery     | 10  | 10  | 10  | 20     | .      | 20   | 10   | .     | .         | 20    | 10   | 10     |
| of Immunity     | .   | .   | .   | 10     | 10     | 10   | 10   | 10    | .         | .     | 10   | 10     |
| of Sanity       | .   | .   | .   | 5      | 5      | 5    | 5    | 5     | .         | .     | 5    | 5      |
| of Freedom      | .   | .   | .   | 10     | 10     | 10   | 10   | 10    | .         | .     | 10   | 10     |
| of Antidotes    | .   | .   | .   | 10     | 10     | 10   | 10   | 10    | .         | .     | 10   | 10     |
| of Alarms       | .   | .   | .   | 10     | 10     | 10   | 10   | 10    | .         | .     | 10   | 10     |
| of the Medusa   | .   | .   | .   | 5      | 5      | 5    | 5    | 5     | .         | .     | 5    | 5      |
| of Force        | 10  | 10  | 10  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Power        | 2   | 2   | 2   | 2      | 2      | 2    | 2    | 2     | 2         | 2     | 2    | 2      |
| of Air Magic    | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Body Magic   | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Dark Magic   | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Earth Magic  | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Fire Magic   | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Light Magic  | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Mind Magic   | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Spirit Magic | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Water Magic  | .   | .   | .   | .      | .      | .    | .    | .     | .         | .     | 10   | 10     |
| of Thievery     | .   | .   | .   | .      | .      | .    | .    | .     | 20        | .     | .    | .      |
| of Shielding    | .   | .   | .   | 25     | 30     | .    | .    | 20    | .         | .     | 5    | 5      |
| of Regeneration | .   | .   | .   | 10     | .      | .    | 10   | 10    | .         | .     | 10   | 10     |
| of Mana         | .   | .   | .   | 10     | .      | 10   | 10   | 10    | 10        | .     | 10   | 10     |
| Demon Slayer    | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| Dragon Slayer   | 20  | 20  | 20  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Darkness     | 5   | 5   | 5   | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of Doom         | 10  | 10  | 10  | 10     | 10     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| of Earth        | 10  | 10  | 10  | 10     | 10     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| of Life         | .   | .   | .   | 10     | 10     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| Rogues          | 10  | 10  | 10  | 5      | 5      | 5    | 10   | 20    | 20        | 20    | 10   | 10     |
| of the Dragon   | 10  | 10  | 10  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| of the Eclipse  | .   | .   | .   | .      | .      | .    | 10   | 10    | 5         | 10    | 10   | 10     |
| of the Golem    | 5   | 5   | 5   | 20     | 20     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| of the Moon     | 5   | 5   | 5   | 10     | 10     | 20   | 10   | 10    | 10        | 10    | 10   | 10     |
| of the Phoenix  | .   | .   | .   | 20     | 20     | 20   | .    | .     | .         | .     | .    | .      |
| of the Sky      | 5   | 5   | 5   | 10     | 10     | 20   | 10   | 10    | 10        | 10    | 10   | 10     |
| of the Stars    | 5   | 5   | 5   | 10     | 10     | 10   | 10   | 20    | 20        | 10    | 10   | 10     |
| of the Sun      | 5   | 5   | 5   | 10     | 10     | 10   | 10   | 20    | 20        | 10    | 10   | 10     |
| of the Troll    | 5   | 5   | 5   | 20     | 20     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| of the Unicorn  | 5   | 5   | 5   | 10     | 10     | 20   | 10   | 10    | 10        | 10    | 10   | 10     |
| Warriors        | 5   | 5   | 5   | 10     | 10     | 10   | 10   | 10    | 10        | 10    | 10   | 10     |
| Wizards         | 5   | 5   | 5   | 5      | 5      | 5    | 10   | 10    | 10        | 10    | 10   | 10     |
| Antique         | 10  | 10  | 10  | 10     | 10     | 10   | .    | .     | 10        | .     | 10   | 10     |
| of Swiftness    | 25  | 25  | 25  | .      | .      | .    | .    | .     | .         | .     | .    | .      |
| Total           | 437 | 437 | 447 | 307    | 272    | 282  | 232  | 282   | 217       | 182   | 347  | 347    |

### 3.3 Level groups

| Group | Treasure levels |
| ----- | --------------- |
| A     | 3 and 4         |
| B     | 3, 4 and 5      |
| C     | 4 and 5         |
| D     | 5 and 6         |

So a level-3 item draws from A and B, level 4 from A, B and C, level 5
from B, C and D, and level 6 from D only. Items of levels 1 and 2 never
get a special enchantment [TXT-SPC]. The project's random source must pick
among the enchantments allowed for the slot and the level, weighted by the
table in 3.2 (MM7 rule [OE]).

### 3.4 Effects in play

- **Elemental damage** (Cold to Acid, the Dragon, artifacts): extra damage
  of that element on every hit. In the original it ignored the monster's
  resistance, a bug GrayFace's patch fixes [GF-P]. [CHI] reports that the
  electricity enchantments and "of the Dragon" actually deal energy
  damage; unverified. The damage dice: Cold 1d2+2, Frost 1d3+5, Ice 1d4+8,
  Sparks 1d4+1, Lightning 2d4+2, Thunderbolts 3d4+3, Fire 1d6, Flame 2d6,
  Infernos 3d6, the Dragon 10d2 [MPIKE], matching the ranges in
  [TXT-SPC].
- **Vampiric, Darkness**: the wielder gains 20 % of the physical damage of
  the blow, from both hands if both weapons have it, but not from the
  killing blow [GF-M].
- **Swiftness, Darkness**: weapon recovery 20 shorter. With two weapons
  (as patched, 1.2) only the weapon that sets the recovery counts: the
  slower one, or the main hand when equal [GF-M].
- **of Recovery**: meant to speed recovery after being hit (the design
  note says 10 points less [TXT-SPC]; GrayFace says 1.5 times faster);
  rounding made it do nothing in the original, and the patch gives 10 %
  [GF-M; GF-P]. Decision 11.3.
- **of Force**: knockback ten times stronger [TXT-SPC]. The project
  already knocks a struck monster back 0.45 m (DESIGN 14.4), so Force can
  scale that.
- **of Carnage**: bows only; the arrow bursts on impact over a fireball's
  area for the weapon's damage [TXT-SPC]; [CHI] says it is physical and
  spares the party.
- **Demon Slayer, Dragon Slayer**: double damage to the family. Monsters
  need a demon and a dragon flag.
- **of Shielding**: halves damage from missile attacks; a second such item
  adds nothing [TXT-SPC].
- **Regeneration** (of Regeneration, Life, Troll, Phoenix) and **mana
  regeneration** (of Mana, Eclipse, Unicorn): 1 hit point or spell point
  every 5 minutes [MPIKE; CHI]; the design note says "while walking"
  [TXT-SPC]. Real-time rate unverified. Hades drains instead (3.6).
- **Immunities**: the condition cannot be set (disease, insanity,
  paralysis, poisoned, sleep, stoned). Whether "disease" covers all three
  disease levels is unverified; the design note says the disease
  condition [TXT-SPC].
- **of Thievery**: doubles the Disarm Trap chance [RPGC]; the design note
  mentions lockpicking and stealing too [TXT-SPC], but MM6 has no theft
  skill [GF-P].
- **of Power**: +5 to level. Which level-based values it reaches (hit
  points, spell points, to-hit) is unverified.
- **of X Magic**: the school's spells work as if 50 % stronger and last 50
  % longer [TXT-SPC]; RPGC words it as +50 % to the skill. Rings and
  amulets only.
- **Antique**: value ×10, nothing else.
- Stat, HP, SP, AC and resistance bonuses add to the "bonus" part of the
  value, shown apart from the base on the sheet (MM6-GAPS section 3 asks
  for the base and bonus split).

### 3.5 Where enchantments come from

- Random generation (section 4), including shop stock (6.2).
- The Water spell Enchant Item: 10 % success per point of Water skill;
  Normal makes weak enchantments only, Expert stronger ones, Master also
  enchants weapons [RPGC spells]. Which strength each rank gives is
  unverified.
- Artifacts and relics, fixed (3.6).
- Related spell: Golden Touch (Light 2) turns an item into 40, 60 or 80 %
  of its value in gold by rank, succeeding 10 % per skill point; a failure
  breaks the item [RPGC spells].

### 3.6 Artifacts and relics

Relics give large bonuses with a drawback; artifacts give bonuses only
[DOB; MMW]. One of each exists per game; the party record keeps which
were found [MMX `Party.ArtifactsFound`].

| Name      | Class    | Base kind           | Damage or AC | Powers                                                 | Drawback                                |
| --------- | -------- | ------------------- | ------------ | ------------------------------------------------------ | --------------------------------------- |
| Mordred   | artifact | long dagger         | 2d3+8        | Vampiric                                               | none                                    |
| Thor      | artifact | hammer (Mace)       | 2d5+12       | of Force                                               | none ([CHI] adds +20 Might)             |
| Conan     | artifact | poleax (Axe)        | 3d7+10       | Demon and Dragon Slayer                                | none ([CHI] adds +20 Might)             |
| Excalibur | artifact | broadsword          | 3d4+12       | +30 Might                                              | none                                    |
| Merlin    | artifact | staff               | 2d4+8        | Swiftness, +40 SP                                      | none                                    |
| Percival  | artifact | longbow             | 5d2+10       | Swiftness, Carnage                                     | none                                    |
| Galahad   | artifact | chain armour        | 38 (36)      | of Protection, +25 HP                                  | none                                    |
| Pellinore | artifact | plate armour        | 56 (46)      | +30 Endurance, of Recovery, hit point regeneration     | none                                    |
| Valeria   | artifact | small shield        | 20           | Shielding, +30 Accuracy                                | none                                    |
| Pendragon | artifact | cloak               | 11           | +30 Luck, Thievery, immune to poison                   | none                                    |
| Lucius    | artifact | boots               | 14           | +30 Speed                                              | none                                    |
| Arthur    | artifact | crown ([RPGC] helm) | 5            | of the Gods, +25 SP                                    | none                                    |
| Guinevere | artifact | ring                | 2            | +30 SP, of Light Magic, of Dark Magic                  | none                                    |
| Igraine   | artifact | ring                | 2            | +25 SP, of Spirit, Mind and Body Magic                 | none                                    |
| Morgan    | artifact | amulet              | 3            | +20 SP ([DOB] 40), of Fire, Air, Water and Earth Magic | none                                    |
| Hades     | relic    | longsword           | 3d3+15       | +20 poison damage, +20 Luck, Thievery                  | loses hit points over time              |
| Ares      | relic    | mace                | 2d4+14       | +30 fire damage, +25 fire resistance                   | none listed; [DOB] doubts it is a relic |
| Poseidon  | relic    | trident             | 2d6+15       | +20 Might, Endurance and Accuracy                      | −10 AC, −10 Speed                       |
| Cronos    | relic    | axe                 | 4d2+14       | +100 HP                                                | −50 Luck                                |
| Hercules  | relic    | two-handed sword    | 4d5+12       | +50 Might, +20 Endurance                               | −30 Intellect ([DOB] −50)               |
| Artemis   | relic    | longbow             | 5d2+12       | +20 electricity damage                                 | −10 to resistances                      |
| Apollo    | relic    | chain armour        | 46 (44)      | +20 resistances, +20 Luck                              | −30 Endurance                           |
| Zeus      | relic    | plate armour        | 64 (54)      | +50 HP, +50 SP, +50 Luck                               | −50 Intellect                           |
| Aegis     | relic    | large shield        | 29           | immune to stoning, Shielding, +20 Luck                 | −20 Speed                               |
| Atlas     | relic    | cloak               | 16           | +100 Might                                             | −40 Speed                               |
| Hermes    | relic    | boots               | 17           | +100 Speed                                             | −40 Accuracy ([DOB] −40 Might)          |
| Odin      | relic    | crown (helmet slot) | 10           | +50 resistances                                        | −40 Speed                               |
| Aphrodite | relic    | ring                | 4            | +100 Personality                                       | −40 Luck                                |
| Athena    | relic    | ring ([DOB] amulet) | 4            | +100 Intellect                                         | −40 Might                               |
| Hera      | relic    | amulet              | 6            | +50 HP, +50 SP, +50 Luck                               | −50 Personality ([MPIKE] −50 Intellect) |

Sources: [RPGC weapons and armor; MPIKE; DOB; MMW; CHI]. Bracketed armour
figures are [MMW]'s, which add each piece's bonus to too small a base for
the four body armours; the others agree on 38, 56, 46 and 64 (DOB gives
Galahad 36 too). The weapon damage includes the +N, which also adds to
attack [DOB].

Where they are found: mostly from level-6 or artifact placeholders in
Paradise Valley, Hermit's Isle and Dragonsand; Excalibur in Eel Infested
Waters, drawn only by a member with over 200 Might; Mordred in Dragoons'
Keep; Guinevere, Igraine and Morgan in the obelisk treasure with the
books of Divine Intervention and Dark Containment and 250,000 gold [DOB;
GF-P].

## 4. Treasure generation

### 4.1 Treasure levels

Every random item and gold pile is made at a treasure level from 1 to 6;
level 7 means "an artifact". The level is set by whatever places the
treasure:

| Source                     | Levels                                | Reference                  |
| -------------------------- | ------------------------------------- | -------------------------- |
| Item spawn points on a map | 1–6 regular item, 7 artifact          | [MMX `structs.SpawnPoint`] |
| Random entries in chests   | 1–6, 7 artifact (MM7 rule)            | [OE `Chest.cpp`]           |
| Monster treasure           | 1–6 per monster kind (4.9)            | [TXT-MON]                  |
| Shop stock                 | 1–5 regular and special lists (6.5)   | [TXT-HOUSE]                |
| Scripted gifts             | strength 1–6, a type, or a fixed item | [MMX `evt.GiveItem`]       |

### 4.2 Making one random item

MM7 rule [OE `ItemTable::generateItem`], with MM6's tables where they
exist:

1. At level 6, when any kind may come, a 5 % chance of an artifact the
   party has not found yet; it is marked found.
2. Otherwise pick a kind: each kind's weight is its `chanceByLevel` at
   this level; a request may narrow the choice to a type (ring, armour)
   or a skill family (bow, axe) (4.9).
3. A kind with difficulty above 0 starts unidentified; difficulty 0 (the
   club) starts identified.
4. Weapons: roll a special enchantment with the weapon chance for the
   level (4.3).
5. Armour, shields, helms, belts, cloaks, gauntlets, boots, rings and
   amulets: roll d100. Under the standard chance: a standard bonus, chosen
   by the slot's odds (3.1), with a strength from the level's range (4.4).
   Otherwise, under standard plus special: a special enchantment from the
   groups allowed at the level (3.3), by the slot's odds (3.2).
6. Wands get charges (2.5).

**MM6's weights are not public.** No source found prints the
`chanceByLevel` column of MM6's item table. What is known is each item's
lowest level ("Lvl" in 2.1 and 2.2 [CHI]), and that matches the shops
(6.5). Until the owner decides (11.1), use this rule (ours): an item whose
lowest level is L gets weight 10 at L, 7 at L + 1 and 3 at L + 2, and 0
elsewhere; items whose lowest level is 5 get 10 at 5 and 10 at 6.
Jewellery, hats, crowns and belts have no level in any source; give rings
and amulets their difficulty band (difficulty 2–6 level 1, 8–12 level 3,
14–20 level 5) and belts, hats and crowns level 1 to 4 by price (ours).
Wands, scrolls and books weigh far less than equipment (ours: 2 against
10).

### 4.3 Chance of an enchantment

| Treasure level               | 1   | 2   | 3   | 4   | 5   | 6   |
| ---------------------------- | --- | --- | --- | --- | --- | --- |
| Standard (armour, jewellery) | 0   | 40  | 40  | 40  | 40  | 75  |
| Special (armour, jewellery)  | 0   | 0   | 10  | 15  | 20  | 25  |
| Special (weapons)            | 0   | 0   | 10  | 20  | 30  | 50  |

Per cent, from the random-item table of the merged MM6/7/8 game [OY].
OpenEnroth reads the same three rows from MM7's table [OE], so the layout
is MM7's; whether MM7 and MM6 use these values is unverified. They fit
MM6's own tables in that level 1 has no bonus strength [TXT-STD] and
specials start at level 3 [TXT-SPC].

### 4.4 Strength of a standard bonus

| Treasure level | 1    | 2   | 3   | 4    | 5     | 6     |
| -------------- | ---- | --- | --- | ---- | ----- | ----- |
| Strength       | none | 1–5 | 3–8 | 6–12 | 10–17 | 15–25 |

[TXT-STD]. Uniform within the range (MM7 rule [OE]).

### 4.5 Gold piles

| Treasure level | 1      | 2       | 3       | 4        | 5         | 6         |
| -------------- | ------ | ------- | ------- | -------- | --------- | --------- |
| Gold           | 50–100 | 100–200 | 200–500 | 500–1000 | 1000–2000 | 2000–5000 |
| Icon           | small  | small   | medium  | medium   | large     | large     |

MM7 rule [OE `Item::generateGold`]; unverified for MM6, which has the same
three gold icons [OY]. Gold found goes to the party: plus 10 % with a
Factor or a Pirate hireling and 20 % with a Banker, and each hireling
takes cost ÷ 100 per cent of it [RPGC hirelings]. Whether the bonuses
stack is unverified.

### 4.6 Artifacts

- 30 exist (3.6) [DOB]. Each appears at most once per game: the party
  keeps a found list [MMX].
- They come from artifact placeholders (level 7) and the 5 % roll at
  level 6 (MM7 rule). If every artifact has been found, the roll gives a
  normal level-6 item (ours).
- In the original, an artifact could be placed in a chest the party cannot
  reach, and it counted as found; GrayFace's patch removes artifacts in
  never-opened chests from the found list when the map refills [GF-P].
  Do as the patch does.

### 4.7 Chests

- **Kinds.** Eight chest pictures [MMX `structs.MapChest`], among them a
  wooden chest, a sack and a metal chest [OY]. Each has its own grid;
  vanilla sizes are unverified (the merged game uses 14 × 10 for all
  [OY]).
- **Contents.** Fixed items and random entries, placed by the map. MM7
  rule: when the chest is first opened, each random entry of level 1–6
  becomes 1 to 5 draws, each 20 % nothing, 40 % a gold pile of that level
  and 40 % an item of that level; level 7 becomes an artifact [OE].
  Items go into random free cells; GrayFace's patch places the most
  valuable first and keeps items that did not fit for a later visit
  [GF-P].
- **Traps.** A chest is trapped or not [MMX]. MM6's chests have traps but
  no locks [LP]. Each map gives one lock value (0–10) and one trap value
  (0–10) for all its chests (4.10). Disarming succeeds when 5 × lock <
  the member's Disarm Trap total + a random 0–9 [MMX `MapStatsItem`]. The
  total is skill × rank multiplier plus hireling bonuses (Burglar 8,
  Locksmith 6, Tinker 4 [RPGC hirelings]); how "of Thievery" (3.4)
  enters this test is unverified. A failure sets the trap off for trap × d20 damage
  [MMX]; Perception lets a member avoid it [RPGC skills; MMX reaction
  "AvoidDamage"]. In MM7 the blast is fire, electricity, cold or poison
  at random [OE]; MM6 unverified.
- **At range.** Telekinesis opens chests and pulls levers from afar
  [RPGC spells].
- **Refill.** Chests and items return when the map refills (4.10).

### 4.8 Items lying on the ground

Spawn points place items of level 1–6, or an artifact, on the ground
[MMX `structs.SpawnPoint`], each shown with its kind's ground sprite [MMX
`SpriteIndex`]. A tap picks it up into the active member's pack, or the
member shakes their head when there is no room [MMX reaction
"CantCarry"]. MM6 also lets the player throw a held item into the world;
unverified detail.

### 4.9 Monster treasure

Each monster kind carries gold dice, a chance of an item, the item's
level and its kind [TXT-MON; MMX `MonstersTxtItem`]. The kinds named are
bow, ring, amulet, misc, weapon, armour, mace, axe, sword, dagger, staff,
spear, shield, chain, leather, plate and cloak, or any kind when none is
named. Notes:

- Dragons, wyrms, hydras and two titans give a level with no chance; the
  default is unverified, and it should be "always" (ours).
- Animals, elementals, devils, sea monsters and the robots carry nothing;
  peasants carry gold only. Players notice the same [LP].
- The gold goes to the party when the body is searched; the item to the
  pack. Searching a body by tapping it is unverified detail.

| Monsters (ranks A / B / C)                             | Levels        | Treasure (gold dice; item chance, level, kind)                                       |
| ------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------ |
| Archer / Master Archer / Fire Archer                   | 9 / 19 / 29   | 3d20 gold, 5% L1 bow / 6d20 gold, 5% L2 bow / 10d20 gold, 10% L3 bow                 |
| Magyar / Magyar Soldier / Magyar Matron                | 14 / 25 / 37  | 5d10 gold, 5% L2 misc / 10d10 gold, 5% L3 misc / 20d10 gold, 10% L4 misc             |
| Bat / Giant Bat / Vampire Bat                          | 3 / 6 / 9     | none / 5% L1 ring / 5% L2 ring                                                       |
| Flying Eye / Terrible Eye / Maddening Eye              | 30 / 40 / 50  | 10% L4 ring / 20% L5 ring / 30% L6 ring                                              |
| Blood Sucker / Brain Sucker / Soul Sucker              | 2 / 4 / 8     | none / 5% L1 ring / 5% L2 ring                                                       |
| Acolyte of Baa / Cleric of Baa / Priest of Baa         | 8 / 15 / 25   | 5d10 gold, 5% L1 mace / 10d10 gold, 5% L2 mace / 20d10 gold, 10% L3 misc             |
| Cobra / King Cobra / Queen Cobra                       | 5 / 10 / 14   | 5% L1 misc / 5% L2 misc / 10% L3 misc                                                |
| Agar's Pet / Agar's Monster / Agar's Abomination       | 13 / 15 / 17  | 4d20 gold / 6d20 gold / 10d20 gold                                                   |
| Devil Captain / Devil Master / Devil King              | 30 / 50 / 70  | none / none / none                                                                   |
| Devil Spawn / Devil Worker / Devil Warrior             | 20 / 40 / 60  | none / none / none                                                                   |
| Fire Lizard / Lightning Lizard / Thunder Lizard        | 40 / 50 / 60  | 100d10 gold, 20% L4 any / 150d10 gold, 20% L5 any / 200d10 gold, 20% L5 any          |
| Flame Drake / Frost Drake / Energy Drake               | 24 / 28 / 32  | 30d10 gold, 10% L3 any / 60d10 gold, 10% L4 any / 100d10 gold, 20% L5 any            |
| Wyrm / Giant Wyrm / Great Wyrm                         | 50 / 60 / 70  | 100d10 gold, L5 any (no %) / 150d10 gold, L5 any (no %) / 200d10 gold, L6 any (no %) |
| Red Dragon / Blue Dragon / Gold Dragon                 | 80 / 90 / 100 | 250d10 gold, L6 any (no %) / 300d10 gold, L6 any (no %) / 400d10 gold, L6 any (no %) |
| Druid / Great Druid / Grand Druid                      | 10 / 16 / 28  | 10d10 gold, 5% L1 misc / 20d10 gold, 10% L2 misc / 50d10 gold, 20% L3 misc           |
| Dwarf / Dwarf Warrior / Dwarf Lord                     | 10 / 20 / 30  | 5d10 gold, 5% L1 any / 10d10 gold, 10% L2 axe / 20d10 gold, 25% L3 axe               |
| Dust Devil / Twister / Air Elemental                   | 16 / 22 / 33  | none / none / none                                                                   |
| Rock Beast / Earth Spirit / Earth Elemental            | 25 / 30 / 40  | 10d20 gold / 15d20 gold / 30d20 gold                                                 |
| Fire Beast / Fire Spirit / Fire Elemental              | 13 / 26 / 39  | none / none / none                                                                   |
| Water Beast / Water Spirit / Water Elemental           | 14 / 24 / 36  | none / none / none                                                                   |
| Fighter / Soldier / Veteran                            | 14 / 24 / 35  | 10d10 gold, 5% L1 chain / 20d10 gold, 5% L2 chain / 30d10 gold, 10% L3 chain         |
| Thug / Ruffian / Brigand                               | 8 / 14 / 22   | 3d20 gold, 5% L1 leather / 5d20 gold, 5% L2 leather / 10d20 gold, 10% L3 leather     |
| Stone Gargoyle / Marble Gargoyle / Diamond Gargoyle    | 16 / 22 / 33  | 5d10 gold, 5% L2 amulet / 10d10 gold, 10% L2 amulet / 25d10 gold, 20% L3 amulet      |
| Genie / Djinn / Efreet                                 | 33 / 44 / 55  | 30% L4 any / 30% L5 any / 30% L6 any                                                 |
| Ghost / Evil Spirit / Specter                          | 9 / 13 / 19   | 5% L2 ring / 10% L3 ring / 20% L4 ring                                               |
| Goblin / Goblin Shaman / Goblin King                   | 4 / 6 / 10    | 4d4 gold / 8d4 gold / 15d4 gold, 10% L1 any                                          |
| Guard / Lieutenant / Captain                           | 11 / 19 / 33  | 3d20 gold, 5% L1 armour / 5d20 gold, 5% L2 armour / 10d20 gold, 10% L3 armour        |
| Harpy / Harpy Hag / Harpy Witch                        | 14 / 17 / 19  | 4d10 gold / 6d10 gold / 10d10 gold, 20% L2 ring                                      |
| Hydra / Venomous Hydra / Colossal Hydra                | 45 / 55 / 65  | 50d10 gold, L3 any (no %) / 100d10 gold, L4 any (no %) / 200d10 gold, L5 any (no %)  |
| Defender of VARN / Sentinel of VARN / Guardian of VARN | 35 / 55 / 65  | 100d10 gold / 150d10 gold / 200d10 gold                                              |
| Death Knight / Doom Knight / Cuisinart                 | 40 / 60 / 80  | 10d100 gold, 10% L4 plate / 20d100 gold, 10% L5 plate / 40d100 gold, 30% L6 plate    |
| Lich / Greater Lich / Power Lich                       | 20 / 30 / 40  | 10d20 gold, 10% L3 misc / 15d20 gold, 10% L4 misc / 30d20 gold, 30% L5 misc          |
| Lizard Man / Lizard Archer / Lizard Wizard             | 4 / 7 / 11    | 4d8 gold, 5% L1 bow / 6d8 gold, 5% L1 bow / 10d8 gold, 5% L2 bow                     |
| Medusa / Medusa Enchantress / Gorgon                   | 35 / 40 / 45  | 10d20 gold, 10% L3 misc / 15d20 gold, 10% L4 misc / 30d20 gold, 30% L5 misc          |
| Peasant / Peasant / Peasant                            | 4 / 5 / 6     | 5d20 gold / 7d20 gold / 10d20 gold                                                   |
| Minotaur / Minotaur Mage / Minotaur King               | 39 / 59 / 79  | 10d20 gold, 10% L4 axe / 20d20 gold, 10% L5 axe / 50d20 gold, 20% L6 axe             |
| Novice Monk / Initiate Monk / Master Monk              | 8 / 16 / 27   | 5% L1 amulet / 5% L2 amulet / 10% L3 amulet                                          |
| Swordsman / Expert Swordsman / Master Swordsman        | 10 / 17 / 24  | 10d10 gold, 5% L1 sword / 15d10 gold, 5% L2 sword / 30d10 gold, 10% L3 sword         |
| Ooze / Acidic Ooze / Corrosive Ooze                    | 12 / 18 / 25  | 5% L2 any / 5% L3 any / 5% L4 any                                                    |
| Ogre / Ogre Raider / Ogre Chieftain                    | 15 / 20 / 28  | 10d10 gold, 5% L1 weapon / 20d10 gold, 5% L2 weapon / 30d10 gold, 5% L3 weapon       |
| Peasant / Peasant / Peasant                            | 1 / 2 / 3     | 2d6 gold / 3d6 gold / 4d6 gold                                                       |
| Peasant / Peasant / Peasant                            | 1 / 2 / 3     | 2d6 gold / 3d6 gold / 4d6 gold                                                       |
| Cutpurse / Bounty Hunter / Assassin                    | 3 / 5 / 7     | 3d6 gold, 10% L1 dagger / 5d6 gold, 20% L1 dagger / 10d6 gold, 50% L2 dagger         |
| Cannibal / Head Hunter / Witch Doctor                  | 6 / 8 / 10    | 2d6 gold, 5% L1 shield / 4d6 gold, 10% L1 shield / 6d6 gold, 5% L1 amulet            |
| Peasant / Peasant / Peasant                            | 1 / 2 / 3     | 3d3 gold / 4d4 gold / 8d8 gold                                                       |
| Apprentice Mage / Journeyman Mage / Mage               | 2 / 6 / 10    | 2d6 gold, 5% L1 staff / 5d6 gold, 5% L1 staff / 10d6 gold, 10% L1 misc               |
| Follower of Baa / Mystic of Baa / Fanatic of Baa       | 3 / 5 / 7     | 2d6 gold / 3d6 gold, 5% L1 staff / 4d6 gold, 5% L2 staff                             |
| Cannibal / Head Hunter / Witch Doctor                  | 6 / 8 / 10    | 2d6 gold, 5% L1 spear / 4d6 gold, 10% L1 spear / 6d6 gold, 5% L2 ring                |
| Common Rat / Large Rat / Giant Rat                     | 2 / 4 / 6     | 2% L1 ring / 2% L1 ring / 2% L1 ring                                                 |
| Patrol Unit / Enforcer Unit / Terminator Unit          | 50 / 70 / 90  | none / none / none                                                                   |
| Sea Serpent / Sea Monster / Sea Terror                 | 28 / 36 / 48  | none / none / none                                                                   |
| Skeleton / Skeleton Knight / Skeleton Lord             | 6 / 10 / 14   | 4d6 gold / 7d6 gold / 10d6 gold, 5% L2 sword                                         |
| Sorcerer / Magician / Warlock                          | 25 / 35 / 50  | 10d10 gold, 10% L2 staff / 20d10 gold, 10% L3 staff / 40d10 gold, 20% L5 staff       |
| Spider / Giant Spider / Huge Spider                    | 5 / 8 / 12    | none / none / none                                                                   |
| Thief / Burglar / Rogue                                | 8 / 12 / 18   | 3d10 gold, 5% L1 any / 4d10 gold, 10% L1 any / 5d10 gold, 20% L2 cloak               |
| Titan / Noble Titan / Supreme Titan                    | 65 / 75 / 95  | 200d10 gold, 40% L5 any / 300d10 gold, L5 any (no %) / 400d10 gold, L6 any (no %)    |
| Wolfman / Werewolf / Greater Werewolf                  | 20 / 30 / 40  | 5d20 gold, 10% L3 misc / 10d20 gold, 10% L4 misc / 20d20 gold, 10% L5 misc           |
| Demon Queen                                            | 100           | none                                                                                 |
| Reactor                                                | 100           | none                                                                                 |

### 4.10 Maps: refill, locks and traps

| Map                        | File        | Refill (days) | Lock (×5) | Trap (d20s) |
| -------------------------- | ----------- | ------------- | --------- | ----------- |
| Sweet Water                | OutA1.Odm   | 224           | 8         | 9           |
| Paradise Valley            | OutA2.Odm   | 168           | 7         | 8           |
| Hermit's Isle              | OutA3.Odm   | 168           | 7         | 8           |
| Kriegspire                 | OutB1.Odm   | 224           | 6         | 8           |
| Blackshire                 | OutB2.Odm   | 672           | 6         | 8           |
| Dragonsand                 | OutB3.Odm   | 168           | 8         | 10          |
| Frozen Highlands           | OutC1.Odm   | 672           | 4         | 6           |
| Free Haven                 | OutC2.Odm   | 672           | 4         | 6           |
| Mire of the Damned         | OutC3.Odm   | 168           | 3         | 7           |
| Silver Cove                | OutD1.Odm   | 672           | 4         | 5           |
| Bootleg Bay                | OutD2.Odm   | 224           | 3         | 2           |
| Castle Ironfist            | OutD3.Odm   | 672           | 2         | 3           |
| Eel Infested Waters        | OutE1.Odm   | 224           | 5         | 6           |
| Misty Islands              | OutE2.Odm   | 672           | 2         | 2           |
| New Sorpigal               | OutE3.Odm   | 168           | 0         | 1           |
| Goblinwatch                | D01.Blv     | 672           | 0         | 1           |
| Abandoned Temple           | D02.Blv     | 672           | 1         | 1           |
| Shadow Guild Hideout       | D03.Blv     | 672           | 2         | 2           |
| Hall of the Fire Lord      | D04.Blv     | 672           | 2         | 2           |
| Snergle's Caverns          | D05.Blv     | 672           | 3         | 3           |
| Dragoons' Caverns          | D06.Blv     | 672           | 2         | 3           |
| Silver Helm Outpost        | D07.Blv     | 672           | 3         | 3           |
| Shadow Guild               | D08.Blv     | 672           | 4         | 3           |
| Snergle's Iron Mines       | D09.Blv     | 672           | 3         | 3           |
| Dragoons' Keep             | D10.Blv     | 672           | 3         | 3           |
| Corlagon's Estate          | D11.Blv     | 672           | 4         | 4           |
| Silver Helm Stronghold     | D12.Blv     | 672           | 3         | 4           |
| The Monolith               | D13.Blv     | 672           | 3         | 5           |
| Tomb of Ethric the Mad     | D14.Blv     | 672           | 4         | 5           |
| Icewind Keep               | D15.Blv     | 672           | 4         | 5           |
| Warlord's Fortress         | D16.Blv     | 672           | 5         | 6           |
| Lair of the Wolf           | D17.Blv     | 672           | 5         | 6           |
| Gharik's Forge             | D18.Blv     | 672           | 7         | 8           |
| Agar's Laboratory          | D19.Blv     | 672           | 5         | 9           |
| Caves of the Dragon Riders | D20.Blv     | 672           | 6         | 10          |
| Temple of Baa              | T1.Blv      | 672           | 2         | 1           |
| Temple of the Fist         | T2.Blv      | 672           | 2         | 1           |
| Temple of Tsantsa          | T3.Blv      | 672           | 2         | 1           |
| Temple of the Sun          | T4.Blv      | 672           | 3         | 2           |
| Temple of the Moon         | T5.Blv      | 672           | 3         | 2           |
| Supreme Temple of Baa      | T6.Blv      | 672           | 4         | 4           |
| Superior Temple of Baa     | T7.Blv      | 672           | 4         | 4           |
| Temple of the Snake        | T8.Blv      | 672           | 5         | 5           |
| Castle Alamos              | CD1.Blv     | 672           | 5         | 5           |
| Castle Darkmoor            | CD2.Blv     | 672           | 5         | 5           |
| Castle Kriegspire          | CD3.Blv     | 672           | 6         | 6           |
| Free Haven Sewer           | Sewer.Blv   | 672           | 4         | 2           |
| Tomb of VARN               | Pyramid.blv | 672           | 8         | 8           |
| Oracle of Enroth           | Oracle.Blv  | 672           | 0         | 0           |
| Control Center             | Sci-Fi.Blv  | 672           | 5         | 8           |
| The Hive                   | Hive.Blv    | 7             | 10        | 10          |
| The Arena                  | zarena.blv  | 1             | 1         | 1           |
| Dragon's Lair              | zddb01.blv  | 672           | 1         | 1           |
| Devil Outpost              | zdwj02.blv  | 672           | 1         | 1           |
| New World Computing        | znwc.blv    | 7             | 1         | 1           |

[TXT-MAP]. The table's treasure column (a 0 to 6 scale) reads 6 for every
map. MM7 remaps item levels by the map's treasure value [OE
`RemapTreasureLevel`], and its column for the top value leaves every level
unchanged, so MM6 needs no remapping. A year has 336 days: outdoor maps
refill after 6 months, 8 months or 2 years, dungeons after 2 years, the
Hive and the NWC dungeon weekly and the Arena daily.

### 4.11 Treasure by kind of place

MM6 sets treasure per placement, not per region, so "the random item table
for a place" is the sum of what its maps, chests and monsters name:

- **First areas** (New Sorpigal, Goblinwatch, the Abandoned Temple): lock
  0–1, trap 1; goblins, rats, thieves and apprentice mages with level 1
  drops; shops of level 1 and 2 [TXT-MAP; TXT-MON; TXT-HOUSE].
- **Middle** (Castle Ironfist, Mist, Free Haven, Silver Cove and their
  dungeons): lock 2–5, trap 2–6; level 2–4 drops; shops of level 2–4.
- **Late** (Paradise Valley, Hermit's Isle, Dragonsand, Sweet Water, the
  Hive, the Tomb of VARN): lock 7–10, trap 8–10; level 5–6 drops, dragons
  and titans; the random artifacts [DOB].

### 4.12 Fixed rewards

Quests and scripts give fixed items, random items of a strength and type,
or gold [MMX `evt.GiveItem`]. The best known is the obelisk treasure
(3.6). The project's `grantReward` already hands fixed items to whoever
has room; it needs random items by strength.

## 5. Identify, repair, breaking and theft

### 5.1 One difficulty per item

Each kind has one difficulty, 0 to 20, used both to identify and to
repair it (`IdRepSt` [MMX]; values in 2.1 to 2.3 [MMW]). Artifacts are 15,
relics 20, blasters 20, crowns 12 to 16, the top rings 20. Potions, herbs,
scrolls, books and wands: unverified (ours: 0, identified).

### 5.2 Identify

- A member identifies an item by inspecting it (right click in MM6; a
  long press here) when Identify Item skill × rank multiplier (Normal 1,
  Expert 2, Master 3) ≥ the difficulty (MM7 rule [OE]; RPGC gives the
  multipliers). MM6 evidence: Master 7 gives 21, which covers relics'
  20, and players report that more than 7 at Master is wasted [CH]; a
  player with Expert 4 (8) found that little below the artifacts was out
  of reach [LP].
- A Scholar hireling identifies everything [RPGC hirelings].
- A shop identifies items of its own type for a fee (6.3); the general
  store does not identify [TXT-HOUSE].
- The member reacts: a useless find, a great find, or a failure [MMX
  reactions "IdentifyUseless", "IdentifyGreat", "IdentifyFail"].
- Unidentified items show their generic name (1.1). GrayFace's patch tints
  unidentified items green while the button is held [GF-P]; a small mark
  serves on a phone (ours).
- Project: `identified` exists but nothing sets it false; the shop
  identifies for a flat fee; no skill check. Partial.

### 5.3 Repair

- Same check with Repair Item [OE; RPGC]. A Smith hireling repairs any
  weapon, an Armorer any armour, an Alchemist any other item [RPGC
  hirelings].
- A shop repairs items of its own type for a fee (6.3).
- Reactions: repaired, failed [MMX].
- Project: shop repair only, at a share of value. Partial.

### 5.4 Breaking

- **Monster blows.** A monster with a break attack tries it on a blow with
  chance level × multiplier per cent [GF-M]. The member resists with
  chance 1 − 30 ÷ (30 + Luck effect + item strength) [GF-M]. MM7 rule for
  the item's strength: 3 × (rarity + its +N) [OE]. The item is a random
  unbroken one from the pack for "any item", a worn armour or shield for
  "armour", a worn weapon for "weapon" [OE]. The monsters are in the
  table below.
- **Potion explosions** break one, five or all items (7.2) [TXT-USE].
- **Deep wounds.** MM7 breaks the worn body armour when a member falls to
  −10 hit points or below [OE]; MM6 unverified.
- **A broken item** gives no bonus while worn and sells for 1 gold (MM7
  rule [OE]). The project halves the sale price: deviates.

| Break attack | Monsters [TXT-MON]                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any item     | Goblin King; Lightning and Thunder Lizard; Energy Drake; Blue and Gold Dragon; Air, Fire and Water Elemental; Colossal Hydra; Patrol and Enforcer Unit; Titan and Noble Titan; Acidic and Corrosive Ooze (×2) |
| Armour       | Dwarf Lord (×2), Earth Spirit, Captain                                                                                                                                                                        |
| Weapon       | Veteran, Master Swordsman, Guardian of VARN                                                                                                                                                                   |

### 5.5 Theft

- Cutpurse, Bounty Hunter, Thief, Burglar and Rogue steal, with
  multiplier 2 [TXT-MON]. The member resists with their Accuracy effect
  in place of the item's strength [GF-M].
- MM7 rule: the thief takes one random item from the pack and holds it
  (two slots) [OE]. In the original MM6 a stolen item was lost even if the
  thief died; GrayFace's patch drops it with the body [GF-P]. Do as the
  patch does (ours).
- No monster is known to steal gold (MM6-GAPS section 9).

### 5.6 The inspect view

MM6 shows, on a stone panel, the name, type, damage or armour, the
description and the value (screenshot-20); unidentified items show their
generic name; enchantments appear in the name and the description.
Charges show on wands. The project shows a browser `title`: Missing.

## 6. Shops, prices and the bank

### 6.1 Kinds of shop

| Kind          | Sells                                             | Buys, identifies, repairs                          |
| ------------- | ------------------------------------------------- | -------------------------------------------------- |
| Weapon shop   | weapons of set families and levels                | weapons only                                       |
| Armour shop   | body armour, shields, helms or gauntlets          | armour only                                        |
| Magic shop    | "misc": everything that is not a weapon or armour | misc only                                          |
| General store | level-1 items, empty bottles, herbs               | buys anything at half value; no identify or repair |

[TXT-HOUSE; MMW shop pages]. A shop refuses other goods with a "not my
trade" line [TXT-MERCH]. No shop buys blasters [GF-P]. Which types fall
under "misc" (rings, amulets, wands, scrolls, books, potions, gems, belts,
cloaks, boots, hats) is unverified: the shop pages name scrolls and
amulets [MMW], the armour shops sell no boots, cloaks or belts, and a
general store's empty slot becomes random boots or gauntlets [MMX
`GeneralStoreItemKind`]. Proposal (ours): magic shops carry rings,
amulets, belts, cloaks, boots, hats, crowns, wands, scrolls, books,
potions and herbs.

The project: two shops with fixed lists, each buying anything: deviates.

### 6.2 Stock and restock

- Each shop has a **regular** list (the Buy choice) and a **special** list
  (the Special choice, screenshot-28), each a treasure level and up to
  four item families [TXT-HOUSE; MMX `ShopItemKind`].
- Both lists are generated together when the party opens Buy or Special
  after the restock time has passed; the next restock is that many days
  later (the house's restock column) (MM7 rule [OE `Shops.cpp`]; MM6 reads
  the same column [MMX `Events2DItem.C`]). A shop never restocks while
  unvisited. In-game, New Sorpigal's clerk speaks of shipments on
  Tuesdays [LP]; the table says every 2 days.
- Each slot draws one of the list's families at the list's level, through
  the generator of 4.2 (so stock can be enchanted), and stock is always
  identified [OE].
- Slots: a weapon shop shows 6 items (screenshot-29); MM7 shows 8 in an
  armour shop (4 body armour or shields above, 4 helms or gauntlets
  below) and 12 in a magic shop [OE]; MM6's counts beyond the weapon shop
  are unverified. MM6 generates special stock for general stores but
  cannot sell it [MMX].
- Opening hours per house (6.5); a closed shop turns the party away [MMX
  reaction "StoreClosed"].
- What the party sells stays out of the stock (unverified detail).

### 6.3 Prices

Each house has a factor, Val (1.5 to 4 for shops, 6.5). MM7 rules [OE
`PriceCalculator.cpp`], where M is the Merchant percentage:

| Price         | Formula                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| Buy           | value × Val × (100 − M) ÷ 100, never below the value                          |
| Sell          | value ÷ (Val + 2) + value × M ÷ 100, at least 1, at most the value; broken 1  |
| Identify      | 50 × Val × (100 − M) ÷ 100, never below a third of 50 × Val                   |
| Repair        | value ÷ (6 − Val) × (100 − M) ÷ 100, never below a third of value ÷ (6 − Val) |
| Spellbook     | as Buy, at the guild's Val (6.6)                                              |
| General store | pays half the value for anything [TXT-HOUSE]                                  |

M = rank multiplier (1, 2, 3) × Merchant skill + 7 − reputation, at most
100; with no Merchant skill, M = −reputation (MM7 rule). MM7 counts low
reputation as good; MM6's reputation runs the other way (positive is
respectable, MPIKE), so the reputation term in MM6 is unverified. Until
reputation exists, M = multiplier × skill + 7, or 0 without the skill
(ours).

**Why MM7's formulas.** The same house factor drives MM7's tavern and
transport prices [OE `Tavern.cpp`, `PriceCalculator.cpp`], and those
reproduce MM6's numbers:

| House (Val)                 | MM7 rule            | Result   | MM6 shows                             |
| --------------------------- | ------------------- | -------- | ------------------------------------- |
| A Lonely Knight, tavern (6) | room = Val² ÷ 10    | 3 gold   | Rent Room 3 gold (screenshot-27)      |
| A Lonely Knight (6)         | food = Val³ ÷ 100   | 2 gold   | fill packs for 2 gold (screenshot-27) |
| A Lonely Knight (6)         | packs filled to Val | 6 days   | "to 6 days" (screenshot-27)           |
| New Sorpigal coach (1)      | 25 × Val            | 25 gold  | 25 gold [MPIKE]                       |
| Odyssey boat (2)            | 50 × Val            | 100 gold | 100 gold [MPIKE]                      |

Against: a player reports Master Merchant 14 selling at full value almost
everywhere [CH]; under the MM7 rule that needs hireling bonuses on top
(14 + 14 at Master gives M = 91). Unresolved. The same tavern rule gives
the inn's prices that MM6-GAPS section 19 asks for.

Example, a Longsword (value 50) at The Knife Shoppe (Val 1.5):

| Merchant  | M   | Buy | Sell | Identify | Repair |
| --------- | --- | --- | ---- | -------- | ------ |
| none      | 0   | 75  | 14   | 75       | 11     |
| Expert 4  | 15  | 63  | 21   | 63       | 9      |
| Master 10 | 37  | 50  | 32   | 47       | 6      |

The project's formulas (`services.ts`): buy = value × markup × (1 − m);
sell = ½ value × (1 + m), capped at value, halved if broken; flat
identify; repair a share of value; m = 2 % per point of Merchant bonus up
to 50 %. All deviate.

### 6.4 Merchant and the hirelings

- Merchant skill: Normal, Expert double, Master triple [RPGC skills].
- Hireling bonuses to Merchant: Merchant +6, Trader +4, Negotiator +4
  (and Diplomacy +4), Duper +8 (reputation down one category), Gypsy +3
  (reputation down one category, less food at rest) [RPGC hirelings].
- Gold found: Banker +20 %, Factor +10 %, Pirate +10 % (reputation down);
  every hireling takes cost ÷ 100 per cent of the gold found [RPGC
  hirelings].
- Repair and identify: Smith, Armorer, Alchemist, Scholar (5.2, 5.3).

### 6.5 The 47 shops

From MM6's house table [TXT-HOUSE]; region by map code; towns as named on
the shop pages [MMW]: Bootleg Bay's town is Harecksburg, Frozen
Highlands' White Cap and Hargraeve, Mire of the Damned's Darkmoor,
Paradise Valley's Edenbrook, Eel Infested Waters' Castle Alamos.
"Helm or gauntlets" is one family (a slot draws either).

| #   | Type    | Shop                            | Region              | Val | Regular stock                                        | Special stock                          | Restock (days) | Hours |
| --- | ------- | ------------------------------- | ------------------- | --- | ---------------------------------------------------- | -------------------------------------- | -------------- | ----- |
| 1   | weapon  | The Knife Shoppe                | New Sorpigal        | 1.5 | L1: any weapon                                       | L2: dagger                             | 2              | 6–18  |
| 2   | weapon  | Hammer and Tongs                | Bootleg Bay         | 1.5 | L2: any weapon                                       | L2: mace                               | 2              | 6–18  |
| 3   | weapon  | Fine Blades                     | Castle Ironfist     | 2   | L1: sword, dagger                                    | L2: sword, dagger                      | 5              | 6–18  |
| 4   | weapon  | The Eagle's Eye                 | Castle Ironfist     | 2   | L1: bow                                              | L2: bow                                | 5              | 6–18  |
| 5   | weapon  | Arm's Length Spear Shop         | Misty Islands       | 2   | L1: staff, spear, halberd, trident                   | L2: staff, spear, halberd, trident     | 5              | 6–18  |
| 6   | weapon  | Blunt Trauma Weapons            | Mire of the Damned  | 2   | L1: mace, axe, hammer, club                          | L2: mace, axe, hammer, club            | 5              | 6–18  |
| 7   | weapon  | The Sharpening Stone            | Free Haven          | 2.5 | L2: sword, dagger                                    | L3: sword, dagger                      | 14             | 6–18  |
| 8   | weapon  | Feathers and String             | Free Haven          | 2.5 | L2: bow                                              | L3: bow                                | 14             | 6–18  |
| 9   | weapon  | Haft and Handle Pole arms       | Frozen Highlands    | 2.5 | L2: staff, spear, halberd, trident                   | L3: staff, spear, halberd, trident     | 14             | 6–18  |
| 10  | weapon  | Abdul's Discount Weapons        | Silver Cove         | 2.5 | L2: mace, axe, hammer, club                          | L3: mace, axe, hammer, club            | 14             | 6–18  |
| 11  | weapon  | Singing Steel                   | Paradise Valley     | 3   | L2: sword, dagger                                    | L4: sword, dagger                      | 28             | 6–18  |
| 12  | weapon  | Mark and Missile                | Frozen Highlands    | 3   | L2: bow                                              | L4: bow                                | 21             | 6–18  |
| 13  | weapon  | Stout Heart Staff and Spear     | Blackshire          | 3   | L2: staff, spear, halberd, trident                   | L4: staff, spear, halberd, trident     | 21             | 6–18  |
| 14  | weapon  | Knight's Paradise               | Kriegspire          | 3   | L2: mace, axe, hammer, club                          | L4: mace, axe, hammer, club            | 21             | 6–18  |
| 15  | armour  | The Common Defense              | New Sorpigal        | 1.5 | L1: leather, chain, shield, helm or gauntlets        | L2: leather, shield, helm or gauntlets | 2              | 6–18  |
| 16  | armour  | Armor Emporium                  | Misty Islands       | 1.5 | L2: leather, chain, shield, helm or gauntlets        | L3: leather, shield, helm or gauntlets | 2              | 6–18  |
| 17  | armour  | Metalweave Armory               | Castle Ironfist     | 2   | L2: leather, chain, shield, helm or gauntlets        | L3: leather, helm or gauntlets         | 5              | 6–18  |
| 18  | armour  | Abraham's Metalworks            | Bootleg Bay         | 2   | L2: leather, chain, shield, helm or gauntlets        | L3: chain, helm or gauntlets           | 5              | 6–18  |
| 19  | armour  | Mailed fist Armory              | Mire of the Damned  | 2   | L2: leather, chain, shield, helm or gauntlets        | L3: shield, helm or gauntlets          | 5              | 6–18  |
| 20  | armour  | The Foundry                     | Free Haven          | 2   | L2: leather, chain, shield, helm or gauntlets        | L3: plate, helm or gauntlets           | 5              | 6–18  |
| 21  | armour  | Iron Defense                    | Castle Ironfist     | 2.5 | L3: leather, chain, shield, plate, helm or gauntlets | L4: leather, helm or gauntlets         | 14             | 6–18  |
| 22  | armour  | Abdul's Discount Armor          | Silver Cove         | 2.5 | L3: leather, chain, shield, plate, helm or gauntlets | L4: chain, helm or gauntlets           | 14             | 6–18  |
| 23  | armour  | Quality Armor                   | Frozen Highlands    | 2.5 | L3: leather, chain, shield, plate, helm or gauntlets | L4: shield, helm or gauntlets          | 14             | 6–18  |
| 24  | armour  | Mail and Greaves                | Blackshire          | 2.5 | L3: leather, chain, shield, plate, helm or gauntlets | L4: plate, helm or gauntlets           | 14             | 6–18  |
| 25  | armour  | The Footman's Friend            | Free Haven          | 3   | L3: leather, chain, shield, plate, helm or gauntlets | L4: leather, helm or gauntlets         | 21             | 6–18  |
| 26  | armour  | Armorworks                      | Kriegspire          | 3   | L3: leather, chain, shield, plate, helm or gauntlets | L4: chain, helm or gauntlets           | 21             | 6–18  |
| 27  | armour  | Silver Lining Armor & Shield    | Frozen Highlands    | 3   | L3: leather, chain, shield, plate, helm or gauntlets | L4: shield, helm or gauntlets          | 21             | 6–18  |
| 28  | armour  | The Enchanted Hauberk           | Paradise Valley     | 3   | L4: leather, chain, shield, plate, helm or gauntlets | L5: plate, helm or gauntlets           | 28             | 6–18  |
| 29  | magic   | The Seeing Eye                  | New Sorpigal        | 1.5 | L1: misc                                             | L2: misc                               | 2              | 8–16  |
| 30  | magic   | Witch's Brew                    | Misty Islands       | 1.5 | L1: misc                                             | L2: misc                               | 2              | 8–16  |
| 31  | magic   | The Little Magic Shop           | Bootleg Bay         | 1.5 | L1: misc                                             | L2: misc                               | 3              | 8–16  |
| 32  | magic   | Abdul's Discount Magic Supplies | Silver Cove         | 1.5 | L1: misc                                             | L2: misc                               | 3              | 8–16  |
| 33  | magic   | Eye of Newt                     | Castle Ironfist     | 2   | L2: misc                                             | L3: misc                               | 7              | 8–16  |
| 34  | magic   | Smoke and Mirrors               | Mire of the Damned  | 2   | L2: misc                                             | L3: misc                               | 7              | 8–16  |
| 35  | magic   | Apples, Thorns, and Potions     | Frozen Highlands    | 2   | L2: misc                                             | L3: misc                               | 7              | 8–16  |
| 36  | magic   | Unusual Enchantments            | Kriegspire          | 3   | L3: misc                                             | L3: misc                               | 14             | 8–16  |
| 37  | magic   | The Sorcerer's Shoppe           | Free Haven          | 3   | L3: misc                                             | L4: misc                               | 14             | 8–16  |
| 38  | magic   | Ty's Trinkets                   | Blackshire          | 3   | L3: misc                                             | L4: misc                               | 14             | 8–16  |
| 39  | magic   | Alchemy and Incantations        | Free Haven          | 4   | L4: misc                                             | L4: misc                               | 21             | 8–16  |
| 40  | magic   | Little Charms                   | Eel Infested Waters | 4   | L4: misc                                             | L5: misc                               | 21             | 8–16  |
| 41  | magic   | Mighty Magicks                  | Paradise Valley     | 4   | L5: misc                                             | L5: misc                               | 28             | 8–16  |
| 42  | general | Traveler's Supply               | New Sorpigal        | 2   | L1: items, bottles, herbs                            | —                                      | 1              | 5–22  |
| 43  | general | Lock, Stock, and Barrel         | Misty Islands       | 2   | L1: items, bottles, herbs                            | —                                      | 1              | 5–22  |
| 44  | general | Trader Joe's                    | Silver Cove         | 2   | L1: items, bottles, herbs                            | —                                      | 1              | 5–22  |
| 45  | general | Abdul's Discount Goods          | Free Haven          | 2   | L1: items, bottles, herbs                            | —                                      | 1              | 5–22  |
| 46  | general | General Store                   | Frozen Highlands    | 2   | L1: items, bottles, herbs                            | —                                      | 1              | 5–22  |
| 47  | general | Outland Trading Post            | Blackshire          | 2   | L1: items, bottles, herbs                            | —                                      | 1              | 5–22  |

Pattern: the factor, the levels and the restock period rise together.
Val 1.5 shops sell level 1–2 with specials of level 2–3 and restock
every 2–3 days; Val 2 shops the same levels, every 5–7 days; Val 2.5 and
3 shops level 2–4 with specials of level 3–5, every 14–28 days; the three
Val 4 magic shops level 4–5, every 21–28 days. General stores are Val 2,
level 1, restocked daily. Weapon shops above Val 1.5 keep to one group:
bows; swords and daggers; staves and polearms; or maces, axes, hammers
and clubs. No shop sells level 6.

### 6.6 Guild bookshops

Guilds sell spellbooks of their school up to a spell level; members only
(membership is the guild document's subject). MM7 rule: the stock is a
random selection of those books, renewed on the restock period; MM6 keeps
guild stock and a refill time per guild [MMX `GuildItems`,
`GuildNextRefill`]. Price = the book's value (2.6) × the guild's Val
(MM7 rule [OE]), so a level-1 Fire book costs 200 at the Initiate Guild
of Fire.

| #   | Guild                          | Region           | Val | Books sold             | Also teaches | Restock (days) | Hours |
| --- | ------------------------------ | ---------------- | --- | ---------------------- | ------------ | -------------- | ----- |
| 119 | Initiate Guild of Fire         | Misty Islands    | 2   | Fire, spells 1-7       | Learning     | 2              | 6–18  |
| 120 | Adept Guild of Fire            | Free Haven       | 3   | Fire, spells 1-11      | Learning     | 2              | 6–18  |
| 121 | Initiate Guild of Air          | Misty Islands    | 2   | Air, spells 1-7        | Learning     | 2              | 6–18  |
| 122 | Adept Guild of Air             | Free Haven       | 3   | Air, spells 1-11       | Learning     | 2              | 6–18  |
| 123 | Initiate Guild of Water        | Misty Islands    | 2   | Water, spells 1-7      | Learning     | 2              | 6–18  |
| 124 | Adept Guild of Water           | Free Haven       | 3   | Water, spells 1-11     | Learning     | 2              | 6–18  |
| 125 | Initiate Guild of Earth        | Silver Cove      | 2   | Earth, spells 1-7      | Learning     | 2              | 6–18  |
| 126 | Adept Guild of Earth           | Free Haven       | 3   | Earth, spells 1-11     | Learning     | 2              | 6–18  |
| 127 | Initiate Guild of Spirit       | Castle Ironfist  | 2   | Spirit, spells 1-7     | Meditation   | 2              | 6–18  |
| 128 | Adept Guild of Spirit          | Free Haven       | 3   | Spirit, spells 1-11    | Meditation   | 2              | 6–18  |
| 129 | Initiate Guild of Mind         | Castle Ironfist  | 2   | Mind, spells 1-7       | Meditation   | 2              | 6–18  |
| 130 | Adept Guild of Mind            | Free Haven       | 3   | Mind, spells 1-11      | Meditation   | 2              | 6–18  |
| 131 | Initiate Guild of Body         | Castle Ironfist  | 2   | Body, spells 1-7       | Meditation   | 2              | 6–18  |
| 132 | Adept Guild of Body            | Free Haven       | 3   | Body, spells 1-11      | Meditation   | 2              | 6–18  |
| 133 | Initiate Guild of Light        | Silver Cove      | 3   | Light, spells 1-6      | —            | 2              | 10–14 |
| 134 | Adept Guild of Light           | Blackshire       | 4   | Light, spells 1-10     | —            | 2              | 10–14 |
| 135 | Initiate Guild of Dark         | Frozen Highlands | 3   | Dark, spells 1-6       | —            | 2              | 22–2  |
| 136 | Adept Guild of Dark            | Blackshire       | 4   | Dark, spells 1-10      | —            | 2              | 22–2  |
| 137 | Initiate Guild of the Elements | New Sorpigal     | 1.5 | F, A, W, E, spells 1-4 | —            | 2              | 6–18  |
| 138 | Adept Guild of the Elements    | Frozen Highlands | 2.5 | F, A, W, E, spells 1-8 | —            | 2              | 6–18  |
| 139 | Initiate Guild of the Self     | New Sorpigal     | 1.5 | S, M, B, spells 1-4    | —            | 2              | 6–18  |
| 140 | Adept Guild of the Self        | Silver Cove      | 2.5 | S, M, B, spells 1-8    | —            | 2              | 6–18  |

[TXT-HOUSE]. "F, A, W, E" are the four elements and "S, M, B" Spirit,
Mind and Body. Each guild also teaches its schools and the skill under
"Also teaches". The
project's `SPELLBOOK_PRICES` (50 to 10,000 by level, × guild multiplier)
differs from MM6's book values (100 to 5,000, and 1,000 to 10,000 for
Light and Dark): deviates.

### 6.7 What the shopkeeper says

Six message kinds per action (buy, sell, repair, identify): not enough
gold; three tones by the member's Merchant skill (none, some, good), each
quoting the usual and the actual price; wrong kind of shop; and nothing
to do (already identified, not broken) [TXT-MERCH]. The member also
reacts with a face and voice: bought, sold, identified, repaired, wrong
shop, a rude refusal [MMX reactions]. Write our own lines in the same
six slots.

### 6.8 The bank

- Six banks: Savings House (New Sorpigal), The Reserves (Mist), The First
  Bank of Enroth (Silver Cove), Foreign Exchange (Free Haven), Secure
  Trust (White Cap), The Depository (Blackshire); open 9 to 17
  [TXT-HOUSE; MMW].
- Deposit and withdraw; one balance shared by all banks [MMW]; the party
  record keeps it apart from the gold carried [MMX `Party.BankGold`].
- Interest: none in any source (unverified). What a dead party keeps:
  unverified (MM6-GAPS section 11).
- The project has no bank: Missing.

### 6.9 Against the code

| MM6                                              | Project                                 | Status               |
| ------------------------------------------------ | --------------------------------------- | -------------------- |
| 47 shops of four kinds, each buying its own kind | 2 shops buying anything                 | Present but deviates |
| Regular and special lists, restock by days       | fixed lists, no restock, no Special     | Missing              |
| Prices from Val and Merchant (6.3)               | markup, flat identify, repair share     | Present but deviates |
| Opening hours                                    | none                                    | Missing              |
| General store                                    | none                                    | Missing              |
| Guild books as items, priced value × Val         | buying teaches at once, own price table | Present but deviates |
| Bank                                             | none                                    | Missing              |

## 7. Potions and alchemy

### 7.1 What exists

Three herbs, the empty bottle and 25 potions (2.7). MM6 has no Alchemy
skill: any member can mix anything [MMW potions]. Shops: general stores
sell herbs and bottles [TXT-HOUSE]; whether magic shops sell potions is
unverified.

### 7.2 Making and mixing

Everything happens in the pack: pick up one item and use it on another
[SAS; TXT-USE].

- Herb on an empty bottle: Widoweeps Berries make Cure Wounds (red),
  Phirna Root Magic Potion (blue), Poppysnaps Energy (yellow); the herb is
  used up [TXT-USE].
- Potion on potion: the result of the table below, or an explosion, or
  nothing.
- After drinking, the design table turns the potion into an empty bottle
  [TXT-USE]; unverified in play. Whether mixing gives back a bottle is
  unverified.

Recipes [TXT-USE; RPGC recipes; MMW potions agree]:

| Result                 | Colour | Mix                         |
| ---------------------- | ------ | --------------------------- |
| Cure Poison            | purple | red + blue                  |
| Protection             | orange | red + yellow                |
| Resistance             | green  | blue + yellow               |
| Heroism                | white  | red + orange                |
| Stone Skin             | white  | blue + orange               |
| Super Resistance       | white  | blue + green                |
| Bless                  | white  | blue + purple               |
| Extreme Energy         | white  | yellow + orange             |
| Haste                  | white  | yellow + green              |
| Supreme Protection     | white  | orange + green              |
| Restoration            | white  | green + purple              |
| Essence of Might       | black  | red + Heroism               |
| Essence of Speed       | black  | red + Haste                 |
| Essence of Intellect   | black  | blue + Stone Skin           |
| Essence of Personality | black  | blue + Restoration          |
| Essence of Endurance   | black  | yellow + Supreme Protection |
| Essence of Accuracy    | black  | yellow + Bless              |
| Divine Cure            | black  | orange + Restoration        |
| Divine Magic           | black  | green + Super Resistance    |
| Rejuvenation           | black  | green + Extreme Energy      |
| Divine Power           | black  | purple + Extreme Energy     |
| Essence of Luck        | black  | purple + Super Resistance   |

The design table calls the essences "Pure Might" and so on [TXT-USE]; the
game and the guides say "Essence of Might" [RPGC; MMW; OY].

Every other pair, by tier [TXT-USE]:

| Pair                                         | Outcome                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| two of the six colours, not a recipe         | explosion E1 (red + green, red + purple, yellow + purple, orange + purple) |
| a colour + a white, not a recipe             | explosion E2 (37 pairs)                                                    |
| a colour + a black                           | explosion E3 (66 pairs)                                                    |
| a white + a black                            | explosion E4 (88 pairs)                                                    |
| two whites, two blacks, a potion with itself | nothing happens                                                            |
| a herb or the bottle with a potion           | nothing happens                                                            |

Explosions hurt the member who mixes and destroy both potions [TXT-USE]:

| Grade | Effect                                                      |
| ----- | ----------------------------------------------------------- |
| E1    | 10–20 fire damage                                           |
| E2    | 30–100 fire damage, and one random item in the pack breaks  |
| E3    | 50–250 fire damage, and five random items break             |
| E4    | the member is eradicated, and every item in the pack breaks |

The member reacts on a good mix and on an explosion [MMX reactions
"MixPotion", "PotionExplode"]. [SAS] describes the same scale from play.

### 7.3 Effects

| Potion                 | Effect when drunk [TXT-USE; RPGC; MMW]                                             | Duration               |
| ---------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| Cure Wounds            | +10 hit points                                                                     | instant                |
| Magic Potion           | +10 spell points                                                                   | instant                |
| Energy                 | temporary bonus of 10 to all seven stats                                           | unverified             |
| Protection             | temporary bonus of 10 to armour class                                              | unverified             |
| Resistance             | temporary bonus of 10 to the four elemental resistances                            | unverified             |
| Cure Poison            | cures all three levels of poison                                                   | instant                |
| Supreme Protection     | temporary bonus of 20 to armour class                                              | unverified             |
| Restoration            | cures every condition except dead, stoned and eradicated                           | instant                |
| Extreme Energy         | temporary bonus of 20 to all seven stats                                           | unverified             |
| Super Resistance       | temporary bonus of 20 to the four resistances                                      | unverified             |
| Heroism                | the Heroism spell                                                                  | 6 hours                |
| Haste                  | the Haste spell                                                                    | 6 hours                |
| Stone Skin             | the Stone Skin spell                                                               | 6 hours                |
| Bless                  | the Bless spell                                                                    | 6 hours                |
| Divine Power           | +20 to level; one year of magical aging                                            | level bonus unverified |
| Divine Cure            | +100 hit points, even past the maximum, if not already above it; one year of aging | instant                |
| Divine Magic           | +100 spell points on the same terms; one year of aging                             | instant                |
| Essence of Might       | +15 Might, −5 Intellect, for good                                                  | permanent, once        |
| Essence of Intellect   | +15 Intellect, −5 Might                                                            | permanent, once        |
| Essence of Personality | +15 Personality, −5 Speed                                                          | permanent, once        |
| Essence of Endurance   | +15 Endurance, −1 to each other stat                                               | permanent, once        |
| Essence of Accuracy    | +15 Accuracy, −5 Luck                                                              | permanent, once        |
| Essence of Speed       | +15 Speed, −5 Personality                                                          | permanent, once        |
| Essence of Luck        | +15 Luck, −5 Accuracy                                                              | permanent, once        |
| Rejuvenation           | removes all magical aging; −1 to all seven stats for good                          | permanent              |

- The design table "sets" the temporary bonus to 10 or 20 rather than
  adding one potion's bonus to another [TXT-USE].
- The strength at which a potion casts Heroism, Haste, Stone Skin and
  Bless is unverified.
- "Once": each essence works once per member; a second does nothing
  [TXT-USE; RPGC]. The original still used up the potion; GrayFace's patch
  keeps it [GF-P]. The design note skips a reduction when the stat is
  below 6 [TXT-USE]; unverified in play.
- Aging needs an age per member and a magical-aging part apart from the
  natural one (MM6-GAPS section 22).

### 7.4 Eating herbs

Poppysnaps poison the eater (poison level 1); Phirna Root gives 2 spell
points; Widoweeps Berries give 2 hit points [TXT-USE]. [SAS] says Phirna
Root poisons too, and [MPIKE] swaps the hit and spell points.

### 7.5 Against the code

The project has one potion (Potion of Healing, 10 hit points), no herbs,
bottles, mixing, temporary bonuses, permanent stats or aging; drinking
costs no recovery (whether MM6 charges one is unverified). Missing,
except the healing potion: Present.

## 8. What to build: the gap table

| Part                                                                                               | Project now                                   | Status               | Size                |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------- | ------------------- |
| Item record: types, families, per-kind fields (1.1, 1.2)                                           | 13 kinds, recovery per item                   | Present but deviates | M                   |
| Per-copy record: enchantment, charges, gold (1.4)                                                  | `{ id, identified, broken }`                  | Partial              | S                   |
| Catalogue: 65 weapons, 54 armour, 15 jewellery, 10 gems                                            | 17 items with other numbers                   | Partial              | M                   |
| Catalogue: 25 wands, 99 scrolls, 99 books, 29 alchemy items                                        | one potion, two scrolls                       | Partial              | S (data)            |
| Equip rules: off-hand dagger and sword, spear hands, wands                                         | shield only in the off hand; spear two-handed | Present but deviates | S                   |
| Worn bonuses in the sheet: stats, HP, SP, AC, resistances, skills, level, immunities, regeneration | none                                          | Missing              | M                   |
| Weapon enchantments in combat (3.4)                                                                | none                                          | Missing              | M                   |
| Random generation: levels, weights, chances, strength, gold (4.2–4.5)                              | none                                          | Missing              | M                   |
| Artifacts and relics (3.6, 4.6)                                                                    | none                                          | Missing              | S                   |
| Monster treasure and searching bodies (4.9)                                                        | kills pay experience only                     | Missing              | S                   |
| Items and gold on the ground, picking up (4.8)                                                     | none                                          | Missing              | M                   |
| Chests: random fill, traps, disarm, chest window (4.7)                                             | none                                          | Missing              | L                   |
| Identify and repair by skill; hirelings (5.2, 5.3)                                                 | shop only, flat fee                           | Partial              | S                   |
| Breaking and theft (5.4, 5.5)                                                                      | flag only                                     | Missing              | S                   |
| Inspect pop-up and item names (5.6, 1.4)                                                           | browser `title`                               | Missing              | S                   |
| Shops: 4 kinds, stock lists, restock, prices, hours (6)                                            | 2 shops, fixed lists, own formulas            | Present but deviates | M                   |
| Guild books as items, priced by Val (6.6)                                                          | buying teaches                                | Present but deviates | S                   |
| Bank (6.8)                                                                                         | none                                          | Missing              | S                   |
| Alchemy: mixing, explosions, effects (7)                                                           | one potion                                    | Missing              | M                   |
| Wands, scrolls and books in use (2.5, 2.6)                                                         | scrolls cast at a fixed skill                 | Partial              | S once spells exist |
| Save format version 2 with migration (1.4)                                                         | version 1                                     | Missing              | S                   |
| Icons and ground sprites (10)                                                                      | 13 line glyphs                                | Missing              | XL (art)            |
| Paper-doll overlays (10)                                                                           | none                                          | Missing              | XL (art)            |

## 9. Build order

Each step leaves the game playable and tested. Sizes as above.

1. **The record and the catalogue (M).** MM6's types and families
   (skill, hands, recovery, armour penalty, generic name); `ItemDef` with
   `bonus`, `rarity`, `difficulty`, `chanceByLevel`, `unidentifiedName`,
   `icon`; `ItemInstance` with `standard`, `special`, `charges`, `gold`;
   `SAVE_VERSION` 2 with a migration of the 17 old ids (2.11). The 65
   weapons, 54 armour pieces, 15 rings and amulets and 10 gems as data
   (PLAN's layout puts tables in `src/data/`). Equip rules of 1.2. One
   function that sums worn bonuses (stats as a bonus apart from the base,
   HP, SP, AC, resistances) feeding `character.ts`. Tests for the counts,
   the numbers of a sample per family and the equip rules. Update DESIGN
   14.5 and `src/game/README.md`.
2. **Names, inspect and identify (S).** Generic names, prefix and suffix
   naming, the inspect pop-up with value, the identify and repair checks
   (5.2, 5.3), the Scholar, Smith, Armorer and Alchemist hooks.
3. **The generator (M).** `treasure.ts` on `rng.ts`: levels 1–7, weights
   (4.2, ours until decision 11.1), the chances of 4.3, the odds of 3.1
   and 3.2, the strengths of 4.4, gold piles, the found-artifact list.
   Seeded tests that check the shape of the distributions.
4. **Loot (M).** Treasure fields on the monster record (4.9), searching
   bodies, gold to the purse through one function that later applies the
   hirelings, items and gold on the ground with a ground sprite (decision
   11.4), picking up, "no room".
5. **Shops and the bank (M).** House records with kind, Val, regular and
   special lists, restock days and hours (6.5); stock generated on visit
   and kept in `GameState` with its next restock time; Buy, Special,
   Sell, Identify, Repair by kind; the general store; the MM7 price
   formulas (6.3); the six message slots; the bank (S). Only the
   village's houses are placed until the world grows.
6. **Enchantments at work (M).** Elemental damage with monster
   resistances, the two slayers (monster family flags), Vampiric,
   Swiftness in recovery, Force on the existing knockback, Shielding
   against missiles, Carnage (needs an area projectile), regeneration
   ticks, immunities through `conditions.ts`, of Power, the +50 % schools.
   Depends on monster resistances and families (MM6-GAPS section 9).
7. **Alchemy (M).** Herbs, bottle and potions as items; the mixing matrix
   as data (7.2); explosions with fire damage, breaking and eradication;
   temporary bonuses through the buff store (MM6-GAPS step 2); essences
   with a once-per-member record; magical aging.
8. **Wands, scrolls and books (S to M).** Wands as weapons that cast and
   spend charges; scrolls cast from the pack; books taught from the pack;
   guild stock as book items. Depends on the spells (MM6-GAPS section 7).
9. **Chests (L).** Chest records in the level format, filled on first
   opening (4.7), traps with the map's lock and trap values, Disarm Trap
   and Perception, the chest window (chest grid beside the pack), refill
   with the map. Built with doors and keys (MM6-GAPS section 29).
10. **Breaking and theft (S).** After monster special attacks exist.
11. **Art (XL, alongside from step 1).** Icons first for what the village
    sells and drops, then the rest (section 10).

## 10. Art needs

**Icons.** MM6 draws about 570 items with 231 distinct icons [OY]:

| Group                      | Items | Icons | Sharing                                                   |
| -------------------------- | ----- | ----- | --------------------------------------------------------- |
| Weapons                    | 65    | 65    | one each; Snergle's Axe reuses one                        |
| Armour and clothing        | 54    | 54    | one each; Lord Kilburn's Shield reuses one                |
| Rings and amulets          | 15    | 15    | one each                                                  |
| Gems                       | 10    | 10    | one each                                                  |
| Wands                      | 25    | 5     | one per tier                                              |
| Herbs, bottle, potions     | 29    | 12    | 3 herbs, empty bottle, 8 colours (white and black shared) |
| Gold                       | 3     | 3     | small, medium, large                                      |
| Spell scrolls              | 99    | 4     | by spell-level band                                       |
| Spellbooks                 | 99    | 5     | by spell-level band                                       |
| Message scrolls            | ~50   | 1     | all                                                       |
| Artifacts and relics       | 30    | 2     | 28 reuse their base kind's icon                           |
| Keys                       | ~30   | 6     |                                                           |
| Other quest and misc items | ~60   | ~49   | maps, pouches and memory crystals shared                  |
| **Total**                  | ~570  | 231   |                                                           |

The herb and bottle row counts 3 herb icons and 9 bottle icons (empty,
red, blue, yellow, orange, green, purple, white, black). The icon sets the
footprint (1.3), so the icon template (DESIGN 12.4) must fix each family's
pixel size: one cell is 32 pixels at MM6's 640 × 480 (MM7 rule).

A first set for the village (ours): what the village shops sell and the
starting kits (about 15 items), the herbs, the bottle and the eight
potion colours, the three gold piles, and the four scroll and five book
icons: about 40.

**Paper doll.** Pieces drawn on the body (DESIGN 12.3): 13 body armours,
11 helms, hats and crowns, 5 cloaks, 5 belts, 5 gauntlets, 5 boots = 44
kinds, plus Apollo's and Zeus's own looks, × 2 body types = 92 overlays.
MM7 draws weapons and shields on the doll with their own icon, placed by
the item's doll offset [OE `UICharacter.cpp`; MMX `EquipX`, `EquipY`];
if MM6 does the same (unverified), weapons and shields need no overlay. Rings and amulets show in MM6's close-up of the
hand (the magnifying glass in screenshot-19), from their icons
(unverified).

**Ground sprites.** MM6 has a sprite per kind for items on the ground
[MMX `SpriteIndex`]; their number is unverified. The tree sprites of
DESIGN 16.14 show a cheap path: draw the icon as a small billboard
(decision 11.4).

**Elsewhere.** Eight chest windows (4.7); 47 shop interiors and
proprietors belong to the house screens (MM6-GAPS section 26); shelves
like screenshot-29.

## 11. Decisions for the owner

1. **Item weights per level.** Use the proposal in 4.2, or have someone
   with a copy of MM6 read the numbers of the item table's level columns
   (numbers only; no file enters the repository).
2. **Dual wielding.** MM6 as shipped (a second weapon slows the attack)
   or as patched (works as in MM7).
3. **"of Recovery".** The design note's 10 points or the patch's 10 %;
   this document recommends the patch.
4. **Items on the ground.** Icon billboards, as the trees, or Meshy props
   (credits per kind).
5. **Prices.** Adopt MM7's formulas (6.3), recommended; reputation joins
   them when reputation exists.
6. **The original's bugs.** Enchantment damage ignoring resistances,
   stolen items lost for good, wands vanishing, a wasted essence,
   artifacts in unreachable chests. This document recommends the
   patched behaviour each time, as that is how MM6 is played today.
7. **Names and quest items.** MM6's item names are mostly generic; its
   quest items belong to Enroth's story (MM6-GAPS decision 37.5).
8. **Scrolls and wands.** The skill and rank they cast at, until a source
   fixes them.

## 12. Sources

All public; read on 2026-10-17 and 2026-10-18.

- **TXT**: MM6's English text tables as published in the
  might-and-magic/mm678-i18n repository, folder
  `source/en/mm6/data/10LocLANG.icons/`
  (https://github.com/might-and-magic/mm678-i18n). Read for names and
  numbers only:
  - **TXT-STD** `STDITEMS.TXT`: standard bonuses, odds per slot, strength
    by level.
  - **TXT-SPC** `SPCITEMS.TXT`: special enchantments, odds per slot,
    values, level groups.
  - **TXT-USE** `USEITEMS.TXT`: herbs, potions, mixing matrix,
    explosions, scroll and book use.
  - **TXT-HOUSE** `2DEvents.txt`: every house's kind, factor, stock lists,
    restock days and hours.
  - **TXT-MAP** `MapStats.txt`: refill days, chest lock and trap per map.
  - **TXT-MON** `MONSTERS.TXT`: treasure and special attacks per monster.
  - **TXT-MERCH** `Merchant.txt`: the shopkeeper's message slots.
- **MMX**: GrayFace, MMExtension reference (structures `Item`,
  `ItemsTxtItem`, `StdItemsTxtItem`, `SpcItemsTxtItem`, `MapChest`,
  `MapStatsItem`, `SpawnPoint`, `ShopItemKind`, `GeneralStoreItemKind`,
  `Events2DItem`, `MonstersTxtItem`, `Party`, `Game`; constants
  `ItemType`, `ItemSlot`, `HouseType`, `FaceAnimation`; `evt.GiveItem`).
  https://grayface.github.io/mm/ext/ref/
- **GF-M**: GrayFace, "Might and Magic Mechanics" (recovery, dual
  weapons, Vampiric, the Recovery enchantment, bad-thing saves).
  https://grayface.github.io/mm/mechanics/
- **GF-P**: GrayFace, MM6 Patch read-me 2.5.7 (its fixes describe the
  original's behaviour). https://grayface.github.io/mm/MM6PatchReadMe
- **OE**: OpenEnroth, the open re-implementation of MM7: files
  `src/Engine/PriceCalculator.cpp`, `src/Engine/Objects/Item.cpp`,
  `src/Engine/Tables/ItemTable.cpp`, `src/Engine/Objects/Chest.cpp`,
  `src/Engine/Objects/Character.cpp`, `src/GUI/UI/Houses/Shops.cpp`,
  `src/GUI/UI/Houses/Tavern.cpp`, `src/GUI/UI/UICharacter.cpp`. https://github.com/OpenEnroth/OpenEnroth
- **OY**: pjasicek/openyamm, `assets_dev/worlds/mm6/_legacy/tables/rnditems.txt`,
  a merged MM6/7/8 item table. Used only for the MM6 roster, icon names
  and sharing, and the merged game's enchantment chances; its item
  weights are rebalanced and are not MM6's. https://github.com/pjasicek/openyamm
- **RPGC**: RPG Classics, Might and Magic 6 shrine: weapons, armor,
  items, enchantments, recipes, skills, hirelings, elemental, clerical
  and dark/light spells. http://tartarus.rpgclassics.com/mm6/
- **MMW**: Might and Magic Wiki, read through its public API: "List of
  Might and Magic VI items", "Might and Magic VI Potions", the MM6
  weaponshop, armorshop, magic shop, general store, bank and guild
  categories, and the MM6 skill pages (Merchant, Identify Item, Repair
  Item, Staff, Spear, Sword, Dagger, Blaster).
  https://mightandmagic.fandom.com/
- **MPIKE**: J. Pike, Might and Magic VI walkthrough 2.0 (items,
  artifacts, enchantments, potions), as kept in the MacHu-GWU/mm6doc-project
  repository. https://github.com/MacHu-GWU/mm6doc-project
- **SAS**: Sashanan, "Might & Magic 6: The Mandate of Heaven item list",
  version 1.4, 2001.
  http://alexandria.rpgclassics.com/PC/mightandmagic6/mightandmagic6_7.txt
- **DOB**: D. G. Dobrev, "Complete Guide to Might and Magic VI",
  sections 2.5, 2.6, 7 and 11.
  https://www.cheathappens.com/text/mm6guide.zip.txt
- **CHI**: chiuinan, MM6 equipment list (in Chinese; levels, artifact
  notes). https://github.com/chiuinan/chiuinan.github.io, file
  `game/game/intro/ch/c12/mm6/mm6/item.htm`
- **LP**: Let's Play Archive, Might and Magic 6, updates 1 to 3.
  https://lparchive.org/Might-and-Magic-6/
- **GOG**: GOG forum, "Clerics and druids in MM VI" (wands and scrolls).
  https://www.gog.com/forum/might_and_magic_series/clerics_and_druids_in_mm_vi
- **CH**: Celestial Heavens forum, "M&M6, highest practical misc skills".
  https://www.celestialheavens.com/forum/topic/13428
- **Screenshots**: the owner's MM6 captures in `artwork/reference/`
  (third-party, reference only): 19 (pack), 20 (inspect), 27 (tavern), 28
  (shop menu), 29 (shop shelves).
