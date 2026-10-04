import Phaser from "phaser";
import { Joystick, isTouchUI } from "@/components/ui/joystick";
import { GALLERY } from "../../gallery-events";
import { PLAYER, ANIM } from "./CoastScene";

const DEBUG_COLLISION = false;
const WALK_SPEED = 100;
const FADE = [10, 10, 12] as const;

/**
 * true  -> every painting opens something. When there are more paintings than showcase items the list
 *          repeats around the walls (painting N shows SHOWCASE[N % SHOWCASE.length]), so the gallery loops.
 * false -> only the first SHOWCASE.length paintings are interactive; the rest are just decoration.
 */
const LOOP_PAINTINGS = true;

interface RectDef { x: number; y: number; w: number; h: number }
interface Painting extends RectDef {
  id: string;
  slot: number;                    // 0-based, in walking order; React maps it to SHOWCASE[slot % n]
  zone: RectDef;                   // where the player stands to interact
  stand: { x: number; y: number }; // a reachable spot in front of it (used by "travel to this one")
}
interface GalleryData {
  world: { width: number; height: number };
  blockers: (RectDef & { name: string })[];
  exits: (RectDef & { name: string; target: string; spawn: string })[];
  /** Edge strips that loop the map: touching one moves the player to x = toX (same y). */
  warps: (RectDef & { name: string; toX: number })[];
  paintings: Painting[];
  spawns: Record<string, { x: number; y: number }>;
}

export const GALLERY_MAP = {
  bgKey: "art-gallery-bg",
  bgPath: "/maps/art_gallery_map.webp",
  dataKey: "art-gallery-data",
  dataPath: "/maps/art_gallery_zones.json",
} as const;

export class GalleryScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private useKeys!: Phaser.Input.Keyboard.Key[];
  private joystick!: Joystick;
  private hint!: Phaser.GameObjects.Text;
  private glow!: Phaser.GameObjects.Graphics;

  private paintings: Painting[] = [];
  private nearPainting: Painting | null = null;
  private current: Painting | null = null;
  private exitHit: { target: string; spawn: string } | null = null;
  private warpHit: { toX: number } | null = null;
  private canUse = false;
  private locked = false;
  private leaving = false;
  private warping = false;
  private spawnName = "start";
  private pendingSlot: number | undefined;
  private arrivalShowcaseId: string | undefined;

  constructor() {
    super("GalleryScene");
  }

  /** Scene instances are reused by Phaser, so reset state every time we enter. */
  init(data?: { spawn?: string; showcaseId?: string }): void {
    this.spawnName = data?.spawn ?? "start";
    this.arrivalShowcaseId = data?.showcaseId;
    this.nearPainting = null;
    this.current = null;
    this.exitHit = null;
    this.warpHit = null;
    this.canUse = false;
    this.locked = false;
    this.leaving = false;
    this.warping = false;
    this.pendingSlot = undefined;
  }

  preload(): void {
    this.drawLoadingBar();
    if (!this.textures.exists(GALLERY_MAP.bgKey)) this.load.image(GALLERY_MAP.bgKey, GALLERY_MAP.bgPath);
    if (!this.cache.json.exists(GALLERY_MAP.dataKey)) this.load.json(GALLERY_MAP.dataKey, GALLERY_MAP.dataPath);
    const sheets: [string, string][] = [
      [PLAYER.idleKey, PLAYER.idlePath], [PLAYER.walkDownKey, PLAYER.walkDownPath], [PLAYER.walkUpKey, PLAYER.walkUpPath],
      [PLAYER.walkLeftKey, PLAYER.walkLeftPath], [PLAYER.walkRightKey, PLAYER.walkRightPath],
    ];
    for (const [key, path] of sheets) {
      if (!this.textures.exists(key)) this.load.spritesheet(key, path, { frameWidth: PLAYER.frameWidth, frameHeight: PLAYER.frameHeight });
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[GalleryScene] load failure: ${file.key} -> ${file.url}`);
    });
  }

  create(): void {
    const map = this.cache.json.get(GALLERY_MAP.dataKey) as GalleryData;
    const { width, height } = map.world;
    this.paintings = map.paintings;

    this.add.image(0, 0, GALLERY_MAP.bgKey).setOrigin(0, 0).setDisplaySize(width, height).setDepth(-10);
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    // collision
    const blockers = this.physics.add.staticGroup();
    for (const b of map.blockers) {
      const r = this.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 0xff0000, DEBUG_COLLISION ? 0.3 : 0);
      if (DEBUG_COLLISION) r.setStrokeStyle(1, 0xff0000, 0.9).setDepth(50);
      this.physics.add.existing(r, true);
      blockers.add(r);
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

    // exit (reception at the top of the central corridor) and the east <-> west loop strips
    const zoneFor = (r: RectDef) => {
      const z = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      this.physics.add.existing(z, true);
      return z;
    };
    for (const e of map.exits) {
      this.physics.add.overlap(this.player, zoneFor(e), () => { this.exitHit = e; });
    }
    for (const w of map.warps ?? []) {
      this.physics.add.overlap(this.player, zoneFor(w), () => { this.warpHit = w; });
    }

    // paintings: stand in front of one to interact. If two zones overlap, the closer painting wins.
    for (const p of this.paintings) {
      this.physics.add.overlap(this.player, zoneFor(p.zone), () => {
        const cx = (q: Painting) => q.x + q.w / 2;
        if (!this.nearPainting || Math.abs(this.player.x - cx(p)) < Math.abs(this.player.x - cx(this.nearPainting))) this.nearPainting = p;
      });
    }
    this.glow = this.add.graphics().setDepth(5);
    this.hint = this.add.text(0, 0, isTouchUI() ? "TAP A · VIEW" : "PRESS E · VIEW", {
      fontFamily: '"Silkscreen","Courier New",monospace', fontSize: "8px", color: "#fff0fb",
      backgroundColor: "#8a0f6e", padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(1000).setVisible(false);

    // input
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W), down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A), right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.useKeys = [kb.addKey(Phaser.Input.Keyboard.KeyCodes.E), kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)];
    this.joystick = new Joystick({ onAction: () => this.openCurrent() });

    // camera
    const cam = this.cameras.main;
    const applyZoom = () => cam.setZoom(Math.max(2, Math.floor(this.scale.height / 300)));
    applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, applyZoom);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.roundPixels = true;
    cam.fadeIn(300, ...FADE);

    // overlay closed -> give control back; navbar "jump to a component" -> walk to its first painting
    this.game.events.on(GALLERY.close, this.onOverlayClosed, this);
    this.game.events.on(GALLERY.travel, this.travelToShowcase, this);
    if (this.arrivalShowcaseId) this.travelToShowcase(this.arrivalShowcaseId);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, applyZoom);
      this.game.events.off(GALLERY.close, this.onOverlayClosed, this);
      this.game.events.off(GALLERY.travel, this.travelToShowcase, this);
      this.input.keyboard!.enabled = true;
      this.joystick.destroy();
    });
  }

  update(): void {
    this.player.setDepth(this.player.y);

    // which painting (if any) can be opened right now
    const near = this.nearPainting;
    this.nearPainting = null;
    const usable = near && this.isActive(near) ? near : null;
    this.canUse = !!usable && !this.locked && !this.leaving && !this.warping;
    this.current = this.canUse ? usable : null;
    this.joystick.setActionReady(this.canUse);
    this.drawHighlight();

    if (this.pendingSlot !== undefined && this.current?.slot === this.pendingSlot) {
      this.pendingSlot = undefined;
      this.openCurrent();
      return;
    }

    // leaving through the reception
    const exit = this.exitHit;
    this.exitHit = null;
    if (exit && !this.leaving && !this.locked) this.leave(exit);

    // looping: touching the east/west strip drops you on the other side
    const warp = this.warpHit;
    this.warpHit = null;
    if (warp && !this.warping && !this.leaving && !this.locked) this.warp(warp.toX);

    if (this.locked || this.leaving || this.warping) { this.player.setVelocity(0, 0); return; }

    if (this.useKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      this.openCurrent();
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

  // ---------- paintings ----------

  private isActive(p: Painting): boolean {
    if (LOOP_PAINTINGS) return true;
    const count = (this.registry.get("showcaseCount") as number | undefined) ?? 1;
    return p.slot < count;
  }

  /** Gold frame around the painting in front of you + the "press E" label above it. */
  private drawHighlight(): void {
    this.glow.clear();
    const p = this.current;
    this.hint.setVisible(!!p);
    if (!p) return;
    this.glow.lineStyle(2, 0xffd966, 1).strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    this.hint.setPosition(p.x + p.w / 2, p.y - 5);
  }

  private openCurrent(): void {
    const p = this.current;
    if (!p || !this.canUse || this.locked) return;
    this.locked = true;
    this.stop();
    this.joystick.setActive(false);
    // stop Phaser from swallowing Enter/arrow keys while the React overlay is open
    this.input.keyboard!.resetKeys();
    this.input.keyboard!.enabled = false;
    this.cameras.main.fadeOut(200, ...FADE);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.game.events.emit(GALLERY.open, p.slot));
  }

  private onOverlayClosed(): void {
    this.input.keyboard!.enabled = true;
    this.cameras.main.fadeIn(250, ...FADE);
    this.locked = false;
    this.joystick.setActive(true);
  }

  /** Navbar website jump: walk to the first painting that shows this item, then open it. */
  private travelToShowcase(showcaseId: string): void {
    if (!showcaseId || this.locked || this.leaving) return;
    const ids = (this.registry.get("showcaseIds") as string[] | undefined) ?? [];
    const idx = ids.indexOf(showcaseId);
    if (idx < 0) return;
    const target = this.paintings.find((p) => p.slot % ids.length === idx);
    if (!target) return;
    this.pendingSlot = target.slot;
    (this.player.body as Phaser.Physics.Arcade.Body).reset(target.stand.x, target.stand.y);
    this.cameras.main.centerOn(target.stand.x, target.stand.y);
  }

  // ---------- leaving / looping ----------

  private leave(exit: { target: string; spawn: string }): void {
    if (this.leaving) return;
    this.leaving = true;
    this.stop();
    this.joystick.setActive(false);
    this.cameras.main.fadeOut(250, ...FADE);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(exit.target, { spawn: exit.spawn }));
  }

  /** The brick strips on the far left and far right of the art match row for row, so a quick fade hides the seam. */
  private warp(toX: number): void {
    this.warping = true;
    this.stop();
    const cam = this.cameras.main;
    cam.fadeOut(120, ...FADE);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      (this.player.body as Phaser.Physics.Arcade.Body).reset(toX, this.player.y);
      cam.centerOn(toX, this.player.y);
      cam.fadeIn(160, ...FADE);
      this.time.delayedCall(200, () => { this.warping = false; });
    });
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

  /** Small pink segmented bar, in the same style as the lighthouse loading bar. */
  private drawLoadingBar(): void {
    const { width, height } = this.scale;
    const w = Math.min(320, width * 0.7), h = 22, x = (width - w) / 2, y = height / 2;
    const g = this.add.graphics();
    const label = this.add.text(width / 2, y - 30, "ENTERING THE GALLERY", {
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
