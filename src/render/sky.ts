import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { paintSkyStrip } from './brush';
import type { LightingEnvironment } from './environment';

const SHADER = 'ftbSky';

ShaderStore.ShadersStore[`${SHADER}VertexShader`] = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vDir;
void main(void) {
  vDir = normalize(position);
  gl_Position = viewProjection * world * vec4(position, 1.0);
}
`;

ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 cloudColor;
uniform float cloudAmount;
uniform float time;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform sampler2D skySampler;
// How much of the night sky shows: stars come out as the day goes (DESIGN.md 16.3).
uniform float night;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

void main(void) {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  // The blue field in four flat bands, as a painted sky, not a gradient for the posteriser to
  // cut into contour blobs (critics, 2026-10-17).
  float band = up < 0.05 ? 0.0 : up < 0.14 ? 0.25 : up < 0.3 ? 0.5 : up < 0.55 ? 0.75 : 1.0;
  vec3 sky = mix(horizon, zenith, band);
  // Cumulus: the cloud field cut hard into a body, with a lit edge where it thins upward and
  // toward the sun and a grey underside where it thins toward the horizon.
  // The painted strip (DESIGN.md 16.14), wrapped round the horizon and drifting with the
  // wind; its red channel is the cloud's density, cut at a threshold the weather sets, its
  // green the painter's tone: lit top, body, shaded underside.
  float az = atan(d.x, d.z);
  vec2 suv = vec2(az / 6.2831853 + time * 0.0015, clamp(up, 0.0, 1.0));
  vec2 strip = texture2D(skySampler, suv).rg;
  // MM6's clouds are wisps with soft edges (reference: mm6-outdoor-field), not stencils: the
  // density ramps over a band round the weather's threshold, and the palette steps it.
  float t = 0.5 + (0.5 - cloudAmount) * 0.5;
  float body = smoothstep(t - 0.22, t + 0.1, strip.r) * step(0.03, up);
  float tone = strip.g;
  // Lit top to shaded underside as one soft run (critics, round 6: beige-white 166,157,140
  // to violet-grey 131,125,140), no outline; the palette steps it.
  // Cream (170,160,140) with highlights toward 191 along the top, violet-grey beneath.
  vec3 cream = min(cloudColor * 1.12, vec3(0.96));
  vec3 grey = cloudColor * vec3(0.79, 0.79, 1.02);
  vec3 cloud = mix(grey, cream, smoothstep(0.15, 0.85, tone));
  float cover = body;
  vec3 c = mix(sky, cloud, cover);
  // No sun disc: MM6 painted none; a faint warmth toward it only.
  float s = max(dot(d, sunDir), 0.0);
  float glow = s > 0.995 ? 0.12 : s > 0.98 ? 0.05 : 0.0;
  c += sunColor * glow * (1.0 - cover);
  if (night > 0.0 && d.y > 0.02) {
    // Stars: a sparse hash over the dome, a few bright, the rest faint, never through cloud.
    vec3 sd = d * 90.0;
    vec2 cell = floor(sd.xz / max(d.y, 0.15)) + floor(sd.y) * 17.0;
    float h = hash(cell);
    float star = smoothstep(0.985, 0.999, h) * (0.35 + 0.65 * smoothstep(0.996, 1.0, h));
    c += vec3(0.8, 0.85, 1.0) * star * night * (1.0 - cover) * smoothstep(0.02, 0.2, d.y);
  }
  if (d.y < 0.0) c = horizon;
  gl_FragColor = vec4(c, 1.0);
}
`;

export class SkyDome {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly strip: DynamicTexture;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    env: LightingEnvironment,
    radius = 500,
  ) {
    this.mesh = CreateSphere(
      'sky',
      { diameter: radius * 2, segments: 12, sideOrientation: Mesh.BACKSIDE },
      scene,
    );
    this.mesh.infiniteDistance = true;
    this.mesh.isPickable = false;
    this.mesh.alwaysSelectAsActiveMesh = true;
    this.material = new ShaderMaterial('sky-mat', scene, SHADER, {
      attributes: ['position'],
      uniforms: [
        'world',
        'viewProjection',
        'zenith',
        'horizon',
        'cloudColor',
        'cloudAmount',
        'time',
        'sunDir',
        'sunColor',
        'night',
      ],
      samplers: ['skySampler'],
    });
    // The strip painted once: 4096 pixels round the horizon, 512 up to the zenith, so a
    // texel is under two pixels of the view, as MM6's bitmap sky was.
    const strip = new DynamicTexture('sky-strip', { width: 4096, height: 512 }, scene, false);
    strip.getContext().drawImage(paintSkyStrip(4096, 512, 23), 0, 0);
    strip.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
    strip.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    strip.update(false);
    strip.updateSamplingMode(Constants.TEXTURE_BILINEAR_SAMPLINGMODE);
    this.strip = strip;
    this.material.setTexture('skySampler', strip);
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
    this.material.setFloat('night', 0);
    this.mesh.material = this.material;
    this.apply(env);
    scene.onBeforeRenderObservable.add(() => {
      this.time += scene.getEngine().getDeltaTime() / 1000;
      this.material.setFloat('time', this.time);
    });
  }

  apply(env: LightingEnvironment): void {
    this.material.setColor3('zenith', env.skyZenith);
    this.material.setColor3('horizon', env.skyHorizon);
    this.material.setColor3('cloudColor', env.cloudColor);
    this.material.setFloat('cloudAmount', env.cloudAmount);
    this.material.setVector3('sunDir', env.lightDirection.scale(-1).normalize());
    this.material.setColor3('sunColor', env.lightColor);
  }

  /** How much of the night sky shows, 0 (day) to 1. */
  setNight(amount: number): void {
    this.material.setFloat('night', amount);
  }

  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
    this.strip.dispose();
  }
}
