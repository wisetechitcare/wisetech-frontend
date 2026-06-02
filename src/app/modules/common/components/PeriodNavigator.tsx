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
}

const buttonSx = {
    width: 32,
    height: 32,
    borderRadius: 0,
    color: '#94a3b8',
    p: 0,
    '&:hover': {
        color: '#7a2626',
        backgroundColor: '#f8fafc',
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
}: PeriodNavigatorProps) => (
    <Box
        sx={{
            height: 32,
            width: 'fit-content',
            minWidth,
            maxWidth: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            border: '1px solid #eef2f7',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
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
                color: '#9d4141',
                fontSize: 12,
                fontWeight: 700,
                lineHeight: '32px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderLeft: '1px solid #eef2f7',
                borderRight: '1px solid #eef2f7',
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
