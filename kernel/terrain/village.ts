/**
 * The village (DESIGN.md 15.2): a mountain village laid out the way one grows, not a ring.
 * The road is its main street. In the middle the street widens into a square with the well,
 * the inn along one side and the trader's store across from it; the temple stands on a knoll
 * up a short lane; the smithy is the last building toward the pass, where its noise and fire
 * bother nobody; the farm, with its barn, haystacks and fenced yard, closes the village at
 * the river end. Every door faces the street or its lane. Buildings are Meshy models from
 * assets/props with footprints from the catalogue; this module only places them.
 */
import catalogue from '../../assets/props/catalogue.json';
import { ROLE } from '../elements/roles';
import type { MeshData } from '../core/mesh';
import type { LightPlacement, NamedPoint, SpawnRecord } from '../plan/level';
import { headingDeg } from './spline';
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
  /** Height above the village floor. */
  rise: number;
}

export interface Lane {
  from: P2;
  to: P2;
  halfWidth: number;
}

export interface VillageSpec {
  /** The square's centre: the road passes through it. */
  centre: P2;
  /** Direction the road leaves toward the pass, unit, kernel space. */
  along: P2;
  /** The village floor height. */
  y: number;
  /** Half the road's width. */
  roadHalf: number;
}

export interface VillageLayout {
  props: PropPlacement[];
  pads: Pad[];
  /** Dirt: the square and the lanes; the street itself is the road's own splat. */
  square: { x: number; z: number; halfA: number; halfB: number; yaw: number };
  lanes: Lane[];
  /** Footprint boxes for the navmesh and physics. */
  collider: MeshData;
  lights: LightPlacement[];
  points: NamedPoint[];
  /** Townsfolk at their places: kind is an NPC id (src/game/monsters.ts NPCS). */
  spawns: SpawnRecord[];
  /** The village's extent along and across the street, for levelling and clearing. */
  extent: { halfA: number; halfB: number };
}

interface Slot {
  model: string;
  /** Along the street (positive toward the pass) and across it (positive to the right). */
  a: number;
  b: number;
  /** Facing: 'street' faces the street from its side; else a direction in the (a, b) frame. */
  face: 'street' | P2;
  /** Raise this one on a knoll. */
  rise?: number;
  /** No levelled pad or collider (small things). */
  light?: boolean;
}

/** The buildings and props by their place along and across the street. */
function slots(roadHalf: number): Slot[] {
  const size = (id: string): [number, number, number] => {
    const m = CATALOGUE[id];
    if (!m) throw new Error(`village: ${id} is not in the prop catalogue`);
    return m.size;
  };
  // Setback from the street's edge to a building's front, metres.
  const front = (id: string, side: 1 | -1, setback = 3): number => {
    const [, , d] = size(id);
    return side * (roadHalf + setback + d / 2);
  };
  return [
    // The square: the inn along its left side, the store across; the well, a stall, lanterns.
    { model: 'building-inn', a: 2, b: front('building-inn', -1, 9), face: 'street' },
    { model: 'building-store', a: 9, b: front('building-store', 1, 8), face: 'street' },
    { model: 'prop-well', a: -2, b: 8, face: [0, -1], light: true },
    { model: 'prop-market-stall', a: -9, b: 9, face: [-1, 0], light: true },
    { model: 'prop-lantern-post', a: 11, b: -7.5, face: 'street', light: true },
    { model: 'prop-lantern-post', a: -7, b: 7.5, face: 'street', light: true },
    { model: 'prop-cart', a: 16, b: 8.5, face: [1, 0], light: true },
    // Toward the pass: the stables by the inn, cottages across, the smithy last.
    { model: 'building-stables', a: 28, b: front('building-stables', -1), face: 'street' },
    { model: 'building-cottage-03', a: 24, b: front('building-cottage-03', 1), face: 'street' },
    { model: 'building-cottage-01', a: 38, b: front('building-cottage-01', 1, 5), face: 'street' },
    { model: 'prop-woodpile', a: 42, b: 8.5, face: 'street', light: true },
    { model: 'building-smithy', a: 50, b: front('building-smithy', -1), face: 'street' },
    { model: 'prop-shrine', a: 66, b: 7.5, face: 'street', light: true },
    // Toward the river: the temple on its knoll, cottages, then the farm.
    { model: 'building-temple', a: -26, b: -30, face: [0, 1], rise: 2.5 },
    { model: 'building-cottage-02', a: -18, b: front('building-cottage-02', 1, 4), face: 'street' },
    { model: 'building-cottage-01', a: -32, b: front('building-cottage-01', 1, 6), face: 'street' },
    { model: 'prop-woodpile', a: -35.5, b: 7.5, face: 'street', light: true },
    { model: 'building-farmhouse', a: -56, b: front('building-farmhouse', -1, 6), face: 'street' },
    { model: 'building-barn', a: -54, b: front('building-barn', 1, 10), face: 'street' },
    { model: 'prop-haystack', a: -44, b: 14, face: 'street', light: true },
    { model: 'prop-haystack', a: -47, b: 18.5, face: 'street', light: true },
    { model: 'prop-cart', a: -62, b: 9, face: [0, 1], light: true },
    ...fenceRun(-66, 7, -66, 24),
    ...fenceRun(-66, 24, -40, 24),
    ...fenceRun(-40, 24, -40, 10),
  ];
}

/** Fence sections along a line in the (a, b) frame, each three metres. */
function fenceRun(a0: number, b0: number, a1: number, b1: number): Slot[] {
  const len = Math.hypot(a1 - a0, b1 - b0);
  const n = Math.max(1, Math.round(len / 3));
  const out: Slot[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const a = a0 + (a1 - a0) * t;
    const b = b0 + (b1 - b0) * t;
    // The fence's front faces across its run.
    out.push({ model: 'prop-fence', a, b, face: [-(b1 - b0) / len, (a1 - a0) / len], light: true });
  }
  return out;
}

export function layoutVillage(spec: VillageSpec): VillageLayout {
  const [ux, uz] = spec.along;
  // Right of the street when walking toward the pass.
  const vx = uz;
  const vz = -ux;
  const world = (a: number, b: number): P2 => [
    spec.centre[0] + ux * a + vx * b,
    spec.centre[1] + uz * a + vz * b,
  ];
  const yawOf = (fa: number, fb: number): number => {
    // Facing in kernel space; transformInto turns +Z to (-sin yaw, cos yaw).
    const fx = ux * fa + vx * fb;
    const fz = uz * fa + vz * fb;
    return Math.atan2(-fx, fz);
  };
  const props: PropPlacement[] = [];
  const pads: Pad[] = [];
  const collider = nb();
  const lights: LightPlacement[] = [];
  const points: NamedPoint[] = [];
  for (const s of slots(spec.roadHalf)) {
    const spec_ = PROPS[s.model];
    const m = CATALOGUE[s.model];
    if (!spec_ || !m) throw new Error(`village: ${s.model} is not in the prop catalogue`);
    const [fa, fb]: P2 = s.face === 'street' ? [0, s.b > 0 ? -1 : 1] : s.face;
    const yaw = yawOf(fa, fb);
    const [x, z] = world(s.a, s.b);
    const rise = s.rise ?? 0;
    const y = spec.y + rise;
    // Sunk by its wall base, so the walls stand on the levelled ground and any posts under
    // them go into it.
    const base = m.base ?? 0;
    props.push({ model: s.model, x, y: y - base, z, yaw, scale: 1 });
    const [w, full, d] = m.size;
    const h = full - base;
    // The model's box in its own frame: x across the front, z front to back.
    const cx = m.min[0] + w / 2;
    const cz = m.min[2] + d / 2;
    const c = nb();
    box(c, [cx - w / 2, 0, cz - d / 2], [cx + w / 2, h, cz + d / 2], ROLE.collider);
    transformInto(collider, c, { x, y, z, yaw });
    if (!s.light) {
      // Level the ground under the building and a margin round it, in the building's frame.
      pads.push({ x, z, halfA: w / 2 + 2.5, halfB: d / 2 + 2.5, yaw, rise });
      // The building's point stands on the apron before its door, where a visitor arrives.
      const [px, pz] = world(s.a + fa * (d / 2 + 2.5), s.b + fb * (d / 2 + 2.5));
      points.push({
        name: s.model.replace('building-', ''),
        position: [px, y, pz],
        kind: 'poi',
      });
    }
    if (s.model === 'prop-lantern-post') {
      lights.push({
        position: [x, y + h - 0.6, z],
        color: [1, 0.72, 0.4],
        range: 9,
        intensity: 1.4,
        kind: 'lantern',
      });
    }
    if (s.model === 'building-smithy') {
      // The forge glows in the arched opening at the front.
      const [gx, gz] = world(s.a, s.b + (s.b > 0 ? -d / 2 : d / 2));
      lights.push({
        position: [gx, y + 1.4, gz],
        color: [1, 0.5, 0.2],
        range: 8,
        intensity: 1.6,
        kind: 'glow',
      });
    }
  }
  // The temple's lane climbs its knoll from the street; the farm's lane turns to the barn.
  const lanes: Lane[] = [
    { from: world(-26, -spec.roadHalf), to: world(-26, -22), halfWidth: 2.2 },
    { from: world(-50, spec.roadHalf), to: world(-50, 20), halfWidth: 2.4 },
  ];
  const [sx, sz] = world(0, 0);
  const square = { x: sx, z: sz, halfA: 17, halfB: 12, yaw: yawOf(0, 1) };
  // Greta by the well, Old Henrik at his farm gate; each faces the street.
  const villager = (kind: string, a: number, b: number): SpawnRecord => {
    const [x, z] = world(a, b);
    const fx = ux * 0 + vx * (b > 0 ? -1 : 1);
    const fz = uz * 0 + vz * (b > 0 ? -1 : 1);
    return { kind, position: [x, spec.y, z], yawDeg: headingDeg(fx, fz) };
  };
  const spawns = [villager('villager-woman', -5, 7.5), villager('villager-man', -46, 9)];
  points.push({
    name: 'square',
    position: [sx, spec.y, sz],
    kind: 'poi',
  });
  return {
    props,
    pads,
    square,
    lanes,
    collider,
    lights,
    points,
    spawns,
    extent: { halfA: 78, halfB: 36 },
  };
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
