'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingScreen from './LoadingScreen';
import { BOOT } from '@/game/boot-events';

/** Silkscreen comes from a Google Fonts @import, so make sure it is really there before Phaser draws any text. */
async function waitForFont(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px "Silkscreen"'), document.fonts.load('bold 16px "Silkscreen"')]),
      new Promise((resolve) => setTimeout(resolve, 3000)), // never block the game on a slow font
    ]);
  } catch {
    /* fall back to the system font */
  }
}

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);

  const [progress, setProgress] = useState(0.06);
  const [label, setLabel] = useState('Starting engine');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false);

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

      setProgress(0.12);
      setLabel('Loading fonts');
      await waitForFont();
      if (cancelled || !containerRef.current) return;

      setLabel('Loading the city');
      const game = new Phaser.Game(createGameConfig(containerRef.current));
      gameRef.current = game;

      // asset load progress (0..1) fills the rest of the bar
      game.events.on(BOOT.progress, (v: number) => {
        if (!cancelled) setProgress(0.15 + v * 0.8);
      });
      game.events.once(BOOT.ready, () => {
        if (cancelled) return;
        setProgress(1);
        setReady(true);
      });
      game.events.once(BOOT.error, () => {
        if (!cancelled) setFailed(true);
      });
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // remove the overlay from the DOM once its fade-out has finished
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <>
      <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} className="inline-block leading-none" />
      {!gone && <LoadingScreen progress={progress} label={ready ? 'Ready' : label} hidden={ready} error={failed} />}
    </>
  );
}
