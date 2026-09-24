"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "@/components/game/LoadingScreen";

// While the game bundle itself downloads, show the same loading window (GameCanvas then takes over seamlessly).
const PhaserGame = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => <LoadingScreen progress={0.04} label="Loading ....." />,
});

export default function PhaserGameLoader() {
  return <PhaserGame />;
}
