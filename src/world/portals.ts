/**
 * Portals between levels (DESIGN.md 15.3): a trigger disc the party walks into. A portal
 * arms once the party has stood clear of it (so arriving through it does not bounce the
 * party straight back) and fires when the party steps within its radius. The transition
 * itself is a fade to black and a fresh load of the page on the target level, with
 * `entry` naming the portal to arrive at: MM6 showed a loading screen between maps too.
 */
import { lowerVeil } from '../app/veil';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface Portal {
  name: string;
  position: Vector3;
  radius: number;
  target: { level: string; entry: string };
  arrive: { position: Vector3; yawDeg: number };
}

export class PortalWatcher {
  private readonly armed = new Map<string, boolean>();
  private fired = false;

  constructor(
    readonly portals: readonly Portal[],
    private readonly onEnter: (portal: Portal) => void,
  ) {
    for (const p of portals) this.armed.set(p.name, false);
  }

  /** Feet position each frame; fires at most once. */
  update(feet: Vector3): Portal | null {
    if (this.fired) return null;
    for (const p of this.portals) {
      const d = Math.hypot(feet.x - p.position.x, feet.z - p.position.z);
      const dy = Math.abs(feet.y - p.position.y);
      const armed = this.armed.get(p.name) ?? false;
      if (!armed) {
        if (d > p.radius + 1.5) this.armed.set(p.name, true);
        continue;
      }
      if (d <= p.radius && dy < 2.5) {
        this.fired = true;
        this.onEnter(p);
        return p;
      }
    }
    return null;
  }

  isArmed(name: string): boolean {
    return this.armed.get(name) ?? false;
  }
}

/** The target page for a portal, keeping the other query parameters (dev flags, seed). */
export function portalUrl(current: string, portal: Portal): string {
  const url = new URL(current);
  url.searchParams.set('level', portal.target.level);
  url.searchParams.set('entry', portal.target.entry);
  return url.toString();
}

/** Fade the view to black with a line of text, then go. */
export function travel(uiLayer: HTMLElement, text: string, href: string, fadeMs = 600): void {
  // The loading veil comes down over the view, then the page moves to the next level.
  void lowerVeil(uiLayer, text, fadeMs).then(() => location.assign(href));
}
