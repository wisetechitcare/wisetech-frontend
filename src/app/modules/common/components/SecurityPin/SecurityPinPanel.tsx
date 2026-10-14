import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';
import { RootState } from '@redux/store';
import { WtButton, InlineNotice, TRIO, PinInput } from '@app/modules/common/components/ui';
import { T } from '@app/modules/common/components/ui/tokens';
import { securityPinApi, lockError, formatLockTime, SECURITY_AREAS, type SecurityArea, type SecurityPinStatus } from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';

/**
 * The security PIN screen: unlock with the PIN, set one up the first time, reset a forgotten one,
 * and wait out a lockout.  Used inline by `SecurityPinGate` (a protected page) and inside
 * `SecurityPinHost` (a protected call made from any other screen).
 *
 * Setting / resetting is authorised by a code emailed to the login address — never the login
 * password, which the browser would simply autofill for whoever is at the desk.
 */

type View =
    | { kind: 'loading' }
    | { kind: 'unlock' }
    | { kind: 'lockedOut'; until: number }
    | { kind: 'setup'; reset: boolean; step: 'intro' | 'code' | 'pin' | 'confirm' };

export interface SecurityPinPanelProps {
    /** Called after the PIN is accepted (or the browser was already unlocked). */
    onUnlocked?: () => void;
    /** Shown in the dialog variant: close without unlocking. */
    onCancel?: () => void;
    /** The protected tab asking — its own setting decides, and its name is in the title. */
    area?: SecurityArea | null;
}

const mmss = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function SecurityPinPanel({ onUnlocked, onCancel, area }: SecurityPinPanelProps) {
    const theme = useTheme();
    const firstName = useSelector((s: RootState) => s.auth.currentUser.firstName);

    const [status, setStatus] = useState<SecurityPinStatus | null>(null);
    const [view, setView] = useState<View>({ kind: 'loading' });
    const [pin, setPin] = useState('');
    const [code, setCode] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(0);
    const [opening, setOpening] = useState(false);
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(Date.now());

    const length = status?.pinLength ?? 6;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // A 1s clock only while something is counting down.
    const counting = view.kind === 'lockedOut' || resendAt > now;
    useEffect(() => {
        if (!counting) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [counting]);

    const finish = useCallback((unlockedUntil: string | null, ttl?: number) => {
        // One orchestrated moment: the shackle lifts, then the content appears.
        setOpening(true);
        window.setTimeout(() => {
            securityPinBus.markUnlocked(unlockedUntil, ttl);
            onUnlocked?.();
        }, reduceMotion ? 0 : 420);
    }, [onUnlocked, reduceMotion]);

    const routeFromStatus = useCallback((s: SecurityPinStatus) => {
        setStatus(s);
        securityPinBus.setPolicy(s.required !== false, s.ttlMinutes ?? 15, s.areas);
        // Judged by the asking tab's own setting when there is one (Roles & Permissions → Advanced).
        const tab = area ? s.areas?.[area] : undefined;
        if (tab && !tab.required) { onUnlocked?.(); return; } // No PIN for this tab: the gate opens itself
        const fresh = tab ? tab.unlocked : s.required === false || !!s.unlockedUntil;
        if (fresh) { securityPinBus.markUnlocked(s.unlockedUntil, s.ttlMinutes); onUnlocked?.(); return; }
        if (s.lockedUntil) { setView({ kind: 'lockedOut', until: new Date(s.lockedUntil).getTime() }); return; }
        setView(s.hasPin ? { kind: 'unlock' } : { kind: 'setup', reset: false, step: 'intro' });
    }, [onUnlocked, area]);

    useEffect(() => {
        let alive = true;
        securityPinApi.status()
            .then((s) => { if (alive) routeFromStatus(s); })
            .catch((e) => { if (alive) { setError(lockError(e).message); setView({ kind: 'unlock' }); } });
        return () => { alive = false; };
    }, [routeFromStatus]);

    // Lockout ends on its own.
    useEffect(() => {
        if (view.kind === 'lockedOut' && now >= view.until) { setView({ kind: 'unlock' }); setError(null); }
    }, [view, now]);

    const fail = (message: string) => { setError(message); setShake((n) => n + 1); };

    const submitUnlock = async (value: string) => {
        if (busy || value.length !== length) return;
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.unlock(value);
            finish(r.unlockedUntil, status?.ttlMinutes);
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
        setError(null); setNotice(null); setCode(''); setNewPin(''); setConfirm('');
        setView({ kind: 'setup', reset, step: 'intro' });
    };

    const sendCode = async () => {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.sendCode();
            setNotice(`We sent a ${length}-digit code to ${r.email}. It expires in 10 minutes.`);
            setResendAt(Date.now() + 60_000); setNow(Date.now());
            setCode('');
            if (view.kind === 'setup') setView({ ...view, step: 'code' });
        } catch (e) { setError(lockError(e).message); }
        finally { setBusy(false); }
    };

    const savePin = async (confirmValue: string) => {
        if (view.kind !== 'setup' || busy) return;
        if (confirmValue !== newPin) {
            setConfirm(''); fail("The two PINs don't match. Enter it again.");
            return;
        }
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.setPin(code, newPin);
            finish(r.unlockedUntil, status?.ttlMinutes);
        } catch (e) {
            const { message, code: c } = lockError(e);
            if (c === 'PIN_WEAK') { setNewPin(''); setConfirm(''); setView({ ...view, step: 'pin' }); fail(message); }
            else if (c === 'CODE_WRONG' || c === 'CODE_EXPIRED') { setCode(''); setNewPin(''); setConfirm(''); setView({ ...view, step: 'code' }); fail(message); }
            else fail(message);
        } finally { setBusy(false); }
    };

    // ── Presentation ────────────────────────────────────────────────────────────
    const email = status?.email;
    const ttl = status?.ttlMinutes ?? 15;
    const areaStatus = area ? status?.areas?.[area] : undefined;

    let title = area ? `${SECURITY_AREAS[area]} is locked` : 'This area is locked';
    let body: React.ReactNode = null;

    if (view.kind === 'loading') {
        body = (
            <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="rounded" width="100%" height={56} />
            </Stack>
        );
    } else if (view.kind === 'unlock') {
        body = (
            <>
                <Lead>{firstName ? `${firstName}, enter` : 'Enter'} your {length}-digit security PIN to continue.</Lead>
                <PinInput label="Security PIN" length={length} value={pin} onChange={(v) => { setPin(v); setError(null); }}
                    onComplete={submitUnlock} autoFocus disabled={busy || opening} error={!!error} shakeKey={shake} />
                <Feedback error={error} />
                <WtButton fullWidth disabled={pin.length !== length || busy || opening} onClick={() => submitUnlock(pin)}>
                    {busy ? 'Checking…' : 'Unlock'}
                </WtButton>
                <TextLink onClick={() => startSetup(true)}>Forgot PIN?</TextLink>
            </>
        );
    } else if (view.kind === 'lockedOut') {
        title = 'Too many wrong PINs';
        body = (
            <>
                <Lead>For your safety, PIN entry is paused.</Lead>
                <Countdown value={mmss(view.until - now)} caption="until you can try again" />
                <WtButton fullWidth inverted onClick={() => startSetup(true)}>Reset PIN with an email code</WtButton>
            </>
        );
    } else {
        const { step, reset } = view;
        title = reset ? 'Reset your security PIN' : 'Set up your security PIN';
        const stepNo = step === 'code' ? 1 : step === 'pin' ? 2 : step === 'confirm' ? 3 : 0;
        body = (
            <>
                {step === 'intro' && (
                    <>
                        <Lead>
                            {reset
                                ? 'We will email a code to confirm it is you, then you can choose a new PIN.'
                                : 'Salary, increments and access settings need a PIN that only you know. It is separate from your login password, so a password saved in the browser cannot open these pages.'}
                        </Lead>
                        <Feedback error={error} />
                        <WtButton fullWidth disabled={busy || !email} onClick={sendCode}>
                            {busy ? 'Sending…' : email ? `Email a code to ${email}` : 'No login email on your account'}
                        </WtButton>
                        {reset && status?.hasPin && <TextLink onClick={() => { setError(null); setView({ kind: 'unlock' }); }}>I remember my PIN</TextLink>}
                    </>
                )}
                {step !== 'intro' && (
                    <>
                        <StepLabel n={stepNo}>
                            {step === 'code' ? 'Enter the code from your email' : step === 'pin' ? `Choose a ${length}-digit PIN` : 'Enter the same PIN again'}
                        </StepLabel>
                        {step === 'code' && (
                            <PinInput key="code" label="Email code" length={length} masked={false} value={code} autoFocus
                                onChange={(v) => { setCode(v); setError(null); }} shakeKey={shake} error={!!error}
                                onComplete={() => setView({ ...view, step: 'pin' })} />
                        )}
                        {step === 'pin' && (
                            <PinInput key="pin" label="New security PIN" length={length} value={newPin} autoFocus
                                onChange={(v) => { setNewPin(v); setError(null); }} shakeKey={shake} error={!!error}
                                onComplete={() => { setConfirm(''); setView({ ...view, step: 'confirm' }); }} />
                        )}
                        {step === 'confirm' && (
                            <PinInput key="confirm" label="Confirm security PIN" length={length} value={confirm} autoFocus
                                onChange={(v) => { setConfirm(v); setError(null); }} shakeKey={shake} error={!!error}
                                disabled={busy || opening} onComplete={savePin} />
                        )}
                        <Feedback error={error} notice={step === 'code' ? notice : null} />
                        {step === 'pin' && <Hint>Avoid a repeated digit or a run like 123456.</Hint>}
                        {step === 'confirm' && (
                            <WtButton fullWidth disabled={confirm.length !== length || busy || opening} onClick={() => savePin(confirm)}>
                                {busy ? 'Saving…' : 'Save PIN and unlock'}
                            </WtButton>
                        )}
                        <Stack direction="row" spacing={2} justifyContent="center">
                            {step !== 'code' && (
                                <TextLink onClick={() => { setError(null); setView({ ...view, step: step === 'confirm' ? 'pin' : 'code' }); }}>Back</TextLink>
                            )}
                            {step === 'code' && (
                                <TextLink disabled={resendAt > now || busy} onClick={sendCode}>
                                    {resendAt > now ? `Send a new code in ${mmss(resendAt - now)}` : 'Send a new code'}
                                </TextLink>
                            )}
                        </Stack>
                    </>
                )}
            </>
        );
    }

    return (
        <Stack spacing={2.25} alignItems="center" sx={{ width: '100%', maxWidth: 400, mx: 'auto', textAlign: 'center' }}>
            <LockGlyph open={opening} tone={view.kind === 'lockedOut' ? theme.palette.error.main : theme.palette.primary.main} />
            <Typography component="h2" sx={{ m: 0, fontSize: 20, fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
                {title}
            </Typography>
            {body}
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', pt: 0.5 }}>
                Locks again after {formatLockTime(areaStatus?.lockMinutes ?? ttl)} without activity{areaStatus?.source.kind === 'role' ? ` (set for the ${areaStatus.source.roleName} role)` : areaStatus?.source.kind === 'employee' ? ' (set for you)' : ''}.
            </Typography>
            {onCancel && <TextLink onClick={onCancel}>Not now</TextLink>}
        </Stack>
    );
}

// ── Small pieces, private to the panel ─────────────────────────────────────────

function Lead({ children }: { children: React.ReactNode }) {
    return <Typography sx={{ m: 0, fontSize: 13.5, lineHeight: 1.55, color: 'text.secondary', maxWidth: 340 }}>{children}</Typography>;
}

function Hint({ children }: { children: React.ReactNode }) {
    return <Typography sx={{ m: 0, fontSize: 12, color: 'text.secondary' }}>{children}</Typography>;
}

function Feedback({ error, notice }: { error: string | null; notice?: string | null }) {
    if (error) return <Box sx={{ width: '100%' }}><InlineNotice trio={TRIO.rose} icon="information-2" role="alert">{error}</InlineNotice></Box>;
    if (notice) return <Box sx={{ width: '100%' }}><InlineNotice trio={TRIO.blue} icon="sms">{notice}</InlineNotice></Box>;
    return null;
}

/** "Step 2 of 3" — the setup flow genuinely is a sequence, so it is numbered. */
function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <Stack spacing={0.25} alignItems="center">
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'primary.main' }}>Step {n} of 3</Typography>
            <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: 'text.primary' }}>{children}</Typography>
        </Stack>
    );
}

function Countdown({ value, caption }: { value: string; caption: string }) {
    return (
        <Stack spacing={0.25} alignItems="center" aria-live="polite">
            <Typography sx={{ fontSize: 34, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.primary', lineHeight: 1.1 }}>{value}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{caption}</Typography>
        </Stack>
    );
}

function TextLink({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <ButtonBase
            onClick={onClick}
            disabled={disabled}
            sx={{
                fontSize: 13, fontWeight: 600, color: disabled ? 'text.disabled' : 'primary.main', borderRadius: 1, px: 0.75, py: 0.25,
                '&:hover': { textDecoration: disabled ? 'none' : 'underline' },
                '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
        >
            {children}
        </ButtonBase>
    );
}

/**
 * The padlock. Its shackle lifts and swings when the PIN is accepted — the page's one moment of
 * motion, and it answers the person's action. Drawn in currentColor so it follows the theme.
 */
function LockGlyph({ open, tone }: { open: boolean; tone: string }) {
    const hole = useTheme().palette.background.paper;
    return (
        <Box
            aria-hidden
            sx={{
                width: 64, height: 64, borderRadius: '20px', display: 'grid', placeItems: 'center',
                color: tone, bgcolor: alpha(tone, 0.1), border: `1px solid ${alpha(tone, 0.22)}`,
                transition: `background-color ${T.motion.duration.standard}ms ease`,
                '& .shackle': {
                    transformOrigin: '21px 14px',
                    transition: `transform ${T.motion.duration.emphasized}ms ${T.motion.easing.spring}`,
                    transform: open ? 'translateY(-4px) rotate(-28deg)' : 'none',
                },
                '@media (prefers-reduced-motion: reduce)': { '& .shackle': { transition: 'none' } },
            }}
        >
            <svg width="30" height="32" viewBox="0 0 30 32" fill="none">
                <path className="shackle" d="M9 14V9.5a6 6 0 0 1 12 0V14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                <rect x="4" y="14" width="22" height="16" rx="4.5" fill="currentColor" />
                <circle cx="15" cy="21" r="2.1" fill={hole} />
                <rect x="14" y="21.5" width="2" height="4" rx="1" fill={hole} />
            </svg>
        </Box>
    );
}

export default SecurityPinPanel;
