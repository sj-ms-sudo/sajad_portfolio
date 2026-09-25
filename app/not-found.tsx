import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};


const FONT = '"Silkscreen", "Courier New", monospace';

export default function NotFound() {
  return (
    <main
      className="fixed inset-0 flex items-center justify-center bg-[#0a0a0c] p-4"
      style={{ fontFamily: FONT }}
    >
      <div className="w-[min(420px,100%)] border-4 border-[#8a0f6e] bg-[#ff8fe8] shadow-[6px_6px_0_rgba(0,0,0,.45)]">
        {/* title bar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 text-base font-bold text-[#8a0f6e]">
          <span>ERROR 404</span>
          <span className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-3 w-3 border-2 border-[#8a0f6e] bg-[#ffc8f4]" />
            ))}
          </span>
        </div>

        {/* body */}
        <div className="mx-1 mb-1 border-[3px] border-[#8a0f6e] bg-[#fff0fb] px-5 py-7 text-center">
          <h1 className="text-7xl font-bold leading-none text-[#8a0f6e]">404</h1>
          <p className="mt-5 text-base font-bold uppercase text-[#383840]">
            This street isn&apos;t on the map.
          </p>
          <p className="mt-2 text-base text-[#383840]/70">
            Wrong turn. Let&apos;s get you back to the plaza.
          </p>
          <Link
            href={SITE.homePath}
            className="mt-6 inline-block border-[3px] border-[#8a0f6e] bg-[#ff8fe8] px-4 py-2 text-base font-bold uppercase text-[#8a0f6e] hover:bg-[#ffc8f4] focus-visible:bg-[#ffc8f4] focus-visible:outline-none"
          >
            Back to the city
          </Link>
        </div>
      </div>
    </main>
  );
}