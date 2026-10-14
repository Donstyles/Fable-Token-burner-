/**
 * World render resolution presets (DESIGN.md section 4).
 *
 * The world renders at a fixed number of lines and is upscaled to the display with
 * nearest-neighbour sampling. UI and text are HTML at native resolution.
 */
export type RenderPreset = 'lines-1080' | 'lines-720' | 'native';

export const RENDER_PRESETS: readonly RenderPreset[] = ['lines-1080', 'lines-720', 'native'];

export const DEFAULT_RENDER_PRESET: RenderPreset = 'lines-1080';

export function presetLines(preset: RenderPreset): number | null {
  switch (preset) {
    case 'lines-1080':
      return 1080;
    case 'lines-720':
      return 720;
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
  const physicalHeight = Math.max(1, Math.round(m.cssHeight * m.devicePixelRatio));
  const physicalWidth = Math.max(1, Math.round(m.cssWidth * m.devicePixelRatio));
  const wanted = presetLines(preset);
  const lines = wanted === null ? physicalHeight : Math.min(wanted, physicalHeight);
  const upscale = physicalHeight / lines;
  // Babylon divides the CSS size by the scaling level to get the render size.
  const hardwareScalingLevel = m.cssHeight / lines;
  return {
    hardwareScalingLevel,
    width: Math.round(physicalWidth / upscale),
    height: lines,
    upscale,
  };
}

export function isRenderPreset(value: unknown): value is RenderPreset {
  return typeof value === 'string' && (RENDER_PRESETS as readonly string[]).includes(value);
}
