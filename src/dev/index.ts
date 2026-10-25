/**
 * Development entry: loads a compiled level (Gullhaven unless `?level=` names another) with the
 * party controller, a free fly camera, wireframe and navmesh overlays and the tuning panel.
 * Never in production.
 */
import './dev.css';
// Side-effect import: enables scene.pick (tree-shaken away otherwise).
import '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { App } from '../app/boot';
import { enableHavok } from '../app/physics';
import { InputZones } from '../app/input/zones';
import { bindInput } from '../app/input/dom';
import { PartyController, DEFAULT_TUNING } from '../world/player';
import { loadLevel, type LoadedLevel } from '../world/level';
import { paintRoleTextures } from '../world/painted-textures';
import { setRoleMipmaps } from '../world/textures';
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
import {
  damageDice,
  healCharacter,
  maxHp,
  restoreSp,
  type Character as CharacterSheet,
} from '../game/character';
import { testCharacters } from '../game/fixtures';
import { newGame, type GameState } from '../game/state';
import { automapLevel, revealAt } from '../game/automap';
import { createCreationScreen } from '../ui/creation';
import { installScreens, type MapMark, type Screens } from '../ui/screens';
import { mulberry32, rollDice } from '../game/rng';
import { afflict, cure, cureAll } from '../game/conditions';
import { spellDef, type SpellId } from '../game/spells';
import { canCast, learnSpell } from '../game/spellbook';
import { cast as castFromBook, castMessage } from '../ui/spellbook-model';
import { SpellEffects } from '../world/spellfx';
import { pickTarget } from '../world/spell-target';
import { playCast } from '../app/audio';
import type { CastEvent } from '../ui/context';
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
import { Braziers, ChimneySmoke, FogBySpace, Torch } from '../world/atmosphere';
import { Halos } from '../world/halos';
import { RoomView } from '../world/room';
import { CATALOGUE, doorPoint, loadPropModels, onDoor, propLabel } from '../world/props';
import { createStatusLine } from '../ui/status';
import { Npc } from '../world/npc';
import { Bust } from '../world/bust';
import { createDialogue, type Dialogue } from '../ui/dialogue';
import { DIALOGUES, QUESTS } from '../game/dialogue';
import { questNotice, questStage } from '../ui/dialogue-model';
import { createTitleScreen } from '../ui/title';
import { handleQuestEvent } from '../game/quests';
import { shareExperience } from '../game/experience';
import { Soundscape } from '../world/soundscape';
import { DOOR_REACH, VILLAGE_HOUSES } from '../game/content';
import { clearSave, loadGame, saveGame } from '../app/autosave';
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
import { installLensShift, type ViewBox } from '../app/view-box';
import { sunBlend } from '../world/ground-shade';
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
  /** Where a building's door is on screen (its first copy's), or null. */
  screenDoorOf(model: string): { x: number; y: number } | null;
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
  /** The first character loaded (the level's first spawn); null until loaded. */
  character: Character | null;
  stepper: AnimationStepper;
  /** Monsters in the level, for tests: state, hit points and a programmatic tap. */
  monsters: Monster[];
  roster: Party;
  /** Attack a monster by name with the ready member, as a tap would; the log line or null. */
  attack(name: string): string | null;
  /** Townsfolk in the level, for tests. */
  npcs: Npc[];
  dialogue: Dialogue;
  /** The talking head, for tests. */
  bust: Bust;
  /** Bolts in the air and bursts, for tests. */
  spells: SpellEffects;
  torch: Torch;
  /** Cast a spell as the first member who can (taught first in the dev build); the log line. */
  cast(spell: SpellId): string | null;
  /** Talk to a villager by id, as a tap would; false when there is no such villager. */
  talkTo(id: string): boolean;
  /** The room of the house the party is in, drawn in the view's box (DESIGN.md 17.8). */
  room: RoomView;
}

const DEG = Math.PI / 180;
const QUERY = new URLSearchParams(location.search);
// Gullhaven, the starting region, is the first thing a visitor sees.
const LEVEL = QUERY.get('level') ?? 'gullhaven';
/** What the veil calls each level while it loads. */
const PLACE_NAMES: Record<string, string> = {
  gullhaven: 'Gullhaven',
};
/** Arriving through a portal: the portal of this level to appear at (DESIGN.md 15.3). */
const ENTRY = QUERY.get('entry');

export async function startDev(app: App): Promise<DevHandle> {
  const { scene, engine, camera, canvas, uiLayer } = app;
  // The title (owner, 2026-10-23: "Prepare the next demo for me to play"): a plain visit opens
  // on Continue and New Game. A portal and `?continue` go on from the autosave; the test hooks
  // (`?dev`) start a new game at once, as before.
  let choice: 'continue' | 'new' | null = ENTRY || QUERY.has('continue') ? 'continue' : null;
  if (!choice && !QUERY.has('dev')) {
    const saved = loadGame();
    choice = await new Promise<'continue' | 'new'>((resolve) => {
      const title = createTitleScreen(uiLayer, {
        hasSave: saved !== null,
        onContinue: () => {
          title.dispose();
          resolve('continue');
        },
        onNewGame: () => {
          title.dispose();
          resolve('new');
        },
      });
    });
    // A save made below ground continues there.
    if (choice === 'continue' && saved && saved.level.id !== LEVEL) {
      const url = new URL(location.href);
      url.searchParams.set('level', saved.level.id);
      url.searchParams.set('continue', '');
      location.replace(url.toString());
      return new Promise<DevHandle>(() => {});
    }
  }
  // Townsfolk standing about the village (src/world/npc.ts); monsters live on the handle.
  const npcs: Npc[] = [];
  await enableHavok(scene, new Vector3(0, -DEFAULT_TUNING.gravity, 0));
  // Painted at startup, as MM6's bitmaps were (DESIGN.md 16.13), never photographs.
  const textures = paintRoleTextures(scene, true);
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
    const c3 = (v: [number, number, number]): Color3 => new Color3(v[0], v[1], v[2]);
    app.materials.setEnvironment({
      ...ENVIRONMENTS['mm6-day'],
      lightDirection: new Vector3(-0.45, -0.8, 0.4).normalize(),
      lightColor: (env ? c3(env.lightColor) : new Color3(1.0, 0.92, 0.78)).scale(1.15),
      // Lifted by half: the houses' shadow sides went black on the phone (owner, 2026-10-17);
      // MM6 lit its world nearly flat.
      ambientColor: (env ? c3(env.ambientColor) : new Color3(0.36, 0.4, 0.48)).scale(1.15),
      // The far ridges melt into the sky's own horizon band, not a lavender haze of their own.
      fogColor: space?.fog?.color ?? (env ? c3(env.skyHorizon) : new Color3(0.62, 0.68, 0.78)),
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
    // Weather (DESIGN.md 15.7): cloud shadows drift over every region.
    app.materials.setWeather({
      heat: 0,
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
    // Outdoors the water is the flat painted texture, as MM6's was: the mirror passes drew
    // the valley twice more per frame on the phone (owner, 2026-10-17). Indoors a pool mirrors.
    level.sidecar.outdoor ? 'off' : 'eighth',
    // Every body mirrors the sky; outdoors the far ridges too.
    [app.sky.mesh, ...level.meshes.filter((m) => m.name === 'backdrop')],
  );
  const waterfalls = new LevelWaterfalls(scene, level.waterfalls, app.materials);
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
  // The hearths' smoke over the town's roofs (DESIGN.md 17.6).
  const chimneys = new ChimneySmoke(scene, level.smoke);
  const halos = new Halos(scene, level.lights);
  const fog = new FogBySpace(app.materials, level.spaces);
  const underwater = new UnderwaterTint(uiLayer);
  diag(`water: ${level.water.length} bodies, ${level.waterfalls.length} falls`);
  veilProgress(0.55);
  // Combat (PLAN Phase 5 step 4): the test party, a seeded die, the level's navmesh and its
  // monsters where the level script stands them. Clips step at MM6's rate regardless of the
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
  // Through a portal, or with `?continue`, the party comes back from the autosave; a fresh
  // visit starts a new game (DESIGN.md 16.6).
  const restored = choice === 'continue' ? loadGame() : null;
  if (choice === 'new') clearSave();
  const game = restored
    ? ({ ok: true, state: restored } as const)
    : newGame(sheets, { seed, level: { id: LEVEL, x: 0, y: 0, z: 0, yawDeg: 0 } });
  if (restored) diag(`autosave restored: ${restored.party.map((c) => c.name).join(', ')}`);

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
  let saveTimer = 0;
  // The party's spot goes into the save with the rest, so Continue stands it where it was
  // (the audit, 2026-10-23: a reload put the party back on the waterfront). A portal writes
  // its own destination instead.
  const save = (): boolean => {
    const p = party.position;
    state.level = { id: LEVEL, x: p.x, y: p.y, z: p.z, yawDeg: (party.yaw * 180) / Math.PI };
    return saveGame(state);
  };
  const roster = new Party(state.party);
  // The HUD band (DESIGN 9): a tap selects a member, a second tap opens their sheet. The
  // status line above it names what is tapped and tells the fight, as MM6's did.
  const strip = createHud(uiLayer, roster, {
    onOpenSheet: () => screens.open('sheet'),
    // MM6's four books and four ovals in the panel (DESIGN.md 16.34).
    onBook: (book) => screens.open(book),
    onOval: (oval) => {
      if (oval === 'cast') screens.open('spells');
      else screens.open(oval);
    },
    onSelect: (i) => {
      // A screen waiting on a target (a spell) takes the tap; otherwise the sheet, the
      // inventory and the spellbook follow the portrait tapped (DESIGN.md 16.15).
      if (screens.pickMember(i)) return;
      state.selected = i;
      const cur = screens.current();
      if (
        cur === 'sheet' ||
        cur === 'skills' ||
        cur === 'items' ||
        cur === 'awards' ||
        cur === 'spells'
      )
        screens.open(cur);
    },
  });
  strip.setClock(state.clock.minutes);
  // Gold and food on the band, as MM6's (the audit, 2026-10-23: 430 gold shown nowhere).
  let purse = '';
  const showPurse = (): void => {
    const now = `${state.gold}:${state.food}`;
    if (now === purse) return;
    purse = now;
    strip.setPurse(state.gold, state.food);
  };
  showPurse();
  const status = createStatusLine(uiLayer);
  const feedback = new CombatFeedback(scene, stepper, uiLayer, {}, rng);
  // Simulated seconds: the party's recovery and the screens' die run on it.
  let simTime = 0;
  // The book shelf (DESIGN 14.5): sheet, items, spells, rest, quests, map. An open screen
  // pauses the world, as MM6's books did. Spell effects beyond healing are reported for now.
  let mapPicture: { picture: HTMLImageElement; size: number } | null = null;
  // Set once the view's box is known, below: a house's room comes down with its board.
  let leaveRoom = (): void => {};
  const screens: Screens = installScreens(uiLayer, state, {
    now: () => simTime,
    questDefs: QUESTS,
    // What a screen says goes to MM6's message bar on the band; what MM6 drew over the panel
    // (a member's figure, a house's board) into the panel's cover (DESIGN.md 16.34).
    say: (text) => status.say(text, 5000),
    cover: strip.panel.cover,
    // The options' game menu: a new game starts over, a load goes back to the last save, quit
    // goes to the title.
    menu: {
      save: () => save(),
      load: () => {
        const url = new URL(location.href);
        url.searchParams.set('continue', '');
        location.replace(url.toString());
      },
      newGame: () => {
        clearSave();
        location.replace(location.pathname);
      },
      quit: () => location.replace(location.pathname),
    },
    onClose: () => {
      leaveRoom();
      save();
    },
    onRest: (kind) => {
      status.say(
        kind === 'dawn'
          ? 'The party waits until dawn'
          : kind === 'wait'
            ? 'The party waits'
            : kind === 'room'
              ? 'The party sleeps at the inn'
              : 'The party rests',
      );
      save();
    },
    onCast: (cast) => performCast(cast),
    mapPicture: () => mapPicture,
    // The map's marks: the villagers (a quest to take or to hand in marks them out) and the
    // ways in and out.
    marks: (): MapMark[] => [
      ...npcs.map((n): MapMark => {
        const def = DIALOGUES[n.def.id];
        const pending = (def?.topics ?? []).some((t) => {
          if (t.kind !== 'quest') return false;
          const q = QUESTS[t.quest];
          const stage = q ? questStage(state.quests, q, n.def.id) : 'done';
          return stage === 'offer' || stage === 'ready';
        });
        return {
          x: n.position.x,
          z: n.position.z,
          kind: pending ? 'quest' : 'person',
          label: n.def.name,
        };
      }),
      ...level.portals.map((p): MapMark => ({
        x: p.position.x,
        z: p.position.z,
        kind: 'portal',
        label: PLACE_NAMES[p.target.level] ?? p.target.level,
      })),
    ],
    // MM6 will not let a party sleep with monsters about it.
    restBlocked: () =>
      handle.monsters.some((m) => m.alive && m.distanceTo(party.position) < 30)
        ? 'There are hostile creatures nearby!'
        : null,
  });
  // Spells you can see (DESIGN.md 16.9); the cast itself is performed below, once the
  // view, the torch and the monsters exist.
  const spellfx = new SpellEffects(scene, app.materials);
  let performCast: (cast: CastEvent) => void = () => {};
  // Talk (DESIGN.md 16.7): a tapped villager opens the wooden panel with their living face
  // in its window and the world waits while they speak. A villager without a script keeps
  // their line in the status bar.
  const bust = new Bust(scene, canvas, app.materials);
  let talking: Npc | null = null;
  const dialogue: Dialogue = createDialogue(uiLayer, state, QUESTS, {
    // The board over the panel, as MM6's (DESIGN.md 16.34).
    cover: strip.panel.cover,
    onSpeak: () => talking?.say(),
    onWindow: (rect) => bust.place(rect),
    notice: (line) => status.say(line, 6000),
    onClose: () => {
      bust.hide();
      talking?.engage(false);
      talking = null;
      screens.toggleButtonBar(true);
      save();
    },
  });
  const talkTo = (npc: Npc): void => {
    const def = DIALOGUES[npc.def.id];
    if (!def) {
      status.say(npc.greet(), 6000);
      return;
    }
    talking = npc;
    npc.engage(true);
    screens.toggleButtonBar(false);
    bust.show(npc.character);
    dialogue.open(npc.def, def);
  };
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
          // At the game's minute and the simulation's time, so the blow costs the member its
          // hit recovery (MM6-GAPS.md 8).
          roster.takeDamage(index, damage, state.clock.minutes, simTime);
          feedback.partyStruck();
        },
      };
    },
  };
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
    // The level's spawns, named for tests by kind: the first bandit `bandit`, then `bandit-2`.
    const counts = new Map<string, number>();
    const placements = level.spawns.map((s) => {
      const n = (counts.get(s.kind) ?? 0) + 1;
      counts.set(s.kind, n);
      return { ...s, name: n === 1 ? s.kind : `${s.kind}-${n}` };
    });
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
  // After a wipe the party wakes at the temple door, facing the square (`?wake=temple`); the
  // flag leaves the address at once, so a reload continues from the save as usual.
  const wakeAt = QUERY.get('wake') ? level.points.get(QUERY.get('wake')!) : undefined;
  const square = level.points.get('square');
  const woke = wakeAt
    ? {
        position: wakeAt.add(new Vector3(0, 0.5, 0)),
        yawDeg: square
          ? (Math.atan2(square.x - wakeAt.x, square.z - wakeAt.z) * 180) / Math.PI
          : level.spawnYawDeg,
      }
    : null;
  if (QUERY.has('wake')) {
    const url = new URL(location.href);
    url.searchParams.delete('wake');
    history.replaceState(null, '', url.toString());
  }
  // Continue stands the party where the save left it, on this level.
  const was = restored && !ENTRY && restored.level.id === LEVEL ? restored.level : null;
  // Outdoors on the ground under that spot, never below it: a save made mid-fall would
  // otherwise continue under the hill.
  const groundUnder = (x: number, z: number): number | null => {
    const hit = scene.pickWithRay(
      new Ray(new Vector3(x, 1000, z), Vector3.Down(), 2000),
      // The ground only: a house's eave over the spot must not put the party on its roof.
      (m) => m.isPickable && m.isEnabled() && !m.name.startsWith('props:'),
    );
    return hit?.pickedPoint?.y ?? null;
  };
  const resumed =
    was && (was.x !== 0 || was.y !== 0 || was.z !== 0)
      ? {
          position: new Vector3(
            was.x,
            Math.max(was.y, level.sidecar.outdoor ? (groundUnder(was.x, was.z) ?? was.y) : was.y) +
              0.2,
            was.z,
          ),
          yawDeg: was.yawDeg,
        }
      : null;
  const start = entry?.arrive ??
    woke ??
    resumed ?? { position: level.spawn, yawDeg: level.spawnYawDeg };
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
  // MM6's frame leaves the view at the top left (DESIGN.md 16.34): the camera's centre of
  // projection and the touch zones' split move to the view's middle.
  const viewBox = (): ViewBox | null => {
    const band = uiLayer.querySelector<HTMLElement>('.hud');
    if (!band || !band.offsetWidth) return null;
    return {
      left: band.offsetLeft,
      top: 0,
      right: band.offsetLeft + band.offsetWidth,
      bottom: band.offsetTop,
    };
  };
  // A house with a room shows it in the view's box while its board is up, and the world is
  // not drawn behind it (DESIGN.md 17.8).
  const room = new RoomView(scene, canvas, viewBox);
  const enterRoom = (id: string): void => {
    if (room.show(id)) app.setFrame(() => room.draw());
  };
  leaveRoom = () => {
    if (!room.id) return;
    room.hide();
    app.setFrame(null);
    // A drag on the room's picture is not a turn of the party's head.
    zones.consume();
  };
  const lens = installLensShift(camera, viewBox, () => ({
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  }));
  const splitZones = (): void => {
    const b = viewBox();
    if (b) zones.configure({ splitX: (b.left + b.right) / 2 });
  };
  const reframe = (): void => {
    lens.refresh();
    splitZones();
  };
  addEventListener('resize', () => requestAnimationFrame(reframe));
  requestAnimationFrame(reframe);
  // The minimap (panel.ts) and the map book: the region's picture from above, or below ground
  // the cells walked.
  {
    const size = level.sidecar.bounds.max[0] - level.sidecar.bounds.min[0];
    let picture: HTMLImageElement | null = null;
    if (level.sidecar.outdoor) {
      picture = new Image();
      picture.src = `${import.meta.env.BASE_URL}levels/${LEVEL}.mini.png`;
      mapPicture = { picture, size };
    }
    strip.panel.setSource({ picture, size, automap: mapLevel });
  }
  if (ENTRY) diag(`arrived through ${entry ? ENTRY : `unknown portal ${ENTRY}, at the spawn`}`);
  const portals = new PortalWatcher(level.portals, (p: Portal) => {
    diag(`portal ${p.name} → ${p.target.level}`);
    state.level = { id: p.target.level, x: 0, y: 0, z: 0, yawDeg: 0 };
    saveGame(state);
    travel(
      uiLayer,
      // Out of a region a portal goes underground; out of anywhere else, up into the day.
      level.sidecar.outdoor ? 'Into the dark…' : 'Out into the light…',
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
    screenDoorOf(model) {
      const mesh = scene.meshes.find((m) => m.name.startsWith(`props:${model}`)) as
        Mesh | undefined;
      const local = doorPoint(model);
      const matrices = mesh?.thinInstanceGetWorldMatrices();
      if (!mesh || !local || !matrices?.length) return null;
      const world = matrices[0]!.multiply(mesh.getWorldMatrix());
      const at = Vector3.TransformCoordinates(new Vector3(local.x, local.y, local.z), world);
      const ndc = Vector3.TransformCoordinates(at, scene.getTransformMatrix());
      return {
        x: ((ndc.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - ndc.y) / 2) * canvas.clientHeight,
      };
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
    npcs,
    dialogue,
    bust,
    spells: spellfx,
    torch,
    cast: (spell) => {
      const index = state.party.findIndex((c) => canCast(c, spell).ok);
      let caster = index;
      if (caster < 0) {
        // Dev build: the first member who can learn it is taught it on the spot.
        caster = state.party.findIndex((c) => learnSpell(c, spell).ok);
        if (caster < 0) return null;
      }
      const r = castFromBook(state, caster, spell, state.selected, rng);
      if (!r.ok) return r.message;
      performCast(r.event);
      return castMessage(state, r.event);
    },
    talkTo: (id) => {
      const npc = npcs.find((n) => n.def.id === id);
      if (!npc) return false;
      talkTo(npc);
      return true;
    },
    room,
  };

  void startCombat();

  // A tap on a monster attacks it with the ready member (DESIGN 7.1); the log line is shown.
  // A sword reaches this far; a bow reaches anything in view (DESIGN 14.1).
  const MELEE_REACH = 3.5;
  const attackMonster = (monster: Monster, distance = 0): string => {
    if (!monster.alive) return `${monster.def.name} is dead`;
    if (roster.readyIndex(simTime) < 0) return 'Nobody is ready';
    // Out of a sword's reach the blow goes to a ready member with a bow, and the swords stay
    // ready for when it closes (the audit, 2026-10-23: the tap stuck on "cannot reach").
    const reaches = (m: (typeof roster.members)[number]): boolean =>
      distance <= MELEE_REACH ||
      (m.character ? damageDice(m.character, true) !== null : m.canShoot);
    const a = roster.attack(monster, simTime, rng, true, reaches);
    if (!a) return `${monster.def.name} is out of reach`;
    if (a.result.hit) feedback.monsterStruck(monster, party.position, !monster.alive);
    else feedback.monsterMissed();
    const line = a.result.hit
      ? `${a.member.def.name} hits ${monster.def.name} for ${a.result.damage}`
      : `${a.member.def.name} misses ${monster.def.name}`;
    return monster.alive ? line : `${line}; ${monster.def.name} falls`;
  };
  let clipReview = false;
  // A fallen monster is searched with a tap at arm's length, as MM6's corpses were: its
  // purse once (the audit, 2026-10-23: no kill paid anything but experience).
  const LOOT_REACH = 6;
  const searched = new Set<string>();
  const search = (monster: Monster, distance: number): string => {
    if (searched.has(monster.name)) return `Nothing more on the ${monster.def.name}`;
    if (distance > LOOT_REACH) return `A dead ${monster.def.name} (come closer)`;
    searched.add(monster.name);
    const [lo, hi] = monster.def.gold ?? [0, 0];
    const gold = lo + Math.floor(rng() * (hi - lo + 1));
    if (gold <= 0) return `You find nothing on the ${monster.def.name}`;
    state.gold += gold;
    return `You find ${gold} gold`;
  };

  // Tap feedback: outline the tapped mesh briefly.
  const flashing = new Map<Mesh, number>();
  const handleTap = (x: number, y: number): void => {
    // While a villager talks the view takes no taps; the panel's own buttons do. Nor in a
    // house's room: the street is not behind it.
    if (dialogue.isOpen() || room.id) return;
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
      talkTo(villager);
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
        status.say(monster.alive ? attackMonster(monster, d) : search(monster, d));
      }
      return;
    }
    // A house opens its service only when its door is tapped from near enough (owner,
    // 2026-10-23: "I want Houses only enterable from door"); a tap anywhere else on it, or on
    // any other model, names it; the ground stays quiet, as in MM6. The tapped point is taken
    // into the copy's own frame to be tested against the door.
    if (mesh.name.startsWith('props:')) {
      const model = mesh.name.split(':')[1] ?? '';
      const copy = pick?.thinInstanceIndex ?? -1;
      // Which house this copy is: its plot's name (src/world/level.ts keeps them by copy).
      const names = (mesh.metadata as { names?: string[] } | null)?.names;
      const house = VILLAGE_HOUSES[names?.[copy] ?? model.replace('building-', '')];
      const point = pick?.pickedPoint;
      const matrices = copy >= 0 ? mesh.thinInstanceGetWorldMatrices() : [];
      const door =
        house !== undefined &&
        point !== null &&
        point !== undefined &&
        matrices[copy] !== undefined &&
        onDoor(
          model,
          Vector3.TransformCoordinates(
            point,
            matrices[copy]!.multiply(mesh.getWorldMatrix()).invert(),
          ),
        );
      if (house && door && d <= DOOR_REACH) {
        screens.openService(house.kind, house.house);
        enterRoom(house.house.id);
        return;
      }
      const label = propLabel(model, house?.house.name);
      status.say(house && door ? `${label} (come closer)` : label);
    }
  };

  let wiped = false;
  const wake = (): void => {
    for (const c of state.party) {
      cureAll(c.conditions);
      c.hp = Math.max(c.hp, 0);
      healCharacter(c, maxHp(c));
      restoreSp(c);
    }
    state.gold = 0;
    state.clock.minutes += 7 * 24 * 60;
    state.level = { id: 'gullhaven', x: 0, y: 0, z: 0, yawDeg: 0 };
    saveGame(state);
    const url = new URL(location.href);
    url.searchParams.set('level', 'gullhaven');
    url.searchParams.delete('entry');
    url.searchParams.set('continue', '');
    url.searchParams.set('wake', 'temple');
    travel(uiLayer, 'You wake in the temple of Gullhaven…', url.toString(), 1200);
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

  // A cast from the book (or a scroll): the effects the rules produced, made visible.
  performCast = (c: CastEvent): void => {
    const caster = state.party[c.caster];
    const name = caster?.name ?? 'Someone';
    const def = spellDef(c.spell);
    if (c.failed) {
      status.say(`${name}'s ${def.name} fizzles`);
      return;
    }
    playCast();
    // A spell at the world or a monster leaves the book: the hand is in the view.
    if (def.target === 'monster' || def.target === 'world') screens.close();
    const eye = camera.globalPosition.clone();
    const yaw = fly ? flyYaw : party.yaw;
    const pitch = fly ? flyPitch : party.pitch;
    const forward = new Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      -Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    const hand = eye.add(forward.scale(0.6)).add(new Vector3(0.12, -0.28, 0));
    const lines: string[] = [];
    for (const e of c.effects) {
      switch (e.kind) {
        case 'heal': {
          const m = state.party[e.member];
          if (m) lines.push(`${m.name} is healed ${healCharacter(m, e.amount)}`);
          break;
        }
        case 'cure': {
          const m = state.party[e.member];
          if (m && e.condition !== 'good' && cure(m.conditions, e.condition)) {
            lines.push(`${m.name} is cured of ${e.condition}`);
          }
          break;
        }
        case 'afflict': {
          const m = state.party[e.member];
          if (m && e.condition !== 'good') {
            afflict(
              m.conditions,
              e.condition,
              state.clock.minutes,
              e.minutes !== undefined ? { minutes: e.minutes } : {},
            );
            lines.push(`${m.name} is ${e.condition}`);
          }
          break;
        }
        case 'light':
          torch.brighten(e.power, e.minutes / MINUTES_PER_REAL_SECOND);
          lines.push('The torch burns white and far');
          break;
        case 'projectile': {
          // The bolt goes for the living monster nearest the middle of the view.
          const candidates = handle.monsters.map((m) => ({
            x: m.position.x,
            y: m.position.y + m.def.heightMetres * 0.55,
            z: m.position.z,
            alive: m.alive,
          }));
          const picked = pickTarget(candidates, eye, forward);
          const target = picked >= 0 ? handle.monsters[picked]! : null;
          const mark = target
            ? {
                position: target.position.add(new Vector3(0, target.def.heightMetres * 0.55, 0)),
                radius: 0.6,
              }
            : null;
          for (let i = 0; i < e.count; i++) {
            window.setTimeout(() => {
              spellfx.bolt({
                from: hand.add(new Vector3((i % 2) * 0.2 - 0.1, 0, 0)),
                dir: forward,
                element: e.element,
                mark,
                onEnd: (hit) => {
                  if (!hit || !target || !target.alive) {
                    status.say(`${name}'s ${def.name} flies wide`);
                    return;
                  }
                  const dmg = rollDice(e.damage, rng);
                  target.takeDamage(dmg);
                  feedback.monsterStruck(target, party.position, !target.alive);
                  status.say(`${name}'s ${def.name} hits ${target.def.name} for ${dmg}`);
                },
              });
            }, i * 110);
          }
          lines.push(
            target
              ? `${name} casts ${def.name} at ${target.def.name}`
              : `${name} casts ${def.name}`,
          );
          break;
        }
        case 'stun': {
          // The nearest living monster within arm's reach reels and is thrown back.
          const near = handle.monsters
            .filter((m) => m.alive && m.distanceTo(party.position) <= 4)
            .sort((a, b) => a.distanceTo(party.position) - b.distanceTo(party.position))[0];
          if (!near) {
            lines.push(`${def.name} finds nothing within reach`);
            break;
          }
          const dir = near.position.subtract(party.position);
          dir.y = 0;
          dir.normalize();
          near.knockback(dir, e.knockbackMetres);
          near.stun(e.seconds, simTime);
          spellfx.flash(
            def.school,
            near.position.add(new Vector3(0, near.def.heightMetres * 0.6, 0)),
          );
          lines.push(`${near.def.name} reels`);
          break;
        }
        case 'jump':
        case 'buff':
        case 'party-buff':
          // Lasting buffs and the leap wait on their systems (PLAN 5b step 14); the
          // points are spent, and the line says so plainly.
          lines.push(`${def.name} takes no hold yet`);
          break;
      }
    }
    status.say(lines.join('; ') || `${name} casts ${def.name}`, 5000);
  };

  let lastDeepToast = -10;
  scene.onBeforeRenderObservable.add(() => {
    // Hit stop (DESIGN.md 14.4): the world's step is zero for a few frames after a blow.
    // An open screen pauses the world; the hit stop also zeroes the step for a few frames.
    // A book opened from the HUD while a villager talks ends the talk first.
    if (screens.current() !== null && dialogue.isOpen()) dialogue.close();
    const talking_ = dialogue.isOpen();
    const paused = screens.current() !== null || talking_;
    const frameDt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const dt = paused ? 0 : feedback.update(frameDt);
    // A book stops the clips too; a talk lets the villager mouth their words.
    if (paused) stepper.timeScale = talking_ ? 1 : 0;
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
    if (!fly) portals.update(party.position);
    strip.panel.setParty(party.position.x, party.position.z, (party.yaw * 180) / Math.PI);
    saveTimer += dt;
    if (saveTimer > 60) {
      saveTimer = 0;
      save();
    }
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
        // The shadows follow the sun from morning to evening (DESIGN.md 17.4).
        app.materials.setSunBlend(sunBlend(minute));
        // Lanterns and the forge come up as the day goes, and the lanterns' halos with them.
        level.setLiveLights(true, 0.15 + 0.85 * (1 - light.daylight));
        halos.setStrength(1 - light.daylight);
        // And the houses' windows as the lamps inside are lit (DESIGN.md 17.6).
        app.materials.setWindowGlow(1 - light.daylight);
        strip.setClock(state.clock.minutes);
      }
    }
    for (const n of npcs) n.update(talking_ ? frameDt : dt, party.position);
    if (talking_) bust.aim();
    if (dt > 0 && !fly) {
      const p = party.position;
      const moved = Math.hypot(p.x - lastPartyPos.x, p.z - lastPartyPos.z);
      lastPartyPos = p.clone();
      soundscape.update(dt, p, moved < 2 ? moved : 0, daylightNow, party.waterDepth > 0.25);
      app.materials.setWeather({ gust: soundscape.gust() });
      chimneys.update(soundscape.gust(), daylightNow);
    }
    for (const m of handle.monsters) {
      m.update(dt, partyTarget, simTime);
      for (const ev of m.takeEvents()) {
        if (ev.kind === 'death') {
          // A kill pays its experience (DESIGN 14.3) and counts for any quest that wants it.
          shareExperience(state.party, m.def.xp);
          status.say(`${ev.text}; ${m.def.xp} experience`);
          const kill = { kind: 'kill', monster: m.def.id } as const;
          for (const change of handleQuestEvent(state.quests, QUESTS, kill)) {
            status.say(questNotice(change, QUESTS), 6000);
          }
          continue;
        }
        status.say(ev.text);
        if (ev.kind === 'miss') feedback.partyMissed();
      }
    }
    // MM6's wipe (ROADMAP M1b): when the last member falls the party wakes a week later in
    // Gullhaven's temple, whole again, its carried gold gone (the audit, 2026-10-23: a
    // fallen party walked on and rested next to the bandits).
    if (!wiped && !roster.alive) {
      wiped = true;
      status.say('The party has fallen', 6000);
      window.setTimeout(wake, 3500);
    }
    if (!fly && !paused) feedback.applyCamera(camera);
    strip.update(simTime);
    showPurse();
    const eye = camera.globalPosition;
    const yaw = fly ? flyYaw : party.yaw;
    underwater.set(isUnderwater(level.water, eye));
    water.update(eye, dt);
    waterfalls.update(dt, eye);
    torch.update(dt, eye, yaw);
    spellfx.update(dt);
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
    // The tuning stays on the phone without its button: only `?dev` shows the panel.
    { log: diagText, hidden: !QUERY.has('dev') },
  );
  diag(`dev level ready: ${LEVEL}`);
  veilProgress(1);
  hideVeil(600);

  handle.ready = true;
  return handle;
}
