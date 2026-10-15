/**
 * Mobile browsers only start audio after a user gesture. The context is created on the
 * first touch, click or key and resumed; everything audio-related obtains it from here.
 *
 * iOS specifics: the audio session type decides how the system treats the page. An
 * "ambient" session is what games get (no Now Playing widget, mixes with music, stops in
 * the background), but on the owner's iPhone (iOS 18.7) it produced no sound at all with
 * the context running and the phone loud and unmuted, while a "playback" session did
 * (2026-10-15). So playback is the default: it shows the media widget, which carries the
 * game's name and icon, and while the page is hidden the session drops to ambient and the
 * context is suspended, so nothing plays or lingers when minimised. Every gesture and
 * every return to the foreground resumes the context (the system may interrupt it).
 */
import { diag } from './diag';

export const AUDIO_SESSION_TYPES = ['ambient', 'playback'] as const;
export type AudioSessionType = (typeof AUDIO_SESSION_TYPES)[number];

let context: AudioContext | null = null;
let sessionType: AudioSessionType = 'playback';

export function getAudioSessionType(): AudioSessionType {
  return sessionType;
}

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

/** Applies immediately where the browser supports the Audio Session API (iOS 17+). */
export function setAudioSessionType(type: AudioSessionType): void {
  sessionType = type;
  applySessionType(type);
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

/** Creates the context if needed and resumes it; call from a user gesture. */
function ensureContext(): AudioContext | null {
  try {
    if (!context) {
      context = new AudioContext();
      context.onstatechange = () => diag(`audio: ${context?.state ?? 'none'}`);
    }
    tryResume();
    return context;
  } catch {
    // No WebAudio: the game runs silent.
    return null;
  }
}

/**
 * A short 440 Hz beep straight to the output, bypassing every game mixer and panner: a
 * diagnostic for the phone's audio path (dev panel "test tone"). Logged either way.
 */
export function playTestTone(): void {
  const ctx = ensureContext();
  if (!ctx) {
    diag('tone: no WebAudio');
    return;
  }
  // Two beeps, loud and in the band every phone speaker carries.
  const t0 = ctx.currentTime;
  for (const [offset, hz] of [
    [0, 440],
    [0.6, 660],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = hz;
    const gain = ctx.createGain();
    const t = t0 + offset;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
    gain.gain.setValueAtTime(0.4, t + 0.4);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  }
  diag(`tone: played (context ${ctx.state}, rate ${ctx.sampleRate}, session ${sessionType})`);
}

export function installAudioUnlock(target: EventTarget = window): void {
  applySessionType(sessionType);
  // The playback session's Now Playing entry shows this instead of a bare page title.
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
  const onGesture = (): void => {
    ensureContext();
  };
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  for (const e of events) target.addEventListener(e, onGesture, { passive: true });
  const onHidden = (): void => {
    context?.suspend().catch(() => {
      // Nothing to do: the next resume attempt reports the state.
    });
    // A playback session would keep a Now Playing entry while minimised; drop to ambient
    // until the page is shown again.
    if (sessionType === 'playback') applySessionType('ambient');
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (sessionType === 'playback') applySessionType('playback');
      tryResume();
    } else {
      onHidden();
    }
  });
  window.addEventListener('pagehide', onHidden);
}
