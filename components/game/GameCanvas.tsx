'use client';

import { useEffect, useRef } from 'react';



export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || gameRef.current) return;

    let cancelled = false;

    (async () => {
      const [{ default: Phaser }, { createGameConfig }] = await Promise.all([
        import('phaser'),
        import('@/game/config'),
      ]);
      if (cancelled || !containerRef.current) return;
      gameRef.current = new Phaser.Game(createGameConfig(containerRef.current));
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="inline-block leading-none" />;
}