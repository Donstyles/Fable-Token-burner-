/**
 * Spells (Phase 5 step 6). Pure data: each spell has its MM6 school and level (1 to 11), a
 * spell-point cost per rank and an effect function that turns the caster's skill into effects
 * for the runtime to perform (light, heal, cure, projectile, buff, stun, jump). The list covers
 * the slice (Torch Light, Water Walk, Jump, Heal, Fire Bolt, Sparks, Stun, Protection from
 * Fire, Bless, Cure Wounds, Awaken), every school's first spell, and the MM6 cure for each
 * condition. Simplifications, all ours until the MM6 tables are confirmed: the cost is the
 * spell level at every rank (MM6 lowers some costs at Expert and Master); durations are an hour
 * plus five game minutes per skill point, MM6's common pattern; "Heal" is MM6's First Aid;
 * damage dice are our estimates. A spell of level 1 to 4 needs Normal rank in its school, 5 to
 * 8 Expert, 9 to 11 Master (MM6's guild tiers).
 */
import type { ConditionId } from './conditions';
import type { Dice } from './rng';
import { type MagicSchool, RANK_MULTIPLIER, rankIndex, type SkillRank } from './skills';
import type { Stat } from './stats';

export const SPELL_IDS = [
  'torch-light',
  'protection-from-fire',
  'fire-bolt',
  'wizard-eye',
  'sparks',
  'jump',
  'awaken',
  'water-walk',
  'stun',
  'stone-to-flesh',
  'spirit-arrow',
  'bless',
  'remove-curse',
  'raise-dead',
  'resurrection',
  'meditation',
  'remove-fear',
  'cure-paralysis',
  'cure-insanity',
  'cure-weakness',
  'heal',
  'cure-wounds',
  'cure-poison',
  'cure-disease',
] as const;
export type SpellId = (typeof SPELL_IDS)[number];

export type SpellTarget = 'member' | 'party' | 'monster' | 'world';

export type BuffStat =
  | Stat
  | 'attack'
  | 'armorClass'
  | 'resistFire'
  | 'resistAir'
  | 'resistWater'
  | 'resistEarth'
  | 'resistMind'
  | 'resistBody';

export type PartyBuff = 'water-walk' | 'wizard-eye';

/** Durations are game minutes (the clock's unit); stun is in real seconds, a combat value. */
export type SpellEffect =
  | { kind: 'light'; power: number; minutes: number }
  | { kind: 'heal'; amount: number; member: number }
  | { kind: 'cure'; condition: ConditionId; member: number }
  | { kind: 'afflict'; condition: ConditionId; member: number; minutes?: number }
  | { kind: 'projectile'; damage: Dice; count: number; element: MagicSchool }
  | { kind: 'buff'; stat: BuffStat; amount: number; minutes: number; member: number }
  | { kind: 'party-buff'; buff: PartyBuff; power: number; minutes: number }
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

function flat(level: number): Record<SkillRank, number> {
  return { normal: level, expert: level, master: level };
}

/** An hour plus five minutes per skill point. */
export function buffMinutes(skill: number): number {
  return 60 + 5 * skill;
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
    cost: flat(level),
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
    cost: flat(1),
    target: 'world',
    effects: (ctx) => [{ kind: 'light', power: rankIndex(ctx.rank) + 1, minutes: 60 * ctx.skill }],
  },
  'protection-from-fire': {
    id: 'protection-from-fire',
    name: 'Protection from Fire',
    school: 'fire',
    level: 3,
    cost: flat(3),
    target: 'party',
    effects: (ctx) =>
      members(ctx).map((m) => ({
        kind: 'buff',
        stat: 'resistFire',
        amount: ctx.skill * RANK_MULTIPLIER[ctx.rank],
        minutes: buffMinutes(ctx.skill),
        member: m,
      })),
  },
  'fire-bolt': {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    school: 'fire',
    level: 4,
    cost: flat(4),
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
    cost: flat(1),
    target: 'world',
    effects: (ctx) => [
      {
        kind: 'party-buff',
        buff: 'wizard-eye',
        power: rankIndex(ctx.rank) + 1,
        minutes: 60 * ctx.skill,
      },
    ],
  },
  sparks: {
    id: 'sparks',
    name: 'Sparks',
    school: 'air',
    level: 4,
    cost: flat(4),
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
    cost: flat(8),
    target: 'world',
    effects: () => [{ kind: 'jump', heightMetres: 2 }],
  },
  awaken: cureSpell('awaken', 'Awaken', 'water', 1, 'asleep', expertParty),
  'water-walk': {
    id: 'water-walk',
    name: 'Water Walk',
    school: 'water',
    level: 5,
    cost: flat(5),
    target: 'world',
    effects: (ctx) => [
      { kind: 'party-buff', buff: 'water-walk', power: 1, minutes: 10 * ctx.skill },
    ],
  },
  stun: {
    id: 'stun',
    name: 'Stun',
    school: 'earth',
    level: 1,
    cost: flat(1),
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
    cost: flat(1),
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
  bless: {
    id: 'bless',
    name: 'Bless',
    school: 'spirit',
    level: 2,
    cost: flat(2),
    target: 'member',
    effects: (ctx) =>
      masterParty(ctx).map((m) => ({
        kind: 'buff',
        stat: 'attack',
        amount: 5 + ctx.skill,
        minutes: buffMinutes(ctx.skill),
        member: m,
      })),
  },
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
    cost: flat(11),
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
    cost: flat(1),
    target: 'member',
    effects: (ctx) =>
      masterParty(ctx).flatMap((m) =>
        (['intellect', 'personality'] as const).map((stat) => ({
          kind: 'buff' as const,
          stat,
          amount: 5 + ctx.skill,
          minutes: buffMinutes(ctx.skill),
          member: m,
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
    cost: flat(2),
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
    cost: flat(5),
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
  'cure-disease': cureSpell('cure-disease', 'Cure Disease', 'body', 10, 'diseased'),
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
