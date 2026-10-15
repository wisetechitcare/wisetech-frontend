import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';
import { RootState } from '@redux/store';
import { WtButton, InlineNotice, TRIO, PinInput, T } from '@app/modules/common/components/ui';
import { HEADING_CASE_SX, toTitleCase } from '@app/modules/common/components/ui/text';
import { securityPinApi, lockError, shortLockTime, SECURITY_AREAS, type SecurityArea, type SecurityPinStatus } from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';
import { SupportAccessPanel } from './SupportAccessPanel';

/**
 * Security PIN flow ("Salary Unlock & PIN Reset"):
 *   Unlock Screen       — Lock icon · 6 masked PIN slots · "Unlock <Area>" · "Forgot PIN?"
 *   Request PIN Reset   — Lock icon · masked email chip · "Send Code to Email" · "Back to Unlock"
 *   Then a 3-step reset/setup:
 *     1 / 3  Check Your Email  — Mail icon · green header · unmasked OTP
 *     2 / 3  Choose New PIN    — Lock icon · blue header · masked PIN
 *     3 / 3  Confirm New PIN   — Lock icon · blue header · masked PIN
 */

type View =
    | { kind: 'loading' }
    | { kind: 'unlock' }
    | { kind: 'support' }
    | { kind: 'lockedOut'; until: number }
    | { kind: 'setup'; reset: boolean; step: 'intro' | 'code' | 'pin' | 'confirm' };

export interface SecurityPinPanelProps {
    onUnlocked?: () => void;
    onCancel?: () => void;
    area?: SecurityArea | null;
}

const FOCUS_BLUE = '#2563EB';
const BORDER_SLATE = '#E2E8F0';
const SURFACE_IDLE = '#F8FAFC';

const mmss = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function SecurityPinPanel({ onUnlocked, onCancel, area }: SecurityPinPanelProps) {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const firstName = useSelector((s: RootState) => s.auth.currentUser.firstName);

    const [status, setStatus] = useState<SecurityPinStatus | null>(null);
    const [view, setView] = useState<View>({ kind: 'loading' });
    const [pin, setPin] = useState('');
    const [code, setCode] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(0);
    const [opening, setOpening] = useState(false);
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [supportEligible, setSupportEligible] = useState(false);

    const length = status?.pinLength ?? 6;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const counting = view.kind === 'lockedOut' || resendAt > now;
    useEffect(() => {
        if (!counting) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [counting]);

    const finish = useCallback((unlockedUntil: string | null, lockMinutes?: number) => {
        setOpening(true);
        window.setTimeout(() => {
            if (area) securityPinBus.markAreaUnlocked(area, unlockedUntil, lockMinutes);
            else securityPinBus.markUnlocked(unlockedUntil, lockMinutes);
            onUnlocked?.();
        }, reduceMotion ? 0 : 420);
    }, [onUnlocked, reduceMotion, area]);

    const routeFromStatus = useCallback((s: SecurityPinStatus) => {
        setStatus(s);
        const pinOff = s.disabled === true || s.required === false;
        // Only treat the feature as on when the server explicitly says so — never default to on
        // when `required` is missing (that used to force "Set Up Security PIN" under the kill-switch).
        securityPinBus.setPolicy(pinOff ? false : s.required === true, s.ttlMinutes ?? 15, s.areas);
        if (pinOff) {
            onUnlocked?.();
            return;
        }
        const tab = area ? s.areas?.[area] : undefined;
        if (tab && !tab.required) { onUnlocked?.(); return; }
        // Only treat THIS tab as open — another tab's unlock must not skip the PIN here.
        const fresh = tab ? tab.unlocked : false;
        if (fresh) {
            if (area && tab?.unlocked) {
                securityPinBus.markAreaUnlocked(area, tab.unlockedUntil ?? s.unlockedUntil, tab.lockMinutes);
            }
            onUnlocked?.();
            return;
        }
        if (s.lockedUntil) { setView({ kind: 'lockedOut', until: new Date(s.lockedUntil).getTime() }); return; }
        setView(s.hasPin ? { kind: 'unlock' } : { kind: 'setup', reset: false, step: 'intro' });
    }, [onUnlocked, area]);

    useEffect(() => {
        let alive = true;
        securityPinApi.status()
            .then((s) => { if (alive) routeFromStatus(s); })
            .catch((e) => { if (alive) { setError(lockError(e).message); setView({ kind: 'unlock' }); } });
        securityPinApi.supportStatus()
            .then((s) => {
                if (!alive) return;
                setSupportEligible(!!s.eligible);
                securityPinBus.setSupportGrant(s.activeGrant);
                // Already in a support session covering this tab — skip the PIN screen.
                if (s.activeGrant && area && securityPinBus.isAreaUnlocked(area)) {
                    onUnlocked?.();
                }
            })
            .catch(() => { if (alive) setSupportEligible(false); });
        return () => { alive = false; };
    }, [routeFromStatus, area, onUnlocked]);

    useEffect(() => {
        if (view.kind === 'lockedOut' && now >= view.until) { setView({ kind: 'unlock' }); setError(null); }
    }, [view, now]);

    const fail = (message: string) => { setError(message); setShake((n) => n + 1); };

    const submitUnlock = async (value: string) => {
        if (busy || value.length !== length) return;
        if (!area) {
            fail('This screen does not know which tab to unlock. Open it from a protected page.');
            return;
        }
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.unlock(value, area);
            const lockMinutes = status?.areas?.[area]?.lockMinutes ?? status?.ttlMinutes;
            finish(r.unlockedUntil, lockMinutes);
        } catch (e) {
            const { message, code: c, meta } = lockError(e);
            setPin('');
            if (c === 'PIN_LOCKED_OUT' && typeof meta?.lockedUntil === 'string') {
                setView({ kind: 'lockedOut', until: new Date(meta.lockedUntil).getTime() });
                setError(null);
            } else fail(message);
        } finally { setBusy(false); }
    };

    const startSetup = (reset: boolean) => {
        setError(null); setSentTo(null); setCode(''); setNewPin(''); setConfirm('');
        setView({ kind: 'setup', reset, step: 'intro' });
    };

    const sendCode = async () => {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.sendCode();
            setSentTo(r.email);
            setResendAt(Date.now() + 60_000); setNow(Date.now());
            setCode('');
            if (view.kind === 'setup') setView({ ...view, step: 'code' });
        } catch (e) {
            const { message, code: c, meta } = lockError(e);
            // If a code was already sent within the last minute, advance to the OTP screen
            // so the user can enter the existing code from their inbox instead of getting stuck.
            if (c === 'CODE_RECENTLY_SENT' && view.kind === 'setup' && view.step === 'intro') {
                const retryMs = (typeof meta?.retryInSec === 'number' ? meta.retryInSec : 45) * 1000;
                if (typeof meta?.email === 'string') setSentTo(meta.email);
                setResendAt(Date.now() + retryMs); setNow(Date.now());
                setCode('');
                setView({ ...view, step: 'code' });
            } else {
                setError(message);
            }
        } finally { setBusy(false); }
    };

    const goToPinStep = () => {
        setNewPin('');
        setConfirm('');
        setError(null);
        window.setTimeout(() => {
            setView((v) => (v.kind === 'setup' ? { ...v, step: 'pin' } : v));
        }, 50);
    };

    const goToConfirmStep = () => {
        setConfirm('');
        setError(null);
        window.setTimeout(() => {
            setView((v) => (v.kind === 'setup' ? { ...v, step: 'confirm' } : v));
        }, 50);
    };

    const savePin = async (confirmValue: string) => {
        if (view.kind !== 'setup' || busy) return;
        if (confirmValue !== newPin) {
            setConfirm(''); fail("The two PINs don't match. Enter it again.");
            return;
        }
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.setPin(code, newPin, area);
            const lockMinutes = (area && status?.areas?.[area]?.lockMinutes) || status?.ttlMinutes;
            finish(r.unlockedUntil, lockMinutes);
        } catch (e) {
            const { message, code: c } = lockError(e);
            if (c === 'PIN_WEAK') { setNewPin(''); setConfirm(''); setView({ ...view, step: 'pin' }); fail(message); }
            else if (c === 'CODE_WRONG' || c === 'CODE_EXPIRED') { setCode(''); setNewPin(''); setConfirm(''); setView({ ...view, step: 'code' }); fail(message); }
            else fail(message);
        } finally { setBusy(false); }
    };

    const cancelAfterCode = () => {
        setError(null); setSentTo(null); setCode(''); setNewPin(''); setConfirm('');
        if (status?.hasPin) setView({ kind: 'unlock' });
        else if (onCancel) onCancel();
        else setView({ kind: 'setup', reset: false, step: 'intro' });
    };

    // ── Presentation ────────────────────────────────────────────────────────────
    const email = status?.email;
    const ttl = status?.ttlMinutes ?? 15;
    const areaStatus = area ? status?.areas?.[area] : undefined;
    const areaTitle = area ? SECURITY_AREAS[area] : 'Protected Area';
    const lockShort = shortLockTime(areaStatus?.lockMinutes ?? ttl);

    const isMailHeader = view.kind === 'setup' && view.step === 'code';
    let title = `${areaTitle} is Locked`;
    let stepPill: string | null = null;
    let body: React.ReactNode = null;

    if (view.kind === 'loading') {
        body = (
            <Stack spacing={2} sx={{ width: '100%' }}>
                <Skeleton variant="text" width="75%" />
                <Skeleton variant="rounded" width="100%" height={50} />
                <Skeleton variant="rounded" width="100%" height={46} />
            </Stack>
        );
    } else if (view.kind === 'unlock') {
        // Security PIN unlock (not authenticator MFA — that is Support Access below).
        const greet = firstName?.trim() ? `${firstName.trim()}, enter` : 'Enter';
        const isMfaSettings = area === 'settings.developerMfa';
        if (isMfaSettings) title = 'Security PIN Required';
        body = (
            <Stack spacing={1.75} sx={{ width: '100%' }}>
                <Lead>
                    {isMfaSettings
                        ? `${greet} your ${length}-digit Security PIN to open MFA settings. Authenticator codes are not entered here.`
                        : `${greet} your ${length}-digit security PIN to continue.`}
                </Lead>
                {isMfaSettings && supportEligible && (
                    <Lead>
                        To view another employee&apos;s protected data with your authenticator, use System PIN Support Access below — pick them, then enter your MFA code.
                    </Lead>
                )}
                <InfoCard>
                    <Typography sx={{ m: 0, fontSize: 12, fontWeight: 600, color: '#334155', mb: 1.5 }}>
                        Enter {length}-digit Security PIN
                    </Typography>
                    <PinInput
                        label="Security PIN"
                        length={length}
                        value={pin}
                        onChange={(v) => { setPin(v); setError(null); }}
                        onComplete={submitUnlock}
                        autoFocus
                        disabled={busy || opening}
                        error={!!error}
                        shakeKey={shake}
                    />
                    <Feedback error={error} />
                </InfoCard>
                <PrimaryButton
                    disabled={pin.length !== length || busy || opening}
                    onClick={() => submitUnlock(pin)}
                >
                    {busy ? 'Checking…' : isMfaSettings ? 'Unlock with Security PIN' : `Unlock ${areaTitle}`}
                </PrimaryButton>
                <SecondaryActions>
                    <GhostLink muted onClick={() => startSetup(true)}>Forgot PIN? Reset with email</GhostLink>
                    {supportEligible && (
                        <GhostLink muted onClick={() => { setError(null); setView({ kind: 'support' }); }}>
                            System PIN Support Access
                        </GhostLink>
                    )}
                    {onCancel && <GhostLink muted onClick={onCancel}>Close</GhostLink>}
                </SecondaryActions>
            </Stack>
        );
    } else if (view.kind === 'support') {
        title = 'System PIN Support Access';
        body = (
            <SupportAccessPanel
                sourceArea={area ?? null}
                onUnlocked={() => {
                    // Grant is already on the bus; close the lock UI without a fake PIN unlock.
                    setOpening(true);
                    window.setTimeout(() => onUnlocked?.(), reduceMotion ? 0 : 420);
                }}
                onBack={() => { setError(null); setView({ kind: 'unlock' }); }}
            />
        );
    } else if (view.kind === 'lockedOut') {
        title = 'Too Many Wrong PINs';
        body = (
            <Stack spacing={2.25} sx={{ width: '100%' }}>
                <Lead>For your safety, PIN entry is temporarily paused.</Lead>
                <Countdown value={mmss(view.until - now)} caption="until you can try again" />
                <PrimaryButton onClick={() => startSetup(true)}>Reset PIN with Email Code</PrimaryButton>
                {onCancel && (
                    <SecondaryActions>
                        <GhostLink muted onClick={onCancel}>Close</GhostLink>
                    </SecondaryActions>
                )}
            </Stack>
        );
    } else {
        const { step, reset } = view;

        if (step === 'intro') {
            // Step 2: Request PIN Reset
            title = reset ? 'Reset Security PIN' : 'Set Up Security PIN';
            body = (
                <Stack spacing={2.25} sx={{ width: '100%' }}>
                    <Lead>
                        {reset
                            ? 'We will send a 6-digit verification code to your email to confirm your identity before you choose a new PIN.'
                            : 'System PIN–protected areas (salary, increment, roles & permissions, and more) use a 6-digit PIN separate from your login password.'}
                    </Lead>
                    {email && <EmailChip email={email} />}
                    <Feedback error={error} />
                    <PrimaryButton disabled={busy || !email} onClick={sendCode}>
                        {busy ? 'Sending…' : email ? 'Send Code to Email' : 'No login email on your account'}
                    </PrimaryButton>
                    <SecondaryActions>
                        {reset && status?.hasPin && (
                            <GhostLink muted onClick={() => { setError(null); setView({ kind: 'unlock' }); }}>
                                Back to unlock
                            </GhostLink>
                        )}
                        {onCancel && <GhostLink muted onClick={onCancel}>Close</GhostLink>}
                    </SecondaryActions>
                </Stack>
            );
        } else if (step === 'code') {
            // Step 1 of 3: Enter Email OTP
            title = 'Check Your Email';
            stepPill = '1 / 3';
            const targetEmail = sentTo || email || 'your email';
            const waiting = resendAt > now;
            body = (
                <Stack spacing={1.75} sx={{ width: '100%' }}>
                    <EmailChip email={targetEmail} />

                    <InfoCard>
                        <Typography sx={{ m: 0, fontSize: 12, fontWeight: 600, color: '#334155', mb: 1.25 }}>
                            Enter verification code
                        </Typography>
                        <Typography sx={{ m: 0, mb: 1.5, fontSize: 12.5, color: '#64748B', lineHeight: 1.45 }}>
                            Type the code from your inbox. Digits stay visible so you can check them.
                        </Typography>
                        <PinInput
                            key="code"
                            label="Email verification code"
                            length={length}
                            masked={false}
                            tone="info"
                            value={code}
                            autoFocus
                            onChange={(v) => { setCode(v); setError(null); }}
                            shakeKey={shake}
                            error={!!error}
                            onComplete={goToPinStep}
                        />
                        <Feedback error={error} />
                    </InfoCard>

                    <SecondaryActions>
                        <GhostLink muted disabled={waiting || busy} onClick={sendCode}>
                            {waiting ? `Resend code in ${mmss(resendAt - now)}` : 'Resend code'}
                        </GhostLink>
                        <GhostLink muted onClick={cancelAfterCode}>Cancel reset</GhostLink>
                    </SecondaryActions>
                </Stack>
            );
        } else if (step === 'pin') {
            // Step 2 of 3: Choose New PIN
            title = reset ? 'Choose a New PIN' : 'Choose Security PIN';
            stepPill = '2 / 3';
            body = (
                <Stack spacing={1.75} sx={{ width: '100%' }}>
                    <Lead>
                        Create a new PIN — avoid repeats or runs like 123456.
                    </Lead>
                    <InfoCard>
                        <Typography sx={{ m: 0, fontSize: 12, fontWeight: 600, color: '#334155', mb: 1.5 }}>
                            Enter {length}-digit Security PIN
                        </Typography>
                        <PinInput
                            key={`pin-${code}`}
                            label="New security PIN"
                            length={length}
                            value={newPin}
                            autoFocus
                            onChange={(v) => { setNewPin(v); setError(null); }}
                            shakeKey={shake}
                            error={!!error}
                            onComplete={goToConfirmStep}
                        />
                        <Feedback error={error} />
                    </InfoCard>
                    <PrimaryButton
                        disabled={newPin.length !== length || busy}
                        onClick={goToConfirmStep}
                    >
                        Continue to Confirm
                    </PrimaryButton>
                    <SecondaryActions>
                        <GhostLink muted onClick={cancelAfterCode}>Cancel reset</GhostLink>
                    </SecondaryActions>
                </Stack>
            );
        } else {
            // Step 3 of 3: Confirm New PIN
            title = 'Confirm New PIN';
            stepPill = '3 / 3';
            body = (
                <Stack spacing={1.75} sx={{ width: '100%' }}>
                    <Lead>
                        Re-enter the same {length}-digit security PIN to save and unlock.
                    </Lead>
                    <InfoCard>
                        <Typography sx={{ m: 0, fontSize: 12, fontWeight: 600, color: '#334155', mb: 1.5 }}>
                            Confirm {length}-digit Security PIN
                        </Typography>
                        <PinInput
                            key={`confirm-${newPin}`}
                            label="Confirm security PIN"
                            length={length}
                            value={confirm}
                            autoFocus
                            onChange={(v) => { setConfirm(v); setError(null); }}
                            shakeKey={shake}
                            error={!!error}
                            disabled={busy || opening}
                            onComplete={savePin}
                        />
                        <Feedback error={error} />
                    </InfoCard>
                    <PrimaryButton
                        disabled={confirm.length !== length || busy || opening}
                        onClick={() => savePin(confirm)}
                    >
                        {busy ? 'Saving…' : 'Save PIN & Unlock'}
                    </PrimaryButton>
                    <SecondaryActions>
                        <GhostLink muted onClick={() => { setError(null); setConfirm(''); setView({ ...view, step: 'pin' }); }}>
                            Change PIN
                        </GhostLink>
                        <GhostLink muted onClick={cancelAfterCode}>Cancel reset</GhostLink>
                    </SecondaryActions>
                </Stack>
            );
        }
    }

    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 448 },
                minWidth: 0,
                mx: 'auto',
                boxSizing: 'border-box',
                // 12px matches glass `thin` / Material dialog chrome — 16px read as too bubbly.
                borderRadius: '12px',
                overflow: 'hidden',
                bgcolor: dark ? '#111827' : '#FFFFFF',
                border: '1px solid',
                borderColor: dark ? alpha('#fff', 0.1) : BORDER_SLATE,
                boxShadow: dark
                    ? '0 20px 40px rgba(0,0,0,0.5)'
                    : '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
                textAlign: 'left',
            }}
        >
            {/* Check email = green; choose/confirm PIN = brand navy blue */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.25,
                    px: { xs: 1.5, sm: 3 },
                    py: { xs: 1.35, sm: 1.75 },
                    background: isMailHeader
                        ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)'
                        : `linear-gradient(135deg, ${T.color.brandHover} 0%, ${T.color.brand} 100%)`,
                    color: '#fff',
                    borderBottom: `3px solid ${isMailHeader ? '#4ade80' : T.color.accent}`,
                    flexShrink: 0,
                    minWidth: 0,
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    {isMailHeader ? <MailGlyph /> : <LockGlyph open={opening} />}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            component="h2"
                            sx={{
                                m: 0,
                                fontWeight: 700,
                                fontSize: { xs: 15.5, sm: 17 },
                                lineHeight: 1.25,
                                color: '#fff',
                                ...HEADING_CASE_SX,
                            }}
                        >
                            {toTitleCase(title)}
                        </Typography>
                        <Typography
                            sx={{
                                m: 0,
                                fontSize: { xs: 11.5, sm: 12.5 },
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: 'rgba(255,255,255,0.72)',
                            }}
                        >
                            Auto-locks after {lockShort} idle
                        </Typography>
                    </Box>
                </Stack>
                {stepPill && <StepPill label={stepPill} />}
            </Box>

            {/* Body surface (#FFFFFF) */}
            <Box
                sx={{
                    px: { xs: 1.5, sm: 3 },
                    py: { xs: 2, sm: 3 },
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {body}
            </Box>
        </Box>
    );
}

// ── Building blocks ────────────────────────────────────────────────────────────

function Lead({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                m: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: '#475569',
            }}
        >
            {children}
        </Typography>
    );
}

function EmailChip({ email }: { email: string }) {
    const dark = useTheme().palette.mode === 'dark';
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.15,
                borderRadius: '10px',
                bgcolor: dark ? alpha('#fff', 0.04) : SURFACE_IDLE,
                border: '1px solid',
                borderColor: dark ? alpha('#fff', 0.1) : BORDER_SLATE,
            }}
        >
            <Box
                aria-hidden
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '8px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(FOCUS_BLUE, 0.1),
                    color: FOCUS_BLUE,
                    flexShrink: 0,
                }}
            >
                <MailSvg size={18} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ m: 0, fontSize: 11.5, color: '#64748B', lineHeight: 1.2 }}>
                    Verification email
                </Typography>
                <Typography
                    sx={{
                        m: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: dark ? '#F8FAFC' : T.color.brand,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {email}
                </Typography>
            </Box>
        </Box>
    );
}

function InfoCard({ children }: { children: React.ReactNode }) {
    const dark = useTheme().palette.mode === 'dark';
    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                px: { xs: 1.25, sm: 1.75 },
                py: { xs: 1.35, sm: 1.75 },
                borderRadius: '10px',
                bgcolor: dark ? alpha('#fff', 0.03) : SURFACE_IDLE,
                border: '1px solid',
                borderColor: dark ? alpha('#fff', 0.1) : BORDER_SLATE,
                overflow: 'hidden',
            }}
        >
            {children}
        </Box>
    );
}

/** Quiet helpers under the primary CTA — centered, muted, never competing with Unlock. */
function SecondaryActions({ children }: { children: React.ReactNode }) {
    return (
        <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ width: '100%', pt: 0.5 }}
        >
            {children}
        </Stack>
    );
}

function PrimaryButton({
    children, onClick, disabled,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <WtButton
            fullWidth
            disabled={disabled}
            onClick={onClick}
            sx={{
                maxWidth: '100%',
                minWidth: 0,
                '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'text.disabled',
                    boxShadow: 'none',
                },
            }}
        >
            {children}
        </WtButton>
    );
}

function StepPill({ label }: { label: string }) {
    return (
        <Box
            aria-label={`Step ${label}`}
            sx={{
                px: 1.15,
                py: 0.35,
                borderRadius: '999px',
                bgcolor: alpha('#FFFFFF', 0.12),
                border: `1px solid ${alpha('#FFFFFF', 0.2)}`,
                fontSize: 12,
                fontWeight: 600,
                color: '#FFFFFF',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
            }}
        >
            {label}
        </Box>
    );
}

function Feedback({ error }: { error: string | null }) {
    if (!error) return null;
    return (
        <Box sx={{ width: '100%', mt: 1.5 }}>
            <InlineNotice trio={TRIO.rose} icon="information-2" role="alert">{error}</InlineNotice>
        </Box>
    );
}

function Countdown({ value, caption }: { value: string; caption: string }) {
    return (
        <Stack
            spacing={0.25}
            alignItems="center"
            aria-live="polite"
            sx={{
                py: 2,
                borderRadius: '12px',
                bgcolor: SURFACE_IDLE,
                border: `1px solid ${BORDER_SLATE}`,
            }}
        >
            <Typography sx={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.primary', lineHeight: 1.1 }}>
                {value}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{caption}</Typography>
        </Stack>
    );
}

function GhostLink({
    children, onClick, disabled, muted,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    muted?: boolean;
}) {
    return (
        <ButtonBase
            onClick={onClick}
            disabled={disabled}
            sx={{
                fontSize: 12.5,
                fontWeight: 500,
                color: disabled ? '#94A3B8' : muted ? '#64748B' : FOCUS_BLUE,
                borderRadius: '6px',
                px: 0.5,
                py: 0.25,
                '&:hover': {
                    color: disabled ? '#94A3B8' : '#334155',
                    textDecoration: disabled ? 'none' : 'underline',
                },
                '&.Mui-focusVisible': { outline: `2px solid ${FOCUS_BLUE}`, outlineOffset: 2 },
            }}
        >
            {children}
        </ButtonBase>
    );
}

function GlyphBadge({ children }: { children: React.ReactNode }) {
    // Matches GlassHeader's gradient icon tile (white frosted chip on the navy band).
    return (
        <Box
            aria-hidden
            sx={{
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                flexShrink: 0,
            }}
        >
            {children}
        </Box>
    );
}

function MailGlyph() {
    return (
        <GlyphBadge>
            <MailSvg size={20} />
        </GlyphBadge>
    );
}

function LockGlyph({ open }: { open: boolean }) {
    return (
        <GlyphBadge>
            <LockSvg size={20} open={open} />
        </GlyphBadge>
    );
}

/** Crisp outline lock — inline SVG so we never depend on MUI icon / Emotion styled interop. */
function LockSvg({ size, open }: { size: number; open?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d={open
                    ? 'M7 11V8a5 5 0 0 1 9.9-1'
                    : 'M8 11V8a4 4 0 1 1 8 0v3'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="16" r="1.35" fill="currentColor" />
        </svg>
    );
}

function MailSvg({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M4.5 7.5 12 13.5 19.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default SecurityPinPanel;
