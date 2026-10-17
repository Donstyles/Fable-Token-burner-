import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
// Side-effect imports: register the skinning and instancing includes used by the vertex shader.
import '@babylonjs/core/Shaders/ShadersInclude/bonesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/bonesVertex';
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';
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
  /** Always among a material's bound lights, ahead of the nearest ones (the torch). */
  priority?: boolean;
}

export const MAX_POINT_LIGHTS = 4;

/** Outdoor weather fed to every material (DESIGN.md 15.7). */
export interface Weather {
  /** 1 in the desert: far geometry wavers, far sand mirrors the sky and glints. */
  heat: number;
  /** How dark the drifting cloud shadows get, 0 (none) to 1. */
  cloudShadow: number;
}

const SHADER = 'ftbVertexLit';

ShaderStore.ShadersStore[`${SHADER}VertexShader`] = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
// Babylon defines VERTEXCOLOR itself whenever the mesh carries colours.
#if defined(VERTEXCOLOR) || defined(BAKED) || defined(TERRAIN)
attribute vec4 color;
#endif
// Skinned characters: Babylon adds the bone attributes, defines and uniforms when the mesh
// has a skeleton; for everything else NUM_BONE_INFLUENCERS is 0 and these are empty.
#include<bonesDeclaration>
// world: a uniform, or four per-instance attributes for thin instances (forests).
#include<instancesDeclaration>
uniform mat4 viewProjection;
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform float fogDensity;
uniform vec2 uvScale;
uniform float bakedMix;
uniform vec4 clipPlane;
// Weather (DESIGN.md 15.7): seconds, canopy sway on this material, hot air over the view.
uniform float time;
uniform float wind;
uniform float heat;
varying vec2 vUV;
varying float vClip;
varying vec3 vLight;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFog;
#ifdef TERRAIN
varying vec3 vSplat;
#else
attribute vec2 uv;
#endif
void main(void) {
#include<instancesVertex>
#include<bonesVertex>
  vec4 wp = finalWorld * vec4(position, 1.0);
  if (wind > 0.0) {
    // Canopies sway: nothing at the foot, up to a dozen centimetres at the crown, each tree
    // on its own phase from its place in the world.
    float crown = clamp((position.y - 1.0) * 0.15, 0.0, 1.0) * wind;
    wp.xz += crown * vec2(
      0.12 * sin(time * 1.7 + wp.x * 0.08 + wp.z * 0.05) + 0.04 * sin(time * 3.3 + wp.z * 0.3),
      0.05 * sin(time * 1.3 + wp.x * 0.07 + wp.z * 0.09));
  }
  vec3 n = normalize(mat3(finalWorld) * normal);
  float ndl = max(dot(n, -lightDirection), 0.0);
  vec3 light = ambientColor + lightColor * ndl;
#ifdef BAKED
  // Baked per-vertex light replaces the environment's key and ambient light.
  light = mix(light, color.rgb, bakedMix);
#elif defined(TERRAIN)
  // Terrain colours are texture weights, not light.
#elif defined(VERTEXCOLOR)
  light *= color.rgb;
#endif
  vLight = light;
#ifdef TERRAIN
  vSplat = color.rgb;
  // Terrain textures tile in world metres; X is mirrored in scene space, hence -x.
  vUV = vec2(-wp.x, wp.z) * uvScale;
#else
  vUV = uv * uvScale;
#endif
  vWorldPos = wp.xyz;
  vNormal = n;
  float d = distance(wp.xyz, cameraPosition) * fogDensity;
  vFog = clamp(exp(-d * d), 0.0, 1.0);
  // Scene clip plane (water reflection and refraction passes); zero plane = no clipping.
  vClip = dot(wp, clipPlane);
  gl_Position = viewProjection * wp;
  if (heat > 0.0) {
    // Rising hot air: what is far wavers by a pixel or two; what is near stands still.
    float far = smoothstep(40.0, 250.0, distance(wp.xyz, cameraPosition));
    gl_Position.xy += heat * far * 0.0035 * gl_Position.w * vec2(
      sin(time * 6.0 + wp.z * 0.21 + wp.x * 0.17),
      0.6 * sin(time * 7.3 + wp.x * 0.23));
  }
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
#ifdef TERRAIN
uniform sampler2D pathSampler;
uniform sampler2D screeSampler;
uniform sampler2D snowSampler;
uniform vec4 splatScale;
varying vec3 vSplat;
#endif
uniform vec3 fogColor;
uniform vec3 tint;
uniform vec3 emissive;
uniform vec3 pointPos[${MAX_POINT_LIGHTS}];
uniform vec3 pointColor[${MAX_POINT_LIGHTS}];
uniform float pointRange[${MAX_POINT_LIGHTS}];
uniform float lightKnee;
uniform float priorityLights;
// Hit flash: 1 paints the surface white (DESIGN.md 14.4).
uniform float flash;
// Weather (DESIGN.md 15.7): drifting cloud shadows and the desert's mirage and glint.
uniform float time;
uniform float cloudShadow;
uniform float heat;
uniform vec3 cameraPosition;
uniform vec3 lightDirection;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
             mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(void) {
  if (clipEnabled > 0.5 && vClip > 0.0) discard;
  vec3 n = normalize(vNormal);
#ifdef TWOSIDED
  // Single sheets (a cloak, an apron) are lit on whichever side faces the camera.
  if (!gl_FrontFacing) n = -n;
#endif
  vec3 pl = vec3(0.0);
  // Priority lights (the party's torch) are added after the knee, so the torch always
  // shows, even on a wall a lantern already lights.
  vec3 carried = vec3(0.0);
  for (int i = 0; i < ${MAX_POINT_LIGHTS}; i++) {
    float r = pointRange[i];
    if (r <= 0.0) continue;
    vec3 L = pointPos[i] - vWorldPos;
    float d = length(L);
    float att = clamp(1.0 - d / r, 0.0, 1.0);
    att *= att;
    float ndl = max(dot(n, L / max(d, 0.001)), 0.0);
    vec3 contribution = pointColor[i] * att * ndl;
    if (float(i) < priorityLights) carried += contribution;
    else pl += contribution;
  }
  vec3 light = vLight + pl;
  if (cloudShadow > 0.0) {
    // Cloud shadows: patches of shade drift over slopes, trees and houses alike.
    vec2 cp = vWorldPos.xz * 0.0035 + time * vec2(0.012, 0.005);
    float cs = 0.65 * noise2(cp) + 0.35 * noise2(cp * 2.1 + 7.0);
    light *= 1.0 - cloudShadow * 0.4 * smoothstep(0.5, 0.68, cs);
  }
  // Soft knee: light above lightKnee compresses towards lightKnee + 0.5, so a lamp in a
  // corner brightens the wall without blowing it out to white (owner, 2026-10-15).
  float peak = max(light.r, max(light.g, light.b));
  if (peak > lightKnee) {
    float over = peak - lightKnee;
    light *= (lightKnee + over / (1.0 + 2.0 * over)) / peak;
  }
  light = min(light + carried, vec3(1.6));
#ifdef TERRAIN
  // Grass under path, scree and snow weights carried per vertex (DESIGN.md 15). Scree, the
  // texture of steep faces, is projected along the face's own horizontal axis where the
  // ground tips past 35°, so cliffs do not smear the flat projection into streaks.
  vec3 w = clamp(vSplat, 0.0, 1.0);
  float g = max(0.0, 1.0 - w.r - w.g - w.b);
  float steep = smoothstep(0.18, 0.45, 1.0 - abs(n.y));
  vec2 wall = abs(n.x) > abs(n.z) ? vec2(vWorldPos.z, vWorldPos.y) : vec2(-vWorldPos.x, vWorldPos.y);
  vec2 screeUV = mix(vUV, wall, steep) * splatScale.z;
  vec3 albedo = texture2D(diffuseSampler, vUV * splatScale.x).rgb * g +
    texture2D(pathSampler, vUV * splatScale.y).rgb * w.r +
    texture2D(screeSampler, screeUV).rgb * w.g +
    texture2D(snowSampler, vUV * splatScale.w).rgb * w.b;
  if (heat > 0.0) {
    // Mirage: seen at a grazing angle the far sand mirrors the sky; the sun glints off it.
    vec3 v = normalize(cameraPosition - vWorldPos);
    float graze = 1.0 - smoothstep(0.0, 0.06, abs(v.y));
    float far = smoothstep(60.0, 300.0, distance(cameraPosition, vWorldPos));
    albedo = mix(albedo, fogColor * 1.15, heat * graze * far * 0.6);
    float glint = pow(max(dot(reflect(-v, n), -lightDirection), 0.0), 8.0);
    albedo += heat * 0.25 * glint;
  }
#else
  vec3 albedo = texture2D(diffuseSampler, vUV).rgb;
#endif
  vec3 c = mix(albedo * tint * light + emissive, vec3(1.0), flash);
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
  /** Draw both faces, lit by the side that faces the camera (glTF doubleSided). */
  doubleSided?: boolean;
  /** Canopy sway: vertices above a metre move with the wind (forest leaves). */
  wind?: boolean;
  /**
   * Ambient light for this material instead of the environment's: characters carry a fill so
   * they never go black between lamps, like MM6's minimum sprite brightness.
   */
  ambient?: Color3;
  /**
   * Terrain: three more textures blended over `texture` (grass) by the vertex colour's
   * weights, each with its own metres per tile; UVs are world metres.
   */
  splat?: {
    path: BaseTexture;
    scree: BaseTexture;
    snow: BaseTexture;
    metresPerTile: [number, number, number, number];
  };
}

/**
 * The world material: per-vertex key and ambient light, per-pixel warm point lights,
 * emissive glow, and distance fog, over a nearest-sampled texture. Materials are created
 * through the manager so shared lighting stays in sync, and the manager owns the point
 * lights and assigns the nearest four to each material's mesh every frame.
 */
export class RetroMaterials {
  private readonly materials = new Set<ShaderMaterial>();
  private readonly ambientOverride = new Map<ShaderMaterial, Color3>();
  private readonly observer: Observer<Scene>;
  readonly lights: PointLightDesc[] = [];
  env: LightingEnvironment;
  private bakedMix = 1;
  private time = 0;
  /** Weather (DESIGN.md 15.7): 0 is still air and an even sky. */
  readonly weather: Weather = { heat: 0, cloudShadow: 0 };

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
    if (opts.doubleSided) defines.push('#define TWOSIDED');
    if (opts.splat) defines.push('#define TERRAIN');
    const attributes = [
      'position',
      'normal',
      ...(opts.splat ? [] : ['uv']),
      ...(useColor || opts.splat ? ['color'] : []),
    ];
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
        'lightKnee',
        'priorityLights',
        'pointRange',
        'splatScale',
        'flash',
        'time',
        'wind',
        'heat',
        'cloudShadow',
      ],
      samplers: ['diffuseSampler', 'pathSampler', 'screeSampler', 'snowSampler'],
      defines,
    });
    mat.setTexture('diffuseSampler', opts.texture);
    if (opts.splat) {
      mat.setTexture('pathSampler', opts.splat.path);
      mat.setTexture('screeSampler', opts.splat.scree);
      mat.setTexture('snowSampler', opts.splat.snow);
      const m = opts.splat.metresPerTile;
      mat.setVector4('splatScale', new Vector4(1 / m[0], 1 / m[1], 1 / m[2], 1 / m[3]));
    }
    mat.setVector2('uvScale', new Vector2(...(opts.uvScale ?? [1, 1])));
    mat.setFloat('bakedMix', this.bakedMix);
    mat.setFloat('lightKnee', this.lightKnee);
    mat.setFloat('priorityLights', 0);
    mat.setFloat('flash', 0);
    mat.setFloat('time', this.time);
    mat.setFloat('wind', opts.wind ? 1 : 0);
    mat.setFloat('heat', this.weather.heat);
    mat.setFloat('cloudShadow', this.weather.cloudShadow);
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
    mat.backFaceCulling = !opts.doubleSided;
    if (opts.ambient) this.ambientOverride.set(mat, opts.ambient);
    this.materials.add(mat);
    this.pushEnv(mat);
    return mat;
  }

  /** Hot air over the view (desert) and the strength of drifting cloud shadows (outdoors). */
  setWeather(next: Partial<Weather>): void {
    Object.assign(this.weather, next);
    for (const m of this.materials) {
      m.setFloat('heat', this.weather.heat);
      m.setFloat('cloudShadow', this.weather.cloudShadow);
    }
  }

  /** Paint a material white: 0 normal, 1 fully white (hit flash). */
  setFlash(mat: ShaderMaterial, amount: number): void {
    mat.setFloat('flash', amount);
  }

  /** Change a material's own ambient fill (see VertexLitOptions.ambient). */
  setAmbient(mat: ShaderMaterial, ambient: Color3): void {
    this.ambientOverride.set(mat, ambient);
    mat.setColor3('ambientColor', ambient);
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
  /** Where the soft light knee starts; 2.5 is effectively off. */
  lightKnee = 0.9;

  setLightKnee(v: number): void {
    this.lightKnee = v;
    for (const m of this.materials) m.setFloat('lightKnee', v);
  }

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
    mat.setColor3('ambientColor', this.ambientOverride.get(mat) ?? this.env.ambientColor);
    mat.setColor3('fogColor', this.env.fogColor);
    mat.setFloat('fogDensity', this.env.fogDensity);
  }

  private update(): void {
    const cam = this.scene.activeCamera;
    if (!cam) return;
    const p = cam.globalPosition;
    this.time += this.scene.getEngine().getDeltaTime() / 1000;
    const pos = new Array<number>(MAX_POINT_LIGHTS * 3).fill(0);
    const col = new Array<number>(MAX_POINT_LIGHTS * 3).fill(0);
    const rng = new Array<number>(MAX_POINT_LIGHTS).fill(0);
    for (const m of this.materials) {
      m.setVector3('cameraPosition', p);
      m.setFloat('time', this.time);
      if (this.lights.length === 0) continue;
      // Nearest lights to the material's first mesh, measured to its bounding box rather
      // than its centre (level chunks are 12 m wide, and a light at a chunk's edge is as
      // real as one at its centre). Priority lights, the torch, come first regardless, so
      // the party's own light never loses its slot to four lanterns (owner, 2026-10-15).
      // Materials are per object here; a material shared across distant objects would
      // need per-mesh binding instead.
      const mesh = m.getBindedMeshes()[0];
      const box = mesh?.getBoundingInfo().boundingBox;
      const distanceSq = (q: Vector3): number => {
        if (!box) return Vector3.DistanceSquared(q, p);
        const dx = Math.max(box.minimumWorld.x - q.x, 0, q.x - box.maximumWorld.x);
        const dy = Math.max(box.minimumWorld.y - q.y, 0, q.y - box.maximumWorld.y);
        const dz = Math.max(box.minimumWorld.z - q.z, 0, q.z - box.maximumWorld.z);
        return dx * dx + dy * dy + dz * dz;
      };
      const sorted = this.lights
        .filter((l) => l.intensity > 0 && l.range > 0)
        .map((l) => ({ l, d: l.priority ? -1 : distanceSq(l.position) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_POINT_LIGHTS);
      pos.fill(0);
      col.fill(0);
      rng.fill(0);
      m.setFloat('priorityLights', sorted[0]?.l.priority ? 1 : 0);
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
    this.ambientOverride.clear();
  }
}
