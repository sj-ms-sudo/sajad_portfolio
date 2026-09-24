import type { Metadata } from "next";
import GameMount from "@/components/game/GameMount";

// Dev-only page: keep it out of search results.
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
