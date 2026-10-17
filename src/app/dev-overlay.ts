import type { Engine } from '@babylonjs/core/Engines/engine';
import type { RenderPreset, RenderTarget } from '../render/resolution';

/** Shown in dev builds or with `?dev` in the URL. Never part of the shipped experience. */
export function isDevMode(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
}

export interface DevOverlay {
  update(preset: RenderPreset, target: RenderTarget): void;
  dispose(): void;
}

export function createDevOverlay(engine: Engine, parent: HTMLElement): DevOverlay {
  const el = document.createElement('div');
  el.className = 'dev-overlay';
  el.id = 'dev-overlay';
  el.dataset['native'] = '';
  parent.appendChild(el);

  let preset: RenderPreset = 'lines-1080';
  let target: RenderTarget | null = null;
  let frames = 0;
  let last = performance.now();
  let fps = 0;

  const observer = engine.onEndFrameObservable.add(() => {
    frames += 1;
    const now = performance.now();
    if (now - last >= 500) {
      fps = (frames * 1000) / (now - last);
      frames = 0;
      last = now;
      el.textContent =
        `${fps.toFixed(0)} fps\n` +
        `${preset}  ${target?.width ?? '?'}×${target?.height ?? '?'}  ×${target?.upscale.toFixed(2) ?? '?'}\n` +
        `dpr ${devicePixelRatio}  ${innerWidth}×${innerHeight}`;
    }
  });

  return {
    update(p, t) {
      preset = p;
      target = t;
    },
    dispose() {
      engine.onEndFrameObservable.remove(observer);
      el.remove();
    },
  };
}
