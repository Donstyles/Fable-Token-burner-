/**
 * The compiler's vertex light at runtime, without its occlusion (kernel/light/bake.ts): a
 * mesh the runtime builds in a compiled level (a door's leaf, a chest) is lit per vertex by
 * the level's own lights, so it looks part of the walls it stands among.
 */
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { LevelLight } from './level';

/** Light reaching every vertex regardless of lights, as the compiler bakes it. */
const AMBIENT = 0.1;

function lightAt(p: Vector3, n: Vector3, lights: LevelLight[]): [number, number, number] {
  const c: [number, number, number] = [AMBIENT, AMBIENT, AMBIENT];
  for (const l of lights) {
    const to = l.position.subtract(p);
    const d = to.length();
    if (d >= l.range || d < 1e-6) continue;
    const ndl = Math.max(0, Vector3.Dot(n, to.scale(1 / d)));
    const falloff = 1 - d / l.range;
    const att = falloff * falloff * l.intensity * ndl;
    c[0] += l.color.r * att;
    c[1] += l.color.g * att;
    c[2] += l.color.b * att;
  }
  return c;
}

/** Give the mesh a colour per vertex from the lights, in its present place. */
export function bakeVertexColors(mesh: Mesh, lights: LevelLight[]): void {
  mesh.computeWorldMatrix(true);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind) ?? [];
  const world = mesh.getWorldMatrix();
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const p = Vector3.TransformCoordinates(
      new Vector3(positions[i], positions[i + 1], positions[i + 2]),
      world,
    );
    const n = Vector3.TransformNormal(
      new Vector3(normals[i], normals[i + 1], normals[i + 2]),
      world,
    ).normalize();
    colors.push(...lightAt(p, n, lights), 1);
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors, false, 4);
}
