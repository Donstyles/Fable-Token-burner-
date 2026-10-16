/**
 * Saving and loading (Phase 5 step 9). The whole `GameState` is plain data, so a save is a
 * deep copy under a version number. Loading validates the shape field by field (ids against the
 * tables, numbers finite) and refuses anything else as a value, never an exception; `migrate`
 * is the hook for older versions. Storage (IndexedDB, slots, autosave) is the runtime's job.
 */
import type { AutomapLevel } from './automap';
import type { Character } from './character';
import { isClassId } from './classes';
import { type ConditionSet, isConditionId } from './conditions';
import { EQUIP_SLOTS, type Equipment, type InventoryGrid } from './inventory';
import { isItemId } from './items';
import type { QuestEntry } from './quests';
import { isSkillId, RANKS, type SkillSet } from './skills';
import { isSpellId } from './spells';
import { STATS } from './stats';
import type { GameState } from './state';

export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  /** Wall-clock milliseconds the runtime supplies, 0 when unknown. */
  savedAt: number;
  state: GameState;
}

export type LoadResult =
  { ok: true; state: GameState; migrated: boolean } | { ok: false; error: string };

/** A save file holding a deep copy of the state. */
export function serialize(state: GameState, savedAt = 0): SaveFile {
  return { version: SAVE_VERSION, savedAt, state: JSON.parse(JSON.stringify(state)) as GameState };
}

export function toJson(state: GameState, savedAt = 0): string {
  return JSON.stringify(serialize(state, savedAt));
}

/** Bring an older save up to the current version; nothing to do yet. */
export function migrate(file: SaveFile): SaveFile {
  if (file.version >= SAVE_VERSION) return file;
  return { ...file, version: SAVE_VERSION };
}

export function deserialize(raw: unknown): LoadResult {
  if (!isRecord(raw)) return { ok: false, error: 'save: not an object' };
  if (!isFiniteNumber(raw['version'])) return { ok: false, error: 'save: no version' };
  if (raw['version'] > SAVE_VERSION) {
    return { ok: false, error: `save: version ${raw['version']} is newer than ${SAVE_VERSION}` };
  }
  const file = migrate({
    version: raw['version'],
    savedAt: isFiniteNumber(raw['savedAt']) ? raw['savedAt'] : 0,
    state: raw['state'] as GameState,
  });
  const error = validateState(file.state);
  if (error) return { ok: false, error };
  return { ok: true, state: file.state, migrated: file.version !== raw['version'] };
}

export function fromJson(text: string): LoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'save: not valid JSON' };
  }
  return deserialize(raw);
}

// Validation: each check returns an error message or null.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function check(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

function first(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null;
}

function validateGrid(g: unknown, where: string): string | null {
  if (!isRecord(g)) return `${where}: grid missing`;
  const grid = g as Partial<InventoryGrid>;
  if (!isFiniteNumber(grid.width) || !isFiniteNumber(grid.height)) return `${where}: grid size`;
  if (!Array.isArray(grid.items)) return `${where}: grid items`;
  for (const p of grid.items as unknown[]) {
    if (!isRecord(p) || !isFiniteNumber(p['x']) || !isFiniteNumber(p['y'])) {
      return `${where}: grid item position`;
    }
    const err = validateItem(p['item'], where);
    if (err) return err;
  }
  return null;
}

function validateItem(i: unknown, where: string): string | null {
  if (!isRecord(i) || !isItemId(i['id'])) return `${where}: unknown item`;
  if (typeof i['identified'] !== 'boolean' || typeof i['broken'] !== 'boolean') {
    return `${where}: item flags`;
  }
  return null;
}

function validateEquipment(e: unknown, where: string): string | null {
  if (!isRecord(e)) return `${where}: equipment missing`;
  for (const slot of Object.keys(e)) {
    if (!(EQUIP_SLOTS as readonly string[]).includes(slot)) return `${where}: slot ${slot}`;
    const err = validateItem((e as Equipment)[slot as keyof Equipment], where);
    if (err) return err;
  }
  return null;
}

function validateSkills(s: unknown, where: string): string | null {
  if (!isRecord(s)) return `${where}: skills missing`;
  for (const [id, state] of Object.entries(s as SkillSet)) {
    if (!isSkillId(id)) return `${where}: skill ${id}`;
    if (!isRecord(state) || !isFiniteNumber(state['level']) || state['level'] < 1) {
      return `${where}: skill ${id} level`;
    }
    if (!(RANKS as readonly unknown[]).includes(state['rank'])) return `${where}: skill ${id} rank`;
  }
  return null;
}

function validateConditions(c: unknown, where: string): string | null {
  if (!isRecord(c)) return `${where}: conditions missing`;
  for (const [id, state] of Object.entries(c as ConditionSet)) {
    if (!isConditionId(id) || id === 'good') return `${where}: condition ${id}`;
    if (!isRecord(state) || !isFiniteNumber(state['since'])) return `${where}: condition ${id}`;
  }
  return null;
}

function validateCharacter(v: unknown, index: number): string | null {
  const where = `party[${index}]`;
  if (!isRecord(v)) return `${where}: not an object`;
  const c = v as Partial<Record<keyof Character, unknown>>;
  return first(
    check(isString(c.name) && c.name.length > 0, `${where}: name`),
    check(c.sex === 'male' || c.sex === 'female', `${where}: sex`),
    check(isString(c.portrait), `${where}: portrait`),
    check(isClassId(c.classId), `${where}: class`),
    check(isFiniteNumber(c.level) && c.level >= 1, `${where}: level`),
    check(isFiniteNumber(c.xp) && c.xp >= 0, `${where}: xp`),
    check(isFiniteNumber(c.age), `${where}: age`),
    check(
      isRecord(c.stats) &&
        STATS.every((s) => isFiniteNumber((c.stats as Record<string, unknown>)[s])),
      `${where}: stats`,
    ),
    validateSkills(c.skills, where),
    check(isFiniteNumber(c.skillPoints) && c.skillPoints >= 0, `${where}: skill points`),
    check(isFiniteNumber(c.hp) && isFiniteNumber(c.sp), `${where}: hp/sp`),
    validateConditions(c.conditions, where),
    check(Array.isArray(c.spells) && c.spells.every(isSpellId), `${where}: spells`),
    validateGrid(c.grid, where),
    validateEquipment(c.equipment, where),
  );
}

function validateQuests(q: unknown): string | null {
  if (!isRecord(q) || !Array.isArray(q['entries'])) return 'quests: missing';
  for (const e of q['entries'] as Partial<QuestEntry>[]) {
    if (!isRecord(e) || !isString(e.id)) return 'quests: entry id';
    if (e.state !== 'active' && e.state !== 'done') return `quests: ${e.id} state`;
    if (!isFiniteNumber(e.step) || !isFiniteNumber(e.progress)) return `quests: ${e.id} step`;
  }
  return null;
}

function validateAutomap(a: unknown): string | null {
  if (!isRecord(a) || !isRecord(a['levels'])) return 'automap: missing';
  for (const [id, level] of Object.entries(a['levels'] as Record<string, unknown>)) {
    const l = level as Partial<AutomapLevel>;
    if (
      !isRecord(l) ||
      !isFiniteNumber(l.width) ||
      !isFiniteNumber(l.height) ||
      !isFiniteNumber(l.cellSize) ||
      !isFiniteNumber(l.originX) ||
      !isFiniteNumber(l.originZ) ||
      !Array.isArray(l.words) ||
      !l.words.every(isFiniteNumber)
    ) {
      return `automap: level ${id}`;
    }
  }
  return null;
}

/** The first problem with a state's shape, or null when it is sound. */
export function validateState(v: unknown): string | null {
  if (!isRecord(v)) return 'state: not an object';
  const s = v as Partial<Record<keyof GameState, unknown>>;
  if (!Array.isArray(s.party) || s.party.length < 1 || s.party.length > 4) return 'party: size';
  for (let i = 0; i < s.party.length; i++) {
    const err = validateCharacter(s.party[i], i);
    if (err) return err;
  }
  const level = s.level as Partial<GameState['level']> | undefined;
  return first(
    check(isFiniteNumber(s.seed), 'seed'),
    check(isFiniteNumber(s.selected) && s.selected >= 0 && s.selected < s.party.length, 'selected'),
    check(isFiniteNumber(s.gold) && s.gold >= 0, 'gold'),
    check(isFiniteNumber(s.food) && s.food >= 0, 'food'),
    check(isRecord(s.clock) && isFiniteNumber(s.clock['minutes']), 'clock'),
    validateQuests(s.quests),
    validateAutomap(s.automap),
    check(
      isRecord(level) &&
        isString(level.id) &&
        isFiniteNumber(level.x) &&
        isFiniteNumber(level.y) &&
        isFiniteNumber(level.z) &&
        isFiniteNumber(level.yawDeg),
      'level',
    ),
    check(Array.isArray(s.memberships) && s.memberships.every(isString), 'memberships'),
    check(isRecord(s.flags) && Object.values(s.flags).every(isFiniteNumber), 'flags'),
  );
}
