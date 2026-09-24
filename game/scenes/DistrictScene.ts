import Phaser from 'phaser';
import { District, DISTRICT, preloadDistrict, type DistrictData, type ExitDef } from '../world/district';
import { PoiSystem } from '../world/poi-system';
import { QuickTravel } from '../world/quick-travel';
import { Navbar } from '../../components/ui/navbar';
import { Joystick } from '../../components/ui/joystick';
import { NpcSystem, yDepth } from '../world/npc-system';
import { NAV, TRAVEL } from '../data/nav';
import { DialogueScene } from './DialogueScene';
import { MiniMapScene } from './MiniMapScene';
import { BOOT } from '../boot-events';

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
  private minimap!: MiniMapScene;
  private travel!: QuickTravel;
  private navbar!: Navbar;
  private joystick!: Joystick;
  private npcs!: NpcSystem;
  private exitThisFrame: ExitDef | null = null;
  private lastExit = '';

  constructor() {
    super('DistrictScene');
  }

  preload(): void {
    this.trackLoadProgress(); // must come first so it sees every file that gets queued below
    preloadDistrict(this);
    NpcSystem.preload(this);
    const sheets: [string, string][] = [
      [PLAYER.idleKey, PLAYER.idlePath], [PLAYER.walkDownKey, PLAYER.walkDownPath], [PLAYER.walkUpKey, PLAYER.walkUpPath],
      [PLAYER.walkLeftKey, PLAYER.walkLeftPath], [PLAYER.walkRightKey, PLAYER.walkRightPath],
    ];
    for (const [key, path] of sheets) this.load.spritesheet(key, path, { frameWidth: PLAYER.frameWidth, frameHeight: PLAYER.frameHeight });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[DistrictScene] load failure: ${file.key} -> ${file.url}`);
      this.game.events.emit(BOOT.error, file.key);
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
    cam.roundPixels = true;

    this.poi = new PoiSystem(this, data.pois, this.player);
    this.player.play(ANIM.idle, true);

    this.scene.launch(MiniMapScene.KEY, {
      data,
      player: this.player,
      playerKey: PLAYER.idleKey,
      playerFrame: 1,
      canOpen: () => !this.dialogue.isOpen && !this.poi.isOpen && !this.travel.isBusy,
    });
    this.minimap = this.scene.get(MiniMapScene.KEY) as MiniMapScene;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(MiniMapScene.KEY));

    this.scene.launch(DialogueScene.KEY);
    this.dialogue = this.scene.get(DialogueScene.KEY) as DialogueScene;
    this.npcs = new NpcSystem(this, data, this.player, this.dialogue);
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

    // ---- navbar + quick travel ----
    this.travel = new QuickTravel(this, this.player, data, {
      defaultEffect: TRAVEL.defaultEffect,
      canTravel: () => this.canTravel(),
      onStart: () => this.stop(), // idle pose before the effect starts
    });
    this.navbar = new Navbar(NAV, (item) => {
      if (item.poi) void this.travel.to(item.poi, item.effect);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.navbar.destroy());

    // ---- touch controls (only shown on touch screens) ----
    this.joystick = new Joystick({ onAction: () => (this.npcs.isNear ? this.npcs.interact() : this.poi.interact()) });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.joystick.destroy());

    this.game.events.emit(BOOT.ready); // tells the React loading screen to fade out
  }

  /**
   * Feeds the DOM loading bar (components/game/LoadingScreen). The big map counts for more than the
   * small sprites, so the bar moves with the real download instead of jumping when the map lands.
   */
  private trackLoadProgress(): void {
    const weights = new Map<string, number>();
    const done = new Map<string, number>();
    const idOf = (key: string, type: string) => `${type}:${key}`;
    const emit = () => {
      let total = 0;
      let sum = 0;
      weights.forEach((w, id) => {
        total += w;
        sum += w * (done.get(id) ?? 0);
      });
      this.game.events.emit(BOOT.progress, total ? sum / total : 0);
    };

    this.load.on(Phaser.Loader.Events.ADD, (key: string, type: string) => {
      weights.set(idOf(key, type), key === DISTRICT.bgKey ? 6 : 1);
    });
    this.load.on(Phaser.Loader.Events.FILE_PROGRESS, (file: Phaser.Loader.File, pct: number) => {
      done.set(idOf(file.key, file.type), pct);
      emit();
    });
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string, type: string) => {
      done.set(idOf(key, type), 1);
      emit();
    });
  }

  /** Quick travel is refused while any overlay is open or a trip is already running. */
  private canTravel(): boolean {
    return !this.travel.isBusy && !this.dialogue.isOpen && !this.minimap.isOpen && !this.poi.isOpen;
  }

  update(_time: number, delta: number): void {
    const free = this.canTravel();
    this.navbar.setLocked(!free);
    this.joystick.setActive(free); // hidden (and released) while a dialogue / panel / map / trip owns the screen
    this.player.setDepth(yDepth(this.player.y)); // y-sort with the NPCs
    this.npcs.update(delta);

    // Exit overlaps are reported during the physics step (just before update); react once per touch.
    const exit = this.exitThisFrame;
    this.exitThisFrame = null;
    if (!exit) this.lastExit = '';
    else if (exit.name !== this.lastExit) {
      this.lastExit = exit.name;
      // TODO when the neighbouring districts exist: this.scene.start('<scene for exit.target>', { spawn: exit.spawn });
      console.info(`[DistrictScene] reached exit "${exit.name}" -> ${exit.target} (spawn ${exit.spawn})`);
    }

    // A travel effect owns the player while it runs (it may move/animate them itself).
    if (this.travel.isBusy) return;

    if (this.dialogue.isOpen) {
      this.stop();
      return;
    }

    if (this.minimap.isOpen) {
      this.stop();
      return;
    }

    const npcNear = this.npcs.handleInteraction();
    if (this.dialogue.isOpen) {
      this.stop(); // an NPC just started talking
      return;
    }

    this.poi.setSuppressed(npcNear);
    this.poi.update();
    if (this.poi.isOpen) {
      this.stop();
      return;
    }

    this.joystick.setActionReady(npcNear || this.poi.isNear);

    // Joystick: 4-way movement (snaps to the strongest axis), same as the keyboard.
    const jx = this.joystick.vector.x;
    const jy = this.joystick.vector.y;
    if (jx !== 0 || jy !== 0) return this.walkAnalog(jx, jy);

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

  /** Joystick movement: snaps to the strongest axis so you only ever walk up / down / left / right. */
  private walkAnalog(x: number, y: number): void {
    const ax = Math.abs(x);
    const ay = Math.abs(y);

    // A little hysteresis so the diagonals don't flicker between horizontal and vertical.
    const cur = this.player.anims.currentAnim?.key;
    const wasHorizontal = cur === ANIM.walkLeft || cur === ANIM.walkRight;
    const wasVertical = cur === ANIM.walkUp || cur === ANIM.walkDown;
    const horizontal = wasHorizontal ? ay <= ax * 1.3 : wasVertical ? ax > ay * 1.3 : ax > ay;

    if (horizontal) {
      if (x < 0) return this.walk(-WALK_SPEED, 0, ANIM.walkLeft);
      return this.walk(WALK_SPEED, 0, ANIM.walkRight);
    }
    if (y < 0) return this.walk(0, -WALK_SPEED, ANIM.walkUp);
    return this.walk(0, WALK_SPEED, ANIM.walkDown);
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