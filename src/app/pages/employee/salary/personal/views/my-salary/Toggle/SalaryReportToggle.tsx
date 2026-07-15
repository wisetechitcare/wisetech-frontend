import { toAbsoluteUrl } from '@metronic/helpers';
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import { handleDatesChange } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import Monthly from './Monthly';
import Yearly from './Yearly';
import AllTime from './AllTime';
import { SalaryToggleItemsCallBackFunctions } from '../../../SalaryView';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';

interface MaterialToggleProps {
    toggleItemsActions?: SalaryToggleItemsCallBackFunctions;
    fromAdmin?: boolean;
    showSensitiveData: boolean;
    monthlyApiData?: IMonthlyApiResponse | null;
    isApiDataLoading?: boolean;
    onRefreshSalaryData?: () => void;
    isRefreshing?: boolean;
    disableFutureDates?: boolean;
};

const SalaryReportToggle = ({ toggleItemsActions, fromAdmin = false, showSensitiveData, monthlyApiData, isApiDataLoading, onRefreshSalaryData, isRefreshing, disableFutureDates = true }: MaterialToggleProps) => {
    const [alignment, setAlignment] = useState('monthly');

    const [month, setMonth] = useState(dayjs());
    const [year, setYear] = useState(dayjs());

    const [fiscalYear, setFiscalYear] = useState('');

    // Inject global CSS for sensitive data blur toggle (needed by all toggle views)
    useEffect(() => {
        const STYLE_ID = 'sensitive-data-global-styles';
        if (!document.getElementById(STYLE_ID)) {
            const styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            styleEl.innerHTML = `
                .sensitive-data-hidden {
                    filter: blur(5px);
                    user-select: none;
                    pointer-events: none;
                    transition: filter 0.3s ease;
                }
                .sensitive-data-visible {
                    filter: none;
                    user-select: auto;
                    pointer-events: auto;
                    transition: filter 0.3s ease;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }, []);

    useEffect(()=>{
       if(!year) return;
       async function getFiscalYear() {
           const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
           setFiscalYear(`${startDate} to ${endDate}`);
        }
        getFiscalYear();
    },[year])

    // Helper functions to check if dates are in future
    const isMonthInFuture = (date: dayjs.Dayjs) => {
        const today = dayjs();
        return date.isAfter(today, 'month');
    };
    
    const isYearInFuture = (date: dayjs.Dayjs) => {
        const today = dayjs();
        return date.isAfter(today, 'year');
    };

    const handleChange = (event: React.MouseEvent<HTMLElement>, newAlignment: string) => {
        if (newAlignment !== null) setAlignment(newAlignment);
    };

    return (
        <>
            <h3 className="fw-bold fs-1 mb-6 mt-6 font-barlow">Salary Report</h3>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-8 gap-3">
                <PeriodTabs
                    value={alignment}
                    options={[
                        { label: 'Monthly', value: 'monthly' },
                        { label: 'Yearly', value: 'yearly' },
                        { label: 'All Time', value: 'alltime' },
                    ]}
                    onChange={(v) => handleChange(null as any, v)}
                    ariaLabel="view selection"
                />

                {alignment === 'monthly' && (
                    <PeriodNavigator
                        onPrevious={() => {
                            handleDatesChange('decrement', 'month', setMonth);
                            toggleItemsActions?.monthly(month.subtract(1, 'month'));
                        }}
                        onNext={() => {
                            if (disableFutureDates && isMonthInFuture(month.add(1, 'month'))) return;
                            handleDatesChange('increment', 'month', setMonth);
                            toggleItemsActions?.monthly(month.add(1, 'month'));
                        }}
                        label={month.format('MMM YYYY')}
                    />
                )}

                {alignment === 'yearly' && (
                    <PeriodNavigator
                        onPrevious={() => {
                            handleDatesChange('decrement', 'year', setYear);
                            toggleItemsActions?.yearly(year.subtract(1, 'year'));
                        }}
                        onNext={() => {
                            if (disableFutureDates && isYearInFuture(year.add(1, 'year'))) return;
                            handleDatesChange('increment', 'year', setYear);
                            toggleItemsActions?.yearly(year.add(1, 'year'));
                        }}
                        label={formatFiscalYearLabel(fiscalYear)}
                    />
                )}
            </div >

            {alignment == 'monthly' && <Monthly month={month} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} monthlyApiData={monthlyApiData} isApiDataLoading={isApiDataLoading} onRefreshSalaryData={onRefreshSalaryData} isRefreshing={isRefreshing} />}
            {alignment == 'yearly' && <Yearly year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
            {alignment == 'alltime' && <AllTime year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
        </>
    )
}

export default SalaryReportToggle;
