/**
 * The loading veil (wow audit, 2026-10-17): a black cloth over the view with the place's name
 * in the heading face and a thin gold rule that fills as the level, its paths and its people
 * load, so the owner never sees a bare black page. Portal travel lowers the same veil.
 */
let veil: HTMLElement | null = null;
let rule: HTMLElement | null = null;

export function showVeil(parent: HTMLElement, title: string, subtitle = ''): void {
  hideVeil(0);
  veil = document.createElement('div');
  veil.className = 'veil';
  const name = document.createElement('div');
  name.className = 'veil-title';
  name.textContent = title;
  const sub = document.createElement('div');
  sub.className = 'veil-sub';
  sub.textContent = subtitle;
  const track = document.createElement('div');
  track.className = 'veil-track';
  rule = document.createElement('div');
  rule.className = 'veil-rule';
  track.appendChild(rule);
  veil.append(name, sub, track);
  parent.appendChild(veil);
}

/** 0 to 1. */
export function veilProgress(t: number): void {
  if (rule) rule.style.width = `${Math.round(Math.max(0, Math.min(1, t)) * 100)}%`;
}

export function hideVeil(fadeMs = 500): void {
  const v = veil;
  veil = null;
  rule = null;
  if (!v) return;
  if (fadeMs <= 0) {
    v.remove();
    return;
  }
  v.style.transition = `opacity ${fadeMs}ms ease-out`;
  v.style.opacity = '0';
  window.setTimeout(() => v.remove(), fadeMs + 50);
}

/** Lower the veil over the view (portal travel): resolves once it is opaque. */
export function lowerVeil(parent: HTMLElement, title: string, fadeMs = 600): Promise<void> {
  showVeil(parent, title);
  const v = veil!;
  v.style.opacity = '0';
  v.style.transition = `opacity ${fadeMs}ms ease-in`;
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      v.style.opacity = '1';
    });
    window.setTimeout(resolve, fadeMs + 80);
  });
}
