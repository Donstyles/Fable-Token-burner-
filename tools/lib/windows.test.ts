import { describe, expect, it } from 'vitest';
import { findPanes, tidyPane } from './windows';

/** A picture `w` by `h` filled with one colour, and a box of another painted on it. */
function picture(
  w: number,
  h: number,
  ground: [number, number, number],
  box?: { x: number; y: number; w: number; h: number; c: [number, number, number] },
): Uint8Array {
  const rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inBox = box && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      rgb.set(inBox ? box.c : ground, (y * w + x) * 3);
    }
  }
  return rgb;
}

describe('window panes', () => {
  it('finds a dark pane set in pale plaster', () => {
    const m = findPanes(
      picture(64, 64, [220, 205, 175], { x: 20, y: 16, w: 14, h: 22, c: [40, 32, 28] }),
      64,
      64,
    );
    expect(m.boxes.map((b) => b.kind)).toEqual(['dark']);
    expect(m.mask[26 * 64 + 26]).toBe(255);
    expect(m.mask[2 * 64 + 2]).toBe(0);
  });

  it('finds bluish leaded glass whatever the wall', () => {
    const m = findPanes(
      picture(64, 64, [110, 80, 55], { x: 10, y: 10, w: 12, h: 16, c: [50, 60, 82] }),
      64,
      64,
    );
    expect(m.boxes.map((b) => b.kind)).toEqual(['glass']);
    expect(m.mask[16 * 64 + 15]).toBe(255);
  });

  it('leaves a dark patch in a dark wall, and a long dark beam, alone', () => {
    const dim = findPanes(
      picture(64, 64, [80, 62, 48], { x: 20, y: 16, w: 14, h: 22, c: [30, 26, 22] }),
      64,
      64,
    );
    expect(dim.boxes).toEqual([]);
    const beam = findPanes(
      picture(96, 64, [220, 205, 175], { x: 4, y: 30, w: 88, h: 6, c: [40, 32, 28] }),
      96,
      64,
    );
    expect(beam.boxes).toEqual([]);
  });

  it('leaves warm brown timber, however dark, out of the glass', () => {
    const m = findPanes(
      picture(64, 64, [200, 190, 170], { x: 0, y: 0, w: 64, h: 20, c: [70, 50, 35] }),
      64,
      64,
    );
    expect(m.boxes.filter((b) => b.kind === 'glass')).toEqual([]);
  });
});

describe('tidying a pane', () => {
  it('fills a notch and takes off a spur on a solid pane, leaves a leaded grid alone', () => {
    const w = 32;
    const solid: number[] = [];
    for (let y = 8; y < 20; y++)
      for (let x = 8; x < 18; x++) if (!(x === 12 && y === 8)) solid.push(y * w + x);
    // A one-pixel stalk under it.
    solid.push(20 * w + 12, 21 * w + 12);
    const tidy = new Set(tidyPane(solid, w, w));
    expect(tidy.has(8 * w + 12)).toBe(true);
    expect(tidy.has(21 * w + 12)).toBe(false);
    const grid: number[] = [];
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) if (x % 3 && y % 3) grid.push(y * w + x);
    expect(tidyPane(grid, w, w).sort((a, b) => a - b)).toEqual(grid.sort((a, b) => a - b));
  });
});
