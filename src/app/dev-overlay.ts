import type { Engine } from '@babylonjs/core/Engines/engine';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import type { Scene } from '@babylonjs/core/scene';
import type { RenderPreset, RenderTarget } from '../render/resolution';

/** Shown in dev builds or with `?dev` in the URL. Never part of the shipped experience. */
export function isDevMode(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
}

export interface DevOverlay {
  update(preset: RenderPreset, target: RenderTarget): void;
  dispose(): void;
}

export function createDevOverlay(engine: Engine, parent: HTMLElement, scene?: Scene): DevOverlay {
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
  // What a frame costs, for a phone screenshot: draw calls, active meshes, triangles, the
  // extra render targets (water mirrors, the talking head) and live particle systems.
  const inst = scene ? new SceneInstrumentation(scene) : null;
  if (inst) {
    inst.captureFrameTime = true;
    inst.captureRenderTime = true;
  }
  const cost = (): string => {
    if (!scene || !inst) return '';
    const rtts =
      scene.customRenderTargets.length +
      scene.materials.filter((m) => {
        const w = m as { renderTargetsEnabled?: boolean };
        return w.renderTargetsEnabled === true;
      }).length *
        2;
    const particles = scene.particleSystems.filter((p) => p.isStarted()).length;
    return (
      `\n${inst.drawCallsCounter.current} draws  ${scene.getActiveMeshes().length} meshes  ` +
      `${(scene.getActiveIndices() / 3000).toFixed(0)}k tris\n` +
      `${rtts} rtt  ${particles} ps  frame ${inst.frameTimeCounter.lastSecAverage.toFixed(1)} ms  ` +
      `render ${inst.renderTimeCounter.lastSecAverage.toFixed(1)} ms`
    );
  };

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
        `dpr ${devicePixelRatio}  ${innerWidth}×${innerHeight}` +
        cost();
    }
  });

  return {
    update(p, t) {
      preset = p;
      target = t;
    },
    dispose() {
      inst?.dispose();
      engine.onEndFrameObservable.remove(observer);
      el.remove();
    },
  };
}
