import { handleDatesChange } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import Monthly from './Monthly';
import Yearly from './Yearly';
import AllTime from './AllTime';
import { SalaryToggleItemsCallBackFunctions } from '../../../SalaryView';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';
import SalaryPeriodToolbar from '@app/pages/employee/salary/components/SalaryPeriodToolbar';

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

    return (
        <>
            <h3 className="fw-bold fs-1 mb-6 mt-6 font-barlow">Salary Report</h3>
            <SalaryPeriodToolbar
                alignment={alignment}
                options={[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Yearly', value: 'yearly' },
                    { label: 'All Time', value: 'alltime' },
                ]}
                onAlignmentChange={(value) => setAlignment(value)}
                periodLabel={alignment === 'monthly' ? month.format('MMM YYYY') : alignment === 'yearly' ? fiscalYear : undefined}
                onPrevious={alignment === 'monthly'
                    ? () => {
                        handleDatesChange('decrement', 'month', setMonth);
                        toggleItemsActions?.monthly(month.subtract(1, 'month'));
                    }
                    : alignment === 'yearly'
                        ? () => {
                            handleDatesChange('decrement', 'year', setYear);
                            toggleItemsActions?.yearly(year.subtract(1, 'year'));
                        }
                        : undefined}
                onNext={alignment === 'monthly'
                    ? () => {
                        handleDatesChange('increment', 'month', setMonth);
                        toggleItemsActions?.monthly(month.add(1, 'month'));
                    }
                    : alignment === 'yearly'
                        ? () => {
                            handleDatesChange('increment', 'year', setYear);
                            toggleItemsActions?.yearly(year.add(1, 'year'));
                        }
                        : undefined}
                disableNext={alignment === 'monthly'
                    ? disableFutureDates && isMonthInFuture(month.add(1, 'month'))
                    : alignment === 'yearly'
                        ? disableFutureDates && isYearInFuture(year.add(1, 'year'))
                        : false}
                nextTitle={alignment === 'monthly'
                    ? (disableFutureDates && isMonthInFuture(month.add(1, 'month')) ? 'Cannot view future months' : undefined)
                    : alignment === 'yearly'
                        ? (disableFutureDates && isYearInFuture(year.add(1, 'year')) ? 'Cannot view future years' : undefined)
                        : undefined}
            />

            {alignment == 'monthly' && <Monthly month={month} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} monthlyApiData={monthlyApiData} isApiDataLoading={isApiDataLoading} onRefreshSalaryData={onRefreshSalaryData} isRefreshing={isRefreshing} />}
            {alignment == 'yearly' && <Yearly year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
            {alignment == 'alltime' && <AllTime year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
        </>
    )
}


export default SalaryReportToggle;
