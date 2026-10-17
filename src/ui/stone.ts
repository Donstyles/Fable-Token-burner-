/**
 * The marble, painted once (DESIGN.md 16.5). stone.css draws it as an SVG of turbulence
 * filters; browsers rasterise such a background again and again as panels repaint, which
 * on WebKit without a GPU costs whole frames. So the SVG is painted to a canvas once at
 * startup and the bitmap handed to CSS in its place; until then the SVG itself shows.
 */
const SIZE = 512;

export function rasterizeStone(): void {
  const root = document.documentElement;
  const svg = getComputedStyle(root).getPropertyValue('--stone').trim();
  const m = /^url\("?(data:image\/svg\+xml[^")]+)"?\)$/.exec(svg);
  if (!m) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    try {
      root.style.setProperty('--stone', `url("${canvas.toDataURL('image/png')}")`);
    } catch {
      // A tainted canvas or no storage: the SVG stays.
    }
  };
  img.src = m[1]!;
}
