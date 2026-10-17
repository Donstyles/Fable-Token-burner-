/**
 * Meshy props at runtime (DESIGN.md 10.3): trees, bushes, rocks, buildings and small props
 * from assets/props. Each model is loaded once, scaled to the catalogue's metres with its foot
 * at y = 0, given the world's retro material, and handed to the level to draw as thin
 * instances; trees and bushes also carry a far-detail copy that shares the material.
 */
// Side-effect import: registers the .glb loader.
import '@babylonjs/loaders/glTF/2.0';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import catalogueJson from '../../assets/props/catalogue.json';
import { PROPS, type PropCatalogue, type PropMeasure } from '../../kernel/terrain/props';
import { applyRetroSampling, type RetroMaterials } from '../render/materials';

const urls = import.meta.glob('../../assets/props/*/*.glb', {
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
      applyRetroSampling(full.texture, true);
      const sways = spec.kind === 'tree' || spec.kind === 'bush';
      // Meshy paints buildings and stones a shade dark for daylight; a little lift reads
      // as sun on plaster rather than a cellar wall.
      const lift = sways ? 1 : 1.2;
      const material = materials.create({
        name: `prop-${id}`,
        texture: full.texture,
        doubleSided: full.doubleSided,
        tint: new Color3(lift, lift, lift),
        ...(sways ? { wind: true } : {}),
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

/** Deterministic pick among models for a placement, so a rebuild keeps the same forest. */
export function pickModel(ids: readonly string[], x: number, z: number): string {
  const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
  return ids[Math.floor((h - Math.floor(h)) * ids.length)]!;
}

/** What the status line calls a tapped model. */
export function propLabel(id: string): string {
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
