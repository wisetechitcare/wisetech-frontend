import React, { createContext, useContext } from 'react';
import { DetailRow } from '@app/modules/detail-page/DetailPageComponents';

/**
 * View-density engine for the 360° Lead/Project detail page.
 *
 *   overview  → only business-critical fields (the at-a-glance hub)
 *   detailed  → every populated field + all relation rows
 *   advanced  → adds system / technical fields (ids, flags, raw timestamps)
 *
 * Sections read `useDensity()` and gate individual rows with <DensityRow minLevel>
 * so we never duplicate markup per mode.
 */
export type DensityMode = 'overview' | 'detailed' | 'advanced';

const RANK: Record<DensityMode, number> = { overview: 0, detailed: 1, advanced: 2 };

/** True when the active mode is at least as detailed as `min`. */
export const atLeast = (active: DensityMode, min: DensityMode) => RANK[active] >= RANK[min];

const DensityContext = createContext<DensityMode>('detailed');

export const DensityProvider: React.FC<{ mode: DensityMode; children: React.ReactNode }> = ({
  mode,
  children,
}) => <DensityContext.Provider value={mode}>{children}</DensityContext.Provider>;

export const useDensity = (): DensityMode => useContext(DensityContext);

/**
 * A DetailRow that only renders at/above a minimum density.
 * `hideEmpty` drops the row when the value is blank in overview/detailed
 * (advanced always shows it so power users can see "this is empty").
 */
export const DensityRow: React.FC<{
  label: string;
  value?: React.ReactNode;
  minLevel?: DensityMode;
  isLast?: boolean;
  hideEmpty?: boolean;
}> = ({ label, value, minLevel = 'detailed', isLast, hideEmpty }) => {
  const active = useDensity();
  if (!atLeast(active, minLevel)) return null;
  const blank = value === undefined || value === null || value === '' || value === '—' || value === '-';
  if (blank && hideEmpty && active !== 'advanced') return null;
  return <DetailRow label={label} value={value} isLast={isLast} />;
};

// ── Mode toggle (segmented control) ──────────────────────────────────────────

const MODES: { key: DensityMode; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'bi bi-grid-1x2' },
  { key: 'detailed', label: 'Detailed', icon: 'bi bi-list-ul' },
  { key: 'advanced', label: 'Advanced', icon: 'bi bi-sliders' },
];

export const DensityToggle: React.FC<{ mode: DensityMode; onChange: (m: DensityMode) => void }> = ({
  mode,
  onChange,
}) => (
  <div
    style={{
      display: 'inline-flex',
      background: '#F1F5F9',
      borderRadius: '999px',
      padding: '3px',
      gap: '2px',
    }}
  >
    {MODES.map(m => {
      const active = m.key === mode;
      return (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          title={`${m.label} view`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: 'none',
            cursor: 'pointer',
            background: active ? '#fff' : 'transparent',
            color: active ? '#9d4141' : '#64748B',
            boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            borderRadius: '999px',
            padding: '6px 14px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: active ? 700 : 500,
            transition: 'all 0.15s ease',
          }}
        >
          <i className={m.icon} style={{ fontSize: '13px' }} />
          <span className="d-none d-sm-inline">{m.label}</span>
        </button>
      );
    })}
  </div>
);
