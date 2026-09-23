import Phaser from 'phaser';

export interface DialogueOptions {
  /** Name shown in the little tag above the box. Omit for no name tag. */
  speaker?: string;
  /** Texture key for the character sprite shown on the right of the box. */
  portraitKey?: string;
  /** Frame of that texture to freeze on (defaults to 0). */
  portraitFrame?: number | string;
  /** One "page" of text per box-full; player presses continue between pages. */
  pages: string[];
  /** Called once the final page has been dismissed. */
  onComplete?: () => void;
}

const BOX_MARGIN = 10;
// const BOX_HEIGHT = 150;
// const PORTRAIT_SIZE = 180;
// const TEXT_PADDING = 40;
const TYPE_SPEED_MS = 24;

// Pokémon (FireRed-ish) palette
const PANEL_FILL = 0xf8f8f8;
const BORDER_DARK = 0x383840;
const BORDER_RED = 0xd85848;
const TEXT_COLOR = '#383840';
const TEXT_SHADOW = '#c0c0c8';

export class DialogueScene extends Phaser.Scene {
  static readonly KEY = 'DialogueScene';

  isReady = false;

  private panel!: Phaser.GameObjects.Graphics;
  private nameTagBg!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Sprite;
  private continueIndicator!: Phaser.GameObjects.Text;
  private indicatorTween?: Phaser.Tweens.Tween;
  private indicatorBaseY = 0;
  private root!: Phaser.GameObjects.Container;
  private tapZone!: Phaser.GameObjects.Zone;
  private enterKey!: Phaser.Input.Keyboard.Key;

  private pages: string[] = [];
  private pageIndex = 0;
  private wrappedCurrent = '';
  private charIndex = 0;
  private typeTimer?: Phaser.Time.TimerEvent;
  private onCompleteCb?: () => void;
  private open = false;

  private boxH = 150;
  private portraitSize = 180;
  private textPad = 40;

  constructor() {
    super(DialogueScene.KEY);
  }

  get isOpen(): boolean {
    return this.open;
  }

  create(): void {
    this.root = this.add.container(0, 0).setDepth(1000);

    this.panel = this.add.graphics();
    this.nameTagBg = this.add.graphics();
    this.root.add([this.panel, this.nameTagBg]);

    this.nameText = this.add
      .text(0, 0, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '30px',
        lineSpacing:6,
        color: '#d85848',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.root.add(this.nameText);

    this.bodyText = this.add.text(0, 0, '', {
  fontFamily: '"Silkscreen", monospace',
  fontSize: '30px',
  fontStyle: 'bold',
  color: TEXT_COLOR,
  lineSpacing: 8,
  wordWrap: {
    width: 400,
    useAdvancedWrap: true,
  },
  shadow: {
    offsetX: 1,
    offsetY: 1,
    color: TEXT_SHADOW,
    fill: true,
    blur: 0,
  },
});
this.root.add(this.bodyText);

    this.portrait = this.add.sprite(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);
    this.root.add(this.portrait);

    this.continueIndicator = this.add
      .text(0, 0, '▼', { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#d85848' })
      .setOrigin(0.5)
      .setVisible(false);
    this.root.add(this.continueIndicator);

    this.tapZone = this.add
      .zone(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: false });
    this.tapZone.disableInteractive();
    this.tapZone.on('pointerdown', () => this.advance());

    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.root.setVisible(false);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.typeTimer?.remove();
      this.indicatorTween?.remove();
    });

    this.isReady = true;
  }

  update(): void {
    if (!this.open) return;
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this.advance();
  }

  show(opts: DialogueOptions): void {
    this.pages = opts.pages.length > 0 ? opts.pages : [''];
    this.pageIndex = 0;
    this.onCompleteCb = opts.onComplete;

    this.nameText.setText(opts.speaker ?? '');
    this.nameTagBg.setVisible(!!opts.speaker);
    this.nameText.setVisible(!!opts.speaker);

    if (opts.portraitKey) {
      this.portrait.setTexture(opts.portraitKey, opts.portraitFrame ?? 0).setVisible(true);
    //   const scale = PORTRAIT_SIZE / Math.max(this.portrait.width, this.portrait.height);
    //   this.portrait.setScale(scale);
    } else {
      this.portrait.setVisible(false);
    }

    this.layout(); // recompute name tag width + portrait position now that they're set
    this.pages = this.paginate(this.pages);
    this.tapZone.setInteractive({ useHandCursor: false });
    this.root.setVisible(true);
    this.root.setAlpha(1);
    this.open = true;
    this.openPage(0);
  }

  /** Instantly close the box, skipping any remaining pages (no onComplete call). */
  hide(): void {
    this.typeTimer?.remove();
    this.stopIndicator();
    this.root.setVisible(false);
    this.open = false;
    this.tapZone.disableInteractive();
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const compact = w < 600; // mobile / narrow canvas

    this.boxH = compact ? 110 : 150;
    this.textPad = compact ? 20 : 40;
    this.portraitSize = compact ? 110 : 180;

    this.bodyText.setFontSize(compact ? 16 : 30);
    this.bodyText.setLineSpacing(compact ? 4 : 8);
    this.nameText.setFontSize(compact ? 18 : 30);

    const boxW = Math.max(200, w - BOX_MARGIN * 2);
    const boxX = BOX_MARGIN;
    const boxY = h - this.boxH - BOX_MARGIN;
    const textW = boxW - this.textPad * 2;
    // Pokémon-style panel: dark rounded border, white fill, thin red inner line.
    this.panel.clear();
    this.panel.fillStyle(BORDER_DARK, 1).fillRoundedRect(boxX, boxY, boxW, this.boxH, 8);
    this.panel.fillStyle(PANEL_FILL, 1).fillRoundedRect(boxX + 3, boxY + 3, boxW - 6, this.boxH - 6, 6);
    this.panel.lineStyle(2, BORDER_RED, 1).strokeRoundedRect(boxX + 6, boxY + 6, boxW - 12, this.boxH- 12, 4);

    // Name tag tab above the top-left corner.
    const tagW = Math.max(48, this.nameText.width + 20);
    const tagH = 20;
    const tagX = boxX + 14;
    const tagY = boxY - tagH + 3;
    this.nameTagBg.clear();
    this.nameTagBg
      .fillStyle(BORDER_DARK, 1)
      .fillRoundedRect(tagX, tagY, tagW, tagH + 3, { tl: 6, tr: 6, bl: 0, br: 0 });
    this.nameTagBg
      .fillStyle(PANEL_FILL, 1)
      .fillRoundedRect(tagX + 2, tagY + 2, tagW - 4, tagH + 1, { tl: 4, tr: 4, bl: 0, br: 0 });
    this.nameText.setPosition(tagX + 10, tagY + tagH / 2 + 1);

    this.bodyText.setStyle({ wordWrap: { width: Math.max(20, textW), useAdvancedWrap: true } });
    this.bodyText.setPosition(boxX + this.textPad, boxY + this.textPad - 2);

    // Portrait stands on top of the box, right side.
    if (this.portrait.visible) {
    const s = this.portraitSize / Math.max(this.portrait.width, this.portrait.height);
    this.portrait.setScale(s);
    this.portrait.setPosition(boxX + boxW - this.textPad - this.portraitSize / 2, boxY + 2);
    }

    this.indicatorBaseY = boxY + this.boxH - 18;
    this.continueIndicator.setPosition(boxX + boxW - 22, this.indicatorBaseY);
    if (this.continueIndicator.visible) this.startIndicator();

    this.tapZone.setPosition(0, 0).setSize(w, h, true);
  }

  private startIndicator(): void {
    this.indicatorTween?.remove();
    this.continueIndicator.y = this.indicatorBaseY;
    this.continueIndicator.setVisible(true);
    this.indicatorTween = this.tweens.add({
      targets: this.continueIndicator,
      y: this.indicatorBaseY + 4,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopIndicator(): void {
    this.indicatorTween?.remove();
    this.indicatorTween = undefined;
    this.continueIndicator.setVisible(false);
  }
  private paginate(raw: string[]): string[] {
    const m = this.bodyText.getTextMetrics();
    const lineH = m.fontSize + this.bodyText.lineSpacing;
    const avail = this.boxH - this.textPad - 14; // top padding + a little bottom padding
    const maxLines = Math.max(1, Math.floor(avail / lineH));

    const out: string[] = [];
    for (const page of raw) {
        const lines = this.bodyText.runWordWrap(page).split('\n');
        for (let i = 0; i < lines.length; i += maxLines) {
        out.push(lines.slice(i, i + maxLines).join('\n'));
        }
    }
    return out.length > 0 ? out : [''];
    }

  private openPage(index: number): void {
    this.pageIndex = index;
    this.typeTimer?.remove();
    this.stopIndicator();

    this.wrappedCurrent = this.bodyText.runWordWrap(this.pages[index]);
    this.charIndex = 0;
    this.bodyText.setText('');

    this.typeTimer = this.time.addEvent({
      delay: TYPE_SPEED_MS,
      loop: true,
      callback: this.revealNextChar,
      callbackScope: this,
    });
  }

  private revealNextChar(): void {
    this.charIndex++;
    this.bodyText.setText(this.wrappedCurrent.slice(0, this.charIndex));
    if (this.charIndex >= this.wrappedCurrent.length) this.finishTyping();
  }

  private finishTyping(): void {
    this.typeTimer?.remove();
    this.charIndex = this.wrappedCurrent.length; // <-- the fix: mark page as fully revealed
    this.bodyText.setText(this.wrappedCurrent);
    this.startIndicator();
  }

  /** Enter / tap: finish the current page instantly, otherwise next page (or close). */
  private advance(): void {
    if (!this.open) return;
    if (this.charIndex < this.wrappedCurrent.length) {
      this.finishTyping();
      return;
    }
    if (this.pageIndex < this.pages.length - 1) {
      this.openPage(this.pageIndex + 1);
      return;
    }
    this.close();
  }

  private close(): void {
    const cb = this.onCompleteCb;
    this.hide();
    cb?.();
  }
}