import Phaser from 'phaser';
import type { DistrictData } from './district';
import type { DialogueScene } from '../scenes/DialogueScene';
import { isTouchUI } from '../../components/ui/joystick';
import { NPCS, type NpcDef, type NpcFacing } from '../data/npcs';
import { PromptBubble } from './prompt-bubble';

/**
 * Depth used for y-sorting: things lower on the map draw in front of things higher up.
 * Stays far below the quest markers / prompts (depth 90+), so those still draw on top.
 */
export const yDepth = (y: number): number => 1 + y / 100000;

type Facing = NpcFacing;
const ROW: Record<Facing, number> = { down: 0, up: 1, left: 2, right: 3 };
const FACINGS = Object.keys(ROW) as Facing[];

interface Npc {
  def: NpcDef;
  sprite: Phaser.GameObjects.Sprite;
  /** Spawn point: where a still NPC stands / the centre of an orbiting NPC's circle. */
  home: { x: number; y: number };
  /** Ground position (feet). The sprite may sit a few px higher while hopping. */
  x: number;
  y: number;
  clock: string;
  facing: Facing;
  hopPhase: number;
}

/**
 * Spawns the NPCs from data/npcs.ts, moves them, shows a prompt when the player is close and starts the dialogue.
 *
 * In the scene:
 *   preload():  NpcSystem.preload(this);
 *   create():   this.npcs = new NpcSystem(this, data, this.player, this.dialogue);
 *   update():   this.npcs.update(delta);                       // every frame, always
 *               const near = this.npcs.handleInteraction();    // only while the player is free to act
 */
export class NpcSystem {
  static preload(scene: Phaser.Scene): void {
    for (const { sheet } of NPCS) {
      scene.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
  }

  private readonly npcs: Npc[] = [];
  private readonly clocks = new Map<string, number>();
  private readonly frozen = new Set<string>();
  private readonly prompt: PromptBubble;
  private readonly interactKey: Phaser.Input.Keyboard.Key;
  private interactQueued = false;
  private promptUsed = false;
  private nearest: Npc | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    data: DistrictData,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly dialogue: DialogueScene,
  ) {
    this.prompt = new PromptBubble(scene);
    this.interactKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    for (const def of NPCS) this.spawn(def, data);
  }

  /** True while the player is within reach of some NPC (decided on the last handleInteraction call). */
  get isNear(): boolean {
    return this.nearest !== null;
  }

  /** Touch equivalent of pressing E. */
  interact(): void {
    this.interactQueued = true;
  }

  // ---------------------------------------------------------------- per frame

  /** Moves everybody. Call every frame, even while a dialogue / panel is open. */
  update(deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    for (const [key, t] of this.clocks) if (!this.frozen.has(key)) this.clocks.set(key, t + dt);
    for (const n of this.npcs) this.place(n);

    // If handleInteraction() wasn't called this frame (overlay open), don't leave a stale prompt hanging.
    if (!this.promptUsed) this.prompt.hide();
    this.promptUsed = false;
  }

  /**
   * Shows the "Press E to talk" prompt for the closest NPC in reach and starts the dialogue on E / the A button.
   * Returns true if an NPC is in reach (the caller should then keep the quest-marker prompt quiet).
   */
  handleInteraction(): boolean {
    const tapped = this.interactQueued;
    this.interactQueued = false;
    this.promptUsed = true;

    let best: Npc | null = null;
    let bestDist = Infinity;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d <= n.def.reach && d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    this.nearest = best;

    if (!best) {
      this.prompt.hide();
      return false;
    }

    const press = isTouchUI() ? 'Tap A' : 'Press E';
    this.prompt.show(`${press} to talk to ${best.def.name}`, best.x, best.y - best.def.sheet.frameHeight - 2);
    if (Phaser.Input.Keyboard.JustDown(this.interactKey) || tapped) this.talk(best);
    return true;
  }

  // ---------------------------------------------------------------- setup

  private spawn(def: NpcDef, data: DistrictData): void {
    const home = this.resolveSpawn(def, data);

    this.createAnims(def);

    const sprite = this.scene.add.sprite(home.x, home.y, def.sheet.key, def.portraitFrame).setOrigin(0.5, 1);
    const npc: Npc = {
      def,
      sprite,
      home,
      x: home.x,
      y: home.y,
      clock: def.motion.type === 'orbit' ? (def.motion.clock ?? def.id) : def.id,
      facing: 'down',
      hopPhase: this.npcs.length * 1.7,
    };
    if (!this.clocks.has(npc.clock)) this.clocks.set(npc.clock, 0);
    sprite.setDepth(yDepth(home.y));

    if (def.motion.type !== 'orbit' && def.motion.solid) {
      // Invisible static box at the feet, like the map's blockers.
      const { w, h } = def.motion.solid;
      const box = this.scene.add.rectangle(home.x, home.y - h / 2, w, h, 0xff0000, 0);
      this.scene.physics.add.existing(box, true);
      this.scene.physics.add.collider(this.player, box);
    }
    if (def.motion.type === 'still') {
      if (def.anim.type === 'loop') sprite.play(`${def.id}-loop`);
    } else {
      this.place(npc); // put them on their circle / in their first pose straight away
    }
    this.npcs.push(npc);
  }

  private resolveSpawn(def: NpcDef, data: DistrictData): { x: number; y: number } {
    const found = data.spawns[def.spawn.name];
    if (found) return { x: found.x, y: found.y };
    const start = data.spawns.start;
    return { x: start.x + def.spawn.fallback.dx, y: start.y + def.spawn.fallback.dy };
  }

  private createAnims(def: NpcDef): void {
    const { anims } = this.scene;
    const { key } = def.sheet;
    const a = def.anim;

    if (a.type === 'directional') {
      for (const dir of FACINGS) {
        const animKey = `${def.id}-walk-${dir}`;
        if (anims.exists(animKey)) continue;
        const start = ROW[dir] * (a.columns ?? a.frames);
        anims.create({
          key: animKey,
          frames: anims.generateFrameNumbers(key, { start, end: start + a.frames - 1 }),
          frameRate: a.frameRate,
          repeat: -1,
        });
      }
    } else {
      const animKey = `${def.id}-loop`;
      if (anims.exists(animKey)) return;
      anims.create({
        key: animKey,
        frames: a.frames.map((f) => ({ key, frame: f.frame, duration: f.ms })),
        repeat: -1,
      });
    }
  }

  // ---------------------------------------------------------------- movement

  private place(n: Npc): void {
    const m = n.def.motion;
    if (m.type === 'still') {
      n.sprite.setDepth(yDepth(n.y));
      return;
    }
    if (m.type === 'look') {
      n.sprite.setDepth(yDepth(n.y));
      if (this.frozen.has(n.clock)) return; // she keeps facing you while you talk
      const t = this.clocks.get(n.clock) ?? 0;
      n.facing = m.order[Math.floor(t / m.hold) % m.order.length];
      n.sprite.setFrame(this.standFrame(n));
      return;
    }
    if (this.frozen.has(n.clock)) return;

    const dir = m.clockwise === false ? -1 : 1;
    const t = this.clocks.get(n.clock) ?? 0;
    const lag = m.lag ? m.lag + (m.lagWobble ?? 0) * Math.sin(t * 2.4) : 0;
    const angle = (m.phase ?? 0) + dir * ((Math.PI * 2 * t) / m.period - lag);

    n.x = n.home.x + Math.cos(angle) * m.radius;
    n.y = n.home.y + Math.sin(angle) * m.radius;
    const hop = m.hop ? Math.abs(Math.sin(t * 9 + n.hopPhase)) * m.hop : 0;
    n.sprite.setPosition(n.x, n.y - hop).setDepth(yDepth(n.y));

    // Direction of travel = the tangent of the circle.
    const vx = -Math.sin(angle) * dir;
    const vy = Math.cos(angle) * dir;
    if (n.def.anim.type === 'directional') {
      n.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      this.play(n, `${n.def.id}-walk-${n.facing}`);
    } else {
      n.sprite.setFlipX(vx < 0); // critter art faces right
      this.play(n, `${n.def.id}-loop`);
    }
  }

  /** Standing-pose frame for an NPC's current facing (directional sheets), or its portrait frame. */
  private standFrame(n: Npc): number {
    const a = n.def.anim;
    if (a.type !== 'directional') return n.def.portraitFrame;
    return ROW[n.facing] * (a.columns ?? a.frames) + (a.stand ?? 0);
  }

  private play(n: Npc, key: string): void {
    const anims = n.sprite.anims;
    if (anims.currentAnim?.key !== key || !anims.isPlaying) n.sprite.play(key, true);
  }

  // ---------------------------------------------------------------- talking

  private talk(n: Npc): void {
    if (!this.dialogue.isReady || this.dialogue.isOpen) return;

    this.prompt.hide();
    this.setFrozen(n.clock, true);
    this.faceToward(n);

    const press = isTouchUI() ? 'tap A' : 'press E';
    this.dialogue.show({
      speaker: n.def.name,
      portraitKey: n.def.sheet.key,
      portraitFrame: n.def.portraitFrame,
      pages: n.def.pages.map((p) => p.split('{press}').join(press)),
      onComplete: () => {
        this.setFrozen(n.clock, false);
        Phaser.Input.Keyboard.JustDown(this.interactKey); // swallow an E press that happened during the chat
      },
    });
  }

  /** Pause everybody on this clock (e.g. the mouse AND the bug) and leave them in a standing pose. */
  private setFrozen(clock: string, frozen: boolean): void {
    if (!frozen) {
      this.frozen.delete(clock);
      return;
    }
    this.frozen.add(clock);
    for (const n of this.npcs) {
      if (n.clock !== clock || n.def.motion.type !== 'orbit') continue; // the cat keeps licking, Meera keeps her pose
      n.sprite.anims.stop();
      n.sprite.setPosition(n.x, n.y);
      n.sprite.setFrame(this.standFrame(n));
    }
  }

  private faceToward(n: Npc): void {
    if (n.def.motion.type === 'still') return;
    const dx = this.player.x - n.x;
    const dy = this.player.y - n.y;
    if (n.def.anim.type === 'directional') {
      n.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      n.sprite.setFrame(this.standFrame(n));
    } else {
      n.sprite.setFlipX(dx < 0);
    }
  }
}