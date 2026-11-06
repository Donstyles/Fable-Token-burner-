/**
 * The frame cap's gate (DESIGN.md 17.28): asked on every tick of the display with the tick's
 * time, it says whether this tick is a frame. With a period of 33 ms a 60 Hz display draws
 * every other tick and a 120 Hz one every fourth; a period of 0 makes every tick a frame.
 * `period` is read each time, so a change takes hold at the next tick.
 */
export function frameGate(period: () => number): (now: number) => boolean {
  let last = -Infinity;
  return (now) => {
    // A hair under the period, so a tick a fraction early is not held to the next one.
    if (now - last < period() - 3) return false;
    last = now;
    return true;
  };
}
