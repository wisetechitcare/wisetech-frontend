import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { KTIcon } from '@metronic/helpers';
import {
    WtButton,
    InlineNotice,
    PinInput,
    SettingsSection,
    GlassDialog,
    GlassHeader,
    TRIO,
    toast,
    confirmDialog,
} from '@app/modules/common/components/ui';
import { DeveloperMfaEnrollForm } from '@app/modules/common/components/SecurityPin/DeveloperMfaEnrollForm';
import { SecurityPinGate, SecurityPinLockButton } from '@app/modules/common/components/SecurityPin';
import { canSection } from '@utils/can';
import { formatDate } from '@utils/dateFormats';
import {
    lockError,
    securityPinApi,
    type MfaRosterRow,
    type MfaRosterStatus,
    type SystemPinSupportStatus,
} from '@services/securityPin';

const STATUS_LABEL: Record<MfaRosterStatus, string> = {
    enrolled: 'Enrolled',
    pending: 'Pending setup',
    not_enrolled: 'Not enrolled',
    disabled: 'Disabled',
    locked: 'Locked out',
};

const STATUS_TONE: Record<MfaRosterStatus, typeof TRIO.green> = {
    enrolled: TRIO.green,
    pending: TRIO.amber,
    not_enrolled: TRIO.slate,
    disabled: TRIO.slate,
    locked: TRIO.rose,
};

function StatusPill({ status }: { status: MfaRosterStatus }) {
    const tone = STATUS_TONE[status];
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex', alignItems: 'center', height: 24, px: 1,
                borderRadius: '999px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                color: tone.c, bgcolor: alpha(tone.c, 0.1), border: `1px solid ${alpha(tone.c, 0.28)}`,
            }}
        >
            {STATUS_LABEL[status]}
        </Box>
    );
}

type SelfMode = 'idle' | 'enroll' | 'disable' | 'recovery';

/** Lock control beside “All Settings” while this area is open. */
export function DeveloperMfaHeaderActions() {
    return <SecurityPinLockButton variant="light" />;
}

/**
 * One place for System PIN MFA (behind Security PIN, like Salary / Roles):
 * - Super Admin: org roster + manage others + set up your own in the same card
 * - Everyone else: just their own enroll / disable / recovery
 */
export function DeveloperMfaPanel() {
    return (
        <SecurityPinGate area="settings.developerMfa">
            <DeveloperMfaPanelBody />
        </SecurityPinGate>
    );
}

function DeveloperMfaPanelBody() {
    const allowed = canSection('settings.developerMfa', 'read');
    const myUserId = useSelector((s: RootState) =>
        (s.employee?.currentEmployee?.userId as string | undefined)
        || (s.auth?.currentUser?.id as string | undefined)
    );

    const [status, setStatus] = useState<SystemPinSupportStatus | null>(null);
    const [roster, setRoster] = useState<MfaRosterRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState<SelfMode>('idle');
    const [code, setCode] = useState('');

    const canManage = !!status?.canManageMfa;

    const refreshStatus = useCallback(async () => {
        const s = await securityPinApi.supportStatus();
        setStatus(s);
        return s;
    }, []);

    const refreshRoster = useCallback(async () => {
        if (!status?.canManageMfa && !canManage) return;
        try {
            setRoster(await securityPinApi.mfaRoster());
        } catch (e) {
            setError(lockError(e).message);
            setRoster([]);
        }
    }, [status?.canManageMfa, canManage]);

    useEffect(() => {
        if (!allowed) return;
        refreshStatus().catch((e) => setError(lockError(e).message));
    }, [allowed, refreshStatus]);

    useEffect(() => {
        if (!status?.canManageMfa) return;
        void refreshRoster();
    }, [status?.canManageMfa, refreshRoster]);

    const refreshAll = useCallback(async () => {
        await refreshStatus();
        if (canManage || status?.canManageMfa) await refreshRoster();
    }, [refreshStatus, refreshRoster, canManage, status?.canManageMfa]);

    const mfa = status?.mfa;
    const enrolled = !!mfa?.enabled;
    const recoveryLeft = typeof mfa?.recoveryCodesRemaining === 'number' ? mfa.recoveryCodesRemaining : null;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!roster) return [];
        if (!q) return roster;
        return roster.filter((r) =>
            [r.name, r.email, r.employeeCode, STATUS_LABEL[r.status]]
                .filter(Boolean)
                .some((s) => String(s).toLowerCase().includes(q)));
    }, [roster, query]);

    const counts = useMemo(() => {
        const c = { enrolled: 0, notReady: 0, locked: 0, total: roster?.length ?? 0 };
        for (const r of roster || []) {
            if (r.status === 'enrolled') c.enrolled += 1;
            else if (r.status === 'locked') c.locked += 1;
            else c.notReady += 1;
        }
        return c;
    }, [roster]);

    const forceDisable = async (row: MfaRosterRow) => {
        const yes = await confirmDialog({
            title: `Remove MFA for ${row.name}?`,
            text: 'Their authenticator stops working immediately. They must set it up again. Recovery codes are cleared.',
            confirmText: 'Remove MFA', danger: true,
        });
        if (!yes) return;
        setBusyId(row.userId);
        try {
            await securityPinApi.mfaForceDisable(row.userId);
            toast({ icon: 'success', title: `MFA removed for ${row.name}` });
            if (row.userId === myUserId) setMode('idle');
            await refreshAll();
        } catch (e) {
            toast({ icon: 'error', title: lockError(e).message });
        } finally {
            setBusyId(null);
        }
    };

    const clearLockout = async (row: MfaRosterRow) => {
        setBusyId(row.userId);
        try {
            await securityPinApi.mfaClearLockout(row.userId);
            toast({ icon: 'success', title: `Lockout cleared for ${row.name}` });
            await refreshAll();
        } catch (e) {
            toast({ icon: 'error', title: lockError(e).message });
        } finally {
            setBusyId(null);
        }
    };

    const disableSelf = async () => {
        setBusy(true); setError(null);
        try {
            await securityPinApi.mfaDisable(code);
            setCode('');
            setMode('idle');
            await refreshAll();
        } catch (e) {
            setError(lockError(e).message);
        } finally {
            setBusy(false);
        }
    };

    const recoverSelf = async () => {
        setBusy(true); setError(null);
        try {
            await securityPinApi.mfaRecovery(code);
            setCode('');
            setMode('idle');
            await refreshAll();
        } catch (e) {
            setError(lockError(e).message);
        } finally {
            setBusy(false);
        }
    };

    if (!allowed) {
        return (
            <InlineNotice trio={TRIO.amber} icon="information-5">
                You do not have access to System PIN MFA. Ask an Admin to grant{' '}
                <strong>System PIN MFA</strong> under Organization Settings in Roles &amp; Permissions.
            </InlineNotice>
        );
    }

    if (!status || !mfa) {
        return <Box sx={{ height: 160, borderRadius: '14px', bgcolor: 'action.hover', maxWidth: 960 }} />;
    }

    if (!mfa.configured) {
        return (
            <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">
                MFA is not configured on this server (missing TOTP_ENCRYPTION_KEY). Ask a platform operator to set it and restart the API.
            </InlineNotice>
        );
    }

    const closeSelfDialog = () => {
        setMode('idle');
        setCode('');
        setError(null);
    };

    return (
        <>
        <SettingsSection
            tone={enrolled ? TRIO.green : TRIO.purple}
            icon={enrolled ? 'shield-tick' : 'security-user'}
            title="System PIN MFA"
            description={
                canManage
                    ? 'Everyone who can use System PIN MFA — set up yours, and remove or unlock others.'
                    : enrolled
                        ? 'Your authenticator for temporary System PIN support access.'
                        : 'Enroll an authenticator app for temporary System PIN support access.'
            }
            action={
                canManage ? (
                    <WtButton size="small" ghost onClick={() => void refreshAll()} disabled={roster === null && mode === 'idle'}>
                        Refresh
                    </WtButton>
                ) : undefined
            }
        >
            {/* Compact stats — org when managing, personal otherwise */}
            <Box
                sx={{
                    display: 'grid', gap: 1.25, mb: 2,
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                }}
            >
                {(canManage
                    ? [
                        { label: 'People', value: roster === null ? '—' : String(counts.total), trio: TRIO.blue },
                        { label: 'Enrolled', value: roster === null ? '—' : String(counts.enrolled), trio: TRIO.green },
                        { label: 'Need setup / locked', value: roster === null ? '—' : String(counts.notReady + counts.locked), trio: TRIO.amber },
                    ]
                    : [
                        { label: 'Your status', value: enrolled ? 'Enrolled' : 'Not enrolled', trio: enrolled ? TRIO.green : TRIO.amber },
                        { label: 'Recovery codes', value: enrolled ? (recoveryLeft == null ? '—' : String(recoveryLeft)) : 'After setup', trio: TRIO.purple },
                        { label: 'Used for', value: 'System PIN', trio: TRIO.blue },
                    ]
                ).map((k) => (
                    <Box
                        key={k.label}
                        sx={{
                            p: 1.25, borderRadius: '10px', border: '1px solid', borderColor: 'divider',
                            bgcolor: alpha(k.trio.c, 0.04),
                        }}
                    >
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            {k.label}
                        </Typography>
                        <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'text.primary', lineHeight: 1.25, mt: 0.25 }}>
                            {k.value}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {canManage && (
                <>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search by name, email, code, or status…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        sx={{ mb: 1.5, maxWidth: 420 }}
                    />

                    {roster === null ? (
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Loading…</Typography>
                    ) : filtered.length === 0 ? (
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                            {query.trim() ? 'No one matches that search.' : 'No eligible people yet. Grant System PIN MFA in Roles & Permissions.'}
                        </Typography>
                    ) : (
                        <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
                            <Box
                                component="table"
                                sx={{
                                    width: '100%', borderCollapse: 'collapse', minWidth: 640,
                                    '& th, & td': { px: 1.5, py: 1.15, textAlign: 'left', fontSize: 13, borderBottom: '1px solid', borderColor: 'divider', verticalAlign: 'middle' },
                                    '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, bgcolor: 'action.hover' },
                                    '& tr:last-of-type td': { borderBottom: 'none' },
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>Person</th>
                                        <th>Status</th>
                                        <th>Enrolled</th>
                                        <th>Recovery</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r) => {
                                        const isMe = !!myUserId && r.userId === myUserId;
                                        return (
                                            <tr key={r.userId} style={isMe ? { background: alpha(TRIO.purple.c, 0.04) } : undefined}>
                                                <td>
                                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: 'text.primary' }}>{r.name}</Typography>
                                                        {isMe && (
                                                            <Box component="span" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: TRIO.purple.c, bgcolor: alpha(TRIO.purple.c, 0.12), px: 0.75, py: '1px', borderRadius: '6px' }}>
                                                                You
                                                            </Box>
                                                        )}
                                                    </Stack>
                                                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                        {[r.employeeCode, r.email].filter(Boolean).join(' · ') || r.userId}
                                                        {!r.eligible && ' · access removed'}
                                                    </Typography>
                                                </td>
                                                <td><StatusPill status={r.status} /></td>
                                                <td>
                                                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                                                        {r.enrolledAt ? formatDate(r.enrolledAt) : '—'}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                                                        {r.status === 'enrolled' ? r.recoveryCodesRemaining : '—'}
                                                    </Typography>
                                                </td>
                                                <td>
                                                    <Stack direction="row" spacing={0.75} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                                                        {isMe ? (
                                                            <>
                                                                {!enrolled && (
                                                                    <WtButton size="small" onClick={() => setMode('enroll')}>Set up</WtButton>
                                                                )}
                                                                {enrolled && (
                                                                    <>
                                                                        <WtButton size="small" ghost onClick={() => { setCode(''); setError(null); setMode('disable'); }}>Disable</WtButton>
                                                                        <WtButton size="small" ghost onClick={() => { setCode(''); setError(null); setMode('recovery'); }}>Recovery</WtButton>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {r.status === 'locked' && (
                                                                    <WtButton size="small" ghost disabled={busyId === r.userId} onClick={() => void clearLockout(r)}>
                                                                        Clear lockout
                                                                    </WtButton>
                                                                )}
                                                                {(r.status === 'enrolled' || r.status === 'pending' || r.status === 'locked') && (
                                                                    <WtButton size="small" ghost disabled={busyId === r.userId} onClick={() => void forceDisable(r)}>
                                                                        Remove MFA
                                                                    </WtButton>
                                                                )}
                                                                {(r.status === 'not_enrolled' || r.status === 'disabled') && (
                                                                    <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 0.5 }}>—</Typography>
                                                                )}
                                                            </>
                                                        )}
                                                    </Stack>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Box>
                        </Box>
                    )}
                </>
            )}

            {!canManage && (
                <Stack spacing={1.5}>
                    {!enrolled ? (
                        <WtButton
                            onClick={() => setMode('enroll')}
                            startIcon={<KTIcon iconName="shield-tick" className="fs-4" />}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            Set up authenticator MFA
                        </WtButton>
                    ) : (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <WtButton ghost onClick={() => { setCode(''); setError(null); setMode('disable'); }}>Disable MFA</WtButton>
                            <WtButton ghost onClick={() => { setCode(''); setError(null); setMode('recovery'); }}>Use recovery code</WtButton>
                        </Stack>
                    )}
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.45 }}>
                        {enrolled
                            ? `Enrolled${mfa.enrolledAt ? ` · ${formatDate(mfa.enrolledAt)}` : ''}${recoveryLeft != null ? ` · ${recoveryLeft} recovery codes left` : ''}. Use a TOTP code on any System PIN unlock → System PIN Support Access.`
                            : 'Scan the QR, then enter two consecutive authenticator codes to finish setup.'}
                    </Typography>
                </Stack>
            )}
        </SettingsSection>

        <GlassDialog
            open={mode === 'enroll'}
            onClose={closeSelfDialog}
            maxWidth="sm"
            fullWidth
            plain
            header={
                <GlassHeader
                    title="Set up MFA"
                    icon={<KTIcon iconName="shield-tick" className="fs-1 text-white" />}
                    onClose={closeSelfDialog}
                />
            }
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 'auto' },
                    maxWidth: { xs: '100%', sm: 520 },
                    margin: { xs: 0, sm: 2 },
                },
            }}
        >
            <Box sx={{ px: { xs: 2, sm: 2.75 }, py: { xs: 2, sm: 2.5 }, width: '100%', boxSizing: 'border-box' }}>
                {mode === 'enroll' && (
                    <DeveloperMfaEnrollForm
                        onComplete={() => { closeSelfDialog(); void refreshAll(); }}
                        onCancel={closeSelfDialog}
                    />
                )}
            </Box>
        </GlassDialog>

        <GlassDialog
            open={mode === 'disable'}
            onClose={closeSelfDialog}
            maxWidth="xs"
            fullWidth
            plain
            header={
                <GlassHeader
                    title="Disable MFA"
                    subtitle="Enter a current authenticator code to turn MFA off."
                    icon={<KTIcon iconName="shield-cross" className="fs-1 text-white" />}
                    onClose={closeSelfDialog}
                />
            }
        >
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={1.75}>
                    {error && <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">{error}</InlineNotice>}
                    <PinInput label="Authenticator code" length={6} masked={false} tone="info" value={code} onChange={setCode} autoFocus />
                    <Stack direction="row" spacing={1}>
                        <WtButton disabled={busy || code.length !== 6} onClick={disableSelf}>Disable MFA</WtButton>
                        <WtButton ghost onClick={closeSelfDialog}>Cancel</WtButton>
                    </Stack>
                </Stack>
            </Box>
        </GlassDialog>

        <GlassDialog
            open={mode === 'recovery'}
            onClose={closeSelfDialog}
            maxWidth="xs"
            fullWidth
            plain
            header={
                <GlassHeader
                    title="Use recovery code"
                    subtitle="MFA will be disabled; you must set it up again afterwards."
                    icon={<KTIcon iconName="key" className="fs-1 text-white" />}
                    onClose={closeSelfDialog}
                />
            }
        >
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={1.75}>
                    {error && <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">{error}</InlineNotice>}
                    <TextField
                        label="Recovery code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        size="small"
                        fullWidth
                        autoFocus
                        placeholder="xxxx-xxxx-xxxx"
                    />
                    <Stack direction="row" spacing={1}>
                        <WtButton disabled={busy || code.trim().length < 8} onClick={recoverSelf}>Use recovery code</WtButton>
                        <WtButton ghost onClick={closeSelfDialog}>Cancel</WtButton>
                    </Stack>
                </Stack>
            </Box>
        </GlassDialog>
        </>
    );
}

export default DeveloperMfaPanel;
