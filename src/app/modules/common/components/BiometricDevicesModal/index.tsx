import { useEffect, useMemo, useState } from 'react';
import { Formik, Form, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { parseDate, today, getLocalTimeZone } from '@internationalized/date';
import {
  Activity, CalendarRange, CheckCircle2, Clock, Fingerprint, History, MoreHorizontal, Pencil, Plus, Power,
  RefreshCw, TriangleAlert, Trash2,
} from 'lucide-react';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { DateRangePicker } from '@/ds/ui/date-picker';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Item, ItemContent, ItemGroup } from '@/ds/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/ds/ui/sheet';
import { Skeleton } from '@/ds/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { EmptyState } from '@/ds/patterns/empty-state';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { PasswordField } from '@/ds/patterns/password-field';
import { SearchSelect } from '@/ds/patterns/search-select';
import { StatCard } from '@/ds/patterns/stat-card';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  fetchDevicesByBranchId, createDevice, updateDeviceById, deleteDeviceById,
  toggleDeviceById, testDeviceById, syncDeviceById, fetchDeviceSyncLogs,
} from '@services/biometric';
import { fetchAllBranches } from '@services/company';
import { IBiometricDevice, ICreateBiometricDevice, IUpdateBiometricDevice, ConnectionMode, IBiometricSyncLog } from '@models/biometric';
import { toast, alertDialog, confirmDialog } from '@app/modules/common/components/ui/feedback';
import { formatDateTime } from '@utils/dateFormats';
import { canDelete } from '@utils/can';

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
type DeviceForm = typeof EMPTY_FORM;

type BadgeTone = 'indigo' | 'warning' | 'cyan' | 'success' | 'danger' | 'neutral';

const MODE_META: Record<ConnectionMode, { label: string; tone: BadgeTone; desc: string; hint: string }> = {
  PUSH: { label: 'Push', tone: 'indigo', desc: 'Device sends punches to the server (recommended for cloud)', hint: 'Server never dials the device. The device must POST to the webhook.' },
  PULL: { label: 'Pull', tone: 'warning', desc: 'Server fetches logs from the device (LAN-reachable)', hint: 'Server SOAP-polls the device IP. Requires the device to be reachable.' },
  BOTH: { label: 'Push + Pull', tone: 'cyan', desc: 'Push primary, periodic pull backfills missed punches', hint: 'Webhook is the lifeline; the cron also pulls to backfill any missed punches.' },
};

/**
 * Mirrors the server's PUSH_STALE_MS (db/BiometricDeviceRepository) — the same hour
 * after which the pull cron stops standing down and resumes dialling the device.
 * Keep the two in step, or the list will call a device healthy while the server has
 * already given up on its pushes.
 */
const PUSH_STALE_MINUTES = 60;

/**
 * "6 hours ago", not "6h ago".
 *
 * The abbreviated form saves four characters in a place that has room for them,
 * and costs a beat of decoding on every read — "6h" has to be expanded by the
 * reader before it means anything, and "6d" is routinely misread as hours. The
 * exact timestamp is always one hover away, so this line only has to answer
 * "recent, or not?" at a glance.
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

/** Wire values (SUCCESS, CRON) are sentence-cased for display: they are how the server stores them, not labels. */
const sentence = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

const statusOf = (d: IBiometricDevice): { label: string; tone: BadgeTone } =>
  !d.isActive ? { label: 'Inactive', tone: 'neutral' }
    : d.consecutiveFailures > 0 ? { label: `${d.consecutiveFailures} Failure${d.consecutiveFailures !== 1 ? 's' : ''}`, tone: 'warning' }
      : { label: 'Active', tone: 'success' };

/**
 * Push health at a glance. `lastPushAt` answers "is this device actually pushing, or merely being polled?" —
 * the question that went unanswered for the eleven weeks push was silently dead.
 */
const pushOf = (d: IBiometricDevice): { label: string; tone: BadgeTone } | null => {
  // A PULL-only device is not expected to push: "not applicable", not a red chip claiming a fault.
  if (d.connectionMode === 'PULL') return null;
  if (!d.lastPushAt) return { label: 'Never', tone: 'danger' };
  const live = (Date.now() - new Date(d.lastPushAt).getTime()) / 60000 < PUSH_STALE_MINUTES;
  return live ? { label: 'Live', tone: 'success' } : { label: `Stale · ${relTime(d.lastPushAt)}`, tone: 'danger' };
};

const syncTone = (s: IBiometricDevice['lastSyncStatus']): BadgeTone =>
  s === 'SUCCESS' ? 'success' : s === 'FAILED' ? 'danger' : s === 'PARTIAL' ? 'warning' : 'neutral';

function NotApplicable() {
  return <span className="text-xs text-muted-foreground">—</span>;
}

/** A detail chip whose exact time lives in a kit Tooltip. */
function TimedBadge({ tone, label, title }: { tone: BadgeTone; label: string; title: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Badge variant={tone} dot>{label}</Badge>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function PushBadge({ device }: { device: IBiometricDevice }) {
  const p = pushOf(device);
  if (!p) return <NotApplicable />;
  if (!device.lastPushAt) return <Badge variant={p.tone} dot>{p.label}</Badge>;
  return <TimedBadge tone={p.tone} label={p.label} title={`Last push ${formatDateTime(device.lastPushAt)}`} />;
}

/** The colour carries the staleness (under 1 hour / under 6 / older); the text carries the fact. */
function LastSynced({ ts }: { ts: string | null }) {
  if (!ts) return <span className="text-xs text-muted-foreground">Never</span>;
  const age = (Date.now() - new Date(ts).getTime()) / 3600000;
  return <TimedBadge tone={age < 1 ? 'success' : age < 6 ? 'warning' : 'danger'} label={relTime(ts)} title={`Last synced ${formatDateTime(ts)}`} />;
}

/** One labelled text field of the device form, bound to Formik. */
function DeviceTextField({ form, name, label, placeholder, required, inputMode, mono }: {
  form: FormikProps<DeviceForm>;
  name: 'name' | 'deviceIp' | 'devicePort' | 'serialNumber' | 'username';
  label: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: 'numeric' | 'decimal' | 'text';
  mono?: boolean;
}) {
  const id = `device-${name}`;
  const error = (form.touched[name] || form.submitCount > 0) ? form.errors[name] : undefined;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        required={required}
        value={form.values[name]}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        className={mono ? 'font-mono' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

const DEVICE_FORM_ID = 'biometric-device-form';
const BACKFILL_FORM_ID = 'biometric-backfill-form';

export default function BiometricDevicesModal({ show, branchId, branchName, onClose }: Props) {
  const [devices, setDevices]         = useState<IBiometricDevice[]>([]);
  const [branches, setBranches]       = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading]         = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formInit, setFormInit]       = useState(EMPTY_FORM);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload/loadBranches read only props; refetch on open
  useEffect(() => { if (show && branchId) { setShowForm(false); reload(); loadBranches(); } }, [show, branchId]);

  // Realtime: refetch when this branch's devices change — cron sync, webhook push,
  // or another admin's edit. Reuses the app's socket → eventBus plumbing; the
  // useEventBus hook auto-unsubscribes on unmount.
  useEventBus(EVENT_KEYS.biometricDeviceUpdated, (p: any) => {
    const branchIds: string[] | undefined = p?.branchIds;
    if (show && branchId && (!branchIds || branchIds.includes(branchId))) reload();
  });

  const openCreate = () => { setFormInit({ ...EMPTY_FORM, branchId }); setEditMode(false); setEditingId(null); setShowForm(true); };

  const openEdit = (d: IBiometricDevice) => {
    setFormInit({ branchId: d.branchId, name: d.name, deviceIp: d.deviceIp, devicePort: d.devicePort, serialNumber: d.serialNumber, username: d.username, password: '', connectionMode: d.connectionMode ?? 'BOTH' });
    setEditMode(true); setEditingId(d.id); setShowForm(true);
  };

  const handleSubmit = async (values: DeviceForm, { setSubmitting }: { setSubmitting: (v: boolean) => void }) => {
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
   * the server's prose, which is a diagnostic line for a developer with a date the
   * server pre-formatted in its own locale. Formatting is the client's job, so the
   * timestamp goes through `formatDateTime` like every other date on screen.
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
      // browser's clock could pick the WRONG calendar day for a branch far from
      // the admin's own timezone; let the one already-correct source of truth own it.
      const res = await syncDeviceById(d.id);
      await reload();
      toast({ icon: 'success', title: 'Sync Complete', text: `${res.count} record(s) synced`, timer: 2500 });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Sync Failed', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
  };

  // Backfill a past date range from the ESSL bio-server — the automated cron and
  // the quick "Sync" button both only ever pull TODAY (by design, for near-real-time
  // backfill of missed live punches). A punch that's correct on the device but
  // missing from the app because push AND the daily pull both missed it on some
  // earlier day needs an explicit past-date re-pull — this is that path, wired to the
  // SAME backend endpoint (POST .../sync accepts fromDate/toDate).
  const [backfillTarget, setBackfillTarget] = useState<IBiometricDevice | null>(null);
  const [backfillDates, setBackfillDates] = useState({ fromDate: '', toDate: '' });
  const [backfillSubmitting, setBackfillSubmitting] = useState(false);

  const openBackfill = (d: IBiometricDevice) => {
    const todayIso = today(getLocalTimeZone()).toString();
    setBackfillDates({ fromDate: todayIso, toDate: todayIso });
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

  const busy = (id: string) => !!actionLoading[id];
  const canRemove = canDelete('attendance.employees');

  /** Newest `lastSyncedAt` across the listed devices — the value behind the Last Sync tile. */
  const lastSyncedAcrossDevices = devices.reduce<string | null>(
    (acc, d) => (d.lastSyncedAt && (!acc || new Date(d.lastSyncedAt) > new Date(acc)) ? d.lastSyncedAt : acc),
    null,
  );
  const needsAttention = devices.filter(d => !d.isActive || d.consecutiveFailures > 0).length;

  /**
   * Two labelled buttons, then everything else behind one "More" menu. Test and Sync are what an admin came to
   * do; Edit, History, Backfill, Activate and Delete are occasional, and occasional actions belong one level
   * down. Delete sits alone at the foot of the menu, separated and in the danger tone, and still confirms.
   * Shared by the table rows and the phone cards.
   */
  const renderActions = (d: IBiometricDevice) => {
    const canPull = d.connectionMode !== 'PUSH';
    const running = actionLoading[d.id];
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" disabled={busy(d.id)} loading={running === 'test'} onClick={() => handleTest(d)}>
          {running !== 'test' && <Activity data-icon="inline-start" aria-hidden />}
          {running === 'test' ? 'Testing…' : 'Test'}
        </Button>
        {canPull && (
          <Button size="sm" variant="outline" disabled={busy(d.id)} loading={running === 'sync'} onClick={() => handleSync(d)}>
            {running !== 'sync' && <RefreshCw data-icon="inline-start" aria-hidden />}
            {running === 'sync' ? 'Syncing…' : 'Sync'}
          </Button>
        )}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={`More actions for ${d.name}`}
                      disabled={busy(d.id)}
                      loading={running === 'toggle' || running === 'delete'}
                    />
                  }
                />
              }
            >
              <MoreHorizontal aria-hidden />
            </TooltipTrigger>
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            {canPull && (
              <DropdownMenuItem onClick={() => openBackfill(d)}>
                <CalendarRange aria-hidden /> Backfill past dates
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => openHistory(d)}>
              <History aria-hidden /> Sync history
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(d)}>
              <Pencil aria-hidden /> Edit device
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggle(d)}>
              <Power aria-hidden /> {d.isActive ? 'Deactivate device' : 'Activate device'}
            </DropdownMenuItem>
            {canRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(d)}>
                  <Trash2 aria-hidden /> Delete device
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  /**
   * Columns for the kit Data Table. SORT ON THE VALUE, RENDER WHAT YOU LIKE: the accessor hands the table the raw
   * value (a timestamp for Last Synced, the label for Status) and `cell` draws the chip — sorting rendered text
   * would order "10 failures" before "2 failures". `meta.exportValue` is what search, column filters and the
   * export read, so they match the text a person sees. Timestamps do not offer grouping (every row is its own).
   */
  const deviceColumns = useMemo<ColumnDef<IBiometricDevice, any>[]>(() => [
    {
      accessorKey: 'name',
      meta: { label: 'Device' },
      header: ({ column }) => <SortableHeader column={column} title="Device" />,
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
    },
    {
      id: 'address',
      accessorFn: (d) => `${d.deviceIp}:${d.devicePort}`,
      meta: { label: 'IP : Port' },
      header: ({ column }) => <SortableHeader column={column} title="IP : Port" />,
      cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'serialNumber',
      meta: { label: 'Serial #' },
      header: ({ column }) => <SortableHeader column={column} title="Serial #" />,
      cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>,
    },
    {
      id: 'mode',
      // The LABEL, not the enum: searching "push + pull" should find a BOTH device.
      accessorFn: (d) => MODE_META[d.connectionMode]?.label ?? d.connectionMode,
      meta: { label: 'Mode' },
      header: ({ column }) => <SortableHeader column={column} title="Mode" />,
      cell: ({ row }) => {
        const m = MODE_META[row.original.connectionMode] ?? MODE_META.PUSH;
        return <Badge variant={m.tone}>{m.label}</Badge>;
      },
    },
    {
      id: 'status',
      accessorFn: (d) => statusOf(d).label,
      meta: { label: 'Status' },
      header: ({ column }) => <SortableHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const s = statusOf(row.original);
        return <Badge variant={s.tone} dot>{s.label}</Badge>;
      },
    },
    {
      id: 'lastSyncedAt',
      // A timestamp, so the column sorts chronologically; the cell shows "6 hours ago".
      accessorFn: (d) => (d.lastSyncedAt ? new Date(d.lastSyncedAt).getTime() : 0),
      enableGrouping: false,
      meta: { label: 'Last synced', exportValue: (d: IBiometricDevice) => (d.lastSyncedAt ? formatDateTime(d.lastSyncedAt) : 'Never') },
      header: ({ column }) => <SortableHeader column={column} title="Last synced" />,
      cell: ({ row }) => <LastSynced ts={row.original.lastSyncedAt} />,
    },
    {
      id: 'lastSyncStatus',
      accessorFn: (d) => (d.lastSyncStatus ? sentence(d.lastSyncStatus) : ''),
      meta: { label: 'Sync' },
      header: ({ column }) => <SortableHeader column={column} title="Sync" />,
      cell: ({ row }) => {
        const s = row.original.lastSyncStatus;
        return s ? <Badge variant={syncTone(s)} dot>{sentence(s)}</Badge> : <NotApplicable />;
      },
    },
    {
      id: 'push',
      // Sorted as a timestamp so the order is chronological; PULL devices sort to one end (-1): no push to rank.
      accessorFn: (d) => (d.connectionMode === 'PULL' ? -1 : d.lastPushAt ? new Date(d.lastPushAt).getTime() : 0),
      enableGrouping: false,
      meta: { label: 'Push', exportValue: (d: IBiometricDevice) => pushOf(d)?.label ?? 'Not applicable' },
      header: ({ column }) => <SortableHeader column={column} title="Push" />,
      cell: ({ row }) => <PushBadge device={row.original} />,
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      meta: { label: 'Actions', pin: 'end', export: false },
      header: 'Actions',
      cell: ({ row }) => renderActions(row.original),
    },
    // actionLoading drives the in-row spinners, so the cells must re-render when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [actionLoading, canRemove]);

  /** Phone card: a device as a self-contained tile, so nothing is clipped by a sideways-scrolling table. */
  const renderDeviceCard = (d: IBiometricDevice) => {
    const s = statusOf(d);
    const m = MODE_META[d.connectionMode] ?? MODE_META.PUSH;
    return (
      <Item variant="outline" className="flex-col items-stretch gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold break-words text-foreground">{d.name}</div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{d.deviceIp}:{d.devicePort}</div>
          </div>
          <Badge variant={s.tone} dot>{s.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={m.tone}>{m.label}</Badge>
          {d.lastSyncStatus && <Badge variant={syncTone(d.lastSyncStatus)} dot>{sentence(d.lastSyncStatus)}</Badge>}
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
          <div className="min-w-0">
            <dt className="heading-case text-[11px] text-muted-foreground">Serial #</dt>
            <dd className="font-mono text-xs break-words">{d.serialNumber}</dd>
          </div>
          <div className="min-w-0">
            <dt className="heading-case text-[11px] text-muted-foreground">Last synced</dt>
            <dd><LastSynced ts={d.lastSyncedAt} /></dd>
          </div>
          {/* Same answer on a phone as in the table: below the table's breakpoint the card is the whole UI. */}
          <div className="min-w-0">
            <dt className="heading-case text-[11px] text-muted-foreground">Push</dt>
            <dd><PushBadge device={d} /></dd>
          </div>
        </dl>
        {renderActions(d)}
      </Item>
    );
  };

  const addButton = (
    <Button size="sm" onClick={openCreate}>
      <Plus data-icon="inline-start" aria-hidden /> Add device
    </Button>
  );

  return (
    <>
      <FormDialog
        open={show}
        onOpenChange={(open) => { if (!open) onClose(); }}
        title="Biometric devices"
        description={`${branchName} · ${loading ? 'Loading…' : `${devices.length} device${devices.length !== 1 ? 's' : ''}`}`}
        icon={<Fingerprint aria-hidden />}
        tone="indigo"
        size="xl"
      >
        <div className="space-y-4">
          {!loading && devices.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard size="sm" label="Devices" value={devices.length} tone="blue" icon={<Fingerprint aria-hidden />} />
              <StatCard size="sm" label="Active" value={devices.filter(d => d.isActive).length} tone="green" icon={<CheckCircle2 aria-hidden />} />
              <StatCard size="sm" label="Needs attention" value={needsAttention} tone={needsAttention ? 'danger' : 'slate'} icon={<TriangleAlert aria-hidden />} />
              <StatCard size="sm" label="Last sync" value={relTime(lastSyncedAcrossDevices)} tone="purple" icon={<Clock aria-hidden />} />
            </div>
          )}

          {/* The kit Data Table: sort, search, column filters, group rows, columns, full screen and export, as the
              old table had, and a card per device below 640px. Column layout is not remembered per branch: the
              same table opens for every branch from this dialog. */}
          <DataTable
            caption={`Biometric devices in ${branchName}`}
            columns={deviceColumns}
            data={devices}
            getRowId={(d) => d.id}
            loading={loading}
            initialPageSize={50}
            minWidth={960}
            searchPlaceholder="Search device, IP or serial number…"
            renderCard={renderDeviceCard}
            toolbar={(ctx) => (
              <>
                <DataTableExport columns={deviceColumns} ctx={ctx} filename={`Biometric devices - ${branchName}`} />
                {addButton}
              </>
            )}
            empty={
              <EmptyState
                size="sm"
                icon={<Fingerprint aria-hidden />}
                title="No devices configured for this branch"
                description="Connect a biometric machine to start syncing attendance for this location."
                action={addButton}
              />
            }
          />
        </div>
      </FormDialog>

      {/* Add / edit a device — its own Form Dialog over the list (Save, Cancel, discard guard). */}
      <Formik initialValues={formInit} validationSchema={deviceSchema} onSubmit={handleSubmit} enableReinitialize>
        {(form) => (
          <FormDialog
            open={showForm}
            onOpenChange={(open) => { if (!open) setShowForm(false); }}
            title={editMode ? 'Edit device' : 'Add device'}
            description={branchName}
            icon={<Fingerprint aria-hidden />}
            tone="indigo"
            formId={DEVICE_FORM_ID}
            submitLabel={editMode ? 'Update device' : 'Add device'}
            submitting={form.isSubmitting}
            dirty={form.dirty}
          >
            <Form id={DEVICE_FORM_ID} noValidate>
              <FieldGroup>
                {editMode && (
                  <SearchSelect
                    id="device-branchId"
                    label="Branch"
                    required
                    clearable={false}
                    value={form.values.branchId || null}
                    onValueChange={(value) => form.setFieldValue('branchId', value ?? '')}
                    onBlur={() => form.setFieldTouched('branchId', true)}
                    error={(form.touched.branchId || form.submitCount > 0) ? form.errors.branchId : undefined}
                    hint={form.values.branchId && form.values.branchId !== branchId ? 'Saving moves this device to that branch.' : undefined}
                    options={branches.length === 0
                      ? [{ value: branchId, label: branchName }]
                      : branches.map(b => ({ value: b.id, label: b.id !== branchId ? `${b.name} (move device)` : b.name }))}
                  />
                )}

                <Field data-invalid={form.errors.connectionMode ? true : undefined}>
                  <FieldLabel id="device-mode-label">Connection mode</FieldLabel>
                  <Select
                    required
                    items={(Object.keys(MODE_META) as ConnectionMode[]).map(m => ({ value: m, label: MODE_META[m].label }))}
                    value={form.values.connectionMode}
                    onValueChange={(v) => form.setFieldValue('connectionMode', v as ConnectionMode)}
                  >
                    <SelectTrigger className="w-full" aria-labelledby="device-mode-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MODE_META) as ConnectionMode[]).map(m => (
                        <SelectItem key={m} value={m}>
                          <span className="flex flex-col">
                            <span className="font-medium">{MODE_META[m].label}</span>
                            <span className="text-xs text-muted-foreground">{MODE_META[m].desc}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.connectionMode
                    ? <FieldError>{form.errors.connectionMode}</FieldError>
                    : <FieldDescription>{MODE_META[form.values.connectionMode]?.hint}</FieldDescription>}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DeviceTextField form={form} name="name" label="Device name" placeholder="e.g. Main Entrance" required />
                  <DeviceTextField form={form} name="serialNumber" label="Serial number" placeholder="QJT3252900352" required mono />
                  <DeviceTextField form={form} name="deviceIp" label="Device IP" placeholder="192.168.1.100" required inputMode="decimal" mono />
                  <DeviceTextField form={form} name="devicePort" label="Port" placeholder="88" required inputMode="numeric" mono />
                  <DeviceTextField form={form} name="username" label="Username" placeholder="essl" required />
                  <Field data-invalid={form.errors.password ? true : undefined}>
                    <FieldLabel htmlFor="device-password">{editMode ? 'Password (blank = keep)' : 'Password'}</FieldLabel>
                    <PasswordField
                      id="device-password"
                      name="password"
                      value={form.values.password}
                      onChange={form.handleChange}
                      onBlur={form.handleBlur}
                      // The device's own credential, set here — never the admin's sign-in.
                      autoComplete="new-password"
                      invalid={!!form.errors.password}
                    />
                    {form.errors.password && <FieldError>{form.errors.password}</FieldError>}
                  </Field>
                </div>
              </FieldGroup>
            </Form>
          </FormDialog>
        )}
      </Formik>

      {/* Sync history — a side sheet over the device list. */}
      <Sheet open={!!history.device} onOpenChange={(open) => { if (!open) closeHistory(); }}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Sync history</SheetTitle>
            <SheetDescription>{history.device?.name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {history.loading ? (
              <div className="space-y-2.5" aria-busy="true" aria-label="Loading sync history">
                {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : history.logs.length === 0 ? (
              <EmptyState size="sm" icon={<History aria-hidden />} title="No sync history yet" />
            ) : (
              <ItemGroup className="gap-2.5">
                {history.logs.map(log => {
                  const tone: BadgeTone = log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'danger' : 'warning';
                  const n = log.recordCount ?? 0;
                  return (
                    <Item key={log.id} variant="outline" size="sm">
                      <ItemContent className="gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="neutral">{sentence(log.triggeredBy)}</Badge>
                            <Badge variant={tone} dot>{sentence(log.status)}</Badge>
                          </span>
                          <Tooltip>
                            <TooltipTrigger render={<span className="text-xs whitespace-nowrap text-muted-foreground" />}>
                              {relTime(log.startedAt)}
                            </TooltipTrigger>
                            <TooltipContent>{formatDateTime(log.startedAt)}</TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm">{n} record{n !== 1 ? 's' : ''}{log.errorMessage ? '' : ' synced'}</p>
                        {log.errorMessage && <p className="text-xs break-words text-destructive">{log.errorMessage}</p>}
                      </ItemContent>
                    </Item>
                  );
                })}
              </ItemGroup>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Backfill a past range — its own small Form Dialog over the device list. */}
      <FormDialog
        open={!!backfillTarget}
        onOpenChange={(open) => { if (!open && !backfillSubmitting) closeBackfill(); }}
        title="Backfill past punches"
        description={backfillTarget?.name}
        icon={<CalendarRange aria-hidden />}
        tone="indigo"
        size="sm"
        formId={BACKFILL_FORM_ID}
        submitLabel={backfillSubmitting ? 'Backfilling…' : 'Backfill'}
        submitting={backfillSubmitting}
      >
        <form id={BACKFILL_FORM_ID} noValidate onSubmit={(e) => { e.preventDefault(); handleBackfill(); }} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Re-pulls attendance logs the device already has for the dates below — use this when a punch is correct on
            the biometric device but never made it into the app (the automated sync only ever checks today).
          </p>
          <DateRangePicker
            label="Dates"
            isRequired
            isDisabled={backfillSubmitting}
            // A backfill can't reach into the future, and the picker's range can't run backwards.
            maxValue={today(getLocalTimeZone())}
            value={backfillDates.fromDate && backfillDates.toDate
              ? { start: parseDate(backfillDates.fromDate), end: parseDate(backfillDates.toDate) }
              : null}
            onChange={(range) => setBackfillDates(range
              ? { fromDate: range.start.toString(), toDate: range.end.toString() }
              : { fromDate: '', toDate: '' })}
          />
        </form>
      </FormDialog>
    </>
  );
}
