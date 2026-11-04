/**
 * MM6's catalogue of arms, armour and jewellery as data (DESIGN.md 17.18; docs/gaps/items.md
 * 2.1 to 2.3): every family with its skill, hands, footprint and the picture its tiers share,
 * and every tier with MM6's dice or armour class, value, difficulty (to identify and repair)
 * and the lowest treasure level it comes at. Where the sources disagree the first figure of
 * items.md stands. Hats, crowns, belts, rings and amulets have no level in any source; theirs
 * are ours (items.md 4.2): rings and amulets by their difficulty band, hats, crowns and belts
 * by price. Clubs need no skill (MM7's rule; MM6's is unverified). The footprints are ours at
 * the bag's scale (a cell is 34 cm, DESIGN 16.8). The pictures are the family's one Met
 * photograph for every tier until each tier has its own (owner's call).
 */
import type { ItemId, ItemKind } from './items';
import type { Dice } from './rng';
import type { SkillId } from './skills';

export interface Family {
  id: string;
  kind: ItemKind;
  /** The skill that wields or wears it; none for a club, a hat, a belt, a ring. */
  skill?: SkillId;
  twoHanded?: boolean;
  /** A spear's kind: one hand, or two for one more die (items.md 2.1). */
  extraDieTwoHanded?: boolean;
  ranged?: boolean;
  w: number;
  h: number;
  /** The asset id of the picture the family's tiers share (assets/items/<picture>.png). */
  picture: ItemId;
  /** What an unidentified one is called. */
  generic: string;
}

/** [id, name, count, sides, bonus, value, difficulty, level] */
type WeaponRow = [ItemId, string, number, number, number, number, number, number];
/** [id, name, armour class, value, difficulty, level] */
type ArmorRow = [ItemId, string, number, number, number, number];
/** [id, name, value, difficulty, level] */
type TrinketRow = [ItemId, string, number, number, number];

export interface CatalogueEntry {
  id: ItemId;
  name: string;
  family: Family;
  damage?: Dice;
  armor?: number;
  value: number;
  difficulty: number;
  level: number;
}

const weapons = (family: Family, rows: WeaponRow[]): CatalogueEntry[] =>
  rows.map(([id, name, count, sides, bonus, value, difficulty, level]) => ({
    id,
    name,
    family,
    damage: bonus ? { count, sides, bonus } : { count, sides },
    value,
    difficulty,
    level,
  }));

const armour = (family: Family, rows: ArmorRow[]): CatalogueEntry[] =>
  rows.map(([id, name, armor, value, difficulty, level]) => ({
    id,
    name,
    family,
    armor,
    value,
    difficulty,
    level,
  }));

const trinkets = (family: Family, rows: TrinketRow[]): CatalogueEntry[] =>
  rows.map(([id, name, value, difficulty, level]) => ({
    id,
    name,
    family,
    value,
    difficulty,
    level,
  }));

const weapon = (
  id: string,
  skill: SkillId | undefined,
  w: number,
  h: number,
  picture: ItemId,
  generic: string,
  flags: Partial<Pick<Family, 'twoHanded' | 'extraDieTwoHanded' | 'ranged'>> = {},
): Family => ({
  id,
  kind: 'weapon',
  ...(skill ? { skill } : {}),
  w,
  h,
  picture,
  generic,
  ...flags,
});

const wear = (
  id: string,
  kind: ItemKind,
  skill: SkillId | undefined,
  w: number,
  h: number,
  picture: ItemId,
  generic: string,
): Family => ({ id, kind, ...(skill ? { skill } : {}), w, h, picture, generic });

/** The 65 weapons of items.md 2.1 (the blasters left out: no random weight, no shop sells them). */
export const WEAPONS: CatalogueEntry[] = [
  ...weapons(weapon('longsword', 'sword', 1, 4, 'long-sword', 'Longsword'), [
    ['long-sword', 'Longsword', 3, 3, 0, 50, 1, 1],
    ['warrior-sword', 'Warrior Sword', 3, 3, 3, 200, 3, 2],
    ['crusader-sword', 'Crusader Sword', 3, 3, 6, 350, 5, 3],
    ['champion-sword', 'Champion Sword', 3, 3, 9, 500, 7, 3],
    ['lionheart-sword', 'Lionheart Sword', 3, 3, 12, 650, 9, 5],
  ]),
  ...weapons(
    weapon('two-handed-sword', 'sword', 2, 5, 'two-handed-sword', 'Two-Handed Sword', {
      twoHanded: true,
    }),
    [
      ['two-handed-sword', 'Two-Handed Sword', 4, 5, 0, 400, 1, 2],
      ['great-sword', 'Great Sword', 4, 5, 2, 500, 6, 2],
      ['heroic-sword', 'Heroic Sword', 4, 5, 8, 800, 8, 4],
    ],
  ),
  ...weapons(weapon('broadsword', 'sword', 1, 4, 'broadsword', 'Broadsword'), [
    ['broadsword', 'Broadsword', 3, 4, 0, 100, 1, 1],
    ['steel-broadsword', 'Steel Broadsword', 3, 4, 4, 300, 4, 2],
    ['mighty-broadsword', 'Mighty Broadsword', 3, 4, 10, 600, 6, 4],
  ]),
  ...weapons(weapon('cutlass', 'sword', 1, 3, 'short-sword', 'Cutlass'), [
    ['short-sword', 'Cutlass', 2, 4, 0, 40, 1, 1],
    ['pirate-cutlass', 'Pirate Cutlass', 2, 4, 5, 290, 3, 1],
    ['master-cutlass', 'Master Cutlass', 2, 4, 11, 590, 5, 4],
  ]),
  ...weapons(weapon('dagger', 'dagger', 1, 2, 'dagger', 'Dagger'), [
    ['dagger', 'Dagger', 2, 2, 0, 8, 1, 1],
    ['blood-dagger', 'Blood Dagger', 2, 2, 2, 100, 2, 1],
    ['shadow-dagger', 'Shadow Dagger', 2, 2, 3, 150, 3, 2],
    ['mage-dagger', 'Mage Dagger', 2, 2, 5, 250, 4, 3],
    ['jeweled-dagger', 'Jeweled Dagger', 2, 2, 6, 300, 5, 4],
  ]),
  ...weapons(weapon('long-dagger', 'dagger', 1, 3, 'long-dagger', 'Long Dagger'), [
    ['long-dagger', 'Long Dagger', 2, 3, 0, 15, 1, 1],
    ['piercing-dagger', 'Piercing Dagger', 2, 3, 4, 200, 3, 2],
    ['divine-dagger', 'Divine Dagger', 2, 3, 7, 350, 5, 4],
  ]),
  ...weapons(weapon('axe', 'axe', 2, 3, 'axe', 'Axe'), [
    ['axe', 'Hand Axe', 4, 2, 0, 30, 1, 1],
    ['battle-axe', 'Battle Axe', 4, 2, 2, 100, 2, 1],
    ['war-axe', 'War Axe', 4, 2, 5, 250, 4, 2],
    ['dwarven-axe', 'Dwarven Axe', 4, 2, 8, 400, 5, 2],
    ['supreme-axe', 'Supreme Axe', 4, 2, 11, 550, 6, 4],
  ]),
  ...weapons(weapon('poleax', 'axe', 2, 5, 'poleax', 'Two-Handed Axe', { twoHanded: true }), [
    ['poleax', 'Poleax', 3, 7, 0, 225, 1, 2],
    ['heavy-poleax', 'Heavy Poleax', 3, 7, 3, 450, 5, 2],
    ['grand-poleax', 'Grand Poleax', 3, 7, 9, 900, 8, 4],
  ]),
  ...weapons(weapon('spear', 'spear', 1, 5, 'spear', 'Spear', { extraDieTwoHanded: true }), [
    ['spear', 'Spear', 1, 9, 0, 15, 1, 1],
    ['stout-spear', 'Stout Spear', 1, 9, 1, 50, 2, 1],
    ['serpent-spear', 'Serpent Spear', 1, 9, 5, 250, 3, 2],
    ['savage-spear', 'Savage Spear', 1, 9, 9, 450, 4, 3],
    ['sacred-spear', 'Sacred Spear', 1, 9, 13, 650, 6, 4],
  ]),
  ...weapons(weapon('halberd', 'spear', 2, 5, 'halberd', 'Halberd', { extraDieTwoHanded: true }), [
    ['halberd', 'Halberd', 3, 6, 0, 200, 1, 2],
    ['massive-halberd', 'Massive Halberd', 3, 6, 4, 400, 4, 2],
    ['elite-halberd', 'Elite Halberd', 3, 6, 10, 700, 8, 4],
  ]),
  ...weapons(weapon('trident', 'spear', 1, 5, 'trident', 'Trident', { extraDieTwoHanded: true }), [
    ['trident', 'Trident', 2, 6, 0, 100, 1, 1],
    ['ornate-trident', 'Ornate Trident', 2, 6, 6, 400, 3, 3],
    ['titanic-trident', 'Titanic Trident', 2, 6, 12, 700, 6, 4],
  ]),
  ...weapons(weapon('longbow', 'bow', 2, 4, 'bow', 'Longbow', { ranged: true }), [
    ['bow', 'Longbow', 5, 2, 0, 100, 1, 1],
    ['elven-bow', 'Elven Bow', 5, 2, 2, 200, 3, 2],
    ['precision-bow', 'Precision Bow', 5, 2, 4, 300, 5, 2],
    ['magic-bow', 'Magic Bow', 5, 2, 6, 400, 7, 3],
    ['stellar-bow', 'Stellar Bow', 5, 2, 8, 500, 9, 4],
  ]),
  ...weapons(weapon('crossbow', 'bow', 2, 3, 'crossbow', 'Crossbow', { ranged: true }), [
    ['crossbow', 'Crossbow', 4, 2, 0, 50, 1, 1],
    ['accurate-crossbow', 'Accurate Crossbow', 4, 2, 3, 200, 4, 2],
    ['true-crossbow', 'True Crossbow', 4, 2, 7, 400, 8, 4],
  ]),
  ...weapons(weapon('mace', 'mace', 1, 3, 'mace', 'Mace'), [
    ['mace', 'Mace', 2, 4, 0, 50, 1, 1],
    ['wicked-mace', 'Wicked Mace', 2, 4, 2, 150, 2, 1],
    ['thunder-mace', 'Thunder Mace', 2, 4, 5, 300, 3, 2],
    ['wonder-mace', 'Wonder Mace', 2, 4, 8, 450, 4, 3],
    ['death-mace', 'Death Mace', 2, 4, 11, 600, 6, 4],
  ]),
  ...weapons(weapon('hammer', 'mace', 2, 3, 'hammer', 'Hammer'), [
    ['hammer', 'Hammer', 2, 5, 0, 120, 1, 1],
    ['dark-hammer', 'Dark Hammer', 2, 5, 3, 300, 3, 1],
    ['holy-hammer', 'Holy Hammer', 2, 5, 9, 600, 5, 4],
  ]),
  ...weapons(weapon('club', undefined, 1, 3, 'club', 'Club'), [
    ['club', 'Club', 1, 3, 0, 1, 0, 1],
    ['spiked-club', 'Spiked Club', 1, 3, 3, 40, 2, 1],
    ['killer-club', 'Killer Club', 1, 3, 5, 100, 3, 2],
  ]),
  ...weapons(weapon('staff', 'staff', 1, 4, 'staff', 'Staff', { twoHanded: true }), [
    ['staff', 'Staff', 2, 4, 0, 40, 1, 1],
    ['emerald-staff', 'Emerald Staff', 2, 4, 3, 250, 4, 2],
    ['power-staff', 'Power Staff', 2, 4, 7, 500, 6, 4],
  ]),
];

/** The 54 pieces of armour and clothing of items.md 2.2. */
export const ARMOUR: CatalogueEntry[] = [
  ...armour(wear('leather', 'armor', 'leather', 2, 3, 'leather-armor', 'Leather Armor'), [
    ['leather-armor', 'Leather Armor', 4, 150, 1, 1],
    ['studded-leather', 'Studded Leather', 6, 250, 3, 2],
    ['enchanted-leather', 'Enchanted Leather', 10, 450, 5, 3],
    ['dragon-leather', 'Dragon Leather', 16, 750, 7, 4],
    ['imperial-leather', 'Imperial Leather', 24, 1150, 9, 5],
  ]),
  ...armour(wear('chain', 'armor', 'chain', 2, 4, 'chain-mail', 'Chain Mail'), [
    ['chain-mail', 'Chain Mail', 8, 400, 1, 1],
    ['steel-chain-mail', 'Steel Chain Mail', 12, 600, 4, 2],
    ['noble-chain-mail', 'Noble Chain Mail', 18, 900, 6, 3],
    ['royal-chain-mail', 'Royal Chain Mail', 26, 1300, 8, 4],
    ['majestic-chain-mail', 'Majestic Chain Mail', 36, 1800, 10, 5],
  ]),
  ...armour(wear('plate', 'armor', 'plate', 2, 4, 'plate-armor', 'Plate Mail'), [
    ['plate-armor', 'Plate Armor', 20, 1000, 1, 1],
    ['steel-plate-armor', 'Steel Plate Armor', 28, 1400, 6, 4],
    ['golden-plate-armor', 'Golden Plate Armor', 54, 2700, 12, 5],
  ]),
  ...armour(wear('large-shield', 'shield', 'shield', 2, 3, 'kite-shield', 'Large Shield'), [
    ['kite-shield', 'Kite Shield', 6, 200, 1, 1],
    ['tower-shield', 'Tower Shield', 7, 300, 3, 1],
    ['castle-shield', 'Castle Shield', 9, 400, 5, 3],
    ['celestial-shield', 'Celestial Shield', 13, 500, 7, 3],
    ['olympian-shield', 'Olympian Shield', 19, 800, 9, 5],
  ]),
  ...armour(wear('small-shield', 'shield', 'shield', 2, 2, 'shield', 'Small Shield'), [
    ['shield', 'Wooden Shield', 4, 100, 1, 1],
    ['bronze-shield', 'Bronze Shield', 6, 200, 2, 1],
    ['steel-shield', 'Steel Shield', 8, 300, 3, 3],
    ['spirit-shield', 'Spirit Shield', 12, 450, 4, 3],
    ['astral-shield', 'Astral Shield', 18, 750, 5, 5],
  ]),
  ...armour(wear('helm', 'helmet', undefined, 2, 2, 'helmet', 'Helm'), [
    ['helmet', 'Helm', 2, 60, 1, 1],
    ['steel-helm', 'Steel Helm', 6, 260, 4, 1],
    ['guardian-helm', 'Guardian Helm', 8, 460, 6, 2],
    ['defender-helm', 'Defender Helm', 10, 660, 8, 3],
    ['angelic-helm', 'Angelic Helm', 12, 860, 10, 4],
  ]),
  ...armour(wear('hat', 'helmet', undefined, 2, 2, 'cloth-hat', 'Hat'), [
    ['cloth-hat', 'Cloth Hat', 0, 20, 1, 1],
    ['fancy-hat', 'Fancy Hat', 0, 100, 2, 2],
    ['wizard-cap', 'Wizard Cap', 0, 200, 3, 3],
  ]),
  ...armour(wear('crown', 'helmet', undefined, 2, 2, 'crown', 'Crown'), [
    ['crown', 'Crown', 0, 250, 12, 4],
    ['regal-crown', 'Regal Crown', 0, 450, 14, 4],
    ['almighty-crown', 'Almighty Crown', 0, 650, 16, 4],
  ]),
  ...armour(wear('belt', 'belt', undefined, 2, 1, 'leather-belt', 'Belt'), [
    ['leather-belt', 'Leather Belt', 0, 40, 1, 1],
    ['mercenary-belt', 'Mercenary Belt', 0, 100, 2, 2],
    ['vanguard-belt', 'Vanguard Belt', 0, 225, 3, 3],
    ['warlord-belt', 'Warlord Belt', 0, 450, 4, 4],
    ['sovereign-belt', 'Sovereign Belt', 0, 600, 5, 4],
  ]),
  ...armour(wear('cloak', 'cloak', undefined, 2, 3, 'leather-cloak', 'Cloak'), [
    ['leather-cloak', 'Leather Cloak', 1, 50, 2, 1],
    ['phantom-cloak', 'Phantom Cloak', 3, 150, 3, 1],
    ['elven-cloak', 'Elven Cloak', 5, 250, 4, 2],
    ['cardinal-cloak', 'Cardinal Cloak', 7, 450, 5, 3],
    ['dooms-day-cloak', "Doom's Day Cloak", 9, 750, 6, 3],
  ]),
  ...armour(wear('gauntlets', 'gauntlets', undefined, 2, 2, 'gauntlets', 'Gauntlets'), [
    ['gauntlets', 'Gauntlets', 3, 100, 2, 1],
    ['knight-gauntlets', 'Knight Gauntlets', 6, 250, 4, 1],
    ['paladin-gauntlets', 'Paladin Gauntlets', 8, 450, 6, 2],
    ['cavalier-gauntlets', 'Cavalier Gauntlets', 10, 650, 8, 3],
    ['ultimate-gauntlets', 'Ultimate Gauntlets', 12, 850, 10, 3],
  ]),
  ...armour(wear('boots', 'boots', undefined, 2, 2, 'boots', 'Boots'), [
    ['boots', 'Leather Boots', 2, 50, 3, 1],
    ['steel-boots', 'Steel Boots', 6, 250, 4, 3],
    ['armored-boots', 'Armored Boots', 8, 450, 5, 3],
    ['sterling-boots', 'Sterling Boots', 10, 650, 6, 4],
    ['ultimate-boots', 'Ultimate Boots', 12, 850, 7, 4],
  ]),
];

/** The 15 rings and amulets of items.md 2.3; their levels are ours by difficulty band. */
export const JEWELLERY: CatalogueEntry[] = [
  ...trinkets(wear('ring', 'ring', undefined, 1, 1, 'copper-ring', 'Ring'), [
    ['copper-ring', 'Fine Ring', 100, 2, 1],
    ['sparkling-ring', 'Sparkling Ring', 300, 4, 1],
    ['lunar-ring', 'Lunar Ring', 500, 6, 1],
    ['witch-ring', 'Witch Ring', 700, 8, 3],
    ['blessed-ring', 'Blessed Ring', 900, 10, 3],
    ['valuable-ring', 'Valuable Ring', 1100, 12, 3],
    ['precious-ring', 'Precious Ring', 1300, 14, 5],
    ['ethereal-ring', 'Ethereal Ring', 1500, 16, 5],
    ['exquisite-ring', 'Exquisite Ring', 1700, 18, 5],
    ['scarab-ring', 'Scarab Ring', 2000, 20, 5],
  ]),
  ...trinkets(wear('amulet', 'amulet', undefined, 1, 1, 'turquoise-amulet', 'Amulet'), [
    ['turquoise-amulet', 'Turquoise Amulet', 500, 2, 1],
    ['gothic-amulet', 'Gothic Amulet', 750, 4, 1],
    ['claw-amulet', 'Claw Amulet', 1000, 6, 1],
    ['ancient-amulet', 'Ancient Amulet', 1250, 8, 3],
    ['ruby-star-amulet', 'Ruby Star Amulet', 1500, 10, 3],
  ]),
];

export const CATALOGUE: CatalogueEntry[] = [...WEAPONS, ...ARMOUR, ...JEWELLERY];
