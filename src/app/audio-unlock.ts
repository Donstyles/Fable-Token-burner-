/**
 * Mobile browsers only start audio after a user gesture. Create the context on the first
 * touch, click or key and resume it; everything audio-related obtains it from here.
 */
let context: AudioContext | null = null;
let unlocked = false;

export function getAudioContext(): AudioContext | null {
  return context;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function installAudioUnlock(target: EventTarget = window): void {
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const onGesture = (): void => {
    try {
      context ??= new AudioContext();
      void context.resume().then(() => {
        unlocked = context?.state === 'running';
      });
    } catch {
      // No WebAudio: the game runs silent.
    }
    for (const e of events) target.removeEventListener(e, onGesture);
  };
  for (const e of events) target.addEventListener(e, onGesture, { passive: true });
}
