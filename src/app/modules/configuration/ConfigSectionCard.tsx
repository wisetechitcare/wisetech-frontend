import React, { useRef, useState, type CSSProperties } from 'react';
import { useTheme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { Button } from '@/ds/ui/button';
import { C, FONT, T, SP, RADIUS, ICON_COLORS } from './ConfigDesignSystem';
import { keeniconFor } from '@app/modules/common/components/ui/iconMap';
// Imported from the module, NOT the ui barrel — pulling the barrel into a widely-imported
// primitive is what makes tsc crawl.
import { toTitleCase, HEADING_CASE_SX } from '@app/modules/common/components/ui/text';

/**
 * One icon renderer for the whole config surface.
 *
 * Call sites pass Bootstrap Icon names (`bi-pencil`), which is what this card has always
 * taken. The app standard is KTIcon/keenicons, so the name is translated here instead of
 * at ~70 call sites — the Configure button on a config screen now matches the same action
 * everywhere else. An unmapped name keeps rendering its Bootstrap glyph, so a missing
 * entry in `iconMap` looks off-family rather than turning into a blank square.
 *
 * `size` is a px value for the Bootstrap fallback; KTIcon sizes via its own `fs-*` class,
 * which is the icon font's sizing API and the one Bootstrap-ish class the lint rules keep.
 */
function ConfigIcon({ name, size, className, color }: {
  name: string; size: number; className: string; color?: string;
}) {
  const keenicon = keeniconFor(name);
  // KTIcon takes no style prop — the keenicon font paints with currentColor, so the tint
  // is applied by the wrapper and inherited.
  return keenicon
    ? (
      <span style={{ color, display: 'inline-flex', alignItems: 'center' }}>
        <KTIcon iconName={keenicon} className={className} />
      </span>
    )
    : <i className={`bi ${name}`} style={{ fontSize: `${size}px`, ...(color ? { color } : null) }} />;
}

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

const SkeletonLine: React.FC<{ width?: string; height?: string; pulseBg: string }> = ({
  width = '100%', height = '14px', pulseBg,
}) => (
  <div style={{
    width, height,
    borderRadius: RADIUS.sm,
    backgroundColor: pulseBg,
    animation: 'cfgPulse 1.5s ease-in-out infinite',
  }} />
);

// ─── Action button ────────────────────────────────────────────────────────────

// The kit Button owns the look: primary → `default`; danger (a red outline) → `tinted` in the
// danger tone so it still reads as destructive; secondary / outline → `outline`.
const DANGER_TINT = { '--tint': 'var(--cta-danger)' } as CSSProperties;

const ActionBtn: React.FC<{ action: ConfigSectionCardAction }> = ({ action }) => (
  <Button
    variant={action.variant === 'primary' ? 'default' : action.variant === 'danger' ? 'tinted' : 'outline'}
    size="sm"
    style={action.variant === 'danger' ? DANGER_TINT : undefined}
    onClick={action.onClick}
    disabled={action.disabled}
  >
    {action.icon && (
      <span data-icon="inline-start" className="inline-flex">
        <ConfigIcon name={action.icon} size={13} className="fs-5" />
      </span>
    )}
    {action.label}
  </Button>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ConfigSectionCard: React.FC<ConfigSectionCardProps> = ({
  title, description, icon, iconColor = 'primary',
  primaryAction, secondaryActions = [], loading = false,
  collapsible = false, badge, status, compact = false,
  headerRight, children, className = '', variant = 'default',
}) => {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [hov, setHov] = useState(false);
  const paper = theme.palette.background.paper;
  const divider = theme.palette.divider;
  const pulseBg = theme.palette.action.hover;
  const statusMap: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    active:   { dot: C.success,   bg: C.successLight, text: theme.palette.success.dark, label: 'Active' },
    inactive: { dot: theme.palette.text.disabled, bg: theme.palette.action.selected, text: theme.palette.text.secondary, label: 'Inactive' },
    warning:  { dot: C.warning,   bg: C.warningLight, text: C.amber, label: 'Warning' },
    error:    { dot: C.danger,    bg: C.dangerLight,  text: C.danger, label: 'Error' },
  };

  /**
   * Skeletons are for the FIRST paint only — never for a refetch.
   *
   * Swapping `children` out on every `loading` pass UNMOUNTS them, and a section body is not
   * a dumb list: the category and preset-task trees keep their expanded set in local state, so
   * a save that triggered a refetch silently collapsed the tree the user had just opened. The
   * card also shrank to three skeleton lines, which collapsed the page height and threw the
   * scroll position back to the top — so an edit made three screens down came back at screen
   * one, with the tree closed.
   *
   * Once the body has rendered real content, a later load keeps showing it. The header still
   * reflects `loading`, so the refresh remains visible without destroying what is on screen.
   */
  const hasRenderedBody = useRef(false);
  if (!loading) hasRenderedBody.current = true;
  const showSkeleton = loading && !hasRenderedBody.current;

  const scheme = ICON_COLORS[iconColor] ?? ICON_COLORS.primary;
  const pad = compact ? SP.md : SP.lg;

  return (
    <div
      className={`cfg-section-card ${className}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: paper,
        borderRadius: RADIUS.xl,
        border: `1px solid ${hov ? theme.palette.text.disabled : divider}`,
        boxShadow: hov
          ? theme.shadows[4]
          : theme.shadows[1],
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
              <ConfigIcon name={icon} size={18} className="fs-2" color={scheme.color} />
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexWrap: 'wrap' }}>
              {loading
                ? <SkeletonLine width="140px" height="16px" pulseBg={pulseBg} />
                // Title Case applied here rather than at ~30 call sites, matching what
                // GlassHeader/SectionHead/SettingsSection already do in the ui kit — so a
                // heading reads the same whichever design-system module renders it.
                // toTitleCase never touches a word that already has a capital, so acronyms
                // and proper nouns ("WISETECH", "MEP") survive untouched.
                : <span style={{ ...T.cardTitle, fontSize: '15px', fontWeight: 600, color: theme.palette.text.primary, ...HEADING_CASE_SX }}>{toTitleCase(title)}</span>
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
                  backgroundColor: statusMap[status].bg,
                  color: statusMap[status].text,
                  borderRadius: RADIUS.full,
                  fontSize: '10px', fontWeight: 600, padding: '2px 8px', fontFamily: FONT.body,
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: statusMap[status].dot }} />
                  {statusMap[status].label}
                </span>
              )}
            </div>

            {description && !loading && (
              <p className="cfg-section-desc" style={{ fontFamily: FONT.body, fontSize: '12px', color: theme.palette.text.secondary, fontWeight: 400, margin: '4px 0 0 0', lineHeight: 1.5 }}>
                {description}
              </p>
            )}
            {loading && description && (
              <div style={{ marginTop: '6px' }}><SkeletonLine width="220px" height="12px" pulseBg={pulseBg} /></div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="cfg-section-actions" style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexShrink: 0 }}>
          {headerRight}
          {!loading && secondaryActions.map((a, i) => <ActionBtn key={i} action={a} />)}
          {!loading && primaryAction && <ActionBtn action={primaryAction} />}
          {collapsible && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={collapsed ? 'Expand section' : 'Collapse section'}
              onClick={() => setCollapsed(c => !c)}
              style={{ color: theme.palette.text.secondary }}
            >
              <i
                className="bi bi-chevron-down"
                style={{ fontSize: '15px', display: 'inline-block', transition: 'transform 0.2s ease', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Divider below header */}
      {children && !collapsed && (
        <div style={{ height: '1px', backgroundColor: divider, margin: `0 ${pad}` }} />
      )}

      {/* Body */}
      {children && !collapsed && (
        <div style={{ padding: `${SP.md} ${pad} ${pad} calc(${pad} + 8px)` }}>
          {showSkeleton
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
                <SkeletonLine pulseBg={pulseBg} /><SkeletonLine width="80%" pulseBg={pulseBg} /><SkeletonLine width="60%" pulseBg={pulseBg} />
              </div>
            : children
          }
        </div>
      )}
    </div>
  );
};

export default ConfigSectionCard;
