"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
});

export default function PhaserGameLoader() {
  return <PhaserGame />;
}