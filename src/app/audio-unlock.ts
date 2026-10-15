/**
 * Mobile browsers only start audio after a user gesture. The context is created on the
 * first touch, click or key and resumed; everything audio-related obtains it from here.
 *
 * iOS specifics: the audio session type decides how the system treats the page. An
 * "ambient" session is what games get: no Now Playing widget, mixes with music, stops in
 * the background, and is muted by the ring/silent switch like any iOS game. A "playback"
 * session plays through the silent switch but shows the media widget and keeps playing
 * when minimised (owner, 2026-10-15: not wanted). The context is also suspended whenever
 * the page is hidden and resumed when it is shown again or on the next gesture (the
 * system may interrupt it, so every gesture resumes, not only the first).
 */
import { diag } from './diag';

export const AUDIO_SESSION_TYPES = ['ambient', 'playback'] as const;
export type AudioSessionType = (typeof AUDIO_SESSION_TYPES)[number];

let context: AudioContext | null = null;
let sessionType: AudioSessionType = 'ambient';

export function getAudioSessionType(): AudioSessionType {
  return sessionType;
}

/** Applies immediately where the browser supports the Audio Session API (iOS 17+). */
export function setAudioSessionType(type: AudioSessionType): void {
  sessionType = type;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (!nav.audioSession) return;
  try {
    nav.audioSession.type = type;
  } catch {
    // Older or stricter engines: keep the default session.
  }
}

export function getAudioContext(): AudioContext | null {
  return context;
}

export function isAudioUnlocked(): boolean {
  return context?.state === 'running';
}

function tryResume(): void {
  if (!context || context.state === 'running') return;
  context.resume().catch(() => {
    // Not allowed outside a gesture; the next gesture tries again.
  });
}

export function installAudioUnlock(target: EventTarget = window): void {
  setAudioSessionType(sessionType);
  const onGesture = (): void => {
    try {
      if (!context) {
        context = new AudioContext();
        context.onstatechange = () => diag(`audio: ${context?.state ?? 'none'}`);
      }
      tryResume();
    } catch {
      // No WebAudio: the game runs silent.
    }
  };
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  for (const e of events) target.addEventListener(e, onGesture, { passive: true });
  const onHidden = (): void => {
    context?.suspend().catch(() => {
      // Nothing to do: the next resume attempt reports the state.
    });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryResume();
    else onHidden();
  });
  window.addEventListener('pagehide', onHidden);
}
