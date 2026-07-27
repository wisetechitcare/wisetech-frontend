import { useEffect, useRef, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, ButtonBase, Popover, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { TRIO, type Trio } from '@app/modules/common/components/ui/tw';

/**
 * TimeWheelField — the app's canonical 24-hour time picker.
 *
 * Two snap-scrolling columns (hours / minutes) in a popover: big touch targets, no
 * clock-face fiddling, identical on phone and desktop. Controlled — `value` is a 24h
 * "HH:MM" string. Reuse this everywhere a time is picked instead of a native
 * `<input type="time">` or a bespoke picker. (Originally lived inside LeavePolicyModal.)
 */

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_H = 40;

function WheelColumn({ items, selected, onSelect, tone }: {
    items: string[]; selected: string; onSelect: (v: string) => void; tone: Trio;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    // Center the selected value once, when the popover mounts.
    useEffect(() => {
        const idx = items.indexOf(selected);
        const el = boxRef.current;
        if (el && idx >= 0) el.scrollTop = idx * ITEM_H - (el.clientHeight / 2 - ITEM_H / 2);
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
                        onClick={() => onSelect(it)}
                        sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '100%', height: ITEM_H, my: 0.25, borderRadius: 2,
                            scrollSnapAlign: 'center',
                            fontWeight: on ? 800 : 600,
                            fontSize: on ? 21 : 16.5,
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
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    const hh = m ? m[1] : '12';
    const mm = m ? m[2] : '00';
    const borderColor = invalid ? '#e11d48' : open ? tone.c : theme.palette.divider;

    return (
        <>
            <ButtonBase
                disabled={disabled}
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                    width: fullWidth ? '100%' : 132, height: 40, px: 1.5, borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: `1px solid ${borderColor}`,
                    bgcolor: disabled ? theme.palette.action.disabledBackground : theme.palette.background.paper,
                    boxShadow: open ? `0 0 0 3px ${tone.c}26` : invalid ? '0 0 0 3px rgba(225,29,72,0.12)' : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                    '&:hover': { borderColor: disabled ? theme.palette.divider : tone.c },
                }}
            >
                <Typography component="span" sx={{ fontSize: 16.5, fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                    {hh}<Box component="span" sx={{ color: tone.c, mx: 0.5 }}>:</Box>{mm}
                </Typography>
                <KTIcon iconName="time" className="fs-3" />
            </ButtonBase>

            <Popover
                open={open}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, overflow: 'hidden', boxShadow: '0 24px 64px -12px rgba(0,0,0,0.35)', border: `1px solid ${theme.palette.divider}`, zIndex: 1500 } } }}
            >
                <Box sx={{ width: 220 }}>
                    <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary' }}>
                            Cutoff Time
                        </Typography>
                        <Typography sx={{ fontSize: 17, fontWeight: 800, color: tone.c, fontVariantNumeric: 'tabular-nums' }}>{hh}:{mm}</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'stretch' }}>
                        <WheelColumn items={HOURS} selected={hh} tone={tone} onSelect={(h) => onChange(`${h}:${mm}`)} />
                        <Box sx={{ display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800, color: 'text.disabled' }}>:</Box>
                        <WheelColumn items={MINUTES} selected={mm} tone={tone} onSelect={(mi) => onChange(`${hh}:${mi}`)} />
                    </Box>
                    <Box sx={{ px: 1.25, pb: 1.25, pt: 0.5 }}>
                        <ButtonBase
                            onClick={() => setAnchor(null)}
                            sx={{ width: '100%', height: 38, borderRadius: 2, fontSize: 14.5, fontWeight: 700, color: '#fff', bgcolor: tone.c,
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
