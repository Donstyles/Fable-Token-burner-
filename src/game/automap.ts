/**
 * The automap (Phase 5 step 8). Each level keeps a bitset of visited cells over a 2D grid laid
 * on the ground plane; the party reveals a disc around itself as it walks. Grids are small
 * (a cell per metre or two), stored as 32-bit words in plain arrays so they serialise as JSON.
 * MM6 reveals what the party has seen; we reveal what it has walked near, a simplification until
 * the renderer can report visibility.
 */
export interface AutomapLevel {
  width: number;
  height: number;
  /** Metres per cell. */
  cellSize: number;
  /** World position of cell (0, 0)'s corner. */
  originX: number;
  originZ: number;
  /** Visited bits, 32 per word, row-major. */
  words: number[];
}

export interface AutomapLevelSpec {
  width: number;
  height: number;
  cellSize: number;
  originX: number;
  originZ: number;
}

export function createAutomapLevel(spec: AutomapLevelSpec): AutomapLevel {
  const n = Math.ceil((spec.width * spec.height) / 32);
  return { ...spec, words: new Array<number>(n).fill(0) };
}

export function inBounds(level: AutomapLevel, cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < level.width && cy < level.height;
}

export function isVisited(level: AutomapLevel, cx: number, cy: number): boolean {
  if (!inBounds(level, cx, cy)) return false;
  const i = cy * level.width + cx;
  return ((level.words[i >> 5]! >>> (i & 31)) & 1) === 1;
}

/** Mark one cell; true when it was not visited before. */
export function markVisited(level: AutomapLevel, cx: number, cy: number): boolean {
  if (!inBounds(level, cx, cy) || isVisited(level, cx, cy)) return false;
  const i = cy * level.width + cx;
  level.words[i >> 5] = (level.words[i >> 5]! | (1 << (i & 31))) >>> 0;
  return true;
}

/** Reveal a disc of `radius` cells around (cx, cy); returns how many cells were new. */
export function reveal(level: AutomapLevel, cx: number, cy: number, radius: number): number {
  let added = 0;
  const r = Math.max(0, radius);
  const r2 = r * r + 0.25;
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      if (markVisited(level, cx + dx, cy + dy)) added++;
    }
  }
  return added;
}

export function worldToCell(level: AutomapLevel, x: number, z: number): { cx: number; cy: number } {
  return {
    cx: Math.floor((x - level.originX) / level.cellSize),
    cy: Math.floor((z - level.originZ) / level.cellSize),
  };
}

export function cellToWorld(level: AutomapLevel, cx: number, cy: number): { x: number; z: number } {
  return {
    x: level.originX + (cx + 0.5) * level.cellSize,
    z: level.originZ + (cy + 0.5) * level.cellSize,
  };
}

/** Reveal around a world position with a radius in metres. */
export function revealAt(level: AutomapLevel, x: number, z: number, radiusMetres: number): number {
  const { cx, cy } = worldToCell(level, x, z);
  return reveal(level, cx, cy, radiusMetres / level.cellSize);
}

export function visitedCount(level: AutomapLevel): number {
  let n = 0;
  for (let w of level.words) {
    w = w >>> 0;
    while (w) {
      w &= w - 1;
      n++;
    }
  }
  return n;
}

export interface Automap {
  levels: Record<string, AutomapLevel>;
}

export function createAutomap(): Automap {
  return { levels: {} };
}

/** The level's map, created from `spec` on first visit. */
export function automapLevel(map: Automap, levelId: string, spec: AutomapLevelSpec): AutomapLevel {
  const existing = map.levels[levelId];
  if (existing) return existing;
  const level = createAutomapLevel(spec);
  map.levels[levelId] = level;
  return level;
}
