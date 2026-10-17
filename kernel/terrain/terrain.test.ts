import { describe, expect, it } from 'vitest';
import { ROLE } from '../elements/roles';
import { Heightfield } from './heightfield';
import { terrainMesh } from './mesh';
import { fbm, ridged } from './noise';
import { riverSurface } from './river';
import { GroundPath, smoothPath } from './spline';
import { backdropMesh } from './backdrop';
import { buildTerrainLevel } from './build';
import { CAVE, caveLocalOf, caveMouth } from './cave';
import { generateDesert } from './desert';
import { headingDeg } from './spline';
import { streamFalls, streamSurfaces } from './stream';
import { layoutVillage, type PropPlacement } from './village';
import catalogueJson from '../../assets/props/catalogue.json';
import type { PropCatalogue } from './props';

const CATALOGUE = catalogueJson as unknown as PropCatalogue;
import { forestMeshes, placeTrees, treeMesh } from './trees';
import { generateValley, WATER_LEVEL } from './valley';

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

describe('valley', () => {
  const v = generateValley({ seed: 3, width: 1024, cell: 16 });

  it('has a river bed below the water and ridges above the floor', () => {
    expect(v.height.min).toBeLessThan(WATER_LEVEL);
    expect(v.height.max).toBeGreaterThan(80);
    const ford = v.points.find((p) => p.name === 'ford')!;
    expect(ford.position[1]).toBeLessThan(WATER_LEVEL);
  });

  it('keeps the road flat across and climbing along', () => {
    const r = v.road;
    const mid = r.at(r.length * 0.5);
    const t = r.nearest(mid[0], mid[1]).tangent;
    const left = v.height.sample(mid[0] - t[1] * 2, mid[1] + t[0] * 2);
    const right = v.height.sample(mid[0] + t[1] * 2, mid[1] - t[0] * 2);
    expect(Math.abs(left - right)).toBeLessThan(v.height.cell * 0.2);
    const start = v.height.sample(...r.at(5));
    const end = v.height.sample(...r.at(r.length - 5));
    expect(end).toBeGreaterThan(start + 20);
  });

  it('weights snow high, scree steep, path on the road, grass elsewhere', () => {
    let snow = 0;
    let scree = 0;
    let path = 0;
    for (let k = 0; k < v.splat.length; k += 3) {
      const total = v.splat[k]! + v.splat[k + 1]! + v.splat[k + 2]!;
      expect(total).toBeLessThanOrEqual(1.0001);
      if (v.splat[k]! > 0.5) path++;
      if (v.splat[k + 1]! > 0.5) scree++;
      if (v.splat[k + 2]! > 0.5) snow++;
    }
    expect(path).toBeGreaterThan(20);
    expect(scree).toBeGreaterThan(20);
    const total = v.splat.length / 3;
    expect(path + scree + snow).toBeLessThan(total * 0.7);
  });

  it('grows forests off the road and river, with trunks in the collider', () => {
    const trees = placeTrees(v);
    expect(trees.length).toBeGreaterThan(30);
    for (const t of trees) {
      expect(v.road.nearest(t.x, t.z).distance).toBeGreaterThan(6);
      expect(v.river.nearest(t.x, t.z).distance).toBeGreaterThan(15);
    }
    const pine = treeMesh('pine');
    expect(pine.materials).toContain(ROLE.bark);
    expect(pine.materials).toContain(ROLE.leaves);
    const { visual, collider } = forestMeshes(trees.slice(0, 5));
    expect(visual.indices.length / 3).toBeGreaterThan(collider.indices.length / 3);
    expect(collider.materials.every((m) => m === ROLE.bark)).toBe(true);
  });

  it('meshes the heightfield with splat colours and a river ribbon', () => {
    const m = terrainMesh(v);
    expect(m.positions.length / 3).toBe(v.height.n * v.height.n);
    expect(m.colors.length).toBe(m.positions.length);
    expect(m.indices.length / 3).toBe(2 * v.height.cells * v.height.cells);
    const river = riverSurface(v);
    expect(river.kind).toBe('river');
    expect(river.y).toBe(WATER_LEVEL);
    expect(river.mesh.indices.length).toBeGreaterThan(100);
    expect(Math.hypot(river.flow[0], river.flow[1])).toBeCloseTo(1);
  });

  it('is the same valley for the same seed', () => {
    const again = generateValley({ seed: 3, width: 1024, cell: 16 });
    expect(again.height.heights).toEqual(v.height.heights);
    expect(again.spawn).toEqual(v.spawn);
  });
});

describe('village', () => {
  it('lays the street through a square with the inn and store, the temple on a knoll', () => {
    const v = layoutVillage({ centre: [100, -50], along: [0, 1], y: 12, roadHalf: 5 });
    const by = (model: string): PropPlacement[] => v.props.filter((p) => p.model === model);
    expect(by('building-inn')).toHaveLength(1);
    expect(by('building-store')).toHaveLength(1);
    expect(by('building-temple')).toHaveLength(1);
    expect(by('building-smithy')).toHaveLength(1);
    expect(by('prop-well')).toHaveLength(1);
    expect(by('prop-fence').length).toBeGreaterThan(10);
    // Nothing stands on the street itself (within the road's half width of its centre line).
    for (const p of v.props) {
      const m = CATALOGUE[p.model]!;
      const across = Math.abs(p.x - 100);
      expect(across).toBeGreaterThan(5 + Math.min(m.size[0], m.size[2]) / 2 - 0.01);
    }
    // Buildings face the street: the door (local +Z, facing (-sin yaw, cos yaw)) points
    // across to the centre line.
    for (const p of v.props.filter((q) => q.model.startsWith('building-'))) {
      const face = [-Math.sin(p.yaw), Math.cos(p.yaw)];
      const toStreet = [100 - p.x, 0];
      const dot = face[0]! * Math.sign(toStreet[0]!);
      expect(dot).toBeGreaterThan(0.95);
    }
    // The temple rises on its knoll; everything else sits on the floor.
    const temple = by('building-temple')[0]!;
    expect(temple.y).toBeCloseTo(14.5);
    expect(by('building-inn')[0]!.y).toBe(12);
    expect(v.pads.find((pad) => pad.rise > 0)).toBeTruthy();
    // Footprint boxes for the navmesh: at least one per building and prop.
    expect(v.collider.indices.length / 3).toBeGreaterThan(v.props.length * 10);
    // Lanterns light the square; the forge glows.
    expect(v.lights.filter((l) => l.kind === 'lantern')).toHaveLength(2);
    expect(v.lights.filter((l) => l.kind === 'glow')).toHaveLength(1);
    // No two buildings overlap.
    const buildings = v.props.filter((q) => q.model.startsWith('building-'));
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const a = buildings[i]!;
        const b = buildings[j]!;
        const ra = Math.max(...CATALOGUE[a.model]!.size) / 2;
        const rb = Math.max(...CATALOGUE[b.model]!.size) / 2;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(Math.min(ra, rb));
      }
    }
  });

  it('sits on a level floor along the street, pads dead level, clear of trees', () => {
    // Real cell size: a cottage's pad is narrower than a sixteen-metre cell.
    const v = generateValley({ seed: 7, width: 1024, cell: 5 });
    const { centre, y } = v.town;
    expect(v.road.nearest(centre[0], centre[1]).distance).toBeLessThan(1);
    expect(y).toBeGreaterThan(WATER_LEVEL + 2);
    for (const pad of v.village.pads) {
      const h = v.height.sample(pad.x, pad.z);
      expect(Math.abs(h - (y + pad.rise))).toBeLessThan(0.6);
    }
    const town = v.points.find((p) => p.name === 'town')!;
    expect(Math.hypot(town.position[0] - centre[0], town.position[2] - centre[1])).toBeLessThan(2);
    expect(v.points.find((p) => p.name === 'square')).toBeTruthy();
    expect(v.points.find((p) => p.name === 'temple')).toBeTruthy();
    for (const t of placeTrees(v)) {
      expect(Math.hypot(t.x - centre[0], t.z - centre[1])).toBeGreaterThan(30);
    }
    // The party wakes in the square looking back along the street.
    expect(
      Math.hypot(v.spawn.position[0] - centre[0], v.spawn.position[2] - centre[1]),
    ).toBeLessThan(15);
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

  it('sits at the ravine head with the ground cut under the tunnel and level in front', () => {
    const v = generateValley({ seed: 7, width: 1024, cell: 16 });
    const c = v.cave;
    const hit = v.ravine.nearest(c.x, c.z);
    expect(hit.distance).toBeLessThan(1);
    expect(hit.along).toBeCloseTo(v.ravine.length - 25, 0);
    // Under the tunnel the terrain is below the floor; in front it is near floor height.
    const cos = Math.cos(c.yaw);
    const sin = Math.sin(c.yaw);
    const at = (lx: number, lz: number): number =>
      v.height.sample(c.x + lx * cos - lz * sin, c.z + lx * sin + lz * cos);
    expect(at(0, CAVE.length / 2)).toBeLessThan(c.y - 1);
    // Coarse 16 m test cells blur the cut into the apron; the real level uses 5 m cells.
    expect(Math.abs(at(0, -CAVE.threshold - 2) - c.y)).toBeLessThan(6);
    // The ravine is a walkable gorge: its floor climbs gently toward the head.
    const a = v.height.sample(...v.ravine.at(v.ravine.length * 0.3));
    const b = v.height.sample(...v.ravine.at(v.ravine.length * 0.6));
    const rise = (b - a) / (v.ravine.length * 0.3);
    expect(rise).toBeGreaterThan(0);
    expect(rise).toBeLessThan(Math.tan((20 * Math.PI) / 180));
  });
});

describe('ravine stream', () => {
  it('steps down the gorge in terraces, a waterfall at each, into the plunge pool', () => {
    // 8 m cells: the 7 m trough needs a vertex on the centreline, as the 5 m level has.
    const v = generateValley({ seed: 7, width: 1024, cell: 8 });
    const { terraces, pool } = v.stream;
    expect(terraces.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < terraces.length; i++) {
      expect(terraces[i]!.from).toBe(terraces[i - 1]!.to);
      expect(terraces[i]!.y).toBeGreaterThan(terraces[i - 1]!.y + 3);
    }
    expect(terraces[0]!.y).toBeGreaterThan(pool.y + 3);
    // The trough under each pool is below its water; the banks beside it are above.
    for (const t of terraces) {
      const mid = (t.from + t.to) / 2;
      const p = v.ravine.at(mid);
      const tan = v.ravine.nearest(p[0], p[1]).tangent;
      expect(v.height.sample(p[0], p[1])).toBeLessThan(t.y);
      const bank = v.height.sample(p[0] - tan[1] * 11, p[1] + tan[0] * 11);
      expect(bank).toBeGreaterThan(v.height.sample(p[0], p[1]));
      // No floating water: at the foot of the terrace the bank is at (or just above) the pool.
      const foot = v.ravine.at(t.from + 4);
      const ft = v.ravine.nearest(foot[0], foot[1]).tangent;
      const footBank = v.height.sample(foot[0] - ft[1] * 11, foot[1] + ft[0] * 11);
      expect(footBank).toBeGreaterThan(t.y - 0.6);
      expect(footBank).toBeLessThan(t.y + 5); // coarse 16 m test cells
    }
    const falls = streamFalls(v.ravine, v.stream);
    expect(falls).toHaveLength(terraces.length);
    for (const f of falls) {
      expect(f.lip[1] - f.plunge[1]).toBeGreaterThan(3);
      expect(f.mesh.indices.length).toBeGreaterThan(0);
    }
    const water = streamSurfaces(v.ravine, v.stream);
    expect(water).toHaveLength(terraces.length + 1);
    expect(water.at(-1)!.kind).toBe('pool');
  });
});

describe('desert', () => {
  it('lays dunes, mesas, an oasis with trees and a road from the pass', () => {
    const d = generateDesert({ seed: 11, width: 1024, cell: 16 });
    expect(d.height.min).toBeGreaterThan(0);
    expect(d.height.max).toBeLessThan(260);
    // The road starts at the eastern edge and reaches the mesas in the west.
    const start = d.road.at(0);
    expect(start[0]).toBeGreaterThan(400);
    const end = d.road.at(d.road.length);
    expect(end[0]).toBeLessThan(-200);
    // The oasis pool lies in a bowl below its rim, with trees round it and none on the road.
    const { centre, y, radius } = d.oasis;
    expect(d.height.sample(centre[0], centre[1])).toBeLessThan(y);
    // The road skirts the pool: never nearer than the rim.
    expect(d.road.nearest(centre[0], centre[1]).distance).toBeGreaterThan(radius + 10);
    expect(d.height.sample(centre[0] + radius + 20, centre[1])).toBeGreaterThan(y);
    expect(d.trees.length).toBeGreaterThan(8);
    for (const t of d.trees) {
      expect(Math.hypot(t.x - centre[0], t.z - centre[1])).toBeGreaterThan(radius);
      expect(d.road.nearest(t.x, t.z).distance).toBeGreaterThan(d.roadWidth / 2);
    }
    expect(d.points.map((p) => p.name)).toEqual(['oasis', 'road-mid', 'mesa']);
    // Nothing in the snow slot; rock only on steep faces.
    let snow = 0;
    for (let i = 2; i < d.splat.length; i += 3) snow += d.splat[i]!;
    expect(snow).toBe(0);
  });

  it('builds as a region with its own textures, environment and the pass portal', () => {
    const level = buildTerrainLevel({
      region: 'desert',
      seed: 11,
      width: 1024,
      cell: 16,
      chunkCells: 16,
    });
    expect(level.region).toBe('desert');
    expect(level.terrainTextures.base).toBe('sand');
    expect(level.environment.fogColor[0]).toBeGreaterThan(0.7);
    expect(level.portals.map((p) => `${p.name}>${p.target.level}:${p.target.entry}`)).toEqual([
      'pass>valley:pass',
    ]);
    expect(level.water.map((w) => w.name)).toEqual(['oasis']);
    expect(level.chunks.length).toBe(4 * 4 * 3);
    expect(level.trees.length).toBe(level.desert!.trees.length);
    const valley = buildTerrainLevel({ seed: 7, width: 1024, cell: 16, chunkCells: 16 });
    expect(valley.portals.map((p) => p.name)).toEqual(['cave', 'pass']);
    expect(valley.terrainTextures.base).toBe('grass');
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
  const forward = (deg: number): [number, number] => {
    // Kernel direction of a heading: 0 north (+Z), 90 west (-X).
    const r = (deg * Math.PI) / 180;
    return [-Math.sin(r), Math.cos(r)];
  };
  it('names the compass directions as the dungeons do', () => {
    expect(headingDeg(0, 1)).toBeCloseTo(0);
    expect(headingDeg(-1, 0)).toBeCloseTo(90);
    expect(Math.abs(headingDeg(0, -1))).toBeCloseTo(180);
  });
  it('wakes the party facing the square in the valley and along the road in the desert', () => {
    const v = generateValley({ seed: 7, width: 1024, cell: 16 });
    const vt = v.road.nearest(v.spawn.position[0], v.spawn.position[2]).tangent;
    const vf = forward(v.spawn.yawDeg);
    // Back down the road: the well and the houses are the first view.
    expect(vf[0] * vt[0] + vf[1] * vt[1]).toBeLessThan(-0.99);
    const d = generateDesert({ seed: 11, width: 1024, cell: 16 });
    const dt = d.road.nearest(d.spawn.position[0], d.spawn.position[2]).tangent;
    const df = forward(d.spawn.yawDeg);
    expect(df[0] * dt[0] + df[1] * dt[1]).toBeGreaterThan(0.99);
  });
  it('arrives through the pass facing along the road, and spawns face back down it', () => {
    const level = buildTerrainLevel({ seed: 7, width: 1024, cell: 16, chunkCells: 16 });
    const pass = level.portals.find((p) => p.name === 'pass')!;
    const road = level.valley!.road;
    const at = pass.arrive.position;
    const t = road.nearest(at[0], at[2]).tangent;
    const f = forward(pass.arrive.yawDeg);
    // Arriving from the desert the party looks back down the road: against its tangent.
    expect(f[0] * t[0] + f[1] * t[1]).toBeLessThan(-0.99);
    const s = level.spawns[0]!;
    const st = road.nearest(s.position[0], s.position[2]).tangent;
    const sf = forward(s.yawDeg);
    expect(sf[0] * st[0] + sf[1] * st[1]).toBeLessThan(-0.99);
  });
});
