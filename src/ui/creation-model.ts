/**
 * Character creation view-model (Phase 5 step 10): a draft per member over
 * `src/game/creation.ts`'s `CreationInput`, the controls the screen shows (stat rows with
 * their range and the pool, the class's fixed skills and the two picks) and what each tap
 * changes. Drafts are replaced, never mutated. Errors come from the rules as values and are
 * worded here. The portrait is a text initial until the portrait pipeline delivers.
 */
import type { Character, Sex } from '../game/character';
import { CLASSES, classDef, type ClassId } from '../game/classes';
import {
  createCharacter,
  type CreationError,
  type CreationInput,
  defaultCreation,
  pointsLeft,
  SKILL_PICKS,
  statRange,
  validateCreation,
} from '../game/creation';
import { PARTY_SIZE } from '../game/state';
import { SKILL_NAMES, type SkillId } from '../game/skills';
import { type Stat, STATS, statBonus } from '../game/stats';
import { STAT_LABELS } from './sheet-model';

/** Portrait id of the text-initial stand-in. */
export const TEXT_PORTRAIT = 'text-initial';

export const CLASS_OPTIONS: readonly { id: ClassId; name: string }[] = CLASSES.map((id) => ({
  id,
  name: classDef(id).name,
}));

export function newDraft(classId: ClassId = 'knight'): CreationInput {
  return { ...defaultCreation(classId), portrait: TEXT_PORTRAIT };
}

/** The letter shown in the portrait oval. */
export function initial(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

export function setName(d: CreationInput, name: string): CreationInput {
  return { ...d, name };
}

export function setSex(d: CreationInput, sex: Sex): CreationInput {
  return { ...d, sex };
}

/** A new class starts the statistics and the picks over. */
export function setClass(d: CreationInput, classId: ClassId): CreationInput {
  if (classId === d.classId) return d;
  return { ...newDraft(classId), name: d.name, sex: d.sex };
}

export interface StatControl {
  stat: Stat;
  label: string;
  value: number;
  base: number;
  min: number;
  max: number;
  bonus: number;
  canRaise: boolean;
  canLower: boolean;
}

export function statControls(d: CreationInput): StatControl[] {
  const left = pointsLeft(d.classId, d.stats);
  const base = classDef(d.classId).baseStats;
  return STATS.map((stat) => {
    const { min, max } = statRange(d.classId, stat);
    const value = d.stats[stat];
    return {
      stat,
      label: STAT_LABELS[stat],
      value,
      base: base[stat],
      min,
      max,
      bonus: statBonus(value),
      canRaise: value < max && left > 0,
      canLower: value > min,
    };
  });
}

/** One point up or down; the same draft back when the step is not allowed. */
export function adjustStat(d: CreationInput, stat: Stat, delta: 1 | -1): CreationInput {
  const control = statControls(d).find((c) => c.stat === stat);
  if (!control) return d;
  if (delta > 0 ? !control.canRaise : !control.canLower) return d;
  return { ...d, stats: { ...d.stats, [stat]: d.stats[stat] + delta } };
}

export interface SkillChip {
  id: SkillId;
  name: string;
  fixed: boolean;
  picked: boolean;
  canPick: boolean;
}

/** The class's fixed skills, then its options with the picks marked. */
export function skillChips(d: CreationInput): SkillChip[] {
  const cls = classDef(d.classId);
  const full = d.skillPicks.length >= SKILL_PICKS;
  const fixed = cls.fixedSkills.map((id) => ({
    id,
    name: SKILL_NAMES[id],
    fixed: true,
    picked: true,
    canPick: false,
  }));
  const options = cls.optionalSkills.map((id) => {
    const picked = d.skillPicks.includes(id);
    return { id, name: SKILL_NAMES[id], fixed: false, picked, canPick: picked || !full };
  });
  return [...fixed, ...options];
}

export function togglePick(d: CreationInput, skill: SkillId): CreationInput {
  if (d.skillPicks.includes(skill)) {
    return { ...d, skillPicks: d.skillPicks.filter((s) => s !== skill) };
  }
  const chip = skillChips(d).find((c) => c.id === skill);
  if (!chip || !chip.canPick) return d;
  return { ...d, skillPicks: [...d.skillPicks, skill] };
}

export function errorText(e: CreationError): string {
  switch (e.kind) {
    case 'name-empty':
      return 'Enter a name.';
    case 'name-too-long':
      return `The name is longer than ${e.max} letters.`;
    case 'portrait-empty':
      return 'Choose a portrait.';
    case 'stat-out-of-range':
      return `${STAT_LABELS[e.stat]} must be between ${e.min} and ${e.max}.`;
    case 'pool-overspent':
      return `${e.spent - e.pool} points too many are spent.`;
    case 'pool-unspent':
      return `${e.remaining} points are left to spend.`;
    case 'skill-count':
      return `Pick ${e.expected} skills (${e.got} picked).`;
    case 'skill-not-allowed':
      return `${SKILL_NAMES[e.skill]} is not open to this class.`;
    case 'skill-fixed':
      return `${SKILL_NAMES[e.skill]} is already a class skill.`;
    case 'skill-duplicate':
      return `${SKILL_NAMES[e.skill]} is picked twice.`;
  }
}

export function draftErrors(d: CreationInput): string[] {
  return [...new Set(validateCreation(d).map(errorText))];
}

export type PartyCheck =
  { ok: true; characters: Character[] } | { ok: false; errors: string[][]; party: string[] };

/** Create the four characters, or every draft's errors and the party-wide ones. */
export function buildParty(drafts: readonly CreationInput[]): PartyCheck {
  const errors = drafts.map(draftErrors);
  const party: string[] = [];
  if (drafts.length !== PARTY_SIZE) party.push(`The party needs ${PARTY_SIZE} members.`);
  const seen = new Set<string>();
  for (const d of drafts) {
    const name = d.name.trim();
    if (name && seen.has(name)) party.push(`Two members are called ${name}.`);
    seen.add(name);
  }
  if (errors.some((e) => e.length) || party.length) return { ok: false, errors, party };
  const characters: Character[] = [];
  for (const d of drafts) {
    const r = createCharacter(d);
    if (!r.ok) return { ok: false, errors: drafts.map(draftErrors), party };
    characters.push(r.character);
  }
  return { ok: true, characters };
}
