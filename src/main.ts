import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { boot } from './app/boot';
import { installAudioUnlock } from './app/audio-unlock';
import { tryLockLandscape } from './app/orientation';

const canvas = document.getElementById('world') as HTMLCanvasElement | null;
const ui = document.getElementById('ui');
if (!canvas || !ui) throw new Error('index.html is missing #world or #ui');

installAudioUnlock();
tryLockLandscape();

// Service worker: offline shell and auto-update. Silent on failure (e.g. insecure context).
try {
  registerSW({ immediate: true });
} catch {
  // Not available in this context.
}

const app = boot(canvas, ui);

declare global {
  interface Window {
    /** Dev hook for tuning from the console and tests. */
    ftb?: ReturnType<typeof boot>;
  }
}
window.ftb = app;
