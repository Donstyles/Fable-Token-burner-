import { DEFAULT_RENDER_PRESET, isRenderPreset, type RenderPreset } from '../render/resolution';
import { DEFAULT_FILTER, FILTER_MODES, type FilterSettings } from '../render/filter';

const KEY = 'ftb.settings.v1';

export interface Settings {
  renderPreset: RenderPreset;
  filter: FilterSettings;
}

const defaults: Settings = { renderPreset: DEFAULT_RENDER_PRESET, filter: { ...DEFAULT_FILTER } };

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

/** localStorage can be absent or throw (private mode, cleared data); every access is guarded. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed: unknown = JSON.parse(raw);
    const obj =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    const f =
      typeof obj.filter === 'object' && obj.filter !== null
        ? (obj.filter as Record<string, unknown>)
        : {};
    const mode = f.mode;
    return {
      renderPreset: isRenderPreset(obj.renderPreset) ? obj.renderPreset : defaults.renderPreset,
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
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: settings stay in memory for this session.
  }
}
