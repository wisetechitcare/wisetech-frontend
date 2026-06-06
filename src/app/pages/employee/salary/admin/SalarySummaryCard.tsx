import React from 'react';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

interface SalarySummaryCardProps {
  totalEmployeesPaid?: number;
  totalPayableAmount?: number;
  totalGrossAmount?: number;
  totalDeductAmount?: number;
  totalPaidAmount?: number;
  isLoading?: boolean;
  totalPayableAmountTillDate?: number;
  isLoadingTillDate?: boolean;
}

const fmt = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── Icons ────────────────────────────────────────────────────────────────────

const IconEmployees = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconGross = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDeductions = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconNet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="16 7 22 7 22 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPaid = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

const SalarySummaryCard: React.FC<SalarySummaryCardProps> = ({
  totalEmployeesPaid = 0,
  totalGrossAmount = 0,
  totalDeductAmount = 0,
  totalPaidAmount = 0,
  isLoading = false,
  totalPayableAmountTillDate,
  isLoadingTillDate = false,
}) => {
  const netAmount = Number((totalGrossAmount - totalDeductAmount).toFixed(2));
  const count = totalPayableAmountTillDate !== undefined ? 6 : 5;

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {Array.from({ length: count }).map((_, i) => <KpiSkeleton key={i} />)}
      </Box>
    );
  }

  const cards: CardItem[] = [
    {
      label: 'Employees Paid',
      sublabel: 'This period',
      value: totalEmployeesPaid,
      accent: '#2563eb',
      iconBg: '#eff6ff',
      icon: <IconEmployees />,
    },
    {
      label: 'Total Gross',
      sublabel: 'Before deductions',
      value: fmt(totalGrossAmount),
      accent: '#d97706',
      iconBg: '#fffbeb',
      icon: <IconGross />,
    },
    {
      label: 'Total Deductions',
      sublabel: 'Tax + Govt. charges',
      value: fmt(totalDeductAmount),
      accent: '#dc2626',
      iconBg: '#fef2f2',
      icon: <IconDeductions />,
    },
    {
      label: 'Net Payable',
      sublabel: 'Gross − Deductions',
      value: fmt(netAmount),
      accent: netAmount < 0 ? '#dc2626' : '#16a34a',
      iconBg: netAmount < 0 ? '#fef2f2' : '#f0fdf4',
      icon: <IconNet />,
    },
    {
      label: 'Total Paid',
      sublabel: 'Amount disbursed',
      value: fmt(totalPaidAmount),
      accent: '#0891b2',
      iconBg: '#ecfeff',
      icon: <IconPaid />,
    },
    ...(totalPayableAmountTillDate !== undefined
      ? [{
          label: 'Payable Till Date',
          sublabel: 'Pending balance',
          value: fmt(totalPayableAmountTillDate),
          accent: '#7c3aed',
          iconBg: '#f5f3ff',
          icon: <IconClock />,
        }]
      : []),
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          lg: `repeat(${count}, 1fr)`,
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

export default SalarySummaryCard;
