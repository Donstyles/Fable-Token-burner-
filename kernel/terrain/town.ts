/**
 * A village of generated houses (DESIGN.md 15.3): timber-framed halls in the late-medieval
 * manner, plaster walls between plank posts and beams, a steep plank roof, a door and
 * windows of trim stone, round a well. Built like MM6's towns: simple solids with real
 * textures, modelled rather than scanned, solid to walk against.
 */
import { ROLE } from '../elements/roles';
import type { MeshData } from '../core/mesh';
import type { P2 } from './spline';

export interface HouseSpec {
  x: number;
  z: number;
  y: number;
  /** Facing direction of the door, radians about Y. */
  yaw: number;
  width: number;
  depth: number;
  wallHeight: number;
  roofHeight: number;
  seed: number;
}

export interface TownSpec {
  centre: P2;
  /** Ground height of the flattened village square. */
  y: number;
  radius: number;
  seed: number;
  /** Direction the road leaves the square, radians from +X toward +Z; that slot stays empty. */
  roadDirection?: number;
}

interface B {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  materials: number[];
}

const nb = (): B => ({ positions: [], normals: [], uvs: [], indices: [], materials: [] });

type V3 = [number, number, number];

/** A quad from four corners (counter-clockwise seen from the front), world-unit UVs. */
function quad(b: B, p: [V3, V3, V3, V3], role: number, uvScale = 1): void {
  const a = p[0];
  const c = p[1];
  const e = p[3];
  const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
  const n = [
    u[1]! * v[2]! - u[2]! * v[1]!,
    u[2]! * v[0]! - u[0]! * v[2]!,
    u[0]! * v[1]! - u[1]! * v[0]!,
  ];
  const len = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
  const base = b.positions.length / 3;
  const w = Math.hypot(u[0]!, u[1]!, u[2]!);
  const h = Math.hypot(v[0]!, v[1]!, v[2]!);
  const uvs = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  p.forEach((q, i) => {
    b.positions.push(q[0], q[1], q[2]);
    b.normals.push(n[0]! / len, n[1]! / len, n[2]! / len);
    b.uvs.push(uvs[i]![0]! * uvScale, uvs[i]![1]! * uvScale);
  });
  b.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  b.materials.push(role, role);
}

/** An axis-aligned box in local space, every face outward. */
function box(b: B, min: V3, max: V3, role: number): void {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  quad(
    b,
    [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ],
    role,
  ); // +Z
  quad(
    b,
    [
      [x1, y0, z0],
      [x0, y0, z0],
      [x0, y1, z0],
      [x1, y1, z0],
    ],
    role,
  ); // -Z
  quad(
    b,
    [
      [x1, y0, z1],
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
    ],
    role,
  ); // +X
  quad(
    b,
    [
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
    ],
    role,
  ); // -X
  quad(
    b,
    [
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
    ],
    role,
  ); // +Y
  quad(
    b,
    [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
    ],
    role,
  ); // -Y
}

function transformInto(into: B, local: B, h: Pick<HouseSpec, 'x' | 'y' | 'z' | 'yaw'>): void {
  const cos = Math.cos(h.yaw);
  const sin = Math.sin(h.yaw);
  const base = into.positions.length / 3;
  for (let i = 0; i < local.positions.length; i += 3) {
    const px = local.positions[i]!;
    const py = local.positions[i + 1]!;
    const pz = local.positions[i + 2]!;
    into.positions.push(h.x + px * cos - pz * sin, h.y + py, h.z + px * sin + pz * cos);
    const nx = local.normals[i]!;
    const nz = local.normals[i + 2]!;
    into.normals.push(nx * cos - nz * sin, local.normals[i + 1]!, nx * sin + nz * cos);
  }
  for (const v of local.uvs) into.uvs.push(v);
  for (const idx of local.indices) into.indices.push(idx + base);
  for (const m of local.materials) into.materials.push(m);
}

/** One house in local space: door on +Z, ridge along X. */
export function houseMesh(h: HouseSpec): { visual: MeshData; collider: MeshData } {
  const v = nb();
  const c = nb();
  const hw = h.width / 2;
  const hd = h.depth / 2;
  const sill = 0.3;
  // Plaster walls on a stone plinth.
  box(v, [-hw, 0, -hd], [hw, sill, hd], ROLE.ashlar);
  box(v, [-hw, sill, -hd], [hw, h.wallHeight, hd], ROLE.plaster);
  // Timber posts at the corners and a beam along each eave.
  const t = 0.18;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(
        v,
        [sx * hw - (sx > 0 ? t : 0) - (sx > 0 ? 0 : -0.001), sill, sz * hd - (sz > 0 ? t : 0)],
        [sx * hw + (sx > 0 ? 0.001 : t), h.wallHeight, sz * hd + (sz > 0 ? 0.001 : t)],
        ROLE.plank,
      );
    }
  }
  box(
    v,
    [-hw - 0.05, h.wallHeight - t, -hd - 0.05],
    [hw + 0.05, h.wallHeight + 0.05, hd + 0.05],
    ROLE.plank,
  );
  // Door on +Z, two windows beside it, one on the back.
  const door = { w: 1.0, h: 2.0 };
  quad(
    v,
    [
      [-door.w / 2, sill, hd + 0.01],
      [door.w / 2, sill, hd + 0.01],
      [door.w / 2, sill + door.h, hd + 0.01],
      [-door.w / 2, sill + door.h, hd + 0.01],
    ],
    ROLE.trim,
  );
  for (const wx of [-hw * 0.55, hw * 0.55]) {
    quad(
      v,
      [
        [wx - 0.4, 1.3, hd + 0.01],
        [wx + 0.4, 1.3, hd + 0.01],
        [wx + 0.4, 2.1, hd + 0.01],
        [wx - 0.4, 2.1, hd + 0.01],
      ],
      ROLE.iron,
    );
  }
  // Gable roof: two slopes, two triangular gables, ridge along X, overhanging eaves.
  const o = 0.5;
  const ridge = h.wallHeight + h.roofHeight;
  const e = h.wallHeight - 0.1;
  quad(
    v,
    [
      [-hw - o, e, hd + o],
      [hw + o, e, hd + o],
      [hw + o, ridge, 0],
      [-hw - o, ridge, 0],
    ],
    ROLE.plank,
  );
  quad(
    v,
    [
      [hw + o, e, -hd - o],
      [-hw - o, e, -hd - o],
      [-hw - o, ridge, 0],
      [hw + o, ridge, 0],
    ],
    ROLE.plank,
  );
  // Underside of the overhang, so the eaves have thickness from below.
  quad(
    v,
    [
      [-hw - o, e, hd + o],
      [-hw - o, e - 0.001, hd],
      [hw + o, e - 0.001, hd],
      [hw + o, e, hd + o],
    ],
    ROLE.plank,
  );
  quad(
    v,
    [
      [hw + o, e, -hd - o],
      [hw + o, e - 0.001, -hd],
      [-hw - o, e - 0.001, -hd],
      [-hw - o, e, -hd - o],
    ],
    ROLE.plank,
  );
  // Gables: plaster triangles.
  const gable = (x: number, sign: number): void => {
    const base = v.positions.length / 3;
    const pts: V3[] =
      sign > 0
        ? [
            [x, h.wallHeight, hd],
            [x, ridge, 0],
            [x, h.wallHeight, -hd],
          ]
        : [
            [x, h.wallHeight, -hd],
            [x, ridge, 0],
            [x, h.wallHeight, hd],
          ];
    for (const p of pts) {
      v.positions.push(...p);
      v.normals.push(sign, 0, 0);
      v.uvs.push(p[2], p[1]);
    }
    v.indices.push(base, base + 1, base + 2);
    v.materials.push(ROLE.plaster);
  };
  gable(hw, 1);
  gable(-hw, -1);
  // Chimney.
  box(v, [hw * 0.4, h.wallHeight, -0.6], [hw * 0.4 + 0.8, ridge + 0.6, 0.2], ROLE.ashlar);
  // Collider: the walls as one block and the roof as a wedge.
  box(c, [-hw, 0, -hd], [hw, h.wallHeight, hd], ROLE.collider);
  quad(
    c,
    [
      [-hw - o, e, hd + o],
      [hw + o, e, hd + o],
      [hw + o, ridge, 0],
      [-hw - o, ridge, 0],
    ],
    ROLE.collider,
  );
  quad(
    c,
    [
      [hw + o, e, -hd - o],
      [-hw - o, e, -hd - o],
      [-hw - o, ridge, 0],
      [hw + o, ridge, 0],
    ],
    ROLE.collider,
  );
  const visual = nb();
  const collider = nb();
  transformInto(visual, v, h);
  transformInto(collider, c, h);
  return { visual, collider };
}

/** The well: a stone ring with two posts and a little roof. */
export function wellMesh(
  x: number,
  y: number,
  z: number,
): { visual: MeshData; collider: MeshData } {
  const v = nb();
  const c = nb();
  const segs = 10;
  const r0 = 1.1;
  const r1 = 1.4;
  const h = 1.0;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const p = (r: number, a: number, yy: number): V3 => [Math.cos(a) * r, yy, Math.sin(a) * r];
    quad(v, [p(r1, a1, 0), p(r1, a0, 0), p(r1, a0, h), p(r1, a1, h)], ROLE.ashlar);
    quad(v, [p(r0, a0, 0.2), p(r0, a1, 0.2), p(r0, a1, h), p(r0, a0, h)], ROLE.ashlar);
    quad(v, [p(r1, a1, h), p(r1, a0, h), p(r0, a0, h), p(r0, a1, h)], ROLE.ashlar);
    quad(c, [p(r1, a1, 0), p(r1, a0, 0), p(r1, a0, h), p(r1, a1, h)], ROLE.collider);
  }
  for (const sx of [-1, 1])
    box(v, [sx * 1.0 - 0.08, h, -0.08], [sx * 1.0 + 0.08, h + 1.9, 0.08], ROLE.plank);
  quad(
    v,
    [
      [-1.5, h + 1.9, 1.2],
      [1.5, h + 1.9, 1.2],
      [1.5, h + 2.5, 0],
      [-1.5, h + 2.5, 0],
    ],
    ROLE.plank,
  );
  quad(
    v,
    [
      [1.5, h + 1.9, -1.2],
      [-1.5, h + 1.9, -1.2],
      [-1.5, h + 2.5, 0],
      [1.5, h + 2.5, 0],
    ],
    ROLE.plank,
  );
  const visual = nb();
  const collider = nb();
  transformInto(visual, v, { x, y, z, yaw: 0 });
  transformInto(collider, c, { x, y, z, yaw: 0 });
  return { visual, collider };
}

export interface TownResult {
  houses: HouseSpec[];
  well: P2;
  visual: MeshData;
  collider: MeshData;
}

/**
 * Houses round the well in eight slots, doors to the square, sizes varied by the seed. The
 * slot the road leaves through stays empty, so the road runs from the well out of the
 * village between two houses.
 */
export function buildTown(spec: TownSpec): TownResult {
  let a = spec.seed >>> 0;
  const rng = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const houses: HouseSpec[] = [];
  const count = 8;
  const ring = spec.radius * 0.6;
  const roadSlot = spec.roadDirection ?? Math.PI;
  for (let i = 0; i < count; i++) {
    // Slot 0 is the road's; the others fan out from it.
    if (i === 0) continue;
    const angle = roadSlot + (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.2;
    const dist = ring * (0.85 + rng() * 0.3);
    const x = spec.centre[0] + Math.cos(angle) * dist;
    const z = spec.centre[1] + Math.sin(angle) * dist;
    // The door faces the well: local +Z, which transformInto maps to (-sin yaw, cos yaw),
    // points toward the centre.
    const yaw = Math.atan2(x - spec.centre[0], spec.centre[1] - z) + (rng() - 0.5) * 0.2;
    houses.push({
      x,
      z,
      y: spec.y,
      yaw,
      width: 7 + rng() * 4,
      depth: 6 + rng() * 3,
      wallHeight: 3.2 + rng() * 1.2,
      roofHeight: 2.6 + rng() * 1.4,
      seed: i,
    });
  }
  const visual = nb();
  const collider = nb();
  const add = (m: { visual: MeshData; collider: MeshData }): void => {
    transformInto(visual, m.visual as B, { x: 0, y: 0, z: 0, yaw: 0 });
    transformInto(collider, m.collider as B, { x: 0, y: 0, z: 0, yaw: 0 });
  };
  for (const h of houses) add(houseMesh(h));
  add(wellMesh(spec.centre[0], spec.y, spec.centre[1]));
  return { houses, well: spec.centre, visual, collider };
}
