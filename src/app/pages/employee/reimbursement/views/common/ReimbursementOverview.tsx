import React, { useState } from 'react';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import ReorderableGroup from '@app/modules/common/components/ReorderableGroup';
import './reimbursement-overview.css';

export interface ReimbursementOverviewProps {
  totalRequestedAmount: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  /** When provided, an Approved Amount card is shown (My Reimbursements & Search Employee only). */
  approvedAmount?: number;
  /** When provided, a Pending Amount card is shown (My Reimbursements & Search Employee only). */
  pendingAmount?: number;
  isLoading?: boolean;
}

const fmtAmount = (n: number) =>
  Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconAmount = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
  </svg>
);

const IconRequests = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconApproved = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRejected = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconPending = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconApprovedAmount = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPendingAmount = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
    <polyline points="14 14 14 12 12 12 12 16 14 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Card definitions ──────────────────────────────────────────────────────────

type CardDef = {
  id: string;
  label: string;
  sublabel: string;
  accent: string;
  iconBg: string;
  icon: React.ReactNode;
};

const BASE_CARD_DEFS: CardDef[] = [
  {
    id: 'totalAmount',
    label: 'Total Requested Amount',
    sublabel: 'Sum of all requests',
    accent: '#2563eb',
    iconBg: '#eff6ff',
    icon: <IconAmount />,
  },
  {
    id: 'totalRequests',
    label: 'Total Requests',
    sublabel: 'All submissions',
    accent: '#7c3aed',
    iconBg: '#f5f3ff',
    icon: <IconRequests />,
  },
  {
    id: 'approved',
    label: 'Approved',
    sublabel: 'Cleared requests',
    accent: '#16a34a',
    iconBg: '#f0fdf4',
    icon: <IconApproved />,
  },
  {
    id: 'rejected',
    label: 'Rejected',
    sublabel: 'Declined requests',
    accent: '#dc2626',
    iconBg: '#fef2f2',
    icon: <IconRejected />,
  },
  {
    id: 'pending',
    label: 'Pending',
    sublabel: 'Awaiting review',
    accent: '#d97706',
    iconBg: '#fffbeb',
    icon: <IconPending />,
  },
];

const EXTRA_CARD_DEFS: Record<string, CardDef> = {
  approvedAmount: {
    id: 'approvedAmount',
    label: 'Approved Amount',
    sublabel: 'Total cleared value',
    accent: '#0891b2',
    iconBg: '#ecfeff',
    icon: <IconApprovedAmount />,
  },
  pendingAmount: {
    id: 'pendingAmount',
    label: 'Pending Amount',
    sublabel: 'Total awaiting value',
    accent: '#ea580c',
    iconBg: '#fff7ed',
    icon: <IconPendingAmount />,
  },
};

const BASE_DEFAULT_ORDER = BASE_CARD_DEFS.map((c) => c.id);
const ALL_DEFS_BY_ID = new Map<string, CardDef>(
  [...BASE_CARD_DEFS, ...Object.values(EXTRA_CARD_DEFS)].map((c) => [c.id, c])
);

// ── Single KPI card ───────────────────────────────────────────────────────────

const KpiCard = ({ def, value }: { def: CardDef; value: string | number }) => (
  <Paper
    elevation={0}
    sx={{
      height: '100%',
      width: '100%',
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
        background: def.accent,
        borderRadius: '16px 0 0 16px',
      }}
    />

    <Box sx={{ p: '18px 20px 18px 24px' }}>
      {/* Top row: label + icon badge */}
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
            {def.label}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: '#b0bec5', fontWeight: 500, lineHeight: 1.2 }}>
            {def.sublabel}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: def.iconBg,
            color: def.accent,
            flexShrink: 0,
          }}
        >
          {def.icon}
        </Box>
      </Stack>

      {/* Value */}
      <Typography
        sx={{
          fontSize: typeof value === 'number' ? '2rem' : '1.6rem',
          fontWeight: 800,
          color: def.accent,
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  </Paper>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const KpiSkeleton = () => (
  <Paper
    elevation={0}
    sx={{
      flex: '1 1 0',
      minWidth: 0,
      borderRadius: '16px',
      border: '1px solid #f0f0f0',
      overflow: 'hidden',
      p: '18px 20px 18px 24px',
    }}
  >
    <Stack direction="row" justifyContent="space-between" mb={2}>
      <Box>
        <Skeleton width={110} height={12} sx={{ mb: 0.5 }} />
        <Skeleton width={70} height={10} />
      </Box>
      <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '12px' }} />
    </Stack>
    <Skeleton width="65%" height={36} />
  </Paper>
);

// ── Main component ────────────────────────────────────────────────────────────

const ReimbursementOverview: React.FC<ReimbursementOverviewProps> = ({
  totalRequestedAmount,
  totalRequests,
  approvedRequests,
  rejectedRequests,
  pendingRequests,
  approvedAmount,
  pendingAmount,
  isLoading = false,
}) => {
  const userId = useSelector((state: RootState) => (state.auth as any).currentUser?.id as string | undefined);
  const storageKey = userId ? `reimb-overview-order-${userId}` : 'reimb-overview-order';

  // Build the active card id list: base cards + whichever optional cards are provided
  const activeDefaultOrder = [
    ...BASE_DEFAULT_ORDER,
    ...(approvedAmount !== undefined ? ['approvedAmount'] : []),
    ...(pendingAmount !== undefined ? ['pendingAmount'] : []),
  ];

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          const activeSet = new Set(activeDefaultOrder);
          // Keep stored positions for known cards, append any newly-active ones at end
          const filtered = parsed.filter((id) => activeSet.has(id));
          const presentSet = new Set(filtered);
          const missing = activeDefaultOrder.filter((id) => !presentSet.has(id));
          const result = [...filtered, ...missing];
          if (result.length === activeDefaultOrder.length) return result;
        }
      }
    } catch {
      // storage unavailable — fall through to default
    }
    return activeDefaultOrder;
  });

  // When optional cards are added/removed (e.g. parent starts passing pendingAmount), sync order
  const activeKey = activeDefaultOrder.join(',');
  React.useEffect(() => {
    setCardOrder((prev) => {
      const activeSet = new Set(activeDefaultOrder);
      const filtered = prev.filter((id) => activeSet.has(id));
      const presentSet = new Set(filtered);
      const missing = activeDefaultOrder.filter((id) => !presentSet.has(id));
      if (missing.length === 0 && filtered.length === prev.length) return prev;
      return [...filtered, ...missing];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const handleReorder = (newOrder: string[]) => {
    setCardOrder(newOrder);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newOrder));
    } catch {
      // storage unavailable — ignore
    }
  };

  const valueMap: Record<string, string | number> = {
    totalAmount: fmtAmount(totalRequestedAmount),
    totalRequests,
    approved: approvedRequests,
    rejected: rejectedRequests,
    pending: pendingRequests,
    approvedAmount: fmtAmount(approvedAmount ?? 0),
    pendingAmount: fmtAmount(pendingAmount ?? 0),
  };

  if (isLoading) {
    return (
      <>
        <h2>Overview</h2>
        <div className="reimb-overview-container mb-4">
          {activeDefaultOrder.map((id) => (
            <KpiSkeleton key={id} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Overview</h2>
      <div className="mb-4">
        <ReorderableGroup
          items={cardOrder}
          getItemId={(id) => id}
          onReorder={handleReorder}
          axis="x"
          className="reimb-overview-container"
          itemStyle={{ flex: '1 1 0', minWidth: 0, display: 'flex' }}
          renderItem={(id) => {
            const def = ALL_DEFS_BY_ID.get(id);
            if (!def) return null;
            return <KpiCard def={def} value={valueMap[id] ?? 0} />;
          }}
        />
      </div>
    </>
  );
};

export default ReimbursementOverview;
