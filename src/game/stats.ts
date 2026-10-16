/**
 * The seven MM6 statistics and the bonus each score gives (DESIGN.md 14.1). The table is the
 * one the community documents for MM6 to MM8; where the manual is found to differ, this table
 * changes and DESIGN.md records it.
 */
export const STATS = [
  'might',
  'intellect',
  'personality',
  'endurance',
  'accuracy',
  'speed',
  'luck',
] as const;

export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;

/** Score thresholds, ascending: a score at or above the threshold earns the bonus. */
const BONUS_TABLE: readonly [number, number][] = [
  [0, -6],
  [3, -5],
  [4, -4],
  [5, -3],
  [7, -2],
  [9, -1],
  [11, 0],
  [13, 1],
  [15, 2],
  [17, 3],
  [19, 4],
  [21, 5],
  [25, 6],
  [30, 7],
  [35, 8],
  [40, 9],
  [50, 10],
  [75, 11],
  [100, 12],
  [125, 13],
  [150, 14],
  [175, 15],
  [200, 16],
  [225, 17],
  [250, 18],
  [275, 19],
  [300, 20],
  [350, 21],
  [400, 22],
  [500, 23],
];

export function statBonus(score: number): number {
  let bonus = BONUS_TABLE[0]![1];
  for (const [threshold, b] of BONUS_TABLE) {
    if (score >= threshold) bonus = b;
    else break;
  }
  return bonus;
}

export function stats(partial: Partial<Stats> = {}): Stats {
  const s = {} as Stats;
  for (const k of STATS) s[k] = partial[k] ?? 12;
  return s;
}
