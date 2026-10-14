/**
 * Landscape handling. iOS cannot lock orientation from a web app, so index.html shows a
 * "turn your phone" overlay via CSS in portrait. Android can lock in standalone or
 * fullscreen mode; try it and ignore failures.
 */
export function tryLockLandscape(): void {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  if (!orientation?.lock) return;
  orientation.lock('landscape').catch(() => {
    // Not allowed outside fullscreen or on this platform; the CSS overlay covers it.
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
