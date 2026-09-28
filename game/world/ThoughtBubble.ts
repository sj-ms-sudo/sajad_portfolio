import Phaser from 'phaser';

export interface ThoughtBubbleOptions {
  /** Sequence of short thoughts shown one at a time above the player. */
  messages: string[];
  /** How long each message stays up before advancing (ms). Default 1800. */
  msPerMessage?: number;
  /** Vertical distance above the follow target (usually the player's head), in px. */
  offsetY?: number;
  /** If true, ends the sequence shortly after the player first moves. Default true. */
  dismissOnMove?: boolean;
  /** Grace period after movement before the bubble actually closes (ms). Default 900. */
  moveGraceMs?: number;
  onComplete?: () => void;
}

const FONT_SIZE = 14;
const PADDING_X = 12;
const PADDING_Y = 8;
const BUBBLE_FILL = 0xf8f8f8;
const BUBBLE_BORDER = 0x383840;
const TEXT_COLOR = '#383840';

/**
 * A small, non-blocking speech/thought bubble that floats above a target
 * (the player) and cycles through a handful of short messages on a timer.
 * Unlike DialogueScene, this never captures input or pauses the world —
 * it's meant only for the spawn-intro tutorial beats, so the player can
 * walk around while it plays out.
 */
export class ThoughtBubble extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private tail: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;

  private messages: string[] = [];
  private index = 0;
  private msPerMessage = 1800;
  private offsetY = 70;
  private dismissOnMove = true;
  private moveGraceMs = 900;
  private onCompleteCb?: () => void;

  private advanceTimer?: Phaser.Time.TimerEvent;
  private fadeTween?: Phaser.Tweens.Tween;
  private hasMoved = false;
  private running = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(900); // above world/sprites, below the blocking DialogueScene (1000)

    this.bg = scene.add.graphics();
    this.tail = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: '"Silkscreen", monospace',
        fontSize: `${FONT_SIZE}px`,
        fontStyle: 'bold',
        color: TEXT_COLOR,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add([this.bg, this.tail, this.label]);
    this.setVisible(false);
    this.setAlpha(0);
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Call every frame (or on player move) with the player's world position. */
  followTarget(x: number, y: number): void {
    this.setPosition(x, y - this.offsetY);
  }

  /** Call this as soon as the player provides movement input. */
  notifyPlayerMoved(): void {
    if (!this.running || this.hasMoved) return;
    this.hasMoved = true;
    if (this.dismissOnMove) {
      // Let the current thought finish its beat rather than vanish mid-word.
      this.advanceTimer?.remove();
      this.advanceTimer = this.scene.time.delayedCall(this.moveGraceMs, () => this.finish());
    }
  }

  start(opts: ThoughtBubbleOptions): void {
    this.messages = opts.messages.length > 0 ? opts.messages : [''];
    this.msPerMessage = opts.msPerMessage ?? 1800;
    this.offsetY = opts.offsetY ?? 70;
    this.dismissOnMove = opts.dismissOnMove ?? true;
    this.moveGraceMs = opts.moveGraceMs ?? 900;
    this.onCompleteCb = opts.onComplete;
    this.hasMoved = false;
    this.running = true;

    this.setVisible(true);
    this.showMessage(0);
  }

  /** Instantly hide, cancel timers, no onComplete call. */
  cancel(): void {
    this.advanceTimer?.remove();
    this.fadeTween?.remove();
    this.running = false;
    this.setVisible(false);
    this.setAlpha(0);
  }

  private showMessage(i: number): void {
    this.index = i;
    this.label.setText(this.messages[i]);
    this.redraw();

    this.fadeTween?.remove();
    this.setAlpha(0);
    this.fadeTween = this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 160,
      ease: 'Sine.easeOut',
    });

    this.advanceTimer?.remove();
    this.advanceTimer = this.scene.time.delayedCall(this.msPerMessage, () => this.advance());
  }

  private advance(): void {
  if (this.index < this.messages.length - 1) {
    this.showMessage(this.index + 1);
  } else {
    this.finish();
  }
}


  private redraw(): void {
    const w = Math.max(40, this.label.width + PADDING_X * 2);
    const h = this.label.height + PADDING_Y * 2;

    this.bg.clear();
    this.bg.fillStyle(BUBBLE_BORDER, 1).fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
    this.bg.fillStyle(BUBBLE_FILL, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.label.setPosition(0, 0);

    // Tail dots point down toward the player's head.
    this.tail.clear();
    this.tail.fillStyle(BUBBLE_BORDER, 1);
    this.tail.fillCircle(0, h / 2 + 8, 4);
    this.tail.fillCircle(4, h / 2 + 16, 2.5);
  }

  private finish(): void {
    this.advanceTimer?.remove();
    this.running = false;
    this.fadeTween?.remove();
    this.fadeTween = this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.setVisible(false);
        this.onCompleteCb?.();
      },
    });
  }

  destroy(fromScene?: boolean): void {
    this.advanceTimer?.remove();
    this.fadeTween?.remove();
    super.destroy(fromScene);
  }
}