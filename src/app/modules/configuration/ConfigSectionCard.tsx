import React, { useState } from 'react';
import { C, FONT, T, SP, RADIUS, BTN, ICON_COLORS } from './ConfigDesignSystem';

export interface ConfigSectionCardAction {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
}

export interface ConfigSectionCardProps {
  title: string;
  description?: string;
  icon?: string;
  iconColor?: 'primary' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'danger' | 'warning';
  primaryAction?: ConfigSectionCardAction;
  secondaryActions?: ConfigSectionCardAction[];
  loading?: boolean;
  collapsible?: boolean;
  badge?: { label: string; color?: string; bg?: string };
  status?: 'active' | 'inactive' | 'warning' | 'error';
  compact?: boolean;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlighted' | 'bordered';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonLine: React.FC<{ width?: string; height?: string }> = ({
  width = '100%', height = '14px',
}) => (
  <div style={{
    width, height,
    borderRadius: RADIUS.sm,
    backgroundColor: '#eef0f5',
    animation: 'cfgPulse 1.5s ease-in-out infinite',
  }} />
);

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:   { dot: C.success,    bg: C.successLight, text: '#16a34a', label: 'Active'   },
  inactive: { dot: C.textMuted,  bg: '#f3f4f6',      text: C.textMuted, label: 'Inactive' },
  warning:  { dot: C.warning,    bg: C.warningLight, text: C.amber,   label: 'Warning'  },
  error:    { dot: C.danger,     bg: C.dangerLight,  text: C.danger,  label: 'Error'    },
};

// ─── Action button ────────────────────────────────────────────────────────────

const ActionBtn: React.FC<{ action: ConfigSectionCardAction }> = ({ action }) => {
  const [hov, setHov] = useState(false);

  let base: React.CSSProperties = {
    ...BTN.outline,
    padding: '7px 16px',
    fontSize: '13px',
    fontWeight: 500,
  };
  let hovStyle: React.CSSProperties = { backgroundColor: C.primaryLight };

  if (action.variant === 'primary') {
    base = { ...BTN.primary, padding: '7px 16px', fontSize: '13px' };
    hovStyle = { transform: 'translateY(-1px)', boxShadow: `0 6px 18px ${C.primaryShadowMd}` };
  } else if (action.variant === 'danger') {
    base = { ...BTN.outline, color: C.danger, borderColor: C.danger, padding: '7px 16px', fontSize: '13px' };
    hovStyle = { backgroundColor: C.dangerLight };
  } else if (action.variant === 'secondary') {
    base = { ...BTN.secondary, padding: '7px 16px', fontSize: '13px' };
    hovStyle = { borderColor: C.borderDark, backgroundColor: '#fafbfc' };
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...(hov && !action.disabled ? hovStyle : {}), opacity: action.disabled ? 0.5 : 1, cursor: action.disabled ? 'not-allowed' : 'pointer' }}
    >
      {action.icon && <i className={`bi ${action.icon}`} style={{ fontSize: '13px' }} />}
      {action.label}
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ConfigSectionCard: React.FC<ConfigSectionCardProps> = ({
  title, description, icon, iconColor = 'primary',
  primaryAction, secondaryActions = [], loading = false,
  collapsible = false, badge, status, compact = false,
  headerRight, children, className = '', variant = 'default',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hov, setHov] = useState(false);

  const scheme = ICON_COLORS[iconColor] ?? ICON_COLORS.primary;
  const pad = compact ? SP.md : SP.lg;

  return (
    <div
      className={`cfg-section-card ${className}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: '#fff',
        borderRadius: RADIUS.xl,
        border: `1px solid ${hov ? C.borderDark : C.border}`,
        boxShadow: hov
          ? '0 8px 32px rgba(24,28,50,0.1)'
          : '0 2px 12px rgba(24,28,50,0.05)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: '3px',
        backgroundColor: scheme.color,
        opacity: 0.7,
      }} />

      {/* Header */}
      <div className="cfg-section-header" style={{
        padding: `${pad} ${pad} ${children && !collapsed ? SP.sm : pad} calc(${pad} + 8px)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SP.md,
      }}>
        {/* Left: icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          {icon && (
            <div style={{
              width: '40px', height: '40px',
              borderRadius: RADIUS.lg,
              backgroundColor: scheme.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${scheme.color}22`,
            }}>
              <i className={`bi ${icon}`} style={{ fontSize: '18px', color: scheme.color }} />
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexWrap: 'wrap' }}>
              {loading
                ? <SkeletonLine width="140px" height="16px" />
                : <span style={{ ...T.cardTitle, fontSize: '15px', fontWeight: 600 }}>{title}</span>
              }
              {!loading && badge && (
                <span style={{
                  backgroundColor: badge.bg ?? C.primaryLight,
                  color: badge.color ?? C.primary,
                  borderRadius: RADIUS.full,
                  fontSize: '10px', fontWeight: 700,
                  padding: '2px 8px', fontFamily: FONT.body,
                }}>
                  {badge.label}
                </span>
              )}
              {!loading && status && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  backgroundColor: STATUS_MAP[status].bg,
                  color: STATUS_MAP[status].text,
                  borderRadius: RADIUS.full,
                  fontSize: '10px', fontWeight: 600, padding: '2px 8px', fontFamily: FONT.body,
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: STATUS_MAP[status].dot }} />
                  {STATUS_MAP[status].label}
                </span>
              )}
            </div>

            {description && !loading && (
              <p style={{ fontFamily: FONT.body, fontSize: '12px', color: C.textMuted, fontWeight: 400, margin: '4px 0 0 0', lineHeight: 1.5 }}>
                {description}
              </p>
            )}
            {loading && description && (
              <div style={{ marginTop: '6px' }}><SkeletonLine width="220px" height="12px" /></div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="cfg-section-actions" style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexShrink: 0 }}>
          {headerRight}
          {!loading && secondaryActions.map((a, i) => <ActionBtn key={i} action={a} />)}
          {!loading && primaryAction && <ActionBtn action={primaryAction} />}
          {collapsible && (
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '4px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s ease', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              <i className="bi bi-chevron-down" style={{ fontSize: '15px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Divider below header */}
      {children && !collapsed && (
        <div style={{ height: '1px', backgroundColor: C.border, margin: `0 ${pad}` }} />
      )}

      {/* Body */}
      {children && !collapsed && (
        <div style={{ padding: `${SP.md} ${pad} ${pad} calc(${pad} + 8px)` }}>
          {loading
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
                <SkeletonLine /><SkeletonLine width="80%" /><SkeletonLine width="60%" />
              </div>
            : children
          }
        </div>
      )}
    </div>
  );
};

export default ConfigSectionCard;
