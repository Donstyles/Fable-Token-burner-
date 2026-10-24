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
  // Nearest between the mip levels too (critics, round 10): a linear mip blend flattens
  // the far texels into a smear.
  texture.updateSamplingMode(
    mipmaps ? Constants.TEXTURE_NEAREST_NEAREST_MIPNEAREST : Constants.TEXTURE_NEAREST_NEAREST,
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

/** A key light's fade that changes nothing: it lies below the world, so all is lit full. */
const NO_FADE = { lo: -100000, hi: -99999 };

/** Outdoor weather fed to every material (DESIGN.md 15.7). */
export interface Weather {
  /** 1 in the desert: far geometry wavers, far sand mirrors the sky and glints. */
  heat: number;
  /** How dark the drifting cloud shadows get, 0 (none) to 1. */
  cloudShadow: number;
  /** The wind's gust, 0 (a lull) to 1 (the peak you hear): canopies lean and sway with it. */
  gust: number;
}

/** The lamplight behind a house's windows at full night (DESIGN.md 17.6): a candle's gold. */
const WINDOW_GLOW = new Color3(1, 0.68, 0.32);

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
// The camera's right in the world: a sprite's quad turns about its foot to face the eye.
uniform vec3 cameraRight;
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
uniform float gust;
uniform float heat;
// 1 lights the surface flat, as MM6's walls were: no face brighter than another.
uniform float flatLight;
varying vec2 vUV;
varying float vClip;
varying vec3 vLight;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFog;
#ifdef DETAIL
// A building's tile is laid from the position measured from its foot (talk-world critic, round
// 16), so the fragment's derivatives of it stay precise 255 m from the world's origin.
varying vec3 vDetail;
#endif
#ifdef TERRAIN
varying vec3 vSplat;
#else
attribute vec2 uv;
#endif
void main(void) {
#include<instancesVertex>
#include<bonesVertex>
#ifdef BILLBOARD
  // A sprite (DESIGN.md 16.14): the quad stands on the instance's foot, scaled with it, and
  // turns about the vertical to face the camera, as MM6's trees did.
  vec3 foot = (finalWorld * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float spriteScale = length(finalWorld[0].xyz);
  vec4 wp = vec4(foot + cameraRight * position.x * spriteScale + vec3(0.0, position.y * spriteScale, 0.0), 1.0);
#else
  vec4 wp = finalWorld * vec4(position, 1.0);
#endif
  if (wind > 0.0) {
    // Canopies sway with the gusts you hear (the soundscape's wind): nothing at the foot, more
    // the higher up, so a twenty-metre spruce's top leans some 1.1 m downwind at a gust's peak
    // and swings about 60 cm either way, a ten-metre oak half that, a bush a little (owner,
    // 2026-10-23: "I want tree swaying to be more pronounced"; it had been 35 cm and 32 cm for
    // every tree over eight metres). A lull sways a quarter as much as a peak; each tree keeps
    // its own phase from its place in the world, and only the size moves with the gust, never
    // the rate, so no tree jerks as a gust comes.
    float crown = clamp((position.y - 0.3) / 12.0, 0.0, 1.6) * wind;
    float sway = 0.5 + 1.5 * gust;
    wp.xz += crown * (vec2(0.8, 0.6) * 0.7 * gust + sway * vec2(
      0.15 * sin(time * 1.7 + wp.x * 0.08 + wp.z * 0.05) + 0.05 * sin(time * 3.3 + wp.z * 0.3),
      0.07 * sin(time * 1.3 + wp.x * 0.07 + wp.z * 0.09)));
  }
#ifdef BILLBOARD
  // A sprite is painted with its own light: lit as if it faced the sun a little.
  vec3 n = vec3(0.0, 1.0, 0.0);
#else
  vec3 n = normalize(mat3(finalWorld) * normal);
#endif
  float ndl = max(dot(n, -lightDirection), 0.0);
#ifdef TERRAIN
  // The ground is lit nearly flat, as MM6's was: the texture carries the picture and a
  // slope shows only a little, so hills read as painted ground, not shaded geometry.
  ndl = mix(0.8, ndl, 0.35);
#endif
  ndl = mix(ndl, 0.5, flatLight);
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
#ifdef DETAIL
  vDetail = wp.xyz - finalWorld[3].xyz;
#endif
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
// Derivatives for the ground's level of detail and a wall's own plane (talk-world critic,
// round 16); WebGL2 has them built in, and Babylon strips these lines there.
#if defined(TERRAIN) || defined(DETAIL)
#extension GL_OES_standard_derivatives : enable
#endif
#ifdef TERRAIN
#extension GL_EXT_shader_texture_lod : enable
#endif
precision highp float;
varying vec2 vUV;
varying vec3 vLight;
varying vec3 vWorldPos;
varying float vClip;
uniform float clipEnabled;
varying vec3 vNormal;
varying float vFog;
uniform sampler2D diffuseSampler;
#ifdef DETAIL
uniform sampler2D detailSampler;
varying vec3 vDetail;
#endif
#ifdef TERRAIN
uniform sampler2D pathSampler;
uniform sampler2D screeSampler;
uniform sampler2D snowSampler;
uniform vec4 splatScale;
varying vec3 vSplat;
// A ground tile read at the level of detail its horizontal footprint asks for (critics,
// round 12): the isotropic level followed the grazing vertical footprint and smeared the
// far ground into horizontal dashes; MM6's texels stay about two pixels across while its
// rows alias. Tiles are 128 texels.
vec3 tileAt(sampler2D s, vec2 u) {
  float lod = log2(max(length(dFdx(u)) * 128.0, 1.0));
  return texture2DLodEXT(s, u, lod).rgb;
}
#endif
#ifdef GROUNDSHADE
// The ground's painted shade (DESIGN.md 17.4, src/world/ground-shade.ts): the share of the
// sun the trees, houses and props take under the morning's, noon's and the evening's suns
// (red, green, blue) and of the sky (alpha), over the whole map; sunBlend weighs the three
// suns by the hour; shadeRect is its min x, min z and one over its size in metres.
uniform sampler2D shadeSampler;
uniform vec4 shadeRect;
uniform vec3 sunBlend;
uniform vec3 ambientColor;
#endif
#ifdef WINDOWS
// The house's lit windows (DESIGN.md 17.6, tools/lib/windows.ts): a grey mask of its panes on
// its own skin, and the lamplight behind them, which comes up as the day goes.
uniform sampler2D windowSampler;
uniform vec3 windowGlow;
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
// The painter's hand (DESIGN.md 16.12): 1 quantises the light into five flat tones and
// deepens the colour, so the talking head reads as a painted portrait, not a render.
uniform float paint;
// The painted light falls from full above fadeHi to six tenths below fadeLo (world heights):
// the bust's chest under its face. Every other material's fade lies below the world.
uniform float fadeLo;
uniform float fadeHi;
uniform float toon;
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
#ifdef ALPHATEST
  if (texture2D(diffuseSampler, vUV).a < 0.5) discard;
#endif
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
  // A keyed bust takes no lantern, torch or cloud shade, only its own key and fill
  // (talk-world critic, round 16: the torch's flicker, a lantern 2.4 m off and the drifting
  // shade swung the face's tones about 20% from frame to frame, where MM6's filmed portraits
  // held still).
  vec3 light = vLight + pl * (1.0 - paint);
#ifdef GROUNDSHADE
  // Under a crown or in a house's cast the ground loses up to three quarters of the key light;
  // at a wall's foot, where little of the sky reaches, two thirds of the ambient and over half
  // the key, so a wall in the sun is seated too (owner, 2026-10-23, of the first pass: shadows
  // under trees and buildings, and round a house in the sun it hardly showed). Never the
  // lanterns or the torch. The sun's part fades as the sun sinks (its real shadows then reach
  // far off to the east, not under the tree); the skirt holds at every hour. Taken as a share
  // of the light here and laid on after the knee below, which would otherwise flatten the first
  // third of it on sunlit ground; never under 0.45 of it, the floor a north wall's foot reaches
  // in cast and skirt.
  vec4 shade = texture2D(shadeSampler, (vWorldPos.xz - shadeRect.xy) * shadeRect.zw);
  float sunUp = smoothstep(0.05, 0.45, -lightDirection.y);
  vec3 key = max(vLight - ambientColor, vec3(0.0));
  float keyShade = max(0.75 * dot(shade.rgb, sunBlend) * sunUp, 0.55 * shade.a);
  vec3 shaded = light - key * keyShade - ambientColor * (0.65 * shade.a);
  vec3 groundShade = max(shaded / max(light, vec3(0.001)), vec3(0.45));
#endif
  if (cloudShadow > 0.0 && paint < 0.5) {
    // Cloud shadows: patches of shade drift over slopes, trees and houses alike.
    vec2 cp = vWorldPos.xz * 0.0035 + time * vec2(0.012, 0.005);
    float cs = 0.65 * noise2(cp) + 0.35 * noise2(cp * 2.1 + 7.0);
    light *= 1.0 - cloudShadow * 0.4 * smoothstep(0.5, 0.68, cs);
  }
  // Soft knee: light above lightKnee compresses towards lightKnee + 0.5, so a lamp in a
  // corner brightens the wall without blowing it out to white (owner, 2026-10-15). Not on a
  // keyed bust, whose one key is set to reach the top step (talk-world critic, round 15:
  // with the knee the face's p95 stays at 155, MM6's 188 to 201).
  float peak = max(light.r, max(light.g, light.b));
  if (peak > lightKnee && paint < 0.5) {
    float over = peak - lightKnee;
    light *= (lightKnee + over / (1.0 + 2.0 * over)) / peak;
  }
#ifdef GROUNDSHADE
  light *= groundShade;
#endif
  light = min(light + carried * (1.0 - paint), vec3(1.6));
  // The light in steps (DESIGN.md 16.14): sixteen flat levels, no dither (critics, round
  // 10: MM6 never dithered; a Bayer reads as a screen door over every wall; the colour
  // variety comes from the texels).
  if (toon > 0.5) light = floor(light * 16.0 + 0.5) / 16.0;
#ifdef TERRAIN
  // Grass under path, scree and snow weights carried per vertex (DESIGN.md 15). Scree, the
  // texture of steep faces, is projected along the face's own horizontal axis where the
  // ground tips past 35°, so cliffs do not smear the flat projection into streaks.
  vec3 w = clamp(vSplat, 0.0, 1.0);
  // Hard, ragged edges (talk-world critic, round 13: grass met earth over three pixels of
  // in-between colour, MM6 over none or one): the edge falls where the vertex weight crosses
  // a threshold that wanders over 1.4 m, hard at every distance with no dither, its outline
  // irregular as MM6's transition tiles. Where path and scree both pass their thresholds,
  // they share the texel rather than add up.
  float e1 = 0.3 + 0.4 * noise2(vWorldPos.xz * 0.7);
  float e2 = 0.3 + 0.4 * noise2(vWorldPos.xz * 0.7 + 19.0);
  w.r = smoothstep(e1 - 0.04, e1 + 0.04, w.r);
  w.g = smoothstep(e2 - 0.04, e2 + 0.04, w.g);
  w /= max(1.0, w.r + w.g + w.b);
  float g = max(0.0, 1.0 - w.r - w.g - w.b);
  float steep = smoothstep(0.18, 0.45, 1.0 - abs(n.y));
  vec2 wall = abs(n.x) > abs(n.z) ? vec2(vWorldPos.z, vWorldPos.y) : vec2(-vWorldPos.x, vWorldPos.y);
  vec2 screeUV = mix(vUV, wall, steep) * splatScale.z;
  // The meadow a step under the hills (talk-world critic, round 16: the meadow at luma p50 66
  // under hills of 70, where MM6's field is 54 under hills of 73 to 74): grass on ground under
  // 8 degrees at 0.86, full on slopes past 23.
  vec3 albedo = tileAt(diffuseSampler, vUV * splatScale.x) * g * mix(0.86, 1.0, smoothstep(0.01, 0.08, 1.0 - n.y)) +
    tileAt(pathSampler, vUV * splatScale.y) * w.r +
    tileAt(screeSampler, screeUV) * w.g +
    tileAt(snowSampler, vUV * splatScale.w) * w.b;
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
#ifdef DETAIL
  // A grey tile in world metres over a building (talk-world critic, round 14: a near wall's
  // texels are 18 cm, runs of 8.8 by 6.2 pixels and 6 colours in 20 by 20, where MM6's walls
  // run 1.1 to 1.4 pixels and 46 to 79): 1.5 m a tile, its mean a half, so it splits the
  // texels near and fades with its averaged mips. On a wall it runs along the wall's own
  // horizontal, from the world normal n (talk-world critic, round 15: laid on the xy or zy
  // plane it stretched 1.75 times along a house 55 degrees off it, runs 2.1 by 1.3 pixels).
  // From the face's geometric normal, not the vertex normal, and half as strong again
  // (talk-world critic, round 16: Meshy's walls carry smoothed normals whose headings spread
  // 45 to 106 degrees over one face, so the tile's u jumped 200 to 470 m across it and fell
  // to its flat last mip, runs 7.5 by 5.6 pixels and 6 colours in 20 by 20 again).
  vec3 gn = normalize(cross(dFdx(vDetail), dFdy(vDetail)));
  vec2 duv = abs(gn.y) > 0.7 ? vDetail.xz : vec2(dot(vDetail.xz, normalize(vec2(-gn.z, gn.x))), vDetail.y);
  albedo *= 1.0 + 1.5 * (texture2D(detailSampler, duv / 1.5).r * 2.0 - 1.0);
#endif
#endif
  float sp = 0.0;
  if (paint > 0.5) {
    // The chest under the face (talk-world critic, round 13: rows 76 to 96 at luma 112 over a
    // face of 104, where MM6's tavern window is 65 under a face of 78), faded before the
    // light is stepped, so it falls in flat tones too.
    light *= mix(0.6, 1.0, smoothstep(fadeLo, fadeHi, vWorldPos.y));
    float lum = max(dot(light, vec3(0.333)), 0.001);
    // Five levels, not three (talk-world critic, round 13: 49% of the face's pixels within
    // 4 luma of a neighbour, MM6's 19 to 23%).
    float q = (floor(lum * 5.0) + 0.5) / 5.0;
    light *= q / lum;
    // The colour deepened, so the darks it has go deeper (face p5 luma 50, MM6's 5 to 13); no
    // lift after it (talk-world critic, round 14: with x1.12 and 1.45 the face stood at luma
    // p50 136, MM6's at 46 to 71, and the lit skin went orange, G/R 0.66 where MM6's is 0.71
    // to 0.74). Deeper again and no saturation under the stronger side key (talk-world
    // critic, round 15: at 1.3 and 1.25 the face ran p5/50/95 32/110/161 and none of it over
    // luma 180, MM6's 5-13/46-73/188-201 and 6 to 9%).
    albedo = pow(albedo, vec3(1.9));
    // A warm highlight off the key in three steps (talk-world critic, round 16: the lit skin
    // stopped at luma p95 154 with 1% of the face over 180, MM6's 188 to 201 and 6 to 9%).
    vec3 hv = normalize(normalize(cameraPosition - vWorldPos) - lightDirection);
    sp = floor(pow(max(dot(n, hv), 0.0), 24.0) * 3.0 + 0.5) / 3.0;
  }
  vec3 lit = emissive;
#ifdef WINDOWS
  // The pane's own paint shows through the lamplight, so leading and grain stay.
  lit += windowGlow * texture2D(windowSampler, vUV).r * (0.6 + dot(albedo, vec3(0.333)));
#endif
  vec3 c = mix(albedo * tint * light + lit + paint * 0.9 * sp * vec3(1.0, 0.78, 0.55), vec3(1.0), flash);
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
  /** Lit flat, as MM6's walls: no directional shading, the bitmap carries the picture. */
  flatLight?: boolean;
  /**
   * A grey mask of the model's window panes on its skin (tools/lib/windows.ts), lit warm at
   * night by `setWindowGlow`.
   */
  windows?: BaseTexture;
  /** A sprite: the quad turns to face the camera and discards its clear pixels. */
  billboard?: boolean;
  /**
   * A grey tile multiplied over the texture in world metres, 1.5 m a tile, along the face's
   * own axis (building walls); its mean must be a half, which the shader maps to 1.
   */
  detail?: BaseTexture;
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
    /**
     * The ground's painted shade over the map (src/world/ground-shade.ts): sun occlusion in
     * luminance, sky occlusion in alpha, laid by `rect` (min x, min z, 1 / size, 1 / size).
     */
    shade?: { texture: BaseTexture; rect: [number, number, number, number] };
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
  /** A key light of a material's own: the talking head is lit from the camera's upper left. */
  private readonly keyOverride = new Map<
    ShaderMaterial,
    { direction: Vector3; color: Color3; fade?: { lo: number; hi: number } }
  >();
  private readonly observer: Observer<Scene>;
  readonly lights: PointLightDesc[] = [];
  env: LightingEnvironment;
  private bakedMix = 1;
  private time = 0;
  /** The light in five steps (DESIGN.md 16.14); off for a smooth render. */
  toon = true;
  /** Weather (DESIGN.md 15.7): 0 is still air and an even sky. */
  readonly weather: Weather = { heat: 0, cloudShadow: 0, gust: 0 };
  /** The ground shade's three suns by the hour (src/world/ground-shade.ts `sunBlend`). */
  private sunBlend: [number, number, number] = [0, 1, 0];
  private readonly shaded = new Set<ShaderMaterial>();
  /** How far the houses' windows are lit, 0 by day to 1 at night. */
  private windowGlow = 0;
  private readonly windowed = new Set<ShaderMaterial>();

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
    if (opts.splat?.shade) defines.push('#define GROUNDSHADE');
    if (opts.billboard) defines.push('#define BILLBOARD', '#define ALPHATEST');
    if (opts.detail) defines.push('#define DETAIL');
    if (opts.windows) defines.push('#define WINDOWS');
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
        'cameraRight',
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
        'paint',
        'fadeLo',
        'fadeHi',
        'toon',
        'time',
        'wind',
        'flatLight',
        'heat',
        'cloudShadow',
        'gust',
        'shadeRect',
        'sunBlend',
        'windowGlow',
      ],
      samplers: [
        'diffuseSampler',
        'pathSampler',
        'screeSampler',
        'snowSampler',
        'detailSampler',
        'shadeSampler',
        'windowSampler',
      ],
      defines,
    });
    mat.setTexture('diffuseSampler', opts.texture);
    if (opts.detail) mat.setTexture('detailSampler', opts.detail);
    if (opts.windows) {
      mat.setTexture('windowSampler', opts.windows);
      mat.setColor3('windowGlow', WINDOW_GLOW.scale(this.windowGlow));
      this.windowed.add(mat);
    }
    if (opts.splat) {
      mat.setTexture('pathSampler', opts.splat.path);
      mat.setTexture('screeSampler', opts.splat.scree);
      mat.setTexture('snowSampler', opts.splat.snow);
      const m = opts.splat.metresPerTile;
      mat.setVector4('splatScale', new Vector4(1 / m[0], 1 / m[1], 1 / m[2], 1 / m[3]));
      if (opts.splat.shade) {
        mat.setTexture('shadeSampler', opts.splat.shade.texture);
        mat.setVector4('shadeRect', new Vector4(...opts.splat.shade.rect));
        mat.setVector3('sunBlend', new Vector3(...this.sunBlend));
        this.shaded.add(mat);
      }
    }
    mat.setVector2('uvScale', new Vector2(...(opts.uvScale ?? [1, 1])));
    mat.setFloat('bakedMix', this.bakedMix);
    mat.setFloat('lightKnee', this.lightKnee);
    mat.setFloat('priorityLights', 0);
    mat.setFloat('flash', 0);
    mat.setFloat('paint', 0);
    mat.setFloat('toon', this.toon ? 1 : 0);
    mat.setVector3('cameraRight', Vector3.Right());
    mat.setFloat('time', this.time);
    mat.setFloat('wind', opts.wind ? 1 : 0);
    mat.setFloat('flatLight', opts.flatLight ? 1 : 0);
    mat.setFloat('heat', this.weather.heat);
    mat.setFloat('cloudShadow', this.weather.cloudShadow);
    mat.setFloat('gust', this.weather.gust);
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
    mat.onDisposeObservable.add(() => {
      this.materials.delete(mat);
      this.shaded.delete(mat);
      this.windowed.delete(mat);
    });
    mat.backFaceCulling = !opts.doubleSided;
    if (opts.ambient) this.ambientOverride.set(mat, opts.ambient);
    this.materials.add(mat);
    this.pushEnv(mat);
    return mat;
  }

  /** Hot air over the view (desert), drifting cloud shadows and the wind's gust (outdoors). */
  setWeather(next: Partial<Weather>): void {
    Object.assign(this.weather, next);
    for (const m of this.materials) {
      m.setFloat('heat', this.weather.heat);
      m.setFloat('cloudShadow', this.weather.cloudShadow);
      m.setFloat('gust', this.weather.gust);
    }
  }

  /**
   * How much each of the ground shade's three casts, morning, noon and evening, shows now
   * (src/world/ground-shade.ts `sunBlend`), so the shadows follow the sun through the day.
   */
  setSunBlend(blend: readonly [number, number, number]): void {
    this.sunBlend = [blend[0], blend[1], blend[2]];
    for (const m of this.shaded) m.setVector3('sunBlend', new Vector3(...this.sunBlend));
  }

  /** Light the houses' windows: 0 dark by day, 1 lamplit at full night. */
  setWindowGlow(night: number): void {
    this.windowGlow = Math.min(1, Math.max(0, night));
    const glow = WINDOW_GLOW.scale(this.windowGlow);
    for (const m of this.windowed) m.setColor3('windowGlow', glow);
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

  /**
   * Light this material by its own key instead of the sun, or by the sun again (`null`); a
   * keyed material is also painted: its light in flat tones, its colour deepened. A `fade`
   * (world heights) dims its light from full above `hi` to six tenths below `lo`.
   */
  setKeyLight(
    mat: ShaderMaterial,
    key: { direction: Vector3; color: Color3; fade?: { lo: number; hi: number } } | null,
  ): void {
    if (key) this.keyOverride.set(mat, key);
    else this.keyOverride.delete(mat);
    mat.setFloat('paint', key ? 1 : 0);
    this.pushEnv(mat);
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
    const key = this.keyOverride.get(mat);
    mat.setVector3('lightDirection', key?.direction ?? this.env.lightDirection);
    mat.setColor3('lightColor', key?.color ?? this.env.lightColor);
    const fade = key?.fade ?? NO_FADE;
    mat.setFloat('fadeLo', fade.lo);
    mat.setFloat('fadeHi', fade.hi);
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
    const right = Vector3.TransformNormal(Vector3.Right(), cam.getWorldMatrix()).normalize();
    for (const m of this.materials) {
      m.setVector3('cameraPosition', p);
      m.setVector3('cameraRight', right);
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
    this.keyOverride.clear();
  }
}
