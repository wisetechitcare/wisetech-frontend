import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, ButtonBase, Popover, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { TRIO, type Trio } from '@app/modules/common/components/ui/tw';

/**
 * TimeWheelField — the app's canonical time picker.
 *
 * Two snap-scrolling columns (hours / minutes) in a popover: big touch targets, no
 * clock-face fiddling, identical on phone and desktop. Controlled — `value` is always a
 * 24h "HH:MM" string on the wire, whichever way it is displayed. Reuse this everywhere a
 * time is picked instead of a native `<input type="time">` or a bespoke picker.
 * (Originally lived inside LeavePolicyModal.)
 */

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const to12 = (h: number) => String(h % 12 || 12).padStart(2, '0');

/**
 * 12h/24h is a reader's preference, not a property of any one field: somebody who thinks in
 * "5:30 PM" thinks that way in every form. So the choice is stored once and shared by every
 * mounted picker — a form with a start and a due time must not end up showing one of each —
 * and it survives a reload. localStorage is wrapped: it throws outright in some privacy modes.
 */
const FMT_KEY = 'wt.timeWheel.hour12';
const FMT_EVENT = 'wt-timewheel-format';
const readFmt = () => { try { return localStorage.getItem(FMT_KEY) === '1'; } catch { return false; } };
let fmtValue = readFmt();
const getFmt = () => fmtValue;
const subscribeFmt = (cb: () => void) => {
    window.addEventListener(FMT_EVENT, cb);
    return () => window.removeEventListener(FMT_EVENT, cb);
};
const setFmt = (v: boolean) => {
    fmtValue = v;
    try { localStorage.setItem(FMT_KEY, v ? '1' : '0'); } catch { /* storage unavailable — session-only */ }
    window.dispatchEvent(new Event(FMT_EVENT));
};
// 32, not 40. Five rows plus two rows of padding meant the popover stood 360px tall before
// its header and button — taller than most of the dialogs it opens inside. The touch target is
// still 32px high and full column width, which clears the 24px minimum comfortably.
const ITEM_H = 32;

function WheelColumn({ items, selected, onSelect, tone }: {
    items: string[]; selected: string; onSelect: (v: string) => void; tone: Trio;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    /**
     * Centre the selected value, once, when the popover mounts.
     *
     * MEASURED, not computed. It used to be `idx * ITEM_H - (clientHeight/2 - ITEM_H/2)`, which
     * is wrong twice: rows are not `ITEM_H` apart (each carries a 1px margin top and bottom, so
     * the pitch is ITEM_H + 2), and the column's own `ITEM_H * 2` top padding was never added.
     * The two errors compound down the list — by 12:00 the selected row sat most of a row below
     * the centre line, which is exactly where a wheel must not put it.
     *
     * Reading the row's real `offsetTop` cannot drift, and it keeps working if the padding, the
     * margin or the row height is ever tuned again.
     *
     * `useLayoutEffect`, so the scroll is set before the browser paints — computing it after
     * paint shows one frame scrolled to the top and then jumps.
     */
    useLayoutEffect(() => {
        const el = boxRef.current;
        const row = el?.querySelector<HTMLElement>(`[data-wheel-value="${selected}"]`);
        if (!el || !row) return;
        el.scrollTop = row.offsetTop - (el.clientHeight - row.offsetHeight) / 2;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <Box
            ref={boxRef}
            sx={{
                height: ITEM_H * 5,
                overflowY: 'auto',
                scrollSnapType: 'y proximity',
                px: 0.75,
                py: `${ITEM_H * 2}px`,
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(128,128,128,0.4)', borderRadius: 3 },
                maskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
            }}
        >
            {items.map((it) => {
                const on = it === selected;
                return (
                    <ButtonBase
                        key={it}
                        data-wheel-value={it}
                        onClick={() => onSelect(it)}
                        sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '100%', height: ITEM_H, my: 0.125, borderRadius: 1.5,
                            scrollSnapAlign: 'center',
                            fontWeight: on ? 800 : 600,
                            fontSize: on ? 16 : 14,
                            letterSpacing: 0.5,
                            color: on ? '#fff' : 'text.secondary',
                            bgcolor: on ? tone.c : 'transparent',
                            boxShadow: on ? `0 6px 14px -4px ${tone.c}66` : 'none',
                            transition: 'background-color .14s, color .14s, font-size .14s',
                            '&:hover': { bgcolor: on ? tone.c : alpha(tone.c, 0.15) },
                        }}
                    >
                        {it}
                    </ButtonBase>
                );
            })}
        </Box>
    );
}

export interface TimeWheelFieldProps {
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
}

export function TimeWheelField({ value, onChange, disabled, tone = TRIO.blue, invalid = false, fullWidth = true }: TimeWheelFieldProps) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const open = Boolean(anchor);
    const theme = useTheme();
    const hour12 = useSyncExternalStore(subscribeFmt, getFmt, getFmt);
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    const h24 = m ? Number(m[1]) : 12;
    const mm = m ? m[2] : '00';
    const meridiem = h24 >= 12 ? 'PM' : 'AM';
    const hh = hour12 ? to12(h24) : String(h24).padStart(2, '0');
    // Every write goes back out as 24h "HH:MM" — the display format is a view over the value,
    // never part of it, so no caller has to know which way the picker happens to be showing.
    const emit = (h: number) => onChange(`${String(h).padStart(2, '0')}:${mm}`);
    const pickHour = (label: string) =>
        emit(hour12 ? (Number(label) % 12) + (meridiem === 'PM' ? 12 : 0) : Number(label));
    const borderColor = invalid ? '#e11d48' : open ? tone.c : theme.palette.divider;

    return (
        <>
            <ButtonBase
                disabled={disabled}
                onClick={(e) => setAnchor(e.currentTarget)}
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
                    boxShadow: open ? `0 0 0 3px ${tone.c}26` : invalid ? '0 0 0 3px rgba(225,29,72,0.12)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                    '&:hover': { borderColor: disabled ? theme.palette.divider : tone.c },
                }}
            >
                <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                    {hh}<Box component="span" sx={{ color: tone.c, mx: 0.5 }}>:</Box>{mm}
                    {hour12 && <Box component="span" sx={{ ml: 0.75, fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>{meridiem}</Box>}
                </Typography>
                {/* Tinted to the field's own accent rather than left at body grey: it is the one
                    mark that says "this opens a clock", and it should read as part of the control,
                    matching the colon and the wheel's selected row. */}
                <Box component="span" sx={{ display: 'flex', color: disabled ? 'text.disabled' : tone.c }}>
                    <KTIcon iconName="time" className="fs-5" />
                </Box>
            </ButtonBase>

            <Popover
                open={open}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.35)', border: `1px solid ${theme.palette.divider}`, zIndex: 1500 } } }}
            >
                <Box sx={{ width: hour12 ? 236 : 184 }}>
                    {/* The header said "Cutoff Time" — the label of the ONE leave-policy field
                        this picker was lifted out of. It is the app's time picker now, so it
                        states the value it is editing and nothing about who is editing it. */}
                    <Box sx={{ px: 1.25, py: 0.75, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: tone.c, fontVariantNumeric: 'tabular-nums' }}>
                            {hh}:{mm}{hour12 ? ` ${meridiem}` : ''}
                        </Typography>
                        {/* Not the shared SegmentedControl: that one is hardwired to a light track
                            and a navy label, which is a pale blob on this popover in dark mode and
                            ignores the field's tone. Two pills, themed like the wheel itself. */}
                        <Box sx={{ display: 'flex', gap: '2px', p: '2px', borderRadius: '6px', bgcolor: alpha(theme.palette.text.primary, 0.07) }}>
                            {([['12h', true], ['24h', false]] as const).map(([label, is12]) => (
                                <ButtonBase
                                    key={label}
                                    onClick={() => setFmt(is12)}
                                    aria-pressed={hour12 === is12}
                                    sx={{
                                        px: 0.75, height: 20, borderRadius: '4px', fontSize: 10.5, fontWeight: 700,
                                        color: hour12 === is12 ? '#fff' : 'text.secondary',
                                        bgcolor: hour12 === is12 ? tone.c : 'transparent',
                                        transition: 'background-color .14s, color .14s',
                                        '&:hover': { bgcolor: hour12 === is12 ? tone.c : alpha(tone.c, 0.15) },
                                    }}
                                >
                                    {label}
                                </ButtonBase>
                            ))}
                        </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: hour12 ? '1fr auto 1fr auto' : '1fr auto 1fr', alignItems: 'stretch' }}>
                        {/* Keyed on the format: a column centres its selection on mount only, so
                            flipping 24h→12h under it would leave 17 scrolled to where 05 now is. */}
                        <WheelColumn
                            key={hour12 ? 'h12' : 'h24'}
                            items={hour12 ? HOURS_12 : HOURS_24}
                            selected={hh} tone={tone} onSelect={pickHour}
                        />
                        <Box sx={{ display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, color: 'text.disabled' }}>:</Box>
                        <WheelColumn items={MINUTES} selected={mm} tone={tone} onSelect={(mi) => onChange(`${String(h24).padStart(2, '0')}:${mi}`)} />
                        {/* Two choices, so buttons — a scroll wheel of two rows is a wheel that
                            cannot centre and has to be dragged before it can be read. */}
                        {hour12 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5, pl: 0.5, pr: 1 }}>
                                {(['AM', 'PM'] as const).map((ap) => {
                                    const on = meridiem === ap;
                                    return (
                                        <ButtonBase
                                            key={ap}
                                            onClick={() => emit((h24 % 12) + (ap === 'PM' ? 12 : 0))}
                                            sx={{
                                                width: 42, height: ITEM_H, borderRadius: 1.5,
                                                fontSize: 13, fontWeight: on ? 800 : 600, letterSpacing: 0.5,
                                                color: on ? '#fff' : 'text.secondary',
                                                bgcolor: on ? tone.c : 'transparent',
                                                boxShadow: on ? `0 6px 14px -4px ${tone.c}66` : 'none',
                                                transition: 'background-color .14s, color .14s',
                                                '&:hover': { bgcolor: on ? tone.c : alpha(tone.c, 0.15) },
                                            }}
                                        >
                                            {ap}
                                        </ButtonBase>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ px: 1, pb: 1, pt: 0.25 }}>
                        <ButtonBase
                            onClick={() => setAnchor(null)}
                            sx={{ width: '100%', height: 30, borderRadius: 1.5, fontSize: 13, fontWeight: 700, color: '#fff', bgcolor: tone.c,
                                boxShadow: `0 8px 18px -6px ${tone.c}80`, transition: 'filter .15s', '&:hover': { filter: 'brightness(1.06)' } }}
                        >
                            Done
                        </ButtonBase>
                    </Box>
                </Box>
            </Popover>
        </>
    );
}

export default TimeWheelField;
