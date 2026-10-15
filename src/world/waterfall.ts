/**
 * Waterfalls (DESIGN.md 11.3): the ribbon from the kernel gets a scrolling foam shader
 * with a lateral ripple, spray and mist particles at the plunge point, and a looping
 * procedural sound with distance attenuation.
 */
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import type { Scene } from '@babylonjs/core/scene';
import type { RetroMaterials } from '../render/materials';
import type { LevelWaterfall } from './level';
import { mist, spray } from './particles';
import { WaterfallSound } from './ambience';

const SHADER = 'ftbWaterfall';

ShaderStore.ShadersStore[`${SHADER}VertexShader`] = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
uniform vec3 cameraPosition;
uniform float fogDensity;
uniform float time;
varying vec2 vUV;
varying float vFog;
void main(void) {
  // Lateral ripple along the sheet, growing toward the bottom where the water breaks up.
  vec3 p = position + normal * sin(uv.y * 22.0 - time * 9.0 + uv.x * 6.0) * 0.06 * (0.3 + uv.y);
  vec4 wp = world * vec4(p, 1.0);
  vUV = uv;
  float d = distance(wp.xyz, cameraPosition) * fogDensity;
  vFog = clamp(exp(-d * d), 0.0, 1.0);
  gl_Position = viewProjection * wp;
}
`;

ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying float vFog;
uniform sampler2D foamSampler;
uniform vec3 fogColor;
uniform vec3 tint;
uniform float time;
uniform float stretch;
uniform float fadeIn;
void main(void) {
  // Foam streaks scroll down the fall; a slow sideways wobble keeps them from reading as a conveyor.
  vec2 uv = vec2(vUV.x * 2.0 + 0.04 * sin(vUV.y * 18.0 + time * 3.0), vUV.y * stretch - time * 1.6);
  float foam = texture2D(foamSampler, uv).r;
  float foam2 = texture2D(foamSampler, uv * vec2(1.7, 0.6) + vec2(0.3, time * 0.4)).r;
  float f = clamp(foam * 0.7 + foam2 * 0.5, 0.0, 1.0);
  // Thin and clear at the lip, white and broken toward the plunge.
  // Foam reaches full strength within the first stretch of the sheet (a fraction of its
  // length set from metres by the runtime), so the fall visibly starts at the lip.
  float body = smoothstep(0.0, fadeIn, vUV.y);
  float edge = 1.0 - smoothstep(0.35, 0.5, abs(vUV.x - 0.5));
  float alpha = (0.35 + 0.55 * f) * body * edge;
  vec3 c = mix(tint, vec3(0.92, 0.97, 1.0), f) * (0.55 + 0.45 * vUV.y);
  gl_FragColor = vec4(mix(fogColor, c, vFog), alpha * (0.6 + 0.4 * vFog));
}
`;

/** Tileable vertical streaks: value noise stretched along v. */
function foamTexture(scene: Scene): DynamicTexture {
  const w = 128;
  const h = 256;
  const tex = new DynamicTexture('waterfall-foam', { width: w, height: h }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const img = ctx.createImageData(w, h);
  const streak = (x: number, y: number): number => {
    let v = 0;
    let amp = 0.55;
    let fx = 7;
    let fy = 1.5;
    for (let o = 0; o < 4; o++) {
      v +=
        amp *
        (0.5 +
          0.5 *
            Math.sin(
              2 * Math.PI * (fx * x + 0.15 * fy * y) + Math.sin(2 * Math.PI * fy * y) * 1.7,
            ));
      amp *= 0.55;
      fx *= 2.1;
      fy *= 2.3;
    }
    return v;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.pow(Math.min(1, streak(x / w, y / h)), 2.2);
      const i = (y * w + x) * 4;
      const c = Math.round(v * 255);
      img.data[i] = c;
      img.data[i + 1] = c;
      img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

interface FallState {
  fall: LevelWaterfall;
  material: ShaderMaterial;
  systems: ParticleSystem[];
  sound: WaterfallSound;
}

export class LevelWaterfalls {
  private readonly foam: DynamicTexture;
  private readonly states: FallState[] = [];
  private time = 0;
  private particlesOn = true;
  private soundVolumeValue = 0.8;

  constructor(
    private readonly scene: Scene,
    falls: LevelWaterfall[],
    private readonly materials: RetroMaterials,
  ) {
    this.foam = foamTexture(scene);
    for (const fall of falls) {
      const material = new ShaderMaterial(`waterfall:${fall.name}`, scene, SHADER, {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'world',
          'viewProjection',
          'cameraPosition',
          'fogDensity',
          'fogColor',
          'time',
          'stretch',
          'fadeIn',
          'tint',
        ],
        samplers: ['foamSampler'],
        needAlphaBlending: true,
      });
      material.setTexture('foamSampler', this.foam);
      material.setFloat('time', 0);
      const drop = Math.abs(fall.lip.y - fall.plunge.y);
      material.setFloat('stretch', Math.max(1, drop / 3));
      material.setFloat('fadeIn', Math.min(0.5, 0.6 / Math.max(fall.length, 0.6)));
      material.setColor3('tint', new Color3(0.22, 0.38, 0.44));
      material.backFaceCulling = true;
      material.disableDepthWrite = true;
      fall.mesh.material = material;
      fall.mesh.alphaIndex = 10;
      // Spray and mist where the water lands; the pool is a little below the plunge point.
      const foot = fall.plunge.add(new Vector3(0, 0.05, 0));
      const systems = [
        spray(scene, {
          at: foot,
          spread: new Vector3(fall.width / 2, 0.1, 0.5),
          rate: Math.round(90 + fall.width * 40),
        }),
        mist(scene, foot, fall.width + 1.5),
      ];
      for (const s of systems) s.start();
      this.states.push({
        fall,
        material,
        systems,
        sound: new WaterfallSound(fall.lip, foot, Math.min(1, 0.6 + drop / 60)),
      });
    }
    this.setSoundVolume(this.soundVolume);
  }

  /** Master loudness for every fall, 0 to 1 (owner: the first mix was "way too loud"). */
  get soundVolume(): number {
    return this.soundVolumeValue;
  }

  setSoundVolume(v: number): void {
    this.soundVolumeValue = v;
    for (const s of this.states) s.sound.setVolume(v);
  }

  setParticles(on: boolean): void {
    this.particlesOn = on;
    for (const s of this.states) {
      for (const ps of s.systems) {
        if (on && !ps.isStarted()) ps.start();
        if (!on && ps.isStarted()) ps.stop();
      }
    }
  }

  setSound(on: boolean): void {
    for (const s of this.states) s.sound.setEnabled(on);
  }

  update(dt: number, listener: Vector3, listenerYaw: number): void {
    this.time += dt;
    const env = this.materials.env;
    for (const s of this.states) {
      s.material.setFloat('time', this.time);
      s.material.setVector3('cameraPosition', listener);
      s.material.setFloat('fogDensity', env.fogDensity);
      s.material.setColor3('fogColor', env.fogColor);
      s.sound.update(listener, listenerYaw);
    }
  }

  dispose(): void {
    for (const s of this.states) {
      for (const ps of s.systems) ps.dispose();
      s.material.dispose();
      s.sound.dispose();
    }
    this.states.length = 0;
    this.foam.dispose();
  }
}
