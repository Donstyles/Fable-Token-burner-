/**
 * Rigged, animated characters from the Meshy pipeline (DESIGN.md 10.1): loaded with Babylon's
 * glTF loader, re-skinned with the world's retro material (per-pixel point lights, knee, fog,
 * nearest-sampled texture) and animated by name through the low-frame-rate stepper.
 */
// Side-effect import: registers the .glb loader.
import '@babylonjs/loaders/glTF/2.0';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ONE_SHOT_CLIPS } from '../../kernel/characters/clips';
import type { AnimationStepper } from '../render/animation-step';
import { applyRetroSampling, type RetroMaterials } from '../render/materials';

/** Fill light on characters, so they read between lamps (MM6 never drew a black sprite). */
export const DEFAULT_CHARACTER_FILL = 0.22;

export interface CharacterOptions {
  name: string;
  position: Vector3;
  /** Facing, degrees about Y in scene space (0 looks along +Z). */
  yawDeg?: number;
  /** Clip to start with; one-shot clips (death) hold their last frame. */
  clip?: string;
}

export class Character {
  /** Owns the loaded hierarchy; move or turn this. */
  readonly node: TransformNode;
  readonly meshes: AbstractMesh[];
  private fillLevel = DEFAULT_CHARACTER_FILL;
  private readonly groups = new Map<string, AnimationGroup>();
  private current: AnimationGroup | null = null;

  constructor(
    scene: Scene,
    private readonly stepper: AnimationStepper,
    private readonly materials: RetroMaterials,
    root: AbstractMesh,
    meshes: AbstractMesh[],
    groups: AnimationGroup[],
    opts: CharacterOptions,
  ) {
    this.node = new TransformNode(opts.name, scene);
    root.parent = this.node;
    this.meshes = meshes;
    for (const g of groups) {
      g.stop();
      this.groups.set(g.name, g);
    }
    this.node.position.copyFrom(opts.position);
    this.node.rotation.y = ((opts.yawDeg ?? 0) * Math.PI) / 180;
    if (opts.clip) this.play(opts.clip);
  }

  get clips(): string[] {
    return [...this.groups.keys()];
  }

  /** Grey fill level, 0 to 1. */
  get fill(): number {
    return this.fillLevel;
  }

  setFill(level: number): void {
    this.fillLevel = level;
    const ambient = new Color3(level, level, level);
    for (const mesh of this.meshes) {
      this.materials.setAmbient(mesh.material as ShaderMaterial, ambient);
    }
  }

  get clip(): string | null {
    return this.current?.name ?? null;
  }

  /** Current frame of the playing clip, for tests and the panel. */
  get frame(): number {
    const first = this.current?.targetedAnimations[0]?.animation;
    return first?.runtimeAnimations[0]?.currentFrame ?? 0;
  }

  /** Play a clip by name; one-shot clips hold their last frame. Replaying restarts it. */
  play(name: string, opts: { loop?: boolean; speed?: number } = {}): void {
    const group = this.groups.get(name);
    if (!group) throw new Error(`${this.node.name}: no clip ${name} (${this.clips.join(', ')})`);
    const loop = opts.loop ?? !ONE_SHOT_CLIPS.has(name);
    if (this.current === group) {
      this.stepper.remove(group);
      this.stepper.add(group, { loop, speed: opts.speed ?? 1 });
      return;
    }
    if (this.current) {
      this.stepper.remove(this.current);
      this.current.stop();
    }
    this.current = group;
    this.stepper.add(group, { loop, speed: opts.speed ?? 1 });
  }

  /** True when the current clip is a one-shot that has played out (or nothing plays). */
  get finished(): boolean {
    return this.current ? this.stepper.finished(this.current) : true;
  }

  /** Seconds of the current clip at its authored rate, 0 when nothing plays. */
  get clipDuration(): number {
    return this.current ? this.stepper.duration(this.current) : 0;
  }

  /** Facing about Y, radians; 0 looks along +Z. */
  get yaw(): number {
    return this.node.rotation.y;
  }

  set yaw(value: number) {
    this.node.rotation.y = value;
  }

  dispose(): void {
    if (this.current) this.stepper.remove(this.current);
    for (const g of this.groups.values()) g.dispose();
    this.node.dispose(false, true);
  }
}

/**
 * Load a character GLB. Babylon's loader builds PBR materials; each is swapped for a retro
 * material over the same base-colour texture, sampled nearest with mipmaps.
 */
export async function loadCharacter(
  scene: Scene,
  materials: RetroMaterials,
  stepper: AnimationStepper,
  url: string,
  opts: CharacterOptions,
): Promise<Character> {
  const container = await LoadAssetContainerAsync(url, scene);
  container.addAllToScene();
  const root = container.meshes.find((m) => !m.parent);
  if (!root) throw new Error(`${url}: no root node`);
  const meshes = container.meshes.filter((m) => m.getTotalVertices() > 0);
  for (const mesh of meshes) {
    const pbr = mesh.material as PBRMaterial | null;
    const texture = pbr?.albedoTexture as Texture | null;
    if (!texture) throw new Error(`${url}: ${mesh.name} has no base colour texture`);
    applyRetroSampling(texture, true);
    // Meshy marks thin sheets (cloak, apron) double-sided; culling them cuts holes in the front.
    mesh.material = materials.create({
      name: `${opts.name}-${mesh.name}`,
      texture,
      doubleSided: pbr?.backFaceCulling === false,
      ambient: new Color3(DEFAULT_CHARACTER_FILL, DEFAULT_CHARACTER_FILL, DEFAULT_CHARACTER_FILL),
    });
    pbr?.dispose(false, false);
    mesh.isPickable = true;
    mesh.name = `${opts.name}:${mesh.name}`;
  }
  return new Character(scene, stepper, materials, root, meshes, container.animationGroups, opts);
}
