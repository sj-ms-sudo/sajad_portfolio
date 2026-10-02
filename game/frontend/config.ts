// import { WORLD_HEIGHT, WORLD_WIDTH } from "../scenes/SandboxScene";
import { CoastScene } from "./game/scenes/CoastScene";
import Phaser from "phaser";
import { LighthouseScene } from "./game/scenes/LighthouseScene";

export const ZOOM = 3;

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    // width: WORLD_WIDTH,
    // height: WORLD_HEIGHT,
    zoom: ZOOM,
    pixelArt:true,
    roundPixels: true,
    backgroundColor: '#0a0a0c', 
    scale: {
      mode: Phaser.Scale.RESIZE,
      width:'100%',
      height:'100%',
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    // DialogueScene runs in parallel on top of DistrictScene as a screen-fixed UI layer
    // (its own camera stays at zoom 1, unaffected by the world camera's zoom/scroll).
    scene: [CoastScene,LighthouseScene],
  };
}