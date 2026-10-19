/**
 * The map sheet (docs/ROADMAP.md, M1a): a hand-written region drawn from above, a pixel a
 * metre, north up and east right, for the owner's review and later the automap. The ground
 * is shaded by its slope and tinted by its splat; water is blue by depth; buildings are
 * their footprints, trees dots, monsters red, townsfolk yellow, doors violet, the start a
 * white cross, and a faint line every hundred metres.
 */
import sharp from 'sharp';
import catalogue from '../../assets/props/catalogue.json';
import type { TerrainLevel } from '../../kernel/terrain/build';
import type { PropCatalogue } from '../../kernel/terrain/props';

const CATALOGUE = catalogue as unknown as PropCatalogue;

type Rgb = [number, number, number];

export async function writeMapSheet(level: TerrainLevel, out: string): Promise<void> {
  const hf = level.height;
  const size = Math.round(hf.width);
  const half = hf.width / 2;
  const px = Buffer.alloc(size * size * 3);
  const sea = level.water.find((w) => w.name === 'sea')?.y ?? -Infinity;
  const splat = level.splat;
  const put = (x: number, y: number, c: Rgb): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (Math.floor(y) * size + Math.floor(x)) * 3;
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
  };
  // World (x, z) to the sheet's column and row.
  const col = (x: number): number => x + half;
  const row = (z: number): number => half - z;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = c - half + 0.5;
      const z = half - r - 0.5;
      const h = hf.sample(x, z);
      let rgb: Rgb;
      if (h < sea) {
        const depth = Math.min(1, (sea - h) / 6);
        rgb = [40 - 25 * depth, 90 - 40 * depth, 150 - 30 * depth];
      } else {
        // Light from the north-west: brighter on slopes facing it.
        const dx = (hf.sample(x + 2, z) - hf.sample(x - 2, z)) / 4;
        const dz = (hf.sample(x, z + 2) - hf.sample(x, z - 2)) / 4;
        const shade = Math.max(0.55, Math.min(1.35, 1 + (dx - dz) * -0.9));
        const i = Math.round((x + half) / hf.cell);
        const j = Math.round((z + half) / hf.cell);
        const k =
          (Math.min(hf.n - 1, Math.max(0, j)) * hf.n + Math.min(hf.n - 1, Math.max(0, i))) * 3;
        const path = splat?.[k] ?? 0;
        const scree = splat?.[k + 1] ?? 0;
        const sand = splat?.[k + 2] ?? 0;
        const grass = Math.max(0, 1 - path - scree - sand);
        const mix = (a: Rgb, w: number): Rgb => [a[0] * w, a[1] * w, a[2] * w];
        const sum = [
          mix([70, 120, 50], grass),
          mix([130, 95, 60], path),
          mix([120, 115, 105], scree),
          mix([200, 180, 120], sand),
        ];
        rgb = [0, 1, 2].map((ch) =>
          Math.min(255, sum.reduce((a, s) => a + s[ch]!, 0) * shade),
        ) as Rgb;
      }
      if ((Math.round(x) % 100 === 0 || Math.round(z) % 100 === 0) && h >= sea) {
        rgb = [rgb[0] * 0.85, rgb[1] * 0.85, rgb[2] * 0.85];
      }
      put(c, r, rgb);
    }
  }
  for (const t of level.trees) {
    for (const [ox, oz] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      put(col(t.x) + ox!, row(t.z) + oz!, [25, 60, 25]);
    }
  }
  for (const p of level.props) {
    const m = CATALOGUE[p.model];
    if (!m) continue;
    const [w, , d] = m.size;
    const cx = m.min[0] + w / 2;
    const cz = m.min[2] + d / 2;
    const cos = Math.cos(p.yaw);
    const sin = Math.sin(p.yaw);
    const building = p.model.startsWith('building-');
    const colour: Rgb = building ? [150, 40, 30] : [90, 70, 50];
    for (let a = -w / 2; a <= w / 2; a += 0.5) {
      for (let b = -d / 2; b <= d / 2; b += 0.5) {
        const lx = cx + a;
        const lz = cz + b;
        // transformInto: local (x, z) turned by yaw.
        put(col(p.x + lx * cos - lz * sin), row(p.z + lx * sin + lz * cos), colour);
      }
    }
    // The door side: a light mark a metre out in front.
    const front = d / 2 + 1;
    if (building) {
      for (let k = -1; k <= 1; k++) {
        put(
          col(p.x + (cx + k) * cos - (cz + front) * sin),
          row(p.z + (cx + k) * sin + (cz + front) * cos),
          [250, 220, 120],
        );
      }
    }
  }
  const dot = (x: number, z: number, c: Rgb, r = 2): void => {
    for (let a = -r; a <= r; a++)
      for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) put(col(x) + a, row(z) + b, c);
  };
  for (const s of level.spawns) {
    const villager = s.kind.startsWith('villager');
    dot(s.position[0], s.position[2], villager ? [255, 230, 60] : [230, 30, 30]);
  }
  for (const p of level.portals) dot(p.position[0], p.position[2], [170, 60, 220], 3);
  for (const p of level.points) dot(p.position[0], p.position[2], [255, 255, 255], 1);
  const [sx, , sz] = level.spawn.position;
  for (let k = -5; k <= 5; k++) {
    put(col(sx) + k, row(sz), [255, 255, 255]);
    put(col(sx), row(sz) + k, [255, 255, 255]);
  }
  await sharp(px, { raw: { width: size, height: size, channels: 3 } })
    .png()
    .toFile(out);
}
