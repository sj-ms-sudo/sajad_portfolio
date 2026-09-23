import Phaser from 'phaser';
import { CV } from '../data/cv';
import type { PoiDef } from './district';

/**
 * Shows an "E · Title" prompt when the player's feet are inside a POI rectangle and opens an HTML panel
 * with the matching entry from cv.ts.
 *
 * Usage in the scene:
 *   create():  this.poi = new PoiSystem(this, data.pois, this.player);
 *   update():  this.poi.update(); if (this.poi.isOpen) { this.player.setVelocity(0, 0); return; }
 */
export class PoiSystem {
  private readonly zones: { def: PoiDef; rect: Phaser.Geom.Rectangle }[];
  private readonly prompt: Phaser.GameObjects.Container;
  private readonly promptGfx: Phaser.GameObjects.Graphics;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly interactKey: Phaser.Input.Keyboard.Key;
  private readonly escKey: Phaser.Input.Keyboard.Key;
  private panel: HTMLDivElement | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    pois: PoiDef[],
    private readonly player: Phaser.GameObjects.Sprite,
  ) {
    this.zones = pois.map((def) => ({ def, rect: new Phaser.Geom.Rectangle(def.x, def.y, def.w, def.h) }));

    this.promptGfx = scene.add.graphics();
    this.promptText = scene.add
      .text(0, 0, '', { fontFamily: '"Silkscreen", "Courier New", monospace',fontStyle:'bold', fontSize: '10px', color: '#8a0f6e' })
      .setOrigin(0.5, 0);
    this.prompt = scene.add.container(0, 0, [this.promptGfx, this.promptText]).setDepth(100).setVisible(false);

    const kb = scene.input.keyboard!;
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.close());
  }

  get isOpen(): boolean {
    return this.panel !== null;
  }

  update(): void {
    if (this.panel) {
      if (Phaser.Input.Keyboard.JustDown(this.interactKey) || Phaser.Input.Keyboard.JustDown(this.escKey)) this.close();
      return;
    }

    // Player origin is bottom-centre, so (x, y) is the feet position. Nudge up 2px to stay inside the rectangle.
    const px = this.player.x;
    const py = this.player.y - 2;
    const near = this.zones.find((z) => Phaser.Geom.Rectangle.Contains(z.rect, px, py));

    if (!near) {
      this.prompt.setVisible(false);
      return;
    }
    this.setPrompt(`Press E to view ${near.def.title}`);
    this.prompt.setPosition(px, this.player.y - 52).setVisible(true);
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.open(near.def);
  }

  private setPrompt(label: string): void {
  if (this.promptText.text === label) return;
  this.promptText.setText(label);

  const DARK = 0x8a0f6e, PINK = 0xff8fe8, LIGHT = 0xfff0fb, MID = 0xffc8f4;
  const BAR = 14;
  const innerW = Math.ceil(this.promptText.width) + 20;
  const innerH = Math.ceil(this.promptText.height) + 10;
  const w = innerW + 8;
  const h = BAR + innerH + 4;
  const x = -w / 2;
  const y = -h; // container origin is bottom-centre of the box

  const g = this.promptGfx;
  g.clear();

  // outer window: notched corners for the pixel look
  g.fillStyle(DARK, 1).fillRect(x + 2, y, w - 4, h).fillRect(x, y + 2, w, h - 4);
  g.fillStyle(PINK, 1).fillRect(x + 2, y + 2, w - 4, h - 4);

  // title-bar buttons (minimise / maximise / close)
  for (let i = 0; i < 3; i++) {
    const bx = x + w - 13 - i * 9;
    const by = y + 3;
    g.fillStyle(DARK, 1).fillRect(bx, by, 7, 7);
    g.fillStyle(MID, 1).fillRect(bx + 1, by + 1, 5, 5);
  }

  // inner panel
  g.fillStyle(DARK, 1).fillRect(x + 4, y + BAR, w - 8, innerH);
  g.fillStyle(LIGHT, 1).fillRect(x + 6, y + BAR + 2, w - 12, innerH - 4);

  this.promptText.setPosition(0, y + BAR + 5);
}

  private open(poi: PoiDef): void {
  this.prompt.setVisible(false);
  const entry = CV[poi.id] ?? { title: poi.title, lines: ['No content yet for "' + poi.id + '" — add it to cv.ts.'] };

  const FONT = '"Silkscreen", "Courier New", monospace';
  const DARK = '#383840';
  const RED = '#d85848';
  const FILL = '#f8f8f8';

  // Tap/click anywhere outside the card closes it.
  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.55)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: '1000', fontFamily: FONT,
  });
  backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) this.close(); });

  // Wrapper holds the name tab so the scrolling card doesn't clip it.
  const wrap = document.createElement('div');
  Object.assign(wrap.style, { position: 'relative', width: 'min(520px, 90vw)', marginTop: '20px' });

  const tab = document.createElement('div');
  tab.textContent = entry.title;
  Object.assign(tab.style, {
    position: 'absolute', left: '14px', top: '-20px', padding: '4px 12px 6px',
    background: FILL, color: RED, fontWeight: 'bold', fontSize: '14px',
    border: `3px solid ${DARK}`, borderBottom: 'none', borderRadius: '8px 8px 0 0', zIndex: '1',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    background: FILL, color: DARK, border: `3px solid ${DARK}`, borderRadius: '8px',
    boxShadow: `inset 0 0 0 3px ${FILL}, inset 0 0 0 5px ${RED}`,
    padding: '22px 24px 16px', maxHeight: '70vh', overflowY: 'auto', lineHeight: '1.6', fontSize: '13px',
  });

  if (entry.subtitle) {
    const s = document.createElement('div');
    s.textContent = entry.subtitle;
    Object.assign(s.style, { opacity: '0.7', marginBottom: '10px' });
    card.appendChild(s);
  }

  const ul = document.createElement('ul');
  Object.assign(ul.style, { listStyle: 'none', padding: '0', margin: '0' });
  for (const line of entry.lines) {
    const li = document.createElement('li');
    li.textContent = '▸ ' + line;
    li.style.marginBottom = '8px';
    ul.appendChild(li);
  }
  card.appendChild(ul);

  for (const link of entry.links ?? []) {
    const a = document.createElement('a');
    a.textContent = link.label; a.href = link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    Object.assign(a.style, { display: 'block', color: RED, margin: '8px 0', textDecoration: 'underline' });
    card.appendChild(a);
  }

  const hint = document.createElement('div');
  hint.textContent = 'Tap outside or press E to close';
  Object.assign(hint.style, { marginTop: '14px', fontSize: '10px', opacity: '0.6', textAlign: 'right' });
  card.appendChild(hint);

  wrap.appendChild(tab);
  wrap.appendChild(card);
  backdrop.appendChild(wrap);
  document.body.appendChild(backdrop);
  this.panel = backdrop;
}

  private close(): void {
    this.panel?.remove();
    this.panel = null;
  }
}