import Phaser from "phaser";
import { Coast,COAST,preloadCoast,withCoastExtras,GALLERY_DOOR,type CoastData,type ExitDef } from "../../world/frontend";
import { isPageExit } from "../../../district-routes";
import {BOOT} from '../../../boot-events'
import { Joystick, isTouchUI } from "@/components/ui/joystick";
import { LIGHTHOUSE } from "../../lighthouse-events";
import { NAVIGATION } from "../../../navigation-events";
import { NpcSystem, yDepth } from "../../../world/npc-system";
import { DialogueScene } from "../../../scenes/DialogueScene";
import type { DistrictData } from "../../../world/district";
import { COAST_NPCS } from "../../data/coast-npcs";


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

export class CoastScene extends Phaser.Scene{
    private player!:Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: Record<'up'|'down'|'left'|'right', Phaser.Input.Keyboard.Key>;
    private coast!: Coast;
    private joystick!: Joystick;
    private exitThisFrame:ExitDef | null = null;
    private lastExit = '';
    private spawnName = 'start';
    private locked = false;
    private canEnter = false;
    private nearDoor = false;
    private enterKeys!: Phaser.Input.Keyboard.Key[];
    private doorHint!: Phaser.GameObjects.Text;
    private nearGallery = false;
    private doorTarget: 'LighthouseScene' | 'GalleryScene' | null = null;
    private galleryHint!: Phaser.GameObjects.Text;
    private npcs!: NpcSystem;
    private dialogue!: DialogueScene;

    constructor(){
        super('CoastScene');
    }

        init(data?: { spawn?: string }): void {
        this.spawnName = data?.spawn ?? (this.registry.get('spawn') as string | undefined) ?? 'start';
        this.registry.remove('spawn'); // one-shot: later restarts (e.g. coming back from the lighthouse) must not reuse it
        this.locked = false;
        this.canEnter = false;
        this.nearDoor = false;
        this.nearGallery = false;
        this.doorTarget = null;
        this.exitThisFrame = null;
        this.lastExit = '';
    }

    preload():void {
        this.trackLoadProgress();
        preloadCoast(this);
        NpcSystem.preload(this, COAST_NPCS);
        const sheets:[string,string][]=[
            [PLAYER.idleKey, PLAYER.idlePath], [PLAYER.walkDownKey, PLAYER.walkDownPath], [PLAYER.walkUpKey, PLAYER.walkUpPath],
                  [PLAYER.walkLeftKey, PLAYER.walkLeftPath], [PLAYER.walkRightKey, PLAYER.walkRightPath],
        ];
        for (const [key,path] of sheets) this.load.spritesheet(key,path,{frameWidth : PLAYER.frameWidth,frameHeight:PLAYER.frameHeight});
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR,(file:Phaser.Loader.File)=>{
            console.error(`[CoastScene] load failure: ${file.key} -> ${file.url}`);
            this.game.events.emit(BOOT.error,file.key);
        });
    }

    create():void{
        const data = withCoastExtras(this.cache.json.get(COAST.dataKey) as CoastData);
        this.coast = new Coast(this,data,DEBUG_COLLISION);
        this.game.events.on(LIGHTHOUSE.travel, this.travelToBinoculars, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(LIGHTHOUSE.travel, this.travelToBinoculars, this));

        const start = data.spawns[this.spawnName] ?? data.spawns.start;
        this.player = this.createPlayer(start.x,start.y);
        this.createPlayerAnims();
        this.coast.attachPlayer(this.player,(exit)=>{this.exitThisFrame=exit;});

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

        this.player.play(ANIM.idle,true);

        this.joystick = new Joystick({ onAction: () => (this.npcs.isNear ? this.npcs.interact() : this.tryEnter()) });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.joystick.destroy());

        // Lighthouse door
        this.enterKeys = [kb.addKey(Phaser.Input.Keyboard.KeyCodes.E), kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)];
        for (const d of data.doors ?? []) {
            const z = this.add.zone(d.x + d.w / 2, d.y + d.h / 2, d.w, d.h);
            this.physics.add.existing(z, true);
            this.physics.add.overlap(this.player, z, () => { this.nearDoor = true; });
        }
        this.doorHint = this.add.text(239, 756, isTouchUI() ? 'TAP A TO ENTER' : 'PRESS E TO ENTER', {
            fontFamily: '"Silkscreen","Courier New",monospace', fontSize: '8px', color: '#fff0fb',
            backgroundColor: '#8a0f6e', padding: { x: 3, y: 2 },
        }).setOrigin(0.5, 0).setDepth(1000).setVisible(false);


        
        // Art gallery door (the arched entrance of the big hall)
        const gz = this.add.zone(GALLERY_DOOR.x + GALLERY_DOOR.w / 2, GALLERY_DOOR.y + GALLERY_DOOR.h / 2, GALLERY_DOOR.w, GALLERY_DOOR.h);
        this.physics.add.existing(gz, true);
        this.physics.add.overlap(this.player, gz, () => { this.nearGallery = true; });
        this.galleryHint = this.add.text(GALLERY_DOOR.x + GALLERY_DOOR.w / 2, GALLERY_DOOR.y + GALLERY_DOOR.h + 6,
            isTouchUI() ? 'TAP A · ART GALLERY' : 'PRESS E · ART GALLERY', {
            fontFamily: '"Silkscreen","Courier New",monospace', fontSize: '8px', color: '#fff0fb',
            backgroundColor: '#8a0f6e', padding: { x: 3, y: 2 },
        }).setOrigin(0.5, 0).setDepth(1000).setVisible(false);

        // NPCs (Gully the seagull, Finn the shark) talk through the same DialogueScene the General district uses
        this.scene.launch(DialogueScene.KEY);
        this.dialogue = this.scene.get(DialogueScene.KEY) as DialogueScene;
        this.npcs = new NpcSystem(this, data as unknown as DistrictData, this.player, this.dialogue, COAST_NPCS);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(DialogueScene.KEY));

        this.game.events.emit(BOOT.ready);
    }

    private trackLoadProgress():void {
        const weights = new Map<string,number>();
        const done = new Map<string,number>();
        const idOf = (key:string,type:string) => `${type}:${key}`;
        const emit = ()=> {
            let total = 0;
            let sum = 0
            weights.forEach((w,id)=>{
                total+=w;
                sum+=w*(done.get(id)??0);
            });
            this.game.events.emit(BOOT.progress,total?sum/total:0);
        };
        this.load.on(Phaser.Loader.Events.ADD,(key:string,type:string)=>{
            weights.set(idOf(key,type),key === COAST.bgKey ?6:1);
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

    update(_time:number,delta:number):void{
        
        // this.joystick.setActive(free);
        this.player.setDepth(yDepth(this.player.y)); // y-sorted together with the NPCs
        this.npcs.update(delta);

        // NPC talk prompt / dialogue (only while the player is free to act)
        const npcNear = !this.locked && !this.dialogue.isOpen ? this.npcs.handleInteraction() : false;
        if (this.dialogue.isOpen) { this.stop(); return; }

        const nearLighthouse = this.nearDoor;
        const nearGallery = this.nearGallery;
        this.nearDoor = false;
        this.nearGallery = false;
        this.doorTarget = nearGallery ? 'GalleryScene' : nearLighthouse ? 'LighthouseScene' : null;
        this.canEnter = this.doorTarget !== null && !this.locked && !npcNear;
        this.doorHint.setVisible(this.canEnter && this.doorTarget === 'LighthouseScene');
        this.galleryHint.setVisible(this.canEnter && this.doorTarget === 'GalleryScene');
        this.joystick.setActionReady(this.canEnter || npcNear);
        if (this.locked) { this.player.setVelocity(0, 0); return; }
        if (this.enterKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) this.tryEnter();
        if (this.locked) return;

        const exit = this.exitThisFrame;
        this.exitThisFrame = null;
        if (!exit) this.lastExit='';
        else if (exit.name !== this.lastExit){
            this.lastExit = exit.name;
            if (isPageExit(exit.name)) { this.leaveTo(exit); return; }
            console.info(`[CoastScene] reached exit "${exit.name}" -> ${exit.target} (spawn ${exit.spawn})`);

        }

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

    private travelToBinoculars(showcaseId: string): void {
        if (!showcaseId || this.locked) return;
        this.locked = true;
        this.player.setVelocity(0, 0);
        this.player.play(ANIM.idle, true);
        this.joystick.setActive(false);
        this.cameras.main.fadeOut(250, 10, 10, 12);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('LighthouseScene', { spawn: 'from-binoculars', showcaseId });
        });
    }

    private tryEnter(): void {
        if (!this.canEnter || this.locked) return;
        const target = this.doorTarget ?? 'LighthouseScene';
        this.locked = true;
        this.player.setVelocity(0, 0);
        this.player.play(ANIM.idle, true);
        this.joystick.setActive(false);
        this.cameras.main.fadeOut(250, 10, 10, 12);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => this.scene.start(target));
    }

    /** Walking off the map into another district: fade out, then the React canvas navigates to that district's page. */
    private leaveTo(exit: ExitDef): void {
        if (this.locked) return;
        this.locked = true;
        this.player.setVelocity(0, 0);
        this.player.play(ANIM.idle, true);
        this.joystick.setActive(false);
        this.cameras.main.fadeOut(250, 10, 10, 12);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => this.game.events.emit(NAVIGATION.leaveDistrict, exit.target, exit.spawn));
    }

    private onLighthouseClosed(): void {
        this.cameras.main.fadeIn(300, 10, 10, 12);
        this.locked = false;
        this.joystick.setActive(true);
    }

  private walk(vx: number, vy: number, anim: string): void {
  this.player.setVelocity(vx, vy);
  if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);
//   if (!this.thoughtMovedOnce) {
//     this.thoughtMovedOnce = true;
//     this.thought.notifyPlayerMoved();
//   }
}

    private walkAnalog(x: number, y: number): void {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    
    
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
    player.setOrigin(0.5, 1);            
    player.body!.setSize(16, 10);        
    player.body!.setOffset(8, 38);
    player.setCollideWorldBounds(true);
    return player;
    }

    private createPlayerAnims(): void {
    if (this.anims.exists(ANIM.idle)) return;
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