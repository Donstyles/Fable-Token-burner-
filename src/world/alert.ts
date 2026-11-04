/**
 * The enemy detector (DESIGN.md 17.16; docs/gaps/characters.md 10.5): MM6's gems beside the
 * portraits are not condition lights but a warning of monsters about, green with none near,
 * yellow with one some way off, red with one close, and the party may not rest unless they are
 * green (14.1). The radii are ours: MM7's engine warns at 51 m and reddens at arm's reach, too
 * far and too near for a phone's view; ours warn at the distance a rest is refused and redden
 * at the distance a monster notices the party.
 */
export type AlertLevel = 'green' | 'yellow' | 'red';

/** A living monster within this of the party turns the gems yellow and forbids a rest. */
export const ALERT_YELLOW = 30;
/** Within this they turn red. */
export const ALERT_RED = 10;

/** The detector's colour for the nearest living monster's distance, in metres. */
export function alertLevel(nearest: number | null): AlertLevel {
  if (nearest === null || nearest >= ALERT_YELLOW) return 'green';
  return nearest < ALERT_RED ? 'red' : 'yellow';
}

/** The nearest of the given distances, or null when there are none. */
export function nearestOf(distances: Iterable<number>): number | null {
  let best: number | null = null;
  for (const d of distances) if (best === null || d < best) best = d;
  return best;
}
