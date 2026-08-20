import { Box, ToggleButton, ToggleButtonGroup, SxProps, Theme, useMediaQuery, useTheme, alpha } from '@mui/material';

/**
 * PeriodTabs — the app's period selector (Monthly / Yearly / All Time), used by 18 screens.
 *
 * The selected tab used to be marked by a small triangle floating five pixels ABOVE the group,
 * pointing at whatever happened to sit there. It read as a rendering artifact, and it was the
 * only thing distinguishing selection besides a white chip on a near-white track — which is to
 * say, almost nothing, on a white page.
 *
 * Selection is now stated three ways that survive both themes: a raised surface, the accent
 * colour on the label, and a 2px seat rule along the bottom of the tab itself. The seat rule is
 * shared with the reimbursement status rail, so a page's period tabs and its filters read as one
 * instrument strip rather than two unrelated widgets.
 *
 * Surfaces come from the theme, not from fixed greys, so the control is legible in dark mode.
 */

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
    /** Color of the selected tab's text and seat rule. Defaults to the app's navy brand color;
     * pass a page-specific accent to opt just that page's usage into a different palette without
     * touching every other caller. */
    selectedColor?: string;
}

/**
 * A tint of the accent, tolerant of what callers actually pass. `selectedColor` may be a CSS
 * variable (CustomCalendar passes `var(--mrd-primary)`), which MUI's `alpha` cannot decompose and
 * throws on — so the tint falls back to a theme-neutral selected surface rather than taking the
 * page down.
 */
const tint = (color: string, opacity: number, fallback: string) => {
    try {
        return alpha(color, opacity);
    } catch {
        return fallback;
    }
};

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
    const dark = theme.palette.mode === 'dark';

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
            alignItems: 'stretch',
            gap: 0,
            height: 32,
            p: 0,
            borderRadius: '8px',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            width: isMobile ? '100%' : 'fit-content',
            maxWidth: '100%',
            '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                borderRadius: '0 !important',
                minWidth: 0,
                height: '100%',
                // On mobile each tab flexes to an equal share so the group fills
                // the full width evenly; on desktop they hug their label.
                flex: isMobile ? 1 : 'none',
                // The group clips (overflow: hidden + nowrap labels), so padding decides how
                // many tabs survive. Five modes at the desktop padding need ~350px, which a
                // 360px phone does not have — the last tab ("All Time") was silently cut off.
                // Tightening the mobile padding buys back ~60px and fits five.
                // ponytail: fits 5 tabs at 360px; a 6th or a longer label would clip again —
                // at that point let the group wrap on mobile instead of shrinking padding.
                px: isMobile ? 1 : 1.75,
                py: 0,
                color: 'text.secondary',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                letterSpacing: 0,
                transition: 'background-color 150ms ease, color 150ms ease',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                overflow: 'visible',
                // Anchors the visible label, which is taken out of flow so the bold
                // sizer below is what decides this tab's width. See the two spans.
                position: 'relative',
            },
            '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                marginLeft: 0,
                borderLeft: '1px solid',
                borderLeftColor: 'divider',
            },
            '& .MuiToggleButton-root:hover': {
                backgroundColor: 'action.hover',
            },
            '& .MuiToggleButton-root.Mui-focusVisible': {
                outline: `2px solid ${selectedColor}`,
                outlineOffset: '-2px',
            },
            '& .Mui-selected': {
                backgroundColor: `${tint(selectedColor, dark ? 0.24 : 0.08, theme.palette.action.selected)} !important`,
                color: `${dark ? theme.palette.text.primary : selectedColor} !important`,
                fontWeight: 700,
                // Seat rule — the same device the status rail uses for its selected segment.
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '2px',
                    backgroundColor: selectedColor,
                },
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
