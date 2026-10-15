import { describe, expect, it } from 'vitest';
import { FRAMING, makeCard, stylePrefix } from './cards';

const style = `# Style bible

## Style prefix

> Late-1990s painted fantasy illustration.
> Rich oil-paint colours; no text,
> no watermark.

## 3D reference prefix

> Plain photograph of a reenactment costume,
> no smile.

## Forbidden

- Text.
`;

describe('prompt cards', () => {
  it('extracts the style prefix as one paragraph', () => {
    expect(stylePrefix(style)).toBe(
      'Late-1990s painted fantasy illustration. Rich oil-paint colours; no text, no watermark.',
    );
  });

  it('builds prefix, subject and framing into one prompt and names the inbox file', () => {
    const card = makeCard('innkeeper', 'humanoid', 'A stout innkeeper in a stained apron', style);
    expect(card.prompt.startsWith('Plain photograph of a reenactment costume, no smile.')).toBe(
      true,
    );
    expect(card.prompt).toContain('A stout innkeeper in a stained apron.');
    expect(card.prompt.endsWith(FRAMING.humanoid)).toBe(true);
    expect(card.returnPath).toBe('pipeline/inbox/innkeeper.png');
    expect(card.markdown).toContain('```\n' + card.prompt + '\n```');
  });

  it('paints 2D art and photographs 3D references', () => {
    expect(makeCard('ashlar', 'texture', 'Sandstone blocks', style).prompt).toMatch(
      /^Late-1990s painted/,
    );
    expect(makeCard('cart', 'prop', 'A hand cart', style).prompt).toMatch(/^Plain photograph/);
  });

  it('refuses a style bible without the prefix section', () => {
    expect(() => stylePrefix('# nothing here')).toThrow(/Style prefix/);
  });
});
