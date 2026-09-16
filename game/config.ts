import Phaser from 'phaser';
import { SandboxScene, WORLD_WIDTH, WORLD_HEIGHT } from './scenes/SandboxScene';


export const ZOOM = 3;

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    zoom: ZOOM,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#0a0a0c', 
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [SandboxScene],
  };
}