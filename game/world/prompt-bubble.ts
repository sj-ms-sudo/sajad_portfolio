import Phaser from 'phaser';

const DARK = 0x8a0f6e, PINK = 0xff8fe8, LIGHT = 0xfff0fb, MID = 0xffc8f4;

/**
 * The little pink pixel "window" that floats above something you can interact with
 * (same look as the quest-marker prompt in PoiSystem).
 */
export class PromptBubble {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly root: Phaser.GameObjects.Container;
  private label = '';

  constructor(scene: Phaser.Scene, depth = 101) {
    this.gfx = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', { fontFamily: '"Silkscreen", "Courier New", monospace', fontStyle: 'bold', fontSize: '10px', color: '#8a0f6e' })
      .setOrigin(0.5, 0);
    this.root = scene.add.container(0, 0, [this.gfx, this.text]).setDepth(depth).setVisible(false);
  }

  /** x = centre of the bubble, y = its bottom edge. */
  show(label: string, x: number, y: number): void {
    this.setLabel(label);
    this.root.setPosition(x, y).setVisible(true);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  private setLabel(label: string): void {
    if (this.label === label) return;
    this.label = label;
    this.text.setText(label);

    const BAR = 14;
    const innerW = Math.ceil(this.text.width) + 20;
    const innerH = Math.ceil(this.text.height) + 10;
    const w = innerW + 8;
    const h = BAR + innerH + 4;
    const x = -w / 2;
    const y = -h; // container origin is the bottom-centre of the box

    const g = this.gfx;
    g.clear();
    g.fillStyle(DARK, 1).fillRect(x + 2, y, w - 4, h).fillRect(x, y + 2, w, h - 4);
    g.fillStyle(PINK, 1).fillRect(x + 2, y + 2, w - 4, h - 4);
    for (let i = 0; i < 3; i++) {
      const bx = x + w - 13 - i * 9;
      const by = y + 3;
      g.fillStyle(DARK, 1).fillRect(bx, by, 7, 7);
      g.fillStyle(MID, 1).fillRect(bx + 1, by + 1, 5, 5);
    }
    g.fillStyle(DARK, 1).fillRect(x + 4, y + BAR, w - 8, innerH);
    g.fillStyle(LIGHT, 1).fillRect(x + 6, y + BAR + 2, w - 12, innerH - 4);

    this.text.setPosition(0, y + BAR + 5);
  }
}