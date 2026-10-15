import type { LevelBuilder } from '../../kernel/plan/level';
import { ROLE } from '../../kernel/elements/roles';

/**
 * Phase 2 showcase (PLAN.md Phase 2 step 10): a vaulted great hall with a gallery, a spiral
 * stair shaft serving three floors, a switchback stair down to a flooded undercroft, and a
 * bridge over a chasm into a cavern. Everything in metres, Y up; north is +Z.
 *
 * Heading convention for spawn: 0 faces north (+Z), 90 faces west (−X).
 */
export const options = { ambient: [0.1, 0.1, 0.13] as [number, number, number], bakeCell: 1 };

export default function showcase(plan: LevelBuilder): void {
  const W = 18;
  const D = 12;
  const H = 9;
  const GALLERY = 4.5;
  const UNDER = -9;
  const warm: [number, number, number] = [1, 0.62, 0.3];
  const cold: [number, number, number] = [0.45, 0.75, 0.7];

  // ── Great hall ────────────────────────────────────────────────────────────────────────
  const hall = plan.hall({
    name: 'great-hall',
    at: [0, 0, 0],
    size: [W, D],
    height: H,
    vault: 'barrel',
    fog: { density: 0.016, color: [0.012, 0.01, 0.015] },
    openings: [
      { side: 'west', at: 6, width: 1.8, height: 3 }, // shaft, floor level
      { side: 'west', at: 6, width: 1.6, height: 2.6, sill: GALLERY }, // shaft, gallery level
      { side: 'east', at: 6, width: 2.2, height: 3.4, kind: 'pointed' }, // bridge
      { side: 'south', at: 12, width: 1.6, height: 2.6 }, // stairwell
    ],
  });
  plan.gallery({ around: hall, level: GALLERY, width: 2.5 });
  plan.brazier({ at: [0, 0, 0], intensity: 3.5, range: 18 });
  for (const [x, z] of [
    [-8.7, 3.5],
    [-8.7, -3.5],
    [8.7, 3.5],
    [8.7, -3.5],
  ] as const) {
    plan.lantern({ at: [x, 3.1, z], facing: [-Math.sign(x), 0, 0], color: warm, intensity: 3 });
  }
  for (const [x, z] of [
    [-4, 5.7],
    [4, 5.7],
    [-4, -5.7],
    [4, -5.7],
  ] as const) {
    plan.lantern({
      at: [x, GALLERY + 2.4, z],
      facing: [0, 0, -Math.sign(z)],
      color: warm,
      intensity: 3,
      range: 12,
    });
  }
  plan.spawn([-3, 0, -3], 0);
  plan.point('gallery', [0, GALLERY, 4.75], 'poi');

  // ── Shaft: spiral stair serving undercroft, hall and gallery ──────────────────────────
  // 20 treads of 0.225 m per turn: every 4.5 m the stair comes back to the same angle, so
  // all three doorways face east into the halls.
  const shaft = plan.shaft({
    name: 'west-shaft',
    at: [-W / 2 - 0.6 - 0.6 - 3 + 0.1, 0, 0],
    radius: 3,
    from: UNDER,
    to: GALLERY,
    stairRise: 0.225,
    stepsPerTurn: 20,
    align: { y: 0, angleDeg: 0 },
    openings: [{ y: UNDER }, { y: 0, width: 1.8, height: 3 }, { y: GALLERY }],
  });
  for (const y of [UNDER + 3, -1.5, 3, 7]) {
    const p = shaft.portal(y);
    const back: [number, number, number] = [-p.outward[0], 0, -p.outward[2]];
    plan.lantern({
      at: [shaft.at[0] + back[0] * 2.7, y, shaft.at[2] + back[2] * 2.7],
      facing: p.outward,
      color: warm,
      range: 9,
    });
  }
  const top = shaft.portal(GALLERY);
  plan.point(
    'shaft-top',
    [top.position[0] - top.outward[0] * 0.9, top.y, top.position[2] - top.outward[2] * 0.9],
    'poi',
  );

  // ── Undercroft: low vault under the hall, flooded ─────────────────────────────────────
  plan.hall({
    name: 'undercroft',
    at: [0, UNDER, 0],
    size: [W, D],
    height: 4.5,
    vault: 'barrel',
    fog: { density: 0.032, color: [0.004, 0.014, 0.016] },
    openings: [
      { side: 'west', at: 6, width: 1.6, height: 2.6 },
      { side: 'south', at: 14.4, width: 1.6, height: 2.6 },
    ],
  });
  for (const z of [-3, 3]) {
    plan.colonnade({
      from: [-6, UNDER, z],
      to: [6, UNDER, z],
      count: 4,
      height: 4.5,
      radius: 0.45,
    });
  }
  plan.waterPlane({ name: 'undercroft-pool', at: [0, UNDER + 0.4, 0], size: [W, D] });
  for (const [x, z] of [
    [-8.7, 5],
    [8.7, 5],
    [-8.7, -5],
    [8.7, -5],
  ] as const) {
    plan.lantern({
      at: [x, UNDER + 2.8, z],
      facing: [-Math.sign(x), 0, 0],
      color: cold,
      intensity: 3,
      range: 12,
    });
  }
  plan.point('undercroft', [0, UNDER, 0], 'poi');

  // ── Stairwell: switchback from the hall down to the undercroft ────────────────────────
  // A tall room south of the hall; its north wall backs onto the hall's south wall.
  const well = plan.hall({
    name: 'stairwell',
    at: [4.2, UNDER, -D / 2 - 0.6 - 0.6 - 5],
    size: [6.6, 10],
    height: 12.5,
    openings: [
      { side: 'north', at: 4.5, width: 1.6, height: 2.6, sill: -UNDER }, // from the hall
      { side: 'north', at: 2.1, width: 1.6, height: 2.6 }, // into the undercroft
    ],
  });
  const wellNorth = well.edge('north', 4.5);
  const sb = plan.switchback({
    from: [wellNorth[0], 0, wellNorth[2]],
    drop: -UNDER,
    direction: [0, 0, -1],
    width: 2.4,
    rise: 0.225,
  });
  plan.point('landing', sb.landing, 'poi');
  plan.lantern({ at: [1.2, -2.5, -12], facing: [1, 0, 0], color: warm, range: 9 });
  plan.lantern({ at: [7.2, -6.5, -16.5], facing: [-1, 0, 0], color: warm, range: 9 });

  // ── Cavern: a chasm east of the hall, bridged, with a cave beyond ─────────────────────
  const rockWest = W / 2 + 0.6;
  plan.cavern({
    name: 'chasm-cavern',
    bounds: { min: [rockWest, -26, -22], max: [54, 14, 22] },
    cell: 0.5,
    roughness: 0.25,
    seed: 3,
    fog: { density: 0.018, color: [0.004, 0.006, 0.012] },
    carve: (s) =>
      s.union(
        // Entry tunnel through the rock face, flat floor at hall level.
        s.subtract(s.capsule([rockWest - 2, 1.6, 0], [14, 1.6, 0], 2.4), s.below(0)),
        // The chasm.
        s.ellipsoid([22, -8, 0], [10, 16, 11]),
        // Far ledge and tunnel, flat floor.
        s.subtract(s.capsule([28, 1.7, 0], [39, 1.7, 0], 2.7), s.below(0)),
        // The cave at the end.
        s.subtract(s.sphere([45, 2, 0], 7.5), s.below(0)),
        // A side tunnel high in the north wall; the river runs down it into the chasm.
        s.subtract(s.capsule([22, 3.2, 8], [22, 3.2, 21], 2.3), s.below(1)),
      ),
  });
  plan.bridge({ from: [rockWest, 0, 0], to: [32.5, 0, 0], width: 2.6, material: ROLE.plank });
  plan.brazier({ at: [12.2, 0, 2.2], intensity: 3, range: 14 });
  plan.brazier({ at: [31.6, 0, -2.2], intensity: 3, range: 14 });
  plan.waterPlane({ name: 'chasm-river', at: [22, -22.5, 0], size: [18, 20], flow: [1, 0] });
  plan.river({
    name: 'tunnel-brook',
    path: [
      [22, 1.3, 21],
      [22, 1.3, 9.4],
    ],
    width: 3,
  });
  plan.waterfall({ name: 'chasm-fall', lip: [22, 1.3, 9.2], plunge: [22, -22.5, 4.5], width: 2.6 });
  plan.lantern({ at: [19.9, 3.4, 14], facing: [1, 0, 0], color: warm, range: 10, intensity: 2.2 });
  plan.light([22, -21, 0], [0.3, 0.55, 0.95], 22, 2.2); // glow from the water below
  plan.light([33, 2.6, 2.3], warm, 10, 1.8);
  plan.lantern({ at: [45, 2.4, -6.8], facing: [0, 0, 1], color: warm, range: 12, intensity: 2.5 });
  plan.point('bridge-end', [33.5, 0, 0], 'poi');
  plan.point('cave-end', [46, 0, 0], 'loot');
}
