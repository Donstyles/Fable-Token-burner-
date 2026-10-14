/** Small vector and matrix kit for the geometry kernel. Column-major 4×4 like glTF. */
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Mat4 = number[];

export const v3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  length: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  distance: (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  normalize: (a: Vec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]);
    return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
};

export const mat4 = {
  identity: (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  translation: (x: number, y: number, z: number): Mat4 => [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    x,
    y,
    z,
    1,
  ],
  scaling: (x: number, y: number, z: number): Mat4 => [
    x,
    0,
    0,
    0,
    0,
    y,
    0,
    0,
    0,
    0,
    z,
    0,
    0,
    0,
    0,
    1,
  ],
  rotationX: (a: number): Mat4 => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  },
  rotationY: (a: number): Mat4 => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  rotationZ: (a: number): Mat4 => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  /** a × b: apply b first, then a. */
  multiply: (a: Mat4, b: Mat4): Mat4 => {
    const out = new Array<number>(16).fill(0);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0);
        out[col * 4 + row] = sum;
      }
    }
    return out;
  },
  /** Compose: translate(t) × rotateY(ry) × scale(s). */
  compose: (t: Vec3 = [0, 0, 0], ry = 0, s: Vec3 = [1, 1, 1]): Mat4 =>
    mat4.multiply(
      mat4.translation(t[0], t[1], t[2]),
      mat4.multiply(mat4.rotationY(ry), mat4.scaling(s[0], s[1], s[2])),
    ),
  transformPoint: (m: Mat4, p: Vec3): Vec3 => [
    (m[0] ?? 0) * p[0] + (m[4] ?? 0) * p[1] + (m[8] ?? 0) * p[2] + (m[12] ?? 0),
    (m[1] ?? 0) * p[0] + (m[5] ?? 0) * p[1] + (m[9] ?? 0) * p[2] + (m[13] ?? 0),
    (m[2] ?? 0) * p[0] + (m[6] ?? 0) * p[1] + (m[10] ?? 0) * p[2] + (m[14] ?? 0),
  ],
  /** Transform a direction by the upper 3×3 (no translation). */
  transformDirection: (m: Mat4, d: Vec3): Vec3 => [
    (m[0] ?? 0) * d[0] + (m[4] ?? 0) * d[1] + (m[8] ?? 0) * d[2],
    (m[1] ?? 0) * d[0] + (m[5] ?? 0) * d[1] + (m[9] ?? 0) * d[2],
    (m[2] ?? 0) * d[0] + (m[6] ?? 0) * d[1] + (m[10] ?? 0) * d[2],
  ],
  /** Determinant of the upper 3×3: negative means the transform mirrors. */
  det3: (m: Mat4): number => {
    const [a, b, c] = [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0];
    const [d, e, f] = [m[4] ?? 0, m[5] ?? 0, m[6] ?? 0];
    const [g, h, i] = [m[8] ?? 0, m[9] ?? 0, m[10] ?? 0];
    return a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e);
  },
};

export const DEG = Math.PI / 180;
