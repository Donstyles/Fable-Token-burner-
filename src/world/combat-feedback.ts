/**
 * Hit feedback (DESIGN.md 14.4), after the owner's reel on punchy hits: the struck monster
 * flashes white for a few frames, a whack lands on the impact frame, blood bursts in the
 * blow's direction, the monster is knocked back a step, and the view shakes while the game
 * freezes for a few frames. The party being struck gets the thud, a red flash and a shake.
 */
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import type { Scene } from '@babylonjs/core/scene';
import { playImpact } from '../app/audio';
import type { AnimationStepper } from '../render/animation-step';
import { Flash, HitStop, Shake } from './feedback-timing';
import type { Monster } from './monster';
import { hitBurst } from './particles';

export interface FeedbackTuning {
  /** Seconds the struck monster shows white. */
  flashSec: number;
  /** Seconds the game freezes on a landed blow. */
  freezeSec: number;
  /** Camera shake amplitude in metres for a blow the party lands, and one it takes. */
  shakeLanded: number;
  shakeTaken: number;
  shakeSec: number;
  /** Metres a struck monster is pushed back. */
  knockbackM: number;
  /** Particles per landed blow. */
  burstCount: number;
}

export const DEFAULT_FEEDBACK: FeedbackTuning = {
  flashSec: 0.08,
  freezeSec: 0.07,
  shakeLanded: 0.045,
  shakeTaken: 0.09,
  shakeSec: 0.22,
  knockbackM: 0.45,
  burstCount: 16,
};

export class CombatFeedback {
  readonly tuning: FeedbackTuning;
  private readonly stop = new HitStop();
  private readonly shake: Shake;
  private readonly flashes = new Map<Monster, Flash>();
  private readonly burst: ParticleSystem;
  private readonly redFlash: HTMLDivElement;
  private redLevel = 0;

  constructor(
    scene: Scene,
    private readonly stepper: AnimationStepper,
    uiLayer: HTMLElement,
    tuning: Partial<FeedbackTuning> = {},
    rng: () => number = Math.random,
  ) {
    this.tuning = { ...DEFAULT_FEEDBACK, ...tuning };
    this.shake = new Shake(rng);
    this.burst = hitBurst(scene);
    this.burst.start();
    // The red flash: MM6 tinted the view when the party was struck.
    this.redFlash = document.createElement('div');
    Object.assign(this.redFlash.style, {
      position: 'absolute',
      inset: '0',
      background: '#b01818',
      opacity: '0',
      pointerEvents: 'none',
      mixBlendMode: 'multiply',
    } satisfies Partial<CSSStyleDeclaration>);
    uiLayer.appendChild(this.redFlash);
  }

  /** The game is frozen for the hit stop. */
  get frozen(): boolean {
    return this.stop.frozen;
  }

  /** Strongest monster flash in progress, 0 or 1. */
  get flash(): number {
    let level = 0;
    for (const f of this.flashes.values()) level = Math.max(level, f.level);
    return level;
  }

  get shaking(): boolean {
    return this.shake.active;
  }

  /** A party member's blow landed: `from` is the attacker's feet, `killed` whether it fell. */
  monsterStruck(monster: Monster, from: Vector3, killed: boolean): void {
    const t = this.tuning;
    const dir = monster.position.subtract(from);
    dir.y = 0;
    const len = dir.length() || 1;
    dir.scaleInPlace(1 / len);
    const flash = this.flashes.get(monster) ?? new Flash();
    this.flashes.set(monster, flash);
    flash.trigger(t.flashSec);
    monster.character.setFlash(1);
    playImpact(killed ? 'thud' : 'whack');
    const chest = monster.position.add(new Vector3(0, monster.def.heightMetres * 0.6, 0));
    this.emit(chest, dir, t.burstCount * (killed ? 2 : 1));
    monster.knockback(dir, t.knockbackM * (killed ? 1.6 : 1));
    this.stop.freeze(t.freezeSec * (killed ? 2 : 1));
    this.shake.trigger(t.shakeLanded, t.shakeSec);
  }

  /** A party member swung and missed. */
  monsterMissed(): void {
    playImpact('whoosh');
  }

  /** A monster's blow landed on the party. */
  partyStruck(): void {
    const t = this.tuning;
    playImpact('thud');
    this.redLevel = 1;
    this.stop.freeze(t.freezeSec);
    this.shake.trigger(t.shakeTaken, t.shakeSec);
  }

  /** A monster swung at the party and missed. */
  partyMissed(): void {
    playImpact('whoosh');
  }

  /**
   * Advance the clocks with the real frame time; returns the simulated step to use for the
   * world (0 while frozen) and pauses the animation stepper for the freeze.
   */
  update(dt: number): number {
    const simDt = this.stop.update(dt);
    this.stepper.timeScale = this.stop.frozen ? 0 : 1;
    for (const [monster, f] of this.flashes) {
      const before = f.level;
      f.update(dt);
      if (before !== f.level) monster.character.setFlash(f.level);
      if (f.level === 0) this.flashes.delete(monster);
    }
    this.shake.update(dt);
    if (this.redLevel > 0) {
      this.redLevel = Math.max(0, this.redLevel - dt / 0.18);
      this.redFlash.style.opacity = (this.redLevel * 0.55).toFixed(3);
    }
    return simDt;
  }

  /** Apply the shake to a camera whose position and rotation were set this frame. */
  applyCamera(camera: TargetCamera): void {
    if (!this.shake.active) return;
    const o = this.shake.offset;
    const right = camera.getDirection(Vector3.Right());
    const up = camera.getDirection(Vector3.Up());
    camera.position.addInPlace(right.scale(o.x)).addInPlace(up.scale(o.y));
    camera.rotation.z += o.roll;
  }

  private emit(at: Vector3, dir: Vector3, count: number): void {
    const ps = this.burst;
    ps.emitter = at.clone();
    ps.direction1 = new Vector3(dir.x * 2 - 0.6, 0.6, dir.z * 2 - 0.6);
    ps.direction2 = new Vector3(dir.x * 4 + 0.6, 2.4, dir.z * 4 + 0.6);
    ps.manualEmitCount = count;
  }

  dispose(): void {
    this.burst.dispose();
    this.redFlash.remove();
    for (const m of this.flashes.keys()) m.character.setFlash(0);
    this.flashes.clear();
  }
}
