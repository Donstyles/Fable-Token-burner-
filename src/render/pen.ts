/**
 * A one-pixel pen for pixel art (critics, round 11: MM6's emblems are drawn with a two-pixel
 * pen at their scale, which is one pixel at ours): Bresenham lines between integer points,
 * polylines through sampled curves, and a scanline fill, all landing on whole pixels so
 * nothing is anti-aliased. Points are [x, y].
 */
export type Pt = [number, number];

/** The pixels of a line from a to b, both ends included. */
export function line(a: Pt, b: Pt): Pt[] {
  let x0 = Math.round(a[0]);
  let y0 = Math.round(a[1]);
  const x1 = Math.round(b[0]);
  const y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const out: Pt[] = [];
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return out;
}

/** A polyline's pixels, each joint once. */
export function polyline(points: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  const seen = new Set<string>();
  for (let i = 0; i + 1 < points.length; i++) {
    for (const p of line(points[i]!, points[i + 1]!)) {
      const k = `${p[0]},${p[1]}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
  }
  if (points.length === 1) out.push([Math.round(points[0]![0]), Math.round(points[0]![1])]);
  return out;
}

/** Points along an ellipse arc from angle a0 to a1 (radians, y down), for `polyline`. */
export function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  steps = 24,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

/** Points along a quadratic curve from p0 through the pull of p1 to p2. */
export function quad(p0: Pt, p1: Pt, p2: Pt, steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
  return out;
}

/** The pixels inside a closed polygon (even-odd, pixel centres). */
export function fill(points: readonly Pt[]): Pt[] {
  if (points.length < 3) return [];
  const ys = points.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  const out: Pt[] = [];
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      if (a[1] <= cy === b[1] <= cy) continue;
      xs.push(a[0] + ((cy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++)
        out.push([x, y]);
    }
  }
  return out;
}
