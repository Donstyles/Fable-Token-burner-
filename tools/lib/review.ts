/**
 * Review sheets for generated models (tools/lib/quality.ts): for each model, its eight sides as
 * the game draws them, the same eight with the inside of every face in magenta, and the
 * geometric screen's findings, in one picture under pipeline/work/review/. A model goes into the
 * game only once its sheet has been looked at (owner, 2026-10-23: "You need automatic quality
 * checker for generated models").
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';
import { PROPS } from '../../kernel/terrain/props';
import { checkModel, describeGap, type QualityReport } from './quality';

export const REVIEW_DIR = 'pipeline/work/review';
const PORT = 4171;
const WIDTH = 1200;
const ROW = 600;
const HEAD = 64;

export interface ReviewSheet {
  id: string;
  file: string;
  report: QualityReport;
}

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Draw and save a sheet for each model id; the sheets in the same order. */
export async function reviewSheets(ids: readonly string[]): Promise<ReviewSheet[]> {
  await mkdir(REVIEW_DIR, { recursive: true });
  const server = await createServer({
    server: { port: PORT, strictPort: true },
    logLevel: 'error',
  });
  await server.listen();
  const browser = await chromium.launch(
    process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
      ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'] }
      : {},
  );
  const sheets: ReviewSheet[] = [];
  try {
    const page = await (
      await browser.newContext({ viewport: { width: WIDTH, height: ROW } })
    ).newPage();
    const shoot = async (id: string, inside: boolean): Promise<Buffer> => {
      await page.goto(
        `http://localhost:${PORT}/tools/review/index.html?id=${id}${inside ? '&inside' : ''}`,
      );
      await page.waitForFunction(
        () => (window as unknown as { done?: boolean }).done === true,
        null,
        {
          timeout: 120_000,
        },
      );
      return page.locator('canvas').screenshot();
    };
    for (const id of ids) {
      const spec = PROPS[id];
      if (!spec) throw new Error(`review: ${id} is not in the props table`);
      const report = await checkModel(join('assets/props', id, `${id}.glb`), spec.height);
      const plain = await shoot(id, false);
      const inside = await shoot(id, true);
      const verdict = report.problems.length
        ? `FAILS: ${report.problems.join('; ')}`
        : report.suspect
          ? `look hard: a gap of ${describeGap(report.gaps[0]!)}`
          : 'the screen finds no gap';
      const head = Buffer.from(
        `<svg width="${WIDTH}" height="${HEAD}"><rect width="${WIDTH}" height="${HEAD}" fill="#1b1e22"/>` +
          `<text x="10" y="26" font-family="sans-serif" font-size="20" fill="#e8e0c8">${escape(id)} · ${report.triangles} triangles · eight sides from the front round to the right; below, the inside of every face in magenta</text>` +
          `<text x="10" y="52" font-family="sans-serif" font-size="18" fill="${report.problems.length || report.suspect ? '#ff9a6a' : '#9ad48a'}">${escape(verdict)}</text></svg>`,
      );
      const file = join(REVIEW_DIR, `${id}.png`);
      await sharp({
        create: { width: WIDTH, height: HEAD + 2 * ROW, channels: 4, background: '#1b1e22' },
      })
        .composite([
          { input: head, top: 0, left: 0 },
          { input: plain, top: HEAD, left: 0 },
          { input: inside, top: HEAD + ROW, left: 0 },
        ])
        .png()
        .toFile(file);
      sheets.push({ id, file, report });
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return sheets;
}
