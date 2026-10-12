import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@redux/store';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { WtTooltip } from '@app/modules/common/components/ui';
import { useCourtesyDesk } from '../hooks/useCourtesyDesk';
import {
  addPeopleToDrive,
  applyDriveAssigneeMode,
  bulkUpdateRecipients,
  getDrive,
  removePeopleFromDrive,
  updateDriveMeta,
  updateRecipient,
} from '../store/courtesyDeskStore';
import type {
  CourtesyRecipient,
  DeliveryMode,
  DeliveryStatus,
  DriveStatus,
  PersonRef,
  SkippedReason,
} from '../types';
import {
  DELIVERY_MODE_LABELS,
  DELIVERY_STATUS_LABELS,
  DRIVE_STATUS_LABELS,
  GIFT_RUN_LABEL,
  occasionLabel,
} from '../types';
import { downloadCsv, downloadPdf, type ExportScope } from '../utils/exportDrive';
import PersonPicker from './PersonPicker';

const STATUSES = Object.keys(DELIVERY_STATUS_LABELS) as DeliveryStatus[];
const MODES = Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[];

export default function DriveDetail() {
  const desk = useCourtesyDesk();
  const { driveId } = useParams<{ driveId: string }>();
  const drive = driveId ? getDrive(driveId) : undefined;
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.allEmployees.list);
  const employeeId = useSelector((s: RootState) => s.employee.currentEmployee?.id);

  const [statusFilter, setStatusFilter] = useState<'ALL' | DeliveryStatus>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'CONTACT' | 'EMPLOYEE'>('ALL');
  const [areaFilter, setAreaFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<CourtesyRecipient[]>([]);
  const [message, setMessage] = useState('');
  const [exportScope, setExportScope] = useState<ExportScope>('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [pickerPeople, setPickerPeople] = useState<PersonRef[]>([]);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  const areas = useMemo(() => {
    if (!drive) return [];
    return Array.from(new Set(drive.recipients.map((r) => r.area).filter(Boolean) as string[])).sort();
  }, [drive]);

  const rows = useMemo(() => {
    if (!drive) return [];
    return drive.recipients.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (sourceFilter !== 'ALL' && r.memberType !== sourceFilter) return false;
      if (areaFilter && (r.area || '') !== areaFilter) return false;
      return true;
    });
  }, [drive, statusFilter, sourceFilter, areaFilter]);

  const selectedIds = selectedRows.map((r) => r.id);

  const assigneeOptions = useMemo(
    () => [
      { id: 'demo_e_assignee', name: 'Mobeen' },
      { id: 'demo_e_assignee_2', name: 'Sharif' },
      { id: 'demo_e_assignee_3', name: 'Haseen' },
      ...employees.slice(0, 40).map((e) => ({ id: e.employeeId, name: e.employeeName })),
    ],
    [employees]
  );

  const columns = useMemo<MRT_ColumnDef<CourtesyRecipient>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Person',
        Cell: ({ row }) => {
          const r = row.original;
          const href =
            r.memberType === 'CONTACT' ? `/contacts/${r.personId}` : `/employees/${r.personId}`;
          const isDemo = r.personId.startsWith('demo_');
          return (
            <Box>
              {isDemo ? (
                <Typography fontWeight={600}>{r.fullName}</Typography>
              ) : (
                <Link component={RouterLink} to={href} fontWeight={600} onClick={(e) => e.stopPropagation()}>
                  {r.fullName}
                </Link>
              )}
              <Typography variant="caption" color="text.secondary">
                {r.memberType === 'CONTACT' ? 'Contact' : 'Employee'}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'companyName',
        header: 'Company',
        Cell: ({ cell }) => cell.getValue<string>() || '—',
      },
      {
        id: 'areaAddress',
        header: 'Area / Address',
        accessorFn: (r) => [r.area, r.address].filter(Boolean).join(' · ') || '—',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        size: 120,
        Cell: ({ cell }) => cell.getValue<string>() || '—',
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        size: 90,
        Cell: ({ row }) => (
          <TextField
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            value={row.original.quantity ?? 1}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              updateRecipient(drive!.id, row.original.id, { quantity: n });
            }}
            sx={{ width: 80 }}
          />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Delivery status',
        size: 140,
        Cell: ({ row }) => (
          <TextField
            select
            size="small"
            value={row.original.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const status = e.target.value as DeliveryStatus;
              updateRecipient(drive!.id, row.original.id, {
                status,
                skippedReason: status === 'SKIPPED' ? row.original.skippedReason || 'REFUSED' : '',
              });
            }}
            sx={{ minWidth: 120 }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {DELIVERY_STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        accessorKey: 'mode',
        header: 'Mode',
        size: 130,
        Cell: ({ row }) => (
          <TextField
            select
            size="small"
            value={row.original.mode}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const mode = e.target.value as DeliveryMode;
              if (mode === 'IN_PERSON' && !row.original.assigneeName) {
                const id = drive?.defaultAssigneeEmployeeId || 'demo_e_assignee';
                updateRecipient(drive!.id, row.original.id, {
                  mode,
                  assigneeEmployeeId: id,
                  assigneeName: assigneeOptions.find((a) => a.id === id)?.name || 'Mobeen',
                });
                return;
              }
              updateRecipient(drive!.id, row.original.id, { mode });
            }}
            sx={{ minWidth: 120 }}
          >
            {MODES.map((m) => (
              <MenuItem key={m} value={m}>
                {DELIVERY_MODE_LABELS[m]}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        accessorKey: 'assigneeName',
        header: 'Assignee',
        size: 150,
        Cell: ({ row }) => (
          <TextField
            select
            size="small"
            value={row.original.assigneeEmployeeId || ''}
            disabled={row.original.mode !== 'IN_PERSON'}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const id = e.target.value;
              const found = assigneeOptions.find((a) => a.id === id);
              updateRecipient(drive!.id, row.original.id, {
                assigneeEmployeeId: id,
                assigneeName: found?.name || '',
              });
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">—</MenuItem>
            {assigneeOptions.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        accessorKey: 'remark',
        header: 'Remark',
        Cell: ({ row }) => (
          <TextField
            size="small"
            placeholder="Optional"
            value={row.original.remark || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateRecipient(drive!.id, row.original.id, { remark: e.target.value })}
            sx={{ minWidth: 140 }}
          />
        ),
      },
      {
        id: 'skipped',
        header: 'Skip reason',
        size: 130,
        Cell: ({ row }) =>
          row.original.status === 'SKIPPED' ? (
            <TextField
              select
              size="small"
              value={row.original.skippedReason || 'REFUSED'}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateRecipient(drive!.id, row.original.id, {
                  skippedReason: e.target.value as SkippedReason,
                })
              }
            >
              <MenuItem value="REFUSED">Refused</MenuItem>
              <MenuItem value="NOT_AVAILABLE">Not available</MenuItem>
              <MenuItem value="DO_NOT_GIFT">Do not gift</MenuItem>
            </TextField>
          ) : (
            '—'
          ),
      },
    ],
    [assigneeOptions, drive]
  );

  if (!drive) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">{GIFT_RUN_LABEL} not found.</Alert>
        <Button sx={{ mt: 2 }} startIcon={<AppIcon name="bi-arrow-left" />} onClick={() => navigate('/courtesy-desk/drives')}>
          Back
        </Button>
      </Box>
    );
  }

  const delivered = drive.recipients.filter((r) => r.status === 'DELIVERED').length;
  const pending = drive.recipients.filter((r) => r.status === 'PENDING' || r.status === 'OUT').length;
  const totalQty = drive.recipients.reduce((s, r) => s + (r.quantity || 1), 0);
  const wholeMode = drive.defaultMode === 'MIXED' ? 'MIXED' : drive.defaultMode || 'IN_PERSON';
  const wholeAssignee = drive.defaultAssigneeEmployeeId || '';
  const occasion = desk.config.occasions.find((o) => o.id === drive.occasionType);

  const applyWholeAssignee = (assigneeId: string) => {
    if (!assigneeId) {
      updateDriveMeta(drive.id, { defaultAssigneeEmployeeId: '', defaultAssigneeName: '' });
      return;
    }
    const found = assigneeOptions.find((a) => a.id === assigneeId);
    applyDriveAssigneeMode(drive.id, {
      assigneeEmployeeId: assigneeId,
      assigneeName: found?.name || '',
      mode: 'IN_PERSON',
    });
    setMessage(`Assigned ${found?.name || 'person'} to all (In Person).`);
  };

  const applyWholeMode = (mode: DeliveryMode | 'MIXED') => {
    if (mode === 'MIXED') return;
    if (mode === 'COURIER') {
      applyDriveAssigneeMode(drive.id, { mode: 'COURIER' });
      setMessage('Mode set to Courier for all.');
      return;
    }
    const id = drive.defaultAssigneeEmployeeId || assigneeOptions[0]?.id;
    const found = assigneeOptions.find((a) => a.id === id);
    applyDriveAssigneeMode(drive.id, {
      mode: 'IN_PERSON',
      assigneeEmployeeId: id,
      assigneeName: found?.name || '',
    });
    setMessage('Mode set to In Person for all.');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {drive.title}
          </Typography>
          <Typography color="text.secondary">
            {drive.giftItem} ·{' '}
            <Stack component="span" direction="row" spacing={0.75} alignItems="center" display="inline-flex">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: occasion?.color || '#64748b' }} />
              <span>{occasionLabel(desk.config, drive.occasionType)}</span>
            </Stack>
            {' · '}
            Group:{' '}
            <Link component={RouterLink} to={`/courtesy-desk/groups/${drive.sourceGroupId}`}>
              {drive.sourceGroupName}
            </Link>
            {' · '}
            {delivered}/{drive.recipients.length} delivered · {pending} pending · Qty {totalQty}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button startIcon={<AppIcon name="bi-arrow-left" />} onClick={() => navigate('/courtesy-desk/drives')}>
            Back
          </Button>
          <WtTooltip title="Add people (also updates the group)">
            <Button
              startIcon={<AppIcon name="bi-person-plus" />}
              onClick={() => {
                setPickerPeople([]);
                setAddOpen(true);
              }}
            >
              Add people
            </Button>
          </WtTooltip>
          <WtTooltip title="Remove from Gift Run and group" wrap>
            <Button
              color="error"
              startIcon={<AppIcon name="bi-person-dash" />}
              disabled={!selectedIds.length}
              onClick={() => {
                if (!window.confirm(`Remove ${selectedIds.length} from this ${GIFT_RUN_LABEL} and the group?`))
                  return;
                removePeopleFromDrive(drive.id, selectedIds);
                setSelectedRows([]);
                setMessage('Removed from Gift Run and group.');
              }}
            >
              Remove selected
            </Button>
          </WtTooltip>
          <TextField
            select
            size="small"
            label="Gift Run status"
            value={drive.status}
            onChange={(e) => updateDriveMeta(drive.id, { status: e.target.value as DriveStatus })}
            sx={{ minWidth: 160 }}
          >
            {(Object.keys(DRIVE_STATUS_LABELS) as DriveStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {DRIVE_STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </TextField>
          <PremiumButton
            size="sm"
            icon="bi-check-lg"
            onClick={() => {
              updateDriveMeta(drive.id, {
                title: drive.title,
                status: drive.status,
                defaultMode: drive.defaultMode,
                defaultAssigneeEmployeeId: drive.defaultAssigneeEmployeeId,
                defaultAssigneeName: drive.defaultAssigneeName,
              });
              setMessage(`${GIFT_RUN_LABEL} saved.`);
            }}
          >
            Save
          </PremiumButton>
        </Stack>
      </Stack>

      {message && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography fontWeight={700} sx={{ mb: 1 }}>
          Assign for whole {GIFT_RUN_LABEL}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            select
            size="small"
            label="Assignee (all)"
            value={wholeAssignee}
            onChange={(e) => applyWholeAssignee(e.target.value)}
            sx={{ minWidth: 180 }}
            helperText={wholeAssignee ? 'All rows → In Person' : 'Or set different per person below'}
          >
            <MenuItem value="">— Different / none —</MenuItem>
            {assigneeOptions.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Mode (all)"
            value={wholeMode}
            onChange={(e) => applyWholeMode(e.target.value as DeliveryMode | 'MIXED')}
            sx={{ minWidth: 160 }}
            helperText={wholeMode === 'MIXED' ? 'Mixed — edit per row' : undefined}
          >
            {wholeMode === 'MIXED' && <MenuItem value="MIXED">Mixed</MenuItem>}
            {MODES.map((m) => (
              <MenuItem key={m} value={m}>
                {DELIVERY_MODE_LABELS[m]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          select
          size="small"
          label="Delivery status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All</MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {DELIVERY_STATUS_LABELS[s]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Source"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="ALL">All sources</MenuItem>
          <MenuItem value="CONTACT">Contact</MenuItem>
          <MenuItem value="EMPLOYEE">Employee</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Area"
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All areas</MenuItem>
          {areas.map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <MaterialTable
        tableName="Courtesy-Gift-Run-Recipients"
        columns={columns}
        data={rows}
        employeeId={employeeId}
        enableFilters={false}
        enableGrouping={false}
        enableRowSelection
        onSelectedRowsChange={setSelectedRows}
        renderSelectionActions={(selected) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">{selected.length} selected</Typography>
            <Button
              size="small"
              onClick={() =>
                bulkUpdateRecipients(
                  drive.id,
                  selected.map((r) => r.id),
                  { status: 'OUT' }
                )
              }
            >
              Mark Out
            </Button>
            <Button
              size="small"
              onClick={() =>
                bulkUpdateRecipients(
                  drive.id,
                  selected.map((r) => r.id),
                  { status: 'DELIVERED' }
                )
              }
            >
              Mark Delivered
            </Button>
            <Button
              size="small"
              onClick={() =>
                bulkUpdateRecipients(
                  drive.id,
                  selected.map((r) => r.id),
                  { status: 'SKIPPED', skippedReason: 'REFUSED' }
                )
              }
            >
              Mark Skipped
            </Button>
          </Stack>
        )}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 3 }}>
        <TextField
          select
          size="small"
          label="Export scope"
          value={exportScope}
          onChange={(e) => setExportScope(e.target.value as ExportScope)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All rows</MenuItem>
          <MenuItem value="PENDING">Pending / Out only</MenuItem>
          <MenuItem value="DELIVERED">Delivered only</MenuItem>
        </TextField>
        <PremiumButton size="sm" icon="bi-download" onClick={() => downloadCsv(drive, exportScope)}>
          Export CSV
        </PremiumButton>
        <PremiumButton size="sm" icon="bi-file-earmark-text" onClick={() => downloadPdf(drive, exportScope)}>
          Export PDF
        </PremiumButton>
      </Stack>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add people to {GIFT_RUN_LABEL}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Added people are also saved into the linked People Group.
          </Typography>
          <PersonPicker selected={pickerPeople} onChange={setPickerPeople} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <PremiumButton
            onClick={() => {
              const { added } = addPeopleToDrive(drive.id, pickerPeople);
              setAddOpen(false);
              setMessage(added ? `Added ${added} people (group updated too).` : 'No new people to add.');
            }}
          >
            Add selected
          </PremiumButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
