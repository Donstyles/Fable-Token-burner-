/** Smooth 2D paths on the ground plane (valley, ravine, road) and distances to them. */

export type P2 = [number, number];

/** Catmull-Rom through the control points, `perSegment` points per span, ends clamped. */
export function smoothPath(points: readonly P2[], perSegment = 8): P2[] {
  if (points.length < 2) return [...points];
  const out: P2[] = [];
  const at = (i: number): P2 => points[Math.min(points.length - 1, Math.max(0, i))]!;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const z =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, z]);
    }
  }
  out.push(at(points.length - 1));
  return out;
}

export interface PathHit {
  /** Distance from the query point to the path. */
  distance: number;
  /** Arc length along the path at the nearest point. */
  along: number;
  /** Nearest point on the path. */
  point: P2;
  /** Unit tangent at the nearest point. */
  tangent: P2;
}

/** A polyline with cumulative arc lengths and nearest-point queries. */
export class GroundPath {
  readonly lengths: number[] = [0];
  readonly length: number;

  constructor(readonly points: readonly P2[]) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      this.lengths.push(this.lengths[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.length = this.lengths[this.lengths.length - 1] ?? 0;
  }

  nearest(x: number, z: number): PathHit {
    let best: PathHit = {
      distance: Infinity,
      along: 0,
      point: this.points[0] ?? [0, 0],
      tangent: [0, 1],
    };
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len2 = dx * dx + dz * dz || 1e-9;
      const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
      const px = a[0] + dx * t;
      const pz = a[1] + dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best.distance) {
        const len = Math.sqrt(len2);
        best = {
          distance: d,
          along: this.lengths[i - 1]! + len * t,
          point: [px, pz],
          tangent: [dx / len, dz / len],
        };
      }
    }
    return best;
  }

  /** Point at an arc length, clamped to the path. */
  at(along: number): P2 {
    const s = Math.min(this.length, Math.max(0, along));
    for (let i = 1; i < this.points.length; i++) {
      if (s <= this.lengths[i]!) {
        const a = this.points[i - 1]!;
        const b = this.points[i]!;
        const seg = this.lengths[i]! - this.lengths[i - 1]!;
        const t = seg > 0 ? (s - this.lengths[i - 1]!) / seg : 0;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
    }
    return this.points[this.points.length - 1] ?? [0, 0];
  }
}
