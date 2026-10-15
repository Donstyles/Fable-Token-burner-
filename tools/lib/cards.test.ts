import { describe, expect, it } from 'vitest';
import { FRAMING, makeCard, stylePrefix } from './cards';

const style = `# Style bible

## Style prefix

> Late-1990s painted fantasy illustration.
> Rich oil-paint colours; no text,
> no watermark.

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
    expect(card.prompt.startsWith('Late-1990s painted fantasy illustration.')).toBe(true);
    expect(card.prompt).toContain('A stout innkeeper in a stained apron.');
    expect(card.prompt.endsWith(FRAMING.humanoid)).toBe(true);
    expect(card.returnPath).toBe('pipeline/inbox/innkeeper.png');
    expect(card.markdown).toContain('```\n' + card.prompt + '\n```');
  });

  it('refuses a style bible without the prefix section', () => {
    expect(() => stylePrefix('# nothing here')).toThrow(/Style prefix/);
  });
});
