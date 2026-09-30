import { useEffect, useId, useRef } from 'react';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { T } from './tokens';

/**
 * PinInput — a row of single-digit boxes for a PIN or a one-time code.
 *
 * WHY BOXES AND NOT A PASSWORD FIELD: browsers and password managers recognise
 * `<input type="password">` and offer to save and autofill it. For a PIN whose whole job is to
 * prove who is at the keyboard, that autofill would hand the secret to anyone at an unlocked
 * desk. Six separate `text` inputs with `autocomplete="off"` (and the password-manager opt-outs)
 * are not treated as a credential, so there is nothing saved to offer.
 *
 * Masking is drawn, not delegated: the digit is typed into a transparent input and a dot is
 * painted over it. `-webkit-text-security` would do it in one line but is not cross-browser.
 *
 * Keyboard: digits advance, Backspace clears then steps back, ←/→ move, paste fills from the
 * focused box. `onComplete` fires when every box is filled.
 *
 * `shakeKey` — bump it after a wrong entry to shake the row once (skipped under reduced motion).
 */
export interface PinInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    /** Draw dots instead of digits. Default true; pass false for an emailed code. */
    masked?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
    error?: boolean;
    /** Accessible name for the whole row, e.g. "Salary PIN". */
    label: string;
    shakeKey?: number;
}

export function PinInput({
    length = 6, value, onChange, onComplete, masked = true, autoFocus, disabled, error, label, shakeKey = 0,
}: PinInputProps) {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const refs = useRef<Array<HTMLInputElement | null>>([]);
    const nameSeed = useId();
    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    useEffect(() => {
        if (autoFocus) refs.current[Math.min(value.length, length - 1)]?.focus();
        // Only on mount / when re-enabled — refocusing on every keystroke would fight the user.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFocus, disabled]);

    const commit = (next: string) => {
        const clean = next.replace(/\D/g, '').slice(0, length);
        onChange(clean);
        if (clean.length === length) onComplete?.(clean);
        return clean;
    };

    const focusAt = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

    const handleInput = (i: number, raw: string) => {
        const typed = raw.replace(/\D/g, '');
        if (!typed) return;
        // Typing into a filled box replaces it; typing several (autofill, fast paste) spills right.
        const next = (value.slice(0, i) + typed + value.slice(i + typed.length)).slice(0, length);
        const clean = commit(next);
        focusAt(Math.min(i + typed.length, clean.length, length - 1));
    };

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (digits[i]) commit(value.slice(0, i) + value.slice(i + 1));
            else if (i > 0) { commit(value.slice(0, i - 1) + value.slice(i)); focusAt(i - 1); }
        } else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
    };

    const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
        if (!pasted) return;
        const clean = commit((value.slice(0, i) + pasted).slice(0, length));
        focusAt(Math.min(clean.length, length - 1));
    };

    const ring = error ? theme.palette.error.main : theme.palette.primary.main;

    return (
        <Box
            key={shakeKey}
            role="group"
            aria-label={label}
            sx={{
                display: 'flex', justifyContent: 'center', gap: { xs: 0.75, sm: 1.25 },
                ...(shakeKey > 0 && {
                    '@keyframes wtPinShake': {
                        '0%, 100%': { transform: 'translateX(0)' },
                        '20%': { transform: 'translateX(-8px)' },
                        '40%': { transform: 'translateX(7px)' },
                        '60%': { transform: 'translateX(-5px)' },
                        '80%': { transform: 'translateX(3px)' },
                    },
                    animation: `wtPinShake 380ms ${T.motion.easing.standard}`,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }),
            }}
        >
            {digits.map((d, i) => (
                <Box key={i} sx={{ position: 'relative', width: { xs: 42, sm: 50 }, height: { xs: 52, sm: 60 } }}>
                    <Box
                        component="input"
                        ref={(el: HTMLInputElement | null) => { refs.current[i] = el; }}
                        value={d}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInput(i, e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKey(i, e)}
                        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => handlePaste(i, e)}
                        onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                        disabled={disabled}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={length}
                        // Not a credential to the browser — see the note above.
                        autoComplete="off"
                        name={`${nameSeed}-d${i}`}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        aria-label={`${label}, digit ${i + 1} of ${length}`}
                        aria-invalid={error || undefined}
                        sx={{
                            width: '100%', height: '100%', p: 0, m: 0, outline: 'none',
                            textAlign: 'center', fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                            color: masked ? 'transparent' : 'text.primary', caretColor: theme.palette.primary.main,
                            bgcolor: d ? alpha(ring, dark ? 0.16 : 0.06) : 'background.paper',
                            border: '1.5px solid', borderColor: error ? 'error.main' : d ? alpha(ring, 0.55) : 'divider',
                            borderRadius: '14px',
                            boxShadow: dark ? 'none' : `inset 0 1px 2px ${alpha(theme.palette.common.black, 0.06)}`,
                            transition: `border-color ${T.motion.duration.quick}ms ease, background-color ${T.motion.duration.quick}ms ease, box-shadow ${T.motion.duration.quick}ms ease`,
                            '&:focus': { borderColor: ring, boxShadow: `0 0 0 4px ${alpha(ring, 0.18)}` },
                            '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
                        }}
                    />
                    {masked && d && (
                        <Box
                            aria-hidden
                            sx={{
                                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none',
                                '&::after': {
                                    content: '""', width: 12, height: 12, borderRadius: '50%',
                                    bgcolor: error ? 'error.main' : 'text.primary',
                                },
                            }}
                        />
                    )}
                </Box>
            ))}
        </Box>
    );
}

export default PinInput;
