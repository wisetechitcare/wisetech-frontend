import { toAbsoluteUrl } from '@metronic/helpers';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface SalaryPeriodOption {
    label: string;
    value: string;
}

interface SalaryPeriodToolbarProps {
    alignment: string;
    options: SalaryPeriodOption[];
    onAlignmentChange: (value: string) => void;
    periodLabel?: string;
    onPrevious?: () => void;
    onNext?: () => void;
    disablePrevious?: boolean;
    disableNext?: boolean;
    nextTitle?: string;
    previousTitle?: string;
    endAdornment?: ReactNode;
}

const navButtonSx = {
    width: 24,
    height: 24,
    border: '1px solid #d7e0ea',
    backgroundColor: '#ffffff',
    color: '#94a3b8',
    '&:hover': {
        backgroundColor: '#f8fafc',
        borderColor: '#cbd5e1',
    },
    '&.Mui-disabled': {
        opacity: 0.45,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
};

const SalaryPeriodToolbar = ({
    alignment,
    options,
    onAlignmentChange,
    periodLabel,
    onPrevious,
    onNext,
    disablePrevious = false,
    disableNext = false,
    nextTitle,
    previousTitle,
    endAdornment,
}: SalaryPeriodToolbarProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                alignItems: { xs: 'stretch', lg: 'center' },
                justifyContent: 'space-between',
                gap: 1.5,
                mb: 3,
            }}
        >
            <ToggleButtonGroup
                value={alignment}
                exclusive
                onChange={(_, value) => {
                    if (value !== null) onAlignmentChange(value);
                }}
                aria-label="salary period view selection"
                sx={{
                    display: 'inline-flex',
                    p: 0.45,
                    gap: 0.45,
                    borderRadius: '14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    width: 'fit-content',
                    '& .MuiToggleButtonGroup-grouped': {
                        border: 0,
                        borderRadius: '10px !important',
                        color: '#64748b',
                        px: 1.6,
                        py: 0.7,
                        minHeight: 34,
                        textTransform: 'none',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        letterSpacing: 0,
                    },
                    '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                        marginLeft: 0,
                        borderLeft: 0,
                    },
                    '& .MuiToggleButton-root:hover': {
                        backgroundColor: '#eef2f7',
                    },
                    '& .Mui-selected': {
                        backgroundColor: '#ffffff !important',
                        color: '#0f172a !important',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                    },
                }}
            >
                {options.map((option) => (
                    <ToggleButton key={option.value} value={option.value}>
                        {option.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>

            {periodLabel && (
                <Box
                    sx={{
                        minWidth: { xs: '100%', sm: 320 },
                        maxWidth: { xs: '100%', lg: 420 },
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 1,
                        py: 0.7,
                        borderRadius: '12px',
                        background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                        border: '1px solid #dbe4ee',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={onPrevious}
                        disabled={disablePrevious}
                        title={previousTitle}
                        sx={navButtonSx}
                    >
                        <Box component="img" src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous" sx={{ width: 12, height: 12 }} />
                    </IconButton>

                    <Typography
                        sx={{
                            flex: 1,
                            textAlign: 'center',
                            color: '#0f172a',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {periodLabel}
                    </Typography>

                    {endAdornment || (
                        <IconButton
                            size="small"
                            onClick={onNext}
                            disabled={disableNext}
                            title={nextTitle}
                            sx={navButtonSx}
                        >
                            <Box component="img" src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next" sx={{ width: 12, height: 12 }} />
                        </IconButton>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default SalaryPeriodToolbar;
