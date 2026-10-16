/** The valley river as a water surface: a ribbon along the river path at the water level. */
import { ROLE } from '../elements/roles';
import type { WaterSurface } from '../plan/level';
import type { ValleyResult } from './valley';

export function riverSurface(v: ValleyResult): WaterSurface {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const materials: number[] = [];
  const pts = v.river.points;
  const hw = v.riverWidth / 2;
  let min = [Infinity, v.waterLevel, Infinity];
  let max = [-Infinity, v.waterLevel, -Infinity];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const t = v.river.nearest(p[0], p[1]).tangent;
    const nx = -t[1];
    const nz = t[0];
    for (const side of [-1, 1]) {
      const x = p[0] + nx * hw * side;
      const z = p[1] + nz * hw * side;
      positions.push(x, v.waterLevel, z);
      normals.push(0, 1, 0);
      uvs.push(x, z);
      min = [Math.min(min[0]!, x), v.waterLevel, Math.min(min[2]!, z)];
      max = [Math.max(max[0]!, x), v.waterLevel, Math.max(max[2]!, z)];
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      // Winding counter-clockwise from above.
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      materials.push(ROLE.water, ROLE.water);
    }
  }
  // The path runs south to north; the water flows south.
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const len = Math.hypot(first[0] - last[0], first[1] - last[1]) || 1;
  return {
    name: 'river',
    kind: 'river',
    y: v.waterLevel,
    bounds: {
      min: [min[0]!, v.waterLevel - 3, min[2]!],
      max: [max[0]!, v.waterLevel, max[2]!],
    },
    flow: [(first[0] - last[0]) / len, (first[1] - last[1]) / len],
    mesh: { positions, normals, uvs, indices, materials },
  };
}
