/**
 * The quality check every generated model passes before it ships (owner, 2026-10-23: "You
 * need automatic quality checker for generated models"; "Always retry model generation till
 * the model has no see through gaps"). Image-to-3D guesses the sides a picture does not show
 * and sometimes gets them wrong: batch 013's cottage-01 came back with its back wall folded
 * into the house and the store with its back gable open.
 *
 * Two parts. This screen, by geometry: rays come at the model level from sixteen sides and
 * from above at thirty degrees, a few centimetres apart, and each notes the first face it
 * meets. Meshy's triangles are wound consistently, so that is the outside of a surface or,
 * where something is wrong, the inside of one. An inside face lying on the model's outer
 * envelope (its convex hull) is mostly harmless, since models draw both faces: slivers run along
 * most timber frames. One well behind the envelope means the ray went in past where a wall
 * should be. Side by side such rays make a gap, measured in square metres, and a gap larger than
 * a sound temple's belfry openings makes the model suspect.
 *
 * The screen finds every broken model of batch 013 (cottage-01, the store) and passes fifteen
 * sound ones, but it also flags a face turned over in a hollow of the envelope, which draws as
 * if nothing were wrong (the inn's back gable behind its verge, a patch of the barn's roof above
 * its lean-to). So the verdict is the second part, by eye: every new model's review sheet
 * (`asset review`, tools/review) shows its eight sides as the game draws them and again with the
 * inside faces in magenta, and a model goes into the game only once its sheet has been looked at.
 */
import { NodeIO, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import quickhull from 'quickhull3d';

export const QUALITY = {
  /** An inside face this far behind the envelope, metres, is the inside of the model. */
  depth: 0.3,
  /** A gap of this many square metres or more, seen from one side, makes the model suspect. */
  gap: 1.5,
  /** Sides the rays come from, all round, and their tilts (degrees, down is negative). */
  sides: 16,
  tilts: [0, -30],
  /** Ray spacing: a fiftieth of the model's largest size, within these bounds (metres). */
  spacing: [0.03, 0.2],
} as const;

/** A gap seen from one side: where round the model, how high, and how large. */
export interface Gap {
  /** Degrees round from the front (+Z), and the tilt of the rays that found it. */
  round: number;
  tilt: number;
  /** Height of the gap's lowest and highest ray hits above the foot, metres. */
  from: number;
  to: number;
  /** Square metres. */
  area: number;
}

export interface QualityReport {
  triangles: number;
  textured: boolean;
  rays: number;
  /** Every gap larger than a single ray, largest first. */
  gaps: Gap[];
  /** The largest gap is big enough to look at first. */
  suspect: boolean;
  /** What keeps the model out of the game whatever its sheet shows; empty when none. */
  problems: string[];
}

/** Triangles in metres, the foot at y = 0: nine numbers each, in winding order (front CCW). */
export interface Triangles {
  data: Float64Array;
  count: number;
}

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: V): number => Math.hypot(a[0], a[1], a[2]);
const vertex = (t: Triangles, i: number, k: number): V => {
  const o = i * 9 + k * 3;
  return [t.data[o]!, t.data[o + 1]!, t.data[o + 2]!];
};

/** The model's triangles in its scene's frame, scaled so it stands `height` metres tall. */
export function trianglesOf(doc: Document, height: number): Triangles {
  const out: number[] = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const det =
      m[0] * (m[5] * m[10] - m[9] * m[6]) -
      m[4] * (m[1] * m[10] - m[9] * m[2]) +
      m[8] * (m[1] * m[6] - m[5] * m[2]);
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const p = pos.getArray()!;
      const idx = prim.getIndices()?.getArray() ?? null;
      const n = idx ? idx.length : pos.getCount();
      const at = (i: number): V => {
        const v = (idx ? idx[i]! : i) * 3;
        const x = p[v]!;
        const y = p[v + 1]!;
        const z = p[v + 2]!;
        return [
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14],
        ];
      };
      for (let t = 0; t + 2 < n; t += 3) {
        // A mirroring node turns the winding over.
        const [a, b, c] = det < 0 ? [at(t), at(t + 2), at(t + 1)] : [at(t), at(t + 1), at(t + 2)];
        out.push(...a, ...b, ...c);
      }
    }
  }
  const data = Float64Array.from(out);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 1; i < data.length; i += 3) {
    lo = Math.min(lo, data[i]!);
    hi = Math.max(hi, data[i]!);
  }
  const s = hi > lo ? height / (hi - lo) : 1;
  for (let i = 0; i < data.length; i++) data[i] = data[i]! * s - (i % 3 === 1 ? lo * s : 0);
  return { data, count: data.length / 9 };
}

/** The convex hull as outward planes: a normal and its offset, n·x = d on the plane. */
export function hullPlanes(t: Triangles): { n: V; d: number }[] {
  const points: V[] = [];
  for (let i = 0; i < t.data.length; i += 3)
    points.push([t.data[i]!, t.data[i + 1]!, t.data[i + 2]!]);
  const planes: { n: V; d: number }[] = [];
  for (const face of quickhull(points)) {
    const [a, b, c] = face as [number, number, number];
    const pa = points[a]!;
    const n0 = cross(sub(points[b]!, pa), sub(points[c]!, pa));
    const l = len(n0);
    if (l < 1e-12) continue;
    const n: V = [n0[0] / l, n0[1] / l, n0[2] / l];
    planes.push({ n, d: dot(n, pa) });
  }
  return planes;
}

/** How far along the ray `o + t·d` it enters the convex hull, or null if it misses it. */
export function hullEntry(planes: { n: V; d: number }[], o: V, d: V): number | null {
  let enter = -Infinity;
  let leave = Infinity;
  for (const { n, d: off } of planes) {
    const den = dot(n, d);
    const dist = off - dot(n, o);
    if (Math.abs(den) < 1e-12) {
      if (dist < 0) return null;
      continue;
    }
    const t = dist / den;
    if (den < 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
  }
  return enter <= leave ? enter : null;
}

/** Every ray from every side; the gaps they find, largest first. */
export function findGaps(t: Triangles): { rays: number; gaps: Gap[] } {
  const min: V = [Infinity, Infinity, Infinity];
  const max: V = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < t.data.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, t.data[i + k]!);
      max[k] = Math.max(max[k]!, t.data[i + k]!);
    }
  }
  const planes = hullPlanes(t);
  const centre: V = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const step = Math.min(QUALITY.spacing[1], Math.max(QUALITY.spacing[0], extent / 50));
  const far = len(sub(max, min)) + 1;
  const gaps: Gap[] = [];
  let rays = 0;
  for (const tilt of QUALITY.tilts) {
    for (let s = 0; s < QUALITY.sides; s++) {
      const round = (360 * s) / QUALITY.sides;
      const r = (round * Math.PI) / 180;
      const e = (tilt * Math.PI) / 180;
      // The viewer stands round from +Z and looks at the model's middle.
      const d: V = [-Math.sin(r) * Math.cos(e), Math.sin(e), -Math.cos(r) * Math.cos(e)];
      const u0 = cross([0, 1, 0], d);
      const u: V = [u0[0] / len(u0), u0[1] / len(u0), u0[2] / len(u0)];
      const v = cross(d, u);
      // Triangles binned by where they fall across the view, so a ray tries only its cell's.
      const pu: number[] = [];
      const pv: number[] = [];
      for (let i = 0; i < t.data.length; i += 3) {
        const q = sub([t.data[i]!, t.data[i + 1]!, t.data[i + 2]!], centre);
        pu.push(dot(q, u));
        pv.push(dot(q, v));
      }
      let uMin = Infinity;
      let uMax = -Infinity;
      let vMin = Infinity;
      let vMax = -Infinity;
      for (let i = 0; i < pu.length; i++) {
        uMin = Math.min(uMin, pu[i]!);
        uMax = Math.max(uMax, pu[i]!);
        vMin = Math.min(vMin, pv[i]!);
        vMax = Math.max(vMax, pv[i]!);
      }
      const cols = Math.ceil((uMax - uMin) / step) + 1;
      const rows = Math.ceil((vMax - vMin) / step) + 1;
      const cells: number[][] = Array.from({ length: cols * rows }, () => []);
      for (let i = 0; i < t.count; i++) {
        const us = [pu[i * 3]!, pu[i * 3 + 1]!, pu[i * 3 + 2]!];
        const vs = [pv[i * 3]!, pv[i * 3 + 1]!, pv[i * 3 + 2]!];
        const c0 = Math.floor((Math.min(...us) - uMin) / step);
        const c1 = Math.floor((Math.max(...us) - uMin) / step);
        const r0 = Math.floor((Math.min(...vs) - vMin) / step);
        const r1 = Math.floor((Math.max(...vs) - vMin) / step);
        for (let rr = r0; rr <= r1; rr++) {
          for (let cc = c0; cc <= c1; cc++) cells[rr * cols + cc]!.push(i);
        }
      }
      // Per ray: what it meets first (0 nothing, 1 the outside of a face, 2 the inside of
      // one), how far along, and how far behind the envelope.
      const kind = new Uint8Array(cols * rows);
      const behind = new Float64Array(cols * rows);
      const hitY = new Float64Array(cols * rows);
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          const list = cells[rr * cols + cc]!;
          if (!list.length) continue;
          rays++;
          const cu = uMin + (cc + 0.5) * step;
          const cv = vMin + (rr + 0.5) * step;
          const o: V = [
            centre[0] + u[0] * cu + v[0] * cv - d[0] * far,
            centre[1] + u[1] * cu + v[1] * cv - d[1] * far,
            centre[2] + u[2] * cu + v[2] * cv - d[2] * far,
          ];
          let best = Infinity;
          let back = false;
          for (const i of list) {
            const a = vertex(t, i, 0);
            const e1 = sub(vertex(t, i, 1), a);
            const e2 = sub(vertex(t, i, 2), a);
            const pvec = cross(d, e2);
            const det = dot(e1, pvec);
            if (Math.abs(det) < 1e-12) continue;
            const inv = 1 / det;
            const tv = sub(o, a);
            const bu = dot(tv, pvec) * inv;
            if (bu < 0 || bu > 1) continue;
            const qv = cross(tv, e1);
            const bv = dot(d, qv) * inv;
            if (bv < 0 || bu + bv > 1) continue;
            const dist = dot(e2, qv) * inv;
            if (dist > 1e-6 && dist < best) {
              best = dist;
              back = dot(cross(e1, e2), d) > 0;
            }
          }
          if (best === Infinity) continue;
          const k = rr * cols + cc;
          kind[k] = back ? 2 : 1;
          behind[k] = best - (hullEntry(planes, o, d) ?? best);
          hitY[k] = o[1] + d[1] * best;
        }
      }
      // Inside-face rays that touch side by side are one patch; its rays well behind the
      // envelope measure the gap.
      const seen = new Uint8Array(cols * rows);
      const near = (j: number): number[] => {
        const jr = Math.floor(j / cols);
        const jc = j % cols;
        return [
          jr > 0 ? j - cols : -1,
          jr < rows - 1 ? j + cols : -1,
          jc > 0 ? j - 1 : -1,
          jc < cols - 1 ? j + 1 : -1,
        ].filter((n) => n >= 0);
      };
      for (let k = 0; k < kind.length; k++) {
        if (kind[k] !== 2 || seen[k]) continue;
        const patch: number[] = [];
        const stack = [k];
        seen[k] = 1;
        while (stack.length) {
          const j = stack.pop()!;
          patch.push(j);
          for (const n of near(j)) {
            if (kind[n] === 2) {
              if (!seen[n]) {
                seen[n] = 1;
                stack.push(n);
              }
            }
          }
        }
        const deep = patch.filter((j) => behind[j]! >= QUALITY.depth);
        if (deep.length < 2) continue;
        const ys = deep.map((j) => hitY[j]!);
        gaps.push({
          round,
          tilt,
          from: Math.min(...ys),
          to: Math.max(...ys),
          area: deep.length * step * step,
        });
      }
    }
  }
  gaps.sort((a, b) => b.area - a.area);
  return { rays, gaps };
}

/** A gap in words, for a run's log. */
export function describeGap(g: Gap): string {
  return (
    `${g.area.toFixed(1)} m² seen from ${g.round}° round from the front` +
    `${g.tilt ? ` and ${-g.tilt}° above` : ''}, ${g.from.toFixed(1)}–${g.to.toFixed(1)} m up`
  );
}

/** Check one model file standing `height` metres tall. */
export async function checkModel(
  path: string,
  height: number,
  opts: { targetTriangles?: number } = {},
): Promise<QualityReport> {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
  const tris = trianglesOf(doc, height);
  const textured = doc
    .getRoot()
    .listMaterials()
    .some((m) => m.getBaseColorTexture() !== null);
  const { rays, gaps } = findGaps(tris);
  const problems: string[] = [];
  if (!textured) problems.push('no base colour texture');
  if (opts.targetTriangles && tris.count > opts.targetTriangles * 1.5) {
    problems.push(
      `${tris.count} triangles, more than half again the ${opts.targetTriangles} asked`,
    );
  }
  const suspect = (gaps[0]?.area ?? 0) >= QUALITY.gap;
  return { triangles: tris.count, textured, rays, gaps, suspect, problems };
}
