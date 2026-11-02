import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';
import { PortalWatcher } from './portals';

describe('a trigger disc the party walks into (DESIGN 15.3, 17.9)', () => {
  it('arms once the party has stood clear, fires once, and fires again after a reset', () => {
    const fired: string[] = [];
    const w = new PortalWatcher(
      [{ name: 'door', position: new Vector3(0, 0, 0), radius: 2 }],
      (t) => fired.push(t.name),
    );
    // Starting on the disc does not fire it: the party must come to it.
    expect(w.update(new Vector3(0, 0, 0))).toBeNull();
    expect(w.isArmed('door')).toBe(false);
    w.update(new Vector3(5, 0, 0));
    expect(w.isArmed('door')).toBe(true);
    expect(w.update(new Vector3(1, 0, 0))?.name).toBe('door');
    expect(w.update(new Vector3(1, 0, 0))).toBeNull();
    expect(fired).toEqual(['door']);
    // Reset with the party still on the disc: it waits for them to step clear.
    w.reset();
    expect(w.update(new Vector3(1, 0, 0))).toBeNull();
    w.update(new Vector3(0, 0, 6));
    expect(w.update(new Vector3(0, 0, 1))?.name).toBe('door');
    expect(fired).toEqual(['door', 'door']);
  });
});
