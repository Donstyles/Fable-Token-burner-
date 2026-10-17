/**
 * The far backdrop (DESIGN.md 15.6): a square ring of mountains beyond the map edge, a
 * few thousand triangles rendered with the terrain material and never collided with. Its
 * inner edge continues the map's own edge heights, then ridges climb outward into the haze.
 */
import { ROLE } from '../elements/roles';
import type { ColouredMeshData } from './mesh';
import { fbm, ridged, smoothstep } from './noise';

export interface BackdropSpec {
  seed: number;
  /** Half-width of the map; the ring starts just outside it. */
  half: number;
  /** How far the ring reaches, metres beyond the map edge. */
  reach: number;
  rings: number;
  /** Vertices round one ring. */
  segments: number;
  /** Height the ridges climb to above the edge, metres. */
  peak: number;
  /** Snow above this height; put it out of reach for a desert. */
  snowLine: number;
  /** The map's height near its edge, so the ring joins it. */
  edgeHeight(x: number, z: number): number;
}

/** A point on the unit square's perimeter for u in [0, 1). */
function perimeter(u: number): [number, number] {
  const side = Math.floor(u * 4) % 4;
  const f = u * 4 - Math.floor(u * 4);
  switch (side) {
    case 0:
      return [-1 + 2 * f, -1];
    case 1:
      return [1, -1 + 2 * f];
    case 2:
      return [1 - 2 * f, 1];
    default:
      return [-1, 1 - 2 * f];
  }
}

export function backdropMesh(s: BackdropSpec): ColouredMeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const materials: number[] = [];
  const R = s.rings;
  const S = s.segments;
  const inner = s.half + 15;
  for (let i = 0; i <= R; i++) {
    const t = i / R;
    const e = inner + s.reach * Math.pow(t, 1.6);
    for (let k = 0; k < S; k++) {
      const [px, pz] = perimeter(k / S);
      const x = px * e;
      const z = pz * e;
      // The exact edge height at the join, giving way within 150 m to a profile averaged
      // along the edge, so a sharp ridge on the map's rim is not extruded into a blade.
      const edge = s.edgeHeight(px * (s.half - 12), pz * (s.half - 12));
      let smooth = 0;
      for (let o = -3; o <= 3; o++) {
        const [qx, qz] = perimeter(((((k + o * 2) % S) + S) / S) % 1);
        smooth += s.edgeHeight(qx * (s.half - 12), qz * (s.half - 12));
      }
      smooth /= 7;
      const profile = edge + (smooth - edge) * smoothstep(0, 0.12, t);
      // The land then rolls on for a few hundred metres before the ridges climb, so from a
      // summit near the edge the backdrop is a far range, not a wall of facets.
      const climb = smoothstep(0.22, 0.75, t);
      const ridgeLine = 0.35 + 0.65 * ridged(x, z, 900, s.seed);
      const roll = fbm(x, z, 220, s.seed + 2) * 30 * smoothstep(0, 0.2, t);
      const h =
        profile + roll + climb * s.peak * ridgeLine + fbm(x, z, 320, s.seed + 1) * 60 * climb;
      positions.push(x, h, z);
      normals.push(0, 0, 0);
    }
  }
  const at = (i: number, k: number): number => i * S + (((k % S) + S) % S);
  for (let i = 0; i < R; i++) {
    for (let k = 0; k < S; k++) {
      const a = at(i, k);
      const b = at(i, k + 1);
      const c = at(i + 1, k);
      const d = at(i + 1, k + 1);
      // Counter-clockwise seen from above, like the terrain: along the ring first, then
      // outward (the ring winds anticlockwise, so "along then out" turns left, like +x then +z).
      indices.push(a, b, c, b, d, c);
      materials.push(ROLE.terrain, ROLE.terrain);
    }
  }
  // Vertex normals from the faces.
  for (let t = 0; t < indices.length; t += 3) {
    const ia = indices[t]! * 3;
    const ib = indices[t + 1]! * 3;
    const ic = indices[t + 2]! * 3;
    const ux = positions[ib]! - positions[ia]!;
    const uy = positions[ib + 1]! - positions[ia + 1]!;
    const uz = positions[ib + 2]! - positions[ia + 2]!;
    const vx = positions[ic]! - positions[ia]!;
    const vy = positions[ic + 1]! - positions[ia + 1]!;
    const vz = positions[ic + 2]! - positions[ia + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [ia, ib, ic]) {
      normals[i] = normals[i]! + nx;
      normals[i + 1] = normals[i + 1]! + ny;
      normals[i + 2] = normals[i + 2]! + nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!) || 1;
    normals[i] = normals[i]! / len;
    normals[i + 1] = normals[i + 1]! / len;
    normals[i + 2] = normals[i + 2]! / len;
    // Splat from height and slope: snow on the tops, scree on the steep, the base elsewhere.
    const h = positions[i + 1]!;
    const slope = (Math.acos(Math.max(-1, Math.min(1, normals[i + 1]!))) * 180) / Math.PI;
    const scree = smoothstep(30, 45, slope);
    const snow = smoothstep(s.snowLine, s.snowLine + 40, h) * (1 - smoothstep(35, 50, slope));
    const total = scree + snow;
    colors.push(0, total > 1 ? scree / total : scree, total > 1 ? snow / total : snow);
  }
  return { positions, normals, uvs: [], indices, materials, colors };
}
