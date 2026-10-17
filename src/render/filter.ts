import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';

/**
 * The MM6 look, applied as one full-screen pass after the world is rendered:
 * ordered (Bayer) dithering plus either per-channel posterisation or a snap to the
 * project palette through a 3D look-up table. Resolution is handled elsewhere
 * (render/resolution.ts); this pass runs at the world's render resolution.
 */
export type FilterMode = 'off' | 'posterize' | 'palette';

export interface FilterSettings {
  mode: FilterMode;
  /** Posterize: levels per channel (2–64). */
  levels: number;
  /** Dither strength 0–1. */
  dither: number;
  /** Dither cell size in rendered pixels (1–4). */
  ditherCell: number;
}

/** Off by default since the look re-target (2026-10-14); the MM6 modes stay available. */
export const DEFAULT_FILTER: FilterSettings = {
  // MM6's own 256 colours (tools/palette.ts, from the reference shots), not a posteriser.
  mode: 'palette',
  levels: 12,
  // MM6 drew flat colour; on a phone the dither read as static over everything (owner,
  // 2026-10-17), so it is off by default and stays a dial.
  dither: 0,
  ditherCell: 2,
};

export const FILTER_MODES: readonly FilterMode[] = ['off', 'posterize', 'palette'];

/** Side of the cubic palette LUT; the texture is LUT_SIZE² wide and LUT_SIZE high. */
export const LUT_SIZE = 64;

const SHADER = 'ftbRetro';

ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = /* glsl */ `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D lutSampler;
uniform vec2 screenSize;
uniform float mode;
uniform float levels;
uniform float ditherStrength;
uniform float ditherCell;
uniform float lutSize;

// 2x2 Bayer in [0,1): rows (0, .5) (.75, .25)
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
// 4x4 Bayer in [0,1) with 1/16 steps
float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

void main(void) {
  vec3 c = texture2D(textureSampler, vUV).rgb;
  if (mode < 0.5) {
    gl_FragColor = vec4(c, 1.0);
    return;
  }
  vec2 px = floor(vUV * screenSize / max(ditherCell, 1.0));
  // centred threshold in [-0.5, 0.5)
  float d = (bayer4(px) + 1.0 / 32.0 - 0.5) * ditherStrength;
  if (mode < 1.5) {
    float L = max(levels - 1.0, 1.0);
    c = floor(c * L + d + 0.5) / L;
  } else {
    float n = lutSize - 1.0;
    vec3 q = clamp(c + d * (2.0 / n), 0.0, 1.0);
    vec3 i = floor(q * n + 0.5);
    vec2 uv = vec2((i.b * lutSize + i.r + 0.5) / (lutSize * lutSize), (i.g + 0.5) / lutSize);
    c = texture2D(lutSampler, uv).rgb;
  }
  gl_FragColor = vec4(c, 1.0);
}
`;

export class RetroFilter {
  private readonly post: PostProcess;
  private readonly lut: Texture | null;
  private current: FilterSettings;

  constructor(
    scene: Scene,
    camera: Camera,
    lutUrl: string | null,
    initial: FilterSettings = DEFAULT_FILTER,
  ) {
    this.current = { ...initial };
    this.lut = lutUrl
      ? new Texture(lutUrl, scene, true, false, Constants.TEXTURE_NEAREST_SAMPLINGMODE)
      : null;
    this.post = new PostProcess(
      'retro',
      SHADER,
      ['screenSize', 'mode', 'levels', 'ditherStrength', 'ditherCell', 'lutSize'],
      ['lutSampler'],
      1.0,
      camera,
      Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    );
    this.post.onApplyObservable.add((effect) => {
      const s = this.current;
      const mode = s.mode === 'palette' && !this.lut ? 'posterize' : s.mode;
      effect.setFloat2('screenSize', this.post.width, this.post.height);
      effect.setFloat('mode', mode === 'off' ? 0 : mode === 'posterize' ? 1 : 2);
      effect.setFloat('levels', s.levels);
      effect.setFloat('ditherStrength', s.dither);
      effect.setFloat('ditherCell', s.ditherCell);
      effect.setFloat('lutSize', LUT_SIZE);
      if (this.lut) effect.setTexture('lutSampler', this.lut);
    });
  }

  get settings(): FilterSettings {
    return { ...this.current };
  }

  apply(next: Partial<FilterSettings>): void {
    this.current = { ...this.current, ...next };
  }

  dispose(): void {
    this.post.dispose();
    this.lut?.dispose();
  }
}
