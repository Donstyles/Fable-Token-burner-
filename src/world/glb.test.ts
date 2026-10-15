import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../../kernel/plan/level';
import { bakeVertexLight } from '../../kernel/light/bake';
import { buildLevelGlb } from '../../kernel/export/glb';
import { parseGlb } from './glb';

describe('glb reader', () => {
  it('reads back what the compile step writes', async () => {
    const plan = new LevelBuilder('rt');
    plan.hall({ name: 'h', at: [0, 0, 0], size: [6, 4], height: 3 });
    plan.waterPlane({ at: [0, 0.2, 0], size: [2, 2] });
    plan.light([0, 2, 0], [1, 0.5, 0.2], 6, 1);
    const level = await plan.build();
    const visual = bakeVertexLight(level.visual, level.lights, {
      ambient: [0.1, 0.1, 0.1],
      cell: 2,
    });
    const glb = await buildLevelGlb({ ...level, visual }, { chunk: 100 });
    const bytes = new Uint8Array(glb.byteLength);
    bytes.set(glb);
    const nodes = parseGlb(bytes.buffer);
    const names = nodes.map((n) => n.name);
    expect(names).toEqual(['visual', 'collider', 'water', 'waterfalls']);
    const visualNode = nodes[0]!;
    // A hall centred on the origin straddles the chunk planes: eight chunks.
    expect(visualNode.children.length).toBe(8);
    const prims = visualNode.children.flatMap((c) => c.primitives);
    const roles = prims.map((p) => p.material).sort();
    expect(roles).toContain('role:1');
    expect(roles).toContain('role:2');
    for (const p of prims) {
      expect(p.normals).not.toBeNull();
      expect(p.uvs).not.toBeNull();
      expect(p.colors).not.toBeNull();
      expect(p.colorSize).toBe(3);
      expect(p.indices.length % 3).toBe(0);
      // Every index addresses a vertex.
      for (const i of p.indices) expect(i).toBeLessThan(p.positions.length / 3);
      // Baked light is at least the ambient everywhere.
      for (let i = 0; i < p.colors!.length; i += 3)
        expect(p.colors![i]).toBeGreaterThanOrEqual(0.1 - 1e-6);
    }
    const collider = nodes[1]!.primitives[0]!;
    expect(collider.normals).toBeNull();
    expect(collider.indices.length / 3).toBe(level.collider.indices.length / 3);
    const water = nodes[2]!.primitives[0]!;
    expect(water.material).toBe('water:water-1');
    // Positions survive untouched: the walls' cornice spans x in [-3.72, 3.72].
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of prims) {
      for (let i = 0; i < p.positions.length; i += 3) {
        minX = Math.min(minX, p.positions[i]!);
        maxX = Math.max(maxX, p.positions[i]!);
      }
    }
    expect(minX).toBeCloseTo(-3.72, 3);
    expect(maxX).toBeCloseTo(3.72, 3);
  });
});
