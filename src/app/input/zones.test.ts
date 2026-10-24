import { beforeEach, describe, expect, it } from 'vitest';
import { InputZones } from './zones';

// iPhone 14 Pro Max landscape in CSS px.
const W = 932;
const H = 430;
let z: InputZones;

beforeEach(() => {
  z = new InputZones({
    width: W,
    height: H,
    deadZonePx: 10,
    fullPx: 60,
    tapMaxMs: 250,
    tapMaxPx: 10,
  });
});

describe('move stick (left half)', () => {
  it('walks forward when dragged up, proportionally, capped at 1', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 295, 10);
    expect(z.consume().move).toBe(0); // inside the dead zone
    z.pointerMove(1, 200, 265, 20); // 35 px up: (35-10)/(60-10) = 0.5
    expect(z.consume().move).toBeCloseTo(0.5);
    z.pointerMove(1, 200, 100, 30);
    expect(z.consume().move).toBe(1);
  });

  it('walks backward at one third speed', () => {
    z.pointerDown(1, 200, 200, 0);
    z.pointerMove(1, 200, 300, 10); // 100 px down: full
    expect(z.consume().move).toBeCloseTo(-1 / 3);
  });

  it('strafes sideways at two thirds speed, right positive', () => {
    z.pointerDown(1, 200, 200, 0);
    z.pointerMove(1, 400, 200, 10);
    let f = z.consume();
    expect(f.move).toBe(0);
    expect(f.strafe).toBeCloseTo(2 / 3);
    z.pointerMove(1, 100, 200, 20);
    f = z.consume();
    expect(f.strafe).toBeCloseTo(-2 / 3);
    expect(z.isWalking).toBe(true);
  });

  it('commits to one axis per gesture until the stick returns to centre', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 240, 10); // vertical wins
    z.pointerMove(1, 300, 240, 20); // diagonal: still vertical, no strafe
    let f = z.consume();
    expect(f.move).toBe(1);
    expect(f.strafe).toBe(0);
    z.pointerMove(1, 200, 300, 30); // back to centre releases the axis
    z.pointerMove(1, 300, 300, 40); // now horizontal wins
    f = z.consume();
    expect(f.move).toBe(0);
    expect(f.strafe).toBeCloseTo(2 / 3);
  });

  it('cannot start strafing while the right thumb is looking around', () => {
    z.pointerDown(2, 700, 200, 0); // looking (stationary)
    z.pointerDown(1, 200, 300, 5);
    z.pointerMove(1, 300, 300, 10);
    expect(z.consume().strafe).toBe(0);
    z.pointerMove(1, 200, 100, 20); // forward is still allowed
    expect(z.consume().move).toBe(1);
  });

  it('stops when released', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 100, 10);
    z.pointerUp(1, 200, 100, 500);
    expect(z.consume().move).toBe(0);
    expect(z.isWalking).toBe(false);
  });

  it('move is a level, not a per-frame delta', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 100, 10);
    z.consume();
    expect(z.consume().move).toBe(1);
  });
});

describe('look area (right half)', () => {
  it('free-looks only while stationary', () => {
    z.pointerDown(2, 700, 200, 0);
    z.pointerMove(2, 720, 210, 10);
    const f = z.consume();
    expect(f.lookX).toBe(20);
    expect(f.lookY).toBe(10);
    expect(f.turnPx).toBe(0);
  });

  it('turns instead of looking while walking, ignoring vertical drag', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 100, 5); // walking
    z.pointerDown(2, 700, 200, 10);
    z.pointerMove(2, 730, 260, 20);
    const f = z.consume();
    expect(f.move).toBe(1);
    expect(f.turnPx).toBe(30);
    expect(f.lookX).toBe(0);
    expect(f.lookY).toBe(0);
  });

  it('switches from turning to looking the moment the stick is released', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 100, 5);
    z.pointerDown(2, 700, 200, 10);
    z.pointerMove(2, 710, 200, 20);
    z.pointerUp(1, 200, 100, 30);
    z.pointerMove(2, 720, 230, 40);
    const f = z.consume();
    expect(f.turnPx).toBe(10);
    expect(f.lookX).toBe(10);
    expect(f.lookY).toBe(30);
  });

  it('reports the frame the look drag ended', () => {
    z.pointerDown(2, 700, 200, 0);
    z.pointerMove(2, 720, 230, 10);
    expect(z.consume().lookReleased).toBe(false);
    z.pointerUp(2, 720, 230, 400);
    expect(z.consume().lookReleased).toBe(true);
    expect(z.consume().lookReleased).toBe(false);
  });

  it('accumulates and resets per frame', () => {
    z.pointerDown(2, 700, 200, 0);
    z.pointerMove(2, 705, 200, 10);
    z.pointerMove(2, 712, 200, 20);
    expect(z.consume().lookX).toBe(12);
    expect(z.consume().lookX).toBe(0);
  });
});

describe('taps', () => {
  it('reports a short still touch on either half at its start point', () => {
    z.pointerDown(1, 150, 200, 0);
    z.pointerUp(1, 152, 201, 120);
    z.pointerDown(2, 800, 100, 200);
    z.pointerUp(2, 800, 100, 300);
    const f = z.consume();
    expect(f.taps).toEqual([
      { x: 150, y: 200, time: 120 },
      { x: 800, y: 100, time: 300 },
    ]);
    expect(z.consume().taps).toEqual([]);
  });

  it('is a tap when the input clock says so though a stalled frame stretched the page clock', () => {
    z.pointerDown(1, 150, 200, 0, 1000);
    z.pointerUp(1, 150, 200, 900, 1080);
    expect(z.consume().taps).toEqual([{ x: 150, y: 200, time: 900 }]);
    expect(z.lastRelease?.durationMs).toBe(80);
    // Held long by both clocks: no tap. A stamp on one end only is ignored.
    z.pointerDown(2, 800, 100, 1000, 5000);
    z.pointerUp(2, 800, 100, 1400, 5400);
    z.pointerDown(3, 800, 100, 2000);
    z.pointerUp(3, 800, 100, 2100, 9000);
    expect(z.consume().taps).toEqual([{ x: 800, y: 100, time: 2100 }]);
  });

  it('is not a tap if held too long or moved too far', () => {
    z.pointerDown(1, 150, 200, 0);
    z.pointerUp(1, 150, 200, 400);
    z.pointerDown(2, 800, 100, 500);
    z.pointerMove(2, 830, 100, 520);
    z.pointerUp(2, 800, 100, 560); // returned to start, but travelled
    expect(z.consume().taps).toEqual([]);
  });
});

describe('multi-touch', () => {
  it('ignores a second finger in an occupied zone', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerDown(3, 100, 300, 1);
    z.pointerMove(3, 100, 100, 10);
    expect(z.consume().move).toBe(0);
    z.pointerUp(3, 100, 100, 50);
    expect(z.consume().taps).toEqual([]);
    z.pointerMove(1, 200, 100, 60);
    expect(z.consume().move).toBe(1);
  });

  it('cancelling the move pointer stops walking', () => {
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 100, 10);
    z.pointerCancel(1);
    expect(z.consume().move).toBe(0);
  });
});

describe('keyboard fallback', () => {
  it('maps keys to the same semantics, including one-third backward', () => {
    z.setKeyboard(1, 0);
    expect(z.consume().move).toBe(1);
    z.setKeyboard(-1, 1);
    const f = z.consume();
    expect(f.move).toBeCloseTo(-1 / 3);
    expect(f.keyTurn).toBe(1);
  });

  it('Q/E strafe at two thirds and yield to forward/backward', () => {
    z.setKeyboard(0, 0, 1);
    expect(z.consume().strafe).toBeCloseTo(2 / 3);
    z.setKeyboard(1, 0, 1);
    const f = z.consume();
    expect(f.move).toBe(1);
    expect(f.strafe).toBe(0);
  });

  it('touch takes precedence over keys', () => {
    z.setKeyboard(-1, 0);
    z.pointerDown(1, 200, 300, 0);
    z.pointerMove(1, 200, 100, 10);
    expect(z.consume().move).toBe(1);
  });
});

describe('the split between the halves', () => {
  it('falls at the view’s middle when one is given, not the screen’s', () => {
    // MM6's frame: the view between the pillars, its middle at 394 on the phone.
    z.configure({ splitX: 394 });
    z.pointerDown(1, 420, 300, 0);
    z.pointerMove(1, 420, 200, 10);
    // Right of the view's middle, left of the screen's: a look, not a walk.
    expect(z.consume().move).toBe(0);
    z.pointerUp(1, 420, 200, 20);
    z.pointerDown(2, 380, 300, 30);
    z.pointerMove(2, 380, 200, 40);
    expect(z.consume().move).toBe(1);
  });
});
