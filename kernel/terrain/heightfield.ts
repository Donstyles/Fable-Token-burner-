/** A square grid of heights in metres, centred on the origin, with bilinear sampling. */
export class Heightfield {
  readonly heights: Float32Array;
  /** Vertices per side. */
  readonly n: number;
  /** Width in metres. */
  readonly width: number;

  constructor(
    readonly cells: number,
    readonly cell: number,
  ) {
    this.n = cells + 1;
    this.width = cells * cell;
    this.heights = new Float32Array(this.n * this.n);
  }

  /** World x of column i. */
  x(i: number): number {
    return -this.width / 2 + i * this.cell;
  }

  z(j: number): number {
    return -this.width / 2 + j * this.cell;
  }

  get(i: number, j: number): number {
    const ci = Math.min(this.n - 1, Math.max(0, i));
    const cj = Math.min(this.n - 1, Math.max(0, j));
    return this.heights[cj * this.n + ci]!;
  }

  set(i: number, j: number, h: number): void {
    this.heights[j * this.n + i] = h;
  }

  /** Bilinear height at a world position (clamped to the grid). */
  sample(x: number, z: number): number {
    const fx = (x + this.width / 2) / this.cell;
    const fz = (z + this.width / 2) / this.cell;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const h00 = this.get(i, j);
    const h10 = this.get(i + 1, j);
    const h01 = this.get(i, j + 1);
    const h11 = this.get(i + 1, j + 1);
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  /** Unit normal at vertex (i, j) from central differences. */
  normal(i: number, j: number): [number, number, number] {
    const dx = (this.get(i + 1, j) - this.get(i - 1, j)) / (2 * this.cell);
    const dz = (this.get(i, j + 1) - this.get(i, j - 1)) / (2 * this.cell);
    const len = Math.hypot(dx, 1, dz);
    return [-dx / len, 1 / len, -dz / len];
  }

  /** Slope at vertex (i, j), degrees from horizontal. */
  slopeDeg(i: number, j: number): number {
    const n = this.normal(i, j);
    return (Math.acos(Math.min(1, n[1])) * 180) / Math.PI;
  }

  get min(): number {
    let m = Infinity;
    for (const h of this.heights) m = Math.min(m, h);
    return m;
  }

  get max(): number {
    let m = -Infinity;
    for (const h of this.heights) m = Math.max(m, h);
    return m;
  }
}
