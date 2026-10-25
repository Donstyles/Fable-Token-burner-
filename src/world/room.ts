/**
 * A house's room (DESIGN.md 17.8): its picture in the view's box in place of the world, as
 * MM6 played its room films there, with the lights on it moving at MM6's ten steps a second.
 * The flames lick upward and waver, the coals breathe, each fire's light flickers close round
 * it, and sparks drift up off a bed of coals; a magic glow throbs with motes round it, and
 * what was marked by hand moves too: clouds bob and churn with mist drifting by them, and
 * columns of vapour climb with sparks in them. The masks come from the picture's own paint
 * (tools/lib/room.ts, `npm run room`), the marks from pipeline/rooms.json.
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
  /** The fires, biggest first: middle and size in picture pixels. */
  fires: [number, number, number][];
  /** The magic glows: middle and radius in picture pixels, colour in bytes. */
  orbs?: { at: [number, number]; r: number; colour: [number, number, number] }[];
  /** Marked by hand (pipeline/rooms.json), boxes in picture pixels: x from, y from, x to, y to. */
  clouds?: [number, number, number, number][];
  mists?: [number, number, number, number][];
  vapours?: [number, number, number, number][];
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
uniform vec4 fires[16];   // the small fires: middle and size, picture pixels
uniform float fireCount;
uniform float hearth;     // 1 when the biggest fire is a hearth's or a brazier's size
uniform float moody;      // how much darker the room is away from its fires: none without one
uniform vec4 orbs[4];     // a magic glow's middle and radius, picture pixels
uniform vec4 orbColours[4];
uniform float orbCount;
uniform vec4 clouds[4];   // floating clouds: boxes, picture pixels
uniform float cloudCount;
uniform vec4 mist;        // where wisps drift, x from below zero for none
uniform vec4 vapours[8];  // columns of vapour
uniform float vapourCount;

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
// Where a box of the picture is and how far in, softly: 0 outside, 1 well inside.
float within(vec2 uv, vec2 edge) {
  return smoothstep(0.0, edge.x, uv.x) * smoothstep(1.0, 1.0 - edge.x, uv.x)
    * smoothstep(0.0, edge.y, uv.y) * smoothstep(1.0, 1.0 - edge.y, uv.y);
}
// A floating cloud bobs where it hangs and its billows churn: the paint round it is pulled
// along, the pull fading out past its box so nothing tears.
vec2 cloudShift(vec2 p) {
  vec2 d = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    if (float(i) >= cloudCount) break;
    vec4 b = clouds[i];
    vec2 size = b.zw - b.xy;
    vec2 uv = (p - b.xy + size * 0.2) / (size * 1.4);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
    float fi = float(i);
    vec2 bob = vec2(sin(t * 0.55 + fi * 2.1) * 2.2, sin(t * 0.8 + fi * 1.3) * 1.3);
    vec2 churn = vec2(fbm(p / 7.0 + vec2(t * 0.35, fi)), fbm(p / 7.0 + vec2(fi * 3.0, t * 0.3)));
    d += (bob + (churn - 0.5) * 2.4) * within(uv, vec2(0.25, 0.3));
  }
  return d;
}
// The paint at p. In a column of vapour it is drawn from lower down and swaying, so the
// twist climbs, as a turning helix does: two layers half a climb apart, each fading out as it
// starts over, so the climb never jumps.
vec3 paint(vec2 p) {
  for (int i = 0; i < 8; i++) {
    if (float(i) >= vapourCount) break;
    vec4 b = vapours[i];
    if (p.x < b.x || p.x > b.z || p.y < b.y || p.y > b.w) continue;
    vec2 uv = (p - b.xy) / (b.zw - b.xy);
    float w = within(uv, vec2(0.2, 0.25));
    float fi = float(i);
    float run = t / 3.2 + fi * 0.37;
    float p1 = fract(run);
    float p2 = fract(run + 0.5);
    float climb = (b.w - b.y) * 0.15 * w;
    float sway = sin(uv.y * 9.0 - t * 2.0 + fi) * (b.z - b.x) * 0.03 * w;
    vec3 a1 = texture2D(picture, uvAt(vec2(p.x + sway, min(b.w, p.y + p1 * climb)))).rgb;
    vec3 a2 = texture2D(picture, uvAt(vec2(p.x + sway, min(b.w, p.y + p2 * climb)))).rgb;
    return mix(a1, a2, abs(2.0 * p1 - 1.0));
  }
  return texture2D(picture, uvAt(p)).rgb;
}

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
  vec3 c = paint(px + d - cloudShift(px));
  // Firelight brightens by adding warm light and dims by losing its yellow first, as a flame
  // cools to orange: a yellow scaled up evenly goes green, scaled down evenly olive.
  vec3 fire = vec3(1.0, 0.5, 0.12);
  vec3 cool = vec3(0.45, 1.0, 1.4);
  float v = m.r * (0.9 * (lick - 0.45) + 0.12 * flick(t, 1.0));
  c = v > 0.0 ? c + fire * v * 0.7 : c * max(vec3(0.0), 1.0 + v * cool);
  // Coals breathe, each on its own.
  float glow = m.g * 0.6 * (noise(px / 2.5 + vec2(t * 0.8, -t * 0.5)) - 0.45);
  c = glow > 0.0 ? c + fire * glow * 0.6 : c * max(vec3(0.0), 1.0 + glow * cool);
  // A room with fires is dim away from them, and each fire's light lies steady on the wall round
  // it and in a pool on the floor before it. What flickers is the light close round a flame,
  // the whole of it as one: light flickering far out, or out of step across a fire's glow,
  // slides the frame's colour steps over the room in rings (owner, 2026-10-25: "Looks Like
  // psychedelic Waves coming from the candles"). The biggest fire flickers where its light is
  // strongest, each small fire (a candle, a torch) on a rhythm of its own, felt only near it.
  float lit = clamp(m.b + m.a, 0.0, 1.0);
  c *= 1.0 - moody * (1.0 - lit);
  c += fire * (m.b * 0.11 + m.a * 0.07) * (0.4 + c);
  float big = hearth * m.b * m.b * flick(t, 0.0);
  float near = 0.0;
  for (int i = 0; i < 16; i++) {
    if (float(i) >= fireCount) break;
    float dd = length(px - fires[i].xy) / (fires[i].z * 1.5 + 2.0);
    near += flick(t * 1.3, float(i) * 2.17 + 0.5) / (1.0 + dd * dd);
  }
  near = clamp(near, -1.0, 1.0) * min(1.0, m.a * 3.0);
  // Bright paint, a window's daylight or a white robe, is hardly moved by a lamp beside it.
  float pale = 1.0 - 0.8 * smoothstep(0.5, 0.85, dot(c, vec3(0.3, 0.55, 0.15)));
  big *= pale;
  near *= pale;
  c += fire * (big * 0.07 + near * 0.05) * (0.4 + c);
  float room = big * 0.3 + near * 0.2;
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
  // Wisps of mist drift through between the clouds.
  if (mist.x >= 0.0 && px.x > mist.x && px.x < mist.z && px.y > mist.y && px.y < mist.w) {
    vec2 uv = (px - mist.xy) / (mist.zw - mist.xy);
    float wisp = fbm(vec2(px.x / 26.0 - t * 0.22, px.y / 5.0 + sin(px.x / 40.0 + t * 0.3) * 0.6));
    c = mix(c, vec3(0.82, 0.86, 0.95), smoothstep(0.52, 0.78, wisp) * within(uv, vec2(0.18, 0.1)) * 0.32);
  }
  // Sparks climb each column of vapour on its twist, twinkling, pale blue and pink.
  for (int i = 0; i < 8; i++) {
    if (float(i) >= vapourCount) break;
    vec4 b = vapours[i];
    if (px.x < b.x - 2.0 || px.x > b.z + 2.0 || px.y < b.y || px.y > b.w) continue;
    float wd = b.z - b.x;
    float hg = b.w - b.y;
    for (int k = 0; k < 10; k++) {
      float n = float(k) + float(i) * 10.0;
      float ph = fract(t / (2.5 + hash(vec2(n, 1.0)) * 2.0) + hash(vec2(n, 2.0)));
      float turn = ph * 9.4 + hash(vec2(n, 3.0)) * 6.283;
      if (cos(turn) < -0.4) continue;
      vec2 p = vec2(b.x + wd * (0.5 + 0.36 * sin(turn)), b.w - ph * hg);
      float near = 1.0 - smoothstep(0.3, 1.1, length(px - p));
      float tw = (0.55 + 0.45 * sin(t * 11.0 + n * 1.7)) * sin(ph * 3.1416);
      vec3 hue = hash(vec2(n, 4.0)) > 0.5 ? vec3(0.55, 0.78, 1.0) : vec3(1.0, 0.62, 0.88);
      c = mix(c, hue * 1.15, near * tw);
    }
  }
  // Magic glows: an orb's insides swirl and its heart throbs, its halo breathes out and its
  // colour washes the room, lights dance round it on tilted orbits with short trails, and
  // arcs crackle off its rim, a step or two at a time.
  for (int i = 0; i < 4; i++) {
    if (float(i) >= orbCount) break;
    vec2 o = orbs[i].xy;
    float R = max(orbs[i].z, 2.0);
    vec3 oc = orbColours[i].rgb;
    vec2 rel = px - o;
    float dist = length(rel) / R;
    float fi = float(i);
    float beat = 0.5 + 0.5 * sin(t * 4.6 + fi) * (0.65 + 0.35 * sin(t * 1.3 + fi * 2.0));
    c *= 1.0 + oc * 0.35 * beat * exp(-dist / 5.0);
    if (dist > 7.0) continue;
    if (dist < 1.0) {
      float ang = (1.0 - dist) * (2.6 + 1.6 * sin(t * 0.9 + fi)) + t * 2.2;
      vec2 turned = vec2(cos(ang) * rel.x - sin(ang) * rel.y, sin(ang) * rel.x + cos(ang) * rel.y);
      vec3 inside = texture2D(picture, uvAt(o + turned * 0.92)).rgb;
      c = mix(c, inside, smoothstep(1.0, 0.7, dist));
      float vein = fbm(vec2(atan(rel.y, rel.x) * 2.0 + t * 1.5, dist * 4.0 - t * 2.5));
      c += mix(oc, vec3(1.0), 0.35) * (1.0 - dist) * (0.35 + 0.65 * beat) * (0.5 + vein);
    } else {
      c += oc * exp(-(dist - 1.0) * (1.9 - 0.8 * beat)) * (0.18 + 0.32 * beat);
    }
    for (int k = 0; k < 7; k++) {
      float n = float(k) + fi * 7.0;
      float orbit = R * (1.35 + 1.4 * hash(vec2(n, 4.0)));
      float speed = (0.7 + 0.9 * hash(vec2(n, 5.0))) * (hash(vec2(n, 6.0)) > 0.5 ? 1.0 : -1.0);
      float tilt = 0.25 + 0.45 * hash(vec2(n, 7.0));
      for (int j = 0; j < 3; j++) {
        float a = t * speed * 2.0 + hash(vec2(n, 8.0)) * 6.283 - float(j) * 0.14 * speed;
        vec2 p = o + vec2(cos(a) * orbit, sin(a) * orbit * tilt + sin(t * 3.1 + n) * R * 0.18);
        bool behind = sin(a) < 0.0 && length(p - o) < R;
        if (behind) continue;
        float twinkle = 0.55 + 0.45 * sin(t * 9.0 + n * 3.0);
        float near = 1.0 - smoothstep(0.35, 1.25, length(px - p));
        c += mix(oc, vec3(1.0), 0.6) * near * twinkle * (1.0 - float(j) * 0.38) * 1.2;
      }
    }
    for (int k = 0; k < 3; k++) {
      float n = float(k) + fi * 3.0;
      float clock = t * 2.6 + hash(vec2(n, 9.0));
      float lot = floor(clock);
      if (hash(vec2(n, lot)) < 0.45 || fract(clock) > 0.4) continue;
      float th = hash(vec2(lot, n + 11.0)) * 6.283;
      vec2 dir = vec2(cos(th), sin(th));
      vec2 side = vec2(-dir.y, dir.x);
      float reach = R * (0.9 + 1.1 * hash(vec2(lot, n + 12.0)));
      vec2 from = o + dir * R * 0.95;
      float arc = 0.0;
      for (int g = 0; g < 4; g++) {
        float a0 = float(g) / 4.0;
        float a1 = float(g + 1) / 4.0;
        vec2 p0 = from + dir * reach * a0 + side * (hash(vec2(lot + float(g), n)) - 0.5) * R * 0.5 * a0;
        vec2 p1 = from + dir * reach * a1 + side * (hash(vec2(lot + float(g) + 1.0, n)) - 0.5) * R * 0.5 * a1;
        vec2 e = p1 - p0;
        float h = clamp(dot(px - p0, e) / dot(e, e), 0.0, 1.0);
        arc = max(arc, 1.0 - smoothstep(0.3, 1.1, length(px - p0 - e * h)));
      }
      c += mix(oc, vec3(1.0), 0.7) * arc * 1.3;
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
    // The small fires, after the biggest, whose light has a channel of its own. When the
    // biggest is only a lamp (the air guild's), it flickers close round itself as they do.
    const first = room.data.fires[0];
    const hearth = first !== undefined && first[2] >= RES[0] * 0.03;
    const small = room.data.fires.slice(hearth ? 1 : 0, hearth ? 17 : 16);
    const fireAt = new Array<number>(64).fill(0);
    small.forEach((f, i) => fireAt.splice(i * 4, 4, f[0], f[1], f[2], 0));
    // What was marked by hand: boxes as vec4s.
    const boxes = (list: [number, number, number, number][] | undefined, most: number) => {
      const out = new Array<number>(most * 4).fill(0);
      (list ?? []).slice(0, most).forEach((b, i) => out.splice(i * 4, 4, ...b));
      return { at: out, count: Math.min(most, list?.length ?? 0) };
    };
    const clouds = boxes(room.data.clouds, 4);
    const vapours = boxes(room.data.vapours, 8);
    const mist = room.data.mists?.[0] ?? [-1, -1, -1, -1];
    const orbs = (room.data.orbs ?? []).slice(0, 4);
    const orbAt = new Array<number>(16).fill(0);
    const orbColour = new Array<number>(16).fill(0);
    orbs.forEach((o, i) => {
      orbAt.splice(i * 4, 4, o.at[0], o.at[1], o.r, 0);
      orbColour.splice(i * 4, 4, o.colour[0] / 255, o.colour[1] / 255, o.colour[2] / 255, 1);
    });
    const apply = wrapper.onApplyObservable.addOnce(() => {
      const e = wrapper.effect;
      e.setTexture('picture', room.picture);
      e.setTexture('lights', room.lights);
      e.setFloat('t', t);
      e.setFloat4('box', box[0]!, box[1]!, box[2]!, box[3]!);
      e.setFloat2('res', RES[0], RES[1]);
      e.setFloat3('sparks', sparks[0], sparks[1], sparks[2]);
      e.setArray4('fires', fireAt);
      e.setFloat('fireCount', small.length);
      e.setFloat('hearth', hearth ? 1 : 0);
      e.setFloat('moody', room.data.fires.length ? 0.26 : 0);
      e.setArray4('orbs', orbAt);
      e.setArray4('orbColours', orbColour);
      e.setFloat('orbCount', orbs.length);
      e.setArray4('clouds', clouds.at);
      e.setFloat('cloudCount', clouds.count);
      e.setFloat4('mist', mist[0], mist[1], mist[2], mist[3]);
      e.setArray4('vapours', vapours.at);
      e.setFloat('vapourCount', vapours.count);
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
      uniformNames: [
        't',
        'box',
        'res',
        'sparks',
        'fires',
        'fireCount',
        'hearth',
        'moody',
        'orbs',
        'orbColours',
        'orbCount',
        'clouds',
        'cloudCount',
        'mist',
        'vapours',
        'vapourCount',
      ],
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
