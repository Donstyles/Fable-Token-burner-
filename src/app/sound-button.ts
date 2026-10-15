import { playTestTone } from './audio-unlock';

/** A "test sound" button on the main screen of development builds, beside "log". */
export function installSoundButton(parent: HTMLElement): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-button';
  btn.textContent = 'test sound';
  btn.addEventListener('click', () => {
    playTestTone();
    btn.textContent = 'test sound (played)';
    setTimeout(() => (btn.textContent = 'test sound'), 1500);
  });
  parent.appendChild(btn);
}
