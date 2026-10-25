import { describe, expect, it } from 'vitest';
import catalogueJson from '../../assets/props/catalogue.json';
import gullhaven from '../../levels/gullhaven/region';
import { MONSTERS, NPCS } from '../../src/game/monsters';
import { ROLE } from '../elements/roles';
import { CAVE, caveLocalOf } from './cave';
import { rectDistance } from './plots';
import type { PropCatalogue } from './props';
import { buildRegion, fromMap, inside, type RegionScript } from './region';
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
  cave: { at: [44, 52], facing: 225, target: { level: 'barrow', entry: 'mouth' } },
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
    expect(portal.target).toEqual({ level: 'barrow', entry: 'mouth' });
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

describe('a script drawn as a map', () => {
  it('turns east on the map into the kernel’s west; a compass heading needs no turning', () => {
    const k = fromMap({
      ...SMALL,
      flats: [{ at: [30, -10], halfA: 4, halfB: 2, heading: 30, y: 5, soft: 2 }],
      plots: [{ model: 'building-cottage-01', at: [20, 0], face: [30, 0] }],
      cave: { at: [40, 50], facing: 90, target: { level: 'barrow', entry: 'mouth' } },
    });
    expect(k.flats[0]!.at).toEqual([-30, -10]);
    expect(k.flats[0]!.heading).toBe(30);
    expect(k.plots[0]!.at).toEqual([-20, 0]);
    expect(k.plots[0]!.face).toEqual([-30, 0]);
    // A mouth facing east on the map opens toward the kernel's -x, which the runtime's mirror
    // shows on the right of a party facing north: east.
    const h = (k.cave!.facing * Math.PI) / 180;
    expect(-Math.sin(h)).toBeCloseTo(-1, 6);
    expect(Math.cos(h)).toBeCloseTo(0, 6);
    expect(k.start.at[0]).toBe(-SMALL.start.at[0]);
  });

  it('turns the trees set by hand and the clearings over too, and grows them on the ground', () => {
    const k = fromMap({
      ...SMALL,
      trees: [{ kind: 'oak', at: [50, 40], scale: 1.2 }],
      clearings: [{ at: [-60, 40], radius: 10 }],
    });
    expect(k.trees![0]!.at).toEqual([-50, 40]);
    expect(k.clearings![0]!.at).toEqual([60, 40]);
    const level = buildRegion(k);
    const oak = level.trees.find((t) => t.x === -50 && t.z === 40);
    expect(oak?.kind).toBe('oak');
    expect(oak!.scale).toBe(1.2);
    expect(oak!.y).toBeCloseTo(level.height.sample(-50, 40), 5);
  });
});

describe('Gullhaven', () => {
  // Drawn as a map; built, and checked, in the kernel's frame.
  const g = fromMap(gullhaven);
  const level = buildRegion(g);
  const buildings = level.props.filter((p) => p.model.startsWith('building-'));

  it('is the 640 m starting region with its town, cave, sea and woods', () => {
    expect(level.height.width).toBe(640);
    expect(buildings.length).toBeGreaterThanOrEqual(10);
    // The cave's tunnel ends in rock: no level behind it yet, so no portal.
    expect(level.portals).toEqual([]);
    expect(level.points.find((p) => p.name === 'cave')?.kind).toBe('poi');
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
      for (const road of g.roads) {
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
    for (const plot of g.plots.filter((p) => p.model.startsWith('building-'))) {
      const placed = level.props.find(
        (p) => p.model === plot.model && p.x === plot.at[0] && p.z === plot.at[1],
      )!;
      const f: P2 = [plot.face[0] - plot.at[0], plot.face[1] - plot.at[1]];
      const len = Math.hypot(f[0], f[1]);
      expect(-Math.sin(placed.yaw)).toBeCloseTo(f[0] / len, 5);
      expect(Math.cos(placed.yaw)).toBeCloseTo(f[1] / len, 5);
    }
  });

  it('digs the cave into the goblin hills, facing down to the north road', () => {
    const floor = level.points.find((p) => p.name === 'cave')!.position[1];
    const h = (g.cave!.facing * Math.PI) / 180;
    const [cx, cz] = g.cave!.at;
    const spec = { x: cx, y: floor, z: cz, yaw: Math.atan2(-Math.sin(h), -Math.cos(h)) };
    // The north road ends on the slope before the mouth, not beside it.
    const road = g.roads.find((r) => r.name === 'north-road')!.path;
    const end = caveLocalOf(spec, road[road.length - 1]![0], road[road.length - 1]![1]);
    expect(end.z).toBeLessThan(-8);
    expect(Math.abs(end.x)).toBeLessThan(10);
    // The land climbs into the hill: the tunnel runs up the slope, not along it.
    const rise = (z: number) => {
      const [x, , wz] = [cx + Math.sin(h) * z, 0, cz - Math.cos(h) * z];
      return level.height.sample(x, wz);
    };
    expect(rise(40) - rise(-20)).toBeGreaterThan(15);
    // The fine ground: a brow over the arch, an apron at the floor before it.
    const v = level.visual;
    let brow = 0;
    let apron = 0;
    for (let t = 0; t < v.materials.length; t++) {
      if (v.materials[t] !== ROLE.terrain) continue;
      const i = v.indices[t * 3]!;
      const l = caveLocalOf(spec, v.positions[i * 3]!, v.positions[i * 3 + 2]!);
      const y = v.positions[i * 3 + 1]! - floor;
      if (Math.abs(l.x) < 2 && l.z > 1 && l.z < 3) {
        expect(y).toBeGreaterThan(CAVE.height + 0.9);
        brow++;
      }
      if (Math.abs(l.x) < 2 && l.z > -4 && l.z < -1) {
        expect(Math.abs(y)).toBeLessThan(0.6);
        apron++;
      }
    }
    expect(brow).toBeGreaterThan(0);
    expect(apron).toBeGreaterThan(0);
    // The coarse ground under the tunnel is pressed below its floor.
    const under = caveLocalOf(spec, cx, cz);
    expect(under.z).toBeCloseTo(0);
    for (const z of [2, 6, 10, 14]) expect(rise(z)).toBeLessThan(floor);
    // Meshy's rocks stand about it; no tree grows on its ground.
    expect(level.props.filter((p) => p.model.startsWith('rock-')).length).toBeGreaterThanOrEqual(8);
    for (const t of level.trees) {
      const l = caveLocalOf(spec, t.x, t.z);
      expect(Math.abs(l.x) < 15 && l.z > -CAVE.front && l.z < CAVE.length + 12).toBe(false);
    }
  });

  it('wakes the party on the waterfront, above the sea, facing the town', () => {
    const [x, y, z] = level.spawn.position;
    expect(y).toBeGreaterThan(2);
    expect(inside(g.sea!.coast, x, z)).toBe(true);
    // Heading north-ish, toward the square.
    expect(Math.abs(level.spawn.yawDeg)).toBeLessThan(30);
  });

  it('builds up the high street house to house, and trains in one house of them', () => {
    // The street's rows: houses whose fronts face it from no more than 12 m off.
    const street = buildings.filter(
      (b) => Math.abs(b.z - -118) < 12 && Math.abs(b.x) > 15 && Math.abs(b.x) < 80,
    );
    expect(street.length).toBeGreaterThanOrEqual(26);
    // Four rows: either side of the street, either side of the square.
    for (const [side, half] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const row = street
        .filter((b) => Math.sign(b.z - -118) === side && Math.sign(b.x) === half)
        .sort((a, b) => a.x - b.x);
      expect(row.length).toBeGreaterThanOrEqual(6);
      for (let i = 1; i < row.length; i++) {
        const [a, b] = [row[i - 1]!, row[i]!];
        const gap =
          Math.abs(b.x - a.x) - (CATALOGUE[a.model]!.size[0] + CATALOGUE[b.model]!.size[0]) / 2;
        // Never more than a yard's width between two houses (the smithy's yard is the widest).
        expect(gap, `${a.model} to ${b.model}`).toBeLessThan(7.5);
      }
    }
    for (const house of ['inn', 'temple', 'store', 'smithy', 'training', 'guild']) {
      expect(
        level.props.filter((p) => p.name === house),
        house,
      ).toHaveLength(1);
    }
  });

  it('peoples it with townsfolk and monsters the game knows', () => {
    for (const s of level.spawns) {
      expect(s.kind in MONSTERS || s.kind in NPCS, s.kind).toBe(true);
    }
    expect(level.spawns.filter((s) => s.kind === 'skeleton-warrior')).toHaveLength(6);
    expect(level.spawns.filter((s) => s.kind in NPCS)).toHaveLength(2);
  });
});
