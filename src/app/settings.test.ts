import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTER } from '../render/filter';
import { loadSettings, saveSettings } from './settings';
import { APP_VERSION } from './version';

const KEY = 'ftb.settings.v1';
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('settings', () => {
  it('drops settings saved by another build, so its defaults show', () => {
    // The owner's phone: a five-level posterise with dither, saved before any build id.
    store.set(
      KEY,
      JSON.stringify({ filter: { mode: 'posterize', levels: 5, dither: 0.6, ditherCell: 1 } }),
    );
    expect(loadSettings().filter).toEqual(DEFAULT_FILTER);
    store.set(KEY, JSON.stringify({ build: 'v1 older', filter: { levels: 5, dither: 0.6 } }));
    expect(loadSettings().filter).toEqual(DEFAULT_FILTER);
  });

  it('keeps settings saved by this build', () => {
    const s = loadSettings();
    saveSettings({ ...s, filter: { ...s.filter, levels: 12 } });
    expect(JSON.parse(store.get(KEY)!).build).toBe(APP_VERSION);
    expect(loadSettings().filter.levels).toBe(12);
  });
});
