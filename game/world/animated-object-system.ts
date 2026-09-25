import Phaser from 'phaser';
import type { DistrictData } from './district';
import { yDepth } from './npc-system';

export interface AnimatedObjectDef {
  id: string;

  sheet: {
    key: string;
    path: string;
    frameWidth: number;
    frameHeight: number;
  };

  anim: {
    frames: number[];
    frameRate: number;
    frameDuration:number;
    repeat?: number;
  };

  spawn: {
    name: string;
    fallback: {
      dx: number;
      dy: number;
    };
  };

  origin?: {
    x: number;
    y: number;
  };

  scale?: number;
}

interface AnimatedObject {
  def: AnimatedObjectDef;
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
}

export class AnimatedObjectSystem {
  private readonly objects: AnimatedObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly data: DistrictData,
    definitions: AnimatedObjectDef[],
  ) {
    for (const def of definitions) {
      this.spawn(def);
    }
  }

  /**
   * Load all animated object spritesheets.
   *
   * Call from the scene's preload().
   */
  static preload(
    scene: Phaser.Scene,
    definitions: AnimatedObjectDef[],
  ): void {
    for (const def of definitions) {
      scene.load.spritesheet(
        def.sheet.key,
        def.sheet.path,
        {
          frameWidth: def.sheet.frameWidth,
          frameHeight: def.sheet.frameHeight,
        },
      );
    }
  }

  /**
   * Update object positions/depth.
   *
   * Call every frame from the scene's update().
   */
  update(): void {
    for (const object of this.objects) {
      object.sprite.setDepth(yDepth(object.y));
    }
  }

  private spawn(def: AnimatedObjectDef): void {
    this.createAnimation(def);

    const position = this.resolveSpawn(def);

    const sprite = this.scene.add
      .sprite(
        position.x,
        position.y,
        def.sheet.key,
        def.anim.frames[0],
      )
      .setOrigin(
        def.origin?.x ?? 0.5,
        def.origin?.y ?? 1,
      )
      .setScale(def.scale ?? 1)
      .setDepth(yDepth(position.y));

    sprite.play(`${def.id}-loop`);

    this.objects.push({
      def,
      sprite,
      x: position.x,
      y: position.y,
    });
  }

  private createAnimation(def: AnimatedObjectDef): void {
  const key = `${def.id}-loop`;

  if (this.scene.anims.exists(key)) {
    return;
  }

  this.scene.anims.create({
    key,

    frames: def.anim.frames.map((frame) => ({
      key: def.sheet.key,
      frame,
      duration: def.anim.frameDuration,
    })),

    repeat: def.anim.repeat ?? -1,
  });
}

  private resolveSpawn(
    def: AnimatedObjectDef,
  ): { x: number; y: number } {
    const found = this.data.spawns[def.spawn.name];

    if (found) {
      return {
        x: found.x,
        y: found.y,
      };
    }

    const start = this.data.spawns.start;

    return {
      x: start.x + def.spawn.fallback.dx,
      y: start.y + def.spawn.fallback.dy,
    };
  }
}