/**
 * Picking what a cast flies at (DESIGN.md 16.9). MM6 sent a bolt down the crosshair and let
 * it find what it hit; on a phone there is no crosshair to aim, so a bolt goes for the living
 * monster nearest the middle of the view, within the spell's reach and a cone round the look
 * direction. Pure, so the choice is tested without a scene.
 */
export interface TargetCandidate {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export interface TargetOptions {
  /** Metres. */
  range: number;
  /** Half-angle of the cone round the look direction, degrees. */
  coneDeg: number;
}

export const BOLT_TARGETING: TargetOptions = { range: 40, coneDeg: 28 };

/** Index of the candidate to aim at, or -1 when nothing living is in the cone and reach. */
export function pickTarget(
  candidates: readonly TargetCandidate[],
  eye: { x: number; y: number; z: number },
  forward: { x: number; y: number; z: number },
  options: TargetOptions = BOLT_TARGETING,
): number {
  const fl = Math.hypot(forward.x, forward.y, forward.z) || 1;
  const fx = forward.x / fl;
  const fy = forward.y / fl;
  const fz = forward.z / fl;
  const cosCone = Math.cos((options.coneDeg * Math.PI) / 180);
  let best = -1;
  let bestCos = -2;
  candidates.forEach((c, i) => {
    if (!c.alive) return;
    const dx = c.x - eye.x;
    const dy = c.y - eye.y;
    const dz = c.z - eye.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.5 || d > options.range) return;
    const cos = (dx * fx + dy * fy + dz * fz) / d;
    if (cos < cosCone) return;
    // Nearest to the middle of the view wins; at equal angles the closer one.
    if (
      cos > bestCos + 1e-6 ||
      (Math.abs(cos - bestCos) <= 1e-6 && best >= 0 && d < dist(candidates[best]!, eye))
    ) {
      best = i;
      bestCos = cos;
    }
  });
  return best;
}

function dist(c: TargetCandidate, eye: { x: number; y: number; z: number }): number {
  return Math.hypot(c.x - eye.x, c.y - eye.y, c.z - eye.z);
}
