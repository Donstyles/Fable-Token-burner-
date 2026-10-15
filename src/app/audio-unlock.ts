/**
 * Mobile browsers only start audio after a user gesture. The context is created on the
 * first touch, click or key and resumed; everything audio-related obtains it from here.
 *
 * iOS specifics: Web Audio obeys the ring/silent switch unless the page asks for a
 * playback session, and the context is suspended ("interrupted") when the app goes to
 * the background, so every later gesture resumes it again rather than only the first.
 */
import { diag } from './diag';

let context: AudioContext | null = null;

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
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) {
    try {
      // iOS 17+: play through the silent switch, like a game or a video.
      nav.audioSession.type = 'playback';
    } catch {
      // Older or stricter engines: keep the default session.
    }
  }
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
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryResume();
  });
}
