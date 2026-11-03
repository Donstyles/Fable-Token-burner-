/**
 * Chests (DESIGN.md 17.12): each chest in the level's sidecar is a plank box with an iron-
 * banded lid, lit per vertex by the level's lights, solid to the party. A tap within reach
 * opens it: the lid swings back and the chest's window comes up (src/ui/chest.ts) with what
 * is in it, rolled on the first opening from its treasure levels and kept per map after
 * (src/game/state.ts `maps`); closing the window closes the lid.
 */
import { Animation } from '@babylonjs/core/Animations/animation';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import type { Scene } from '@babylonjs/core/scene';
import { ROLE } from '../../kernel/elements/roles';
import type { ItemId } from '../game/items';
import type { Rng } from '../game/rng';
import type { ChestState } from '../game/state';
import { chestContents } from '../game/treasure';
import type { LevelChest, LoadedLevel } from './level';
import { bakeVertexColors } from './vertex-light';

/** How far a tap reaches a chest, in metres from the eye. */
export const CHEST_TAP_REACH = 6;
const WIDTH = 1.0;
const DEPTH = 0.6;
const HEIGHT = 0.55;
const LID = 0.14;
/** How far back the lid swings, in radians, and how long it takes. */
const SWING = 1.75;
const SWING_SECONDS = 0.5;

export type ChestOutcome =
  { kind: 'opened'; name: string; state: ChestState } | { kind: 'far'; message: string };

interface Box {
  chest: LevelChest;
  body: Mesh;
  hinge: TransformNode;
  lid: Mesh;
  open: boolean;
}

export class Chests {
  private readonly boxes = new Map<string, Box>();

  constructor(
    scene: Scene,
    level: LoadedLevel,
    private readonly states: Record<string, ChestState>,
    private readonly rng: Rng,
  ) {
    for (const chest of level.chests) {
      const yaw = Math.atan2(chest.facing.x, chest.facing.z);
      const body = CreateBox(
        `chest:${chest.name}`,
        { width: WIDTH, height: HEIGHT, depth: DEPTH },
        scene,
      );
      body.position.copyFrom(chest.position).addInPlace(new Vector3(0, HEIGHT / 2, 0));
      body.rotation.y = yaw;
      body.material = level.materialFor(ROLE.plank, true);
      body.parent = level.root;
      bakeVertexColors(body, level.lights);
      body.isPickable = true;
      new PhysicsAggregate(body, PhysicsShapeType.BOX, { mass: 0 }, scene);
      // The lid turns about its back edge.
      const hinge = new TransformNode(`chest:${chest.name}:hinge`, scene);
      hinge.parent = level.root;
      const back = new Vector3(-chest.facing.x, 0, -chest.facing.z).scale(DEPTH / 2);
      hinge.position
        .copyFrom(chest.position)
        .addInPlace(back)
        .addInPlace(new Vector3(0, HEIGHT, 0));
      hinge.rotation.y = yaw;
      const lid = CreateBox(
        `chest:${chest.name}:lid`,
        { width: WIDTH, height: LID, depth: DEPTH },
        scene,
      );
      lid.parent = hinge;
      lid.position.set(0, LID / 2, DEPTH / 2);
      lid.material = level.materialFor(ROLE.iron, true);
      bakeVertexColors(lid, level.lights);
      lid.isPickable = true;
      this.boxes.set(chest.name, { chest, body, hinge, lid, open: false });
    }
  }

  names(): string[] {
    return [...this.boxes.keys()];
  }

  isOpen(name: string): boolean {
    return this.boxes.get(name)?.open ?? false;
  }

  /** The chest a picked mesh belongs to, or null. */
  chestOf(meshName: string): string | null {
    const m = /^chest:([^:]+)/.exec(meshName);
    return m && this.boxes.has(m[1]!) ? m[1]! : null;
  }

  /** What is in the chest, rolled on the first opening and kept after. */
  contents(name: string): ChestState | null {
    const box = this.boxes.get(name);
    if (!box) return null;
    return (this.states[name] ??= chestContents(
      box.chest.levels,
      box.chest.items as ItemId[],
      this.rng,
    ));
  }

  /** A tap on the chest from `distance` metres away: its lid swings open and its contents. */
  tap(name: string, distance: number): ChestOutcome {
    const box = this.boxes.get(name);
    if (!box) return { kind: 'far', message: 'Nothing there' };
    if (distance > CHEST_TAP_REACH) return { kind: 'far', message: 'A chest (come closer)' };
    this.swing(box, true);
    return { kind: 'opened', name, state: this.contents(name)! };
  }

  /** The window closed: the lid comes down. */
  close(name: string): void {
    const box = this.boxes.get(name);
    if (box) this.swing(box, false);
  }

  private swing(box: Box, open: boolean): void {
    if (box.open === open) return;
    box.open = open;
    const fps = 60;
    Animation.CreateAndStartAnimation(
      `chest:${box.chest.name}:lid`,
      box.hinge,
      'rotation.x',
      fps,
      Math.round(fps * SWING_SECONDS),
      box.hinge.rotation.x,
      open ? -SWING : 0,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
  }

  dispose(): void {
    for (const box of this.boxes.values()) {
      box.lid.dispose();
      box.hinge.dispose();
      box.body.dispose();
    }
    this.boxes.clear();
  }
}
