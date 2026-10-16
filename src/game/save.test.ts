import { describe, expect, it } from 'vitest';
import { automapLevel, reveal } from './automap';
import { afflict } from './conditions';
import { freshState } from './fixtures';
import { startQuest } from './quests';
import {
  deserialize,
  fromJson,
  migrate,
  SAVE_VERSION,
  serialize,
  toJson,
  validateState,
} from './save';
import { advanceClock } from './time';

function playedState() {
  const state = freshState();
  advanceClock(state.clock, 1234);
  state.gold = 321;
  state.food = 3;
  state.selected = 2;
  state.memberships.push('fire-guild');
  state.flags['met-innkeeper'] = 1;
  afflict(state.party[1]!.conditions, 'poisoned', 100, { severity: 2 });
  afflict(state.party[2]!.conditions, 'afraid', 100, { minutes: 30 });
  state.party[0]!.hp = 12;
  state.party[3]!.sp = 4;
  state.party[3]!.spells.push('fire-bolt');
  state.party[3]!.skills.fire = { level: 3, rank: 'expert' };
  startQuest(state.quests, { id: 'q1', title: 'Q', text: 'T', objectives: [] });
  reveal(
    automapLevel(state.automap, 'showcase', {
      width: 32,
      height: 32,
      cellSize: 1,
      originX: 0,
      originZ: 0,
    }),
    10,
    10,
    3,
  );
  return state;
}

describe('save round trip', () => {
  it('serialises to JSON and back to an equal state', () => {
    const state = playedState();
    const file = serialize(state, 1700000000000);
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.savedAt).toBe(1700000000000);
    expect(file.state).not.toBe(state);
    const loaded = fromJson(toJson(state, 5));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.migrated).toBe(false);
    expect(loaded.state).toEqual(state);
    expect(loaded.state.party[1]!.conditions.poisoned).toEqual({ since: 100, severity: 2 });
    expect(loaded.state.automap.levels['showcase']!.words).toEqual(
      state.automap.levels['showcase']!.words,
    );
    // Loading again is idempotent.
    expect(fromJson(toJson(loaded.state))).toMatchObject({ ok: true });
  });

  it('migrates an older version and refuses a newer one', () => {
    const file = serialize(playedState());
    const old = { ...file, version: 0 };
    expect(migrate(old).version).toBe(SAVE_VERSION);
    const loaded = deserialize(old);
    expect(loaded.ok && loaded.migrated).toBe(true);
    expect(deserialize({ ...file, version: SAVE_VERSION + 1 }).ok).toBe(false);
  });

  it('rejects malformed input as values', () => {
    expect(fromJson('{')).toEqual({ ok: false, error: 'save: not valid JSON' });
    expect(deserialize(null)).toEqual({ ok: false, error: 'save: not an object' });
    expect(deserialize({})).toEqual({ ok: false, error: 'save: no version' });
    expect(deserialize({ version: 1, state: {} })).toEqual({ ok: false, error: 'party: size' });
    const file = serialize(playedState());
    const badClass = JSON.parse(JSON.stringify(file)) as typeof file;
    (badClass.state.party[0] as unknown as { classId: string }).classId = 'ninja';
    expect(deserialize(badClass)).toEqual({ ok: false, error: 'party[0]: class' });
    const badItem = JSON.parse(JSON.stringify(file)) as typeof file;
    (badItem.state.party[0]!.grid.items[0]!.item as unknown as { id: string }).id = 'excalibur';
    expect(deserialize(badItem)).toEqual({ ok: false, error: 'party[0]: unknown item' });
    const badSkill = JSON.parse(JSON.stringify(file)) as typeof file;
    (badSkill.state.party[3]!.skills as Record<string, unknown>)['fire'] = { level: 0, rank: 'x' };
    expect(deserialize(badSkill)).toEqual({ ok: false, error: 'party[3]: skill fire level' });
    const badGold = JSON.parse(JSON.stringify(file)) as typeof file;
    badGold.state.gold = -5;
    expect(deserialize(badGold)).toEqual({ ok: false, error: 'gold' });
    const badSelected = JSON.parse(JSON.stringify(file)) as typeof file;
    badSelected.state.selected = 4;
    expect(validateState(badSelected.state)).toBe('selected');
    expect(validateState(file.state)).toBeNull();
  });
});
