import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { computeRenderTarget, hasUsableSize, type RenderPreset } from '../render/resolution';
import { RetroFilter, type FilterSettings } from '../render/filter';
import { RetroMaterials } from '../render/materials';
import { GradePass, type GradeSettings } from '../render/grade';
import { SkyDome } from '../render/sky';
import { ENVIRONMENTS, type EnvironmentPreset } from '../render/environment';
import { loadSettings, saveSettings, type Settings, type UpscaleMode } from './settings';
import { createDevOverlay, isDevMode, type DevOverlay } from './dev-overlay';
import { diag } from './diag';

export interface App {
  engine: Engine;
  scene: Scene;
  camera: UniversalCamera;
  canvas: HTMLCanvasElement;
  uiLayer: HTMLElement;
  filter: RetroFilter;
  grade: GradePass;
  materials: RetroMaterials;
  sky: SkyDome;
  settings(): Settings;
  setRenderPreset(preset: RenderPreset): void;
  setFilter(next: Partial<FilterSettings>): void;
  setGrade(next: Partial<GradeSettings>): void;
  setUpscale(mode: UpscaleMode): void;
  setEnvironmentPreset(preset: EnvironmentPreset): void;
  dispose(): void;
}

/**
 * Boot the engine on the full-screen canvas with the world render resolution, the retro
 * post-process filter and the vertex-lit material manager. Content plugs in afterwards.
 */
export function boot(canvas: HTMLCanvasElement, uiLayer: HTMLElement): App {
  let settings = loadSettings();

  // No MSAA: the full-screen filter pass makes it pointless, and it costs memory on phones.
  const engine = new Engine(canvas, false, {
    // We control the render size ourselves via the hardware scaling level.
    adaptToDeviceRatio: false,
    preserveDrawingBuffer: false,
    stencil: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.043, 0.039, 0.031, 1);
  const camera = new UniversalCamera('camera', new Vector3(0, 1.65, 0), scene);
  camera.minZ = 0.05;
  camera.maxZ = 1200; // room for the sky dome
  camera.fov = 1.15; // ~66° vertical on a 21:9 phone, close to MM6's wide view
  camera.inputs.clear(); // movement comes from our own controller
  // The up vector follows the rotation every frame. Babylon otherwise turns it only when
  // rotation.z changes, by the whole rotation, so the hit shake's last roll left it tilted by
  // the pitch of that moment and every later turn rolled the horizon (owner, 2026-10-18:
  // "after combat the view port is tilted permanently").
  camera.updateUpVectorFromRotation = true;

  const materials = new RetroMaterials(scene);
  const sky = new SkyDome(scene, materials.env);
  // Post order: grade (bloom, curves, vignette) first, then the optional MM6 filter last.
  const grade = new GradePass(scene, camera);
  const filter = new RetroFilter(
    scene,
    camera,
    `${import.meta.env.BASE_URL}filter/lut-mm6.png`,
    settings.filter,
  );
  const applyUpscale = (mode: UpscaleMode): void => {
    canvas.classList.toggle('pixelated', mode === 'nearest');
  };
  applyUpscale(settings.upscale);

  let preset: RenderPreset = settings.renderPreset;
  const overlay: DevOverlay | null = isDevMode() ? createDevOverlay(engine, uiLayer, scene) : null;

  const applyResolution = (): void => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    // Mid-rotation on iOS the canvas can report a zero size; wait for a real one.
    if (!hasUsableSize(w, h)) return;
    const target = computeRenderTarget(preset, {
      cssWidth: w,
      cssHeight: h,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    engine.setHardwareScalingLevel(target.hardwareScalingLevel);
    engine.resize();
    overlay?.update(preset, target);
    diag(
      `render ${target.width}x${target.height} from ${w}x${h} level=${target.hardwareScalingLevel.toFixed(3)}`,
    );
  };
  engine.onContextLostObservable.add(() => diag('engine: context lost'));
  engine.onContextRestoredObservable.add(() => diag('engine: context restored'));

  // Size changes arrive through several channels on mobile; respond to all of them and
  // re-check a few times after an orientation change until the layout settles.
  const onResize = (): void => applyResolution();
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  const timers: number[] = [];
  const onOrientation = (): void => {
    for (const ms of [50, 250, 700, 1500]) timers.push(window.setTimeout(applyResolution, ms));
  };
  window.addEventListener('orientationchange', onOrientation);
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') applyResolution();
  };
  document.addEventListener('visibilitychange', onVisible);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  observer?.observe(canvas);
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
    grade,
    materials,
    sky,
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
    setGrade(next) {
      grade.apply(next);
    },
    setUpscale(mode) {
      applyUpscale(mode);
      settings = { ...settings, upscale: mode };
      saveSettings(settings);
    },
    setEnvironmentPreset(preset) {
      materials.setEnvironment(ENVIRONMENTS[preset]);
      sky.apply(materials.env);
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientation);
      document.removeEventListener('visibilitychange', onVisible);
      observer?.disconnect();
      for (const t of timers) clearTimeout(t);
      overlay?.dispose();
      engine.stopRenderLoop();
      filter.dispose();
      grade.dispose();
      sky.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}
