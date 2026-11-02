/**
 * Portals between levels (DESIGN.md 15.3): a trigger disc the party walks into. A portal
 * arms once the party has stood clear of it (so arriving through it does not bounce the
 * party straight back) and fires when the party steps within its radius. The transition
 * itself is a fade to black and a fresh load of the page on the target level, with
 * `entry` naming the portal to arrive at: MM6 showed a loading screen between maps too.
 * The watcher serves any trigger disc: an entrance's "Enter?" board (DESIGN.md 17.9) is one
 * that is reset when the board comes down, and arms again once the party has stepped clear.
 */
import { lowerVeil } from '../app/veil';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

/** A disc on the ground the party walks into. */
export interface Trigger {
  name: string;
  position: Vector3;
  radius: number;
}

export interface Portal extends Trigger {
  target: { level: string; entry: string };
  arrive: { position: Vector3; yawDeg: number };
}

export class PortalWatcher<P extends Trigger = Portal> {
  private readonly armed = new Map<string, boolean>();
  private fired = false;

  constructor(
    readonly portals: readonly P[],
    private readonly onEnter: (portal: P) => void,
  ) {
    for (const p of portals) this.armed.set(p.name, false);
  }

  /** Feet position each frame; fires at most once, until `reset`. */
  update(feet: Vector3): P | null {
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

  /** Ready to fire again, once the party has stood clear of every disc. */
  reset(): void {
    this.fired = false;
    for (const p of this.portals) this.armed.set(p.name, false);
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
