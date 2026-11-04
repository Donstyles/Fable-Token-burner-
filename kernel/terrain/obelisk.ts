/**
 * Obelisks built by the kernel, as its fences and walls are (DESIGN.md 17.20; MM6 stood one
 * in every outdoor map, each with a fragment of a message). A two-step plinth, a shaft that
 * tapers over its height to a pyramidion, all in dressed stone, set on the ground where it
 * stands; the collider is one box round the plinth, so the party walks round it and a tap on
 * the stone lands within a stride of its point. The lettering is the game's (src/game/sites.ts),
 * read from the status line, not cut into the mesh.
 */
import type { MeshData } from '../core/mesh';
import { ROLE } from '../elements/roles';
import { box, quad, type V3 } from './solids';
import type { P2 } from './spline';

export const OBELISK = {
  /** The plinth's two steps: half-widths and heights. */
  steps: [
    { half: 1.2, height: 0.35 },
    { half: 0.85, height: 0.3 },
  ],
  /** The shaft: half-width at its foot and at its shoulder, its height; the point above it. */
  foot: 0.42,
  shoulder: 0.27,
  height: 4.2,
  point: 0.75,
  /** How far below the ground the plinth is sunk, so a slope shows no gap. */
  sunk: 0.4,
} as const;

/** A tapering four-sided prism from a square of `h0` at `y0` to one of `h1` at `y1`. */
function taper(
  b: MeshData,
  x: number,
  z: number,
  y0: number,
  h0: number,
  y1: number,
  h1: number,
  role: number,
): void {
  const c = (h: number, y: number, sx: number, sz: number): V3 => [x + sx * h, y, z + sz * h];
  // Each side runs counter-clockwise seen from outside.
  const sides: [number, number, number, number][] = [
    [-1, 1, 1, 1], // +Z
    [1, -1, -1, -1], // -Z
    [1, 1, 1, -1], // +X
    [-1, -1, -1, 1], // -X
  ];
  for (const [ax, az, bx, bz] of sides) {
    quad(b, [c(h0, y0, ax, az), c(h0, y0, bx, bz), c(h1, y1, bx, bz), c(h1, y1, ax, az)], role);
  }
}

/** The obelisk at `at` on `ground`, into `visual` and its collider into `solids`. */
export function obeliskAt(
  visual: MeshData,
  solids: MeshData,
  at: P2,
  ground: (x: number, z: number) => number,
): { top: number } {
  const [x, z] = at;
  const y0 = ground(x, z) - OBELISK.sunk;
  let y = y0;
  for (const step of OBELISK.steps) {
    box(
      visual,
      [x - step.half, y, z - step.half],
      [x + step.half, y + step.height, z + step.half],
      ROLE.ashlar,
    );
    y += step.height;
  }
  const shoulder = y + OBELISK.height;
  taper(visual, x, z, y, OBELISK.foot, shoulder, OBELISK.shoulder, ROLE.ashlar);
  // The pyramidion: four triangles, each a quad with its top edge gathered to the point.
  const top = shoulder + OBELISK.point;
  taper(visual, x, z, shoulder, OBELISK.shoulder, top, 0, ROLE.ashlar);
  const base = OBELISK.steps[0]!.half;
  box(solids, [x - base, y0, z - base], [x + base, top, z + base], ROLE.collider);
  return { top };
}
