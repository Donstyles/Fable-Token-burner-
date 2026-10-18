import { Bone } from '@babylonjs/core/Bones/bone';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';
import { headOf } from './bust';

describe('the talking head', () => {
  it("reads the head where this frame's pose puts it, not where the last frame left it", () => {
    const scene = new Scene(new NullEngine());
    const hipsNode = new TransformNode('Hips', scene);
    hipsNode.rotationQuaternion = Quaternion.Identity();
    const headNode = new TransformNode('Head', scene);
    headNode.parent = hipsNode;
    headNode.position.set(0, 1, 0);
    const skeleton = new Skeleton('rig', 'rig', scene);
    new Bone('Hips', skeleton).linkTransformNode(hipsNode);
    new Bone('Head', skeleton, skeleton.bones[0]).linkTransformNode(headNode);
    const body = new Mesh('body', scene);
    body.skeleton = skeleton;
    // Read once in this render, as the last frame's draw did.
    expect(headNode.getAbsolutePosition().y).toBeCloseTo(1);
    // The clip steps within the same render: the hips turn a quarter about the view axis.
    hipsNode.rotationQuaternion = Quaternion.RotationAxis(Vector3.Forward(), Math.PI / 2);
    // Babylon's own read still has the old pose (the render count has not moved on) ...
    expect(headNode.getAbsolutePosition().y).toBeCloseTo(1);
    // ... the bust's has the new one.
    const head = headOf([body])!;
    expect(head.x).toBeCloseTo(-1);
    expect(head.y).toBeCloseTo(0);
  });
});
