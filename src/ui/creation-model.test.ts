import { describe, expect, it } from 'vitest';
import { CREATION_POOL, pointsLeft } from '../game/creation';
import { knightInput, sorcererInput } from '../game/fixtures';
import {
  adjustStat,
  buildParty,
  CLASS_OPTIONS,
  draftErrors,
  errorText,
  initial,
  newDraft,
  setClass,
  setName,
  setSex,
  skillChips,
  statControls,
  togglePick,
} from './creation-model';

describe('drafts', () => {
  it('starts from the class base with the text portrait', () => {
    const d = newDraft();
    expect(d.classId).toBe('knight');
    expect(d.portrait).toBe('text-initial');
    expect(d.skillPicks).toEqual([]);
    expect(pointsLeft(d.classId, d.stats)).toBe(CREATION_POOL);
    expect(CLASS_OPTIONS.map((c) => c.name)).toEqual([
      'Knight',
      'Paladin',
      'Archer',
      'Cleric',
      'Sorcerer',
      'Druid',
    ]);
  });

  it('keeps name and sex across a class change and starts the rest over', () => {
    let d = setSex(setName(newDraft(), 'Alric'), 'female');
    d = adjustStat(d, 'might', 1);
    d = togglePick(d, 'axe');
    const same = setClass(d, 'knight');
    expect(same).toBe(d);
    const s = setClass(d, 'sorcerer');
    expect(s).toMatchObject({ name: 'Alric', sex: 'female', classId: 'sorcerer', skillPicks: [] });
    expect(pointsLeft(s.classId, s.stats)).toBe(CREATION_POOL);
    expect(initial(s.name)).toBe('A');
    expect(initial('  ')).toBe('?');
  });
});

describe('statistics', () => {
  it('steps within the range and the pool, and refunds on lowering', () => {
    let d = newDraft();
    const might = statControls(d)[0]!;
    expect(might).toMatchObject({
      stat: 'might',
      label: 'Might',
      value: 17,
      base: 17,
      min: 12,
      max: 32,
      bonus: 3,
      canRaise: true,
      canLower: true,
    });
    for (let i = 0; i < 20; i++) d = adjustStat(d, 'might', 1);
    expect(d.stats.might).toBe(32);
    expect(statControls(d)[0]!.canRaise).toBe(false);
    expect(pointsLeft(d.classId, d.stats)).toBe(35);
    for (let i = 0; i < 40; i++) d = adjustStat(d, 'luck', -1);
    expect(d.stats.luck).toBe(2);
    expect(statControls(d)[6]!.canLower).toBe(false);
    expect(pointsLeft(d.classId, d.stats)).toBe(40);
    for (let i = 0; i < 100; i++) d = adjustStat(d, 'endurance', 1);
    expect(d.stats.endurance).toBe(30);
    for (let i = 0; i < 100; i++) d = adjustStat(d, 'speed', 1);
    expect(pointsLeft(d.classId, d.stats)).toBe(10);
    for (let i = 0; i < 100; i++) d = adjustStat(d, 'accuracy', 1);
    expect(pointsLeft(d.classId, d.stats)).toBe(0);
    expect(statControls(d).every((c) => !c.canRaise)).toBe(true);
    const before = d;
    expect(adjustStat(d, 'might', 1)).toBe(before);
  });
});

describe('skills', () => {
  it('shows the fixed skills and lets two be picked', () => {
    let d = newDraft();
    const chips = skillChips(d);
    expect(chips.slice(0, 2)).toEqual([
      { id: 'sword', name: 'Sword', fixed: true, picked: true, canPick: false },
      { id: 'leather', name: 'Leather', fixed: true, picked: true, canPick: false },
    ]);
    expect(chips.find((c) => c.id === 'axe')).toMatchObject({
      fixed: false,
      picked: false,
      canPick: true,
    });
    d = togglePick(d, 'axe');
    d = togglePick(d, 'shield');
    expect(d.skillPicks).toEqual(['axe', 'shield']);
    expect(skillChips(d).find((c) => c.id === 'bow')).toMatchObject({ canPick: false });
    expect(togglePick(d, 'bow')).toBe(d);
    expect(togglePick(d, 'sword')).toBe(d);
    d = togglePick(d, 'axe');
    expect(d.skillPicks).toEqual(['shield']);
    expect(skillChips(d).find((c) => c.id === 'bow')).toMatchObject({ canPick: true });
  });
});

describe('errors and the party', () => {
  it('words the rules errors', () => {
    expect(draftErrors(newDraft())).toEqual([
      'Enter a name.',
      '50 points are left to spend.',
      'Pick 2 skills (0 picked).',
    ]);
    expect(errorText({ kind: 'name-too-long', max: 15 })).toBe(
      'The name is longer than 15 letters.',
    );
    expect(errorText({ kind: 'skill-not-allowed', skill: 'plate' })).toBe(
      'Plate is not open to this class.',
    );
    expect(errorText({ kind: 'skill-fixed', skill: 'sword' })).toBe(
      'Sword is already a class skill.',
    );
    expect(errorText({ kind: 'skill-duplicate', skill: 'axe' })).toBe('Axe is picked twice.');
    expect(errorText({ kind: 'pool-overspent', spent: 55, pool: 50 })).toBe(
      '5 points too many are spent.',
    );
    expect(errorText({ kind: 'stat-out-of-range', stat: 'luck', min: 2, max: 22, value: 1 })).toBe(
      'Luck must be between 2 and 22.',
    );
    expect(errorText({ kind: 'portrait-empty' })).toBe('Choose a portrait.');
  });

  it('builds four characters or reports every error', () => {
    const r = buildParty([
      knightInput(),
      sorcererInput(),
      newDraft(),
      { ...knightInput(), name: 'Alric' },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toEqual([]);
    expect(r.errors[2]!.length).toBe(3);
    expect(r.party).toEqual(['Two members are called Alric.']);
    expect(buildParty([knightInput()])).toMatchObject({
      ok: false,
      party: ['The party needs 4 members.'],
    });
    const ok = buildParty([
      knightInput(),
      sorcererInput(),
      { ...knightInput(), name: 'Bram' },
      { ...sorcererInput(), name: 'Cora' },
    ]);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.characters.map((c) => c.name)).toEqual(['Alric', 'Sera', 'Bram', 'Cora']);
    expect(ok.characters[0]!.hp).toBeGreaterThan(0);
  });
});
