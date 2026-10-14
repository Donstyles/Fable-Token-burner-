import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { boot, type App } from './app/boot';
import { installAudioUnlock } from './app/audio-unlock';
import { tryLockLandscape } from './app/orientation';
import type { DevHandle } from './dev/index';

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
    ftb?: App & { dev?: DevHandle };
  }
}
window.ftb = app;

// Development builds (`vite` dev server or `vite build --mode devbuild`) load the dev arena.
// In production the condition is constant-false and the import is removed from the bundle.
if (import.meta.env.DEV || import.meta.env.MODE === 'devbuild') {
  void import('./dev/index').then(({ startDev }) =>
    startDev(app).then((dev) => {
      if (window.ftb) window.ftb.dev = dev;
    }),
  );
}
