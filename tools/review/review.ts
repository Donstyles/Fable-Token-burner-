/**
 * One generated model from eight sides, for its review sheet (tools/lib/review.ts): two rows
 * of four, from the front round to the right a little above eye height, as the game draws it
 * (both faces, no culling). `?inside` draws the inside of every face in flat magenta, so a
 * place where the player would see into the model shows up. `?id=<asset id>` names the model
 * in assets/props; `?front` draws the front alone, square on and to scale, for reading off where
 * a door or a lamp is. The page sets `window.done` once the views are drawn.
 */
import '@babylonjs/loaders/glTF/2.0';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';

const query = new URLSearchParams(location.search);
const id = query.get('id') ?? '';
const canvas = document.getElementById('view') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.16, 0.18, 0.21, 1);
new HemisphericLight('sky', new Vector3(0, 1, 0), scene).intensity = 1.4;

const folder = query.get('dir') ?? 'props';
const container = await LoadAssetContainerAsync(`/assets/${folder}/${id}/${id}.glb`, scene);
container.addAllToScene();
const parts = container.meshes.filter(
  (m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0,
);
let min = new Vector3(Infinity, Infinity, Infinity);
let max = new Vector3(-Infinity, -Infinity, -Infinity);
for (const m of parts) {
  m.computeWorldMatrix(true);
  const box = m.getBoundingInfo().boundingBox;
  min = Vector3.Minimize(min, box.minimumWorld);
  max = Vector3.Maximize(max, box.maximumWorld);
}
if (query.has('inside')) {
  // The inside of each face: a twin drawn the other way round in flat magenta, both culled.
  const inside = new StandardMaterial('inside', scene);
  inside.emissiveColor = new Color3(1, 0, 1);
  inside.disableLighting = true;
  for (const m of parts) {
    if (m.material) m.material.backFaceCulling = true;
    const twin = m.clone(`${m.name}:inside`, m.parent);
    twin.makeGeometryUnique();
    twin.flipFaces(false);
    twin.material = inside;
  }
}
const centre = min.add(max).scale(0.5);
if (query.has('front')) {
  // Straight at the front, square on: one view filling the canvas, a metre a fixed number of
  // pixels, so a door or a lamp can be read off it (the page reports the scale).
  const cam = new ArcRotateCamera('front', Math.PI / 2, Math.PI / 2, 100, centre, scene);
  cam.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
  const ppm = Math.min(
    canvas.width / ((max.x - min.x) * 1.1),
    canvas.height / ((max.y - min.y) * 1.1),
  );
  cam.orthoLeft = -canvas.width / 2 / ppm;
  cam.orthoRight = canvas.width / 2 / ppm;
  cam.orthoTop = canvas.height / 2 / ppm;
  cam.orthoBottom = -canvas.height / 2 / ppm;
  scene.activeCameras = [cam];
  await scene.whenReadyAsync();
  for (let i = 0; i < 3; i++) scene.render();
  Object.assign(window, { done: true, ppm, centre: [centre.x, centre.y, centre.z], foot: min.y });
  throw new Error('front view drawn');
}
const radius = max.subtract(min).length() * 1.36;
// Babylon's alpha puts the camera at (cos α, ·, sin α): α = π/2 is the front, on +Z.
scene.activeCameras = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
  const cam = new ArcRotateCamera(
    `side${k}`,
    Math.PI / 2 + (k * Math.PI) / 4,
    Math.PI / 2.15,
    radius,
    centre,
    scene,
  );
  cam.fov = 0.5;
  cam.viewport = new Viewport((k % 4) / 4, k < 4 ? 0.5 : 0, 1 / 4, 0.5);
  return cam;
});
await scene.whenReadyAsync();
for (let i = 0; i < 3; i++) scene.render();
(window as unknown as { done: boolean }).done = true;
