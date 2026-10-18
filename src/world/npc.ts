/**
 * Townsfolk (DESIGN.md 16.2): a villager stands at their place, idles, turns to face the
 * party when it comes near, and talks when tapped: the talk panel (src/ui/dialogue.ts) for
 * the villagers with a script, a line in the status bar for the rest.
 */
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { NpcDef } from '../game/monsters';
import type { Character } from './character';

const NOTICE_RANGE = 6;
const TALK_SECONDS = 3.5;

export class Npc {
  private line = 0;
  private talkUntil = 0;
  /** In the talk panel: the talk clip holds till the panel shuts. */
  private engaged = false;
  private readonly restYaw: number;
  private time = 0;

  constructor(
    readonly def: NpcDef,
    readonly character: Character,
  ) {
    this.restYaw = character.node.rotation.y;
    character.play('idle');
  }

  get name(): string {
    return this.def.name;
  }

  get position(): Vector3 {
    return this.character.node.position;
  }

  /** The next thing they have to say; starts the talk clip. */
  greet(): string {
    const text = this.def.lines[this.line % this.def.lines.length]!;
    this.line += 1;
    this.say();
    return `${this.def.name}: ${text}`;
  }

  /** Mouth some words: the talk clip for a few seconds, then idle again. */
  say(): void {
    this.talkUntil = this.time + TALK_SECONDS;
    if (this.character.clips.includes('talk')) this.character.play('talk');
  }

  /**
   * The talk panel opens on them or shuts. While it is open they keep the talk clip between
   * lines: the idle is Meshy's look-around, the hips a quarter turn and the head well past
   * the shoulder, and in the window's close-up it read as the head spinning on the neck
   * (owner, 2026-10-18: "twitching, very scary").
   */
  engage(on: boolean): void {
    this.engaged = on;
    if (on) this.say();
  }

  update(dt: number, party: Vector3): void {
    this.time += dt;
    const node = this.character.node;
    const dx = party.x - node.position.x;
    const dz = party.z - node.position.z;
    const near = dx * dx + dz * dz < NOTICE_RANGE * NOTICE_RANGE;
    // Turn to the party when it is near, back to their place when it leaves.
    const want = near ? Math.atan2(dx, dz) : this.restYaw;
    let delta = want - node.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    node.rotation.y += delta * Math.min(1, dt * 4);
    if (this.talkUntil > 0 && this.time >= this.talkUntil && !this.engaged) {
      this.talkUntil = 0;
      this.character.play('idle');
    }
  }
}
