import KeyboardArrowLeftRoundedIconModule from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIconModule from '@mui/icons-material/KeyboardArrowRightRounded';
import { useState } from 'react';
import { resolveReactComponent } from '@utils/resolveReactComponent';
import {
    Box, IconButton, SxProps, Theme, Typography, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import { DatePicker, MobileDatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { WtDateField } from '@app/modules/common/components/ui';
import { pressableProps } from '@app/modules/common/components/ui/a11y';

const KeyboardArrowLeftRoundedIcon = resolveReactComponent<typeof KeyboardArrowLeftRoundedIconModule>(KeyboardArrowLeftRoundedIconModule);
const KeyboardArrowRightRoundedIcon = resolveReactComponent<typeof KeyboardArrowRightRoundedIconModule>(KeyboardArrowRightRoundedIconModule);

/**
 * How the click-to-jump picker behaves. Day = full calendar; month = year+month
 * grid (skip day); year = year list only. Week uses day — picking any day jumps
 * to that week at the call site.
 */
export type PeriodPickGranularity = 'day' | 'month' | 'year';

interface PeriodNavigatorProps {
    label: string;
    onPrevious: () => void;
    onNext: () => void;
    disablePrevious?: boolean;
    disableNext?: boolean;
    previousTitle?: string;
    nextTitle?: string;
    minWidth?: number | string;
    sx?: SxProps<Theme>;
    labelColor?: string;
    secondaryLabel?: string;
    /**
     * When set, clicking the label opens a picker so the user can jump (e.g. Oct → Jan)
     * without hammering the arrows. `pickValue` is YYYY-MM-DD.
     */
    onPickDate?: (value: string) => void;
    pickValue?: string;
    /** Default `day`. Use `month` / `year` for Monthly / Yearly tabs. */
    pickGranularity?: PeriodPickGranularity;
    pickMinDate?: string;
    pickMaxDate?: string;
}

const parseWire = (value?: string): Dayjs | null => {
    if (!value) return null;
    const d = dayjs(value);
    return d.isValid() ? d : null;
};

const PeriodNavigator = ({
    label,
    onPrevious,
    onNext,
    disablePrevious = false,
    disableNext = false,
    previousTitle,
    nextTitle,
    minWidth = 'fit-content',
    sx,
    labelColor,
    secondaryLabel,
    onPickDate,
    pickValue,
    pickGranularity = 'day',
    pickMinDate,
    pickMaxDate,
}: PeriodNavigatorProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
    const isDark = theme.palette.mode === 'dark';
    const [pickerOpen, setPickerOpen] = useState(false);

    const accent = labelColor ?? (isDark ? theme.palette.primary.main : '#1E3A8A');
    const surface = isDark ? theme.palette.background.paper : '#ffffff';
    const arrowColor = isDark ? theme.palette.text.secondary : '#64748b';
    const arrowDisabledColor = isDark ? theme.palette.text.disabled : '#cbd5e1';
    const canPick = !!onPickDate;

    const emitPick = (next: Dayjs | null) => {
        if (!onPickDate || !next || !next.isValid()) return;
        // Normalise to the start of the period so callers can treat the value as an anchor.
        const normalised =
            pickGranularity === 'year' ? next.startOf('year')
                : pickGranularity === 'month' ? next.startOf('month')
                    : next.startOf('day');
        onPickDate(normalised.format('YYYY-MM-DD'));
        setPickerOpen(false);
    };

    const jumpTitle =
        pickGranularity === 'year' ? 'Click to jump to a year'
            : pickGranularity === 'month' ? 'Click to jump to a month'
                : 'Click to jump to a date';

    const Picker = isPhone ? MobileDatePicker : DatePicker;
    // Month-only view: header shows the year; arrows change year — no year→month hop.
    const periodViews =
        pickGranularity === 'year' ? (['year'] as const)
            : pickGranularity === 'month' ? (['month'] as const)
                : null;

    const edgeBtnSx = {
        width: 36,
        height: 36,
        borderRadius: 0,
        color: arrowColor,
        p: 0,
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        '&:hover:not(.Mui-disabled)': {
            backgroundColor: `${accent}14`,
            color: accent,
        },
        '&:active:not(.Mui-disabled)': {
            backgroundColor: `${accent}24`,
        },
        '&.Mui-disabled': {
            color: arrowDisabledColor,
            cursor: 'not-allowed',
        },
    } as const;

    return (
        <Box
            sx={{
                display: isMobile ? 'flex' : 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 36,
                width: isMobile ? '100%' : minWidth,
                minWidth: isMobile ? undefined : minWidth,
                maxWidth: '100%',
                backgroundColor: surface,
                border: `1.5px solid ${isDark ? theme.palette.divider : `${accent}12`}`,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    boxShadow: isDark ? 'none' : `0 2px 8px ${accent}10`,
                    borderColor: isDark ? theme.palette.text.disabled : `${accent}20`,
                },
                ...sx,
            }}
        >
            <Tooltip title={previousTitle || 'Previous period'} placement="top" arrow>
                <IconButton
                    aria-label="Previous period"
                    onClick={onPrevious}
                    disabled={disablePrevious}
                    sx={edgeBtnSx}
                >
                    <KeyboardArrowLeftRoundedIcon sx={{ fontSize: isMobile ? 18 : 20 }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={canPick ? jumpTitle : ''} placement="top" arrow disableHoverListener={!canPick}>
                <Box
                    sx={{
                        position: 'relative',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 0,
                        px: isMobile ? 0.75 : 1,
                        py: 0,
                        cursor: canPick ? 'pointer' : 'default',
                    }}
                    {...(canPick ? pressableProps(() => setPickerOpen(true)) : {})}
                    onClick={canPick ? () => setPickerOpen(true) : undefined}
                    aria-label={canPick ? jumpTitle : undefined}
                    aria-expanded={canPick ? pickerOpen : undefined}
                    aria-haspopup={canPick ? 'dialog' : undefined}
                >
                    {canPick && (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                opacity: 0,
                                pointerEvents: 'none',
                                overflow: 'hidden',
                            }}
                            aria-hidden
                        >
                            {periodViews ? (
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <Picker
                                        value={parseWire(pickValue)}
                                        onChange={(next) => emitPick(next)}
                                        open={pickerOpen}
                                        onClose={() => setPickerOpen(false)}
                                        views={[...periodViews]}
                                        openTo={pickGranularity === 'year' ? 'year' : 'month'}
                                        minDate={parseWire(pickMinDate) ?? undefined}
                                        maxDate={parseWire(pickMaxDate) ?? undefined}
                                        closeOnSelect
                                        reduceAnimations
                                        yearsPerRow={4}
                                        monthsPerRow={4}
                                        slotProps={{
                                            textField: { size: 'small', fullWidth: true },
                                            actionBar: { actions: [] },
                                            toolbar: { hidden: true },
                                            popper: {
                                                placement: 'bottom',
                                                sx: { zIndex: 1350 },
                                            },
                                            desktopPaper: {
                                                sx: {
                                                    mt: 0.5,
                                                    borderRadius: '10px',
                                                    border: `1px solid ${isDark ? theme.palette.divider : '#E2E8F0'}`,
                                                    boxShadow: isDark
                                                        ? '0 6px 18px rgba(0,0,0,0.4)'
                                                        : '0 6px 18px rgba(15, 23, 42, 0.1)',
                                                    overflow: 'hidden',
                                                },
                                            },
                                            dialog: {
                                                sx: {
                                                    zIndex: 1350,
                                                    '& .MuiDialog-paper': {
                                                        borderRadius: '12px',
                                                        m: 2,
                                                        width: 'min(100%, 232px)',
                                                    },
                                                },
                                            },
                                            mobilePaper: {
                                                sx: {
                                                    borderRadius: '12px',
                                                    width: 'min(100%, 232px)',
                                                },
                                            },
                                            calendarHeader: {
                                                sx: {
                                                    pl: 1,
                                                    pr: 0.5,
                                                    mt: 0.25,
                                                    mb: 0,
                                                    minHeight: 32,
                                                    maxHeight: 32,
                                                    '& .MuiPickersCalendarHeader-label': {
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        color: accent,
                                                        marginRight: 0,
                                                    },
                                                    // Year changes via header arrows — hide the switch chevron.
                                                    '& .MuiPickersCalendarHeader-switchViewButton': {
                                                        p: 0,
                                                        ml: 0,
                                                        pointerEvents: 'none',
                                                    },
                                                    '& .MuiPickersCalendarHeader-switchViewIcon': {
                                                        display: 'none',
                                                    },
                                                    '& .MuiPickersArrowSwitcher-button': {
                                                        width: 28,
                                                        height: 28,
                                                        p: 0,
                                                    },
                                                },
                                            },
                                            layout: {
                                                sx: {
                                                    minWidth: 0,
                                                    width: 232,
                                                    '& .MuiDateCalendar-root': {
                                                        width: 232,
                                                        maxHeight: 'none',
                                                        height: 'auto',
                                                    },
                                                    '& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton': {
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        height: 28,
                                                        width: 48,
                                                        margin: '2px 0',
                                                        '&.Mui-selected': {
                                                            bgcolor: `${accent} !important`,
                                                            color: '#fff !important',
                                                            fontWeight: 700,
                                                        },
                                                        '&.Mui-selected:hover, &.Mui-selected:focus': {
                                                            bgcolor: `${accent} !important`,
                                                        },
                                                        '&:hover': {
                                                            bgcolor: `${accent}14`,
                                                        },
                                                    },
                                                    '& .MuiMonthCalendar-root, & .MuiYearCalendar-root': {
                                                        width: '100%',
                                                        maxHeight: 'none',
                                                        padding: '2px 6px 8px',
                                                    },
                                                    '& .MuiYearCalendar-root': {
                                                        maxHeight: 168,
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </LocalizationProvider>
                            ) : (
                                <WtDateField
                                    value={pickValue || ''}
                                    onChange={(v) => { if (v) onPickDate?.(v); setPickerOpen(false); }}
                                    open={pickerOpen}
                                    onClose={() => setPickerOpen(false)}
                                    minDate={pickMinDate}
                                    maxDate={pickMaxDate}
                                />
                            )}
                        </Box>
                    )}
                    <Typography
                        component="span"
                        sx={{
                            color: accent,
                            fontSize: isMobile ? 11 : 12,
                            fontWeight: 700,
                            lineHeight: 1,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                        }}
                    >
                        {label}
                    </Typography>
                    {secondaryLabel && (
                        <Typography
                            component="span"
                            sx={{
                                color: theme.palette.text.secondary,
                                fontSize: 9,
                                fontWeight: 500,
                                lineHeight: 1,
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                mt: 0.2,
                            }}
                        >
                            {secondaryLabel}
                        </Typography>
                    )}
                </Box>
            </Tooltip>

            <Tooltip title={nextTitle || 'Next period'} placement="top" arrow>
                <IconButton
                    aria-label="Next period"
                    onClick={onNext}
                    disabled={disableNext}
                    sx={edgeBtnSx}
                >
                    <KeyboardArrowRightRoundedIcon sx={{ fontSize: isMobile ? 18 : 20 }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default PeriodNavigator;
