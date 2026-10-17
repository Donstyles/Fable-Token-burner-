import { playTestSound } from './audio';

/** A "test sound" button on the main screen of development builds, beside "log". */
export function installSoundButton(parent: HTMLElement): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-button';
  btn.dataset['native'] = '';
  btn.textContent = 'test sound';
  btn.addEventListener('click', () => {
    playTestSound();
    btn.textContent = 'test sound (played)';
    setTimeout(() => (btn.textContent = 'test sound'), 1500);
  });
  parent.appendChild(btn);
}
