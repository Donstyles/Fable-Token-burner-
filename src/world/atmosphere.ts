/**
 * Light and air around the party (DESIGN.md 11.6, PLAN Phase 3 steps 4 and 5): a torch
 * that follows the camera, fire and smoke on braziers, and fog that eases toward the
 * preset of whichever space the party is in.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import type { Scene } from '@babylonjs/core/scene';
import type { PointLightDesc, RetroMaterials } from '../render/materials';
import type { LevelLight, LevelSpace } from './level';
import { fire, smoke } from './particles';

/** A warm light carried just ahead of the eyes, with a candle-like flicker. */
export class Torch {
  private readonly light: PointLightDesc;
  private time = 0;
  base = 0.9;
  private on = true;

  constructor(private readonly materials: RetroMaterials) {
    this.light = materials.addLight({
      position: new Vector3(),
      color: new Color3(1, 0.7, 0.42),
      range: 9,
      intensity: this.base,
    });
  }

  setEnabled(on: boolean): void {
    this.on = on;
    if (!on) this.light.intensity = 0;
  }

  update(dt: number, eye: Vector3, yaw: number): void {
    this.time += dt;
    // Held slightly forward and below the eyes, so walls to the side still catch it.
    this.light.position.set(eye.x + Math.sin(yaw) * 0.4, eye.y - 0.3, eye.z + Math.cos(yaw) * 0.4);
    if (!this.on) return;
    const t = this.time;
    const flicker =
      0.82 + 0.1 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 27.1) + 0.03 * Math.sin(t * 5.7);
    this.light.intensity = this.base * flicker;
  }

  dispose(): void {
    this.materials.removeLight(this.light);
  }
}

/** Flames and smoke on every brazier the level lists. */
export class Braziers {
  private readonly systems: ParticleSystem[] = [];

  constructor(scene: Scene, lights: LevelLight[]) {
    for (const l of lights) {
      if (l.kind !== 'brazier') continue;
      // The light sits 1.5 m above the brazier base; the coals are at 1.2 m.
      const coals = l.position.add(new Vector3(0, -0.28, 0));
      this.systems.push(fire(scene, coals), smoke(scene, coals));
    }
    for (const s of this.systems) s.start();
  }

  setEnabled(on: boolean): void {
    for (const s of this.systems) {
      if (on && !s.isStarted()) s.start();
      if (!on && s.isStarted()) s.stop();
    }
  }

  dispose(): void {
    for (const s of this.systems) s.dispose();
    this.systems.length = 0;
  }
}

interface FogTarget {
  density: number;
  color: Color3;
}

const DEFAULT_FOG: Record<LevelSpace['kind'], FogTarget> = {
  hall: { density: 0.028, color: new Color3(0.012, 0.01, 0.015) },
  shaft: { density: 0.03, color: new Color3(0.012, 0.01, 0.015) },
  corridor: { density: 0.032, color: new Color3(0.01, 0.009, 0.013) },
  cavern: { density: 0.03, color: new Color3(0.004, 0.006, 0.012) },
};

/** Eases the level fog toward the preset of the space containing the party. */
export class FogBySpace {
  private current: FogTarget;
  private lastSpace: string | null = null;
  rate = 1.2;

  constructor(
    private readonly materials: RetroMaterials,
    private readonly spaces: LevelSpace[],
  ) {
    this.current = { density: materials.env.fogDensity, color: materials.env.fogColor.clone() };
  }

  /** Name of the space the party is in, for the diagnostics overlay. */
  get space(): string | null {
    return this.lastSpace;
  }

  update(dt: number, position: Vector3): void {
    // Smallest containing space wins, so a shaft inside a hall's extent takes precedence.
    let best: LevelSpace | null = null;
    let bestVolume = Infinity;
    for (const s of this.spaces) {
      if (
        position.x < s.min.x ||
        position.x > s.max.x ||
        position.y < s.min.y - 0.5 ||
        position.y > s.max.y ||
        position.z < s.min.z ||
        position.z > s.max.z
      ) {
        continue;
      }
      const v = (s.max.x - s.min.x) * (s.max.y - s.min.y) * (s.max.z - s.min.z);
      if (v < bestVolume) {
        best = s;
        bestVolume = v;
      }
    }
    this.lastSpace = best?.name ?? null;
    const target = best ? (best.fog ?? DEFAULT_FOG[best.kind]) : null;
    if (!target) return;
    const k = 1 - Math.exp(-this.rate * dt);
    this.current.density += (target.density - this.current.density) * k;
    this.current.color.r += (target.color.r - this.current.color.r) * k;
    this.current.color.g += (target.color.g - this.current.color.g) * k;
    this.current.color.b += (target.color.b - this.current.color.b) * k;
    this.materials.setEnvironment({
      fogDensity: this.current.density,
      fogColor: this.current.color.clone(),
    });
  }
}
