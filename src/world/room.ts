/**
 * A house's room (DESIGN.md 17.8): its picture in the view's box in place of the world, as
 * MM6 played its room films there, with the lights on it moving at MM6's ten steps a second.
 * The flames lick upward and waver, the coals breathe, each fire's light rises and falls
 * over the room with its own flicker, and sparks drift up off a bed of coals. The masks come
 * from the picture's own paint (tools/lib/room.ts, `npm run room`).
 *
 * Babylon's EffectRenderer draws it as one full-screen pass on the world's engine; while it
 * is up the world's scene is not drawn at all.
 */
import { EffectRenderer, EffectWrapper } from '@babylonjs/core/Materials/effectRenderer';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { ViewBox } from '../app/view-box';

interface RoomData {
  /** Where sparks rise from, picture pixels: x from, x to, y; null for none. */
  sparks: [number, number, number] | null;
  fires: number;
}

const PICTURES = import.meta.glob('../../assets/rooms/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const DATA = import.meta.glob('../../assets/rooms/*.json', {
  import: 'default',
  eager: true,
}) as Record<string, RoomData>;

/** The picture's size (tools/lib/room.ts ROOM_SIZE). */
const RES = [640, 296] as const;
/** MM6's animation step, seconds. */
const STEP = 0.1;

// Babylon's shader processor breaks the source at every semicolon, those in comments too:
// none in the comments below.
const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUV;
uniform sampler2D picture;
uniform sampler2D lights; // r flames, g coals, b the biggest fire's light, a the others'
uniform float t;
uniform vec4 box;         // the view's box in render pixels: left, bottom, right, top
uniform vec2 res;
uniform vec3 sparks;      // x from, x to, y, x from below zero for none

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
// A fire's flicker: three rhythms out of step, -1 to 1.
float flick(float s, float k) {
  return 0.5 * sin(s * 7.3 + k) + 0.3 * sin(s * 16.1 + k * 2.3) + 0.2 * sin(s * 29.7 + k * 4.1);
}
vec2 uvAt(vec2 px) { return vec2(px.x / res.x, 1.0 - px.y / res.y); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  if (frag.x < box.x || frag.y < box.y || frag.x > box.z || frag.y > box.w) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  // The picture covers the box, its middle kept: px counts picture pixels from its top left.
  vec2 size = box.zw - box.xy;
  float s = max(size.x / res.x, size.y / res.y);
  vec2 q = frag - box.xy - (size - res * s) * 0.5;
  vec2 px = vec2(q.x / s, res.y - q.y / s);
  vec4 m = texture2D(lights, uvAt(px));

  // Flames: licks of light rise through the painted flame, and the paint is drawn from a
  // little below, wavering, so the tongues climb and sway.
  float lick = fbm(vec2(px.x / 4.0, px.y / 3.0 + t * 7.0));
  float sway = noise(vec2(px.y / 3.0, t * 6.0)) - 0.5;
  vec2 d = vec2(sway * 1.6, (lick - 0.25) * 3.2) * m.r;
  vec3 c = texture2D(picture, uvAt(px + d)).rgb;
  // Firelight brightens by adding warm light and dims by losing its yellow first, as a flame
  // cools to orange: a yellow scaled up evenly goes green, scaled down evenly olive.
  vec3 fire = vec3(1.0, 0.5, 0.12);
  vec3 cool = vec3(0.45, 1.0, 1.4);
  float v = m.r * (0.9 * (lick - 0.45) + 0.12 * flick(t, 1.0));
  c = v > 0.0 ? c + fire * v * 0.7 : c * max(vec3(0.0), 1.0 + v * cool);
  // Coals breathe, each on its own.
  float glow = m.g * 0.6 * (noise(px / 2.5 + vec2(t * 0.8, -t * 0.5)) - 0.45);
  c = glow > 0.0 ? c + fire * glow * 0.6 : c * max(vec3(0.0), 1.0 + glow * cool);
  // Each fire's light over the room rises and falls with its own flicker.
  float room = m.b * 0.16 * flick(t, 0.0) + m.a * 0.2 * flick(t * 1.3, 3.0);
  c *= room > 0.0 ? 1.0 + room * vec3(1.0, 0.75, 0.5) : 1.0 + room * vec3(0.7, 1.0, 1.1);
  // Sparks off the coals, a few at a time, rising and dying.
  if (sparks.x >= 0.0) {
    for (int i = 0; i < 12; i++) {
      float n = float(i);
      float per = 1.2 + hash(vec2(n, 1.0)) * 1.4;
      float k = t / per + hash(vec2(n, 2.0));
      float ph = fract(k);
      float lot = floor(k);
      if (hash(vec2(n, lot)) > 0.55) continue;
      vec2 p0 = vec2(mix(sparks.x, sparks.y, hash(vec2(lot, n + 7.0))), sparks.z - 2.0);
      vec2 p = p0 + vec2(sin(ph * 5.0 + n) * 2.5, -ph * (28.0 + 22.0 * hash(vec2(n, 3.0))));
      float near = 1.0 - smoothstep(0.4, 1.3, length(px - p));
      c += vec3(1.0, 0.62, 0.22) * near * (1.0 - ph) * 1.4;
    }
  }
  // MM6's frame: thirty-two levels a channel, as the world's filter.
  gl_FragColor = vec4(floor(clamp(c, 0.0, 1.0) * 31.0 + 0.5) / 31.0, 1.0);
}
`;

/** Whether the house `id` has a room picture. */
export function hasRoom(id: string): boolean {
  return `../../assets/rooms/${id}.png` in PICTURES;
}

export class RoomView {
  /** Frames drawn since the view was made, for tests. */
  draws = 0;
  private renderer: EffectRenderer | null = null;
  private wrapper: EffectWrapper | null = null;
  private shown: {
    id: string;
    picture: Texture;
    lights: Texture;
    data: RoomData;
    since: number;
  } | null = null;
  private cache = new Map<string, { picture: Texture; lights: Texture; data: RoomData }>();
  private drawn = '';

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly box: () => ViewBox | null,
  ) {}

  /** The house whose room is up, or null. */
  get id(): string | null {
    return this.shown?.id ?? null;
  }

  /** Put up the room of house `id`; false, and nothing changes, when it has none. */
  show(id: string, now = performance.now() / 1000): boolean {
    const url = PICTURES[`../../assets/rooms/${id}.png`];
    const lights = PICTURES[`../../assets/rooms/${id}.lights.png`];
    const data = DATA[`../../assets/rooms/${id}.json`];
    if (!url || !lights || !data) return false;
    let room = this.cache.get(id);
    if (!room) {
      const load = (src: string): Texture => {
        const tex = new Texture(src, this.scene, true, true, Texture.BILINEAR_SAMPLINGMODE);
        tex.wrapU = Texture.CLAMP_ADDRESSMODE;
        tex.wrapV = Texture.CLAMP_ADDRESSMODE;
        return tex;
      };
      room = { picture: load(url), lights: load(lights), data };
      this.cache.set(id, room);
    }
    this.ensureEffect();
    this.shown = { id, ...room, since: now };
    this.drawn = '';
    return true;
  }

  hide(): void {
    this.shown = null;
  }

  /**
   * Draw the room for the clock reading `now` (seconds), only when its step or the box has
   * changed since the last frame drawn: the canvas keeps what it last showed.
   */
  draw(now = performance.now() / 1000): void {
    const room = this.shown;
    const wrapper = this.wrapper;
    if (!room || !wrapper || !this.renderer) return;
    if (!wrapper.isReady() || !room.picture.isReady() || !room.lights.isReady()) return;
    const b = this.box();
    if (!b) return;
    const engine = this.scene.getEngine();
    const scale = engine.getRenderWidth() / Math.max(1, this.canvas.clientWidth);
    const height = engine.getRenderHeight();
    const t = Math.floor((now - room.since) / STEP) * STEP;
    const key = `${room.id} ${t} ${b.left} ${b.top} ${b.right} ${b.bottom} ${scale}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const box = [
      b.left * scale,
      height - b.bottom * scale,
      b.right * scale,
      height - b.top * scale,
    ];
    const sparks = room.data.sparks ?? [-1, -1, -1];
    const apply = wrapper.onApplyObservable.addOnce(() => {
      const e = wrapper.effect;
      e.setTexture('picture', room.picture);
      e.setTexture('lights', room.lights);
      e.setFloat('t', t);
      e.setFloat4('box', box[0]!, box[1]!, box[2]!, box[3]!);
      e.setFloat2('res', RES[0], RES[1]);
      e.setFloat3('sparks', sparks[0], sparks[1], sparks[2]);
    });
    this.renderer.render(wrapper);
    wrapper.onApplyObservable.remove(apply);
    this.draws++;
  }

  private ensureEffect(): void {
    if (this.wrapper) return;
    const engine = this.scene.getEngine();
    this.renderer = new EffectRenderer(engine);
    this.wrapper = new EffectWrapper({
      engine,
      name: 'room',
      fragmentShader: FRAGMENT,
      uniformNames: ['t', 'box', 'res', 'sparks'],
      samplerNames: ['picture', 'lights'],
    });
  }

  dispose(): void {
    for (const r of this.cache.values()) {
      r.picture.dispose();
      r.lights.dispose();
    }
    this.cache.clear();
    this.wrapper?.dispose();
    this.renderer?.dispose();
  }
}
