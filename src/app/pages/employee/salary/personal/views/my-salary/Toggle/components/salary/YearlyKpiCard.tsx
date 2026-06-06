import React from 'react';
import { Box, Paper } from '@mui/material';
import { SxProps } from '@mui/system';
import { Theme } from '@mui/material/styles';

export type YearlyKpiCardTone = 'green' | 'blue' | 'amber' | 'purple' | 'danger' | 'info';

export type YearlyKpiCardProps = {
  label: string;
  sublabel?: string;
  value: string;
  footer?: string;
  footerValue?: string;
  tone: YearlyKpiCardTone;
  icon: React.ReactNode;
  sx?: SxProps<Theme>;
  showSensitiveData?: boolean;
  badge?: string;
};

const toneMap: Record<YearlyKpiCardTone, { color: string; bg: string; border: string }> = {
  green:  { color: '#16a34a', bg: '#f0fdf4',  border: '#bbf7d0' },
  blue:   { color: '#2563eb', bg: '#eff6ff',  border: '#dbeafe' },
  amber:  { color: '#d97706', bg: '#fffbeb',  border: '#fde68a' },
  purple: { color: '#7c3aed', bg: '#f5f3ff',  border: '#e9d5ff' },
  danger: { color: '#dc2626', bg: '#fef2f2',  border: '#fecaca' },
  info:   { color: '#0891b2', bg: '#ecfeff',  border: '#a5f3fc' },
};

const resolveFooterPalette = (footer: string | undefined, mainPalette: typeof toneMap[YearlyKpiCardTone]) => {
  if (!footer) return mainPalette;
  const f = footer.toLowerCase();
  if (f.includes('pending')) return toneMap.danger;
  if (f.includes('extra'))   return toneMap.info;
  return mainPalette;
};

const YearlyKpiCard: React.FC<YearlyKpiCardProps> = ({
  label,
  sublabel,
  value,
  footer,
  footerValue,
  tone,
  icon,
  sx,
  showSensitiveData = true,
  badge,
}) => {
  const palette      = toneMap[tone];
  const footerPal    = resolveFooterPalette(footer, palette);
  const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: '16px',
        border: '1px solid #f0f0f0',
        background: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 220ms ease, transform 220ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)',
        },
        ...sx,
      }}
    >
      {/* Left accent bar */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: palette.color,
          borderRadius: '16px 0 0 16px',
        }}
      />

      {/* Action-required badge */}
      {badge && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            px: 1,
            py: 0.4,
            borderRadius: '6px',
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: palette.color,
            backgroundColor: palette.bg,
            border: `1px solid ${palette.border}`,
          }}
        >
          {badge}
        </Box>
      )}

      <Box sx={{ p: '18px 20px 0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top row: label + icon */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ pr: 1, minWidth: 0 }}>
            <Box
              component="span"
              sx={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#94a3b8',
                lineHeight: 1.3,
              }}
            >
              {label}
            </Box>
            {sublabel && (
              <Box
                component="span"
                sx={{ display: 'block', fontSize: '0.68rem', color: '#b0bec5', fontWeight: 500, mt: 0.2 }}
              >
                {sublabel}
              </Box>
            )}
          </Box>

          {/* Icon badge */}
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              color: palette.color,
              backgroundColor: palette.bg,
              border: `1px solid ${palette.border}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>

        {/* Value */}
        <Box
          component="span"
          className={sensitiveCls}
          sx={{
            display: 'block',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: palette.color,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
            wordBreak: 'break-word',
            mb: 2,
          }}
        >
          {value}
        </Box>
      </Box>

      {/* Footer strip */}
      {footer && (
        <Box
          sx={{
            mx: '20px',
            mb: '16px',
            borderRadius: '10px',
            px: 2,
            py: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: footerPal.bg,
            border: `1px solid ${footerPal.border}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: footerPal.color,
                flexShrink: 0,
              }}
            />
            <Box
              component="span"
              sx={{ fontSize: '0.76rem', fontWeight: 700, color: footerPal.color }}
            >
              {footer}
            </Box>
          </Box>
          {footerValue && (
            <Box
              component="span"
              className={sensitiveCls}
              sx={{ fontSize: '0.76rem', fontWeight: 800, color: footerPal.color }}
            >
              {footerValue}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default YearlyKpiCard;
