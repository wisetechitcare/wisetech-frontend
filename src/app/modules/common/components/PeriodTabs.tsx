import { Box, ToggleButton, ToggleButtonGroup, SxProps, Theme, useMediaQuery, useTheme } from '@mui/material';

export interface PeriodTabOption {
    label: string;
    value: string;
}

interface PeriodTabsProps {
    value: string;
    options: PeriodTabOption[];
    onChange: (value: string) => void;
    ariaLabel?: string;
    sx?: SxProps<Theme>;
    /** Color of the selected tab's text. Defaults to the app's red brand color;
     * pass a page-specific accent (e.g. the blue design tokens) to opt just that
     * page's usage into a different palette without touching every other caller. */
    selectedColor?: string;
}

const PeriodTabs = ({
    value,
    options,
    onChange,
    ariaLabel = 'period selection',
    sx,
    selectedColor = '#1E3A8A',
}: PeriodTabsProps) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
    <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, selectedValue) => {
            if (selectedValue !== null) {
                onChange(selectedValue);
            }
        }}
        aria-label={ariaLabel}
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            height: 30,
            p: '2px',
            borderRadius: '5px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #eef2f7',
            width: isMobile ? '100%' : 'fit-content',
            maxWidth: '100%',
            overflow: 'visible',
            '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                borderRadius: '4px !important',
                minWidth: 0,
                minHeight: 24,
                // On mobile each tab flexes to an equal share so the group fills
                // the full width evenly; on desktop they hug their label.
                flex: isMobile ? 1 : 'none',
                px: 1.4,
                py: 0,
                color: '#475569',
                fontSize: 12,
                fontWeight: 500,
                lineHeight: '24px',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                letterSpacing: 0,
                overflow: 'visible',
                // Anchors the visible label, which is taken out of flow so the bold
                // sizer below is what decides this tab's width. See the two spans.
                position: 'relative',
            },
            '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                marginLeft: 0,
                borderLeft: 0,
            },
            '& .MuiToggleButton-root:hover': {
                backgroundColor: '#e8eef6',
            },
            '& .Mui-selected': {
                backgroundColor: '#ffffff !important',
                color: `${selectedColor} !important`,
                fontWeight: 700,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                position: 'relative',
                overflow: 'visible',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: '-5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `5px solid ${selectedColor}`,
                    zIndex: 10,
                }
            },
            ...sx,
        }}
    >
        {/* Two copies of the label on purpose. The selected tab renders at weight 700 and
            the rest at 500, so a single in-flow label would make every tab resize the
            moment you switch modes — the whole control (and the navigator beside it)
            visibly jumps. The first span is a zero-height, always-bold sizer that fixes
            the width at its widest state; the second is the one you actually see, taken
            out of flow so its weight can change without moving anything. */}
        {options.map((option) => (
            <ToggleButton key={option.value} value={option.value}>
                <Box component="span" aria-hidden sx={{ fontWeight: 700, height: 0, overflow: 'hidden', visibility: 'hidden' }}>
                    {option.label}
                </Box>
                <Box
                    component="span"
                    sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {option.label}
                </Box>
            </ToggleButton>
        ))}
    </ToggleButtonGroup>
    );
};

export default PeriodTabs;
