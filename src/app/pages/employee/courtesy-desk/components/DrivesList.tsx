import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import { listDrives } from '../store/courtesyDeskStore';
import type { CourtesyDrive } from '../types';
import {
  DRIVE_STATUS_LABELS,
  GIFT_RUN_LABEL,
  GIFT_RUN_LABEL_PLURAL,
  occasionLabel,
} from '../types';

export default function DrivesList() {
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const employeeId = useSelector((s: RootState) => s.employee.currentEmployee?.id);
  const drives = listDrives();

  const columns = useMemo<MRT_ColumnDef<CourtesyDrive>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        Cell: ({ cell }) => <Typography fontWeight={700}>{cell.getValue<string>()}</Typography>,
      },
      { accessorKey: 'giftItem', header: 'Gift' },
      {
        id: 'occasion',
        header: 'Occasion',
        accessorFn: (r) => occasionLabel(desk.config, r.occasionType),
        Cell: ({ row }) => {
          const o = desk.config.occasions.find((x) => x.id === row.original.occasionType);
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: o?.color || '#64748b',
                }}
              />
              <span>{o?.name || row.original.occasionType}</span>
            </Stack>
          );
        },
      },
      { accessorKey: 'sourceGroupName', header: 'Group' },
      { accessorKey: 'driveDate', header: 'Date', size: 110 },
      {
        id: 'qty',
        header: 'Total qty',
        size: 90,
        accessorFn: (r) => r.recipients.reduce((sum, x) => sum + (x.quantity || 1), 0),
      },
      {
        id: 'progress',
        header: 'Progress',
        size: 160,
        accessorFn: (r) => {
          const delivered = r.recipients.filter((x) => x.status === 'DELIVERED').length;
          return r.recipients.length ? delivered / r.recipients.length : 0;
        },
        Cell: ({ row }) => {
          const delivered = row.original.recipients.filter((x) => x.status === 'DELIVERED').length;
          const total = row.original.recipients.length;
          const pct = total ? Math.round((delivered / total) * 100) : 0;
          return (
            <Box>
              <Typography variant="caption">
                {delivered}/{total} ({pct}%)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{ mt: 0.5, height: 6, borderRadius: 999 }}
              />
            </Box>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Gift Run status',
        size: 130,
        Cell: ({ cell }) => DRIVE_STATUS_LABELS[cell.getValue<CourtesyDrive['status']>()],
      },
    ],
    [desk.config]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {GIFT_RUN_LABEL_PLURAL}
          </Typography>
          <Typography color="text.secondary">
            One gift distribution per occasion — track every person, then export
          </Typography>
        </Box>
        <PremiumButton icon="bi-plus-lg" onClick={() => navigate('/courtesy-desk/drives/new')}>
          New {GIFT_RUN_LABEL}
        </PremiumButton>
      </Stack>

      <MaterialTable
        tableName="Courtesy-Gift-Runs"
        columns={columns}
        data={drives}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => ({
            onClick: () => navigate(`/courtesy-desk/drives/${row.original.id}`),
            sx: { cursor: 'pointer' },
          }),
        }}
      />
    </Box>
  );
}
