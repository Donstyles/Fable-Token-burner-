import { Vector2 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import { SHADER_TIME_UNIT_SECONDS, shaderTime, waterShaderMotion } from './water-motion';

const look = { waveLength: 2, rippleSpeed: 0.12, flowSpeed: 0.8 };

/** Replays the shader: how far, in metres, the ripple lookup moves in one second. */
function driftPerSecond(m: ReturnType<typeof waterShaderMotion>, waveLength: number): number {
  const tilesPerTimeUnit = m.windDirection.length() * m.windForce;
  return (tilesPerTimeUnit / SHADER_TIME_UNIT_SECONDS) * waveLength;
}

describe('waterShaderMotion', () => {
  it('drifts still water ripples at the requested speed on a diagonal', () => {
    const m = waterShaderMotion(look, Vector2.Zero());
    expect(driftPerSecond(m, look.waveLength)).toBeCloseTo(0.12, 6);
    expect(m.windDirection.x).toBeCloseTo(m.windDirection.y, 6);
  });

  it('drifts flowing water along its flow at the flow speed', () => {
    const m = waterShaderMotion(look, new Vector2(-1, 0));
    expect(driftPerSecond(m, look.waveLength)).toBeCloseTo(0.8, 6);
    expect(m.windDirection.x).toBe(-1);
    expect(m.windDirection.y).toBe(0);
  });

  it('matches the shader clock, which counts hundreds of seconds', () => {
    expect(shaderTime(100)).toBe(1);
    expect(shaderTime(0.5)).toBeCloseTo(0.005, 9);
  });
});
