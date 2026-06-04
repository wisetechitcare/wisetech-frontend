import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { SxProps } from '@mui/system';

export type YearlyKpiCardProps = {
  label: string;
  value: string;
  footer?: string;
  footerValue?: string;
  tone: 'green' | 'blue' | 'amber' | 'purple';
  icon: React.ReactNode;
  sx?: SxProps<Theme>;
  showSensitiveData?: boolean;
};

const toneColors: Record<YearlyKpiCardProps['tone'], { color: string; bg: string; border: string }> = {
  green: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  blue: { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
  amber: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  purple: { color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff' },
};

const YearlyKpiCard: React.FC<YearlyKpiCardProps> = ({
  label,
  value,
  footer,
  footerValue,
  tone,
  icon,
  sx,
  showSensitiveData = true,
}) => {
  const palette = toneColors[tone];
  const footerIsNegative = !!footer && footer.toLowerCase().includes('pending');
  const footerIsPositive = !!footer && (footer.toLowerCase().includes('paid') || footer.toLowerCase().includes('cleared'));

  const footerPalette = footerIsNegative
    ? { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
    : footerIsPositive
      ? { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
      : palette;

  const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

  return (
    <Box
      sx={sx}
      className="card h-100 border-1 shadow-sm rounded-4 overflow-hidden position-relative"
      style={{
        backgroundColor: '#ffffff',
        borderColor: palette.border,
      }}
    >
      <div className="card-body p-7 d-flex flex-column">
        <div className="d-flex align-items-center gap-3 mb-5">
          <div
            className="d-grid rounded-3"
            style={{
              display: 'grid',
              width: 38,
              height: 38,
              placeItems: 'center',
              color: palette.color,
              backgroundColor: palette.bg,
              border: `1px solid ${palette.border}`,
            }}
          >
            {icon}
          </div>
          <span className="text-gray-600 fw-bold fs-8 text-uppercase ls-2 tracking-wider">
            {label}
          </span>
        </div>

        <div className="d-flex flex-column mb-5">
          <span className={`fs-1 fw-bolder text-gray-900 mb-1 ${sensitiveCls}`}>
            {footerIsNegative ? value.replace(/^-/, '') : value}
          </span>
        </div>

        {footer && (
          <div
            className="mt-auto w-100 d-flex align-items-center justify-content-between rounded-3 px-4 py-3"
            style={{
              minHeight: '48px',
              backgroundColor: footerPalette.bg,
              border: `1px solid ${footerPalette.border}`,
            }}
          >
            <div className="d-flex align-items-center">
              <span
                className="rounded-circle me-2"
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: footerPalette.color,
                }}
              />
              <span
                className="fw-bold fs-7"
                style={{ color: footerPalette.color }}
              >
                {footer}
              </span>
            </div>
            <span
              className={`fw-bolder fs-7 ${sensitiveCls}`}
              style={{ color: footerPalette.color }}
            >
              {footerValue || ''}
            </span>
          </div>
        )}
      </div>
    </Box>
  );
};

export default YearlyKpiCard;
