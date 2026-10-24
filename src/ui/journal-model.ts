/**
 * Quest log and automap view-models (Phase 5 step 10): the log's entries as rows with the
 * current objective and its progress, and the current level's visited cells scaled to a
 * canvas with the party's cell and heading, and the runtime's marks (people, quests, ways
 * on) placed on the same grid. Pure functions; `journal.ts` draws them.
 */
import { type AutomapLevel, isVisited, visitedCount, worldToCell } from '../game/automap';
import { currentObjective, type QuestDef, type QuestEntry, type QuestLog } from '../game/quests';
import type { GameState } from '../game/state';
import type { MapMark } from './context';

export interface QuestRow {
  id: string;
  title: string;
  text: string;
  done: boolean;
  /** The current objective's text, with the count for a kill objective. */
  objective: string | null;
}

export function objectiveText(entry: QuestEntry, def: QuestDef): string | null {
  const o = currentObjective(entry, def);
  if (!o) return null;
  return o.kind === 'kill' ? `${o.text} (${entry.progress}/${o.count})` : o.text;
}

function questRow(entry: QuestEntry, def: QuestDef | undefined): QuestRow {
  if (!def) {
    return {
      id: entry.id,
      title: entry.id,
      text: '',
      done: entry.state === 'done',
      objective: null,
    };
  }
  return {
    id: entry.id,
    title: def.title,
    text: def.text,
    done: entry.state === 'done',
    objective: objectiveText(entry, def),
  };
}

/** Active quests first, in the order they were taken, then the completed ones. */
export function questRows(
  log: QuestLog,
  defs: Readonly<Record<string, QuestDef>>,
): { active: QuestRow[]; done: QuestRow[] } {
  const rows = log.entries.map((e) => questRow(e, defs[e.id]));
  return { active: rows.filter((r) => !r.done), done: rows.filter((r) => r.done) };
}

export interface MapTransform {
  /** Canvas pixels per cell, a whole number of at least one. */
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Fit the level's grid into the canvas, centred, with whole-pixel cells. */
export function mapTransform(level: AutomapLevel, width: number, height: number): MapTransform {
  const scale = Math.max(1, Math.floor(Math.min(width / level.width, height / level.height)));
  return {
    scale,
    offsetX: Math.floor((width - level.width * scale) / 2),
    offsetY: Math.floor((height - level.height * scale) / 2),
  };
}

export function visitedCells(level: AutomapLevel): [number, number][] {
  const cells: [number, number][] = [];
  for (let cy = 0; cy < level.height; cy++) {
    for (let cx = 0; cx < level.width; cx++) {
      if (isVisited(level, cx, cy)) cells.push([cx, cy]);
    }
  }
  return cells;
}

export interface MapView {
  levelId: string;
  transform: MapTransform;
  cells: [number, number][];
  visited: number;
  total: number;
  /** The party's cell and heading in degrees; null when it is off the grid. */
  party: { cx: number; cy: number; yawDeg: number } | null;
  /** The runtime's marks on the grid, in drawing order (`placeMarks`). */
  marks: PlacedMark[];
}

/** The current level's map for a canvas of the given size, or null when none exists yet. */
export function mapView(
  state: GameState,
  width: number,
  height: number,
  marks: readonly MapMark[] = [],
): MapView | null {
  const level = state.automap.levels[state.level.id];
  if (!level) return null;
  const { cx, cy } = worldToCell(level, state.level.x, state.level.z);
  const inside = cx >= 0 && cy >= 0 && cx < level.width && cy < level.height;
  const transform = mapTransform(level, width, height);
  // North up, as MM6's map and the minimap (DESIGN.md 16.34): the scene's z runs up the page,
  // so a grid row is drawn from the page's foot.
  const up = (row: number): number => level.height - 1 - row;
  return {
    levelId: state.level.id,
    transform,
    cells: visitedCells(level).map(([x, y]): [number, number] => [x, up(y)]),
    visited: visitedCount(level),
    total: level.width * level.height,
    party: inside ? { cx, cy: up(cy), yawDeg: state.level.yawDeg } : null,
    marks: placeMarks(level, transform, marks),
  };
}

/** A map mark placed on the canvas: its centre in whole canvas pixels. */
export interface PlacedMark extends MapMark {
  px: number;
  py: number;
}

/**
 * The marks on the map's canvas, by the transform the cells and the party are drawn with: a
 * scene position `(x, z)` lands `(x - originX) / cellSize` cells across and `(z - originZ) /
 * cellSize` up from the grid's foot (north up), at its own place in the cell (the party's arrow stands at its cell's
 * middle), rounded to a whole pixel. Marks off the level's grid, or not finite, are left off;
 * whether their cells are walked does not matter. Quests are drawn over people over portals,
 * so the list comes back in that order of drawing, last on top; a mark that would cover one
 * drawn before it (a quest giver's pennant on the giver) stands aside, up and to the right,
 * as a flag planted by them.
 */
export function placeMarks(
  level: AutomapLevel,
  transform: MapTransform,
  marks: readonly MapMark[],
): PlacedMark[] {
  const { scale, offsetX, offsetY } = transform;
  const order: Record<MapMark['kind'], number> = { portal: 0, person: 1, quest: 2 };
  const onGrid: PlacedMark[] = [];
  for (const m of marks) {
    if (!Number.isFinite(m.x) || !Number.isFinite(m.z)) continue;
    const u = (m.x - level.originX) / level.cellSize;
    const v = (m.z - level.originZ) / level.cellSize;
    if (u < 0 || v < 0 || u >= level.width || v >= level.height) continue;
    // North up: the scene's z runs up the page.
    onGrid.push({
      ...m,
      px: Math.floor(offsetX + u * scale),
      py: Math.floor(offsetY + (level.height - v) * scale),
    });
  }
  onGrid.sort((a, b) => order[a.kind] - order[b.kind]);
  const placed: PlacedMark[] = [];
  for (const m of onGrid) {
    const covers = (p: PlacedMark): boolean =>
      Math.abs(p.px - m.px) < MARK_SPAN && Math.abs(p.py - m.py) < MARK_SPAN;
    for (let tries = 0; tries < 3 && placed.some(covers); tries++) {
      m.px += MARK_ASIDE[0];
      m.py += MARK_ASIDE[1];
    }
    placed.push(m);
  }
  return placed;
}

/** How near two marks' middles may stand before the later one stands aside, in pixels. */
const MARK_SPAN = 6;
/** Where a mark that would cover another stands instead: clear of a figure seven wide. */
const MARK_ASIDE: readonly [number, number] = [7, -4];

/**
 * The mark a tap at canvas pixel `(x, y)` names: the nearest within `reach` pixels, the one
 * drawn on top when two are as near; null when none is.
 */
export function markAt(
  placed: readonly PlacedMark[],
  x: number,
  y: number,
  reach: number,
): PlacedMark | null {
  let best: PlacedMark | null = null;
  let bestD = reach * reach;
  for (const m of placed) {
    const d = (m.px - x) ** 2 + (m.py - y) ** 2;
    if (d <= bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}
