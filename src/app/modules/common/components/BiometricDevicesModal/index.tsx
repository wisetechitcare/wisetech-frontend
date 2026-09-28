import { useEffect, useMemo, useState, ReactNode } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Box, Stack, Typography, IconButton, Button, TextField, Select,
  MenuItem, ListItemText, CircularProgress, InputAdornment, Paper,
  FormControl, FormHelperText, Skeleton, Drawer, Divider, useMediaQuery,
  Menu, ListItemIcon,
} from '@mui/material';
// Type-only: erased at build, so the MRT vendor chunk stays behind MaterialTable's
// lazy boundary (see MaterialTable.tsx — importing the runtime here would undo the split).
import type { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  fetchDevicesByBranchId, createDevice, updateDeviceById, deleteDeviceById,
  toggleDeviceById, testDeviceById, syncDeviceById, fetchDeviceSyncLogs,
} from '@services/biometric';
import { fetchAllBranches } from '@services/company';
import { IBiometricDevice, ICreateBiometricDevice, IUpdateBiometricDevice, ConnectionMode, IBiometricSyncLog } from '@models/biometric';
import { KTIcon } from '@metronic/helpers';
import {
  toast, alertDialog, confirmDialog, WtDateField,
  GlassDialog, GlassHeader, ToneChip, StatTile, TRIO, WtTooltip, WtButton,
} from '@app/modules/common/components/ui';
import { tonePair, type SemanticTone } from '@app/theme/tokens';
import dayjs from 'dayjs';
import { DATE_FORMATS, formatDateTime } from '@utils/dateFormats';
import { T } from '@app/modules/common/components/ui/tokens';

interface Props {
  show: boolean;
  branchId: string;
  branchName: string;
  onClose: () => void;
}

const ipRegex = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const deviceSchema = Yup.object({
  branchId:     Yup.string().required('Branch is required'),
  name:         Yup.string().required('Device name is required').max(100),
  deviceIp:     Yup.string().required('Device IP is required').matches(ipRegex, 'Invalid IP address'),
  devicePort:   Yup.string().required('Port is required').test('port-range', 'Port must be 1–65535', v => !!v && +v >= 1 && +v <= 65535),
  serialNumber: Yup.string().required('Serial number is required').max(100),
  username:     Yup.string().required('Username is required').max(50),
  password:     Yup.string().max(100),
  connectionMode: Yup.string().oneOf(['PUSH', 'PULL', 'BOTH'], 'Invalid connection mode').required('Connection mode is required'),
});

const EMPTY_FORM = { branchId: '', name: '', deviceIp: '', devicePort: '88', serialNumber: '', username: 'essl', password: '', connectionMode: 'BOTH' as ConnectionMode };

const MODE_META: Record<ConnectionMode, { label: string; tone: SemanticTone; desc: string; hint: string }> = {
  PUSH: { label: 'Push', tone: 'indigo', desc: 'Device sends punches to the server (recommended for cloud)', hint: 'Server never dials the device. The device must POST to the webhook.' },
  PULL: { label: 'Pull', tone: 'warning', desc: 'Server fetches logs from the device (LAN-reachable)', hint: 'Server SOAP-polls the device IP. Requires the device to be reachable.' },
  BOTH: { label: 'Push + Pull', tone: 'cyan', desc: 'Push primary, periodic pull backfills missed punches', hint: 'Webhook is the lifeline; the cron also pulls to backfill any missed punches.' },
};

// Chips, tiles and the dialog shell come from the kit (ToneChip / StatTile /
// GlassDialog + GlassHeader). This file used to hand-roll all three: a `chipSx`
// helper that rebuilt the chip frame, a local StatTile that duplicated the kit's
// down to the icon square, and a Dialog with its own copy of GlassHeader's
// gradient and accent rule. Three copies of components the kit already owns is
// exactly how the app ends up with four close buttons — see ui/README.md.
function StatusChip({ device }: { device: IBiometricDevice }) {
  if (!device.isActive) return <ToneChip dense tone="neutral" label="Inactive" />;
  if (device.consecutiveFailures > 0)
    return <ToneChip dense tone="warning" label={`${device.consecutiveFailures} Failure${device.consecutiveFailures !== 1 ? 's' : ''}`} />;
  return <ToneChip dense tone="success" label="Active" />;
}

function ModeChip({ mode }: { mode: ConnectionMode }) {
  const m = MODE_META[mode] ?? MODE_META.PUSH;
  return <ToneChip dense tone={m.tone} label={m.label} />;
}

function SyncChip({ status }: { status: IBiometricDevice['lastSyncStatus'] }) {
  if (!status) return <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>—</Typography>;
  const map: Record<string, SemanticTone> = { SUCCESS: 'success', FAILED: 'danger', PARTIAL: 'warning' };
  // Sentence-cased: the server's SUCCESS/FAILED is a wire value, not a label to show as-is.
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <ToneChip dense tone={map[status] ?? 'neutral'} label={label} />;
}

/**
 * Mirrors the server's PUSH_STALE_MS (db/BiometricDeviceRepository) — the same hour
 * after which the pull cron stops standing down and resumes dialling the device.
 * Keep the two in step, or the list will call a device healthy while the server has
 * already given up on its pushes.
 */
const PUSH_STALE_MINUTES = 60;

/**
 * Push health at a glance.
 *
 * `lastPushAt` was already on the wire and already typed in models/biometric.ts, but
 * only the Test dialog read it — so "is this device actually pushing, or merely being
 * polled?" meant clicking Test on every device in turn. That is precisely the question
 * that went unanswered for the eleven weeks push was silently dead.
 */
function PushChip({ device }: { device: IBiometricDevice }) {
  // A PULL-only device is not expected to push. An em dash says "not applicable"
  // where a red chip would claim a fault that isn't one.
  if (device.connectionMode === 'PULL') {
    return <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>—</Typography>;
  }
  if (!device.lastPushAt) return <ToneChip dense tone="danger" label="Never" />;
  const live = (Date.now() - new Date(device.lastPushAt).getTime()) / 60000 < PUSH_STALE_MINUTES;
  return (
    <WtTooltip title={`Last push ${formatDateTime(device.lastPushAt)}`}>
      <span>
        <ToneChip
          dense
          tone={live ? 'success' : 'danger'}
          label={live ? 'Live' : `Stale · ${relTime(device.lastPushAt)}`}
        />
      </span>
    </WtTooltip>
  );
}

function LastSynced({ ts }: { ts: string | null }) {
  if (!ts) return <Typography sx={{ color: 'text.disabled', fontSize: 12 }}>Never</Typography>;
  const age = (Date.now() - new Date(ts).getTime()) / 3600000;
  const color = age < 1 ? T.color.success : age < 6 ? T.color.warning : T.color.danger;
  return (
    // The dot carries the staleness; the text carries the fact. `formatDateTime`
    // renders the company date format and follows the viewer's 12/24h setting —
    // the hand-rolled `toLocaleString('en-IN', …)` here did neither, which is why
    // this cell printed a different shape of date from every other screen.
    <WtTooltip title={`Last Synced ${formatDateTime(ts)}`}>
      <Stack direction="row" spacing={0.6} alignItems="center" sx={{ cursor: 'default' }}>
        <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: color, flexShrink: 0 }} />
        <Typography noWrap sx={{ color, fontSize: 12, fontWeight: 600 }}>{relTime(ts)}</Typography>
      </Stack>
    </WtTooltip>
  );
}

function LabeledField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography component="div" sx={{ fontSize: 12.5, color: 'text.primary', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * "6 hours ago", not "6h ago".
 *
 * The abbreviated form saves four characters in a place that has room for them,
 * and costs a beat of decoding on every read — "6h" has to be expanded by the
 * reader before it means anything, and "6d" is routinely misread as hours. The
 * exact timestamp is always one hover away (see LastSynced), so this line only
 * has to answer "recent, or not?" at a glance.
 */
const relTime = (ts: string | null): string => {
  if (!ts) return '—';
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return plural(mins, 'minute');
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return plural(hrs, 'hour');
  const days = Math.floor(hrs / 24);
  if (days < 30) return plural(days, 'day');
  return plural(Math.floor(days / 30), 'month');
};

export default function BiometricDevicesModal({ show, branchId, branchName, onClose }: Props) {
  const [devices, setDevices]         = useState<IBiometricDevice[]>([]);
  const [branches, setBranches]       = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading]         = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formInit, setFormInit]       = useState(EMPTY_FORM);
  const [showPass, setShowPass]       = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({});
  const [history, setHistory] = useState<{ device: IBiometricDevice | null; logs: IBiometricSyncLog[]; loading: boolean }>({ device: null, logs: [], loading: false });

  const openHistory = async (d: IBiometricDevice) => {
    setHistory({ device: d, logs: [], loading: true });
    try { setHistory({ device: d, logs: await fetchDeviceSyncLogs(d.id), loading: false }); }
    catch { setHistory({ device: d, logs: [], loading: false }); }
  };
  const closeHistory = () => setHistory({ device: null, logs: [], loading: false });

  const setAction = (id: string, action: string | null) => setActionLoading(prev => ({ ...prev, [id]: action }));

  const reload = async () => {
    if (!branchId) return;
    setLoading(true);
    try { setDevices(await fetchDevicesByBranchId(branchId)); }
    catch { /* surfaced as empty */ }
    finally { setLoading(false); }
  };

  const loadBranches = async () => {
    try {
      const res = await fetchAllBranches();
      setBranches((res?.data?.branches ?? []).map((b: any) => ({ id: b.id, name: b.name })));
    } catch { /* falls back to current branch */ }
  };

  useEffect(() => { if (show && branchId) { setShowForm(false); reload(); loadBranches(); } }, [show, branchId]);

  // Realtime: refetch when this branch's devices change — cron sync, webhook push,
  // or another admin's edit. Reuses the app's socket → eventBus plumbing; the
  // useEventBus hook auto-unsubscribes on unmount.
  useEventBus(EVENT_KEYS.biometricDeviceUpdated, (p: any) => {
    const branchIds: string[] | undefined = p?.branchIds;
    if (show && branchId && (!branchIds || branchIds.includes(branchId))) reload();
  });

  const openCreate = () => { setFormInit({ ...EMPTY_FORM, branchId }); setEditMode(false); setEditingId(null); setShowPass(false); setShowForm(true); };

  const openEdit = (d: IBiometricDevice) => {
    setFormInit({ branchId: d.branchId, name: d.name, deviceIp: d.deviceIp, devicePort: d.devicePort, serialNumber: d.serialNumber, username: d.username, password: '', connectionMode: d.connectionMode ?? 'BOTH' });
    setEditMode(true); setEditingId(d.id); setShowPass(false); setShowForm(true);
  };

  const handleSubmit = async (values: typeof EMPTY_FORM, { setSubmitting }: any) => {
    try {
      if (editMode && editingId) {
        const payload: IUpdateBiometricDevice = { ...values };
        if (!payload.password) delete payload.password;
        const movedBranch = values.branchId && values.branchId !== branchId;
        await updateDeviceById(editingId, payload);
        if (movedBranch) {
          setDevices(prev => prev.filter(x => x.id !== editingId));
          setShowForm(false);
          toast({ icon: 'success', title: 'Device moved', text: 'Device reassigned to the selected branch.', timer: 2000 });
          setSubmitting(false);
          return;
        }
      } else {
        await createDevice({ ...values, branchId } as ICreateBiometricDevice);
      }
      setShowForm(false);
      await reload();
      toast({ icon: 'success', title: editMode ? 'Device updated' : 'Device added', timer: 1500 });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Error', text: err?.response?.data?.message ?? err?.message ?? 'Something went wrong' });
    } finally { setSubmitting(false); }
  };

  /**
   * The result is written HERE, from the structured fields the endpoint already
   * returns (mode / pullReachable / pullOk / pushHealthy / lastPushAt) — not from
   * the server's prose.
   *
   * What the server sends is a diagnostic line for a developer:
   *   `Device "WT-VASHI" — pull connected; stale — last push 1/7/2026, 6:56:26 pm`
   * Three facts, two clauses and a dash, and a date the server pre-formatted with
   * its own locale — which is how a date in this dialog came to look nothing like
   * a date anywhere else in the app, and why it ignored the 12/24-hour setting.
   *
   * Formatting is the client's job, so the two paths are now one line each, and
   * the timestamp goes through `formatDateTime` like every other date on screen.
   */
  const handleTest = async (d: IBiometricDevice) => {
    setAction(d.id, 'test');
    try {
      const res = await testDeviceById(d.id);
      const lines: string[] = [];

      if (res.mode !== 'PUSH') {
        lines.push(res.pullOk
          ? 'Pull: connected. The server can fetch logs from this device.'
          : res.pullReachable
            ? 'Pull: the device answered, but the sign-in was refused. Check the username and password.'
            : `Pull: no answer from ${d.deviceIp}:${d.devicePort}. Check the device, the network and any port forwarding.`);
      }

      if (res.mode !== 'PULL') {
        lines.push(res.lastPushAt
          ? res.pushHealthy
            ? `Push: working. Last punch received ${formatDateTime(res.lastPushAt)}.`
            : `Push: silent since ${formatDateTime(res.lastPushAt)} (${relTime(res.lastPushAt)}). The device has stopped posting to the webhook.`
          : 'Push: nothing received yet. Configure the device to post punches to the webhook.');
      }

      alertDialog({
        icon: res.connected ? 'success' : 'error',
        title: res.connected ? 'Device Connected' : 'Device Not Reachable',
        // Each fact on its own line: a reader looking for "is push alive?" should
        // not have to parse a sentence to find it.
        text: lines.join('\n\n') || res.message,
      });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Test Failed', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
  };

  const handleSync = async (d: IBiometricDevice) => {
    setAction(d.id, 'sync');
    try {
      // No fromDate/toDate — the backend already resolves "today" in THIS device's
      // own branch timezone (syncDevice handler). Computing "today" here from the
      // browser's UTC clock could pick the WRONG calendar day for a branch far from
      // the admin's own timezone; let the one already-correct source of truth own it.
      const res = await syncDeviceById(d.id);
      await reload();
      toast({ icon: 'success', title: 'Sync Complete', text: `${res.count} record(s) synced`, timer: 2500 });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Sync Failed', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
  };

  // Backfill a past date range from the ESSL bio-server — the automated cron and
  // the quick "Sync" button above both only ever pull TODAY (by design, for
  // near-real-time backfill of missed live punches). A punch that's correct on the
  // device but missing from the app because push AND the daily pull both missed it
  // on some earlier day needs an explicit past-date re-pull — this is that path,
  // wired to the SAME already-correct backend endpoint (POST .../sync accepts
  // fromDate/toDate; the automated paths just never passed anything but today).
  const [backfillTarget, setBackfillTarget] = useState<IBiometricDevice | null>(null);
  const [backfillDates, setBackfillDates] = useState({ fromDate: '', toDate: '' });
  const [backfillSubmitting, setBackfillSubmitting] = useState(false);

  const openBackfill = (d: IBiometricDevice) => {
    const today = new Date().toISOString().split('T')[0];
    setBackfillDates({ fromDate: today, toDate: today });
    setBackfillTarget(d);
  };
  const closeBackfill = () => { setBackfillTarget(null); setBackfillDates({ fromDate: '', toDate: '' }); };

  const handleBackfill = async () => {
    if (!backfillTarget) return;
    const { fromDate, toDate } = backfillDates;
    if (!fromDate || !toDate) {
      alertDialog({ icon: 'error', title: 'Pick both dates', text: 'A from and to date are both required.' });
      return;
    }
    if (fromDate > toDate) {
      alertDialog({ icon: 'error', title: 'Invalid range', text: 'From date must be on or before the to date.' });
      return;
    }
    setBackfillSubmitting(true);
    try {
      const res = await syncDeviceById(backfillTarget.id, { fromDate, toDate });
      await reload();
      toast({ icon: 'success', title: 'Backfill Complete', text: `${res.count} record(s) synced for ${fromDate} → ${toDate}`, timer: 3000 });
      closeBackfill();
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Backfill Failed', text: err?.response?.data?.message ?? err?.message });
    } finally { setBackfillSubmitting(false); }
  };

  const handleToggle = async (d: IBiometricDevice) => {
    setAction(d.id, 'toggle');
    try {
      const updated = await toggleDeviceById(d.id);
      // Merge the full server response so derived fields (e.g. consecutiveFailures,
      // which toggleActive resets to 0) refresh too — not just isActive.
      setDevices(prev => prev.map(x => x.id === d.id ? { ...x, ...updated } : x));
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Error', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
  };

  const handleDelete = async (d: IBiometricDevice) => {
    const ok = await confirmDialog({ icon: 'warning', title: `Delete device "${d.name}"?`, text: 'This action cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    setAction(d.id, 'delete');
    try {
      await deleteDeviceById(d.id);
      setDevices(prev => prev.filter(x => x.id !== d.id));
      toast({ icon: 'success', title: 'Device deleted', timer: 1500 });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Error', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
  };

  const textFields = [
    { key: 'name',         label: 'Device Name',    placeholder: 'e.g. Main Entrance' },
    { key: 'deviceIp',     label: 'Device IP',      placeholder: '192.168.1.100' },
    { key: 'devicePort',   label: 'Port',           placeholder: '88' },
    { key: 'serialNumber', label: 'Serial Number',  placeholder: 'QJT3252900352' },
    { key: 'username',     label: 'Username',       placeholder: 'essl' },
  ];

  const busy = (id: string) => !!actionLoading[id];
  const isMobile = useMediaQuery('(max-width:899.95px)');

  /** Newest `lastSyncedAt` across the listed devices — the value behind the Last Sync tile. */
  const lastSyncedAcrossDevices = devices.reduce<string | null>(
    (acc, d) => (d.lastSyncedAt && (!acc || new Date(d.lastSyncedAt) > new Date(acc)) ? d.lastSyncedAt : acc),
    null,
  );

  // Which row's overflow menu is open, and where to anchor it.
  const [menuFor, setMenuFor] = useState<{ device: IBiometricDevice; anchor: HTMLElement } | null>(null);
  const closeMenu = () => setMenuFor(null);
  /** Run a menu action and close the menu first, so the sheet never hangs over a dialog it opened. */
  const fromMenu = (run: () => void) => () => { closeMenu(); run(); };

  /**
   * Two labelled buttons, then everything else behind one "More" menu.
   *
   * This row used to be SEVEN icon-only buttons, each in its own colour, wrapping
   * onto a second line in the actions column. Three problems, all avoidable:
   *
   *  • Seven equal-weight choices is a Hick's-law tax on every visit. Test and
   *    Sync are what an admin came to do; Edit, History, Backfill, Activate and
   *    Delete are occasional, and occasional actions belong one level down.
   *  • Icon-only works for a couple of familiar glyphs and fails at seven. Nobody
   *    decodes "pulse", "arrows-circle" and "switch" without hovering each one,
   *    and hover does not exist on touch.
   *  • Seven tinted colours read as seven severities. Delete (destructive) and
   *    Backfill (routine) were the same size, a pixel apart — the classic setup
   *    for the wrong click. Delete now sits alone at the foot of the menu, behind
   *    a divider, in the danger tone, and still asks for confirmation.
   *
   * Labels come with the icons in the menu, so the glyphs stop carrying meaning
   * on their own. Shared by the desktop table and the mobile cards.
   */
  const renderActions = (d: IBiometricDevice) => {
    const canPull = d.connectionMode !== 'PUSH';
    const running = actionLoading[d.id];
    return (
      <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap>
        <Button
          size="small" variant="outlined"
          disabled={busy(d.id)} onClick={() => handleTest(d)}
          startIcon={running === 'test' ? <CircularProgress size={14} color="inherit" /> : <KTIcon iconName="pulse" className="fs-5" />}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '9px', minHeight: 36, px: 1.5 }}
        >
          {running === 'test' ? 'Testing…' : 'Test'}
        </Button>
        {canPull && (
          <Button
            size="small" variant="outlined" color="success"
            disabled={busy(d.id)} onClick={() => handleSync(d)}
            startIcon={running === 'sync' ? <CircularProgress size={14} color="inherit" /> : <KTIcon iconName="arrows-circle" className="fs-5" />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '9px', minHeight: 36, px: 1.5 }}
          >
            {running === 'sync' ? 'Syncing…' : 'Sync'}
          </Button>
        )}
        <WtTooltip title="More Actions">
          <span>
            <IconButton
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuFor?.device.id === d.id}
              disabled={busy(d.id)}
              onClick={(e) => setMenuFor({ device: d, anchor: e.currentTarget })}
              sx={{ width: 36, height: 36, borderRadius: '9px', border: '1px solid', borderColor: 'divider', color: 'text.secondary' }}
            >
              {running === 'toggle' || running === 'delete'
                ? <CircularProgress size={16} />
                : <KTIcon iconName="dots-horizontal" className="fs-3" />}
            </IconButton>
          </span>
        </WtTooltip>
      </Stack>
    );
  };

  /** The overflow menu for whichever row opened it. One instance, not one per row. */
  const renderActionMenu = () => {
    if (!menuFor) return null;
    const { device: d, anchor } = menuFor;
    const canPull = d.connectionMode !== 'PUSH';
    const item = (icon: string, label: string, onClick: () => void, danger?: boolean) => (
      <MenuItem onClick={fromMenu(onClick)} sx={danger ? { color: 'error.main' } : undefined}>
        <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}><KTIcon iconName={icon} className="fs-4" /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}>{label}</ListItemText>
      </MenuItem>
    );
    return (
      <Menu
        open anchorEl={anchor} onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
        slotProps={{ paper: { sx: { borderRadius: '12px', minWidth: 216 } } }}
      >
        {canPull && item('calendar', 'Backfill Past Dates', () => openBackfill(d))}
        {item('time', 'Sync History', () => openHistory(d))}
        {item('pencil', 'Edit Device', () => openEdit(d))}
        {item('switch', d.isActive ? 'Deactivate Device' : 'Activate Device', () => handleToggle(d))}
        <Divider sx={{ my: 0.5 }} />
        {item('trash', 'Delete Device', () => handleDelete(d), true)}
      </Menu>
    );
  };

  /**
   * Columns for the shared table engine.
   *
   * Two rules from ui/README.md drive the shapes here:
   *
   *  • SORT ON THE VALUE, RENDER WHAT YOU LIKE. `accessorFn` hands the engine the
   *    raw value — a timestamp for Last Synced, a rank for Status — and `Cell`
   *    draws the chip. Sorting the rendered label would order "10 failures"
   *    before "2 failures" and put "Just now" next to "Inactive".
   *  • AN ACTIONS COLUMN IS NOT DATA. Sorting, filtering and global search are
   *    off for it, or the toolbar offers three controls that do nothing.
   */
  const deviceColumns = useMemo<MRT_ColumnDef<IBiometricDevice>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Device',
      Cell: ({ row }) => (
        <Typography sx={{ fontWeight: 650, fontSize: 13, color: 'text.primary' }}>{row.original.name}</Typography>
      ),
    },
    {
      id: 'address',
      accessorFn: (d) => `${d.deviceIp}:${d.devicePort}`,
      header: 'IP : Port',
      Cell: ({ cell }) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{cell.getValue<string>()}</Typography>
      ),
    },
    {
      accessorKey: 'serialNumber',
      header: 'Serial #',
      Cell: ({ cell }) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{cell.getValue<string>()}</Typography>
      ),
    },
    {
      id: 'mode',
      // The LABEL, not the enum: searching "push + pull" should find a BOTH device.
      accessorFn: (d) => MODE_META[d.connectionMode]?.label ?? d.connectionMode,
      header: 'Mode',
      Cell: ({ row }) => <ModeChip mode={row.original.connectionMode} />,
    },
    {
      id: 'status',
      // Worst first when sorted descending: inactive, then failing, then healthy.
      accessorFn: (d) => (!d.isActive ? 'Inactive' : d.consecutiveFailures > 0 ? `${d.consecutiveFailures} failures` : 'Active'),
      header: 'Status',
      Cell: ({ row }) => <StatusChip device={row.original} />,
    },
    {
      id: 'lastSyncedAt',
      // A timestamp, so the column sorts chronologically. The cell shows "6 hours
      // ago"; sorting that text would put "9 minutes" after "40 minutes".
      accessorFn: (d) => (d.lastSyncedAt ? new Date(d.lastSyncedAt).getTime() : 0),
      header: 'Last Synced',
      Cell: ({ row }) => <LastSynced ts={row.original.lastSyncedAt} />,
    },
    {
      id: 'lastSyncStatus',
      accessorFn: (d) => d.lastSyncStatus ?? '',
      header: 'Sync',
      Cell: ({ row }) => <SyncChip status={row.original.lastSyncStatus} />,
    },
    {
      id: 'push',
      // Sorted as a timestamp so the order is chronological, not alphabetical on
      // "Live"/"Stale". PULL devices sort to one end via -1: they have no push to rank.
      accessorFn: (d) =>
        d.connectionMode === 'PULL' ? -1 : d.lastPushAt ? new Date(d.lastPushAt).getTime() : 0,
      header: 'Push',
      Cell: ({ row }) => <PushChip device={row.original} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 260,
      Cell: ({ row }) => renderActions(row.original),
    },
    // actionLoading drives the in-row spinners and the delete fade, so the cells
    // must re-render when it changes.
  ], [actionLoading, menuFor]);

  // Mobile/tablet card — a device shown as a self-contained card so nothing is clipped by a
  // horizontally-scrolling table on small screens.
  const renderDeviceCard = (d: IBiometricDevice) => (
    <Paper key={d.id} variant="outlined" sx={{ p: 2.25, borderRadius: '14px', borderLeft: '4px solid', borderLeftColor: T.color.brand, fontFamily: T.font.family, opacity: actionLoading[d.id] === 'delete' ? 0.5 : 1 }}>
      <Stack spacing={1.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: T.font.family, fontWeight: 700, fontSize: 16, lineHeight: 1.25, color: T.color.ink, wordBreak: 'break-word' }}>{d.name}</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12.5, color: T.color.inkSoft, mt: 0.4 }}>{d.deviceIp}:{d.devicePort}</Typography>
          </Box>
          <StatusChip device={d} />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
          <ModeChip mode={d.connectionMode} />
          <SyncChip status={d.lastSyncStatus} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, p: 1.5, borderRadius: '10px', bgcolor: T.color.panel }}>
          <LabeledField label="Serial #" value={d.serialNumber} mono />
          <LabeledField label="Last synced" value={<LastSynced ts={d.lastSyncedAt} />} />
          {/* Same answer on a phone as in the table — the mobile card is the whole
              UI below the table's breakpoint, so a column that stops here is invisible. */}
          <LabeledField label="Push" value={<PushChip device={d} />} />
        </Box>
        <Divider sx={{ borderColor: T.color.line }} />
        <Box>
          <Typography sx={{ fontFamily: T.font.family, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.color.inkFaint, mb: 0.75 }}>Actions</Typography>
          {renderActions(d)}
        </Box>
      </Stack>
    </Paper>
  );

  return (
    <>
    <GlassDialog
      open={show} onClose={onClose} maxWidth="lg" fullWidth
      // The shell and its header are the kit's. What stood here was a Dialog plus a
      // Box that re-implemented GlassHeader — the same gradient, the same 3px accent
      // rule, its own icon tile and its own close button — so this dialog drifted
      // from every other dialog in the app one style tweak at a time.
      header={
        <GlassHeader
          title="Biometric Devices"
          subtitle={`${branchName} · ${loading ? 'Loading…' : `${devices.length} device${devices.length !== 1 ? 's' : ''}`}`}
          icon={<KTIcon iconName="fingerprint-scanning" className="fs-1" />}
          onClose={onClose}
          // `inverted` IS this button: the kit's docblock calls it "the
          // gradient-header Add pill generalized". What stood here was a white
          // MUI Button with the pill's colours typed out again by hand — so it
          // had no hover lift, no press, no focus ring and no dark-mode variant,
          // all of which the kit recipe carries.
          action={!showForm && !isMobile ? (
            <WtButton
              inverted size="small"
              startIcon={<KTIcon iconName="plus" className="fs-5" />}
              onClick={openCreate}
            >
              Add Device
            </WtButton>
          ) : undefined}
        />
      }
    >

      {/* Body */}
      <Box sx={{ bgcolor: T.color.panel, p: { xs: 1.5, sm: 2 }, maxHeight: isMobile ? 'none' : '74vh', flex: isMobile ? 1 : 'none', overflowY: 'auto' }}>
        {/* Mobile: primary action lives in the body (header stays uncluttered). */}
        {isMobile && !showForm && devices.length > 0 && (
          <WtButton
            fullWidth onClick={openCreate}
            startIcon={<KTIcon iconName="plus" className="fs-5" />}
            sx={{ mb: 2 }}
          >
            Add Device
          </WtButton>
        )}
        {/* KPI stat strip — responsive: 2 columns on phones, 4 on wider screens. */}
        {!loading && devices.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
            <StatTile label="Devices" value={devices.length} trio={TRIO.blue} icon={<KTIcon iconName="fingerprint-scanning" className="fs-2" />} />
            <StatTile label="Active" value={devices.filter(d => d.isActive).length} trio={TRIO.green} icon={<KTIcon iconName="check-circle" className="fs-2" />} />
            <StatTile
              label="Needs Attention"
              value={devices.filter(d => !d.isActive || d.consecutiveFailures > 0).length}
              trio={devices.some(d => !d.isActive || d.consecutiveFailures > 0) ? TRIO.rose : TRIO.slate}
              icon={<KTIcon iconName="information-5" className="fs-2" />}
            />
            <StatTile
              label="Last Sync"
              value={relTime(lastSyncedAcrossDevices)}
              trio={TRIO.purple}
              icon={<KTIcon iconName="time" className="fs-2" />}
            />
          </Box>
        )}
        {/* Add / Edit form */}
        {showForm && (
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: '12px' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{editMode ? 'Edit Device' : 'Add New Device'}</Typography>
              <ToneChip dense tone="brand" label={editMode ? 'Editing' : 'New'} />
            </Stack>

            <Formik initialValues={formInit} validationSchema={deviceSchema} onSubmit={handleSubmit} enableReinitialize>
              {({ values, errors, touched, isSubmitting, handleChange, handleBlur }) => (
                <Form>
                  <Stack spacing={2}>
                    {editMode && (
                      <FormControl size="small" fullWidth error={Boolean(touched.branchId && errors.branchId)}>
                        <Select
                          name="branchId" value={values.branchId} onChange={handleChange} onBlur={handleBlur} displayEmpty
                        >
                          {branches.length === 0 && <MenuItem value={branchId}>{branchName}</MenuItem>}
                          {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}{b.id !== branchId ? ' (move device)' : ''}</MenuItem>)}
                        </Select>
                        {touched.branchId && errors.branchId && <FormHelperText>{errors.branchId}</FormHelperText>}
                      </FormControl>
                    )}

                    {/* Connection mode */}
                    <Box>
                      <FormControl size="small" fullWidth error={Boolean(touched.connectionMode && errors.connectionMode)}>
                        <Select
                          name="connectionMode" value={values.connectionMode} onChange={handleChange} onBlur={handleBlur}
                          renderValue={(v: any) => MODE_META[v as ConnectionMode].label}
                        >
                          {(Object.keys(MODE_META) as ConnectionMode[]).map(m => (
                            <MenuItem key={m} value={m}>
                              <ListItemText primary={MODE_META[m].label} secondary={MODE_META[m].desc}
                                primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} secondaryTypographyProps={{ fontSize: 11.5 }} />
                            </MenuItem>
                          ))}
                        </Select>
                        {touched.connectionMode && errors.connectionMode && <FormHelperText>{errors.connectionMode}</FormHelperText>}
                      </FormControl>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                        <ModeChip mode={values.connectionMode} />
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{MODE_META[values.connectionMode].hint}</Typography>
                      </Stack>
                    </Box>

                    {/* Core fields */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                      {textFields.map(f => (
                        <TextField
                          key={f.key} name={f.key} label={f.label} placeholder={f.placeholder}
                          value={(values as any)[f.key]} onChange={handleChange} onBlur={handleBlur}
                          error={Boolean((touched as any)[f.key] && (errors as any)[f.key])}
                          helperText={(touched as any)[f.key] && (errors as any)[f.key]}
                          size="small" fullWidth
                        />
                      ))}
                      <TextField
                        name="password" label={editMode ? 'Password (blank = keep)' : 'Password'}
                        type={showPass ? 'text' : 'password'} placeholder={editMode ? '(unchanged)' : 'Enter password'}
                        value={values.password} onChange={handleChange} onBlur={handleBlur}
                        error={Boolean(touched.password && errors.password)} helperText={touched.password && errors.password}
                        size="small" fullWidth
                        InputProps={{ endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPass(p => !p)} aria-label="Toggle password">
                              <KTIcon iconName={showPass ? 'eye-slash' : 'eye'} className="fs-5" />
                            </IconButton>
                          </InputAdornment>
                        ) }}
                      />
                    </Box>

                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                      <Button variant="text" color="inherit" onClick={() => setShowForm(false)}>Cancel</Button>
                      <Button type="submit" variant="contained" disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : undefined}>
                        {editMode ? 'Update Device' : 'Add Device'}
                      </Button>
                    </Stack>
                  </Stack>
                </Form>
              )}
            </Formik>
          </Paper>
        )}

        {/* Device list. The loading skeleton is the engine's (`isLoading`), not a
            third hand-rolled one — it already renders skeleton rows when there is
            no data and a progress bar when there is, in card mode as well as table
            mode. The empty state below stays local because it carries a product
            decision the engine cannot: the "Add Device" call to action. */}
        {!loading && devices.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 7, textAlign: 'center' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '16px', display: 'grid', placeItems: 'center', bgcolor: T.color.panelAlt, color: T.color.inkFaint, mb: 1.5 }}>
              <KTIcon iconName="fingerprint-scanning" className="fs-2x" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>No devices configured for this branch</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5, maxWidth: 360 }}>
              Connect a biometric machine to start syncing attendance for this location.
            </Typography>
            <Button variant="contained" size="small" startIcon={<KTIcon iconName="plus" className="fs-5" />} onClick={openCreate} sx={{ mt: 2 }}>Add Device</Button>
          </Stack>
        ) : (
          // The shared engine, not a hand-written <Table>. What stood here was
          // eight <TableCell>s and a second, separate branch that rebuilt the
          // rows as cards below 900px — so this screen was the only one in the
          // app without sorting, per-column search, column show/hide, export or
          // full-screen, and it maintained its own mobile layout to boot.
          //
          // `renderMobileCard` takes the card renderer this file already had, so
          // the narrow-screen layout is reused rather than re-implemented; the
          // engine decides when to switch to it (≤600px, the same point as every
          // other table) instead of this modal keeping a private breakpoint.
          //
          // persistPreferences={false}: column preferences are saved per table
          // NAME, and this table is opened once per branch from a modal. Persisting
          // would let one branch's column tweak reappear on another and outrank the
          // defaults here — the same reason the drill-down dialogs opt out.
          <MaterialTable
            columns={deviceColumns}
            data={devices}
            tableName="BiometricDevices"
            isLoading={loading}
            persistPreferences={false}
            hidePagination
            searchPlaceholder="Search device, IP or serial number…"
            renderMobileCard={({ row }: { row: { original: IBiometricDevice } }) => renderDeviceCard(row.original)}
            muiTableProps={{
              muiTableBodyRowProps: ({ row }: any) => ({
                // Deleting fades the row it is removing, as before.
                sx: { opacity: actionLoading[row.original?.id] === 'delete' ? 0.5 : 1 },
              }),
            }}
          />
        )}
      </Box>
    </GlassDialog>

    {/* Sync-history drawer — opened from within the device Dialog, so it must sit
        ABOVE it. MUI Drawer defaults to zIndex.drawer (1200) < Dialog (1300), which
        would let the modal occlude the drawer's left edge. Bump above the modal. */}
    <Drawer
      anchor="right"
      open={!!history.device}
      onClose={closeHistory}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      {/* Third copy of that gradient header lived here. GlassHeader is a plain
          Box, so a Drawer takes it exactly as a Dialog does. */}
      <GlassHeader
        title="Sync History"
        subtitle={history.device?.name}
        icon={<KTIcon iconName="time" className="fs-1" />}
        onClose={closeHistory}
      />
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {history.loading ? (
          <Stack sx={{ gap: 1.25 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>
        ) : history.logs.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 5 }}>No sync history yet.</Typography>
        ) : (
          <Stack sx={{ gap: 1.25 }}>
            {history.logs.map(log => {
              const tone: SemanticTone = log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'danger' : 'warning';
              // Wire values are sentence-cased for display: CRON/WEBHOOK/MANUAL and
              // SUCCESS/FAILED are how the server stores them, not how a person reads them.
              const sentence = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();
              return (
                <Paper key={log.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', borderLeft: '3px solid', borderLeftColor: tonePair(tone).fg }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5, gap: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <ToneChip dense tone="neutral" label={sentence(log.triggeredBy)} />
                      <ToneChip dense tone={tone} label={sentence(log.status)} />
                    </Stack>
                    <WtTooltip title={formatDateTime(log.startedAt)}>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', whiteSpace: 'nowrap', cursor: 'default' }}>
                        {relTime(log.startedAt)}
                      </Typography>
                    </WtTooltip>
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: 'text.primary' }}>
                    {log.recordCount ?? 0} record{(log.recordCount ?? 0) !== 1 ? 's' : ''}{log.errorMessage ? '' : ' synced'}
                  </Typography>
                  {log.errorMessage && <Typography sx={{ fontSize: 11.5, color: T.color.danger, mt: 0.5, wordBreak: 'break-word' }}>{log.errorMessage}</Typography>}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Drawer>

    {/* Backfill dialog — sits ABOVE the device Dialog, same reasoning as the
        sync-history Drawer above. */}
    <GlassDialog
      open={!!backfillTarget}
      onClose={backfillSubmitting ? undefined : closeBackfill}
      maxWidth="xs"
      fullWidth
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      // Second copy of the same hand-rolled gradient header, now also the kit's.
      header={
        <GlassHeader
          title="Backfill Past Punches"
          subtitle={backfillTarget?.name}
          icon={<KTIcon iconName="calendar" className="fs-1" />}
          onClose={backfillSubmitting ? undefined : closeBackfill}
        />
      }
    >
      <Box sx={{ p: 2.25 }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
          Re-pulls attendance logs the device already has for the date range below —
          use this when a punch is correct on the biometric device but never made it
          into the app (the automated sync only ever checks today).
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
          <WtDateField
            label="From date"
            value={backfillDates.fromDate}
            onChange={(v) => setBackfillDates(prev => ({ ...prev, fromDate: v }))}
            disabled={backfillSubmitting}
            maxDate={dayjs().format(DATE_FORMATS.WIRE)}
          />
          <WtDateField
            label="To date"
            value={backfillDates.toDate}
            onChange={(v) => setBackfillDates(prev => ({ ...prev, toDate: v }))}
            disabled={backfillSubmitting}
            // A backfill range can't run backwards — the native input never enforced this.
            minDate={backfillDates.fromDate || undefined}
            maxDate={dayjs().format(DATE_FORMATS.WIRE)}
          />
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
          <Button onClick={closeBackfill} disabled={backfillSubmitting} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBackfill}
            disabled={backfillSubmitting}
            startIcon={backfillSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: 'none' }}
          >
            {backfillSubmitting ? 'Backfilling…' : 'Backfill'}
          </Button>
        </Stack>
      </Box>
    </GlassDialog>

    {renderActionMenu()}
    </>
  );
}
