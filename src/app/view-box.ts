/**
 * The view's box on the screen (DESIGN.md 16.34). MM6's frame covers the screen but for the
 * view at its top left, between the side pillar and the middle one, over the band; the canvas
 * still covers the whole screen (the sky shows past the minimap's arch, and the talking head
 * is composed into the panel). So the camera's centre of projection moves to the box's middle
 * (a lens shift: the horizon and the aim stand at the view's middle, as MM6's did), and the
 * touch zones split at the box's middle rather than the screen's.
 */
import type { Camera } from '@babylonjs/core/Cameras/camera';

export interface ViewBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The shift of the centre of projection, in normalised device units (x right, y up), that
 * brings the middle of a `width` by `height` canvas to the middle of `box`.
 */
export function lensShift(box: ViewBox, width: number, height: number): { x: number; y: number } {
  if (!(width > 0 && height > 0)) return { x: 0, y: 0 };
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  return { x: (2 * cx) / width - 1, y: 1 - (2 * cy) / height };
}

/**
 * Shift `camera`'s projection to the middle of the box `box()` gives, in the canvas's own CSS
 * pixels, `size()` the canvas's: every time Babylon makes the projection anew, and when the
 * box moves (call the returned `refresh`). Off-centre terms only, so the field of view, the
 * depth and picking stay as they were; picking reads the same matrix.
 */
export function installLensShift(
  camera: Camera,
  box: () => ViewBox | null,
  size: () => { width: number; height: number },
): { refresh(): void; dispose(): void } {
  let shift = { x: 0, y: 0 };
  const measure = (): void => {
    const b = box();
    const s = size();
    shift = b ? lensShift(b, s.width, s.height) : { x: 0, y: 0 };
  };
  const observer = camera.onProjectionMatrixChangedObservable.add(() => {
    // Babylon made the matrix afresh: the off-centre terms of the z row (row-vector clip
    // coordinates, w = z), so x and y move by the shift times w.
    const p = camera.getProjectionMatrix();
    const m = p.m;
    p.setRowFromFloats(2, m[8]! + shift.x, m[9]! + shift.y, m[10]!, m[11]!);
  });
  measure();
  camera.getProjectionMatrix(true);
  return {
    refresh() {
      measure();
      camera.getProjectionMatrix(true);
    },
    dispose() {
      camera.onProjectionMatrixChangedObservable.remove(observer);
    },
  };
}
