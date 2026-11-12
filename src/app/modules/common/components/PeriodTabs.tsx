import { cn } from '@/ds/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/ds/ui/tabs';

/**
 * PeriodTabs — the app's period / view selector (Monthly / Yearly / All Time, and the other small mode
 * switches), used across ~20 screens.
 *
 * Drawn with the design system's Tabs (Storybook "Components/Tabs"): the selected option is the kit's filled
 * brand pill on a muted track — the same control as every other tab bar, in both themes. It used to be an MUI
 * ToggleButtonGroup with its own greys, a hard-coded navy and a 3px seat rule, so a page's period selector and
 * its kit tabs looked like two different systems side by side.
 *
 * Many options on a narrow screen scroll sideways in one row instead of wrapping: a wrapped tab bar reads as
 * two controls, and clipping silently dropped the last option.
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
    className?: string;
}

const PeriodTabs = ({ value, options, onChange, ariaLabel = 'Period selection', className }: PeriodTabsProps) => (
    <Tabs
        value={value}
        onValueChange={(next) => {
            if (next !== null && next !== undefined) onChange(String(next));
        }}
        className={cn('max-w-full', className)}
    >
        <TabsList
            aria-label={ariaLabel}
            className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {options.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="flex-none px-3">
                    {option.label}
                </TabsTrigger>
            ))}
        </TabsList>
    </Tabs>
);

export default PeriodTabs;
