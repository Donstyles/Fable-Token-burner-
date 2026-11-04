/**
 * Spells (Phase 5 step 6). Pure data: each spell has its MM6 school and level (1 to 11), a
 * spell-point cost per rank and an effect function that turns the caster's skill into effects
 * for the runtime to perform (heal, cure, projectile, buff, stun, jump). The list covers the
 * slice (Torch Light, Water Walk, Jump, Heal, Fire Bolt, Sparks, Stun, the Protections, Bless,
 * Heroism, Haste, Stone Skin, Cure Wounds, Awaken), every school's first spell, and the MM6 cure
 * for each condition. Costs are MM6's by spell level, 1, 2, 3, 4, 5, 8, 10, 15, 20, 25 and 30,
 * with Spirit Arrow at 1 / 1 / 0 by rank (MM6-GAPS.md 7, RPGC). The buffs follow MM6's spell
 * table (docs/gaps/magic.md 4, SPL): Bless, Heroism and Stone Skin +5 + s on one member for an
 * hour and five minutes a skill point, the party from Expert, an hour and fifteen minutes a
 * point at Master; Haste one member for an hour and a minute a point, the party from Expert,
 * three minutes a point at Master, and Weak when it ends; the Protections s, 2s or 3s by rank
 * for an hour a point; Torch Light 1, 2 or 3 by rank for an hour a point; Meditation +10 + 2s
 * (3s from Expert) for an hour a point, the party at Master. Simplifications, ours until the
 * MM6 tables are confirmed: "Heal" is MM6's First Aid; damage dice are our estimates. A spell
 * of level 1 to 4 needs Normal rank in its school, 5 to 8 Expert, 9 to 11 Master (MM6's guild
 * tiers).
 */
import type { MemberBuffId, PartyBuffId } from './buffs';
import type { ConditionId } from './conditions';
import type { Dice } from './rng';
import { type MagicSchool, RANK_MULTIPLIER, rankIndex, type SkillRank } from './skills';

export const SPELL_IDS = [
  'torch-light',
  'protection-from-fire',
  'fire-bolt',
  'haste',
  'wizard-eye',
  'protection-from-electricity',
  'sparks',
  'jump',
  'awaken',
  'protection-from-cold',
  'water-walk',
  'stun',
  'protection-from-magic',
  'stone-skin',
  'stone-to-flesh',
  'spirit-arrow',
  'bless',
  'remove-curse',
  'heroism',
  'raise-dead',
  'resurrection',
  'meditation',
  'remove-fear',
  'cure-paralysis',
  'cure-insanity',
  'cure-weakness',
  'heal',
  'protection-from-poison',
  'cure-wounds',
  'cure-poison',
  'cure-disease',
] as const;
export type SpellId = (typeof SPELL_IDS)[number];

export type SpellTarget = 'member' | 'party' | 'monster' | 'world';

/**
 * Durations are game minutes (the clock's unit); stun is in real seconds, a combat value. A
 * buff goes into the store (buffs.ts) with its power and the caster's skill.
 */
export type SpellEffect =
  | { kind: 'heal'; amount: number; member: number }
  | { kind: 'cure'; condition: ConditionId; member: number }
  | { kind: 'afflict'; condition: ConditionId; member: number; minutes?: number }
  | { kind: 'projectile'; damage: Dice; count: number; element: MagicSchool }
  | {
      kind: 'buff';
      buff: MemberBuffId;
      power: number;
      minutes: number;
      member: number;
      skill: number;
    }
  | { kind: 'party-buff'; buff: PartyBuffId; power: number; minutes: number; skill: number }
  | { kind: 'stun'; seconds: number; knockbackMetres: number }
  | { kind: 'jump'; heightMetres: number };

export interface SpellContext {
  skill: number;
  rank: SkillRank;
  /** Index of the targeted member, or of the caster for self spells. */
  member: number;
  partySize: number;
}

export interface SpellDef {
  id: SpellId;
  name: string;
  school: MagicSchool;
  level: number;
  cost: Record<SkillRank, number>;
  target: SpellTarget;
  effects(ctx: SpellContext): SpellEffect[];
}

/** Rank a school must have for a spell of this level: MM6's guild tiers. */
export function rankForSpellLevel(level: number): SkillRank {
  if (level <= 4) return 'normal';
  if (level <= 8) return 'expert';
  return 'master';
}

/**
 * Spell points by spell level in the seven common schools, the same at every rank
 * (MM6-GAPS.md 7, RPGC): index 0 is level 1.
 */
export const SPELL_COST_BY_LEVEL: readonly number[] = [1, 2, 3, 4, 5, 8, 10, 15, 20, 25, 30];

/** MM6's cost for a spell of `level`, at every rank. */
function levelCost(level: number): Record<SkillRank, number> {
  const cost = SPELL_COST_BY_LEVEL[level - 1] ?? level;
  return { normal: cost, expert: cost, master: cost };
}

/** An hour plus five minutes per skill point: MM6's common span at Normal and Expert. */
export function buffMinutes(skill: number): number {
  return 60 + 5 * skill;
}

/**
 * A member buff of the Bless kind (SPL): +5 + s on one member for an hour and five minutes a
 * skill point, the party from Expert, and an hour and fifteen minutes a point at Master.
 * Haste runs an hour and one minute a point, three at Master (`minutesPerPoint`).
 */
function memberBuffSpell(
  id: SpellId,
  name: string,
  school: MagicSchool,
  level: number,
  buff: MemberBuffId,
  minutesPerPoint: [normal: number, master: number] = [5, 15],
): SpellDef {
  return {
    id,
    name,
    school,
    level,
    cost: levelCost(level),
    target: 'member',
    effects: (ctx) =>
      expertParty(ctx).map((m) => ({
        kind: 'buff',
        buff,
        power: 5 + ctx.skill,
        minutes: 60 + (ctx.rank === 'master' ? minutesPerPoint[1] : minutesPerPoint[0]) * ctx.skill,
        member: m,
        skill: ctx.skill,
      })),
  };
}

/** A Protection (SPL; MAN): the party's resistance rises by s, 2s or 3s by rank for an hour a point. */
function protectionSpell(
  id: SpellId,
  name: string,
  school: MagicSchool,
  buff: PartyBuffId,
): SpellDef {
  return {
    id,
    name,
    school,
    level: 3,
    cost: levelCost(3),
    target: 'party',
    effects: (ctx) => [
      {
        kind: 'party-buff',
        buff,
        power: ctx.skill * RANK_MULTIPLIER[ctx.rank],
        minutes: 60 * ctx.skill,
        skill: ctx.skill,
      },
    ],
  };
}

function members(ctx: SpellContext): number[] {
  return Array.from({ length: ctx.partySize }, (_, i) => i);
}

/** Normal and Expert reach one member, Master the party. */
function masterParty(ctx: SpellContext): number[] {
  return ctx.rank === 'master' ? members(ctx) : [ctx.member];
}

/** Normal reaches one member, Expert and Master the party. */
function expertParty(ctx: SpellContext): number[] {
  return ctx.rank === 'normal' ? [ctx.member] : members(ctx);
}

function cureSpell(
  id: SpellId,
  name: string,
  school: MagicSchool,
  level: number,
  condition: ConditionId,
  reach: (ctx: SpellContext) => number[] = (ctx) => [ctx.member],
  after: (member: number) => SpellEffect[] = () => [],
): SpellDef {
  return {
    id,
    name,
    school,
    level,
    cost: levelCost(level),
    target: 'member',
    effects: (ctx) =>
      reach(ctx).flatMap((m) => [{ kind: 'cure', condition, member: m }, ...after(m)]),
  };
}

const weakAfter = (member: number): SpellEffect[] => [
  { kind: 'afflict', condition: 'weak', member },
];

export const SPELLS: Record<SpellId, SpellDef> = {
  'torch-light': {
    id: 'torch-light',
    name: 'Torch Light',
    school: 'fire',
    level: 1,
    cost: levelCost(1),
    target: 'world',
    effects: (ctx) => [
      {
        kind: 'party-buff',
        buff: 'torch-light',
        power: rankIndex(ctx.rank) + 1,
        minutes: 60 * ctx.skill,
        skill: ctx.skill,
      },
    ],
  },
  'protection-from-fire': protectionSpell(
    'protection-from-fire',
    'Protection from Fire',
    'fire',
    'protection-fire',
  ),
  haste: memberBuffSpell('haste', 'Haste', 'fire', 5, 'haste', [1, 3]),
  'protection-from-electricity': protectionSpell(
    'protection-from-electricity',
    'Protection from Electricity',
    'air',
    'protection-electricity',
  ),
  'protection-from-cold': protectionSpell(
    'protection-from-cold',
    'Protection from Cold',
    'water',
    'protection-cold',
  ),
  'protection-from-magic': protectionSpell(
    'protection-from-magic',
    'Protection from Magic',
    'earth',
    'protection-magic',
  ),
  'stone-skin': memberBuffSpell('stone-skin', 'Stone Skin', 'earth', 5, 'stone-skin'),
  heroism: memberBuffSpell('heroism', 'Heroism', 'spirit', 7, 'heroism'),
  'protection-from-poison': protectionSpell(
    'protection-from-poison',
    'Protection from Poison',
    'body',
    'protection-poison',
  ),
  'fire-bolt': {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    school: 'fire',
    level: 4,
    cost: levelCost(4),
    target: 'monster',
    effects: (ctx) => [
      {
        kind: 'projectile',
        damage: { count: ctx.skill, sides: 3, bonus: ctx.skill },
        count: 1,
        element: 'fire',
      },
    ],
  },
  'wizard-eye': {
    id: 'wizard-eye',
    name: 'Wizard Eye',
    school: 'air',
    level: 1,
    cost: levelCost(1),
    target: 'world',
    effects: (ctx) => [
      {
        kind: 'party-buff',
        buff: 'wizard-eye',
        power: rankIndex(ctx.rank) + 1,
        minutes: 60 * ctx.skill,
        skill: ctx.skill,
      },
    ],
  },
  sparks: {
    id: 'sparks',
    name: 'Sparks',
    school: 'air',
    level: 4,
    cost: levelCost(4),
    target: 'monster',
    effects: (ctx) => [
      {
        kind: 'projectile',
        damage: { count: 1, sides: 3, bonus: ctx.skill },
        count: 3 + 2 * rankIndex(ctx.rank),
        element: 'air',
      },
    ],
  },
  jump: {
    id: 'jump',
    name: 'Jump',
    school: 'air',
    level: 8,
    cost: levelCost(8),
    target: 'world',
    effects: () => [{ kind: 'jump', heightMetres: 2 }],
  },
  awaken: cureSpell('awaken', 'Awaken', 'water', 1, 'asleep', expertParty),
  'water-walk': {
    id: 'water-walk',
    name: 'Water Walk',
    school: 'water',
    level: 5,
    cost: levelCost(5),
    target: 'world',
    effects: (ctx) => [
      {
        kind: 'party-buff',
        buff: 'water-walk',
        power: 1,
        minutes: 10 * ctx.skill,
        skill: ctx.skill,
      },
    ],
  },
  stun: {
    id: 'stun',
    name: 'Stun',
    school: 'earth',
    level: 1,
    cost: levelCost(1),
    target: 'monster',
    effects: (ctx) => [
      { kind: 'stun', seconds: 1 + rankIndex(ctx.rank), knockbackMetres: 1 + rankIndex(ctx.rank) },
    ],
  },
  'stone-to-flesh': cureSpell('stone-to-flesh', 'Stone to Flesh', 'earth', 7, 'stoned'),
  'spirit-arrow': {
    id: 'spirit-arrow',
    name: 'Spirit Arrow',
    school: 'spirit',
    level: 1,
    // MM6-GAPS.md 7, RPGC: free at Master.
    cost: { normal: 1, expert: 1, master: 0 },
    target: 'monster',
    effects: (ctx) => [
      {
        kind: 'projectile',
        damage: { count: 1, sides: 3, bonus: ctx.skill },
        count: 1,
        element: 'spirit',
      },
    ],
  },
  bless: memberBuffSpell('bless', 'Bless', 'spirit', 2, 'bless'),
  'remove-curse': cureSpell('remove-curse', 'Remove Curse', 'spirit', 5, 'cursed'),
  'raise-dead': cureSpell(
    'raise-dead',
    'Raise Dead',
    'spirit',
    9,
    'dead',
    (ctx) => [ctx.member],
    weakAfter,
  ),
  resurrection: {
    id: 'resurrection',
    name: 'Resurrection',
    school: 'spirit',
    level: 11,
    cost: levelCost(11),
    target: 'member',
    effects: (ctx) => [
      { kind: 'cure', condition: 'eradicated', member: ctx.member },
      { kind: 'cure', condition: 'dead', member: ctx.member },
      ...weakAfter(ctx.member),
    ],
  },
  meditation: {
    id: 'meditation',
    name: 'Meditation',
    school: 'mind',
    level: 1,
    cost: levelCost(1),
    target: 'member',
    // Intellect and Personality +10 + 2s, +10 + 3s from Expert, for an hour a point (SPL; MAN).
    effects: (ctx) =>
      masterParty(ctx).flatMap((m) =>
        (['temp-intellect', 'temp-personality'] as const).map((buff) => ({
          kind: 'buff' as const,
          buff,
          power: 10 + (ctx.rank === 'normal' ? 2 : 3) * ctx.skill,
          minutes: 60 * ctx.skill,
          member: m,
          skill: ctx.skill,
        })),
      ),
  },
  'remove-fear': cureSpell('remove-fear', 'Remove Fear', 'mind', 2, 'afraid', expertParty),
  'cure-paralysis': cureSpell('cure-paralysis', 'Cure Paralysis', 'mind', 5, 'paralyzed'),
  'cure-insanity': cureSpell('cure-insanity', 'Cure Insanity', 'mind', 9, 'insane'),
  'cure-weakness': cureSpell('cure-weakness', 'Cure Weakness', 'body', 1, 'weak'),
  heal: {
    id: 'heal',
    name: 'Heal',
    school: 'body',
    level: 2,
    cost: levelCost(2),
    target: 'member',
    effects: (ctx) => [
      { kind: 'heal', amount: 5 + ctx.skill * RANK_MULTIPLIER[ctx.rank], member: ctx.member },
    ],
  },
  'cure-wounds': {
    id: 'cure-wounds',
    name: 'Cure Wounds',
    school: 'body',
    level: 5,
    cost: levelCost(5),
    target: 'member',
    effects: (ctx) => [
      {
        kind: 'heal',
        amount: 10 + 2 * ctx.skill * RANK_MULTIPLIER[ctx.rank],
        member: ctx.member,
      },
    ],
  },
  'cure-poison': cureSpell('cure-poison', 'Cure Poison', 'body', 6, 'poisoned'),
  // Body's eighth spell in MM6, 15 spell points (MM6-GAPS.md 7, RPGC).
  'cure-disease': cureSpell('cure-disease', 'Cure Disease', 'body', 8, 'diseased'),
};

export function isSpellId(value: unknown): value is SpellId {
  return typeof value === 'string' && (SPELL_IDS as readonly string[]).includes(value);
}

export function spellDef(id: SpellId): SpellDef {
  return SPELLS[id];
}

export function spellsOfSchool(school: MagicSchool): SpellDef[] {
  return SPELL_IDS.map((id) => SPELLS[id])
    .filter((s) => s.school === school)
    .sort((a, b) => a.level - b.level);
}

/** The school's level-1 spell, which a new caster knows from the start. */
export function firstSpellOf(school: MagicSchool): SpellDef | undefined {
  return spellsOfSchool(school).find((s) => s.level === 1);
}

export function spellCost(spell: SpellDef, rank: SkillRank): number {
  return spell.cost[rank];
}

/** The effects of casting `spell` with the given skill; the runtime performs them. */
export function applySpell(spell: SpellDef, ctx: SpellContext): SpellEffect[] {
  return spell.effects(ctx);
}
