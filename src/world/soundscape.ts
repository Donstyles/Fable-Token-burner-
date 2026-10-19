/**
 * The soundscape (DESIGN.md 16.4): synthesised like the impacts and the falls, through
 * Babylon's audio engine, no recordings. Wind that gusts and rises with altitude; birds in
 * the trees by day; the party's footsteps on grass, gravel, sand, snow, stone or water,
 * read from the ground under its feet.
 */
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { StaticSound } from '@babylonjs/core/AudioV2/abstractAudio/staticSound';
import type { AudioEngineV2 } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';
import { getAudioContext, installAudio } from '../app/audio';
import { seamless } from './ambience';

export type Surface = 'grass' | 'gravel' | 'sand' | 'snow' | 'stone' | 'water';

const STRIDE_METRES = 0.78;
const WIND_SECONDS = 16;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 0xffffffff;
  };
}

/** Brown noise through a sweeping lowpass with gusting gain, rendered once and looped. */
async function renderWind(rate: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, rate * WIND_SECONDS, rate);
  const src = off.createBufferSource();
  const buffer = off.createBuffer(2, rate * WIND_SECONDS, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const r = rng(77 + ch);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
      data[i] = last * 3;
    }
  }
  src.buffer = buffer;
  const low = off.createBiquadFilter();
  low.type = 'lowpass';
  low.Q.value = 0.9;
  const gain = off.createGain();
  // Gusts: the cut-off and the gain rise and fall together over the loop.
  const curve = new Float32Array([300, 420, 900, 620, 380, 760, 1000, 520, 340, 300]);
  const gains = new Float32Array([0.45, 0.55, 1.0, 0.75, 0.5, 0.85, 1.0, 0.65, 0.5, 0.45]);
  low.frequency.setValueCurveAtTime(curve, 0, WIND_SECONDS);
  gain.gain.setValueCurveAtTime(gains, 0, WIND_SECONDS);
  src.connect(low).connect(gain).connect(off.destination);
  src.start();
  return seamless(await off.startRendering(), off);
}

/** Three short rising chirps: a small bird up a slope. */
async function renderChirp(rate: number, seed: number): Promise<AudioBuffer> {
  const seconds = 0.6;
  const off = new OfflineAudioContext(1, rate * seconds, rate);
  const r = rng(seed);
  const base = 2600 + r() * 900;
  for (let n = 0; n < 3; n++) {
    const t0 = n * (0.12 + r() * 0.08);
    const osc = off.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * (0.9 + r() * 0.1), t0);
    osc.frequency.exponentialRampToValueAtTime(base * (1.25 + r() * 0.15), t0 + 0.06);
    const g = off.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.35, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
    osc.connect(g).connect(off.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }
  return off.startRendering();
}

/** One footfall on a surface. */
async function renderStep(rate: number, surface: Surface, seed: number): Promise<AudioBuffer> {
  const seconds = surface === 'snow' ? 0.22 : 0.16;
  const off = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
  const r = rng(seed);
  const noise = off.createBuffer(1, Math.ceil(rate * seconds), rate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  const src = off.createBufferSource();
  src.buffer = noise;
  const filter = off.createBiquadFilter();
  const gain = off.createGain();
  const env = (peak: number, attack: number, decay: number): void => {
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(peak, attack);
    gain.gain.exponentialRampToValueAtTime(0.001, attack + decay);
  };
  switch (surface) {
    case 'grass':
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      env(0.5, 0.008, 0.09);
      break;
    case 'gravel':
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.7;
      env(0.6, 0.004, 0.11);
      break;
    case 'sand':
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      env(0.45, 0.012, 0.1);
      break;
    case 'snow':
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.5;
      env(0.55, 0.01, 0.18);
      break;
    case 'stone':
      filter.type = 'highpass';
      filter.frequency.value = 900;
      env(0.5, 0.002, 0.07);
      break;
    case 'water':
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.4;
      env(0.5, 0.015, 0.14);
      break;
  }
  src.connect(filter).connect(gain).connect(off.destination);
  src.start();
  return off.startRendering();
}

/** The terrain's splat weights under a face: path, scree, snow; grass is the remainder. */
function surfaceOf(mesh: AbstractMesh, faceId: number, wading: boolean): Surface {
  if (wading) return 'water';
  if (!mesh.name.startsWith('t:')) return mesh.name.startsWith('props:') ? 'stone' : 'stone';
  const colors = mesh.getVerticesData(VertexBuffer.ColorKind);
  const indices = mesh.getIndices();
  if (!colors || !indices) return 'grass';
  let path = 0;
  let scree = 0;
  let snow = 0;
  for (let k = 0; k < 3; k++) {
    const v = indices[faceId * 3 + k];
    if (v === undefined) continue;
    path += colors[v * 4] ?? 0;
    scree += colors[v * 4 + 1] ?? 0;
    snow += colors[v * 4 + 2] ?? 0;
  }
  const grass = Math.max(0, 3 - path - scree - snow);
  const best = Math.max(grass, path, scree, snow);
  if (best === snow) return 'snow';
  if (best === scree || best === path) return 'gravel';
  return 'grass';
}

export interface SoundscapeOptions {
  outdoor: boolean;
  /** Outdoors a region has birds; underground there is no wind. */
  region: string;
}

export class Soundscape {
  private engine: AudioEngineV2 | null = null;
  private wind: StaticSound | null = null;
  private chirps: StaticSound[] = [];
  private steps = new Map<Surface, StaticSound[]>();
  private stepIndex = 0;
  private walked = 0;
  private nextBird = 4;
  private readonly roll = rng(9);
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly opts: SoundscapeOptions,
  ) {
    void this.init();
  }

  private async init(): Promise<void> {
    const engine = await installAudio();
    const ctx = getAudioContext();
    if (!engine || !ctx || this.disposed) return;
    this.engine = engine;
    const rate = ctx.sampleRate;
    const surfaces: Surface[] = this.opts.outdoor
      ? ['grass', 'gravel', 'sand', 'snow', 'water', 'stone']
      : ['stone', 'water'];
    for (const surface of surfaces) {
      const pair: StaticSound[] = [];
      for (let i = 0; i < 2; i++) {
        pair.push(
          await engine.createSoundAsync(
            `step-${surface}-${i}`,
            await renderStep(rate, surface, 31 + i * 7),
            { volume: 0.55 },
          ),
        );
      }
      this.steps.set(surface, pair);
    }
    if (this.opts.outdoor) {
      this.wind = await engine.createSoundAsync('wind', await renderWind(rate), {
        loop: true,
        volume: 0,
      });
      this.wind.play();
      if (this.opts.region === 'region') {
        for (let i = 0; i < 3; i++) {
          this.chirps.push(
            await engine.createSoundAsync(`bird-${i}`, await renderChirp(rate, 101 + i * 13), {
              volume: 0.28,
              spatialEnabled: true,
              spatialAutoUpdate: true,
              spatialPanningModel: 'equalpower',
              spatialDistanceModel: 'inverse',
              spatialMinDistance: 8,
              spatialMaxDistance: 120,
              spatialRolloffFactor: 1,
            }),
          );
        }
      }
    }
  }

  /**
   * `moved` is the party's horizontal travel this frame; `daylight` 0..1; `wading` when the
   * feet are in water. The wind rises with the party's height above the floor.
   */
  update(dt: number, party: Vector3, moved: number, daylight: number, wading: boolean): void {
    if (!this.engine) return;
    if (this.wind) {
      const altitude = Math.max(0, Math.min(1, (party.y - 10) / 250));
      const target = 0.1 + altitude * 0.3;
      this.wind.volume += (target - this.wind.volume) * Math.min(1, dt * 0.5);
    }
    this.walked += moved;
    if (this.walked >= STRIDE_METRES) {
      this.walked = 0;
      const ray = new Ray(party.add(new Vector3(0, 0.5, 0)), Vector3.Down(), 4);
      const hit = this.scene.pickWithRay(ray, (m) => m.isPickable && m.isEnabled());
      const surface =
        hit?.pickedMesh && hit.faceId >= 0
          ? surfaceOf(hit.pickedMesh, hit.faceId, wading)
          : wading
            ? 'water'
            : 'grass';
      const pair = this.steps.get(surface) ?? this.steps.get('stone');
      const sound = pair?.[this.stepIndex % 2];
      this.stepIndex += 1;
      if (sound) {
        sound.playbackRate = 0.92 + this.roll() * 0.16;
        sound.play();
      }
    }
    if (this.chirps.length && daylight > 0.45) {
      this.nextBird -= dt;
      if (this.nextBird <= 0) {
        this.nextBird = 4 + this.roll() * 9;
        const chirp = this.chirps[Math.floor(this.roll() * this.chirps.length)]!;
        const a = this.roll() * Math.PI * 2;
        const d = 22 + this.roll() * 20;
        chirp.spatial.position = new Vector3(
          party.x + Math.cos(a) * d,
          party.y + 6 + this.roll() * 8,
          party.z + Math.sin(a) * d,
        );
        chirp.play();
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.wind?.dispose();
    for (const c of this.chirps) c.dispose();
    for (const pair of this.steps.values()) for (const s of pair) s.dispose();
  }
}
