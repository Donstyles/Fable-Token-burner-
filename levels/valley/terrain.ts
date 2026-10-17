/**
 * The valley (DESIGN.md 15): the first outdoor region. A river on a flat floor, forests on
 * the slopes, a serpentine road to a pass in the western ridge, a ravine to the east, snow on
 * the peaks. Built by `npm run level:build valley` through kernel/terrain.
 */
import type { TerrainSpec } from '../../kernel/terrain/build';

const spec: TerrainSpec = {
  seed: 7,
  width: 1600,
  cell: 5,
  chunkCells: 32,
  // A Black Forest: candidates every 5 m, four in five kept, over the forest mask (about
  // nine thousand trees; 4.5 m and nine in ten made thirteen thousand and halved the frame
  // rate for no visible gain, 2026-10-17).
  forest: { spacing: 5, density: 0.8, pineAbove: 110 },
};

export default spec;
