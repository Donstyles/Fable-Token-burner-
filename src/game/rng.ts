/** Seeded randomness so tests and device runs can be replayed. */
export type Rng = () => number;

/** mulberry32: small, fast, good enough for dice. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Dice {
  count: number;
  sides: number;
  bonus?: number;
}

export function rollDie(sides: number, rng: Rng): number {
  return 1 + Math.floor(rng() * sides);
}

export function rollDice(d: Dice, rng: Rng): number {
  let total = d.bonus ?? 0;
  for (let i = 0; i < d.count; i++) total += rollDie(d.sides, rng);
  return total;
}

export function diceText(d: Dice): string {
  const bonus = d.bonus ? (d.bonus > 0 ? `+${d.bonus}` : `${d.bonus}`) : '';
  return `${d.count}d${d.sides}${bonus}`;
}
