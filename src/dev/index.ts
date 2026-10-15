/**
 * Development entry: loads the compiled showcase level with the party controller, a free
 * fly camera, wireframe and navmesh overlays and the tuning panel. Never in production.
 */
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
import { loadLevel, type LoadedLevel } from '../world/level';
import { loadRoleTextures, setRoleMipmaps } from '../world/textures';
import { LevelWater, WATER_QUALITIES, type WaterQuality } from '../world/water';
import { LevelWaterfalls } from '../world/waterfall';
import { Braziers, FogBySpace, Torch } from '../world/atmosphere';
import { UnderwaterTint, isUnderwater, wadeSpeedFactor, waterDepthAt } from '../world/wading';
import { ROLE } from '../../kernel/elements/roles';
import { FILTER_MODES, type FilterMode } from '../render/filter';
import { RENDER_PRESETS, type RenderPreset } from '../render/resolution';
import { ENVIRONMENT_PRESETS, type EnvironmentPreset } from '../render/environment';
import { UPSCALE_MODES, type UpscaleMode } from '../app/settings';
import { createDevPanel, type Field } from './panel';
import { diag, diagText } from '../app/diag';
import {
  AUDIO_SESSION_TYPES,
  getAudioSessionType,
  playTestTone,
  setAudioSessionType,
  type AudioSessionType,
} from '../app/audio-unlock';

export interface DevHandle {
  ready: boolean;
  party: PartyController;
  zones: InputZones;
  level: LoadedLevel;
  water: LevelWater;
  lastTap: string | null;
  /** CSS-pixel screen position of a mesh centre, for tests. */
  screenPointOf(name: string): { x: number; y: number } | null;
  positionOf(): { x: number; y: number; z: number };
  yawDeg(): number;
  pitchDeg(): number;
  debug(): {
    support: number;
    move: number;
    velocity: [number, number, number];
    airborne: boolean;
    waterDepth: number;
    space: string | null;
  };
  /** Move the party to a feet position and heading, for tests. */
  teleport(x: number, y: number, z: number, yawDeg: number): void;
  /** Named level points in scene space, for tests. */
  pointOf(name: string): { x: number; y: number; z: number } | null;
  /** Accumulated simulated seconds, so tests can measure speeds independent of frame rate. */
  simTime(): number;
  pickAt(x: number, y: number): string | null;
  /** Pointer event counters and consumed taps, for diagnosing input on real devices. */
  events: { down: number; move: number; up: number; cancel: number; taps: number; types: string[] };
}

const DEG = Math.PI / 180;
const LEVEL = new URLSearchParams(location.search).get('level') ?? 'showcase';

export async function startDev(app: App): Promise<DevHandle> {
  const { scene, engine, camera, canvas, uiLayer } = app;
  await enableHavok(scene, new Vector3(0, -DEFAULT_TUNING.gravity, 0));
  const textures = loadRoleTextures(scene, true);
  // Levels live next to the page: <base>levels/<id>.glb and .json.
  const base = new URL(import.meta.env.BASE_URL, location.href).href;
  diag(`loading level ${LEVEL}`);
  const level = await loadLevel(scene, app.materials, `${base}levels/${LEVEL}`, textures);
  diag(
    `level ${level.sidecar.name}: ${level.sidecar.stats['triangles']} tris, ` +
      `${level.meshes.length} meshes`,
  );
  // Dungeon look: no sky light, dark fog close in.
  app.materials.setEnvironment({
    ambientColor: new Color3(0.05, 0.05, 0.07),
    lightColor: new Color3(0, 0, 0),
    fogColor: new Color3(0.01, 0.01, 0.015),
    fogDensity: 0.016,
  });
  app.sky.mesh.setEnabled(false);
  // Real water: reflection and refraction at a fraction of the world resolution.
  const stillWater = textures.get(ROLE.water)!;
  const water = new LevelWater(
    scene,
    level.water,
    level.meshes,
    app.materials,
    () =>
      app.materials.create({
        name: 'water-still',
        texture: stillWater.texture,
        uvScale: [1 / stillWater.metresPerTile, 1 / stillWater.metresPerTile],
        ...(stillWater.emissive ? { emissive: stillWater.emissive } : {}),
        ...(stillWater.tint ? { tint: stillWater.tint } : {}),
      }),
    'quarter',
  );
  const waterfalls = new LevelWaterfalls(scene, level.waterfalls, app.materials);
  const torch = new Torch(app.materials);
  const braziers = new Braziers(scene, level.lights);
  const fog = new FogBySpace(app.materials, level.spaces);
  const underwater = new UnderwaterTint(uiLayer);
  diag(`water: ${level.water.length} bodies, ${level.waterfalls.length} falls`);

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
  const party = new PartyController(scene, camera, level.spawn, DEFAULT_TUNING, level.spawnYawDeg);

  const handle: DevHandle = {
    ready: false,
    party,
    zones,
    level,
    water,
    lastTap: null,
    events,
    screenPointOf(name) {
      const mesh = scene.getMeshByName(name);
      if (!mesh) return null;
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
        waterDepth: party.waterDepth,
        space: fog.space,
      };
    },
    pickAt(x, y) {
      const pick = scene.pick(x, y);
      return pick?.pickedMesh?.name ?? null;
    },
    teleport(x, y, z, yawDeg) {
      party.teleport(new Vector3(x, y, z), yawDeg);
    },
    pointOf(name) {
      const p = level.points.get(name);
      return p ? { x: p.x, y: p.y, z: p.z } : null;
    },
    simTime: () => simTime,
  };

  // Tap feedback: outline the tapped mesh briefly.
  const flashing = new Map<Mesh, number>();
  const handleTap = (x: number, y: number): void => {
    const pick = scene.pick(x, y, (m) => m.isPickable && m.isVisible);
    const mesh = pick?.pickedMesh as Mesh | null;
    if (!mesh) return;
    handle.lastTap = mesh.name;
    mesh.renderOverlay = true;
    mesh.overlayColor = new Color3(1, 0.85, 0.5);
    mesh.overlayAlpha = 0.35;
    clearTimeout(flashing.get(mesh));
    flashing.set(
      mesh,
      window.setTimeout(() => {
        mesh.renderOverlay = false;
      }, 250),
    );
    const d = pick?.distance ?? 0;
    panel.toast(`tapped ${mesh.name} at ${d.toFixed(1)} m`);
  };

  // Free fly camera: the stick moves along the view direction, the party stays put.
  let fly = false;
  let flyYaw = 0;
  let flyPitch = 0;
  let flySpeed = 8;
  const setFly = (on: boolean): void => {
    if (on === fly) return;
    fly = on;
    if (on) {
      flyYaw = party.yaw;
      flyPitch = party.pitch;
    } else {
      // Land the party where the camera is.
      const feet = camera.position.subtract(new Vector3(0, party.tuning.eyeHeight, 0));
      party.teleport(feet, flyYaw / DEG);
    }
  };
  const flyUpdate = (dt: number, input: ReturnType<InputZones['consume']>): void => {
    flyYaw += (input.turnPx + input.lookX) * party.tuning.lookDegPerPx * DEG;
    flyYaw += input.keyTurn * party.tuning.keyTurnDegPerSec * DEG * dt;
    flyPitch += input.lookY * party.tuning.lookDegPerPx * DEG;
    flyPitch = Math.max(-85 * DEG, Math.min(85 * DEG, flyPitch));
    const forward = new Vector3(
      Math.sin(flyYaw) * Math.cos(flyPitch),
      -Math.sin(flyPitch),
      Math.cos(flyYaw) * Math.cos(flyPitch),
    );
    const right = new Vector3(Math.cos(flyYaw), 0, -Math.sin(flyYaw));
    const move = forward
      .scale(input.move * flySpeed * dt)
      .add(right.scale(input.strafe * flySpeed * dt));
    camera.position.addInPlace(move);
    camera.rotation.set(flyPitch, flyYaw, 0);
  };

  let simTime = 0;
  let lastDeepToast = -10;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    simTime += dt;
    const input = zones.consume();
    if (fly) {
      flyUpdate(dt, input);
    } else {
      // Wading: depth over the feet slows the walk; eyes under the surface tint the view.
      const depth = waterDepthAt(level.water, party.position);
      party.waterDepth = depth;
      party.speedFactor = wadeSpeedFactor(depth);
      party.update(dt, input);
      if (depth >= 1.3 && simTime - lastDeepToast > 2) {
        lastDeepToast = simTime;
        panel.toast('deep water');
      }
    }
    const eye = camera.globalPosition;
    const yaw = fly ? flyYaw : party.yaw;
    underwater.set(isUnderwater(level.water, eye));
    water.update(eye, dt);
    waterfalls.update(dt, eye, yaw);
    torch.update(dt, eye, yaw);
    fog.update(dt, eye);
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
  // Owner's tuning 2026-10-15: live per-pixel lights on top of the baked light.
  let liveLights = true;
  let liveScale = 1;
  level.setLiveLights(true, liveScale);

  const panel = createDevPanel(
    uiLayer,
    [
      {
        kind: 'toggle',
        key: 'fly',
        label: 'fly camera',
        get: () => fly,
        set: (v) => setFly(v),
      },
      range(
        'flySpeed',
        'fly m/s',
        2,
        30,
        1,
        () => flySpeed,
        (v) => (flySpeed = v),
      ),
      {
        kind: 'select',
        key: 'waterQuality',
        label: 'water passes',
        options: WATER_QUALITIES,
        get: () => water.currentQuality,
        set: (v) => water.setQuality(v as WaterQuality),
      },
      range(
        'waterBlend',
        'water tint',
        0,
        1,
        0.02,
        () => water.look.blend,
        (v) => water.setLook({ blend: v }),
      ),
      range(
        'waterMirror',
        'mirror tint',
        0,
        1,
        0.02,
        () => water.look.reflectBlend,
        (v) => water.setLook({ reflectBlend: v }),
      ),
      range(
        'waterBump',
        'water ripple',
        0,
        0.3,
        0.01,
        () => water.look.bumpHeight,
        (v) => water.setLook({ bumpHeight: v }),
      ),
      range(
        'waterDrift',
        'ripple drift m/s',
        0,
        0.6,
        0.02,
        () => water.look.rippleSpeed,
        (v) => water.setLook({ rippleSpeed: v }),
      ),
      range(
        'waterFlow',
        'river flow m/s',
        0,
        3,
        0.1,
        () => water.look.flowSpeed,
        (v) => water.setLook({ flowSpeed: v }),
      ),
      range(
        'waterTile',
        'ripple size m',
        0.5,
        4,
        0.1,
        () => water.look.waveLength,
        (v) => water.setLook({ waveLength: v }),
      ),
      {
        kind: 'toggle',
        key: 'torch',
        label: 'torch',
        get: () => true,
        set: (v) => torch.setEnabled(v),
      },
      range(
        'torchPower',
        'torch power',
        0,
        2,
        0.1,
        () => torch.base,
        (v) => (torch.base = v),
      ),
      {
        kind: 'toggle',
        key: 'particles',
        label: 'particles',
        get: () => true,
        set: (v) => {
          waterfalls.setParticles(v);
          braziers.setEnabled(v);
        },
      },
      {
        kind: 'toggle',
        key: 'sound',
        label: 'waterfall sound',
        get: () => true,
        set: (v) => waterfalls.setSound(v),
      },
      range(
        'soundVolume',
        'waterfall volume',
        0,
        1,
        0.05,
        () => waterfalls.soundVolume,
        (v) => waterfalls.setSoundVolume(v),
      ),
      {
        kind: 'select',
        key: 'audioSession',
        label: 'audio session',
        options: AUDIO_SESSION_TYPES,
        get: () => getAudioSessionType(),
        set: (v) => setAudioSessionType(v as AudioSessionType),
      },
      {
        kind: 'button',
        key: 'testTone',
        label: 'test tone',
        run: () => playTestTone(),
      },
      {
        kind: 'toggle',
        key: 'wire',
        label: 'wireframe',
        get: () => false,
        set: (v) => level.setWireframe(v),
      },
      {
        kind: 'toggle',
        key: 'navmesh',
        label: 'navmesh overlay',
        get: () => false,
        set: (v) => level.setNavMeshVisible(v),
      },
      range(
        'bakedMix',
        'baked light',
        0,
        1,
        0.05,
        () => 1,
        (v) => level.setBakedMix(v),
      ),
      {
        kind: 'toggle',
        key: 'liveLights',
        label: 'live lights',
        get: () => liveLights,
        set: (v) => {
          liveLights = v;
          level.setLiveLights(v, liveScale);
        },
      },
      range(
        'lamps',
        'live light scale',
        0,
        5,
        0.1,
        () => liveScale,
        (v) => {
          liveScale = v;
          if (liveLights) level.setLiveLights(true, v);
        },
      ),
      range(
        'lightKnee',
        'light knee',
        0.5,
        2.5,
        0.05,
        () => app.materials.lightKnee,
        (v) => app.materials.setLightKnee(v),
      ),
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
        'fogScale',
        'fog scale',
        0,
        3,
        0.1,
        () => fog.scale,
        (v) => (fog.scale = v),
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
        set: (v) => setRoleMipmaps(textures, v),
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
        'accel',
        'accel gain',
        0.05,
        1,
        0.05,
        () => party.tuning.accelGain,
        (v) => party.setTuning({ accelGain: v }),
      ),
      range(
        'eyeSmooth',
        'eye smoothing',
        0,
        30,
        1,
        () => party.tuning.eyeSmoothing,
        (v) => party.setTuning({ eyeSmoothing: v }),
      ),
      {
        kind: 'toggle',
        key: 'snapOn',
        label: 'level snap',
        get: () => party.tuning.levelSnapEnabled,
        set: (v) => party.setTuning({ levelSnapEnabled: v }),
      },
      range(
        'snapDeg',
        'level snap °',
        0,
        30,
        1,
        () => party.tuning.levelSnapDeg,
        (v) => party.setTuning({ levelSnapDeg: v }),
      ),
      range(
        'snapSpeed',
        'snap °/s',
        10,
        180,
        5,
        () => party.tuning.levelSnapDegPerSec,
        (v) => party.setTuning({ levelSnapDegPerSec: v }),
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
        run: () => {
          setFly(false);
          party.teleport(level.spawn, level.spawnYawDeg);
        },
      },
    ],
    { log: diagText },
  );
  diag(`dev level ready: ${LEVEL}`);

  handle.ready = true;
  return handle;
}
