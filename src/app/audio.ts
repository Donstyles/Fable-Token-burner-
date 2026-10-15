/**
 * Sound is Babylon's audio engine (AudioV2): it owns the Web Audio context, resumes it on
 * the first interaction, places the listener on the camera and spatialises sounds. We add
 * only what Babylon does not cover: the iOS audio session type, pausing while the page is
 * hidden, and synthesised buffers until Phase 4 brings recordings.
 *
 * Rule (owner, 2026-10-15): before building a system, check whether Babylon or an
 * established library already provides it.
 */
import { CreateAudioEngineAsync } from '@babylonjs/core/AudioV2/webAudio/webAudioEngine';
import type { AudioEngineV2 } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';
import type { StaticSound } from '@babylonjs/core/AudioV2/abstractAudio/staticSound';
import type { Node } from '@babylonjs/core/node';
import { diag } from './diag';

/**
 * iOS: a "playback" session plays through the ring/silent switch but shows the media
 * widget; "ambient" is what games get (no widget, muted by the switch).
 */
export const AUDIO_SESSION_TYPES = ['playback', 'ambient'] as const;
export type AudioSessionType = (typeof AUDIO_SESSION_TYPES)[number];

// Ambient by default: the test sound played in both sessions on the owner's phone, and
// ambient shows no media widget and stops when minimised.
let sessionType: AudioSessionType = 'ambient';
let context: AudioContext | null = null;
let engine: AudioEngineV2 | null = null;
let enginePromise: Promise<AudioEngineV2 | null> | null = null;
let beep: StaticSound | null = null;

function applySessionType(type: string): void {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (!nav.audioSession) {
    diag(`audio session: no API (wanted ${type})`);
    return;
  }
  try {
    nav.audioSession.type = type;
    diag(`audio session: ${nav.audioSession.type}`);
  } catch (e) {
    diag(`audio session: ${type} refused (${String(e)})`);
  }
}

export function getAudioSessionType(): AudioSessionType {
  return sessionType;
}

export function setAudioSessionType(type: AudioSessionType): void {
  sessionType = type;
  applySessionType(type);
}

export function getAudioEngine(): AudioEngineV2 | null {
  return engine;
}

export function getAudioContext(): AudioContext | null {
  return context;
}

/** Two short square-wave beeps, loud and in the band every phone speaker carries. */
function beepBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(rate * 1.2), rate);
  const data = buffer.getChannelData(0);
  for (const [start, hz] of [
    [0, 440],
    [0.6, 660],
  ] as const) {
    const from = Math.floor(start * rate);
    const to = Math.floor((start + 0.5) * rate);
    for (let i = from; i < to; i++) {
      const t = (i - from) / rate;
      const env = Math.min(1, t / 0.02, (0.5 - t) / 0.08);
      data[i] = (Math.sin(2 * Math.PI * hz * t) > 0 ? 0.4 : -0.4) * Math.max(0, env);
    }
  }
  return buffer;
}

/**
 * Creates the context and Babylon's engine once, at boot. Babylon resumes the context on
 * the first touch; the page pauses it while hidden so nothing plays when minimised.
 */
export function installAudio(): Promise<AudioEngineV2 | null> {
  if (enginePromise) return enginePromise;
  applySessionType(sessionType);
  if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Fable Token Burner',
        artwork: [
          {
            src: `${import.meta.env.BASE_URL}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    } catch {
      // No media session: the widget shows whatever the system chooses.
    }
  }
  enginePromise = (async () => {
    try {
      context = new AudioContext();
      context.onstatechange = () => diag(`audio: ${context?.state ?? 'none'}`);
      engine = await CreateAudioEngineAsync({ audioContext: context, resumeOnInteraction: true });
      beep = await engine.createSoundAsync('test-beep', beepBuffer(context), { volume: 1 });
      diag(`audio engine: ready (${engine.state})`);
    } catch (e) {
      diag(`audio engine: unavailable (${String(e)})`);
      return null;
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (sessionType === 'playback') applySessionType('playback');
        void engine?.resumeAsync().catch(() => {});
      } else {
        void engine?.pauseAsync().catch(() => {});
        // A playback session would keep a Now Playing entry while minimised.
        if (sessionType === 'playback') applySessionType('ambient');
      }
    });
    window.addEventListener('pagehide', () => void engine?.pauseAsync().catch(() => {}));
    return engine;
  })();
  return enginePromise;
}

/** Puts the listener on a scene node, normally the camera. */
export function attachListener(node: Node): void {
  engine?.listener.attach(node);
}

/** The dev build's "test sound": straight through Babylon's main bus, logged either way. */
export function playTestSound(): void {
  if (!engine || !beep) {
    diag('tone: audio engine not ready');
    return;
  }
  void engine.resumeAsync().catch(() => {});
  beep.play();
  diag(`tone: played (engine ${engine.state}, session ${sessionType})`);
}
