/**
 * Prompt cards (DESIGN.md 10.1, 10.5, 10.6, 12): the exact text the owner pastes into
 * ChatGPT, with the style prefix from pipeline/style.md and the framing the pipeline
 * needs, plus where to put the returned image.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const CARD_DIR = 'pipeline/cards';
export const INBOX_DIR = 'pipeline/inbox';
export const STYLE_PATH = 'pipeline/style.md';

export type CardKind = 'humanoid' | 'prop' | 'building' | 'texture' | 'portrait' | 'icon' | 'sky';

/** Framing each pipeline needs, appended after the subject. */
export const FRAMING: Record<CardKind, string> = {
  humanoid:
    'Full body, standing in a relaxed A-pose with the arms held slightly away from the body, front three-quarter view, feet fully visible, nothing cropped, single subject centred, neutral mid-grey background, flat even lighting with no shadow on the background.',
  prop: 'Single object, three-quarter view, the entire object visible and centred, neutral mid-grey background, flat even lighting with no shadow on the background.',
  building:
    'Exterior of a single building, three-quarter view from eye level, the entire building visible and centred, neutral mid-grey background, flat even lighting.',
  texture:
    'Seamless tileable texture photographed straight down, flat even lighting, no perspective, no vignette, no visible repetition, the texture fills the whole frame edge to edge.',
  portrait:
    'Head and shoulders portrait facing the viewer, eyes level with the camera, warm three-quarter lighting, plain dark background, square framing.',
  icon: 'Single item centred, square framing, plain transparent background, painted style, no text.',
  sky: 'Seamless 360-degree equirectangular panorama of a sky, horizon at the vertical centre, no ground, no text.',
};

/** Kinds whose image feeds Meshy, which want a photograph rather than a painting. */
export const PHOTO_KINDS: readonly CardKind[] = ['humanoid', 'prop', 'building'];

/** The blockquote under the named "## … prefix" section of the style bible, as one paragraph. */
export function stylePrefix(
  styleMarkdown: string,
  section: 'Style prefix' | '3D reference prefix' = 'Style prefix',
): string {
  const sectionText = styleMarkdown.split(new RegExp(`^## ${section}\\s*$`, 'm'))[1];
  if (!sectionText) throw new Error(`${STYLE_PATH}: no "## ${section}" section`);
  const quote = sectionText.split(/^## /m)[0] ?? '';
  const lines = quote
    .split('\n')
    .filter((l) => l.startsWith('>'))
    .map((l) => l.replace(/^>\s?/, '').trim());
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error(`${STYLE_PATH}: the "${section}" blockquote is empty`);
  return text;
}

export interface Card {
  id: string;
  kind: CardKind;
  subject: string;
  prompt: string;
  returnPath: string;
  markdown: string;
}

export function makeCard(id: string, kind: CardKind, subject: string, styleMarkdown: string): Card {
  const prefix = stylePrefix(
    styleMarkdown,
    PHOTO_KINDS.includes(kind) ? '3D reference prefix' : 'Style prefix',
  );
  const prompt = `${prefix} ${subject.trim().replace(/\.?$/, '.')} ${FRAMING[kind]}`;
  const returnPath = `${INBOX_DIR}/${id}.png`;
  const markdown = [
    `# Prompt card: ${id}`,
    '',
    `Kind: ${kind}`,
    '',
    'Paste this prompt into ChatGPT image generation, exactly as written:',
    '',
    '```',
    prompt,
    '```',
    '',
    `Return the image as a PNG of at least 1024 px on its short side, uploaded in chat; it is saved as \`${returnPath}\`.`,
    '',
    'Reject and regenerate if the image has text, a watermark, a cropped subject, a busy background or more than one subject.',
    '',
  ].join('\n');
  return { id, kind, subject, prompt, returnPath, markdown };
}

export async function writeCard(card: Card, dir = CARD_DIR): Promise<string> {
  const path = join(dir, `${card.id}.md`);
  await writeFile(path, card.markdown);
  return path;
}

export async function loadStyle(path = STYLE_PATH): Promise<string> {
  return readFile(path, 'utf8');
}
