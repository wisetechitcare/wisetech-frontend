import React from 'react';
import { Paper, Typography, Box, Grid } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';

interface YearlyOverViewCardProps {
  overview?: {
    startDate: string;
    endDate: string;
    totalPayableDays: number;
    totalNetAmount: number;
    totalPaidAmount: number;
    totalDueAmount: number;
    totalMonths: number;
  };
  title?: string;
  fiscalYear?: string;
  fiscalMonth?: string;
  payableDays?: string | number;
  workingDays?: string | number;
  attendance?: string;
  leavePercentage?: string;
  netPayable?: string | number;
  netPayableLabel?: string;
  netPayableLabelSubtitle?: React.ReactNode;
  paidAmount?: string | number;
  remainingAmount?: string | number;
  startDate?: string;
  endDate?: string;
  loading?: boolean;
  showSensitiveData?: boolean;
}

const YearlyOverViewCard = (props: YearlyOverViewCardProps) => {
  const {
    overview,
    title = 'Yearly Overview',
    fiscalYear = '-',
    fiscalMonth = '-',
    payableDays = '-',
    workingDays = '-',
    attendance = '-',
    leavePercentage = '-',
    netPayable = '-',
    netPayableLabel = 'Net Payable This Year',
    netPayableLabelSubtitle,
    startDate = '-',
    endDate = '-',
    showSensitiveData = true,
  } = props;

  const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

  const computedPayableDays = overview?.totalPayableDays ?? payableDays;
  const computedNetPayable = overview?.totalNetAmount ?? netPayable;
  const computedStartDate = overview?.startDate ?? startDate;
  const computedEndDate = overview?.endDate ?? endDate;
  const computedFiscalMonth = overview?.totalMonths ? `${overview?.totalMonths} Months` : fiscalMonth;

  const startYear = computedStartDate ? new Date(computedStartDate).getFullYear() : '';
  const endYear = computedEndDate ? new Date(computedEndDate).getFullYear() : '';
  const paymentYear = startYear && endYear ? `${startYear}-${endYear}` : fiscalYear;

  const infoRows = [
    { label: 'Fiscal Year', value: paymentYear, icon: <CalendarMonthOutlinedIcon fontSize="small" />, color: '#2563eb' },
    { label: 'Fiscal Month', value: computedFiscalMonth, icon: <DateRangeOutlinedIcon fontSize="small" />, color: '#8b5cf6' },
    { label: 'Working Days', value: workingDays, icon: <BusinessCenterOutlinedIcon fontSize="small" />, color: '#0891b2' },
    { label: 'Payable Days', value: computedPayableDays, icon: <EventAvailableOutlinedIcon fontSize="small" />, color: '#16a34a' },
    { label: 'Attendance', value: attendance, icon: <PersonOutlineOutlinedIcon fontSize="small" />, color: '#d97706' },
    { label: 'Leave Percentage', value: leavePercentage, icon: <EventBusyOutlinedIcon fontSize="small" />, color: '#ef4444' },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, mb: 3 }}>
        {title}
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        {infoRows.map((row, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.25,
                border: '1px solid #f1f5f9',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                transition: 'all 200ms',
                '&:hover': {
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: `${row.color}15`,
                  color: row.color,
                  mr: 1.5,
                  flexShrink: 0,
                }}
              >
                {React.cloneElement(row.icon as React.ReactElement, { style: { fontSize: '1rem' } })}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, mb: 0.1 }}>
                  {row.label}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>
                  {row.value}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          mt: 'auto',
          p: 1.5,
          borderRadius: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
          {netPayableLabel}
        </Typography>
        {netPayableLabelSubtitle && (
          <Typography sx={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 500, mt: 0.2, mb: 0.2 }}>
            {netPayableLabelSubtitle}
          </Typography>
        )}
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', lineHeight: 1.2 }} className={sensitiveCls}>
          {typeof computedNetPayable === 'number'
            ? `₹${Math.round(computedNetPayable).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : (String(computedNetPayable).includes('₹') ? computedNetPayable : `₹${computedNetPayable}`)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default YearlyOverViewCard;
