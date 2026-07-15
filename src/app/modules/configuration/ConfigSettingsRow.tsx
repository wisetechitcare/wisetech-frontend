import React, { useState } from 'react';
import { C, FONT, SP, RADIUS, ICON_COLORS } from './ConfigDesignSystem';

export interface ConfigSettingsRowProps {
  label: string;
  description?: string;
  icon?: string;
  iconColor?: 'primary' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'danger' | 'warning';
  /** Per-instance override for the icon badge + hover accent line color, taking
   * precedence over `iconColor`. Use to opt a specific page into a different
   * palette (e.g. the shared design-tokens blue) without touching every other
   * page that still uses the default burgundy `ICON_COLORS` scheme. */
  accentColor?: string;
  /** Override for the icon badge background AND the card's "active" tint.
   * Defaults to a soft tint of `accentColor` (icon bg) / `C.primaryLight` (active
   * card tint) when omitted, so passing only `accentColor` still looks coherent. */
  accentBg?: string;
  value?: React.ReactNode;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  rightContent?: React.ReactNode;
  /** Full-width content rendered beneath the header row, inside the same card (divided by a hairline).
   * Use for rich sub-content that doesn't fit the label/right-content mould — a visual strip, a mini
   * chart, an inline detail panel. Omit for a plain row (output is identical to before). */
  footer?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  loading?: boolean;
}

const Shimmer: React.FC<{ width?: string; height?: string; radius?: string }> = ({
  width = '120px', height = '14px', radius = RADIUS.sm,
}) => (
  <div style={{
    width, height, borderRadius: radius,
    backgroundColor: '#eef0f5',
    animation: 'cfgPulse 1.5s ease-in-out infinite',
  }} />
);

const ConfigSettingsRow: React.FC<ConfigSettingsRowProps> = ({
  label, description, icon, iconColor = 'primary', accentColor, accentBg,
  value, actionLabel, actionIcon, onAction, rightContent, footer,
  active = false, disabled = false, compact = false, loading = false,
}) => {
  const [hov, setHov] = useState(false);
  const [btnHov, setBtnHov] = useState(false);

  const scheme = accentColor
    ? { color: accentColor, bg: accentBg ?? `${accentColor}14` }
    : (ICON_COLORS[iconColor] ?? ICON_COLORS.primary);
  const activeTint = accentColor ? (accentBg ?? `${accentColor}14`) : C.primaryLight;

  // The card chrome (border, radius, shadow, active tint, hover lift) lives on this outer wrapper so
  // an optional full-width `footer` can share the same card as the header row. When no footer is
  // passed the visual result is identical to the original single-row card.
  return (
    <div
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: active ? activeTint : '#fff',
        border: `1px solid ${hov ? '#d1d5e0' : C.border}`,
        borderRadius: RADIUS.xl,
        boxShadow: hov
          ? '0 6px 24px rgba(24,28,50,0.09)'
          : '0 1px 6px rgba(24,28,50,0.04)',
        transition: 'all 0.18s ease',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent line on hover */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: '3px',
        backgroundColor: hov ? scheme.color : 'transparent',
        opacity: 0.6,
        transition: 'background-color 0.18s ease',
        zIndex: 1,
      }} />

      {/* Header row — keeps the .cfg-settings-row class so the design system's responsive
          breakpoints (flex-wrap, padding, full-width right-content on phones) still apply. */}
      <div
        className="cfg-settings-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: compact ? '14px 20px' : '18px 22px',
          gap: SP.md,
        }}
      >

      {/* Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: '40px', height: '40px',
            borderRadius: RADIUS.lg,
            backgroundColor: scheme.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 2px 8px ${scheme.color}1a`,
            transition: 'transform 0.18s ease',
            transform: hov ? 'scale(1.06)' : 'scale(1)',
          }}>
            <i className={`bi ${icon}`} style={{ fontSize: '17px', color: scheme.color }} />
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          {loading ? (
            <>
              <Shimmer width="160px" height="14px" />
              {description && <div style={{ marginTop: '6px' }}><Shimmer width="220px" height="11px" /></div>}
            </>
          ) : (
            <>
              <div className="cfg-row-label" style={{
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: compact ? '13px' : '14px',
                color: C.textPrimary,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                letterSpacing: '0.01em',
              }}>
                {label}
              </div>
              {description && (
                <div className="cfg-row-desc" style={{
                  fontFamily: FONT.body,
                  fontWeight: 400,
                  fontSize: '12px',
                  color: C.textMuted,
                  marginTop: '3px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  lineHeight: 1.4,
                }}>
                  {description}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: value + action */}
      <div className="cfg-row-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {loading ? (
          <Shimmer width="80px" height="32px" radius={RADIUS.md} />
        ) : (
          <>
            {value !== undefined && (
              <div style={{
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize: '13px',
                color: C.primary,
                backgroundColor: C.primaryLight,
                border: `1px solid rgba(30, 58, 138,0.12)`,
                borderRadius: RADIUS.md,
                padding: '5px 13px',
                minWidth: '40px',
                textAlign: 'center',
              }}>
                {value}
              </div>
            )}

            {rightContent}

            {actionLabel && onAction && (
              <button
                onClick={onAction}
                disabled={disabled}
                onMouseEnter={() => setBtnHov(true)}
                onMouseLeave={() => setBtnHov(false)}
                style={{
                  fontFamily: FONT.body,
                  fontWeight: 500,
                  fontSize: '13px',
                  color: btnHov ? C.primary : C.textSecondary,
                  backgroundColor: btnHov ? C.primaryLight : '#fff',
                  border: `1px solid ${btnHov ? 'rgba(30, 58, 138,0.25)' : C.border}`,
                  borderRadius: RADIUS.md,
                  padding: '7px 16px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {actionIcon && <i className={`bi ${actionIcon}`} style={{ fontSize: '12px' }} />}
                {actionLabel}
              </button>
            )}
          </>
        )}
      </div>
      </div>

      {/* Optional full-width footer, divided from the header by a hairline */}
      {footer && !loading && (
        <div style={{
          padding: compact ? '0 20px 14px' : '0 22px 18px',
          borderTop: `1px solid ${C.border}`,
          paddingTop: compact ? '12px' : '14px',
          marginTop: '2px',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default ConfigSettingsRow;
