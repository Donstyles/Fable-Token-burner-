import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { computeRenderTarget, type RenderPreset } from '../render/resolution';
import { loadSettings, saveSettings } from './settings';
import { createDevOverlay, isDevMode, type DevOverlay } from './dev-overlay';

export interface App {
  engine: Engine;
  scene: Scene;
  setRenderPreset(preset: RenderPreset): void;
  dispose(): void;
}

/**
 * Boot the engine on the full-screen canvas. Phase 0 shows an empty, dark scene; the
 * filter pipeline (Phase 1) and the world (Phase 2+) plug in here.
 */
export function boot(canvas: HTMLCanvasElement, uiLayer: HTMLElement): App {
  const settings = loadSettings();

  const engine = new Engine(canvas, true, {
    // We control the render size ourselves via the hardware scaling level.
    adaptToDeviceRatio: false,
    preserveDrawingBuffer: false,
    stencil: true,
    powerPreference: 'high-performance',
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.043, 0.039, 0.031, 1);
  const camera = new UniversalCamera('camera', new Vector3(0, 1.7, 0), scene);
  camera.minZ = 0.05;
  camera.maxZ = 400;
  new HemisphericLight('sky', new Vector3(0, 1, 0), scene).intensity = 0.4;

  let preset: RenderPreset = settings.renderPreset;
  const overlay: DevOverlay | null = isDevMode() ? createDevOverlay(engine, uiLayer) : null;

  const applyResolution = (): void => {
    const target = computeRenderTarget(preset, {
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    engine.setHardwareScalingLevel(target.hardwareScalingLevel);
    engine.resize();
    overlay?.update(preset, target);
  };

  const onResize = (): void => applyResolution();
  window.addEventListener('resize', onResize);
  // iOS standalone mode reports the final size a tick after orientation changes.
  const onOrientation = (): void => {
    setTimeout(applyResolution, 50);
  };
  window.addEventListener('orientationchange', onOrientation);
  applyResolution();

  engine.runRenderLoop(() => {
    scene.render();
  });

  return {
    engine,
    scene,
    setRenderPreset(next) {
      preset = next;
      saveSettings({ ...settings, renderPreset: next });
      applyResolution();
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      overlay?.dispose();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
