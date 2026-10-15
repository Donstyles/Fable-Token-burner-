/**
 * Waterfall sound: a synthesised loop (rumble and spray hiss, Phase 4 brings recordings)
 * played as a Babylon spatial sound. The sheet is a line source: each frame the sound
 * sits at the point of the sheet nearest the listener, so the fall is loud from the
 * bridge beside it, at the lip and at the pool alike.
 */
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { StaticSound } from '@babylonjs/core/AudioV2/abstractAudio/staticSound';
import { getAudioContext, installAudio } from '../app/audio';
import { diag } from '../app/diag';

/** Full loudness within this many metres of the sheet, then inverse falloff. */
const FALL_REF = 4;
const FALL_ROLLOFF = 1.3;
const LOOP_SECONDS = 12;
/** The loop's tail is blended into its head over this long, so the seam is inaudible. */
const SEAM_SECONDS = 0.75;

function brownNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, rate * seconds, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    let seed = 1234 + ch * 77;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff - 0.5;
    };
    for (let i = 0; i < data.length; i++) {
      const white = rnd() * 2;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    // Cross-fade the loop point so the seam is silent.
    const fade = Math.floor(rate * 0.25);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      const a = data[i] ?? 0;
      const b = data[data.length - fade + i] ?? 0;
      data[i] = a * t + b * (1 - t);
    }
  }
  return buffer;
}

function whiteNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 99;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff - 0.5) * 1.0;
  }
  return buffer;
}

/** Renders the rumble (low-passed brown noise) and spray hiss (3 kHz band) into one loop. */
async function renderWaterfallLoop(rate: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, rate * LOOP_SECONDS, rate);
  const rumble = off.createBufferSource();
  rumble.buffer = brownNoise(off, LOOP_SECONDS);
  const low = off.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 1600;
  low.Q.value = 0.6;
  const high = off.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 70;
  const rumbleGain = off.createGain();
  rumbleGain.gain.value = 1.6;
  const hiss = off.createBufferSource();
  hiss.buffer = whiteNoise(off, LOOP_SECONDS);
  const band = off.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3000;
  band.Q.value = 0.5;
  const hissGain = off.createGain();
  hissGain.gain.value = 0.5;
  const limiter = off.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 4;
  rumble.connect(low);
  low.connect(high);
  high.connect(rumbleGain);
  rumbleGain.connect(limiter);
  hiss.connect(band);
  band.connect(hissGain);
  hissGain.connect(limiter);
  limiter.connect(off.destination);
  rumble.start();
  hiss.start();
  return seamless(await off.startRendering(), off);
}

/**
 * Equal-power cross-fade of the loop's tail into its head (the filters and limiter in the
 * render undo any seam prepared in the noise itself), then the tail is dropped.
 */
function seamless(buffer: AudioBuffer, ctx: BaseAudioContext): AudioBuffer {
  const fade = Math.floor(buffer.sampleRate * SEAM_SECONDS);
  const length = buffer.length - fade;
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src.subarray(0, length));
    for (let i = 0; i < fade; i++) {
      const t = (i / fade) * (Math.PI / 2);
      dst[i] = (src[length + i] ?? 0) * Math.cos(t) + (src[i] ?? 0) * Math.sin(t);
    }
  }
  return out;
}

let sharedLoop: Promise<AudioBuffer> | null = null;

export class WaterfallSound {
  private sound: StaticSound | null = null;
  private enabled = true;
  private master = 1;
  private readonly at = new Vector3();
  private reportedNear = false;

  /** `volume` is this fall's own loudness; `setVolume` scales every fall alike. */
  constructor(
    private readonly lip: Vector3,
    private readonly plunge: Vector3,
    private readonly volume: number,
  ) {
    this.at.copyFrom(lip);
    void this.init();
  }

  private async init(): Promise<void> {
    const engine = await installAudio();
    const ctx = getAudioContext();
    if (!engine || !ctx) return;
    sharedLoop ??= renderWaterfallLoop(ctx.sampleRate);
    const buffer = await sharedLoop;
    const sound = await engine.createSoundAsync('waterfall', buffer, {
      loop: true,
      volume: this.gain(),
      spatialEnabled: true,
      spatialAutoUpdate: true,
      spatialPanningModel: 'equalpower',
      spatialDistanceModel: 'inverse',
      spatialMinDistance: FALL_REF,
      spatialMaxDistance: 90,
      spatialRolloffFactor: FALL_ROLLOFF,
      spatialPosition: this.at.clone(),
    });
    sound.play();
    this.sound = sound;
    diag(`fall sound: playing (engine ${engine.state}, loop ${LOOP_SECONDS} s)`);
  }

  private gain(): number {
    return this.enabled ? this.volume * this.master : 0;
  }

  private applyGain(): void {
    if (this.sound) this.sound.volume = this.gain();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGain();
  }

  setVolume(master: number): void {
    this.master = master;
    this.applyGain();
  }

  private nearestPoint(listener: Vector3): Vector3 {
    const d = this.plunge.subtract(this.lip);
    const len2 = d.lengthSquared();
    const t =
      len2 < 1e-6
        ? 0
        : Math.min(1, Math.max(0, Vector3.Dot(listener.subtract(this.lip), d) / len2));
    return this.lip.add(d.scale(t));
  }

  /** Call every frame with the listener position. */
  update(listener: Vector3): void {
    if (!this.sound) return;
    this.at.copyFrom(this.nearestPoint(listener));
    this.sound.spatial.position = this.at;
    if (!this.reportedNear && this.enabled && Vector3.Distance(this.at, listener) < 12) {
      this.reportedNear = true;
      diag(`fall sound: within 12 m, volume ${this.gain().toFixed(2)}`);
    }
  }

  dispose(): void {
    this.sound?.dispose();
    this.sound = null;
  }
}
