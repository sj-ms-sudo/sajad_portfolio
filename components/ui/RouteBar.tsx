import Link from 'next/link';
import type { CSSProperties } from 'react';

type District = 'general' | 'frontend';

const barStyle: CSSProperties = {
  position: 'fixed', bottom: 'max(12px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
  zIndex: 850, display: 'flex', gap: 6, padding: 6, background: 'rgba(10,10,12,.94)', border: '3px solid #8a0f6e',
  boxShadow: '4px 4px 0 rgba(0,0,0,.45)', fontFamily: '"Silkscreen","Courier New",monospace',
};

const linkStyle: CSSProperties = {
  display: 'block', padding: '9px 14px', border: '2px solid #8a0f6e', background: '#fff0fb', color: '#8a0f6e',
  fontSize: 11, fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', whiteSpace: 'nowrap',
};

export default function RouteBar({ active }: { active: District }) {
  return (
    <nav aria-label="District navigation" style={barStyle}>
      <Link href="/general" aria-current={active === 'general' ? 'page' : undefined}
        style={{ ...linkStyle, ...(active === 'general' ? { background: '#ff8fe8' } : {}) }}>
        General
      </Link>
      <Link href="/frontend" aria-current={active === 'frontend' ? 'page' : undefined}
        style={{ ...linkStyle, ...(active === 'frontend' ? { background: '#ff8fe8' } : {}) }}>
        Frontend
      </Link>
    </nav>
  );
}