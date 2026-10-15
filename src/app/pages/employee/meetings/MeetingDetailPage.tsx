/**
 * Meeting Detail workspace — additive Agenda / Minutes of Meeting.
 * Does not replace MeetingFormBody create/edit; schedule-time Agenda chips stay on the form.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  LIFECYCLE_DEFAULT_COLORS,
  lifecycleTone,
  readableOn,
} from '@app/modules/common/components/MeetingsList';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import dayjs from 'dayjs';
import { PageTitle, PageTrail } from '@metronic/layout/core';
import { WtButton, WtDateField } from '@app/modules/common/components/ui';
import { getProjectTeam } from '@services/tasks';
import {
  amendMeetingMinutes,
  confirmMeetingHeld,
  createAgendaItem,
  createMeetingMinutesDraft,
  deleteAgendaItem,
  downloadMeetingMinutesPdf,
  finalizeMeetingMinutes,
  getAgendaItems,
  getMeetingDetail,
  getMeetingMinutes,
  refreshMeetingMinutesDraft,
  updateMeetingMinutesDraft,
  updateMeetingPurpose,
} from '@services/meetingAgendaMom';
import { fetchAllEmployees } from '@services/employee';
import TaskPathSelect, { buildTaskPathOptions } from '../tasks/components/TaskPathSelect';
import { usePresetTasks } from '../tasks/useTaskQueries';
import { useProjectDeliverables } from '../tasks/useProjectDeliverables';
import { getPresetSubtreeIds } from '@utils/presetTaskHierarchy';
import type { PresetTask } from '../tasks/taskDomain';

type PurposeOption = { code: string; label: string; requiresOther?: boolean };

const fmtDate = (v?: string | Date | null) =>
  v ? dayjs(v).format('DD MMM YYYY') : '—';
const fmtTime = (v?: string | Date | null) =>
  v ? dayjs(v).format('HH:mm') : '—';

const errMsg = (e: unknown) => {
  const any = e as any;
  return (
    any?.response?.data?.message ||
    any?.response?.data?.detail ||
    any?.message ||
    'Something went wrong'
  );
};

const tabFromQuery = (raw: string | null) => {
  if (raw === 'agenda') return 1;
  if (raw === 'mom' || raw === 'minutes') return 2;
  return 0;
};

export default function MeetingDetailPage() {
  const { meetingId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => tabFromQuery(searchParams.get('tab')));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [purposeOptions, setPurposeOptions] = useState<PurposeOption[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [minutes, setMinutes] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const perms = detail?.permissions;
  const meeting = detail?.meeting;

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get('tab')));
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const [d, agenda] = await Promise.all([
        getMeetingDetail(meetingId),
        getAgendaItems(meetingId),
      ]);
      setDetail(d.data);
      setPurposeOptions(d.purposeOptions || []);
      setItems(agenda.items || []);
      if (d.data?.permissions?.canViewMom) {
        try {
          const m = await getMeetingMinutes(meetingId);
          setMinutes(m.minutes);
        } catch {
          setMinutes(null);
        }
      } else {
        setMinutes(null);
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    load();
  }, [load]);

  const onConfirmHeld = async () => {
    setBusy(true);
    try {
      const res = await confirmMeetingHeld(meetingId);
      setDetail(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const onSavePurpose = async (purposeCode: string, purposeOtherText: string) => {
    setBusy(true);
    try {
      const res = await updateMeetingPurpose(meetingId, {
        purposeCode: purposeCode || null,
        purposeOtherText: purposeCode === 'OTHER' ? purposeOtherText : null,
      });
      setDetail(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const reloadAgenda = async () => {
    const agenda = await getAgendaItems(meetingId);
    setItems(agenda.items || []);
    // create/delete agenda rebuilds DRAFT MoM lines server-side — re-read them.
    if (detail?.permissions?.canViewMom) {
      try {
        const m = await getMeetingMinutes(meetingId);
        setMinutes(m.minutes);
      } catch {
        /* no MoM yet */
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !meeting) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/employees/meetings/overview')}>
          Back to Meetings
        </Button>
      </Box>
    );
  }

  return (
    <>
      <PageTitle>Meeting detail</PageTitle>
      <PageTrail items={[{ title: meeting?.title || 'Detail', path: '' }]} />

      <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            mb: 2.5,
            p: { xs: 1.5, md: 2 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: (t) =>
              `linear-gradient(135deg, ${t.palette.mode === 'dark' ? 'rgba(15,118,110,0.18)' : 'rgba(15,118,110,0.08)'} 0%, transparent 55%)`,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <IconButton
              aria-label="Back to Meetings"
              onClick={() => navigate('/employees/meetings/overview')}
              sx={{ mt: 0.1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              <ArrowBackRounded fontSize="small" />
            </IconButton>
            <Stack spacing={0.65} sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                {meeting?.title}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {fmtDate(meeting?.startDate)} · {fmtTime(meeting?.startDate)}–{fmtTime(meeting?.endDate)}
                {meeting?.location ? ` · ${meeting.location}` : ''}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {meeting?.purposeLabel && <Chip size="small" label={meeting.purposeLabel} />}
                {meeting?.heldConfirmedAt ? (
                  <Chip size="small" color="success" label="Held confirmed" />
                ) : (
                  <Chip size="small" variant="outlined" label="Held not confirmed" />
                )}
                {meeting?.projectName && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={[meeting.projectNumber, meeting.projectName].filter(Boolean).join(' — ')}
                  />
                )}
                <Chip size="small" variant="outlined" label={`${items.length} agenda`} />
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            const next =
              v === 1 ? 'agenda' : v === 2 ? 'mom' : null;
            if (next) setSearchParams({ tab: next }, { replace: true });
            else setSearchParams({}, { replace: true });
          }}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Agenda" />
          <Tab label="Minutes of Meeting" disabled={!perms?.canViewMom} />
        </Tabs>

        {tab === 0 && (
          <OverviewTab
            meeting={meeting}
            perms={perms}
            purposeOptions={purposeOptions}
            busy={busy}
            onConfirmHeld={onConfirmHeld}
            onSavePurpose={onSavePurpose}
          />
        )}
        {tab === 1 && (
          <AgendaTab
            meetingId={meetingId}
            meeting={meeting}
            items={items}
            canEdit={!!perms?.canEditAgenda}
            onChanged={reloadAgenda}
            onError={setError}
          />
        )}
        {tab === 2 && perms?.canViewMom && (
          <MomTab
            meetingId={meetingId}
            meeting={meeting}
            minutes={minutes}
            setMinutes={setMinutes}
            canEdit={!!perms?.canEditMom}
            canFinalize={!!perms?.canFinalizeMom}
            canExport={!!perms?.canExportPdf}
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            onReloadDetail={load}
          />
        )}
      </Box>
    </>
  );
}

function OverviewTab({
  meeting,
  perms,
  purposeOptions,
  busy,
  onConfirmHeld,
  onSavePurpose,
}: {
  meeting: any;
  perms: any;
  purposeOptions: PurposeOption[];
  busy: boolean;
  onConfirmHeld: () => void;
  onSavePurpose: (code: string, other: string) => void;
}) {
  const [purposeCode, setPurposeCode] = useState(meeting?.purposeCode || '');
  const [other, setOther] = useState(meeting?.purposeOtherText || '');

  useEffect(() => {
    setPurposeCode(meeting?.purposeCode || '');
    setOther(meeting?.purposeOtherText || '');
  }, [meeting?.purposeCode, meeting?.purposeOtherText]);

  const purposeTone = lifecycleTone('#0F766E');
  const heldTone = meeting?.heldConfirmedAt
    ? lifecycleTone(LIFECYCLE_DEFAULT_COLORS.held)
    : lifecycleTone(LIFECYCLE_DEFAULT_COLORS.awaiting);
  const selectedPurpose = purposeOptions.find((o) => o.code === purposeCode);
  const needsOther = !!(selectedPurpose?.requiresOther || purposeCode === 'OTHER');

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: purposeTone.row,
          borderLeft: `4px solid ${purposeTone.edge}`,
        }}
      >
        <Typography fontWeight={800} sx={{ color: readableOn(purposeTone.row), mb: 0.5 }}>
          Purpose
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75 }}>
          Separate from the meeting title used in lists and calendar.
        </Typography>
        {perms?.canManage ? (
          <Stack spacing={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Purpose</InputLabel>
              <Select
                label="Purpose"
                value={purposeCode}
                onChange={(e) => setPurposeCode(e.target.value)}
                sx={{ bgcolor: 'background.paper' }}
              >
                <MenuItem value="">
                  <em>Not set</em>
                </MenuItem>
                {purposeOptions.map((o) => (
                  <MenuItem key={o.code} value={o.code}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {needsOther && (
              <TextField
                label="Please specify"
                size="small"
                fullWidth
                value={other}
                onChange={(e) => setOther(e.target.value)}
                sx={{ bgcolor: 'background.paper' }}
              />
            )}
            <WtButton
              size="small"
              disabled={busy}
              onClick={() => onSavePurpose(purposeCode, other)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Save purpose
            </WtButton>
          </Stack>
        ) : (
          <Typography fontWeight={600}>{meeting?.purposeLabel || 'Not set'}</Typography>
        )}
      </Box>

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: heldTone.row,
          borderLeft: `4px solid ${heldTone.edge}`,
        }}
      >
        <Typography fontWeight={800} sx={{ color: readableOn(heldTone.row), mb: 0.5 }}>
          Meeting held confirmation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75 }}>
          Confirming unlocks Minutes of Meeting drafting. Calendar completion still follows the
          scheduled end; outstanding tasks stay open.
        </Typography>
        {meeting?.heldConfirmedAt ? (
          <Alert severity="success" sx={{ bgcolor: 'background.paper' }}>
            Confirmed {fmtDate(meeting.heldConfirmedAt)}
            {meeting.heldConfirmedByName ? ` by ${meeting.heldConfirmedByName}` : ''}
          </Alert>
        ) : perms?.canConfirmHeld ? (
          <Button
            variant="contained"
            disabled={busy}
            onClick={onConfirmHeld}
            sx={{ bgcolor: heldTone.edge, '&:hover': { bgcolor: heldTone.edge, filter: 'brightness(0.92)' } }}
          >
            Confirm meeting was held
          </Button>
        ) : (
          <Alert severity="info" sx={{ bgcolor: 'background.paper' }}>
            Waiting for the organizer or project manager to confirm.
          </Alert>
        )}
      </Box>
    </Box>
  );
}

function AgendaTab({
  meetingId,
  meeting,
  items,
  canEdit,
  onChanged,
  onError,
}: {
  meetingId: string;
  meeting: any;
  items: any[];
  canEdit: boolean;
  onChanged: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Array<{ id: string; label: string }>>([]);
  const [assignToId, setAssignToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);

  const projectId = meeting?.projectId || null;
  const presetsQuery = usePresetTasks('PROJECT');
  const deliverables = useProjectDeliverables(projectId);
  const presets = (presetsQuery.data?.presetTaskStatuses ?? []) as PresetTask[];
  const { deliverableTaskIds } = deliverables;
  const fromDeliverables = !!projectId && deliverableTaskIds.length > 0;

  const agendaOptions = useMemo(() => {
    if (!fromDeliverables) return buildTaskPathOptions(presets);
    const only = new Set<string>();
    deliverableTaskIds.forEach((id) => getPresetSubtreeIds(presets, id).forEach((n) => only.add(n)));
    return buildTaskPathOptions(presets, only);
  }, [presets, fromDeliverables, deliverableTaskIds]);

  const agendaPickerOptions = useMemo(() => {
    const takenIds = new Set(selectedAgenda.map((a) => a.id));
    const takenLabels = new Set([
      ...selectedAgenda.map((a) => a.label),
      ...items.map((i) => String(i.description || '')),
    ]);
    return agendaOptions.filter(
      (o) => !takenIds.has(o.id) && !takenLabels.has(o.name),
    );
  }, [agendaOptions, selectedAgenda, items]);

  // Remount clears Autocomplete input text after each pick (value stays '').
  const agendaPickerKey = selectedAgenda.map((a) => a.id).join('|') || 'empty';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        if (projectId) {
          const res = await getProjectTeam(projectId);
          const list = res?.members || [];
          const rows = (Array.isArray(list) ? list : [])
            .map((m: any) => {
              const id = m.id || m.employeeId;
              const name =
                [m.users?.firstName, m.users?.lastName].filter(Boolean).join(' ')
                || m.name
                || '';
              return { id: String(id || ''), name: String(name) };
            })
            .filter((r: { id: string; name: string }) => r.id && r.name)
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
          if (!cancelled) setAssignees(rows);
        } else {
          // Same shape as MeetingFormBody: envelope is `{ data: { employees: [...] } }`.
          const res = await fetchAllEmployees(true);
          const list = res?.data?.employees || [];
          const rows = (Array.isArray(list) ? list : [])
            .map((e: any) => ({
              id: String(e.id),
              name: [e.users?.firstName || e.firstName, e.users?.lastName || e.lastName]
                .filter(Boolean)
                .join(' ') || '',
            }))
            .filter((r: { id: string; name: string }) => r.id && r.name)
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
          if (!cancelled) setAssignees(rows);
        }
      } catch {
        if (!cancelled) setAssignees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const assigneeSelected = useMemo(
    () => assignees.find((a) => a.id === assignToId) ?? null,
    [assignees, assignToId],
  );

  const resetForm = () => {
    setSelectedAgenda([]);
    setAssignToId('');
    setDueDate('');
  };

  const submit = async () => {
    if (!selectedAgenda.length) return;
    setSaving(true);
    try {
      const status = assignToId || dueDate ? 'OPEN' : 'INFORMATION';
      const responsibleUserId = assignToId || null;
      const targetCompletionDate = dueDate || null;
      await Promise.all(
        selectedAgenda.map((item) =>
          createAgendaItem(meetingId, {
            description: item.label,
            itemMode: 'DISCUSSION',
            status,
            responsibleUserId,
            targetCompletionDate,
          }),
        ),
      );
      setOpen(false);
      resetForm();
      await onChanged();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteAgendaItem(meetingId, id);
      await onChanged();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Pick one or more agenda items, then set assign to and due date. Same picker as New Meeting.
        </Typography>
        {canEdit && (
          <WtButton size="small" onClick={() => setOpen(true)}>
            Add agenda items
          </WtButton>
        )}
      </Stack>

      {items.length === 0 ? (
        <Alert severity="info">No structured agenda items yet.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography fontWeight={600}>{item.description}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Assign to: {item.responsibleName || '—'}
                    {' · '}
                    Due date: {fmtDate(item.targetCompletionDate)}
                  </Typography>
                </Box>
                {canEdit && (
                  <Button color="error" size="small" onClick={() => onDelete(item.id)}>
                    Remove
                  </Button>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add agenda items</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedAgenda.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {selectedAgenda.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    size="small"
                    onDelete={
                      saving
                        ? undefined
                        : () => setSelectedAgenda((prev) => prev.filter((a) => a.id !== item.id))
                    }
                    sx={{
                      maxWidth: '100%',
                      height: 'auto',
                      py: 0.5,
                      '& .MuiChip-label': { whiteSpace: 'normal' },
                    }}
                  />
                ))}
              </Stack>
            )}
            <TaskPathSelect
              key={agendaPickerKey}
              value=""
              options={agendaPickerOptions}
              onChange={(opt) => {
                if (!opt) return;
                setSelectedAgenda((prev) => (
                  prev.some((a) => a.id === opt.id)
                    ? prev
                    : [...prev, { id: opt.id, label: opt.name }]
                ));
              }}
              label="Agenda item"
              placeholder={projectId
                ? 'Search this project’s deliverable tasks…'
                : 'Search, e.g. electrical load sheet'}
              loading={presetsQuery.isLoading || (!!projectId && deliverables.isFetching)}
              helperText={
                selectedAgenda.length
                  ? `${selectedAgenda.length} selected — pick more from the list`
                  : projectId && fromDeliverables
                    ? 'Only tasks on this project’s deliverables.'
                    : 'Pick one or more agenda items.'
              }
            />
            <Autocomplete
              size="small"
              options={assignees}
              value={assigneeSelected}
              onChange={(_, next) => setAssignToId(next?.id || '')}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(opts, { inputValue }) => {
                const words = inputValue.toLowerCase().split(/\s+/).filter(Boolean);
                return words.length
                  ? opts.filter((o) => {
                      const hay = o.name.toLowerCase();
                      return words.every((w) => hay.includes(w));
                    })
                  : opts;
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign to"
                  placeholder={projectId ? 'Search project team…' : 'Search active employees…'}
                />
              )}
            />
            <WtDateField
              label="Due date"
              value={dueDate}
              onChange={setDueDate}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => {
              if (saving) return;
              setOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || selectedAgenda.length === 0}
            onClick={submit}
          >
            {saving
              ? 'Saving…'
              : selectedAgenda.length > 1
                ? `Add ${selectedAgenda.length}`
                : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MomTab({
  meetingId,
  meeting,
  minutes,
  setMinutes,
  canEdit,
  canFinalize,
  canExport,
  busy,
  setBusy,
  onError,
  onReloadDetail,
}: {
  meetingId: string;
  meeting: any;
  minutes: any;
  setMinutes: (m: any) => void;
  canEdit: boolean;
  canFinalize: boolean;
  canExport: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onError: (m: string) => void;
  onReloadDetail: () => Promise<void>;
}) {
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [lineRemarks, setLineRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    setDiscussionNotes(minutes?.discussionNotes || '');
    setDecisions(minutes?.decisions || '');
    const map: Record<string, string> = {};
    (minutes?.lines || []).forEach((l: any) => {
      map[l.id] = l.remarks || '';
    });
    setLineRemarks(map);
  }, [minutes]);

  // Pull latest agenda into an existing draft once when this tab opens (covers agendas
  // added before MoM was generated, or while the user was on another tab).
  useEffect(() => {
    if (!minutes || minutes.status !== 'DRAFT' || !canEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await refreshMeetingMinutesDraft(meetingId);
        if (!cancelled) setMinutes(res.minutes);
      } catch {
        /* keep current draft */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once per draft id open
  }, [meetingId, minutes?.id, minutes?.status, canEdit]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await createMeetingMinutesDraft(meetingId);
      setMinutes(res.minutes);
      await onReloadDetail();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const res = await refreshMeetingMinutesDraft(meetingId);
      setMinutes(res.minutes);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveManual = async () => {
    setBusy(true);
    try {
      const res = await updateMeetingMinutesDraft(meetingId, {
        discussionNotes,
        decisions,
        lineRemarks: Object.entries(lineRemarks).map(([lineId, remarks]) => ({
          lineId,
          remarks,
        })),
      });
      setMinutes(res.minutes);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveManualQuiet = async () => {
    if (!minutes || minutes.status !== 'DRAFT') return;
    const res = await updateMeetingMinutesDraft(meetingId, {
      discussionNotes,
      decisions,
      lineRemarks: Object.entries(lineRemarks).map(([lineId, remarks]) => ({
        lineId,
        remarks,
      })),
    });
    setMinutes(res.minutes);
  };

  const finalize = async () => {
    setBusy(true);
    try {
      await saveManualQuiet();
      const res = await finalizeMeetingMinutes(meetingId);
      setMinutes(res.minutes);
      await onReloadDetail();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const amend = async () => {
    setBusy(true);
    try {
      const res = await amendMeetingMinutes(meetingId);
      setMinutes(res.minutes);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const res = await downloadMeetingMinutesPdf(meetingId);
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${minutes?.documentNo || 'minutes-of-meeting'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!meeting?.heldConfirmedAt) {
    return (
      <Alert severity="warning">
        Confirm that the meeting was held (Overview tab) before generating Minutes of Meeting.
      </Alert>
    );
  }

  if (!minutes) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="body2" color="text.secondary">
          No Minutes of Meeting yet. Generating a draft pulls agenda lines into the document.
          Discussion notes and decisions you add later are preserved when generated sections are refreshed.
        </Typography>
        {canEdit && (
          <WtButton size="small" disabled={busy} onClick={generate}>
            Generate MoM draft
          </WtButton>
        )}
      </Stack>
    );
  }

  const isDraft = minutes.status === 'DRAFT';
  const isFinal = minutes.status === 'FINAL';

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Chip label={isFinal ? 'Finalized' : 'Draft'} color={isFinal ? 'success' : 'default'} />
        <Typography variant="body2">
          Document No. {minutes.documentNo || '—'} · Rev. {String(minutes.revision ?? 0).padStart(2, '0')}
        </Typography>
        {canEdit && isDraft && (
          <>
            <Button size="small" disabled={busy} onClick={refresh}>
              Refresh generated sections
            </Button>
            <Button size="small" variant="outlined" disabled={busy} onClick={saveManual}>
              Save notes
            </Button>
          </>
        )}
        {canFinalize && isDraft && (
          <WtButton size="small" disabled={busy} onClick={finalize}>
            Finalize
          </WtButton>
        )}
        {canFinalize && isFinal && (
          <WtButton size="small" inverted disabled={busy} onClick={amend}>
            Create amendment draft
          </WtButton>
        )}
        {canExport && (
          <WtButton size="small" disabled={busy} onClick={exportPdf}>
            Download PDF
          </WtButton>
        )}
      </Stack>

      {isDraft && (
        <Alert severity="info">
          Refresh updates agenda-derived columns only. Discussion notes, decisions, and line remarks are never overwritten.
        </Alert>
      )}
      {isFinal && (
        <Alert severity="success">
          This revision is finalized and stable. Later agenda or task changes will not alter this document unless you create an amendment.
        </Alert>
      )}

      <TextField
        label="Discussion notes"
        fullWidth
        multiline
        minRows={3}
        disabled={!isDraft || !canEdit}
        value={discussionNotes}
        onChange={(e) => setDiscussionNotes(e.target.value)}
      />
      <TextField
        label="Decisions"
        fullWidth
        multiline
        minRows={3}
        disabled={!isDraft || !canEdit}
        value={decisions}
        onChange={(e) => setDecisions(e.target.value)}
      />

      <Typography variant="subtitle2">Agenda lines</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: 'action.hover' }}>
              {['S. No.', 'Category', 'Description', 'Responsible person', 'Target completion', 'Open date', 'Status', 'Closure date', 'Remarks'].map(
                (h) => (
                  <Box
                    component="th"
                    key={h}
                    sx={{ border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left', whiteSpace: 'nowrap' }}
                  >
                    {h}
                  </Box>
                ),
              )}
            </Box>
          </Box>
          <Box component="tbody">
            {(minutes.lines || []).map((l: any) => (
              <Box component="tr" key={l.id}>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{l.serialNo}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{l.categoryLabel || '—'}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{l.description}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{l.responsibleLabel || '—'}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{fmtDate(l.targetCompletionDate)}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{fmtDate(l.actualOpenDate)}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{l.status}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1 }}>{fmtDate(l.actualClosureDate)}</Box>
                <Box component="td" sx={{ border: '1px solid', borderColor: 'divider', p: 1, minWidth: 160 }}>
                  {isDraft && canEdit ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={lineRemarks[l.id] ?? ''}
                      onChange={(e) =>
                        setLineRemarks({ ...lineRemarks, [l.id]: e.target.value })
                      }
                    />
                  ) : (
                    l.remarks || '—'
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
