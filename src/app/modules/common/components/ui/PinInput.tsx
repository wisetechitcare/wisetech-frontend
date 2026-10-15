import { useEffect, useId, useRef } from 'react';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { T } from './tokens';

/**
 * PinInput — single-digit slots for a Security PIN or a 6-digit email OTP.
 *
 * Strictly follows the two-mode spec:
 *   • PIN (`tone="primary"`, `masked={true}`): 6 uniform slots (44×48, 8px radius),
 *     idle `#F8FAFC` / `#E2E8F0`, focus `#2563EB` ring, masked solid dots (`●`).
 *   • Email OTP (`tone="info"`, `masked={false}`): 3–3 split grid (`[ ][ ][ ] - [ ][ ][ ]`)
 *     with a middle dash and visible digits so it cannot be mistaken for PIN entry.
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
    tone?: 'primary' | 'info';
}

const FOCUS_BLUE = '#2563EB';
const BORDER_IDLE = '#E2E8F0';
const BG_IDLE = '#F8FAFC';

export function PinInput({
    length = 6, value, onChange, onComplete, masked = true, autoFocus, disabled, error, label, shakeKey = 0,
    tone = 'primary',
}: PinInputProps) {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const refs = useRef<Array<HTMLInputElement | null>>([]);
    const nameSeed = useId();
    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    useEffect(() => {
        if (!autoFocus || disabled) return;
        const t = window.setTimeout(() => {
            refs.current[Math.min(value.length, length - 1)]?.focus();
        }, 30);
        return () => window.clearTimeout(t);
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

    const isOtp = tone === 'info' || !masked;
    const ring = error ? theme.palette.error.main : FOCUS_BLUE;
    const half = Math.floor(length / 2);

    return (
        <Box
            key={shakeKey}
            role="group"
            aria-label={label}
            sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: isOtp ? { xs: 0.5, sm: 0.85 } : { xs: 0.55, sm: 1 },
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
                <Box key={i} sx={{ display: 'contents' }}>
                    {isOtp && length === 6 && i === half && (
                        <Box
                            component="span"
                            aria-hidden
                            sx={{
                                flex: '0 0 auto',
                                width: { xs: 8, sm: 12 },
                                textAlign: 'center',
                                fontSize: { xs: 14, sm: 16 },
                                fontWeight: 600,
                                color: '#94A3B8',
                                userSelect: 'none',
                                lineHeight: 1,
                            }}
                        >
                            –
                        </Box>
                    )}
                    <Box
                        sx={{
                            position: 'relative',
                            // Fluid slots: share the row evenly so 6 boxes never overflow a phone card.
                            flex: '1 1 0',
                            minWidth: 0,
                            maxWidth: { xs: 44, sm: 48 },
                            aspectRatio: '1 / 1.1',
                            height: { xs: 44, sm: 50 },
                        }}
                    >
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
                            autoComplete="off"
                            name={`${nameSeed}-d${i}`}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-form-type="other"
                            aria-label={`${label}, digit ${i + 1} of ${length}`}
                            aria-invalid={error || undefined}
                            sx={{
                                width: '100%',
                                height: '100%',
                                boxSizing: 'border-box',
                                p: 0,
                                m: 0,
                                outline: 'none',
                                textAlign: 'center',
                                fontSize: { xs: 17, sm: 20 },
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                                color: masked ? 'transparent' : (dark ? '#F8FAFC' : '#0F172A'),
                                caretColor: ring,
                                bgcolor: d
                                    ? (dark ? '#1E293B' : '#FFFFFF')
                                    : (dark ? alpha('#0F172A', 0.6) : BG_IDLE),
                                border: '1.5px solid',
                                borderColor: error
                                    ? 'error.main'
                                    : d
                                        ? alpha(ring, 0.65)
                                        : (dark ? alpha('#fff', 0.14) : BORDER_IDLE),
                                borderRadius: '6px',
                                transition: `border-color ${T.motion.duration.quick}ms ease, box-shadow ${T.motion.duration.quick}ms ease, background-color ${T.motion.duration.quick}ms ease`,
                                '&:focus': {
                                    bgcolor: dark ? '#1E293B' : '#FFFFFF',
                                    borderColor: ring,
                                    // Keep the focus ring inside the slot so it cannot spill past the card.
                                    boxShadow: `inset 0 0 0 2px ${alpha(ring, 0.35)}`,
                                },
                                '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
                            }}
                        />
                        {masked && d && (
                            <Box
                                aria-hidden
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'grid',
                                    placeItems: 'center',
                                    pointerEvents: 'none',
                                    '&::after': {
                                        content: '""',
                                        width: { xs: 8, sm: 10 },
                                        height: { xs: 8, sm: 10 },
                                        borderRadius: '50%',
                                        bgcolor: error ? 'error.main' : (dark ? '#F8FAFC' : '#0F172A'),
                                    },
                                }}
                            />
                        )}
                    </Box>
                </Box>
            ))}
        </Box>
    );
}

export default PinInput;
