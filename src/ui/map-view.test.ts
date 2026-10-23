import { describe, expect, it } from 'vitest';
import {
  cameraTransform,
  cellToPage,
  centreOn,
  clampCamera,
  DOUBLE_TAP_MS,
  fitScale,
  type MapCamera,
  MapGestures,
  openingCamera,
  pageToCell,
  panCamera,
  parseViews,
  partyCamera,
  pinchCamera,
  reopenCamera,
  TAP_SLOP,
  zoomAbout,
  zoomLimits,
  zoomStep,
  zoomSteps,
} from './map-view';

// Gullhaven's grid (80 cells of 8 m) on the phone's page with its insets, 662 by 164.
const GRID = { width: 80, height: 80 };
const PAGE = { width: 662, height: 164 };

/** The page pixel a level point is drawn at. */
const at = (cam: MapCamera, u: number, v: number): [number, number] => {
  const p = cellToPage(cam, PAGE, u, v);
  return [p.x, p.y];
};

describe('map zoom limits', () => {
  it('runs from the whole level on the page to eight times that, in whole pixels', () => {
    expect(fitScale(GRID, PAGE)).toBe(2);
    expect(zoomLimits(GRID, PAGE)).toEqual({ min: 2, max: 16 });
    expect(zoomSteps(GRID, PAGE)).toEqual([2, 4, 8, 16]);
    // A page smaller than the grid still draws a cell a pixel.
    expect(zoomLimits(GRID, { width: 40, height: 40 })).toEqual({ min: 1, max: 8 });
    expect(fitScale({ width: 0, height: 0 }, PAGE)).toBe(1);
  });

  it('clamps a zoom to a whole number within the limits', () => {
    expect(clampCamera({ scale: 40, cx: 40, cy: 40 }, GRID, PAGE).scale).toBe(16);
    expect(clampCamera({ scale: 0.5, cx: 40, cy: 40 }, GRID, PAGE).scale).toBe(2);
    expect(clampCamera({ scale: 6.4, cx: 40, cy: 40 }, GRID, PAGE).scale).toBe(6);
    expect(clampCamera({ scale: Number.NaN, cx: 40, cy: 40 }, GRID, PAGE).scale).toBe(2);
  });
});

describe('map transforms', () => {
  it('draws the grid on whole pixels and maps the page back to cells', () => {
    const cam = { scale: 8, cx: 40.3, cy: 20.7 };
    const t = cameraTransform(cam, PAGE);
    expect(t).toEqual({
      scale: 8,
      offsetX: Math.round(331 - 322.4),
      offsetY: Math.round(82 - 165.6),
    });
    expect(Number.isInteger(t.offsetX) && Number.isInteger(t.offsetY)).toBe(true);
    // Page to cell and back.
    const c = pageToCell(cam, PAGE, 200, 100);
    expect(at(cam, c.x, c.y)).toEqual([200, 100]);
    // The page's middle is (near) the camera's point.
    const mid = pageToCell(cam, PAGE, PAGE.width / 2, PAGE.height / 2);
    expect(Math.abs(mid.x - cam.cx)).toBeLessThan(1 / 8);
    expect(Math.abs(mid.y - cam.cy)).toBeLessThan(1 / 8);
  });
});

describe('map clamp', () => {
  it('keeps a level that fits wholly on the page and over its middle', () => {
    // At the fit the level is 160 by 160 on a page 662 by 164.
    const left = clampCamera({ scale: 2, cx: 500, cy: -50 }, GRID, PAGE);
    const t = cameraTransform(left, PAGE);
    expect(t.offsetY).toBeGreaterThanOrEqual(0);
    expect(t.offsetY + 160).toBeLessThanOrEqual(164);
    // Dragged right as far as it goes: its left edge at the page's middle.
    const right = clampCamera({ scale: 2, cx: -500, cy: 40 }, GRID, PAGE);
    expect(cameraTransform(right, PAGE).offsetX).toBe(331);
    const far = clampCamera({ scale: 2, cx: 500, cy: 40 }, GRID, PAGE);
    expect(cameraTransform(far, PAGE).offsetX + 160).toBe(331);
  });

  it('lets the page middle reach the edge of a level twice the page, never past it', () => {
    // At 16 a cell the level is 1280 pixels: down, eight pages, the middle can stand on its
    // very edge; across, a little under two pages, it stops 22 pixels in.
    expect(clampCamera({ scale: 16, cx: 0, cy: 0 }, GRID, PAGE)).toEqual({
      scale: 16,
      cx: 22 / 16,
      cy: 0,
    });
    expect(clampCamera({ scale: 16, cx: -10, cy: 95 }, GRID, PAGE)).toEqual({
      scale: 16,
      cx: 22 / 16,
      cy: 80,
    });
    // At 8 the level is 640 across, under the page's 662: it stays wholly on the page.
    const t = cameraTransform(clampCamera({ scale: 8, cx: 0, cy: 40 }, GRID, PAGE), PAGE);
    expect(t.offsetX).toBe(22);
  });

  it('never lets the level leave the page, at any zoom', () => {
    for (let scale = 2; scale <= 16; scale++) {
      for (const [cx, cy] of [
        [-1e4, -1e4],
        [1e4, 1e4],
        [-1e4, 1e4],
        [40, 40],
      ] as const) {
        const t = cameraTransform(clampCamera({ scale, cx, cy }, GRID, PAGE), PAGE);
        const w = GRID.width * scale;
        const h = GRID.height * scale;
        // At least half the page, or the whole level when it is smaller, is level.
        const seenX = Math.min(PAGE.width, t.offsetX + w) - Math.max(0, t.offsetX);
        const seenY = Math.min(PAGE.height, t.offsetY + h) - Math.max(0, t.offsetY);
        expect(seenX).toBeGreaterThanOrEqual(Math.min(w, PAGE.width / 2) - 1);
        expect(seenY).toBeGreaterThanOrEqual(Math.min(h, PAGE.height / 2) - 1);
      }
    }
  });
});

describe('map zoom and pan', () => {
  it('zooms about a point: the level under it stays under it', () => {
    const cam = clampCamera({ scale: 4, cx: 40, cy: 40 }, GRID, PAGE);
    const under = pageToCell(cam, PAGE, 400, 60);
    const zoomed = zoomAbout(cam, GRID, PAGE, 12, 400, 60);
    expect(zoomed.scale).toBe(12);
    const [x, y] = at(zoomed, under.x, under.y);
    expect(Math.abs(x - 400)).toBeLessThan(1);
    expect(Math.abs(y - 60)).toBeLessThan(1);
  });

  it('steps by doubling about the middle, stopping at the limits', () => {
    let cam = clampCamera({ scale: 2, cx: 40, cy: 40 }, GRID, PAGE);
    const scales = [];
    for (let i = 0; i < 4; i++) {
      cam = zoomStep(cam, GRID, PAGE, 1);
      scales.push(cam.scale);
    }
    expect(scales).toEqual([4, 8, 16, 16]);
    // From off the ladder (a pinch's 6) out goes to 4, in to 8.
    const six = clampCamera({ scale: 6, cx: 40, cy: 40 }, GRID, PAGE);
    expect(zoomStep(six, GRID, PAGE, -1).scale).toBe(4);
    expect(zoomStep(six, GRID, PAGE, 1).scale).toBe(8);
    expect(zoomStep(clampCamera({ scale: 2, cx: 40, cy: 40 }, GRID, PAGE), GRID, PAGE, -1)).toEqual(
      clampCamera({ scale: 2, cx: 40, cy: 40 }, GRID, PAGE),
    );
  });

  it('pans with the finger and stops at the clamp', () => {
    const cam = clampCamera({ scale: 16, cx: 40, cy: 40 }, GRID, PAGE);
    const t0 = cameraTransform(cam, PAGE);
    const moved = panCamera(cam, GRID, PAGE, 24, -16);
    const t1 = cameraTransform(moved, PAGE);
    expect([t1.offsetX - t0.offsetX, t1.offsetY - t0.offsetY]).toEqual([24, -16]);
    // Far past the level's corner: held there (the clamp above).
    expect(panCamera(cam, GRID, PAGE, 1e5, 1e5)).toEqual({ scale: 16, cx: 22 / 16, cy: 0 });
  });

  it('pinches: the zoom follows the fingers apart, the point between them under them', () => {
    const start = clampCamera({ scale: 4, cx: 40, cy: 40 }, GRID, PAGE);
    const a0 = { x: 300, y: 80 };
    const b0 = { x: 340, y: 80 };
    const under = pageToCell(start, PAGE, 320, 80);
    // Four times as far apart, the middle moved 10 right and 6 down: sixteen a cell, the
    // point that was between the fingers still between them.
    const cam = pinchCamera(start, GRID, PAGE, a0, b0, { x: 250, y: 86 }, { x: 410, y: 86 });
    expect(cam.scale).toBe(16);
    const [x, y] = at(cam, under.x, under.y);
    expect(Math.abs(x - 330)).toBeLessThan(1);
    expect(Math.abs(y - 86)).toBeLessThan(1);
    // Closing the fingers zooms out, never under the fit; spreading never past eight times.
    expect(pinchCamera(start, GRID, PAGE, a0, b0, { x: 320, y: 80 }, { x: 330, y: 80 }).scale).toBe(
      2,
    );
    expect(pinchCamera(start, GRID, PAGE, a0, b0, { x: 0, y: 0 }, { x: 660, y: 160 }).scale).toBe(
      16,
    );
    // Whole pixels a cell as it goes: a small spread rounds.
    expect(pinchCamera(start, GRID, PAGE, a0, b0, { x: 298, y: 80 }, { x: 342, y: 80 }).scale).toBe(
      4,
    );
    expect(pinchCamera(start, GRID, PAGE, a0, b0, { x: 295, y: 80 }, { x: 345, y: 80 }).scale).toBe(
      5,
    );
  });
});

describe('map opening view', () => {
  it('opens on the party at four times the whole level', () => {
    const cam = openingCamera(GRID, PAGE, { cx: 40, cy: 25 });
    expect(cam).toEqual({ scale: 8, cx: 40.5, cy: 25.5 });
    const [x, y] = at(cam, 40.5, 25.5);
    expect(Math.abs(x - PAGE.width / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(y - PAGE.height / 2)).toBeLessThanOrEqual(0.5);
    // Off the grid: the level's middle.
    expect(openingCamera(GRID, PAGE, null)).toEqual({ scale: 8, cx: 40, cy: 40 });
    // A party on the level's foot is centred down the page; in its corner, the level (640
    // across on a page of 662) stays wholly on the page across.
    expect(openingCamera(GRID, PAGE, { cx: 40, cy: 79 })).toEqual({ scale: 8, cx: 40.5, cy: 79.5 });
    expect(openingCamera(GRID, PAGE, { cx: 0, cy: 79 })).toEqual({
      scale: 8,
      cx: (331 - 22) / 8,
      cy: 79.5,
    });
  });

  it('reopens on the view left on this level, or brings it to a party that walked off it', () => {
    const party = { cx: 40, cy: 25 };
    expect(reopenCamera(null, GRID, PAGE, party)).toEqual(openingCamera(GRID, PAGE, party));
    const left = { scale: 12, cx: 38, cy: 27 };
    expect(reopenCamera({ camera: left, party }, GRID, PAGE, party)).toEqual(left);
    // Panned far from a party that has not moved: kept where the player put it.
    const away = { scale: 16, cx: 5, cy: 70 };
    expect(reopenCamera({ camera: away, party }, GRID, PAGE, party)).toEqual(away);
    // The party walked off the view: the same zoom, on the party.
    expect(reopenCamera({ camera: left, party }, GRID, PAGE, { cx: 70, cy: 60 })).toEqual(
      centreOn({ cx: 70, cy: 60 }, GRID, PAGE, 12),
    );
    // Walked, but still on the view: kept.
    expect(reopenCamera({ camera: left, party }, GRID, PAGE, { cx: 42, cy: 26 })).toEqual(left);
    // A view kept on a larger page is clamped to this one.
    const big = { scale: 40, cx: 38, cy: 27 };
    expect(reopenCamera({ camera: big, party }, GRID, PAGE, party).scale).toBe(16);
  });

  it('finds the party at the zoom the page has, or the opening one from further out', () => {
    const party = { cx: 60, cy: 30 };
    expect(partyCamera({ scale: 2, cx: 40, cy: 40 }, GRID, PAGE, party)).toEqual(
      centreOn(party, GRID, PAGE, 8),
    );
    expect(partyCamera({ scale: 12, cx: 10, cy: 70 }, GRID, PAGE, party)).toEqual({
      scale: 12,
      cx: 60.5,
      cy: 30.5,
    });
  });

  it('reads remembered views, leaving out what is not one', () => {
    const camera = { scale: 8, cx: 40.5, cy: 25.5 };
    expect(
      parseViews(
        JSON.stringify({
          '5:gullhaven': { camera, party: { cx: 40, cy: 25 } },
          '5:halls': { camera, party: null },
          '5:showcase': { camera: { scale: 'big', cx: 1, cy: 2 }, party: null },
          '5:void': { camera: { scale: 0, cx: 1, cy: 2 }, party: null },
          '5:old': { scale: 8, cx: 1, cy: 2 },
          '5:null': null,
        }),
      ),
    ).toEqual({
      '5:gullhaven': { camera, party: { cx: 40, cy: 25 } },
      '5:halls': { camera, party: null },
    });
    expect(parseViews(null)).toEqual({});
    expect(parseViews('not json')).toEqual({});
    expect(parseViews('[1,2]')).toEqual({});
  });
});

describe('map gestures', () => {
  const start = (): MapGestures =>
    new MapGestures(openingCamera(GRID, PAGE, { cx: 40, cy: 25 }), GRID, PAGE, {
      cx: 40,
      cy: 25,
    });

  it('names a tap that does not move, and never a drag', () => {
    const g = start();
    g.set({ scale: 16, cx: 40, cy: 40 });
    const cam = g.camera;
    g.down(1, 200, 80);
    // A finger's tremble within the slop is still a tap, and the map stays.
    expect(g.move(1, 200 + TAP_SLOP - 1, 80)).toEqual({ kind: 'none' });
    expect(g.up(1, 100)).toEqual({ kind: 'tap', x: 200, y: 80 });
    expect(g.camera).toEqual(cam);
    // A drag moves the map with the finger and is no tap.
    g.down(2, 200, 80);
    expect(g.move(2, 240, 60)).toEqual({ kind: 'view' });
    expect(g.up(2, 2000)).toEqual({ kind: 'none' });
    const t0 = cameraTransform(cam, PAGE);
    const t1 = cameraTransform(g.camera, PAGE);
    expect([t1.offsetX - t0.offsetX, t1.offsetY - t0.offsetY]).toEqual([40, -20]);
    expect(g.active).toBe(false);
  });

  it('pinches with two fingers, and the one left behind drags on', () => {
    const g = start();
    g.down(1, 300, 80);
    g.down(2, 340, 80);
    expect(g.move(2, 380, 80)).toEqual({ kind: 'view' });
    expect(g.camera.scale).toBe(16);
    // The first finger lifts: no tap; the second drags.
    expect(g.up(1, 50)).toEqual({ kind: 'none' });
    const before = cameraTransform(g.camera, PAGE);
    g.move(2, 370, 90);
    const after = cameraTransform(g.camera, PAGE);
    expect([after.offsetX - before.offsetX, after.offsetY - before.offsetY]).toEqual([-10, 10]);
    expect(g.up(2, 80)).toEqual({ kind: 'none' });
  });

  it('zooms in a step at a double tap, and back to the opening view at the deepest zoom', () => {
    const g = start();
    const opening = g.camera;
    expect(g.down(1, 120, 40)).toEqual({ kind: 'none' });
    expect(g.up(1, 1000)).toEqual({ kind: 'tap', x: 120, y: 40 });
    g.down(1, 124, 42);
    expect(g.up(1, 1000 + DOUBLE_TAP_MS - 20)).toEqual({ kind: 'double', x: 124, y: 42 });
    expect(g.camera.scale).toBe(16);
    // The tapped point stayed under the finger.
    const under = pageToCell(opening, PAGE, 124, 42);
    const p = cellToPage(g.camera, PAGE, under.x, under.y);
    expect(Math.abs(p.x - 124)).toBeLessThan(1);
    expect(Math.abs(p.y - 42)).toBeLessThan(1);
    // At the deepest zoom a double tap goes back to the opening view.
    g.down(1, 300, 100);
    g.up(1, 5000);
    g.down(1, 300, 100);
    expect(g.up(1, 5100).kind).toBe('double');
    expect(g.camera).toEqual(opening);
    // Two taps too far apart in time or place are two taps.
    g.down(1, 300, 100);
    g.up(1, 9000);
    g.down(1, 300, 100);
    expect(g.up(1, 9000 + DOUBLE_TAP_MS + 1).kind).toBe('tap');
    g.down(1, 400, 100);
    expect(g.up(1, 9000 + DOUBLE_TAP_MS + 50).kind).toBe('tap');
  });

  it('never counts a cancelled pointer, or a finger after a pinch, as a tap', () => {
    const g = start();
    g.down(1, 200, 80);
    expect(g.cancel(1)).toEqual({ kind: 'none' });
    g.down(1, 200, 80);
    g.down(2, 260, 80);
    expect(g.up(2, 10)).toEqual({ kind: 'none' });
    expect(g.up(1, 20)).toEqual({ kind: 'none' });
    // A move from a pointer never put down (a mouse hovering) does nothing.
    expect(g.move(7, 10, 10)).toEqual({ kind: 'none' });
  });

  it('keeps the view on the page when the page changes size', () => {
    const g = start();
    g.set({ scale: 16, cx: 0, cy: 0 });
    g.resize({ width: 800, height: 400 });
    expect(g.camera.scale).toBe(16);
    g.resize({ width: 80, height: 80 });
    expect(g.camera.scale).toBe(8);
  });
});
