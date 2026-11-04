import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Sunken Hall (docs/CAMPAIGN.md step 10, DESIGN.md 17.25): the third door, the Sea Kings'
 * hall under the Mire's mere. The cave in the knoll on the north shore drops by a long stair
 * to the hall's level, below the water: the drowned gallery, a hall flooded to the shin where
 * the drowned stand in the water; a side chamber where the key lies with the drowned lord; the
 * locked door; and the warden's hall at the end, dry under its vault, where the Warden of the
 * Deep keeps the third seal.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in the
 * cave from the shore.
 */
export const options = { ambient: [0.06, 0.08, 0.1] as [number, number, number], bakeCell: 1 };

/** The way out: the cave in the knoll on the mere's north shore. */
export const portals: PortalRecord[] = [
  {
    name: 'sunken-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'mire', entry: 'sunken' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

const LOW = -8;

/** The warden's door is locked; the drowned lord in the side chamber has the key. */
export const items: ItemRecord[] = [{ name: 'lord-key', item: 'iron-key', position: [61, LOW, 9] }];

/**
 * Drowned on the stair and in the flooded gallery, their lord in the side chamber, warriors
 * before the door, the Warden of the Deep in his hall.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'drowned', position: [-3, 0, 13], yawDeg: 180 },
  { kind: 'drowned', position: [4, 0, 16], yawDeg: 180 },
  { kind: 'drowned', position: [44, LOW, 5], yawDeg: 270 },
  { kind: 'drowned', position: [50, LOW, 11], yawDeg: 180 },
  { kind: 'drowned', position: [47, LOW, 8], yawDeg: 270 },
  { kind: 'drowned-warrior', position: [52, LOW, 5], yawDeg: 270 },
  { kind: 'drowned-lord', position: [60, LOW, 7], yawDeg: 270 },
  { kind: 'drowned-warrior', position: [47.6, LOW, 23], yawDeg: 180 },
  { kind: 'drowned', position: [44, LOW, 27], yawDeg: 180 },
  { kind: 'the-drowned-warden', position: [47.6, LOW, 29], yawDeg: 180 },
];

export default function sunkenHall(plan: LevelBuilder): void {
  const green: [number, number, number] = [0.5, 0.85, 0.75];
  const cold: [number, number, number] = [0.45, 0.6, 0.95];
  const dark = { density: 0.026, color: [0.004, 0.008, 0.01] as [number, number, number] };

  // ── The cave and the stair-head: wet rock from the shore ──────────────────────────────
  // The stair-head's west wall stands at x = 17.4 (centre 24, half width 6, wall 0.6).
  plan.cavern({
    name: 'shore-cave',
    bounds: { min: [-14, -3, -8], max: [17.4, 9, 24] },
    cell: 0.5,
    roughness: 0.2,
    seed: 53,
    fog: { density: 0.022, color: [0.006, 0.009, 0.011] },
    carve: (s) =>
      s.union(
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.4), s.below(0)),
        s.subtract(s.ellipsoid([0, 2.6, 14], [8, 5, 7]), s.below(0)),
        s.subtract(s.capsule([6, 1.7, 15], [21, 1.7, 15], 2.3), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.light([0, 2.4, 14], green, 9, 1.3, 'glow');
  plan.light([13, 2.4, 15], green, 8, 1.2, 'glow');
  plan.point('shore-cave', [0, 0, 14], 'poi');

  // ── The stair-head and the long stair down below the mere ─────────────────────────────
  const head = plan.hall({
    name: 'stair-head',
    at: [24, 0, 15],
    size: [12, 10],
    height: 5,
    fog: dark,
    openings: [
      { side: 'west', at: 5, width: 3, height: 3.2, kind: 'round' },
      { side: 'south', at: 3, width: 2, height: 3 },
    ],
  });
  plan.lantern({ at: [29.9, 3, 12], facing: [-1, 0, 0], color: cold, intensity: 2.2 });
  plan.point('stair-head', [24, 0, 15], 'poi');
  const well = plan.hall({
    name: 'stairwell',
    at: [21.9, LOW, 2.8],
    size: [6.6, 12],
    height: 14,
    fog: dark,
    openings: [
      { side: 'north', at: 4.2, width: 2, height: 3, sill: -LOW },
      { side: 'east', at: 10.9, width: 2.2, height: 3.2 },
    ],
  });
  const top = head.edge('south', 3);
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
  plan.lantern({ at: [18.9, -2.4, 0], facing: [1, 0, 0], color: cold, range: 9 });
  plan.lantern({ at: [24.9, -4.8, 6], facing: [-1, 0, 0], color: cold, range: 9 });

  // ── The drowned gallery: the hall flooded to the shin ─────────────────────────────────
  plan.corridor({
    name: 'gallery-passage',
    from: [25.8, LOW, 7.7],
    to: [40, LOW, 7.7],
    width: 2.4,
    height: 3.4,
    vault: 'barrel',
    fog: dark,
  });
  plan.lantern({ at: [33, LOW + 2.4, 8.9], facing: [0, 0, -1], color: green, range: 8 });
  plan.hall({
    name: 'drowned-gallery',
    at: [47.6, LOW, 7.7],
    size: [14, 12],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [
      { side: 'west', at: 6, width: 2.4, height: 3.4 },
      { side: 'north', at: 7, width: 2, height: 3, kind: 'pointed' }, // the warden's door
      { side: 'east', at: 6, width: 1.8, height: 2.8 }, // the lord's chamber
    ],
  });
  // The mere has come in: water to the shin across the gallery's floor.
  plan.waterPlane({ name: 'gallery-water', at: [47.6, LOW + 0.35, 7.7], size: [13.6, 11.6] });
  for (const z of [4.7, 10.7]) {
    plan.colonnade({ from: [43, LOW, z], to: [52.2, LOW, z], count: 4, height: 6, radius: 0.45 });
  }
  for (const x of [43.5, 51.7]) {
    plan.lantern({ at: [x, LOW + 3, 13.6], facing: [0, 0, -1], color: green, range: 10 });
    plan.lantern({ at: [x, LOW + 3, 1.8], facing: [0, 0, 1], color: green, range: 10 });
  }
  plan.point('drowned-gallery', [47.6, LOW, 7.7], 'poi');

  // ── The lord's chamber off the gallery, the key with him ──────────────────────────────
  plan.corridor({
    name: 'lord-passage',
    from: [55.2, LOW, 7.7],
    to: [57.2, LOW, 7.7],
    width: 1.8,
    height: 2.8,
    fog: dark,
  });
  plan.hall({
    name: 'lord-chamber',
    at: [60.8, LOW, 7.7],
    size: [6, 6],
    height: 4,
    fog: dark,
    openings: [{ side: 'west', at: 3, width: 1.8, height: 2.8 }],
  });
  plan.lantern({ at: [63.7, LOW + 2.4, 7.7], facing: [-1, 0, 0], color: cold, range: 8 });
  plan.point('lord-chamber', [61, LOW, 7.7], 'loot');
  plan.chest({ name: 'lord-chest', at: [62.5, LOW, 10], facing: [-1, 0, -1], levels: [2, 3] });

  // ── The warden's hall: dry under its vault, the third seal ────────────────────────────
  const gallery = { at: [47.6, LOW, 7.7] as [number, number, number] };
  plan.corridor({
    name: 'warden-passage',
    from: [gallery.at[0], LOW, 14.3],
    to: [gallery.at[0], LOW, 20.3],
    width: 2,
    height: 3,
    vault: 'barrel',
    fog: dark,
  });
  // The door stands at the gallery's north opening; the Space is rebuilt here by its measures.
  plan.door({
    name: 'warden-door',
    space: plan.hall({
      name: 'door-jamb',
      at: [47.6, LOW, 7.7],
      size: [14, 12],
      height: 6,
      vault: 'barrel',
      wallThickness: 0.01,
      fog: dark,
      openings: [
        { side: 'west', at: 6, width: 2.4, height: 3.4 },
        { side: 'north', at: 7, width: 2, height: 3, kind: 'pointed' },
        { side: 'east', at: 6, width: 1.8, height: 2.8 },
        { side: 'south', at: 7, width: 13.9, height: 5.9 },
      ],
    }),
    side: 'north',
    at: 7,
    width: 2,
    height: 3,
    key: 'iron-key',
  });
  plan.hall({
    name: 'warden-hall',
    at: [47.6, LOW, 26.9],
    size: [12, 12],
    height: 7,
    vault: 'barrel',
    fog: { density: 0.022, color: [0.003, 0.006, 0.012] },
    openings: [{ side: 'south', at: 6, width: 2, height: 3, kind: 'pointed' }],
  });
  plan.brazier({ at: [43.5, LOW, 30], color: green, intensity: 3, range: 15 });
  plan.brazier({ at: [51.7, LOW, 30], color: green, intensity: 3, range: 15 });
  plan.lantern({ at: [47.6, LOW + 3.6, 32.8], facing: [0, 0, -1], color: cold, range: 12 });
  plan.point('warden', [47.6, LOW, 27], 'loot');
  plan.chest({
    name: 'warden-chest',
    at: [47.6, LOW, 32],
    facing: [0, 0, -1],
    levels: [3, 3, 3],
    items: ['potion-healing', 'potion-healing'],
  });
}
