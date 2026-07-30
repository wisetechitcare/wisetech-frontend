import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import { useState } from 'react';
import { Box, IconButton, SxProps, Theme, Typography, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { WtDateField } from '@app/modules/common/components/ui';
import { pressableProps } from '@app/modules/common/components/ui/a11y';

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
    /** When set, clicking the label opens a native date picker to jump directly
     *  to a date (no clicking the arrows N times). pickValue is YYYY-MM-DD. */
    onPickDate?: (value: string) => void;
    pickValue?: string;
}

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
    labelColor = '#1E3A8A',
    secondaryLabel,
    onPickDate,
    pickValue,
}: PeriodNavigatorProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [pickerOpen, setPickerOpen] = useState(false);

    return (
        <Box
            sx={{
                display: isMobile ? 'flex' : 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: isMobile ? 32 : 36,
                width: isMobile ? '100%' : minWidth,
                minWidth: isMobile ? undefined : minWidth,
                maxWidth: '100%',
                backgroundColor: '#ffffff',
                border: `1.5px solid ${labelColor}12`,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    boxShadow: `0 2px 8px ${labelColor}10`,
                    borderColor: `${labelColor}20`,
                },
                ...sx,
            }}
        >
            <Tooltip title={previousTitle || 'Previous period'} placement="top" arrow>
                <IconButton
                    aria-label="Previous period"
                    onClick={onPrevious}
                    disabled={disablePrevious}
                    sx={{
                        width: isMobile ? 32 : 36,
                        height: isMobile ? 32 : 36,
                        borderRadius: 0,
                        color: '#64748b',
                        p: 0,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        '&:hover:not(.Mui-disabled)': {
                            backgroundColor: `${labelColor}08`,
                            color: labelColor,
                        },
                        '&:active:not(.Mui-disabled)': {
                            backgroundColor: `${labelColor}15`,
                        },
                        '&.Mui-disabled': {
                            color: '#cbd5e1',
                            cursor: 'not-allowed',
                        },
                    }}
                >
                    <KeyboardArrowLeftRoundedIcon sx={{ fontSize: isMobile ? 18 : 20 }} />
                </IconButton>
            </Tooltip>

            <Tooltip title={onPickDate ? 'Click to jump to a date' : ''} placement="top" arrow disableHoverListener={!onPickDate}>
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
                    cursor: onPickDate ? 'pointer' : 'default',
                }}
                {...(onPickDate ? pressableProps(() => setPickerOpen(true)) : {})}
                onClick={onPickDate ? () => setPickerOpen(true) : undefined}
                aria-label={onPickDate ? 'Jump to date' : undefined}
            >
                {/* The label itself is the trigger. The picker is laid out underneath it
                    but visually hidden, so the calendar Popper still anchors to the label
                    while the label stays the only thing you see. Was a native
                    <input type="date"> — that renders the OS calendar: unstyleable,
                    OS-locale formatted and light-on-white in dark mode. */}
                {onPickDate && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            // The Box above owns the click; this must not swallow it.
                            pointerEvents: 'none',
                            overflow: 'hidden',
                        }}
                        aria-hidden
                    >
                        <WtDateField
                            value={pickValue || ''}
                            onChange={(v) => { if (v) onPickDate(v); setPickerOpen(false); }}
                            open={pickerOpen}
                            onClose={() => setPickerOpen(false)}
                        />
                    </Box>
                )}
                <Typography
                    component="span"
                    sx={{
                        color: labelColor,
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
                            color: '#94a3b8',
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
                    sx={{
                        width: isMobile ? 32 : 36,
                        height: isMobile ? 32 : 36,
                        borderRadius: 0,
                        color: '#64748b',
                        p: 0,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        '&:hover:not(.Mui-disabled)': {
                            backgroundColor: `${labelColor}08`,
                            color: labelColor,
                        },
                        '&:active:not(.Mui-disabled)': {
                            backgroundColor: `${labelColor}15`,
                        },
                        '&.Mui-disabled': {
                            color: '#cbd5e1',
                            cursor: 'not-allowed',
                        },
                    }}
                >
                    <KeyboardArrowRightRoundedIcon sx={{ fontSize: isMobile ? 18 : 20 }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default PeriodNavigator;
