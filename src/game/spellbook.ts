/**
 * The spellbook (Phase 5 step 6): learning spells and casting them. A spell is learnt from a
 * book (guild or found) when the character's class can learn the school, the school skill is
 * learnt and its rank meets the spell's tier (`rankForSpellLevel`). Casting needs the spell
 * known, the school skill, enough spell points and a character able to act; a Cursed caster
 * fails half the time (MM6) and still pays. The cast returns the effects for the runtime to
 * perform. Spell points come back only with rest (MM6 has no natural regeneration).
 */
import { canActNow, type Character } from './character';
import { canLearn, classDef } from './classes';
import { failChance } from './conditions';
import type { Rng } from './rng';
import { hasSkill, type MagicSchool, rankAtLeast, type SkillRank } from './skills';
import {
  applySpell,
  rankForSpellLevel,
  spellCost,
  spellDef,
  type SpellDef,
  type SpellEffect,
  type SpellId,
} from './spells';

export type LearnResult =
  { ok: true } | { ok: false; reason: 'known' | 'class' | 'skill' | 'rank' };

export function knowsSpell(c: Character, id: SpellId): boolean {
  return c.spells.includes(id);
}

export function canLearnSpell(c: Character, id: SpellId): LearnResult {
  const spell = spellDef(id);
  if (knowsSpell(c, id)) return { ok: false, reason: 'known' };
  if (!canLearn(classDef(c.classId), spell.school)) return { ok: false, reason: 'class' };
  const skill = c.skills[spell.school];
  if (!skill) return { ok: false, reason: 'skill' };
  if (!rankAtLeast(skill.rank, rankForSpellLevel(spell.level))) {
    return { ok: false, reason: 'rank' };
  }
  return { ok: true };
}

export function learnSpell(c: Character, id: SpellId): LearnResult {
  const r = canLearnSpell(c, id);
  if (r.ok) c.spells.push(id);
  return r;
}

export type CastCheck =
  | { ok: true; cost: number; skill: number; rank: SkillRank }
  | { ok: false; reason: 'unknown' | 'skill' | 'sp' | 'condition' };

export function canCast(c: Character, id: SpellId): CastCheck {
  const spell = spellDef(id);
  if (!knowsSpell(c, id)) return { ok: false, reason: 'unknown' };
  const skill = c.skills[spell.school];
  if (!skill || !hasSkill(c.skills, spell.school)) return { ok: false, reason: 'skill' };
  if (!canActNow(c)) return { ok: false, reason: 'condition' };
  const cost = spellCost(spell, skill.rank);
  if (c.sp < cost) return { ok: false, reason: 'sp' };
  return { ok: true, cost, skill: skill.level, rank: skill.rank };
}

export interface CastTarget {
  /** Index of the member targeted (or the caster) and the party size, for member spells. */
  member: number;
  partySize: number;
}

export type CastResult =
  | { ok: true; cost: number; failed: boolean; effects: SpellEffect[] }
  | { ok: false; reason: 'unknown' | 'skill' | 'sp' | 'condition' };

/** Cast a known spell: pays the cost, rolls the Cursed failure, returns the effects. */
export function castSpell(c: Character, id: SpellId, target: CastTarget, rng: Rng): CastResult {
  const check = canCast(c, id);
  if (!check.ok) return check;
  c.sp -= check.cost;
  const chance = failChance(c.conditions);
  if (chance > 0 && rng() < chance)
    return { ok: true, cost: check.cost, failed: true, effects: [] };
  const effects = applySpell(spellDef(id), {
    skill: check.skill,
    rank: check.rank,
    member: target.member,
    partySize: target.partySize,
  });
  return { ok: true, cost: check.cost, failed: false, effects };
}

/** Spells of one school the character knows, in level order. */
export function knownSpellsOfSchool(c: Character, school: MagicSchool): SpellDef[] {
  return c.spells
    .map(spellDef)
    .filter((s) => s.school === school)
    .sort((a, b) => a.level - b.level);
}
