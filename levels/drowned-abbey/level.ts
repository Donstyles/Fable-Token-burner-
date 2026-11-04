import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Drowned Abbey (docs/CAMPAIGN.md step 9, DESIGN.md 17.25): what is left of the abbey under
 * its ruin on the Mire's rise. The cave at the gate drops into the undercroft the mere spared,
 * where the acolytes keep their fires; the cloister passage to the chapter house, where the
 * cultists sit under the Abbot's rule; the night stair down to the crypt, locked, the
 * hierophant before the door the brothers found; and the Abbot's cell at the end, where he
 * wrote his confession and opened what he should not have.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in the
 * cave from the gate.
 */
export const options = { ambient: [0.08, 0.08, 0.1] as [number, number, number], bakeCell: 1 };

/** The way out: the cave at the abbey's gate. */
export const portals: PortalRecord[] = [
  {
    name: 'abbey-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'mire', entry: 'abbey' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

const LOW = -5;

/** The night stair's door is locked; the key hangs in the chapter house. */
export const items: ItemRecord[] = [
  { name: 'chapter-key', item: 'iron-key', position: [30, 0, 19.5] },
];

/**
 * Acolytes at their fires, cultists in the chapter house, the hierophant and his acolytes in
 * the crypt, the Abbot in his cell.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'acolyte', position: [-3, 0, 13], yawDeg: 180 },
  { kind: 'acolyte', position: [4, 0, 16], yawDeg: 180 },
  { kind: 'acolyte', position: [-9, 0, 15], yawDeg: 90 },
  { kind: 'cultist', position: [24, 0, 13], yawDeg: 270 },
  { kind: 'cultist', position: [27, 0, 18], yawDeg: 270 },
  { kind: 'cultist', position: [22, 0, 18], yawDeg: 180 },
  { kind: 'acolyte', position: [42, LOW, 6], yawDeg: 270 },
  { kind: 'acolyte', position: [50, LOW, 10], yawDeg: 180 },
  { kind: 'hierophant', position: [48, LOW, 5], yawDeg: 270 },
  { kind: 'cultist', position: [46, LOW, 24], yawDeg: 180 },
  { kind: 'the-abbot', position: [47.6, LOW, 29], yawDeg: 180 },
];

export default function drownedAbbey(plan: LevelBuilder): void {
  const candle: [number, number, number] = [1, 0.7, 0.4];
  const cold: [number, number, number] = [0.5, 0.62, 0.95];
  const dark = { density: 0.022, color: [0.007, 0.007, 0.011] as [number, number, number] };

  // ── The cave and the undercroft: the mere's mud, then the first stone ─────────────────
  // The chapter house's west wall stands at x = 17.4 (centre 24, half width 6, wall 0.6); the
  // earth runs up to it and the cloister passage leaves it straight into the doorway.
  plan.cavern({
    name: 'undercroft',
    bounds: { min: [-16, -3, -8], max: [17.4, 9, 26] },
    cell: 0.5,
    roughness: 0.22,
    seed: 43,
    fog: { density: 0.02, color: [0.009, 0.009, 0.013] },
    carve: (s) =>
      s.union(
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.5), s.below(0)),
        // The undercroft the mere spared, its vault fallen to rubble and root.
        s.subtract(s.ellipsoid([0, 2.8, 15], [10, 5.5, 8]), s.below(0)),
        // A side cell to the west.
        s.subtract(s.sphere([-10, 2, 14], 4.2), s.below(0)),
        // The cloister passage east.
        s.subtract(s.capsule([7, 1.7, 15], [21, 1.7, 15], 2.3), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.brazier({ at: [-3, 0, 16.5], color: candle, intensity: 2.8, range: 13 });
  plan.light([-10, 2.2, 14], candle, 8, 1.4, 'glow');
  plan.light([13, 2.4, 15], candle, 8, 1.2, 'glow');
  plan.point('undercroft', [0, 0, 15], 'poi');

  // ── The chapter house: the cultists' seat, the key on its hook ────────────────────────
  const chapter = plan.hall({
    name: 'chapter-house',
    at: [24, 0, 15],
    size: [12, 10],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'west', at: 5, width: 3, height: 3.2, kind: 'round' }, // from the undercroft
      { side: 'south', at: 3, width: 1.8, height: 2.8 }, // the night stair, locked
    ],
  });
  plan.brazier({ at: [27.5, 0, 18], color: candle, intensity: 3, range: 15 });
  plan.lantern({ at: [29.9, 3.1, 12], facing: [-1, 0, 0], color: candle, intensity: 2.4 });
  plan.lantern({ at: [21, 3.1, 19.9], facing: [0, 0, -1], color: candle, intensity: 2.4 });
  plan.point('chapter-house', [24, 0, 15], 'poi');
  plan.point('chapter-key', [30, 0, 19.5], 'loot');
  plan.chest({ name: 'chapter-chest', at: [28.8, 0, 19], facing: [-1, 0, -1], levels: [2, 2] });
  plan.door({
    name: 'stair-door',
    space: chapter,
    side: 'south',
    at: 3,
    width: 1.8,
    height: 2.8,
    key: 'iron-key',
  });

  // ── The night stair down to the crypt ─────────────────────────────────────────────────
  const well = plan.hall({
    name: 'night-stair',
    at: [21.9, LOW, 4.8],
    size: [6.6, 8],
    height: 11,
    fog: dark,
    openings: [
      { side: 'north', at: 4.2, width: 1.8, height: 2.8, sill: -LOW },
      { side: 'east', at: 6.9, width: 1.8, height: 2.8 },
    ],
  });
  const top = chapter.edge('south', 3);
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
  plan.lantern({ at: [18.9, -1.5, 2], facing: [1, 0, 0], color: cold, range: 9 });
  plan.lantern({ at: [24.9, -2.2, 7.5], facing: [-1, 0, 0], color: cold, range: 9 });

  // ── The crypt: the brothers' graves and the door they found ───────────────────────────
  plan.corridor({
    name: 'crypt-passage',
    from: [25.8, LOW, 7.7],
    to: [40, LOW, 7.7],
    width: 2.2,
    height: 3.2,
    vault: 'barrel',
    fog: dark,
  });
  plan.lantern({ at: [33, LOW + 2.2, 8.75], facing: [0, 0, -1], color: cold, range: 8 });
  plan.hall({
    name: 'crypt',
    at: [47.6, LOW, 7.7],
    size: [14, 12],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'west', at: 6, width: 2.2, height: 3.2 },
      { side: 'north', at: 7, width: 2, height: 3, kind: 'pointed' }, // the Abbot's cell
    ],
  });
  for (const z of [4.7, 10.7]) {
    plan.colonnade({ from: [43, LOW, z], to: [52.2, LOW, z], count: 4, height: 6, radius: 0.45 });
  }
  plan.brazier({ at: [43.5, LOW, 2.5], color: cold, intensity: 2.6, range: 13 });
  plan.brazier({ at: [51.7, LOW, 12.9], color: cold, intensity: 2.6, range: 13 });
  plan.point('crypt', [47.6, LOW, 7.7], 'poi');

  // ── The Abbot's cell at the end ───────────────────────────────────────────────────────
  plan.corridor({
    name: 'cell-passage',
    from: [47.6, LOW, 14.3],
    to: [47.6, LOW, 20.3],
    width: 2,
    height: 3,
    vault: 'barrel',
    fog: dark,
  });
  plan.hall({
    name: 'abbots-cell',
    at: [47.6, LOW, 26.9],
    size: [12, 12],
    height: 7,
    vault: 'barrel',
    fog: { density: 0.02, color: [0.005, 0.005, 0.012] },
    openings: [{ side: 'south', at: 6, width: 2, height: 3, kind: 'pointed' }],
  });
  plan.brazier({ at: [43.5, LOW, 30], color: candle, intensity: 3, range: 15 });
  plan.brazier({ at: [51.7, LOW, 30], color: candle, intensity: 3, range: 15 });
  plan.lantern({ at: [47.6, LOW + 3.6, 32.8], facing: [0, 0, -1], color: cold, range: 12 });
  plan.point('abbot', [47.6, LOW, 27], 'loot');
  // The abbey's silver the Abbot kept, and his books.
  plan.chest({
    name: 'abbot-chest',
    at: [47.6, LOW, 32],
    facing: [0, 0, -1],
    levels: [3, 3, 2],
    items: ['scroll-fire-bolt', 'potion-healing'],
  });
}
