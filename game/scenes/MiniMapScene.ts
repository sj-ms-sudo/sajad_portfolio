import Phaser from 'phaser';
import { DISTRICT, type DistrictData, type PoiDef, type ExitDef, type Rect } from '../world/district';
import { NAV_HEIGHT } from '../data/nav';

export interface MiniMapInit {
  data: DistrictData;
  player: Phaser.GameObjects.Sprite;
  playerKey: string;
  playerFrame: number;
  /** Omit = every POI is a quest. Pass the same list you give PoiSystem. */
  questIds?: string[];
  /** Return false to block opening (dialogue / POI panel open). */
  canOpen?: () => boolean;
}

const FONT = '"Silkscreen", "Courier New", monospace';
const DARK = 0x8a0f6e, PINK = 0xff8fe8, LIGHT = 0xfff0fb, MID = 0xffc8f4;
const ICON_KEY = 'map-quest-icon';
const MINI_KEY = 'map-mini-canvas';
const HEAD = { x: 4, y: 0, w: 24, h: 22 }; // head crop inside the 32x48 frame; tweak if it cuts hair/chin
const BAR = 18;                             // big-map title bar height

// ---- minimap tuning ----
const MINI_SIZE = 88;        // circle diameter (px) on normal screens
const MINI_SIZE_SMALL = 64;  // circle diameter (px) when the screen is narrower than 600px
const MINI_MARGIN = 18;      // distance from the left edge, and from the bottom of the navbar
const MINI_TOP = NAV_HEIGHT + MINI_MARGIN; // y of the minimap (sits just under the navbar)
const MINI_SPAN = 150;       // world px shown across the circle (smaller number = more zoomed in)
const MINI_PIN_SCALE = 0.8;  // quest pin size on the minimap
const MINI_BADGE = 8;        // player badge radius
const MINI_HEAD_SCALE = 0.45;

const css = (n: number): string => '#' + n.toString(16).padStart(6, '0');

interface View {
  layer: Phaser.GameObjects.Container;
  maskGfx: Phaser.GameObjects.Graphics;
  bg: Phaser.GameObjects.Image;
  quests: { def: PoiDef; icon: Phaser.GameObjects.Image; label?: Phaser.GameObjects.Text }[];
  exits: { def: ExitDef; rect: Phaser.GameObjects.Rectangle }[];
  badge: Phaser.GameObjects.Arc;
  head: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
}

export class MiniMapScene extends Phaser.Scene {
  static readonly KEY = 'MiniMapScene';

  private cfg!: MiniMapInit;
  private open = false;
  private mKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  // big map (normal Phaser objects)
  private big!: View;
  private bigFrame!: Phaser.GameObjects.Graphics;
  private dim!: Phaser.GameObjects.Graphics;
  private backdrop!: Phaser.GameObjects.Zone;
  private titleText!: Phaser.GameObjects.Text;
  private closeText!: Phaser.GameObjects.Text;
  private bigObjs: Phaser.GameObjects.GameObject[] = [];

  // mini map (drawn into a canvas, clipped to a circle)
  private miniFrame!: Phaser.GameObjects.Graphics;
  private miniHit!: Phaser.GameObjects.Zone;
  private miniTex?: Phaser.Textures.CanvasTexture;
  private miniImg?: Phaser.GameObjects.Image;
  private miniSize = 0;
  private miniQuests: PoiDef[] = [];
  private bgFrame!: Phaser.Textures.Frame;
  private headFrame!: Phaser.Textures.Frame;

  private miniRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private bigRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private frameRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private closeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private bigScale = 0.2;

  constructor() {
    super(MiniMapScene.KEY);
  }

  get isOpen(): boolean {
    return this.open;
  }

  init(cfg: MiniMapInit): void {
    this.cfg = cfg;
    this.open = false;
    this.miniImg = undefined;
    this.miniTex = undefined;
    this.miniSize = 0;
  }

  create(): void {
    this.makeIcon();
    this.textures.get(this.cfg.playerKey).setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.bgFrame = this.textures.getFrame(DISTRICT.bgKey);
    this.headFrame = this.textures.getFrame(this.cfg.playerKey, this.cfg.playerFrame);
    const { questIds, data } = this.cfg;
    this.miniQuests = data.pois.filter((p) => !questIds || questIds.includes(p.id));

    // ---- mini map ----
    this.miniFrame = this.add.graphics().setDepth(10);
    // the circular image itself is created in layout() -> buildMiniCanvas()
    this.miniHit = this.add.zone(0, 0, 10, 10).setOrigin(0, 0).setDepth(12).setInteractive({ useHandCursor: true });
    this.miniHit.on('pointerdown', () => { if (!this.open) this.toggle(); });

    // ---- big map ----
    this.dim = this.add.graphics().setDepth(19);
    this.bigFrame = this.add.graphics().setDepth(20);
    this.big = this.makeBigView();
    this.big.layer.setDepth(21);
    this.titleText = this.add.text(0, 0, 'MAP', { fontFamily: FONT, fontSize: '10px', color: '#8a0f6e' }).setDepth(22);
    this.closeText = this.add.text(0, 0, 'X', { fontFamily: FONT, fontSize: '9px', color: '#8a0f6e' }).setOrigin(0.5).setDepth(22);

    this.backdrop = this.add.zone(0, 0, this.scale.width, this.scale.height).setOrigin(0, 0).setDepth(25).setInteractive();
    this.backdrop.disableInteractive();
    this.backdrop.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const inRect = (r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      if (!inRect(this.frameRect) || inRect(this.closeRect)) this.setOpen(false);
    });

    this.bigObjs = [this.dim, this.bigFrame, this.big.layer, this.titleText, this.closeText];
    this.bigObjs.forEach((o) => (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false));

    const kb = this.input.keyboard!;
    this.mKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) this.toggle();
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && this.open) this.setOpen(false);
    this.refresh();
  }

  private toggle(): void {
    if (!this.open && this.cfg.canOpen && !this.cfg.canOpen()) return;
    this.setOpen(!this.open);
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.bigObjs.forEach((o) => (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(v));
    if (v) {
      this.backdrop.setInteractive();
      this.miniHit.disableInteractive();
    } else {
      this.backdrop.disableInteractive();
      this.miniHit.setInteractive({ useHandCursor: true });
    }
    this.refresh();
  }

  // ---------- building ----------

  private makeIcon(): void {
    if (this.textures.exists(ICON_KEY)) return;
    const g = this.make.graphics({}, false);
    g.fillStyle(DARK, 1).fillRect(1, 0, 8, 10).fillRect(0, 1, 10, 8).fillRect(3, 10, 4, 2).fillRect(4, 12, 2, 1);
    g.fillStyle(PINK, 1).fillRect(2, 1, 6, 8).fillRect(1, 2, 8, 6);
    g.fillStyle(DARK, 1).fillRect(4, 2, 2, 3).fillRect(4, 6, 2, 2);
    g.generateTexture(ICON_KEY, 10, 13);
    g.destroy();
  }

  /** Big (full-district) map: plain Phaser objects, masked to its rectangle. */
  private makeBigView(): View {
    const { data, playerKey, playerFrame, questIds } = this.cfg;
    const layer = this.add.container(0, 0);
    const maskGfx = this.make.graphics({}, false);
    layer.setMask(maskGfx.createGeometryMask());

    const bg = this.add.image(0, 0, DISTRICT.bgKey).setOrigin(0, 0);
    layer.add(bg);

    const exits = data.exits.map((def) => {
      const rect = this.add.rectangle(0, 0, 10, 10, PINK, 0.5).setOrigin(0, 0);
      layer.add(rect);
      return { def, rect };
    });

    const quests = data.pois
      .filter((p) => !questIds || questIds.includes(p.id))
      .map((def) => {
        const icon = this.add.image(0, 0, ICON_KEY).setOrigin(0.5, 1).setScale(1.4);
        layer.add(icon);
        const label = this.add
          .text(0, 0, def.title, { fontFamily: FONT, fontSize: '9px', color: '#8a0f6e', backgroundColor: '#fff0fb', padding: { x: 3, y: 1 } })
          .setOrigin(0.5, 0);
        layer.add(label);
        return { def, icon, label };
      });

    const ring = this.add.circle(0, 0, 12, PINK, 0.45);
    layer.add(ring);
    this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 900, repeat: -1, ease: 'Sine.easeOut' });

    const badge = this.add.circle(0, 0, 11, LIGHT).setStrokeStyle(2, DARK);
    layer.add(badge);

    const head = this.add.image(0, 0, playerKey, playerFrame).setCrop(HEAD.x, HEAD.y, HEAD.w, HEAD.h).setScale(0.85);
    head.setOrigin((HEAD.x + HEAD.w / 2) / head.width, (HEAD.y + HEAD.h / 2) / head.height);
    layer.add(head);

    return { layer, maskGfx, bg, quests, exits, badge, head, ring };
  }

  /** (Re)creates the small canvas the minimap is drawn into. Only rebuilds when the size changes. */
  private buildMiniCanvas(size: number): void {
    if (this.miniImg && this.miniSize === size) {
      this.miniImg.setPosition(MINI_MARGIN, MINI_TOP);
      return;
    }
    this.miniImg?.destroy();
    if (this.textures.exists(MINI_KEY)) this.textures.remove(MINI_KEY);
    this.miniTex = this.textures.createCanvas(MINI_KEY, size, size)!;
    this.miniImg = this.add.image(MINI_MARGIN, MINI_TOP, MINI_KEY).setOrigin(0, 0).setDepth(11);
    this.miniSize = size;
  }

  // ---------- layout ----------

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const { world } = this.cfg.data;

    // mini: top-left corner (under the navbar), circular
    const size = w < 600 ? MINI_SIZE_SMALL : MINI_SIZE;
    this.miniRect = { x: MINI_MARGIN, y: MINI_TOP, w: size, h: size };
    this.drawRoundFrame(this.miniFrame, this.miniRect);
    this.buildMiniCanvas(size);
    this.miniHit.setPosition(MINI_MARGIN - 5, MINI_TOP - 5).setSize(size + 10, size + 10, true);

    // big: whole district fitted to the screen area below the navbar
    const availH = h - NAV_HEIGHT;
    this.bigScale = Math.min((w - 40) / world.width, (availH - 40 - BAR) / world.height);
    const bw = Math.round(world.width * this.bigScale);
    const bh = Math.round(world.height * this.bigScale);
    this.bigRect = {
      x: Math.round((w - bw) / 2),
      y: Math.round(NAV_HEIGHT + (availH - bh) / 2 + BAR / 2),
      w: bw,
      h: bh,
    };
    this.frameRect = { x: this.bigRect.x - 4, y: this.bigRect.y - 4 - BAR, w: bw + 8, h: bh + 8 + BAR };
    this.closeRect = this.drawFrame(this.bigFrame, this.bigRect, BAR);
    this.setMask(this.big, this.bigRect);
    this.dim.clear().fillStyle(0x000000, 0.55).fillRect(0, 0, w, h);
    this.backdrop.setPosition(0, 0).setSize(w, h, true);
    this.titleText.setPosition(this.frameRect.x + 8, this.frameRect.y + 6);
    this.closeText.setPosition(this.closeRect.x + 6, this.closeRect.y + 7);

    this.refresh();
  }

  private drawRoundFrame(g: Phaser.GameObjects.Graphics, r: Rect): void {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = r.w / 2;
    g.clear();
    g.fillStyle(DARK, 1).fillCircle(cx, cy, rad + 5);
    g.fillStyle(PINK, 1).fillCircle(cx, cy, rad + 3);
    g.fillStyle(DARK, 1).fillCircle(cx, cy, rad + 1);
  }

  private drawFrame(g: Phaser.GameObjects.Graphics, r: Rect, bar: number): Rect {
    const pad = 4;
    const x = r.x - pad, y = r.y - pad - bar, w = r.w + pad * 2, h = r.h + pad * 2 + bar;
    g.clear();
    g.fillStyle(DARK, 1).fillRect(x + 2, y, w - 4, h).fillRect(x, y + 2, w, h - 4);
    g.fillStyle(PINK, 1).fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle(DARK, 1).fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    const btn: Rect = { x: x + w - 20, y: y + 5, w: 12, h: 12 };
    if (bar > 0) {
      g.fillStyle(DARK, 1).fillRect(btn.x, btn.y, btn.w, btn.h);
      g.fillStyle(MID, 1).fillRect(btn.x + 1, btn.y + 1, btn.w - 2, btn.h - 2);
    }
    return btn;
  }

  private setMask(v: View, r: Rect): void {
    v.maskGfx.clear().fillStyle(0xffffff, 1).fillRect(r.x, r.y, r.w, r.h);
  }

  // ---------- per-frame ----------

  private refresh(): void {
    this.drawMini();
    if (this.open) this.placeBig();
  }

  /** Draws the circular minimap. The player is always at the centre. */
  private drawMini(): void {
    if (!this.miniTex) return;
    const { world } = this.cfg.data;
    const p = this.cfg.player;
    const ctx = this.miniTex.context;
    const size = this.miniSize;
    const c = size / 2;
    const s = size / MINI_SPAN;
    const ox = c - p.x * s; // where the world's (0,0) lands inside the canvas
    const oy = c - p.y * s;

    ctx.clearRect(0, 0, size, size);
    ctx.save();

    // circular clip: everything below is cut to the circle
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.clip();

    // fill (shows past the edge of the world)
    ctx.fillStyle = css(DARK);
    ctx.fillRect(0, 0, size, size);

    // background: copy only the part of the district that is visible
    const fr = this.bgFrame;
    const kx = fr.cutWidth / world.width;
    const ky = fr.cutHeight / world.height;
    const wx0 = Math.max(0, -ox / s), wy0 = Math.max(0, -oy / s);
    const wx1 = Math.min(world.width, (size - ox) / s), wy1 = Math.min(world.height, (size - oy) / s);
    if (wx1 > wx0 && wy1 > wy0) {
      ctx.drawImage(
        fr.source.image as CanvasImageSource,
        fr.cutX + wx0 * kx, fr.cutY + wy0 * ky, (wx1 - wx0) * kx, (wy1 - wy0) * ky,
        ox + wx0 * s, oy + wy0 * s, (wx1 - wx0) * s, (wy1 - wy0) * s,
      );
    }

    // quest pins; off-screen ones stick to the rim of the circle
    const half = (13 * MINI_PIN_SCALE) / 2; // pin anchor is its bottom, so its visual centre is `half` above
    const max = c - 6;
    for (const q of this.miniQuests) {
      let x = ox + (q.x + q.w / 2) * s;
      let y = oy + (q.y + q.h / 2) * s;
      const dx = x - c, dy = (y - half) - c;
      const d = Math.hypot(dx, dy);
      if (d > max) {
        const k = max / d;
        x = c + dx * k;
        y = c + dy * k + half;
      }
      this.drawPin(ctx, x, y, MINI_PIN_SCALE);
    }

    // player badge + head
    ctx.beginPath();
    ctx.arc(c, c, MINI_BADGE, 0, Math.PI * 2);
    ctx.fillStyle = css(LIGHT);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = css(DARK);
    ctx.stroke();

    const hf = this.headFrame;
    const hw = HEAD.w * MINI_HEAD_SCALE, hh = HEAD.h * MINI_HEAD_SCALE;
    ctx.drawImage(
      hf.source.image as CanvasImageSource,
      hf.cutX + HEAD.x, hf.cutY + HEAD.y, HEAD.w, HEAD.h,
      c - hw / 2, c - hh / 2, hw, hh,
    );

    ctx.restore();
    this.miniTex.refresh();
  }

  /** Same pixel pin as the generated icon texture, drawn straight onto the canvas. x,y = bottom-centre of the pin. */
  private drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number): void {
    const ox = x - 5 * sc, oy = y - 13 * sc;
    const rect = (col: number, rx: number, ry: number, rw: number, rh: number) => {
      ctx.fillStyle = css(col);
      ctx.fillRect(ox + rx * sc, oy + ry * sc, rw * sc, rh * sc);
    };
    rect(DARK, 1, 0, 8, 10); rect(DARK, 0, 1, 10, 8); rect(DARK, 3, 10, 4, 2); rect(DARK, 4, 12, 2, 1);
    rect(PINK, 2, 1, 6, 8); rect(PINK, 1, 2, 8, 6);
    rect(DARK, 4, 2, 2, 3); rect(DARK, 4, 6, 2, 2);
  }

  private placeBig(): void {
    const v = this.big;
    const { world } = this.cfg.data;
    const p = this.cfg.player;
    const s = this.bigScale;
    const bgX = this.bigRect.x;
    const bgY = this.bigRect.y;

    v.bg.setPosition(bgX, bgY).setDisplaySize(world.width * s, world.height * s);

    for (const q of v.quests) {
      const x = bgX + (q.def.x + q.def.w / 2) * s;
      const y = bgY + (q.def.y + q.def.h / 2) * s;
      q.icon.setPosition(x, y);
      q.label?.setPosition(x, y + 2);
    }

    for (const e of v.exits) {
      e.rect.setPosition(bgX + e.def.x * s, bgY + e.def.y * s).setSize(e.def.w * s, e.def.h * s);
    }

    const hx = bgX + p.x * s;
    const hy = bgY + p.y * s;
    v.badge.setPosition(hx, hy);
    v.head.setPosition(hx, hy);
    v.ring.setPosition(hx, hy);
  }
}