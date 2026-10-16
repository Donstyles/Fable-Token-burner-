/**
 * Textures per material role (kernel/elements/roles.ts). Stone, wood, iron and rock come
 * from CC0 sources through `npm run textures` (assets/textures/manifest.json has the
 * credits). The lamp pane and, until Phase 3, the water surface are generated.
 */
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { Scene } from '@babylonjs/core/scene';
import { ROLE } from '../../kernel/elements/roles';
import { applyRetroSampling } from '../render/materials';
import manifest from '../../assets/textures/manifest.json';
import ashlarUrl from '../../assets/textures/ashlar.png';
import flagstoneUrl from '../../assets/textures/flagstone.png';
import plankUrl from '../../assets/textures/plank.png';
import ironUrl from '../../assets/textures/iron.png';
import plasterUrl from '../../assets/textures/plaster.png';
import rockUrl from '../../assets/textures/rock.png';
import marbleUrl from '../../assets/textures/marble.png';
import trimUrl from '../../assets/textures/trim.png';
import grassUrl from '../../assets/textures/grass.png';
import pathUrl from '../../assets/textures/path.png';
import screeUrl from '../../assets/textures/scree.png';
import snowUrl from '../../assets/textures/snow.png';
import barkUrl from '../../assets/textures/bark.png';
import leavesUrl from '../../assets/textures/leaves.png';

export interface RoleTexture {
  texture: BaseTexture;
  /** World metres per texture repeat. */
  metresPerTile: number;
  emissive?: Color3;
  tint?: Color3;
}

export type RoleTextures = Map<number, RoleTexture>;

const FILES: Record<string, string> = {
  ashlar: ashlarUrl,
  flagstone: flagstoneUrl,
  plank: plankUrl,
  iron: ironUrl,
  plaster: plasterUrl,
  rock: rockUrl,
  marble: marbleUrl,
  trim: trimUrl,
  grass: grassUrl,
  path: pathUrl,
  scree: screeUrl,
  snow: snowUrl,
  bark: barkUrl,
  leaves: leavesUrl,
};

function lampPane(scene: Scene): DynamicTexture {
  const size = 32;
  const tex = new DynamicTexture('lamp-pane', { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, '#fff2cc');
  g.addColorStop(0.6, '#ffb060');
  g.addColorStop(1, '#8a4a18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(40,20,10,0.9)';
  ctx.fillRect(size / 2 - 1, 0, 2, size);
  ctx.fillRect(0, size / 2 - 1, size, 2);
  tex.update(false);
  return tex;
}

function stillWater(scene: Scene): DynamicTexture {
  const size = 64;
  const tex = new DynamicTexture('still-water', { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = '#16303a';
  ctx.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 140; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const w = 2 + rnd() * 10;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(90,140,150,0.35)' : 'rgba(10,25,35,0.5)';
    ctx.fillRect(x, y, w, 1);
  }
  tex.update(false);
  return tex;
}

/** Load every role texture; `mipmaps` selects the sampling mode of the retro look. */
export function loadRoleTextures(scene: Scene, mipmaps = true): RoleTextures {
  const out: RoleTextures = new Map();
  const credits = manifest as Record<string, { metresPerTile: number }>;
  for (const [role, url] of Object.entries(FILES)) {
    const id = ROLE[role as keyof typeof ROLE];
    const texture = new Texture(url, scene, !mipmaps, true);
    texture.onLoadObservable.addOnce(() => applyRetroSampling(texture, mipmaps));
    out.set(id, { texture, metresPerTile: credits[role]?.metresPerTile ?? 2 });
  }
  out.set(ROLE.glass, {
    texture: lampPane(scene),
    metresPerTile: 0.3,
    emissive: new Color3(1.1, 0.74, 0.38),
  });
  // Still water until Phase 3: a dark surface with a faint cold sheen of its own.
  out.set(ROLE.water, {
    texture: stillWater(scene),
    metresPerTile: 3,
    tint: new Color3(0.8, 0.95, 1),
    emissive: new Color3(0.06, 0.11, 0.13),
  });
  return out;
}

export function setRoleMipmaps(textures: RoleTextures, on: boolean): void {
  for (const { texture } of textures.values()) {
    if (texture instanceof Texture && texture.isReady()) applyRetroSampling(texture, on);
  }
}
