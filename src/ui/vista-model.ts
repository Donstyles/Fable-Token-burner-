/**
 * The rest screen's vista by the hour (DESIGN.md 16.34): what the live sky behind the owner's
 * mountains shows at a minute of the game clock. The sky's colours are the world's own
 * (src/world/daylight.ts: the day, a warm dusk, a blue night) over a day blue of MM6's rest
 * picture; the sun crosses the box from the left (east, the view looks south) to the right
 * (west); the moon rises and sets in its phase, the calendar's (full on the 15th); the stars
 * come out with the night; and the four painted lights of the land, sunrise, day, sunset and
 * night, take turns as the sun goes. Pure: `vista.ts` draws it.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DAYS_PER_MONTH, gameDate, MINUTES_PER_DAY, minuteOfDay } from '../game/time';
import { ENVIRONMENTS, type LightingEnvironment } from '../render/environment';
import { daylightAt, environmentAt } from '../world/daylight';

export type Rgb = [number, number, number];

/** The land's four lights, as the atlas stacks them (tools/lib/vista.ts VISTA_TIMES). */
export const VISTA_TIMES = ['sunrise', 'day', 'sunset', 'night'] as const;
export type VistaTime = (typeof VISTA_TIMES)[number];

/** A body in the sky: across the box (0 east, 1 west) and up it (0 the horizon, 1 the top). */
export interface SkyBody {
  x: number;
  y: number;
  /** Above the horizon. */
  visible: boolean;
}

export interface VistaSky {
  zenith: Rgb;
  horizon: Rgb;
  cloud: Rgb;
  /** The warm glow on the horizon round a low sun: where across, how strong. */
  glow: { x: number; strength: number };
  sun: SkyBody;
  /** The moon: its phase (0 new, 0.5 full) and how brightly it shows, faint by day. */
  moon: SkyBody & { phase: number; brightness: number };
  /** How much of the night's stars show, 0 to 1. */
  stars: number;
  /** Each painted light's share of the land, summing to one. */
  weights: Record<VistaTime, number>;
}

/** MM6's rest picture's day: a deep blue paling to the haze on the far range. */
const VISTA_DAY: LightingEnvironment = {
  ...ENVIRONMENTS['mm6-day'],
  skyZenith: new Color3(0.13, 0.24, 0.58),
  skyHorizon: new Color3(0.56, 0.66, 0.82),
  cloudColor: new Color3(0.92, 0.91, 0.88),
};

const rgb = (c: Color3): Rgb => [c.r * 255, c.g * 255, c.b * 255];
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The sun's highest, radians (daylight.ts: the arc's sine times 1.15). */
const SUN_TOP = 1.15;
/** How far up the box the sun stands at noon and the moon at its height. */
const SUN_HIGH = 0.82;
const MOON_HIGH = 0.72;

/** The moon's phase at a minute of the game: new on the 1st, full on the 15th. */
export function moonPhase(minutes: number): number {
  const d = gameDate(minutes);
  return ((d.day - 1 + minuteOfDay(minutes) / MINUTES_PER_DAY) / DAYS_PER_MONTH) % 1;
}

/** The vista's sky and land at a minute of the game clock. */
export function vistaSky(minutes: number): VistaSky {
  const minute = minuteOfDay(minutes);
  const light = daylightAt(minute);
  const env = environmentAt(VISTA_DAY, light);
  const dir = light.sunDirection;
  const up = dir.y;
  // Across the box: the view looks south, east at the left edge, west at the right.
  const across = 0.5 + Math.atan2(-dir.x, -dir.z) / Math.PI;
  const elevation = Math.asin(Math.max(-1, Math.min(1, up)));
  // The land's lights as the world's sky turns (daylight.ts environmentAt): night under the
  // horizon, sunrise or sunset as the sun touches it, the day above.
  const toDusk = smooth(-0.14, 0.02, up);
  const toDay = smooth(0.04, 0.35, up);
  const low = toDusk * (1 - toDay);
  const morning = minute < MINUTES_PER_DAY / 2 + 60;
  const weights: Record<VistaTime, number> = {
    sunrise: morning ? low : 0,
    day: toDay,
    sunset: morning ? 0 : low,
    night: 1 - toDusk,
  };
  // The moon rises at dusk when full, at noon at its first quarter, and is up for half a day.
  const phase = moonPhase(minutes);
  const rise = 21 * 60 + (phase - 0.5) * MINUTES_PER_DAY;
  const since = (((minute - rise) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const arc = (Math.PI * since) / (MINUTES_PER_DAY / 2);
  const lit = 1 - Math.abs(phase - 0.5) * 2;
  return {
    zenith: rgb(env.skyZenith),
    horizon: rgb(env.skyHorizon),
    cloud: rgb(env.cloudColor),
    glow: { x: Math.max(0.04, Math.min(0.96, across)), strength: low },
    sun: { x: across, y: (elevation / SUN_TOP) * SUN_HIGH, visible: up > -0.06 },
    moon: {
      x: arc / Math.PI,
      y: Math.sin(Math.min(arc, Math.PI)) * MOON_HIGH,
      visible: arc < Math.PI && lit > 0.08,
      phase,
      brightness: 0.3 + 0.7 * (1 - toDusk),
    },
    stars: light.night,
    weights,
  };
}
