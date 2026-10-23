/**
 * The quest log and automap screens (Phase 5 step 10): the log as two lists, active and
 * done, each entry with its text and current objective; the map as a canvas of the current
 * level's visited cells with the party's cell and heading drawn on it, and the runtime's
 * marks (`ScreenHooks.marks`: people, quests, ways on) inked over them, walked or not; a tap
 * on a mark writes its name beside it. The map pinches, drags and double-taps, and three gold
 * ovals down the page's right edge zoom in, zoom out and find the party (map-view.ts); the
 * view is kept per level while the game runs.
 */
import './map.css';
import { appSize, toAppPoint } from '../app/orientation';
import type { GameState } from '../game/state';
import type { MapMark, ScreenContext } from './context';
import { button, el, heading, note } from './dom';
import {
  type MapView,
  mapView,
  markAt,
  type PlacedMark,
  placeMarks,
  type QuestRow,
  questRows,
} from './journal-model';
import {
  cameraTransform,
  type GestureResult,
  MapGestures,
  parseViews,
  partyCamera,
  reopenCamera,
  type SavedView,
  type Size,
  zoomLimits,
  zoomStep,
} from './map-view';
import { PX } from './pixel-text';

function questList(title: string, rows: QuestRow[], empty: string): HTMLElement {
  const col = el('div', 'ui-col scroll');
  // A heading over a rule (critics, round 7): MM6's knotwork banner is the owner's to
  // commission; a pill is not it.
  const head = heading(title);
  head.classList.add('ui-rule');
  col.appendChild(head);
  if (rows.length === 0) col.appendChild(note(empty));
  for (const q of rows) {
    const row = el('div', 'ui-row');
    if (q.done) row.classList.add('dim');
    const text = el('div', 'grow');
    text.appendChild(el('div', '', q.title));
    if (q.text) text.appendChild(el('div', 'sub', q.text));
    if (q.objective) text.appendChild(el('div', 'quest-objective', q.objective));
    row.appendChild(text);
    col.appendChild(row);
  }
  return col;
}

export function renderQuests(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  const rows = questRows(state.quests, hooks.questDefs ?? {});
  frame.body.replaceChildren(
    questList('Active', rows.active, 'No quests yet.'),
    questList('Completed', rows.done, 'Nothing completed yet.'),
  );
}

/** The map's size before its page is laid out (a screen drawn off the page, a test). */
const MAP_WIDTH = 720;
const MAP_HEIGHT = 300;
const DEG = Math.PI / 180;

/** The page's ink: the walked cells in sepia, the party in dark red, the marks in black. */
const INK = {
  cell: '#8a6a3a',
  party: '#8a2a1a',
  black: '#1c1208',
  red: '#a8200c',
  blue: '#2a2a6e',
  /** The page's own tone a pixel round each mark's ink, so it reads over the walked cells. */
  halo: 'rgb(200, 188, 170)',
};

/**
 * The marks as a cartographer inked them, one pixel a UI pixel, centred on the place: a
 * figure for a villager, a red pennant on its staff for a quest's giver or goal, a dark arch
 * for a way on. Letters are inks (`k` black, `r` red, `b` blue), stops are the page.
 */
const MARK_ART: Record<MapMark['kind'], readonly string[]> = {
  person: [
    '..kkk..',
    '..kkk..',
    '...k...',
    '.kkkkk.',
    'k.kkk.k',
    '..kkk..',
    '..k.k..',
    '..k.k..',
    '.kk.kk.',
  ],
  quest: [
    'krrrr..',
    'krrrrrr',
    'krrrr..',
    'k......',
    'k......',
    'k......',
    'k......',
    'k......',
    'kk.....',
  ],
  portal: [
    '...kkk...',
    '..kbbbk..',
    '.kbbbbbk.',
    '.kbbbbbk.',
    'kbbbbbbbk',
    'kbbbbbbbk',
    'kbbbbbbbk',
    'kbbbbbbbk',
    'kkkkkkkkk',
  ],
};
const MARK_INKS: Record<string, string> = { k: INK.black, r: INK.red, b: INK.blue };

/** How far from a mark, in map pixels, a tap still names it: a fingertip on the phone. */
const MARK_REACH = 14;

function drawMark(g: CanvasRenderingContext2D, m: PlacedMark): void {
  const art = MARK_ART[m.kind];
  const w = Math.max(...art.map((r) => r.length));
  const x0 = m.px - Math.floor(w / 2);
  const y0 = m.py - Math.floor(art.length / 2);
  // The page lifted a pixel round the ink, then the ink.
  g.fillStyle = INK.halo;
  art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') g.fillRect(x0 + x - 1, y0 + y - 1, 3, 3);
    }
  });
  art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ink = MARK_INKS[row[x]!];
      if (!ink) continue;
      g.fillStyle = ink;
      g.fillRect(x0 + x, y0 + y, 1, 1);
    }
  });
}

/** A ring of one-pixel ink round the mark a tap named. */
function drawRing(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  g.fillStyle = INK.red;
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1);
  }
}

/**
 * The party's arrowhead as whole pixels, centred on `(px, py)`, `r` pixels from its middle to
 * its tip: the pixels whose middles fall inside it, so it stays as crisp as the cells at
 * every zoom. Babylon's heading: forward is (sin yaw, cos yaw) on the ground, z down the page.
 */
function arrowPixels(px: number, py: number, r: number, yawDeg: number): [number, number][] {
  const dx = Math.sin(yawDeg * DEG);
  const dy = Math.cos(yawDeg * DEG);
  const k = r * 0.6;
  const tri: [number, number][] = [
    [px + dx * r, py + dy * r],
    [px - dy * k - dx * k, py + dx * k - dy * k],
    [px + dy * k - dx * k, py - dx * k - dy * k],
  ];
  const side = (a: [number, number], b: [number, number], x: number, y: number): number =>
    (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const xs = tri.map((p) => p[0]);
  const ys = tri.map((p) => p[1]);
  const out: [number, number][] = [];
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const s0 = side(tri[0]!, tri[1]!, x + 0.5, y + 0.5);
      const s1 = side(tri[1]!, tri[2]!, x + 0.5, y + 0.5);
      const s2 = side(tri[2]!, tri[0]!, x + 0.5, y + 0.5);
      if ((s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0)) out.push([x, y]);
    }
  }
  return out;
}

/** The arrowhead in `ink`, with a pixel of `halo` round it (the page's tone on the map). */
function drawArrow(
  g: CanvasRenderingContext2D,
  pixels: readonly [number, number][],
  ink: string,
  halo: string,
): void {
  g.fillStyle = halo;
  for (const [x, y] of pixels) g.fillRect(x - 1, y - 1, 3, 3);
  g.fillStyle = ink;
  for (const [x, y] of pixels) g.fillRect(x, y, 1, 1);
}

function drawMap(canvas: HTMLCanvasElement, v: MapView, picked: PlacedMark | null): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const { scale, offsetX, offsetY } = v.transform;
  g.clearRect(0, 0, canvas.width, canvas.height);
  // Ink on the page: the walked cells in sepia, a page-coloured pixel between them, on
  // whole pixels at every zoom; those off the page are skipped.
  g.fillStyle = INK.cell;
  const side = Math.max(1, scale - 1);
  for (const [cx, cy] of v.cells) {
    const x = offsetX + cx * scale;
    const y = offsetY + cy * scale;
    if (x + side <= 0 || y + side <= 0 || x >= canvas.width || y >= canvas.height) continue;
    g.fillRect(x, y, side, side);
  }
  // The marks over the cells, walked or not; the party over them.
  for (const m of v.marks) drawMark(g, m);
  if (picked) drawRing(g, picked.px, picked.py, 8);
  if (!v.party) return;
  const px = offsetX + (v.party.cx + 0.5) * scale;
  const py = offsetY + (v.party.cy + 0.5) * scale;
  // Four pixels to the tip at the whole level, a cell's width closer in, never past eight.
  const r = Math.max(4, Math.min(8, scale));
  drawArrow(g, arrowPixels(px, py, r, v.party.yawDeg), INK.party, INK.halo);
}

/**
 * The views the map was left at, by game and level (`<seed>:<level id>`), while the game
 * runs: here, and in the tab's session storage so a portal's reload keeps them. Storage can
 * be absent or throw (private mode); the page's own memory serves then.
 */
const VIEWS_KEY = 'ftb.map-views';
let views: Map<string, SavedView> | null = null;

function viewKey(state: GameState): string {
  return `${state.seed}:${state.level.id}`;
}

function savedView(key: string): SavedView | null {
  if (!views) {
    views = new Map();
    try {
      for (const [k, v] of Object.entries(parseViews(sessionStorage.getItem(VIEWS_KEY)))) {
        views.set(k, v);
      }
    } catch {
      // No storage: this page's memory only.
    }
  }
  return views.get(key) ?? null;
}

function keepView(key: string, view: SavedView): void {
  views ??= new Map();
  const was = views.get(key);
  if (was && JSON.stringify(was) === JSON.stringify(view)) return;
  views.set(key, view);
  try {
    sessionStorage.setItem(VIEWS_KEY, JSON.stringify(Object.fromEntries(views)));
  } catch {
    // No storage: kept for this page only.
  }
}

/** The find-the-party button's face: the map's own arrowhead, pointing up, outlined black. */
function partyGlyph(): HTMLCanvasElement {
  const c = el('canvas', 'map-tool-glyph');
  c.width = 13;
  c.height = 14;
  c.style.width = `${c.width * PX}px`;
  c.style.height = `${c.height * PX}px`;
  const g = c.getContext('2d');
  if (g) drawArrow(g, arrowPixels(6.5, 7, 6, 180), INK.party, INK.black);
  return c;
}

export function renderMap(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  const col = el('div', 'ui-col map-col');
  const level = state.automap.levels[state.level.id];
  const marks = hooks.marks?.() ?? [];
  // The cells walked and the party's cell: the world stands still while the book is open.
  const base = mapView(state, MAP_WIDTH, MAP_HEIGHT, marks);
  if (!level || !base) {
    col.appendChild(note('No map of this place yet.'));
    frame.body.replaceChildren(col);
    return;
  }
  const partyCell = base.party ? { cx: base.party.cx, cy: base.party.cy } : null;
  const grid: Size = { width: level.width, height: level.height };
  const key = viewKey(state);
  // The page the map is inked on fills the column beside its tools; the canvas is its size in
  // whole pixels, so the map fits the frame whatever the phone's insets leave (MM6 clips
  // nothing).
  const spread = el('div', 'map-page');
  const sheet = el('div', 'map-sheet');
  const canvas = el('canvas', 'map-canvas');
  // A tapped mark's name, written beside it on the page in the book's ink.
  const label = el('div', 'map-label');
  label.hidden = true;
  sheet.append(canvas, label);
  // MM6's automap zoomed with buttons: + and − on small gold ovals, and the party's own
  // arrowhead to bring the page back to it.
  const tools = el('div', 'map-tools');
  const zoomIn = button('+', () => step(1), { className: 'map-tool map-in' });
  const zoomOut = button('−', () => step(-1), { className: 'map-tool map-out' });
  const toParty = button('', () => findParty(), { className: 'map-tool map-party' });
  zoomIn.title = 'Zoom in';
  zoomOut.title = 'Zoom out';
  toParty.title = 'The party';
  for (const b of [zoomIn, zoomOut, toParty]) b.setAttribute('aria-label', b.title);
  toParty.appendChild(partyGlyph());
  toParty.disabled = !partyCell;
  tools.append(zoomIn, zoomOut, toParty);
  spread.append(sheet, tools);
  col.append(spread);
  frame.body.replaceChildren(col);

  // Made at the page's first size; made again once it is laid out (before then the screen
  // is built off the page at a stand-in size).
  let gestures: MapGestures | null = null;
  let laidOut = false;
  let placed: PlacedMark[] = [];
  let picked: PlacedMark | null = null;
  const size = (): [number, number, boolean] => {
    const w = Math.floor(sheet.clientWidth / PX);
    const h = Math.floor(sheet.clientHeight / PX);
    return w >= 16 && h >= 16 ? [w, h, true] : [MAP_WIDTH, MAP_HEIGHT, false];
  };
  const page = (): Size => ({ width: canvas.width, height: canvas.height });
  const same = (a: MapMark, b: MapMark | null): boolean =>
    !!b && a.x === b.x && a.z === b.z && a.kind === b.kind && a.label === b.label;
  const showLabel = (): void => {
    // Put away while its mark is off the page.
    const p = picked;
    if (!p || p.px < 0 || p.py < 0 || p.px >= canvas.width || p.py >= canvas.height) {
      label.hidden = true;
      return;
    }
    // Beside the mark, on the side with the more page, its line centred on the mark.
    const right = p.px <= canvas.width / 2;
    label.classList.toggle('left', !right);
    label.style.left = `${(right ? p.px + 11 : p.px - 11) * PX}px`;
    // Kept on the page at its top and foot (a line is twenty-four pixels).
    const top = Math.max(0, Math.min(canvas.height - 24, p.py - 12));
    label.style.top = `${top * PX}px`;
    label.textContent = p.label;
    label.hidden = false;
  };
  const draw = (): void => {
    const [w, h, real] = size();
    const resized = canvas.width !== w || canvas.height !== h;
    if (resized) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * PX}px`;
      canvas.style.height = `${h * PX}px`;
    }
    if (!gestures || (real && !laidOut)) {
      const at = reopenCamera(savedView(key), grid, page(), partyCell);
      gestures = new MapGestures(at, grid, page(), partyCell);
      laidOut = real;
    } else if (resized) {
      gestures.resize(page());
    }
    const cam = gestures.camera;
    const transform = cameraTransform(cam, page());
    placed = placeMarks(level, transform, marks);
    // A mark named before the view moved is found again at its new place.
    const was = picked;
    picked = was ? (placed.find((m) => same(m, was)) ?? null) : null;
    drawMap(canvas, { ...base, transform, marks: placed }, picked);
    showLabel();
    const { min, max } = zoomLimits(grid, page());
    zoomIn.disabled = cam.scale >= max;
    zoomOut.disabled = cam.scale <= min;
    // Kept once a gesture is over, at the laid-out page's size.
    if (laidOut && !gestures.active) keepView(key, { camera: { ...cam }, party: partyCell });
  };
  // A finger's moves are drawn once a frame.
  let queued = 0;
  const redraw = (): void => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      draw();
    });
  };
  const step = (dir: 1 | -1): void => {
    if (!gestures) return;
    gestures.set(zoomStep(gestures.camera, grid, page(), dir));
    draw();
  };
  const findParty = (): void => {
    if (!gestures || !partyCell) return;
    gestures.set(partyCamera(gestures.camera, grid, page(), partyCell));
    draw();
  };
  /** What a pointer did; `lifted` when a finger came up, so the view at rest is kept. */
  const result = (r: GestureResult, lifted = false): void => {
    if (r.kind === 'view') {
      redraw();
    } else if (r.kind === 'tap') {
      const hit = markAt(placed, r.x, r.y, MARK_REACH);
      // A second tap on the same mark, or a tap on bare page, puts the name away.
      picked = hit && !same(hit, picked) ? hit : null;
      draw();
    } else if (r.kind === 'double' || lifted) {
      draw();
    }
  };
  // A pointer on the page in its own pixels, the forced landscape's rotation undone.
  const local = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    const [x, y] = toAppPoint(e.clientX, e.clientY, r);
    const [w, h] = appSize(r);
    return [w > 0 ? (x * canvas.width) / w : x, h > 0 ? (y * canvas.height) / h : y];
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!gestures || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // A pointer already gone.
    }
    const [x, y] = local(e);
    result(gestures.down(e.pointerId, x, y));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!gestures) return;
    const [x, y] = local(e);
    result(gestures.move(e.pointerId, x, y));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (gestures) result(gestures.up(e.pointerId, e.timeStamp), true);
  });
  canvas.addEventListener('pointercancel', (e) => {
    if (gestures) result(gestures.cancel(e.pointerId), true);
  });
  // The page's touches are the map's: no scroll and no page zoom behind it (main.ts lets a
  // canvas's own touches through; the canvas's `touch-action` is none too).
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  draw();
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => {
      if (!frame.root.isConnected) {
        observer.disconnect();
        return;
      }
      draw();
    });
    observer.observe(sheet);
  }
}
