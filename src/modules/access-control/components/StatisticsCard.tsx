import { KeyboardEvent, ReactNode } from 'react';
import { Box, Card, Typography } from '@mui/material';

interface StatisticsCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** When provided, the whole tile becomes an activatable button (click / Enter / Space). */
  onClick?: () => void;
}

/** Compact KPI tile used on the role details page. */
export const StatisticsCard = ({ label, value, hint, icon, onClick }: StatisticsCardProps) => (
  <Card
    variant="outlined"
    {...(onClick && {
      role: 'button',
      tabIndex: 0,
      onClick,
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      },
    })}
    sx={{
      borderRadius: 3, p: 2.5, display: 'flex', gap: 2, alignItems: 'center',
      ...(onClick && {
        cursor: 'pointer',
        transition: 'box-shadow .18s ease, border-color .18s ease',
        '&:hover': { boxShadow: 3, borderColor: 'primary.light' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }),
    }}
  >
    {icon && (
      <Box
        aria-hidden="true"
        sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', flexShrink: 0 }}
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

export default StatisticsCard;
