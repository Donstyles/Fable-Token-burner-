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
import { AnimationStepper } from '../render/animation-step';
import { DEFAULT_CHARACTER_FILL, loadCharacter, type Character } from '../world/character';
import { Navigation } from '../world/navigation';
import { CombatFeedback } from '../world/combat-feedback';
import { PortalWatcher, portalUrl, travel, type Portal } from '../world/portals';
import { Monster } from '../world/monster';
import { MONSTERS, NPCS } from '../game/monsters';
import { Party } from '../game/party';
import { damageDice, healCharacter, type Character as CharacterSheet } from '../game/character';
import { testCharacters } from '../game/fixtures';
import { newGame, type GameState } from '../game/state';
import { automapLevel, revealAt } from '../game/automap';
import { createCreationScreen } from '../ui/creation';
import { installScreens, type Screens } from '../ui/screens';
import { mulberry32 } from '../game/rng';
import { HUMANOID_CLIPS } from '../../kernel/characters/clips';
import { createHud } from '../ui/hud';
// Every character model in the repo, by asset id (src/game/monsters.ts names them).
const CHARACTER_URLS = import.meta.glob('../../assets/characters/*/*.glb', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const characterUrl = (id: string): string => {
  const url = CHARACTER_URLS[`../../assets/characters/${id}/${id}.glb`];
  if (!url) throw new Error(`no character model for ${id}`);
  return url;
};
import { Braziers, FogBySpace, Torch } from '../world/atmosphere';
import { dust } from '../world/particles';
import { CATALOGUE, loadPropModels, propLabel } from '../world/props';
import { createStatusLine } from '../ui/status';
import { Npc } from '../world/npc';
import { Soundscape } from '../world/soundscape';
import { daylightAt, environmentAt, MINUTES_PER_REAL_SECOND } from '../world/daylight';
import { advanceClock, minuteOfDay } from '../game/time';
import { hideVeil, showVeil, veilProgress } from '../app/veil';
import { UnderwaterTint, isUnderwater, wadeSpeedFactor, waterDepthAt } from '../world/wading';
import { ROLE } from '../../kernel/elements/roles';
import { FILTER_MODES, type FilterMode } from '../render/filter';
import { RENDER_PRESETS, type RenderPreset } from '../render/resolution';
import { ENVIRONMENTS, ENVIRONMENT_PRESETS, type EnvironmentPreset } from '../render/environment';
import { UPSCALE_MODES, type UpscaleMode } from '../app/settings';
import { createDevPanel, type Field } from './panel';
import { diag, diagText } from '../app/diag';
import {
  AUDIO_SESSION_TYPES,
  attachListener,
  getAudioSessionType,
  installAudio,
  playTestSound,
  setAudioSessionType,
  type AudioSessionType,
} from '../app/audio';

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
  feedback: CombatFeedback;
  portals: PortalWatcher;
  screens: Screens;
  state: GameState;
  pickAt(x: number, y: number): string | null;
  /** Pointer event counters and consumed taps, for diagnosing input on real devices. */
  events: { down: number; move: number; up: number; cancel: number; taps: number; types: string[] };
  /** The first Meshy character, placed ahead of the spawn; null until loaded. */
  character: Character | null;
  stepper: AnimationStepper;
  /** Monsters in the level, for tests: state, hit points and a programmatic tap. */
  monsters: Monster[];
  roster: Party;
  /** Attack a monster by name with the ready member, as a tap would; the log line or null. */
  attack(name: string): string | null;
}

const DEG = Math.PI / 180;
const QUERY = new URLSearchParams(location.search);
// The valley is the first thing a visitor sees; the dungeon is a portal away (or ?level=showcase).
const LEVEL = QUERY.get('level') ?? 'valley';
/** What the veil calls each level while it loads. */
const PLACE_NAMES: Record<string, string> = {
  valley: 'The Valley',
  desert: 'The Desert',
  showcase: 'The Old Halls',
};
/** Arriving through a portal: the portal of this level to appear at (DESIGN.md 15.3). */
const ENTRY = QUERY.get('entry');

export async function startDev(app: App): Promise<DevHandle> {
  const { scene, engine, camera, canvas, uiLayer } = app;
  // Townsfolk standing about the village (src/world/npc.ts); monsters live on the handle.
  const npcs: Npc[] = [];
  await enableHavok(scene, new Vector3(0, -DEFAULT_TUNING.gravity, 0));
  const textures = loadRoleTextures(scene, true);
  // Levels live next to the page: <base>levels/<id>.glb and .json.
  const base = new URL(import.meta.env.BASE_URL, location.href).href;
  // The veil hides the load; it lifts when the level is ready (src/app/veil.ts).
  showVeil(uiLayer, PLACE_NAMES[LEVEL] ?? LEVEL, 'Loading the land');
  veilProgress(0.1);
  diag(`loading level ${LEVEL}`);
  const level = await loadLevel(scene, app.materials, `${base}levels/${LEVEL}`, textures);
  diag(
    `level ${level.sidecar.name}: ${level.sidecar.stats['triangles']} tris, ` +
      `${level.meshes.length} meshes`,
  );
  // The region's noon; the day and night cycle (src/world/daylight.ts) bends it by the hour.
  let dayEnvironment: typeof app.materials.env | null = null;
  let lastDaylightMinute = -1;
  let daylightNow = 1;
  if (level.sidecar.outdoor) {
    // Outdoor look (DESIGN.md 15): a sun, a lit sky, fog that keeps the far ridges hazy; the
    // region's sidecar carries its own colours.
    const space = level.spaces[0];
    const env = level.sidecar.environment;
    const desert = level.sidecar.region === 'desert';
    const c3 = (v: [number, number, number]): Color3 => new Color3(v[0], v[1], v[2]);
    app.materials.setEnvironment({
      ...ENVIRONMENTS['mm6-day'],
      // The desert's sun hangs low ahead of the spawn, in the view down the road.
      lightDirection: desert
        ? new Vector3(-0.85, -0.45, 0.2).normalize()
        : new Vector3(-0.45, -0.8, 0.4).normalize(),
      lightColor: env ? c3(env.lightColor) : new Color3(1.0, 0.92, 0.78),
      ambientColor: env ? c3(env.ambientColor) : new Color3(0.36, 0.4, 0.48),
      fogColor: space?.fog?.color ?? new Color3(0.62, 0.68, 0.78),
      fogDensity: space?.fog?.density ?? 0.0017,
      ...(env
        ? {
            skyZenith: c3(env.skyZenith),
            skyHorizon: c3(env.skyHorizon),
            cloudAmount: env.cloudAmount,
          }
        : {}),
    });
    app.sky.apply(app.materials.env);
    app.sky.mesh.setEnabled(true);
    dayEnvironment = { ...app.materials.env };
    // Weather (DESIGN.md 15.7): cloud shadows drift over every region; the desert shimmers.
    app.materials.setWeather({
      heat: desert ? 1 : 0,
      cloudShadow: Math.min(1, app.materials.env.cloudAmount * 1.5),
    });
    camera.maxZ = 6000;
  } else {
    // Dungeon look: no sky light, dark fog close in.
    app.materials.setEnvironment({
      ambientColor: new Color3(0.05, 0.05, 0.07),
      lightColor: new Color3(0, 0, 0),
      fogColor: new Color3(0.01, 0.01, 0.015),
      fogDensity: 0.016,
    });
    app.materials.setWeather({ heat: 0, cloudShadow: 0 });
    app.sky.mesh.setEnabled(false);
  }
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
    // Every body mirrors the sky; outdoors the far ridges too.
    [app.sky.mesh, ...level.meshes.filter((m) => m.name === 'backdrop')],
  );
  const waterfalls = new LevelWaterfalls(scene, level.waterfalls, app.materials);
  // Desert weather (DESIGN.md 15.5): a hot wind carries sand across the view.
  const wind = new Vector3(5.5, 0, 2.2);
  const sand = level.sidecar.region === 'desert' ? dust(scene, wind) : null;
  sand?.start();
  // Wind, birds and footsteps, all synthesised (DESIGN.md 16.4).
  const soundscape = new Soundscape(scene, {
    outdoor: level.sidecar.outdoor === true,
    region: level.sidecar.region ?? 'dungeon',
  });
  let lastPartyPos = new Vector3();
  // Babylon's listener rides the camera; sounds place themselves in scene space.
  void installAudio().then(() => attachListener(app.camera));
  let mipmapsOn = true;
  const torch = new Torch(app.materials);
  const braziers = new Braziers(scene, level.lights);
  const fog = new FogBySpace(app.materials, level.spaces);
  const underwater = new UnderwaterTint(uiLayer);
  diag(`water: ${level.water.length} bodies, ${level.waterfalls.length} falls`);
  veilProgress(0.55);
  // Combat test bed (PLAN Phase 5 step 4): the test party, a seeded die, the level's navmesh
  // and one bandit six metres ahead of the spawn. Clips step at MM6's rate regardless of the
  // display refresh. `?seed=<n>` makes a run repeatable.
  const stepper = new AnimationStepper(scene, 10);
  const seed = Number(new URLSearchParams(location.search).get('seed')) || Date.now() % 100000;
  const rng = mulberry32(seed);
  diag(`combat seed ${seed}`);
  // The party: the four test characters, or the ones made on the creation screen (?create).
  const sheets: CharacterSheet[] = QUERY.has('create')
    ? await new Promise<CharacterSheet[]>((resolve) => {
        const creation = createCreationScreen(uiLayer, (made) => {
          creation.dispose();
          resolve(made);
        });
      })
    : testCharacters();
  const game = newGame(sheets, { seed, level: { id: LEVEL, x: 0, y: 0, z: 0, yawDeg: 0 } });

  if (!game.ok) throw new Error(`new game: ${game.reason}`);
  const state = game.state;
  // `?hour=21.5` starts the clock at that hour of the first day, for looking at dusk and night.
  const startHour = Number(QUERY.get('hour'));
  if (QUERY.has('hour') && Number.isFinite(startHour)) {
    const dayStart = Math.floor(state.clock.minutes / (24 * 60)) * 24 * 60;
    state.clock.minutes = dayStart + startHour * 60;
  }
  // The automap of this level: 8 m cells over the level's bounds (Babylon space), revealed
  // round the party as it walks; the journal reads state.level for the party's mark.
  const mapCell = level.sidecar.outdoor ? 8 : 2;
  const mapLevel = automapLevel(state.automap, LEVEL, {
    width: Math.ceil((level.sidecar.bounds.max[0] - level.sidecar.bounds.min[0]) / mapCell),
    height: Math.ceil((level.sidecar.bounds.max[2] - level.sidecar.bounds.min[2]) / mapCell),
    cellSize: mapCell,
    originX: -level.sidecar.bounds.max[0],
    originZ: level.sidecar.bounds.min[2],
  });
  let mapTimer = 0;
  const roster = new Party(state.party);
  // The HUD band (DESIGN 9): a tap selects a member, a second tap opens their sheet. The
  // status line above it names what is tapped and tells the fight, as MM6's did.
  const strip = createHud(uiLayer, roster, { onOpenSheet: () => screens.open('sheet') });
  const status = createStatusLine(uiLayer);
  const feedback = new CombatFeedback(scene, stepper, uiLayer, {}, rng);
  // Simulated seconds: the party's recovery and the screens' die run on it.
  let simTime = 0;
  // The book shelf (DESIGN 14.5): sheet, items, spells, rest, quests, map. An open screen
  // pauses the world, as MM6's books did. Spell effects beyond healing are reported for now.
  const screens: Screens = installScreens(uiLayer, state, {
    now: () => simTime,
    onClose: () => {},
    onRest: (kind) =>
      status.say(
        kind === 'dawn'
          ? 'The party waits until dawn'
          : kind === 'room'
            ? 'The party sleeps at the inn'
            : 'The party rests',
      ),
    onCast: (cast) => {
      const caster = state.party[cast.caster]?.name ?? 'someone';
      if (cast.failed) {
        status.say(`${caster}'s spell fizzles`);
        return;
      }
      for (const e of cast.effects) {
        if (e.kind === 'heal') {
          const m = state.party[e.member];
          if (m) healCharacter(m, e.amount);
        }
      }
      status.say(`${caster} casts ${cast.spell}`);
    },
  });
  const partyTarget = {
    get position() {
      return party.position;
    },
    pickTarget(r: () => number) {
      const index = roster.randomLivingIndex(r);
      const member = roster.members[index];
      if (!member) return null;
      return {
        name: member.def.name,
        armorClass: member.armorClass,
        hit: (damage: number) => {
          roster.takeDamage(index, damage);
          feedback.partyStruck();
        },
      };
    },
  };
  const ahead = new Vector3(
    Math.sin(level.spawnYawDeg * DEG),
    0,
    Math.cos(level.spawnYawDeg * DEG),
  );
  let navigation: Navigation | null = null;
  const startCombat = async (): Promise<void> => {
    let nav: Navigation | null = null;
    try {
      nav = await Navigation.load(`${base}levels/${LEVEL}.nav.bin`);
      diag('navmesh: loaded');
      veilProgress(0.75);
    } catch (e) {
      diag(`navmesh failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    // The level's spawns (regions), or the test bed's one bandit six metres ahead.
    const placements = level.spawns.length
      ? level.spawns.map((s, i) => ({ ...s, name: i === 0 ? 'bandit' : `${s.kind}-${i + 1}` }))
      : [
          {
            kind: 'bandit',
            name: 'bandit',
            position: level.spawn.add(ahead.scale(6)),
            yawDeg: level.spawnYawDeg + 180,
          },
        ];
    // Everyone loads at once: one after another, each waited frames of its own, and at a
    // frame a second (software GL in CI) eight of them took longer than the tests allow.
    const loaded = await Promise.all(
      placements.map(async (p) => {
        const def = MONSTERS[p.kind];
        const npcDef = NPCS[p.kind];
        if (!def && !npcDef) {
          diag(`no such monster: ${p.kind}`);
          return null;
        }
        try {
          const c = await loadCharacter(scene, app.materials, stepper, characterUrl(p.kind), {
            name: p.name,
            position: p.position,
            yawDeg: p.yawDeg,
          });
          return { p, c, def, npcDef };
        } catch (e) {
          diag(`${p.name} failed: ${e instanceof Error ? e.message : String(e)}`);
          return null;
        }
      }),
    );
    for (const got of loaded) {
      if (!got) continue;
      handle.character ??= got.c;
      if (got.def) handle.monsters.push(new Monster(got.def, got.c, nav, rng));
      else if (got.npcDef) npcs.push(new Npc(got.npcDef, got.c));
    }
    diag(`${handle.monsters.length} monsters, ${nav ? 'on the navmesh' : 'no navmesh'}`);
    veilProgress(0.95);
    navigation = nav;
  };

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
  const entry = ENTRY ? level.portals.find((p) => p.name === ENTRY) : undefined;
  const start = entry?.arrive ?? { position: level.spawn, yawDeg: level.spawnYawDeg };
  // `?prop=<id>` stands one Meshy model in front of the party for inspection (dev only).
  const propId = QUERY.get('prop');
  if (propId) {
    const measure = CATALOGUE[propId];
    if (!measure) throw new Error(`prop ${propId}: not in the catalogue`);
    const model = (await loadPropModels(scene, app.materials, [propId])).get(propId)!;
    const yaw = start.yawDeg * DEG;
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const away = 6 + Math.max(measure.size[0], measure.size[2]) * 0.9 + measure.size[1] * 0.6;
    model.mesh.isVisible = true;
    model.mesh.position = start.position.add(forward.scale(away));
    model.mesh.position.y = start.position.y - 0.9;
    model.mesh.rotation.y = yaw + Math.PI;
    diag(`prop ${propId}: ${measure.size.map((v) => v.toFixed(1)).join(' × ')} m`);
  }
  const party = new PartyController(scene, camera, start.position, DEFAULT_TUNING, start.yawDeg);
  if (ENTRY) diag(`arrived through ${entry ? ENTRY : `unknown portal ${ENTRY}, at the spawn`}`);
  const portals = new PortalWatcher(level.portals, (p: Portal) => {
    diag(`portal ${p.name} → ${p.target.level}`);
    travel(
      uiLayer,
      p.target.level === 'showcase' ? 'Into the dark…' : 'Out into the light…',
      portalUrl(location.href, p),
    );
  });

  const handle: DevHandle = {
    ready: false,
    party,
    zones,
    level,
    water,
    lastTap: null,
    events,
    character: null,
    stepper,
    monsters: [],
    roster,
    attack(name) {
      const monster = handle.monsters.find((m) => m.name === name);
      return monster ? attackMonster(monster, 0) : null;
    },
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
    feedback,
    portals,
    screens,
    state,
  };

  void startCombat();

  // A tap on a monster attacks it with the ready member (DESIGN 7.1); the log line is shown.
  // A sword reaches this far; a bow reaches anything in view (DESIGN 14.1).
  const MELEE_REACH = 3.5;
  const attackMonster = (monster: Monster, distance = 0): string => {
    if (!monster.alive) return `${monster.def.name} is dead`;
    const ready = roster.readyIndex(simTime);
    if (ready < 0) return 'Nobody is ready';
    const next = roster.members[ready]!;
    const ranged = next.character ? damageDice(next.character, true) !== null : false;
    if (!ranged && distance > MELEE_REACH) return `${next.name} cannot reach ${monster.def.name}`;
    const a = roster.attack(monster, simTime, rng);
    if (!a) return 'Nobody is ready';
    if (a.result.hit) feedback.monsterStruck(monster, party.position, !monster.alive);
    else feedback.monsterMissed();
    const line = a.result.hit
      ? `${a.member.def.name} hits ${monster.def.name} for ${a.result.damage}`
      : `${a.member.def.name} misses ${monster.def.name}`;
    return monster.alive ? line : `${line}; ${monster.def.name} falls`;
  };
  let clipReview = false;

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
    const villager = npcs.find((n) => mesh.name.startsWith(`${n.character.node.name}:`));
    if (villager) {
      status.say(villager.greet(), 6000);
      return;
    }
    const monster = handle.monsters.find((m) => mesh.name.startsWith(`${m.name}:`));
    if (monster) {
      if (clipReview) {
        // Clip review: each tap steps to the next clip, for judging animations on the phone.
        const clips = monster.character.clips;
        const next =
          clips[(clips.indexOf(monster.character.clip ?? '') + 1) % clips.length] ?? 'idle';
        monster.character.play(next);
        panel.toast(`${monster.name}: ${next}`);
      } else {
        status.say(attackMonster(monster, d));
      }
      return;
    }
    // A tapped model is named; the ground and the walls stay quiet, as in MM6.
    if (mesh.name.startsWith('props:')) status.say(propLabel(mesh.name.split(':')[1] ?? ''));
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

  let lastDeepToast = -10;
  scene.onBeforeRenderObservable.add(() => {
    // Hit stop (DESIGN.md 14.4): the world's step is zero for a few frames after a blow.
    // An open screen pauses the world; the hit stop also zeroes the step for a few frames.
    const paused = screens.current() !== null;
    const dt = paused ? 0 : feedback.update(Math.min(engine.getDeltaTime() / 1000, 0.05));
    if (paused) stepper.timeScale = 0;
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
        status.say('Deep water');
      }
    }
    level.update(camera.globalPosition);
    if (sand) {
      // Spawn upwind of the eye, so the grains blow through the view rather than away.
      const e = camera.globalPosition;
      sand.emitter = new Vector3(e.x - wind.x * 4, Math.max(e.y - 4, 0), e.z - wind.z * 4);
    }
    if (!fly) portals.update(party.position);
    mapTimer += dt;
    if (mapTimer > 0.5) {
      mapTimer = 0;
      const p = party.position;
      revealAt(mapLevel, p.x, p.z, level.sidecar.outdoor ? 40 : 6);
      state.level = { id: LEVEL, x: p.x, y: p.y, z: p.z, yawDeg: (party.yaw * 180) / Math.PI };
    }
    navigation?.update(dt);
    // The clock runs while the party is in the world; the sky follows it (DESIGN.md 16.3).
    if (dt > 0) advanceClock(state.clock, dt * MINUTES_PER_REAL_SECOND);
    if (dayEnvironment) {
      const minute = Math.floor(minuteOfDay(state.clock.minutes) * 4) / 4;
      if (minute !== lastDaylightMinute) {
        const firstDaylightTick = lastDaylightMinute < 0;
        lastDaylightMinute = minute;
        const light = daylightAt(minute);
        const bent = environmentAt(dayEnvironment, light);
        app.materials.setEnvironment(bent);
        fog.colorOverride = bent.fogColor;
        if (firstDaylightTick) fog.snapColor();
        app.sky.apply(app.materials.env);
        app.sky.setNight(light.night);
        daylightNow = light.daylight;
        // Lanterns and the forge come up as the day goes; the cave's glow burns always.
        level.setLiveLights(true, 0.15 + 0.85 * (1 - light.daylight));
        strip.setClock(state.clock.minutes);
      }
    }
    for (const n of npcs) n.update(dt, party.position);
    if (dt > 0 && !fly) {
      const p = party.position;
      const moved = Math.hypot(p.x - lastPartyPos.x, p.z - lastPartyPos.z);
      lastPartyPos = p.clone();
      soundscape.update(dt, p, moved < 2 ? moved : 0, daylightNow, party.waterDepth > 0.25);
    }
    for (const m of handle.monsters) {
      m.update(dt, partyTarget, simTime);
      for (const ev of m.takeEvents()) {
        status.say(ev.text);
        if (ev.kind === 'miss') feedback.partyMissed();
      }
    }
    if (!fly) feedback.applyCamera(camera);
    strip.update(simTime);
    const eye = camera.globalPosition;
    const yaw = fly ? flyYaw : party.yaw;
    underwater.set(isUnderwater(level.water, eye));
    water.update(eye, dt);
    waterfalls.update(dt, eye);
    torch.update(dt, eye, yaw);
    fog.update(dt, eye);
    events.taps += input.taps.length;
    for (const t of input.taps) handleTap(t.x, t.y);
  });
  party.onFall.add((e) => {
    if (e.height >= 3) status.say('The party falls');
  });

  const range = (
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    set: (v: number) => void,
    persist = true,
  ): Field => ({ kind: 'range', key, label, min, max, step, get, set, persist });
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
        get: () => torch.enabled,
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
        get: () => waterfalls.particlesEnabled,
        set: (v) => {
          waterfalls.setParticles(v);
          braziers.setEnabled(v);
        },
      },
      {
        kind: 'toggle',
        key: 'sound',
        label: 'waterfall sound',
        get: () => waterfalls.soundOn,
        set: (v) => waterfalls.setSound(v),
        // Showed "on" whatever its state and restored a stored "off" at every launch:
        // the fall was silent from v60 to v70 for this alone (2026-10-15).
        persist: false,
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
        kind: 'toggle',
        key: 'clipReview',
        label: 'tap cycles clips',
        get: () => clipReview,
        set: (v) => {
          clipReview = v;
        },
        persist: false,
      },
      {
        kind: 'select',
        key: 'banditClip',
        label: 'bandit clip',
        options: HUMANOID_CLIPS,
        get: () => handle.character?.clip ?? 'idle',
        set: (v) => handle.character?.play(v),
        persist: false,
      },
      range(
        'characterFill',
        'character fill',
        0,
        0.6,
        0.01,
        () => handle.character?.fill ?? DEFAULT_CHARACTER_FILL,
        (v) => handle.character?.setFill(v),
      ),
      range(
        'animFps',
        'anim steps/s',
        2,
        30,
        1,
        () => stepper.stepFps,
        (v) => {
          stepper.stepFps = v;
        },
      ),
      {
        kind: 'select',
        key: 'audioSession',
        label: 'audio session',
        options: AUDIO_SESSION_TYPES,
        get: () => getAudioSessionType(),
        set: (v) => setAudioSessionType(v as AudioSessionType),
        // The owner's phone kept "ambient" from an earlier test and every later build
        // started silent (2026-10-15): the session is a diagnostic, not a tuning value.
        persist: false,
      },
      {
        kind: 'button',
        key: 'testTone',
        label: 'test tone',
        run: () => playTestSound(),
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
        // The region sets its own light; a remembered preset would drown it in dungeon fog.
        persist: false,
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
        false,
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
        false,
      ),
      range(
        'ambient',
        'ambient',
        0,
        1,
        0.02,
        () => env().ambientColor.r,
        (v) => app.materials.setEnvironment({ ambientColor: new Color3(v, v, v * 1.15) }),
        false,
      ),
      {
        kind: 'toggle',
        key: 'mipmaps',
        label: 'mipmaps',
        get: () => mipmapsOn,
        set: (v) => {
          mipmapsOn = v;
          setRoleMipmaps(textures, v);
        },
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
  veilProgress(1);
  hideVeil(600);

  handle.ready = true;
  return handle;
}
