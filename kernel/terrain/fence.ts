/**
 * Split-rail fences built by the kernel, as its walls and the cave mouth are (owner,
 * 2026-10-23: "I think you have to generate fences yourselves, you haven't managed with the
 * fence model"; Meshy's three-metre section read as a dark blob and stood level on a slope).
 * Along a line: a post every 2.5 m, set 0.3 m into the ground and standing 1.25 m out of it,
 * two rails between each pair of posts at 0.45 and 0.95 m that follow the ground from post to
 * post, all in the plank role. The collider is one slab 1.25 m tall along the line, so the
 * party cannot step between the rails and the monsters path round the end.
 */
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import { box, nb, quad, transformInto, type B, type V3 } from './solids';
import type { P2 } from './spline';

export const FENCE = {
  spacing: 2.5,
  post: 0.16,
  height: 1.25,
  sunk: 0.3,
  rails: [0.45, 0.95],
  rail: { width: 0.08, depth: 0.12 },
} as const;

/**
 * A beam from `a` to `c` with a `w` by `h` section: its sides stand upright and its ends
 * square to the run, so a rail on a slope stays a rail. UVs run along its length in metres.
 */
export function beam(b: B, a: V3, c: V3, w: number, h: number, role: number): void {
  const dx = c[0] - a[0];
  const dz = c[2] - a[2];
  const run = Math.hypot(dx, dz) || 1;
  // Half the width across the run, level.
  const sx = (-dz / run) * (w / 2);
  const sz = (dx / run) * (w / 2);
  const corner = (p: V3, side: number, up: number): V3 => [
    p[0] + sx * side,
    p[1] + (h / 2) * up,
    p[2] + sz * side,
  ];
  const a00 = corner(a, -1, -1);
  const a10 = corner(a, 1, -1);
  const a11 = corner(a, 1, 1);
  const a01 = corner(a, -1, 1);
  const c00 = corner(c, -1, -1);
  const c10 = corner(c, 1, -1);
  const c11 = corner(c, 1, 1);
  const c01 = corner(c, -1, 1);
  quad(b, [a01, c01, c11, a11], role); // top
  quad(b, [a10, c10, c00, a00], role); // bottom
  quad(b, [a00, c00, c01, a01], role); // one side
  quad(b, [c10, a10, a11, c11], role); // the other
  quad(b, [a10, a00, a01, a11], role); // the end at a
  quad(b, [c00, c10, c11, c01], role); // the end at c
}

/** Posts and rails along `line` on the ground `ground(x, z)`, into `visual` and `solids`. */
export function fenceAlong(
  visual: MeshData,
  solids: MeshData,
  line: readonly P2[],
  ground: (x: number, z: number) => number,
): { posts: number } {
  const v = nb();
  const c = nb();
  let posts = 0;
  for (let k = 0; k + 1 < line.length; k++) {
    const p = line[k]!;
    const q = line[k + 1]!;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.01) continue;
    const n = Math.max(1, Math.round(len / FENCE.spacing));
    const yaw = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const at = (i: number): V3 => {
      const t = i / n;
      const x = p[0] + (q[0] - p[0]) * t;
      const z = p[1] + (q[1] - p[1]) * t;
      return [x, ground(x, z), z];
    };
    // The corner post is the last of one run and the first of the next: drawn once.
    for (let i = k === 0 ? 0 : 1; i <= n; i++) {
      const [x, y, z] = at(i);
      const post = nb();
      const r = FENCE.post / 2;
      box(post, [-r, -FENCE.sunk, -r], [r, FENCE.height, r], ROLE.plank);
      transformInto(v, post, { x, y, z, yaw });
      posts++;
    }
    for (let i = 0; i < n; i++) {
      const a = at(i);
      const b = at(i + 1);
      for (const h of FENCE.rails) {
        beam(
          v,
          [a[0], a[1] + h, a[2]],
          [b[0], b[1] + h, b[2]],
          FENCE.rail.width,
          FENCE.rail.depth,
          ROLE.plank,
        );
      }
      // The collider: a slab from post to post, the posts' height above the lower ground.
      const low = Math.min(a[1], b[1]);
      const mid = FENCE.height / 2 - FENCE.sunk / 2;
      beam(
        c,
        [a[0], low + mid, a[2]],
        [b[0], low + mid + (b[1] - a[1]), b[2]],
        0.2,
        FENCE.height + FENCE.sunk + Math.abs(b[1] - a[1]),
        ROLE.collider,
      );
    }
  }
  append(visual, v);
  append(solids, c);
  return { posts };
}

function append(into: MeshData, from: B): void {
  const base = into.positions.length / 3;
  into.positions.push(...from.positions);
  into.normals.push(...from.normals);
  into.uvs.push(...from.uvs);
  into.indices.push(...from.indices.map((i) => i + base));
  into.materials.push(...from.materials);
}
