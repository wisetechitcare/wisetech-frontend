import React from 'react';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

interface ReimbursementSummaryCardProps {
  totalRequestAmount?: number;
  totalApprovedAmount?: number;
  totalPendingAmount?: number;
  totalRejectedAmount?: number;
  totalPaidAmount?: number;
  totalRemainingAmount?: number;
  isLoading?: boolean;
}

const fmt = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconRequest = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconApproved = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPending = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRejected = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPaid = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconRemaining = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="19" cy="5" r="3" fill="currentColor"/>
  </svg>
);

// ── Card config ───────────────────────────────────────────────────────────────

type CardItem = {
  label: string;
  sublabel: string;
  value: string | number;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
};

// ── Single KPI Card ───────────────────────────────────────────────────────────

const KpiCard = ({ item }: { item: CardItem }) => (
  <Paper
    elevation={0}
    sx={{
      height: '100%',
      borderRadius: '16px',
      border: '1px solid #f0f0f0',
      background: '#ffffff',
      overflow: 'hidden',
      position: 'relative',
      transition: 'box-shadow 220ms ease, transform 220ms ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)',
      },
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
        background: item.accent,
        borderRadius: '16px 0 0 16px',
      }}
    />

    <Box sx={{ p: '18px 20px 18px 24px' }}>
      {/* Top row: label + icon */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#94a3b8',
              lineHeight: 1.2,
              mb: 0.3,
            }}
          >
            {item.label}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#b0bec5', fontWeight: 500, lineHeight: 1.2 }}>
            {item.sublabel}
          </Typography>
        </Box>

        {/* Icon badge */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: item.iconBg,
            color: item.accent,
            flexShrink: 0,
          }}
        >
          {item.icon}
        </Box>
      </Stack>

      {/* Value */}
      <Typography
        sx={{
          fontSize: typeof item.value === 'number' ? '2rem' : '1.55rem',
          fontWeight: 800,
          color: item.accent,
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
          wordBreak: 'break-word',
        }}
      >
        {item.value}
      </Typography>
    </Box>
  </Paper>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const KpiSkeleton = () => (
  <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden', p: '18px 20px 18px 24px' }}>
    <Stack direction="row" justifyContent="space-between" mb={2}>
      <Box>
        <Skeleton width={90} height={12} sx={{ mb: 0.5 }} />
        <Skeleton width={60} height={10} />
      </Box>
      <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '12px' }} />
    </Stack>
    <Skeleton width="70%" height={36} />
  </Paper>
);

// ── Main Component ────────────────────────────────────────────────────────────

const ReimbursementSummaryCard: React.FC<ReimbursementSummaryCardProps> = ({
  totalRequestAmount = 0,
  totalApprovedAmount = 0,
  totalPendingAmount = 0,
  totalRejectedAmount = 0,
  totalPaidAmount = 0,
  totalRemainingAmount = 0,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
      </Box>
    );
  }

  const cards: CardItem[] = [
    {
      label: 'Total Request Amount',
      sublabel: 'All requests combined',
      value: fmt(totalRequestAmount),
      accent: '#d97706',
      iconBg: '#fffbeb',
      icon: <IconRequest />,
    },
    {
      label: 'Total Approved Amount',
      sublabel: 'Approved requests',
      value: fmt(totalApprovedAmount),
      accent: '#16a34a',
      iconBg: '#f0fdf4',
      icon: <IconApproved />,
    },
    {
      label: 'Total Pending Amount',
      sublabel: 'Awaiting approval',
      value: fmt(totalPendingAmount),
      accent: '#0891b2',
      iconBg: '#ecfeff',
      icon: <IconPending />,
    },
    {
      label: 'Total Rejected Amount',
      sublabel: 'Rejected requests',
      value: fmt(totalRejectedAmount),
      accent: '#dc2626',
      iconBg: '#fef2f2',
      icon: <IconRejected />,
    },
    {
      label: 'Total Amount Paid',
      sublabel: 'Payments disbursed',
      value: fmt(totalPaidAmount),
      accent: '#7c3aed',
      iconBg: '#f5f3ff',
      icon: <IconPaid />,
    },
    {
      label: 'Total Amount Remaining',
      sublabel: 'Approved, not yet paid',
      value: fmt(totalRemainingAmount),
      accent: '#ea580c',
      iconBg: '#fff7ed',
      icon: <IconRemaining />,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
        gap: '14px',
      }}
    >
      {cards.map((item, i) => (
        <KpiCard key={i} item={item} />
      ))}
    </Box>
  );
};

export default ReimbursementSummaryCard;
