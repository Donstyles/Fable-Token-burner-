import { describe, expect, it } from 'vitest';
import {
  automapLevel,
  cellToWorld,
  createAutomap,
  createAutomapLevel,
  isVisited,
  markVisited,
  reveal,
  revealAt,
  visitedCount,
  worldToCell,
} from './automap';

const spec = { width: 40, height: 30, cellSize: 2, originX: -40, originZ: -30 };

describe('automap', () => {
  it('stores visited cells as bits and ignores the outside', () => {
    const level = createAutomapLevel(spec);
    expect(level.words).toHaveLength(Math.ceil((40 * 30) / 32));
    expect(isVisited(level, 3, 4)).toBe(false);
    expect(markVisited(level, 3, 4)).toBe(true);
    expect(markVisited(level, 3, 4)).toBe(false);
    expect(isVisited(level, 3, 4)).toBe(true);
    expect(markVisited(level, -1, 0)).toBe(false);
    expect(markVisited(level, 40, 0)).toBe(false);
    expect(visitedCount(level)).toBe(1);
    expect(markVisited(level, 39, 29)).toBe(true);
    expect(isVisited(level, 39, 29)).toBe(true);
    for (const w of level.words) expect(w).toBeGreaterThanOrEqual(0);
  });

  it('reveals a disc and counts only new cells', () => {
    const level = createAutomapLevel(spec);
    expect(reveal(level, 20, 15, 0)).toBe(1);
    expect(reveal(level, 20, 15, 1)).toBe(4);
    expect(reveal(level, 20, 15, 2)).toBe(13 - 5);
    expect(reveal(level, 0, 0, 1)).toBe(3);
  });

  it('maps world positions to cells and back', () => {
    const level = createAutomapLevel(spec);
    expect(worldToCell(level, -40, -30)).toEqual({ cx: 0, cy: 0 });
    expect(worldToCell(level, 0, 0)).toEqual({ cx: 20, cy: 15 });
    expect(cellToWorld(level, 20, 15)).toEqual({ x: 1, z: 1 });
    expect(revealAt(level, 0, 0, 4)).toBe(13);
    expect(isVisited(level, 22, 15)).toBe(true);
    expect(isVisited(level, 23, 15)).toBe(false);
  });

  it('keeps one map per level and survives JSON', () => {
    const map = createAutomap();
    const a = automapLevel(map, 'showcase', spec);
    expect(automapLevel(map, 'showcase', spec)).toBe(a);
    reveal(a, 5, 5, 2);
    const copy = JSON.parse(JSON.stringify(map)) as typeof map;
    expect(visitedCount(copy.levels['showcase']!)).toBe(visitedCount(a));
    expect(isVisited(copy.levels['showcase']!, 5, 7)).toBe(true);
  });
});
