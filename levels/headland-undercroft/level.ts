import type { LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Headland Undercroft (docs/CAMPAIGN.md step 11, DESIGN.md 17.26): the First Door, under
 * the ruin on Gullhaven's headland where a watchtower was built long after over what the Sea
 * Kings shut. The cave in the headland's flank opens into the gate cave, where the hobgoblins
 * Gorrak brought down from the hills hold the first door; the door of the halls (the bronze
 * seal) into the first hall, the door of the barrow (the iron seal) into the second, the stair
 * down and the door of the deep (the green seal) into the Sea King's throne hall, where Act One
 * ends.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in the
 * cave from the headland.
 */
export const options = { ambient: [0.07, 0.08, 0.1] as [number, number, number], bakeCell: 1 };

/** The way out: the cave in the headland's flank below the ruin. */
export const portals: PortalRecord[] = [
  {
    name: 'undercroft-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'gullhaven', entry: 'undercroft' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

const LOW = -6;

/**
 * Gorrak's hobgoblins in the gate cave, the drowned the Sea King sent up in the first hall, his
 * lords in the second, the Sea King on his seat.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'hobgoblin', position: [-3, 0, 12], yawDeg: 180 },
  { kind: 'hobgoblin', position: [4, 0, 15], yawDeg: 180 },
  { kind: 'hobgoblin-brute', position: [-8, 0, 17], yawDeg: 135 },
  { kind: 'hobgoblin', position: [9, 0, 18], yawDeg: 225 },
  { kind: 'hobgoblin-brute', position: [-2, 0, 21], yawDeg: 180 },
  { kind: 'hobgoblin-gorrak', position: [3, 0, 24], yawDeg: 180 },
  { kind: 'drowned-warrior', position: [-3, 0, 38], yawDeg: 180 },
  { kind: 'drowned-warrior', position: [3, 0, 42], yawDeg: 180 },
  { kind: 'drowned', position: [0, 0, 46], yawDeg: 180 },
  { kind: 'skeleton-lord', position: [-3, 0, 60], yawDeg: 180 },
  { kind: 'drowned-lord', position: [3, 0, 63], yawDeg: 180 },
  { kind: 'drowned-warrior', position: [0, 0, 67], yawDeg: 180 },
  { kind: 'drowned', position: [-4, LOW, 92], yawDeg: 180 },
  { kind: 'drowned', position: [4, LOW, 92], yawDeg: 180 },
  { kind: 'the-sea-king', position: [0, LOW, 98], yawDeg: 180 },
];

export default function headlandUndercroft(plan: LevelBuilder): void {
  const ember: [number, number, number] = [1, 0.55, 0.28];
  const sea: [number, number, number] = [0.42, 0.68, 0.98];
  const dark = { density: 0.024, color: [0.004, 0.006, 0.01] as [number, number, number] };

  // ── The gate cave: the hobgoblins' camp before the first door ─────────────────────────
  // The first hall's south wall stands at z = 29.4 (centre 40, half depth 10, wall 0.6).
  plan.cavern({
    name: 'gate-cave',
    bounds: { min: [-16, -3, -8], max: [16, 10, 29.4] },
    cell: 0.5,
    roughness: 0.24,
    seed: 61,
    fog: { density: 0.02, color: [0.008, 0.009, 0.012] },
    carve: (s) =>
      s.union(
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.5), s.below(0)),
        s.subtract(s.ellipsoid([0, 3.2, 17], [11, 6, 9]), s.below(0)),
        s.subtract(s.capsule([0, 1.7, 24], [0, 1.7, 33], 2.4), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.brazier({ at: [-5, 0, 14], intensity: 3, range: 14 });
  plan.brazier({ at: [6, 0, 20], intensity: 3, range: 14 });
  plan.light([0, 2.6, 26], ember, 9, 1.4, 'glow');
  plan.point('gate-cave', [0, 0, 17], 'poi');

  // ── The first hall, behind the door of the halls ──────────────────────────────────────
  const first = plan.hall({
    name: 'first-hall',
    at: [0, 0, 40],
    size: [12, 20],
    height: 7,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'south', at: 6, width: 2.4, height: 3.4, kind: 'pointed' }, // the door of the halls
      { side: 'north', at: 6, width: 2.4, height: 3.4, kind: 'pointed' }, // the door of the barrow
    ],
  });
  plan.door({
    name: 'door-of-the-halls',
    space: first,
    side: 'south',
    at: 6,
    width: 2.4,
    height: 3.4,
    key: 'seal-of-the-halls',
  });
  for (const x of [-3.6, 3.6]) {
    plan.colonnade({ from: [x, 0, 32], to: [x, 0, 48], count: 5, height: 7, radius: 0.5 });
  }
  plan.lantern({ at: [-5.9, 3.4, 36], facing: [1, 0, 0], color: sea, range: 10 });
  plan.lantern({ at: [5.9, 3.4, 44], facing: [-1, 0, 0], color: sea, range: 10 });
  plan.brazier({ at: [0, 0, 34], color: ember, intensity: 2.6, range: 13 });
  plan.point('first-hall', [0, 0, 40], 'poi');

  // ── The second hall, behind the door of the barrow ────────────────────────────────────
  plan.corridor({
    name: 'second-passage',
    from: [0, 0, 50.6],
    to: [0, 0, 54],
    width: 2.4,
    height: 3.4,
    vault: 'barrel',
    fog: dark,
  });
  const second = plan.hall({
    name: 'second-hall',
    at: [0, 0, 63],
    size: [14, 18],
    height: 7,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'south', at: 7, width: 2.4, height: 3.4, kind: 'pointed' },
      { side: 'north', at: 7, width: 2.4, height: 3.4, kind: 'pointed' }, // the stair down
    ],
  });
  plan.door({
    name: 'door-of-the-barrow',
    space: second,
    side: 'south',
    at: 7,
    width: 2.4,
    height: 3.4,
    key: 'seal-of-the-barrow',
  });
  for (const x of [-4.2, 4.2]) {
    plan.colonnade({ from: [x, 0, 56], to: [x, 0, 70], count: 5, height: 7, radius: 0.5 });
  }
  plan.brazier({ at: [-5, 0, 57], color: ember, intensity: 2.8, range: 14 });
  plan.brazier({ at: [5, 0, 69], color: ember, intensity: 2.8, range: 14 });
  plan.lantern({ at: [-6.9, 3.4, 63], facing: [1, 0, 0], color: sea, range: 10 });
  plan.lantern({ at: [6.9, 3.4, 63], facing: [-1, 0, 0], color: sea, range: 10 });
  plan.point('second-hall', [0, 0, 63], 'poi');

  // ── The stair down to the door of the deep ────────────────────────────────────────────
  const well = plan.hall({
    name: 'stairwell',
    at: [0, LOW, 79.5],
    size: [6.6, 14],
    height: 12,
    fog: dark,
    openings: [
      { side: 'south', at: 3.3, width: 2.4, height: 3.4, sill: -LOW },
      { side: 'north', at: 3.3, width: 2.4, height: 3.4 },
    ],
  });
  const top = second.edge('north', 7);
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
  plan.lantern({ at: [-2.9, -1.8, 76], facing: [1, 0, 0], color: sea, range: 9 });
  plan.lantern({ at: [2.9, -3.6, 83], facing: [-1, 0, 0], color: sea, range: 9 });

  // ── The Sea King's throne hall, behind the door of the deep ───────────────────────────
  plan.corridor({
    name: 'throne-passage',
    from: [0, LOW, 86.5],
    to: [0, LOW, 88.6],
    width: 2.4,
    height: 3.4,
    vault: 'barrel',
    fog: dark,
  });
  const throne = plan.hall({
    name: 'throne-hall',
    at: [0, LOW, 98.5],
    size: [18, 20],
    height: 10,
    vault: 'barrel',
    fog: { density: 0.02, color: [0.003, 0.006, 0.014] },
    openings: [{ side: 'south', at: 9, width: 2.4, height: 3.4, kind: 'pointed' }],
  });
  plan.door({
    name: 'door-of-the-deep',
    space: throne,
    side: 'south',
    at: 9,
    width: 2.4,
    height: 3.4,
    key: 'seal-of-the-deep',
  });
  for (const x of [-6, 6]) {
    plan.colonnade({
      from: [x, LOW, 90.5],
      to: [x, LOW, 106.5],
      count: 6,
      height: 10,
      radius: 0.6,
    });
  }
  plan.brazier({ at: [-7, LOW, 104.5], color: sea, intensity: 3.4, range: 18 });
  plan.brazier({ at: [7, LOW, 104.5], color: sea, intensity: 3.4, range: 18 });
  plan.brazier({ at: [-7, LOW, 92.5], color: ember, intensity: 3, range: 16 });
  plan.brazier({ at: [7, LOW, 92.5], color: ember, intensity: 3, range: 16 });
  plan.lantern({ at: [0, LOW + 5, 108.4], facing: [0, 0, -1], color: sea, range: 16 });
  plan.point('throne', [0, LOW, 97.5], 'loot');
  // The Sea Kings' treasury behind the seat: Act One's last chest.
  plan.chest({
    name: 'throne-chest',
    at: [0, LOW, 106.5],
    facing: [0, 0, -1],
    levels: [3, 3, 3, 3],
    items: ['potion-healing', 'potion-healing', 'scroll-fire-bolt'],
  });
}
