/**
 * Things on the floor (DESIGN.md 17.11): each item in the level's sidecar stands as a sprite
 * of its picture (assets/items, the Met's photographs) turning to face the party, as MM6's
 * dropped items did. A tap within reach puts it in the chosen member's pack, or anyone's with
 * room; what was taken is kept per map (src/game/state.ts `maps`).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { ITEMS, type ItemId } from '../game/items';
import { itemPicture } from '../ui/item-pictures';
import type { RetroMaterials } from '../render/materials';
import type { LoadedLevel } from './level';

/** How far a tap reaches a thing on the floor, in metres from the eye. */
export const ITEM_TAP_REACH = 6;
/** Metres a grid cell of the item's picture stands on the floor. */
const METRES_PER_CELL = 0.32;

export type TakeOutcome =
  | { kind: 'taken'; item: ItemId; message: string }
  | { kind: 'far' | 'full' | 'none'; message: string };

interface Lying {
  name: string;
  item: ItemId;
  mesh: Mesh;
}

export class GroundItems {
  private readonly lying = new Map<string, Lying>();

  constructor(
    scene: Scene,
    materials: RetroMaterials,
    level: LoadedLevel,
    private readonly taken: string[],
    /** Put the item in a member's pack: the member's name, or null when nobody has room. */
    private readonly give: (item: ItemId) => string | null,
  ) {
    for (const rec of level.groundItems) {
      if (taken.includes(rec.name)) continue;
      const id = rec.item as ItemId;
      const def = ITEMS[id];
      const url = itemPicture(id);
      if (!def || !url) continue;
      const width = def.w * METRES_PER_CELL;
      const height = def.h * METRES_PER_CELL;
      const mesh = CreatePlane(`item:${rec.name}`, { width, height }, scene);
      const texture = new Texture(url, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
      texture.hasAlpha = true;
      mesh.material = materials.create({
        name: `item:${rec.name}`,
        texture,
        billboard: true,
        flatLight: true,
        // Lit enough to be seen in a dark hall, as MM6's sprites were.
        ambient: new Color3(0.55, 0.55, 0.55),
      });
      mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
      mesh.position.copyFrom(rec.position).addInPlace(new Vector3(0, height / 2 + 0.05, 0));
      mesh.parent = level.root;
      mesh.isPickable = true;
      this.lying.set(rec.name, { name: rec.name, item: id, mesh });
    }
  }

  /** The names of what still lies on the floor. */
  names(): string[] {
    return [...this.lying.keys()];
  }

  /** The thing a picked mesh is, or null. */
  itemOf(meshName: string): string | null {
    const m = /^item:([^:]+)/.exec(meshName);
    return m && this.lying.has(m[1]!) ? m[1]! : null;
  }

  /** A tap on the thing from `distance` metres away. */
  take(name: string, distance: number): TakeOutcome {
    const lying = this.lying.get(name);
    if (!lying) return { kind: 'none', message: 'Nothing there' };
    const def = ITEMS[lying.item];
    if (distance > ITEM_TAP_REACH) return { kind: 'far', message: `${def.name} (come closer)` };
    const who = this.give(lying.item);
    if (!who) return { kind: 'full', message: `Nobody has room for the ${def.name}` };
    lying.mesh.material?.dispose();
    lying.mesh.dispose();
    this.lying.delete(name);
    if (!this.taken.includes(name)) this.taken.push(name);
    return { kind: 'taken', item: lying.item, message: `${who} takes the ${def.name}` };
  }

  dispose(): void {
    for (const l of this.lying.values()) l.mesh.dispose();
    this.lying.clear();
  }
}
