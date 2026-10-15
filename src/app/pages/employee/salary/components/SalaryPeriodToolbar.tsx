import PeriodNavigator, { PeriodPickGranularity } from '@app/modules/common/components/PeriodNavigator';
import PeriodTabs from '@app/modules/common/components/PeriodTabs';
import { Box } from '@mui/material';
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
    /** Click the label to jump — month/year pickers instead of arrow-only. */
    onPickDate?: (value: string) => void;
    pickValue?: string;
    pickGranularity?: PeriodPickGranularity;
}

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
    onPickDate,
    pickValue,
    pickGranularity,
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
            <PeriodTabs
                value={alignment}
                options={options}
                onChange={onAlignmentChange}
                ariaLabel="salary period view selection"
            />

            {periodLabel && (
                endAdornment || (
                    <PeriodNavigator
                        label={periodLabel}
                        onPrevious={onPrevious || (() => undefined)}
                        onNext={onNext || (() => undefined)}
                        disablePrevious={disablePrevious}
                        disableNext={disableNext}
                        previousTitle={previousTitle}
                        nextTitle={nextTitle}
                        onPickDate={onPickDate}
                        pickValue={pickValue}
                        pickGranularity={pickGranularity}
                        sx={{ width: { xs: '100%', sm: 'fit-content' } }}
                    />
                )
            )}
        </Box>
    );
};

export default SalaryPeriodToolbar;
