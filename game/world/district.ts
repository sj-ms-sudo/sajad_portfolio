import Phaser from 'phaser';

/** Shape of general-district.zones.json. All coordinates are in WORLD pixels (the painted map is stretched to world.width x world.height). */
export interface Rect { x: number; y: number; w: number; h: number }
export interface BlockerDef extends Rect { name: string }
export interface PoiDef extends Rect { id: string; title: string; category: string }
export interface ExitDef extends Rect { name: string; target: string; spawn: string }
export interface DistrictData {
  world: { width: number; height: number };
  background: string;
  blockers: BlockerDef[];
  pois: PoiDef[];
  exits: ExitDef[];
  spawns: Record<string, { x: number; y: number }>;   // spawn (x, y) = where the player's FEET go
}

export const DISTRICT = {
  dataKey: 'general-district-data',
  dataPath: '/maps/general-district.zones.json',
  bgKey: 'general-district-bg',
  bgPath: '/maps/general-district-bg.webp',
} as const;

export function preloadDistrict(scene: Phaser.Scene): void {
  scene.load.image(DISTRICT.bgKey, DISTRICT.bgPath);
  scene.load.json(DISTRICT.dataKey, DISTRICT.dataPath);
}

/**
 * A painted district: one background image + invisible collision rectangles + exits.
 * Build it BEFORE the player (it sets world/camera bounds), then call attachPlayer().
 */
export class District {
  readonly blockers: Phaser.Physics.Arcade.StaticGroup;
  private readonly exitZones: { zone: Phaser.GameObjects.Zone; def: ExitDef }[] = [];

  constructor(private readonly scene: Phaser.Scene, readonly data: DistrictData, debug = false) {
    const { width, height } = data.world;

    scene.add.image(0, 0, DISTRICT.bgKey).setOrigin(0, 0).setDisplaySize(width, height).setDepth(-10);
    scene.physics.world.setBounds(0, 0, width, height);
    scene.cameras.main.setBounds(0, 0, width, height);

    this.blockers = scene.physics.add.staticGroup();
    for (const b of data.blockers) {
      const r = scene.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0xff0000, debug ? 0.3 : 0);
      if (debug) r.setStrokeStyle(1, 0xff0000, 0.9).setDepth(50);
      // if (debug) scene.add.text(b.x + 2, b.y + 2, b.name, { fontSize: '8px', color: '#fff' }).setDepth(51);
      scene.physics.add.existing(r, true);
      this.blockers.add(r);
    }

    for (const e of data.exits) {
      const zone = scene.add.zone(e.x + e.w / 2, e.y + e.h / 2, e.w, e.h);
      scene.physics.add.existing(zone, true);
      this.exitZones.push({ zone, def: e });
    }
  }

  /** Collide the player with the blockers and report exit overlaps (called every frame while overlapping). */
  attachPlayer(player: Phaser.Physics.Arcade.Sprite, onExit: (exit: ExitDef) => void): void {
    this.scene.physics.add.collider(player, this.blockers);
    for (const { zone, def } of this.exitZones) this.scene.physics.add.overlap(player, zone, () => onExit(def));
  }
}