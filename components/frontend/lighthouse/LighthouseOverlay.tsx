'use client';
import { useCallback, useEffect, useRef, useState, useLayoutEffect, type CSSProperties } from 'react';
import { SHOWCASE, type ShowcaseItem } from './showcase';


const TRAVERSAL: 'stairs' | 'buttons' = 'stairs';

const FONT = '"Silkscreen","Courier New",monospace';
const DARK = '#8a0f6e', PINK = '#ff8fe8', MID = '#ffc8f4', LIGHT = '#fff0fb', TEXT = '#383840';
const SHADOW = '6px 6px 0 rgba(0,0,0,.45)';
const mod = (n: number, m: number) => ((n % m) + m) % m;

const btn: CSSProperties = {
  font: `700 16px ${FONT}`, padding: '10px 16px', color: DARK, background: PINK, border: `3px solid ${DARK}`,
  boxShadow: `inset 0 3px 0 ${MID}, 0 4px 0 ${DARK}`, cursor: 'pointer', textDecoration: 'none', textTransform: 'uppercase',
};

function WindowFrame({ title, children, style, bodyStyle }: {
  title: string; children: React.ReactNode; style?: CSSProperties; bodyStyle?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: PINK, border: `4px solid ${DARK}`, boxShadow: SHADOW, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', color: DARK, fontSize: 16, fontWeight: 700, flex: 'none' }}>
        <span>{title}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 20, height: 20, background: MID, border: `2px solid ${DARK}` }} />)}
        </span>
      </div>
      <div style={{ margin: '0 4px 4px', background: LIGHT, border: `3px solid ${DARK}`, flex: '1 1 auto', minHeight: 0, ...bodyStyle }}>{children}</div>
    </div>
  );
}

function Fit({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);

  useLayoutEffect(() => {
    const MAX_SCALE = 2; // raise/lower to taste

const calc = () => {
  const o = outer.current, i = inner.current;
  if (!o || !i) return;
  setK(Math.min(MAX_SCALE, o.clientWidth / i.offsetWidth, o.clientHeight / i.offsetHeight));
};
    calc();
    const ro = new ResizeObserver(calc);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div ref={inner} style={{ flex: 'none', transform: `scale(${k})`, transformOrigin: 'center' }}>{children}</div>
    </div>
  );
}

/**
 * Shared by the lighthouse (stairs: climb / descend) and the art gallery (buttons: prev / next along the wall).
 * Both wrap around forever, so the showcase list loops infinitely in either direction.
 */
export default function LighthouseOverlay({ onClose, initialShowcaseId, items = SHOWCASE, traversal = TRAVERSAL, label = 'Lighthouse showcase' }: {
  onClose: () => void;
  initialShowcaseId?: string;
  items?: ShowcaseItem[];
  traversal?: 'stairs' | 'buttons';
  label?: string;
}) {
  const [step, setStep] = useState(() => {
    const initialIndex = items.findIndex((showcase) => showcase.id === initialShowcaseId);
    return initialIndex >= 0 ? initialIndex + 1 : 1;
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const n = items.length;
  const idx = mod(step - 1, n);
  const item = items[idx];
  const stairs = traversal === 'stairs';

  const go = useCallback((d: 1 | -1) => { setDir(d); setStep((s) => s + d); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') { e.preventDefault(); onClose(); }
      else if (['arrowup', 'arrowright', 'w', 'd'].includes(k)) { e.preventDefault(); go(1); }
      else if (['arrowdown', 'arrowleft', 's', 'a'].includes(k)) { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const anim = stairs ? (dir > 0 ? 'lh-up' : 'lh-down') : (dir > 0 ? 'lh-right' : 'lh-left');
  const floorLabel = stairs ? (step >= 1 ? `FLOOR ${String(step).padStart(2, '0')}` : `BASEMENT ${String(1 - step).padStart(2, '0')}`) : `${idx + 1} / ${n}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={label}
      style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'row', gap: 8,
  padding: 8, boxSizing: 'border-box', overflow: 'hidden', fontFamily: FONT, background: '#0a0a0c' }}>
      <style>{`
        @keyframes lh-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes lh-down{from{transform:translateY(-40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes lh-right{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
        @keyframes lh-left{from{transform:translateX(-60px);opacity:0}to{transform:none;opacity:1}}
        .lh-btn:active{transform:translateY(3px);box-shadow:inset 0 3px 0 ${MID},0 1px 0 ${DARK}}
        .lh-btn:hover{background:${LIGHT}}
      `}</style>

      {/* left window: showcase */}
      <WindowFrame title={`${item.id}.tsx`} style={{ flex: '1.5 1 0', minWidth: 0 }} bodyStyle={{ position: 'relative', overflow: 'hidden' }}>
        <div key={step} style={{ position: 'absolute', inset: 0, animation: `${anim} 320ms steps(5, end)` }}>
          <Fit>
            <div style={{ display: 'grid', placeItems: 'center', padding: '12px 18px' }}>
              {item.demo()}
            </div>
          </Fit>
        </div>
      </WindowFrame>

      {/* right window: text */}
      <WindowFrame title={floorLabel} style={{ flex: '1 1 0', minWidth: 0 }} bodyStyle={{ overflow: 'auto' }}>
        <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', minHeight: '100%', boxSizing: 'border-box' }}>
          <div style={{ color: DARK, fontSize: 24, fontWeight: 700, lineHeight: 1.1, letterSpacing: 1, textTransform: 'uppercase' }}>{item.title}</div>
          <p style={{ color: TEXT, fontSize: 16, lineHeight: 1.45, margin: '10px 0 12px' }}>{item.blurb}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {item.tags.map((t) => (
              <span key={t} style={{ fontSize: 8, color: DARK, background: MID, border: `2px solid ${DARK}`, padding: '3px 6px', textTransform: 'uppercase' }}>{t}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="lh-btn" style={{ ...btn, flex: 1 }} onClick={() => go(-1)}>{stairs ? '▼ Descend' : '◀ Prev'}</button>
              <button className="lh-btn" style={{ ...btn, flex: 1 }} onClick={() => go(1)}>{stairs ? '▲ Climb' : 'Next ▶'}</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {item.href && <a className="lh-btn" style={{ ...btn, flex: 1, textAlign: 'center' }} href={item.href} target="_blank" rel="noreferrer">Open ↗</a>}
              <button className="lh-btn" style={{ ...btn, flex: 1 }} onClick={onClose}>ESC · Exit</button>
            </div>
          </div>
        </div>
      </WindowFrame>
    </div>
  );
}