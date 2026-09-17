import React, { useState } from 'react';
import { C, FONT, SP, RADIUS, KEYFRAMES } from './ConfigDesignSystem';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

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

/**
 * No title band: the page title already sits in the app header and the module tab strip,
 * so a second navy "X Configuration" banner only pushed the settings down the screen.
 */
export interface ConfigPageLayoutProps {
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
  tabs,
  activeTab,
  onTabChange,
  actions,
  statsBar,
  children,
  className = '',
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const hasTabs = !!tabs && tabs.length > 0;
  const hasHeader = hasTabs || !!actions || !!statsBar;

  return (
    <div className={`cfg-layout ${className}`} style={{ backgroundColor: C.bgPage, minHeight: '100vh' }}>
      <style>{KEYFRAMES}</style>

      {/* ── Header: only what a page actually passes (actions, stats, tabs) ── */}
      {hasHeader && (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: hasTabs ? `${RADIUS.xl} ${RADIUS.xl} 0 0` : RADIUS.xl,
          border: `1px solid ${C.border}`,
          borderBottom: hasTabs ? 'none' : `1px solid ${C.border}`,
          boxShadow: '0 1px 0 #e8eaf0, 0 4px 24px rgba(24,28,50,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {actions && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: SP.sm,
            flexWrap: 'wrap',
            padding: `${SP.md} ${SP.xl}`,
          }}>
            {actions}
          </div>
        )}

        {/* Stats bar */}
        {statsBar && (
          <div style={{ padding: `${SP.md} ${SP.xl}` }}>{statsBar}</div>
        )}

        {/* Tab bar */}
        {hasTabs && (
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
                  <AppIcon name={tab.icon} className="fs-6" style={{ opacity: isActive ? 1 : 0.75 }} />
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
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div
        className="cfg-fade-in cfg-body-wrap"
        style={{
          backgroundColor: hasTabs ? '#fff' : 'transparent',
          borderRadius: hasTabs ? `0 0 ${RADIUS.xl} ${RADIUS.xl}` : 0,
          border: hasTabs ? `1px solid ${C.border}` : 'none',
          borderTop: 'none',
          boxShadow: hasTabs ? '0 4px 24px rgba(24,28,50,0.05)' : 'none',
          // With no header above, the body starts flush — the gap was only ever there to
          // separate it from the title band.
          padding: hasTabs ? `${SP.xl} ${SP.xl}` : `${hasHeader ? SP.lg : 0} 0 ${SP.lg}`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ConfigPageLayout;
