/** Development entry: dev arena, controls, physics and the tuning panel. Never in production. */
import './dev.css';
// Side-effect import: enables scene.pick (tree-shaken away otherwise).
import '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { App } from '../app/boot';
import { enableHavok } from '../app/physics';
import { InputZones } from '../app/input/zones';
import { bindInput } from '../app/input/dom';
import { PartyController, DEFAULT_TUNING } from '../world/player';
import { FILTER_MODES, type FilterMode } from '../render/filter';
import { RENDER_PRESETS, type RenderPreset } from '../render/resolution';
import { ENVIRONMENT_PRESETS, type EnvironmentPreset } from '../render/environment';
import { UPSCALE_MODES, type UpscaleMode } from '../app/settings';
import { buildDevArena, FLASH_TINT } from './arena';
import { createDevPanel, type Field } from './panel';
import { diag, diagText } from '../app/diag';

export interface DevHandle {
  ready: boolean;
  party: PartyController;
  zones: InputZones;
  lastTap: string | null;
  /** CSS-pixel screen position of a mesh centre, for tests. */
  screenPointOf(name: string): { x: number; y: number } | null;
  positionOf(): { x: number; y: number; z: number };
  yawDeg(): number;
  pitchDeg(): number;
  debug(): { support: number; move: number; velocity: [number, number, number]; airborne: boolean };
  /** Move the party to a feet position and heading, for tests. */
  teleport(x: number, y: number, z: number, yawDeg: number): void;
  /** Accumulated simulated seconds, so tests can measure speeds independent of frame rate. */
  simTime(): number;
  pickAt(x: number, y: number): string | null;
  /** Pointer event counters and consumed taps, for diagnosing input on real devices. */
  events: { down: number; move: number; up: number; cancel: number; taps: number; types: string[] };
}

export async function startDev(app: App): Promise<DevHandle> {
  const { scene, engine, camera, canvas, uiLayer } = app;
  await enableHavok(scene, new Vector3(0, -DEFAULT_TUNING.gravity, 0));
  const arena = buildDevArena(scene, app.materials);

  const zones = new InputZones({ width: canvas.clientWidth, height: canvas.clientHeight });
  bindInput(canvas, zones);
  const events = { down: 0, move: 0, up: 0, cancel: 0, taps: 0, types: [] as string[] };
  const note = (kind: 'down' | 'move' | 'up' | 'cancel') => (e: PointerEvent) => {
    events[kind] += 1;
    if (kind !== 'move' && events.types.length < 20) events.types.push(`${kind}:${e.pointerType}`);
  };
  canvas.addEventListener('pointerdown', note('down'));
  canvas.addEventListener('pointermove', note('move'));
  canvas.addEventListener('pointerup', note('up'));
  canvas.addEventListener('pointercancel', note('cancel'));
  const party = new PartyController(scene, camera, arena.spawn, DEFAULT_TUNING, arena.spawnYawDeg);

  const handle: DevHandle = {
    ready: false,
    party,
    zones,
    lastTap: null,
    events,
    screenPointOf(name) {
      const mesh = scene.getMeshByName(name);
      if (!mesh) return null;
      // Clip space with perspective divide, then to CSS pixels (y down).
      const ndc = Vector3.TransformCoordinates(
        mesh.getAbsolutePosition(),
        scene.getTransformMatrix(),
      );
      return {
        x: ((ndc.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - ndc.y) / 2) * canvas.clientHeight,
      };
    },
    positionOf() {
      const p = party.position;
      return { x: p.x, y: p.y, z: p.z };
    },
    yawDeg: () => (party.yaw * 180) / Math.PI,
    pitchDeg: () => (party.pitch * 180) / Math.PI,
    debug() {
      const v = party.velocity;
      return {
        support: party.lastSupport,
        move: party.lastInputMove,
        velocity: [v.x, v.y, v.z],
        airborne: party.isAirborne,
      };
    },
    pickAt(x, y) {
      const pick = scene.pick(x, y);
      return pick?.pickedMesh?.name ?? null;
    },
    teleport(x, y, z, yawDeg) {
      party.teleport(new Vector3(x, y, z), yawDeg);
    },
    simTime: () => simTime,
  };

  // Tap feedback: flash the tapped mesh.
  const flashing = new Map<Mesh, number>();
  const handleTap = (x: number, y: number): void => {
    const pick = scene.pick(x, y, (m) => arena.tappable.includes(m as Mesh));
    const mesh = pick?.pickedMesh as Mesh | null;
    if (!mesh) return;
    handle.lastTap = mesh.name;
    const mat = arena.materialOf(mesh);
    if (mat) {
      mat.setColor3('tint', FLASH_TINT);
      clearTimeout(flashing.get(mesh));
      flashing.set(
        mesh,
        window.setTimeout(() => mat.setColor3('tint', Color3.White()), 250),
      );
    }
    panel.toast(`tapped ${mesh.name}`);
  };

  let simTime = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    simTime += dt;
    const input = zones.consume();
    party.update(dt, input);
    events.taps += input.taps.length;
    for (const t of input.taps) handleTap(t.x, t.y);
  });
  party.onFall.add((e) => panel.toast(`fell ${e.height.toFixed(1)} m`));

  const range = (
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    set: (v: number) => void,
  ): Field => ({ kind: 'range', key, label, min, max, step, get, set });
  const env = (): typeof app.materials.env => app.materials.env;

  const panel = createDevPanel(
    uiLayer,
    [
      {
        kind: 'select',
        key: 'renderPreset',
        label: 'resolution',
        options: RENDER_PRESETS,
        get: () => app.settings().renderPreset,
        set: (v) => app.setRenderPreset(v as RenderPreset),
      },
      {
        kind: 'select',
        key: 'upscale',
        label: 'upscale',
        options: UPSCALE_MODES,
        get: () => app.settings().upscale,
        set: (v) => app.setUpscale(v as UpscaleMode),
      },
      {
        kind: 'select',
        key: 'environment',
        label: 'sky / light',
        options: ENVIRONMENT_PRESETS,
        get: () => 'dusk-violet',
        set: (v) => app.setEnvironmentPreset(v as EnvironmentPreset),
      },
      range(
        'bloomWeight',
        'bloom',
        0,
        1,
        0.05,
        () => app.grade.settings.bloomWeight,
        (v) => app.setGrade({ bloomWeight: v }),
      ),
      range(
        'bloomThreshold',
        'bloom threshold',
        0.3,
        1.2,
        0.05,
        () => app.grade.settings.bloomThreshold,
        (v) => app.setGrade({ bloomThreshold: v }),
      ),
      range(
        'vignette',
        'vignette',
        0,
        3,
        0.1,
        () => app.grade.settings.vignette,
        (v) => app.setGrade({ vignette: v }),
      ),
      range(
        'contrast',
        'contrast',
        0.8,
        1.5,
        0.02,
        () => app.grade.settings.contrast,
        (v) => app.setGrade({ contrast: v }),
      ),
      range(
        'exposure',
        'exposure',
        0.5,
        1.8,
        0.05,
        () => app.grade.settings.exposure,
        (v) => app.setGrade({ exposure: v }),
      ),
      range(
        'splitTone',
        'split tone',
        0,
        50,
        1,
        () => app.grade.settings.splitTone,
        (v) => app.setGrade({ splitTone: v }),
      ),
      range(
        'saturation',
        'saturation',
        -60,
        60,
        5,
        () => app.grade.settings.saturation,
        (v) => app.setGrade({ saturation: v }),
      ),
      range(
        'lamps',
        'lamp intensity',
        0,
        5,
        0.1,
        () => 2.2,
        (v) => arena.setLightIntensity(v),
      ),
      {
        kind: 'select',
        key: 'filterMode',
        label: 'mm6 filter',
        options: FILTER_MODES,
        get: () => app.filter.settings.mode,
        set: (v) => app.setFilter({ mode: v as FilterMode }),
      },
      range(
        'levels',
        'levels',
        2,
        32,
        1,
        () => app.filter.settings.levels,
        (v) => app.setFilter({ levels: v }),
      ),
      range(
        'dither',
        'dither',
        0,
        1,
        0.05,
        () => app.filter.settings.dither,
        (v) => app.setFilter({ dither: v }),
      ),
      range(
        'ditherCell',
        'dither cell',
        1,
        4,
        1,
        () => app.filter.settings.ditherCell,
        (v) => app.setFilter({ ditherCell: v }),
      ),
      range(
        'fog',
        'fog density',
        0,
        0.12,
        0.005,
        () => env().fogDensity,
        (v) => app.materials.setEnvironment({ fogDensity: v }),
      ),
      range(
        'ambient',
        'ambient',
        0,
        1,
        0.02,
        () => env().ambientColor.r,
        (v) => app.materials.setEnvironment({ ambientColor: new Color3(v, v, v * 1.15) }),
      ),
      {
        kind: 'toggle',
        key: 'mipmaps',
        label: 'mipmaps',
        get: () => true,
        set: (v) => arena.setMipmaps(v),
      },
      range(
        'walkSpeed',
        'walk m/s',
        1,
        10,
        0.25,
        () => party.tuning.walkSpeed,
        (v) => party.setTuning({ walkSpeed: v }),
      ),
      range(
        'turn',
        'turn °/px',
        0.05,
        0.6,
        0.01,
        () => party.tuning.turnDegPerPx,
        (v) => party.setTuning({ turnDegPerPx: v }),
      ),
      range(
        'look',
        'look °/px',
        0.05,
        0.6,
        0.01,
        () => party.tuning.lookDegPerPx,
        (v) => party.setTuning({ lookDegPerPx: v }),
      ),
      range(
        'gravity',
        'gravity',
        5,
        40,
        1,
        () => party.tuning.gravity,
        (v) => party.setTuning({ gravity: v }),
      ),
      range(
        'step',
        'step height',
        0.1,
        0.8,
        0.05,
        () => party.tuning.maxStepHeight,
        (v) => party.setTuning({ maxStepHeight: v }),
      ),
      range(
        'deadzone',
        'stick dead px',
        4,
        30,
        1,
        () => 12,
        (v) => zones.configure({ deadZonePx: v }),
      ),
      range(
        'fullpx',
        'stick full px',
        30,
        160,
        5,
        () => 70,
        (v) => zones.configure({ fullPx: v }),
      ),
      {
        kind: 'button',
        key: 'reset',
        label: 'reset position',
        run: () => party.teleport(arena.spawn, arena.spawnYawDeg),
      },
    ],
    { log: diagText },
  );
  diag('dev arena ready');

  handle.ready = true;
  return handle;
}
