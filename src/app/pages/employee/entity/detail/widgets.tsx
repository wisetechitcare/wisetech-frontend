import React, { useState } from 'react';
import type { HealthResult, MissingItem } from './entityViewModel';

/** Compact circular health gauge with explainable factor list on hover. */
export const HealthGauge: React.FC<{ health: HealthResult; probability?: number | null }> = ({
  health,
  probability,
}) => {
  const { score, band, color, factors } = health;
  const deg = (score / 100) * 360;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      {/* Compact gauge */}
      <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: `conic-gradient(${color} ${deg}deg, #EEF2F6 ${deg}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 5,
            background: '#fff',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <span style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 18, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontFamily: 'Inter', fontSize: 8, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.5px' }}>HEALTH</span>
        </div>
      </div>

      {/* Compact info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 14, color, lineHeight: 1 }}>{band}</div>
        {probability != null && (
          <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#64748B', fontWeight: 500, marginTop: 2 }}>
            {probability}% conversion
          </div>
        )}
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {factors.slice(0, 2).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: f.impact === 'positive' ? '#16a34a' : f.impact === 'negative' ? '#f1416c' : '#94a3b8',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#64748B', lineHeight: 1.3 }}>{f.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** "N fields missing" chip → popover list, each item deep-links the edit form. */
export const MissingInfoChip: React.FC<{ items: MissingItem[]; onJump: (step: number) => void }> = ({
  items,
  onJump,
}) => {
  const [open, setOpen] = useState(false);
  if (!items.length) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EDFDF3',
          color: '#0A5C2A',
          border: '1px solid #17C96433',
          borderRadius: 999,
          padding: '5px 12px',
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <i className="bi bi-check-circle-fill" /> Complete record
      </span>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFF7ED',
          color: '#9A3412',
          border: '1px solid #F5A62333',
          borderRadius: 999,
          padding: '5px 12px',
          fontFamily: 'Inter',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <i className="bi bi-exclamation-triangle-fill" /> {items.length} field{items.length === 1 ? '' : 's'} missing
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 30,
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
            padding: 8,
            minWidth: 230,
          }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setOpen(false);
                onJump(it.step);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                gap: 10,
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '8px 10px',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 13,
                color: '#334155',
                textAlign: 'left',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
            >
              <span>
                <i className="bi bi-dash-circle me-2" style={{ color: '#F5A623' }} />
                {it.label}
              </span>
              <i className="bi bi-pencil-square" style={{ color: '#9d4141', fontSize: 12 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Honest empty-state for sections with no backing data yet (Financials / History). */
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  message: string;
  hint?: string;
}> = ({ icon, title, message, hint }) => (
  <div
    style={{
      border: '1px dashed #CBD5E1',
      background: '#F8FAFC',
      borderRadius: 16,
      padding: '44px 28px',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#EEF2F6',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}
    >
      <i className={icon} style={{ fontSize: 24, color: '#94A3B8' }} />
    </div>
    <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 17, color: '#334155' }}>{title}</div>
    <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', marginTop: 6, maxWidth: 460, marginInline: 'auto' }}>
      {message}
    </div>
    {hint && (
      <div
        style={{
          marginTop: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEF2F6',
          borderRadius: 999,
          padding: '4px 12px',
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: 600,
          color: '#64748B',
        }}
      >
        <i className="bi bi-info-circle" /> {hint}
      </div>
    )}
  </div>
);

/** Chips list for multi-value relations (services / categories). */
export const ChipList: React.FC<{ items: string[]; accent?: string }> = ({ items, accent = '#9d4141' }) => {
  if (!items.length) return <span style={{ color: '#94A3B8' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t, i) => (
        <span
          key={i}
          style={{
            background: `${accent}14`,
            color: accent,
            borderRadius: 999,
            padding: '3px 10px',
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
};
