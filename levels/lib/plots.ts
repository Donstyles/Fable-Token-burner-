/**
 * Helpers the region scripts share (DESIGN.md 17.1, 17.21): rows of houses along a street,
 * small things along a line, an orchard's rows, a ring of stones. Everything in map metres
 * (x east, z north), as the scripts are drawn.
 */
import catalogue from '../../assets/props/catalogue.json';
import type { Plot } from '../../kernel/terrain/plots';
import type { PropCatalogue } from '../../kernel/terrain/props';
import type { P2 } from '../../kernel/terrain/spline';
import type { TreeKind } from '../../kernel/terrain/trees';

export const CATALOGUE = catalogue as unknown as PropCatalogue;

/** A house, or a gap of so many metres between houses. */
export type RowItem = string | number | { model: string; name: string };

export function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * A row of houses along a street that runs east and west on the line `street`, house to house:
 * from `x` going `dir` (1 east, -1 west), the fronts on the line `front`, facing the street
 * (north of it when `front` is above it). Each house takes its own width from the catalogue.
 */
export function row(
  street: number,
  front: number,
  x: number,
  dir: 1 | -1,
  items: RowItem[],
): Plot[] {
  const plots: Plot[] = [];
  const north = front > street;
  let at = x;
  for (const item of items) {
    if (typeof item === 'number') {
      at += dir * item;
      continue;
    }
    const model = typeof item === 'string' ? item : item.model;
    const [w, , d] = CATALOGUE[model]!.size;
    const cx = at + (dir * w) / 2;
    const cz = north ? front + d / 2 : front - d / 2;
    plots.push({
      model,
      at: [round(cx), round(cz)],
      face: [round(cx), street],
      ...(typeof item === 'object' ? { name: item.name } : {}),
    });
    at += dir * w;
  }
  return plots;
}

/**
 * A row of houses along a street that runs north and south on the line `street` (an x), house
 * to house from `z` going `dir` (1 north, -1 south), the fronts on the line `front` (an x),
 * facing the street.
 */
export function column(
  street: number,
  front: number,
  z: number,
  dir: 1 | -1,
  items: RowItem[],
): Plot[] {
  const plots: Plot[] = [];
  const east = front > street;
  let at = z;
  for (const item of items) {
    if (typeof item === 'number') {
      at += dir * item;
      continue;
    }
    const model = typeof item === 'string' ? item : item.model;
    // Turned a quarter: the model's depth runs along the street, its width toward it.
    const [w, , d] = CATALOGUE[model]!.size;
    const cz = at + (dir * w) / 2;
    const cx = east ? front + d / 2 : front - d / 2;
    plots.push({
      model,
      at: [round(cx), round(cz)],
      face: [street, round(cz)],
      ...(typeof item === 'object' ? { name: item.name } : {}),
    });
    at += dir * w;
  }
  return plots;
}

/** Small things along a line, every `step` metres, each facing `face`; bushes alternate. */
export function along(model: string, from: P2, to: P2, step: number, face: P2): Plot[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.round(len / step));
  const plots: Plot[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const at: P2 = [round(from[0] + (to[0] - from[0]) * t), round(from[1] + (to[1] - from[1]) * t)];
    plots.push({ model: i % 2 ? model.replace('-01', '-02') : model, at, face, light: true });
  }
  return plots;
}

/** Trees in rows, an orchard's: `cols` by `rows` from `corner`, `gap` metres apart. */
export function orchard(
  corner: P2,
  cols: number,
  rows: number,
  gap: number,
  kinds: TreeKind[],
): { kind: TreeKind; at: P2; scale: number }[] {
  const out: { kind: TreeKind; at: P2; scale: number }[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out.push({
        kind: kinds[(i + j) % kinds.length]!,
        at: [corner[0] + i * gap, corner[1] + j * gap],
        scale: 0.7 + ((i * 7 + j * 3) % 5) * 0.04,
      });
    }
  }
  return out;
}

/** A ring of stones about a middle. */
export function ring(at: P2, radius: number, count: number): Plot[] {
  return Array.from({ length: count }, (_, k) => {
    const a = (k / count) * Math.PI * 2;
    const p: P2 = [round(at[0] + Math.sin(a) * radius), round(at[1] + Math.cos(a) * radius)];
    return { model: k % 3 ? 'rock-boulder-01' : 'rock-boulder-02', at: p, face: at, light: true };
  });
}

/** Shorthand for small things. */
export const prop = (model: string, at: P2, face: P2): Plot => ({ model, at, face, light: true });
