import { toAbsoluteUrl } from '@metronic/helpers';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { handleDatesChange } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import Monthly from './Monthly';
import Yearly from './Yearly';
import AllTime from './AllTime';
import { SalaryToggleItemsCallBackFunctions } from '../../../SalaryView';
import { generateFiscalYearFromGivenYear } from '@utils/file';
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
            <div className="d-flex flex-md-row justify-content-lg-between flex-column align-items-lg-center mb-8 gap-5 gap-lg-0">
                <ToggleButtonGroup
                    value={alignment}
                    exclusive
                    onChange={(event: React.MouseEvent<HTMLElement>, value: any) => handleChange(event, value)}
                    aria-label="view selection"
                    sx={{
                        '& .MuiToggleButton-root': {
                            borderRadius: '20px',
                            borderColor: '#B0BEC5 !important',
                            color: '#000000 !important',
                            margin: '0 8px',
                            padding: '6px 16px',
                            borderWidth: '2px',
                            fontWeight: '600'
                        },
                        '& .Mui-selected': {
                            borderColor: '#9D4141 !important',
                            fontStyle: '#9D4141 !important',
                            color: '#9D4141 !important',
                        },
                        '& .MuiToggleButton-root:hover': {
                            borderColor: '#9D4141 !important',
                            color: '#9D4141 !important',
                        },
                    }}
                >
                    <ToggleButton value='monthly'>Monthly</ToggleButton>
                    <ToggleButton value='yearly'>Yearly</ToggleButton>
                    <ToggleButton value='alltime'>All Time</ToggleButton>
                </ToggleButtonGroup>

                {alignment == 'monthly' && <div>
                    <button className="btn btn-sm p-0" onClick={(e) => {
                        handleDatesChange('decrement', 'month', setMonth);
                        toggleItemsActions?.monthly(month.subtract(1, 'month'));
                    }}>
                        <img src={toAbsoluteUrl('media/svg/misc/back.svg')} />
                    </button>
                    <span className="mx-2 my-5">{month.format('MMM, YYYY')}</span>
                    <button 
                        className="btn btn-sm p-0" 
                        onClick={(e) => {
                            handleDatesChange('increment', 'month', setMonth);
                            toggleItemsActions?.monthly(month.add(1, 'month'));
                        }}
                        disabled={disableFutureDates && isMonthInFuture(month.add(1, 'month'))}
                        style={{ 
                            opacity: (disableFutureDates && isMonthInFuture(month.add(1, 'month'))) ? 0.5 : 1,
                            cursor: (disableFutureDates && isMonthInFuture(month.add(1, 'month'))) ? 'not-allowed' : 'pointer'
                        }}
                        title={disableFutureDates && isMonthInFuture(month.add(1, 'month')) ? "Cannot view future months" : ""}
                    >
                        <img src={toAbsoluteUrl('media/svg/misc/next.svg')} />
                    </button>
                </div>}

                {alignment == 'yearly' && <div>
                    <button className="btn btn-sm p-0" onClick={(e) => {
                        handleDatesChange('decrement', 'year', setYear);
                        toggleItemsActions?.yearly(year.subtract(1, 'year'));
                    }}>
                        <img src={toAbsoluteUrl('media/svg/misc/back.svg')} />
                    </button>
                    <span className="mx-2 my-5">{fiscalYear}</span>
                    <button 
                        className="btn btn-sm p-0" 
                        onClick={(e) => {
                            handleDatesChange('increment', 'year', setYear);
                            toggleItemsActions?.yearly(year.add(1, 'year'));
                        }}
                        disabled={disableFutureDates && isYearInFuture(year.add(1, 'year'))}
                        style={{ 
                            opacity: (disableFutureDates && isYearInFuture(year.add(1, 'year'))) ? 0.5 : 1,
                            cursor: (disableFutureDates && isYearInFuture(year.add(1, 'year'))) ? 'not-allowed' : 'pointer'
                        }}
                        title={disableFutureDates && isYearInFuture(year.add(1, 'year')) ? "Cannot view future years" : ""}
                    >
                        <img src={toAbsoluteUrl('media/svg/misc/next.svg')} />
                    </button>
                </div>}
            </div >

            {alignment == 'monthly' && <Monthly month={month} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} monthlyApiData={monthlyApiData} isApiDataLoading={isApiDataLoading} onRefreshSalaryData={onRefreshSalaryData} isRefreshing={isRefreshing} />}
            {alignment == 'yearly' && <Yearly year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
            {alignment == 'alltime' && <AllTime year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
        </>
    )
}


export default SalaryReportToggle;