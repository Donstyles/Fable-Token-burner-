/**
 * Where a model is painted as light: lantern glass, a forge's coals, a candle. Meshy paints them
 * warm and bright, so the model's own texture says where they are: each triangle is sampled in
 * its colour picture, the warm bright ones are kept, and those that touch make one glow, given
 * as its middle in metres in the model's frame (kernel/terrain/props.ts: x across the front,
 * positive to the right as you face it, y up from the foot, z towards the front). The points go
 * into the props table as the model's lights once a marked review render shows them right.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';

/** A warm bright texel: red high, blue well under it, green between (yellow to orange). */
export function isGlow(r: number, g: number, b: number): boolean {
  return r >= 200 && g >= 100 && b <= 150 && r - b >= 90 && r >= g;
}

export interface Glow {
  /** The glow's middle, metres, in the model's frame. */
  at: [number, number, number];
  /** Square metres of painted light. */
  area: number;
}

/** Every glow on the model standing `height` metres tall, largest first. */
export async function findGlows(path: string, height: number): Promise<Glow[]> {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path);
  type Tri = { p: number[][]; uv: number[][] };
  const tris: Tri[] = [];
  let image: { data: Buffer; width: number; height: number } | null = null;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')?.getArray();
      const uv = prim.getAttribute('TEXCOORD_0')?.getArray();
      const tex = prim.getMaterial()?.getBaseColorTexture()?.getImage();
      if (!pos || !uv || !tex) continue;
      if (!image) {
        const { data, info } = await sharp(Buffer.from(tex))
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        image = { data, width: info.width, height: info.height };
      }
      const idx = prim.getIndices()?.getArray() ?? null;
      const n = idx ? idx.length : pos.length / 3;
      const at = (i: number): { p: number[]; uv: number[] } => {
        const v = idx ? idx[i]! : i;
        const x = pos[v * 3]!;
        const y = pos[v * 3 + 1]!;
        const z = pos[v * 3 + 2]!;
        return {
          p: [
            m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14],
          ],
          uv: [uv[v * 2]!, uv[v * 2 + 1]!],
        };
      };
      for (let t = 0; t + 2 < n; t += 3) {
        const c = [at(t), at(t + 1), at(t + 2)];
        tris.push({ p: c.map((x) => x.p), uv: c.map((x) => x.uv) });
      }
    }
  }
  if (!image || !tris.length) return [];
  // Metres, the foot at y = 0.
  let lo = Infinity;
  let hi = -Infinity;
  for (const t of tris) {
    for (const p of t.p) {
      lo = Math.min(lo, p[1]!);
      hi = Math.max(hi, p[1]!);
    }
  }
  const s = hi > lo ? height / (hi - lo) : 1;
  const img = image;
  const texel = (u: number, v: number): [number, number, number] => {
    const x = Math.min(img.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * img.width)));
    const y = Math.min(img.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * img.height)));
    const o = (y * img.width + x) * 3;
    return [img.data[o]!, img.data[o + 1]!, img.data[o + 2]!];
  };
  // A triangle glows when most of seven samples across it do.
  const lit: { at: number[]; area: number }[] = [];
  const weights = [
    [1 / 3, 1 / 3],
    [0.6, 0.2],
    [0.2, 0.6],
    [0.2, 0.2],
    [0.45, 0.45],
    [0.1, 0.45],
    [0.45, 0.1],
  ];
  for (const t of tris) {
    let glowing = 0;
    for (const [a, b] of weights) {
      const c = 1 - a! - b!;
      const u = t.uv[0]![0]! * c + t.uv[1]![0]! * a! + t.uv[2]![0]! * b!;
      const v = t.uv[0]![1]! * c + t.uv[1]![1]! * a! + t.uv[2]![1]! * b!;
      if (isGlow(...texel(u, v))) glowing++;
    }
    if (glowing < 4) continue;
    const [p0, p1, p2] = t.p.map((p) => [p[0]! * s, (p[1]! - lo) * s, p[2]! * s]) as number[][];
    const e1 = [p1![0]! - p0![0]!, p1![1]! - p0![1]!, p1![2]! - p0![2]!];
    const e2 = [p2![0]! - p0![0]!, p2![1]! - p0![1]!, p2![2]! - p0![2]!];
    const area =
      Math.hypot(
        e1[1]! * e2[2]! - e1[2]! * e2[1]!,
        e1[2]! * e2[0]! - e1[0]! * e2[2]!,
        e1[0]! * e2[1]! - e1[1]! * e2[0]!,
      ) / 2;
    lit.push({
      at: [0, 1, 2].map((k) => (p0![k]! + p1![k]! + p2![k]!) / 3),
      area,
    });
  }
  // Lit triangles within half a metre of each other are one glow.
  const group = lit.map((_, i) => i);
  const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i]!)));
  for (let i = 0; i < lit.length; i++) {
    for (let j = i + 1; j < lit.length; j++) {
      const a = lit[i]!.at;
      const b = lit[j]!.at;
      if (Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) < 0.5) group[root(i)] = root(j);
    }
  }
  const glows = new Map<number, { sum: number[]; area: number }>();
  for (let i = 0; i < lit.length; i++) {
    const g = glows.get(root(i)) ?? glows.set(root(i), { sum: [0, 0, 0], area: 0 }).get(root(i))!;
    const { at, area } = lit[i]!;
    for (let k = 0; k < 3; k++) g.sum[k]! += at[k]! * area;
    g.area += area;
  }
  return [...glows.values()]
    .filter((g) => g.area > 0)
    .map((g) => ({
      at: g.sum.map((v) => +(v / g.area).toFixed(2)) as [number, number, number],
      area: +g.area.toFixed(3),
    }))
    .sort((a, b) => b.area - a.area);
}
