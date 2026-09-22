import { useEffect, useState } from 'react';
import { useTimeFormat } from '@hooks/useTimeFormat';
import { KTIcon } from '@metronic/helpers';
import { Box, ButtonBase, Collapse, Dialog, Grow, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import { clockClasses, clockNumberClasses, clockPointerClasses } from '@mui/x-date-pickers/TimeClock';
import dayjs, { type Dayjs } from 'dayjs';
import { TRIO, type Trio } from '@app/modules/common/components/ui/tw';

/**
 * TimePickerField — the app's canonical time picker.
 *
 * A Material-3 time picker: a dial you drag or tap (hours, then minutes), a keyboard mode
 * for people who would rather type, and Cancel/OK. Controlled — `value` is always a 24h
 * "HH:MM" string on the wire, whichever way it is displayed. Reuse this everywhere a time
 * is picked instead of a native `<input type="time">` or a bespoke picker.
 *
 * It replaced a pair of snap-scrolling wheels (`TimeWheelField`). The wheels asked for a
 * drag to reach a distant hour and committed every touch straight to the form; the dial is
 * one tap per field and commits only on OK, so a mis-tap costs nothing.
 *
 * Every colour here is derived from the MUI theme and the caller's `tone` — nothing is
 * hard-coded — so the dialog follows light/dark with the rest of the app.
 */

/** M3 emphasised easings: decelerate on the way in, accelerate on the way out. */
const EASE_IN = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
const EASE_OUT = 'cubic-bezier(0.3, 0, 0.8, 0.15)';
const DUR_IN = 300;
const DUR_OUT = 200;

type Mode = 'dial' | 'keyboard';
type View = 'hours' | 'minutes';

/**
 * A clock-face hour label → the 24h hour it means.
 *
 * The one piece of arithmetic in here that can silently be wrong: 12 AM is hour 0 and
 * 12 PM is hour 12, so the naive `label + 12` is off by twelve hours twice a day. Both
 * the dial and the keyboard box route through this, and `TimePickerField.test.ts` pins it.
 */
export const to24 = (label: number, hour12: boolean, meridiem: 'AM' | 'PM'): number =>
    hour12 ? (label % 12) + (meridiem === 'PM' ? 12 : 0) : label;

/** "HH:MM" → a dayjs on today. Anything unparseable falls back to 12:00, as the wheels did. */
export const parse = (v: string): Dayjs => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
    const base = dayjs().second(0).millisecond(0);
    if (!m) return base.hour(12).minute(0);
    return base.hour(Math.min(23, Number(m[1]))).minute(Math.min(59, Number(m[2])));
};

export interface TimePickerFieldProps {
    /** 24h "HH:MM" (empty falls back to a 12:00 display until picked). */
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    /** Accent tone (kit `Trio`). Default blue. */
    tone?: Trio;
    /** Red error ring/border. */
    invalid?: boolean;
    /** Stretch to the container width (default) or size to content (compact rows). */
    fullWidth?: boolean;
    /**
     * Shown in the closed field while `value` is empty, instead of a time nobody picked.
     * Without it an untouched field reads "12:00 AM", which is indistinguishable from a
     * deliberate midnight — the old wheels had exactly that bug.
     */
    placeholder?: string;
    /**
     * Minutes to offer, as a step. Default 1 — every minute, which is what every existing
     * caller gets. Pass 15 where the value feeds something that only acts on the quarter
     * hour, so the control cannot promise a precision the consumer will round away.
     */
    minuteStep?: number;
}

export function TimePickerField({
    value,
    onChange,
    disabled,
    tone = TRIO.blue,
    invalid = false,
    fullWidth = true,
    placeholder,
    minuteStep = 1,
}: TimePickerFieldProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const hour12 = useTimeFormat() === '12h';

    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('dial');
    const [view, setView] = useState<View>('hours');
    /** The dialog edits a DRAFT. Cancel throws it away; only OK writes back to the form. */
    const [draft, setDraft] = useState<Dayjs>(() => parse(value));
    /** Keyboard mode holds its own text, so a half-typed "1" is not read as one o'clock. */
    const [text, setText] = useState({ h: '', m: '' });

    // Reopening starts from whatever the field holds now, on the dial, at the hours view.
    useEffect(() => {
        if (!open) return;
        setDraft(parse(value));
        setMode('dial');
        setView('hours');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const h24 = draft.hour();
    const mm = String(draft.minute()).padStart(2, '0');
    const meridiem: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    const hh = hour12 ? String(h24 % 12 || 12).padStart(2, '0') : String(h24).padStart(2, '0');

    // ── closed-field display ────────────────────────────────────────────────
    // Reads exactly like the same value in a table, which renders through
    // formatTimeString's `h:mm A` — no leading zero on the hour.
    const isEmpty = !/^\d{1,2}:\d{2}$/.test(value || '');
    const shown = parse(value);
    const shownH24 = shown.hour();
    const shownMeridiem = shownH24 >= 12 ? 'PM' : 'AM';
    const displayHour = hour12 ? String(shownH24 % 12 || 12) : String(shownH24).padStart(2, '0');
    const displayMin = String(shown.minute()).padStart(2, '0');

    const accent = tone.c;
    const borderColor = invalid ? '#e11d48' : open ? accent : theme.palette.divider;
    /** M3 surface-variant stand-in: a wash of the text colour, so it tracks the theme. */
    const neutralFill = alpha(theme.palette.text.primary, isDark ? 0.11 : 0.06);
    const accentFill = alpha(accent, isDark ? 0.3 : 0.13);

    const commitDraft = (next: Dayjs) => setDraft(next);

    const setMeridiem = (ap: 'AM' | 'PM') => {
        if (ap === meridiem) return;
        commitDraft(draft.hour(to24(h24 % 12 || 12, true, ap)));
    };

    /** Switching to keyboard mode seeds the inputs from the draft. */
    const toggleMode = () => {
        if (mode === 'dial') {
            setText({ h: hh, m: mm });
            setView('hours');
            setMode('keyboard');
        } else {
            setMode('dial');
            setView('hours');
        }
    };

    const typeHour = (raw: string) => {
        const d = raw.replace(/\D/g, '').slice(0, 2);
        setText((t) => ({ ...t, h: d }));
        if (d === '') return;
        const n = Number(d);
        const max = hour12 ? 12 : 23;
        const min = hour12 ? 1 : 0;
        if (n < min || n > max) return;
        commitDraft(draft.hour(to24(n, hour12, meridiem)));
    };

    const typeMinute = (raw: string) => {
        const d = raw.replace(/\D/g, '').slice(0, 2);
        setText((t) => ({ ...t, m: d }));
        if (d === '') return;
        const n = Number(d);
        if (n > 59) return;
        commitDraft(draft.minute(n));
    };

    /** A blur with junk in the box snaps back to the draft rather than leaving "7" showing. */
    const normalise = () => setText({ h: hh, m: mm });

    const accept = () => {
        onChange(draft.format('HH:mm'));
        setOpen(false);
    };

    // ── the big hour / minute boxes ─────────────────────────────────────────
    const boxSx = (active: boolean) => ({
        width: 96,
        flexShrink: 0,
        height: 80,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: active ? accentFill : neutralFill,
        color: active ? (isDark ? theme.palette.common.white : accent) : theme.palette.text.primary,
        border: `1px solid ${active ? alpha(accent, 0.55) : 'transparent'}`,
        boxSizing: 'border-box',
        fontSize: 40,
        fontWeight: 500,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}, border-color .2s ${EASE_IN}`,
    });

    const inputSx = {
        width: '100%',
        height: '100%',
        border: 0,
        outline: 0,
        background: 'transparent',
        textAlign: 'center' as const,
        font: 'inherit',
        color: 'inherit',
        padding: 0,
    };

    return (
        <>
            <ButtonBase
                disabled={disabled}
                onClick={() => setOpen(true)}
                sx={{
                    // 40px, pinned: this sits in a row beside MUI `size="small"` fields, and a
                    // control that is two pixels taller than its neighbours reads as misaligned
                    // even when nobody can say why. `boxSizing` so the border is inside the 40.
                    width: fullWidth ? '100%' : 132,
                    height: 40, minHeight: 40, maxHeight: 40, boxSizing: 'border-box',
                    px: 1.5, borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: `1px solid ${borderColor}`,
                    bgcolor: disabled ? theme.palette.action.disabledBackground : theme.palette.background.paper,
                    boxShadow: open ? `0 0 0 3px ${accent}26` : invalid ? '0 0 0 3px rgba(225,29,72,0.12)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                    '&:hover': { borderColor: disabled ? theme.palette.divider : accent },
                }}
            >
                {isEmpty && placeholder ? (
                    <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary' }}>
                        {placeholder}
                    </Typography>
                ) : (
                    <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                        {displayHour}<Box component="span" sx={{ color: accent, mx: 0.5 }}>:</Box>{displayMin}
                        {hour12 && <Box component="span" sx={{ ml: 0.75, fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>{shownMeridiem}</Box>}
                    </Typography>
                )}
                {/* Tinted to the field's own accent rather than left at body grey: it is the one
                    mark that says "this opens a clock", and it should read as part of the control. */}
                <Box component="span" sx={{ display: 'flex', color: disabled ? 'text.disabled' : accent }}>
                    <KTIcon iconName="time" className="fs-5" />
                </Box>
            </ButtonBase>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                TransitionComponent={Grow}
                transitionDuration={{ enter: DUR_IN, exit: DUR_OUT }}
                TransitionProps={{ easing: { enter: EASE_IN, exit: EASE_OUT } }}
                slotProps={{
                    backdrop: {
                        sx: {
                            bgcolor: alpha('#000', isDark ? 0.6 : 0.32),
                            transition: `opacity ${DUR_IN}ms ${EASE_IN} !important`,
                        },
                    },
                }}
                PaperProps={{
                    sx: {
                        // M3 time-picker container: 28px radius, tonal surface, 24px padding.
                        borderRadius: '28px',
                        backgroundImage: 'none',
                        bgcolor: isDark
                            ? alpha(theme.palette.common.white, 0.06)
                            : theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: '0 24px 64px -12px rgba(0,0,0,0.38)',
                        p: 3,
                        m: 2,
                        width: 'auto',
                        maxWidth: 'none',
                        overflow: 'hidden',
                    },
                }}
            >
                <Box sx={{ width: 280 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
                        <Typography sx={{ fontSize: 12, letterSpacing: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                            {mode === 'dial' ? 'Select time' : 'Enter time'}
                        </Typography>
                        {/* A LABEL, not a switch.
                            It was two pills that wrote the app-wide preference. That is a global
                            write from a control that reads as local to this one field, and it was
                            unsafe for a concrete reason: App.tsx keys the routed tree on the
                            resolved format, so flipping it remounted the tree and discarded
                            whatever the user had typed — and this picker opens inside the
                            attendance correction form, the leave policy modal, the meeting form
                            and the task dialog, every one of them a half-filled form. */}
                        <Tooltip title="Your time format is an app-wide setting. Change it in Settings > Date & Time.">
                            <Typography
                                component="span"
                                sx={{
                                    px: 0.75, height: 20, display: 'inline-flex', alignItems: 'center',
                                    borderRadius: '4px', fontSize: 10.5, fontWeight: 700, cursor: 'help',
                                    color: 'text.secondary', bgcolor: alpha(theme.palette.text.primary, 0.07),
                                }}
                            >
                                {hour12 ? '12h' : '24h'}
                            </Typography>
                        </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Box>
                            <Box
                                component={mode === 'dial' ? ButtonBase : 'div'}
                                {...(mode === 'dial' ? { onClick: () => setView('hours') } : {})}
                                sx={boxSx(view === 'hours')}
                            >
                                {mode === 'dial' ? hh : (
                                    <Box
                                        component="input"
                                        inputMode="numeric"
                                        aria-label="Hour"
                                        value={text.h}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => typeHour(e.target.value)}
                                        onBlur={normalise}
                                        onFocus={(e: React.FocusEvent<HTMLInputElement>) => { setView('hours'); e.target.select(); }}
                                        sx={inputSx}
                                    />
                                )}
                            </Box>
                            {mode === 'keyboard' && (
                                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, textAlign: 'left' }}>Hour</Typography>
                            )}
                        </Box>

                        <Box sx={{ height: 80, flexShrink: 0, display: 'grid', placeItems: 'center', width: 24, fontSize: 40, fontWeight: 500, color: 'text.primary' }}>:</Box>

                        <Box>
                            <Box
                                component={mode === 'dial' ? ButtonBase : 'div'}
                                {...(mode === 'dial' ? { onClick: () => setView('minutes') } : {})}
                                sx={boxSx(view === 'minutes')}
                            >
                                {mode === 'dial' ? mm : (
                                    <Box
                                        component="input"
                                        inputMode="numeric"
                                        aria-label="Minute"
                                        value={text.m}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => typeMinute(e.target.value)}
                                        onBlur={normalise}
                                        onFocus={(e: React.FocusEvent<HTMLInputElement>) => { setView('minutes'); e.target.select(); }}
                                        sx={inputSx}
                                    />
                                )}
                            </Box>
                            {mode === 'keyboard' && (
                                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5, textAlign: 'left' }}>Minute</Typography>
                            )}
                        </Box>

                        {/* Two choices, so a segmented pair — a dial of two options is a dial that
                            cannot be read without being dragged. */}
                        {hour12 && (
                            <Box
                                sx={{
                                    ml: '12px', width: 52, minWidth: 52, flexShrink: 0, height: 80, borderRadius: '8px',
                                    border: `1px solid ${theme.palette.divider}`,
                                    display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box',
                                }}
                            >
                                {(['AM', 'PM'] as const).map((ap, i) => {
                                    const on = meridiem === ap;
                                    return (
                                        <ButtonBase
                                            key={ap}
                                            onClick={() => setMeridiem(ap)}
                                            sx={{
                                                flex: 1, fontSize: 14, fontWeight: on ? 700 : 500,
                                                color: on ? (isDark ? theme.palette.common.white : accent) : 'text.secondary',
                                                bgcolor: on ? accentFill : 'transparent',
                                                borderTop: i === 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                                transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}`,
                                                '&:hover': { bgcolor: on ? accentFill : alpha(accent, 0.08) },
                                            }}
                                        >
                                            {ap}
                                        </ButtonBase>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>

                    {/* The dial's own entrance. `Collapse` morphs the dialog height with the M3
                        easing so the box does not jump between the two modes; the inner keyframe
                        fades and scales the clock face up behind it. */}
                    <Collapse
                        in={mode === 'dial'}
                        timeout={{ enter: DUR_IN, exit: DUR_OUT }}
                        easing={{ enter: EASE_IN, exit: EASE_OUT }}
                        unmountOnExit
                    >
                        <Box
                            sx={{
                                pt: 2,
                                display: 'grid',
                                placeItems: 'center',
                                '@keyframes wtClockIn': {
                                    from: { opacity: 0, transform: 'scale(0.86)' },
                                    to: { opacity: 1, transform: 'scale(1)' },
                                },
                                animation: `wtClockIn ${DUR_IN + 60}ms ${EASE_IN} both`,
                            }}
                        >
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <TimeClock
                                    value={draft}
                                    onChange={(v) => v && commitDraft(v)}
                                    view={view}
                                    onViewChange={(v) => setView(v as View)}
                                    views={['hours', 'minutes']}
                                    ampm={hour12}
                                    minutesStep={minuteStep}
                                    sx={{
                                        width: 256,
                                        [`& .${clockClasses.clock}`]: { bgcolor: neutralFill },
                                        [`& .${clockNumberClasses.root}`]: { color: 'text.primary', fontWeight: 500 },
                                        [`& .${clockNumberClasses.selected}`]: {
                                            bgcolor: accent,
                                            color: theme.palette.getContrastText(accent),
                                        },
                                        [`& .${clockPointerClasses.root}`]: { bgcolor: accent },
                                        [`& .${clockPointerClasses.thumb}`]: {
                                            bgcolor: accent,
                                            borderColor: accent,
                                        },
                                    }}
                                />
                            </LocalizationProvider>
                        </Box>
                    </Collapse>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                        <Tooltip title={mode === 'dial' ? 'Switch to text input' : 'Switch to dial'}>
                            <ButtonBase
                                onClick={toggleMode}
                                aria-label={mode === 'dial' ? 'Switch to text input' : 'Switch to dial'}
                                sx={{
                                    width: 40, height: 40, borderRadius: '50%', color: 'text.secondary',
                                    transition: `background-color .2s ${EASE_IN}, color .2s ${EASE_IN}`,
                                    '&:hover': { bgcolor: alpha(accent, 0.1), color: accent },
                                }}
                            >
                                <KTIcon iconName={mode === 'dial' ? 'keyboard' : 'time'} className="fs-4" />
                            </ButtonBase>
                        </Tooltip>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {[
                                { label: 'Cancel', onClick: () => setOpen(false) },
                                { label: 'OK', onClick: accept },
                            ].map((a) => (
                                <ButtonBase
                                    key={a.label}
                                    onClick={a.onClick}
                                    sx={{
                                        px: 1.5, height: 40, borderRadius: '20px',
                                        fontSize: 14, fontWeight: 600, color: accent,
                                        transition: `background-color .2s ${EASE_IN}`,
                                        '&:hover': { bgcolor: alpha(accent, 0.1) },
                                    }}
                                >
                                    {a.label}
                                </ButtonBase>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Dialog>
        </>
    );
}

export default TimePickerField;
