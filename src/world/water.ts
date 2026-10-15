/**
 * Real water (DESIGN.md 11.3): Babylon's water material with reflection and refraction
 * render passes at a fraction of the world resolution (owner's call, 2026-10-15: half or
 * quarter, never full). One material per water body, each with its own render list of
 * nearby level chunks, and passes switched off while the body is far from the camera.
 */
import { WaterMaterial } from '@babylonjs/materials/water/waterMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
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
 * speeds to the shader's own units. The surface is flat: Babylon's vertex waves lift the
 * mesh in a lattice of cusps and sample the mirror image through them, which folds the
 * reflection into mirrored bands (owner's screenshots, 2026-10-15), so all motion comes
 * from the two ripple layers perturbing the reflection and refraction lookups.
 */
export interface WaterLook extends WaterMotionLook {
  /** Deep water tint. */
  color: Color3;
  /** How much tint covers what shows through the surface when looking down (0 clear). */
  blend: number;
  /** How much tint covers the mirror image at grazing angles (0 pure mirror). */
  reflectBlend: number;
  /** Ripple strength in the reflection and refraction lookups. */
  bumpHeight: number;
}

export const DEFAULT_WATER_LOOK: WaterLook = {
  color: new Color3(0.04, 0.13, 0.15),
  blend: 0.6,
  reflectBlend: 0.3,
  bumpHeight: 0.12,
  waveLength: 2,
  rippleSpeed: 0.12,
  flowSpeed: 0.8,
};

/** Reflections stop being rendered for a body further than this from the camera. */
const ACTIVE_DISTANCE = 60;
/** Chunks within this distance of a body appear in its reflection and refraction. */
const REFLECT_DISTANCE = 45;

/**
 * A tileable normal map of wind ripples, generated once: a fixed set of directional waves
 * with integer wave vectors (so the tile repeats exactly) and amplitudes falling with
 * frequency, so broad undulations carry fine ripples. Blue is "up"; red and green carry
 * the slope, which the water shader turns into lookup perturbation.
 */
function rippleBump(scene: Scene, size = 256): DynamicTexture {
  const tex = new DynamicTexture('water-bump', { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const img = ctx.createImageData(size, size);
  let state = 7;
  const rand = (): number => {
    // Small deterministic generator (mulberry32) so every device gets the same ripples.
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const waves: { kx: number; ky: number; a: number; p: number }[] = [];
  while (waves.length < 18) {
    const k = 1 + rand() * 11;
    const ang = rand() * Math.PI * 2;
    const kx = Math.round(Math.cos(ang) * k);
    const ky = Math.round(Math.sin(ang) * k);
    if (kx === 0 && ky === 0) continue;
    waves.push({ kx, ky, a: Math.hypot(kx, ky) ** -1.2, p: rand() * Math.PI * 2 });
  }
  // Analytic slopes, then scaled so the typical (RMS) tilt is about 16 degrees; the
  // normalisation below lets the rare peaks saturate gracefully.
  const slopes = new Float32Array(size * size * 2);
  let sumSq = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let dx = 0;
      let dy = 0;
      for (const w of waves) {
        const c = w.a * 2 * Math.PI * Math.cos(2 * Math.PI * (w.kx * u + w.ky * v) + w.p);
        dx += c * w.kx;
        dy += c * w.ky;
      }
      const i = (y * size + x) * 2;
      slopes[i] = dx;
      slopes[i + 1] = dy;
      sumSq += dx * dx + dy * dy;
    }
  }
  const scale = Math.tan((16 * Math.PI) / 180) / Math.sqrt(sumSq / (size * size));
  for (let i = 0; i < size * size; i++) {
    const nx = -(slopes[i * 2] ?? 0) * scale;
    const ny = -(slopes[i * 2 + 1] ?? 0) * scale;
    const len = Math.hypot(nx, ny, 1);
    const o = i * 4;
    img.data[o] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
    img.data[o + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
    img.data[o + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

/**
 * `WaterMaterial.dispose()` also disposes whatever bump texture it holds. Ours is shared by
 * every body and outlives the materials (they are rebuilt when the quality changes), so it
 * is detached first. The property is typed non-null, hence the cast.
 */
function disposeKeepingBump(mat: WaterMaterial): void {
  (mat as unknown as { bumpTexture: BaseTexture | null }).bumpTexture = null;
  mat.dispose();
}

interface BodyState {
  body: LevelWaterBody;
  material: WaterMaterial | null;
  centre: Vector3;
}

export class LevelWater {
  private readonly bump: DynamicTexture;
  /**
   * The water shader only perturbs the reflection with the ripple map when its NORMAL
   * define is on, and Babylon sets that only while at least one light reaches the mesh
   * with lighting enabled; with lighting off the shader applies one constant offset
   * instead (the "ripple slider slides the reflection" bug, 2026-10-15). The shader never
   * uses the light's diffuse result, so this light exists only to unlock that path. It is
   * scoped to the water meshes; our own materials ignore scene lights anyway.
   */
  private readonly normalsLight: HemisphericLight;
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
    this.normalsLight = new HemisphericLight('water-normals', Vector3.Up(), scene);
    this.normalsLight.includedOnlyMeshes = bodies.map((b) => b.mesh);
    this.normalsLight.specular = Color3.Black();
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
      if (s.material) disposeKeepingBump(s.material);
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
      // Lighting stays on (see normalsLight); one light is enough and specular is black.
      mat.disableLighting = false;
      mat.maxSimultaneousLights = 1;
      mat.backFaceCulling = false;
      mat.specularColor = Color3.Black();
      // No vertex waves: see WaterLook. Motion is the two ripple layers (the second at
      // another scale and speed, so the drift does not read as one sliding sheet).
      mat.waveHeight = 0;
      mat.waveSpeed = 0;
      mat.bumpSuperimpose = true;
      // Grazing views are a mirror, looking down shows through: Babylon's non-linear
      // fresnel, with its own tint factor for the mirror image.
      mat.fresnelSeparate = true;
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
    mat.waterColor2 = l.color;
    mat.colorBlendFactor = l.blend;
    mat.colorBlendFactor2 = l.reflectBlend;
    mat.bumpHeight = l.bumpHeight;
    mat.waveLength = l.waveLength;
    const motion = waterShaderMotion(l, body.flow);
    mat.windForce = motion.windForce;
    mat.windDirection = motion.windDirection;
  }

  dispose(): void {
    for (const s of this.states) if (s.material) disposeKeepingBump(s.material);
    this.states.length = 0;
    this.normalsLight.dispose();
    this.bump.dispose();
    this.scene.fogMode = Scene.FOGMODE_NONE;
  }
}
