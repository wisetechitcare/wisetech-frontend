import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { WtTooltip } from '@app/modules/common/components/ui';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import { archiveGroup, cloneGroup, listGroups, unarchiveGroup } from '../store/courtesyDeskStore';
import type { PeopleGroup } from '../types';

export default function PeopleGroupsList() {
  useCourtesyDesk();
  const navigate = useNavigate();
  const employeeId = useSelector((s: RootState) => s.employee.currentEmployee?.id);
  const [showArchived, setShowArchived] = useState(false);
  const groups = listGroups(showArchived);

  const columns = useMemo<MRT_ColumnDef<PeopleGroup>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Group name',
        Cell: ({ row }) => (
          <Box>
            <Typography fontWeight={700}>{row.original.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.members
                .slice(0, 3)
                .map((m) => m.fullName)
                .join(', ')}
              {row.original.members.length > 3 ? ` +${row.original.members.length - 3}` : ''}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'peopleCount',
        header: 'People',
        accessorFn: (r) => r.members.length,
        size: 80,
      },
      {
        id: 'mix',
        header: 'Contacts / Employees',
        accessorFn: (r) => {
          const c = r.members.filter((m) => m.memberType === 'CONTACT').length;
          const e = r.members.filter((m) => m.memberType === 'EMPLOYEE').length;
          return `${c} / ${e}`;
        },
        size: 140,
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        Cell: ({ cell }) => cell.getValue<string>() || '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        Cell: ({ cell }) => (cell.getValue<string>() === 'ACTIVE' ? 'Active' : 'Archived'),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 200,
        enableSorting: false,
        Cell: ({ row }) => {
          const g = row.original;
          return (
            <Stack direction="row" spacing={0.25} alignItems="center" onClick={(e) => e.stopPropagation()}>
              <WtTooltip title="Update Group">
                <IconButton size="small" onClick={() => navigate(`/courtesy-desk/groups/${g.id}`)}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </WtTooltip>
              <WtTooltip title="Clone group">
                <IconButton
                  size="small"
                  onClick={() => {
                    const name = window.prompt('New group name', `${g.name} (copy)`);
                    if (!name) return;
                    const cloned = cloneGroup(g.id, name);
                    navigate(`/courtesy-desk/groups/${cloned.id}`);
                  }}
                >
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
              </WtTooltip>
              {g.status === 'ACTIVE' ? (
                <WtTooltip title="Archive">
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (window.confirm(`Archive “${g.name}”?`)) archiveGroup(g.id);
                    }}
                  >
                    <ArchiveRoundedIcon fontSize="small" />
                  </IconButton>
                </WtTooltip>
              ) : (
                <WtTooltip title="Remove from Archive">
                  <IconButton size="small" onClick={() => unarchiveGroup(g.id)}>
                    <UnarchiveRoundedIcon fontSize="small" />
                  </IconButton>
                </WtTooltip>
              )}
              <Button size="small" onClick={() => navigate(`/courtesy-desk/drives/new?groupId=${g.id}`)}>
                Gift Run
              </Button>
            </Stack>
          );
        },
      },
    ],
    [navigate]
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
            People Groups
          </Typography>
          <Typography color="text.secondary">Reusable lists — use Update Group to edit</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            value={showArchived ? 'all' : 'active'}
            onChange={(e) => setShowArchived(e.target.value === 'all')}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="active">Active only</MenuItem>
            <MenuItem value="all">Include archived</MenuItem>
          </TextField>
          <PremiumButton icon="bi-plus-lg" onClick={() => navigate('/courtesy-desk/groups/new')}>
            New Group
          </PremiumButton>
        </Stack>
      </Stack>

      <MaterialTable
        tableName="Courtesy-People-Groups"
        columns={columns}
        data={groups}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => ({
            onClick: () => navigate(`/courtesy-desk/groups/${row.original.id}`),
            sx: { cursor: 'pointer' },
          }),
        }}
      />
    </Box>
  );
}
