const FONT = '"Silkscreen", "Courier New", monospace';
const DARK = '#8a0f6e';
const PINK = '#ff8fe8';
const MID = '#ffc8f4';
const LIGHT = '#fff0fb';
const RED = '#d85848';

interface Props {
  /** 0..1 */
  progress: number;
  label?: string;
  /** fades the screen out (unmount it yourself once the fade is done) */
  hidden?: boolean;
  error?: boolean;
}

/** Full-screen pixel-style loading window. Plain inline styles, so it works before Tailwind/fonts are ready. */
export default function LoadingScreen({ progress, label = 'Loading', hidden = false, error = false }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const accent = error ? RED : DARK;

  return (
    <div
      role="progressbar"
      aria-label="Loading Sajad City"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0c',
        fontFamily: FONT,
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity .5s ease',
      }}
    >
      <div style={{ width: 'min(380px, 86vw)', background: PINK, border: `4px solid ${DARK}`, boxShadow: '6px 6px 0 rgba(0,0,0,.45)' }}>
        {/* title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', color: DARK, fontSize: 16, fontWeight: 700 }}>
          <span>WELCOME TO</span>
          <span style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 12, height: 12, background: MID, border: `2px solid ${DARK}` }} />
            ))}
          </span>
        </div>

        {/* body */}
        <div style={{ margin: '0 4px 4px', padding: '22px 20px 20px', background: LIGHT, border: `3px solid ${DARK}` }}>
          <div style={{ color: DARK, fontSize: 32, fontWeight: 700, lineHeight: 1, letterSpacing: 1 }}>SAJAD's PORTFOLIO</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0 8px', color: error ? RED : '#383840', fontSize: 16, textTransform: 'uppercase' }}>
            <span>{error ? 'Failed to load. Refresh the page.' : `${label}…`}</span>
            {!error && <span>{pct}%</span>}
          </div>

          {/* segmented bar */}
          <div style={{ height: 28, padding: 3, background: MID, border: `3px solid ${accent}` }}>
            <div
              style={{
                width: `${error ? 100 : pct}%`,
                height: '100%',
                backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 10px, transparent 10px 13px)`,
                transition: 'width .3s ease-out',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
