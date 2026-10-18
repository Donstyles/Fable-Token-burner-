import { DEFAULT_RENDER_PRESET, isRenderPreset, type RenderPreset } from '../render/resolution';
import { DEFAULT_FILTER, FILTER_MODES, type FilterSettings } from '../render/filter';
import { APP_VERSION } from './version';

const KEY = 'ftb.settings.v1';

export type UpscaleMode = 'linear' | 'nearest';
export const UPSCALE_MODES: readonly UpscaleMode[] = ['linear', 'nearest'];

export interface Settings {
  renderPreset: RenderPreset;
  filter: FilterSettings;
  /** How the world render is stretched to the display: soft (look target) or pixelated. */
  upscale: UpscaleMode;
}

const defaults: Settings = {
  renderPreset: DEFAULT_RENDER_PRESET,
  filter: { ...DEFAULT_FILTER },
  // Nearest, so the palette's colours reach the screen unblended (critics, round 7).
  upscale: 'nearest',
};

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

/**
 * localStorage can be absent or throw (private mode, cleared data); every access is guarded.
 * Settings saved by another build are dropped: they would hold the look of the day they were
 * saved over every default changed since (owner's phone, 2026-10-18: a five-level posterise
 * with dither, from tuning long gone, over the shipped look).
 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed: unknown = JSON.parse(raw);
    const obj =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    if (obj.build !== APP_VERSION) return structuredClone(defaults);
    const f =
      typeof obj.filter === 'object' && obj.filter !== null
        ? (obj.filter as Record<string, unknown>)
        : {};
    const mode = f.mode;
    return {
      renderPreset: isRenderPreset(obj.renderPreset) ? obj.renderPreset : defaults.renderPreset,
      upscale:
        typeof obj.upscale === 'string' &&
        (UPSCALE_MODES as readonly string[]).includes(obj.upscale)
          ? (obj.upscale as UpscaleMode)
          : defaults.upscale,
      filter: {
        mode:
          typeof mode === 'string' && (FILTER_MODES as readonly string[]).includes(mode)
            ? (mode as FilterSettings['mode'])
            : defaults.filter.mode,
        levels: num(f.levels, defaults.filter.levels, 2, 64),
        dither: num(f.dither, defaults.filter.dither, 0, 1),
        ditherCell: num(f.ditherCell, defaults.filter.ditherCell, 1, 4),
      },
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, build: APP_VERSION }));
  } catch {
    // Storage unavailable: settings stay in memory for this session.
  }
}
