import type { InputZones } from './zones';

/**
 * Feed DOM pointer and keyboard events into an InputZones instance.
 * Pointer events cover touch, mouse and pen; the keyboard fallback is for desktop development.
 */
export function bindInput(canvas: HTMLCanvasElement, zones: InputZones): () => void {
  const rect = (): DOMRect => canvas.getBoundingClientRect();
  const local = (e: PointerEvent): [number, number] => {
    const r = rect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  // Use the monotonic clock rather than event.timeStamp: synthetic and injected events do
  // not always share the page's time origin, and tap detection depends on the difference.
  const now = (): number => performance.now();

  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    zones.pointerDown(e.pointerId, x, y, now());
  };
  const onMove = (e: PointerEvent): void => {
    const [x, y] = local(e);
    zones.pointerMove(e.pointerId, x, y, now());
  };
  const onUp = (e: PointerEvent): void => {
    const [x, y] = local(e);
    zones.pointerUp(e.pointerId, x, y, now());
  };
  const onCancel = (e: PointerEvent): void => zones.pointerCancel(e.pointerId);
  const onResize = (): void => {
    const r = rect();
    zones.resize(r.width, r.height);
  };

  const keys = new Set<string>();
  const applyKeys = (): void => {
    const fwd = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    const back = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    const left = keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0;
    const right = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0;
    const strafeL = keys.has('KeyQ') ? 1 : 0;
    const strafeR = keys.has('KeyE') ? 1 : 0;
    zones.setKeyboard(fwd - back, right - left, strafeR - strafeL);
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    keys.add(e.code);
    applyKeys();
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    keys.delete(e.code);
    applyKeys();
  };
  const onBlur = (): void => {
    keys.clear();
    applyKeys();
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  onResize();

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
