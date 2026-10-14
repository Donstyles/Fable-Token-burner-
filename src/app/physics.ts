import HavokPhysics from '@babylonjs/havok';
import havokWasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import type { Scene } from '@babylonjs/core/scene';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

let pluginPromise: Promise<HavokPlugin> | null = null;

/** Initialise Havok once and enable physics on the scene. Safe to call repeatedly. */
export function enableHavok(scene: Scene, gravity: Vector3): Promise<HavokPlugin> {
  pluginPromise ??= HavokPhysics({ locateFile: () => havokWasmUrl }).then((hk) => {
    const plugin = new HavokPlugin(true, hk);
    scene.enablePhysics(gravity, plugin);
    return plugin;
  });
  return pluginPromise;
}
