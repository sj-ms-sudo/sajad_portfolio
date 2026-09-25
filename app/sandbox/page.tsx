import type { Metadata } from "next";
import GameMount from "@/components/game/GameMount";

// This is a dev only page , only used to test
export const metadata: Metadata = {
  title: "Sandbox",
  robots: { index: false, follow: false },
};

export default function SandboxPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
      <GameMount />
    </main>
  );
}
