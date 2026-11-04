import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Goblin Warren (docs/CAMPAIGN.md step 4, DESIGN.md 17.24): the goblins' own holes in the
 * second of Gullhaven's hills, where the scouts Maren fears come from. A tunnel from the
 * mouth opens into the den, a wide cave with sleeping pockets to either hand and the shaman's
 * fire; a narrowing passage climbs to the deep cave, where hobgoblins stand guard before the
 * one piece of worked stone in the place, a Sea Kings' vault the goblins squat in, Grik the
 * Warren-Lord on its floor and the warren's takings behind him.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in
 * the tunnel from the mouth on the hill.
 */
export const options = { ambient: [0.08, 0.08, 0.1] as [number, number, number], bakeCell: 1 };

/** The way out: the mouth on the hill's south flank. */
export const portals: PortalRecord[] = [
  {
    name: 'warren-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'gullhaven', entry: 'warren' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

/** The vault's door is locked; the key lies where the hobgoblins keep it, in the deep cave. */
export const items: ItemRecord[] = [{ name: 'deep-key', item: 'iron-key', position: [6, 0, 46] }];

/**
 * Scouts in the den with their shaman at his fire, scouts on the passage, hobgoblins and the
 * goblins' king in the deep cave, Grik in the vault.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'goblin-scout', position: [-3, 0, 13], yawDeg: 180 },
  { kind: 'goblin-scout', position: [4, 0, 16], yawDeg: 180 },
  { kind: 'goblin-scout', position: [-9, 0, 19], yawDeg: 135 },
  { kind: 'goblin-scout', position: [-11, 0, 14], yawDeg: 90 },
  { kind: 'goblin-shaman', position: [12, 0, 18], yawDeg: 270 },
  { kind: 'goblin-scout', position: [-1, 0, 30], yawDeg: 180 },
  { kind: 'goblin-scout', position: [1, 0, 35], yawDeg: 180 },
  { kind: 'hobgoblin', position: [-4, 0, 44], yawDeg: 180 },
  { kind: 'hobgoblin', position: [4, 0, 47], yawDeg: 180 },
  { kind: 'goblin-king', position: [0, 0, 49], yawDeg: 180 },
  { kind: 'goblin-grik', position: [0, 0, 64], yawDeg: 180 },
];

export default function goblinWarren(plan: LevelBuilder): void {
  const warm: [number, number, number] = [1, 0.62, 0.3];
  const green: [number, number, number] = [0.6, 0.9, 0.55];
  const dark = { density: 0.022, color: [0.006, 0.007, 0.006] as [number, number, number] };

  // ── The warren proper: rock from the mouth to the vault's south wall ───────────────────
  // The vault's south wall stands at z = 56.4 (centre 62, half depth 5, wall 0.6); the rock runs
  // up to it and the last passage leaves the rock straight into the doorway.
  plan.cavern({
    name: 'warren',
    bounds: { min: [-17, -3, -8], max: [17, 10, 56.4] },
    cell: 0.5,
    roughness: 0.28,
    seed: 29,
    fog: { density: 0.02, color: [0.01, 0.011, 0.007] },
    carve: (s) =>
      s.union(
        // The tunnel in from the mouth, flat underfoot.
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.5), s.below(0)),
        // The den.
        s.subtract(s.ellipsoid([0, 3, 16], [11, 6, 9]), s.below(0)),
        // The sleeping pocket to the west, the shaman's fire to the east.
        s.subtract(s.sphere([-12, 2, 14], 4.5), s.below(0)),
        s.subtract(s.sphere([12, 2.2, 18], 4.2), s.below(0)),
        // The passage climbing north, narrower.
        s.subtract(s.capsule([0, 1.7, 23], [0, 1.7, 37], 2.1), s.below(0)),
        // The deep cave where the hobgoblins stand.
        s.subtract(s.ellipsoid([0, 2.8, 45], [9, 5.5, 8]), s.below(0)),
        // The last passage into the Sea Kings' stone.
        s.subtract(s.capsule([0, 1.7, 51], [0, 1.7, 60], 2.2), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.brazier({ at: [-4, 0, 18], intensity: 2.8, range: 13 });
  plan.brazier({ at: [12, 0, 15.5], color: green, intensity: 2.4, range: 11 });
  plan.light([-12, 2.2, 14], warm, 8, 1.4, 'glow');
  plan.light([0, 2.4, 30], warm, 9, 1.2, 'glow');
  plan.brazier({ at: [-5, 0, 42], intensity: 3, range: 14 });
  plan.light([6, 2.4, 47], warm, 9, 1.4, 'glow');
  plan.point('warren-tunnel', [0, 0, 4], 'poi');
  plan.point('den', [0, 0, 16], 'poi');
  plan.point('shaman-fire', [12, 0, 18], 'loot');
  plan.point('deep', [0, 0, 45], 'loot');
  // The shaman's hoard, by his fire.
  plan.chest({ name: 'den-chest', at: [14.5, 0, 20], facing: [-1, 0, -1], levels: [1, 2] });

  // ── The Sea Kings' vault: the one worked stone, Grik on its floor ─────────────────────
  const vault = plan.hall({
    name: 'vault',
    at: [0, 0, 62],
    size: [12, 10],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [{ side: 'south', at: 6, width: 2.2, height: 3.2, kind: 'pointed' }],
  });
  plan.door({
    name: 'vault-door',
    space: vault,
    side: 'south',
    at: 6,
    width: 2.2,
    height: 3.2,
    key: 'iron-key',
  });
  plan.brazier({ at: [-4.2, 0, 65], intensity: 3, range: 14 });
  plan.brazier({ at: [4.2, 0, 65], intensity: 3, range: 14 });
  plan.lantern({ at: [0, 3.4, 66.9], facing: [0, 0, -1], color: warm, range: 12 });
  plan.point('vault', [0, 0, 62], 'loot');
  // The warren's takings, behind Grik: what the goblins stole off the north road.
  plan.chest({
    name: 'vault-chest',
    at: [0, 0, 66],
    facing: [0, 0, -1],
    levels: [2, 2, 3],
    items: ['scroll-fire-bolt'],
  });
}
