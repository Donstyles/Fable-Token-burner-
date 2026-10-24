import { describe, expect, it } from 'vitest';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { daylightAt, environmentAt } from './daylight';
import type { LightingEnvironment } from '../render/environment';

const DAY: LightingEnvironment = {
  lightDirection: new Vector3(-0.45, -0.8, 0.4).normalize(),
  lightColor: new Color3(1, 0.92, 0.78),
  ambientColor: new Color3(0.46, 0.48, 0.54),
  fogColor: new Color3(0.6, 0.7, 0.85),
  fogDensity: 0.0009,
  skyZenith: new Color3(0.15, 0.3, 0.7),
  skyHorizon: new Color3(0.6, 0.7, 0.85),
  cloudColor: new Color3(1, 1, 1),
  cloudAmount: 0.4,
};

describe('daylight', () => {
  it('puts the sun low in the east at dawn, high at noon, low in the west at dusk', () => {
    const dawn = daylightAt(5 * 60 + 40);
    const noon = daylightAt(13 * 60);
    const dusk = daylightAt(20 * 60 + 20);
    expect(dawn.sunDirection.x).toBeGreaterThan(0.8);
    expect(dawn.sunDirection.y).toBeGreaterThan(0);
    expect(dawn.sunDirection.y).toBeLessThan(0.3);
    expect(noon.sunDirection.y).toBeGreaterThan(0.85);
    expect(dusk.sunDirection.x).toBeLessThan(-0.8);
    expect(noon.daylight).toBe(1);
    expect(noon.night).toBe(0);
  });
  it('is night at two in the morning, with the key light still from above', () => {
    const night = daylightAt(2 * 60);
    expect(night.sunDirection.y).toBeLessThan(-0.5);
    expect(night.daylight).toBe(0);
    expect(night.night).toBe(1);
    const env = environmentAt(DAY, night);
    expect(env.lightDirection.y).toBeLessThan(0);
    expect(env.lightColor.r).toBeLessThan(0.1);
    expect(env.skyZenith.b).toBeLessThan(0.1);
  });
  it("keeps the region's day at noon and warms the light at dusk", () => {
    const noon = environmentAt(DAY, daylightAt(13 * 60));
    expect(noon.lightColor.r).toBeCloseTo(DAY.lightColor.r, 2);
    expect(noon.skyZenith.b).toBeCloseTo(DAY.skyZenith.b, 2);
    const dusk = environmentAt(DAY, daylightAt(20 * 60 + 45));
    expect(dusk.lightColor.r).toBeGreaterThan(dusk.lightColor.b * 1.5);
  });
});
