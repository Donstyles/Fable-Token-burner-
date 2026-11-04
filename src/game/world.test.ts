import { describe, expect, it } from 'vitest';
import gullhaven from '../../levels/gullhaven/region';
import harrowmere from '../../levels/harrowmere/region';
import type { RegionScript } from '../../kernel/terrain/region';
import { HOUSES } from './content';
import { DIALOGUES, QUESTS } from './dialogue';
import { isItemId } from './items';
import { MONSTERS, NPCS } from './monsters';
import { SITES } from './sites';

/**
 * The world's threads hold together (DESIGN.md 17.22): every quest names monsters, people,
 * things and places that exist; every person who talks exists and stands somewhere; every
 * site stands at a named point of its region; every working house a region names has a record.
 */
const REGIONS: Record<string, RegionScript> = { gullhaven, harrowmere };

const pointNames = (r: RegionScript): string[] => [
  ...r.points.map((p) => p.name),
  ...(r.obelisks ?? []).map((o) => o.name),
  ...(r.caves ?? []).map((c) => c.name),
  ...(r.cave ? ['cave'] : []),
  ...(r.exits ?? []).map((e) => e.name),
  ...r.plots.filter((p) => p.model.startsWith('building-')).map((p) => p.name ?? p.model.slice(9)),
];
const everyPoint = new Set(Object.values(REGIONS).flatMap(pointNames));
const residents = new Set(Object.values(REGIONS).flatMap((r) => r.residents.map((x) => x.kind)));

describe('the world holds together', () => {
  it('every quest names monsters, people and things that exist', () => {
    for (const q of Object.values(QUESTS)) {
      for (const o of q.objectives) {
        if (o.kind === 'kill') expect(MONSTERS[o.monster], `${q.id}: ${o.monster}`).toBeDefined();
        if (o.kind === 'talk') expect(DIALOGUES[o.npc], `${q.id}: ${o.npc}`).toBeDefined();
        if (o.kind === 'deliver') {
          expect(isItemId(o.item), `${q.id}: ${o.item}`).toBe(true);
          expect(DIALOGUES[o.npc], `${q.id}: ${o.npc}`).toBeDefined();
        }
        if (o.kind === 'reach') expect(everyPoint.has(o.point), `${q.id}: ${o.point}`).toBe(true);
      }
      for (const id of q.gives ?? []) expect(isItemId(id), `${q.id} gives ${id}`).toBe(true);
      for (const id of q.reward?.items ?? []) expect(isItemId(id), `${q.id} pays ${id}`).toBe(true);
    }
  });

  it('every talker is a person who stands in a region, and every quest topic names a quest', () => {
    for (const d of Object.values(DIALOGUES)) {
      expect(NPCS[d.npc], d.npc).toBeDefined();
      expect(residents.has(d.npc), `${d.npc} stands nowhere`).toBe(true);
      for (const t of d.topics) {
        if (t.kind === 'quest') expect(QUESTS[t.quest], `${d.npc}: ${t.quest}`).toBeDefined();
        if (t.when)
          expect(QUESTS[t.when.quest], `${d.npc}: ${t.id} when ${t.when.quest}`).toBeDefined();
      }
    }
    for (const kind of residents) expect(NPCS[kind], kind).toBeDefined();
  });

  it('every site stands at a named point of its region', () => {
    for (const s of SITES) {
      const r = REGIONS[s.level];
      expect(r, s.id).toBeDefined();
      expect(pointNames(r!), `${s.id} at ${s.point}`).toContain(s.point);
    }
  });

  it("every region's working houses and monster packs are known", () => {
    for (const [id, r] of Object.entries(REGIONS)) {
      for (const p of r.plots) {
        if (!p.name || p.name === 'house' || p.name === 'hut') continue;
        if (!p.model.startsWith('building-')) continue;
        // A named building either serves (a house record) or is only a landmark the points name.
        if (HOUSES[p.name]) expect(HOUSES[p.name]!.house.id, `${id}: ${p.name}`).toBe(p.name);
      }
      for (const pack of r.packs) expect(MONSTERS[pack.kind], `${id}: ${pack.kind}`).toBeDefined();
      for (const c of r.caves ?? []) if (c.target) expect(c.target.level).not.toBe(id);
    }
    // Harrow's seven working houses all have records; the plot names are the records' ids.
    const harrow = harrowmere.plots
      .filter((p) => p.name?.startsWith('harrow-'))
      .map((p) => p.name!);
    expect(harrow.sort()).toEqual(
      Object.keys(HOUSES)
        .filter((k) => k.startsWith('harrow-'))
        .sort(),
    );
  });
});
