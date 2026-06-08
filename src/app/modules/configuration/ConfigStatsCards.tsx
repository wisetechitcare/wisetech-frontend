import React from 'react';
import { C, FONT, SP, RADIUS, ICON_COLORS } from './ConfigDesignSystem';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfigStatCard {
  /** Stat label */
  label: string;
  /** The primary value */
  value: string | number;
  /** Small caption below value (e.g. "vs last month") */
  trend?: string;
  /** Trend direction – drives arrow icon and color */
  trendDir?: 'up' | 'down' | 'neutral';
  /** Bootstrap icon class */
  icon: string;
  /** Icon color scheme key */
  iconColor?: 'primary' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'danger' | 'warning';
  /** Loading state */
  loading?: boolean;
}

export interface ConfigStatsCardsProps {
  cards: ConfigStatCard[];
  /** Columns on desktop – default 4 */
  columns?: 2 | 3 | 4;
}

// ─── Single stat card ─────────────────────────────────────────────────────────

const StatCard: React.FC<ConfigStatCard> = ({
  label,
  value,
  trend,
  trendDir = 'neutral',
  icon,
  iconColor = 'primary',
  loading = false,
}) => {
  const iconScheme = ICON_COLORS[iconColor] ?? ICON_COLORS.primary;

  const trendColor =
    trendDir === 'up'
      ? '#16a34a'
      : trendDir === 'down'
      ? C.danger
      : C.textMuted;

  const trendIcon =
    trendDir === 'up'
      ? 'bi-arrow-up-short'
      : trendDir === 'down'
      ? 'bi-arrow-down-short'
      : 'bi-dash';

  return (
    <div
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        padding: SP.lg,
        boxShadow: C.shadowCard,
        display: 'flex',
        flexDirection: 'column',
        gap: SP.md,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadowCardHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadowCard;
      }}
    >
      {/* Background decorative circle */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: iconScheme.bg,
          opacity: 0.5,
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: RADIUS.lg,
          backgroundColor: iconScheme.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loading ? (
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#ddd',
              animation: 'cfgPulse 1.5s ease-in-out infinite',
            }}
          />
        ) : (
          <i className={`bi ${icon}`} style={{ fontSize: '20px', color: iconScheme.color }} />
        )}
      </div>

      {/* Value + label */}
      <div>
        {loading ? (
          <>
            <div
              style={{
                width: '80px',
                height: '28px',
                borderRadius: RADIUS.sm,
                backgroundColor: '#eef0f5',
                animation: 'cfgPulse 1.5s ease-in-out infinite',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                width: '120px',
                height: '12px',
                borderRadius: RADIUS.sm,
                backgroundColor: '#eef0f5',
                animation: 'cfgPulse 1.5s ease-in-out infinite',
              }}
            />
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: FONT.heading,
                fontWeight: 700,
                fontSize: '28px',
                color: C.textPrimary,
                letterSpacing: '-0.5px',
                lineHeight: 1,
                marginBottom: '4px',
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontWeight: 500,
                fontSize: '13px',
                color: C.textMuted,
              }}
            >
              {label}
            </div>
          </>
        )}
      </div>

      {/* Trend */}
      {trend && !loading && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            color: trendColor,
            fontFamily: FONT.body,
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <i className={`bi ${trendIcon}`} style={{ fontSize: '14px' }} />
          {trend}
        </div>
      )}
    </div>
  );
};

// ─── Grid wrapper ─────────────────────────────────────────────────────────────

const ConfigStatsCards: React.FC<ConfigStatsCardsProps> = ({
  cards,
  columns = 4,
}) => {
  const colClass: Record<number, string> = {
    2: 'col-12 col-sm-6',
    3: 'col-12 col-sm-6 col-lg-4',
    4: 'col-12 col-sm-6 col-lg-3',
  };

  return (
    <div className="row g-3" style={{ marginBottom: SP.lg }}>
      {cards.map((card, idx) => (
        <div key={idx} className={colClass[columns] ?? 'col-12 col-sm-6 col-lg-3'}>
          <StatCard {...card} />
        </div>
      ))}
    </div>
  );
};

export default ConfigStatsCards;
