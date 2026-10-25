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
  /** Whether the biggest fire is a hearth's or a brazier's (tools/lib/room.ts). */
  hearth?: boolean;
  /**
   * Marked by hand (pipeline/rooms.json, tools/lib/room.ts `RoomMarks`): boxes in picture
   * pixels (x from, y from, x to, y to), a ring and a disc as middle and radii.
   */
  clouds?: Quad[];
  mists?: Quad[];
  vapours?: Quad[];
  smokes?: Quad[];
  pillars?: Quad[];
  glass?: Quad[];
  shines?: Quad[];
  falls?: Quad[];
  sprays?: Quad[];
  ripples?: Quad[];
  jets?: Quad[];
  waters?: Quad[];
  rocks?: Quad[];
  rings?: Quad[];
  discs?: Quad[];
  glints?: Quad[];
  beams?: Quad[];
}

type Quad = [number, number, number, number];

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
/** Each marked kind's array in the shader and the uniform counting it. */
const COUNTS: Record<string, string> = {
  clouds: 'cloudCount',
  vapours: 'vapourCount',
  pillars: 'pillarCount',
  glass: 'glassCount',
  shines: 'shineCount',
  falls: 'fallCount',
  sprays: 'sprayCount',
  ripples: 'rippleCount',
  jets: 'jetCount',
  waters: 'waterCount',
  rocks: 'rockCount',
  glints: 'glintCount',
  beams: 'beamCount',
};

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
uniform float hearth;     // 1 when the biggest fire is a hearth's or a brazier's
uniform float moody;      // how much darker the room is away from its fires: none without one
uniform vec4 orbs[4];     // a magic glow's middle and radius, picture pixels
uniform vec4 orbColours[4];
uniform float orbCount;
// What was marked by hand (pipeline/rooms.json): boxes in picture pixels, x from, y from, x
// to, y to, and a count of each.
uniform vec4 clouds[4];
uniform float cloudCount;
uniform vec4 mist;        // x from below zero for none
uniform vec4 vapours[8];
uniform float vapourCount;
uniform float smoky;      // 1 when the columns are dark smoke with sparks of every colour
uniform vec4 pillars[2];
uniform float pillarCount;
uniform vec4 glass[8];
uniform float glassCount;
uniform float glassStyle; // 0 lit by fire, 1 by water's light
uniform vec4 shines[4];
uniform float shineCount;
uniform vec4 falls[2];
uniform float fallCount;
uniform vec4 sprays[2];
uniform float sprayCount;
uniform vec4 ripples[2];
uniform float rippleCount;
uniform vec4 jets[2];
uniform float jetCount;
uniform vec4 waters[2];
uniform float waterCount;
uniform vec4 rocks[6];
uniform float rockCount;
uniform vec4 ring;        // a ring of crystals: middle, inner and outer radius, x below zero for none
uniform vec4 disc;        // a turning disc: middle and radius
uniform vec4 glints[8];
uniform float glintCount;
uniform vec4 beams[2];
uniform float beamCount;

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
vec3 pic(vec2 p) { return texture2D(picture, uvAt(p)).rgb; }
float luma(vec3 c) { return dot(c, vec3(0.3, 0.55, 0.15)); }
vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
bool inside(vec2 p, vec4 b) { return p.x >= b.x && p.x <= b.z && p.y >= b.y && p.y <= b.w; }
// Where a box of the picture is and how far in, softly: 0 outside, 1 well inside.
float within(vec2 uv, vec2 edge) {
  return smoothstep(0.0, edge.x, uv.x) * smoothstep(1.0, 1.0 - edge.x, uv.x)
    * smoothstep(0.0, edge.y, uv.y) * smoothstep(1.0, 1.0 - edge.y, uv.y);
}
// The paint drawn from further along a flow, two layers half a cycle apart, each fading out
// as it starts over, so the flow never jumps.
vec3 flow(vec2 p, vec2 along, float period, float seed, vec4 b) {
  float run = t / period + seed;
  float p1 = fract(run);
  float p2 = fract(run + 0.5);
  vec3 a1 = pic(clamp(p + along * p1, b.xy, b.zw));
  vec3 a2 = pic(clamp(p + along * p2, b.xy, b.zw));
  return mix(a1, a2, abs(2.0 * p1 - 1.0));
}
// A crystal's paint: pale on every channel, as no cloth, gold or stone is.
float crystal(vec3 c) { return smoothstep(0.5, 0.72, min(c.r, min(c.g, c.b))); }
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
// How far into a pillar of fire's flames p is.
float pillarAt(vec2 p, float flame) {
  float w = 0.0;
  for (int i = 0; i < 2; i++) {
    if (float(i) >= pillarCount) break;
    vec4 b = pillars[i];
    if (!inside(p, b)) continue;
    w = max(w, within((p - b.xy) / (b.zw - b.xy), vec2(0.12, 0.04)) * smoothstep(0.08, 0.5, flame));
  }
  return w;
}
// The paint at p, moved where a marked thing moves it.
vec3 paint(vec2 p, float flame) {
  // A disc turning on the wall: its paint turned round its middle.
  if (disc.x >= 0.0) {
    vec2 d = p - disc.xy;
    float r = length(d);
    if (r < disc.z) return mix(pic(disc.xy + rot(d, t * 0.2)), pic(p), smoothstep(disc.z - 3.0, disc.z, r));
  }
  // A ring of eight crystals turning: each crystal's wedge of the ring painted out with the
  // cloth from between two crystals, and painted in again, outline and all, where the ring has
  // carried it, catching the light as it goes.
  if (ring.x >= 0.0) {
    vec2 d = p - ring.xy;
    float r = length(d);
    if (r > ring.z - 3.0 && r < ring.w + 1.0) {
      // The crystals on the square's diagonals reach less far out than those on its axes, the
      // knotwork of its corners standing past them.
      float step8 = 0.7854;
      float ahere = atan(d.y, d.x);
      float off = abs(mod(ahere + step8 * 0.5, step8) - step8 * 0.5);
      float diag = mod(floor(ahere / step8 + 0.5), 2.0);
      float outer = ring.w * (1.0 - 0.14 * diag);
      float band = smoothstep(ring.z - 3.0, ring.z, r) * (1.0 - smoothstep(outer - 2.0, outer + 1.0, r));
      float wedge = (1.0 - smoothstep(0.17, 0.23, off)) * band;
      vec3 base = mix(pic(p), pic(ring.xy + rot(d, step8 * 0.5)), wedge);
      float spin = t * 0.25;
      vec2 back = rot(d, -spin);
      float athere = atan(back.y, back.x);
      float off2 = abs(mod(athere + step8 * 0.5, step8) - step8 * 0.5);
      float outer2 = ring.w * (1.0 - 0.14 * mod(floor(athere / step8 + 0.5), 2.0));
      float band2 = smoothstep(ring.z - 3.0, ring.z, r) * (1.0 - smoothstep(outer2 - 2.0, outer2 + 1.0, r));
      float on = (1.0 - smoothstep(0.17, 0.23, off2)) * band2;
      vec3 there = pic(ring.xy + back);
      float gleam = 0.1 + 0.12 * sin(t * 2.2 + athere * 2.0);
      return mix(base, there * (1.0 + gleam * crystal(there)), on);
    }
  }
  // A rock floating: lifted and tilted where it hangs, the wall behind it read from above and
  // below its box, and the picture again past the box.
  for (int i = 0; i < 6; i++) {
    if (float(i) >= rockCount) break;
    vec4 b = rocks[i];
    vec4 e = b + vec4(-4.0, -4.0, 4.0, 4.0);
    if (!inside(p, e)) continue;
    float fi = float(i);
    vec2 mid = (b.xy + b.zw) * 0.5;
    vec2 off = vec2(sin(t * 0.6 + fi * 1.9) * 1.0, sin(t * 0.85 + fi * 2.7) * 2.6);
    float tilt = sin(t * 0.5 + fi * 1.3) * 0.06;
    vec2 q = mid + rot(p - mid - off, -tilt);
    float v = clamp((p.y - e.y) / (e.w - e.y), 0.0, 1.0);
    vec3 wall = mix(pic(vec2(p.x, e.y)), pic(vec2(p.x, e.w)), v);
    float vq = clamp((q.y - e.y) / (e.w - e.y), 0.0, 1.0);
    vec3 wallq = mix(pic(vec2(q.x, e.y)), pic(vec2(q.x, e.w)), vq);
    vec3 src = pic(q);
    float rock = (inside(q, b) ? 1.0 : 0.0) * smoothstep(0.06, 0.16, length(src - wallq));
    vec3 moved = mix(wall, src, rock);
    float inner = within((p - e.xy) / (e.zw - e.xy), vec2(4.0 / (e.z - e.x), 4.0 / (e.w - e.y)));
    return mix(pic(p), moved, inner);
  }
  // A pillar of fire: its flames climb fast and wrestle, and round them the air shimmers.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= pillarCount) break;
    vec4 b = pillars[i];
    if (!inside(p, b)) continue;
    vec2 uv = (p - b.xy) / (b.zw - b.xy);
    float w = within(uv, vec2(0.12, 0.04)) * smoothstep(0.08, 0.5, flame);
    float fi = float(i);
    float tx = (fbm(vec2(p.y / 7.0 + t * 3.5, p.x / 11.0 + fi * 5.0)) - 0.5) * 7.0 * w * (1.2 - uv.y);
    float haze = (1.0 - w) * within(uv, vec2(0.06, 0.06)) * sin(p.y / 2.5 - t * 9.0 + p.x / 6.0) * 0.6;
    // The climb dies away toward the flames' foot, so the brazier under them is never drawn up.
    float climb = (b.w - b.y) * 0.22 * w * (1.0 - smoothstep(0.6, 0.95, uv.y));
    return flow(vec2(p.x + tx + haze, p.y), vec2(0.0, climb), 0.7, fi * 0.31, b);
  }
  // A fountain's jet rises.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= jetCount) break;
    vec4 b = jets[i];
    if (!inside(p, b)) continue;
    float w = within((p - b.xy) / (b.zw - b.xy), vec2(0.15, 0.04));
    float wob = sin(p.y / 2.0 - t * 8.0) * 0.4 * w;
    return flow(vec2(p.x + wob, p.y), vec2(0.0, (b.w - b.y) * 0.35 * w), 0.45, float(i) * 0.5, b);
  }
  // Water falls, its sheet drawn from higher up and quivering.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= fallCount) break;
    vec4 b = falls[i];
    if (!inside(p, b)) continue;
    float w = within((p - b.xy) / (b.zw - b.xy), vec2(0.1, 0.03));
    float wob = sin(p.y / 3.0 + t * 5.0 + float(i)) * 0.4 * w;
    return flow(vec2(p.x + wob, p.y), vec2(0.0, -(b.w - b.y) * 0.3 * w), 0.55, float(i) * 0.43, b);
  }
  // A still water's face: rings spread from the middle where the water lands.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= rippleCount) break;
    vec4 b = ripples[i];
    if (!inside(p, b)) continue;
    vec2 uv = (p - b.xy) / (b.zw - b.xy) - 0.5;
    float r = length(uv * 2.0);
    if (r >= 1.0) continue;
    float wave = sin(r * 18.0 - t * 4.0 + float(i));
    float fade = (1.0 - r) * smoothstep(0.0, 0.15, r);
    vec3 col = pic(p + normalize(uv + 0.0001) * wave * 0.8 * fade);
    return col + vec3(0.7, 0.85, 1.0) * smoothstep(0.85, 1.0, wave) * 0.14 * fade;
  }
  // Water flowing down a channel toward the viewer, faster as it nears: only the water's own
  // blue-green paint flows, the marble rims stand.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= waterCount) break;
    vec4 b = waters[i];
    if (!inside(p, b)) continue;
    vec2 uv = (p - b.xy) / (b.zw - b.xy);
    vec3 here = pic(p);
    float wet = smoothstep(-0.02, 0.06, (here.g + here.b) * 0.5 - here.r) * (1.0 - smoothstep(0.6, 0.8, luma(here)));
    float wob = sin(p.y / 3.0 + t * 2.5) * 0.5;
    vec3 moved = flow(vec2(p.x + wob, p.y), vec2(0.0, -7.0 * (0.3 + uv.y)), 1.6, float(i) * 0.2, b);
    return mix(here, moved, wet * within(uv, vec2(0.02, 0.04)));
  }
  // A column of vapour or smoke: its paint drawn from lower down and swaying, so the twist
  // climbs, as a turning helix does.
  for (int i = 0; i < 8; i++) {
    if (float(i) >= vapourCount) break;
    vec4 b = vapours[i];
    if (!inside(p, b)) continue;
    vec2 uv = (p - b.xy) / (b.zw - b.xy);
    float w = within(uv, vec2(0.2, 0.25));
    float fi = float(i);
    float sway = sin(uv.y * 9.0 - t * 2.0 + fi) * (b.z - b.x) * 0.03 * w;
    return flow(vec2(p.x + sway, p.y), vec2(0.0, (b.w - b.y) * 0.15 * w), 3.2, fi * 0.37, b);
  }
  return pic(p);
}
// A spray of drops thrown up and out from base, falling back: how much of one is at p.
float drops(vec2 p, vec2 base, float wd, float hg, float seed) {
  float a = 0.0;
  for (int k = 0; k < 18; k++) {
    float n = float(k) + seed * 18.0;
    float per = 0.7 + hash(vec2(n, 1.0)) * 0.6;
    float clk = t / per + hash(vec2(n, 2.0));
    float ph = fract(clk);
    float side = hash(vec2(n, floor(clk))) * 2.0 - 1.0;
    vec2 at = base + vec2(side * wd * 0.55 * ph, -hg * (0.5 + 0.6 * hash(vec2(n, 3.0))) * ph + hg * 1.3 * ph * ph);
    a = max(a, (1.0 - smoothstep(0.25, 0.9, length(p - at))) * (1.0 - ph));
  }
  return a;
}
// The colours of dark magic's sparks.
vec3 darkHue(float h) {
  return h < 0.25 ? vec3(0.3, 1.0, 0.45) : h < 0.5 ? vec3(0.72, 0.35, 1.0)
    : h < 0.7 ? vec3(1.0, 0.3, 0.85) : h < 0.88 ? vec3(0.3, 0.95, 1.0) : vec3(1.0, 0.85, 0.3);
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
  // A pillar of fire licks in its own way, below.
  float pw = pillarAt(px, m.r);
  float flame = m.r * (1.0 - step(0.001, pw));

  // Flames: licks of light rise through the painted flame, and the paint is drawn from a
  // little below, wavering, so the tongues climb and sway.
  float lick = fbm(vec2(px.x / 4.0, px.y / 3.0 + t * 7.0));
  float sway = noise(vec2(px.y / 3.0, t * 6.0)) - 0.5;
  vec2 d = vec2(sway * 1.6, (lick - 0.25) * 3.2) * flame;
  vec3 c = paint(px + d - cloudShift(px), m.r);
  // Firelight brightens by adding warm light and dims by losing its yellow first, as a flame
  // cools to orange: a yellow scaled up evenly goes green, scaled down evenly olive.
  vec3 fire = vec3(1.0, 0.5, 0.12);
  vec3 cool = vec3(0.45, 1.0, 1.4);
  float v = flame * (0.9 * (lick - 0.45) + 0.12 * flick(t, 1.0));
  c = v > 0.0 ? c + fire * v * 0.7 : c * max(vec3(0.0), 1.0 + v * cool);
  // In a pillar of fire, broad licks race up the column, brightening as warm light and
  // dimming as the yellow goes first.
  float lick2 = (fbm(vec2(px.x / 6.0, px.y / 5.0 + t * 10.0)) - 0.45) * 0.5 * pw;
  c = lick2 > 0.0 ? c + fire * lick2 : c * max(vec3(0.0), 1.0 + lick2 * cool);
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
  float pale = 1.0 - 0.8 * smoothstep(0.5, 0.85, luma(c));
  big *= pale;
  near *= pale;
  c += fire * (big * 0.07 + near * 0.05) * (0.4 + c);
  float room = big * 0.3 + near * 0.2;
  c *= room > 0.0 ? 1.0 + room * vec3(1.0, 0.75, 0.5) : 1.0 + room * vec3(0.7, 1.0, 1.1);
  // Panes of coloured glass lit from behind: by the fire, each pane brightening and dimming
  // as one, or by water's light, faint bright threads drifting over it.
  for (int i = 0; i < 8; i++) {
    if (float(i) >= glassCount) break;
    vec4 b = glass[i];
    if (!inside(px, b)) continue;
    float w = within((px - b.xy) / (b.zw - b.xy), vec2(0.04, 0.02));
    if (glassStyle < 0.5) {
      float k = flick(t * 0.8, float(i) * 1.9) * 0.08 + 0.03 * sin(t * 1.3 + float(i));
      c *= 1.0 + k * w * vec3(1.0, 0.8, 0.6);
    } else {
      float threads = abs(sin(px.x / 5.0 + sin(px.y / 7.0 + t * 0.9) * 1.6 + t * 0.6)) * abs(sin(px.y / 6.0 + sin(px.x / 8.0 - t * 0.7) * 1.4));
      c *= 1.0 + smoothstep(0.75, 1.0, 1.0 - threads) * 0.1 * w * vec3(0.6, 1.0, 1.0);
    }
  }
  // A polished floor: its reflections of the fires flicker with them.
  for (int i = 0; i < 4; i++) {
    if (float(i) >= shineCount) break;
    vec4 b = shines[i];
    if (!inside(px, b)) continue;
    float w = within((px - b.xy) / (b.zw - b.xy), vec2(0.02, 0.03)) * smoothstep(0.3, 0.65, luma(c));
    float k = hearth > 0.5 ? flick(t, 0.0) : flick(t * 1.3, float(i) * 2.0);
    c *= 1.0 + k * 0.1 * w;
  }
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
  // Embers fly up out of a pillar of fire and off its sides, yellow cooling to red.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= pillarCount) break;
    vec4 b = pillars[i];
    float wd = b.z - b.x;
    float hg = b.w - b.y;
    if (!inside(px, b + vec4(-wd * 0.3, -hg * 0.2, wd * 0.3, 0.0))) continue;
    for (int k = 0; k < 18; k++) {
      float n = float(k) + float(i) * 18.0;
      float per = 0.9 + hash(vec2(n, 1.0)) * 1.1;
      float clk = t / per + hash(vec2(n, 2.0));
      float ph = fract(clk);
      float lot = floor(clk);
      vec2 start = vec2(mix(b.x + wd * 0.25, b.z - wd * 0.25, hash(vec2(lot, n))), b.w - hg * (0.1 + 0.5 * hash(vec2(n, lot + 1.0))));
      vec2 at = start + vec2(sin(ph * 6.0 + n) * wd * 0.12 + (hash(vec2(n, 4.0)) - 0.5) * wd * 0.6 * ph, -ph * hg * (0.6 + 0.5 * hash(vec2(n, 3.0))));
      float near = 1.0 - smoothstep(0.3, 1.1, length(px - at));
      c += mix(vec3(1.0, 0.9, 0.5), vec3(1.0, 0.35, 0.08), ph) * near * (1.0 - ph) * 1.5;
    }
  }
  // Falling water: bright streaks run down the sheet.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= fallCount) break;
    vec4 b = falls[i];
    if (!inside(px, b)) continue;
    float w = within((px - b.xy) / (b.zw - b.xy), vec2(0.1, 0.03));
    float streak = smoothstep(0.75, 1.0, noise(vec2(px.x / 1.3, px.y / 14.0 - t * 7.0)));
    c += vec3(0.65, 0.82, 1.0) * streak * 0.35 * w;
  }
  // Where water lands: mist rolls up and out, and drops leap and fall back.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= sprayCount) break;
    vec4 b = sprays[i];
    if (!inside(px, b)) continue;
    vec2 uv = (px - b.xy) / (b.zw - b.xy);
    float puff = fbm(vec2(px.x / 9.0 + sin(t * 0.4 + float(i)), px.y / 6.0 + t * 0.7));
    c = mix(c, vec3(0.78, 0.88, 0.97), smoothstep(0.5, 0.82, puff) * within(uv, vec2(0.25, 0.3)) * 0.38);
    float wd = b.z - b.x;
    float hg = b.w - b.y;
    c = mix(c, vec3(0.85, 0.93, 1.0), drops(px, vec2((b.x + b.z) * 0.5, b.w - hg * 0.25), wd, hg, float(i)) * 0.9);
  }
  // A fountain's jet breaks into drops at its top that fall back round it.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= jetCount) break;
    vec4 b = jets[i];
    float wd = b.z - b.x;
    float hg = b.w - b.y;
    if (!inside(px, b + vec4(-wd * 1.5, -hg * 0.3, wd * 1.5, 0.0))) continue;
    c = mix(c, vec3(0.88, 0.95, 1.0), drops(px, vec2((b.x + b.z) * 0.5, b.y + hg * 0.08), wd * 2.5, hg * 0.5, float(i) + 3.0) * 0.85);
  }
  // Glints on flowing water.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= waterCount) break;
    vec4 b = waters[i];
    if (!inside(px, b)) continue;
    vec3 here = pic(px);
    float wet = smoothstep(-0.02, 0.06, (here.g + here.b) * 0.5 - here.r);
    float g = smoothstep(0.9, 1.0, noise(vec2(px.x / 1.2 + t * 0.3, px.y / 1.6 - t * 2.2)));
    c += vec3(0.85, 0.95, 1.0) * g * wet * 0.45;
  }
  // Wisps of mist drift through between the clouds.
  if (mist.x >= 0.0 && inside(px, mist)) {
    vec2 uv = (px - mist.xy) / (mist.zw - mist.xy);
    float wisp = fbm(vec2(px.x / 26.0 - t * 0.22, px.y / 5.0 + sin(px.x / 40.0 + t * 0.3) * 0.6));
    c = mix(c, vec3(0.82, 0.86, 0.95), smoothstep(0.52, 0.78, wisp) * within(uv, vec2(0.18, 0.1)) * 0.32);
  }
  // Sparks climb each column on its twist, twinkling: light's pale blue and pink, or in dark
  // smoke sparks of every colour, brighter, haloed, some flung out of the column.
  for (int i = 0; i < 8; i++) {
    if (float(i) >= vapourCount) break;
    vec4 b = vapours[i];
    float wd = b.z - b.x;
    float hg = b.w - b.y;
    if (!inside(px, b + vec4(-wd * 0.3, 0.0, wd * 0.3, 0.0))) continue;
    for (int k = 0; k < 24; k++) {
      if (smoky < 0.5 && k >= 10) break;
      float n = float(k) + float(i) * 24.0;
      float ph = fract(t / (2.5 + hash(vec2(n, 1.0)) * 2.0) + hash(vec2(n, 2.0)));
      float turn = ph * 9.4 + hash(vec2(n, 3.0)) * 6.283;
      if (cos(turn) < -0.4) continue;
      float out_ = smoky > 0.5 && hash(vec2(n, 5.0)) > 0.7 ? (hash(vec2(n, 6.0)) - 0.5) * wd * 0.7 * ph : 0.0;
      vec2 at = vec2(b.x + wd * (0.5 + 0.36 * sin(turn)) + out_, b.w - ph * hg);
      float dist = length(px - at);
      float near = 1.0 - smoothstep(0.3, 1.1, dist);
      float tw = (0.55 + 0.45 * sin(t * 11.0 + n * 1.7)) * sin(ph * 3.1416);
      if (smoky > 0.5) {
        // Each dark spark shifts its colour as it climbs, its halo wide.
        vec3 hue = darkHue(fract(hash(vec2(n, 4.0)) + ph * 0.35));
        float core = 1.0 - smoothstep(0.4, 1.4, dist);
        c += hue * (core * 1.6 + exp(-dist * 0.7) * 0.45) * tw;
      } else {
        vec3 hue = hash(vec2(n, 4.0)) > 0.5 ? vec3(0.55, 0.78, 1.0) : vec3(1.0, 0.62, 0.88);
        c = mix(c, hue * 1.15, near * tw);
      }
    }
  }
  // Dust drifts and glitters in a shaft of light.
  for (int i = 0; i < 2; i++) {
    if (float(i) >= beamCount) break;
    vec4 b = beams[i];
    if (!inside(px, b + vec4(-3.0, 0.0, 3.0, 0.0))) continue;
    for (int k = 0; k < 14; k++) {
      float n = float(k) + float(i) * 14.0;
      float fall = t * (0.01 + 0.015 * hash(vec2(n, 3.0))) + hash(vec2(n, 2.0));
      vec2 at = b.xy + (b.zw - b.xy) * vec2(fract(hash(vec2(n, 1.0)) + 0.05 * sin(t * 0.3 + n)), fract(fall));
      float fade = sin(fract(fall) * 3.1416);
      float tw = 0.5 + 0.5 * sin(t * 2.0 + n * 1.3);
      c += vec3(1.0, 0.98, 0.92) * (1.0 - smoothstep(0.2, 0.8, length(px - at))) * tw * fade * 0.5;
    }
  }
  // Glints: a star twinkles now and then on the brightest paint of a box, a crystal's face or
  // a polished orb's highlight.
  for (int i = 0; i < 8; i++) {
    if (float(i) >= glintCount) break;
    vec4 b = glints[i];
    if (!inside(px, b + vec4(-4.0, -4.0, 4.0, 4.0))) continue;
    vec2 best = (b.xy + b.zw) * 0.5;
    float most = -1.0;
    for (int gx = 0; gx < 5; gx++) {
      for (int gy = 0; gy < 4; gy++) {
        vec2 at = mix(b.xy, b.zw, vec2((float(gx) + 0.5) / 5.0, (float(gy) + 0.5) / 4.0));
        float l = luma(pic(at));
        if (l > most) { most = l; best = at; }
      }
    }
    float fi = float(i);
    float per = 1.8 + hash(vec2(fi, 1.0)) * 1.6;
    float ph = fract(t / per + hash(vec2(fi, 2.0)));
    float life = ph < 0.35 ? sin(ph / 0.35 * 3.1416) : 0.0;
    vec2 dd = abs(rot(px - best, t * 0.8));
    float star = (1.0 - smoothstep(0.0, 0.6, dd.y)) * (1.0 - smoothstep(0.0, 3.5 * life + 0.01, dd.x))
      + (1.0 - smoothstep(0.0, 0.6, dd.x)) * (1.0 - smoothstep(0.0, 3.5 * life + 0.01, dd.y));
    c += vec3(1.0, 0.97, 0.9) * min(star, 1.0) * life * 0.9;
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
    const hearth = room.data.hearth ?? (first !== undefined && first[2] >= RES[0] * 0.03);
    const small = room.data.fires.slice(hearth ? 1 : 0, hearth ? 17 : 16);
    const fireAt = new Array<number>(64).fill(0);
    small.forEach((f, i) => fireAt.splice(i * 4, 4, f[0], f[1], f[2], 0));
    // What was marked by hand: boxes as vec4s.
    const boxes = (list: Quad[] | undefined, most: number) => {
      const out = new Array<number>(most * 4).fill(0);
      (list ?? []).slice(0, most).forEach((b, i) => out.splice(i * 4, 4, ...b));
      return { at: out, count: Math.min(most, list?.length ?? 0) };
    };
    const d = room.data;
    const marked: Record<string, { at: number[]; count: number }> = {
      clouds: boxes(d.clouds, 4),
      vapours: boxes(d.smokes ?? d.vapours, 8),
      pillars: boxes(d.pillars, 2),
      glass: boxes(d.glass, 8),
      shines: boxes(d.shines, 4),
      falls: boxes(d.falls, 2),
      sprays: boxes(d.sprays, 2),
      ripples: boxes(d.ripples, 2),
      jets: boxes(d.jets, 2),
      waters: boxes(d.waters, 2),
      rocks: boxes(d.rocks, 6),
      glints: boxes(d.glints, 8),
      beams: boxes(d.beams, 2),
    };
    const none: Quad = [-1, -1, -1, -1];
    const mist = d.mists?.[0] ?? none;
    const ring = d.rings?.[0] ?? none;
    const disc = d.discs?.[0] ?? none;
    // Glass lit by water's light where water falls, else by the fire.
    const glassStyle = d.falls?.length && !d.pillars?.length ? 1 : 0;
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
      for (const [name, list] of Object.entries(marked)) {
        e.setArray4(name, list.at);
        e.setFloat(COUNTS[name]!, list.count);
      }
      e.setFloat4('mist', mist[0], mist[1], mist[2], mist[3]);
      e.setFloat4('ring', ring[0], ring[1], ring[2], ring[3]);
      e.setFloat4('disc', disc[0], disc[1], disc[2], disc[3]);
      e.setFloat('smoky', d.smokes?.length ? 1 : 0);
      e.setFloat('glassStyle', glassStyle);
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
        ...Object.entries(COUNTS).flat(),
        'mist',
        'ring',
        'disc',
        'smoky',
        'glassStyle',
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
