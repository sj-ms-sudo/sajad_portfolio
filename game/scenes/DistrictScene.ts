import Phaser from 'phaser';
import { District, DISTRICT, preloadDistrict, type DistrictData, type ExitDef } from '../world/district';
import { PoiSystem } from '../world/poi-system';
import { DialogueScene } from './DialogueScene';

/** Set to true to draw the red collision rectangles and see exactly what blocks the player. */
const DEBUG_COLLISION = false;
const WALK_SPEED = 100;

export const PLAYER = {
  idleKey: 'player-idle', idlePath: '/sprites/player_idle.png',
  walkDownKey: 'player-walk-down', walkDownPath: '/sprites/player_walk_down.png',
  walkUpKey: 'player-walk-up', walkUpPath: '/sprites/player_walk_up.png',
  walkLeftKey: 'player-walk-left', walkLeftPath: '/sprites/player_walk_left.png',
  walkRightKey: 'player-walk-right', walkRightPath: '/sprites/player_walk_right.png',
  frameWidth: 32, frameHeight: 48,
} as const;

export const ANIM = { idle: 'idle', walkDown: 'walk-down', walkUp: 'walk-up', walkLeft: 'walk-left', walkRight: 'walk-right' } as const;

export class DistrictScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private district!: District;
  private poi!: PoiSystem;
  private dialogue!: DialogueScene;
  private exitThisFrame: ExitDef | null = null;
  private lastExit = '';

  constructor() {
    super('DistrictScene');
  }

  preload(): void {
    preloadDistrict(this);
    const sheets: [string, string][] = [
      [PLAYER.idleKey, PLAYER.idlePath], [PLAYER.walkDownKey, PLAYER.walkDownPath], [PLAYER.walkUpKey, PLAYER.walkUpPath],
      [PLAYER.walkLeftKey, PLAYER.walkLeftPath], [PLAYER.walkRightKey, PLAYER.walkRightPath],
    ];
    for (const [key, path] of sheets) this.load.spritesheet(key, path, { frameWidth: PLAYER.frameWidth, frameHeight: PLAYER.frameHeight });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[DistrictScene] load failure: ${file.key} -> ${file.url}`);
    });
  }

  create(): void {
    const data = this.cache.json.get(DISTRICT.dataKey) as DistrictData;
    this.district = new District(this, data, DEBUG_COLLISION);

    const start = data.spawns.start;
    this.player = this.createPlayer(start.x, start.y);
    this.createPlayerAnims();
    this.district.attachPlayer(this.player, (exit) => { this.exitThisFrame = exit; });

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W), down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A), right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    const cam = this.cameras.main;
const applyZoom = () => cam.setZoom(Math.max(2, Math.floor(this.scale.height / 300)));
applyZoom();
this.scale.on(Phaser.Scale.Events.RESIZE, applyZoom);
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, applyZoom));
    cam.startFollow(this.player, true, 0.15, 0.15);
    
    // cam.setZoom(2);
    cam.roundPixels = true;

    this.poi = new PoiSystem(this, data.pois, this.player);
    this.player.play(ANIM.idle, true);

    this.scene.launch(DialogueScene.KEY);
    this.dialogue = this.scene.get(DialogueScene.KEY) as DialogueScene;
    const showSpawnDialogue = () => {
      this.dialogue.show({
        speaker: 'You',
        portraitKey: PLAYER.idleKey,
        portraitFrame: 0,
        pages: [
          'Hey, you made it.',
          "I'm Sajad. I write code, build things, break things, and occasionally wonder why something worked five minutes ago.",
          'Welcome to my city.',
        ],
      });
    };
    if (this.dialogue.isReady) showSpawnDialogue();
    else this.dialogue.events.once(Phaser.Scenes.Events.CREATE, showSpawnDialogue);
  }

  update(): void {
    // Exit overlaps are reported during the physics step (just before update); react once per touch.
    const exit = this.exitThisFrame;
    this.exitThisFrame = null;
    if (!exit) this.lastExit = '';
    else if (exit.name !== this.lastExit) {
      this.lastExit = exit.name;
      // TODO when the neighbouring districts exist: this.scene.start('<scene for exit.target>', { spawn: exit.spawn });
      console.info(`[DistrictScene] reached exit "${exit.name}" -> ${exit.target} (spawn ${exit.spawn})`);
    }

    if (this.dialogue.isOpen) {
      this.stop();
      return;
    }

    this.poi.update();
    if (this.poi.isOpen) {
      this.stop();
      return;
    }

    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    if (up && !down) return this.walk(0, -WALK_SPEED, ANIM.walkUp);
    if (down && !up) return this.walk(0, WALK_SPEED, ANIM.walkDown);
    if (left && !right) return this.walk(-WALK_SPEED, 0, ANIM.walkLeft);
    if (right && !left) return this.walk(WALK_SPEED, 0, ANIM.walkRight);
    this.stop();
  }

  private walk(vx: number, vy: number, anim: string): void {
    this.player.setVelocity(vx, vy);
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);
  }

  private stop(): void {
    this.player.setVelocity(0, 0);
    if (this.player.anims.currentAnim?.key !== ANIM.idle) this.player.play(ANIM.idle, true);
  }

  private createPlayer(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    const player = this.physics.add.sprite(x, y, PLAYER.idleKey);
    player.setOrigin(0.5, 1);            // x, y = feet
    player.body!.setSize(16, 10);        // hitbox = the feet, not the whole 32x48 frame
    player.body!.setOffset(8, 38);
    player.setCollideWorldBounds(true);
    return player;
  }

  private createPlayerAnims(): void {
    this.anims.create({
      key: ANIM.idle,
      frames: [
        { key: PLAYER.idleKey, frame: 1, duration: 2000 },
        { key: PLAYER.idleKey, frame: 2, duration: 2000 },
        { key: PLAYER.idleKey, frame: 3, duration: 2000 },
      ],
      repeat: -1,
    });
    const walk = (key: string, sheet: string) =>
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    walk(ANIM.walkDown, PLAYER.walkDownKey);
    walk(ANIM.walkUp, PLAYER.walkUpKey);
    walk(ANIM.walkLeft, PLAYER.walkLeftKey);
    walk(ANIM.walkRight, PLAYER.walkRightKey);
  }
}