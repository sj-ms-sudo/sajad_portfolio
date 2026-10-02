'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties ,useLayoutEffect} from 'react';
import { SHOWCASE } from './showcase';
import { drawLens, LENS_W, LENS_H } from '@/game/frontend/lens';

/** 'stairs'  = infinite loop, every climb is a new floor (and a new sky) with the next component.
 *  'buttons' = prev / next buttons. */
const TRAVERSAL: 'stairs' | 'buttons' = 'stairs';

const FONT = '"Silkscreen","Courier New",monospace';
const DARK = '#8a0f6e', PINK = '#ff8fe8', MID = '#ffc8f4', LIGHT = '#fff0fb', TEXT = '#383840';
const SHADOW = '6px 6px 0 rgba(0,0,0,.45)';
const mod = (n: number, m: number) => ((n % m) + m) % m;

const btn: CSSProperties = {
  font: `700 16px ${FONT}`, padding: '10px 16px', color: DARK, background: PINK, border: `3px solid ${DARK}`,
  boxShadow: `inset 0 3px 0 ${MID}, 0 4px 0 ${DARK}`, cursor: 'pointer', textDecoration: 'none', textTransform: 'uppercase',
};

function WindowFrame({ title, children, style, className }: { title: string; children: React.ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ background: PINK, border: `4px solid ${DARK}`, boxShadow: SHADOW, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', color: DARK, fontSize: 16, fontWeight: 700 }}>
        <span>{title}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 20, height: 20, background: MID, border: `2px solid ${DARK}` }} />)}
        </span>
      </div>
      <div style={{ margin: '0 4px 4px', background: LIGHT, border: `3px solid ${DARK}` }}>{children}</div>
    </div>
  );
}

function Fit({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);

  useLayoutEffect(() => {
    const calc = () => {
      const o = outer.current, i = inner.current;
      if (!o || !i) return;
      setK(Math.min(1, (o.clientWidth * 0.96) / i.offsetWidth, (o.clientHeight * 0.96) / i.offsetHeight));
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

export default function LighthouseOverlay({ onClose, initialShowcaseId }: { onClose: () => void; initialShowcaseId?: string }) {
  const [step, setStep] = useState(() => {
    const initialIndex = SHOWCASE.findIndex((showcase) => showcase.id === initialShowcaseId);
    return initialIndex >= 0 ? initialIndex + 1 : 1;
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const [scale, setScale] = useState(5);
  const [vw, setVw] = useState(390);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const n = SHOWCASE.length;
  const idx = mod(step - 1, n);
  const item = SHOWCASE[idx];
  const stairs = TRAVERSAL === 'stairs';

  const go = useCallback((d: 1 | -1) => { setDir(d); setStep((s) => s + d); }, []);

  // integer pixel scale so the art stays crisp
  useEffect(() => {
    const fit = () => {
  setVw(window.innerWidth);
  setScale(Math.max(2, Math.min(7, Math.floor(Math.min((window.innerWidth * 0.94) / LENS_W, (window.innerHeight - 320) / LENS_H)))));
};
    fit();
    window.addEventListener('resize', fit);

    return () => window.removeEventListener('resize', fit);
  }, []);

  // draw + gently animate the view
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(LENS_W, LENS_H);
    let frame = 0;
    const paint = () => { drawLens(img.data, frame, step); ctx.putImageData(img, 0, 0); };
    paint();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { frame++; paint(); }, 450);
    return () => clearInterval(t);
  }, [step]);

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
  const mobile = vw <= 600;
const boxW = mobile ? vw - 8 : LENS_W * scale;
const boxH = mobile ? Math.round(boxW * 0.75) : LENS_H * scale;
  return (
    <div role="dialog" aria-modal="true" aria-label="Lighthouse binoculars"
      style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'safe center',
        gap: 18, padding: '16px 12px', overflow: 'auto', fontFamily: FONT, background: '#0a0a0c' }}>
      <style>{`
        @keyframes lh-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes lh-down{from{transform:translateY(-40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes lh-right{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
        @keyframes lh-left{from{transform:translateX(-60px);opacity:0}to{transform:none;opacity:1}}
        .lh-btn:active{transform:translateY(3px);box-shadow:inset 0 3px 0 ${MID},0 1px 0 ${DARK}}
        .lh-btn:hover{background:${LIGHT}}
        @media(max-width:600px){

          .lh-showcase-content{padding:4px 8px!important}
          .lh-readout{width:min(500px,92vw)!important}
          .lh-readout-content{padding:8px 10px 10px!important}
          .lh-readout-title{font-size:16px!important}
          .lh-readout-blurb{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;font-size:12px!important;line-height:1.35!important;margin:6px 0 8px!important}
          .lh-readout-tags{margin-bottom:8px!important}
          .lh-readout-actions{gap:6px!important}
          .lh-readout-actions .lh-btn{font-size:12px!important;padding:6px 8px!important}
        }
      `}</style>

      <button className="lh-btn" onClick={onClose} style={{ ...btn, position: 'fixed', top: 14, right: 14, zIndex: 2, fontSize: 16, padding: '6px 12px' }}>ESC · EXIT</button>

{/* the lens */}
<div style={{ position: 'relative', width: boxW, height: boxH, flex: 'none' }}>
  <canvas ref={canvasRef} width={LENS_W} height={LENS_H} aria-hidden
    style={mobile
      ? { position: 'absolute', left: 0, top: '50%', width: '100%', height: 'auto', aspectRatio: `${LENS_W}/${LENS_H}`, transform: 'translateY(-50%)', display: 'block', imageRendering: 'pixelated' }
      : { width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    <div key={step} style={{ position: 'absolute', inset: 0, animation: `${anim} 320ms steps(5, end)` }}>
      <Fit>
        <div className="lh-showcase-window" style={{ pointerEvents: 'auto' }}>
          <WindowFrame title={`${item.id}.tsx`}>
            <div className="lh-showcase-content" style={{ display: 'grid', placeItems: 'center', padding: scale > 3 ? '22px 28px' : '10px 12px' }}>
              {item.demo()}
            </div>
          </WindowFrame>
        </div>
      </Fit>
    </div>
  </div>
</div>

      {/* readout */}
      <WindowFrame className="lh-readout" title={floorLabel} style={{ width: 'min(720px, 94vw)', flex: 'none' }}>
        <div className="lh-readout-content" style={{ padding: '14px 18px 16px' }}>
          <div className="lh-readout-title" style={{ color: DARK, fontSize: 24, fontWeight: 700, lineHeight: 1.1, letterSpacing: 1, textTransform: 'uppercase' }}>{item.title}</div>
          <p className="lh-readout-blurb" style={{ color: TEXT, fontSize: 16, lineHeight: 1.45, margin: '10px 0 12px' }}>{item.blurb}</p>
          <div className="lh-readout-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {item.tags.map((t) => (
              <span key={t} style={{ fontSize: 8, color: DARK, background: MID, border: `2px solid ${DARK}`, padding: '3px 6px', textTransform: 'uppercase' }}>{t}</span>
            ))}
          </div>
          <div className="lh-readout-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="lh-btn" style={btn} onClick={() => go(-1)}>{stairs ? '▼ Descend' : '◀ Prev'}</button>
              <button className="lh-btn" style={btn} onClick={() => go(1)}>{stairs ? '▲ Climb' : 'Next ▶'}</button>
            </div>
            {item.href && <a className="lh-btn" style={btn} href={item.href} target="_blank" rel="noreferrer">Open ↗</a>}
          </div>
        </div>
      </WindowFrame>
    </div>
  );
}