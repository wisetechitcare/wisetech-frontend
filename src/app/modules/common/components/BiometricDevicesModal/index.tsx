import { useEffect, useState, ReactNode } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Dialog, Box, Stack, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Tooltip, IconButton, Button, TextField, Select,
  MenuItem, ListItemText, CircularProgress, InputAdornment, Paper,
  FormControl, FormHelperText, Skeleton, Drawer,
} from '@mui/material';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  fetchDevicesByBranchId, createDevice, updateDeviceById, deleteDeviceById,
  toggleDeviceById, testDeviceById, syncDeviceById, fetchDeviceSyncLogs,
} from '@services/biometric';
import { fetchAllBranches } from '@services/company';
import { IBiometricDevice, ICreateBiometricDevice, IUpdateBiometricDevice, ConnectionMode, IBiometricSyncLog } from '@models/biometric';
import { KTIcon } from '@metronic/helpers';
import { toast, alertDialog, confirmDialog } from '@app/modules/common/components/ui';
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

const EMPTY_FORM = { branchId: '', name: '', deviceIp: '', devicePort: '88', serialNumber: '', username: 'essl', password: '', connectionMode: 'PUSH' as ConnectionMode };

const MODE_META: Record<ConnectionMode, { label: string; color: string; desc: string; hint: string }> = {
  PUSH: { label: 'Push', color: T.color.indigo, desc: 'Device sends punches to the server (recommended for cloud)', hint: 'Server never dials the device. The device must POST to the webhook.' },
  PULL: { label: 'Pull', color: T.color.warning, desc: 'Server fetches logs from the device (LAN-reachable)', hint: 'Server SOAP-polls the device IP. Requires the device to be reachable.' },
  BOTH: { label: 'Push + Pull', color: T.color.cyan, desc: 'Push primary, periodic pull backfills missed punches', hint: 'Webhook is the lifeline; the cron also pulls to backfill any missed punches.' },
};

const chipSx = (color: string) => ({
  color, borderColor: `${color}59`, bgcolor: 'transparent', fontWeight: 600,
  height: 22, fontSize: 11, '& .MuiChip-label': { px: 1 },
});

function StatusChip({ device }: { device: IBiometricDevice }) {
  if (!device.isActive) return <Chip variant="outlined" size="small" label="Inactive" sx={chipSx(T.color.neutral)} />;
  if (device.consecutiveFailures > 0)
    return <Chip variant="outlined" size="small" label={`${device.consecutiveFailures} failure${device.consecutiveFailures !== 1 ? 's' : ''}`} sx={chipSx(T.color.warning)} />;
  return <Chip variant="outlined" size="small" label="● Active" sx={chipSx(T.color.success)} />;
}

function ModeChip({ mode }: { mode: ConnectionMode }) {
  const m = MODE_META[mode] ?? MODE_META.PUSH;
  return <Chip variant="outlined" size="small" label={m.label} sx={chipSx(m.color)} />;
}

function SyncChip({ status }: { status: IBiometricDevice['lastSyncStatus'] }) {
  if (!status) return <Typography sx={{ color: T.color.inkFaint, fontSize: 12 }}>—</Typography>;
  const map: Record<string, string> = { SUCCESS: T.color.success, FAILED: T.color.danger, PARTIAL: T.color.warning };
  return <Chip variant="outlined" size="small" label={status} sx={chipSx(map[status] ?? T.color.neutral)} />;
}

function LastSynced({ ts }: { ts: string | null }) {
  if (!ts) return <Typography sx={{ color: T.color.inkFaint, fontSize: 12 }}>Never</Typography>;
  const age = (Date.now() - new Date(ts).getTime()) / 3600000;
  const color = age < 1 ? T.color.success : age < 6 ? T.color.warning : T.color.danger;
  return (
    <Stack direction="row" spacing={0.6} alignItems="center">
      <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: color }} />
      <Typography sx={{ color, fontSize: 12, fontWeight: 600 }}>
        {new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Stack>
  );
}

function StatTile({ label, value, tone, icon }: { label: string; value: ReactNode; tone: string; icon: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 128, p: 1.5, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1.25, background: 'linear-gradient(180deg, #ffffff 0%, #FCFDFF 100%)' }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: `${tone}14`, color: tone, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 750, lineHeight: 1.1, color: 'text.primary' }}>{value}</Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</Typography>
      </Box>
    </Paper>
  );
}

const relTime = (ts: string | null): string => {
  if (!ts) return '—';
  const mins = (Date.now() - new Date(ts).getTime()) / 60000;
  if (mins < 1) return 'now';
  if (mins < 60) return `${Math.floor(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
    setFormInit({ branchId: d.branchId, name: d.name, deviceIp: d.deviceIp, devicePort: d.devicePort, serialNumber: d.serialNumber, username: d.username, password: '', connectionMode: d.connectionMode ?? 'PUSH' });
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

  const handleTest = async (d: IBiometricDevice) => {
    setAction(d.id, 'test');
    try {
      const res = await testDeviceById(d.id);
      alertDialog({ icon: res.connected ? 'success' : 'error', title: res.connected ? 'Connected' : 'Connection Failed', text: res.message });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Test Failed', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
  };

  const handleSync = async (d: IBiometricDevice) => {
    setAction(d.id, 'sync');
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await syncDeviceById(d.id, { fromDate: today, toDate: today });
      await reload();
      toast({ icon: 'success', title: 'Sync Complete', text: `${res.count} record(s) synced`, timer: 2500 });
    } catch (err: any) {
      alertDialog({ icon: 'error', title: 'Sync Failed', text: err?.response?.data?.message ?? err?.message });
    } finally { setAction(d.id, null); }
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

  return (
    <>
    <Dialog open={show} onClose={onClose} maxWidth="lg" fullWidth disableEnforceFocus PaperProps={{ sx: { borderRadius: '16px', fontFamily: T.font.family } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: 2.75, py: 1.75, background: 'linear-gradient(135deg, #172554 0%, #1E3A8A 100%)', borderBottom: '3px solid #C0392B', color: '#fff' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', flexShrink: 0 }}>
            <KTIcon iconName="fingerprint-scanning" className="fs-1" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 750, fontSize: 16.5, color: '#fff', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {branchName} — Biometric Devices
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)' }}>
              {loading ? 'Loading…' : `${devices.length} device${devices.length !== 1 ? 's' : ''} configured`}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {!showForm && (
            <Button variant="contained" size="small" startIcon={<KTIcon iconName="plus" className="fs-5" />} onClick={openCreate} sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#EAF0FA' } }}>Add Device</Button>
          )}
          <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ color: '#fff' }}><KTIcon iconName="cross" className="fs-3" /></IconButton>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ bgcolor: T.color.panel, p: 2, maxHeight: '74vh', overflowY: 'auto' }}>
        {/* KPI stat strip */}
        {!loading && devices.length > 0 && (
          <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <StatTile label="Devices" value={devices.length} tone={T.color.brand} icon={<KTIcon iconName="fingerprint-scanning" className="fs-3" />} />
            <StatTile label="Active" value={devices.filter(d => d.isActive).length} tone={T.color.success} icon={<KTIcon iconName="check-circle" className="fs-3" />} />
            <StatTile
              label="Needs attention"
              value={devices.filter(d => !d.isActive || d.consecutiveFailures > 0).length}
              tone={devices.some(d => !d.isActive || d.consecutiveFailures > 0) ? T.color.danger : T.color.neutral}
              icon={<KTIcon iconName="information-5" className="fs-3" />}
            />
            <StatTile
              label="Last sync"
              value={relTime(devices.reduce<string | null>((acc, d) => (d.lastSyncedAt && (!acc || new Date(d.lastSyncedAt) > new Date(acc)) ? d.lastSyncedAt : acc), null))}
              tone={T.color.indigo}
              icon={<KTIcon iconName="time" className="fs-3" />}
            />
          </Stack>
        )}
        {/* Add / Edit form */}
        {showForm && (
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: '12px' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{editMode ? 'Edit Device' : 'Add New Device'}</Typography>
              <Chip size="small" label={editMode ? 'Editing' : 'New'} sx={chipSx(T.color.brand)} variant="outlined" />
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

        {/* Device list */}
        {loading ? (
          <Paper variant="outlined" sx={{ borderRadius: '12px', p: 1.5 }}>
            {[0, 1, 2].map(i => (
              <Stack key={i} direction="row" spacing={2} alignItems="center" sx={{ py: 1.25, px: 1 }}>
                <Skeleton variant="rounded" width={150} height={18} />
                <Skeleton variant="rounded" width={120} height={16} />
                <Skeleton variant="rounded" width={88} height={20} sx={{ borderRadius: 999 }} />
                <Box sx={{ flex: 1 }} />
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton variant="circular" width={28} height={28} />
              </Stack>
            ))}
          </Paper>
        ) : devices.length === 0 ? (
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
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(30, 58, 138, 0.05)' }}>
                  {['Device', 'IP : Port', 'Serial #', 'Mode', 'Status', 'Last Synced', 'Sync', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 10.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map(d => (
                  <TableRow key={d.id} hover sx={{ opacity: actionLoading[d.id] === 'delete' ? 0.5 : 1 }}>
                    <TableCell sx={{ fontWeight: 650, color: 'text.primary' }}>{d.name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 }}>{d.deviceIp}:{d.devicePort}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 }}>{d.serialNumber}</TableCell>
                    <TableCell><ModeChip mode={d.connectionMode} /></TableCell>
                    <TableCell><StatusChip device={d} /></TableCell>
                    <TableCell><LastSynced ts={d.lastSyncedAt} /></TableCell>
                    <TableCell><SyncChip status={d.lastSyncStatus} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title="Test connection">
                          <span><IconButton size="small" sx={{ color: T.color.indigo }} disabled={busy(d.id)} onClick={() => handleTest(d)}>
                            {actionLoading[d.id] === 'test' ? <CircularProgress size={15} /> : <KTIcon iconName="pulse" className="fs-5" />}
                          </IconButton></span>
                        </Tooltip>
                        {d.connectionMode !== 'PUSH' && (
                          <Tooltip title="Pull today's logs">
                            <span><IconButton size="small" sx={{ color: T.color.success }} disabled={busy(d.id)} onClick={() => handleSync(d)}>
                              {actionLoading[d.id] === 'sync' ? <CircularProgress size={15} /> : <KTIcon iconName="arrows-circle" className="fs-5" />}
                            </IconButton></span>
                          </Tooltip>
                        )}
                        <Tooltip title="Sync history">
                          <span><IconButton size="small" sx={{ color: T.color.inkSoft }} disabled={busy(d.id)} onClick={() => openHistory(d)}>
                            <KTIcon iconName="time" className="fs-5" />
                          </IconButton></span>
                        </Tooltip>
                        <Tooltip title="Edit device">
                          <span><IconButton size="small" sx={{ color: T.color.warning }} disabled={busy(d.id)} onClick={() => openEdit(d)}>
                            <KTIcon iconName="pencil" className="fs-5" />
                          </IconButton></span>
                        </Tooltip>
                        <Tooltip title={d.isActive ? 'Deactivate' : 'Activate'}>
                          <span><IconButton size="small" sx={{ color: d.isActive ? T.color.danger : T.color.success }} disabled={busy(d.id)} onClick={() => handleToggle(d)}>
                            {actionLoading[d.id] === 'toggle' ? <CircularProgress size={15} /> : <KTIcon iconName="switch" className="fs-5" />}
                          </IconButton></span>
                        </Tooltip>
                        <Tooltip title="Delete device">
                          <span><IconButton size="small" sx={{ color: T.color.danger }} disabled={busy(d.id)} onClick={() => handleDelete(d)}>
                            {actionLoading[d.id] === 'delete' ? <CircularProgress size={15} /> : <KTIcon iconName="trash" className="fs-5" />}
                          </IconButton></span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Dialog>

    {/* Sync-history drawer */}
    <Drawer anchor="right" open={!!history.device} onClose={closeHistory} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Box sx={{ px: 2.25, py: 1.75, background: 'linear-gradient(135deg, #172554 0%, #1E3A8A 100%)', borderBottom: '3px solid #C0392B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: '#fff' }}>Sync History</Typography>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{history.device?.name}</Typography>
        </Box>
        <IconButton onClick={closeHistory} size="small" aria-label="Close" sx={{ color: '#fff' }}><KTIcon iconName="cross" className="fs-3" /></IconButton>
      </Box>
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {history.loading ? (
          <Stack sx={{ gap: 1.25 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>
        ) : history.logs.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 5 }}>No sync history yet.</Typography>
        ) : (
          <Stack sx={{ gap: 1.25 }}>
            {history.logs.map(log => {
              const tone = log.status === 'SUCCESS' ? T.color.success : log.status === 'FAILED' ? T.color.danger : T.color.warning;
              return (
                <Paper key={log.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', borderLeft: '3px solid', borderLeftColor: tone }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5, gap: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip size="small" variant="outlined" label={log.triggeredBy} sx={chipSx(T.color.neutral)} />
                      <Chip size="small" variant="outlined" label={log.status} sx={chipSx(tone)} />
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {new Date(log.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
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
    </>
  );
}
