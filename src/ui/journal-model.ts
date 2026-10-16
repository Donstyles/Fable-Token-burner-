/**
 * Quest log and automap view-models (Phase 5 step 10): the log's entries as rows with the
 * current objective and its progress, and the current level's visited cells scaled to a
 * canvas with the party's cell and heading. Pure functions; `journal.ts` draws them.
 */
import { type AutomapLevel, isVisited, visitedCount, worldToCell } from '../game/automap';
import { currentObjective, type QuestDef, type QuestEntry, type QuestLog } from '../game/quests';
import type { GameState } from '../game/state';

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
}

/** The current level's map for a canvas of the given size, or null when none exists yet. */
export function mapView(state: GameState, width: number, height: number): MapView | null {
  const level = state.automap.levels[state.level.id];
  if (!level) return null;
  const { cx, cy } = worldToCell(level, state.level.x, state.level.z);
  const inside = cx >= 0 && cy >= 0 && cx < level.width && cy < level.height;
  return {
    levelId: state.level.id,
    transform: mapTransform(level, width, height),
    cells: visitedCells(level),
    visited: visitedCount(level),
    total: level.width * level.height,
    party: inside ? { cx, cy, yawDeg: state.level.yawDeg } : null,
  };
}
