/**
 * MM6's 256 colours (tools/palette.ts, from the reference shots) applied where MM6 applied
 * them: to the bitmaps. The world's painted tiles and the models' skins are snapped to the
 * palette once, and the renderer lights them freely, as the original lit its palettised
 * textures through a light table (critics, round 8: a palettised frame has too few colours,
 * a palettised texture under light has MM6's several hundred).
 */
import palette from './palette-mm6.json';

type Rgb = [number, number, number];

const COLOURS: Rgb[] = (palette as { colours: string[] }).colours.map((hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]);

const memo = new Map<number, Rgb>();

/** The palette colour nearest to one of ours. */
export function paletteColour(r: number, g: number, b: number): Rgb {
  const key = (r << 16) | (g << 8) | b;
  const hit = memo.get(key);
  if (hit) return hit;
  let best = COLOURS[0]!;
  let bestD = Infinity;
  for (const c of COLOURS) {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  memo.set(key, best);
  return best;
}

/** Snap every opaque pixel of an RGBA buffer to the palette, in place. */
export function snapToPalette(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const c = paletteColour(data[i]!, data[i + 1]!, data[i + 2]!);
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
  }
}

/** Snap a painted canvas to the palette, in place. */
export function palettise(c: HTMLCanvasElement): HTMLCanvasElement {
  const g = c.getContext('2d');
  if (!g) return c;
  const img = g.getImageData(0, 0, c.width, c.height);
  snapToPalette(img.data);
  g.putImageData(img, 0, 0);
  return c;
}
