import Phaser from 'phaser';
import type { DistrictData, PoiDef } from './district';

/* ------------------------------------------------------------------------------------------------
 * TRAVEL EFFECTS
 * An effect is an async function that gets the player from `from` to `to`.
 * It MUST call ctx.place(x, y) at some point (that is what actually moves the player + camera),
 * and resolves when the animation is finished. Add your own with registerTravelEffect(), then use
 * its name as `effect` on a nav item or as TRAVEL.defaultEffect in data/nav.ts.
 * ---------------------------------------------------------------------------------------------- */

export interface TravelContext {
  scene: Phaser.Scene;
  player: Phaser.Physics.Arcade.Sprite;
  camera: Phaser.Cameras.Scene2D.Camera;
  /** Player feet position before the trip. */
  from: { x: number; y: number };
  /** Safe feet position inside the target POI. */
  to: { x: number; y: number };
  poi: PoiDef;
  /** Teleports the player (feet position), zeroes velocity and snaps the camera onto them. */
  place: (x: number, y: number) => void;
}

export type TravelEffect = (ctx: TravelContext) => Promise<void>;

const effects = new Map<string, TravelEffect>();

export function registerTravelEffect(name: string, effect: TravelEffect): void {
  effects.set(name, effect);
}

// ---- built-in effects ----

const FADE = { ms: 220, r: 138, g: 15, b: 110 }; // fades through the same plum as the UI frames

function fade(cam: Phaser.Cameras.Scene2D.Camera, dir: 'out' | 'in'): Promise<void> {
  return new Promise((resolve) => {
    if (dir === 'out') {
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
      cam.fadeOut(FADE.ms, FADE.r, FADE.g, FADE.b);
    } else {
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => resolve());
      cam.fadeIn(FADE.ms, FADE.r, FADE.g, FADE.b);
    }
  });
}

registerTravelEffect('instant', async (ctx) => {
  ctx.place(ctx.to.x, ctx.to.y);
});

registerTravelEffect('fade', async (ctx) => {
  await fade(ctx.camera, 'out');
  ctx.place(ctx.to.x, ctx.to.y);
  await fade(ctx.camera, 'in');
});

/* ------------------------------------------------------------------------------------------------
 * CONTROLLER
 * ---------------------------------------------------------------------------------------------- */

export interface QuickTravelOptions {
  defaultEffect?: string;
  /** Return false to refuse a trip (dialogue / panel / map open). */
  canTravel?: () => boolean;
  /** Called right before an effect starts (e.g. to put the player in the idle pose). */
  onStart?: (poi: PoiDef) => void;
  /** Called after the effect finished. */
  onArrive?: (poi: PoiDef) => void;
}

// The player's collision body (see DistrictScene.createPlayer): 16x10 at the feet.
const BODY_HALF_W = 8;
const BODY_H = 10;

export class QuickTravel {
  private busy = false;
  private readonly pois = new Map<string, PoiDef>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly data: DistrictData,
    private readonly opts: QuickTravelOptions = {},
  ) {
    for (const p of data.pois) this.pois.set(p.id, p);
  }

  /** True while an effect is running. The scene should leave the player alone during this. */
  get isBusy(): boolean {
    return this.busy;
  }

  /** Travel to a POI by id. Resolves true when the trip happened. */
  async to(poiId: string, effect?: string): Promise<boolean> {
    const poi = this.pois.get(poiId);
    if (!poi) {
      console.warn(`[QuickTravel] unknown POI "${poiId}" (check the id in nav.ts against the zones json)`);
      return false;
    }
    if (this.busy || (this.opts.canTravel && !this.opts.canTravel())) return false;

    // Already standing in that zone: nothing to do.
    const zone = new Phaser.Geom.Rectangle(poi.x, poi.y, poi.w, poi.h);
    if (Phaser.Geom.Rectangle.Contains(zone, this.player.x, this.player.y - 2)) return true;

    const name = effect ?? this.opts.defaultEffect ?? 'instant';
    let run = effects.get(name);
    if (!run) {
      console.warn(`[QuickTravel] no travel effect named "${name}", using "instant"`);
      run = effects.get('instant')!;
    }

    const player = this.player;
    const camera = this.scene.cameras.main;
    const to = this.findSpot(poi);

    this.busy = true;
    player.setVelocity(0, 0);
    this.opts.onStart?.(poi);
    try {
      await run({
        scene: this.scene,
        player,
        camera,
        from: { x: player.x, y: player.y },
        to,
        poi,
        place: (x, y) => {
          (player.body as Phaser.Physics.Arcade.Body).reset(x, y);
          camera.centerOn(x, y);
        },
      });
    } finally {
      this.busy = false;
    }
    this.opts.onArrive?.(poi);
    return true;
  }

  /**
   * Feet position inside the POI rectangle (so the "Press E" prompt shows up on arrival) that is
   * closest to the centre and doesn't put the player's body inside a blocker.
   */
  private findSpot(poi: PoiDef): { x: number; y: number } {
    const cx = poi.x + poi.w / 2;
    const cy = poi.y + poi.h / 2;
    const cands: { x: number; y: number; d: number }[] = [];
    for (let x = poi.x + BODY_HALF_W; x <= poi.x + poi.w - BODY_HALF_W; x += 4) {
      for (let y = poi.y + 4; y <= poi.y + poi.h; y += 3) {
        cands.push({ x, y, d: Math.hypot(x - cx, y - cy) });
      }
    }
    cands.sort((a, b) => a.d - b.d);
    const hit = cands.find((c) => this.isFree(c.x, c.y));
    return hit ? { x: hit.x, y: hit.y } : { x: cx, y: cy };
  }

  private isFree(x: number, y: number): boolean {
    const m = 1; // safety margin
    const L = x - BODY_HALF_W - m, R = x + BODY_HALF_W + m, T = y - BODY_H - m, B = y + m;
    return !this.data.blockers.some((b) => L < b.x + b.w && R > b.x && T < b.y + b.h && B > b.y);
  }
}