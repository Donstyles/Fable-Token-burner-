import type { ItemRecord, LevelBuilder, PortalRecord, SpawnRecord } from '../../kernel/plan/level';

/**
 * The Reavers' Holt (docs/CAMPAIGN.md step 8, DESIGN.md 17.25): the fen's one knoll, dug out
 * by the reavers for their holt. A tunnel from the mouth to the holt itself, a wide low cave
 * where the band sleeps and drinks, with a store hole to the west and the archers' ledge to
 * the east; a passage north into the old watch-post the Sea Kings cut in the knoll's heart,
 * where the Reed Queen keeps her court and the eel-boats' takings behind a locked door.
 *
 * Everything in metres, Y up, north is +Z; a heading of 0 faces north. The party arrives in
 * the tunnel from the mouth.
 */
export const options = { ambient: [0.09, 0.1, 0.09] as [number, number, number], bakeCell: 1 };

/** The way out: the mouth in the knoll's south side. */
export const portals: PortalRecord[] = [
  {
    name: 'holt-mouth',
    position: [0, 0, -4.5],
    radius: 1.5,
    target: { level: 'mire', entry: 'holt' },
    arrive: { position: [0, 0, -2], yawDeg: 0 },
  },
];

/** The watch-post's door is locked; the chief keeps the key in the store hole. */
export const items: ItemRecord[] = [
  { name: 'store-key', item: 'iron-key', position: [-12, 0, 15] },
];

/**
 * Reavers in the holt with the archers on their ledge, the chief and his bruiser at the
 * passage, the Reed Queen in the watch-post with her bow.
 */
export const spawns: SpawnRecord[] = [
  { kind: 'reaver', position: [-3, 0, 12], yawDeg: 180 },
  { kind: 'reaver', position: [4, 0, 15], yawDeg: 180 },
  { kind: 'reaver', position: [-7, 0, 19], yawDeg: 135 },
  { kind: 'reaver-archer', position: [11, 0, 16], yawDeg: 270 },
  { kind: 'reaver-archer', position: [12, 0, 20], yawDeg: 270 },
  { kind: 'reaver', position: [-11, 0, 14], yawDeg: 90 },
  { kind: 'reaver-chief', position: [0, 0, 30], yawDeg: 180 },
  { kind: 'bruiser', position: [3, 0, 34], yawDeg: 180 },
  { kind: 'reaver-archer', position: [-4, 0, 46], yawDeg: 180 },
  { kind: 'reed-queen', position: [0, 0, 50], yawDeg: 180 },
];

export default function reedHolt(plan: LevelBuilder): void {
  const warm: [number, number, number] = [1, 0.64, 0.32];
  const reed: [number, number, number] = [0.72, 0.9, 0.6];
  const dark = { density: 0.02, color: [0.008, 0.01, 0.007] as [number, number, number] };

  // ── The holt: peat and root from the mouth to the watch-post's wall ───────────────────
  // The watch-post's south wall stands at z = 40.4 (centre 46, half depth 5, wall 0.6); the
  // earth runs up to it and the passage leaves it straight into the doorway.
  plan.cavern({
    name: 'holt',
    bounds: { min: [-17, -3, -8], max: [17, 9, 40.4] },
    cell: 0.5,
    roughness: 0.3,
    seed: 37,
    fog: { density: 0.02, color: [0.01, 0.012, 0.008] },
    carve: (s) =>
      s.union(
        s.subtract(s.capsule([0, 1.7, -6], [0, 1.7, 8], 2.5), s.below(0)),
        // The holt itself, wide and low.
        s.subtract(s.ellipsoid([0, 2.6, 16], [11, 4.8, 8]), s.below(0)),
        // The store hole west, the archers' ledge east.
        s.subtract(s.sphere([-12, 2, 15], 4.2), s.below(0)),
        s.subtract(s.sphere([12, 2.4, 18], 4.4), s.below(0)),
        // The passage north to the watch-post.
        s.subtract(s.capsule([0, 1.7, 23], [0, 1.7, 44], 2.2), s.below(0)),
      ),
  });
  plan.spawn([0, 0, -2], 0);
  plan.brazier({ at: [-3, 0, 17.5], intensity: 2.8, range: 13 });
  plan.light([-12, 2.2, 15], warm, 8, 1.4, 'glow');
  plan.light([12, 2.4, 18], reed, 8, 1.2, 'glow');
  plan.light([0, 2.4, 33], warm, 9, 1.2, 'glow');
  plan.point('holt-tunnel', [0, 0, 4], 'poi');
  plan.point('holt-cave', [0, 0, 16], 'poi');
  plan.point('store-hole', [-12, 0, 15], 'loot');
  plan.chest({ name: 'store-chest', at: [-14.5, 0, 17], facing: [1, 0, -1], levels: [2] });

  // ── The watch-post: the Sea Kings' stone, the Reed Queen's court ──────────────────────
  const post = plan.hall({
    name: 'watch-post',
    at: [0, 0, 46],
    size: [14, 10],
    height: 6,
    vault: 'barrel',
    fog: dark,
    openings: [{ side: 'south', at: 7, width: 2.2, height: 3.2, kind: 'pointed' }],
  });
  plan.door({
    name: 'post-door',
    space: post,
    side: 'south',
    at: 7,
    width: 2.2,
    height: 3.2,
    key: 'iron-key',
  });
  plan.brazier({ at: [-5, 0, 49], intensity: 3, range: 14 });
  plan.brazier({ at: [5, 0, 49], intensity: 3, range: 14 });
  plan.lantern({ at: [0, 3.4, 50.9], facing: [0, 0, -1], color: warm, range: 12 });
  plan.point('watch-post', [0, 0, 46], 'loot');
  // The eel-boats' takings and the ferry's silver, behind the queen.
  plan.chest({
    name: 'post-chest',
    at: [0, 0, 50],
    facing: [0, 0, -1],
    levels: [3, 3, 2],
    items: ['potion-healing'],
  });
}
