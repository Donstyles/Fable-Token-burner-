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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

void main(void) {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  vec3 sky = mix(horizon, zenith, pow(up, 0.65));
  // Clouds projected onto a flat layer, fading into the horizon haze.
  vec2 uv = d.xz / (d.y + 0.25) * 1.5 + vec2(time * 0.01, time * 0.004);
  float n = fbm(uv);
  float cover = smoothstep(0.45 - cloudAmount * 0.3, 0.75, n) * cloudAmount;
  float horizonFade = smoothstep(0.0, 0.25, up);
  vec3 c = mix(sky, cloudColor, cover * horizonFade);
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
      ],
    });
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
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
  }

  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
  }
}
