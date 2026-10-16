/**
 * The clocks behind hit feedback (DESIGN.md 14.4), kept pure so they can be tested: a
 * freeze that stops simulation time for a few frames, a flash that holds for a few frames,
 * and a shake whose amplitude decays. Seconds in, seconds out; no Babylon here.
 */

/** Stops simulated time for a short while; `update` returns the simulated step to use. */
export class HitStop {
  private remaining = 0;

  freeze(seconds: number): void {
    this.remaining = Math.max(this.remaining, seconds);
  }

  get frozen(): boolean {
    return this.remaining > 0;
  }

  /** Real seconds in, simulated seconds out (0 while frozen). */
  update(dt: number): number {
    if (this.remaining <= 0) return dt;
    this.remaining -= dt;
    return 0;
  }
}

/** A full-strength flash that ends after `seconds`; separate from the freeze (it runs in real time). */
export class Flash {
  private remaining = 0;

  trigger(seconds: number): void {
    this.remaining = Math.max(this.remaining, seconds);
  }

  /** 1 while flashing, else 0. */
  get level(): number {
    return this.remaining > 0 ? 1 : 0;
  }

  update(dt: number): void {
    if (this.remaining > 0) this.remaining -= dt;
  }
}

/** A shake: amplitude fades linearly over its duration; jitter is resampled at `hz`. */
export class Shake {
  private amplitude = 0;
  private duration = 0;
  private remaining = 0;
  private sinceSample = Infinity;
  private x = 0;
  private y = 0;
  private roll = 0;

  constructor(
    private readonly rng: () => number = Math.random,
    private readonly hz = 30,
  ) {}

  trigger(amplitude: number, seconds: number): void {
    if (amplitude < this.amplitude * (this.remaining / Math.max(this.duration, 1e-6))) return;
    this.amplitude = amplitude;
    this.duration = seconds;
    this.remaining = seconds;
    this.sinceSample = Infinity;
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  /** Current offset (metres, camera right and up) and roll (radians). */
  get offset(): { x: number; y: number; roll: number } {
    return { x: this.x, y: this.y, roll: this.roll };
  }

  update(dt: number): void {
    if (this.remaining <= 0) {
      this.x = this.y = this.roll = 0;
      return;
    }
    this.remaining -= dt;
    this.sinceSample += dt;
    if (this.sinceSample < 1 / this.hz) return;
    this.sinceSample = 0;
    const a = this.amplitude * Math.max(0, this.remaining / this.duration);
    this.x = (this.rng() * 2 - 1) * a;
    this.y = (this.rng() * 2 - 1) * a;
    // Roll in radians: a few hundredths at the strongest shake.
    this.roll = (this.rng() * 2 - 1) * a * 0.35;
  }
}
