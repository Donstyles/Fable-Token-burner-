/**
 * A warm halo round every lantern (DESIGN.md 17.5): Babylon's own sprites, always facing the
 * eye and added to what is behind them, so the glass reads as lit from across the square at
 * dusk and not at all at noon. They come up as the lanterns' light does (`setStrength`, from the
 * day's light), are drawn in one batch for all lanterns and cast nothing; the light itself is
 * the lantern's point light in the materials. The texture is the particles' soft dot.
 */
import '@babylonjs/core/Sprites/spriteSceneComponent';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager';
import type { Scene } from '@babylonjs/core/scene';
import type { LevelLight } from './level';
import { softSprite } from './particles';

/** The halo's size across, metres, and how strong it is at full night. */
const SIZE = 1.4;
const STRENGTH = 0.85;
/** Its colour: the lantern's warm gold. */
const WARM = [1, 0.72, 0.4] as const;

export class Halos {
  private readonly sprites: Sprite[] = [];
  private readonly manager: SpriteManager | null = null;

  constructor(scene: Scene, lights: readonly LevelLight[]) {
    const lanterns = lights.filter((l) => l.kind === 'lantern');
    if (!lanterns.length) return;
    const texture = softSprite(scene);
    const manager = new SpriteManager('halos', '', lanterns.length, 64, scene);
    manager.texture = texture;
    manager.blendMode = Constants.ALPHA_ADD;
    manager.isPickable = false;
    manager.disableDepthWrite = true;
    this.manager = manager;
    for (const l of lanterns) {
      const s = new Sprite('halo', manager);
      s.position = l.position.clone();
      s.width = SIZE;
      s.height = SIZE;
      s.color = new Color4(WARM[0], WARM[1], WARM[2], 0);
      this.sprites.push(s);
    }
  }

  /** 0 by day to 1 at full night: the halos come up with the lanterns' light. */
  setStrength(night: number): void {
    const a = STRENGTH * Math.min(1, Math.max(0, night));
    for (const s of this.sprites) {
      s.color.a = a;
      s.isVisible = a > 0.02;
    }
  }

  dispose(): void {
    this.manager?.dispose();
    this.sprites.length = 0;
  }
}
