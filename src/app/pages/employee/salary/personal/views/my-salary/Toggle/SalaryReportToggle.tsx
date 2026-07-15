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
                <ToggleButtonGroup
                    value={alignment}
                    exclusive
                    onChange={(event: React.MouseEvent<HTMLElement>, value: any) => handleChange(event, value)}
                    aria-label="view selection"
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0,
                        height: 30,
                        p: '2px',
                        borderRadius: '5px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #eef2f7',
                        width: 'fit-content',
                        maxWidth: '100%',
                        overflowX: 'auto',
                        '& .MuiToggleButtonGroup-grouped': {
                            border: 0,
                            borderRadius: '4px !important',
                            minWidth: 0,
                            minHeight: 24,
                            px: 1.6,
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
                            color: '#1E3A8A !important',
                            fontWeight: 700,
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                        },
                    }}
                >
                    <ToggleButton value='monthly'>Monthly</ToggleButton>
                    <ToggleButton value='yearly'>Yearly</ToggleButton>
                    <ToggleButton value='alltime'>All Time</ToggleButton>
                </ToggleButtonGroup>

                {alignment == 'monthly' && (
                    <div className="d-flex align-items-center bg-white border border-gray-200 rounded shadow-sm">
                        <button className="btn btn-sm btn-icon btn-active-light border-end border-gray-200 rounded-start rounded-0 w-35px h-35px d-flex justify-content-center align-items-center" onClick={(e) => {
                            handleDatesChange('decrement', 'month', setMonth);
                            toggleItemsActions?.monthly(month.subtract(1, 'month'));
                        }}>
                            <i className="bi bi-chevron-left text-muted fs-6"></i>
                        </button>
                        <span className="fw-bolder px-4 py-1 fs-6" style={{ color: '#1E3A8A' }}>{month.format('MMM YYYY')}</span>
                        <button 
                            className="btn btn-sm btn-icon btn-active-light border-start border-gray-200 rounded-end rounded-0 w-35px h-35px d-flex justify-content-center align-items-center" 
                            onClick={(e) => {
                                handleDatesChange('increment', 'month', setMonth);
                                toggleItemsActions?.monthly(month.add(1, 'month'));
                            }}
                            disabled={disableFutureDates && isMonthInFuture(month.add(1, 'month'))}
                            style={{ 
                                cursor: (disableFutureDates && isMonthInFuture(month.add(1, 'month'))) ? 'not-allowed' : 'pointer'
                            }}
                            title={disableFutureDates && isMonthInFuture(month.add(1, 'month')) ? "Cannot view future months" : ""}
                        >
                            <i className={`bi bi-chevron-right fs-6 ${(disableFutureDates && isMonthInFuture(month.add(1, 'month'))) ? 'text-gray-400' : 'text-muted'}`}></i>
                        </button>
                    </div>
                )}

                {alignment == 'yearly' && (
                    <div className="d-flex align-items-center bg-white border border-gray-200 rounded shadow-sm">
                        <button className="btn btn-sm btn-icon btn-active-light border-end border-gray-200 rounded-start rounded-0 w-35px h-35px d-flex justify-content-center align-items-center" onClick={(e) => {
                            handleDatesChange('decrement', 'year', setYear);
                            toggleItemsActions?.yearly(year.subtract(1, 'year'));
                        }}>
                            <i className="bi bi-chevron-left text-muted fs-6"></i>
                        </button>
                        <span className="fw-bolder px-4 py-1 fs-6" style={{ color: '#1E3A8A' }}>{formatFiscalYearLabel(fiscalYear)}</span>
                        <button 
                            className="btn btn-sm btn-icon btn-active-light border-start border-gray-200 rounded-end rounded-0 w-35px h-35px d-flex justify-content-center align-items-center" 
                            onClick={(e) => {
                                handleDatesChange('increment', 'year', setYear);
                                toggleItemsActions?.yearly(year.add(1, 'year'));
                            }}
                            disabled={disableFutureDates && isYearInFuture(year.add(1, 'year'))}
                            style={{ 
                                cursor: (disableFutureDates && isYearInFuture(year.add(1, 'year'))) ? 'not-allowed' : 'pointer'
                            }}
                            title={disableFutureDates && isYearInFuture(year.add(1, 'year')) ? "Cannot view future years" : ""}
                        >
                            <i className={`bi bi-chevron-right fs-6 ${(disableFutureDates && isYearInFuture(year.add(1, 'year'))) ? 'text-gray-400' : 'text-muted'}`}></i>
                        </button>
                    </div>
                )}
            </div >

            {alignment == 'monthly' && <Monthly month={month} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} monthlyApiData={monthlyApiData} isApiDataLoading={isApiDataLoading} onRefreshSalaryData={onRefreshSalaryData} isRefreshing={isRefreshing} />}
            {alignment == 'yearly' && <Yearly year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
            {alignment == 'alltime' && <AllTime year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
        </>
    )
}

export default SalaryReportToggle;
