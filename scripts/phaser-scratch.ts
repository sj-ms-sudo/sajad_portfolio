
import Phaser from "phaser";


// An empty scene , just for testing

class EmptyScene extends Phaser.Scene {
  constructor() {
    super({ key: "EmptyScene" });
  }

  preload(): void {
    // Intentionally empty — nothing to load yet.
  }

  create(): void {
    // Intentionally empty — nothing to render yet.
  }

  update(_time: number, _delta: number): void {
    // Intentionally empty — no game loop logic yet.
  }
}


const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  backgroundColor: "#1d1d1d",
  scene: [EmptyScene],
};

export { config, EmptyScene };