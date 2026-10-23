/**
 * The quest log and automap screens (Phase 5 step 10): the log as two lists, active and
 * done, each entry with its text and current objective; the map as a canvas of the current
 * level's visited cells with the party's cell and heading drawn on it, and the runtime's
 * marks (`ScreenHooks.marks`: people, quests, ways on) inked over them, walked or not; a tap
 * on a mark writes its name beside it.
 */
import type { MapMark, ScreenContext } from './context';
import { el, heading, note } from './dom';
import {
  type MapView,
  mapView,
  markAt,
  type PlacedMark,
  type QuestRow,
  questRows,
} from './journal-model';
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

function drawMap(canvas: HTMLCanvasElement, v: MapView, picked: PlacedMark | null): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const { scale, offsetX, offsetY } = v.transform;
  g.clearRect(0, 0, canvas.width, canvas.height);
  // Ink on the page: the walked cells in sepia, the party in dark red.
  g.fillStyle = INK.cell;
  for (const [cx, cy] of v.cells) {
    g.fillRect(
      offsetX + cx * scale,
      offsetY + cy * scale,
      Math.max(1, scale - 1),
      Math.max(1, scale - 1),
    );
  }
  // The marks over the cells, walked or not; the party over them.
  for (const m of v.marks) drawMark(g, m);
  if (picked) drawRing(g, picked.px, picked.py, 8);
  if (!v.party) return;
  const px = offsetX + (v.party.cx + 0.5) * scale;
  const py = offsetY + (v.party.cy + 0.5) * scale;
  const r = Math.max(4, scale);
  // Babylon's heading: forward is (sin yaw, cos yaw) on the ground, z down the canvas.
  const dx = Math.sin(v.party.yawDeg * DEG);
  const dy = Math.cos(v.party.yawDeg * DEG);
  g.fillStyle = INK.party;
  g.beginPath();
  g.moveTo(px + dx * r, py + dy * r);
  g.lineTo(px - dy * r * 0.6 - dx * r * 0.6, py + dx * r * 0.6 - dy * r * 0.6);
  g.lineTo(px + dy * r * 0.6 - dx * r * 0.6, py - dx * r * 0.6 - dy * r * 0.6);
  g.closePath();
  g.fill();
}

export function renderMap(ctx: ScreenContext): void {
  const { state, frame, hooks } = ctx;
  const col = el('div', 'ui-col map-col');
  if (!state.automap.levels[state.level.id]) {
    col.appendChild(note('No map of this place yet.'));
    frame.body.replaceChildren(col);
    return;
  }
  const marks = hooks.marks?.() ?? [];
  // The page the map is inked on fills the column; the canvas is its size in whole pixels,
  // so the map fits the frame whatever the phone's insets leave (MM6 clips nothing).
  const sheet = el('div', 'map-sheet');
  const canvas = el('canvas', 'map-canvas');
  // A tapped mark's name, written beside it on the page in the book's ink.
  const label = el('div', 'map-label');
  label.hidden = true;
  sheet.append(canvas, label);
  col.append(sheet);
  frame.body.replaceChildren(col);

  let view: MapView | null = null;
  let picked: PlacedMark | null = null;
  const size = (): [number, number] => {
    const w = Math.floor(sheet.clientWidth / PX);
    const h = Math.floor(sheet.clientHeight / PX);
    return w >= 16 && h >= 16 ? [w, h] : [MAP_WIDTH, MAP_HEIGHT];
  };
  const showLabel = (): void => {
    if (!picked || !view) {
      label.hidden = true;
      return;
    }
    // Beside the mark, on the side with the more page, its line centred on the mark.
    const right = picked.px <= canvas.width / 2;
    label.classList.toggle('left', !right);
    label.style.left = `${(right ? picked.px + 11 : picked.px - 11) * PX}px`;
    // Kept on the page at its top and foot (a line is twenty-four pixels).
    const top = Math.max(0, Math.min(canvas.height - 24, picked.py - 12));
    label.style.top = `${top * PX}px`;
    label.textContent = picked.label;
    label.hidden = false;
  };
  const draw = (): void => {
    const [w, h] = size();
    if (canvas.width !== w || canvas.height !== h || !view) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * PX}px`;
      canvas.style.height = `${h * PX}px`;
      view = mapView(state, w, h, marks);
      // A mark named before the page changed size is found again at its new place.
      const was = picked;
      picked = was
        ? (view?.marks.find(
            (m) => m.x === was.x && m.z === was.z && m.kind === was.kind && m.label === was.label,
          ) ?? null)
        : null;
    }
    if (view) drawMap(canvas, view, picked);
    showLabel();
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!view) return;
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const x = ((e.clientX - r.left) * canvas.width) / r.width;
    const y = ((e.clientY - r.top) * canvas.height) / r.height;
    const hit = markAt(view.marks, x, y, MARK_REACH);
    // A second tap on the same mark, or a tap on bare page, puts the name away.
    picked = hit && hit !== picked ? hit : null;
    draw();
  });
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
