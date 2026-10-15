/**
 * Real water (DESIGN.md 11.3): Babylon's water material with reflection and refraction
 * render passes at a fraction of the world resolution (owner's call, 2026-10-15: half or
 * quarter, never full). One material per water body, each with its own render list of
 * nearby level chunks, and passes switched off while the body is far from the camera.
 */
import { WaterMaterial } from '@babylonjs/materials/water/waterMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { RetroMaterials } from '../render/materials';
import type { LevelWaterBody } from './level';
import { shaderTime, waterShaderMotion, type WaterMotionLook } from './water-motion';

export const WATER_QUALITIES = ['quarter', 'half', 'eighth', 'off'] as const;
export type WaterQuality = (typeof WATER_QUALITIES)[number];

const DIVISOR: Record<Exclude<WaterQuality, 'off'>, number> = { half: 2, quarter: 4, eighth: 8 };

/**
 * Everything about the surface in metres and seconds; `water-motion.ts` converts the
 * speeds to the shader's own units.
 */
export interface WaterLook extends WaterMotionLook {
  /** Deep water tint blended over the reflection and refraction mix. */
  color: Color3;
  /** How much of the tint shows (0 clear, 1 opaque paint). */
  blend: number;
  /** Ripple strength in the reflection and refraction lookups. */
  bumpHeight: number;
  /**
   * Vertex wave amplitude. Babylon's shader lifts vertices by up to five times this value,
   * so 0.008 is about 4 cm; the surfaces are tessellated at 1 m, so keep waves long.
   */
  waveHeight: number;
  /** Vertex waves per unit; 3 gives a wavelength of roughly 4 m, right for a 1 m mesh. */
  waveCount: number;
}

export const DEFAULT_WATER_LOOK: WaterLook = {
  color: new Color3(0.04, 0.13, 0.15),
  blend: 0.72,
  bumpHeight: 0.08,
  waveHeight: 0.008,
  waveCount: 3,
  waveLength: 0.35,
  rippleSpeed: 0.12,
  flowSpeed: 0.8,
  wavePeriod: 3.5,
};

/** Reflections stop being rendered for a body further than this from the camera. */
const ACTIVE_DISTANCE = 60;
/** Chunks within this distance of a body appear in its reflection and refraction. */
const REFLECT_DISTANCE = 45;

/**
 * A tileable normal map of overlapping ripples, generated once. Blue is "up"; red and
 * green carry the slope, which the water shader turns into lookup perturbation.
 */
function rippleBump(scene: Scene, size = 128): DynamicTexture {
  const tex = new DynamicTexture('water-bump', { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const img = ctx.createImageData(size, size);
  const waves = [
    { kx: 3, ky: 2, a: 1.0, p: 0.3 },
    { kx: -2, ky: 5, a: 0.7, p: 1.9 },
    { kx: 6, ky: -4, a: 0.45, p: 4.1 },
    { kx: 9, ky: 7, a: 0.3, p: 2.2 },
    { kx: -11, ky: 3, a: 0.22, p: 5.0 },
  ];
  const h = (u: number, v: number): number => {
    let s = 0;
    for (const w of waves) s += w.a * Math.sin(2 * Math.PI * (w.kx * u + w.ky * v) + w.p);
    return s;
  };
  const e = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = (h(u + e, v) - h(u - e, v)) / (2 * e);
      const dy = (h(u, v + e) - h(u, v - e)) / (2 * e);
      // Slopes scaled down so the map stays mostly "up".
      const nx = -dx * 0.012;
      const ny = -dy * 0.012;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

interface BodyState {
  body: LevelWaterBody;
  material: WaterMaterial | null;
  centre: Vector3;
}

export class LevelWater {
  private readonly bump: DynamicTexture;
  private readonly states: BodyState[] = [];
  private quality: WaterQuality;
  look: WaterLook;
  /** Set by the caller each frame: still water near the camera keeps its passes on. */
  private cameraPosition = new Vector3();
  /**
   * Simulated seconds driving the shader's `time`. Babylon only advances its own clock when
   * a frame's delta differs from the previous one, which stalls the water on iOS Safari's
   * millisecond timer, so every material reads this clock instead.
   */
  private seconds = 0;

  constructor(
    private readonly scene: Scene,
    bodies: LevelWaterBody[],
    private readonly reflectables: Mesh[],
    private readonly materials: RetroMaterials,
    private readonly fallback: () => Material,
    quality: WaterQuality = 'quarter',
    look: WaterLook = DEFAULT_WATER_LOOK,
  ) {
    this.bump = rippleBump(scene);
    this.look = { ...look };
    this.quality = quality;
    for (const body of bodies) {
      this.states.push({
        body,
        material: null,
        centre: body.min.add(body.max).scale(0.5),
      });
    }
    this.rebuild();
  }

  get currentQuality(): WaterQuality {
    return this.quality;
  }

  setQuality(q: WaterQuality): void {
    if (q === this.quality) return;
    this.quality = q;
    this.rebuild();
  }

  setLook(next: Partial<WaterLook>): void {
    this.look = { ...this.look, ...next };
    for (const s of this.states) if (s.material) this.applyLook(s.material, s.body);
  }

  /** Simulated seconds the surfaces have been animating. */
  get clock(): number {
    return this.seconds;
  }

  /** Call once per frame with the camera position and the frame's simulated seconds. */
  update(cameraPosition: Vector3, dt: number): void {
    this.seconds += dt;
    this.cameraPosition.copyFrom(cameraPosition);
    // Babylon's water shader reads the scene fog; keep it equal to the level fog.
    const env = this.materials.env;
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = env.fogDensity;
    this.scene.fogColor = env.fogColor;
    for (const s of this.states) {
      if (!s.material) continue;
      const near = this.distanceToBody(s) < ACTIVE_DISTANCE;
      if (s.material.renderTargetsEnabled !== near) s.material.enableRenderTargets(near);
    }
  }

  private distanceToBody(s: BodyState): number {
    const p = this.cameraPosition;
    const dx = Math.max(s.body.min.x - p.x, 0, p.x - s.body.max.x);
    const dy = Math.max(s.body.min.y - p.y, 0, p.y - s.body.max.y);
    const dz = Math.max(s.body.min.z - p.z, 0, p.z - s.body.max.z);
    return Math.hypot(dx, dy, dz);
  }

  private rebuild(): void {
    for (const s of this.states) {
      s.material?.dispose();
      s.material = null;
      if (this.quality === 'off') {
        s.body.mesh.material = this.fallback();
        continue;
      }
      const engine = this.scene.getEngine();
      const div = DIVISOR[this.quality];
      const size = new Vector2(
        Math.max(64, Math.round(engine.getRenderWidth() / div / 8) * 8),
        Math.max(64, Math.round(engine.getRenderHeight() / div / 8) * 8),
      );
      const mat = new WaterMaterial(`water:${s.body.name}`, this.scene, size);
      mat.bumpTexture = this.bump;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      mat.specularColor = Color3.Black();
      mat.useWorldCoordinatesForWaveDeformation = true;
      // A second ripple layer at another scale and speed, so the drift does not read as
      // one sliding sheet.
      mat.bumpSuperimpose = true;
      mat.onBindObservable.add(() => mat.getEffect()?.setFloat('time', shaderTime(this.seconds)));
      this.applyLook(mat, s.body);
      // Reflect and refract the architecture around the body, never other water.
      const near = this.reflectables.filter((m) => {
        const bb = m.getBoundingInfo().boundingBox;
        const dx = Math.max(s.body.min.x - bb.maximumWorld.x, 0, bb.minimumWorld.x - s.body.max.x);
        const dz = Math.max(s.body.min.z - bb.maximumWorld.z, 0, bb.minimumWorld.z - s.body.max.z);
        return Math.hypot(dx, dz) < REFLECT_DISTANCE;
      });
      for (const m of near) mat.addToRenderList(m);
      s.body.mesh.material = mat;
      s.material = mat;
    }
  }

  private applyLook(mat: WaterMaterial, body: LevelWaterBody): void {
    const l = this.look;
    mat.waterColor = l.color;
    mat.colorBlendFactor = l.blend;
    mat.bumpHeight = l.bumpHeight;
    mat.waveHeight = l.waveHeight;
    mat.waveLength = l.waveLength;
    mat.waveCount = l.waveCount;
    const motion = waterShaderMotion(l, body.flow);
    mat.waveSpeed = motion.waveSpeed;
    mat.windForce = motion.windForce;
    mat.windDirection = motion.windDirection;
  }

  dispose(): void {
    for (const s of this.states) s.material?.dispose();
    this.states.length = 0;
    this.bump.dispose();
    this.scene.fogMode = Scene.FOGMODE_NONE;
  }
}
