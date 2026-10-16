import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { Scene } from '@babylonjs/core/scene';
import type { Observer } from '@babylonjs/core/Misc/observable';

/**
 * Low-frame-rate animation, MM6 style: clips advance in discrete steps of `stepFps`
 * regardless of the display refresh rate.
 */

/**
 * Frame to show after `elapsedSec` of a clip spanning [from, to] frames authored at `clipFps`,
 * stepped at `stepFps` steps per second.
 */
export function quantizeFrame(
  elapsedSec: number,
  from: number,
  to: number,
  clipFps: number,
  stepFps: number,
  loop = true,
): number {
  const length = to - from;
  if (length <= 0 || clipFps <= 0 || stepFps <= 0) return from;
  const framesPerStep = clipFps / stepFps;
  const stepped = Math.floor((elapsedSec * clipFps) / framesPerStep) * framesPerStep;
  const offset = loop ? ((stepped % length) + length) % length : Math.min(stepped, length);
  return from + offset;
}

interface Entry {
  group: AnimationGroup;
  loop: boolean;
  clipFps: number;
  elapsed: number;
  speed: number;
}

export class AnimationStepper {
  private readonly entries = new Map<AnimationGroup, Entry>();
  private readonly observer: Observer<Scene>;

  /** 0 freezes every clip (hit stop), 1 runs at the display's pace. */
  timeScale = 1;

  constructor(
    private readonly scene: Scene,
    public stepFps = 10,
  ) {
    this.observer = scene.onBeforeAnimationsObservable.add(() => this.tick());
  }

  /** Take over a group: it is started, paused, and driven frame by frame from here. */
  add(group: AnimationGroup, opts: { loop?: boolean; speed?: number } = {}): void {
    const first = group.targetedAnimations[0];
    const clipFps = first?.animation.framePerSecond ?? 30;
    group.start(opts.loop ?? true);
    group.pause();
    this.entries.set(group, {
      group,
      loop: opts.loop ?? true,
      clipFps,
      elapsed: 0,
      speed: opts.speed ?? 1,
    });
    group.goToFrame(group.from);
  }

  remove(group: AnimationGroup): void {
    this.entries.delete(group);
  }

  restart(group: AnimationGroup): void {
    const e = this.entries.get(group);
    if (e) e.elapsed = 0;
  }

  /** Clip seconds played so far (speed applied), or null when the group is not driven. */
  elapsed(group: AnimationGroup): number | null {
    return this.entries.get(group)?.elapsed ?? null;
  }

  /** Length of the clip in seconds at its authored rate. */
  duration(group: AnimationGroup): number {
    const e = this.entries.get(group);
    const clipFps = e?.clipFps ?? group.targetedAnimations[0]?.animation.framePerSecond ?? 30;
    return (group.to - group.from) / clipFps;
  }

  /** A one-shot clip that has reached its last frame. */
  finished(group: AnimationGroup): boolean {
    const e = this.entries.get(group);
    return !!e && !e.loop && e.elapsed >= this.duration(group);
  }

  private tick(): void {
    const dt = (this.scene.getEngine().getDeltaTime() / 1000) * this.timeScale;
    for (const e of this.entries.values()) {
      e.elapsed += dt * e.speed;
      const frame = quantizeFrame(
        e.elapsed,
        e.group.from,
        e.group.to,
        e.clipFps,
        this.stepFps,
        e.loop,
      );
      e.group.goToFrame(frame);
    }
  }

  dispose(): void {
    this.scene.onBeforeAnimationsObservable.remove(this.observer);
    this.entries.clear();
  }
}
