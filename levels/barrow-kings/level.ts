import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Barrow of Kings (DESIGN.md 17.23): the mound-tomb under Harrowmere's downs, the oldest
 * barrow, whose kings came over the sea beyond the Grange and lie here in their iron. The party
 * comes in by the cave in the mound's south flank: a rock passage to a round ante-cave, then
 * the kings' hall under its barrel vault with a tomb to either hand, a stair down behind a
 * locked door (its key laid with the western king) to the deep passage and the Barrow King's
 * chamber at the end, his hoard behind him.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in the
 * passage from the mound's mouth.
 */
export const options = { ambient: [0.07, 0.07, 0.1] as [number, number, number], bakeCell: 1 };

/** The way out: the mouth in the mound's flank, onto the downs. */
export const portals: PortalRecord[] = [
  {
    name: 'barrow-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'harrowmere', entry: 'barrow' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

const LOW = -5;

/** The stair door is locked; its key lies with the western king. */
export const items: ItemRecord[] = [
  { name: 'west-king-key', item: 'iron-key', position: [-15, 0, 36] },
];

/**
 * The dead at the door, knights in the hall and the tombs, a lord on the stair's foot, and the
 * Barrow King last.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'skeleton-warrior', position: [-2, 0, 15], yawDeg: 180 },
  { kind: 'skeleton-warrior', position: [3, 0, 18], yawDeg: 180 },
  { kind: 'skeleton-warrior', position: [-3, 0, 30], yawDeg: 180 },
  { kind: 'skeleton-knight', position: [3, 0, 36], yawDeg: 180 },
  { kind: 'skeleton-warrior', position: [0, 0, 41], yawDeg: 180 },
  { kind: 'skeleton-knight', position: [-14, 0, 33], yawDeg: 90 },
  { kind: 'skeleton-knight', position: [14, 0, 33], yawDeg: 270 },
  { kind: 'skeleton-lord', position: [0, LOW, 56], yawDeg: 180 },
  { kind: 'skeleton-warrior', position: [-3, LOW, 66], yawDeg: 180 },
  { kind: 'skeleton-warrior', position: [3, LOW, 66], yawDeg: 180 },
  { kind: 'barrow-king', position: [0, LOW, 72], yawDeg: 180 },
];

export default function barrowKings(plan: LevelBuilder): void {
  const pale: [number, number, number] = [0.55, 0.68, 0.95];
  const ember: [number, number, number] = [1, 0.5, 0.25];
  const dark = { density: 0.024, color: [0.005, 0.006, 0.01] as [number, number, number] };

  // ── The passage and the ante-cave: chalk and flint, the kings' doorway at its end ─────
  // The hall's south wall stands at z = 23.4 (centre 34, half depth 10, wall 0.6); the rock
  // runs up to it and the passage leaves the rock straight into the doorway.
  plan.cavern({
    name: 'passage',
    bounds: { min: [-12, -3, -8], max: [12, 9, 23.4] },
    cell: 0.5,
    roughness: 0.2,
    seed: 17,
    fog: { density: 0.022, color: [0.008, 0.008, 0.012] },
    carve: (s) =>
      s.union(
        // In from the mouth, flat underfoot.
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 10], 2.4), s.below(0)),
        // The ante-cave, round, where the kings' people left their offerings.
        s.subtract(s.ellipsoid([0, 2.4, 16], [7, 4.5, 6]), s.below(0)),
        // On to the worked stone.
        s.subtract(s.capsule([0, 1.7, 18], [0, 1.7, 26], 2.2), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.light([0, 2.6, 16], pale, 10, 1.3, 'glow');
  plan.point('passage', [0, 0, 6], 'poi');
  plan.point('ante-cave', [0, 0, 16], 'poi');

  // ── The kings' hall: the long vault, a tomb to either hand, the stair door north ───────
  const hall = plan.hall({
    name: 'kings-hall',
    at: [0, 0, 34],
    size: [10, 20],
    height: 7,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'south', at: 5, width: 2.6, height: 3.4, kind: 'round' }, // from the passage
      { side: 'west', at: 10, width: 2, height: 3, kind: 'square' }, // the western king
      { side: 'east', at: 10, width: 2, height: 3, kind: 'square' }, // the eastern king
      { side: 'north', at: 5, width: 2, height: 3, kind: 'pointed' }, // the stair, locked
    ],
  });
  for (const x of [-3, 3]) {
    plan.colonnade({ from: [x, 0, 26], to: [x, 0, 42], count: 5, height: 7, radius: 0.5 });
  }
  plan.brazier({ at: [-3.6, 0, 27], color: ember, intensity: 2.6, range: 13 });
  plan.brazier({ at: [3.6, 0, 41], color: ember, intensity: 2.6, range: 13 });
  for (const z of [30, 38]) {
    plan.lantern({ at: [-4.9, 3.4, z], facing: [1, 0, 0], color: pale, range: 10 });
    plan.lantern({ at: [4.9, 3.4, z], facing: [-1, 0, 0], color: pale, range: 10 });
  }
  plan.point('kings-hall', [0, 0, 34], 'poi');
  plan.door({
    name: 'stair-door',
    space: hall,
    side: 'north',
    at: 5,
    width: 2,
    height: 3,
    key: 'iron-key',
  });

  // ── The two tombs: the western king with the key, the eastern with his arms ───────────
  for (const side of [-1, 1] as const) {
    const name = side < 0 ? 'west-tomb' : 'east-tomb';
    plan.corridor({
      name: `${name}-passage`,
      from: [side * 5.6, 0, 34],
      to: [side * 9.4, 0, 34],
      width: 2,
      height: 3,
      fog: dark,
    });
    plan.hall({
      name,
      at: [side * 14, 0, 34],
      size: [8, 8],
      height: 4.5,
      vault: 'barrel',
      fog: dark,
      openings: [{ side: side < 0 ? 'east' : 'west', at: 4, width: 2, height: 3, kind: 'square' }],
    });
    plan.lantern({ at: [side * 17.9, 2.8, 34], facing: [-side, 0, 0], color: pale, range: 9 });
    plan.point(name, [side * 14, 0, 34], 'loot');
    plan.chest({
      name: `${name}-chest`,
      at: [side * 15, 0, 37.2],
      facing: [0, 0, -1],
      levels: side < 0 ? [2] : [2, 2],
    });
  }

  // ── The stair down behind the locked door ──────────────────────────────────────────────
  const well = plan.hall({
    name: 'stairwell',
    at: [0, LOW, 48.5],
    size: [6.6, 8],
    height: 11,
    fog: dark,
    openings: [
      { side: 'south', at: 3.3, width: 2, height: 3, sill: -LOW }, // from the hall
      { side: 'north', at: 3.3, width: 2, height: 3 }, // the deep passage
    ],
  });
  const top = hall.edge('north', 5);
  const wellSouth = well.edge('south', 3.3)[2];
  plan.slab({ at: [top[0], 0, wellSouth + 1.2], size: [2.4, 2.4], thickness: 0.5 });
  const sb = plan.switchback({
    from: [top[0], 0, wellSouth + 2.4],
    drop: -LOW,
    direction: [0, 0, 1],
    width: 2.4,
    rise: 0.225,
  });
  plan.point('landing', sb.landing, 'poi');
  plan.lantern({ at: [-2.9, -1.5, 47], facing: [1, 0, 0], color: pale, range: 9 });
  plan.lantern({ at: [2.9, -2.4, 50], facing: [-1, 0, 0], color: pale, range: 9 });

  // ── The deep passage and the Barrow King's chamber ────────────────────────────────────
  plan.corridor({
    name: 'deep-passage',
    from: [0, LOW, 52.5],
    to: [0, LOW, 64],
    width: 2.4,
    height: 3.4,
    vault: 'barrel',
    fog: dark,
  });
  plan.lantern({ at: [1.5, LOW + 2.4, 58], facing: [-1, 0, 0], color: ember, range: 8 });
  plan.hall({
    name: 'king-chamber',
    at: [0, LOW, 71],
    size: [14, 14],
    height: 7.5,
    vault: 'barrel',
    fog: { density: 0.022, color: [0.004, 0.005, 0.012] },
    openings: [{ side: 'south', at: 7, width: 2.4, height: 3.4, kind: 'pointed' }],
  });
  plan.brazier({ at: [-5, LOW, 75], color: ember, intensity: 3.2, range: 16 });
  plan.brazier({ at: [5, LOW, 75], color: ember, intensity: 3.2, range: 16 });
  plan.lantern({ at: [0, LOW + 4, 77.9], facing: [0, 0, -1], color: pale, range: 14 });
  plan.point('king', [0, LOW, 71], 'loot');
  // The king's hoard behind his seat: the barrow's best.
  plan.chest({
    name: 'king-chest',
    at: [0, LOW, 77],
    facing: [0, 0, -1],
    levels: [3, 3, 2],
    items: ['potion-healing', 'potion-healing'],
  });
}
