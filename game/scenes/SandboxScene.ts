import Phaser from 'phaser';

/** Single source of truth for the map contract. Must match MAP-SPEC.md. */
export const MAP = {
  jsonKey: 'v0-sandbox',
  jsonPath: '/maps/v0-sandbox.json',
  tilesetKey: 'sajad-city-16',
  /** The tileset's `name` field *inside* the Tiled JSON. Not the loader key. */
  tilesetNameInTiled: 'sajad-city-16',
  tilesetPath: '/tilesets/sajad-city-16.png',
  widthInTiles: 20,
  heightInTiles: 15,
  tileWidth: 16,
  tileHeight: 16,
} as const;

export const WORLD_WIDTH = MAP.widthInTiles * MAP.tileWidth;   // 320
export const WORLD_HEIGHT = MAP.heightInTiles * MAP.tileHeight; // 240

/** Player spawn, in tile coordinates. NW plaza — clear of the road and buildings. */
export const PLAYER_SPAWN_TILE = { x: 7, y: 3 } as const;

export const PLAYER = {
  idlekey: 'player-idle',
  idlePath: '/sprites/player_idle.png',
  idleFrameWidth: 32,
  idleFrameHeight: 48,

  walkDownKey: 'player-walk-down',
  walkDownPath: '/sprites/player_walk_down.png',
  walkFrameWidth: 32,
  walkFrameHeight: 48,

  walkUpKey: 'player-walk-up',
  walkUpPath: '/sprites/player_walk_up.png',

  walkLeftKey:'player-walk-left',
  walkLeftPath:'/sprites/player_walk_left.png',

  walkRightKey:'player-walk-right',
  walkRightPath:'/sprites/player_walk_right.png',
} as const

export const ANIM = {
  idle: 'idle',
  walkDown : 'walk-down',
  walkUp :'walk-up',
  walkLeft:'walk-left',
  walkRight:'walk-right',
} as const

export class SandboxScene extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private downKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private leftKey!:Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('SandboxScene');
  }

  preload() {
    // The tileset image referenced inside the Tiled JSON is NOT auto-loaded.
    // Phaser needs it as a separate image asset.
    this.load.image(MAP.tilesetKey, MAP.tilesetPath);
    this.load.tilemapTiledJSON(MAP.jsonKey, MAP.jsonPath);


    this.load.spritesheet(PLAYER.idlekey, PLAYER.idlePath, {
  frameWidth: PLAYER.idleFrameWidth,
  frameHeight: PLAYER.idleFrameHeight
});

    this.load.spritesheet(PLAYER.walkDownKey,PLAYER.walkDownPath,{
      frameWidth:PLAYER.walkFrameWidth,
      frameHeight:PLAYER.walkFrameHeight,
    })
  
  this.load.spritesheet(PLAYER.walkUpKey,PLAYER.walkUpPath,{
    frameWidth:PLAYER.walkFrameWidth,
    frameHeight:PLAYER.walkFrameHeight,
  })

  this.load.spritesheet(PLAYER.walkLeftKey,PLAYER.walkLeftPath,{
    frameWidth:PLAYER.walkFrameWidth,
    frameHeight:PLAYER.idleFrameHeight,
  })

  this.load.spritesheet(PLAYER.walkRightKey,PLAYER.walkRightPath,{
    frameWidth:PLAYER.walkFrameWidth,
    frameHeight:PLAYER.walkFrameHeight,
  })

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[SandboxScene] 404 or load failure: ${file.key} -> ${file.url}`);
    });
  }

  create() {
    const map = this.make.tilemap({ key: MAP.jsonKey });

    // Arg 1 = tileset name inside the Tiled JSON. Arg 2 = the loader key above.
    // If arg 1 is wrong, this returns null and the map renders blank in silence.
    const tileset = map.addTilesetImage(MAP.tilesetNameInTiled, MAP.tilesetKey);
    if (!tileset) {
      throw new Error(
        `[SandboxScene] Tileset "${MAP.tilesetNameInTiled}" not found in ${MAP.jsonPath}. ` +
          `Tilesets present: ${map.tilesets.map((t) => t.name).join(', ') || '(none)'}`,
      );
    }

    this.groundLayer = this.requireLayer(map, 'ground', tileset);

    // Created now, populated in v0.3. Keeping it here means the collision work
    // is a one-line change later instead of a refactor.
    this.collisionLayer = this.requireLayer(map, 'collision', tileset);
    // v0.3: this.collisionLayer.setCollisionByExclusion([-1, 0]);
    // v0.3: this.collisionLayer.setVisible(false); // collision tiles render visibly by default

    // Sanity check: the map's own numbers vs. what we hardcoded.
    if (map.widthInPixels !== WORLD_WIDTH || map.heightInPixels !== WORLD_HEIGHT) {
      console.warn(
        `[SandboxScene] Map size drift: JSON says ${map.widthInPixels}x${map.heightInPixels}, ` +
          `code expects ${WORLD_WIDTH}x${WORLD_HEIGHT}. Update MAP in this file.`,
      );
    }

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

       this.player = this.createPlayer();
    this.createPlayerAnims();

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.downKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.upKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.leftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.player.play(ANIM.idle, true);
    // v0.1.2 onward: input + movement, collider against collisionLayer, camera follow.
  }

  update() {
    const goingDown = this.cursors.down?.isDown || this.downKey.isDown;
    const goingUp = this.cursors.up?.isDown || this.upKey.isDown;
    const goingLeft = this.cursors.left?.isDown || this.leftKey.isDown;
    const goingRight = this.cursors.right?.isDown || this.rightKey.isDown;
    this.player.setFlipX(false);

    if (goingUp){
      this.player.setVelocity(0,-60);
      if (this.player.anims.currentAnim?.key !== ANIM.walkUp){
        this.player.play(ANIM.walkUp,true);
      }
      return;
    }

    if (goingDown) {
      this.player.setVelocity(0, 60);
      if (this.player.anims.currentAnim?.key !== ANIM.walkDown) {
        this.player.play(ANIM.walkDown, true);
      }
      return;
    }

    if (goingLeft){
      this.player.setVelocity(-60,0);
      if (this.player.anims.currentAnim?.key !== ANIM.walkLeft){
        this.player.play(ANIM.walkLeft,true)
      }
      return;
    }

    if (goingRight){
      this.player.setVelocity(60,0);
      if (this.player.anims.currentAnim?.key !== ANIM.walkRight){
        this.player.play(ANIM.walkRight,true);
      }
      return;
    }

    this.player.setVelocity(0, 0);
    if (this.player.anims.currentAnim?.key !== ANIM.idle) {
      this.player.play(ANIM.idle, true);
    }
  }

  private createPlayer(): Phaser.Physics.Arcade.Sprite {
  const spawnX = PLAYER_SPAWN_TILE.x * MAP.tileWidth + MAP.tileWidth / 2;
  const spawnY = (PLAYER_SPAWN_TILE.y + 1) * MAP.tileHeight; // bottom edge of the spawn tile

  const player = this.physics.add.sprite(spawnX, spawnY, PLAYER.idlekey);
  player.setOrigin(0.5, 1); // bottom-center, so feet sit on the tile, not the sprite's vertical middle
  player.body.setSize(16, 10);
  player.body.setOffset(8, 38); // shrinks the hitbox to the feet, not the full 32x48 frame
  player.setCollideWorldBounds(true);

  return player;
}

  private createPlayerAnims(){
    // this.anims.create({
    //   key:ANIM.idle,
    //   frames:this.anims.generateFrameNumbers(PLAYER.idlekey,{start:0,end:4}),
    //   frameRate:3,
    //   repeat:-1,
    // });
this.anims.create({
  key: ANIM.idle,
  frames: [
    { key: PLAYER.idlekey, frame: 1, duration: 2000 },
    { key: PLAYER.idlekey, frame: 2, duration: 2000 },  // the blink frame — quick flash
    { key: PLAYER.idlekey, frame: 3, duration: 2000 },
  ],
  repeat: -1,
});

    this.anims.create({
      key:ANIM.walkDown,
      frames:this.anims.generateFrameNumbers(PLAYER.walkDownKey,{start:0,end:3}),
      frameRate:8,
      repeat:-1,
    })

  this.anims.create({
    key:ANIM.walkUp,
    frames:this.anims.generateFrameNumbers(PLAYER.walkUpKey,{start:0,end:3}),
    frameRate:8,
    repeat:-1,
  })

  this.anims.create({
    key:ANIM.walkLeft,
    frames:this.anims.generateFrameNumbers(PLAYER.walkLeftKey,{start:0,end:3}),
    frameRate:8,
    repeat:-1,
  })

  this.anims.create({
    key:ANIM.walkRight,
    frames:this.anims.generateFrameNumbers(PLAYER.walkRightKey,{start:0,end:3}),
    frameRate:8,
    repeat:-1,
  })
  }


  /** createLayer() returns null on a name mismatch. Fail loudly instead. */
  private requireLayer(
    map: Phaser.Tilemaps.Tilemap,
    name: string,
    tileset: Phaser.Tilemaps.Tileset,
  ): Phaser.Tilemaps.TilemapLayer {
    const layer = map.createLayer(name, tileset, 0, 0);
    if (!layer) {
      throw new Error(
        `[SandboxScene] Layer "${name}" not found. ` +
          `Layers present: ${map.layers.map((l) => l.name).join(', ') || '(none)'}`,
      );
    }
    if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) {
      throw new Error(
        `[SandboxScene] Layer "${name}" came back as a GPU layer. ` +
          `Collision needs a CPU TilemapLayer — drop the gpu flag.`,
      );
    }
    return layer;
  }
}