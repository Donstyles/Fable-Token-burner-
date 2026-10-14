import { describe, expect, it } from 'vitest';
import type { MeshBuilder } from './index';
import {
  arch,
  box,
  circle,
  cylinder,
  extrude,
  isWatertight,
  linearArray,
  loft,
  mirrorX,
  radialArray,
  rect,
  revolve,
  signedArea,
  signedVolume,
  sweep,
  v3,
  vertex,
  type Vec3,
} from './index';

/** Every face normal of a convex solid must point away from its centre. */
function normalsPointOutward(m: MeshBuilder): boolean {
  const d = m.toMeshData();
  const b = m.bounds();
  const centre = v3.scale(v3.add(b.min, b.max), 0.5);
  for (let i = 0; i < d.indices.length; i += 3) {
    const a = vertex(d, d.indices[i] ?? 0);
    const bb = vertex(d, d.indices[i + 1] ?? 0);
    const c = vertex(d, d.indices[i + 2] ?? 0);
    const centroid = v3.scale(v3.add(v3.add(a, bb), c), 1 / 3);
    const n = v3.normalize(v3.cross(v3.sub(bb, a), v3.sub(c, a)));
    if (v3.dot(n, v3.sub(centroid, centre)) <= 0) return false;
  }
  return true;
}

describe('extrude and box', () => {
  it('builds a watertight box of the right volume with outward faces', () => {
    const m = box(2, 3, 4);
    expect(m.triangleCount).toBe(12);
    expect(isWatertight(m.toMeshData())).toBe(true);
    expect(signedVolume(m.toMeshData())).toBeCloseTo(24, 6);
    expect(normalsPointOutward(m)).toBe(true);
  });

  it('extrudes a clockwise profile just as well', () => {
    const cw = [...rect(2, 2)].reverse();
    expect(signedArea(cw)).toBeLessThan(0);
    const m = extrude(cw, 5);
    expect(signedVolume(m.toMeshData())).toBeCloseTo(20, 6);
    expect(isWatertight(m.toMeshData())).toBe(true);
  });

  it('extrudes a concave arch outline (ear clipping)', () => {
    const p = arch(2, 2, 'round', 8);
    const m = extrude(p, 1);
    expect(isWatertight(m.toMeshData())).toBe(true);
    // Rectangle 2×2 plus a half disc of radius 1 (polygonised, slightly less than π/2).
    const v = signedVolume(m.toMeshData());
    expect(v).toBeGreaterThan(4 + 1.5);
    expect(v).toBeLessThan(4 + Math.PI / 2 + 1e-6);
  });

  it('maps default UVs in world units by dominant axis', () => {
    const m = box(2, 2, 2);
    const d = m.toMeshData();
    // Find the +Y face: its vertices have normal (0,1,0) and uv = (x, z).
    for (let i = 0; i < d.normals.length; i += 3) {
      if ((d.normals[i + 1] ?? 0) > 0.99) {
        expect(d.uvs[(i / 3) * 2]).toBeCloseTo(d.positions[i] ?? 0, 9);
        expect(d.uvs[(i / 3) * 2 + 1]).toBeCloseTo(d.positions[i + 2] ?? 0, 9);
      }
    }
  });
});

describe('revolve and cylinder', () => {
  it('matches the analytic volume at 32 segments', () => {
    const m = cylinder(1, 2, 32);
    const v = signedVolume(m.toMeshData());
    expect(v).toBeGreaterThan(Math.PI * 2 * 0.98);
    expect(v).toBeLessThan(Math.PI * 2);
    expect(isWatertight(m.toMeshData())).toBe(true);
    expect(normalsPointOutward(m)).toBe(true);
  });

  it('revolves a column outline with a wider base', () => {
    const m = revolve(
      [
        [0, 0],
        [0.6, 0],
        [0.6, 0.3],
        [0.4, 0.3],
        [0.4, 3],
        [0.6, 3],
        [0.6, 3.3],
        [0, 3.3],
      ],
      12,
    );
    expect(isWatertight(m.toMeshData())).toBe(true);
    expect(signedVolume(m.toMeshData())).toBeGreaterThan(0);
  });
});

describe('sweep', () => {
  it('along a straight path equals an extrusion', () => {
    const path: Vec3[] = [
      [0, 0, 0],
      [5, 0, 0],
    ];
    const m = sweep(rect(1, 2), path);
    expect(signedVolume(m.toMeshData())).toBeCloseTo(10, 6);
    expect(isWatertight(m.toMeshData())).toBe(true);
  });

  it('keeps a bend watertight with a sensible volume', () => {
    const path: Vec3[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      path.push([4 * Math.cos(a), 0, 4 * Math.sin(a)]);
    }
    const m = sweep(circle(0.5, 12), path);
    expect(isWatertight(m.toMeshData())).toBe(true);
    const arcLength = (Math.PI / 2) * 4;
    const v = signedVolume(m.toMeshData());
    expect(v).toBeGreaterThan(Math.PI * 0.25 * arcLength * 0.9);
    expect(v).toBeLessThan(Math.PI * 0.25 * arcLength * 1.05);
  });
});

describe('loft and arrays', () => {
  it('lofts a prism', () => {
    const r0 = rect(2, 2).map(([x, y]) => [x, 0, y] as Vec3);
    const r1 = rect(2, 2).map(([x, y]) => [x, 3, y] as Vec3);
    const m = loft([r0, r1]);
    expect(isWatertight(m.toMeshData())).toBe(true);
    expect(Math.abs(signedVolume(m.toMeshData()))).toBeCloseTo(12, 6);
  });

  it('repeats and mirrors without turning solids inside out', () => {
    const b = box(1, 1, 1);
    expect(linearArray(b, 4, [2, 0, 0]).triangleCount).toBe(48);
    expect(radialArray(b, 6, 5).triangleCount).toBe(72);
    const mirrored = mirrorX(b.translate(3, 0, 0));
    expect(signedVolume(mirrored.toMeshData())).toBeCloseTo(1, 6);
    expect(mirrored.bounds().min[0]).toBeCloseTo(-3.5, 6);
  });
});
