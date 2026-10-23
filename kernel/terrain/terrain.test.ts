import { describe, expect, it } from 'vitest';
import { backdropMesh } from './backdrop';
import { ROLE } from '../elements/roles';
import { CAVE, caveLocalOf, caveMouth, caveShade } from './cave';
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
  // A hillside rising 0.45 m a metre into the hill, the floor dug CAVE.sink below its threshold.
  const spec = { x: 50, y: 20, z: -10, yaw: Math.PI / 3 };
  const hill = (x: number, z: number): number =>
    spec.y + CAVE.sink + 0.45 * caveLocalOf(spec, x, z).z;
  const cave = caveMouth(spec, { height: hill, splat: () => [0, 0, 0] });
  const local = (i: number, from: number[] = cave.visual.positions) => ({
    ...caveLocalOf(spec, from[i * 3]!, from[i * 3 + 2]!),
    y: from[i * 3 + 1]! - spec.y,
  });

  it('opens a solid tunnel into the hill with the portal at its back', () => {
    expect(cave.visual.indices.length / 3).toBeGreaterThan(2000);
    // Everything drawn is solid: the party walks the fine ground and stops at the rock.
    expect(cave.collider.indices).toEqual(cave.visual.indices);
    // The portal lies CAVE.length - 4.5 m into the hill along local +Z, at floor height.
    const portal = caveLocalOf(spec, cave.portal[0], cave.portal[2]);
    expect(portal.x).toBeCloseTo(0);
    expect(portal.z).toBeCloseTo(CAVE.length - 4.5);
    expect(cave.portal[1]).toBe(spec.y);
    // The arrival point is on the apron before the mouth, on its gentle fall.
    const arrive = caveLocalOf(spec, cave.arrive[0], cave.arrive[2]);
    expect(arrive.z).toBeLessThan(-2);
    expect(arrive.z).toBeGreaterThan(-6);
    expect(cave.arrive[1]).toBeLessThanOrEqual(spec.y);
    expect(cave.arrive[1]).toBeGreaterThan(spec.y - 1);
    // Every visual vertex lies on the shaped ground's rectangle.
    for (let i = 0; i < cave.visual.positions.length / 3; i++) {
      const l = local(i);
      expect(Math.abs(l.x)).toBeLessThanOrEqual(CAVE.side + 0.01);
      expect(l.z).toBeGreaterThanOrEqual(-CAVE.front - 0.01);
      expect(l.z).toBeLessThanOrEqual(CAVE.back + 0.01);
    }
  });

  it('draws the ground in the terrain role and the tunnel falling off into darkness', () => {
    const { materials, indices, colors } = cave.visual;
    expect(colors.length).toBe(cave.visual.positions.length);
    let lit = 0;
    for (let t = 0; t < materials.length; t++) {
      for (let k = 0; k < 3; k++) {
        const v = indices[t * 3 + k]!;
        const c = [colors[v * 3]!, colors[v * 3 + 1]!, colors[v * 3 + 2]!];
        for (const ch of c) expect(ch).toBeGreaterThanOrEqual(0);
        if (materials[t] === ROLE.terrain) {
          // Splat weights, as the terrain's own: never more than the whole.
          expect(c[0]! + c[1]! + c[2]!).toBeLessThanOrEqual(1.0001);
          continue;
        }
        expect([ROLE.rock, ROLE.path]).toContain(materials[t]);
        for (const ch of c) expect(ch).toBeLessThanOrEqual(1);
        const l = local(v);
        // No daylight ten metres in: the end of the tunnel is black from the mouth.
        if (l.z > 10.5) expect(Math.max(...c)).toBe(0);
        if (l.z < 0.5 && Math.max(...c) > 0.5) lit++;
      }
    }
    expect(lit).toBeGreaterThan(20);
    expect(caveShade(-1)).toBeGreaterThan(0.95);
    expect(caveShade(4)).toBeGreaterThan(0.3);
    expect(caveShade(10.5)).toBe(0);
  });

  it('stands its rocks clear of the tunnel and of the way in', () => {
    expect(cave.props.length).toBeGreaterThanOrEqual(8);
    expect(new Set(cave.props.map((p) => p.model))).toEqual(
      new Set(['rock-outcrop-01', 'rock-boulder-01', 'rock-boulder-02', 'rock-cluster-01']),
    );
    // Each rock's box, as the runtime builds it: twelve triangles, its corners in the mouth's
    // frame. The tunnel's inside and a 6.4 m lane from 14 m out stay clear of every one.
    const boxes = cave.rockBoxes;
    expect(boxes.indices.length / 3).toBe(cave.props.length * 12);
    const hw = CAVE.width / 2;
    for (let b = 0; b < cave.props.length; b++) {
      const corners = Array.from({ length: 24 }, (_, k) => local(b * 24 + k, boxes.positions));
      const y0 = Math.min(...corners.map((c) => c.y));
      const y1 = Math.max(...corners.map((c) => c.y));
      const blocks = (x: number, z0: number, z1: number, top: number): boolean => {
        if (y0 >= top || y1 <= 0) return false;
        // Separating axes of two rectangles: the lane's own and the box's two sides.
        const quad = corners.filter((c) => Math.abs(c.y - y0) < 1e-6).slice(0, 4);
        const lane = [
          { x: -x, z: z0 },
          { x, z: z0 },
          { x, z: z1 },
          { x: -x, z: z1 },
        ];
        const axes = [
          { x: 1, z: 0 },
          { x: 0, z: 1 },
          { x: quad[1]!.x - quad[0]!.x, z: quad[1]!.z - quad[0]!.z },
          { x: quad[2]!.x - quad[1]!.x, z: quad[2]!.z - quad[1]!.z },
        ];
        return axes.every((a) => {
          const span = (ps: { x: number; z: number }[]) => ps.map((p) => p.x * a.x + p.z * a.z);
          const p = span(quad);
          const q = span(lane);
          return Math.max(...p) > Math.min(...q) && Math.max(...q) > Math.min(...p);
        });
      };
      const model = cave.props[b]!.model;
      expect(blocks(hw + 0.5, -0.6, CAVE.length, CAVE.height + 0.3), `${model} in the tunnel`).toBe(
        false,
      );
      expect(blocks(hw, -14, 0, 2.2), `${model} on the way in`).toBe(false);
    }
  });

  it('presses the coarse ground under the tunnel and the fine ground, and nowhere else', () => {
    const hf = new Heightfield(40, 5);
    for (let j = 0; j < hf.n; j++)
      for (let i = 0; i < hf.n; i++) hf.set(i, j, hill(hf.x(i), hf.z(j)));
    const before = Float32Array.from(hf.heights);
    cave.press(hf);
    let under = 0;
    for (let j = 0; j < hf.n; j++) {
      for (let i = 0; i < hf.n; i++) {
        const k = j * hf.n + i;
        const l = caveLocalOf(spec, hf.x(i), hf.z(j));
        expect(hf.heights[k]).toBeLessThanOrEqual(before[k]!);
        if (Math.abs(l.x) <= CAVE.width / 2 && l.z >= 0 && l.z <= CAVE.length) {
          // No coarse vertex under the tunnel rises to its floor.
          expect(hf.heights[k]).toBeLessThan(spec.y - 0.3);
          under++;
        }
        if (Math.abs(l.x) > CAVE.side + 5 || l.z > CAVE.back + 5 || l.z < -CAVE.front - 5)
          expect(hf.heights[k]).toBe(before[k]);
      }
    }
    expect(under).toBeGreaterThan(3);
    // No tree on the shaped ground; trees again beyond it.
    expect(cave.covers(spec.x, spec.z)).toBe(true);
    expect(cave.covers(spec.x + 60, spec.z)).toBe(false);
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
