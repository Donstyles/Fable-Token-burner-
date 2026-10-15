/**
 * Landscape handling. iOS cannot lock orientation from a web app, so when the device
 * reports portrait (held upright, or the user's portrait lock is on) the whole page is
 * rotated by CSS and the game runs landscape regardless (owner, 2026-10-15: no "turn your
 * phone" prompt). Android can lock in standalone or fullscreen mode; try it and ignore
 * failures. Pointer coordinates and sizes pass through the helpers below so the game
 * always works in its own landscape pixels.
 */
let forced = false;

export function tryLockLandscape(): void {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  if (!orientation?.lock) return;
  orientation.lock('landscape').catch(() => {
    // Not allowed outside fullscreen or on this platform; the forced rotation covers it.
  });
}

export function isPortrait(): boolean {
  return matchMedia('(orientation: portrait)').matches;
}

export function onOrientationChange(cb: (portrait: boolean) => void): () => void {
  const mql = matchMedia('(orientation: portrait)');
  const handler = (): void => cb(mql.matches);
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

/** True while the page is rotated to run landscape on a portrait viewport. */
export function isForcedLandscape(): boolean {
  return forced;
}

/**
 * Keeps the `forced-landscape` class on the root in step with the viewport. Install
 * before the engine boots so the first layout is already right; the resize listeners
 * registered later see the rotated layout.
 */
export function installForcedLandscape(): void {
  const apply = (): void => {
    forced = isPortrait();
    document.documentElement.classList.toggle('forced-landscape', forced);
  };
  apply();
  onOrientationChange(apply);
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
}

/**
 * A viewport point to the game's own pixels within `rect` (the canvas's bounding box).
 * Rotated, the game's x runs down the screen and its y runs from the right edge leftwards.
 */
export function toAppPoint(clientX: number, clientY: number, rect: DOMRect): [number, number] {
  if (!forced) return [clientX - rect.left, clientY - rect.top];
  return [clientY - rect.top, rect.right - clientX];
}

/** The game's own width and height for a canvas bounding box. */
export function appSize(rect: DOMRect): [number, number] {
  return forced ? [rect.height, rect.width] : [rect.width, rect.height];
}
