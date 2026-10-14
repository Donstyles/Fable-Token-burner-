import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

/** Scene-wide lighting, fog and sky, applied to every world material and the sky dome. */
export interface LightingEnvironment {
  /** Direction the key light travels (normalised). */
  lightDirection: Vector3;
  lightColor: Color3;
  ambientColor: Color3;
  fogColor: Color3;
  /** Exponential-squared fog density, 0 disables. */
  fogDensity: number;
  skyZenith: Color3;
  skyHorizon: Color3;
  cloudColor: Color3;
  /** 0 clear, 1 overcast. */
  cloudAmount: number;
}

export type EnvironmentPreset = 'dusk-violet' | 'overcast-grey' | 'mm6-day';

export const ENVIRONMENT_PRESETS: readonly EnvironmentPreset[] = [
  'dusk-violet',
  'overcast-grey',
  'mm6-day',
];

const c = (r: number, g: number, b: number): Color3 => new Color3(r, g, b);

/** Presets matched to the look references: image 1 (dusk), images 2 and 5 (overcast). */
export const ENVIRONMENTS: Record<EnvironmentPreset, LightingEnvironment> = {
  'dusk-violet': {
    lightDirection: new Vector3(-0.3, -0.55, 0.78).normalize(),
    lightColor: c(0.34, 0.29, 0.34),
    ambientColor: c(0.17, 0.16, 0.24),
    fogColor: c(0.3, 0.26, 0.36),
    fogDensity: 0.016,
    skyZenith: c(0.12, 0.11, 0.2),
    skyHorizon: c(0.34, 0.29, 0.4),
    cloudColor: c(0.4, 0.35, 0.45),
    cloudAmount: 0.55,
  },
  'overcast-grey': {
    lightDirection: new Vector3(-0.2, -0.7, 0.68).normalize(),
    lightColor: c(0.48, 0.49, 0.52),
    ambientColor: c(0.36, 0.37, 0.42),
    fogColor: c(0.6, 0.62, 0.66),
    fogDensity: 0.03,
    skyZenith: c(0.33, 0.36, 0.42),
    skyHorizon: c(0.6, 0.62, 0.66),
    cloudColor: c(0.52, 0.54, 0.58),
    cloudAmount: 0.75,
  },
  'mm6-day': {
    lightDirection: new Vector3(-0.4, -1, 0.3).normalize(),
    lightColor: c(0.95, 0.88, 0.75),
    ambientColor: c(0.35, 0.35, 0.4),
    fogColor: c(0.6, 0.7, 0.85),
    fogDensity: 0.012,
    skyZenith: c(0.15, 0.3, 0.7),
    skyHorizon: c(0.6, 0.7, 0.85),
    cloudColor: c(0.95, 0.95, 0.97),
    cloudAmount: 0.4,
  },
};

export const DEFAULT_ENVIRONMENT: LightingEnvironment = ENVIRONMENTS['dusk-violet'];
