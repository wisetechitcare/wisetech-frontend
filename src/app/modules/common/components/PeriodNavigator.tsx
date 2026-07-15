import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import { Box, IconButton, SxProps, Theme, Typography } from '@mui/material';

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
    /** Color of the period label text. Defaults to the app's red brand color;
     * pass a page-specific accent (e.g. the blue design tokens) to opt just that
     * page's usage into a different palette without touching every other caller. */
    labelColor?: string;
}

const buttonSx = {
    width: 24,
    height: 24,
    borderRadius: '4px',
    color: '#475569',
    p: 0,
    '&:hover': {
        color: '#172554',
        backgroundColor: '#e8eef6',
    },
    '&.Mui-disabled': {
        color: '#cbd5e1',
        backgroundColor: 'transparent',
    },
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
    labelColor = '#1E3A8A',
}: PeriodNavigatorProps) => (
    <Box
        sx={{
            height: 30,
            width: 'fit-content',
            minWidth,
            maxWidth: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '5px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #eef2f7',
            p: '2px',
            overflow: 'hidden',
            ...sx,
        }}
    >
        <IconButton
            aria-label="Previous period"
            title={previousTitle}
            onClick={onPrevious}
            disabled={disablePrevious}
            sx={buttonSx}
        >
            <KeyboardArrowLeftRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Typography
            component="span"
            sx={{
                flex: 1,
                minWidth: 0,
                px: 1.25,
                mx: '2px',
                backgroundColor: '#ffffff',
                color: labelColor,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: '24px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
            }}
        >
            {label}
        </Typography>

        <IconButton
            aria-label="Next period"
            title={nextTitle}
            onClick={onNext}
            disabled={disableNext}
            sx={buttonSx}
        >
            <KeyboardArrowRightRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
    </Box>
);

export default PeriodNavigator;
