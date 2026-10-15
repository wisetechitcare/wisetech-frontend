import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { WtButton, InlineNotice, PinInput, TRIO } from '@app/modules/common/components/ui';
import { lockError, securityPinApi, type MfaEnrollStart } from '@services/securityPin';

type Phase = 'loading' | 'setup' | 'code2' | 'recovery' | 'error';

const STEPS = [
    { id: 'code1', label: 'First code' },
    { id: 'code2', label: 'Next code' },
] as const;

function EnrollStepper({ phase }: { phase: Phase }) {
    const states = STEPS.map((_, i) => {
        if (i === 0) {
            if (phase === 'setup') return 'current' as const;
            if (phase === 'code2' || phase === 'recovery') return 'done' as const;
            return 'todo' as const;
        }
        if (phase === 'code2') return 'current' as const;
        if (phase === 'recovery') return 'done' as const;
        return 'todo' as const;
    });

    return (
        <Box
            role="list"
            aria-label="Setup steps"
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                width: '100%',
                gap: 0,
                pb: 1.5,
                mb: 0.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            {STEPS.map((step, i) => {
                const state = states[i];
                const done = state === 'done';
                const current = state === 'current';
                const lineFilled = states[i] === 'done';
                return (
                    <Fragment key={step.id}>
                        <Box
                            role="listitem"
                            aria-current={current ? 'step' : undefined}
                            sx={{
                                flex: '0 0 auto',
                                width: 88,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    color: done || current ? '#fff' : 'text.secondary',
                                    bgcolor: done ? TRIO.green.c : current ? TRIO.blue.c : 'background.paper',
                                    border: '2px solid',
                                    borderColor: done
                                        ? TRIO.green.c
                                        : current
                                            ? TRIO.blue.c
                                            : alpha(TRIO.slate.c, 0.28),
                                    boxShadow: current ? `0 0 0 3px ${alpha(TRIO.blue.c, 0.14)}` : 'none',
                                    transition: 'background-color .15s, border-color .15s, box-shadow .15s',
                                }}
                            >
                                {done ? '✓' : i + 1}
                            </Box>
                            <Typography
                                sx={{
                                    mt: 0.5,
                                    fontSize: 12,
                                    fontWeight: current ? 700 : 500,
                                    color: current || done ? 'text.primary' : 'text.secondary',
                                    textAlign: 'center',
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {step.label}
                            </Typography>
                        </Box>
                        {i < STEPS.length - 1 && (
                            <Box
                                aria-hidden
                                sx={{
                                    flex: '0 0 auto',
                                    width: 40,
                                    height: 2,
                                    mt: '12px',
                                    borderRadius: 1,
                                    bgcolor: lineFilled ? TRIO.green.c : alpha(TRIO.slate.c, 0.22),
                                    transition: 'background-color .15s',
                                }}
                            />
                        )}
                    </Fragment>
                );
            })}
        </Box>
    );
}

/**
 * Virtual MFA enrollment: scan QR, enter first code, wait, enter next consecutive code.
 */
export function DeveloperMfaEnrollForm({
    onComplete,
    onCancel,
}: {
    onComplete: () => void;
    onCancel?: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enroll, setEnroll] = useState<MfaEnrollStart | null>(null);
    const [phase, setPhase] = useState<Phase>('loading');
    const [code1, setCode1] = useState('');
    const [code2, setCode2] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [copied, setCopied] = useState(false);
    const [shake1, setShake1] = useState(0);
    const [shake2, setShake2] = useState(0);
    const submitting = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setBusy(true); setError(null); setPhase('loading');
            try {
                const started = await securityPinApi.mfaEnrollStart();
                if (!cancelled) {
                    setEnroll(started);
                    setPhase('setup');
                }
            } catch (e) {
                if (!cancelled) {
                    setError(lockError(e).message);
                    setPhase('error');
                }
            } finally {
                if (!cancelled) setBusy(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const submitFirst = useCallback(async (digits: string) => {
        if (submitting.current || digits.length !== 6) return;
        submitting.current = true;
        setBusy(true); setError(null);
        try {
            await securityPinApi.mfaEnrollConfirmFirst(digits);
            setCode1(digits);
            setCode2('');
            setPhase('code2');
        } catch (e) {
            setError(lockError(e).message);
            setCode1('');
            setShake1((n) => n + 1);
        } finally {
            setBusy(false);
            submitting.current = false;
        }
    }, []);

    const submitNext = useCallback(async (digits: string) => {
        if (submitting.current || digits.length !== 6) return;
        if (digits === code1) {
            setError('Wait for your authenticator to show a new code, then enter that one.');
            setCode2('');
            setShake2((n) => n + 1);
            return;
        }
        submitting.current = true;
        setBusy(true); setError(null);
        try {
            const r = await securityPinApi.mfaEnrollConfirmNext(digits);
            setRecoveryCodes(r.recoveryCodes);
            setEnroll(null);
            setPhase('recovery');
        } catch (e) {
            setError(lockError(e).message);
            setCode1('');
            setCode2('');
            setShake2((n) => n + 1);
            setPhase('setup');
        } finally {
            setBusy(false);
            submitting.current = false;
        }
    }, [code1]);

    const copyCodes = async () => {
        if (!recoveryCodes) return;
        try {
            await navigator.clipboard.writeText(recoveryCodes.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked */ }
    };

    const downloadCodes = () => {
        if (!recoveryCodes) return;
        const stamped = new Date().toISOString().slice(0, 10);
        const body = [
            'WiseTech — System PIN MFA recovery codes',
            `Saved: ${new Date().toLocaleString()}`,
            '',
            'Each code works once. Store this file somewhere safe.',
            '',
            ...recoveryCodes,
            '',
        ].join('\n');
        const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wisetech-system-pin-mfa-recovery-codes-${stamped}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    if (phase === 'recovery' && recoveryCodes) {
        return (
            <Stack spacing={1.75} sx={{ width: '100%', maxWidth: 440, mx: 'auto' }}>
                <InlineNotice trio={TRIO.amber} icon="information-5">
                    Save these recovery codes now. They are shown once and each works only once.
                </InlineNotice>
                <Box
                    sx={{
                        p: 1.75,
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => alpha(t.palette.warning.main, 0.06),
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 13,
                        lineHeight: 1.7,
                    }}
                >
                    {recoveryCodes.map((c) => (
                        <Box key={c} component="div">{c}</Box>
                    ))}
                </Box>
                <Stack spacing={1.25} sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                        <WtButton ghost onClick={copyCodes} sx={{ flex: 1 }}>
                            {copied ? 'Copied' : 'Copy codes'}
                        </WtButton>
                        <WtButton ghost onClick={downloadCodes} sx={{ flex: 1 }}>
                            Download codes
                        </WtButton>
                    </Stack>
                    <WtButton
                        onClick={() => { setRecoveryCodes(null); onComplete(); }}
                        sx={{ width: '100%' }}
                    >
                        I have saved them
                    </WtButton>
                </Stack>
            </Stack>
        );
    }

    if (phase === 'loading' || phase === 'error' || !enroll) {
        return (
            <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 440, mx: 'auto' }}>
                {error && <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">{error}</InlineNotice>}
                {!error && (
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {busy ? 'Preparing QR code…' : 'Starting…'}
                    </Typography>
                )}
                {error && onCancel && <WtButton ghost onClick={onCancel}>Cancel</WtButton>}
            </Stack>
        );
    }

    return (
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}>
            <EnrollStepper phase={phase} />

            {error && <InlineNotice trio={TRIO.rose} icon="information-5" role="alert">{error}</InlineNotice>}

            {(phase === 'setup' || phase === 'code2') && (
                <Box
                    sx={{
                        display: 'grid',
                        gap: { xs: 1.5, sm: 2 },
                        gridTemplateColumns: { xs: '1fr', sm: '148px minmax(0, 1fr)' },
                        alignItems: 'center',
                        opacity: phase === 'code2' ? 0.72 : 1,
                    }}
                >
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: '14px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            justifySelf: { xs: 'center', sm: 'start' },
                            width: 'fit-content',
                        }}
                    >
                        <Box
                            component="img"
                            src={enroll.qrDataUrl}
                            alt="MFA QR code"
                            sx={{ width: 140, height: 140, display: 'block' }}
                        />
                    </Box>
                    <Stack spacing={1.1} sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                            {phase === 'setup'
                                ? 'Scan with Google Authenticator, Microsoft Authenticator, or any TOTP app. Then enter the current code below and verify.'
                                : 'First code accepted. Keep the account in your authenticator app.'}
                        </Typography>
                        {phase === 'setup' && (
                            <Box
                                sx={{
                                    p: 1.15,
                                    borderRadius: '10px',
                                    border: '1px dashed',
                                    borderColor: 'divider',
                                    bgcolor: 'action.hover',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                    fontSize: 12,
                                    letterSpacing: 0.4,
                                    wordBreak: 'break-all',
                                    color: 'text.primary',
                                }}
                            >
                                {enroll.manualSecret}
                            </Box>
                        )}
                    </Stack>
                </Box>
            )}

            {phase === 'setup' && (
                <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                        Enter the <strong>current</strong> 6-digit code from your authenticator.
                    </Typography>
                    <PinInput
                        label="First authenticator code"
                        length={6}
                        masked={false}
                        tone="info"
                        value={code1}
                        onChange={setCode1}
                        autoFocus
                        disabled={busy}
                        shakeKey={shake1}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <WtButton
                            disabled={busy || code1.length !== 6}
                            onClick={() => void submitFirst(code1)}
                        >
                            {busy ? 'Checking…' : 'Verify first code'}
                        </WtButton>
                        <WtButton ghost disabled={busy} onClick={() => onCancel?.()}>
                            Cancel
                        </WtButton>
                    </Stack>
                </Stack>
            )}

            {phase === 'code2' && (
                <Stack spacing={1.5}>
                    <InlineNotice trio={TRIO.blue} icon="information-5">
                        Wait until your authenticator shows a <strong>new</strong> code (~30 seconds), then enter it and verify.
                    </InlineNotice>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        First code accepted · {code1.slice(0, 3)}···
                    </Typography>
                    <PinInput
                        label="Second authenticator code"
                        length={6}
                        masked={false}
                        tone="info"
                        value={code2}
                        onChange={setCode2}
                        autoFocus
                        disabled={busy}
                        shakeKey={shake2}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                        <WtButton
                            disabled={busy || code2.length !== 6 || code2 === code1}
                            onClick={() => void submitNext(code2)}
                        >
                            {busy ? 'Enabling…' : 'Verify and enable MFA'}
                        </WtButton>
                        <WtButton
                            ghost
                            disabled={busy}
                            onClick={() => {
                                setCode1('');
                                setCode2('');
                                setError(null);
                                setPhase('setup');
                            }}
                        >
                            Back
                        </WtButton>
                        <WtButton ghost disabled={busy} onClick={() => onCancel?.()}>
                            Cancel
                        </WtButton>
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}

export default DeveloperMfaEnrollForm;
