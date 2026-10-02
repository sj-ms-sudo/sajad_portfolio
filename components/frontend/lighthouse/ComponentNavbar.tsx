'use client';

export interface ComponentNavLink {
  id: string;
  label: string;
  effect?: string;
}

export default function ComponentNavbar({ sectionLabel, items, onSelect, disabled = false }: {
  sectionLabel: string;
  items: ComponentNavLink[];
  onSelect: (id: string, effect?: string) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Portfolio navigation" style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 850,
      display: 'flex', alignItems: 'center', gap: 6, maxWidth: 'calc(100vw - 24px)', overflowX: 'auto',
      padding: 6, background: 'rgba(10,10,12,.94)', border: '3px solid #8a0f6e', boxShadow: '4px 4px 0 rgba(0,0,0,.45)',
      fontFamily: '"Silkscreen","Courier New",monospace',
    }}>
      <span style={{ padding: '0 6px', color: '#ffc8f4', fontSize: 9, whiteSpace: 'nowrap' }}>{sectionLabel}</span>
      {items.map((item) => (
        <button key={item.id} type="button" disabled={disabled} title={`Travel to ${item.label}`} onClick={() => onSelect(item.id, item.effect)}
          style={{
            flex: 'none', minHeight: 34, padding: '6px 10px', border: '2px solid #8a0f6e', background: '#ff8fe8', color: '#8a0f6e',
            font: `700 9px "Silkscreen","Courier New",monospace`, textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: disabled ? 'wait' : 'pointer',
            opacity: disabled ? 0.55 : 1,
          }}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}