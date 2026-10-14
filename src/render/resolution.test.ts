import { describe, expect, it } from 'vitest';
import { computeRenderTarget, isRenderPreset } from './resolution';

// iPhone 14 Pro Max, landscape, standalone: 932×430 CSS points at DPR 3.
const iphone = { cssWidth: 932, cssHeight: 430, devicePixelRatio: 3 };

describe('computeRenderTarget', () => {
  it('renders 1080 lines on the target phone', () => {
    const t = computeRenderTarget('lines-1080', iphone);
    expect(t.height).toBe(1080);
    expect(t.width).toBe(2341);
    expect(t.upscale).toBeCloseTo(1290 / 1080, 5);
    expect(t.hardwareScalingLevel).toBeCloseTo(430 / 1080, 5);
  });

  it('renders 720 lines on the target phone', () => {
    const t = computeRenderTarget('lines-720', iphone);
    expect(t.height).toBe(720);
    expect(t.upscale).toBeCloseTo(1290 / 720, 5);
  });

  it('native renders one pixel per physical pixel', () => {
    const t = computeRenderTarget('native', iphone);
    expect(t.height).toBe(1290);
    expect(t.width).toBe(2796);
    expect(t.upscale).toBe(1);
    expect(t.hardwareScalingLevel).toBeCloseTo(1 / 3, 5);
  });

  it('never upsamples a small display', () => {
    const t = computeRenderTarget('lines-1080', {
      cssWidth: 800,
      cssHeight: 600,
      devicePixelRatio: 1,
    });
    expect(t.height).toBe(600);
    expect(t.upscale).toBe(1);
    expect(t.hardwareScalingLevel).toBe(1);
  });
});

describe('isRenderPreset', () => {
  it('accepts known presets and rejects the rest', () => {
    expect(isRenderPreset('lines-1080')).toBe(true);
    expect(isRenderPreset('native')).toBe(true);
    expect(isRenderPreset('lines-360')).toBe(false);
    expect(isRenderPreset(1080)).toBe(false);
  });
});
