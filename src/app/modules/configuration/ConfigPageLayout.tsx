import React, { useState } from 'react';
import { C, FONT, SP, RADIUS, KEYFRAMES } from './ConfigDesignSystem';

export interface ConfigTab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface ConfigBreadcrumb {
  label: string;
  href?: string;
}

export interface ConfigPageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  breadcrumbs?: ConfigBreadcrumb[];
  tabs?: ConfigTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  actions?: React.ReactNode;
  statsBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ConfigPageLayout: React.FC<ConfigPageLayoutProps> = ({
  title,
  subtitle,
  icon,
  breadcrumbs,
  tabs,
  activeTab,
  onTabChange,
  actions,
  statsBar,
  children,
  className = '',
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className={`cfg-layout ${className}`} style={{ backgroundColor: C.bgPage, minHeight: '100vh' }}>
      <style>{KEYFRAMES}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: tabs ? `${RADIUS.xl} ${RADIUS.xl} 0 0` : RADIUS.xl,
          border: `1px solid ${C.border}`,
          borderBottom: tabs ? 'none' : `1px solid ${C.border}`,
          boxShadow: '0 1px 0 #e8eaf0, 0 4px 24px rgba(24,28,50,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Full-width top accent bar */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${C.primary} 0%, #c0695a 40%, #e8a090 100%)`,
        }} />

        {/* Title + actions row */}
        <div className="cfg-header-row" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `28px ${SP.xl} ${subtitle ? '6px' : tabs ? '0' : SP.xl} ${SP.xl}`,
          flexWrap: 'wrap',
          gap: SP.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {icon && (
              <div className="cfg-header-icon" style={{
                width: '44px', height: '44px',
                borderRadius: RADIUS.lg,
                background: `linear-gradient(135deg, ${C.primary} 0%, #c0695a 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${C.primaryShadow}`,
              }}>
                <i className={`bi ${icon}`} style={{ fontSize: '20px', color: '#fff' }} />
              </div>
            )}
            <div>
              <h1 className="cfg-header-title" style={{
                fontFamily: FONT.heading,
                fontWeight: 700,
                fontSize: '22px',
                color: C.textPrimary,
                letterSpacing: '-0.4px',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {title}
              </h1>
              {subtitle && (
                <p style={{
                  fontFamily: FONT.body,
                  fontSize: '13px',
                  color: C.textMuted,
                  fontWeight: 400,
                  margin: '4px 0 0 0',
                  lineHeight: 1.4,
                }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexWrap: 'wrap' }}>{actions}</div>
          )}
        </div>

        {/* Stats bar */}
        {statsBar && (
          <div style={{ padding: `${SP.md} ${SP.xl}` }}>{statsBar}</div>
        )}

        {/* Tab bar */}
        {tabs && tabs.length > 0 && (
          <div className="cfg-tab-bar" style={{
            display: 'flex',
            gap: '4px',
            padding: `${SP.md} ${SP.xl} 0 ${SP.xl}`,
            borderBottom: `2px solid ${C.border}`,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none' as any,
            WebkitOverflowScrolling: 'touch' as any,
          }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id && !isActive;
              return (
                <button
                  key={tab.id}
                  className="cfg-tab-btn"
                  data-active={isActive ? 'true' : 'false'}
                  onClick={() => onTabChange?.(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    background: isActive
                      ? C.primaryLight
                      : isHovered
                      ? '#f5f6f8'
                      : 'transparent',
                    border: 'none',
                    borderRadius: `${RADIUS.md} ${RADIUS.md} 0 0`,
                    padding: '9px 16px 11px 16px',
                    margin: 0,
                    color: isActive ? C.primary : isHovered ? C.textPrimary : C.textSecondary,
                    fontFamily: FONT.body,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13.5px',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    letterSpacing: '0',
                  }}
                >
                  <i className={`bi ${tab.icon}`} style={{ fontSize: '14px', opacity: isActive ? 1 : 0.75 }} />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span style={{
                      backgroundColor: isActive ? C.primary : '#e8eaf0',
                      color: isActive ? '#fff' : C.textSecondary,
                      borderRadius: RADIUS.full,
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      lineHeight: '16px',
                      transition: 'all 0.15s ease',
                    }}>
                      {tab.badge}
                    </span>
                  )}
                  {/* Active bottom border – hidden on mobile via CSS */}
                  <span className="cfg-tab-active-line" style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0, right: 0,
                    height: '2px',
                    backgroundColor: isActive ? C.primary : 'transparent',
                    borderRadius: '2px 2px 0 0',
                    transition: 'background-color 0.15s ease',
                  }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div
        className="cfg-fade-in cfg-body-wrap"
        style={{
          backgroundColor: tabs ? '#fff' : 'transparent',
          borderRadius: tabs ? `0 0 ${RADIUS.xl} ${RADIUS.xl}` : 0,
          border: tabs ? `1px solid ${C.border}` : 'none',
          borderTop: 'none',
          boxShadow: tabs ? '0 4px 24px rgba(24,28,50,0.05)' : 'none',
          padding: tabs ? `${SP.xl} ${SP.xl}` : `${SP.lg} 0`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ConfigPageLayout;
