/**
 * Spells you can see (DESIGN.md 16.9). A bolt is a glowing core with a light of its school's
 * colour travelling with it and a trail of its element behind, flying straight from the
 * caster's hand to its mark; it bursts where it lands. Babylon's particle systems and point
 * lights through the retro materials, nothing bespoke: the bolt is posterised and dithered by
 * the same filter as the world, as MM6's sprites were.
 */
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import type { Scene } from '@babylonjs/core/scene';
import type { MagicSchool } from '../game/skills';
import type { PointLightDesc, RetroMaterials } from '../render/materials';
import { softSprite } from './particles';

export interface BoltMark {
  /** The point aimed at, in scene space. */
  position: Vector3;
  /** Hit when the bolt comes within this of the mark. */
  radius: number;
}

export interface BoltOptions {
  from: Vector3;
  /** Unit direction when there is no mark; ignored otherwise. */
  dir: Vector3;
  element: MagicSchool;
  mark: BoltMark | null;
  /** Metres per second. */
  speed?: number;
  /** Metres before an unmarked bolt dies out. */
  range?: number;
  /** Called once: true at the mark, false when the bolt died in the air. */
  onEnd(hit: boolean, at: Vector3): void;
}

interface Palette {
  core: Color3;
  light: Color3;
  trail1: Color4;
  trail2: Color4;
}

const PALETTES: Record<MagicSchool, Palette> = {
  fire: {
    core: new Color3(1, 0.85, 0.5),
    light: new Color3(1, 0.5, 0.15),
    trail1: new Color4(1, 0.55, 0.15, 0.9),
    trail2: new Color4(1, 0.25, 0.05, 0.6),
  },
  air: {
    core: new Color3(1, 1, 0.8),
    light: new Color3(0.8, 0.85, 1),
    trail1: new Color4(1, 1, 0.6, 0.9),
    trail2: new Color4(0.7, 0.8, 1, 0.5),
  },
  water: {
    core: new Color3(0.7, 0.9, 1),
    light: new Color3(0.3, 0.6, 1),
    trail1: new Color4(0.5, 0.8, 1, 0.8),
    trail2: new Color4(0.2, 0.4, 0.9, 0.5),
  },
  earth: {
    core: new Color3(0.9, 0.8, 0.5),
    light: new Color3(0.6, 0.5, 0.2),
    trail1: new Color4(0.7, 0.55, 0.3, 0.8),
    trail2: new Color4(0.4, 0.3, 0.15, 0.5),
  },
  spirit: {
    core: new Color3(0.85, 0.95, 1),
    light: new Color3(0.5, 0.8, 1),
    trail1: new Color4(0.7, 0.9, 1, 0.8),
    trail2: new Color4(0.4, 0.6, 1, 0.4),
  },
  mind: {
    core: new Color3(0.95, 0.8, 1),
    light: new Color3(0.7, 0.4, 1),
    trail1: new Color4(0.85, 0.6, 1, 0.8),
    trail2: new Color4(0.5, 0.2, 0.9, 0.4),
  },
  body: {
    core: new Color3(1, 0.9, 0.7),
    light: new Color3(1, 0.8, 0.4),
    trail1: new Color4(1, 0.9, 0.5, 0.8),
    trail2: new Color4(0.9, 0.6, 0.2, 0.4),
  },
};

const DEFAULT_SPEED = 22;
const DEFAULT_RANGE = 45;

interface Bolt {
  mesh: Mesh;
  light: PointLightDesc;
  trail: ParticleSystem;
  velocity: Vector3;
  travelled: number;
  range: number;
  mark: BoltMark | null;
  onEnd: (hit: boolean, at: Vector3) => void;
}

export class SpellEffects {
  private readonly bolts: Bolt[] = [];
  private readonly bursts = new Map<MagicSchool, ParticleSystem>();
  private readonly coreMaterials = new Map<MagicSchool, StandardMaterial>();

  constructor(
    private readonly scene: Scene,
    private readonly materials: RetroMaterials,
  ) {}

  /** Bolts in the air, for tests. */
  get flying(): number {
    return this.bolts.length;
  }

  private core(element: MagicSchool): StandardMaterial {
    let m = this.coreMaterials.get(element);
    if (!m) {
      m = new StandardMaterial(`bolt-${element}`, this.scene);
      m.emissiveColor = PALETTES[element].core;
      m.disableLighting = true;
      this.coreMaterials.set(element, m);
    }
    return m;
  }

  private trail(element: MagicSchool): ParticleSystem {
    const p = PALETTES[element];
    const ps = new ParticleSystem('bolt-trail', 120, this.scene);
    ps.particleTexture = softSprite(this.scene);
    ps.emitter = Vector3.Zero();
    ps.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
    ps.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
    ps.direction1 = new Vector3(-0.3, 0.2, -0.3);
    ps.direction2 = new Vector3(0.3, 0.6, 0.3);
    ps.minEmitPower = 0.2;
    ps.maxEmitPower = 0.6;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.45;
    ps.minSize = 0.18;
    ps.maxSize = 0.4;
    ps.color1 = p.trail1;
    ps.color2 = p.trail2;
    ps.colorDead = new Color4(p.trail2.r * 0.4, p.trail2.g * 0.4, p.trail2.b * 0.4, 0);
    ps.emitRate = 110;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.updateSpeed = 0.016;
    return ps;
  }

  private burst(element: MagicSchool): ParticleSystem {
    let ps = this.bursts.get(element);
    if (ps) return ps;
    const p = PALETTES[element];
    ps = new ParticleSystem('bolt-burst', 160, this.scene);
    ps.particleTexture = softSprite(this.scene);
    ps.emitter = Vector3.Zero();
    ps.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
    ps.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
    ps.direction1 = new Vector3(-1, -0.3, -1);
    ps.direction2 = new Vector3(1, 1.4, 1);
    ps.minEmitPower = 2;
    ps.maxEmitPower = 5;
    ps.gravity = new Vector3(0, -6, 0);
    ps.minLifeTime = 0.25;
    ps.maxLifeTime = 0.6;
    ps.minSize = 0.12;
    ps.maxSize = 0.35;
    ps.color1 = p.trail1;
    ps.color2 = p.trail2;
    ps.colorDead = new Color4(p.trail2.r * 0.3, p.trail2.g * 0.3, p.trail2.b * 0.3, 0);
    ps.emitRate = 0;
    ps.manualEmitCount = 0;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.updateSpeed = 0.016;
    ps.start();
    this.bursts.set(element, ps);
    return ps;
  }

  /** Loose a bolt. */
  bolt(o: BoltOptions): void {
    const mesh = CreateSphere('bolt', { diameter: 0.26, segments: 6 }, this.scene);
    mesh.material = this.core(o.element);
    mesh.isPickable = false;
    mesh.position.copyFrom(o.from);
    const dir = o.mark ? o.mark.position.subtract(o.from).normalize() : o.dir.clone().normalize();
    const speed = o.speed ?? DEFAULT_SPEED;
    const light = this.materials.addLight({
      position: o.from.clone(),
      color: PALETTES[o.element].light,
      range: 7,
      intensity: 1.3,
    });
    const trail = this.trail(o.element);
    trail.emitter = mesh;
    trail.start();
    this.bolts.push({
      mesh,
      light,
      trail,
      velocity: dir.scale(speed),
      travelled: 0,
      range: o.range ?? DEFAULT_RANGE,
      mark: o.mark,
      onEnd: o.onEnd,
    });
  }

  /** Burst at a point, for the end of a bolt or a touch spell. */
  flash(element: MagicSchool, at: Vector3, count = 60): void {
    const ps = this.burst(element);
    (ps.emitter as Vector3).copyFrom(at);
    ps.manualEmitCount = count;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      const step = b.velocity.scale(dt);
      b.mesh.position.addInPlace(step);
      b.travelled += step.length();
      b.light.position.copyFrom(b.mesh.position);
      let hit = false;
      let done = false;
      if (b.mark) {
        const to = b.mark.position.subtract(b.mesh.position);
        // At the mark, or past it (a long frame can step straight through).
        if (to.length() <= b.mark.radius || Vector3.Dot(to, b.velocity) < 0) {
          hit = true;
          done = true;
          b.mesh.position.copyFrom(b.mark.position);
        }
      }
      if (b.travelled >= b.range) done = true;
      if (!done) continue;
      const at = b.mesh.position.clone();
      this.retire(b);
      this.bolts.splice(i, 1);
      const element = (b.mesh.material?.name.replace('bolt-', '') ?? 'fire') as MagicSchool;
      this.flash(element, at, hit ? 80 : 25);
      b.onEnd(hit, at);
    }
  }

  private retire(b: Bolt): void {
    this.materials.removeLight(b.light);
    b.trail.stop();
    const trail = b.trail;
    // Let the last of the trail fade before the system goes.
    window.setTimeout(() => trail.dispose(), 600);
    b.mesh.dispose();
  }

  dispose(): void {
    for (const b of this.bolts) this.retire(b);
    this.bolts.length = 0;
    for (const ps of this.bursts.values()) ps.dispose();
    for (const m of this.coreMaterials.values()) m.dispose();
  }
}
