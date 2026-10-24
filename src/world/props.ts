/**
 * Meshy props at runtime (DESIGN.md 10.3): trees, bushes, rocks, buildings and small props
 * from assets/props. Each model is loaded once, scaled to the catalogue's metres with its foot
 * at y = 0, given the world's retro material, and handed to the level to draw as thin
 * instances; trees and bushes also carry a far-detail copy that shares the material. A house
 * with a window mask beside its model (tools/lib/windows.ts) has its panes lit at night.
 */
// Side-effect import: registers the .glb loader.
import '@babylonjs/loaders/glTF/2.0';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import catalogueJson from '../../assets/props/catalogue.json';
import { PROPS, type PropCatalogue, type PropMeasure } from '../../kernel/terrain/props';
import { applyRetroSampling, type RetroMaterials } from '../render/materials';
import { bitmapTexture } from '../render/bitmap';

const urls = import.meta.glob('../../assets/props/*/*.glb', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
/** The houses' window masks, `<id>.windows.png` beside the model. */
const windowUrls = import.meta.glob('../../assets/props/*/*.windows.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const CATALOGUE = catalogueJson as unknown as PropCatalogue;

export interface PropModel {
  id: string;
  measure: PropMeasure;
  /** Full detail: vertices in metres, foot at y = 0, no parent; drawn only through instances. */
  mesh: Mesh;
  /** Far detail (trees and bushes), sharing the full model's material; null otherwise. */
  far: Mesh | null;
  material: ShaderMaterial;
}

function urlOf(id: string, far: boolean): string {
  const key = `../../assets/props/${id}/${id}${far ? '.lod' : ''}.glb`;
  const url = urls[key];
  if (!url) throw new Error(`prop ${id}: ${far ? 'far model' : 'model'} missing from assets/props`);
  return url;
}

/**
 * Load one GLB into a single parentless mesh in metres with the foot at y = 0. Babylon's
 * loader hangs the model under a root that converts glTF's handedness; that and the
 * catalogue's scale are baked into the vertices so instances need only their own matrix.
 */
async function loadMesh(
  scene: Scene,
  url: string,
  name: string,
  measure: PropMeasure,
): Promise<{ mesh: Mesh; texture: Texture | null; doubleSided: boolean }> {
  const container = await LoadAssetContainerAsync(url, scene);
  container.addAllToScene();
  const parts = container.meshes.filter(
    (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0,
  );
  if (!parts.length) throw new Error(`${url}: no geometry`);
  const pbr = parts[0]!.material as PBRMaterial | null;
  const texture = (pbr?.albedoTexture as Texture | null) ?? null;
  const doubleSided = pbr?.backFaceCulling === false;
  for (const p of parts) p.computeWorldMatrix(true);
  // The loader's handedness conversion is a mirror: Babylon flips culling per draw for a
  // mirrored world matrix, but once the mirror is baked into the vertices the winding must
  // be reversed by hand or every face culls inside out.
  const mirrored = parts[0]!.getWorldMatrix().determinant() < 0;
  let mesh: Mesh;
  if (parts.length === 1) {
    mesh = parts[0]!;
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
  } else {
    // Merged in world space, so the root's conversion is baked in.
    const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!merged) throw new Error(`${url}: merge failed`);
    mesh = merged;
  }
  if (mirrored) mesh.flipFaces(false);
  for (const node of container.rootNodes) if (node !== mesh) node.dispose();
  for (const m of container.materials) m.dispose(false, false);
  mesh.name = name;
  mesh.scaling.setAll(measure.scale);
  mesh.position.y = -measure.min[1];
  mesh.bakeCurrentTransformIntoVertices();
  mesh.isPickable = false;
  mesh.isVisible = false;
  return { mesh, texture, doubleSided };
}

/** Load the models with these ids, in parallel; each once. */
export async function loadPropModels(
  scene: Scene,
  materials: RetroMaterials,
  ids: readonly string[],
): Promise<Map<string, PropModel>> {
  const models = new Map<string, PropModel>();
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      const spec = PROPS[id];
      const measure = CATALOGUE[id];
      if (!spec || !measure)
        throw new Error(`prop ${id}: not in the catalogue (run props:catalogue)`);
      const full = await loadMesh(scene, urlOf(id, false), `prop:${id}`, measure);
      if (!full.texture) throw new Error(`prop ${id}: the model has no base colour texture`);
      const sways = spec.kind === 'tree' || spec.kind === 'bush';
      // The skin as a bitmap (DESIGN.md 16.14) in its own colours: buildings at 1024 pixels,
      // the rest at 512, thirty-two tones a channel, no grain, no palette snap and no speckle
      // over the walls (owner, 2026-10-23: "Building look like shit. You've overdone it with
      // the filtering"; rounds 9 to 14 had added MM6's palette, a grain of a step and a
      // quarter, sixteen tones and a grey speckle in world metres to 256-pixel skins).
      const building = spec.kind === 'building';
      const bitmap = await bitmapTexture(full.texture, scene, {
        size: building ? 1024 : 512,
        levels: 32,
        grain: 0,
        palette: false,
      });
      // The window mask lies on the model's own skin, as glTF lays a picture: top row first.
      const windowUrl = windowUrls[`../../assets/props/${id}/${id}.windows.png`];
      let windows: Texture | null = null;
      if (windowUrl) {
        windows = new Texture(windowUrl, scene, false, false);
        applyRetroSampling(windows, true);
      }
      // Meshy paints buildings and stones a little bright for MM6's daylight: a fifth off.
      const lift = sways ? 1 : 0.8;
      const material = materials.create({
        name: `prop-${id}`,
        texture: bitmap,
        doubleSided: full.doubleSided,
        tint: new Color3(lift, lift, lift),
        ...(sways ? { wind: true } : {}),
        // Walls and roofs lit flat, as MM6's: the bitmap carries the picture, no face
        // brighter than another, no posterised bands across a curve (critics, round 5).
        ...(sways ? {} : { flatLight: true }),
        ...(windows ? { windows } : {}),
      });
      full.mesh.material = material;
      let far: Mesh | null = null;
      if (measure.lodTriangles) {
        far = (await loadMesh(scene, urlOf(id, true), `prop:${id}:far`, measure)).mesh;
        far.material = material;
      }
      models.set(id, { id, measure, mesh: full.mesh, far, material });
    }),
  );
  return models;
}

/** How far round its door a tap still counts as on it, metres. */
export const DOOR_MARGIN = 0.4;

/**
 * Whether a point in a building's own frame (Babylon's: metres, the foot at y = 0) is on its
 * door (kernel/terrain/props.ts `door`): across the front within the door's width, no higher
 * than its top, and on the front of the house rather than through to the back wall. Babylon's
 * loader mirrors x, so the model's right as you face it is -x here.
 */
export function onDoor(id: string, local: { x: number; y: number; z: number }): boolean {
  const door = PROPS[id]?.door;
  const measure = CATALOGUE[id];
  if (!door || !measure) return false;
  const front = measure.min[2] + measure.size[2];
  return (
    Math.abs(-local.x - door.x) <= door.width / 2 + DOOR_MARGIN &&
    local.y <= door.height + DOOR_MARGIN &&
    local.z >= front - 2.5
  );
}

/** A building's door in its own frame (Babylon's), a metre up, or null if it names none. */
export function doorPoint(id: string): { x: number; y: number; z: number } | null {
  const door = PROPS[id]?.door;
  const measure = CATALOGUE[id];
  if (!door || !measure) return null;
  return { x: -door.x, y: 1, z: measure.min[2] + measure.size[2] };
}

/** Deterministic pick among models for a placement, so a rebuild keeps the same forest. */
export function pickModel(ids: readonly string[], x: number, z: number): string {
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
  return ids[Math.floor((h - Math.floor(h)) * ids.length)]!;
}

/** What the status line calls a tapped model; a building by its house when it is one. */
export function propLabel(id: string, house?: string): string {
  if (house) return house;
  const named: Record<string, string> = {
    'building-inn': 'The Inn',
    'building-store': "The Trader's Store",
    'building-temple': 'The Temple',
    'building-smithy': 'The Smithy',
    'building-stables': 'The Stables',
    'building-barn': 'The Barn',
    'building-farmhouse': 'The Farmhouse',
    'prop-well': 'The Village Well',
    'prop-shrine': 'A Wayside Shrine',
    'prop-cart': 'A Cart',
    'prop-market-stall': 'A Market Stall',
    'prop-haystack': 'A Haystack',
    'prop-lantern-post': 'A Lantern Post',
    'prop-fence': 'A Fence',
    'prop-woodpile': 'A Woodpile',
  };
  if (named[id]) return named[id]!;
  if (id.startsWith('building-cottage')) return 'A Cottage';
  if (id.startsWith('bush')) return 'A Bush';
  if (id.startsWith('rock')) return id.includes('outcrop') ? 'An Outcrop' : 'A Boulder';
  if (id.startsWith('tree-')) {
    const kind = id.slice(5).replace(/-\d+$/, '');
    const vowel = /^[aeiou]/.test(kind);
    const name = kind === 'dead' ? 'Dead Tree' : kind.charAt(0).toUpperCase() + kind.slice(1);
    return `${vowel ? 'An' : 'A'} ${name}`;
  }
  return id;
}
