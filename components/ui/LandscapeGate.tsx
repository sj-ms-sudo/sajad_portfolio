'use client';

import { useEffect, useState } from 'react';

export default function LandscapeGate() {
  const [portraitPhone, setPortraitPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    const update = () => setPortraitPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const requestLandscape = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen is optional; the rotate prompt remains until the device is turned.
    }
    try {
      const orientation = window.screen.orientation as ScreenOrientation & { lock?: (mode: 'landscape') => Promise<void> };
      await orientation.lock?.('landscape');
    } catch {
      // Some browsers only support orientation locking for installed apps or not at all.
    }
  };

  if (!portraitPhone) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Rotate device to landscape" style={{
      position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 24,
      background: '#0a0a0c', color: '#fff0fb', fontFamily: '"Silkscreen","Courier New",monospace', textAlign: 'center',
    }}>
      <div style={{ width: 'min(360px, 100%)' }}>
        <div aria-hidden style={{ margin: '0 auto 22px', width: 72, height: 112, border: '5px solid #ff8fe8', borderRadius: 14, position: 'relative' }}>
          <span style={{ position: 'absolute', inset: '8px 6px', border: '2px solid #ffc8f4' }} />
          <span style={{ position: 'absolute', right: -25, top: 42, color: '#ff8fe8', fontSize: 28 }}>↻</span>
        </div>
        <h2 style={{ margin: '0 0 12px', color: '#ff8fe8', fontSize: 18, lineHeight: 1.4 }}>ROTATE YOUR PHONE</h2>
        <p style={{ margin: '0 0 20px', fontSize: 11, lineHeight: 1.7 }}>This city is built for landscape. Turn your device sideways to continue.</p>
        <button type="button" onClick={requestLandscape} style={{
          minHeight: 44, padding: '10px 16px', border: '3px solid #8a0f6e', background: '#ff8fe8', color: '#8a0f6e',
          font: '700 11px "Silkscreen","Courier New",monospace', cursor: 'pointer',
        }}>TRY LANDSCAPE MODE</button>
      </div>
    </div>
  );
}