/**
 * Save slots (DESIGN.md 17.14; ROADMAP M0): ten named slots in IndexedDB, each a copy of the
 * game as it stood, listed with where, when and who. The autosave (autosave.ts) stays the
 * game in play: saving to a slot copies it, loading a slot copies it back and the page goes
 * on from it. The database is named per channel, so the dev build and the game at the root
 * keep their own. Without IndexedDB (a private window, a test runner) the slots live in
 * memory for the session.
 */
import { diag } from './diag';
import { fromJson, saveSummary, toJson, type SaveFile, type SaveSummary } from '../game/save';
import type { GameState } from '../game/state';

export const SLOT_COUNT = 10;
/** The slots in order: slot-1 to slot-10. */
export const SLOTS: readonly string[] = Array.from(
  { length: SLOT_COUNT },
  (_, i) => `slot-${i + 1}`,
);

export interface SlotRecord {
  slot: string;
  /** Wall-clock milliseconds when it was written. */
  savedAt: number;
  summary: SaveSummary;
  file: SaveFile;
}

export interface SlotStore {
  /** Every written slot, in slot order. */
  list(): Promise<SlotRecord[]>;
  read(slot: string): Promise<SlotRecord | null>;
  write(slot: string, state: GameState, now?: number): Promise<SlotRecord>;
  remove(slot: string): Promise<void>;
}

function record(slot: string, state: GameState, now: number): SlotRecord {
  const text = toJson(state, now);
  const parsed = fromJson(text);
  if (!parsed.ok) throw new Error(parsed.error);
  return {
    slot,
    savedAt: now,
    summary: saveSummary(parsed.state),
    file: { version: JSON.parse(text).version as number, savedAt: now, state: parsed.state },
  };
}

function bySlot(a: SlotRecord, b: SlotRecord): number {
  return SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot);
}

/** Slots kept in memory: the session's, and the tests'. */
export function memorySlots(): SlotStore {
  const slots = new Map<string, SlotRecord>();
  return {
    list: async () => [...slots.values()].sort(bySlot),
    read: async (slot) => slots.get(slot) ?? null,
    write: async (slot, state, now = Date.now()) => {
      const rec = record(slot, state, now);
      slots.set(slot, rec);
      return rec;
    },
    remove: async (slot) => {
      slots.delete(slot);
    },
  };
}

const STORE = 'saves';

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
}

/** Slots in the browser's IndexedDB, under `name`. */
export function indexedDbSlots(name: string, factory: IDBFactory = indexedDB): SlotStore {
  let db: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    db ??= new Promise((resolve, reject) => {
      const r = factory.open(name, 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) {
          r.result.createObjectStore(STORE, { keyPath: 'slot' });
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error('IndexedDB open failed'));
      r.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
    return db;
  };
  const stored = (raw: unknown): SlotRecord | null => {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Partial<SlotRecord> & { text?: string };
    if (typeof r.slot !== 'string' || typeof r.text !== 'string') return null;
    const parsed = fromJson(r.text);
    if (!parsed.ok) {
      diag(`slot ${r.slot} ignored: ${parsed.error}`);
      return null;
    }
    const savedAt = typeof r.savedAt === 'number' ? r.savedAt : 0;
    return {
      slot: r.slot,
      savedAt,
      summary: saveSummary(parsed.state),
      file: { version: JSON.parse(r.text).version as number, savedAt, state: parsed.state },
    };
  };
  return {
    async list() {
      const d = await open();
      const rows = await request(d.transaction(STORE, 'readonly').objectStore(STORE).getAll());
      return rows
        .map(stored)
        .filter((r): r is SlotRecord => r !== null && SLOTS.includes(r.slot))
        .sort(bySlot);
    },
    async read(slot) {
      const d = await open();
      return stored(await request(d.transaction(STORE, 'readonly').objectStore(STORE).get(slot)));
    },
    async write(slot, state, now = Date.now()) {
      const d = await open();
      const text = toJson(state, now);
      await request(
        d.transaction(STORE, 'readwrite').objectStore(STORE).put({ slot, savedAt: now, text }),
      );
      return record(slot, state, now);
    },
    async remove(slot) {
      const d = await open();
      await request(d.transaction(STORE, 'readwrite').objectStore(STORE).delete(slot));
    },
  };
}

/**
 * The slots for this build: IndexedDB named per channel (the dev build's apart from the
 * game's), or memory when the browser gives none. Asks the browser to keep the storage, so a
 * phone short of space does not quietly throw the saves away.
 */
export function openSlots(): SlotStore {
  const channel = import.meta.env.DEV || import.meta.env.MODE === 'devbuild' ? '-dev' : '';
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no IndexedDB');
    void navigator.storage?.persist?.().catch(() => undefined);
    return indexedDbSlots(`ftb-saves${channel}`);
  } catch (e) {
    diag(`save slots in memory only: ${e instanceof Error ? e.message : String(e)}`);
    return memorySlots();
  }
}
