import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { StatTile, TRIO } from '@app/modules/common/components/ui';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import PeriodNavigator from '@app/modules/common/components/PeriodNavigator';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import {
  getOverviewStats,
  listGroups,
  resetCourtesyDeskDemo,
} from '../store/courtesyDeskStore';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import { DRIVE_STATUS_LABELS, GIFT_RUN_LABEL, GIFT_RUN_LABEL_PLURAL } from '../types';

export default function Overview() {
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const [fyDate, setFyDate] = useState<Dayjs>(dayjs());
  const [fiscalYear, setFiscalYear] = useState('');

  useEffect(() => {
    generateFiscalYearFromGivenYear(fyDate).then(({ startDate, endDate }) =>
      setFiscalYear(`${startDate} to ${endDate}`)
    );
  }, [fyDate]);

  const [fyStart, fyEnd] = useMemo(() => {
    const [s, e] = fiscalYear.split(' to ');
    return [s || undefined, e || undefined];
  }, [fiscalYear]);

  const stats = useMemo(
    () => getOverviewStats(fyStart, fyEnd),
    [desk, fyStart, fyEnd]
  );

  const groups = listGroups();
  const fyLabel = fiscalYear ? `FY ${formatFiscalYearLabel(fiscalYear)}` : '…';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Courtesy Desk
          </Typography>
          <Typography color="text.secondary">
            People groups → {GIFT_RUN_LABEL_PLURAL.toLowerCase()} → handover tracking → CSV / PDF
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <PeriodNavigator
            label={fyLabel}
            onPrevious={() => setFyDate((d) => d.subtract(1, 'year'))}
            onNext={() => setFyDate((d) => d.add(1, 'year'))}
          />
          <PremiumButton icon="bi-people" onClick={() => navigate('/courtesy-desk/groups/new')}>
            New People Group
          </PremiumButton>
          <PremiumButton icon="bi-plus-lg" onClick={() => navigate('/courtesy-desk/drives/new')}>
            New {GIFT_RUN_LABEL}
          </PremiumButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          mb: 3,
        }}
      >
        <StatTile
          label={`Active ${GIFT_RUN_LABEL_PLURAL.toLowerCase()}`}
          value={String(stats.activeDriveCount)}
          trio={TRIO.green}
          icon="gift"
        />
        <StatTile
          label="Pending handovers"
          value={String(stats.pending + stats.out)}
          trio={TRIO.amber}
          icon="time"
        />
        <StatTile
          label="Delivered"
          value={String(stats.delivered)}
          trio={TRIO.blue}
          icon="check-circle"
        />
        <StatTile
          label="People groups"
          value={String(groups.length)}
          trio={TRIO.purple}
          icon="people"
        />
      </Box>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        {GIFT_RUN_LABEL} progress
      </Typography>

      {stats.drives.length === 0 ? (
        <Typography color="text.secondary">
          No {GIFT_RUN_LABEL_PLURAL.toLowerCase()} in {fyLabel}.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {stats.drives.map((d) => {
            const pct = d.total ? Math.round((d.delivered / d.total) * 100) : 0;
            return (
              <Box
                key={d.id}
                onClick={() => navigate(`/courtesy-desk/drives/${d.id}`)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>
                      {d.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {d.giftItem} · {DRIVE_STATUS_LABELS[d.status]} · {d.delivered}/{d.total}{' '}
                      delivered
                      {d.pending ? ` · ${d.pending} pending` : ''}
                    </Typography>
                  </Box>
                  <Typography fontWeight={700}>{pct}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ mt: 1.25, height: 8, borderRadius: 999 }}
                />
              </Box>
            );
          })}
        </Stack>
      )}

      <Box sx={{ mt: 3 }}>
        <Button size="small" variant="text" onClick={() => resetCourtesyDeskDemo()}>
          Reset demo data
        </Button>
      </Box>
    </Box>
  );
}
