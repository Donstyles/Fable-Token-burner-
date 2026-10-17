/**
 * World render resolution presets (DESIGN.md section 4).
 *
 * The world renders at a fixed number of lines and is upscaled to the display with
 * nearest-neighbour sampling. UI and text are HTML at native resolution.
 */
export type RenderPreset = 'lines-1080' | 'lines-720' | 'lines-540' | 'native';

export const RENDER_PRESETS: readonly RenderPreset[] = [
  'lines-1080',
  'lines-720',
  'lines-540',
  'native',
];

export const DEFAULT_RENDER_PRESET: RenderPreset = 'lines-540';

export function presetLines(preset: RenderPreset): number | null {
  switch (preset) {
    case 'lines-1080':
      return 1080;
    case 'lines-720':
      return 720;
    case 'lines-540':
      return 540;
    case 'native':
      return null;
  }
}

export interface DisplayMetrics {
  /** Canvas size in CSS pixels. */
  cssWidth: number;
  cssHeight: number;
  /** window.devicePixelRatio */
  devicePixelRatio: number;
}

export interface RenderTarget {
  /** Babylon hardware scaling level: render size = css size / level. */
  hardwareScalingLevel: number;
  /** Resulting render buffer size in pixels. */
  width: number;
  height: number;
  /** Physical display pixels per rendered pixel (1 = native). */
  upscale: number;
}

/**
 * Compute the hardware scaling level that yields the preset's line count.
 * Never renders above native resolution: a 720-line preset on a 600-line display is native.
 */
export function computeRenderTarget(preset: RenderPreset, m: DisplayMetrics): RenderTarget {
  // Degenerate sizes happen mid-rotation on iOS; never let them produce a zero or
  // non-finite scaling level, which would leave the WebGL buffer unusable.
  const dpr =
    Number.isFinite(m.devicePixelRatio) && m.devicePixelRatio > 0 ? m.devicePixelRatio : 1;
  const cssWidth = Number.isFinite(m.cssWidth) && m.cssWidth >= 1 ? m.cssWidth : 1;
  const cssHeight = Number.isFinite(m.cssHeight) && m.cssHeight >= 1 ? m.cssHeight : 1;
  const physicalHeight = Math.max(1, Math.round(cssHeight * dpr));
  const physicalWidth = Math.max(1, Math.round(cssWidth * dpr));
  const wanted = presetLines(preset);
  const lines = Math.max(1, wanted === null ? physicalHeight : Math.min(wanted, physicalHeight));
  const upscale = physicalHeight / lines;
  // Babylon divides the CSS size by the scaling level to get the render size.
  const hardwareScalingLevel = Math.min(8, Math.max(0.05, cssHeight / lines));
  return {
    hardwareScalingLevel,
    width: Math.max(1, Math.round(physicalWidth / upscale)),
    height: lines,
    upscale,
  };
}

/** True when the canvas has a usable layout size (not mid-transition or hidden). */
export function hasUsableSize(cssWidth: number, cssHeight: number): boolean {
  return Number.isFinite(cssWidth) && Number.isFinite(cssHeight) && cssWidth >= 2 && cssHeight >= 2;
}

export function isRenderPreset(value: unknown): value is RenderPreset {
  return typeof value === 'string' && (RENDER_PRESETS as readonly string[]).includes(value);
}
