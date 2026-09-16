"use client";


import { useEffect, useRef } from "react";
import Phaser from "phaser";


class EmptyScene extends Phaser.Scene {
  constructor() {
    super({ key: "EmptyScene" });
  }

  create(): void {

    this.cameras.main.setBackgroundColor("#1d1d1d");
  }
}

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);


  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {

    if (gameRef.current || !containerRef.current) {
      return;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 640,
      height: 480,
      parent: containerRef.current,
      backgroundColor: "#1d1d1d",
      scene: [EmptyScene],
    };

    gameRef.current = new Phaser.Game(config);


    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} />;
}