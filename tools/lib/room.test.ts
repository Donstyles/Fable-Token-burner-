import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ROOM_SIZE, chooseBand, cutRoom, findFires, findLights, isCoal, isFlame } from './room';

/** A dark room `w` × `h` with painted boxes: [x0, y0, x1, y1, r, g, b]. */
function paint(w: number, h: number, boxes: number[][]): Uint8Array {
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) rgb.set([40, 30, 25], i * 3);
  for (const [x0, y0, x1, y1, r, g, b] of boxes) {
    for (let y = y0!; y < y1!; y++)
      for (let x = x0!; x < x1!; x++) rgb.set([r!, g!, b!], (y * w + x) * 3);
  }
  return rgb;
}

const YELLOW = [255, 220, 120];
const EMBER = [210, 70, 20];

describe('room lights', () => {
  it('tells a flame from firelit stone and a coal from both', () => {
    expect(isFlame(255, 230, 140)).toBe(true);
    expect(isFlame(255, 150, 40)).toBe(false); // orange stone by the fire
    expect(isCoal(210, 70, 20)).toBe(true);
    expect(isCoal(255, 230, 140)).toBe(false);
    expect(isCoal(120, 90, 70)).toBe(false); // brown wood
  });

  it('joins a fire parted by a log, and leaves a glint out', () => {
    const w = 400;
    const h = 185;
    const rgb = paint(w, h, [
      [60, 100, 100, 130, ...YELLOW], // the forge's left tongues
      [104, 104, 140, 130, ...YELLOW], // its right tongues, past a log
      [300, 20, 312, 34, ...YELLOW], // a lamp's flame
      [380, 150, 382, 152, ...YELLOW], // a glint on a helmet
    ]);
    const { fires } = findFires(rgb, w, h, 40);
    expect(fires).toHaveLength(2);
    expect(fires[0]).toMatchObject({ x0: 60, x1: 139, y0: 100, y1: 129 });
    expect(fires[1]).toMatchObject({ x0: 300, x1: 311, y0: 20, y1: 33 });
  });

  it('masks the flames, the coals under them and each fire light, and sparks off the bed', async () => {
    const w = 640;
    const h = 296;
    const rgb = paint(w, h, [
      [100, 150, 180, 190, ...YELLOW],
      [90, 190, 200, 210, ...EMBER],
      [500, 30, 516, 46, ...YELLOW],
    ]);
    const l = await findLights(rgb, w, h);
    const at = (m: Uint8Array, x: number, y: number) => m[y * ROOM_SIZE.width + x]!;
    expect(l.fires).toHaveLength(2);
    expect(at(l.flame, 140, 170)).toBeGreaterThan(200);
    expect(at(l.flame, 300, 100)).toBe(0);
    expect(at(l.coal, 120, 200)).toBeGreaterThan(150);
    expect(at(l.coal, 140, 170)).toBe(0); // the flame is no coal
    // The forge lights the room round it and the lamp its own corner.
    expect(at(l.light, 140, 170)).toBeGreaterThan(at(l.light, 400, 170));
    expect(at(l.others, 508, 38)).toBeGreaterThan(200);
    expect(at(l.others, 140, 170)).toBeLessThan(at(l.others, 508, 60));
    expect(l.sparks).toEqual([100, 179, 189]);
  });

  it('a lamp alone throws no sparks', async () => {
    const l = await findLights(paint(640, 296, [[500, 30, 516, 46, ...YELLOW]]), 640, 296);
    expect(l.fires).toHaveLength(1);
    expect(l.sparks).toBeNull();
  });
});

describe('the band kept', () => {
  const fire = (y0: number, y1: number) => ({ x0: 0, x1: 10, y0, y1, area: 50 });

  it('keeps every fire with room round it, as near the middle as it can', () => {
    // A lamp near the top and a forge low down: the band slides up to take the lamp in.
    expect(chooseBand(1086, 670, [fire(119, 140), fire(480, 525)])).toBe(18);
    // Fires in the middle: the middle band.
    expect(chooseBand(1086, 670, [fire(500, 540)])).toBe(208);
    // No fires: the middle.
    expect(chooseBand(1086, 670, [])).toBe(208);
  });

  it('centres on the fires when they cannot all fit with room', () => {
    expect(chooseBand(1000, 300, [fire(100, 120), fire(800, 820)])).toBe(310);
  });
});

describe('a room cut from a picture', () => {
  it('is the view box at one UI pixel, the band moved to keep a high lamp', async () => {
    const w = 1448;
    const h = 1086;
    const rgb = paint(w, h, [
      [1080, 110, 1110, 140, ...YELLOW],
      [250, 480, 400, 525, ...YELLOW],
      [240, 525, 410, 545, ...EMBER],
    ]);
    const file = `${process.env.TMPDIR ?? '/tmp'}/room-test.png`;
    await sharp(Buffer.from(rgb), { raw: { width: w, height: h, channels: 3 } })
      .png()
      .toFile(file);
    const room = await cutRoom(file);
    expect(room.band).toBe(670);
    expect(room.top).toBeLessThanOrEqual(110 - 100);
    const meta = await sharp(room.picture).metadata();
    expect([meta.width, meta.height]).toEqual([ROOM_SIZE.width, ROOM_SIZE.height]);
    expect(room.lights.fires).toHaveLength(2);
    expect((await cutRoom(file, 300)).top).toBe(300);
  });
});
