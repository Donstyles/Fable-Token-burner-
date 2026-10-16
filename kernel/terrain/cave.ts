/**
 * The cave mouth (DESIGN.md 15.3): a rock knoll on the hillside with an arched hole, a
 * stone-floored tunnel inside, and the portal at its back that leads into the dungeon. Local
 * frame: the mouth at the origin, +Z into the hill, Y up; the floor is y = 0.
 */
import { ROLE } from '../elements/roles';
import type { MeshData } from '../core/mesh';
import { box, nb, quad, transformInto, type B, type V3 } from './solids';

export interface CaveSpec {
  x: number;
  y: number;
  z: number;
  /** Rotation about Y so local +Z points into the hill. */
  yaw: number;
}

export const CAVE = {
  // Wide enough that recast's 1.5 m cells keep a walkable strip after eroding the agent radius.
  width: 6.4,
  height: 4.4,
  length: 16,
  /** The stone threshold outside the mouth, metres. */
  threshold: 7,
  /** Half-width of the knoll's base beyond the tunnel wall, and its extra length. */
  skirt: 7,
  /** How far the terrain is cut under the tunnel so it never pokes through the floor. */
  cutDepth: 6,
  /** The cut runs this far behind the back wall, so the rising hill crosses floor level there. */
  cutBehind: 6,
} as const;

export interface CaveResult {
  visual: MeshData;
  collider: MeshData;
  /** Where the party arrives from the dungeon, on the threshold, and where the portal lies. */
  arrive: V3;
  portal: V3;
  /** A warm glow inside. */
  light: V3;
}

/** The tunnel and the knoll in local space. */
function caveLocal(): { v: B; c: B } {
  const v = nb();
  const c = nb();
  const hw = CAVE.width / 2;
  const H = CAVE.height;
  const L = CAVE.length;
  const T = 1.5; // wall thickness
  const S = CAVE.skirt;
  const base = -3;
  const top = H + 2.5;
  // Floor: a thick slab from the threshold to the back, dirt on top.
  box(v, [-hw - T, -CAVE.cutDepth - 0.5, -CAVE.threshold], [hw + T, 0, L + T], ROLE.path);
  box(c, [-hw - T, -CAVE.cutDepth - 0.5, -CAVE.threshold], [hw + T, 0, L + T], ROLE.collider);
  // Interior walls, ceiling and back wall as boxes, rock-faced, solid.
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -hw - T : hw;
    box(v, [x0, 0, 0], [x0 + T, H + T, L + T], ROLE.rock);
    box(c, [x0, 0, 0], [x0 + T, H + T, L + T], ROLE.collider);
  }
  box(v, [-hw - T, H, 0], [hw + T, H + T, L + T], ROLE.rock);
  box(c, [-hw - T, H, 0], [hw + T, H + T, L + T], ROLE.collider);
  box(v, [-hw - T, 0, L], [hw + T, H + T, L + T], ROLE.rock);
  box(c, [-hw - T, 0, L], [hw + T, H + T, L + T], ROLE.collider);
  // Knoll over the tunnel: a vertical front with the arch, sloped sides and back, a flat top.
  const bx = hw + S;
  const bz = L + S;
  const tx = hw + T + 0.8;
  const tz = L + T + 1.5;
  const rock = (q: [V3, V3, V3, V3]): void => {
    quad(v, q, ROLE.rock, 0.5);
    quad(c, q, ROLE.collider);
  };
  // Front face pieces (normal -Z): left and right of the arch, above it, with chamfers.
  const ch = 0.9; // chamfer size at the arch's top corners
  const front = (p: [V3, V3, V3, V3]): void => rock(p);
  front([
    [-bx, base, 0],
    [-hw - T, base, 0],
    [-hw - T, H + T, 0],
    [-tx, top, 0],
  ]);
  front([
    [hw + T, base, 0],
    [bx, base, 0],
    [tx, top, 0],
    [hw + T, H + T, 0],
  ]);
  front([
    [-hw - T, H + T, 0],
    [hw + T, H + T, 0],
    [tx, top, 0],
    [-tx, top, 0],
  ]);
  // The arch: the wall ends and the lintel, facing the opening, plus chamfer triangles.
  front([
    [-hw - T, 0, 0],
    [-hw, 0, 0],
    [-hw, H - ch, 0],
    [-hw - T, H + T, 0],
  ]);
  front([
    [hw, 0, 0],
    [hw + T, 0, 0],
    [hw + T, H + T, 0],
    [hw, H - ch, 0],
  ]);
  front([
    [-hw, H - ch, 0],
    [-hw + ch, H, 0],
    [hw - ch, H, 0],
    [hw, H - ch, 0],
  ]);
  front([
    [-hw - T, H + T, 0],
    [-hw, H - ch, 0],
    [-hw + ch, H, 0],
    [-hw + ch, H + T, 0],
  ]);
  front([
    [hw, H - ch, 0],
    [hw + T, H + T, 0],
    [hw - ch, H + T, 0],
    [hw - ch, H, 0],
  ]);
  // Top.
  rock([
    [-tx, top, 0],
    [tx, top, 0],
    [tx, top, tz],
    [-tx, top, tz],
  ]);
  // Sides (normals outward) and back.
  rock([
    [bx, base, 0],
    [bx, base, bz],
    [tx, top, tz],
    [tx, top, 0],
  ]);
  rock([
    [-bx, base, bz],
    [-bx, base, 0],
    [-tx, top, 0],
    [-tx, top, tz],
  ]);
  rock([
    [bx, base, bz],
    [-bx, base, bz],
    [-tx, top, tz],
    [tx, top, tz],
  ]);
  return { v, c };
}

export function caveMouth(spec: CaveSpec): CaveResult {
  const { v, c } = caveLocal();
  const visual = nb();
  const collider = nb();
  transformInto(visual, v, spec);
  transformInto(collider, c, spec);
  const place = (p: V3): V3 => {
    const cos = Math.cos(spec.yaw);
    const sin = Math.sin(spec.yaw);
    return [spec.x + p[0] * cos - p[2] * sin, spec.y + p[1], spec.z + p[0] * sin + p[2] * cos];
  };
  return {
    visual,
    collider,
    arrive: place([0, 0, -3.5]),
    // Clear of the back wall by more than a navmesh cell, so the crowd can reach it too.
    portal: place([0, 0, CAVE.length - 4.5]),
    light: place([0, CAVE.height - 0.9, CAVE.length - 4]),
  };
}

/** Local coordinates of a world point, for the terrain cuts. */
export function caveLocalOf(spec: CaveSpec, x: number, z: number): { x: number; z: number } {
  const cos = Math.cos(spec.yaw);
  const sin = Math.sin(spec.yaw);
  const dx = x - spec.x;
  const dz = z - spec.z;
  return { x: dx * cos + dz * sin, z: -dx * sin + dz * cos };
}
