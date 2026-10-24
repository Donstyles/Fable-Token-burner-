import { describe, expect, it } from 'vitest';
import { automapLevel, reveal } from '../game/automap';
import { freshState } from '../game/fixtures';
import { handleQuestEvent, type QuestDef, startQuest } from '../game/quests';
import {
  mapTransform,
  mapView,
  markAt,
  placeMarks,
  questRows,
  visitedCells,
} from './journal-model';

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
    // North up: row 6 of ten from the grid's corner is drawn fourth from the page's top.
    expect(v).toMatchObject({
      levelId: 'showcase',
      visited: 1,
      total: 200,
      cells: [[10, 3]],
      party: { cx: 10, cy: 3, yawDeg: 90 },
    });
    state.level.x = 100;
    expect(mapView(state, 400, 300)?.party).toBeNull();
  });
});

describe('map marks', () => {
  // The harness's grid: 8 m cells, the origin at the level's corner in scene coordinates.
  const spec = { width: 80, height: 80, cellSize: 8, originX: -320, originZ: -320 };

  it('lands a mark where the party would stand at the same scene position', () => {
    const state = freshState();
    const level = automapLevel(state.automap, state.level.id, spec);
    const t = mapTransform(level, 720, 300);
    expect(t).toEqual({ scale: 3, offsetX: 240, offsetY: 30 });
    // The party at (x, z) is drawn in cell ((x - originX) / 8, (z - originZ) / 8), north up.
    state.level.x = 4;
    state.level.z = -100;
    const v = mapView(state, 720, 300, [{ x: 4, z: -100, kind: 'person', label: 'Maren' }]);
    expect(v?.party).toMatchObject({ cx: 40, cy: 52 });
    // (4 + 320) / 8 = 40.5 cells across and (-100 + 320) / 8 = 27.5 up from the grid's foot,
    // 52.5 down from its top, three pixels a cell from the offset, on a whole pixel: where
    // the party's arrow stands (its cell's middle, 361.5 by 187.5) to within a pixel.
    expect(v?.marks).toEqual([{ x: 4, z: -100, kind: 'person', label: 'Maren', px: 361, py: 187 }]);
    const arrow = { x: 240 + (40 + 0.5) * 3, y: 30 + (52 + 0.5) * 3 };
    expect(Math.abs(arrow.x - v!.marks[0]!.px)).toBeLessThan(1);
    expect(Math.abs(arrow.y - v!.marks[0]!.py)).toBeLessThan(1);
  });

  it('keeps marks on cells not yet walked, drops those off the grid, quests on top', () => {
    const state = freshState();
    const level = automapLevel(state.automap, state.level.id, spec);
    expect(visitedCells(level)).toEqual([]);
    const t = mapTransform(level, 720, 300);
    const placed = placeMarks(level, t, [
      { x: 0, z: 0, kind: 'quest', label: 'Old Tobin' },
      { x: 0, z: 0, kind: 'person', label: 'Old Tobin' },
      { x: -320, z: -320, kind: 'portal', label: 'The Old Halls' },
      { x: 320, z: 0, kind: 'person', label: 'Past the east edge' },
      { x: 0, z: -321, kind: 'person', label: 'Past the south edge' },
      { x: Number.NaN, z: 0, kind: 'person', label: 'Nowhere' },
    ]);
    // Tobin's pennant stands beside him rather than over him.
    expect(placed.map((m) => [m.kind, m.label, m.px, m.py])).toEqual([
      ['portal', 'The Old Halls', 240, 270],
      ['person', 'Old Tobin', 360, 150],
      ['quest', 'Old Tobin', 367, 146],
    ]);
  });

  it('names the nearest mark within reach of a tap, the one on top when tied', () => {
    const state = freshState();
    const level = automapLevel(state.automap, state.level.id, spec);
    const placed = placeMarks(level, mapTransform(level, 720, 300), [
      { x: 0, z: 0, kind: 'person', label: 'Maren' },
      { x: 0, z: 0, kind: 'quest', label: 'Maren: the goblins' },
      { x: 80, z: 0, kind: 'portal', label: 'The cave' },
    ]);
    // Maren at (360, 150), her pennant beside her at (367, 146), the cave at (390, 150).
    expect(markAt(placed, 361, 151, 14)?.label).toBe('Maren');
    expect(markAt(placed, 367, 145, 14)?.label).toBe('Maren: the goblins');
    expect(markAt(placed, 388, 150, 14)?.label).toBe('The cave');
    expect(markAt(placed, 380, 150, 14)?.label).toBe('The cave');
    expect(markAt(placed, 360, 180, 14)).toBeNull();
    // Two of a kind at one place: the later, drawn on top, is named when the tap is as near.
    const twins = placeMarks(level, mapTransform(level, 720, 300), [
      { x: 0, z: 0, kind: 'portal', label: 'Down' },
      { x: 0, z: 0, kind: 'portal', label: 'Up' },
    ]);
    expect(twins.map((m) => [m.label, m.px, m.py])).toEqual([
      ['Down', 360, 150],
      ['Up', 367, 146],
    ]);
    expect(markAt(twins, 363.5, 148, 14)?.label).toBe('Up');
    expect(markAt([], 0, 0, 14)).toBeNull();
  });
});
