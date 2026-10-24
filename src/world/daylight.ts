/**
 * Day and night (DESIGN.md 16.3): the sun crosses the sky with the game clock, rising in
 * the east, standing high at noon, setting in the west; light, ambient, fog and sky blend
 * from the region's day through a warm dusk to a blue night with stars, and the village's
 * lanterns come up as the light goes. Everything derives from the minute of the day.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DAWN_HOUR, DUSK_HOUR, MINUTES_PER_HOUR } from '../game/time';
import type { LightingEnvironment } from '../render/environment';

/** Game minutes that pass per real second while the party walks: a day in 24 minutes. */
export const MINUTES_PER_REAL_SECOND = 1;

const c = (r: number, g: number, b: number): Color3 => new Color3(r, g, b);

const NIGHT = {
  lightColor: c(0.06, 0.08, 0.16),
  ambientColor: c(0.1, 0.11, 0.2),
  fogColor: c(0.03, 0.04, 0.08),
  skyZenith: c(0.01, 0.015, 0.05),
  skyHorizon: c(0.05, 0.07, 0.14),
  cloudColor: c(0.12, 0.13, 0.2),
};
const DUSK = {
  lightColor: c(1.0, 0.56, 0.3),
  ambientColor: c(0.3, 0.26, 0.34),
  fogColor: c(0.78, 0.52, 0.46),
  skyZenith: c(0.18, 0.14, 0.42),
  skyHorizon: c(0.96, 0.58, 0.4),
  cloudColor: c(0.9, 0.6, 0.5),
};

export interface DaylightState {
  /** 0 at night, 1 in full day. */
  daylight: number;
  /** How much of the night sky shows (stars), 0 to 1. */
  night: number;
  /** Where the sun stands (unit vector toward it), below the horizon at night. */
  sunDirection: Vector3;
}

const lerp3 = (a: Color3, b: Color3, t: number): Color3 => Color3.Lerp(a, b, t);
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The sun's place and the day's strength for a minute of the day. */
export function daylightAt(minuteOfDay: number): DaylightState {
  const dawn = DAWN_HOUR * MINUTES_PER_HOUR;
  const dusk = DUSK_HOUR * MINUTES_PER_HOUR;
  // 0 at dawn, 1 at dusk; beyond that the sun is under the horizon and keeps going round.
  const t = (minuteOfDay - dawn) / (dusk - dawn);
  const arc = Math.PI * t;
  // Scene space: north +Z, east +X, as a party facing north sees it (the regions are drawn
  // that way, kernel/terrain/region.ts `fromMap`). Rises east, noon south, sets west.
  const elevation = Math.sin(arc) * 1.15;
  const sunDirection = new Vector3(
    Math.cos(arc) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.sin(arc) * Math.cos(elevation),
  ).normalize();
  const up = sunDirection.y;
  const daylight = smooth(-0.12, 0.3, up);
  const night = 1 - smooth(-0.2, 0.02, up);
  return { daylight, night, sunDirection };
}

/** The region's day environment bent to the hour: the whole environment to apply. */
export function environmentAt(day: LightingEnvironment, state: DaylightState): LightingEnvironment {
  const up = state.sunDirection.y;
  // Night under the horizon, warm dusk as the sun touches it, the region's day above.
  const toDusk = smooth(-0.14, 0.02, up);
  const toDay = smooth(0.04, 0.35, up);
  const mix = (night: Color3, dusk: Color3, dayColor: Color3): Color3 =>
    lerp3(lerp3(night, dusk, toDusk), dayColor, toDay);
  // The key light never comes from under the ground: at night it is a faint moon-blue from
  // high up, so slopes keep a little shape.
  const lightDirection =
    up > 0.02
      ? state.sunDirection.scale(-1)
      : Vector3.Lerp(new Vector3(0.3, -1, 0.2).normalize(), state.sunDirection.scale(-1), toDusk);
  return {
    lightDirection: lightDirection.normalize(),
    lightColor: mix(NIGHT.lightColor, DUSK.lightColor, day.lightColor),
    ambientColor: mix(NIGHT.ambientColor, DUSK.ambientColor, day.ambientColor),
    fogColor: mix(NIGHT.fogColor, DUSK.fogColor, day.fogColor),
    fogDensity: day.fogDensity,
    skyZenith: mix(NIGHT.skyZenith, DUSK.skyZenith, day.skyZenith),
    skyHorizon: mix(NIGHT.skyHorizon, DUSK.skyHorizon, day.skyHorizon),
    cloudColor: mix(NIGHT.cloudColor, DUSK.cloudColor, day.cloudColor),
    cloudAmount: day.cloudAmount,
  };
}
