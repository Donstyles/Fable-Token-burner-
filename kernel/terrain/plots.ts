/**
 * Plots (docs/ROADMAP.md; kernel/terrain/region.ts): buildings and props placed by hand in a
 * region script, each building on a dead-level pad, sunk by its wall base, its front facing a
 * point (its door on the street). Buildings are Meshy models from assets/props with their
 * footprints from the catalogue; this module only places them.
 */
import catalogue from '../../assets/props/catalogue.json';
import { ROLE } from '../elements/roles';
import type { MeshData } from '../core/mesh';
import type { LightPlacement, NamedPoint } from '../plan/level';
import { PROPS, type PropCatalogue } from './props';
import { box, nb, transformInto } from './solids';
import type { P2 } from './spline';

const CATALOGUE = catalogue as unknown as PropCatalogue;

/** A placed model in kernel space; yaw turns the model's front (+Z) to face (-sin, cos). */
export interface PropPlacement {
  model: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
}

/** A rectangle of ground to level: centre, half sizes along its own axes, and its yaw. */
export interface Pad {
  x: number;
  z: number;
  halfA: number;
  halfB: number;
  yaw: number;
  /** Height above the ground under it (a knoll). */
  rise: number;
}

export interface Lane {
  from: P2;
  to: P2;
  halfWidth: number;
}

/**
 * A building or a prop placed by hand in a region script (kernel/terrain/region.ts): where it
 * stands and the point its front (its door) faces.
 */
export interface Plot {
  model: string;
  at: P2;
  face: P2;
  /** Raised this far above the ground under it, on a knoll. */
  rise?: number;
  /** Small things: no levelled pad, no named point. */
  light?: boolean;
  /** Its name for points and doors; the model's name without `building-` when unset. */
  name?: string;
}

/** A pad levelled to one height for a plot. */
export interface PlotPad extends Pad {
  y: number;
}

export interface PlotLayout {
  props: PropPlacement[];
  pads: PlotPad[];
  /** Footprint boxes for the navmesh. */
  collider: MeshData;
  lights: LightPlacement[];
  /** A point on the apron before each building's door, named after it. */
  points: NamedPoint[];
}

/** Place a region's plots on the ground: each building on a pad, sunk by its wall base. */
export function layoutPlots(
  plots: readonly Plot[],
  groundAt: (x: number, z: number) => number,
): PlotLayout {
  const props: PropPlacement[] = [];
  const pads: PlotPad[] = [];
  const collider = nb();
  const lights: LightPlacement[] = [];
  const points: NamedPoint[] = [];
  for (const p of plots) {
    const m = CATALOGUE[p.model];
    if (!PROPS[p.model] || !m) throw new Error(`plots: ${p.model} is not in the prop catalogue`);
    const [x, z] = p.at;
    const fx = p.face[0] - x;
    const fz = p.face[1] - z;
    const fl = Math.hypot(fx, fz) || 1;
    // transformInto turns +Z, the model's front, to (-sin yaw, cos yaw).
    const yaw = Math.atan2(-fx / fl, fz / fl);
    const rise = p.rise ?? 0;
    const y = groundAt(x, z) + rise;
    const base = m.base ?? 0;
    props.push({ model: p.model, x, y: y - base, z, yaw, scale: 1 });
    const [w, full, d] = m.size;
    const h = full - base;
    const cx = m.min[0] + w / 2;
    const cz = m.min[2] + d / 2;
    const c = nb();
    box(c, [cx - w / 2, 0, cz - d / 2], [cx + w / 2, h, cz + d / 2], ROLE.collider);
    transformInto(collider, c, { x, y, z, yaw });
    if (!p.light) {
      pads.push({ x, z, halfA: w / 2 + 2.5, halfB: d / 2 + 2.5, yaw, rise, y });
      const out = d / 2 + 2.5;
      points.push({
        name: p.name ?? p.model.replace('building-', ''),
        position: [x + (fx / fl) * out, y, z + (fz / fl) * out],
        kind: 'poi',
      });
    }
    if (p.model === 'prop-lantern-post') {
      lights.push({
        position: [x, y + h - 0.6, z],
        color: [1, 0.72, 0.4],
        range: 9,
        intensity: 1.4,
        kind: 'lantern',
      });
    }
    if (p.model === 'building-smithy') {
      // The forge glows in the arched opening at the front.
      const g = d / 2;
      lights.push({
        position: [x + (fx / fl) * g, y + 1.4, z + (fz / fl) * g],
        color: [1, 0.5, 0.2],
        range: 8,
        intensity: 1.6,
        kind: 'glow',
      });
    }
  }
  return { props, pads, collider, lights, points };
}

/** Signed distance helpers for the terrain pass: inside a rotated rectangle. */
export function rectDistance(
  x: number,
  z: number,
  r: { x: number; z: number; halfA: number; halfB: number; yaw: number },
): number {
  // The rectangle's a axis is the facing's right-hand side, b its facing; any consistent
  // pair works for levelling.
  const cos = Math.cos(r.yaw);
  const sin = Math.sin(r.yaw);
  const dx = x - r.x;
  const dz = z - r.z;
  const a = dx * cos + dz * sin;
  const b = -dx * sin + dz * cos;
  const ea = Math.abs(a) - r.halfA;
  const eb = Math.abs(b) - r.halfB;
  return Math.max(ea, eb);
}

/** Distance from a point to a lane's centre line, capped segment. */
export function laneDistance(x: number, z: number, lane: Lane): number {
  const [x0, z0] = lane.from;
  const [x1, z1] = lane.to;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2)) : 0;
  return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
}
