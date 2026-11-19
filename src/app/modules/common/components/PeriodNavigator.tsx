import { Box, SxProps, Theme } from '@mui/material';
import { PeriodNavigator as KitPeriodNavigator } from '@/ds/patterns/period-navigator';

/**
 * How the click-to-jump picker behaves. Day = full calendar; month = month grid (skip day);
 * year = year grid only. Week uses day — picking any day jumps to that week at the call site.
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

/**
 * The live app's period stepper, kept as an adapter so its 21 call sites don't change: the control itself
 * is the design system's PeriodNavigator (src/ds/patterns/period-navigator.tsx), and the jump picker is the
 * kit Calendar at month/year granularity — the MUI X pickers this file used to mount are gone.
 *
 * Only layout props stay MUI: `minWidth` / `sx` size the wrapper (the kit control stretches to fill it, its
 * label taking the slack) and `labelColor` tints the label.
 */
const PeriodNavigator = ({
    label,
    onPrevious,
    onNext,
    disablePrevious = false,
    disableNext = false,
    previousTitle,
    nextTitle,
    minWidth,
    sx,
    labelColor,
    secondaryLabel,
    onPickDate,
    pickValue,
    pickGranularity = 'day',
    pickMinDate,
    pickMaxDate,
}: PeriodNavigatorProps) => (
    <Box
        sx={[
            {
                display: { xs: 'flex', sm: 'inline-flex' },
                width: { xs: '100%', sm: minWidth ?? 'fit-content' },
                minWidth: { sm: minWidth },
                maxWidth: '100%',
                ...(labelColor ? { '& [data-slot=period-navigator-label]': { color: labelColor } } : {}),
            },
            ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
    >
        <KitPeriodNavigator
            label={label}
            secondaryLabel={secondaryLabel}
            onPrevious={onPrevious}
            onNext={onNext}
            disablePrevious={disablePrevious}
            disableNext={disableNext}
            unit="period"
            previousLabel={previousTitle}
            nextLabel={nextTitle}
            onPick={onPickDate}
            pickValue={pickValue}
            pickGranularity={pickGranularity}
            pickMin={pickMinDate}
            pickMax={pickMaxDate}
            className="sm:w-full"
            labelClassName="sm:flex-1"
        />
    </Box>
);

export default PeriodNavigator;
