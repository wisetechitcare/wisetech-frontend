import React, { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { C, FONT, ICON_COLORS, RADIUS, SP } from '../configuration/ConfigDesignSystem';
import './DetailPageResponsive.css';

export type AccentColor = keyof typeof ICON_COLORS;

// ── DetailCard ──────────────────────────────────────────────────────────────

interface DetailCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  accentColor?: AccentColor;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  fixedHeight?: number | string;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  title, subtitle, icon, accentColor = 'primary', actions, children,
  className = '', style, bodyStyle, fixedHeight,
}) => {
  const { bg, color } = ICON_COLORS[accentColor] ?? ICON_COLORS.primary;
  return (
    <div
      className={`h-100 ${className}`}
      style={{
        backgroundColor: C.bgCard,
        borderRadius: RADIUS.lg,
        boxShadow: C.shadowCard,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        ...(fixedHeight
          ? { height: typeof fixedHeight === 'number' ? `${fixedHeight}px` : fixedHeight }
          : {}),
        ...style,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadowCardHover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadowCard;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* top accent bar */}
      <div style={{ height: '3px', backgroundColor: color, flexShrink: 0 }} />

      {/* header */}
      <div
        style={{
          padding: '16px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          gap: '12px',
          background: `linear-gradient(135deg, ${bg}60 0%, transparent 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: bg,
              borderRadius: RADIUS.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${color}30`,
            }}
          >
            <i className={icon} style={{ fontSize: '17px', color }} />
          </div>
          <div>
            <span
              style={{
                fontFamily: FONT.heading,
                fontSize: '16px',
                fontWeight: 700,
                color: C.textPrimary,
                letterSpacing: '0.1px',
                display: 'block',
                lineHeight: 1.25,
              }}
            >
              {title}
            </span>
            {subtitle && (
              <span
                style={{
                  fontFamily: FONT.body,
                  fontSize: '11px',
                  fontWeight: 500,
                  color: C.textMuted,
                  display: 'block',
                  marginTop: '1px',
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>

      {/* body */}
      <div
        style={{
          flex: 1,
          padding: '4px 20px 14px',
          minHeight: 0,
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ── DetailRow ────────────────────────────────────────────────────────────────

export const DetailRow: React.FC<{
  label: string;
  value?: React.ReactNode;
  isLast?: boolean;
}> = ({ label, value, isLast }) => (
  <div
    className="detail-row"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '20px',
      paddingTop: '10px',
      paddingBottom: '10px',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}
  >
    <span
      style={{
        fontFamily: FONT.body,
        fontSize: '13px',
        fontWeight: 500,
        color: C.textSecondary,
        flexShrink: 0,
        lineHeight: 1.45,
      }}
    >
      {label}
    </span>
    <div
      className="detail-row-value"
      style={{
        fontFamily: FONT.body,
        fontSize: '13px',
        fontWeight: 500,
        color: C.textPrimary,
        textAlign: 'right',
        lineHeight: 1.45,
        wordBreak: 'break-word',
      }}
    >
      {value ?? '-'}
    </div>
  </div>
);

// ── DetailStatusBadge ────────────────────────────────────────────────────────

const STATUS_THEMES: Record<string, { bg: string; dot: string; text: string }> = {
  received:         { bg: '#edfdf3', dot: '#17c964', text: '#0a5c2a' },
  'not received':   { bg: '#fff1f3', dot: '#f1416c', text: '#9b1c44' },
  ongoing:          { bg: '#fffbeb', dot: '#f5a623', text: '#92400e' },
  cancelled:        { bg: '#f3f4f6', dot: '#6b7280', text: '#374151' },
  'on hold':        { bg: '#f5f3ff', dot: '#7c3aed', text: '#4c1d95' },
  enquiry:          { bg: '#eff6ff', dot: '#3b82f6', text: '#1e40af' },
  tender:           { bg: '#eff6ff', dot: '#3b82f6', text: '#1e40af' },
  'design':         { bg: '#f0fdfa', dot: '#0d9488', text: '#134e4a' },
};

export const DetailStatusBadge: React.FC<{ status: string; color?: string }> = ({ status, color }) => {
  const key = (status ?? '').toLowerCase().trim();
  const t = STATUS_THEMES[key] ?? { bg: '#f3f4f6', dot: color || '#6b7280', text: '#374151' };
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: t.bg,
        color: t.text,
        padding: '5px 12px',
        borderRadius: RADIUS.full,
        fontFamily: FONT.body,
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 1,
        border: `1px solid ${t.dot}33`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: t.dot,
          flexShrink: 0,
        }}
      />
      {status || '-'}
    </div>
  );
};

// ── DetailLink ───────────────────────────────────────────────────────────────

export const DetailLink: React.FC<{
  href: string;
  children: React.ReactNode;
  external?: boolean;
  avatar?: string;
  style?: CSSProperties;
}> = ({ href, children, external, avatar, style }) => {
  const s: CSSProperties = {
    color: C.primary,
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '13px',
    fontFamily: FONT.body,
    ...style,
  };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {avatar && (
        <img
          src={avatar}
          alt=""
          style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={s}>
          {children}
        </a>
      ) : (
        <Link to={href} style={s}>
          {children}
        </Link>
      )}
    </div>
  );
};

// ── DetailMapLink ────────────────────────────────────────────────────────────

export const DetailMapLink: React.FC<{
  lat: string | number;
  lng: string | number;
  label?: string;
}> = ({ lat, lng, label = 'View on map' }) => (
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: C.primary,
      textDecoration: 'none',
      fontWeight: 500,
      fontSize: '13px',
      fontFamily: FONT.body,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
    }}
  >
    <i className="bi bi-geo-alt-fill" style={{ fontSize: '13px' }} />
    {label}
  </a>
);

// ── DetailSectionLabel ───────────────────────────────────────────────────────

export const DetailSectionLabel: React.FC<{
  children: React.ReactNode;
  accentColor?: AccentColor;
}> = ({ children, accentColor = 'primary' }) => {
  const { bg, color } = ICON_COLORS[accentColor] ?? ICON_COLORS.primary;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        backgroundColor: bg,
        color,
        borderRadius: RADIUS.full,
        fontFamily: FONT.body,
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.7px',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}
    >
      {children}
    </div>
  );
};

// ── DetailSummaryBar ─────────────────────────────────────────────────────────

export interface SummaryItem {
  label: string;
  value: React.ReactNode;
  icon: string;
  accentColor?: AccentColor;
}

// ── DetailInfoItem ────────────────────────────────────────────────────────────
// Stacked label → value for use in a 2-col grid inside a card

export const DetailInfoItem: React.FC<{
  label: string;
  value?: React.ReactNode;
  borderBottom?: boolean;
}> = ({ label, value, borderBottom = false }) => (
  <div
    style={{
      padding: '12px 0 10px',
      borderBottom: borderBottom ? `1px solid ${C.border}` : 'none',
    }}
  >
    <div
      style={{
        fontFamily: FONT.body,
        fontSize: '11px',
        fontWeight: 500,
        color: C.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        marginBottom: '5px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: FONT.body,
        fontSize: '14px',
        fontWeight: 600,
        color: C.textPrimary,
        lineHeight: 1.4,
      }}
    >
      {value ?? <span style={{ color: C.textMuted, fontWeight: 400 }}>—</span>}
    </div>
  </div>
);

// ── DetailInfoGrid ────────────────────────────────────────────────────────────

export const DetailInfoGrid: React.FC<{
  columns?: number;
  children: React.ReactNode;
  gap?: string;
}> = ({ columns = 2, children, gap = '0 20px' }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
    }}
  >
    {children}
  </div>
);

// ── DetailProfileBlock ────────────────────────────────────────────────────────

export const DetailProfileBlock: React.FC<{
  name: string;
  subtitle?: string;
  href?: string;
  accentColor?: AccentColor;
}> = ({ name, subtitle, href, accentColor = 'blue' }) => {
  const { bg, color } = ICON_COLORS[accentColor] ?? ICON_COLORS.blue;
  const initial = (name || '?')[0].toUpperCase();
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 2px 6px ${color}25`,
        }}
      >
        <span
          style={{
            fontFamily: FONT.heading,
            fontSize: '17px',
            fontWeight: 700,
            color,
          }}
        >
          {initial}
        </span>
      </div>
      <div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: '14px',
            fontWeight: 600,
            color: href ? C.primary : C.textPrimary,
          }}
        >
          {name}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: FONT.body,
              fontSize: '12px',
              fontWeight: 500,
              color: C.textMuted,
              marginTop: '2px',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link to={href} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }
  return content;
};

// ── DetailSummaryBar ─────────────────────────────────────────────────────────
export const DetailSummaryBar: React.FC<{ items: SummaryItem[] }> = ({ items }) => (
  <div
    className="detail-summary-bar"
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      gap: SP.md,
      marginBottom: '20px',
    }}
  >
    {items.map((item, i) => {
      const { bg, color } = ICON_COLORS[item.accentColor || 'primary'] ?? ICON_COLORS.primary;
      return (
        <div
          key={i}
          style={{
            backgroundColor: C.bgCard,
            borderRadius: RADIUS.lg,
            padding: '14px 16px',
            border: `1px solid ${C.border}`,
            boxShadow: C.shadowSm,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: RADIUS.md,
              backgroundColor: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i className={item.icon} style={{ fontSize: '18px', color }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: '11px',
                fontWeight: 500,
                color: C.textMuted,
                marginBottom: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: FONT.heading,
                fontSize: '14px',
                fontWeight: 700,
                color: C.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.value ?? '-'}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
