/**
 * Spellbook view-model (Phase 5 step 10): the schools a member has learnt as tabs, the known
 * spells of a school with level, cost and whether they can be cast now (and why not), and the
 * cast itself, which pays the points through `src/game/spellbook.ts` and hands the effects to
 * the runtime as a `CastEvent`.
 */
import type { Character } from '../game/character';
import type { Rng } from '../game/rng';
import { MAGIC_SKILLS, type MagicSchool } from '../game/skills';
import { canCast, type CastCheck, castSpell, knownSpellsOfSchool } from '../game/spellbook';
import { type SpellId, type SpellTarget, spellDef } from '../game/spells';
import type { GameState } from '../game/state';
import type { CastEvent } from './context';
import { RANK_LABELS } from './sheet-model';

export const SCHOOL_LABELS: Record<MagicSchool, string> = {
  fire: 'Fire',
  air: 'Air',
  water: 'Water',
  earth: 'Earth',
  spirit: 'Spirit',
  mind: 'Mind',
  body: 'Body',
};

export const TARGET_LABELS: Record<SpellTarget, string> = {
  member: 'one member',
  party: 'the party',
  monster: 'a monster',
  world: 'the surroundings',
};

export interface SchoolTab {
  school: MagicSchool;
  label: string;
  level: number;
  rank: string;
  /** Known spells of the school. */
  count: number;
}

/** The magic schools the member has learnt, in the skill list's order. */
export function schoolTabs(c: Character): SchoolTab[] {
  const tabs: SchoolTab[] = [];
  for (const school of MAGIC_SKILLS) {
    const s = c.skills[school];
    if (!s) continue;
    tabs.push({
      school,
      label: SCHOOL_LABELS[school],
      level: s.level,
      rank: RANK_LABELS[s.rank],
      count: knownSpellsOfSchool(c, school).length,
    });
  }
  return tabs;
}

export interface SpellRow {
  id: SpellId;
  name: string;
  level: number;
  cost: number;
  target: SpellTarget;
  targetLabel: string;
  /** Member spells take the chosen target; the others ignore it. */
  needsTarget: boolean;
  canCast: boolean;
  reason: string | null;
}

export function castReason(c: Character, check: CastCheck): string | null {
  if (check.ok) return null;
  switch (check.reason) {
    case 'unknown':
      return 'Not known.';
    case 'skill':
      return 'The school is not learnt.';
    case 'sp':
      return 'Not enough spell points.';
    case 'condition':
      return `${c.name} cannot act now.`;
  }
}

export function spellRows(c: Character, school: MagicSchool): SpellRow[] {
  return knownSpellsOfSchool(c, school).map((spell) => {
    const check = canCast(c, spell.id);
    const rank = c.skills[school]?.rank ?? 'normal';
    return {
      id: spell.id,
      name: spell.name,
      level: spell.level,
      cost: spell.cost[rank],
      target: spell.target,
      targetLabel: TARGET_LABELS[spell.target],
      needsTarget: spell.target === 'member',
      canCast: check.ok,
      reason: castReason(c, check),
    };
  });
}

export type CastOutcome = { ok: true; event: CastEvent } | { ok: false; message: string };

/** Cast a spell from the book: pays the points and returns the event for the runtime. */
export function cast(
  state: GameState,
  caster: number,
  spell: SpellId,
  target: number,
  rng: Rng,
): CastOutcome {
  const c = state.party[caster];
  if (!c) return { ok: false, message: 'No such member.' };
  const def = spellDef(spell);
  const member = def.target === 'member' ? target : caster;
  const r = castSpell(c, spell, { member, partySize: state.party.length }, rng);
  if (!r.ok) return { ok: false, message: castReason(c, r) ?? 'Cannot cast.' };
  return {
    ok: true,
    event: {
      caster,
      spell,
      target: member,
      cost: r.cost,
      failed: r.failed,
      effects: r.effects,
      source: 'spellbook',
    },
  };
}

export function castMessage(state: GameState, event: CastEvent): string {
  const c = state.party[event.caster];
  const name = c?.name ?? 'Someone';
  const spell = spellDef(event.spell).name;
  if (event.failed) return `${name}'s ${spell} fizzles (${event.cost} spell points lost).`;
  const target = state.party[event.target];
  const on = spellDef(event.spell).target === 'member' && target ? ` on ${target.name}` : '';
  return `${name} casts ${spell}${on}.`;
}
