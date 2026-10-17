/**
 * The marble and the wood, painted once (DESIGN.md 16.5). stone.css and wood.css draw them as
 * SVGs of turbulence filters; browsers rasterise such a background again and again as panels
 * repaint, which on WebKit without a GPU costs whole frames. So each SVG is painted to a
 * canvas once at startup and the bitmap handed to CSS in its place; until then the SVG shows.
 */
const SIZE = 512;

function paintOnce(name: string): void {
  const root = document.documentElement;
  const svg = getComputedStyle(root).getPropertyValue(name).trim();
  const m = /^url\("?(data:image\/svg\+xml.*?)"?\)$/.exec(svg);
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
      root.style.setProperty(name, `url("${canvas.toDataURL('image/png')}")`);
    } catch {
      // A tainted canvas or no storage: the SVG stays.
    }
  };
  img.src = m[1]!;
}

export function rasterizeStone(): void {
  paintOnce('--stone');
  paintOnce('--wood');
  paintOnce('--leather');
}
