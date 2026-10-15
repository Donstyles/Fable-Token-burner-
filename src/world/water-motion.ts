/**
 * Babylon's water shader keeps its own clock: its `time` uniform advances by 1 every
 * 100 s of wall clock (`_lastTime / 100000` in `WaterMaterial`), so `windForce` and
 * `waveSpeed` are "per 100 s" quantities. Our water meshes carry world-unit UVs, one
 * ripple tile per `waveLength` metres, which makes the material's stock values crawl at a
 * few millimetres a second. These helpers convert metres and seconds to the shader's units.
 *
 * Shader formulas (water.vertex.fx):
 *   vNormalUV = uv / waveLength + time * windForce * windDirection
 *   y += |sin(x * waveCount / 2 + time * waveSpeed) + cos(z * waveCount / 2 + time * waveSpeed)| * waveHeight * 5
 */
import { Vector2 } from '@babylonjs/core/Maths/math.vector';

/** Wall-clock seconds per unit of the shader's `time` uniform. */
export const SHADER_TIME_UNIT_SECONDS = 100;

/** Ripples on still water drift diagonally, so both wave terms contribute. */
export const STILL_DIRECTION: Readonly<Vector2> = new Vector2(Math.SQRT1_2, Math.SQRT1_2);

export interface WaterMotionLook {
  /** Ripple tile size in metres. */
  waveLength: number;
  /** Ripple drift across still water, metres per second. */
  rippleSpeed: number;
  /** Surface drift of flowing bodies along their flow, metres per second. */
  flowSpeed: number;
  /** Seconds per swell of the vertex waves. */
  wavePeriod: number;
}

export interface WaterShaderMotion {
  windDirection: Vector2;
  windForce: number;
  waveSpeed: number;
}

/** Shader `time` for a number of simulated seconds. */
export function shaderTime(seconds: number): number {
  return seconds / SHADER_TIME_UNIT_SECONDS;
}

/**
 * Wind and wave parameters for one body. `flow` is the body's unit flow direction on the
 * ground plane, or zero for still water.
 */
export function waterShaderMotion(look: WaterMotionLook, flow: Vector2): WaterShaderMotion {
  const still = flow.lengthSquared() < 1e-6;
  const windDirection = still ? STILL_DIRECTION.clone() : flow.normalizeToNew();
  const metresPerSecond = still ? look.rippleSpeed : look.flowSpeed;
  // The UV drifts by windForce tiles per time unit along a unit direction; a tile is
  // waveLength metres.
  const windForce = (metresPerSecond / look.waveLength) * SHADER_TIME_UNIT_SECONDS;
  // Wave phase advances by waveSpeed radians per time unit.
  const waveSpeed = ((2 * Math.PI) / look.wavePeriod) * SHADER_TIME_UNIT_SECONDS;
  return { windDirection, windForce, waveSpeed };
}
