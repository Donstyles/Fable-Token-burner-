import { diagText } from './diag';

/**
 * A tiny always-available "log" button for development builds, created before anything
 * that could fail, so the on-device log can be read even when startup breaks.
 */
export function installLogButton(parent: HTMLElement): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'log-button';
  btn.textContent = 'log';
  const box = document.createElement('textarea');
  box.className = 'log-box';
  box.readOnly = true;
  box.hidden = true;
  btn.addEventListener('click', async () => {
    const text = diagText();
    box.value = text;
    box.hidden = !box.hidden;
    if (!box.hidden) {
      box.focus();
      box.select();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'log (copied)';
      } catch {
        btn.textContent = 'log (select + copy)';
      }
    }
  });
  parent.append(btn, box);
  // Surface failures without any tap: open the box on the first error.
  const open = (): void => {
    if (box.hidden) {
      box.value = diagText();
      box.hidden = false;
    } else {
      box.value = diagText();
    }
  };
  window.addEventListener('error', open);
  window.addEventListener('unhandledrejection', open);
}
