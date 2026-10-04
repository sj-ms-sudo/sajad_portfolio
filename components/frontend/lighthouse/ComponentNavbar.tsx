'use client';

import { Fragment, useEffect, useRef, useState } from 'react';

export interface ComponentNavLink {
  id: string;
  label: string;
  effect?: string;
  /** Optional heading shown before the first item of each group. */
  group?: string;
}

const FONT = '"Silkscreen","Courier New",monospace';

export default function ComponentNavbar({ sectionLabel, items, onSelect, disabled = false }: {
  sectionLabel: string;
  items: ComponentNavLink[];
  onSelect: (id: string, effect?: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  // collapse on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // collapse if the nav becomes disabled (e.g. a trip is in progress)
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <nav
      ref={rootRef}
      aria-label="Portfolio navigation"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 850,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
        maxWidth: 'calc(100vw - 14px)',
        fontFamily: FONT,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          minHeight: 52, minWidth: 48, padding: '6px 10px',
          border: '3px solid #8a0f6e', background: 'rgba(10,10,12,.94)', color: '#ffc8f4',
          boxShadow: '4px 4px 0 rgba(0,0,0,.45)',
          font: `700 22px ${FONT}`, lineHeight: 1,
          cursor: disabled ? 'wait' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            maxWidth: 'calc(100vw - 24px)', overflowX: 'auto',
            padding: 6, background: 'rgba(10,10,12,.94)',
            border: '3px solid #8a0f6e', boxShadow: '4px 4px 0 rgba(0,0,0,.45)',
          }}
        >
          <span style={{ padding: '0 6px', color: '#ffc8f4', fontSize: 9, whiteSpace: 'nowrap' }}>
            {sectionLabel}
          </span>
          {items.map((item, i) => (
            <Fragment key={item.id}>
            {item.group && item.group !== items[i - 1]?.group && (
              <span style={{ padding: '0 6px', color: '#ffc8f4', fontSize: 9, whiteSpace: 'nowrap', borderLeft: i ? '2px solid #8a0f6e' : undefined }}>
                {item.group}
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              title={`Travel to ${item.label}`}
              onClick={() => {
                setOpen(false);
                onSelect(item.id, item.effect);
              }}
              style={{
                flex: 'none', minHeight: 34, padding: '6px 10px',
                border: '2px solid #8a0f6e', background: '#ff8fe8', color: '#8a0f6e',
                font: `700 9px ${FONT}`, textTransform: 'uppercase', whiteSpace: 'nowrap',
                cursor: disabled ? 'wait' : 'pointer',
                opacity: disabled ? 0.55 : 1,
              }}
            >
              {item.label}
            </button>
            </Fragment>
          ))}
        </div>
      )}
    </nav>
  );
}