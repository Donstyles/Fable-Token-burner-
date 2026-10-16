/**
 * Small solids for generated structures (houses, the cave mouth): quads and boxes with
 * world-unit planar UVs, in a local frame placed into the world by `transformInto`.
 */
import type { MeshData } from '../core/mesh';

export interface B {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  materials: number[];
}

export const nb = (): B => ({ positions: [], normals: [], uvs: [], indices: [], materials: [] });

export type V3 = [number, number, number];

/** A quad from four corners (counter-clockwise seen from the front), world-unit UVs. */
export function quad(b: B, p: [V3, V3, V3, V3], role: number, uvScale = 1): void {
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
export function box(b: B, min: V3, max: V3, role: number): void {
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

export function transformInto(
  into: B,
  local: MeshData,
  h: { x: number; y: number; z: number; yaw: number },
): void {
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
