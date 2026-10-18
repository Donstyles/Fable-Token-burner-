import { expect, test } from '@playwright/test';

/**
 * The valley region (DESIGN.md 15): a 1.6 km outdoor level with terrain detail levels,
 * forests as thin instances, a river, a road to a pass and a bandit on the navmesh.
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
  monsters: { state: string }[];
  portals: {
    portals: { name: string; target: { level: string; entry: string } }[];
    isArmed(name: string): boolean;
  };
};
type W = Window & { ftb?: { dev?: Dev } };

test.describe('valley region', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('dev/?dev&lite&level=valley&seed=5');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
  });

  test('loads the outdoor level with terrain chunks, forests and the road points', async ({
    page,
  }) => {
    // Software GL in CI renders at a frame a second; eight bandits take a while to arrive.
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
        pass: d.pointOf('pass'),
        summit: d.pointOf('summit'),
        town: d.pointOf('town'),
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
    // The village (DESIGN 15.2): Meshy buildings and props along the street, the party
    // waking in the square, every footprint solid.
    expect(info.props).toBeGreaterThan(35);
    expect(info.propModels).toEqual(
      expect.arrayContaining(['building-inn', 'building-temple', 'prop-well']),
    );
    expect(info.buildings).toBeGreaterThanOrEqual(10);
    // The brook steps down the ravine: a waterfall per terrace, pools plus the river.
    expect(info.waterfalls).toBeGreaterThanOrEqual(5);
    expect(info.water).toBe(info.waterfalls! + 2);
    expect(info.solids).toBe(true);
    expect(info.town).not.toBeNull();
    // Bandits stand about the region, idle until the party comes near.
    await page.waitForFunction(
      () => (window as unknown as W).ftb!.dev!.monsters.length >= 8,
      null,
      { timeout: 90_000 },
    );
    const states = await page.evaluate(() =>
      (window as unknown as W).ftb!.dev!.monsters.map((m) => m.state),
    );
    expect(states.every((s) => s === 'idle')).toBe(true);
    // The cave mouth at the ravine head leads into the dungeon (DESIGN 15.3).
    expect(info.cave).not.toBeNull();
    expect(info.portals).toEqual(['cave>showcase:exit', 'pass>desert:pass']);
    expect(Math.hypot(info.town!.x - info.spawn.x, info.town!.z - info.spawn.z)).toBeLessThan(30);
    expect(info.outdoor).toBe(true);
    expect(info.trees).toBeGreaterThan(1000);
    // Ten by ten chunks at three detail levels; exactly one level per chunk is on.
    expect(info.terrain).toBe(300);
    expect(info.terrainOn).toBe(100);
    expect(info.forest).toBeGreaterThan(8);
    // The ring of far mountains beyond the edge is built, and switched off: the painted
    // sky strip and the fog meet the hills instead (DESIGN 16.14).
    expect(info.backdrop).toBe(0);
    expect(info.backdropTriangles).toBeGreaterThan(1000);
    expect(info.pass).not.toBeNull();
    expect(info.summit!.y).toBeGreaterThan(300);
    // The party stands on the road near the valley floor, not fallen through the terrain.
    await page.waitForTimeout(1500);
    const p = await page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());
    expect(p.y).toBeGreaterThan(10);
    expect(p.y).toBeLessThan(25);
    await page.screenshot({ path: `test-results/valley-${test.info().project.name}.png` });
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

  test('stands on the pass and the summit after teleporting', async ({ page }) => {
    for (const name of ['pass', 'summit']) {
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

  test('walking into the cave leads into the dungeon, and its door leads back out', async ({
    page,
  }) => {
    // Teleport to the cave's threshold: the portal arms once the party stands clear of it.
    const cave = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const c = d.pointOf('cave')!;
      return c;
    });
    await page.evaluate((c) => {
      const d = (window as unknown as W).ftb!.dev!;
      d.teleport(c.x, c.y + 0.5, c.z + 12, 0);
    }, cave);
    await page.waitForTimeout(600);
    expect(
      await page.evaluate(() => (window as unknown as W).ftb!.dev!.portals.isArmed('cave')),
    ).toBe(true);
    // Step into the portal: the page travels to the dungeon and arrives at its exit door.
    await page.evaluate((c) => {
      const d = (window as unknown as W).ftb!.dev!;
      d.teleport(c.x, c.y + 0.5, c.z, 0);
    }, cave);
    await page.waitForURL(/level=showcase.*entry=exit/, { timeout: 20_000 });
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
    const arrived = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      return { p: d.positionOf(), portals: d.portals.portals.map((x) => x.name) };
    });
    expect(arrived.portals).toEqual(['exit']);
    // The showcase's exit door is at its spawn; the party arrives just inside it.
    // Kernel (-3, 0, -2) is Babylon (3, 0, -2): X is mirrored.
    expect(Math.hypot(arrived.p.x - 3, arrived.p.z + 2)).toBeLessThan(1.5);
    // Step away to arm the door, then back through it: out onto the cave's threshold.
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(3, 0.5, 4, 180));
    await page.waitForTimeout(600);
    await page.evaluate(() => (window as unknown as W).ftb!.dev!.teleport(3, 0.5, -4.5, 180));
    await page.waitForURL(/level=valley.*entry=cave/, { timeout: 20_000 });
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
    await page.waitForTimeout(1500);
    const back = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      return { p: d.positionOf(), cave: d.pointOf('cave')! };
    });
    const d = Math.hypot(back.p.x - back.cave.x, back.p.z - back.cave.z);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(20);
    expect(Math.abs(back.p.y - back.cave.y)).toBeLessThan(2);
  });
});
