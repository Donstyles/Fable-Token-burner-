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
import { die, expand, ramp } from '../render/brush';
import { wallDetail } from './painted-textures';
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
  // A strong key (critics, round 8: MM6's crowns run from lum 18 to 95).
  paint.setColor3('lightColor', new Color3(0.6, 0.6, 0.6));
  // Low ambient (critics, round 9): crowns darker than the grass under them.
  paint.setColor3('ambientColor', new Color3(0.15, 0.15, 0.15));
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
  // Leaves in MM6's six greens and bark in its browns (critics, round 9): each opaque pixel
  // keeps its luminance and takes the ramp's tone.
  // Crowns lit from above (talk-world critic, round 14: each leaf drew its green at random,
  // whatever the light had rendered, so the crowns were salted and their tops no brighter than
  // their feet, where MM6's are lit 8 to 16 above; the dark pixels went bark brown, red over
  // green on 14 to 34% of a crown, MM6's 1 to 10%): bark only in the sprite's lowest 35%,
  // where the light rendered brown.
  // Each leaf by its rank in the sprite's own light (talk-world critic, round 15: this key and
  // fill leave 68 to 98% of a sprite at or under 0.12 once posterised, so the fixed cut there
  // blacked 40 to 67% of each crown, MM6's 5 to 32%, and darkened tops over green feet):
  // the opaque pixels ranked by the light they rendered before the posterise, ties at random;
  // the darkest 12% black; the rest a green seven tenths by rank and three by height, give or
  // take four fifths of a step; bark toned by its light over the sprite's 95th percentile.
  const leaf: [number, number, number][] = [
    [8, 24, 16],
    [16, 40, 16],
    [33, 60, 33],
    [33, 73, 33],
    [49, 89, 41],
    [57, 121, 57],
  ];
  const bark = expand(ramp('#1c1208', '#2c1c0e', '#3e2a16', '#4e3620', '#5a4028'), 16);
  const rr = die(n * 7 + 1);
  // Rows at or below this are the sprite's lowest 35%, where its trunk stands.
  const trunk = y1 + 1 - 0.35 * (y1 - y0 + 1);
  // Each opaque pixel as the light rendered it, read from `raw` (rows bottom first), and its
  // rank among the sprite's, 0 the darkest and 1 the lightest.
  const lum = new Float64Array(n * n);
  const brown = new Uint8Array(n * n);
  const tie = new Float64Array(n * n);
  const lit: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (!raw || px[i * 4 + 3]! < 128) continue;
    const o = ((n - 1 - Math.floor(i / n)) * n + (i % n)) * 4;
    lum[i] = (0.299 * raw[o]! + 0.587 * raw[o + 1]! + 0.114 * raw[o + 2]!) / 255;
    brown[i] = raw[o + 1]! < raw[o]! * 0.95 ? 1 : 0;
    tie[i] = rr();
    lit.push(i);
  }
  lit.sort((a, b) => lum[a]! - lum[b]! || tie[a]! - tie[b]!);
  const rank = new Float64Array(n * n);
  for (let k = 0; k < lit.length; k++) rank[lit[k]!] = k / Math.max(1, lit.length - 1);
  // The light's 95th percentile, read between the two nearest ranks.
  const at = 0.95 * Math.max(0, lit.length - 1);
  const lo = lum[lit[Math.floor(at)] ?? 0]!;
  const hi = lum[lit[Math.ceil(at)] ?? 0]!;
  const p95 = Math.max(1e-3, lo + (hi - lo) * (at - Math.floor(at)));
  for (let i = 0; i < n * n; i++) {
    const o = i * 4;
    if (px[o + 3]! < 128) continue;
    const y = Math.floor(i / n);
    if (y >= trunk && brown[i]) {
      const tone = Math.round(Math.min(1, lum[i]! / p95) * 15);
      const t = bark[Math.max(0, Math.min(15, tone))]!.warm;
      px[o] = Math.round(t[0]);
      px[o + 1] = Math.round(t[1]);
      px[o + 2] = Math.round(t[2]);
    } else if (rank[i]! < 0.12) {
      px[o] = 0;
      px[o + 1] = 0;
      px[o + 2] = 0;
    } else {
      const s = (0.7 * (rank[i]! - 0.12)) / 0.88 + 0.3 * (1 - (y - y0) / (y1 - y0 + 1));
      const k = Math.max(0, Math.min(5, Math.round(6 * s - 0.5 + (rr() - 0.5) * 1.6)));
      const t = leaf[k]!;
      px[o] = t[0];
      px[o + 1] = t[1];
      px[o + 2] = t[2];
    }
  }
  const sprite = new DynamicTexture(`sprite:${id}`, { width: n, height: n }, scene, false);
  sprite.getContext().putImageData(new ImageData(px, n, n), 0, 0);
  sprite.hasAlpha = true;
  sprite.update(true);
  // Nearest, no mipmaps: a crown's edge stays a hard edge at any distance (critics, round 8).
  sprite.updateSamplingMode(Constants.TEXTURE_NEAREST_NEAREST);
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
      // The skin as a 1998 bitmap (DESIGN.md 16.14): buildings at 1024 pixels, the rest smaller;
      // a building's walls in sixteen tones with a grain of a step and a quarter, so a near
      // wall is speckled rather than flat plates (world critic, round 12).
      const building = spec.kind === 'building';
      const bitmap = await bitmapTexture(full.texture, scene, {
        size: building ? 1024 : 256,
        levels: building ? 16 : 10,
        grain: building ? 1.25 : 0.5,
      });
      // Meshy paints buildings and stones a shade dark for daylight; a little lift reads
      // as sun on plaster rather than a cellar wall.
      // Meshy's plaster is a bright cream; MM6's walls sat at a luminance near 120 (critics).
      const lift = sways ? 1 : 0.5;
      const material = materials.create({
        name: `prop-${id}`,
        texture: bitmap,
        doubleSided: full.doubleSided,
        tint: new Color3(lift, lift, lift),
        ...(sways ? { wind: true } : {}),
        // Walls and roofs lit flat, as MM6's: the bitmap carries the picture, no face
        // brighter than another, no posterised bands across a curve (critics, round 5).
        ...(sways ? {} : { flatLight: true }),
        // A grey speckle in world metres over a building (talk-world critic, round 14: at
        // eight metres the skin's 18 cm texels stood as flat plates on the walls, 6 colours in
        // 20 by 20 where MM6's show 46 to 79).
        ...(building ? { detail: wallDetail(scene) } : {}),
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
