import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';
import { WtButton, InlineNotice, PinInput, TRIO, WtField } from '@app/modules/common/components/ui';
import { EmployeePickerField } from '@app/modules/common/components/EmployeePickerField';
import {
    lockError,
    securityPinApi,
    shortLockTime,
    formatLockTime,
    SECURITY_AREAS,
    SECURITY_AREA_PATHS,
    SUPPORT_REQUESTABLE_AREAS,
    SUPPORT_SELF_TO_EMPLOYEE,
    defaultSupportAreaFromSource,
    supportLandingArea,
    type SecurityArea,
    type SupportSessionGrant,
    type SystemPinSupportStatus,
    type SupportRequestListItem,
} from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';
import { fetchCurrentEmployeeByEmpId } from '@services/employee';
import { saveSelectedEmployee } from '@redux/slices/employee';
import { useDispatch } from 'react-redux';

const MFA_SETTINGS_PATH = '/admin/app-settings?area=developer-mfa';
const DURATION_PRESETS = [5, 10, 15, 30, 60, 120] as const;
/** Keep in sync with backend `MIN_REASON_LENGTH`. */
const MIN_REASON_LENGTH = 20;

const AREA_OPTIONS = SUPPORT_REQUESTABLE_AREAS
    .filter((a) => !(a in SUPPORT_SELF_TO_EMPLOYEE))
    .map((a) => ({
        value: a,
        label: SECURITY_AREAS[a],
    }));

/**
 * System PIN Support Access — simple request path; approvers use Inbox.
 * MFA-only policy: one code starts the session. Needs-approval: wait, then Start + MFA.
 */
export function SupportAccessPanel({
    sourceArea,
    onUnlocked,
    onBack,
}: {
    sourceArea?: SecurityArea | null;
    onUnlocked?: () => void;
    onBack: () => void;
}) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [status, setStatus] = useState<SystemPinSupportStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState<'hub' | 'request' | 'activate'>('hub');
    const [moreOpen, setMoreOpen] = useState(false);

    const [employeeId, setEmployeeId] = useState('');
    const [reason, setReason] = useState('');
    const [ticketRef, setTicketRef] = useState('');
    const [totp, setTotp] = useState('');
    const [pendingGrantId, setPendingGrantId] = useState<string | null>(null);
    const [requests, setRequests] = useState<SupportRequestListItem[]>([]);
    const [durationMinutes, setDurationMinutes] = useState(10);
    const pageArea = useMemo(() => defaultSupportAreaFromSource(sourceArea), [sourceArea]);
    const [areas, setAreas] = useState<SecurityArea[]>(() => {
        const preferred = defaultSupportAreaFromSource(sourceArea);
        return preferred ? [preferred] : [];
    });

    useEffect(() => {
        // Only seed from the page you are on — never force Employee Payrolls.
        setAreas(pageArea ? [pageArea] : []);
    }, [pageArea]);

    const policyMaxMinutes = status?.policy?.durationMinutes ?? 10;
    const needsApproval = !!status?.policy?.requiresApproval;

    const durationOptions = useMemo(() => {
        const allowed = DURATION_PRESETS.filter((m) => m <= policyMaxMinutes);
        const mins = new Set<number>(allowed);
        mins.add(policyMaxMinutes);
        return [...mins]
            .sort((a, b) => a - b)
            .map((m) => ({
                value: String(m),
                label: m === policyMaxMinutes ? `${formatLockTime(m)} (default max)` : formatLockTime(m),
            }));
    }, [policyMaxMinutes]);

    const refresh = useCallback(async () => {
        const s = await securityPinApi.supportStatus();
        setStatus(s);
        if (s.policy?.durationMinutes) setDurationMinutes(s.policy.durationMinutes);
        if (s.eligible) {
            setRequests(await securityPinApi.supportListRequests());
        }
        return s;
    }, []);

    useEffect(() => {
        refresh().catch((e) => setError(lockError(e).message));
    }, [refresh]);

    const beginSession = async (grant: SupportSessionGrant, landAreas?: SecurityArea[]) => {
        securityPinBus.setSupportGrant(grant);
        onUnlocked?.();
        // Prefer what the user just picked (and the grant stored), in that order — never invent payroll.
        const raw =
            landAreas?.[0]
            ?? grant.areas?.[0]
            ?? pageArea
            ?? null;
        if (!raw) return;
        const land = supportLandingArea(raw);
        // Prefetch target so Employee Payrolls / Increment open their record, not yours.
        try {
            const res = await fetchCurrentEmployeeByEmpId(grant.targetEmployeeId);
            const emp = res?.data?.employee;
            if (emp) dispatch(saveSelectedEmployee(emp));
        } catch {
            /* list page still works; focus id remains on the bus */
        }
        const path = SECURITY_AREA_PATHS[land];
        if (path) navigate(path);
    };

    const submitRequest = async () => {
        const selected = areas.length
            ? areas
            : (pageArea ? [pageArea] : []);
        if (!selected.length) {
            setError('Select at least one area to open.');
            return;
        }
        setBusy(true); setError(null);
        try {
            const requested = moreOpen
                ? Math.min(Math.max(1, durationMinutes || policyMaxMinutes), policyMaxMinutes)
                : policyMaxMinutes;
            const r = await securityPinApi.supportCreateRequest({
                targetEmployeeId: employeeId,
                reason,
                ticketRef: moreOpen && ticketRef ? ticketRef : undefined,
                durationMinutes: requested,
                areas: selected,
                sourceArea: sourceArea ?? undefined,
                totpCode: totp,
            });
            setTotp('');
            if (r.activated && r.activeGrant) {
                beginSession(r.activeGrant, r.areas ?? selected);
                return;
            }
            setStep('hub');
            await refresh();
        } catch (e) {
            setError(lockError(e).message);
        } finally {
            setBusy(false);
        }
    };

    const activate = async () => {
        if (!pendingGrantId) return;
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.supportActivate(pendingGrantId, totp);
            beginSession(r, r.areas);
        } catch (e) {
            setError(lockError(e).message);
        } finally {
            setBusy(false);
        }
    };

    if (!status) {
        return <Typography sx={{ fontSize: 13, color: '#64748B' }}>Checking support eligibility…</Typography>;
    }
    if (!status.eligible) {
        return (
            <Stack spacing={2}>
                <InlineNotice trio={TRIO.amber} icon="information-5">
                    System PIN support access is not enabled for your account. Ask an Admin to grant System PIN MFA under Organization Settings.
                </InlineNotice>
                <WtButton ghost onClick={onBack}>Back to Security PIN</WtButton>
            </Stack>
        );
    }

    const mfaReady = status.mfa.configured && status.mfa.enabled;
    const pendingRequests = requests.filter((r) => r.status === 'pending');
    const readyToStart = requests.filter(
        (r) => r.grantId && r.status === 'approved' && !r.grantActivatedAt && !r.grantRevokedAt,
    );

    return (
        <Stack spacing={1.75} sx={{ width: '100%' }}>
            <Typography sx={{ m: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                System PIN Support Access
            </Typography>
            <Typography sx={{ m: 0, fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>
                Read-only help for one employee
                {status.policy
                    ? ` · ${shortLockTime(status.policy.durationMinutes)} max${needsApproval ? ' · needs Inbox approval' : ' · MFA only'}`
                    : ''}
            </Typography>

            {error && <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">{error}</InlineNotice>}

            {status.activeGrant && (
                <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: alpha('#B45309', 0.08), border: '1px solid', borderColor: alpha('#B45309', 0.35) }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>
                        Support session active — {status.activeGrant.targetName || status.activeGrant.targetEmployeeId}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#78350F' }}>
                        Read-only · expires {new Date(status.activeGrant.expiresAt).toLocaleString()}
                    </Typography>
                    <WtButton
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={async () => {
                            await securityPinApi.supportRevoke(status.activeGrant!.id);
                            securityPinBus.clearSupportGrant();
                            await securityPinApi.lock().catch(() => undefined);
                            securityPinBus.markLocked();
                            await refresh();
                        }}
                    >
                        End support session
                    </WtButton>
                </Box>
            )}

            {step === 'hub' && (
                <Stack spacing={1.25}>
                    {!mfaReady && (
                        <>
                            <InlineNotice trio={TRIO.amber} icon="information-5">
                                {status.mfa.configured
                                    ? 'Enroll your authenticator in App Settings before requesting support.'
                                    : 'MFA is not configured on this server. Ask a platform operator to set TOTP_ENCRYPTION_KEY.'}
                            </InlineNotice>
                            {status.mfa.configured && (
                                <WtButton onClick={() => navigate(MFA_SETTINGS_PATH)}>
                                    Open System PIN MFA settings
                                </WtButton>
                            )}
                        </>
                    )}

                    {mfaReady && readyToStart.length > 0 && (
                        <Box sx={{ p: 1.25, borderRadius: '10px', border: '1px solid', borderColor: alpha('#0369A1', 0.35), bgcolor: alpha('#0369A1', 0.06) }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0C4A6E' }}>
                                Ready to start
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#075985', mb: 1 }}>
                                Your request was approved. Enter a fresh authenticator code to open the session.
                            </Typography>
                            <WtButton
                                disabled={busy}
                                onClick={() => {
                                    const g = readyToStart[0];
                                    if (g?.grantId) {
                                        setPendingGrantId(g.grantId);
                                        setTotp('');
                                        setStep('activate');
                                    }
                                }}
                            >
                                Start session
                            </WtButton>
                        </Box>
                    )}

                    {mfaReady && pendingRequests.length > 0 && (
                        <Box sx={{ p: 1.25, borderRadius: '10px', border: '1px solid', borderColor: alpha('#B45309', 0.3), bgcolor: alpha('#B45309', 0.06) }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>
                                Waiting for approval ({pendingRequests.length})
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#78350F' }}>
                                Approvers decide in Inbox. One approval finishes the request for everyone.
                            </Typography>
                        </Box>
                    )}

                    {mfaReady && !status.activeGrant && (
                        <WtButton
                            disabled={busy}
                            onClick={() => {
                                setTotp('');
                                setMoreOpen(false);
                                setAreas(pageArea ? [pageArea] : []);
                                setDurationMinutes(policyMaxMinutes);
                                setTicketRef('');
                                setStep('request');
                            }}
                        >
                            {needsApproval ? 'Request support access' : 'Start support session'}
                        </WtButton>
                    )}

                    <WtButton ghost onClick={onBack}>Back to Security PIN</WtButton>
                </Stack>
            )}

            {step === 'request' && (
                <Stack spacing={1.5}>
                    <EmployeePickerField
                        label="Affected employee"
                        value={employeeId || null}
                        onChange={(ids) => setEmployeeId(ids[0] ?? '')}
                        dialogTitle="Select affected employee"
                        dialogSubtitle="System PIN support is scoped to one employee"
                    />
                    <TextField
                        label="Support reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                        size="small"
                        required
                        error={reason.length > 0 && reason.trim().length < MIN_REASON_LENGTH}
                        helperText={
                            reason.trim().length < MIN_REASON_LENGTH
                                ? `At least ${MIN_REASON_LENGTH} characters required (${reason.trim().length}/${MIN_REASON_LENGTH})`
                                : `${reason.trim().length} characters`
                        }
                    />
                    <PinInput
                        label="Authenticator code"
                        length={6}
                        masked={false}
                        tone="info"
                        value={totp}
                        onChange={setTotp}
                    />

                    <WtField
                        label="Areas to open"
                        icon="abstract-26"
                        multiple
                        searchable
                        limitTags={2}
                        clearable={!pageArea}
                        value={areas}
                        onChange={(ids: string[]) => {
                            const next = (ids ?? []).filter((a): a is SecurityArea =>
                                SUPPORT_REQUESTABLE_AREAS.includes(a as SecurityArea),
                            );
                            if (!next.length && pageArea) {
                                setAreas([pageArea]);
                                return;
                            }
                            setAreas(next);
                        }}
                        options={AREA_OPTIONS}
                        hint={pageArea
                            ? 'This page is selected automatically. Add other tabs if needed.'
                            : 'Choose which protected tabs this session can open (e.g. Roles & Permissions, Employee Payrolls).'}
                    />

                    <WtButton
                        ghost
                        size="small"
                        onClick={() => setMoreOpen((o) => !o)}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {moreOpen ? 'Hide options' : 'More options'}
                    </WtButton>

                    <Collapse in={moreOpen}>
                        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                            <WtField
                                label="Access duration"
                                icon="time"
                                value={String(Math.min(durationMinutes, policyMaxMinutes))}
                                onChange={(v) => setDurationMinutes(Number(v) || policyMaxMinutes)}
                                options={durationOptions}
                                hint={`Default is ${shortLockTime(policyMaxMinutes)} from your policy.`}
                            />
                            <TextField
                                label="Ticket / incident (optional)"
                                value={ticketRef}
                                onChange={(e) => setTicketRef(e.target.value)}
                                fullWidth
                                size="small"
                            />
                        </Stack>
                    </Collapse>

                    <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                        {needsApproval
                            ? 'Approvers get an Inbox item. After approval, come back here to start the session.'
                            : 'One authenticator code starts the session on the first area you selected.'}
                    </Typography>
                    <WtButton
                        disabled={busy || !employeeId || !areas.length || reason.trim().length < MIN_REASON_LENGTH || totp.length !== 6}
                        onClick={submitRequest}
                    >
                        {needsApproval ? 'Request access' : 'Start support session'}
                    </WtButton>
                    <WtButton ghost onClick={() => setStep('hub')}>Cancel</WtButton>
                </Stack>
            )}

            {step === 'activate' && pendingGrantId && (
                <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: 12.5, color: '#334155' }}>
                        Enter a fresh authenticator code to start the support session.
                    </Typography>
                    <PinInput
                        label="Authenticator code"
                        length={6}
                        masked={false}
                        tone="info"
                        value={totp}
                        onChange={setTotp}
                        autoFocus
                    />
                    <WtButton disabled={busy || totp.length !== 6} onClick={activate}>
                        Start session
                    </WtButton>
                    <WtButton ghost onClick={() => setStep('hub')}>Cancel</WtButton>
                </Stack>
            )}
        </Stack>
    );
}

export default SupportAccessPanel;
