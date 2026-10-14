import './style.css';
import { boot, type App } from './app/boot';
import { installAudioUnlock } from './app/audio-unlock';
import { tryLockLandscape } from './app/orientation';
import { installDiagnostics, diag, diagText } from './app/diag';
import { installServiceWorker } from './app/update-prompt';
import { installLogButton } from './app/log-button';
import { APP_VERSION, installVersionTag } from './app/version';
import type { DevHandle } from './dev/index';

// Tell the boot watchdog in index.html that the module is running.
(window as unknown as { __ftbBooted?: boolean }).__ftbBooted = true;

const canvas = document.getElementById('world') as HTMLCanvasElement | null;
const ui = document.getElementById('ui');
if (!canvas || !ui) throw new Error('index.html is missing #world or #ui');

installDiagnostics(canvas);
diag(`version ${APP_VERSION}`);
installVersionTag(ui);
// iOS: no pinch-zoom gestures, no long-press menus, anywhere on the page.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener(
  'touchmove',
  (e) => {
    // Multi-touch outside the canvas (the UI layer) would otherwise pinch-zoom the page.
    if (e.touches.length > 1 && !(e.target instanceof HTMLCanvasElement)) e.preventDefault();
  },
  { passive: false },
);
if (
  import.meta.env.DEV ||
  import.meta.env.MODE === 'devbuild' ||
  new URLSearchParams(location.search).has('dev')
) {
  installLogButton(ui);
}
installAudioUnlock();
tryLockLandscape();
installServiceWorker(ui);

const app = boot(canvas, ui);
// `?lite`: cheap rendering for automated tests on software GL (no bloom, 720 lines).
if (new URLSearchParams(location.search).has('lite')) {
  app.setGrade({ bloom: false, vignette: 0 });
  app.setRenderPreset('lines-720');
}

declare global {
  interface Window {
    /** Dev hook for tuning from the console and tests. */
    ftb?: App & { dev?: DevHandle; diag(): string };
  }
}
window.ftb = Object.assign(app, { diag: diagText });
diag('engine ready');

// Development builds (`vite` dev server or `vite build --mode devbuild`) load the dev arena.
// In production the condition is constant-false and the import is removed from the bundle.
if (import.meta.env.DEV || import.meta.env.MODE === 'devbuild') {
  void import('./dev/index').then(({ startDev }) =>
    startDev(app).then((dev) => {
      if (window.ftb) window.ftb.dev = dev;
    }),
  );
}
