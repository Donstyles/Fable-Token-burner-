/**
 * Cut a house's room (DESIGN.md 17.8): the owner's picture at pipeline/inbox/rooms/<id>.png,
 * named for the house it belongs to (src/game/content.ts), cut to the view box with the lights
 * the game animates found on its paint, into assets/rooms/, and recorded in the manifest. The
 * review sheet, the cut picture over its masks, goes to pipeline/work/rooms/.
 *
 *   npm run room -- <house id> [--top <px>]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { isValidId, readManifest, upsertAsset, writeManifest } from './lib/manifest';
import { ROOM_SIZE, cutRoom, lightsPng } from './lib/room';

const INBOX = 'pipeline/inbox/rooms';
const OUT = 'assets/rooms';
const WORK = 'pipeline/work/rooms';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const id = args[0];
  const at = args.indexOf('--top');
  const top = at >= 0 ? Number(args[at + 1]) : undefined;
  if (!id || !isValidId(id) || (top !== undefined && !Number.isInteger(top))) {
    fail('room <house id> [--top <px>]');
  }
  const from = join(INBOX, `${id}.png`);
  const room = await cutRoom(from, top);
  await mkdir(OUT, { recursive: true });
  await mkdir(WORK, { recursive: true });
  const files = {
    picture: join(OUT, `${id}.png`),
    lights: join(OUT, `${id}.lights.png`),
    data: join(OUT, `${id}.json`),
  };
  await writeFile(files.picture, room.picture);
  await writeFile(files.lights, await lightsPng(room.lights));
  // Each fire's middle and size, biggest first: the game flickers each fire's light as one.
  const tenth = (v: number): number => Math.round(v * 10) / 10;
  const data = {
    sparks: room.lights.sparks,
    fires: room.lights.fires.map((f) => [
      tenth((f.x0 + f.x1) / 2),
      tenth((f.y0 + f.y1) / 2),
      tenth(Math.max(f.x1 - f.x0, f.y1 - f.y0, 1)),
    ]),
    orbs: room.lights.orbs,
  };
  await writeFile(files.data, `${JSON.stringify(data, null, 2)}\n`);

  // The sheet: the picture, then its masks over it darkened, flames red, coals green, the
  // biggest fire's light blue, the others' grey; twice the size.
  const { width: w, height: h } = ROOM_SIZE;
  const base = await sharp(room.picture).raw().toBuffer();
  const l = room.lights;
  const masks = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const dim = (base[i * 3]! + base[i * 3 + 1]! + base[i * 3 + 2]!) / 12;
    const grey = l.others[i]! * 0.6;
    masks[i * 3] = Math.min(255, dim + l.flame[i]! + grey);
    masks[i * 3 + 1] = Math.min(255, dim + l.coal[i]! + grey);
    masks[i * 3 + 2] = Math.min(255, dim + l.light[i]! + grey);
  }
  const sheet = join(WORK, `${id}.review.png`);
  await sharp(Buffer.concat([base, masks]), { raw: { width: w, height: h * 2, channels: 3 } })
    .resize(w * 2, h * 4, { kernel: 'nearest' })
    .png()
    .toFile(sheet);

  const manifest = await readManifest();
  upsertAsset(manifest, {
    id: `room-${id}`,
    kind: 'image',
    source: `The owner's ChatGPT image ${from}, rows ${room.top} to ${room.top + room.band} cut to the view box at ${w} by ${h}, its flames, coals and firelight found on its paint (tools/room.ts)`,
    licence:
      "The owner's ChatGPT image (OpenAI's terms: the output is the user's): owner holds full rights",
    files: [files.picture, files.lights, files.data],
    date: new Date().toISOString().slice(0, 10),
    notes: `${l.fires.length} fire(s), ${l.orbs.length} magic glow(s), ${l.sparks ? 'sparks off the biggest' : 'no sparks'}`,
  });
  await writeManifest(manifest);
  console.info(
    `${files.picture}: rows ${room.top}-${room.top + room.band}, ${l.fires.length} fire(s), ${l.orbs.length} orb(s), sparks ${JSON.stringify(l.sparks)}\n${sheet}`,
  );
}

void main();
