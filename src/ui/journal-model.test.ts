import { describe, expect, it } from 'vitest';
import { automapLevel, reveal } from '../game/automap';
import { freshState } from '../game/fixtures';
import { handleQuestEvent, type QuestDef, startQuest } from '../game/quests';
import { mapTransform, mapView, questRows, visitedCells } from './journal-model';

const QUESTS: Record<string, QuestDef> = {
  rats: {
    id: 'rats',
    title: 'Rats in the Cellar',
    text: 'The innkeeper wants the cellar cleared.',
    objectives: [
      { kind: 'kill', monster: 'rat', count: 3, text: 'Kill the rats' },
      { kind: 'talk', npc: 'innkeeper', text: 'Tell the innkeeper' },
    ],
  },
  letter: {
    id: 'letter',
    title: 'A Letter',
    text: 'Deliver it.',
    objectives: [{ kind: 'deliver', item: 'copper-ring', npc: 'mayor', text: 'Give the ring' }],
  },
};

describe('quest rows', () => {
  it('lists active quests with their objective and progress, then the done ones', () => {
    const state = freshState();
    startQuest(state.quests, QUESTS['rats']!);
    startQuest(state.quests, QUESTS['letter']!);
    startQuest(state.quests, { id: 'lost', title: 'Lost', text: '', objectives: [] });
    handleQuestEvent(state.quests, QUESTS, { kind: 'kill', monster: 'rat' });
    let rows = questRows(state.quests, QUESTS);
    expect(rows.active.map((r) => [r.title, r.objective])).toEqual([
      ['Rats in the Cellar', 'Kill the rats (1/3)'],
      ['A Letter', 'Give the ring'],
      ['lost', null],
    ]);
    expect(rows.done).toEqual([]);
    handleQuestEvent(state.quests, QUESTS, { kind: 'deliver', item: 'copper-ring', npc: 'mayor' });
    rows = questRows(state.quests, QUESTS);
    expect(rows.active).toHaveLength(2);
    expect(rows.done[0]).toEqual({
      id: 'letter',
      title: 'A Letter',
      text: 'Deliver it.',
      done: true,
      objective: null,
    });
  });
});

describe('automap view', () => {
  it('is null until the level has a map', () => {
    expect(mapView(freshState(), 400, 300)).toBeNull();
  });

  it('fits the grid to the canvas and lists the visited cells and the party', () => {
    const state = freshState();
    const level = automapLevel(state.automap, state.level.id, {
      width: 20,
      height: 10,
      cellSize: 2,
      originX: -20,
      originZ: -10,
    });
    expect(mapTransform(level, 400, 300)).toEqual({ scale: 20, offsetX: 0, offsetY: 50 });
    expect(mapTransform(level, 10, 10)).toEqual({ scale: 1, offsetX: -5, offsetY: 0 });
    reveal(level, 10, 6, 0);
    expect(visitedCells(level)).toEqual([[10, 6]]);
    const v = mapView(state, 400, 300);
    expect(v).not.toBeNull();
    expect(v).toMatchObject({
      levelId: 'showcase',
      visited: 1,
      total: 200,
      cells: [[10, 6]],
      party: { cx: 10, cy: 6, yawDeg: 90 },
    });
    state.level.x = 100;
    expect(mapView(state, 400, 300)?.party).toBeNull();
  });
});
