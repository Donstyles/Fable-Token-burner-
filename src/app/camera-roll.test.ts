import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { describe, expect, it } from 'vitest';

/** The camera's right axis in the world, from its view matrix. */
function rightOf(camera: UniversalCamera): Vector3 {
  const m = camera.getViewMatrix(true);
  // The view matrix's first column is the camera's right axis in world space.
  return new Vector3(m.m[0]!, m.m[4]!, m.m[8]!);
}

describe('camera roll after a shake', () => {
  it('keeps the horizon level when the party turns after a shake that ended looking down', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new UniversalCamera('camera', new Vector3(0, 1.65, 0), scene);
    camera.updateUpVectorFromRotation = true;
    // Looking down at a bandit, a shake rolls the view, then ends.
    camera.rotation.set(-0.4, 0, 0.03);
    camera.getViewMatrix(true);
    camera.rotation.set(-0.4, 0, 0);
    camera.getViewMatrix(true);
    // The party turns a quarter and looks level: the right axis stays in the ground plane.
    camera.rotation.set(0, Math.PI / 2, 0);
    expect(Math.abs(rightOf(camera).y)).toBeLessThan(1e-6);
    camera.rotation.set(-0.3, 2.2, 0);
    expect(Math.abs(rightOf(camera).y)).toBeLessThan(1e-6);
    scene.dispose();
    engine.dispose();
  });
});
