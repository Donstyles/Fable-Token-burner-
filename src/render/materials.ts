import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { Observer } from '@babylonjs/core/Misc/observable';
import { DEFAULT_ENVIRONMENT, type LightingEnvironment } from './environment';

/**
 * Texture sampling for the look: nearest-neighbour magnification so texels stay square
 * up close, with mipmaps (nearest within a level, linear between levels) to keep distance
 * calm. Reference: `artwork/reference/look/`.
 */
export function applyRetroSampling(texture: Texture, mipmaps: boolean): void {
  texture.updateSamplingMode(
    mipmaps ? Constants.TEXTURE_NEAREST_NEAREST_MIPLINEAR : Constants.TEXTURE_NEAREST_NEAREST,
  );
  texture.anisotropicFilteringLevel = 1;
}

/** A warm lantern, window or fire: evaluated per pixel, up to four nearest per object. */
export interface PointLightDesc {
  position: Vector3;
  color: Color3;
  /** Distance at which the light reaches zero. */
  range: number;
  intensity: number;
}

export const MAX_POINT_LIGHTS = 4;

const SHADER = 'ftbVertexLit';

ShaderStore.ShadersStore[`${SHADER}VertexShader`] = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
#if defined(VERTEXCOLOR) || defined(BAKED)
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
uniform float bakedMix;
uniform vec4 clipPlane;
varying vec2 vUV;
varying float vClip;
varying vec3 vLight;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFog;
void main(void) {
  vec4 wp = world * vec4(position, 1.0);
  vec3 n = normalize(mat3(world) * normal);
  float ndl = max(dot(n, -lightDirection), 0.0);
  vec3 light = ambientColor + lightColor * ndl;
#ifdef BAKED
  // Baked per-vertex light replaces the environment's key and ambient light.
  light = mix(light, color.rgb, bakedMix);
#elif defined(VERTEXCOLOR)
  light *= color.rgb;
#endif
  vLight = light;
  vUV = uv * uvScale;
  vWorldPos = wp.xyz;
  vNormal = n;
  float d = distance(wp.xyz, cameraPosition) * fogDensity;
  vFog = clamp(exp(-d * d), 0.0, 1.0);
  // Scene clip plane (water reflection and refraction passes); zero plane = no clipping.
  vClip = dot(wp, clipPlane);
  gl_Position = viewProjection * wp;
}
`;

ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying vec3 vLight;
varying vec3 vWorldPos;
varying float vClip;
uniform float clipEnabled;
varying vec3 vNormal;
varying float vFog;
uniform sampler2D diffuseSampler;
uniform vec3 fogColor;
uniform vec3 tint;
uniform vec3 emissive;
uniform vec3 pointPos[${MAX_POINT_LIGHTS}];
uniform vec3 pointColor[${MAX_POINT_LIGHTS}];
uniform float pointRange[${MAX_POINT_LIGHTS}];
void main(void) {
  if (clipEnabled > 0.5 && vClip > 0.0) discard;
  vec3 n = normalize(vNormal);
  vec3 pl = vec3(0.0);
  for (int i = 0; i < ${MAX_POINT_LIGHTS}; i++) {
    float r = pointRange[i];
    if (r <= 0.0) continue;
    vec3 L = pointPos[i] - vWorldPos;
    float d = length(L);
    float att = clamp(1.0 - d / r, 0.0, 1.0);
    att *= att;
    float ndl = max(dot(n, L / max(d, 0.001)), 0.0);
    pl += pointColor[i] * att * ndl;
  }
  vec3 c = texture2D(diffuseSampler, vUV).rgb * tint * (vLight + pl) + emissive;
  gl_FragColor = vec4(mix(fogColor, c, vFog), 1.0);
}
`;

export interface VertexLitOptions {
  name: string;
  texture: BaseTexture;
  /** Multiply the environment light by the vertex colour. */
  vertexColors?: boolean;
  /** Vertex colour is baked light (compiled levels); see setBakedMix. */
  baked?: boolean;
  uvScale?: [number, number];
  tint?: Color3;
  emissive?: Color3;
}

/**
 * The world material: per-vertex key and ambient light, per-pixel warm point lights,
 * emissive glow, and distance fog, over a nearest-sampled texture. Materials are created
 * through the manager so shared lighting stays in sync, and the manager owns the point
 * lights and assigns the nearest four to each material's mesh every frame.
 */
export class RetroMaterials {
  private readonly materials = new Set<ShaderMaterial>();
  private readonly observer: Observer<Scene>;
  readonly lights: PointLightDesc[] = [];
  env: LightingEnvironment;
  private bakedMix = 1;

  constructor(
    private readonly scene: Scene,
    env: LightingEnvironment = DEFAULT_ENVIRONMENT,
  ) {
    this.env = { ...env };
    this.observer = scene.onBeforeRenderObservable.add(() => this.update());
  }

  create(opts: VertexLitOptions): ShaderMaterial {
    const useColor = opts.vertexColors || opts.baked;
    const defines = opts.baked
      ? ['#define BAKED']
      : opts.vertexColors
        ? ['#define VERTEXCOLOR']
        : [];
    const attributes = ['position', 'normal', 'uv', ...(useColor ? ['color'] : [])];
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
        'bakedMix',
        'clipPlane',
        'clipEnabled',
        'tint',
        'emissive',
        'pointPos',
        'pointColor',
        'pointRange',
      ],
      samplers: ['diffuseSampler'],
      defines,
    });
    mat.setTexture('diffuseSampler', opts.texture);
    mat.setVector2('uvScale', new Vector2(...(opts.uvScale ?? [1, 1])));
    mat.setFloat('bakedMix', this.bakedMix);
    mat.setVector4('clipPlane', Vector4.Zero());
    mat.setFloat('clipEnabled', 0);
    // Water render passes set scene.clipPlane around their draws; read it per bind so the
    // reflection pass clips what lies below the surface and the refraction pass what lies above.
    mat.onBindObservable.add(() => {
      const effect = mat.getEffect();
      const plane = this.scene.clipPlane;
      if (!effect) return;
      if (plane) {
        effect.setFloat4('clipPlane', plane.normal.x, plane.normal.y, plane.normal.z, plane.d);
        effect.setFloat('clipEnabled', 1);
      } else {
        effect.setFloat('clipEnabled', 0);
      }
    });
    mat.setColor3('tint', opts.tint ?? Color3.White());
    mat.setColor3('emissive', opts.emissive ?? Color3.Black());
    mat.setArray3('pointPos', new Array<number>(MAX_POINT_LIGHTS * 3).fill(0));
    mat.setArray3('pointColor', new Array<number>(MAX_POINT_LIGHTS * 3).fill(0));
    mat.setFloats('pointRange', new Array<number>(MAX_POINT_LIGHTS).fill(0));
    mat.backFaceCulling = true;
    this.materials.add(mat);
    this.pushEnv(mat);
    return mat;
  }

  /** Register a point light; mutate the returned object to move or dim it. */
  addLight(light: PointLightDesc): PointLightDesc {
    this.lights.push(light);
    return light;
  }

  removeLight(light: PointLightDesc): void {
    const i = this.lights.indexOf(light);
    if (i >= 0) this.lights.splice(i, 1);
  }

  /** Blend between environment light (0) and baked vertex light (1) on baked materials. */
  setBakedMix(v: number): void {
    this.bakedMix = v;
    for (const m of this.materials) m.setFloat('bakedMix', v);
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
    const pos = new Array<number>(MAX_POINT_LIGHTS * 3).fill(0);
    const col = new Array<number>(MAX_POINT_LIGHTS * 3).fill(0);
    const rng = new Array<number>(MAX_POINT_LIGHTS).fill(0);
    for (const m of this.materials) {
      m.setVector3('cameraPosition', p);
      if (this.lights.length === 0) continue;
      // Nearest lights to the material's first mesh. Materials are per object here; a
      // material shared across distant objects would need per-mesh binding instead.
      const mesh = m.getBindedMeshes()[0];
      const centre = mesh ? mesh.getBoundingInfo().boundingSphere.centerWorld : p;
      const sorted = this.lights
        .filter((l) => l.intensity > 0 && l.range > 0)
        .map((l) => ({ l, d: Vector3.DistanceSquared(l.position, centre) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_POINT_LIGHTS);
      pos.fill(0);
      col.fill(0);
      rng.fill(0);
      sorted.forEach(({ l }, i) => {
        pos[i * 3] = l.position.x;
        pos[i * 3 + 1] = l.position.y;
        pos[i * 3 + 2] = l.position.z;
        col[i * 3] = l.color.r * l.intensity;
        col[i * 3 + 1] = l.color.g * l.intensity;
        col[i * 3 + 2] = l.color.b * l.intensity;
        rng[i] = l.range;
      });
      m.setArray3('pointPos', pos);
      m.setArray3('pointColor', col);
      m.setFloats('pointRange', rng);
    }
  }

  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    for (const m of this.materials) m.dispose();
    this.materials.clear();
  }
}
