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
import { type RetroMaterials } from '../render/materials';
import { bitmapPixels, bitmapTexture } from '../render/bitmap';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';

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

/** Sprite height in pixels: MM6's trees stood about a hundred pixels tall. */
const SPRITE_PIXELS = 128;

/**
 * A tree or a bush as a sprite (DESIGN.md 16.14): the model is drawn once from the side into a
 * small texture, quantised like a 1998 bitmap, and a quad carrying it stands in for every
 * instance, turning to face the eye in the vertex shader. The sprite's square covers the
 * model's bounding box, `side` metres to a side, its foot at y = 0.
 */
async function spriteOf(
  scene: Scene,
  materials: RetroMaterials,
  id: string,
  mesh: Mesh,
  measure: PropMeasure,
): Promise<{ mesh: Mesh; material: ShaderMaterial }> {
  // The catalogue's size is already in metres (the scale is baked into the vertices).
  const [w, h, d] = measure.size;
  const side = Math.max(w, h, d);
  const camera = new TargetCamera(`sprite-cam:${id}`, new Vector3(0, side / 2, -200), scene, false);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft = -side / 2;
  camera.orthoRight = side / 2;
  camera.orthoBottom = -side / 2;
  camera.orthoTop = side / 2;
  camera.minZ = 1;
  camera.maxZ = 400;
  camera.setTarget(new Vector3(0, side / 2, 0));
  const target = new RenderTargetTexture(`sprite-rtt:${id}`, SPRITE_PIXELS, scene, {
    generateMipMaps: false,
    samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    generateDepthBuffer: true,
  });
  target.activeCamera = camera;
  target.clearColor = new Color4(0, 0, 0, 0);
  target.renderList = [mesh];
  // A render skips a mesh whose shader is still compiling; wait for it or draw nothing.
  const paint = mesh.material as ShaderMaterial;
  await paint.forceCompilationAsync(mesh);
  // Painted under its own light, as a sprite was: a key from the picture's upper left over a
  // grey fill, no fog (the scene's fog is measured from the party's eye, not this camera),
  // no wind, no lanterns. The scene's light and fog fall on the finished sprite when drawn.
  paint.setFloat('fogDensity', 0);
  paint.setFloat('wind', 0);
  paint.setVector3('cameraPosition', camera.position);
  paint.setVector3('lightDirection', new Vector3(0.45, -0.6, 0.65).normalize());
  paint.setColor3('lightColor', new Color3(0.22, 0.22, 0.22));
  paint.setColor3('ambientColor', new Color3(0.72, 0.72, 0.72));
  paint.setArray3('pointColor', new Array<number>(12).fill(0));
  mesh.isVisible = true;
  target.render(false, false);
  mesh.isVisible = false;
  const n = SPRITE_PIXELS;
  const raw = (await target.readPixels()) as Uint8Array | null;
  // readPixels gives the rows bottom first; the canvas wants them top first.
  const px = raw ? bitmapPixels(raw, n, n, n, n, 10, true) : new Uint8ClampedArray(n * n * 4);
  // The quad covers only the painted pixels: a spruce in its square is two thirds air, and
  // every transparent texel still costs a fragment on a phone (and a second on a CPU).
  let x0 = n;
  let x1 = -1;
  let y0 = n;
  let y1 = -1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (px[(y * n + x) * 4 + 3]! < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) {
    x0 = 0;
    y0 = 0;
    x1 = n - 1;
    y1 = n - 1;
  }
  const sprite = new DynamicTexture(`sprite:${id}`, { width: n, height: n }, scene, true);
  sprite.getContext().putImageData(new ImageData(px, n, n), 0, 0);
  sprite.hasAlpha = true;
  sprite.update(true);
  sprite.updateSamplingMode(Constants.TEXTURE_NEAREST_NEAREST_MIPLINEAR);
  target.dispose();
  camera.dispose();
  const metres = side / n;
  const width = (x1 - x0 + 1) * metres;
  const height = (y1 - y0 + 1) * metres;
  // Canvas row 0 is the top of the picture (the zenith side), so v runs the other way.
  const quad = CreatePlane(
    `sprite:${id}`,
    {
      width,
      height,
      frontUVs: new Vector4(x0 / n, 1 - (y1 + 1) / n, (x1 + 1) / n, 1 - y0 / n),
    },
    scene,
  );
  quad.position.x = ((x0 + x1 + 1) / 2 - n / 2) * metres;
  quad.position.y = (n - (y1 + 1)) * metres + height / 2;
  quad.bakeCurrentTransformIntoVertices();
  const material = materials.create({
    name: `sprite-${id}`,
    texture: sprite,
    doubleSided: true,
    billboard: true,
    // MM6's canopies were a dark, dense green (critics, round 5: ~41,68,40).
    tint: new Color3(0.72, 0.8, 0.66),
  });
  quad.material = material;
  quad.isPickable = false;
  quad.isVisible = false;
  return { mesh: quad, material };
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
      // The skin as a 1998 bitmap (DESIGN.md 16.14): buildings at 256 pixels, the rest smaller.
      const bitmap = await bitmapTexture(full.texture, scene, {
        size: spec.kind === 'building' ? 512 : 192,
        levels: 10,
      });
      // Meshy paints buildings and stones a shade dark for daylight; a little lift reads
      // as sun on plaster rather than a cellar wall.
      const lift = sways ? 1 : 1.05;
      const material = materials.create({
        name: `prop-${id}`,
        texture: bitmap,
        doubleSided: full.doubleSided,
        tint: new Color3(lift, lift, lift),
        ...(sways ? { wind: true } : {}),
        // Walls and roofs lit flat, as MM6's: the bitmap carries the picture, no face
        // brighter than another, no posterised bands across a curve (critics, round 5).
        ...(sways ? {} : { flatLight: true }),
      });
      full.mesh.material = material;
      if (sways) {
        // Trees and bushes stand as sprites, as MM6's did; the model drew its own picture.
        const sprite = await spriteOf(scene, materials, id, full.mesh, measure);
        full.mesh.dispose();
        material.dispose();
        models.set(id, { id, measure, mesh: sprite.mesh, far: null, material: sprite.material });
        return;
      }
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
