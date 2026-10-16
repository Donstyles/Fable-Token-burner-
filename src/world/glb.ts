/**
 * Minimal GLB reader for the level files the compile step writes (kernel/export/glb.ts).
 * It covers exactly that subset: float attributes, 16/32-bit indices, named nodes with
 * one mesh each, named materials. Levels are our own output, so no general glTF loader
 * (and its root-node handedness flip) is needed.
 */
export interface GlbPrimitive {
  positions: Float32Array;
  normals: Float32Array | null;
  uvs: Float32Array | null;
  /** Vertex colours with `colorSize` components each. */
  colors: Float32Array | null;
  colorSize: number;
  indices: Uint32Array;
  material: string | null;
}

export interface GlbNode {
  name: string;
  primitives: GlbPrimitive[];
  children: GlbNode[];
}

interface Accessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  /** Integer attributes map to [0, 1] or [-1, 1] (KHR_mesh_quantization). */
  normalized?: boolean;
  count: number;
  type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4';
}

interface BufferView {
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}

interface Gltf {
  accessors: Accessor[];
  bufferViews: BufferView[];
  meshes: {
    primitives: { attributes: Record<string, number>; indices?: number; material?: number }[];
  }[];
  materials?: { name?: string }[];
  nodes: {
    name?: string;
    mesh?: number;
    children?: number[];
    /** Dequantization transform written by the exporter's quantize step. */
    translation?: number[];
    scale?: number[];
  }[];
  scenes: { nodes: number[] }[];
  scene?: number;
}

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as const;

export function parseGlb(buffer: ArrayBuffer): GlbNode[] {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB file');
  let offset = 12;
  let json: Gltf | null = null;
  let bin: ArrayBuffer | null = null;
  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const chunk = buffer.slice(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk)) as Gltf;
    else if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error('GLB is missing its JSON or BIN chunk');
  const gltf = json;
  const data = bin;

  // Floats, or quantized integers (KHR_mesh_quantization) mapped back to floats.
  const readFloats = (index: number): Float32Array => {
    const acc = gltf.accessors[index]!;
    const bv = gltf.bufferViews[acc.bufferView]!;
    const n = COMPONENTS[acc.type];
    const out = new Float32Array(acc.count * n);
    const size =
      acc.componentType === 5126
        ? 4
        : acc.componentType === 5122 || acc.componentType === 5123
          ? 2
          : 1;
    const stride = bv.byteStride ?? n * size;
    const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const dv = new DataView(data);
    const read = (at: number): number => {
      switch (acc.componentType) {
        case 5126:
          return dv.getFloat32(at, true);
        case 5120:
          return acc.normalized ? Math.max(-1, dv.getInt8(at) / 127) : dv.getInt8(at);
        case 5121:
          return acc.normalized ? dv.getUint8(at) / 255 : dv.getUint8(at);
        case 5122:
          return acc.normalized
            ? Math.max(-1, dv.getInt16(at, true) / 32767)
            : dv.getInt16(at, true);
        case 5123:
          return acc.normalized ? dv.getUint16(at, true) / 65535 : dv.getUint16(at, true);
        default:
          throw new Error(`unsupported accessor component type ${acc.componentType}`);
      }
    };
    for (let i = 0; i < acc.count; i++) {
      for (let c = 0; c < n; c++) out[i * n + c] = read(base + i * stride + c * size);
    }
    return out;
  };
  const readIndices = (index: number): Uint32Array => {
    const acc = gltf.accessors[index]!;
    const bv = gltf.bufferViews[acc.bufferView]!;
    const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    const dv = new DataView(data);
    const out = new Uint32Array(acc.count);
    const size = acc.componentType === 5125 ? 4 : acc.componentType === 5123 ? 2 : 1;
    const stride = bv.byteStride ?? size;
    for (let i = 0; i < acc.count; i++) {
      const at = base + i * stride;
      out[i] =
        size === 4 ? dv.getUint32(at, true) : size === 2 ? dv.getUint16(at, true) : dv.getUint8(at);
    }
    return out;
  };

  const buildNode = (index: number): GlbNode => {
    const node = gltf.nodes[index]!;
    const primitives: GlbPrimitive[] = [];
    if (node.mesh !== undefined) {
      for (const p of gltf.meshes[node.mesh]!.primitives) {
        const colorAcc = p.attributes['COLOR_0'];
        const positions = readFloats(p.attributes['POSITION']!);
        // The node's own transform, which quantization uses to dequantize positions.
        if (node.scale || node.translation) {
          const sx = node.scale?.[0] ?? 1;
          const sy = node.scale?.[1] ?? 1;
          const sz = node.scale?.[2] ?? 1;
          const tx = node.translation?.[0] ?? 0;
          const ty = node.translation?.[1] ?? 0;
          const tz = node.translation?.[2] ?? 0;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] = positions[i]! * sx + tx;
            positions[i + 1] = positions[i + 1]! * sy + ty;
            positions[i + 2] = positions[i + 2]! * sz + tz;
          }
        }
        primitives.push({
          positions,
          normals: p.attributes['NORMAL'] !== undefined ? readFloats(p.attributes['NORMAL']) : null,
          uvs:
            p.attributes['TEXCOORD_0'] !== undefined
              ? readFloats(p.attributes['TEXCOORD_0'])
              : null,
          colors: colorAcc !== undefined ? readFloats(colorAcc) : null,
          colorSize: colorAcc !== undefined ? COMPONENTS[gltf.accessors[colorAcc]!.type] : 0,
          indices: p.indices !== undefined ? readIndices(p.indices) : new Uint32Array(0),
          material: p.material !== undefined ? (gltf.materials?.[p.material]?.name ?? null) : null,
        });
      }
    }
    return {
      name: node.name ?? '',
      primitives,
      children: (node.children ?? []).map(buildNode),
    };
  };
  const scene = gltf.scenes[gltf.scene ?? 0]!;
  return scene.nodes.map(buildNode);
}
