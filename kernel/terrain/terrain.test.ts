import { describe, expect, it } from 'vitest';
import { backdropMesh } from './backdrop';
import { CAVE, caveLocalOf, caveMouth } from './cave';
import { Heightfield } from './heightfield';
import { fbm, ridged } from './noise';
import { GroundPath, headingDeg, smoothPath } from './spline';

describe('noise', () => {
  it('is deterministic and bounded', () => {
    expect(fbm(12.3, -4.5, 100, 7)).toBe(fbm(12.3, -4.5, 100, 7));
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 13.7, i * -5.1, 120, 3);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      const r = ridged(i * 7.3, i * 2.9, 90, 5);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe('ground paths', () => {
  it('measures distance and arc length along a path', () => {
    const straight = new GroundPath([
      [0, 0],
      [0, 100],
      [100, 100],
    ]);
    expect(straight.length).toBeCloseTo(200);
    const hit = straight.nearest(10, 50);
    expect(hit.distance).toBeCloseTo(10);
    expect(hit.along).toBeCloseTo(50);
    expect(hit.tangent).toEqual([0, 1]);
    expect(straight.at(150)).toEqual([50, 100]);
    const smooth = new GroundPath(
      smoothPath(
        [
          [0, 0],
          [0, 100],
          [100, 100],
        ],
        4,
      ),
    );
    expect(smooth.length).toBeGreaterThan(190);
    expect(smooth.at(0)).toEqual([0, 0]);
    expect(smooth.at(smooth.length)).toEqual([100, 100]);
  });
});

describe('heightfield', () => {
  it('samples bilinearly and gives slopes', () => {
    const hf = new Heightfield(4, 10);
    for (let j = 0; j < hf.n; j++) for (let i = 0; i < hf.n; i++) hf.set(i, j, i * 10);
    expect(hf.sample(-15, 0)).toBeCloseTo(5);
    expect(hf.slopeDeg(2, 2)).toBeCloseTo(45);
    expect(hf.normal(2, 2)[0]).toBeLessThan(0);
  });
});

describe('cave mouth', () => {
  it('is a solid tunnel into the hill with the portal at its back', () => {
    const yaw = Math.PI / 3;
    const cave = caveMouth({ x: 50, y: 20, z: -10, yaw });
    expect(cave.visual.indices.length / 3).toBeGreaterThan(60);
    expect(cave.collider.indices.length).toBe(cave.visual.indices.length);
    // The portal lies CAVE.length - 4.5 m into the hill along local +Z, at floor height.
    const portal = caveLocalOf({ x: 50, y: 20, z: -10, yaw }, cave.portal[0], cave.portal[2]);
    expect(portal.x).toBeCloseTo(0);
    expect(portal.z).toBeCloseTo(CAVE.length - 4.5);
    expect(cave.portal[1]).toBe(20);
    // The arrival point is outside the mouth, on the threshold.
    const arrive = caveLocalOf({ x: 50, y: 20, z: -10, yaw }, cave.arrive[0], cave.arrive[2]);
    expect(arrive.z).toBeLessThan(0);
    expect(arrive.z).toBeGreaterThan(-CAVE.threshold);
    // Every visual vertex is within the knoll's reach of the mouth.
    for (let i = 0; i < cave.visual.positions.length; i += 3) {
      const l = caveLocalOf(
        { x: 50, y: 20, z: -10, yaw },
        cave.visual.positions[i]!,
        cave.visual.positions[i + 2]!,
      );
      expect(Math.abs(l.x)).toBeLessThanOrEqual(CAVE.width / 2 + CAVE.skirt + 0.01);
      expect(l.z).toBeGreaterThanOrEqual(-CAVE.threshold - 0.01);
      expect(l.z).toBeLessThanOrEqual(CAVE.length + CAVE.skirt + 0.01);
    }
  });
});

describe('backdrop', () => {
  it('rings the map, joins its edge heights and climbs into peaks outward', () => {
    const edge = (x: number, z: number): number => 50 + x * 0.01 + z * 0.02;
    const b = backdropMesh({
      seed: 3,
      half: 512,
      reach: 2000,
      rings: 6,
      segments: 48,
      peak: 800,
      snowLine: 300,
      edgeHeight: edge,
    });
    expect(b.positions.length / 3).toBe(7 * 48);
    expect(b.indices.length / 3).toBe(6 * 48 * 2);
    expect(b.colors.length).toBe(b.positions.length);
    for (const v of b.positions) expect(Number.isFinite(v)).toBe(true);
    // The inner ring sits at the edge height (within the noise), the outer well above it.
    let innerDiff = 0;
    let outer = 0;
    for (let k = 0; k < 48; k++) {
      const i = k * 3;
      innerDiff += Math.abs(b.positions[i + 1]! - edge(b.positions[i]!, b.positions[i + 2]!));
      outer += b.positions[(6 * 48 + k) * 3 + 1]!;
    }
    expect(innerDiff / 48).toBeLessThan(1);
    expect(outer / 48).toBeGreaterThan(300);
    // Snow only high up: the lowest ring carries none.
    for (let k = 0; k < 48; k++) expect(b.colors[k * 3 + 2]).toBe(0);
    // Faces wind counter-clockwise seen from above, like the terrain: their normals point up.
    let up = 0;
    for (let t = 0; t < b.indices.length; t += 3) {
      const [ia, ib, ic] = [b.indices[t]! * 3, b.indices[t + 1]! * 3, b.indices[t + 2]! * 3];
      const ux = b.positions[ib]! - b.positions[ia]!;
      const uz = b.positions[ib + 2]! - b.positions[ia + 2]!;
      const vx = b.positions[ic]! - b.positions[ia]!;
      const vz = b.positions[ic + 2]! - b.positions[ia + 2]!;
      up += uz * vx - ux * vz;
    }
    expect(up).toBeGreaterThan(0);
    expect(b.normals.filter((_, i) => i % 3 === 1).every((ny) => ny > 0)).toBe(true);
  });

  it('opens onto lower land where a pass meets the edge', () => {
    const spec = {
      seed: 3,
      half: 512,
      rings: 6,
      segments: 48,
      reach: 2000,
      peak: 800,
      snowLine: 300,
      edgeHeight: () => 250,
    };
    const closed = backdropMesh(spec);
    const open = backdropMesh({ ...spec, openings: [{ x: -512, z: 0, radius: 300, floor: 130 }] });
    // The vertex nearest the west edge's middle on each ring: the join is unchanged, the
    // rings beyond sit far lower with the opening.
    const west = (b: typeof closed, ring: number): number => {
      let best = Infinity;
      let y = 0;
      for (let k = 0; k < 48; k++) {
        const i = (ring * 48 + k) * 3;
        if (b.positions[i]! >= 0) continue;
        const d = Math.abs(b.positions[i + 2]!);
        if (d < best) {
          best = d;
          y = b.positions[i + 1]!;
        }
      }
      return y;
    };
    expect(west(open, 0)).toBeCloseTo(west(closed, 0));
    expect(west(open, 3)).toBeLessThan(west(closed, 3) - 200);
    expect(west(open, 6)).toBeLessThan(west(closed, 6) - 300);
  });
});

describe('headings', () => {
  it('names the compass directions as the dungeons do', () => {
    expect(headingDeg(0, 1)).toBeCloseTo(0);
    expect(headingDeg(-1, 0)).toBeCloseTo(90);
    expect(Math.abs(headingDeg(0, -1))).toBeCloseTo(180);
  });
});
