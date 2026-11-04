/**
 * Monster records as data (DESIGN.md 17.16; docs/gaps/monsters.md 1, 3). MM6 keeps its monsters
 * in families of three tiers that share one body and differ in colour and in numbers, and for
 * every tiered type the level sets the hit points, ⌊L × (L + 30) / 10⌋, and the experience,
 * L × (L + 10) (monsters.md 3.2). The records below are built the same way: a family names its
 * body, its speeds and ranges and a tint for each tier; a tier names its level, armour class,
 * attack, AI type, recovery, treasure and, where it has them, a missile and a special attack.
 * Where our body matches an MM6 family (the goblin, the skeleton) the tiers carry MM6's own
 * numbers; where it does not (the bandit, the nomad) the tiers follow 3.2's rules with our names.
 * A unique such as the Warden keeps its own hit points, as MM6's uniques do. Distances in
 * metres, times in seconds; the speeds are ours (MM6's monsters walked, ours must catch a party
 * on a phone).
 */
import type { ItemId, ItemKind } from './items';
import type { Dice } from './rng';
import type { MagicSchool } from './skills';

/** MM6's AI types; each flees at a share of its hit points, Suicidal never (monsters.md 2.7). */
export type MonsterAi = 'wimp' | 'normal' | 'aggressive' | 'suicidal';

/** The share of its hit points under which a monster runs (MW6). */
export const FLEE_AT: Record<MonsterAi, number> = {
  wimp: 0.3,
  normal: 0.2,
  aggressive: 0.1,
  suicidal: 0,
};

export type MonsterTier = 'A' | 'B' | 'C';

/**
 * The special attacks that lay a condition (monsters.md 2.6). Breaking, theft, aging and
 * draining wait for item instances that can be picked from and for the sheet's age.
 */
export type SpecialKind =
  | 'curse'
  | 'weak'
  | 'asleep'
  | 'drunk'
  | 'insane'
  | 'poison'
  | 'disease'
  | 'paralyze'
  | 'unconscious'
  | 'dead'
  | 'stone'
  | 'eradicate'
  | 'afraid';

export interface MonsterSpecial {
  kind: SpecialKind;
  /** The try chance is level × multiplier percent (GF-M); 1 where MW6 shows none. */
  multiplier: number;
  /** Poison and disease come at a level of 1 to 3 (monsters.md 2.6). */
  level?: 1 | 2 | 3;
}

/** What a missile looks like in flight: a school's bolt, or an arrow. */
export type MissileKind = MagicSchool | 'arrow';

/** A ranged attack: used from beyond arm's reach up to its range, when the party is in sight. */
export interface MonsterMissile {
  kind: MissileKind;
  damage: Dice;
  range: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  /** The family whose body this is, and the tier within it. */
  family: string;
  tier: MonsterTier;
  level: number;
  hp: number;
  armorClass: number;
  /** The blow in melee; a monster hits by its level (`resolveMonsterAttack`, MM6-GAPS.md 8). */
  damage: Dice;
  ai: MonsterAi;
  missile?: MonsterMissile;
  special?: MonsterSpecial;
  /** Multiplies the skin's colour: MM6 recoloured one picture per tier (monsters.md 3.5). */
  tint?: [number, number, number];
  /** Metres per second when closing in from afar / when near. */
  runSpeed: number;
  walkSpeed: number;
  /** Notices the party within this distance. */
  aggroRange: number;
  /** Stops and swings within this distance. */
  attackRange: number;
  /** Pause between swings: MM6's recovery at 60 units a second. */
  attackEverySec: number;
  xp: number;
  /** Gold found on the body: MM6's gold dice. */
  gold?: Dice;
  /** An item on the body: the chance of one (0 to 1), its treasure level and kind (items.md 4.9). */
  drop?: { chance: number; level: number; kind?: ItemKind };
  /** A named thing always on the body, a seal or a chart the campaign turns on (docs/CAMPAIGN.md). */
  carries?: ItemId;
  /** A one-off: slain for good, never refilled (state.ts `stillSlain`). */
  unique?: boolean;
  /** Character asset id under assets/characters/. */
  character: string;
  heightMetres: number;
}

/** Hit points from the level, for every tiered type (monsters.md 3.2). */
export function hpForLevel(level: number): number {
  return Math.floor((level * (level + 30)) / 10);
}

/** Experience from the level, for every tiered type (monsters.md 3.2). */
export function xpForLevel(level: number): number {
  return level * (level + 10);
}

/** MM6's recovery points a second, in real time (DESIGN.md 14.2's rate for the party too). */
const RECOVERY_PER_SECOND = 60;

export interface TierSpec {
  id: string;
  name: string;
  level: number;
  armorClass: number;
  damage: Dice;
  ai: MonsterAi;
  /** MM6's recovery value, 40 to 100 (monsters.md 2.5). */
  recovery: number;
  gold?: Dice;
  drop?: MonsterDef['drop'];
  missile?: MonsterMissile;
  special?: MonsterSpecial;
  /** Uniques keep their own hit points and experience. */
  hp?: number;
  xp?: number;
  carries?: ItemId;
}

export interface FamilySpec {
  id: string;
  character: string;
  heightMetres: number;
  runSpeed: number;
  walkSpeed: number;
  aggroRange: number;
  attackRange: number;
  /** The second and third tiers' colourings; the first tier wears the skin as painted. */
  tints: [[number, number, number], [number, number, number]];
  tiers: [TierSpec, TierSpec, TierSpec];
  /** One-offs of the family's body, each with the tier whose colouring it wears. */
  uniques?: (TierSpec & { tier: MonsterTier })[];
}

function record(f: FamilySpec, t: TierSpec, tier: MonsterTier, unique = false): MonsterDef {
  const tint = tier === 'A' ? undefined : f.tints[tier === 'B' ? 0 : 1];
  const def: MonsterDef = {
    id: t.id,
    name: t.name,
    family: f.id,
    tier,
    level: t.level,
    hp: t.hp ?? hpForLevel(t.level),
    armorClass: t.armorClass,
    damage: t.damage,
    ai: t.ai,
    runSpeed: f.runSpeed,
    walkSpeed: f.walkSpeed,
    aggroRange: f.aggroRange,
    attackRange: f.attackRange,
    attackEverySec: t.recovery / RECOVERY_PER_SECOND,
    xp: t.xp ?? xpForLevel(t.level),
    character: f.character,
    heightMetres: f.heightMetres,
  };
  if (tint) def.tint = tint;
  if (t.gold) def.gold = t.gold;
  if (t.drop) def.drop = t.drop;
  if (t.missile) def.missile = t.missile;
  if (t.special) def.special = t.special;
  if (t.carries) def.carries = t.carries;
  if (unique) def.unique = true;
  return def;
}

/** Every record of a family: its three tiers, then its uniques. */
export function familyRecords(f: FamilySpec): MonsterDef[] {
  const tiers: MonsterTier[] = ['A', 'B', 'C'];
  return [
    ...f.tiers.map((t, i) => record(f, t, tiers[i]!)),
    ...(f.uniques ?? []).map((u) => record(f, u, u.tier, true)),
  ];
}

const d = (count: number, sides: number, bonus?: number): Dice =>
  bonus === undefined ? { count, sides } : { count, sides, bonus };

/** MM6's Fire Bolt as a monster casts it, Normal rank at the skill (the party's dice, spells.ts). */
const fireBolt = (skill: number, range: number): MonsterMissile => ({
  kind: 'fire',
  damage: d(skill, 3, skill),
  range,
});

export const FAMILIES: FamilySpec[] = [
  {
    // MM6's Goblin, Goblin Shaman and Goblin King (monsters.md 3.6, the goblins' table).
    id: 'goblin',
    character: 'goblin-scout',
    heightMetres: 1.3,
    runSpeed: 3.6,
    walkSpeed: 1.6,
    aggroRange: 11,
    attackRange: 1.4,
    tints: [
      [0.78, 0.9, 1.2],
      [1.2, 0.82, 0.7],
    ],
    tiers: [
      {
        id: 'goblin-scout',
        name: 'Goblin Scout',
        level: 4,
        armorClass: 6,
        damage: d(1, 9),
        ai: 'wimp',
        recovery: 100,
        gold: d(4, 4),
      },
      {
        id: 'goblin-shaman',
        name: 'Goblin Shaman',
        level: 6,
        armorClass: 10,
        damage: d(1, 9, 2),
        ai: 'normal',
        recovery: 100,
        gold: d(8, 4),
        missile: fireBolt(1, 18),
      },
      {
        id: 'goblin-king',
        name: 'Goblin King',
        level: 10,
        armorClass: 14,
        damage: d(1, 9, 4),
        ai: 'aggressive',
        recovery: 90,
        gold: d(15, 4),
        drop: { chance: 0.1, level: 1 },
        missile: fireBolt(2, 22),
      },
    ],
    uniques: [
      {
        // The Goblin Warren's lord (docs/CAMPAIGN.md step 4): a king's numbers, a unique's hit
        // points, his shaman's fire with him.
        id: 'goblin-grik',
        name: 'Grik the Warren-Lord',
        tier: 'C',
        level: 11,
        hp: 95,
        armorClass: 15,
        damage: d(2, 8, 3),
        ai: 'aggressive',
        recovery: 80,
        gold: d(16, 6),
        drop: { chance: 0.8, level: 3 },
        missile: fireBolt(6, 18),
      },
    ],
  },
  {
    // MM6's Skeleton, Skeleton Knight and Skeleton Lord (monsters.md 3.6, the undead).
    id: 'skeleton',
    character: 'skeleton-warrior',
    heightMetres: 1.75,
    runSpeed: 2.6,
    walkSpeed: 1.2,
    aggroRange: 8,
    attackRange: 1.7,
    tints: [
      [0.8, 1.05, 0.85],
      [1.0, 0.8, 1.15],
    ],
    tiers: [
      {
        id: 'skeleton-warrior',
        name: 'Skeleton Warrior',
        level: 6,
        armorClass: 8,
        damage: d(3, 4),
        ai: 'aggressive',
        recovery: 100,
        gold: d(4, 6),
      },
      {
        id: 'skeleton-knight',
        name: 'Skeleton Knight',
        level: 10,
        armorClass: 10,
        damage: d(3, 4, 2),
        ai: 'aggressive',
        recovery: 90,
        gold: d(7, 6),
        special: { kind: 'afraid', multiplier: 1 },
      },
      {
        id: 'skeleton-lord',
        name: 'Skeleton Lord',
        level: 14,
        armorClass: 14,
        damage: d(3, 4, 6),
        ai: 'suicidal',
        recovery: 80,
        gold: d(10, 6),
        drop: { chance: 0.05, level: 2, kind: 'weapon' },
        special: { kind: 'curse', multiplier: 2 },
      },
    ],
    uniques: [
      {
        // The quest's boss in the Old Halls (DESIGN.md 17.13): a knight's numbers with a
        // unique's hit points, so a party of the second level can bring it down with care.
        id: 'skeleton-warden',
        name: 'Warden of the Halls',
        tier: 'C',
        level: 8,
        hp: 70,
        armorClass: 13,
        damage: d(2, 6, 2),
        ai: 'aggressive',
        recovery: 90,
        gold: d(10, 6),
        drop: { chance: 0.6, level: 2, kind: 'weapon' },
        special: { kind: 'afraid', multiplier: 1 },
        carries: 'seal-of-the-halls',
      },
      {
        // The Barrow of Kings' master (DESIGN.md 17.23): a lord's numbers with a unique's hit
        // points, his curse on whoever stands before him.
        id: 'barrow-king',
        name: 'The Barrow King',
        tier: 'C',
        level: 12,
        hp: 120,
        armorClass: 18,
        damage: d(3, 6, 4),
        ai: 'aggressive',
        recovery: 90,
        gold: d(30, 6),
        drop: { chance: 0.9, level: 3, kind: 'weapon' },
        special: { kind: 'curse', multiplier: 2 },
        carries: 'seal-of-the-barrow',
      },
    ],
  },
  {
    // Ours, on MM6's Cutpurse line: the road bandits of the slice's first quest.
    id: 'bandit',
    character: 'bandit',
    heightMetres: 1.78,
    runSpeed: 3.2,
    walkSpeed: 1.4,
    aggroRange: 9,
    attackRange: 1.6,
    tints: [
      [0.85, 0.95, 1.1],
      [1.1, 0.85, 0.85],
    ],
    tiers: [
      {
        id: 'bandit',
        name: 'Bandit',
        level: 3,
        armorClass: 3,
        damage: d(2, 2, 3),
        ai: 'normal',
        recovery: 100,
        gold: d(3, 6),
        drop: { chance: 0.1, level: 1, kind: 'weapon' },
      },
      {
        id: 'brigand',
        name: 'Brigand',
        level: 5,
        armorClass: 5,
        damage: d(2, 2, 5),
        ai: 'aggressive',
        recovery: 100,
        gold: d(5, 6),
        drop: { chance: 0.2, level: 1, kind: 'weapon' },
      },
      {
        id: 'cutthroat',
        name: 'Cutthroat',
        level: 7,
        armorClass: 10,
        damage: d(2, 2, 10),
        ai: 'aggressive',
        recovery: 90,
        gold: d(10, 6),
        drop: { chance: 0.5, level: 2, kind: 'weapon' },
        special: { kind: 'dead', multiplier: 1 },
      },
    ],
    uniques: [
      {
        // The Thieves' Den's captain (DESIGN.md 17.21): a cutthroat's numbers and a unique's
        // hit points, the den's chest behind him.
        id: 'bandit-captain',
        name: 'Black Orrin',
        tier: 'C',
        level: 9,
        hp: 80,
        armorClass: 14,
        damage: d(2, 6, 3),
        ai: 'aggressive',
        recovery: 80,
        gold: d(20, 6),
        drop: { chance: 0.8, level: 3, kind: 'weapon' },
        special: { kind: 'poison', multiplier: 1, level: 1 },
      },
    ],
  },
  {
    // Ours, by 3.2's rules: the raiders of the dunes beyond the pass.
    id: 'nomad',
    character: 'nomad-raider',
    heightMetres: 1.75,
    runSpeed: 3.4,
    walkSpeed: 1.5,
    aggroRange: 12,
    attackRange: 1.6,
    tints: [
      [0.9, 0.95, 1.15],
      [1.15, 0.9, 0.75],
    ],
    tiers: [
      {
        id: 'nomad-raider',
        name: 'Nomad Raider',
        level: 3,
        armorClass: 6,
        damage: d(1, 6, 2),
        ai: 'normal',
        recovery: 100,
        gold: d(3, 8),
        drop: { chance: 0.15, level: 1, kind: 'weapon' },
      },
      {
        id: 'nomad-archer',
        name: 'Nomad Archer',
        level: 5,
        armorClass: 8,
        damage: d(1, 6, 1),
        ai: 'normal',
        recovery: 90,
        gold: d(4, 8),
        drop: { chance: 0.1, level: 1, kind: 'weapon' },
        missile: { kind: 'arrow', damage: d(1, 6, 1), range: 25 },
      },
      {
        id: 'nomad-chieftain',
        name: 'Nomad Chieftain',
        level: 8,
        armorClass: 11,
        damage: d(2, 6, 2),
        ai: 'aggressive',
        recovery: 90,
        gold: d(8, 8),
        drop: { chance: 0.2, level: 2, kind: 'weapon' },
        special: { kind: 'weak', multiplier: 2 },
      },
    ],
  },
];

/** The share of its hit points under which this monster runs; 0 when it never does. */
export function fleesAt(def: Pick<MonsterDef, 'ai'>): number {
  return FLEE_AT[def.ai];
}

/** Townsfolk who stand about, turn to the party and answer a tap; not monsters. */
/**
 * The Mire's and the roads' families (docs/CAMPAIGN.md): six more on the same six bodies, each
 * its own tints and way of fighting, as MM6 recoloured one picture per tier.
 */
export const LATER_FAMILIES: FamilySpec[] = [
  {
    // Harrowmere's and the Mire's hired muscle, on the bandit's body in darker cloth.
    id: 'thug',
    character: 'bandit',
    heightMetres: 1.85,
    runSpeed: 3.6,
    walkSpeed: 1.6,
    aggroRange: 12,
    attackRange: 1.5,
    tints: [
      [0.7, 0.72, 0.8],
      [0.6, 0.55, 0.62],
    ],
    tiers: [
      {
        id: 'thug',
        name: 'Thug',
        level: 8,
        armorClass: 12,
        damage: d(2, 6, 2),
        ai: 'normal',
        recovery: 90,
        gold: d(8, 6),
        drop: { chance: 0.2, level: 2, kind: 'weapon' },
      },
      {
        id: 'bruiser',
        name: 'Bruiser',
        level: 11,
        armorClass: 15,
        damage: d(2, 8, 3),
        ai: 'aggressive',
        recovery: 90,
        gold: d(12, 6),
        drop: { chance: 0.3, level: 2, kind: 'armor' },
        special: { kind: 'unconscious', multiplier: 1 },
      },
      {
        id: 'enforcer',
        name: 'Enforcer',
        level: 14,
        armorClass: 18,
        damage: d(3, 6, 4),
        ai: 'aggressive',
        recovery: 80,
        gold: d(16, 6),
        drop: { chance: 0.5, level: 3, kind: 'weapon' },
        special: { kind: 'unconscious', multiplier: 2 },
      },
    ],
  },
  {
    // The Mire's reavers, on the nomad's body in reed-green and rust.
    id: 'reaver',
    character: 'nomad-raider',
    heightMetres: 1.8,
    runSpeed: 3.8,
    walkSpeed: 1.7,
    aggroRange: 14,
    attackRange: 1.5,
    tints: [
      [0.78, 0.9, 0.7],
      [0.95, 0.72, 0.6],
    ],
    tiers: [
      {
        id: 'reaver',
        name: 'Marsh Reaver',
        level: 6,
        armorClass: 10,
        damage: d(2, 5, 1),
        ai: 'normal',
        recovery: 90,
        gold: d(6, 6),
        drop: { chance: 0.15, level: 2, kind: 'weapon' },
      },
      {
        id: 'reaver-archer',
        name: 'Reaver Archer',
        level: 9,
        armorClass: 12,
        damage: d(2, 6, 1),
        ai: 'wimp',
        recovery: 100,
        gold: d(8, 6),
        drop: { chance: 0.15, level: 2, kind: 'weapon' },
        missile: { kind: 'arrow', damage: d(2, 6, 2), range: 26 },
      },
      {
        id: 'reaver-chief',
        name: 'Reaver Chief',
        level: 12,
        armorClass: 16,
        damage: d(3, 6, 2),
        ai: 'aggressive',
        recovery: 80,
        gold: d(14, 6),
        drop: { chance: 0.4, level: 3, kind: 'weapon' },
        special: { kind: 'weak', multiplier: 2 },
      },
    ],
    uniques: [
      {
        // The Reed Fort's queen (docs/CAMPAIGN.md step 8).
        id: 'reed-queen',
        name: 'The Reed Queen',
        tier: 'C',
        level: 13,
        hp: 120,
        armorClass: 17,
        damage: d(3, 6, 3),
        ai: 'aggressive',
        recovery: 70,
        gold: d(30, 6),
        drop: { chance: 0.9, level: 3 },
        missile: { kind: 'arrow', damage: d(3, 6, 3), range: 28 },
        special: { kind: 'poison', multiplier: 2, level: 2 },
      },
    ],
  },
  {
    // The cult of the doors, on the villager's body in ash grey and dried blood.
    id: 'cultist',
    character: 'villager-man',
    heightMetres: 1.8,
    runSpeed: 3.4,
    walkSpeed: 1.5,
    aggroRange: 14,
    attackRange: 1.4,
    tints: [
      [0.66, 0.66, 0.7],
      [0.78, 0.5, 0.48],
    ],
    tiers: [
      {
        id: 'acolyte',
        name: 'Acolyte',
        level: 5,
        armorClass: 8,
        damage: d(1, 6, 1),
        ai: 'wimp',
        recovery: 100,
        gold: d(5, 6),
        drop: { chance: 0.2, level: 1 },
        missile: fireBolt(3, 16),
      },
      {
        id: 'cultist',
        name: 'Cultist',
        level: 9,
        armorClass: 12,
        damage: d(2, 6, 1),
        ai: 'normal',
        recovery: 90,
        gold: d(9, 6),
        drop: { chance: 0.3, level: 2 },
        special: { kind: 'curse', multiplier: 2 },
      },
      {
        id: 'hierophant',
        name: 'Hierophant',
        level: 13,
        armorClass: 15,
        damage: d(2, 8, 2),
        ai: 'aggressive',
        recovery: 80,
        gold: d(14, 6),
        drop: { chance: 0.5, level: 3 },
        missile: fireBolt(7, 20),
        special: { kind: 'curse', multiplier: 3 },
      },
    ],
    uniques: [
      {
        // The Drowned Abbey's abbot, who woke the doors (docs/CAMPAIGN.md step 9).
        id: 'the-abbot',
        name: 'The Abbot',
        tier: 'C',
        level: 15,
        hp: 140,
        armorClass: 18,
        damage: d(3, 6, 3),
        ai: 'aggressive',
        recovery: 70,
        gold: d(40, 6),
        drop: { chance: 1, level: 3 },
        missile: fireBolt(9, 22),
        special: { kind: 'insane', multiplier: 2 },
        carries: 'abbots-confession',
      },
    ],
  },
  {
    // The drowned, the Sea Kings' dead on the skeleton's body, green with the mere.
    id: 'drowned',
    character: 'skeleton-warrior',
    heightMetres: 1.85,
    runSpeed: 2.8,
    walkSpeed: 1.1,
    aggroRange: 12,
    attackRange: 1.5,
    tints: [
      [0.62, 0.82, 0.8],
      [0.5, 0.7, 0.9],
    ],
    tiers: [
      {
        id: 'drowned',
        name: 'Drowned',
        level: 7,
        armorClass: 10,
        damage: d(2, 5, 1),
        ai: 'suicidal',
        recovery: 100,
        gold: d(4, 6),
        drop: { chance: 0.1, level: 2 },
        special: { kind: 'disease', multiplier: 1, level: 1 },
      },
      {
        id: 'drowned-warrior',
        name: 'Drowned Warrior',
        level: 11,
        armorClass: 15,
        damage: d(2, 8, 2),
        ai: 'aggressive',
        recovery: 90,
        gold: d(8, 6),
        drop: { chance: 0.3, level: 2, kind: 'weapon' },
        special: { kind: 'disease', multiplier: 2, level: 2 },
      },
      {
        id: 'drowned-lord',
        name: 'Drowned Lord',
        level: 15,
        armorClass: 19,
        damage: d(3, 8, 3),
        ai: 'aggressive',
        recovery: 80,
        gold: d(14, 6),
        drop: { chance: 0.6, level: 3, kind: 'armor' },
        special: { kind: 'paralyze', multiplier: 1 },
      },
    ],
    uniques: [
      {
        // The Sunken Hall's warden, the third seal's keeper (docs/CAMPAIGN.md step 10).
        id: 'the-drowned-warden',
        name: 'Warden of the Deep',
        tier: 'C',
        level: 14,
        hp: 150,
        armorClass: 19,
        damage: d(3, 8, 3),
        ai: 'aggressive',
        recovery: 80,
        gold: d(30, 6),
        drop: { chance: 0.9, level: 3, kind: 'armor' },
        special: { kind: 'paralyze', multiplier: 2 },
        carries: 'seal-of-the-deep',
      },
      {
        // Behind the First Door (docs/CAMPAIGN.md step 11): the end of Act One.
        id: 'the-sea-king',
        name: 'The Sea King',
        tier: 'C',
        level: 16,
        hp: 220,
        armorClass: 22,
        damage: d(4, 8, 4),
        ai: 'aggressive',
        recovery: 60,
        gold: d(60, 6),
        drop: { chance: 1, level: 3 },
        missile: { kind: 'water', damage: d(6, 4, 6), range: 22 },
        special: { kind: 'paralyze', multiplier: 3 },
      },
    ],
  },
  {
    // The Mire's witches, on the villager-woman's body in moss and rust.
    id: 'witch',
    character: 'villager-woman',
    heightMetres: 1.7,
    runSpeed: 3.2,
    walkSpeed: 1.4,
    aggroRange: 16,
    attackRange: 1.4,
    tints: [
      [0.7, 0.8, 0.6],
      [0.82, 0.6, 0.7],
    ],
    tiers: [
      {
        id: 'hedge-witch',
        name: 'Hedge Witch',
        level: 6,
        armorClass: 9,
        damage: d(1, 6, 1),
        ai: 'wimp',
        recovery: 100,
        gold: d(6, 6),
        drop: { chance: 0.3, level: 2, kind: 'potion' },
        missile: { kind: 'air', damage: d(3, 3, 3), range: 18 },
      },
      {
        id: 'marsh-witch',
        name: 'Marsh Witch',
        level: 10,
        armorClass: 12,
        damage: d(2, 6, 1),
        ai: 'wimp',
        recovery: 90,
        gold: d(10, 6),
        drop: { chance: 0.4, level: 2, kind: 'ring' },
        missile: { kind: 'air', damage: d(5, 3, 5), range: 20 },
        special: { kind: 'asleep', multiplier: 2 },
      },
      {
        id: 'crone',
        name: 'Crone of the Reeds',
        level: 14,
        armorClass: 15,
        damage: d(2, 8, 2),
        ai: 'normal',
        recovery: 80,
        gold: d(14, 6),
        drop: { chance: 0.6, level: 3, kind: 'amulet' },
        missile: { kind: 'air', damage: d(7, 3, 7), range: 22 },
        special: { kind: 'insane', multiplier: 2 },
      },
    ],
  },
  {
    // Hobgoblins, the goblins' big cousins, on the goblin's body in iron grey and ochre.
    id: 'hobgoblin',
    character: 'goblin-scout',
    heightMetres: 1.75,
    runSpeed: 3.6,
    walkSpeed: 1.6,
    aggroRange: 12,
    attackRange: 1.4,
    tints: [
      [0.7, 0.7, 0.72],
      [1.1, 0.9, 0.6],
    ],
    tiers: [
      {
        id: 'hobgoblin',
        name: 'Hobgoblin',
        level: 8,
        armorClass: 12,
        damage: d(2, 6, 1),
        ai: 'normal',
        recovery: 90,
        gold: d(7, 6),
        drop: { chance: 0.2, level: 2, kind: 'weapon' },
      },
      {
        id: 'hobgoblin-brute',
        name: 'Hobgoblin Brute',
        level: 12,
        armorClass: 16,
        damage: d(3, 6, 2),
        ai: 'aggressive',
        recovery: 90,
        gold: d(11, 6),
        drop: { chance: 0.3, level: 3, kind: 'weapon' },
        special: { kind: 'weak', multiplier: 2 },
      },
      {
        id: 'hobgoblin-chief',
        name: 'Hobgoblin Chief',
        level: 16,
        armorClass: 20,
        damage: d(4, 6, 3),
        ai: 'aggressive',
        recovery: 80,
        gold: d(18, 6),
        drop: { chance: 0.6, level: 3, kind: 'armor' },
        special: { kind: 'weak', multiplier: 3 },
      },
    ],
    uniques: [
      {
        // The Undercroft's gatekeeper (docs/CAMPAIGN.md step 11), the hobgoblins' chief of chiefs.
        id: 'hobgoblin-gorrak',
        name: 'Gorrak the Gatekeeper',
        tier: 'C',
        level: 15,
        hp: 160,
        armorClass: 21,
        damage: d(4, 6, 4),
        ai: 'aggressive',
        recovery: 70,
        gold: d(40, 6),
        drop: { chance: 1, level: 3, kind: 'weapon' },
        special: { kind: 'weak', multiplier: 3 },
      },
    ],
  },
];

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(
  [...FAMILIES, ...LATER_FAMILIES].flatMap(familyRecords).map((m) => [m.id, m]),
);

export interface NpcDef {
  id: string;
  name: string;
  character: string;
  /** What they say when tapped, in turn. */
  lines: string[];
  /** A colouring over the shared villager skin, so six townsfolk are not two (DESIGN.md 17.20). */
  tint?: [number, number, number];
}

export const NPCS: Record<string, NpcDef> = {
  'villager-woman': {
    id: 'villager-woman',
    name: 'Maren',
    character: 'villager-woman',
    lines: [
      'Good day to you, travellers. The well is sweet; drink your fill.',
      'Mind the north road. Goblins have been seen below the hills.',
      'The temple keeps a candle lit for those who go to sea.',
    ],
  },
  'villager-man': {
    id: 'villager-man',
    name: 'Old Tobin',
    character: 'villager-man',
    lines: [
      'Bandits took two of my sheep on the coast road. If you are the fighting kind, I would pay.',
      'The coast road runs west to the city, but the bandits hold it now.',
      'My barn has stood through forty winters. Forty-one, if the goblins keep away.',
    ],
  },
  // The town's people (DESIGN.md 17.20): the two villager skins, each tinted its own way.
  reeve: {
    id: 'reeve',
    name: 'Reeve Halloran',
    character: 'villager-man',
    tint: [0.8, 0.84, 1.12],
    lines: ['The town has no soldiers and no gold. It has a reeve, for what that is worth.'],
  },
  fisher: {
    id: 'fisher',
    name: 'Wen',
    character: 'villager-man',
    tint: [0.86, 0.96, 1.04],
    lines: ['Mind the nets.'],
  },
  ida: {
    id: 'ida',
    name: 'Ida',
    character: 'villager-woman',
    tint: [1.16, 0.84, 0.8],
    lines: ['Eggs, cheese, and whatever the boats bring.'],
  },
  anselm: {
    id: 'anselm',
    name: 'Brother Anselm',
    character: 'villager-man',
    tint: [1.0, 0.88, 0.72],
    lines: ['Peace to you.'],
  },
  woodcutter: {
    id: 'woodcutter',
    name: 'Garrick',
    character: 'villager-man',
    tint: [0.84, 1.06, 0.78],
    lines: ['Hold there.'],
  },
  // Harrowmere's people (DESIGN.md 17.21).
  alderman: {
    id: 'alderman',
    name: 'Alderman Pell',
    character: 'villager-man',
    tint: [1.08, 0.92, 0.74],
    lines: ['Harrow is a market town, and the market is mine. Welcome, if you have gold.'],
  },
  herbwife: {
    id: 'herbwife',
    name: 'Mother Hesk',
    character: 'villager-woman',
    tint: [0.8, 0.9, 0.78],
    lines: ['My daughter beats the steel; I only sell it.'],
  },
  drover: {
    id: 'drover',
    name: 'Tam the Drover',
    character: 'villager-man',
    tint: [0.9, 0.82, 0.7],
    lines: ['Three days to Gullhaven with a herd, two without. Mind the road.'],
  },
  novice: {
    id: 'novice',
    name: 'Sister Wyn',
    character: 'villager-woman',
    tint: [0.86, 0.86, 1.0],
    lines: ['The temple is up the lane. The barrows are not a place to be at night.'],
  },
  granger: {
    id: 'granger',
    name: 'Goodman Oswy',
    character: 'villager-man',
    tint: [0.78, 0.96, 0.82],
    lines: ['The Grange has stood since the shire was a wood. It will stand a while yet.'],
  },
};
