'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from './LoadingScreen';
import { BOOT } from '@/game/boot-events';
import { DIALOGUE } from '@/game/dialogue-events';
import ComponentNavbar, { type ComponentNavLink } from '@/components/frontend/lighthouse/ComponentNavbar';
import LandscapeGate from '@/components/ui/LandscapeGate';
import { NAV, type NavItem } from '@/game/data/nav';
import { NAVIGATION } from '@/game/navigation-events';
import RouteBar from '@/components/ui/RouteBar';
import { consumeSpawnParam, districtUrl } from '@/game/district-routes';

function getGeneralLinks(items: NavItem[]): ComponentNavLink[] {
  return items.flatMap((item) => item.children?.length
    ? getGeneralLinks(item.children)
    : item.poi ? [{ id: item.poi, label: item.label, effect: item.effect }] : []);
}

const GENERAL_LINKS = getGeneralLinks(NAV);

// Waiting for silkscreen fonts 
async function waitForFont(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px "Silkscreen"'), document.fonts.load('bold 16px "Silkscreen"')]),
      new Promise((resolve) => setTimeout(resolve, 3000)), // never block the game on a slow font
    ]);
  } catch {
    // Uses default font if silkscreen not loaded
  }
}

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const [progress, setProgress] = useState(0.06);
  const [label, setLabel] = useState('Starting engine');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gone, setGone] = useState(false);
  const [dialogueOpen, setDialogueOpen] = useState(false);

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
      game.events.on(DIALOGUE.visibility, setDialogueOpen);

      // arriving from another district (?spawn=...) and walking off the map into one
      const spawn = consumeSpawnParam();
      if (spawn) game.registry.set('spawn', spawn);
      game.events.on(NAVIGATION.leaveDistrict, (target: string, to: string) => {
        const url = districtUrl(target, to);
        if (!cancelled && url) routerRef.current.push(url);
      });

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


  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <>
      <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} className="inline-block leading-none" />
      {!gone && <LoadingScreen progress={progress} label={ready ? 'Ready' : label} hidden={ready} error={failed} />}
      {ready && <ComponentNavbar sectionLabel="GENERAL" items={GENERAL_LINKS} onSelect={(id, effect) => gameRef.current?.events.emit(NAVIGATION.generalTravel, id, effect)} />}
      <LandscapeGate />
      {!dialogueOpen && <RouteBar active="general" />}
    </>
  );
}
