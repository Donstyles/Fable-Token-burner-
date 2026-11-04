/**
 * Harrowmere (DESIGN.md 17.21; the owner, 2026-11-04: "More regions. I want a full indie
 * game"): the shire three days west of Gullhaven along the coast road, our own world's
 * [crown-shire]. A market town, Harrow, sits on its low hill above the coast road, the square
 * on the street with the well, the Drovers' Rest and the Guild of Fire on its north side, Pell's
 * Emporium and the armourer's across, the forge at the east end, the temple on the Harrow
 * itself up a lane. North of the town the chalk downs roll up to the ridge: the down road
 * climbs them past a bandits' halt to the barrows, three mounds and a ring of stones, with a
 * cave into the oldest; east along a track the nomads' camp on the open down. South-east the
 * road drops to a cove under a chalk knoll, the smugglers' cave in its bank. West, the Grange,
 * a manor farm at the road's end under the western ridge, its orchard and fields.
 *
 * Drawn as a map: x east, z north, metres from the map's centre, the map ±320 m; headings a
 * compass's (kernel/terrain/region.ts `fromMap`).
 */
import type { Plot } from '../../kernel/terrain/plots';
import type { RegionScript } from '../../kernel/terrain/region';
import type { P2 } from '../../kernel/terrain/spline';
import { along, orchard, prop, ring, row as rowAlong, type RowItem } from '../lib/plots';

/** The square's middle; the coast road is the high street through it. */
const SQUARE: P2 = [0, -100];
const STREET = -100;
const GRANGE: P2 = [-150, -40];
const CAMP: P2 = [150, 40];
const BARROWS: P2 = [-90, 135];
const COVE: P2 = [135, -165];
const EAST_EDGE: P2 = [306, -168];

/** A row of houses along the high street (levels/lib/plots.ts). */
const row = (front: number, x: number, dir: 1 | -1, items: RowItem[]): Plot[] =>
  rowAlong(STREET, front, x, dir, items);

const town: Plot[] = [
  // The square: the Drovers' Rest on its north side with the Hall of Arms at one shoulder and
  // the Guild of Fire at the other; Pell's Emporium and the armourer across; the well, stalls, a
  // cart and lanterns.
  { model: 'building-inn', at: [-4, -86], face: [-4, STREET], name: 'harrow-inn' },
  {
    model: 'building-cottage-03',
    at: [-13.6, -86],
    face: [-13.6, STREET],
    name: 'harrow-training',
  },
  { model: 'building-cottage-02', at: [4.6, -86.9], face: [4.6, STREET], name: 'harrow-guild' },
  { model: 'building-store', at: [-6, -117.6], face: [-6, STREET], name: 'harrow-store' },
  { model: 'building-cottage-01', at: [13, -116.4], face: [13, STREET], name: 'harrow-armourer' },
  prop('prop-well', [0, -96], [0, -120]),
  prop('prop-market-stall', [-10, -107.5], [-10, -94]),
  prop('prop-market-stall', [-5, -108], [-5, -94]),
  prop('prop-market-stall', [10, -93.5], [10, -106]),
  prop('prop-cart', [9, -106], [-4, -106]),
  prop('prop-lantern-post', [-12.6, -92.6], SQUARE),
  prop('prop-lantern-post', [12.6, -107.6], SQUARE),
  prop('prop-lantern-post', [-12.6, -107.6], SQUARE),
  prop('prop-woodpile', [10.5, -85.5], [10.5, STREET]),
  // The high street west: the north row to the stables at the west gate, the south row to
  // the hill's foot. A lane climbs to the temple between the second and third houses.
  ...row(-95, -18, -1, [
    'building-cottage-02',
    2.5,
    { model: 'building-cottage-03', name: 'house' },
    5,
    'building-cottage-01',
    2,
    'building-cottage-02',
    2,
    { model: 'building-cottage-03', name: 'house' },
    3,
    'building-stables',
  ]),
  ...row(-105, -16, -1, [
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-02',
    2.5,
    'building-cottage-01',
    2,
    'building-cottage-02',
    3,
    { model: 'building-cottage-03', name: 'house' },
  ]),
  // The high street east: the north row to the forge and its yard, the south row to the end
  // of town.
  ...row(-95, 19, 1, [
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-01',
    2,
    'building-cottage-02',
    3,
    { model: 'building-smithy', name: 'harrow-smithy' },
    7,
    'building-cottage-01',
    2,
    { model: 'building-cottage-03', name: 'house' },
  ]),
  ...row(-105, 21, 1, [
    'building-cottage-02',
    2,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-01',
    3,
    'building-cottage-02',
    2.5,
    { model: 'building-cottage-03', name: 'house' },
    2,
    'building-cottage-01',
  ]),
  // The forge's yard.
  prop('prop-woodpile', [52.5, -92], [52.5, STREET]),
  prop('prop-woodpile', [54.2, -89], [54.2, STREET]),
  prop('prop-cart', [53.5, -83], [53.5, -72]),
  // The temple on the Harrow over the west end, up its lane; a shrine at the lane's top.
  { model: 'building-temple', at: [-44, -66], face: [-40, -94], name: 'harrow-temple' },
  prop('prop-shrine', [-36, -74], [-40, -94]),
  // Yards and gardens behind the rows: wood, hay by the stables, carts, hedges.
  prop('prop-woodpile', [-22, -87.5], [-22, -78]),
  prop('prop-woodpile', [-50, -87.5], [-50, -78]),
  prop('prop-woodpile', [30.5, -84.5], [30.5, -78]),
  prop('prop-haystack', [-66, -85], [-66, STREET]),
  prop('prop-haystack', [-72.5, -84], [-72.5, STREET]),
  prop('prop-cart', [-60, -84], [-51, -84]),
  ...along('bush-01', [-30, -80], [-54, -80], 4.3, [-42, -92]),
  ...along('bush-01', [20, -80], [42, -80], 4, [31, -92]),
  prop('prop-cart', [-34, -119], [-18, -119]),
  prop('prop-woodpile', [-24, -115], [-24, -132]),
  prop('prop-woodpile', [34, -116.5], [34, -132]),
  ...along('bush-01', [-60, -120], [-42, -122], 4.5, [-51, -132]),
  ...along('bush-01', [22, -122], [44, -122], 4.4, [33, -132]),
  prop('rock-boulder-02', [-80, -112], SQUARE),
  prop('rock-cluster-01', [66, -110], SQUARE),
];

const grange: Plot[] = [
  // The Grange at the coast road's end: the manor farmhouse facing its yard, the barn across
  // it, haystacks in the fields, an orchard behind the house, carts and wood.
  { model: 'building-farmhouse', at: [-162, -40], face: [-140, -40], name: 'grange' },
  { model: 'building-barn', at: [-150, -58], face: [-150, -40] },
  prop('prop-haystack', [-124, -30], GRANGE),
  prop('prop-haystack', [-120, -36], GRANGE),
  prop('prop-haystack', [-128, -56], GRANGE),
  prop('prop-cart', [-140, -30], [-140, -20]),
  prop('prop-cart', [-134, -50], [-124, -50]),
  prop('prop-woodpile', [-156, -29], GRANGE),
  prop('prop-woodpile', [-160, -51], GRANGE),
  prop('prop-lantern-post', [-146, -46], GRANGE),
  ...along('bush-02', [-130, -70], [-108, -70], 3.6, [-120, -60]),
];

const wilds: Plot[] = [
  // The nomads' camp on the open down: their carts drawn up, hay for the horses, a fire's wood.
  prop('prop-cart', [140, 32], CAMP),
  prop('prop-cart', [162, 34], CAMP),
  prop('prop-haystack', [144, 50], CAMP),
  prop('prop-haystack', [158, 52], CAMP),
  prop('prop-woodpile', [150, 44], CAMP),
  prop('prop-market-stall', [136, 44], CAMP),
  prop('rock-outcrop-01', [170, 56], CAMP),
  prop('rock-boulder-01', [128, 52], CAMP),
  // The barrows: a ring of stones before the mounds, a wayside shrine at the road's end.
  ...ring(BARROWS, 7, 8),
  prop('rock-outcrop-01', BARROWS, [BARROWS[0], BARROWS[1] - 20]),
  prop('prop-shrine', [-82, 122], BARROWS),
  prop('rock-boulder-02', [-110, 150], BARROWS),
  prop('rock-cluster-01', [-72, 154], BARROWS),
  // The bandits' halt on the down road: a stolen cart and wood under the beeches.
  prop('prop-cart', [-28, 12], [-20, 20]),
  prop('prop-woodpile', [-34, 18], [-20, 20]),
  prop('rock-boulder-01', [-14, 26], [-20, 20]),
  // The cove: the smugglers' carts and a lookout's rock on the bank.
  prop('prop-cart', [126, -160], COVE),
  prop('prop-cart', [146, -158], COVE),
  prop('prop-woodpile', [130, -172], COVE),
  prop('prop-market-stall', [122, -168], COVE),
  prop('rock-outcrop-01', [164, -156], COVE),
  prop('rock-boulder-01', [112, -176], COVE),
  prop('rock-boulder-02', [156, -182], COVE),
  // Rocks along the shore and the woods' edges.
  prop('rock-outcrop-01', [-110, -170], SQUARE),
  prop('rock-boulder-01', [-60, -176], SQUARE),
  prop('rock-outcrop-01', [40, -178], SQUARE),
  prop('rock-boulder-02', [220, -164], SQUARE),
  prop('rock-outcrop-01', [-40, 50], SQUARE),
  prop('rock-outcrop-01', [60, -30], SQUARE),
  prop('rock-boulder-01', [90, 90], CAMP),
  prop('rock-outcrop-01', [-200, 20], GRANGE),
  prop('rock-boulder-02', [-120, 80], BARROWS),
];

const region: RegionScript = {
  id: 'harrowmere',
  seed: 23,
  width: 640,
  cell: 5,
  chunkCells: 16,
  base: 7,
  ripple: 1.5,
  sea: {
    level: 0,
    floor: -8,
    shore: 20,
    // The bay's western shore: the land north of it, the cove's bight at the south-east.
    coast: [
      [-420, 420],
      [-420, -215],
      [-300, -206],
      [-200, -200],
      [-120, -196],
      [-40, -204],
      [40, -214],
      [100, -204],
      [128, -190],
      [150, -186],
      [172, -190],
      [200, -182],
      [250, -190],
      [320, -198],
      [420, -214],
      [420, 420],
    ],
  },
  hills: [
    // The downs: three broad chalk hills under the ridge.
    { at: [-120, 120], radius: 90, height: 28 },
    { at: [40, 170], radius: 80, height: 24 },
    { at: [190, 110], radius: 72, height: 20 },
    // The Harrow, the town's low hill, and the knoll over the cove.
    { at: [-30, -70], radius: 44, height: 7 },
    { at: [162, -138], radius: 40, height: 13 },
    // The barrow mounds.
    { at: [-100, 160], radius: 14, height: 5 },
    { at: [-118, 172], radius: 12, height: 4 },
    { at: [-74, 170], radius: 12, height: 4 },
  ],
  ridges: [
    // The northern ridge closes the downs; the western ridge stands over the Grange.
    {
      path: [
        [-330, 236],
        [-150, 254],
        [60, 238],
        [250, 252],
        [330, 240],
      ],
      width: 84,
      height: 48,
    },
    {
      path: [
        [-262, -140],
        [-250, 30],
        [-266, 190],
      ],
      width: 62,
      height: 34,
    },
  ],
  flats: [
    // The town floor on the Harrow's south slope, the Grange's yard, the camp, the cove's strand.
    { at: [0, -100], halfA: 90, halfB: 34, heading: 0, y: 9, soft: 12 },
    { at: GRANGE, halfA: 36, halfB: 26, heading: 0, y: 10, soft: 12 },
    { at: CAMP, halfA: 26, halfB: 20, heading: 0, y: 9, soft: 12 },
    { at: [138, -166], halfA: 18, halfB: 12, heading: 0, y: 4, soft: 10 },
  ],
  roads: [
    {
      name: 'coast-road',
      path: [
        EAST_EDGE,
        [250, -156],
        [180, -134],
        [110, -112],
        [60, -100],
        SQUARE,
        [-60, -100],
        [-100, -92],
        [-128, -62],
        [-140, -40],
      ],
      width: 6,
    },
    {
      name: 'down-road',
      path: [SQUARE, [4, -60], [-10, -20], [-22, 24], [-48, 70], [-74, 110], [-86, 126]],
      width: 5,
    },
    {
      name: 'camp-track',
      path: [[60, -100], [90, -60], [120, -14], [140, 24], CAMP],
      width: 4,
    },
    {
      name: 'cove-lane',
      path: [[110, -112], [122, -138], COVE],
      width: 4,
    },
    // The drovers' pass behind the barrows, cut over the ridge to the Mire (CAMPAIGN step 7).
    {
      name: 'pass-road',
      path: [
        [-86, 126],
        [-96, 164],
        [-100, 210],
        [-100, 260],
        [-100, 306],
      ],
      width: 5,
    },
  ],
  squares: [
    { at: SQUARE, halfA: 14, halfB: 10, heading: 0 },
    { at: GRANGE, halfA: 10, halfB: 9, heading: 0 },
    { at: CAMP, halfA: 12, halfB: 9, heading: 0 },
    { at: COVE, halfA: 10, halfB: 6, heading: 0 },
    { at: [-26, 18], halfA: 7, halfB: 6, heading: 0 },
  ],
  lanes: [
    // Up the Harrow to the temple; onto the cove cave's apron; to the barrow cave.
    { from: [-40, -96], to: [-41, -76], halfWidth: 1.8 },
    { from: [136, -170], to: [150, -176], halfWidth: 2 },
    { from: [-86, 126], to: [-96, 102], halfWidth: 1.8 },
  ],
  forests: [
    {
      // The down wood west of the down road, from the coast road's bend up to the barrows.
      area: [
        [-230, -80],
        [-70, -70],
        [-44, -30],
        [-50, 50],
        [-70, 100],
        [-140, 110],
        [-230, 80],
      ],
      spacing: 6,
      density: 0.8,
      kinds: ['oak', 'broadleaf'],
    },
    {
      // The east wood between the camp track and the cove, around the knoll.
      area: [
        [40, -80],
        [200, -80],
        [230, -120],
        [240, -20],
        [200, 30],
        [120, 100],
        [60, 60],
        [20, -10],
      ],
      spacing: 6,
      density: 0.78,
      kinds: ['oak', 'broadleaf', 'pine'],
    },
    {
      // Scrub and pines over the downs up to the ridge.
      area: [
        [-250, 110],
        [-30, 90],
        [100, 110],
        [250, 130],
        [270, 215],
        [-270, 215],
      ],
      spacing: 7,
      density: 0.55,
      kinds: ['pine', 'spruce'],
    },
    {
      // The shore belt west of the town and beyond the Grange.
      area: [
        [-250, -190],
        [-90, -180],
        [-80, -130],
        [-160, -100],
        [-250, -120],
      ],
      spacing: 6,
      density: 0.7,
      kinds: ['pine', 'oak'],
    },
    {
      // East along the coast road to the edge.
      area: [
        [150, -180],
        [300, -190],
        [300, -130],
        [200, -110],
      ],
      spacing: 6,
      density: 0.65,
      kinds: ['pine', 'broadleaf'],
    },
  ],
  clearings: [
    { at: CAMP, radius: 24 },
    { at: BARROWS, radius: 32 },
    { at: COVE, radius: 20 },
    { at: GRANGE, radius: 34 },
    { at: [-26, 18], radius: 14 },
    { at: [-96, 100], radius: 14 },
    { at: [-60, 56], radius: 10 },
  ],
  trees: [
    // The square's lime; the Grange's orchard; the beeches at the bandits' halt.
    { kind: 'broadleaf', at: [-12, -91.5], scale: 0.75 },
    ...orchard([-186, -36], 4, 4, 6, ['broadleaf', 'oak']),
    { kind: 'oak', at: [-36, 28], scale: 1.2 },
    { kind: 'oak', at: [-14, 8], scale: 0.9 },
    { kind: 'broadleaf', at: [-30, -119], scale: 0.8 },
    { kind: 'oak', at: [40, -81], scale: 0.8 },
  ],
  plots: [...town, ...grange, ...wilds],
  caves: [
    // The smugglers' cave in the knoll over the cove, its tunnel into the Thieves' Den; the
    // barrow cave under the oldest mound, its tunnel into the Barrow of Kings.
    {
      name: 'cove',
      at: [150, -176],
      facing: 220,
      target: { level: 'thieves-den', entry: 'cove-mouth' },
    },
    {
      name: 'barrow',
      at: [-96, 100],
      facing: 165,
      target: { level: 'barrow-kings', entry: 'barrow-mouth' },
    },
  ],
  // The lettered pillar on the open down west of the down road, the second fragment (17.22).
  obelisks: [{ name: 'obelisk', at: [-60, 56] }],
  exits: [
    // The coast road east: three days to Gullhaven.
    {
      name: 'east-road',
      at: EAST_EDGE,
      facing: 90,
      target: { level: 'gullhaven', entry: 'west-road' },
      days: 3,
    },
    // The pass north: two days through the reeds to the Mire.
    {
      name: 'north-pass',
      at: [-100, 306],
      facing: 0,
      target: { level: 'mire', entry: 'south-pass' },
      days: 2,
    },
  ],
  fences: [
    [
      [-128, -24],
      [-108, -24],
      [-108, -40],
    ],
    [
      [-136, -62],
      [-114, -62],
      [-114, -48],
    ],
  ],
  residents: [
    // Alderman Pell before his emporium; Mother Hesk by the armourer's; Tam the drover at the
    // stables; Sister Wyn by the shrine on the temple lane; Goodman Oswy at the Grange gate.
    { kind: 'alderman', at: [-13, -111], face: [0, -96] },
    { kind: 'herbwife', at: [7, -112], face: [0, -96] },
    { kind: 'drover', at: [-70, -92], face: [-60, -100] },
    { kind: 'novice', at: [-38, -78], face: [-36, -74] },
    { kind: 'granger', at: [-138, -34], face: [-128, -40] },
  ],
  packs: [
    // Brigands on the coast road east of the town; cutthroats at the cove with their lookouts.
    { kind: 'brigand', at: [220, -148], count: 3, spread: 5 },
    { kind: 'cutthroat', at: [128, -162], count: 2, spread: 4 },
    { kind: 'brigand', at: [140, -158], count: 2, spread: 4 },
    // Bandits at their halt on the down road.
    { kind: 'bandit', at: [-26, 16], count: 3, spread: 5 },
    // The nomads at their camp.
    { kind: 'nomad-raider', at: [150, 40], count: 3, spread: 6 },
    { kind: 'nomad-archer', at: [152, 48], count: 2, spread: 4 },
    { kind: 'nomad-chieftain', at: [148, 36], count: 1, spread: 0 },
    // The barrows' dead: knights, with warriors about the mounds.
    { kind: 'skeleton-warrior', at: [-90, 150], count: 4, spread: 8 },
    { kind: 'skeleton-knight', at: [-96, 108], count: 2, spread: 4 },
  ],
  points: [
    { name: 'square', at: SQUARE },
    { name: 'grange', at: [-136, -40] },
    { name: 'nomad-camp', at: [150, 30] },
    { name: 'barrows', at: [-90, 126] },
    { name: 'cove-strand', at: [130, -168] },
    { name: 'halt', at: [-26, 10] },
    { name: 'well', at: [0, -96] },
    { name: 'shrine', at: [-82, 122] },
  ],
  start: { at: [0, -110], face: [0, -96] },
  environment: {
    lightColor: [0.92, 0.86, 0.72],
    ambientColor: [0.44, 0.44, 0.44],
    fogColor: [0.26, 0.34, 0.5],
    fogDensity: 0.0007,
    skyZenith: [0.16, 0.28, 0.52],
    skyHorizon: [0.26, 0.34, 0.5],
    cloudAmount: 0.55,
  },
  textures: { base: 'grass', path: 'path', scree: 'sandstone', snow: 'sand' },
};

export default region;
