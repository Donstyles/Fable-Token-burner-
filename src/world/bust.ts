/**
 * The talking head (DESIGN.md 16.7). The villager the party speaks with is rendered live into
 * a small texture by a second camera held before their face, and that texture is composed
 * onto the view inside the talk panel's window, before the retro filter, so the face dithers
 * and posterises like the world it stands in. MM6 played a film of the face; ours is the
 * model itself, lit by the sun of the hour, mouthing the talk clip.
 */
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Layer } from '@babylonjs/core/Layers/layer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { isForcedLandscape, toAppPoint } from '../app/orientation';
import type { RetroMaterials } from '../render/materials';
import { type Character, DEFAULT_CHARACTER_FILL } from './character';

// The target at the window's size (critics, round 9), so the face composes at the view's pitch.
const SIZE = 96;
const FOV = 0.42;
const NEAR = 0.05;
const FAR = 40;
/**
 * The window frames this much of the model's height: the head fills three fifths of it, the
 * shoulders at its foot (critics, round 11: MM6's heads fill 60 to 65%).
 */
const FRAMED_HEIGHT = 0.21;
/** The eyes sit here, as a fraction of the model's height. */
const EYE_LINE = 0.9;
/** The near-black ground behind the face, as MM6's portraits sat on one. */
// Clear to nothing: the village behind the party shows through round the head (critics, round 7).
// A dark brown behind the head (critics, round 9), speckled by the window's overlay.
const GROUND = new Color4(0.118, 0.078, 0.047, 1);
/** The key: a hard warm light from the camera's upper left, as a painted portrait's. */
const KEY_COLOR = new Color3(0.54, 0.48, 0.41);
const KEY_FILL = 0.3;
/** The room behind the head, this far behind it, seen only by the bust's camera. */
const ROOM_BACK = 1.2;
const ROOM_LAYER = 0x10000000;

/**
 * The room behind a portrait (critics, round 11: MM6's ring holds 175 to 241 colours, ours
 * one): a dark brown wall in blocks of two view pixels, sixteen levels either way, a darker
 * shelf at seven tenths of its height and a lighter wedge of lamplight from the top left.
 */
function paintRoom(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  let seed = 911;
  const rand = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let l = (rand() - 0.5) * 32;
      if (Math.abs(y / size - 0.7) < 0.065) l -= 12;
      if (x / size + y / size < 0.55) l += 15 * (1 - (x / size + y / size) / 0.55) + 8;
      const k = (v: number): number => Math.max(0, Math.min(255, Math.round(v + l)));
      g.fillStyle = `rgb(${k(40)},${k(26)},${k(12)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export interface PageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Bust {
  readonly camera: TargetCamera;
  readonly target: RenderTargetTexture;
  readonly layer: Layer;
  private readonly room: Mesh;
  private subject: Character | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly materials: Pick<RetroMaterials, 'setKeyLight'>,
  ) {
    this.camera = new TargetCamera('bust', Vector3.Zero(), scene, false);
    this.camera.minZ = NEAR;
    this.camera.maxZ = FAR;
    // The window is square whatever the canvas is; the projection says so for good.
    this.camera.freezeProjectionMatrix(Matrix.PerspectiveFovLH(FOV, 1, NEAR, FAR));
    this.target = new RenderTargetTexture('bust', SIZE, scene, {
      generateMipMaps: false,
      samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
    });
    this.target.activeCamera = this.camera;
    this.target.clearColor = GROUND;
    this.target.renderList = [];
    this.layer = new Layer('bust', null, scene, false);
    this.layer.texture = this.target;
    this.layer.isEnabled = false;
    // The room: a painted wall behind the head, on a layer only the bust's camera sees.
    this.camera.layerMask = 0x0fffffff | ROOM_LAYER;
    const wall = new DynamicTexture(
      'bust-room',
      { width: SIZE / 2, height: SIZE / 2 },
      scene,
      false,
    );
    wall.getContext().drawImage(paintRoom(SIZE / 2), 0, 0);
    wall.update(false);
    wall.updateSamplingMode(Constants.TEXTURE_NEAREST_SAMPLINGMODE);
    const mat = new StandardMaterial('bust-room', scene);
    mat.disableLighting = true;
    mat.emissiveTexture = wall;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.fogEnabled = false;
    this.room = CreatePlane('bust-room', { size: 1 }, scene);
    this.room.material = mat;
    this.room.layerMask = ROOM_LAYER;
    this.room.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;
    this.room.isPickable = false;
    this.room.setEnabled(false);
  }

  get showing(): Character | null {
    return this.subject;
  }

  /** Show this character's head; `place` says where on the page. */
  show(character: Character): void {
    if (this.subject && this.subject !== character) this.unlight(this.subject);
    this.subject = character;
    character.setFill(KEY_FILL);
    this.target.renderList = [...character.meshes, this.room];
    this.room.setEnabled(true);
    if (!this.scene.customRenderTargets.includes(this.target)) {
      this.scene.customRenderTargets.push(this.target);
    }
    this.layer.isEnabled = true;
    this.aim();
  }

  /** The page rectangle (CSS pixels) the head is drawn into. */
  place(rect: PageRect): void {
    const c = this.canvas.getBoundingClientRect();
    if (c.width <= 0 || c.height <= 0) return;
    // On a portrait phone the page is rotated to run landscape (src/app/orientation.ts): the
    // window's page rectangle maps into the game's own pixels like a touch does.
    const [ax0, ay0] = toAppPoint(rect.x, rect.y, c);
    const [ax1, ay1] = toAppPoint(rect.x + rect.width, rect.y + rect.height, c);
    const appW = isForcedLandscape() ? c.height : c.width;
    const appH = isForcedLandscape() ? c.width : c.height;
    const left = Math.min(ax0, ax1);
    const top = Math.min(ay0, ay1);
    const w = Math.abs(ax1 - ax0) / appW;
    const h = Math.abs(ay1 - ay0) / appH;
    if (w <= 0 || h <= 0) return;
    const cx = ((left + Math.abs(ax1 - ax0) / 2) / appW) * 2 - 1;
    const cy = 1 - ((top + Math.abs(ay1 - ay0) / 2) / appH) * 2;
    this.layer.scale = new Vector2(w, h);
    this.layer.offset = new Vector2(cx, cy);
    // A layer samples its texture by screen position (its scale and offset zoom the texture,
    // not the quad), so the texture matrix maps the quad's span back onto the whole texture.
    const u0 = (cx - w + 1) / 2;
    const v0 = (cy - h + 1) / 2;
    this.target.uScale = 1 / w;
    this.target.vScale = 1 / h;
    this.target.uOffset = -u0 / w;
    this.target.vOffset = -v0 / h;
  }

  /** Each frame: the villager turns to the party, and the camera keeps before their face. */
  aim(): void {
    const s = this.subject;
    if (!s) return;
    let top = -Infinity;
    for (const m of s.meshes) {
      top = Math.max(top, m.getBoundingInfo().boundingBox.maximumWorld.y);
    }
    const feet = s.node.position;
    const height = Number.isFinite(top) ? Math.max(0.5, top - feet.y) : 1.7;
    // The head where the rig says it is (critics, round 11: aimed over the feet, the head
    // stood at x 70 of 96, cut by the frame), else over the feet.
    const head = headOf(s.meshes);
    const eyes = head
      ? new Vector3(head.x, head.y + height * 0.06, head.z)
      : new Vector3(feet.x, feet.y + height * EYE_LINE, feet.z);
    const yaw = s.node.rotation.y;
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // The distance at which the frame spans FRAMED_HEIGHT of the model.
    const distance = (height * FRAMED_HEIGHT) / 2 / Math.tan(FOV / 2);
    this.camera.position.copyFrom(eyes.add(forward.scale(distance)));
    this.camera.position.y += height * 0.03;
    // The eyes a little above the window's middle, as a painted portrait's.
    this.camera.setTarget(eyes.subtract(new Vector3(0, height * FRAMED_HEIGHT * 0.08, 0)));
    // The room behind, filling the window.
    const back = distance + ROOM_BACK;
    this.room.position.copyFrom(eyes.subtract(forward.scale(ROOM_BACK)));
    this.room.scaling.setAll(2 * back * Math.tan(FOV / 2) * 1.3);
    // The key light: from the camera's upper left, down onto the face.
    const toFace = eyes.subtract(this.camera.position).normalize();
    const right = Vector3.Cross(Vector3.Up(), toFace).normalize();
    const dir = toFace
      .add(right.scale(-0.7))
      .add(new Vector3(0, -0.6, 0))
      .normalize();
    for (const m of s.meshes) {
      const mat = m.material;
      if (mat) this.materials.setKeyLight(mat as never, { direction: dir, color: KEY_COLOR });
    }
  }

  private unlight(character: Character): void {
    character.setFill(DEFAULT_CHARACTER_FILL);
    for (const m of character.meshes) {
      const mat = m.material;
      if (mat) this.materials.setKeyLight(mat as never, null);
    }
  }

  hide(): void {
    if (this.subject) this.unlight(this.subject);
    this.subject = null;
    this.target.renderList = [];
    this.room.setEnabled(false);
    const i = this.scene.customRenderTargets.indexOf(this.target);
    if (i >= 0) this.scene.customRenderTargets.splice(i, 1);
    this.layer.isEnabled = false;
  }

  dispose(): void {
    this.hide();
    this.room.material?.dispose(true, true);
    this.room.dispose();
    this.layer.dispose();
    this.target.dispose();
    this.camera.dispose();
  }
}

/** The world position of the rig's head bone, if the model has one. */
function headOf(meshes: readonly AbstractMesh[]): Vector3 | null {
  for (const m of meshes) {
    const bones = m.skeleton?.bones;
    if (!bones) continue;
    const bone =
      bones.find((b) => /(^|[:_ ])head$/i.test(b.name)) ??
      bones.find((b) => /head/i.test(b.name) && !/end|top/i.test(b.name));
    if (!bone) continue;
    const node = bone.getTransformNode();
    return node ? node.getAbsolutePosition().clone() : bone.getAbsolutePosition(m).clone();
  }
  return null;
}
