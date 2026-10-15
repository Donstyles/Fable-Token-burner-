/**
 * Wading rules (DESIGN.md 11.3): shallow water slows the party, deep water is dangerous
 * without Water Walk, and the view tints when the eyes go under.
 */
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { LevelWaterBody } from './level';

/** Below this much water the party walks normally. */
export const SHALLOW_DEPTH = 0.25;
/** From here on the party is swimming in earnest: deep-water damage without Water Walk. */
export const DEEP_DEPTH = 1.3;

/** Depth of water over the feet at `feet`, or 0 when not in any body. */
export function waterDepthAt(bodies: LevelWaterBody[], feet: Vector3): number {
  let depth = 0;
  for (const b of bodies) {
    if (feet.x < b.min.x || feet.x > b.max.x || feet.z < b.min.z || feet.z > b.max.z) continue;
    // Only bodies whose surface is above the feet but not absurdly far (another floor).
    const d = b.y - feet.y;
    if (d > 0 && d < 6) depth = Math.max(depth, d);
  }
  return depth;
}

/** Walking speed multiplier for a given depth. */
export function wadeSpeedFactor(depth: number): number {
  if (depth <= SHALLOW_DEPTH) return 1;
  if (depth >= DEEP_DEPTH) return 0.35;
  return 0.5;
}

/** True when a point (the eyes) is under the surface of any body. */
export function isUnderwater(bodies: LevelWaterBody[], eye: Vector3): boolean {
  for (const b of bodies) {
    if (eye.x < b.min.x || eye.x > b.max.x || eye.z < b.min.z || eye.z > b.max.z) continue;
    if (eye.y < b.y && b.y - eye.y < 6) return true;
  }
  return false;
}

/** A full-screen tint shown while the eyes are under water. */
export class UnderwaterTint {
  private readonly el: HTMLDivElement;
  private shown = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'underwater-tint';
    this.el.style.cssText =
      'position:absolute;inset:0;pointer-events:none;background:rgba(12,52,62,0.55);' +
      'mix-blend-mode:multiply;opacity:0;transition:opacity 180ms linear;';
    parent.appendChild(this.el);
  }

  set(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.el.style.opacity = on ? '1' : '0';
  }

  dispose(): void {
    this.el.remove();
  }
}
