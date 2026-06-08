import { toAbsoluteUrl } from '@metronic/helpers';
import { ToggleButton, ToggleButtonGroup, Button as MuiButton } from '@mui/material';
import { handleDatesChange } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import Yearly from './Yearly';
import AllTime from './AllTime';
import { IncrementToggleItemsCallBackFunctions } from '../../../IncrementView';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import AddIcon from '@mui/icons-material/Add';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import AddEditIncrementDialog from '../components/AddEditIncrementDialog';
import { incrementService } from '../../../../../../../../services/incrementService';

interface MaterialToggleProps {
    toggleItemsActions?: IncrementToggleItemsCallBackFunctions;
    fromAdmin?: boolean;
    showSensitiveData: boolean;
    disableFutureDates?: boolean;
};

const IncrementReportToggle = ({ toggleItemsActions, fromAdmin = false, showSensitiveData, disableFutureDates = true }: MaterialToggleProps) => {
    const [alignment, setAlignment] = useState('yearly');
    const [year, setYear] = useState(dayjs());
    const [fiscalYear, setFiscalYear] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    
    // We need employee to fetch current salary and name for the dialog
    const employee = useSelector((state: RootState) => 
        fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
    );
    const [currentMonthlySalary, setCurrentMonthlySalary] = useState(0);

    useEffect(()=>{
       if(!year) return;
       async function getFiscalYear() {
           const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
           setFiscalYear(`${startDate} to ${endDate}`);
        }
        getFiscalYear();
    },[year]);

    const fetchCurrentSalary = async () => {
        if (employee?.id) {
            const an = await incrementService.fetchIncrementAnalytics(employee.id, 'AllTime');
            if (an) {
                setCurrentMonthlySalary(an.currentSalary);
            }
        }
    };

    const isYearInFuture = (date: dayjs.Dayjs) => {
        const today = dayjs();
        return date.isAfter(today, 'year');
    };

    const handleChange = (event: React.MouseEvent<HTMLElement>, newAlignment: string) => {
        if (newAlignment !== null) setAlignment(newAlignment);
    };

    const handleOpenAddDialog = () => {
        fetchCurrentSalary();
        setShowAddDialog(true);
    };

    const handleAddIncrement = async (payload: any) => {
        if (employee?.id) {
            await incrementService.createIncrement(employee.id, payload);
            setShowAddDialog(false);
            // Trigger a reload by toggling the year slightly or dispatching an event
            // The child components AllTime/Yearly fetch on mount, we can force remount or they can listen to Redux
            window.location.reload(); // Simple reload to refresh all stats and charts
        }
    };

    return (
        <>
            <h3 className="fw-bold fs-1 mb-6 mt-6 font-barlow">Increment Report</h3>
            <div className="d-flex flex-md-row justify-content-lg-between flex-column align-items-lg-center mb-8 gap-5 gap-lg-0">
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
                            color: '#aa393d !important',
                            fontWeight: 700,
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                        },
                    }}
                >
                    <ToggleButton value='yearly'>Yearly</ToggleButton>
                    <ToggleButton value='alltime'>All Time</ToggleButton>
                </ToggleButtonGroup>

                <div className="d-flex align-items-center gap-4">
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

                    {fromAdmin && (
                        <MuiButton
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddDialog}
                            sx={{
                                backgroundColor: '#2563eb',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                                boxShadow: 'none',
                                '&:hover': { backgroundColor: '#1d4ed8', boxShadow: 'none' }
                            }}
                        >
                            Add Increment
                        </MuiButton>
                    )}
                </div>
            </div >

            {alignment == 'yearly' && <Yearly year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}
            {alignment == 'alltime' && <AllTime year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />}

            {showAddDialog && (
                <AddEditIncrementDialog
                    show={showAddDialog}
                    onHide={() => setShowAddDialog(false)}
                    record={null}
                    employeeName={employee?.users?.firstName ? `${employee.users.firstName} ${employee.users.lastName}` : 'Employee'}
                    currentSalary={currentMonthlySalary}
                    onSubmit={handleAddIncrement}
                />
            )}
        </>
    )
}

export default IncrementReportToggle;
