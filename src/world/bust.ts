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
import type { Character } from './character';

// The target at the window's size (critics, round 9), so the face composes at the view's pitch.
const SIZE = 96;
const FOV = 0.42;
const NEAR = 0.05;
const FAR = 40;
/**
 * The window frames this much of the model's height: the head fills three fifths of it, the
 * shoulders at its foot, a little headroom over the hair (critics, rounds 11 and 12).
 */
const FRAMED_HEIGHT = 0.22;
/** The eyes sit here, as a fraction of the model's height. */
const EYE_LINE = 0.9;
/** The near-black ground behind the face, as MM6's portraits sat on one. */
// Clear to nothing: the village behind the party shows through round the head (critics, round 7).
// A dark brown behind the head (critics, round 9), speckled by the window's overlay.
const GROUND = new Color4(0.118, 0.078, 0.047, 1);
/** The key: a hard warm light from the camera's upper left, as a painted portrait's. */
// A warmer, harder key and almost no fill (talk critic, round 12: 2% of the face under luma
// 60 against MM6's 45 to 66%; the far cheek, the sockets and under the nose drop a level).
// The hue of (0.8, 0.72, 0.6) at nine tenths the strength (talk-world critic, round 14: the
// key of (0.8, 0.68, 0.52) turned the lit skin orange, G/R 0.66 and B/R 0.34 where MM6's
// faces are 0.71 to 0.74 and 0.40 to 0.52).
// That hue at 1.6 times over a fill of 0.02, from the side (talk-world critic, round 15: the
// fill's 0.08 and the key's 0.64 came to 0.72, under the five levels' top step at 0.8, so no
// face pixel passed about luma 165, where MM6's p95 runs 188 to 201).
// That hue at nine tenths over a warm fill of 0.16, nearer the front, with a stepped highlight
// in the shader (talk-world critic, round 16: lit by the key and fill alone, the face ran
// p5/50/95 0/52/119, 57% under luma 60; a grey fill greyed the skin to saturation 0.49 where
// MM6's is 0.69).
const KEY_COLOR = new Color3(0.648, 0.585, 0.486);
const KEY_FILL = new Color3(0.253, 0.152, 0.076);
/** The room behind the head, this far behind it, seen only by the bust's camera. */
const ROOM_BACK = 1.2;
const ROOM_LAYER = 0x10000000;

/**
 * The room behind a portrait (talk critic, rounds 11 and 12: MM6's backdrops are things, a
 * lattice at the tavern, planks and tools at the smithy): vertical planks six to eight pixels
 * wide with dark seams, lit left edges and grain lines; a shelf at two thirds of the height
 * with three jugs and bowls on it; lamplight from the top left. One texel a view pixel.
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
  const put = (x: number, y: number, r: number, gr: number, b: number): void => {
    g.fillStyle = `rgb(${Math.max(0, Math.min(255, Math.round(r)))},${Math.max(0, Math.min(255, Math.round(gr)))},${Math.max(0, Math.min(255, Math.round(b)))})`;
    g.fillRect(x, y, 1, 1);
  };
  // Planks.
  let x = 0;
  while (x < size) {
    const pw = 6 + Math.floor(rand() * 3);
    // Plank tones over 32 levels, not 20 (talk-world critic, round 16: 58 colours in the
    // left strip, MM6's 65 to 96).
    const tone = (rand() - 0.5) * 32;
    const lines: number[] = [];
    for (let lx = 2; lx < pw - 1; lx += 2 + Math.floor(rand() * 2)) lines.push(lx);
    for (let px = 0; px < pw && x + px < size; px++) {
      for (let y = 0; y < size; y++) {
        let l = tone;
        if (px === 0) l = -36;
        else if (px === 1) l += 22;
        else if (lines.includes(px)) l += rand() < 0.5 ? -8 : 8;
        // A grain on the fill (talk-world critic, round 13: 16 to 21 colours in the room's
        // strips, MM6's 65 to 96).
        if (px > 0) l += (rand() - 0.5) * 10;
        const lamp =
          (x + px) / size + y / size < 0.6 ? 5 * (1 - ((x + px) / size + y / size) / 0.6) : 0;
        if (px === 0) put(x + px, y, 16, 8, 4);
        else {
          // A hue jitter on the fill (talk-world critic, round 14: every plank colour lay on
          // one line of l, 22 to 24 colours in a strip where MM6's run 65 to 96): red and blue
          // eight down or up on a twentieth each, green four down or up on three fortieths.
          // A step darker, the lamp too (talk-world critic, round 15: the strips at luma 39 to
          // 45, where MM6's tavern is 23 to 24, so the side-lit face's shade read as a hole).
          // Darker again, the lamp halved (talk-world critic, round 16: the strips at luma 37
          // and 31, close to the darker face's shade at 59).
          const jr = rand();
          const jg = rand();
          const jb = rand();
          put(
            x + px,
            y,
            34 + l + lamp + (jr < 0.05 ? -8 : jr < 0.1 ? 8 : 0),
            22 + l * 0.7 + lamp * 0.8 + (jg < 0.075 ? -4 : jg < 0.15 ? 4 : 0),
            13 + l * 0.4 + lamp * 0.5 + (jb < 0.05 ? -8 : jb < 0.1 ? 8 : 0),
          );
        }
      }
    }
    x += pw;
  }
  // The shelf: a beam with a lit top and a shadow under it.
  const sy = Math.round(size * 0.67);
  for (let xx = 0; xx < size; xx++) {
    put(xx, sy, 110, 80, 50);
    put(xx, sy + 1, 70, 46, 26);
    put(xx, sy + 2, 70, 46, 26);
    put(xx, sy + 3, 12, 6, 2);
  }
  // Three jugs and bowls on it, each lit on its left, placed by fractions of the width so
  // all three stand on the canvas (at 12, 40 and 78 of 96).
  for (const [fx, ht, wd, l] of [
    [0.125, 10, 6, 96],
    [0.417, 6, 10, 72],
    [0.8125, 9, 7, 112],
  ] as const) {
    const cx = Math.round(size * fx);
    for (let yy = 0; yy < ht; yy++) {
      const t = yy / ht;
      const half = Math.round(
        (wd / 2) * (ht > 7 ? 0.6 + 0.4 * Math.sin(Math.PI * t) : 1 - 0.3 * t),
      );
      for (let xx = -half; xx <= half; xx++) {
        const edge = xx === -half ? 30 : xx === half ? -24 : 0;
        put(cx + xx, sy - ht + yy, l * 0.75 + edge, l * 0.55 + edge * 0.8, l * 0.35 + edge * 0.5);
      }
    }
    put(cx - 1, sy - ht + 1, l + 60, l + 40, l + 20);
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
  /** The key aim() last set up, applied only while the bust's own pass draws. */
  private key: { direction: Vector3; color: Color3; fade: { lo: number; hi: number } } | null =
    null;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly materials: Pick<RetroMaterials, 'setKeyLight' | 'setAmbient'>,
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
    // At the window's size, one texel a view pixel, and flipped on upload as the sky's strip
    // is (talk-world critic, round 13: at half size the planks doubled and the third jug fell
    // off the canvas; unflipped, the shelf hung upside down over the bonnet).
    const wall = new DynamicTexture('bust-room', { width: SIZE, height: SIZE }, scene, false);
    wall.getContext().drawImage(paintRoom(SIZE), 0, 0);
    wall.update(true);
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
    // The bust's key, fill and paint only while its own pass draws, so the villager standing
    // in the world keeps the world's light (talk-world critic, round 17: sharing her
    // materials, she turned glossy in the view, luma up to 247).
    this.target.onBeforeRenderObservable.add(() => {
      if (this.subject) this.light(this.subject);
    });
    this.target.onAfterRenderObservable.add(() => {
      if (this.subject) this.unlight(this.subject);
    });
  }

  get showing(): Character | null {
    return this.subject;
  }

  /** Show this character's head; `place` says where on the page. */
  show(character: Character): void {
    if (this.subject && this.subject !== character) this.unlight(this.subject);
    this.subject = character;
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
    // Aimed a little above the eyes, so the hair clears the top and the eyes sit at about
    // two fifths of the window, as MM6's (talk critic, round 12).
    this.camera.setTarget(eyes.add(new Vector3(0, height * FRAMED_HEIGHT * 0.015, 0)));
    // The room behind, filling the window.
    const back = distance + ROOM_BACK;
    this.room.position.copyFrom(eyes.subtract(forward.scale(ROOM_BACK)));
    // A texel larger than the window, so no edge shows and a texel is a view pixel but for
    // one column (talk-world critic, round 14: at 1.04 the 96 texels spread over 100 pixels).
    this.room.scaling.setAll((2 * back * Math.tan(FOV / 2) * (SIZE + 1)) / SIZE);
    // The key light: from the camera's upper left, down onto the face.
    const toFace = eyes.subtract(this.camera.position).normalize();
    const right = Vector3.Cross(Vector3.Up(), toFace).normalize();
    // Seventy-four degrees off the lens's axis (talk-world critic, round 15: at fifty-five
    // the face was lit evenly, 19% of it under luma 60 where MM6's are 38 to 58%). Sixty
    // (talk-world critic, round 16: at seventy-four the shaded half ran 0.61 of the lit one,
    // MM6's 0.71 to 0.84; at seventy-nine the light split the face down the nose).
    const dir = toFace
      .add(right.scale(-1.5))
      .add(new Vector3(0, -0.9, 0))
      .normalize();
    // The chest a step or two under the face (talk-world critic, round 13: rows 72 to 96 as
    // bright as the face, where MM6's lower window is darker): the light full down to 0.04 of
    // the height under the eyes, six tenths at the window's foot, 0.11 under them.
    const fade = { lo: eyes.y - height * 0.11, hi: eyes.y - height * 0.04 };
    this.key = { direction: dir, color: KEY_COLOR, fade };
  }

  /** The bust's warm fill and key on the character's materials, for its own pass. */
  private light(character: Character): void {
    for (const m of character.meshes) {
      const mat = m.material;
      if (!mat) continue;
      this.materials.setAmbient(mat as never, KEY_FILL);
      if (this.key) this.materials.setKeyLight(mat as never, this.key);
    }
  }

  private unlight(character: Character): void {
    // The character's own grey fill again, over the bust's warm one.
    character.setFill(character.fill);
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
