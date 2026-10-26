/**
 * Cut the rest screen's vista (DESIGN.md 16.34): the owner's four pictures of one view in
 * pipeline/inbox/vistas/<id>/ (sunrise, day, sunset, night, each on a flat fuchsia sky), keyed,
 * lined up and cut to one strip each, into assets/vistas/<id>.png (the four stacked) and its
 * json, and recorded in the manifest. The strip's first row is marked by hand in
 * pipeline/vistas.json. The review sheet, the strips over a light and a dark sky, goes to
 * pipeline/work/vistas/.
 *
 *   npm run vista -- <id>
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { isValidId, readManifest, upsertAsset, writeManifest } from './lib/manifest';
import { VISTA_SIZE, VISTA_TIMES, type VistaMarks, cutVista } from './lib/vista';

const INBOX = 'pipeline/inbox/vistas';
const MARKS = 'pipeline/vistas.json';
const OUT = 'assets/vistas';
const WORK = 'pipeline/work/vistas';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id || !isValidId(id)) fail('vista <id>');
  const marked = existsSync(MARKS)
    ? (JSON.parse(await readFile(MARKS, 'utf8')) as Record<string, VistaMarks>)
    : {};
  const marks = marked[id];
  if (!marks) fail(`${MARKS} has no "${id}": mark the strip's first row ("top")`);
  const dir = join(INBOX, id);
  let vista;
  try {
    vista = await cutVista(dir, marks);
  } catch (e) {
    fail(`${dir}: ${(e as Error).message}`);
  }
  const { width, height } = VISTA_SIZE;
  await mkdir(OUT, { recursive: true });
  await mkdir(WORK, { recursive: true });
  const files = { picture: join(OUT, `${id}.png`), data: join(OUT, `${id}.json`) };
  await sharp(vista.atlas, { raw: { width, height: height * VISTA_TIMES.length, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(files.picture);
  const data = { size: [width, height], times: VISTA_TIMES, skyline: vista.skyline };
  await writeFile(files.data, `${JSON.stringify(data, null, 2)}\n`);

  // The sheet: each strip over MM6's day blue and over a night's near black, twice the size,
  // so a fringe left by the key shows against either.
  const sheet = join(WORK, `${id}.review.png`);
  const over = (sky: [number, number, number]): Buffer => {
    const out = Buffer.alloc(width * height * VISTA_TIMES.length * 3);
    for (let p = 0; p < width * height * VISTA_TIMES.length; p++) {
      const a = vista.atlas[p * 4 + 3]! / 255;
      for (let c = 0; c < 3; c++)
        out[p * 3 + c] = Math.round(vista.atlas[p * 4 + c]! * a + sky[c]! * (1 - a));
    }
    return out;
  };
  await sharp(Buffer.concat([over([60, 92, 170]), over([8, 10, 24])]), {
    raw: { width, height: height * VISTA_TIMES.length * 2, channels: 3 },
  })
    .resize(width * 2, height * VISTA_TIMES.length * 4, { kernel: 'nearest' })
    .png()
    .toFile(sheet);

  const manifest = await readManifest();
  upsertAsset(manifest, {
    id: `vista-${id}`,
    kind: 'image',
    source: `The owner's ChatGPT images ${dir}/{${VISTA_TIMES.join(',')}}.png, their fuchsia sky keyed out, lined up on the day's skyline and rows ${vista.rows[0]} to ${vista.rows[1]} cut to ${width} by ${height} each (tools/vista.ts)`,
    licence:
      "The owner's ChatGPT images (OpenAI's terms: the output is the user's): owner holds full rights",
    files: [files.picture, files.data],
    date: new Date().toISOString().slice(0, 10),
    notes: `shifts onto the day: ${VISTA_TIMES.filter((t) => t !== 'day')
      .map(
        (t) =>
          `${t} ${vista.shifts[t].dx},${vista.shifts[t].dy} (${vista.shifts[t].mismatch} px left)`,
      )
      .join(', ')}`,
  });
  await writeManifest(manifest);
  console.info(
    `${files.picture}: rows ${vista.rows[0]}-${vista.rows[1]}, skyline ${vista.skyline.top} (mean ${vista.skyline.mean}), ` +
      `${JSON.stringify(vista.shifts)}\n${sheet}`,
  );
}

void main();
