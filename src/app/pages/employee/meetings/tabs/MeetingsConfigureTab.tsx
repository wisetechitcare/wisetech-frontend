import { apiErrorMessage } from '@utils/apiError';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { WtButton, WtSwitch } from '@app/modules/common/components/ui';
import {
  ConfigSectionCard,
  ConfigColorChip,
  ConfigChipGrid,
} from '@app/modules/configuration';
import {
  createCompanyAgendaStatus,
  createCompanyMeetingPurpose,
  deleteCompanyAgendaStatus,
  deleteCompanyMeetingPurpose,
  getCompanyAgendaStatuses,
  getCompanyMeetingPurposes,
  updateCompanyAgendaStatus,
  updateCompanyMeetingPurpose,
} from '@services/meetingAgendaMom';
import { MeetingsAppearancePanel } from '../../calendar/views/CalendarConfigure';

const CHIP_COLORS = [
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
  '#3B82F6',
  '#EC4899',
  '#10B981',
  '#6366F1',
];

type EditTarget =
  | { kind: 'status'; id: string; name: string; color: string; isActive: boolean }
  | { kind: 'purpose'; id: string; name: string; isActive: boolean; requiresOther?: boolean }
  | null;

type CreateKind = 'status' | 'purpose';

function byNameAz<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Meetings → Configure: calendar appearance, agenda statuses, purposes.
 */
export default function MeetingsConfigureTab() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [purposes, setPurposes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<EditTarget>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#64748B');
  const [editActive, setEditActive] = useState(true);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState('#3B82F6');

  const sortedStatuses = useMemo(() => byNameAz(statuses), [statuses]);
  const sortedPurposes = useMemo(() => byNameAz(purposes), [purposes]);

  const load = async () => {
    const [sts, purps] = await Promise.all([
      getCompanyAgendaStatuses(),
      getCompanyMeetingPurposes(),
    ]);
    setStatuses(sts.statuses || []);
    setPurposes(purps.purposes || []);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e: any) {
        setError(apiErrorMessage(e, 'Could not load configuration'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openEdit = (target: NonNullable<EditTarget>) => {
    setEdit(target);
    setEditName(target.name);
    setEditActive(!!target.isActive);
    setEditColor(target.kind === 'status' ? target.color || '#64748B' : '#64748B');
  };

  const saveEdit = async () => {
    if (!edit || !editName.trim()) return;
    setBusy(true);
    try {
      if (edit.kind === 'status') {
        await updateCompanyAgendaStatus(edit.id, {
          name: editName.trim(),
          color: editColor.trim() || '#64748B',
          isActive: editActive,
        });
      } else {
        await updateCompanyMeetingPurpose(edit.id, {
          name: editName.trim(),
          isActive: editActive,
        });
      }
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const createItem = async () => {
    if (!createKind || !createName.trim()) return;
    setBusy(true);
    try {
      if (createKind === 'status') {
        await createCompanyAgendaStatus({
          name: createName.trim(),
          color: createColor.trim() || CHIP_COLORS[statuses.length % CHIP_COLORS.length],
        });
      } else {
        await createCompanyMeetingPurpose({ name: createName.trim() });
      }
      setCreateKind(null);
      setCreateName('');
      await load();
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Could not create'));
    } finally {
      setBusy(false);
    }
  };

  const removeStatus = async (status: any) => {
    if (!window.confirm(`Delete status “${status.name}”? Existing agenda rows keep the old code until changed.`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteCompanyAgendaStatus(status.id);
      await load();
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Could not delete status'));
    } finally {
      setBusy(false);
    }
  };

  const removePurpose = async (purpose: any) => {
    if (!window.confirm(`Delete purpose “${purpose.name}”?`)) return;
    setBusy(true);
    try {
      await deleteCompanyMeetingPurpose(purpose.id);
      await load();
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Could not delete purpose'));
    } finally {
      setBusy(false);
    }
  };

  const createTitle = createKind === 'purpose' ? 'New purpose' : 'New status';

  const editTitle = edit?.kind === 'purpose' ? 'Edit purpose' : 'Edit status';

  return (
    <Box className="px-lg-0 px-2 pt-4" sx={{ pb: 4, maxWidth: 1100 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Meetings on the calendar
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Visibility, half-day colours, status colours and related calendar appearance for meetings.
      </Typography>
      <Box sx={{ mb: 3 }}>
        <MeetingsAppearancePanel />
      </Box>

      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Stack spacing={2.5}>
          <ConfigSectionCard
            title="Agenda statuses"
            description="Labels and colours for agenda item status chips (Open, Closed, Information, or your own)."
            icon="bi-flag"
            iconColor="amber"
            primaryAction={{
              label: 'New status',
              icon: 'bi-plus-lg',
              onClick: () => {
                setCreateName('');
                setCreateColor(CHIP_COLORS[statuses.length % CHIP_COLORS.length]);
                setCreateKind('status');
              },
              variant: 'primary',
              disabled: busy,
            }}
          >
            {sortedStatuses.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No statuses yet — defaults appear when you open this screen.
              </Typography>
            ) : (
              <ConfigChipGrid>
                {sortedStatuses.map((status) => (
                  <ConfigColorChip
                    key={status.id}
                    name={status.name}
                    color={status.color || '#64748B'}
                    caption={status.code}
                    badge={status.isActive ? undefined : 'Inactive'}
                    disabled={busy}
                    onEdit={() =>
                      openEdit({
                        kind: 'status',
                        id: status.id,
                        name: status.name,
                        color: status.color || '#64748B',
                        isActive: !!status.isActive,
                      })
                    }
                    action={{
                      icon: 'bi-trash',
                      title: `Delete ${status.name}`,
                      danger: true,
                      onClick: () => removeStatus(status),
                    }}
                  />
                ))}
              </ConfigChipGrid>
            )}
          </ConfigSectionCard>

          <ConfigSectionCard
            title="Meeting purposes"
            description="Used on meeting detail. Title remains the separate calendar/list name."
            icon="bi-bullseye"
            iconColor="teal"
            primaryAction={{
              label: 'New purpose',
              icon: 'bi-plus-lg',
              onClick: () => {
                setCreateName('');
                setCreateKind('purpose');
              },
              variant: 'primary',
              disabled: busy,
            }}
          >
            {sortedPurposes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No purposes yet — add one for meeting detail.
              </Typography>
            ) : (
              <ConfigChipGrid>
                {sortedPurposes.map((purpose, i) => (
                  <ConfigColorChip
                    key={purpose.id}
                    name={purpose.name}
                    color={CHIP_COLORS[(i + 3) % CHIP_COLORS.length]}
                    caption={purpose.requiresOther ? 'Needs details' : undefined}
                    badge={purpose.isActive ? undefined : 'Inactive'}
                    disabled={busy}
                    onEdit={() =>
                      openEdit({
                        kind: 'purpose',
                        id: purpose.id,
                        name: purpose.name,
                        isActive: !!purpose.isActive,
                        requiresOther: !!purpose.requiresOther,
                      })
                    }
                    action={{
                      icon: 'bi-trash',
                      title: `Delete ${purpose.name}`,
                      danger: true,
                      onClick: () => removePurpose(purpose),
                    }}
                  />
                ))}
              </ConfigChipGrid>
            )}
          </ConfigSectionCard>
        </Stack>
      )}

      <Dialog open={!!createKind} onClose={() => !busy && setCreateKind(null)} fullWidth maxWidth="xs">
        <DialogTitle>{createTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void createItem();
              }}
            />
            {createKind === 'status' && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  component="input"
                  type="color"
                  value={createColor}
                  onChange={(e: any) => setCreateColor(e.target.value)}
                  sx={{ width: 40, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.25, bgcolor: 'background.paper' }}
                />
                <TextField
                  size="small"
                  label="Colour"
                  value={createColor}
                  onChange={(e) => setCreateColor(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <WtButton ghost disabled={busy} onClick={() => setCreateKind(null)}>
            Cancel
          </WtButton>
          <WtButton size="small" disabled={busy || !createName.trim()} onClick={createItem}>
            Add
          </WtButton>
        </DialogActions>
      </Dialog>

      <Dialog open={!!edit} onClose={() => !busy && setEdit(null)} fullWidth maxWidth="xs">
        <DialogTitle>{editTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            {edit?.kind === 'status' && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  component="input"
                  type="color"
                  value={editColor}
                  onChange={(e: any) => setEditColor(e.target.value)}
                  sx={{ width: 40, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.25, bgcolor: 'background.paper' }}
                />
                <TextField
                  size="small"
                  label="Colour"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
              <WtSwitch
                checked={editActive}
                disabled={busy}
                onChange={() => setEditActive((v) => !v)}
                size="sm"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <WtButton ghost disabled={busy} onClick={() => setEdit(null)}>
            Cancel
          </WtButton>
          <WtButton size="small" disabled={busy || !editName.trim()} onClick={saveEdit}>
            Save
          </WtButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
