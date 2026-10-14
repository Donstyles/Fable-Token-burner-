export const APP_VERSION: string = __APP_VERSION__;

/** Tiny version tag in the bottom-right corner, in every build, so builds can be named. */
export function installVersionTag(parent: HTMLElement): void {
  const el = document.createElement('div');
  el.className = 'version-tag';
  el.id = 'version-tag';
  el.textContent = APP_VERSION;
  parent.appendChild(el);
}
