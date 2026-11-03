/**
 * Doors (DESIGN.md 17.11): each leaf in the level's sidecar becomes a box in the doorway with
 * a static collider, lit by the level's own lights as the walls are, so it looks part of
 * them. A tap within reach opens it: the leaf slides up into the wall over the opening, as
 * MM6's doors did, and the collider goes with it; a tap on an open door closes it again
 * unless the party stands in it. A locked door opens only for a party carrying its key.
 * What the party opened is kept per map (src/game/state.ts `maps`).
 */
import { Animation } from '@babylonjs/core/Animations/animation';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import type { Scene } from '@babylonjs/core/scene';
import type { LevelDoor, LevelLight, LoadedLevel } from './level';

/** How far a tap reaches a door, in metres from the eye. */
export const DOOR_TAP_REACH = 6;
/** Light reaching every vertex regardless of lights, as the compiler bakes it. */
const AMBIENT = 0.1;
/** Seconds the leaf takes to slide. */
const SLIDE_SECONDS = 0.6;

export type DoorOutcome =
  | { kind: 'opened' | 'closed'; message: string }
  | { kind: 'locked' | 'far' | 'blocked'; message: string };

interface Leaf {
  door: LevelDoor;
  mesh: Mesh;
  body: PhysicsAggregate | null;
  open: boolean;
}

/**
 * The light on a vertex from the level's static lights, the compiler's rule without its
 * occlusion: a door's leaf is lit as the wall round it is.
 */
function bakedColor(p: Vector3, n: Vector3, lights: LevelLight[]): [number, number, number] {
  const c: [number, number, number] = [AMBIENT, AMBIENT, AMBIENT];
  for (const l of lights) {
    const to = l.position.subtract(p);
    const d = to.length();
    if (d >= l.range || d < 1e-6) continue;
    const ndl = Math.max(0, Vector3.Dot(n, to.scale(1 / d)));
    const falloff = 1 - d / l.range;
    const att = falloff * falloff * l.intensity * ndl;
    c[0] += l.color.r * att;
    c[1] += l.color.g * att;
    c[2] += l.color.b * att;
  }
  return c;
}

export class Doors {
  private readonly leaves = new Map<string, Leaf>();

  constructor(
    private readonly scene: Scene,
    level: LoadedLevel,
    private readonly opened: string[],
    /** Whether the party carries the named item. */
    private readonly hasItem: (item: string) => boolean,
    /** The party's feet, to keep a door from closing on them. */
    private readonly partyAt: () => Vector3,
  ) {
    for (const door of level.doors) {
      const mesh = CreateBox(
        `door:${door.name}`,
        { width: door.width, height: door.height, depth: door.thickness },
        scene,
      );
      mesh.position.copyFrom(door.position).addInPlace(new Vector3(0, door.height / 2, 0));
      mesh.rotation.y = Math.atan2(door.outward.x, door.outward.z);
      mesh.material = level.materialFor(door.material, true);
      mesh.parent = level.root;
      mesh.computeWorldMatrix(true);
      // Lit as the compiler lights the walls: a colour per vertex from the level's lights.
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
      const normals = mesh.getVerticesData(VertexBuffer.NormalKind) ?? [];
      const world = mesh.getWorldMatrix();
      const colors: number[] = [];
      for (let i = 0; i < positions.length; i += 3) {
        const p = Vector3.TransformCoordinates(
          new Vector3(positions[i], positions[i + 1], positions[i + 2]),
          world,
        );
        const n = Vector3.TransformNormal(
          new Vector3(normals[i], normals[i + 1], normals[i + 2]),
          world,
        ).normalize();
        colors.push(...bakedColor(p, n, level.lights), 1);
      }
      mesh.setVerticesData(VertexBuffer.ColorKind, colors, false, 4);
      mesh.isPickable = true;
      const leaf: Leaf = { door, mesh, body: null, open: false };
      this.leaves.set(door.name, leaf);
      if (opened.includes(door.name)) this.slide(leaf, true, false);
      else leaf.body = this.collider(mesh);
    }
  }

  private collider(mesh: Mesh): PhysicsAggregate {
    return new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
  }

  private slide(leaf: Leaf, open: boolean, animate: boolean): void {
    const floor = leaf.door.position.y + leaf.door.height / 2;
    const to = open ? floor + leaf.door.height : floor;
    leaf.open = open;
    if (open && leaf.body) {
      leaf.body.dispose();
      leaf.body = null;
    }
    const settle = (): void => {
      leaf.mesh.position.y = to;
      if (!open && !leaf.body) leaf.body = this.collider(leaf.mesh);
    };
    if (!animate) {
      settle();
      return;
    }
    const fps = 60;
    const anim = Animation.CreateAndStartAnimation(
      `door:${leaf.door.name}:slide`,
      leaf.mesh,
      'position.y',
      fps,
      Math.round(fps * SLIDE_SECONDS),
      leaf.mesh.position.y,
      to,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    if (anim) anim.onAnimationEndObservable.addOnce(settle);
    else settle();
  }

  /** The doors' names. */
  names(): string[] {
    return [...this.leaves.keys()];
  }

  isOpen(name: string): boolean {
    return this.leaves.get(name)?.open ?? false;
  }

  /** The door a picked mesh belongs to, or null. */
  doorOf(meshName: string): string | null {
    const m = /^door:([^:]+)/.exec(meshName);
    return m && this.leaves.has(m[1]!) ? m[1]! : null;
  }

  /** A tap on the door from `distance` metres away: what happened, in a line for the bar. */
  tap(name: string, distance: number): DoorOutcome {
    const leaf = this.leaves.get(name);
    if (!leaf) return { kind: 'far', message: 'Nothing there' };
    if (distance > DOOR_TAP_REACH) return { kind: 'far', message: 'The door (come closer)' };
    if (leaf.open) {
      const feet = this.partyAt();
      const d = Math.hypot(feet.x - leaf.door.position.x, feet.z - leaf.door.position.z);
      if (d < leaf.door.width * 0.5 + 0.6) {
        return { kind: 'blocked', message: 'Step out of the doorway first' };
      }
      this.slide(leaf, false, true);
      const i = this.opened.indexOf(name);
      if (i >= 0) this.opened.splice(i, 1);
      return { kind: 'closed', message: 'The door closes' };
    }
    if (leaf.door.key && !this.hasItem(leaf.door.key)) {
      return { kind: 'locked', message: 'Locked' };
    }
    this.slide(leaf, true, true);
    if (!this.opened.includes(name)) this.opened.push(name);
    return {
      kind: 'opened',
      message: leaf.door.key ? 'The key turns; the door opens' : 'The door opens',
    };
  }

  dispose(): void {
    for (const leaf of this.leaves.values()) {
      leaf.body?.dispose();
      leaf.mesh.dispose();
    }
    this.leaves.clear();
  }
}
