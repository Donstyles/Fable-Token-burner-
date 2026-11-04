import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Thieves' Den (DESIGN.md 17.21): the smugglers' cave in the chalk knoll over Harrowmere's
 * cove, and the cellars the shire's thieves dug behind it. The party comes in off the strand
 * through the sea cave, where the smugglers land their boats, into the store they cut into the
 * chalk; a locked door (its key on a hook in the lookouts' nook) leads down a stair to the
 * common room, where the den lives, and on to Black Orrin's chamber at the end with the
 * den's chest behind him.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in the
 * sea cave from the cove.
 */
export const options = { ambient: [0.09, 0.09, 0.11] as [number, number, number], bakeCell: 1 };

/** The way out: the cave mouth onto the cove's strand. */
export const portals: PortalRecord[] = [
  {
    name: 'cove-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'harrowmere', entry: 'cove' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

const LOW = -4;

/** The store's inner door is locked; the key hangs in the lookouts' nook off the sea cave. */
export const items: ItemRecord[] = [
  { name: 'nook-key', item: 'iron-key', position: [-9.5, 0, 14] },
];

/**
 * Lookouts in the sea cave, cutthroats in the store, the den below with its brigands and
 * cutthroats, Black Orrin last.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'bandit', position: [-3, 0, 12], yawDeg: 180 },
  { kind: 'bandit', position: [4, 0, 15], yawDeg: 180 },
  { kind: 'brigand', position: [-8, 0, 16], yawDeg: 90 },
  { kind: 'cutthroat', position: [24, 0, 14], yawDeg: 270 },
  { kind: 'brigand', position: [27, 0, 18], yawDeg: 270 },
  { kind: 'brigand', position: [42, LOW, 6], yawDeg: 270 },
  { kind: 'brigand', position: [48, LOW, 11], yawDeg: 180 },
  { kind: 'cutthroat', position: [50, LOW, 5], yawDeg: 270 },
  { kind: 'cutthroat', position: [44, LOW, 24], yawDeg: 180 },
  { kind: 'bandit-captain', position: [47, LOW, 29], yawDeg: 180 },
];

export default function thievesDen(plan: LevelBuilder): void {
  const warm: [number, number, number] = [1, 0.66, 0.34];
  const cold: [number, number, number] = [0.55, 0.7, 0.92];
  const dark = { density: 0.02, color: [0.007, 0.007, 0.01] as [number, number, number] };

  // ── The sea cave: the smugglers' landing, salt-wet rock from the mouth to the store ────
  // The store's west wall stands at x = 17.4 (centre 24, half width 6, wall 0.6); the rock runs
  // up to it and the passage leaves the rock straight into the doorway.
  plan.cavern({
    name: 'sea-cave',
    bounds: { min: [-16, -3, -8], max: [17.4, 9, 26] },
    cell: 0.5,
    roughness: 0.22,
    seed: 11,
    fog: { density: 0.018, color: [0.008, 0.01, 0.014] },
    carve: (s) =>
      s.union(
        // The way in from the strand, flat underfoot.
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.6), s.below(0)),
        // The cave itself, the boats drawn up where the roof is highest.
        s.subtract(s.ellipsoid([0, 2.8, 14], [10, 5.5, 8]), s.below(0)),
        // The lookouts' nook to the west, where the key hangs.
        s.subtract(s.sphere([-10, 2, 14], 4.2), s.below(0)),
        // The passage east into the cut chalk.
        s.subtract(s.capsule([7, 1.7, 15], [21, 1.7, 15], 2.3), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.brazier({ at: [3, 0, 11], intensity: 2.8, range: 13 });
  plan.light([-10, 2.4, 14], warm, 9, 1.6, 'glow');
  plan.light([13, 2.4, 15], warm, 8, 1.4, 'glow');
  plan.point('sea-cave', [0, 0, 14], 'poi');
  plan.point('nook', [-9.5, 0, 14], 'loot');

  // ── The store: the first cut chalk, the smugglers' goods and a chest of them ───────────
  const store = plan.hall({
    name: 'store',
    at: [24, 0, 15],
    size: [12, 10],
    height: 5,
    fog: dark,
    openings: [
      { side: 'west', at: 5, width: 3, height: 3.2, kind: 'round' }, // from the sea cave
      { side: 'south', at: 3, width: 1.8, height: 2.8 }, // the locked door down
    ],
  });
  plan.lantern({ at: [29.9, 3, 12], facing: [-1, 0, 0], color: warm, intensity: 2.4 });
  plan.lantern({ at: [21, 3, 19.9], facing: [0, 0, -1], color: warm, intensity: 2.4 });
  plan.point('store', [24, 0, 15], 'poi');
  plan.chest({ name: 'store-chest', at: [28.8, 0, 19], facing: [-1, 0, -1], levels: [1, 2] });
  // The inner door, locked: the nook's key opens it.
  plan.door({
    name: 'store-door',
    space: store,
    side: 'south',
    at: 3,
    width: 1.8,
    height: 2.8,
    key: 'iron-key',
  });

  // ── The stairwell down four metres beside the store's south wall ───────────────────────
  const well = plan.hall({
    name: 'stairwell',
    at: [21.9, LOW, 4.8],
    size: [6.6, 8],
    height: 10,
    fog: dark,
    openings: [
      { side: 'north', at: 4.2, width: 1.8, height: 2.8, sill: -LOW }, // from the store
      { side: 'east', at: 6.9, width: 1.8, height: 2.8 }, // into the den's passage
    ],
  });
  const top = store.edge('south', 3);
  const wellNorth = well.edge('north', 4.2)[2];
  plan.slab({ at: [top[0], 0, wellNorth - 1.2], size: [2.4, 2.4], thickness: 0.5 });
  const sb = plan.switchback({
    from: [top[0], 0, wellNorth - 2.4],
    drop: -LOW,
    direction: [0, 0, -1],
    width: 2.4,
    rise: 0.225,
  });
  plan.point('landing', sb.landing, 'poi');
  plan.lantern({ at: [18.9, -1.2, 2], facing: [1, 0, 0], color: warm, range: 9 });
  plan.lantern({ at: [24.9, -1.8, 7.5], facing: [-1, 0, 0], color: warm, range: 9 });

  // ── The den's passage and the common room ─────────────────────────────────────────────
  plan.corridor({
    name: 'den-passage',
    from: [25.8, LOW, 7.7],
    to: [38, LOW, 7.7],
    width: 2.2,
    height: 3.2,
    fog: dark,
  });
  plan.lantern({ at: [32, LOW + 2.2, 8.75], facing: [0, 0, -1], color: warm, range: 8 });
  const den = plan.hall({
    name: 'common-room',
    at: [46, LOW, 7.7],
    size: [16, 12],
    height: 5.5,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'west', at: 6, width: 2.2, height: 3.2 }, // from the passage
      { side: 'north', at: 8, width: 2, height: 3, kind: 'square' }, // to the captain's chamber
      { side: 'east', at: 6, width: 1.8, height: 2.8 }, // to the sleeping hole
    ],
  });
  plan.brazier({ at: [41, LOW, 4], intensity: 3, range: 15 });
  plan.brazier({ at: [51, LOW, 11.5], intensity: 3, range: 15 });
  for (const x of [40.5, 51.5]) {
    plan.lantern({ at: [x, LOW + 3, 13.6], facing: [0, 0, -1], color: warm, range: 10 });
  }
  plan.point('common-room', [46, LOW, 7.7], 'poi');

  // ── The sleeping hole off the common room ─────────────────────────────────────────────
  plan.corridor({
    name: 'hole-passage',
    from: [54, LOW, 7.7],
    to: [56, LOW, 7.7],
    width: 1.8,
    height: 2.8,
    fog: dark,
  });
  plan.hall({
    name: 'sleeping-hole',
    at: [59.6, LOW, 7.7],
    size: [6, 6],
    height: 3.6,
    fog: dark,
    openings: [{ side: 'west', at: 3, width: 1.8, height: 2.8 }],
  });
  plan.lantern({ at: [62.5, LOW + 2.2, 7.7], facing: [-1, 0, 0], color: warm, range: 8 });
  plan.point('sleeping-hole', [60, LOW, 7.7], 'loot');
  plan.chest({ name: 'hole-chest', at: [61.8, LOW, 10], facing: [-1, 0, -1], levels: [1] });

  // ── Black Orrin's chamber at the end ──────────────────────────────────────────────────
  plan.corridor({
    name: 'captain-passage',
    from: [den.at[0], LOW, 14.3],
    to: [den.at[0], LOW, 20.3],
    width: 2,
    height: 3,
    fog: dark,
  });
  plan.hall({
    name: 'captain-chamber',
    at: [46, LOW, 26.9],
    size: [12, 12],
    height: 6,
    vault: 'barrel',
    fog: { density: 0.02, color: [0.006, 0.006, 0.012] },
    openings: [{ side: 'south', at: 6, width: 2, height: 3, kind: 'pointed' }],
  });
  plan.brazier({ at: [41.9, LOW, 30], intensity: 3, range: 15 });
  plan.brazier({ at: [50.1, LOW, 30], intensity: 3, range: 15 });
  plan.lantern({ at: [46, LOW + 3.4, 32.8], facing: [0, 0, -1], color: cold, range: 12 });
  plan.point('captain', [46, LOW, 27], 'loot');
  // The den's takings, behind their captain.
  plan.chest({
    name: 'captain-chest',
    at: [46, LOW, 32],
    facing: [0, 0, -1],
    levels: [2, 3],
    // The Sea Kings' chart the smugglers took off the Grange (docs/CAMPAIGN.md step 6).
    items: ['potion-healing', 'scroll-fire-bolt', 'sea-kings-chart'],
  });
}
