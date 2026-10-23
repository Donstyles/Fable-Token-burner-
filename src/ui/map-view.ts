/**
 * The automap's camera and gestures (owner, 2026-10-23: "Auto maps needs pinch and zoom
 * controls"). The camera is how many whole page pixels a cell takes and which point of the
 * level, in cells, stands at the page's middle; the page is drawn from it on whole pixels, so
 * the map stays pixel art at every zoom. Here are the zoom limits (the whole level on the
 * page, out to eight times that), zooming about a point, a pan, a pinch, the steps of the
 * + and − buttons, the opening view, the clamp that keeps the level on the page, the
 * page↔cell transforms, and `MapGestures`, which turns pointers into taps, double taps, drags
 * and pinches. Pure; `journal.ts` feeds it the pointers and draws what it says.
 */

/** A grid's size in cells, or a page's in pixels. */
export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapCamera {
  /** Page pixels per cell, a whole number between the limits (`zoomLimits`). */
  scale: number;
  /** The level point, in cells from the grid's corner, at the page's middle. */
  cx: number;
  cy: number;
}

/** Where cell (0, 0)'s corner lands on the page, in whole pixels, and the pixels a cell. */
export interface CameraTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** The deepest zoom over the whole level on the page: each cell eight times as wide. */
export const MAX_ZOOM = 8;
/** The map opens at four times the whole level, round the party (1 px a metre outdoors). */
export const OPEN_ZOOM = 4;
/** How far a finger may wander, in page pixels, and still tap rather than drag. */
export const TAP_SLOP = 10;
/** A second tap this soon after the first and this near it is a double tap. */
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_REACH = 32;
/** The party counts as on the page when its cell is this many pixels inside the edge. */
const ON_PAGE_INSET = 12;

/** The whole level on the page: the most whole pixels a cell that fit both ways, at least 1. */
export function fitScale(grid: Size, page: Size): number {
  if (grid.width <= 0 || grid.height <= 0 || page.width <= 0 || page.height <= 0) return 1;
  return Math.max(1, Math.floor(Math.min(page.width / grid.width, page.height / grid.height)));
}

export function zoomLimits(grid: Size, page: Size): { min: number; max: number } {
  const min = fitScale(grid, page);
  return { min, max: min * MAX_ZOOM };
}

function clampScale(scale: number, grid: Size, page: Size): number {
  const { min, max } = zoomLimits(grid, page);
  if (!Number.isFinite(scale)) return min;
  return Math.min(max, Math.max(min, Math.round(scale)));
}

/**
 * One axis of the clamp: the level `n` cells long at `s` pixels a cell on a page `p` long,
 * the page's middle over cell `c`. A level shorter than the page stays wholly on it and over
 * its middle; a longer one covers the page, with a margin that grows as it lengthens, up to
 * half a page (at twice the page), so the page's middle can come to the level's very edge (a
 * party on the shore can be centred) and the level can never leave the page.
 */
function clampAxis(c: number, n: number, p: number, s: number): number {
  const len = n * s;
  let lo: number;
  let hi: number;
  if (len <= p) {
    lo = Math.max(0, p / 2 - len);
    hi = Math.min(p - len, p / 2);
  } else {
    const margin = Math.min(p / 2, (len - p) / 2);
    lo = p - len - margin;
    hi = margin;
  }
  const want = Number.isFinite(c) ? p / 2 - c * s : (p - len) / 2;
  const edge = Math.min(hi, Math.max(lo, want));
  return (p / 2 - edge) / s;
}

/** The camera with its zoom a whole number within the limits and the level kept on the page. */
export function clampCamera(cam: MapCamera, grid: Size, page: Size): MapCamera {
  const scale = clampScale(cam.scale, grid, page);
  return {
    scale,
    cx: clampAxis(cam.cx, grid.width, page.width, scale),
    cy: clampAxis(cam.cy, grid.height, page.height, scale),
  };
}

/** Where the camera draws the grid: cell (0, 0)'s corner on a whole page pixel. */
export function cameraTransform(cam: MapCamera, page: Size): CameraTransform {
  return {
    scale: cam.scale,
    offsetX: Math.round(page.width / 2 - cam.cx * cam.scale),
    offsetY: Math.round(page.height / 2 - cam.cy * cam.scale),
  };
}

/** The level point, in cells, drawn at page pixel `(x, y)`. */
export function pageToCell(cam: MapCamera, page: Size, x: number, y: number): Point {
  const t = cameraTransform(cam, page);
  return { x: (x - t.offsetX) / t.scale, y: (y - t.offsetY) / t.scale };
}

/** The page pixel a level point `(u, v)`, in cells, is drawn at. */
export function cellToPage(cam: MapCamera, page: Size, u: number, v: number): Point {
  const t = cameraTransform(cam, page);
  return { x: t.offsetX + u * t.scale, y: t.offsetY + v * t.scale };
}

/** The camera at `scale` with level point `at` (cells) drawn at page pixel `to`, clamped. */
function anchored(at: Point, to: Point, scale: number, grid: Size, page: Size): MapCamera {
  const s = clampScale(scale, grid, page);
  return clampCamera(
    { scale: s, cx: at.x + (page.width / 2 - to.x) / s, cy: at.y + (page.height / 2 - to.y) / s },
    grid,
    page,
  );
}

/** Zoom to `scale` about page pixel `(x, y)`: the level point under it stays under it. */
export function zoomAbout(
  cam: MapCamera,
  grid: Size,
  page: Size,
  scale: number,
  x: number,
  y: number,
): MapCamera {
  return anchored(pageToCell(cam, page, x, y), { x, y }, scale, grid, page);
}

/** Move the drawing by `(dx, dy)` page pixels, as a finger drags it. */
export function panCamera(
  cam: MapCamera,
  grid: Size,
  page: Size,
  dx: number,
  dy: number,
): MapCamera {
  return clampCamera(
    { scale: cam.scale, cx: cam.cx - dx / cam.scale, cy: cam.cy - dy / cam.scale },
    grid,
    page,
  );
}

/**
 * A pinch from fingers `a0`, `b0` (with the camera `start`) to `a`, `b`: the zoom grows as
 * the fingers part, to the nearest whole pixel a cell, and the level point that was under
 * their middle at the start follows their middle, so two fingers also pan.
 */
export function pinchCamera(
  start: MapCamera,
  grid: Size,
  page: Size,
  a0: Point,
  b0: Point,
  a: Point,
  b: Point,
): MapCamera {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const scale = d0 > 0 && d > 0 ? start.scale * (d / d0) : start.scale;
  return anchored(pageToCell(start, page, m0.x, m0.y), m, scale, grid, page);
}

/** The zooms the buttons and the double tap step through: the whole level, then doubling. */
export function zoomSteps(grid: Size, page: Size): number[] {
  const { min, max } = zoomLimits(grid, page);
  const steps: number[] = [];
  for (let s = min; s < max; s *= 2) steps.push(s);
  steps.push(max);
  return steps;
}

/** One step in (`dir` 1) or out (-1) about page pixel `(x, y)`, the page's middle by default. */
export function zoomStep(
  cam: MapCamera,
  grid: Size,
  page: Size,
  dir: 1 | -1,
  x = page.width / 2,
  y = page.height / 2,
): MapCamera {
  const steps = zoomSteps(grid, page);
  const next =
    dir > 0
      ? (steps.find((s) => s > cam.scale) ?? steps[steps.length - 1]!)
      : ([...steps].reverse().find((s) => s < cam.scale) ?? steps[0]!);
  return zoomAbout(cam, grid, page, next, x, y);
}

/** The party's cell, or null when it is off the grid. */
export type PartyCell = { cx: number; cy: number } | null;

/** The page's middle on the party's cell (or the level's middle) at `scale`, clamped. */
export function centreOn(party: PartyCell, grid: Size, page: Size, scale: number): MapCamera {
  const at = party
    ? { cx: party.cx + 0.5, cy: party.cy + 0.5 }
    : { cx: grid.width / 2, cy: grid.height / 2 };
  return clampCamera({ scale, ...at }, grid, page);
}

/** The view a level's map opens on the first time: round the party at four times the fit. */
export function openingCamera(grid: Size, page: Size, party: PartyCell): MapCamera {
  return centreOn(party, grid, page, fitScale(grid, page) * OPEN_ZOOM);
}

/** Back to the party (its button): at the zoom the page has, or the opening one if further out. */
export function partyCamera(cam: MapCamera, grid: Size, page: Size, party: PartyCell): MapCamera {
  return centreOn(party, grid, page, Math.max(cam.scale, fitScale(grid, page) * OPEN_ZOOM));
}

/** A view the map was left at, and the party's cell then, so a walk since can be told. */
export interface SavedView {
  camera: MapCamera;
  party: PartyCell;
}

/**
 * The view the map opens on: the one it was left at on this level (its zoom and middle), or
 * the opening view on a level not looked at yet. If the party has walked since and its cell
 * is off that view, the view keeps its zoom and comes to the party; a view the player panned
 * away from a party standing still stays where it was put.
 */
export function reopenCamera(
  saved: SavedView | null,
  grid: Size,
  page: Size,
  party: PartyCell,
): MapCamera {
  if (!saved) return openingCamera(grid, page, party);
  const cam = clampCamera(saved.camera, grid, page);
  const was = saved.party;
  if (!party || (was && was.cx === party.cx && was.cy === party.cy)) return cam;
  const at = cellToPage(cam, page, party.cx + 0.5, party.cy + 0.5);
  const inset = Math.min(ON_PAGE_INSET, page.width / 4, page.height / 4);
  const on =
    at.x >= inset && at.y >= inset && at.x <= page.width - inset && at.y <= page.height - inset;
  return on ? cam : centreOn(party, grid, page, cam.scale);
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * The remembered views, by key, from their stored text (the tab's session storage, which a
 * portal's reload keeps): whatever is not a view with finite numbers is left out.
 */
export function parseViews(text: string | null): Record<string, SavedView> {
  let raw: unknown;
  try {
    raw = JSON.parse(text ?? '');
  } catch {
    return {};
  }
  const out: Record<string, SavedView> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const { camera, party } = v as Record<string, unknown>;
    if (!camera || typeof camera !== 'object') continue;
    const { scale, cx, cy } = camera as Record<string, unknown>;
    if (!finite(scale) || !finite(cx) || !finite(cy) || scale < 1) continue;
    const p = party && typeof party === 'object' ? (party as Record<string, unknown>) : null;
    out[key] = {
      camera: { scale, cx, cy },
      party: p && finite(p['cx']) && finite(p['cy']) ? { cx: p['cx'], cy: p['cy'] } : null,
    };
  }
  return out;
}

/**
 * What a pointer did: nothing to show, a new view (`view`), a tap that did not move (`tap`,
 * where the finger landed), or a second tap that zoomed the view (`double`).
 */
export type GestureResult =
  | { kind: 'none' }
  | { kind: 'view' }
  | { kind: 'tap'; x: number; y: number }
  | { kind: 'double'; x: number; y: number };

const NONE: GestureResult = { kind: 'none' };
const VIEW: GestureResult = { kind: 'view' };

/**
 * The page's gestures over a camera, in page pixels and milliseconds: one finger that does
 * not move is a tap, one that moves drags the map, two pinch it (and pan it by their middle),
 * a tap soon after a tap at the same place zooms in a step there, or back to the opening view
 * when the map is already at its deepest zoom. A pinch's remaining finger drags on; a finger
 * that has dragged or pinched never taps.
 */
export class MapGestures {
  camera: MapCamera;
  private grid: Size;
  private page: Size;
  private party: PartyCell;
  private readonly pointers = new Map<number, Point>();
  /** The one finger down that is still a tap. */
  private press: { id: number; start: Point } | null = null;
  private drag: { id: number; last: Point } | null = null;
  private pinch: { ids: [number, number]; a0: Point; b0: Point; start: MapCamera } | null = null;
  private lastTap: { x: number; y: number; t: number } | null = null;

  constructor(camera: MapCamera, grid: Size, page: Size, party: PartyCell) {
    this.grid = grid;
    this.page = page;
    this.party = party;
    this.camera = clampCamera(camera, grid, page);
  }

  /** The page changed size: the camera is clamped again and any pinch starts afresh. */
  resize(page: Size): void {
    this.page = page;
    this.camera = clampCamera(this.camera, this.grid, page);
    if (this.pinch) this.startPinch();
  }

  /** Set the camera (a button), clamped. */
  set(camera: MapCamera): void {
    this.camera = clampCamera(camera, this.grid, this.page);
  }

  /** Whether a finger is down on the page. */
  get active(): boolean {
    return this.pointers.size > 0;
  }

  down(id: number, x: number, y: number): GestureResult {
    this.pointers.set(id, { x, y });
    if (this.pointers.size === 1) {
      this.press = { id, start: { x, y } };
      this.drag = null;
      this.pinch = null;
    } else if (this.pointers.size === 2) {
      // A second finger: no tap, no drag; a pinch from here.
      this.press = null;
      this.drag = null;
      this.lastTap = null;
      this.startPinch();
    }
    return NONE;
  }

  move(id: number, x: number, y: number): GestureResult {
    if (!this.pointers.has(id)) return NONE;
    this.pointers.set(id, { x, y });
    const pinch = this.pinch;
    if (pinch && pinch.ids.includes(id)) {
      const a = this.pointers.get(pinch.ids[0])!;
      const b = this.pointers.get(pinch.ids[1])!;
      this.camera = pinchCamera(pinch.start, this.grid, this.page, pinch.a0, pinch.b0, a, b);
      return VIEW;
    }
    if (this.press?.id === id) {
      const s = this.press.start;
      if (Math.hypot(x - s.x, y - s.y) <= TAP_SLOP) return NONE;
      // Past the slop it is a drag, from where the finger landed so the map keeps up.
      this.press = null;
      this.lastTap = null;
      this.drag = { id, last: s };
    }
    if (this.drag?.id === id) {
      const last = this.drag.last;
      this.camera = panCamera(this.camera, this.grid, this.page, x - last.x, y - last.y);
      this.drag.last = { x, y };
      return VIEW;
    }
    return NONE;
  }

  up(id: number, t: number): GestureResult {
    const tap = this.press?.id === id ? this.press.start : null;
    this.lift(id);
    if (!tap) return NONE;
    const last = this.lastTap;
    if (
      last &&
      t - last.t <= DOUBLE_TAP_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= DOUBLE_TAP_REACH
    ) {
      this.lastTap = null;
      const { max } = zoomLimits(this.grid, this.page);
      this.camera =
        this.camera.scale >= max
          ? openingCamera(this.grid, this.page, this.party)
          : zoomStep(this.camera, this.grid, this.page, 1, tap.x, tap.y);
      return { kind: 'double', x: tap.x, y: tap.y };
    }
    this.lastTap = { x: tap.x, y: tap.y, t };
    return { kind: 'tap', x: tap.x, y: tap.y };
  }

  /** A pointer the browser took away (a system gesture): never a tap. */
  cancel(id: number): GestureResult {
    this.lift(id);
    return NONE;
  }

  private lift(id: number): void {
    this.pointers.delete(id);
    if (this.press?.id === id) this.press = null;
    if (this.drag?.id === id) this.drag = null;
    if (this.pinch?.ids.includes(id)) {
      this.pinch = null;
      // The finger left behind drags on from where it is.
      const rest = [...this.pointers.entries()];
      if (rest.length === 1) this.drag = { id: rest[0]![0], last: rest[0]![1] };
      else if (rest.length >= 2) this.startPinch();
    }
  }

  private startPinch(): void {
    const [a, b] = [...this.pointers.entries()];
    if (!a || !b) {
      this.pinch = null;
      return;
    }
    this.pinch = { ids: [a[0], b[0]], a0: a[1], b0: b[1], start: this.camera };
  }
}
