import React from 'react';
import { Box, Typography } from '@mui/material';
import { SxProps, Theme } from '@mui/system';

export type YearlyKpiCardProps = {
  /** Label displayed above the value */
  label: string;
  /** Formatted currency or number string */
  value: string;
  /** Optional footer/subtitle */
  footer?: string;
  /** Visual tone for colour accent */
  tone: 'green' | 'blue' | 'amber' | 'purple';
  /** Icon element */
  icon: React.ReactNode;
  /** Optional styling overrides */
  sx?: SxProps<Theme>;
};

/**
 * Reusable KPI card used on the Yearly view.
 * Mirrors the design language of other KPI cards in the app
 * (glass‑morphism, subtle shadow, rounded corners).
 */
const YearlyKpiCard: React.FC<YearlyKpiCardProps> = ({
  label,
  value,
  footer,
  tone,
  icon,
  sx,
}) => {
  const toneColors: Record<YearlyKpiCardProps['tone'], string> = {
    green: '#2aa11f',
    blue: '#1e88e5',
    amber: '#ffb300',
    purple: '#9c27b0',
  };

  return (
    <Box
      sx={[
          {
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(6px)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          },
        ]}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            flex: '0 0 38px',
            borderRadius: '11px',
            display: 'grid',
            placeItems: 'center',
            color: toneColors[tone],
            backgroundColor: `${toneColors[tone]}18`,
            border: `1px solid ${toneColors[tone]}30`,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: '14px',
            color: '#000',
          }}
        >
          {label}
        </Typography>
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontFamily: "'Barlow', sans-serif",
          fontWeight: 600,
          fontSize: '20px',
          color: toneColors[tone],
        }}
      >
        {value}
      </Typography>

      {footer && (
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: '12px',
            color: '#555',
          }}
        >
          {footer}
        </Typography>
      )}
    </Box>
  );
};

export default YearlyKpiCard;
