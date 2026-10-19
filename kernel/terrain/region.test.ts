import { describe, expect, it } from 'vitest';
import catalogueJson from '../../assets/props/catalogue.json';
import gullhaven from '../../levels/gullhaven/region';
import { MONSTERS, NPCS } from '../../src/game/monsters';
import { caveLocalOf } from './cave';
import { rectDistance } from './plots';
import type { PropCatalogue } from './props';
import { buildRegion, inside, type RegionScript } from './region';
import { GroundPath, smoothPath, type P2 } from './spline';

const CATALOGUE = catalogueJson as unknown as PropCatalogue;

/** A small coast for quick checks: land north of z = -60, a road, a wood, a cottage. */
const SMALL: RegionScript = {
  id: 'test-coast',
  seed: 3,
  width: 320,
  cell: 5,
  chunkCells: 16,
  base: 6,
  ripple: 1,
  sea: {
    level: 0,
    floor: -8,
    shore: 20,
    coast: [
      [-200, 200],
      [-200, -60],
      [200, -60],
      [200, 200],
    ],
  },
  hills: [{ at: [60, 80], radius: 50, height: 20 }],
  ridges: [],
  flats: [{ at: [0, 0], halfA: 30, halfB: 20, heading: 0, y: 6, soft: 10 }],
  roads: [
    {
      name: 'road',
      path: [
        [-120, 0],
        [0, 0],
        [120, 10],
      ],
      width: 8,
    },
  ],
  squares: [],
  lanes: [],
  forests: [
    {
      area: [
        [-140, 30],
        [-40, 30],
        [-40, 130],
        [-140, 130],
      ],
      spacing: 6,
      density: 0.8,
      kinds: ['oak'],
    },
  ],
  plots: [{ model: 'building-cottage-01', at: [0, 14], face: [0, 0] }],
  cave: { at: [44, 52], facing: 225, target: { level: 'showcase', entry: 'exit' } },
  residents: [{ kind: 'villager-woman', at: [5, -5], face: [0, 0] }],
  packs: [{ kind: 'goblin-scout', at: [-80, -20], count: 3, spread: 5 }],
  points: [{ name: 'square', at: [0, 0] }],
  start: { at: [0, -10], face: [0, 10] },
  environment: {
    lightColor: [1, 1, 1],
    ambientColor: [0.4, 0.4, 0.4],
    fogColor: [0.2, 0.3, 0.5],
    fogDensity: 0.0005,
    skyZenith: [0.1, 0.2, 0.5],
    skyHorizon: [0.2, 0.3, 0.5],
    cloudAmount: 0.4,
  },
  textures: { base: 'grass', path: 'path', scree: 'scree', snow: 'sand' },
};

describe('authored regions', () => {
  const level = buildRegion(SMALL);
  const hf = level.height;

  it('lays land inside the coast and sea outside, the shallows ankle deep', () => {
    expect(hf.width).toBe(320);
    // Far out at sea the bed is the floor; inland the land stands over the water.
    expect(hf.sample(0, -150)).toBeCloseTo(-8, 1);
    expect(hf.sample(-100, 60)).toBeGreaterThan(3);
    // The first metres off the beach are shallow.
    expect(hf.sample(0, -63)).toBeGreaterThan(-1);
    const sea = level.water.find((w) => w.name === 'sea')!;
    expect(sea.y).toBe(0);
    expect(sea.mirror).toBe('sky');
    // Fog is reckoned at the vertices: the sheet is a grid, not one quad.
    expect(sea.mesh.positions.length / 3).toBeGreaterThan(1000);
  });

  it('levels the town floor and lays the road with a path splat', () => {
    expect(hf.sample(0, 0)).toBeCloseTo(6, 0);
    const n = hf.n;
    const i = Math.round((60 + 160) / 5);
    const j = Math.round((5 + 160) / 5);
    // On the road east of town the path weight is full.
    expect(level.splat[(j * n + i) * 3]).toBeGreaterThan(0.9);
  });

  it('stands the cottage on a level pad facing the road', () => {
    const p = level.props.find((q) => q.model === 'building-cottage-01')!;
    expect(p).toBeDefined();
    // The model's front (+Z) turned by its yaw faces the road to the south.
    expect(-Math.sin(p.yaw)).toBeCloseTo(0, 5);
    expect(Math.cos(p.yaw)).toBeCloseTo(-1, 5);
    const m = CATALOGUE['building-cottage-01']!;
    for (const [dx, dz] of [
      [-m.size[0] / 2, -m.size[2] / 2],
      [m.size[0] / 2, m.size[2] / 2],
    ]) {
      expect(hf.sample(p.x + dx!, p.z + dz!)).toBeCloseTo(p.y + (m.base ?? 0), 1);
    }
    expect(level.points.some((q) => q.name === 'cottage-01')).toBe(true);
  });

  it('grows trees only in the wood, off the road', () => {
    expect(level.trees.length).toBeGreaterThan(100);
    const road = new GroundPath(smoothPath(SMALL.roads[0]!.path, 10));
    for (const t of level.trees) {
      expect(inside(SMALL.forests[0]!.area, t.x, t.z)).toBe(true);
      expect(road.nearest(t.x, t.z).distance).toBeGreaterThan(8);
      expect(t.y).toBeCloseTo(hf.sample(t.x, t.z), 5);
    }
  });

  it('cuts the cave into the hill with its portal inside and the party arriving outside', () => {
    const portal = level.portals.find((p) => p.name === 'cave')!;
    expect(portal.target).toEqual({ level: 'showcase', entry: 'exit' });
    const h = (225 * Math.PI) / 180;
    const yaw = Math.atan2(-Math.sin(h), -Math.cos(h));
    const spec = { x: 44, y: 0, z: 52, yaw };
    expect(caveLocalOf(spec, portal.position[0], portal.position[2]).z).toBeGreaterThan(5);
    expect(caveLocalOf(spec, portal.arrive.position[0], portal.arrive.position[2]).z).toBeLessThan(
      0,
    );
    expect(level.solids.indices.length).toBeGreaterThan(0);
  });

  it('places townsfolk and packs on the ground, the start facing its point', () => {
    expect(level.spawns.filter((s) => s.kind === 'goblin-scout')).toHaveLength(3);
    expect(level.spawns.filter((s) => s.kind === 'villager-woman')).toHaveLength(1);
    for (const s of level.spawns) {
      expect(s.position[1]).toBeCloseTo(hf.sample(s.position[0], s.position[2]), 5);
    }
    // Facing north from (0, -10) toward (0, 10): heading 0.
    expect(level.spawn.yawDeg).toBeCloseTo(0, 5);
  });

  it('keeps the sea side of the backdrop under the water and raises it behind the land', () => {
    const b = level.backdrop;
    let southLow = -Infinity;
    let northHigh = -Infinity;
    for (let i = 0; i < b.positions.length; i += 3) {
      const x = b.positions[i]!;
      const y = b.positions[i + 1]!;
      const z = b.positions[i + 2]!;
      if (z < -600 && Math.abs(x) < 300) southLow = Math.max(southLow, y);
      if (z > 600 && Math.abs(x) < 300) northHigh = Math.max(northHigh, y);
    }
    expect(southLow).toBeLessThan(0);
    expect(northHigh).toBeGreaterThan(50);
  });
});

describe('Gullhaven', () => {
  const level = buildRegion(gullhaven);
  const buildings = level.props.filter((p) => p.model.startsWith('building-'));

  it('is the 640 m starting region with its town, cave, sea and woods', () => {
    expect(level.height.width).toBe(640);
    expect(buildings.length).toBeGreaterThanOrEqual(10);
    expect(level.portals.map((p) => p.name)).toEqual(['cave']);
    expect(level.water.map((w) => w.name)).toEqual(['sea']);
    expect(level.trees.length).toBeGreaterThan(500);
  });

  it('never overlaps two buildings, and keeps them off the roads', () => {
    const rect = (p: (typeof buildings)[number]) => {
      const m = CATALOGUE[p.model]!;
      return { x: p.x, z: p.z, halfA: m.size[0] / 2, halfB: m.size[2] / 2, yaw: p.yaw };
    };
    // Sample each footprint's area and test it against every other footprint.
    for (const a of buildings) {
      const ra = rect(a);
      for (const b of buildings) {
        if (a === b) continue;
        const rb = rect(b);
        for (let u = -1; u <= 1; u += 0.25) {
          for (let v = -1; v <= 1; v += 0.25) {
            const c = Math.cos(ra.yaw);
            const s = Math.sin(ra.yaw);
            const x = ra.x + u * ra.halfA * c - v * ra.halfB * s;
            const z = ra.z + u * ra.halfA * s + v * ra.halfB * c;
            expect(rectDistance(x, z, rb), `${a.model} overlaps ${b.model}`).toBeGreaterThan(0);
          }
        }
      }
      for (const road of gullhaven.roads) {
        const g = new GroundPath(smoothPath(road.path, 10));
        const d = g.nearest(a.x, a.z).distance;
        const m = CATALOGUE[a.model]!;
        expect(d, `${a.model} on the ${road.name}`).toBeGreaterThan(
          Math.min(m.size[0], m.size[2]) / 2 + road.width / 2,
        );
      }
    }
  });

  it('faces every building toward the point its script names', () => {
    for (const plot of gullhaven.plots.filter((p) => p.model.startsWith('building-'))) {
      const placed = level.props.find(
        (p) => p.model === plot.model && p.x === plot.at[0] && p.z === plot.at[1],
      )!;
      const f: P2 = [plot.face[0] - plot.at[0], plot.face[1] - plot.at[1]];
      const len = Math.hypot(f[0], f[1]);
      expect(-Math.sin(placed.yaw)).toBeCloseTo(f[0] / len, 5);
      expect(Math.cos(placed.yaw)).toBeCloseTo(f[1] / len, 5);
    }
  });

  it('wakes the party on the waterfront, above the sea, facing the town', () => {
    const [x, y, z] = level.spawn.position;
    expect(y).toBeGreaterThan(2);
    expect(inside(gullhaven.sea!.coast, x, z)).toBe(true);
    // Heading north-ish, toward the square.
    expect(Math.abs(level.spawn.yawDeg)).toBeLessThan(30);
  });

  it('peoples it with townsfolk and monsters the game knows', () => {
    for (const s of level.spawns) {
      expect(s.kind in MONSTERS || s.kind in NPCS, s.kind).toBe(true);
    }
    expect(level.spawns.filter((s) => s.kind === 'skeleton-warrior')).toHaveLength(6);
    expect(level.spawns.filter((s) => s.kind in NPCS)).toHaveLength(2);
  });
});
