/**
 * A waterfall sheet shared by dungeons and terrain (DESIGN.md 11, 15.4): a ribbon from the
 * lip to the plunge point, leaving horizontally and arriving vertically. The runtime scrolls
 * foam down it and puts spray at the bottom.
 */
import { MeshBuilder } from '../core/mesh';
import { v3, type Vec3 } from '../core/math';
import { ROLE } from './roles';
import type { Waterfall } from '../plan/level';

export function waterfallRibbon(o: {
  name: string;
  lip: Vec3;
  plunge: Vec3;
  width: number;
}): Waterfall {
  const drop = o.lip[1] - o.plunge[1];
  const run: Vec3 = [o.plunge[0] - o.lip[0], 0, o.plunge[2] - o.lip[2]];
  const runLen = v3.length(run);
  const across: Vec3 = runLen > 1e-6 ? v3.normalize([-run[2], 0, run[0]]) : [1, 0, 0];
  // Cubic Bézier: tangent horizontal at the lip, vertical at the plunge. The first control
  // point sits close to the lip so the sheet bends down within a metre of leaving it,
  // like a slow stream over an edge, rather than shooting out horizontally.
  const c1: Vec3 = v3.add(o.lip, v3.scale(run, 0.15));
  const c2: Vec3 = [o.plunge[0], o.plunge[1] + drop * 0.45, o.plunge[2]];
  const segments = Math.max(6, Math.round(Math.hypot(drop, runLen) / 0.8));
  const m = new MeshBuilder();
  const at = (t: number): Vec3 => {
    const u = 1 - t;
    return [
      u * u * u * o.lip[0] +
        3 * u * u * t * c1[0] +
        3 * u * t * t * c2[0] +
        t * t * t * o.plunge[0],
      u * u * u * o.lip[1] +
        3 * u * u * t * c1[1] +
        3 * u * t * t * c2[1] +
        t * t * t * o.plunge[1],
      u * u * u * o.lip[2] +
        3 * u * u * t * c1[2] +
        3 * u * t * t * c2[2] +
        t * t * t * o.plunge[2],
    ];
  };
  const half = v3.scale(across, o.width / 2);
  let length = 0;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const p0 = at(t0);
    const p1 = at(t1);
    length += v3.length(v3.sub(p1, p0));
    const a = v3.sub(p0, half);
    const b = v3.add(p0, half);
    const c = v3.add(p1, half);
    const d = v3.sub(p1, half);
    // u across the ribbon, v down the fall; the runtime scrolls foam along v.
    m.addQuad(a, b, c, d, {
      material: ROLE.waterfall,
      uvs: [
        [0, t0],
        [1, t0],
        [1, t1],
        [0, t1],
      ],
    });
    // Back face, so the sheet reads from behind as well.
    m.addQuad(d, c, b, a, {
      material: ROLE.waterfall,
      uvs: [
        [0, t1],
        [1, t1],
        [1, t0],
        [0, t0],
      ],
    });
  }
  return {
    name: o.name,
    lip: o.lip,
    plunge: o.plunge,
    width: o.width,
    length,
    mesh: {
      positions: m.positions,
      normals: m.normals,
      uvs: m.uvs,
      indices: m.indices,
      materials: m.materials,
    },
  };
}
