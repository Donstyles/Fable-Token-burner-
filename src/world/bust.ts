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
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { isForcedLandscape, toAppPoint } from '../app/orientation';
import type { RetroMaterials } from '../render/materials';
import { type Character, DEFAULT_CHARACTER_FILL } from './character';

const SIZE = 256;
const FOV = 0.42;
const NEAR = 0.05;
const FAR = 40;
/** The window frames this much of the model's height: the head fills it, the shoulders at its foot. */
const FRAMED_HEIGHT = 0.25;
/** The eyes sit here, as a fraction of the model's height. */
const EYE_LINE = 0.9;
/** The near-black ground behind the face, as MM6's portraits sat on one. */
const GROUND = new Color4(0.05, 0.04, 0.03, 1);
/** The key: a hard warm light from the camera's upper left, as a painted portrait's. */
const KEY_COLOR = new Color3(1.25, 1.1, 0.9);
const KEY_FILL = 0.3;

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
  }

  get showing(): Character | null {
    return this.subject;
  }

  /** Show this character's head; `place` says where on the page. */
  show(character: Character): void {
    if (this.subject && this.subject !== character) this.unlight(this.subject);
    this.subject = character;
    character.setFill(KEY_FILL);
    this.target.renderList = [...character.meshes];
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
    const eyes = new Vector3(feet.x, feet.y + height * EYE_LINE, feet.z);
    const yaw = s.node.rotation.y;
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // The distance at which the frame spans FRAMED_HEIGHT of the model.
    const distance = (height * FRAMED_HEIGHT) / 2 / Math.tan(FOV / 2);
    this.camera.position.copyFrom(eyes.add(forward.scale(distance)));
    this.camera.position.y += height * 0.03;
    this.camera.setTarget(eyes);
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
    const i = this.scene.customRenderTargets.indexOf(this.target);
    if (i >= 0) this.scene.customRenderTargets.splice(i, 1);
    this.layer.isEnabled = false;
  }

  dispose(): void {
    this.hide();
    this.layer.dispose();
    this.target.dispose();
    this.camera.dispose();
  }
}
