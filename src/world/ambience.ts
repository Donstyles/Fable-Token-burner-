/**
 * Procedural ambience through Web Audio. A waterfall is filtered brown noise with a slow
 * swell, placed in 3D with inverse-distance attenuation. No audio files: the sound is
 * synthesised, so it is neither a placeholder nor a licence question.
 */
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
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

export class WaterfallSound {
  private ctx: AudioContext | null = null;
  private panner: PannerNode | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private enabled = true;

  constructor(
    private readonly position: Vector3,
    private readonly volume: number,
  ) {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.gain) this.gain.gain.value = on ? this.volume : 0;
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
    low.frequency.value = 1100;
    low.Q.value = 0.6;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 70;
    const gain = ctx.createGain();
    gain.gain.value = this.enabled ? this.volume : 0;
    // A slow swell so the roar breathes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const depth = ctx.createGain();
    depth.gain.value = this.volume * 0.18;
    lfo.connect(depth);
    depth.connect(gain.gain);
    const panner = ctx.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 5;
    panner.maxDistance = 90;
    panner.rolloffFactor = 1.1;
    if (panner.positionX) {
      panner.positionX.value = -this.position.x;
      panner.positionY.value = this.position.y;
      panner.positionZ.value = this.position.z;
    } else {
      panner.setPosition(-this.position.x, this.position.y, this.position.z);
    }
    source.connect(low);
    low.connect(high);
    high.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    source.start();
    lfo.start();
    this.source = source;
    this.lfo = lfo;
    this.gain = gain;
    this.panner = panner;
  }

  dispose(): void {
    try {
      this.source?.stop();
      this.lfo?.stop();
    } catch {
      // already stopped
    }
    this.source?.disconnect();
    this.lfo?.disconnect();
    this.gain?.disconnect();
    this.panner?.disconnect();
    this.ctx = null;
  }
}
