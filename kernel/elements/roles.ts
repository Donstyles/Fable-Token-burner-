/** Material roles: every face carries one of these ids; the level assigns textures per role. */
export const ROLE = {
  ashlar: 1,
  flagstone: 2,
  plank: 3,
  iron: 4,
  plaster: 5,
  rock: 6,
  marble: 7,
  trim: 8,
  glass: 9,
  /** Invisible collision geometry (ramps under stairs). Never rendered. */
  collider: 100,
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(ROLE).map(([k, v]) => [v, k]),
);
