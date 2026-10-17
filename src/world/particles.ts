/**
 * Particle helpers shared by waterfalls and braziers: a generated soft sprite and small
 * factories with the look's palette baked in. Textures are generated, not placeholders.
 */
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

const sprites = new WeakMap<Scene, DynamicTexture>();

/** A soft radial sprite, shared by every particle system in the scene. */
export function softSprite(scene: Scene): DynamicTexture {
  const cached = sprites.get(scene);
  if (cached) return cached;
  const size = 64;
  const tex = new DynamicTexture('soft-sprite', { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.update(false);
  tex.hasAlpha = true;
  sprites.set(scene, tex);
  return tex;
}

export interface SprayOptions {
  at: Vector3;
  /** Half extents of the emission box. */
  spread: Vector3;
  rate: number;
}

/** White spray thrown up where falling water hits the pool. */
export function spray(scene: Scene, o: SprayOptions): ParticleSystem {
  const ps = new ParticleSystem('spray', 600, scene);
  ps.particleTexture = softSprite(scene);
  ps.emitter = o.at.clone();
  ps.minEmitBox = o.spread.scale(-1);
  ps.maxEmitBox = o.spread.clone();
  ps.direction1 = new Vector3(-1.2, 2.5, -1.2);
  ps.direction2 = new Vector3(1.2, 5.5, 1.2);
  ps.minEmitPower = 1.2;
  ps.maxEmitPower = 2.4;
  ps.gravity = new Vector3(0, -9, 0);
  ps.minLifeTime = 0.45;
  ps.maxLifeTime = 1.1;
  ps.minSize = 0.12;
  ps.maxSize = 0.45;
  ps.color1 = new Color4(0.85, 0.93, 1, 0.55);
  ps.color2 = new Color4(0.7, 0.85, 0.95, 0.35);
  ps.colorDead = new Color4(0.6, 0.75, 0.85, 0);
  ps.emitRate = o.rate;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ps.updateSpeed = 0.016;
  return ps;
}

/**
 * Blood thrown in the direction of a blow (DESIGN.md 14.4): a one-shot system, started once
 * and fired by setting `manualEmitCount` with the emitter and directions set per hit.
 */
export function hitBurst(scene: Scene): ParticleSystem {
  const ps = new ParticleSystem('hit-burst', 200, scene);
  ps.particleTexture = softSprite(scene);
  ps.emitter = Vector3.Zero();
  ps.minEmitBox = new Vector3(-0.15, -0.15, -0.15);
  ps.maxEmitBox = new Vector3(0.15, 0.15, 0.15);
  ps.direction1 = new Vector3(-1, 0.5, -1);
  ps.direction2 = new Vector3(1, 2, 1);
  ps.minEmitPower = 2.5;
  ps.maxEmitPower = 5;
  ps.gravity = new Vector3(0, -14, 0);
  ps.minLifeTime = 0.22;
  ps.maxLifeTime = 0.5;
  ps.minSize = 0.07;
  ps.maxSize = 0.2;
  ps.color1 = new Color4(0.55, 0.07, 0.05, 1);
  ps.color2 = new Color4(0.4, 0.04, 0.03, 0.9);
  ps.colorDead = new Color4(0.25, 0.02, 0.02, 0);
  ps.emitRate = 0;
  ps.manualEmitCount = 0;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ps.updateSpeed = 0.016;
  return ps;
}

/**
 * Sand on the wind (DESIGN.md 15.5): a box of drifting grains round the camera, blown along
 * `wind` (metres per second); move `emitter` with the camera each frame.
 */
export function dust(scene: Scene, wind: Vector3): ParticleSystem {
  const ps = new ParticleSystem('dust', 500, scene);
  ps.particleTexture = softSprite(scene);
  ps.emitter = Vector3.Zero();
  ps.minEmitBox = new Vector3(-45, 0, -45);
  ps.maxEmitBox = new Vector3(45, 7, 45);
  ps.direction1 = wind.scale(0.7).add(new Vector3(-0.4, -0.1, -0.4));
  ps.direction2 = wind.scale(1.3).add(new Vector3(0.4, 0.25, 0.4));
  ps.minEmitPower = 1;
  ps.maxEmitPower = 1;
  ps.minLifeTime = 3;
  ps.maxLifeTime = 6;
  ps.minSize = 0.5;
  ps.maxSize = 1.6;
  ps.color1 = new Color4(0.86, 0.74, 0.5, 0.16);
  ps.color2 = new Color4(0.8, 0.66, 0.42, 0.1);
  ps.colorDead = new Color4(0.8, 0.66, 0.42, 0);
  ps.emitRate = 110;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ps.updateSpeed = 0.016;
  return ps;
}

/** Slow drifting mist around a plunge pool. */
export function mist(scene: Scene, at: Vector3, radius: number): ParticleSystem {
  const ps = new ParticleSystem('mist', 80, scene);
  ps.particleTexture = softSprite(scene);
  ps.emitter = at.clone();
  ps.minEmitBox = new Vector3(-radius, 0, -radius);
  ps.maxEmitBox = new Vector3(radius, 0.5, radius);
  ps.direction1 = new Vector3(-0.3, 0.3, -0.3);
  ps.direction2 = new Vector3(0.3, 0.8, 0.3);
  ps.minEmitPower = 0.3;
  ps.maxEmitPower = 0.7;
  ps.minLifeTime = 2.5;
  ps.maxLifeTime = 4.5;
  ps.minSize = 1.6;
  ps.maxSize = 3.2;
  ps.color1 = new Color4(0.6, 0.75, 0.85, 0.1);
  ps.color2 = new Color4(0.5, 0.65, 0.75, 0.07);
  ps.colorDead = new Color4(0.4, 0.5, 0.6, 0);
  ps.emitRate = 14;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ps.updateSpeed = 0.016;
  return ps;
}

/** Flames above a brazier's coals. */
export function fire(scene: Scene, at: Vector3, radius = 0.35): ParticleSystem {
  const ps = new ParticleSystem('fire', 90, scene);
  ps.particleTexture = softSprite(scene);
  ps.emitter = at.clone();
  ps.minEmitBox = new Vector3(-radius, 0, -radius);
  ps.maxEmitBox = new Vector3(radius, 0.1, radius);
  ps.direction1 = new Vector3(-0.25, 1.2, -0.25);
  ps.direction2 = new Vector3(0.25, 2.2, 0.25);
  ps.minEmitPower = 0.5;
  ps.maxEmitPower = 1.0;
  ps.minLifeTime = 0.35;
  ps.maxLifeTime = 0.8;
  ps.minSize = 0.28;
  ps.maxSize = 0.65;
  ps.color1 = new Color4(1, 0.62, 0.18, 0.9);
  ps.color2 = new Color4(1, 0.32, 0.06, 0.7);
  ps.colorDead = new Color4(0.35, 0.05, 0, 0);
  ps.emitRate = 45;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.updateSpeed = 0.016;
  return ps;
}

/** Thin smoke rising from a brazier. */
export function smoke(scene: Scene, at: Vector3): ParticleSystem {
  const ps = new ParticleSystem('smoke', 40, scene);
  ps.particleTexture = softSprite(scene);
  ps.emitter = at.clone();
  ps.minEmitBox = new Vector3(-0.2, 0.3, -0.2);
  ps.maxEmitBox = new Vector3(0.2, 0.5, 0.2);
  ps.direction1 = new Vector3(-0.15, 0.6, -0.15);
  ps.direction2 = new Vector3(0.15, 1.1, 0.15);
  ps.minEmitPower = 0.4;
  ps.maxEmitPower = 0.8;
  ps.minLifeTime = 2.2;
  ps.maxLifeTime = 3.8;
  ps.minSize = 0.5;
  ps.maxSize = 1.3;
  ps.color1 = new Color4(0.25, 0.22, 0.2, 0.16);
  ps.color2 = new Color4(0.2, 0.18, 0.17, 0.1);
  ps.colorDead = new Color4(0.1, 0.1, 0.1, 0);
  ps.emitRate = 7;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ps.updateSpeed = 0.016;
  return ps;
}
