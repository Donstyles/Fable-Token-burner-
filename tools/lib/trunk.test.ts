import { describe, expect, it } from 'vitest';
import { rootsOf, trunkOf } from './trunk';
import type { Triangles } from './quality';

/** A prism of `sides` round (x, z) of radius r from y0 to y1, as walls of triangles. */
function prism(x: number, z: number, r: number, y0: number, y1: number, sides = 12): number[] {
  const out: number[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const b = ((i + 1) / sides) * Math.PI * 2;
    const p = [x + Math.cos(a) * r, z + Math.sin(a) * r];
    const q = [x + Math.cos(b) * r, z + Math.sin(b) * r];
    out.push(p[0]!, y0, p[1]!, q[0]!, y0, q[1]!, q[0]!, y1, q[1]!);
    out.push(p[0]!, y0, p[1]!, q[0]!, y1, q[1]!, p[0]!, y1, p[1]!);
  }
  return out;
}

const tris = (data: number[]): Triangles => ({
  data: Float64Array.from(data),
  count: data.length / 9,
});

describe('a tree’s trunk', () => {
  it('finds a trunk standing off the middle, at its own thickness', () => {
    // The trunk, and a crown far above it to set the model's middle.
    const t = tris([...prism(0.6, -0.4, 0.5, 0, 6), ...prism(0, 0, 3, 5, 9)]);
    const trunk = trunkOf(t)!;
    expect(trunk.at[0]).toBeCloseTo(0.6, 1);
    expect(trunk.at[1]).toBeCloseTo(-0.4, 1);
    expect(trunk.radius).toBeGreaterThan(0.43);
    expect(trunk.radius).toBeLessThan(0.55);
  });

  it('leaves the roots’ flare under the band and a thin fin off the trunk', () => {
    const fin = [0.5, 1.0, 0, 2.5, 1.0, 0, 2.5, 1.6, 0, 0.5, 1.0, 0, 2.5, 1.6, 0, 0.5, 1.6, 0];
    const t = tris([...prism(0, 0, 0.5, 0, 6), ...prism(0, 0, 2, 0, 0.6), ...fin]);
    expect(trunkOf(t)!.radius).toBeLessThan(0.6);
  });

  it('finds nothing where nothing stands in the band', () => {
    expect(trunkOf(tris(prism(0, 0, 3, 5, 9)))).toBeNull();
  });

  it('covers the roots flaring at shin height with a few discs, none where there are none', () => {
    // A trunk 0.5 m round, and a root running out east from inside it to 2.2 m, at knee
    // height, 0.6 m wide: a box's four walls.
    const wall = (a: number[], b: number[]) => [
      a[0]!,
      0,
      a[1]!,
      b[0]!,
      0,
      b[1]!,
      b[0]!,
      0.7,
      b[1]!,
      a[0]!,
      0,
      a[1]!,
      b[0]!,
      0.7,
      b[1]!,
      a[0]!,
      0.7,
      a[1]!,
    ];
    const corners = [
      [0.3, -0.3],
      [2.2, -0.3],
      [2.2, 0.3],
      [0.3, 0.3],
    ];
    const root = corners.flatMap((c, i) => wall(c, corners[(i + 1) % 4]!));
    const t = tris([...prism(0, 0, 0.5, 0, 6), ...root, ...prism(0, 0, 3, 5, 9)]);
    const trunk = trunkOf(t)!;
    const roots = rootsOf(t, trunk);
    expect(roots.length).toBeGreaterThan(0);
    // Every disc on the root, east of the trunk; the root's far end is covered.
    for (const [x, z] of roots) {
      expect(x).toBeGreaterThan(0.4);
      expect(Math.abs(z)).toBeLessThan(0.4);
    }
    expect(Math.max(...roots.map(([x, , r]) => x + r))).toBeGreaterThan(1.8);
    // A plain trunk has none.
    const bare = tris([...prism(0, 0, 0.5, 0, 6), ...prism(0, 0, 3, 5, 9)]);
    expect(rootsOf(bare, trunkOf(bare)!)).toEqual([]);
  });
});
