/**
 * Touch control scheme from DESIGN.md 7.1, as a pure state machine so it can be unit tested.
 *
 * - Left half: invisible move stick. Hold and drag up to walk forward, down to walk
 *   backward at one third speed. No strafing.
 * - Right half: free look (yaw and pitch) only while stationary; while walking, horizontal
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
  tapMaxMs: number;
  tapMaxPx: number;
}

export const DEFAULT_ZONES: Omit<ZoneConfig, 'width' | 'height'> = {
  deadZonePx: 12,
  fullPx: 70,
  backwardFactor: 1 / 3,
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
  maxTravel: number;
}

export class InputZones {
  private config: ZoneConfig;
  private readonly pointers = new Map<number, Pointer>();
  private move = 0;
  private turnPx = 0;
  private lookX = 0;
  private lookY = 0;
  private taps: Tap[] = [];
  private keyMove = 0;
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

  /** True while the stick (or a key) is driving movement. */
  get isWalking(): boolean {
    return this.effectiveMove() !== 0;
  }

  pointerDown(id: number, x: number, y: number, time: number): void {
    if (this.pointers.has(id)) return;
    const wantsMove = x < this.config.width / 2;
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
      maxTravel: 0,
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
      this.move = this.stickAmount(p.startY - y);
    } else if (p.role === 'look') {
      if (this.isWalking) {
        this.turnPx += dx;
      } else {
        this.lookX += dx;
        this.lookY += dy;
      }
    }
  }

  pointerUp(id: number, x: number, y: number, time: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    this.pointers.delete(id);
    if (p.role === 'move') this.move = 0;
    const travel = Math.max(p.maxTravel, Math.hypot(x - p.startX, y - p.startY));
    const tap =
      p.role !== 'ignored' &&
      time - p.startTime <= this.config.tapMaxMs &&
      travel <= this.config.tapMaxPx;
    this.lastRelease = { role: p.role, durationMs: time - p.startTime, travelPx: travel, tap };
    if (tap) this.taps.push({ x: p.startX, y: p.startY, time });
  }

  pointerCancel(id: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    this.pointers.delete(id);
    if (p.role === 'move') this.move = 0;
  }

  /** Desktop fallback: W/S style move axis (-1..1) and A/D style turn axis (-1..1). */
  setKeyboard(move: number, turn: number): void {
    this.keyMove = Math.max(-1, Math.min(1, move));
    this.keyTurn = Math.max(-1, Math.min(1, turn));
  }

  /** Read and reset this frame's accumulated input. `move` is a level, not a delta. */
  consume(): FrameInput {
    const out: FrameInput = {
      move: this.effectiveMove(),
      turnPx: this.turnPx,
      lookX: this.lookX,
      lookY: this.lookY,
      keyTurn: this.keyTurn,
      taps: this.taps,
    };
    this.turnPx = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.taps = [];
    return out;
  }

  private effectiveMove(): number {
    if (this.move !== 0) return this.move;
    if (this.keyMove > 0) return this.keyMove;
    if (this.keyMove < 0) return this.keyMove * this.config.backwardFactor;
    return 0;
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
}
