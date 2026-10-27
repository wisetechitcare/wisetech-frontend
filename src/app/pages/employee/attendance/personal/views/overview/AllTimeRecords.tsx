import { AttendanceRecords } from '@models/employee';
import { RootState } from '@redux/store';
import { fetchEmpAttendanceAllTimeRecords } from '@services/employee';
import { convertMinutesIntoHrMinFormat } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { Box, Card, Grid } from '@mui/material';
import { useSelector } from 'react-redux';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { ErrorState, Spinner } from '@app/modules/common/components/ui/tw';

const AllTimeRecords: React.FC = () => {
    const checkInCheckOut = useSelector((state: RootState) => state.attendance.openModal);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const companyId = useSelector((state: RootState) => state.company.currentCompany.id);
    const dateOfJoining = useSelector((state: RootState) => state.employee.currentEmployee.dateOfJoining);
    const joiningDate = dateOfJoining && dayjs(dateOfJoining).isValid()
        ? dayjs(dateOfJoining).format('YYYY-MM-DD')
        : '';
    const observedIn = 'India';
    const [records, setRecords] = useState<AttendanceRecords>({
        totalWorkingTimeMinutes: 0,
        totalExtraWorkingDays: 0,
        leaveDays: 0,
        lateDays: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function fetchRecords() {
            setIsLoading(true);
            setHasError(false);
            try {
                if (!employeeId || !companyId) {
                    throw new Error('Employee and company are required to load attendance records.');
                }
                const { data: { empAttendanceRecords } } = await fetchEmpAttendanceAllTimeRecords(employeeId, observedIn, companyId);
                if (!empAttendanceRecords) {
                    throw new Error('Attendance records were missing from the server response.');
                }
                if (!cancelled) setRecords(empAttendanceRecords);
            } catch (error) {
                console.error('Error fetching all-time attendance records:', error);
                if (!cancelled) setHasError(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchRecords();
        return () => {
            cancelled = true;
        };
    }, [employeeId, companyId, checkInCheckOut, reloadKey]);

    const totalWorkedTime = convertMinutesIntoHrMinFormat(records.totalWorkingTimeMinutes)
        .replace('h : ', 'H ')
        .replace('m', 'M');
    const statCards = [
        {
            icon: 'bi-clock',
            accent: '#6366f1',
            bg: '#eef2ff',
            value: totalWorkedTime,
            label: 'Total Working Time',
            sub: joiningDate ? `Since ${dayjs(joiningDate).format('D MMM YYYY')}` : undefined,
        },
        {
            icon: 'bi-calendar-check',
            accent: '#22c55e',
            bg: '#f0fdf4',
            value: `${records.totalExtraWorkingDays} Days`,
            label: 'Extra Working Days',
        },
        {
            icon: 'bi-calendar2-x',
            accent: '#f59e0b',
            bg: '#fffbeb',
            value: `${records.leaveDays} Days`,
            label: 'Total Leave Days',
        },
        {
            icon: 'bi-alarm',
            accent: '#ef4444',
            bg: '#fef2f2',
            value: `${records.lateDays} Days`,
            label: 'Late Check-Ins',
        },
    ];

    if (isLoading) {
        return (
            <Card elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '16px', p: { xs: 1.5, sm: 2 } }}>
                <div className="d-flex align-items-center justify-content-center py-5" role="status" aria-label="Loading all-time attendance records">
                    <Spinner size={28} />
                </div>
            </Card>
        );
    }

    if (hasError) {
        return (
            <Card elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '16px', p: { xs: 1.5, sm: 2 } }}>
                <ErrorState
                    compact
                    title="Couldn’t load all-time records"
                    onRetry={() => setReloadKey((key) => key + 1)}
                />
            </Card>
        );
    }

    return (
        <Card elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', p: { xs: 1.5, sm: 2 } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius: 99, display: 'inline-block' }} />
                <h2 className="m-0" style={{ fontWeight: 700, fontSize: 16, color: '#111827', letterSpacing: '-0.01em' }}>All Time Records</h2>
            </div>
            <Grid container spacing={1}>
                {statCards.map(({ icon, accent, bg, value, label, sub }) => (
                    <Grid item xs={6} md={3} key={label}>
                        <Box sx={{
                            border: `1px solid ${accent}22`,
                            borderRadius: 3,
                            px: { xs: 1, sm: 1.5 },
                            py: { xs: 1.25, sm: 1.5 },
                            backgroundColor: 'background.paper',
                            boxShadow: `0 2px 8px ${accent}12`,
                            height: '100%',
                            minWidth: 0,
                            display: 'grid',
                            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '36px minmax(0, 1fr)' },
                            gridTemplateRows: 'auto auto auto auto',
                            alignContent: 'center',
                            alignItems: 'center',
                            columnGap: { xs: 1, sm: 1.25 },
                            rowGap: { xs: 0.5, sm: 0 },
                        }}>
                            <Box sx={{
                                gridColumn: 1,
                                gridRow: { xs: 1, sm: '1 / span 3' },
                                width: { xs: 30, sm: 36 },
                                height: { xs: 30, sm: 36 },
                                borderRadius: 2.5,
                                backgroundColor: bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <AppIcon name={icon} className="fs-3" color={accent} />
                            </Box>
                            <Box sx={{ gridColumn: { xs: 1, sm: 2 }, gridRow: { xs: 2, sm: 1 }, minWidth: 0, fontSize: 12, color: '#475569', fontWeight: 600, lineHeight: 1.2 }}>
                                {label}
                            </Box>
                            <Box sx={{
                                gridColumn: { xs: 1, sm: 2 },
                                gridRow: { xs: 3, sm: 2 },
                                minWidth: 0,
                                fontSize: 'clamp(12px, 3.4vw, 17px)',
                                fontWeight: 800,
                                color: '#111827',
                                lineHeight: 1.2,
                                letterSpacing: '-0.02em',
                                whiteSpace: 'nowrap',
                            }}>
                                {value}
                            </Box>
                            {sub && (
                                <Box sx={{ gridColumn: { xs: 1, sm: 2 }, gridRow: { xs: 4, sm: 3 }, minWidth: 0, fontSize: 11, color: '#64748b', lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                                    {sub}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Card>
    );
};

export default AllTimeRecords;
