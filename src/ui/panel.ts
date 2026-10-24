/**
 * MM6's right-hand panel (DESIGN.md 16.34; reference mm6-hud-town), top to bottom: the
 * minimap through a cusped arch with the heading on a plate at its apex and a − and a + cut
 * into its shoulders, two stained-glass windows, the clock in a stone bar, the four books on
 * their shelf (quests, notes, map, calendar), the food beside its apple and the gold beside its
 * coins, and the four gold ovals: cast, rest, quick reference and options. Screens that MM6
 * drew over the panel (a member's figure on the character screens, a house's wooden board)
 * draw into `cover`, which hides everything above the food and gold.
 */
import type { AutomapLevel } from '../game/automap';
import { isVisited } from '../game/automap';
import { formatDate, formatTime } from '../game/time';
import { el } from './dom';
import { archMarks, archShapes } from './paint-panel';
import { paintNumerals } from './paint';
import { PX } from './pixel-text';
import { purseFigure } from './hud';

export const BOOKS = ['quests', 'notes', 'map', 'calendar'] as const;
export type BookName = (typeof BOOKS)[number];
export const OVALS = ['cast', 'rest', 'reference', 'options'] as const;
export type OvalName = (typeof OVALS)[number];

const BOOK_LABELS: Record<BookName, string> = {
  quests: 'Quests',
  notes: 'Notes',
  map: 'Map',
  calendar: 'Calendar',
};
const OVAL_LABELS: Record<OvalName, string> = {
  cast: 'Cast a spell',
  rest: 'Rest',
  reference: 'Quick reference',
  options: 'Options',
};
const OVAL_GLYPHS: Record<OvalName, string> = {
  cast: 'star',
  rest: 'tent',
  reference: 'scroll',
  options: 'disk',
};

/** The panel's width and the arch's height, UI pixels (hud.css `.panel`). */
export const PANEL_WIDTH = 128;
const ARCH_HEIGHT = 120;

/** The minimap's zooms, page pixels a metre; it opens at the second. */
export const MINIMAP_ZOOMS = [0.5, 1, 2, 4] as const;

/** The eight winds, from north turning east, for the compass plate. */
const WINDS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** The wind the party faces, `yawDeg` turning from north toward east. */
export function windOf(yawDeg: number): (typeof WINDS)[number] {
  const k = Math.round((((yawDeg % 360) + 360) % 360) / 45) % 8;
  return WINDS[k]!;
}

/**
 * The place the minimap shows: the level's picture from above (a pixel a metre, north up and
 * east to the right, its middle at the scene's origin; tools/lib/map-sheet.ts `writeMiniMap`),
 * or, where a level has none (below ground), the cells the party has walked.
 */
export interface MiniMapSource {
  picture: HTMLImageElement | null;
  /** The picture's metres across, its middle at the scene's origin. */
  size: number;
  automap: AutomapLevel | null;
}

export interface PanelHooks {
  onBook(name: BookName): void;
  onOval(name: OvalName): void;
}

export interface Panel {
  setClock(minutes: number): void;
  setPurse(gold: number, food: number): void;
  setSource(source: MiniMapSource | null): void;
  /** The party's place in the scene's coordinates and its heading, degrees from north. */
  setParty(x: number, z: number, yawDeg: number): void;
  /** Where screens draw over the panel (hidden while empty). */
  cover: HTMLElement;
  dispose(): void;
}

export function createPanel(parent: HTMLElement, hooks: PanelHooks): Panel {
  const root = el('div', 'panel');
  const glassRow = el('div', 'panel-glass');
  for (const k of [1, 2]) {
    const pane = el('div', 'panel-pane');
    pane.dataset['paint'] = `glass-${k}`;
    glassRow.appendChild(pane);
  }
  // The minimap under its arch: the canvas drawn in the opening, the arch over it.
  const map = el('div', 'panel-map');
  const canvas = el('canvas', 'panel-minimap');
  canvas.width = PANEL_WIDTH;
  canvas.height = ARCH_HEIGHT;
  const arch = el('div', 'panel-arch');
  arch.dataset['paint'] = 'arch';
  const wind = el('div', 'panel-wind');
  const zoomOut = el('button', 'panel-zoom out');
  const zoomIn = el('button', 'panel-zoom in');
  zoomOut.type = zoomIn.type = 'button';
  zoomOut.setAttribute('aria-label', 'Zoom out');
  zoomIn.setAttribute('aria-label', 'Zoom in');
  const marks = archMarks(PANEL_WIDTH, ARCH_HEIGHT);
  zoomOut.style.left = `${marks.out[0] - 12}px`;
  zoomOut.style.top = `${marks.out[1] - 12}px`;
  zoomIn.style.left = `${marks.in[0] - 12}px`;
  zoomIn.style.top = `${marks.in[1] - 12}px`;
  map.append(canvas, arch, wind, zoomOut, zoomIn);
  // The clock in a stone bar: the hour in the well numerals, the day beside it.
  const clock = el('div', 'panel-clock');
  clock.dataset['paint'] = 'plaque';
  const clockTime = el('div', 'panel-clock-time');
  const clockDay = el('div', 'panel-clock-day');
  clock.append(clockTime, clockDay);
  // The books on their shelf.
  const shelf = el('div', 'panel-books');
  shelf.dataset['paint'] = 'alcove';
  for (const name of BOOKS) {
    const b = el('button', 'panel-book');
    b.type = 'button';
    b.dataset['paint'] = `spine-${name}`;
    b.dataset['book'] = name;
    b.title = BOOK_LABELS[name];
    b.setAttribute('aria-label', BOOK_LABELS[name]);
    b.addEventListener('click', (e) => {
      e.preventDefault();
      hooks.onBook(name);
    });
    shelf.appendChild(b);
  }
  // The food by its apple and the gold by its coins, each in a well of darkened marble.
  const purse = el('div', 'panel-purse');
  const apple = el('div', 'panel-apple');
  apple.dataset['paint'] = 'apple';
  const food = el('div', 'panel-well food');
  food.dataset['paint'] = 'plaque';
  const gold = el('div', 'panel-well gold');
  gold.dataset['paint'] = 'plaque';
  const coins = el('div', 'panel-coins');
  coins.dataset['paint'] = 'coins';
  purse.append(apple, food, gold, coins);
  // The four gold ovals.
  const ovals = el('div', 'panel-ovals');
  for (const name of OVALS) {
    const b = el('button', 'panel-oval');
    b.type = 'button';
    b.dataset['paint'] = `oval-${OVAL_GLYPHS[name]}`;
    b.dataset['oval'] = name;
    b.title = OVAL_LABELS[name];
    b.setAttribute('aria-label', OVAL_LABELS[name]);
    b.addEventListener('click', (e) => {
      e.preventDefault();
      hooks.onOval(name);
    });
    ovals.appendChild(b);
  }
  const cover = el('div', 'panel-cover');
  root.append(map, glassRow, clock, shelf, purse, ovals, cover);
  parent.appendChild(root);
  // The cover shows only while a screen has put something in it.
  const covered = new MutationObserver(() => {
    root.classList.toggle('covered', cover.childElementCount > 0);
  });
  covered.observe(cover, { childList: true });

  // The opening as a stencil, so the map shows only through the arch.
  const { opening } = archShapes(PANEL_WIDTH, ARCH_HEIGHT);
  const stencil = document.createElement('canvas');
  stencil.width = PANEL_WIDTH;
  stencil.height = ARCH_HEIGHT;
  {
    const sg = stencil.getContext('2d')!;
    const img = sg.createImageData(PANEL_WIDTH, ARCH_HEIGHT);
    for (let i = 0; i < opening.length; i++) {
      img.data[i * 4 + 3] = opening[i] ? 255 : 0;
    }
    sg.putImageData(img, 0, 0);
  }
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  let source: MiniMapSource | null = null;
  let zoom = 2;
  let party = { x: 0, z: 0, yaw: 0 };
  let drawn = '';
  const draw = (): void => {
    const key = `${zoom}:${party.x.toFixed(1)}:${party.z.toFixed(1)}:${Math.round(party.yaw)}:${source ? 1 : 0}:${source?.picture?.complete ? 1 : 0}`;
    if (key === drawn) return;
    drawn = key;
    const w = PANEL_WIDTH;
    const h = ARCH_HEIGHT;
    // The map's middle is the opening's, a little under the arch's.
    const mx = w / 2;
    const my = h * 0.6;
    const scale = MINIMAP_ZOOMS[zoom]!;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgb(20,16,12)';
    g.fillRect(0, 0, w, h);
    const pic = source?.picture;
    if (source && pic && pic.complete && pic.naturalWidth > 0) {
      // `k` picture pixels a metre; scene x to the right, z up. The source's corner is held
      // to a whole page pixel, so the map steps a pixel at a time as the party walks.
      const k = pic.naturalWidth / source.size;
      const per = k / scale;
      const cx = (party.x + source.size / 2) * k;
      const cy = (source.size / 2 - party.z) * k;
      const sx = Math.round((cx - mx * per) / per) * per;
      const sy = Math.round((cy - my * per) / per) * per;
      g.drawImage(pic, sx, sy, w * per, h * per, 0, 0, w, h);
    } else if (source?.automap) {
      const lv = source.automap;
      const cell = lv.cellSize * scale;
      // Scene x to the right, z up, as the picture.
      const u0 = (party.x - lv.originX) / lv.cellSize;
      const v0 = (party.z - lv.originZ) / lv.cellSize;
      g.fillStyle = 'rgb(122,98,64)';
      const span = Math.ceil(Math.max(w, h) / cell) + 2;
      for (let dv = -span; dv <= span; dv++) {
        for (let du = -span; du <= span; du++) {
          const cu = Math.floor(u0) + du;
          const cv = Math.floor(v0) + dv;
          if (cu < 0 || cv < 0 || cu >= lv.width || cv >= lv.height) continue;
          if (!isVisited(lv, cu, cv)) continue;
          const x = Math.round(mx + (cu - u0) * cell);
          const y = Math.round(my - (cv + 1 - v0) * cell);
          g.fillRect(x, y, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    // The party: MM6's white arrowhead with a dark edge, pointing the way it faces.
    const a = (party.yaw * Math.PI) / 180;
    const fx = Math.sin(a);
    const fy = -Math.cos(a);
    const tip = (d: number, s: number): [number, number] => [
      mx + fx * d - fy * s,
      my + fy * d + fx * s,
    ];
    const arrow = [tip(6, 0), tip(-4, 4), tip(-2, 0), tip(-4, -4)];
    g.beginPath();
    arrow.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = '#ffffff';
    g.strokeStyle = 'rgb(16,16,16)';
    g.lineWidth = 1;
    g.fill();
    g.stroke();
    // Only through the arch's opening.
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(stencil, 0, 0);
    g.globalCompositeOperation = 'source-over';
  };
  const setZoom = (step: number): void => {
    zoom = Math.max(0, Math.min(MINIMAP_ZOOMS.length - 1, zoom + step));
    draw();
  };
  zoomOut.addEventListener('click', (e) => {
    e.preventDefault();
    setZoom(-1);
  });
  zoomIn.addEventListener('click', (e) => {
    e.preventDefault();
    setZoom(1);
  });
  let windShown = '';
  const showFigures = (at: HTMLElement, text: string, label: string): void => {
    if (at.dataset['n'] === text) return;
    at.dataset['n'] = text;
    const digits = paintNumerals(text);
    digits.className = 'hud-numerals';
    digits.style.width = `${digits.width * PX}px`;
    digits.style.height = `${digits.height * PX}px`;
    at.replaceChildren(digits);
    at.setAttribute('aria-label', `${text} ${label}`);
  };
  return {
    cover,
    setClock(minutes) {
      showFigures(clockTime, formatTime(minutes), '');
      clockDay.textContent = formatDate(minutes).split(',')[0] ?? '';
    },
    setPurse(goldCount, foodCount) {
      showFigures(food, purseFigure(foodCount), 'food');
      showFigures(gold, purseFigure(goldCount), 'gold');
    },
    setSource(next) {
      source = next;
      drawn = '';
      const pic = next?.picture;
      if (pic && !pic.complete)
        pic.addEventListener('load', () => ((drawn = ''), draw()), { once: true });
      draw();
    },
    setParty(x, z, yawDeg) {
      party = { x, z, yaw: yawDeg };
      const w = windOf(yawDeg);
      if (w !== windShown) {
        windShown = w;
        wind.textContent = w;
      }
      draw();
    },
    dispose() {
      covered.disconnect();
      root.remove();
    },
  };
}
