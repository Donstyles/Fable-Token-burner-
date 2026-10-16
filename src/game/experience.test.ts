import { describe, expect, it } from 'vitest';
import { maxHp } from './character';
import { afflict } from './conditions';
import {
  addExperience,
  canLevelUp,
  levelForXp,
  levelUp,
  nextLevelGains,
  shareExperience,
  trainingCost,
  xpForLevel,
  xpToNextLevel,
} from './experience';
import { testCharacters } from './fixtures';

describe('experience curve', () => {
  it('follows 1000 × L × (L − 1) / 2', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(1000);
    expect(xpForLevel(3)).toBe(3000);
    expect(xpForLevel(4)).toBe(6000);
    expect(xpForLevel(5)).toBe(10000);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(999)).toBe(1);
    expect(levelForXp(2999)).toBe(2);
    expect(levelForXp(10000)).toBe(5);
    expect(trainingCost(2)).toBe(50);
    expect(trainingCost(10, 1.5)).toBe(375);
  });
});

describe('gaining experience', () => {
  it('applies the Learning bonus and skips the dead', () => {
    const [knight, archer, cleric] = testCharacters();
    knight!.skills.learning = { level: 2, rank: 'expert' };
    expect(addExperience(knight!, 100)).toBe(104);
    expect(addExperience(archer!, -5)).toBe(0);
    afflict(cleric!.conditions, 'dead', 0);
    expect(addExperience(cleric!, 100)).toBe(0);
    const shares = shareExperience([knight!, archer!, cleric!], 100);
    expect(shares).toEqual([52, 50, 0]);
    expect(xpToNextLevel(archer!)).toBe(950);
  });

  it('levels up at the trainer with skill points and the class gains', () => {
    const [knight] = testCharacters();
    const k = knight!;
    expect(canLevelUp(k)).toBe(false);
    k.xp = 1000;
    expect(canLevelUp(k)).toBe(true);
    const before = maxHp(k);
    k.hp = before - 10;
    expect(nextLevelGains(k)).toEqual({ hp: 5, sp: 0 });
    const r = levelUp(k);
    expect(r).toEqual({ level: 2, hpGain: 5, spGain: 0, skillPoints: 5 });
    expect(maxHp(k)).toBe(before + 5);
    expect(k.hp).toBe(before - 5);
    expect(canLevelUp(k)).toBe(false);
    afflict(k.conditions, 'dead', 0);
    k.xp = 99999;
    expect(canLevelUp(k)).toBe(false);
  });
});
