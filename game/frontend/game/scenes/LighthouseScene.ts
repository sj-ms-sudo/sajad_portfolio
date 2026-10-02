import Phaser from "phaser";
import { Joystick, isTouchUI } from "@/components/ui/joystick";
import { LIGHTHOUSE } from "../../lighthouse-events";
import { PLAYER, ANIM } from "./CoastScene";

const DEBUG_COLLISION = false;
const WALK_SPEED = 100;
const FADE = [10, 10, 12] as const;

interface RectDef { x: number; y: number; w: number; h: number }
interface InteriorData {
  world: { width: number; height: number };
  blockers: (RectDef & { name: string })[];
  exits: (RectDef & { name: string; target: string; spawn: string })[];
  pois: (RectDef & { id: string; title: string })[];
  spawns: Record<string, { x: number; y: number }>;
}

export const INTERIOR = {
  bgKey: "lighthouse-interior-bg",
  bgPath: "/maps/lighthouse_interior_map.png", // swap to .webp after running scripts/compress-map.mjs
  dataKey: "lighthouse-interior-data",
  dataPath: "/maps/lighthouse_interior_zones.json",
} as const;

export class LighthouseScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private useKeys!: Phaser.Input.Keyboard.Key[];
  private joystick!: Joystick;
  private hint!: Phaser.GameObjects.Text;

  private exitHit: (RectDef & { target: string; spawn: string }) | null = null;
  private nearBinoculars = false;
  private canUse = false;
  private locked = false;
  private leaving = false;
  private spawnName = 'start';
  private pendingShowcaseId: string | undefined;
  private binocularSpawn!: { x: number; y: number };

  constructor() {
    super("LighthouseScene");
  }

  /** Scene instances are reused by Phaser, so reset state every time we enter. */
  init(data?: { spawn?: string; showcaseId?: string }): void {
    this.spawnName = data?.spawn ?? 'start';
    this.pendingShowcaseId = data?.showcaseId;
    this.exitHit = null;
    this.nearBinoculars = false;
    this.canUse = false;
    this.locked = false;
    this.leaving = false;
  }

  preload(): void {
    this.drawLoadingBar();
    if (!this.textures.exists(INTERIOR.bgKey)) this.load.image(INTERIOR.bgKey, INTERIOR.bgPath);
    if (!this.cache.json.exists(INTERIOR.dataKey)) this.load.json(INTERIOR.dataKey, INTERIOR.dataPath);
    const sheets: [string, string][] = [
      [PLAYER.idleKey, PLAYER.idlePath], [PLAYER.walkDownKey, PLAYER.walkDownPath], [PLAYER.walkUpKey, PLAYER.walkUpPath],
      [PLAYER.walkLeftKey, PLAYER.walkLeftPath], [PLAYER.walkRightKey, PLAYER.walkRightPath],
    ];
    for (const [key, path] of sheets) {
      if (!this.textures.exists(key)) this.load.spritesheet(key, path, { frameWidth: PLAYER.frameWidth, frameHeight: PLAYER.frameHeight });
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[LighthouseScene] load failure: ${file.key} -> ${file.url}`);
    });
  }

  create(): void {
    const map = this.cache.json.get(INTERIOR.dataKey) as InteriorData;
    const { width, height } = map.world;
    this.binocularSpawn = map.spawns['from-binoculars'] ?? map.spawns.start;

    this.add.image(0, 0, INTERIOR.bgKey).setOrigin(0, 0).setDisplaySize(width, height).setDepth(-10);
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    // collision
    const blockers = this.physics.add.staticGroup();
        for (const b of map.blockers) {
      const r = this.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0xff0000, DEBUG_COLLISION ? 0.3 : 0);
      this.physics.add.existing(r, true);
      blockers.add(r);
      // skip labels on the thin slivers so the screen stays readable
      if (DEBUG_COLLISION && b.w >= 12 && b.h >= 12) this.debugTag(b.name, b.x + b.w / 2, b.y + b.h / 2, "#b00000");
    }

    // player
    const start = map.spawns[this.spawnName] ?? map.spawns.start;
    this.player = this.physics.add.sprite(start.x, start.y, PLAYER.idleKey);
    this.player.setOrigin(0.5, 1);
    this.player.body!.setSize(16, 10);
    this.player.body!.setOffset(8, 38);
    this.player.setCollideWorldBounds(true);
    this.createPlayerAnims();
    this.physics.add.collider(this.player, blockers);
    this.player.play(ANIM.idle, true);

    // exits (auto-trigger) and the binocular zone (press E)
    for (const e of map.exits) {
      const z = this.add.zone(e.x + e.w / 2, e.y + e.h / 2, e.w, e.h);
      this.physics.add.existing(z, true);
      this.physics.add.overlap(this.player, z, () => { this.exitHit = e; });
            if (DEBUG_COLLISION) {
        this.add.rectangle(e.x + e.w / 2, e.y + e.h / 2, e.w, e.h).setStrokeStyle(1, 0xffff00).setDepth(1999);
        this.debugTag(`exit:${e.name}`, e.x + e.w / 2, e.y - 6, "#8a6a00");
      }
    }
    const bino = map.pois.find((p) => p.id === "binoculars");
    if (bino) {
      const z = this.add.zone(bino.x + bino.w / 2, bino.y + bino.h / 2, bino.w, bino.h);
      this.physics.add.existing(z, true);
      this.physics.add.overlap(this.player, z, () => { this.nearBinoculars = true; });
            if (DEBUG_COLLISION) {
        this.add.rectangle(bino.x + bino.w / 2, bino.y + bino.h / 2, bino.w, bino.h).setStrokeStyle(1, 0x00ffff).setDepth(1999);
        this.debugTag(`poi:${bino.id}`, bino.x + bino.w / 2, bino.y - 6, "#006a80");
      }
      this.hint = this.add.text(bino.x + bino.w / 2, bino.y + bino.h + 4, isTouchUI() ? "TAP A · BINOCULARS" : "PRESS E · BINOCULARS", {
        fontFamily: '"Silkscreen","Courier New",monospace', fontSize: "8px", color: "#fff0fb",
        backgroundColor: "#8a0f6e", padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(1000).setVisible(false);
    }

    // input
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W), down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A), right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.useKeys = [kb.addKey(Phaser.Input.Keyboard.KeyCodes.E), kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)];
    this.joystick = new Joystick({ onAction: () => this.useBinoculars() });

    // camera
    const cam = this.cameras.main;
    const applyZoom = () => cam.setZoom(Math.max(2, Math.floor(this.scale.height / 300)));
    applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, applyZoom);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.roundPixels = true;
    cam.fadeIn(300, ...FADE);

    // overlay closed -> give control back
    this.game.events.on(LIGHTHOUSE.close, this.onOverlayClosed, this);
    this.game.events.on(LIGHTHOUSE.travel, this.travelToBinoculars, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, applyZoom);
      this.game.events.off(LIGHTHOUSE.close, this.onOverlayClosed, this);
      this.game.events.off(LIGHTHOUSE.travel, this.travelToBinoculars, this);
      this.input.keyboard!.enabled = true;
      this.joystick.destroy();
    });
  }

  update(): void {
    this.player.setDepth(this.player.y);

    const near = this.nearBinoculars;
    this.nearBinoculars = false;
    this.canUse = near && !this.locked && !this.leaving;
    this.hint?.setVisible(this.canUse);
    this.joystick.setActionReady(this.canUse);

    if (this.pendingShowcaseId && this.canUse) {
      const showcaseId = this.pendingShowcaseId;
      this.pendingShowcaseId = undefined;
      this.useBinoculars(showcaseId);
      return;
    }

    const exit = this.exitHit;
    this.exitHit = null;
    if (exit && !this.leaving && !this.locked) { this.leave(exit); }
    if (this.locked || this.leaving) { this.player.setVelocity(0, 0); return; }

    if (this.useKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      this.useBinoculars();
      if (this.locked) return;
    }

    const jx = this.joystick.vector.x, jy = this.joystick.vector.y;
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

  // ---------- interactions ----------

    /** Debug only: tiny coloured tag drawn at a zone's centre. */
  private debugTag(text: string, x: number, y: number, bg: string): void {
    this.add.text(x, y, text, {
      fontFamily: '"Silkscreen","Courier New",monospace', fontSize: "8px", color: "#ffffff",
      backgroundColor: bg, padding: { x: 1, y: 1 },
    }).setOrigin(0.5).setDepth(2000);
  }

  private useBinoculars(showcaseId?: string): void {
    if (!this.canUse || this.locked) return;
    this.locked = true;
    this.stop();
    this.joystick.setActive(false);
    // stop Phaser from swallowing Enter/arrow keys while the React overlay is open
    this.input.keyboard!.resetKeys();
    this.input.keyboard!.enabled = false;
    this.cameras.main.fadeOut(200, ...FADE);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.game.events.emit(LIGHTHOUSE.open, showcaseId));
  }

  private travelToBinoculars(showcaseId: string): void {
    if (!showcaseId || this.locked || this.leaving) return;
    this.pendingShowcaseId = showcaseId;
    (this.player.body as Phaser.Physics.Arcade.Body).reset(this.binocularSpawn.x, this.binocularSpawn.y);
    this.cameras.main.centerOn(this.binocularSpawn.x, this.binocularSpawn.y);
  }

  private onOverlayClosed(): void {
    this.input.keyboard!.enabled = true;
    this.cameras.main.fadeIn(250, ...FADE);
    this.locked = false;
    this.joystick.setActive(true);
  }

  private leave(exit: { target: string; spawn: string }): void {
    if (this.leaving) return;
    this.leaving = true;
    this.stop();
    this.joystick.setActive(false);
    this.cameras.main.fadeOut(250, ...FADE);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(exit.target, { spawn: exit.spawn }));
  }

  // ---------- movement (same feel as CoastScene) ----------

  private walk(vx: number, vy: number, anim: string): void {
    this.player.setVelocity(vx, vy);
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);
  }

  private walkAnalog(x: number, y: number): void {
    const ax = Math.abs(x), ay = Math.abs(y);
    const cur = this.player.anims.currentAnim?.key;
    const wasH = cur === ANIM.walkLeft || cur === ANIM.walkRight;
    const wasV = cur === ANIM.walkUp || cur === ANIM.walkDown;
    const horizontal = wasH ? ay <= ax * 1.3 : wasV ? ax > ay * 1.3 : ax > ay;
    if (horizontal) return x < 0 ? this.walk(-WALK_SPEED, 0, ANIM.walkLeft) : this.walk(WALK_SPEED, 0, ANIM.walkRight);
    return y < 0 ? this.walk(0, -WALK_SPEED, ANIM.walkUp) : this.walk(0, WALK_SPEED, ANIM.walkDown);
  }

  private stop(): void {
    this.player.setVelocity(0, 0);
    if (this.player.anims.currentAnim?.key !== ANIM.idle) this.player.play(ANIM.idle, true);
  }

  /** Animations live in the game-wide manager; CoastScene normally made them already. */
  private createPlayerAnims(): void {
    if (this.anims.exists(ANIM.idle)) return;
    this.anims.create({
      key: ANIM.idle,
      frames: [{ key: PLAYER.idleKey, frame: 1, duration: 2000 }, { key: PLAYER.idleKey, frame: 2, duration: 2000 }, { key: PLAYER.idleKey, frame: 3, duration: 2000 }],
      repeat: -1,
    });
    const walk = (key: string, sheet: string) =>
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    walk(ANIM.walkDown, PLAYER.walkDownKey); walk(ANIM.walkUp, PLAYER.walkUpKey);
    walk(ANIM.walkLeft, PLAYER.walkLeftKey); walk(ANIM.walkRight, PLAYER.walkRightKey);
  }

  /** Small pink segmented bar, in the same style as the main loading screen. */
  private drawLoadingBar(): void {
    const { width, height } = this.scale;
    const w = Math.min(320, width * 0.7), h = 22, x = (width - w) / 2, y = height / 2;
    const g = this.add.graphics();
    const label = this.add.text(width / 2, y - 30, "CLIMBING THE LIGHTHOUSE", {
      fontFamily: '"Silkscreen","Courier New",monospace', fontSize: "16px", color: "#fff0fb",
    }).setOrigin(0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      g.clear();
      g.fillStyle(0xffc8f4).fillRect(x, y, w, h);
      g.lineStyle(3, 0x8a0f6e).strokeRect(x, y, w, h);
      const segs = Math.floor((w - 8) / 13), n = Math.round(segs * v);
      g.fillStyle(0x8a0f6e);
      for (let i = 0; i < n; i++) g.fillRect(x + 4 + i * 13, y + 4, 10, h - 8);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { g.destroy(); label.destroy(); });
  }
}