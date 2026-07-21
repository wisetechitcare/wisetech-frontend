import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import { Box, IconButton, SxProps, Theme, Typography, Tooltip, useMediaQuery, useTheme } from '@mui/material';

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
}: PeriodNavigatorProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: isMobile ? 32 : 36,
                minWidth,
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

            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 0,
                    px: isMobile ? 0.75 : 1,
                    py: 0,
                }}
            >
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
