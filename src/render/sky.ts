import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
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
  vec2 uv = d.xz / (d.y + 0.25) * 1.5 + vec2(time * 0.01, time * 0.004);
  float n = fbm(uv);
  float t0 = 0.62 - cloudAmount * 0.22;
  float body = step(t0, n);
  vec2 outward = normalize(d.xz + vec2(1e-4)) * 0.05;
  vec2 sunward = normalize(sunDir.xz + vec2(1e-4)) * 0.05;
  float nTop = fbm(uv - outward + sunward * 0.5);
  float nBot = fbm(uv + outward - sunward * 0.5);
  float top = body * step(nTop, n - 0.03);
  float bot = body * step(nBot, n - 0.03) * (1.0 - top);
  vec3 cream = min(cloudColor, vec3(0.95));
  vec3 bodyTone = cloudColor * 0.86;
  vec3 grey = cloudColor * 0.68;
  vec3 cloud = mix(mix(bodyTone, cream, top), grey, bot);
  float hf = up < 0.05 ? 0.0 : up < 0.12 ? 0.5 : 1.0;
  float cover = body * hf;
  vec3 c = mix(sky, cloud, cover);
  // The sun: a hard disc and a stepped corona, dimmed behind cloud.
  float s = max(dot(d, sunDir), 0.0);
  float disc = step(0.99975, s);
  float glow = s > 0.998 ? 0.45 : s > 0.992 ? 0.18 : s > 0.975 ? 0.07 : 0.0;
  c += sunColor * (disc * 1.2 + glow) * (1.0 - cover * 0.7);
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
    });
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
  }
}
