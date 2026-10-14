/**
 * On-device diagnostics: a small ring buffer of timestamped lines that the dev panel can
 * show and copy. Captures errors, WebGL context loss, size and visibility changes and
 * service-worker events, so problems on a phone can be reported without a debugger.
 */
const MAX = 200;
const lines: string[] = [];
const t0 = performance.now();

export function diag(message: string): void {
  const t = ((performance.now() - t0) / 1000).toFixed(2).padStart(7);
  lines.push(`${t}  ${message}`);
  if (lines.length > MAX) lines.shift();
}

export function diagLines(): readonly string[] {
  return lines;
}

export function diagText(): string {
  const env = `${navigator.userAgent}\nstandalone=${String(
    (navigator as Navigator & { standalone?: boolean }).standalone ??
      matchMedia('(display-mode: standalone)').matches,
  )} dpr=${devicePixelRatio} inner=${innerWidth}x${innerHeight}`;
  return `${env}\n${lines.join('\n')}`;
}

/** Hook global error sources once. */
export function installDiagnostics(canvas: HTMLCanvasElement): void {
  window.addEventListener('error', (e) => diag(`error: ${e.message} @${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) =>
    diag(`rejection: ${String((e as PromiseRejectionEvent).reason).slice(0, 200)}`),
  );
  canvas.addEventListener('webglcontextlost', () => diag('WEBGL CONTEXT LOST'));
  canvas.addEventListener('webglcontextrestored', () => diag('webgl context restored'));
  window.addEventListener('orientationchange', () =>
    diag(
      `orientationchange inner=${innerWidth}x${innerHeight} canvas=${canvas.clientWidth}x${canvas.clientHeight}`,
    ),
  );
  window.addEventListener('resize', () =>
    diag(
      `resize inner=${innerWidth}x${innerHeight} canvas=${canvas.clientWidth}x${canvas.clientHeight}`,
    ),
  );
  document.addEventListener('visibilitychange', () =>
    diag(`visibility=${document.visibilityState}`),
  );
  window.addEventListener('pageshow', (e) =>
    diag(`pageshow persisted=${String((e as PageTransitionEvent).persisted)}`),
  );
  window.addEventListener('pagehide', () => diag('pagehide'));
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    diag(
      `console.error: ${args
        .map((a) => String(a))
        .join(' ')
        .slice(0, 300)}`,
    );
    origError(...args);
  };
  diag(`boot ${location.pathname}${location.search}`);
}
