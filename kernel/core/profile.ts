import type { Vec2 } from './math';

/** A closed 2D outline, counter-clockwise, used by extrude, sweep and revolve. */
export type Profile = Vec2[];

export function signedArea(p: Profile): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i] ?? [0, 0];
    const [x1, y1] = p[(i + 1) % p.length] ?? [0, 0];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

export function ensureCCW(p: Profile): Profile {
  return signedArea(p) < 0 ? [...p].reverse() : p;
}

/** Drop consecutive duplicate points, including a last point that repeats the first. */
export function dedupeProfile(p: Profile, eps = 1e-9): Profile {
  const out: Vec2[] = [];
  for (const q of p) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last[0] - q[0], last[1] - q[1]) < eps) continue;
    out.push(q);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && out.length > 1 && Math.hypot(first[0] - last[0], first[1] - last[1]) < eps)
    out.pop();
  return out;
}

/** Build outlines with straight runs and arcs. */
export class ProfileBuilder {
  private readonly pts: Vec2[] = [];

  moveTo(x: number, y: number): this {
    this.pts.push([x, y]);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.pts.push([x, y]);
    return this;
  }

  /** Arc around (cx, cy) from angle a0 to a1 (radians), excluding the start point if it repeats. */
  arcTo(cx: number, cy: number, r: number, a0: number, a1: number, segments: number): this {
    for (let i = 0; i <= segments; i++) {
      const a = a0 + ((a1 - a0) * i) / segments;
      const p: Vec2 = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const last = this.pts[this.pts.length - 1];
      if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 1e-9) continue;
      this.pts.push(p);
    }
    return this;
  }

  close(): Profile {
    const first = this.pts[0];
    const last = this.pts[this.pts.length - 1];
    if (
      first &&
      last &&
      this.pts.length > 1 &&
      Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-9
    ) {
      this.pts.pop();
    }
    return ensureCCW(this.pts);
  }
}

export function rect(w: number, h: number, centered = true): Profile {
  const x0 = centered ? -w / 2 : 0;
  const y0 = centered ? -h / 2 : 0;
  return [
    [x0, y0],
    [x0 + w, y0],
    [x0 + w, y0 + h],
    [x0, y0 + h],
  ];
}

export function circle(r: number, segments = 16): Profile {
  const p: Profile = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    p.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return p;
}

/**
 * Doorway or window outline with a round or pointed head: width w, straight jambs up
 * to `springing`, arch above. Origin at the centre of the sill.
 */
export function arch(
  w: number,
  springing: number,
  kind: 'round' | 'pointed' = 'round',
  segments = 8,
): Profile {
  const b = new ProfileBuilder();
  const r = w / 2;
  b.moveTo(-r, 0).lineTo(r, 0).lineTo(r, springing);
  if (kind === 'round') {
    b.arcTo(0, springing, r, 0, Math.PI, segments);
  } else {
    // Two arcs centred on the opposite springing points (equilateral pointed arch).
    const rr = w;
    const top = springing + Math.sqrt(rr * rr - r * r);
    const a1 = Math.atan2(top - springing, 0 - -r); // from right springing centre at (-r)
    b.arcTo(-r, springing, rr, 0, a1, segments);
    b.arcTo(r, springing, rr, Math.PI - a1, Math.PI, segments);
  }
  b.lineTo(-r, springing);
  return b.close();
}
