/**
 * Gullhaven (docs/ROADMAP.md: the starting region, hand-designed on the 640 m grid; DESIGN.md
 * 17.2), packed close (owner, 2026-10-24: "Village is extremely spaced out. Wide empty spaces
 * in map. I want the maps to feel packed and hand crafted"). A harbour town on the north shore
 * of a bay: a small square with its well and stalls between the inn and the trader, the high
 * street built up on both sides, house to house, gardens and yards behind, the temple on its
 * knoll over the west end, the smithy's forge at the east, the quay below. Up the north road,
 * through the hedges, Old Tobin's farm with its orchard, fields and paddock; the crossroads and
 * their shrine under an old oak; on through the wood to the goblin hills and their cave. West,
 * the woodcutter's glade, the ring of stones and the bandits' camp on the coast road; east, the
 * track through the oaks to the ruin on the headland. Woods fill the ground between, the ridges
 * close it in, and nothing stands more than a minute's walk from the next thing.
 *
 * Drawn as a map: x east, z north, metres from the map's centre, the map ±320 m; headings a
 * compass's (kernel/terrain/region.ts `fromMap`).
 */
import catalogue from '../../assets/props/catalogue.json';
import type { PropCatalogue } from '../../kernel/terrain/props';
import type { Plot } from '../../kernel/terrain/plots';
import type { RegionScript } from '../../kernel/terrain/region';
import type { P2 } from '../../kernel/terrain/spline';
import type { TreeKind } from '../../kernel/terrain/trees';

const CATALOGUE = catalogue as unknown as PropCatalogue;

/** The square's middle; the high street runs east and west through it. */
const SQUARE: P2 = [0, -118];
const STREET = -118;
const CROSSROADS: P2 = [8, -12];
const CAVE: P2 = [76, 70];
const STONES: P2 = [-112, 24];
const RUIN: P2 = [166, 14];

/** A house, or a gap of so many metres between houses. */
type Item = string | number | { model: string; name: string };

/**
 * A row of houses along the high street, house to house: from `x` going `dir` (1 east, -1
 * west), the fronts on the line `front`, facing the street (north of it when `front` is above
 * it). Each house takes its own width from the catalogue.
 */
function row(front: number, x: number, dir: 1 | -1, items: Item[]): Plot[] {
  const plots: Plot[] = [];
  const north = front > STREET;
  let at = x;
  for (const item of items) {
    if (typeof item === 'number') {
      at += dir * item;
      continue;
    }
    const model = typeof item === 'string' ? item : item.model;
    const [w, , d] = CATALOGUE[model]!.size;
    const cx = at + (dir * w) / 2;
    const cz = north ? front + d / 2 : front - d / 2;
    plots.push({
      model,
      at: [round(cx), round(cz)],
      face: [round(cx), STREET],
      ...(typeof item === 'object' ? { name: item.name } : {}),
    });
    at += dir * w;
  }
  return plots;
}

/** Small things along a line, every `step` metres, each facing `face`; bushes alternate. */
function along(model: string, from: P2, to: P2, step: number, face: P2): Plot[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.round(len / step));
  const plots: Plot[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const at: P2 = [round(from[0] + (to[0] - from[0]) * t), round(from[1] + (to[1] - from[1]) * t)];
    plots.push({ model: i % 2 ? model.replace('-01', '-02') : model, at, face, light: true });
  }
  return plots;
}

/** Trees in rows, an orchard's: `cols` by `rows` from `corner`, `gap` metres apart. */
function orchard(corner: P2, cols: number, rows: number, gap: number, kinds: TreeKind[]) {
  const out: { kind: TreeKind; at: P2; scale: number }[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out.push({
        kind: kinds[(i + j) % kinds.length]!,
        at: [corner[0] + i * gap, corner[1] + j * gap],
        scale: 0.7 + ((i * 7 + j * 3) % 5) * 0.04,
      });
    }
  }
  return out;
}

/** A ring of stones about a middle. */
function ring(at: P2, radius: number, count: number): Plot[] {
  return Array.from({ length: count }, (_, k) => {
    const a = (k / count) * Math.PI * 2;
    const p: P2 = [round(at[0] + Math.sin(a) * radius), round(at[1] + Math.cos(a) * radius)];
    return { model: k % 3 ? 'rock-boulder-01' : 'rock-boulder-02', at: p, face: at, light: true };
  });
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Shorthand for small things. */
const prop = (model: string, at: P2, face: P2): Plot => ({ model, at, face, light: true });

const town: Plot[] = [
  // The square: the inn on its north side, the training hall at its shoulder and the guild at
  // the other, the trader across, the well in the middle, stalls along the south, lanterns at
  // the corners.
  { model: 'building-inn', at: [-3, -103], face: [-3, STREET] },
  { model: 'building-cottage-03', at: [-12.6, -103], face: [-12.6, STREET], name: 'training' },
  { model: 'building-cottage-02', at: [5.6, -103.9], face: [5.6, STREET], name: 'guild' },
  { model: 'building-store', at: [-5, -132.6], face: [-5, STREET] },
  { model: 'building-cottage-01', at: [14, -131.4], face: [14, STREET], name: 'house' },
  prop('prop-well', [0, -117], [0, -140]),
  prop('prop-market-stall', [-9, -123.5], [-9, -112]),
  prop('prop-market-stall', [-4.5, -124], [-4.5, -112]),
  prop('prop-market-stall', [9.5, -112.5], [9.5, -124]),
  prop('prop-cart', [9, -124], [-4, -124]),
  prop('prop-lantern-post', [-11.6, -110.6], [0, -118]),
  prop('prop-lantern-post', [11.6, -125.6], [0, -118]),
  prop('prop-lantern-post', [-11.6, -125.6], [0, -118]),
  prop('prop-woodpile', [10.5, -103.5], [10.5, -118]),
  // The high street west: north side to the stables at the west gate, south side to the bend
  // of the coast road. A lane climbs to the temple between the third and fourth houses.
  ...row(-113, -17, -1, [
    'building-cottage-01',
    2,
    'building-cottage-02',
    2.5,
    { model: 'building-cottage-03', name: 'house' },
    4,
    'building-cottage-02',
    2,
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
    3,
    'building-stables',
  ]),
  ...row(-123, -15, -1, [
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-01',
    2,
    'building-cottage-02',
    2.5,
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
    3,
    'building-cottage-02',
    2,
    'building-cottage-01',
  ]),
  // The high street east: north side to the smithy and its yard, south side to the end of town.
  ...row(-113, 18, 1, [
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-02',
    3,
    'building-cottage-01',
    2.5,
    'building-smithy',
    7,
    'building-cottage-02',
    2,
    { model: 'building-cottage-03', name: 'house' },
  ]),
  ...row(-123, 20, 1, [
    'building-cottage-02',
    2,
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
    3,
    'building-cottage-02',
    2,
    'building-cottage-01',
    2.5,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-02',
  ]),
  // The smithy's yard: wood for the forge and a cart waiting on the smith.
  prop('prop-woodpile', [59.5, -110], [59.5, STREET]),
  prop('prop-woodpile', [61.2, -107], [61.2, STREET]),
  prop('prop-cart', [60.5, -101], [60.5, -90]),
  // The temple on its knoll over the west end, and the wayside shrine at the lane's top.
  { model: 'building-temple', at: [-46, -84], face: [-41.2, -112] },
  prop('prop-shrine', [-37.5, -92], [-41, -112]),
  // Yards and gardens behind the north row: wood stacked against the back walls, a hay rick
  // by the stables, bushes along the garden ends.
  prop('prop-woodpile', [-21, -105.5], [-21, -96]),
  prop('prop-woodpile', [-54, -105.5], [-54, -96]),
  prop('prop-woodpile', [29.5, -102.5], [29.5, -96]),
  prop('prop-woodpile', [46, -105.5], [46, -96]),
  prop('prop-haystack', [-70, -103], [-70, STREET]),
  prop('prop-haystack', [-76.5, -102], [-76.5, STREET]),
  prop('prop-cart', [-64, -102], [-55, -102]),
  ...along('bush-01', [-30, -98], [-56, -98], 4.3, [-43, -110]),
  ...along('bush-01', [20, -98], [44, -98], 4, [32, -110]),
  // Behind the south row, down to the quay: carts and wood in the yards, bushes on the bank.
  prop('prop-cart', [-36, -137], [-20, -137]),
  prop('prop-woodpile', [-26, -133], [-26, -150]),
  prop('prop-woodpile', [36, -134.5], [36, -150]),
  prop('prop-cart', [50, -137], [64, -137]),
  ...along('bush-01', [-62, -138], [-44, -140], 4.5, [-53, -150]),
  ...along('bush-01', [22, -140], [44, -140], 4.4, [33, -150]),
  // The quay: stalls for the catch, carts, lanterns along the water, two fishers' huts.
  prop('prop-market-stall', [-14, -150.5], [-14, -140]),
  prop('prop-market-stall', [-8, -150.5], [-8, -140]),
  prop('prop-market-stall', [20, -150.5], [20, -140]),
  prop('prop-cart', [30, -150], [44, -150]),
  prop('prop-cart', [-28, -151], [-40, -151]),
  prop('prop-woodpile', [-34, -147], [-34, -140]),
  prop('prop-lantern-post', [-20, -156], [-20, -140]),
  prop('prop-lantern-post', [12, -156], [12, -140]),
  prop('prop-lantern-post', [40, -156], [40, -140]),
  { model: 'building-cottage-02', at: [-46, -153], face: [-30, -152], name: 'hut' },
  { model: 'building-cottage-02', at: [54, -153], face: [38, -152], name: 'hut' },
  prop('rock-boulder-02', [-52, -161], [0, -152]),
  prop('rock-cluster-01', [60, -161], [0, -152]),
  prop('rock-boulder-01', [64, -158], [0, -152]),
];

const farm: Plot[] = [
  // Old Tobin's farm astride the north road: the house west of it, the barn east, haystacks
  // in the fields, the orchard behind the house, a cart in the yard.
  { model: 'building-farmhouse', at: [-12, -58], face: [8, -58] },
  { model: 'building-barn', at: [27, -50], face: [8, -50] },
  prop('prop-haystack', [38, -66], [8, -66]),
  prop('prop-haystack', [43, -62], [8, -62]),
  prop('prop-haystack', [36, -60], [8, -60]),
  prop('prop-haystack', [44, -40], [8, -40]),
  prop('prop-haystack', [48, -45], [8, -45]),
  prop('prop-cart', [18, -64], [18, -40]),
  prop('prop-cart', [-2, -42], [-2, -70]),
  prop('prop-woodpile', [-4, -66], [8, -66]),
  prop('prop-woodpile', [-4, -50], [8, -50]),
  prop('prop-woodpile', [33, -43], [8, -43]),
  // The hedges along the north road between the town and the farm.
  ...along('bush-02', [6.5, -96], [4, -76], 3.4, [12, -86]),
  ...along('bush-02', [20, -96], [18, -76], 3.4, [12, -86]),
  // The crossroads: the wayside shrine under the old oak, stones by the road.
  prop('prop-shrine', [0, -6], CROSSROADS),
  prop('prop-lantern-post', [15, -18], CROSSROADS),
  prop('rock-boulder-01', [-4, -18], CROSSROADS),
  prop('rock-cluster-01', [20, -6], CROSSROADS),
  prop('rock-boulder-02', [-6, 4], CROSSROADS),
];

const wilds: Plot[] = [
  // The woodcutter's glade off the west track: his cottage, the stacks, the cart and stumps.
  { model: 'building-cottage-01', at: [-96, -32], face: [-80, -28], name: 'woodcutter' },
  prop('prop-woodpile', [-88, -38], [-80, -28]),
  prop('prop-woodpile', [-86, -35.5], [-80, -28]),
  prop('prop-woodpile', [-90, -23], [-80, -28]),
  prop('prop-woodpile', [-92.5, -21.5], [-80, -28]),
  prop('prop-cart', [-80, -38], [-70, -38]),
  prop('rock-cluster-01', [-82, -22], [-80, -28]),
  prop('rock-cluster-01', [-78, -31], [-80, -28]),
  // The ring of stones in its glade west of the crossroads, an outcrop at its heart.
  ...ring(STONES, 8, 9),
  prop('rock-outcrop-01', STONES, [STONES[0], STONES[1] - 20]),
  // The goblins' camp below the cave: a stolen cart, hay for their beds, rocks.
  prop('prop-cart', [60, 70], [70, 60]),
  prop('prop-haystack', [64, 78], [70, 60]),
  prop('prop-woodpile', [58, 63], [70, 60]),
  prop('rock-outcrop-01', [90, 58], [70, 60]),
  prop('rock-boulder-01', [84, 52], [70, 60]),
  prop('rock-boulder-02', [56, 80], [70, 60]),
  // The ruin on the headland: tumbled stones where a watchtower stood.
  prop('rock-outcrop-01', RUIN, [RUIN[0] - 20, RUIN[1]]),
  prop('rock-outcrop-01', [RUIN[0] + 7, RUIN[1] + 6], RUIN),
  prop('rock-outcrop-01', [RUIN[0] - 5, RUIN[1] + 9], RUIN),
  ...ring(RUIN, 12, 7),
  // The bandits' camp on the coast road: their carts drawn up, wood, hay, a lookout's rock.
  prop('prop-cart', [-150, -134], [-158, -144]),
  prop('prop-cart', [-160, -134], [-158, -144]),
  prop('prop-woodpile', [-146, -140], [-158, -144]),
  prop('prop-haystack', [-166, -138], [-158, -144]),
  prop('rock-outcrop-01', [-142, -128], [-158, -144]),
  // Rocks along the shore and in the woods' edges, so no stretch of ground stands bare.
  prop('rock-outcrop-01', [-96, -160], [0, -150]),
  prop('rock-boulder-01', [-110, -158], [0, -150]),
  prop('rock-outcrop-01', [96, -150], [0, -150]),
  prop('rock-boulder-02', [104, -144], [0, -150]),
  prop('rock-outcrop-01', [-40, 30], CROSSROADS),
  prop('rock-outcrop-01', [44, 4], CROSSROADS),
  prop('rock-boulder-01', [100, -10], [110, -8]),
  prop('rock-outcrop-01', [130, 30], RUIN),
  prop('rock-boulder-02', [-60, -40], [-50, -50]),
];

const region: RegionScript = {
  id: 'gullhaven',
  seed: 11,
  width: 640,
  cell: 5,
  chunkCells: 16,
  base: 6,
  ripple: 1.5,
  sea: {
    level: 0,
    floor: -8,
    shore: 20,
    // The land, its corners beyond the map's edge: the bay's shore from the west, the
    // headland reaching south-east.
    coast: [
      [-420, 420],
      [-420, -225],
      [-300, -214],
      [-230, -200],
      [-170, -186],
      [-115, -172],
      [-60, -170],
      [0, -171],
      [60, -170],
      [115, -158],
      [160, -126],
      [200, -84],
      [228, -32],
      [244, 30],
      [262, 92],
      [330, 118],
      [420, 130],
      [420, 420],
    ],
  },
  hills: [
    // The goblin hills, the cave in their south-western flank.
    { at: [104, 102], radius: 70, height: 26, stretch: [1.2, 0.9] },
    { at: [160, 150], radius: 64, height: 22 },
    // The headland and its ruin.
    { at: [172, 18], radius: 52, height: 20 },
    // The temple's knoll over the west end.
    { at: [-46, -84], radius: 20, height: 4 },
    // The downs west of the crossroads, under the stones.
    { at: [-118, 18], radius: 70, height: 8 },
  ],
  ridges: [
    // The northern hills close the land in above the woods; the western ridge stands over the
    // coast road's last mile.
    {
      path: [
        [-330, 180],
        [-180, 196],
        [-40, 170],
        [90, 196],
        [240, 186],
        [330, 170],
      ],
      width: 80,
      height: 46,
    },
    {
      path: [
        [-246, -96],
        [-236, 40],
        [-252, 180],
      ],
      width: 62,
      height: 34,
    },
  ],
  flats: [
    // The town floor, above the beach.
    { at: [-2, -118], halfA: 84, halfB: 32, heading: 0, y: 5, soft: 12 },
    // The farm.
    { at: [10, -55], halfA: 40, halfB: 22, heading: 0, y: 7, soft: 12 },
  ],
  roads: [
    {
      name: 'street',
      path: [[-84, -119], [-40, STREET], SQUARE, [40, STREET], [84, -120]],
      width: 6,
    },
    {
      name: 'north-road',
      path: [[13, -109], [14, -92], [10, -75], [6, -40], CROSSROADS, [24, 20], [48, 46], [64, 60]],
      width: 6,
    },
    {
      name: 'quay-lane',
      path: [
        [5, -127],
        [6, -140],
        [6, -149],
      ],
      width: 5,
    },
    {
      name: 'coast-road',
      path: [
        [-84, -119],
        [-120, -134],
        [-160, -150],
        [-215, -162],
        [-265, -168],
        [-305, -170],
      ],
      width: 6,
    },
    {
      name: 'headland-track',
      path: [CROSSROADS, [60, -14], [110, -8], [150, 6], [158, 10]],
      width: 5,
    },
    { name: 'west-track', path: [CROSSROADS, [-30, -8], [-70, 0], [-100, 16]], width: 5 },
  ],
  squares: [
    { at: SQUARE, halfA: 13, halfB: 9, heading: 0 },
    // The quay below the town.
    { at: [4, -152], halfA: 44, halfB: 5, heading: 0 },
    // The farmyard, the fields, the paddock.
    { at: [10, -50], halfA: 7, halfB: 9, heading: 0 },
    { at: [40, -64], halfA: 9, halfB: 6, heading: 0 },
    { at: [45, -42], halfA: 7, halfB: 6, heading: 0 },
    // The camps' trodden ground.
    { at: [-88, -30], halfA: 7, halfB: 6, heading: 0 },
    { at: [-155, -140], halfA: 8, halfB: 5, heading: 0 },
    { at: [66, 66], halfA: 6, halfB: 5, heading: 0 },
  ],
  lanes: [
    // Up the temple's knoll; to the woodcutter's from the west track; onto the cave's apron.
    { from: [-41.2, -114], to: [-43, -94], halfWidth: 1.8 },
    { from: [-70, 0], to: [-84, -26], halfWidth: 1.8 },
    { from: [64, 60], to: [72, 66], halfWidth: 2 },
  ],
  forests: [
    {
      // The west wood, from the coast road up to the northern hills, all round the downs.
      area: [
        [-238, -112],
        [-102, -124],
        [-84, -108],
        [-62, -90],
        [-52, -60],
        [-38, -24],
        [-26, 6],
        [-6, 16],
        [16, 28],
        [40, 60],
        [40, 130],
        [-238, 140],
      ],
      spacing: 6.5,
      density: 0.62,
      kinds: ['broadleaf', 'oak', 'broadleaf', 'pine'],
    },
    {
      // The oaks east of the farm, between the fields and the headland.
      area: [
        [58, -96],
        [88, -142],
        [132, -142],
        [178, -96],
        [206, -40],
        [196, -14],
        [130, -16],
        [70, -22],
        [56, -50],
      ],
      spacing: 7,
      density: 0.6,
      kinds: ['oak', 'broadleaf', 'oak'],
    },
    {
      // Scrub and pines over the goblin hills and down to the headland track.
      area: [
        [32, 40],
        [44, 0],
        [140, 4],
        [200, 60],
        [236, 120],
        [230, 200],
        [40, 200],
      ],
      spacing: 7,
      density: 0.6,
      kinds: ['spruce', 'pine', 'broadleaf'],
    },
    {
      // The woods on the ridges that close the land: north, and west beyond the coast road.
      area: [
        [-320, 130],
        [320, 130],
        [320, 320],
        [-320, 320],
      ],
      spacing: 8,
      density: 0.55,
      kinds: ['pine', 'spruce', 'spruce', 'broadleaf'],
    },
    {
      area: [
        [-320, -205],
        [-238, -170],
        [-238, 130],
        [-320, 130],
      ],
      spacing: 8,
      density: 0.55,
      kinds: ['pine', 'broadleaf', 'spruce'],
    },
    {
      // A fringe of trees between the town's back gardens and the farm, either side of the road.
      area: [
        [-60, -94],
        [-30, -92],
        [-28, -74],
        [-56, -70],
      ],
      spacing: 6,
      density: 0.55,
      kinds: ['broadleaf', 'oak'],
    },
    {
      area: [
        [28, -92],
        [80, -96],
        [82, -76],
        [56, -72],
        [30, -78],
      ],
      spacing: 6,
      density: 0.55,
      kinds: ['broadleaf', 'oak'],
    },
  ],
  clearings: [
    { at: CROSSROADS, radius: 22 },
    { at: [-90, -30], radius: 13 },
    { at: STONES, radius: 15 },
    { at: [-155, -140], radius: 14 },
    { at: [-46, -84], radius: 12 },
  ],
  trees: [
    // The old oak over the crossroads, and its younger neighbours.
    { kind: 'oak', at: [17, -4], scale: 1.25 },
    { kind: 'oak', at: [-12, -18], scale: 0.9 },
    // Tobin's orchard, behind the farmhouse.
    ...orchard([-44, -72], 4, 5, 6, ['broadleaf', 'oak']),
    // A lime at the square's corner by the training hall, trees in the gardens and by the quay.
    { kind: 'broadleaf', at: [-11, -109.5], scale: 0.75 },
    { kind: 'broadleaf', at: [-28, -99], scale: 0.8 },
    { kind: 'oak', at: [38, -99], scale: 0.8 },
    { kind: 'broadleaf', at: [-58, -139], scale: 0.8 },
    { kind: 'broadleaf', at: [64, -140], scale: 0.85 },
    { kind: 'oak', at: [-82, -110], scale: 0.9 },
    { kind: 'oak', at: [86, -110], scale: 0.9 },
  ],
  plots: [...town, ...farm, ...wilds],
  // The mouth faces down the slope to the north road's end. Its tunnel ends in rock until the
  // region's first dungeon is built (the test halls behind it were scrapped, owner, 2026-10-24).
  cave: { at: CAVE, facing: 225 },
  // Split rails the kernel builds (owner, 2026-10-23): Tobin's paddock and fields, the
  // stables' paddock at the west gate, the temple's garden.
  fences: [
    [
      [30, -72],
      [52, -72],
      [52, -54],
      [30, -54],
    ],
    [
      [38, -50],
      [54, -50],
      [54, -34],
      [38, -34],
    ],
    [
      [-80, -106],
      [-80, -96],
      [-66, -96],
      [-66, -104],
    ],
    [
      [-54, -92],
      [-54, -76],
      [-38, -76],
    ],
  ],
  residents: [
    // Maren by the well; Old Tobin at his farm gate.
    { kind: 'villager-woman', at: [3, -115], face: [5, -140] },
    { kind: 'villager-man', at: [2, -62], face: [8, -62] },
  ],
  packs: [
    // Goblins about the cave and down the slope toward the road; two at the stones.
    { kind: 'goblin-scout', at: [66, 64], count: 3, spread: 5 },
    { kind: 'goblin-scout', at: [36, 34], count: 2, spread: 4 },
    { kind: 'goblin-scout', at: [STONES[0], STONES[1] + 3], count: 2, spread: 4 },
    // Bandits at their camp on the coast road, and further west.
    { kind: 'bandit', at: [-155, -142], count: 3, spread: 5 },
    { kind: 'bandit', at: [-250, -166], count: 2, spread: 5 },
    // The headland's dead: far too many for a new party.
    { kind: 'skeleton-warrior', at: RUIN, count: 6, spread: 8 },
  ],
  points: [
    { name: 'square', at: SQUARE },
    { name: 'waterfront', at: [6, -152] },
    { name: 'crossroads', at: CROSSROADS },
    { name: 'goblin-hills', at: [62, 58] },
    { name: 'stones', at: [STONES[0], STONES[1] - 12] },
    { name: 'headland', at: [RUIN[0] + 10, RUIN[1] - 2] },
    { name: 'road-west', at: [-295, -170] },
  ],
  // The party wakes at the foot of the square looking up the lane at Maren by the well, the
  // trader at the left and the inn ahead.
  start: { at: [6, -136], face: [3, -116] },
  environment: {
    lightColor: [0.9, 0.84, 0.74],
    ambientColor: [0.42, 0.42, 0.46],
    fogColor: [0.2, 0.31, 0.56],
    fogDensity: 0.0006,
    skyZenith: [0.14, 0.25, 0.52],
    skyHorizon: [0.2, 0.31, 0.56],
    cloudAmount: 0.45,
  },
  textures: { base: 'grass', path: 'path', scree: 'scree', snow: 'sand' },
};

export default region;
