import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { Observer } from '@babylonjs/core/Misc/observable';

/**
 * Texture sampling for the MM6 look: nearest-neighbour magnification so texels stay
 * square, optionally with mipmaps (nearest within a level, linear between levels) to tame
 * distant shimmer.
 */
export function applyRetroSampling(texture: Texture, mipmaps: boolean): void {
  texture.updateSamplingMode(
    mipmaps ? Constants.TEXTURE_NEAREST_NEAREST_MIPLINEAR : Constants.TEXTURE_NEAREST_NEAREST,
  );
  texture.anisotropicFilteringLevel = 1;
}

/** Scene-wide lighting and fog, applied to every vertex-lit material each frame. */
export interface LightingEnvironment {
  /** Direction the light travels (normalised). */
  lightDirection: Vector3;
  lightColor: Color3;
  ambientColor: Color3;
  fogColor: Color3;
  /** Exponential-squared fog density, 0 disables. */
  fogDensity: number;
}

export const DEFAULT_ENVIRONMENT: LightingEnvironment = {
  lightDirection: new Vector3(-0.4, -1, 0.3).normalize(),
  lightColor: new Color3(0.95, 0.88, 0.75),
  ambientColor: new Color3(0.32, 0.32, 0.38),
  fogColor: new Color3(0.043, 0.039, 0.031),
  fogDensity: 0.025,
};

const SHADER = 'ftbVertexLit';

ShaderStore.ShadersStore[`${SHADER}VertexShader`] = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
uniform mat4 world;
uniform mat4 viewProjection;
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform float fogDensity;
uniform vec2 uvScale;
varying vec2 vUV;
varying vec3 vLight;
varying float vFog;
void main(void) {
  vec4 wp = world * vec4(position, 1.0);
  vec3 n = normalize(mat3(world) * normal);
  float ndl = max(dot(n, -lightDirection), 0.0);
  vec3 light = ambientColor + lightColor * ndl;
#ifdef VERTEXCOLOR
  light *= color.rgb;
#endif
  vLight = light;
  vUV = uv * uvScale;
  float d = distance(wp.xyz, cameraPosition) * fogDensity;
  vFog = clamp(exp(-d * d), 0.0, 1.0);
  gl_Position = viewProjection * wp;
}
`;

ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying vec3 vLight;
varying float vFog;
uniform sampler2D diffuseSampler;
uniform vec3 fogColor;
uniform vec3 tint;
void main(void) {
  vec3 c = texture2D(diffuseSampler, vUV).rgb * tint * vLight;
  gl_FragColor = vec4(mix(fogColor, c, vFog), 1.0);
}
`;

export interface VertexLitOptions {
  name: string;
  texture: BaseTexture;
  vertexColors?: boolean;
  uvScale?: [number, number];
  tint?: Color3;
}

/**
 * Per-vertex (Gouraud) lit, fogged, textured material: the classic late-90s shading model.
 * Materials are created through the manager so shared lighting stays in sync.
 */
export class RetroMaterials {
  private readonly materials = new Set<ShaderMaterial>();
  private readonly observer: Observer<Scene>;
  env: LightingEnvironment;

  constructor(
    private readonly scene: Scene,
    env: LightingEnvironment = DEFAULT_ENVIRONMENT,
  ) {
    this.env = { ...env };
    this.observer = scene.onBeforeRenderObservable.add(() => this.update());
  }

  create(opts: VertexLitOptions): ShaderMaterial {
    const defines = opts.vertexColors ? ['#define VERTEXCOLOR'] : [];
    const attributes = ['position', 'normal', 'uv', ...(opts.vertexColors ? ['color'] : [])];
    const mat = new ShaderMaterial(opts.name, this.scene, SHADER, {
      attributes,
      uniforms: [
        'world',
        'viewProjection',
        'cameraPosition',
        'lightDirection',
        'lightColor',
        'ambientColor',
        'fogDensity',
        'fogColor',
        'uvScale',
        'tint',
      ],
      samplers: ['diffuseSampler'],
      defines,
    });
    mat.setTexture('diffuseSampler', opts.texture);
    mat.setVector2('uvScale', new Vector2(...(opts.uvScale ?? [1, 1])));
    mat.setColor3('tint', opts.tint ?? Color3.White());
    mat.backFaceCulling = true;
    this.materials.add(mat);
    this.pushEnv(mat);
    return mat;
  }

  setEnvironment(next: Partial<LightingEnvironment>): void {
    this.env = { ...this.env, ...next };
    for (const m of this.materials) this.pushEnv(m);
  }

  private pushEnv(mat: ShaderMaterial): void {
    mat.setVector3('lightDirection', this.env.lightDirection);
    mat.setColor3('lightColor', this.env.lightColor);
    mat.setColor3('ambientColor', this.env.ambientColor);
    mat.setColor3('fogColor', this.env.fogColor);
    mat.setFloat('fogDensity', this.env.fogDensity);
  }

  private update(): void {
    const cam = this.scene.activeCamera;
    if (!cam) return;
    const p = cam.globalPosition;
    for (const m of this.materials) m.setVector3('cameraPosition', p);
  }

  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    for (const m of this.materials) m.dispose();
    this.materials.clear();
  }
}
