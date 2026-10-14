import { DEFAULT_RENDER_PRESET, isRenderPreset, type RenderPreset } from '../render/resolution';

const KEY = 'ftb.settings.v1';

export interface Settings {
  renderPreset: RenderPreset;
}

const defaults: Settings = { renderPreset: DEFAULT_RENDER_PRESET };

/** localStorage can be absent or throw (private mode, cleared data); every access is guarded. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed: unknown = JSON.parse(raw);
    const obj =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    return {
      renderPreset: isRenderPreset(obj.renderPreset) ? obj.renderPreset : defaults.renderPreset,
    };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: settings stay in memory for this session.
  }
}
