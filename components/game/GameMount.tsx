'use client';

import dynamic from 'next/dynamic';

const GameCanvas = dynamic(() => import('./GameCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{ width: 960, height: 720 }}
      className="flex items-center justify-center bg-[#0a0a0c] text-[#ff6436]"
    >
      <span className="font-mono text-xs tracking-widest">BOOTING SAJAD CITY…</span>
    </div>
  ),
});

export default function GameMount() {
  return <GameCanvas />;
}