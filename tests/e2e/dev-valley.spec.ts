import { expect, test } from '@playwright/test';

/**
 * The valley region (DESIGN.md 15): a 1.6 km outdoor level with terrain detail levels,
 * forests as thin instances, a river, a road to a pass and a bandit on the navmesh.
 */
type Dev = {
  ready: boolean;
  level: {
    sidecar: { outdoor?: boolean; trees?: unknown[]; stats: Record<string, number> };
    meshes: { name: string; isEnabled(): boolean }[];
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  teleport(x: number, y: number, z: number, yaw: number): void;
  monsters: { state: string }[];
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
    const info = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      const names = d.level.meshes.map((m) => m.name);
      return {
        outdoor: d.level.sidecar.outdoor,
        trees: d.level.sidecar.trees?.length ?? 0,
        terrain: names.filter((n) => n.startsWith('t:')).length,
        terrainOn: d.level.meshes.filter((m) => m.name.startsWith('t:') && m.isEnabled()).length,
        forest: names.filter((n) => n.startsWith('forest:')).length,
        pass: d.pointOf('pass'),
        summit: d.pointOf('summit'),
        spawn: d.positionOf(),
      };
    });
    expect(info.outdoor).toBe(true);
    expect(info.trees).toBeGreaterThan(1000);
    // Ten by ten chunks at three detail levels; exactly one level per chunk is on.
    expect(info.terrain).toBe(300);
    expect(info.terrainOn).toBe(100);
    expect(info.forest).toBeGreaterThan(8);
    expect(info.pass).not.toBeNull();
    expect(info.summit!.y).toBeGreaterThan(300);
    // The party stands on the road near the valley floor, not fallen through the terrain.
    await page.waitForTimeout(1500);
    const p = await page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());
    expect(p.y).toBeGreaterThan(10);
    expect(p.y).toBeLessThan(25);
    await page.screenshot({ path: `test-results/valley-${test.info().project.name}.png` });
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
});
