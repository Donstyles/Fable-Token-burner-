/**
 * Procedural ambience through Web Audio. A waterfall is filtered brown noise with a slow
 * swell, placed in 3D with inverse-distance attenuation. No audio files: the sound is
 * synthesised, so it is neither a placeholder nor a licence question.
 */
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getAudioContext } from '../app/audio-unlock';

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
  private panner: PannerNode | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private hiss: AudioBufferSourceNode | null = null;
  private enabled = true;
  private master = 1;

  /**
   * The sheet is a line source from `lip` to `plunge`: each frame the emitter sits at the
   * point of the sheet nearest the listener, so the fall is loud from the bridge beside
   * it, at the lip and at the pool alike (a point source at the pool was silent 23 m up
   * on the bridge, 2026-10-15). `volume` is this fall's own loudness; `setVolume` scales
   * every fall alike.
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
    if (this.gain) this.gain.gain.value = this.enabled ? this.volume * this.master : 0;
  }

  /** Call every frame; the graph is built once the audio context exists (after a gesture). */
  update(listener: Vector3, listenerYaw: number): void {
    if (!this.ctx) {
      const ctx = getAudioContext();
      if (!ctx) return;
      this.build(ctx);
    }
    const ctx = this.ctx!;
    const l = ctx.listener;
    const at = this.nearestPoint(listener);
    const p = this.panner!;
    if (p.positionX) {
      // Glide so the emitter does not click as the nearest point jumps.
      const t = ctx.currentTime;
      p.positionX.setTargetAtTime(-at.x, t, 0.08);
      p.positionY.setTargetAtTime(at.y, t, 0.08);
      p.positionZ.setTargetAtTime(at.z, t, 0.08);
    } else {
      p.setPosition(-at.x, at.y, at.z);
    }
    // Web Audio is right-handed; Babylon is left-handed. Mirror X on the way in.
    const fx = -Math.sin(listenerYaw);
    const fz = Math.cos(listenerYaw);
    if (l.positionX) {
      l.positionX.value = -listener.x;
      l.positionY.value = listener.y;
      l.positionZ.value = listener.z;
      l.forwardX.value = fx;
      l.forwardY.value = 0;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(-listener.x, listener.y, listener.z);
      l.setOrientation(fx, 0, fz, 0, 1, 0);
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
    const gain = ctx.createGain();
    gain.gain.value = this.enabled ? this.volume * this.master : 0;
    const panner = ctx.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    // Full loudness within 4 m, a quarter at 10 m, a tenth at 30 m: clear at the fall,
    // a murmur from the hall. Phone speakers lose anything much below a tenth.
    panner.refDistance = 4;
    panner.maxDistance = 90;
    panner.rolloffFactor = 1.6;
    if (panner.positionX) {
      panner.positionX.value = -this.lip.x;
      panner.positionY.value = this.lip.y;
      panner.positionZ.value = this.lip.z;
    } else {
      panner.setPosition(-this.lip.x, this.lip.y, this.lip.z);
    }
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
    source.connect(low);
    low.connect(high);
    high.connect(gain);
    hiss.connect(band);
    band.connect(hissGain);
    hissGain.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    source.start();
    hiss.start();
    this.source = source;
    this.hiss = hiss;
    this.gain = gain;
    this.panner = panner;
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
    this.gain?.disconnect();
    this.panner?.disconnect();
    this.ctx = null;
  }
}
