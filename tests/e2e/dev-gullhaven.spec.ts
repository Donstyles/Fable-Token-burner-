import { expect, test } from '@playwright/test';

/**
 * Gullhaven, the starting region (docs/ROADMAP.md): a hand-designed 640 m map with terrain
 * detail levels, woods as thin instances, the sea, the harbour town, packs of monsters on the
 * navmesh and the goblins' cave, its tunnel ending in rock.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: {
      outdoor?: boolean;
      trees?: unknown[];
      props?: unknown[];
      propModels?: string[];
      stats: Record<string, number>;
    };
    meshes: { name: string; isEnabled(): boolean }[];
    collider: { getTotalVertices(): number };
    water: unknown[];
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  teleport(x: number, y: number, z: number, yaw: number): void;
  screenDoorOf(model: string): { x: number; y: number } | null;
  screens: { current(): string | null; close(): void };
  monsters: { state: string; position: { x: number; y: number; z: number } }[];
  portals: {
    portals: { name: string; target: { level: string; entry: string } }[];
    isArmed(name: string): boolean;
  };
};
type W = Window & { ftb?: { dev?: Dev } };

test.describe('Gullhaven', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('dev/?dev&lite&level=gullhaven&seed=5');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
  });

  test('loads the region with its terrain chunks, woods, town, sea and packs', async ({ page }) => {
    // Software GL in CI renders at a frame a second; the packs take a while to arrive.
    test.setTimeout(300_000);
    const info = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const names = d.level.meshes.map((m) => m.name);
      return {
        outdoor: d.level.sidecar.outdoor,
        trees: d.level.sidecar.trees?.length ?? 0,
        terrain: names.filter((n) => n.startsWith('t:')).length,
        terrainOn: d.level.meshes.filter((m) => m.name.startsWith('t:') && m.isEnabled()).length,
        forest: names.filter((n) => n.startsWith('props:tree-')).length,
        backdrop: d.level.meshes.filter((m) => m.name === 'backdrop' && m.isEnabled()).length,
        backdropTriangles: d.level.sidecar.stats['backdropTriangles'],
        square: d.pointOf('square'),
        waterfront: d.pointOf('waterfront'),
        headland: d.pointOf('headland'),
        cave: d.pointOf('cave'),
        portals: d.portals.portals.map((p) => `${p.name}>${p.target.level}:${p.target.entry}`),
        props: d.level.sidecar.props?.length ?? 0,
        propModels: d.level.sidecar.propModels ?? [],
        buildings: names.filter((n) => n.startsWith('props:building-')).length,
        waterfalls: d.level.sidecar.stats['waterfalls'],
        water: d.level.water.length,
        solids: d.level.collider.getTotalVertices() > 0,
        spawn: d.positionOf(),
      };
    });
    // The town: Meshy buildings and props round the square, every footprint solid.
    // The fences are the kernel's now, not 17 props (owner, 2026-10-23).
    expect(info.props).toBeGreaterThan(20);
    expect(info.propModels).toEqual(
      expect.arrayContaining(['building-inn', 'building-temple', 'prop-well']),
    );
    expect(info.buildings).toBeGreaterThanOrEqual(10);
    // The sea is one body; no falls here.
    expect(info.waterfalls).toBe(0);
    expect(info.water).toBe(1);
    expect(info.solids).toBe(true);
    expect(info.square).not.toBeNull();
    // Goblins, bandits and the headland's dead stand about, idle until the party comes near.
    await page.waitForFunction(
      () => (window as unknown as W).ftb!.dev!.monsters.length >= 15,
      null,
      { timeout: 120_000 },
    );
    const states = await page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.monsters.map((m) => m.state),
    );
    expect(states.every((s) => s === 'idle')).toBe(true);
    // The cave in the goblin hills is dug, its tunnel ending in rock: no level behind it yet,
    // so no portal (the test halls were scrapped, owner, 2026-10-24).
    expect(info.cave).not.toBeNull();
    expect(info.portals).toEqual([]);
    // The party wakes at the foot of the square, between the waterfront and the well.
    expect(Math.hypot(info.square!.x - info.spawn.x, info.square!.z - info.spawn.z)).toBeLessThan(
      20,
    );
    expect(info.outdoor).toBe(true);
    expect(info.trees).toBeGreaterThan(500);
    // Eight by eight chunks at three detail levels; exactly one level per chunk is on.
    expect(info.terrain).toBe(192);
    expect(info.terrainOn).toBe(64);
    expect(info.forest).toBeGreaterThan(8);
    // The ring beyond the edge is built and switched off: the painted sky strip and the fog
    // meet the hills instead (DESIGN 16.14).
    expect(info.backdrop).toBe(0);
    expect(info.backdropTriangles).toBeGreaterThan(1000);
    expect(info.headland!.y).toBeGreaterThan(15);
    // The party stands on the square's slope above the sea, not fallen through the terrain.
    await page.waitForTimeout(1500);
    const p = await page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());
    expect(p.y).toBeGreaterThan(2);
    expect(p.y).toBeLessThan(10);
    await page.screenshot({ path: `test-results/gullhaven-${test.info().project.name}.png` });
  });

  test('the barn collides as its drawn walls, not a box round them', async ({ page }) => {
    // Owner's phone, 2026-10-18: "bad collision on the houses", the barn's box 2.15 m past
    // its walls. Rays from all round at chest height must meet the collider where they meet
    // the drawn model (a tree or the ground in front may take a few).
    const r = await page.evaluate(async () => {
      type Vec = { x: number; y: number; z: number; add(v: Vec): Vec; scale(s: number): Vec };
      type VecClass = (new (x: number, y: number, z: number) => Vec) & {
        Distance(a: Vec, b: Vec): number;
      };
      type Picked = { hit: boolean; distance: number } | null;
      type Mesh = { name: string; isEnabled(): boolean; isPickable: boolean } & {
        thinInstanceEnablePicking: boolean;
      };
      type Scene = {
        meshes: Mesh[];
        activeCamera: { position: Vec; getForwardRay(): object };
        pickWithRay(ray: object, predicate: (m: Mesh) => boolean): Picked;
        getPhysicsEngine(): { raycast(a: Vec, b: Vec): { hasHit: boolean; hitPointWorld: Vec } };
      };
      const ftb = (window as unknown as { ftb: { dev: Dev; scene: Scene } }).ftb;
      const d = ftb.dev;
      const scene = ftb.scene;
      const V = scene.activeCamera.position.constructor as VecClass;
      const Ray = scene.activeCamera.getForwardRay().constructor as new (
        o: Vec,
        d: Vec,
        l: number,
      ) => object;
      const models = d.level.sidecar.propModels!;
      const [, kx, ky, kz] = (d.level.sidecar.props as number[][]).find(
        (p) => models[p[0]!] === 'building-barn',
      )!;
      // Kernel X is mirrored in the scene.
      const c = { x: -kx!, y: ky!, z: kz! };
      // Up above it, so the cell colliders round it are built and the party is in no ray.
      d.teleport(c.x + 30, c.y + 40, c.z + 30, 0);
      await new Promise((done) => setTimeout(done, 500));
      for (const m of scene.meshes) {
        if (!m.name.startsWith('props:')) continue;
        m.thinInstanceEnablePicking = true;
        m.isPickable = true;
      }
      const engine = scene.getPhysicsEngine();
      let both = 0;
      let agree = 0;
      let wallWithout = 0;
      const R = 16;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const o = new V(c.x + Math.sin(a) * R, c.y + 1, c.z + Math.cos(a) * R);
        const dir = new V(-Math.sin(a), 0, -Math.cos(a));
        // The yard's fence and haystacks stand in front of it: drawn, they count.
        const seen = scene.pickWithRay(new Ray(o, dir, R), (m) => m.name.startsWith('props:'));
        const felt = engine.raycast(o, o.add(dir.scale(R)));
        if (!seen?.hit || !felt.hasHit) continue;
        both++;
        const gap = seen.distance - V.Distance(o, felt.hitPointWorld);
        if (Math.abs(gap) < 0.05) agree++;
        if (gap < -0.1) wallWithout++;
      }
      return { both, agree, wallWithout };
    });
    expect(r.both).toBeGreaterThanOrEqual(20);
    expect(r.agree).toBeGreaterThanOrEqual(r.both - 3);
    expect(r.wallWithout).toBe(0);
  });

  test('a big oak stops the party at its drawn trunk, not inside it', async ({ page }) => {
    // Owner, 2026-10-24: "The very large trees have no collision". Their colliders had been a
    // hand-set 0.45 m at the model's middle, inside a trunk and roots five metres across. Rays
    // at chest height from all round must meet the collider within a step of the bark.
    const r = await page.evaluate(async () => {
      type Vec = { x: number; y: number; z: number; add(v: Vec): Vec; scale(s: number): Vec };
      type VecClass = (new (x: number, y: number, z: number) => Vec) & {
        Distance(a: Vec, b: Vec): number;
      };
      type Picked = { hit: boolean; distance: number } | null;
      type Mesh = {
        name: string;
        isPickable: boolean;
        thinInstanceEnablePicking: boolean;
        thinInstanceGetWorldMatrices(): { m: number[] }[];
      };
      type Scene = {
        meshes: Mesh[];
        activeCamera: { position: Vec; getForwardRay(): object };
        pickWithRay(ray: object, predicate: (m: Mesh) => boolean): Picked;
        getPhysicsEngine(): { raycast(a: Vec, b: Vec): { hasHit: boolean; hitPointWorld: Vec } };
      };
      const ftb = (window as unknown as { ftb: { dev: Dev; scene: Scene } }).ftb;
      const d = ftb.dev;
      const scene = ftb.scene;
      const V = scene.activeCamera.position.constructor as VecClass;
      const Ray = scene.activeCamera.getForwardRay().constructor as new (
        o: Vec,
        d: Vec,
        l: number,
      ) => object;
      const oaks = scene.meshes.filter(
        (m) => m.name.startsWith('props:tree-oak-01:') && !m.name.endsWith(':far'),
      );
      const oak = oaks.find((m) => m.thinInstanceGetWorldMatrices().length > 0);
      if (!oak) return null;
      const at = oak.thinInstanceGetWorldMatrices()[0]!.m;
      const c = { x: at[12]!, y: at[13]!, z: at[14]! };
      // Up above it, so the cell colliders round it are built and the party is in no ray.
      d.teleport(c.x + 20, c.y + 40, c.z + 20, 0);
      await new Promise((done) => setTimeout(done, 500));
      oak.isPickable = true;
      oak.thinInstanceEnablePicking = true;
      const engine = scene.getPhysicsEngine();
      const gaps: number[] = [];
      const R = 10;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const o = new V(c.x + Math.sin(a) * R, c.y + 1.3, c.z + Math.cos(a) * R);
        const dir = new V(-Math.sin(a), 0, -Math.cos(a));
        const seen = scene.pickWithRay(new Ray(o, dir, R), (m) => m === oak);
        const felt = engine.raycast(o, o.add(dir.scale(R)));
        if (!seen?.hit) continue;
        // How far past the bark the party would walk; the whole ray if nothing stops it.
        gaps.push((felt.hasHit ? V.Distance(o, felt.hitPointWorld) : R) - seen.distance);
      }
      return gaps;
    });
    expect(r).not.toBeNull();
    expect(r!.length).toBeGreaterThanOrEqual(8);
    // A disc of the trunk's area sits inside its flared roots and outside its hollows: within a
    // step of the bark either way, nowhere deep inside it.
    for (const gap of r!) expect(gap).toBeLessThan(1);
  });

  test('paints shade on the ground under its trees and houses, where they stand', async ({
    page,
  }) => {
    // Owner, 2026-10-23: "I want shadows under trees and buildings" (DESIGN 17.4).
    const r = await page.evaluate(() => {
      type Shade = { at(x: number, z: number): { sun: number; sky: number } };
      type Material = { name: string; getEffect(): { defines: string; isReady(): boolean } | null };
      const ftb = (window as unknown as { ftb: { dev: Dev; scene: { materials: Material[] } } })
        .ftb;
      const shade = (ftb.dev.level as unknown as { groundShade: Shade }).groundShade;
      const sidecar = ftb.dev.level.sidecar as unknown as {
        trees: number[][];
        props: number[][];
        propModels: string[];
      };
      // Kernel X is mirrored in the scene: a placement [model, x, y, z, ...] stands at (-x, z).
      const houses = sidecar.props
        .filter((p) => sidecar.propModels[p[0]!]!.startsWith('building-'))
        .map((p) => shade.at(-p[1]!, p[3]!));
      const trees = sidecar.trees.map((t) => shade.at(-t[1]!, t[3]!));
      // Out on the bay, south of the waterfront, nothing stands.
      const sea = [-200, -150, -100, 0, 100, 200].map((x) => shade.at(x, -300));
      const terrain = ftb.scene.materials.find((m) => m.name === 'level-terrain')!.getEffect()!;
      return {
        compiled: terrain.defines.includes('GROUNDSHADE') && terrain.isReady(),
        houses: houses.filter((s) => s.sky > 0.9 && s.sun > 0.9).length,
        houseCount: houses.length,
        trees: trees.filter((s) => s.sun > 0.3 && s.sky > 0.1).length,
        treeCount: trees.length,
        sea: Math.max(...sea.map((s) => Math.max(s.sun, s.sky))),
      };
    });
    expect(r.compiled).toBe(true);
    expect(r.houseCount).toBeGreaterThanOrEqual(10);
    expect(r.houses).toBe(r.houseCount);
    expect(r.trees).toBeGreaterThan(r.treeCount * 0.9);
    expect(r.sea).toBe(0);
  });

  test('stands at the crossroads and on the headland after teleporting', async ({ page }) => {
    for (const name of ['crossroads', 'headland']) {
      const q = await page.evaluate((n) => {
        const d = (window as unknown as W).ftb!.dev!;
        const pt = d.pointOf(n)!;
        d.teleport(pt.x, pt.y + 0.5, pt.z, 90);
        return pt;
      }, name);
      await page.waitForTimeout(1500);
      const p = await page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());
      expect(Math.abs(p.y - q.y)).toBeLessThan(3);
    }
  });

  test('the goblins below the cave follow the party up the apron and into the tunnel', async ({
    page,
  }) => {
    // Software GL runs the world at a twentieth of real time; the chase takes minutes.
    test.setTimeout(420_000);
    // Rouse the pack on the slope below the mouth.
    await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const below = d.pointOf('goblin-hills')!;
      d.teleport(below.x, below.y + 0.5, below.z, 0);
    });
    await page.waitForFunction(
      () => (window as unknown as W).ftb!.dev!.monsters.some((m) => m.state === 'chase'),
      null,
      { timeout: 60_000 },
    );
    // Then stand four metres inside the arch, seven short of the tunnel's end, on the line from
    // the end out to the slope: the pack must find the way in through the mouth.
    const inside = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const end = d.pointOf('cave')!;
      const below = d.pointOf('goblin-hills')!;
      const len = Math.hypot(below.x - end.x, below.z - end.z);
      const at = {
        x: end.x + ((below.x - end.x) / len) * 7,
        y: end.y,
        z: end.z + ((below.z - end.z) / len) * 7,
      };
      d.teleport(at.x, at.y + 0.5, at.z, 0);
      return at;
    });
    // A goblin inside the arch at floor level: closer to the tunnel's end than the mouth is
    // (11.5 m), and not up on the brow over it.
    await page.waitForFunction(
      () => {
        const d = (window as unknown as W).ftb!.dev!;
        const end = d.pointOf('cave')!;
        return d.monsters.some(
          (m) =>
            Math.hypot(m.position.x - end.x, m.position.z - end.z) < 9.5 &&
            Math.abs(m.position.y - end.y) < 1.5,
        );
      },
      null,
      { timeout: 330_000 },
    );
    // The party is still where it was put, in the tunnel short of its end.
    const p = await page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());
    expect(Math.hypot(p.x - inside.x, p.z - inside.z)).toBeLessThan(2);
    expect(page.url()).toMatch(/level=gullhaven/);
  });

  test('a house opens only from its door', async ({ page }) => {
    // Three metres back from the place before the inn's door, facing the house.
    await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const p = d.pointOf('inn')!;
      const scene = (
        window as unknown as {
          ftb: {
            scene: {
              meshes: { name: string; thinInstanceGetWorldMatrices(): { m: number[] }[] }[];
            };
          };
        }
      ).ftb.scene;
      const inn = scene.meshes.find((m) => m.name.startsWith('props:building-inn'))!;
      const at = inn.thinInstanceGetWorldMatrices()[0]!.m;
      const dx = at[12]! - p.x;
      const dz = at[14]! - p.z;
      const l = Math.hypot(dx, dz);
      d.teleport(
        p.x - (dx / l) * 3,
        p.y + 0.3,
        p.z - (dz / l) * 3,
        (Math.atan2(dx, dz) * 180) / Math.PI,
      );
    });
    await page.waitForTimeout(1500);
    const door = await page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.screenDoorOf('building-inn'),
    );
    expect(door).not.toBeNull();
    // The wall beside the door names the house and opens nothing.
    await page.mouse.click(door!.x + 230, door!.y - 60);
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current()),
    ).toBeNull();
    // The door opens the inn (the packed town's frames are slow on the shared box with two
    // workers: the board had come up just after five seconds).
    await page.mouse.click(door!.x, door!.y);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as W).ftb!.dev!.screens.current()), {
        timeout: 15_000,
      })
      .toBe('tavern');
  });
});
