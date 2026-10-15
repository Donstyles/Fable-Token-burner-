import { registerSW } from 'virtual:pwa-register';
import { diag } from './diag';

/**
 * Service worker registration without automatic reloads mid-play: when a new version is
 * ready a small bar offers to reload. Installed web apps only check at launch, so also
 * check when the app returns to the foreground and hourly. The development build applies
 * an update found within the first seconds after launch by itself (the owner tested v59
 * for an hour after v62 was live without seeing the bar, 2026-10-15). `?nosw` disables
 * the worker for debugging.
 */
const AUTO_APPLY_WINDOW_MS = 20_000;

export function installServiceWorker(uiLayer: HTMLElement): void {
  if (new URLSearchParams(location.search).has('nosw')) {
    diag('sw disabled by ?nosw');
    navigator.serviceWorker
      ?.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => diag('sw unregistered'))
      .catch(() => {});
    return;
  }
  try {
    const update = registerSW({
      immediate: true,
      onRegisteredSW(url, registration) {
        diag(`sw registered ${url}`);
        if (!registration) return;
        const check = (): void => {
          registration.update().catch((e: unknown) => diag(`sw update failed: ${String(e)}`));
        };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        setInterval(check, 60 * 60 * 1000);
      },
      onNeedRefresh() {
        diag('sw update ready');
        const atLaunch = performance.now() < AUTO_APPLY_WINDOW_MS;
        if (import.meta.env.MODE === 'devbuild' && atLaunch) {
          diag('reloading for update (dev build, at launch)');
          void update(true);
          return;
        }
        showBar(uiLayer, () => {
          diag('reloading for update');
          void update(true);
        });
      },
      onOfflineReady() {
        diag('sw offline ready');
      },
      onRegisterError(e) {
        diag(`sw register error: ${String(e)}`);
      },
    });
    navigator.serviceWorker?.addEventListener('controllerchange', () =>
      diag('sw controllerchange'),
    );
  } catch (e) {
    diag(`sw unavailable: ${String(e)}`);
  }
}

function showBar(parent: HTMLElement, onReload: () => void): void {
  if (parent.querySelector('.update-bar')) return;
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'update-bar';
  bar.textContent = 'Update ready. Tap to reload.';
  bar.addEventListener('click', onReload);
  parent.appendChild(bar);
}
