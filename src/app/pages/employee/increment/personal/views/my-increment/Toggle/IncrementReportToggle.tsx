import { ToggleButton, ToggleButtonGroup, Button as MuiButton } from '@mui/material';
import { handleDatesChange } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import Yearly from './Yearly';
import AllTime from './AllTime';
import { IncrementToggleItemsCallBackFunctions } from '../../../IncrementView';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import DateSelector from '@components/DateSelector';
import AddEditIncrementDialog from '../components/AddEditIncrementDialog';
import { incrementService } from '../../../../../../../../services/incrementService';
import { Box, Typography } from '@mui/material';

interface MaterialToggleProps {
    toggleItemsActions?: IncrementToggleItemsCallBackFunctions;
    fromAdmin?: boolean;
    showSensitiveData: boolean;
    disableFutureDates?: boolean;
}

const IncrementReportToggle = ({
    toggleItemsActions,
    fromAdmin = false,
    showSensitiveData,
    disableFutureDates = true,
}: MaterialToggleProps) => {
    const [alignment, setAlignment] = useState('yearly');
    const [year, setYear] = useState(dayjs());
    const [fiscalYear, setFiscalYear] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);

    const employee = useSelector((state: RootState) =>
        fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
    );
    const [currentMonthlySalary, setCurrentMonthlySalary] = useState(0);

    useEffect(() => {
        if (!year) return;
        setFiscalYear(`${year.format('YYYY')}-${year.add(1, 'year').format('YYYY')}`);
    }, [year]);

    const fetchCurrentSalary = async () => {
        if (employee?.id) {
            const an = await incrementService.fetchIncrementAnalytics(employee.id, 'AllTime');
            if (an) setCurrentMonthlySalary(an.currentSalary);
        }
    };

    const isYearInFuture = (date: dayjs.Dayjs) => date.isAfter(dayjs(), 'year');

    const handleChange = (_: React.MouseEvent<HTMLElement>, newVal: string) => {
        if (newVal !== null) setAlignment(newVal);
    };

    const handleOpenAddDialog = () => {
        fetchCurrentSalary();
        setShowAddDialog(true);
    };

    const handleAddIncrement = async (payload: any) => {
        if (employee?.id) {
            await incrementService.createIncrement(employee.id, payload);
            setShowAddDialog(false);
            window.location.reload();
        }
    };

    return (
        <>
            {/* ── Page Header ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 3,
                    mt: 2,
                    pb: 2.5,
                    borderBottom: '1px solid #f1f5f9',
                }}
            >
                {/* Left: Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #AA393D, #c0474c)',
                            display: 'grid', placeItems: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <TrendingUpIcon sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2 }}>
                            Increment Report
                        </Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, mt: 0.2 }}>
                            Salary revision history &amp; progression analytics
                        </Typography>
                    </Box>
                </Box>

                {/* Right: Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* View Toggle */}
                    <ToggleButtonGroup
                        value={alignment}
                        exclusive
                        onChange={handleChange}
                        aria-label="view selection"
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 32,
                            p: '3px',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            '& .MuiToggleButtonGroup-grouped': {
                                border: 0,
                                borderRadius: '6px !important',
                                minWidth: 0,
                                minHeight: 26,
                                px: 1.75,
                                py: 0,
                                color: '#64748b',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                lineHeight: '26px',
                                textTransform: 'none',
                                whiteSpace: 'nowrap',
                                letterSpacing: 0,
                            },
                            '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                                marginLeft: 0,
                                borderLeft: 0,
                            },
                            '& .MuiToggleButton-root:hover': { backgroundColor: '#e8eef6' },
                            '& .Mui-selected': {
                                backgroundColor: '#ffffff !important',
                                color: '#AA393D !important',
                                fontWeight: 700,
                                boxShadow: '0 1px 4px rgba(15,23,42,0.1)',
                            },
                        }}
                    >
                        <ToggleButton value="yearly">Yearly</ToggleButton>
                        <ToggleButton value="alltime">All Time</ToggleButton>
                    </ToggleButtonGroup>

                    {/* Year picker — only in yearly mode */}
                    {alignment === 'yearly' && (
                        <DateSelector
                            onPrevious={() => {
                                handleDatesChange('decrement', 'year', setYear);
                                toggleItemsActions?.yearly(year.subtract(1, 'year'));
                            }}
                            onNext={() => {
                                handleDatesChange('increment', 'year', setYear);
                                toggleItemsActions?.yearly(year.add(1, 'year'));
                            }}
                            displayValue={fiscalYear}
                            disableNext={disableFutureDates && isYearInFuture(year.add(1, 'year'))}
                        />
                    )}

                    {/* Add Increment — admin only */}
                    {fromAdmin && (
                        <MuiButton
                            variant="contained"
                            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                            onClick={handleOpenAddDialog}
                            sx={{
                                backgroundColor: '#AA393D',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(170,57,61,0.25)',
                                px: 2,
                                height: 34,
                                '&:hover': { backgroundColor: '#8b2b2e', boxShadow: '0 4px 12px rgba(170,57,61,0.3)' },
                            }}
                        >
                            Add Increment
                        </MuiButton>
                    )}
                </Box>
            </Box>

            {/* ── View Content ── */}
            {alignment === 'yearly' && (
                <Yearly year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />
            )}
            {alignment === 'alltime' && (
                <AllTime year={year} fromAdmin={fromAdmin} showSensitiveData={showSensitiveData} />
            )}

            {showAddDialog && (
                <AddEditIncrementDialog
                    show={showAddDialog}
                    onHide={() => setShowAddDialog(false)}
                    record={null}
                    employeeName={
                        employee?.users?.firstName
                            ? `${employee.users.firstName} ${employee.users.lastName}`
                            : 'Employee'
                    }
                    employeeId={employee?.id}
                    currentSalary={currentMonthlySalary}
                    onSubmit={handleAddIncrement}
                />
            )}
        </>
    );
};

export default IncrementReportToggle;
