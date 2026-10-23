import { describe, expect, it } from 'vitest';
import { layoutPlots } from './plots';
import { PROPS } from './props';

const flat = (): number => 2;

describe('a plot carries its model’s lights', () => {
  const lamp = PROPS['prop-lantern-post']!.lights![0]!.at;

  it('puts a lantern post’s light at its lantern, turned with the post', () => {
    // Facing north (+Z), the model's own frame is the world's.
    const north = layoutPlots(
      [{ model: 'prop-lantern-post', at: [10, 20], face: [10, 30], light: true }],
      flat,
    );
    expect(north.lights).toHaveLength(1);
    const [x, y, z] = north.lights[0]!.position;
    expect(x).toBeCloseTo(10 + lamp[0], 6);
    expect(y).toBeCloseTo(2 + lamp[1], 6);
    expect(z).toBeCloseTo(20 + lamp[2], 6);
    expect(north.lights[0]!.kind).toBe('lantern');
    // Facing east, its right as you face it points south: the lantern hangs to the south.
    const east = layoutPlots(
      [{ model: 'prop-lantern-post', at: [10, 20], face: [30, 20], light: true }],
      flat,
    );
    const [ex, , ez] = east.lights[0]!.position;
    expect(ex).toBeCloseTo(10 + lamp[2], 6);
    expect(ez).toBeCloseTo(20 - lamp[0], 6);
  });

  it('burns a smithy’s forge as a brazier, a little above its coals', () => {
    const { lights } = layoutPlots([{ model: 'building-smithy', at: [0, 0], face: [0, 10] }], flat);
    const forge = lights.find((l) => l.kind === 'brazier');
    expect(forge).toBeDefined();
    expect(forge!.position[1]).toBeCloseTo(
      2 + PROPS['building-smithy']!.lights![0]!.at[1] + 0.28,
      6,
    );
  });

  it('gives a model without lights none', () => {
    expect(
      layoutPlots([{ model: 'building-inn', at: [0, 0], face: [0, 10] }], flat).lights,
    ).toEqual([]);
  });
});
