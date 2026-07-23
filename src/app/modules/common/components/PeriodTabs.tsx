import { ToggleButton, ToggleButtonGroup, SxProps, Theme, useMediaQuery, useTheme } from '@mui/material';

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
            overflowX: 'auto',
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
            },
            ...sx,
        }}
    >
        {options.map((option) => (
            <ToggleButton key={option.value} value={option.value}>
                {option.label}
            </ToggleButton>
        ))}
    </ToggleButtonGroup>
    );
};

export default PeriodTabs;
