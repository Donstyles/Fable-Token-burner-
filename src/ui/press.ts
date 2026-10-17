/**
 * The feel of a press (DESIGN.md 16.8): every button in the shell clicks on the finger's
 * touch, as MM6's did, not on the release; the CSS gives the travel, the bevel turning over
 * as the button goes down. One listener on the UI layer serves them all.
 */
import { playClick } from '../app/audio';

export function installPressFeel(uiLayer: HTMLElement): void {
  uiLayer.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as Element | null;
      const b = target?.closest('button');
      if (b && !(b as HTMLButtonElement).disabled) playClick();
    },
    { capture: true, passive: true },
  );
}
