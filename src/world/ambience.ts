/**
 * Procedural ambience through Web Audio. A waterfall is filtered brown noise with a slow
 * swell, placed in 3D with inverse-distance attenuation. No audio files: the sound is
 * synthesised, so it is neither a placeholder nor a licence question.
 */
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getAudioContext } from '../app/audio-unlock';
import { diag } from '../app/diag';

/** Full loudness within this many metres of the sheet, then inverse falloff. */
const FALL_REF = 4;
const FALL_ROLLOFF = 1.3;

function brownNoise(ctx: AudioContext, seconds = 4): AudioBuffer {
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

let sharedNoise: AudioBuffer | null = null;

/** Flat noise for the spray hiss; phone speakers carry this where the rumble is lost. */
function whiteNoise(ctx: AudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  return buffer;
}
let sharedHiss: AudioBuffer | null = null;

export class WaterfallSound {
  private ctx: AudioContext | null = null;
  /** Mix of rumble and hiss at the fall's own loudness. */
  private mix: GainNode | null = null;
  /** Distance attenuation, computed per frame. */
  private distance: GainNode | null = null;
  private pan: StereoPannerNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private hiss: AudioBufferSourceNode | null = null;
  private enabled = true;
  private master = 1;
  private reportedAudible = false;

  /**
   * The sheet is a line source from `lip` to `plunge`: each frame the emitter sits at the
   * point of the sheet nearest the listener, so the fall is loud from the bridge beside
   * it, at the lip and at the pool alike. Distance and stereo placement are computed here
   * and applied to plain gain and stereo-pan nodes: the 3D panner and listener produced
   * silence on the owner's iPhone while a plain oscillator played (2026-10-15). `volume`
   * is this fall's own loudness; `setVolume` scales every fall alike.
   */
  constructor(
    private readonly lip: Vector3,
    private readonly plunge: Vector3,
    private readonly volume: number,
  ) {}

  private nearestPoint(listener: Vector3): Vector3 {
    const d = this.plunge.subtract(this.lip);
    const len2 = d.lengthSquared();
    const t =
      len2 < 1e-6
        ? 0
        : Math.min(1, Math.max(0, Vector3.Dot(listener.subtract(this.lip), d) / len2));
    return this.lip.add(d.scale(t));
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGain();
  }

  setVolume(master: number): void {
    this.master = master;
    this.applyGain();
  }

  private applyGain(): void {
    if (this.mix) this.mix.gain.value = this.enabled ? this.volume * this.master : 0;
  }

  /** Call every frame; the graph is built once the audio context is running. */
  update(listener: Vector3, listenerYaw: number): void {
    if (!this.ctx) {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      this.build(ctx);
    }
    const ctx = this.ctx!;
    const at = this.nearestPoint(listener);
    const dx = at.x - listener.x;
    const dy = at.y - listener.y;
    const dz = at.z - listener.z;
    const d = Math.hypot(dx, dy, dz);
    // Inverse distance: full within REF metres, then REF / (REF + ROLLOFF * (d - REF)).
    const att = FALL_REF / (FALL_REF + FALL_ROLLOFF * Math.max(d - FALL_REF, 0));
    // Stereo from the bearing: Babylon is left-handed, right = (cos yaw, 0, -sin yaw).
    const rx = Math.cos(listenerYaw);
    const rz = -Math.sin(listenerYaw);
    const pan = d > 0.01 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.7 : 0;
    const t = ctx.currentTime;
    this.distance!.gain.setTargetAtTime(att, t, 0.08);
    this.pan?.pan.setTargetAtTime(pan, t, 0.08);
    if (!this.reportedAudible && this.enabled && att * this.volume * this.master > 0.05) {
      this.reportedAudible = true;
      diag(
        `fall sound: audible, ${d.toFixed(1)} m from the sheet, gain ${(att * this.volume * this.master).toFixed(2)}`,
      );
    }
  }

  private build(ctx: AudioContext): void {
    this.ctx = ctx;
    sharedNoise ??= brownNoise(ctx);
    const source = ctx.createBufferSource();
    source.buffer = sharedNoise;
    source.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1600;
    low.Q.value = 0.6;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 70;
    // Steady: a fall is a continuous stream, so no swell (owner, 2026-10-15).
    const mix = ctx.createGain();
    mix.gain.value = this.enabled ? this.volume * this.master : 0;
    // Spray hiss on top of the rumble: a band around 3 kHz that small speakers reproduce.
    sharedHiss ??= whiteNoise(ctx);
    const hiss = ctx.createBufferSource();
    hiss.buffer = sharedHiss;
    hiss.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 3000;
    band.Q.value = 0.5;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.35;
    // Make-up gain for the phone speaker, with a gentle limiter so the lip does not clip.
    const boost = ctx.createGain();
    boost.gain.value = 1.6;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.1;
    const distance = ctx.createGain();
    distance.gain.value = 0;
    const pan = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    source.connect(low);
    low.connect(high);
    high.connect(mix);
    hiss.connect(band);
    band.connect(hissGain);
    hissGain.connect(mix);
    mix.connect(boost);
    boost.connect(limiter);
    limiter.connect(distance);
    if (pan) {
      distance.connect(pan);
      pan.connect(ctx.destination);
    } else {
      distance.connect(ctx.destination);
    }
    source.start();
    hiss.start();
    this.source = source;
    this.hiss = hiss;
    this.mix = mix;
    this.distance = distance;
    this.pan = pan;
    diag(`fall sound: built (context ${ctx.state}, stereo ${pan ? 'yes' : 'no'})`);
  }

  dispose(): void {
    try {
      this.source?.stop();
      this.hiss?.stop();
    } catch {
      // already stopped
    }
    this.source?.disconnect();
    this.hiss?.disconnect();
    this.mix?.disconnect();
    this.distance?.disconnect();
    this.pan?.disconnect();
    this.ctx = null;
  }
}
