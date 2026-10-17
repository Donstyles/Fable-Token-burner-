/**
 * Forests (DESIGN.md 15): low-polygon trees in the late-nineties manner, a textured trunk
 * and a solid textured canopy, placed on the valley's forest mask with a jittered grid.
 * Four kinds: pines and spruces above the broadleaf line, broadleaf and oak below, with
 * conifers mixed in lower down.
 */
import { ROLE } from '../elements/roles';
import type { MeshData } from '../core/mesh';
import type { ValleyResult } from './valley';

/** Kinds in sidecar order: a tree's kind travels as its index here. */
export const TREE_KINDS = ['pine', 'broadleaf', 'spruce', 'oak', 'palm'] as const;
export type TreeKind = (typeof TREE_KINDS)[number];

export interface TreeInstance {
  kind: TreeKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
}

type Rng = () => number;

function hashRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ForestOptions {
  /** Grid spacing between candidate trees, metres. */
  spacing?: number;
  /** Fraction of candidates on forest ground that become trees. */
  density?: number;
  /** Above this height only pines grow. */
  pineAbove?: number;
}

export function placeTrees(v: ValleyResult, o: ForestOptions = {}): TreeInstance[] {
  const spacing = o.spacing ?? 9;
  const density = o.density ?? 0.5;
  const pineAbove = o.pineAbove ?? 90;
  const rng = hashRng(v.spec.seed * 7919 + 13);
  const hf = v.height;
  const trees: TreeInstance[] = [];
  const half = hf.width / 2 - 6;
  for (let z = -half; z <= half; z += spacing) {
    for (let x = -half; x <= half; x += spacing) {
      const jx = x + (rng() - 0.5) * spacing * 0.9;
      const jz = z + (rng() - 0.5) * spacing * 0.9;
      const i = Math.round((jx + hf.width / 2) / hf.cell);
      const j = Math.round((jz + hf.width / 2) / hf.cell);
      if (!v.forest[j * hf.n + i]) continue;
      if (rng() > density) continue;
      // The mask is per vertex; the jittered spot itself must also keep clear.
      if (v.road.nearest(jx, jz).distance < v.roadWidth / 2 + 4) continue;
      if (v.river.nearest(jx, jz).distance < v.riverWidth / 2 + 8) continue;
      if (Math.hypot(jx - v.town.centre[0], jz - v.town.centre[1]) < v.town.radius + 12) continue;
      const y = hf.sample(jx, jz);
      const conifer = y > pineAbove || rng() < 0.3;
      const kind: TreeKind = conifer
        ? rng() < 0.5
          ? 'pine'
          : 'spruce'
        : rng() < 0.6
          ? 'broadleaf'
          : 'oak';
      // Models stand at their catalogue height; the scale is only a little variety.
      trees.push({ kind, x: jx, y, z: jz, yaw: rng() * Math.PI * 2, scale: 0.85 + rng() * 0.3 });
    }
  }
  return trees;
}

interface Builder {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  materials: number[];
}

function newBuilder(): Builder {
  return { positions: [], normals: [], uvs: [], indices: [], materials: [] };
}

/** A ring-lofted surface of revolution around Y: radii per ring, UV v along height. */
function lathe(
  b: Builder,
  rings: { y: number; r: number }[],
  segments: number,
  role: number,
  uRepeat: number,
): void {
  const base = b.positions.length / 3;
  for (let k = 0; k < rings.length; k++) {
    const ring = rings[k]!;
    const next = rings[Math.min(rings.length - 1, k + 1)]!;
    const prev = rings[Math.max(0, k - 1)]!;
    // Outward normal from the slope between neighbouring rings.
    const dr = next.r - prev.r;
    const dy = next.y - prev.y || 1;
    const len = Math.hypot(dy, dr);
    const nr = dy / len;
    const ny = -dr / len;
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const cx = Math.cos(a);
      const cz = Math.sin(a);
      b.positions.push(cx * ring.r, ring.y, cz * ring.r);
      b.normals.push(cx * nr, ny, cz * nr);
      b.uvs.push((s / segments) * uRepeat, ring.y);
    }
  }
  const stride = segments + 1;
  for (let k = 0; k < rings.length - 1; k++) {
    for (let s = 0; s < segments; s++) {
      const a = base + k * stride + s;
      const bb = a + 1;
      const c = a + stride;
      const d = c + 1;
      b.indices.push(a, bb, c, bb, d, c);
      b.materials.push(role, role);
    }
  }
}

/** Tree geometry at unit scale, trunk base at the origin. */
export function treeMesh(kind: TreeKind): MeshData {
  const b = newBuilder();
  if (kind === 'spruce') {
    // Tall and narrow: five short tiers up a slim trunk.
    lathe(
      b,
      [
        { y: 0, r: 0.28 },
        { y: 3, r: 0.18 },
        { y: 6, r: 0.08 },
      ],
      6,
      ROLE.bark,
      1,
    );
    for (let i = 0; i < 5; i++) {
      const y0 = 1.2 + i * 1.7;
      const r = 1.9 - i * 0.3;
      lathe(
        b,
        [
          { y: y0, r: 0.05 },
          { y: y0 + 0.05, r },
          { y: y0 + 2.4, r: 0.05 },
        ],
        6,
        ROLE.leaves,
        3,
      );
    }
    return b;
  }
  if (kind === 'oak') {
    // Broad and low: a thick trunk under a wide flat-topped crown.
    lathe(
      b,
      [
        { y: 0, r: 0.55 },
        { y: 1.8, r: 0.38 },
        { y: 3.2, r: 0.22 },
      ],
      7,
      ROLE.bark,
      1,
    );
    lathe(
      b,
      [
        { y: 2.2, r: 0.05 },
        { y: 2.9, r: 2.6 },
        { y: 4.2, r: 3.8 },
        { y: 5.8, r: 3.4 },
        { y: 6.8, r: 1.6 },
        { y: 7.2, r: 0.05 },
      ],
      9,
      ROLE.leaves,
      4,
    );
    return b;
  }
  if (kind === 'pine') {
    lathe(
      b,
      [
        { y: 0, r: 0.32 },
        { y: 2.2, r: 0.22 },
        { y: 4, r: 0.12 },
      ],
      6,
      ROLE.bark,
      1,
    );
    const tiers = [
      { y0: 1.6, y1: 4.2, r: 2.3 },
      { y0: 3.4, y1: 6.2, r: 1.8 },
      { y0: 5.4, y1: 8.4, r: 1.25 },
    ];
    for (const t of tiers) {
      lathe(
        b,
        [
          { y: t.y0, r: 0.05 },
          { y: t.y0 + 0.05, r: t.r },
          { y: t.y1, r: 0.05 },
        ],
        7,
        ROLE.leaves,
        3,
      );
    }
  } else {
    lathe(
      b,
      [
        { y: 0, r: 0.4 },
        { y: 2.6, r: 0.28 },
        { y: 4.2, r: 0.18 },
      ],
      6,
      ROLE.bark,
      1,
    );
    lathe(
      b,
      [
        { y: 2.8, r: 0.05 },
        { y: 3.6, r: 2.4 },
        { y: 5.2, r: 3.1 },
        { y: 6.8, r: 2.5 },
        { y: 8, r: 0.05 },
      ],
      8,
      ROLE.leaves,
      4,
    );
  }
  return b;
}

/** All trees as one mesh, plus their trunks alone for the collider. */
export function forestMeshes(trees: TreeInstance[]): { visual: MeshData; collider: MeshData } {
  const proto = Object.fromEntries(TREE_KINDS.map((k) => [k, treeMesh(k)])) as Record<
    TreeKind,
    MeshData
  >;
  const visual = newBuilder();
  const collider = newBuilder();
  const place = (into: Builder, mesh: MeshData, t: TreeInstance, onlyRole?: number): void => {
    const cos = Math.cos(t.yaw);
    const sin = Math.sin(t.yaw);
    const keep = new Int32Array(mesh.positions.length / 3).fill(-1);
    const base = into.positions.length / 3;
    let count = 0;
    // Only vertices used by kept triangles are copied.
    for (let tri = 0; tri < mesh.materials.length; tri++) {
      if (onlyRole !== undefined && mesh.materials[tri] !== onlyRole) continue;
      for (let k = 0; k < 3; k++) {
        const vi = mesh.indices[tri * 3 + k]!;
        if (keep[vi] === -1) {
          keep[vi] = count++;
          const px = mesh.positions[vi * 3]! * t.scale;
          const py = mesh.positions[vi * 3 + 1]! * t.scale;
          const pz = mesh.positions[vi * 3 + 2]! * t.scale;
          into.positions.push(t.x + px * cos - pz * sin, t.y + py, t.z + px * sin + pz * cos);
          const nx = mesh.normals[vi * 3]!;
          const ny = mesh.normals[vi * 3 + 1]!;
          const nz = mesh.normals[vi * 3 + 2]!;
          into.normals.push(nx * cos - nz * sin, ny, nx * sin + nz * cos);
          into.uvs.push(mesh.uvs[vi * 2]!, mesh.uvs[vi * 2 + 1]!);
        }
        into.indices.push(base + keep[vi]!);
      }
      into.materials.push(mesh.materials[tri]!);
    }
  };
  for (const t of trees) {
    place(visual, proto[t.kind], t);
    place(collider, proto[t.kind], t, ROLE.bark);
  }
  return { visual, collider };
}
