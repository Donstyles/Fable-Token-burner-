import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { computeRenderTarget, type RenderPreset } from '../render/resolution';
import { RetroFilter, type FilterSettings } from '../render/filter';
import { RetroMaterials } from '../render/materials';
import { loadSettings, saveSettings, type Settings } from './settings';
import { createDevOverlay, isDevMode, type DevOverlay } from './dev-overlay';

export interface App {
  engine: Engine;
  scene: Scene;
  camera: UniversalCamera;
  canvas: HTMLCanvasElement;
  uiLayer: HTMLElement;
  filter: RetroFilter;
  materials: RetroMaterials;
  settings(): Settings;
  setRenderPreset(preset: RenderPreset): void;
  setFilter(next: Partial<FilterSettings>): void;
  dispose(): void;
}

/**
 * Boot the engine on the full-screen canvas with the world render resolution, the retro
 * post-process filter and the vertex-lit material manager. Content plugs in afterwards.
 */
export function boot(canvas: HTMLCanvasElement, uiLayer: HTMLElement): App {
  let settings = loadSettings();

  const engine = new Engine(canvas, true, {
    // We control the render size ourselves via the hardware scaling level.
    adaptToDeviceRatio: false,
    preserveDrawingBuffer: false,
    stencil: true,
    powerPreference: 'high-performance',
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.043, 0.039, 0.031, 1);
  const camera = new UniversalCamera('camera', new Vector3(0, 1.65, 0), scene);
  camera.minZ = 0.05;
  camera.maxZ = 400;
  camera.fov = 1.15; // ~66° vertical on a 21:9 phone, close to MM6's wide view
  camera.inputs.clear(); // movement comes from our own controller

  const materials = new RetroMaterials(scene);
  const filter = new RetroFilter(
    scene,
    camera,
    `${import.meta.env.BASE_URL}filter/lut-mm6.png`,
    settings.filter,
  );

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
    camera,
    canvas,
    uiLayer,
    filter,
    materials,
    settings: () => structuredClone(settings),
    setRenderPreset(next) {
      preset = next;
      settings = { ...settings, renderPreset: next };
      saveSettings(settings);
      applyResolution();
    },
    setFilter(next) {
      filter.apply(next);
      settings = { ...settings, filter: filter.settings };
      saveSettings(settings);
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      overlay?.dispose();
      engine.stopRenderLoop();
      filter.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}
