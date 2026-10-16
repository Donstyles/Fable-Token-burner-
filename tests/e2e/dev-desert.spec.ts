import { expect, test } from '@playwright/test';

/** The desert region (DESIGN.md 15.5): dunes, mesas, an oasis, the road from the pass. */
type Dev = {
  ready: boolean;
  level: {
    sidecar: {
      outdoor?: boolean;
      region?: string;
      trees?: unknown[];
      terrainTextures?: { base: string };
      stats: Record<string, number>;
    };
    water: unknown[];
  };
  positionOf(): { x: number; y: number; z: number };
  pointOf(name: string): { x: number; y: number; z: number } | null;
  teleport(x: number, y: number, z: number, yaw: number): void;
  portals: { portals: { name: string; target: { level: string; entry: string } }[] };
};
type W = Window & { ftb?: { dev?: Dev } };

test.describe('desert region', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('dev/?dev&lite&level=desert&seed=5');
    await page.waitForFunction(() => (window as unknown as W).ftb?.dev?.ready === true, null, {
      timeout: 120_000,
    });
  });

  test('loads the desert with its sand, the oasis and the pass back to the valley', async ({
    page,
  }) => {
    const info = await page.evaluate(() => {
      const d = (window as unknown as W).ftb!.dev!;
      return {
        outdoor: d.level.sidecar.outdoor,
        region: d.level.sidecar.region,
        base: d.level.sidecar.terrainTextures?.base,
        trees: d.level.sidecar.trees?.length ?? 0,
        water: d.level.water.length,
        portals: d.portals.portals.map((p) => `${p.name}>${p.target.level}:${p.target.entry}`),
        oasis: d.pointOf('oasis'),
        mesa: d.pointOf('mesa'),
      };
    });
    expect(info.outdoor).toBe(true);
    expect(info.region).toBe('desert');
    expect(info.base).toBe('sand');
    expect(info.trees).toBeGreaterThan(8);
    expect(info.water).toBe(1);
    expect(info.portals).toEqual(['pass>valley:pass']);
    expect(info.oasis).not.toBeNull();
    expect(info.mesa).not.toBeNull();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/desert-${test.info().project.name}.png` });
    // Stands at the oasis and at the mesas after teleporting.
    for (const name of ['oasis', 'mesa']) {
      const q = await page.evaluate((n) => {
        const d = (window as unknown as W).ftb!.dev!;
        const pt = d.pointOf(n)!;
        d.teleport(pt.x, pt.y + 0.5, pt.z, 270);
        return pt;
      }, name);
      await page.waitForTimeout(1500);
      const p = await page.evaluate(() => (window as unknown as W).ftb!.dev!.positionOf());
      expect(Math.abs(p.y - q.y)).toBeLessThan(3);
      await page.screenshot({
        path: `test-results/desert-${name}-${test.info().project.name}.png`,
      });
    }
  });
});
