import { ReactNode } from 'react';
import { Box, Card, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'error';
}

const TONE_COLOR: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'primary.main',
  success: 'success.main',
  error: 'error.main',
};

/** Compact KPI tile — mirrors organization's StatCard / access-control's StatisticsCard. */
export const StatCard = ({ label, value, hint, icon, tone = 'default' }: StatCardProps) => (
  <Card variant="outlined" sx={{ borderRadius: 3, p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
    {icon && (
      <Box
        aria-hidden="true"
        sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TONE_COLOR[tone], flexShrink: 0 }}
      >
        {icon}
      </Box>
    )}
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: .4, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary" noWrap>{hint}</Typography>}
    </Box>
  </Card>
);

export default StatCard;
