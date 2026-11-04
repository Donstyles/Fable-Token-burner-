import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';
import { ROLE } from '../../kernel/elements/roles';

/**
 * The Old Halls (PLAN, the agentic loop's item 1; DESIGN 17.10): the halls under the goblin
 * hills, reached through Gullhaven's cave. Old Tobin's grandfather went down and came back
 * white; the dead walk up out of them onto the headland by night. The goblins hold the lair
 * at the mouth and never go below.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in
 * the rock tunnel from the cave mouth; the worked stone begins at the gate hall, a stair goes
 * down to the crypt, the warden's hall lies at the end.
 */
export const options = { ambient: [0.08, 0.08, 0.11] as [number, number, number], bakeCell: 1 };

/** The way out: the tunnel back to the cave mouth in Gullhaven's goblin hills. */
export const portals: PortalRecord[] = [
  {
    name: 'cave-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'gullhaven', entry: 'cave' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

const LOW = -5;

/** The warden's door is locked; its key lies among the bones in the ossuary (DESIGN 17.11). */
export const items: ItemRecord[] = [
  { name: 'ossuary-key', item: 'iron-key', position: [62.5, LOW, 9.2] },
];

/**
 * The goblins at the mouth with their shaman at the back of the lair (he casts across it), the
 * dead below, five for Old Tobin's five, a knight before the warden's hall, and the warden last
 * (DESIGN 17.16: the tiers in play).
 */
export const spawns: SpawnRecord[] = [
  { kind: 'goblin-scout', position: [-3, 0, 13], yawDeg: 180 },
  { kind: 'goblin-scout', position: [3, 0, 17], yawDeg: 180 },
  { kind: 'goblin-scout', position: [-10, 0, 13], yawDeg: 90 },
  { kind: 'goblin-shaman', position: [13, 0, 15], yawDeg: 270 },
  { kind: 'skeleton-warrior', position: [26, 0, 13], yawDeg: 270 },
  { kind: 'skeleton-warrior', position: [45, LOW, 5], yawDeg: 270 },
  { kind: 'skeleton-warrior', position: [50, LOW, 10], yawDeg: 180 },
  { kind: 'skeleton-warrior', position: [52, LOW, 5], yawDeg: 270 },
  { kind: 'skeleton-warrior', position: [61, LOW, 8.5], yawDeg: 270 },
  { kind: 'skeleton-knight', position: [45, LOW, 24], yawDeg: 180 },
  { kind: 'skeleton-warden', position: [47.6, LOW, 28.5], yawDeg: 180 },
];

export default function oldHalls(plan: LevelBuilder): void {
  const warm: [number, number, number] = [1, 0.62, 0.3];
  const pale: [number, number, number] = [0.6, 0.72, 0.9];
  const dark = { density: 0.022, color: [0.006, 0.006, 0.009] as [number, number, number] };

  // ── The goblins' lair: rock from the cave mouth to the gate hall's wall ───────────────
  // The gate hall's west wall stands at x = 17.4 (its centre 24, half width 6, wall 0.6), and
  // the rock runs up to it, so the passage leaves the rock straight into the hall's doorway.
  plan.cavern({
    name: 'lair',
    bounds: { min: [-16, -3, -8], max: [17.4, 9, 26] },
    cell: 0.5,
    roughness: 0.25,
    seed: 5,
    fog: { density: 0.02, color: [0.012, 0.009, 0.006] },
    carve: (s) =>
      s.union(
        // The tunnel in from the mouth, flat underfoot.
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.6), s.below(0)),
        // The lair itself.
        s.subtract(s.ellipsoid([0, 2.6, 15], [10, 5.5, 8]), s.below(0)),
        // A pocket to the west where the goblins sleep.
        s.subtract(s.sphere([-11, 2, 13], 4.5), s.below(0)),
        // The passage east to the worked stone.
        s.subtract(s.capsule([7, 1.7, 15], [21, 1.7, 15], 2.3), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.brazier({ at: [-3, 0, 16.5], intensity: 3, range: 14 });
  plan.brazier({ at: [5, 0, 11.5], intensity: 2.6, range: 12 });
  plan.light([-11, 2.2, 13], warm, 9, 1.6, 'glow');
  plan.light([13, 2.4, 15], warm, 8, 1.4, 'glow');
  plan.point('lair', [0, 0, 15], 'poi');

  // ── The gate hall: the first worked stone, braziers still lit by no one ───────────────
  const gate = plan.hall({
    name: 'gate-hall',
    at: [24, 0, 15],
    size: [12, 10],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'west', at: 5, width: 3, height: 3.2, kind: 'round' }, // from the lair
      { side: 'south', at: 3, width: 1.8, height: 2.8 }, // down to the crypt
    ],
  });
  plan.brazier({ at: [27.5, 0, 18], intensity: 3.2, range: 16 });
  plan.lantern({ at: [29.9, 3.1, 12], facing: [-1, 0, 0], color: warm, intensity: 2.6 });
  plan.lantern({ at: [21, 3.1, 19.9], facing: [0, 0, -1], color: warm, intensity: 2.6 });
  plan.point('gate-hall', [24, 0, 15], 'poi');
  // A chest the goblins never dared: a little of the old halls' silver.
  plan.chest({ name: 'gate-chest', at: [28.8, 0, 19], facing: [-1, 0, -1], levels: [1] });

  // ── The stairwell: a switchback down five metres, beside the gate hall's south wall ───
  const well = plan.hall({
    name: 'stairwell',
    at: [21.9, LOW, 4.8],
    size: [6.6, 8],
    height: 11,
    fog: dark,
    openings: [
      { side: 'north', at: 4.2, width: 1.8, height: 2.8, sill: -LOW }, // from the gate hall
      { side: 'east', at: 6.9, width: 1.8, height: 2.8 }, // into the crypt corridor
    ],
  });
  // A landing at the top, from the doorway to the first tread, so the flights end short of
  // the north wall and the bottom opens onto floor before the corridor's door.
  const top = gate.edge('south', 3);
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
  plan.lantern({ at: [18.9, -1.5, 2], facing: [1, 0, 0], color: warm, range: 9 });
  plan.lantern({ at: [24.9, -2.2, 7.5], facing: [-1, 0, 0], color: warm, range: 9 });

  // ── The crypt corridor and the crypt ──────────────────────────────────────────────────
  plan.corridor({
    name: 'crypt-corridor',
    from: [25.8, LOW, 7.7],
    to: [40, LOW, 7.7],
    width: 2.2,
    height: 3.2,
    vault: 'barrel',
    fog: dark,
  });
  for (const x of [30, 36]) {
    plan.lantern({ at: [x, LOW + 2.2, 8.75], facing: [0, 0, -1], color: warm, range: 8 });
  }
  const crypt = plan.hall({
    name: 'crypt',
    at: [47.6, LOW, 7.7],
    size: [14, 12],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'west', at: 6, width: 2.2, height: 3.2 }, // from the corridor
      { side: 'north', at: 7, width: 2, height: 3, kind: 'square' }, // to the warden's hall
      { side: 'east', at: 6, width: 1.8, height: 2.8 }, // to the ossuary
    ],
  });
  for (const z of [4.7, 10.7]) {
    plan.colonnade({ from: [43, LOW, z], to: [52.2, LOW, z], count: 4, height: 6, radius: 0.45 });
  }
  for (const x of [43.5, 51.7]) {
    plan.lantern({ at: [x, LOW + 3, 13.6], facing: [0, 0, -1], color: pale, range: 10 });
    plan.lantern({ at: [x, LOW + 3, 1.8], facing: [0, 0, 1], color: pale, range: 10 });
  }
  plan.point('crypt', [47.6, LOW, 7.7], 'poi');
  // The warden's door, locked: the iron key from the ossuary opens it.
  plan.door({
    name: 'warden-door',
    space: crypt,
    side: 'north',
    at: 7,
    width: 2,
    height: 3,
    key: 'iron-key',
  });

  // ── The ossuary: a side chamber off the crypt ─────────────────────────────────────────
  plan.corridor({
    name: 'ossuary-passage',
    from: [55.2, LOW, 7.7],
    to: [57.2, LOW, 7.7],
    width: 1.8,
    height: 2.8,
    fog: dark,
  });
  plan.hall({
    name: 'ossuary',
    at: [60.8, LOW, 7.7],
    size: [6, 6],
    height: 4,
    fog: dark,
    openings: [{ side: 'west', at: 3, width: 1.8, height: 2.8 }],
  });
  plan.lantern({ at: [63.7, LOW + 2.4, 7.7], facing: [-1, 0, 0], color: warm, range: 8 });
  plan.point('ossuary', [61.5, LOW, 7.7], 'loot');

  // ── The warden's hall at the end ──────────────────────────────────────────────────────
  plan.corridor({
    name: 'warden-passage',
    from: [crypt.at[0], LOW, 14.3],
    to: [crypt.at[0], LOW, 20.3],
    width: 2,
    height: 3,
    vault: 'barrel',
    fog: dark,
  });
  plan.hall({
    name: 'warden-hall',
    at: [47.6, LOW, 26.9],
    size: [12, 12],
    height: 7,
    vault: 'barrel',
    fog: { density: 0.02, color: [0.004, 0.006, 0.012] },
    openings: [{ side: 'south', at: 6, width: 2, height: 3, kind: 'pointed' }],
  });
  plan.brazier({ at: [43.5, LOW, 30], intensity: 3, range: 15 });
  plan.brazier({ at: [51.7, LOW, 30], intensity: 3, range: 15 });
  plan.lantern({ at: [47.6, LOW + 3.6, 32.8], facing: [0, 0, -1], color: pale, range: 12 });
  plan.point('warden', [47.6, LOW, 27], 'loot');
  // The warden's chest at the far wall: the halls' best, behind the locked door.
  plan.chest({
    name: 'warden-chest',
    at: [47.6, LOW, 32],
    facing: [0, 0, -1],
    levels: [2, 2],
    items: ['potion-healing'],
  });
  void ROLE;
}
