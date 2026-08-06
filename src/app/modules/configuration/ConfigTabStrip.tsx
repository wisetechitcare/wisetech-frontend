import React from 'react';
import { C, FONT, SP, RADIUS } from './ConfigDesignSystem';

export interface ConfigTabStripItem {
  id: string;
  label: string;
  /** Bootstrap icon class, e.g. "bi-clock". */
  icon?: string;
}

export interface ConfigTabStripProps {
  items: ConfigTabStripItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Accessible name for the tablist. */
  label?: string;
}

/**
 * Sub-navigation for configuration pages that stack several independent sections.
 *
 * Deliberately NOT ConfigPageLayout's built-in `tabs`: sections like Departments or
 * Shifts each render their OWN ConfigPageLayout header, so a second layout wrapping
 * them stacks two banners. This strip sits above those headers and only decides which
 * one mounts — which also means only the visible section fetches its data.
 *
 * Selected state uses C.primary (the brand navy the config engine was unified on), not
 * C.info — the bright blue reads as a different system next to the navy section banners.
 */
const ConfigTabStrip: React.FC<ConfigTabStripProps> = ({
  items,
  activeId,
  onChange,
  label = 'Sections',
}) => (
  <div
    role="tablist"
    aria-label={label}
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: SP.sm,
      padding: SP.sm,
      marginBottom: SP.md,
      background: '#fff',
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.xl,
      boxShadow: '0 1px 0 #e8eaf0, 0 4px 24px rgba(24,28,50,0.06)',
    }}
  >
    {items.map((item) => {
      const isActive = item.id === activeId;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(item.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: SP.sm,
            padding: `${SP.sm} ${SP.lg}`,
            border: `1px solid ${isActive ? 'transparent' : C.border}`,
            borderRadius: RADIUS.md,
            background: isActive ? C.primary : '#fff',
            color: isActive ? '#fff' : C.textPrimary,
            boxShadow: isActive ? `0 4px 12px ${C.primaryShadow}` : 'none',
            fontFamily: FONT.body,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          {item.icon && <i className={`bi ${item.icon}`} aria-hidden />}
          {item.label}
        </button>
      );
    })}
  </div>
);

export default ConfigTabStrip;
