/**
 * Touch control scheme from DESIGN.md 7.1, as a pure state machine so it can be unit tested.
 *
 * - Left half: invisible move stick. Hold and drag up to walk forward, down to walk
 *   backward at one third speed, or sideways to strafe at two thirds speed. Each
 *   stick gesture is one axis: whichever direction leaves the dead zone first wins until
 *   the stick returns to centre. Strafing cannot start while the right thumb is looking.
 * - Right half: free look (yaw and pitch) only while stationary; while moving, horizontal
 *   drag turns the party and vertical drag is ignored.
 * - A short touch without movement, on either half, is a tap (interact or attack).
 */
export interface ZoneConfig {
  width: number;
  height: number;
  /** Stick travel in CSS px before any movement. */
  deadZonePx: number;
  /** Stick travel in CSS px for full speed. */
  fullPx: number;
  /** Backward speed as a fraction of forward. */
  backwardFactor: number;
  /** Strafe speed as a fraction of forward. */
  strafeFactor: number;
  tapMaxMs: number;
  tapMaxPx: number;
  /**
   * Where the move half ends and the look half begins, CSS px from the left: the view's middle
   * (src/app/view-box.ts), which MM6's frame puts left of the screen's; the screen's when unset.
   */
  splitX?: number;
}

export const DEFAULT_ZONES: Omit<ZoneConfig, 'width' | 'height'> = {
  deadZonePx: 12,
  fullPx: 70,
  backwardFactor: 1 / 3,
  strafeFactor: 2 / 3,
  tapMaxMs: 250,
  tapMaxPx: 12,
};

export interface Tap {
  x: number;
  y: number;
  time: number;
}

export interface FrameInput {
  /** Forward speed fraction: 0..1 forward, negative (down to -backwardFactor) backward. */
  move: number;
  /** Sideways speed fraction, positive right, magnitude up to strafeFactor. */
  strafe: number;
  /** True in the frame the look drag ended. */
  lookReleased: boolean;
  /** Horizontal drag in px accumulated while walking: positive turns right. */
  turnPx: number;
  /** Drag accumulated while stationary: positive x looks right, positive y looks down. */
  lookX: number;
  lookY: number;
  /** Keyboard turn axis, -1..1 (desktop only). */
  keyTurn: number;
  taps: Tap[];
}

interface Pointer {
  role: 'move' | 'look' | 'ignored';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  /** The input's own clock at the press (event.timeStamp), when the source gives one. */
  startStamp: number | undefined;
  maxTravel: number;
  /** Axis a move gesture committed to once it left the dead zone. */
  axis: 'none' | 'vertical' | 'horizontal';
}

export class InputZones {
  private config: ZoneConfig;
  private readonly pointers = new Map<number, Pointer>();
  private move = 0;
  private strafe = 0;
  private lookReleased = false;
  private turnPx = 0;
  private lookX = 0;
  private lookY = 0;
  private taps: Tap[] = [];
  private keyMove = 0;
  private keyStrafe = 0;
  private keyTurn = 0;
  /** Diagnostics: why the last release was or was not a tap. */
  lastRelease: { role: string; durationMs: number; travelPx: number; tap: boolean } | null = null;

  constructor(config: Partial<ZoneConfig> & { width: number; height: number }) {
    this.config = { ...DEFAULT_ZONES, ...config };
  }

  resize(width: number, height: number): void {
    this.config = { ...this.config, width, height };
  }

  configure(next: Partial<ZoneConfig>): void {
    this.config = { ...this.config, ...next };
  }

  /** True while the stick (or a key) is driving movement, forward, backward or sideways. */
  get isWalking(): boolean {
    return this.effectiveMove() !== 0 || this.effectiveStrafe() !== 0;
  }

  /**
   * `time` is the page's monotonic clock when the event was handled; `stamp` the input's
   * own time of the press (event.timeStamp), which a frame that stalls the page cannot
   * stretch, so a tap through a hitch still counts.
   */
  pointerDown(id: number, x: number, y: number, time: number, stamp?: number): void {
    if (this.pointers.has(id)) return;
    const wantsMove = x < (this.config.splitX ?? this.config.width / 2);
    const role: Pointer['role'] = wantsMove
      ? this.hasRole('move')
        ? 'ignored'
        : 'move'
      : this.hasRole('look')
        ? 'ignored'
        : 'look';
    this.pointers.set(id, {
      role,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      startTime: time,
      startStamp: stamp,
      maxTravel: 0,
      axis: 'none',
    });
  }

  pointerMove(id: number, x: number, y: number, _time: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    const dx = x - p.lastX;
    const dy = y - p.lastY;
    p.lastX = x;
    p.lastY = y;
    p.maxTravel = Math.max(p.maxTravel, Math.hypot(x - p.startX, y - p.startY));

    if (p.role === 'move') {
      const up = p.startY - y;
      const right = x - p.startX;
      const dead = this.config.deadZonePx;
      if (p.axis === 'none') {
        if (Math.abs(up) > dead && Math.abs(up) >= Math.abs(right)) p.axis = 'vertical';
        else if (Math.abs(right) > dead) {
          // Strafing cannot start while the right thumb is looking around.
          if (!(this.hasRole('look') && !this.isWalking)) p.axis = 'horizontal';
        }
      } else if (Math.abs(up) <= dead && Math.abs(right) <= dead) {
        p.axis = 'none';
      }
      if (p.axis === 'vertical') {
        this.move = this.stickAmount(up);
        this.strafe = 0;
      } else if (p.axis === 'horizontal') {
        this.move = 0;
        this.strafe = this.sideAmount(right);
      } else {
        this.move = 0;
        this.strafe = 0;
      }
    } else if (p.role === 'look') {
      if (this.isWalking) {
        this.turnPx += dx;
      } else {
        this.lookX += dx;
        this.lookY += dy;
      }
    }
  }

  pointerUp(id: number, x: number, y: number, time: number, stamp?: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    this.pointers.delete(id);
    if (p.role === 'move') {
      this.move = 0;
      this.strafe = 0;
    }
    if (p.role === 'look') this.lookReleased = true;
    const travel = Math.max(p.maxTravel, Math.hypot(x - p.startX, y - p.startY));
    // The shorter of the two clocks: the page's, or the input's own when both ends have it
    // (a long frame between the press and the release stretches only the page's).
    const byPage = time - p.startTime;
    const byInput =
      stamp !== undefined && p.startStamp !== undefined && stamp >= p.startStamp
        ? stamp - p.startStamp
        : Infinity;
    const durationMs = Math.min(byPage, byInput);
    const tap =
      p.role !== 'ignored' && durationMs <= this.config.tapMaxMs && travel <= this.config.tapMaxPx;
    this.lastRelease = { role: p.role, durationMs, travelPx: travel, tap };
    if (tap) this.taps.push({ x: p.startX, y: p.startY, time });
  }

  pointerCancel(id: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    this.pointers.delete(id);
    if (p.role === 'move') {
      this.move = 0;
      this.strafe = 0;
    }
    if (p.role === 'look') this.lookReleased = true;
  }

  /**
   * Desktop fallback: W/S move axis (-1..1), A/D turn axis (-1..1), Q/E strafe axis
   * (-1..1). Strafe yields to forward/backward, as on the stick.
   */
  setKeyboard(move: number, turn: number, strafe = 0): void {
    this.keyMove = Math.max(-1, Math.min(1, move));
    this.keyTurn = Math.max(-1, Math.min(1, turn));
    this.keyStrafe = Math.max(-1, Math.min(1, strafe));
  }

  /** Read and reset this frame's accumulated input. `move` is a level, not a delta. */
  consume(): FrameInput {
    const out: FrameInput = {
      move: this.effectiveMove(),
      strafe: this.effectiveStrafe(),
      lookReleased: this.lookReleased,
      turnPx: this.turnPx,
      lookX: this.lookX,
      lookY: this.lookY,
      keyTurn: this.keyTurn,
      taps: this.taps,
    };
    this.turnPx = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.lookReleased = false;
    this.taps = [];
    return out;
  }

  private effectiveMove(): number {
    if (this.move !== 0) return this.move;
    if (this.strafe !== 0) return 0;
    if (this.keyMove > 0) return this.keyMove;
    if (this.keyMove < 0) return this.keyMove * this.config.backwardFactor;
    return 0;
  }

  private effectiveStrafe(): number {
    if (this.strafe !== 0) return this.strafe;
    if (this.move !== 0 || this.keyMove !== 0) return 0;
    return this.keyStrafe * this.config.strafeFactor;
  }

  private hasRole(role: Pointer['role']): boolean {
    for (const p of this.pointers.values()) if (p.role === role) return true;
    return false;
  }

  /** Map stick travel (px, up positive) to a speed fraction. */
  private stickAmount(travelUp: number): number {
    const { deadZonePx, fullPx, backwardFactor } = this.config;
    const mag = Math.abs(travelUp);
    if (mag <= deadZonePx) return 0;
    const t = Math.min(1, (mag - deadZonePx) / Math.max(1, fullPx - deadZonePx));
    return travelUp > 0 ? t : -t * backwardFactor;
  }

  /** Map sideways stick travel (px, right positive) to a strafe fraction. */
  private sideAmount(travelRight: number): number {
    const { deadZonePx, fullPx, strafeFactor } = this.config;
    const mag = Math.abs(travelRight);
    if (mag <= deadZonePx) return 0;
    const t = Math.min(1, (mag - deadZonePx) / Math.max(1, fullPx - deadZonePx));
    return Math.sign(travelRight) * t * strafeFactor;
  }
}
