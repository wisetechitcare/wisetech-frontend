import React, { useState } from 'react';
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import dayjs, { Dayjs } from 'dayjs';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { RootState } from '@redux/store';
import EmployeeDetailsCard from '@pages/employee/salary/personal/views/my-salary/EmployeeDetailsCard';
import DateSelector from '@components/DateSelector';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { T } from '@app/modules/common/components/ui/tokens';
import AddEditIncrementDialog from '@app/modules/employee/salary/AddEditIncrementDialog';
import { useIncrementData, IncrementMode } from './useIncrementData';
import IncrementDashboard from './components/IncrementDashboard';

/** Parse ?year= into a valid fiscal start year, falling back to the current year. */
function resolveYear(param: string | null): string {
    const current = dayjs().year();
    if (param && /^\d{4}$/.test(param)) {
        const num = Number(param);
        if (num >= current - 50 && num <= current) return param;
    }
    return String(current);
}

function IncrementView({ fromAdmin = false }: { fromAdmin?: boolean }) {
    const stats = useSelector((state: RootState) => state.attendanceStats.monthly);
    const employee = useSelector((state: RootState) =>
        fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
    );

    // View mode and year live in the URL so refresh/share/back all restore state.
    const [searchParams, setSearchParams] = useSearchParams();
    const mode: IncrementMode = searchParams.get('view') === 'alltime' ? 'alltime' : 'yearly';
    const yearStr = resolveYear(searchParams.get('year'));
    const year = dayjs(`${yearStr}-01-01`);

    const [showSensitiveData, setShowSensitiveData] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);

    const data = useIncrementData(employee?.id, yearStr);

    const employeeName = employee?.users?.firstName
        ? `${employee.users.firstName} ${employee.users.lastName ?? ''}`.trim()
        : 'Employee';

    const updateParams = (updates: Record<string, string>) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(updates).forEach(([k, v]) => next.set(k, v));
            return next;
        }, { replace: true });
    };

    const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: string | null) => {
        if (newMode) updateParams({ view: newMode });
    };

    const setYear = (d: Dayjs) => updateParams({ year: d.format('YYYY') });
    const isNextYearDisabled = year.add(1, 'year').isAfter(dayjs(), 'year');

    return (
        <>
            <EmployeeDetailsCard
                fromAdmin={fromAdmin}
                stats={stats}
                showSensitiveData={showSensitiveData}
                onToggleSensitiveData={() => setShowSensitiveData(v => !v)}
            />

            {/* ── Header: title + view toggle + year picker + add ── */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                mb: 3,
                mt: 2,
                pb: 2.5,
                borderBottom: `1px solid ${T.color.lineSoft}`,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 38, height: 38, borderRadius: `${T.radius.sm}px`,
                        bgcolor: T.color.accent,
                        display: 'grid', placeItems: 'center',
                        flexShrink: 0,
                    }}>
                        <TrendingUpIcon sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ color: T.color.ink, fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2 }}>
                            Increment Report
                        </Typography>
                        <Typography sx={{ color: T.color.inkFaint, fontSize: '0.75rem', fontWeight: 500, mt: 0.2 }}>
                            Salary revision history &amp; progression analytics
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={handleModeChange}
                        aria-label="view selection"
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 32,
                            p: '3px',
                            borderRadius: `${T.radius.sm}px`,
                            backgroundColor: T.color.panel,
                            border: `1px solid ${T.color.line}`,
                            '& .MuiToggleButtonGroup-grouped': {
                                border: 0,
                                borderRadius: '6px !important',
                                minWidth: 0,
                                minHeight: 26,
                                px: 1.75,
                                py: 0,
                                color: T.color.inkSoft,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                lineHeight: '26px',
                                textTransform: 'none',
                                whiteSpace: 'nowrap',
                            },
                            '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                                marginLeft: 0,
                                borderLeft: 0,
                            },
                            '& .MuiToggleButton-root:hover': { backgroundColor: T.color.panelAlt },
                            '& .Mui-selected': {
                                backgroundColor: `${T.color.surface} !important`,
                                color: `${T.color.accent} !important`,
                                fontWeight: 700,
                                boxShadow: T.shadow.xs,
                            },
                        }}
                    >
                        <ToggleButton value="yearly">Yearly</ToggleButton>
                        <ToggleButton value="alltime">All Time</ToggleButton>
                    </ToggleButtonGroup>

                    {mode === 'yearly' && (
                        <DateSelector
                            onPrevious={() => setYear(year.subtract(1, 'year'))}
                            onNext={() => setYear(year.add(1, 'year'))}
                            displayValue={formatFiscalYearLabel(`${yearStr}-${year.add(1, 'year').format('YYYY')}`)}
                            disableNext={isNextYearDisabled}
                        />
                    )}

                    {fromAdmin && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setShowAddDialog(true)}
                            disabled={!employee?.id}
                            sx={{
                                backgroundColor: T.color.accent,
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                borderRadius: `${T.radius.sm}px`,
                                px: 2,
                                height: 34,
                                '&:hover': { backgroundColor: '#9A2D21' },
                            }}
                        >
                            Add Increment
                        </Button>
                    )}
                </Box>
            </Box>

            <IncrementDashboard
                mode={mode}
                year={yearStr}
                fromAdmin={fromAdmin}
                showSensitiveData={showSensitiveData}
                data={data}
                employeeId={employee?.id}
                employeeName={employeeName}
                joiningDate={employee?.dateOfJoining ? String(employee.dateOfJoining) : undefined}
            />

            {fromAdmin && employee?.id && (
                <AddEditIncrementDialog
                    open={showAddDialog}
                    onClose={() => setShowAddDialog(false)}
                    employeeId={employee.id}
                    employeeName={employeeName}
                    history={data.history}
                    onSuccess={data.refetch}
                />
            )}
        </>
    );
}

export default IncrementView;
