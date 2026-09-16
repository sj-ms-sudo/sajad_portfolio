import Phaser from 'phaser';

export const MAP = {
  jsonKey: 'v0-sandbox',
  jsonPath: '/maps/v0-sandbox.json',
  tilesetKey: 'sajad-city-16',
  tilesetNameInTiled: 'sajad-city-16',
  tilesetPath: '/tilesets/sajad-city-16.png',
  widthInTiles: 20,
  heightInTiles: 15,
  tileWidth: 16,
  tileHeight: 16,
} as const;

export const WORLD_WIDTH = MAP.widthInTiles * MAP.tileWidth;   // 320
export const WORLD_HEIGHT = MAP.heightInTiles * MAP.tileHeight; // 240

export class SandboxScene extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super('SandboxScene');
  }

  preload() {
    // The tileset image referenced inside the Tiled JSON is NOT auto-loaded.
    // Phaser needs it as a separate image asset.
    this.load.image(MAP.tilesetKey, MAP.tilesetPath);
    this.load.tilemapTiledJSON(MAP.jsonKey, MAP.jsonPath);

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.error(`[SandboxScene] 404 or load failure: ${file.key} -> ${file.url}`);
    });
  }

  create() {
    const map = this.make.tilemap({ key: MAP.jsonKey });


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


    if (map.widthInPixels !== WORLD_WIDTH || map.heightInPixels !== WORLD_HEIGHT) {
      console.warn(
        `[SandboxScene] Map size drift: JSON says ${map.widthInPixels}x${map.heightInPixels}, ` +
          `code expects ${WORLD_WIDTH}x${WORLD_HEIGHT}. Update MAP in this file.`,
      );
    }

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics?.world?.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
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
          `The collision layer needs a CPU TilemapLayer for physics — drop the gpu flag.`,
      );
    }
    return layer;
  }
}