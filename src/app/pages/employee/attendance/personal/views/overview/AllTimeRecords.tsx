import { AttendanceRecords } from '@models/employee';
import { RootState, store } from '@redux/store';
import { fetchEmpAttendanceAllTimeRecords, fetchEmpAttendanceStatistics } from '@services/employee';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';
import { convertDaysToYearsMonthsDays, convertMinutesIntoHrMinFormat, parseFlexibleTime } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useSelector } from 'react-redux';

const AllTimeRecords: React.FC = () => {
    const checkInCheckOut = useSelector((state: RootState) => state.attendance.openModal);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const companyId = useSelector((state: RootState) => state.company.currentCompany.id);
    const joiningDate = dayjs(useSelector((state: RootState) => state.employee.currentEmployee.dateOfJoining)).format('YYYY-MM-DD');
    const observedIn = 'India';
    const [yearlyStats, setYearlyStats] = useState<any[]>([]);


    const [records, setRecords] = useState<AttendanceRecords>({
        totalWorkingTimeMinutes: 0,
        totalExtraWorkingDays: 0,
        leaveDays: 0,
        lateDays: 0,
    });

    useEffect(() => {
        async function fetchRecords() {
            const { data: { empAttendanceRecords } } = await fetchEmpAttendanceAllTimeRecords(employeeId, observedIn, companyId);
            
            setRecords(empAttendanceRecords);
        };

        fetchRecords();
    }, [employeeId, companyId, checkInCheckOut]);


        const startDate = dayjs().format('YYYY-MM-DD');
    
        useEffect(() => {
            if(!joiningDate || !startDate) return;
            async function fetchStats() {
                const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(
                    employeeId, 
                    joiningDate, 
                    startDate
                );
                setYearlyStats(empAttendanceStatistics);
            };
    
            fetchStats();
        }, [ employeeId, joiningDate, startDate]);

    
    // const totalWorkedTime = records.totalWorkingTimeMinutes;
    const totalWorkedTime = calculateTotalDuration(yearlyStats);

    const leaveManagement = store.getState().featureConfiguration?.leaveManagement;
    const disableLunchTimeDeduction = store.getState().featureConfiguration?.disableLaunchDeductionTime;
    const lunchTime = leaveManagement?.["Lunch Time"];

    let lunchMinutesToDeduct = 0;

    if (disableLunchTimeDeduction && lunchTime) {
        const [startRaw, endRaw] = lunchTime.replace(/\s*-\s*/, "-").split("-");
        const startMin = parseFlexibleTime(startRaw); 
        const endMin = parseFlexibleTime(endRaw);

        if (startMin !== null && endMin !== null) {
            lunchMinutesToDeduct = endMin - startMin;
        }
    }

    

    const statCards = [
        {
            icon: 'bi-clock',
            accent: '#6366f1',
            bg: '#eef2ff',
            value: totalWorkedTime,
            label: 'Total Working Time',
            sub: `Since ${joiningDate}`,
        },
        {
            icon: 'bi-calendar-check',
            accent: '#22c55e',
            bg: '#f0fdf4',
            value: `${records.totalExtraWorkingDays} Days`,
            label: 'Extra Working Days',
            sub: convertDaysToYearsMonthsDays(records.totalExtraWorkingDays),
        },
        {
            icon: 'bi-calendar2-x',
            accent: '#f59e0b',
            bg: '#fffbeb',
            value: `${records.leaveDays} Days`,
            label: 'Total Leave Days',
            sub: convertDaysToYearsMonthsDays(records.leaveDays),
        },
        {
            icon: 'bi-alarm',
            accent: '#ef4444',
            bg: '#fef2f2',
            value: `${records.lateDays} Days`,
            label: 'Late Check-Ins',
            sub: convertDaysToYearsMonthsDays(records.lateDays),
        },
    ];

    return (
        <Card style={{ border: '1px solid #f0f0f0', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius: 99, display: 'inline-block' }} />
                <h5 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111827', letterSpacing: '-0.01em' }}>All Time Records</h5>
            </div>
            <Row>
                {statCards.map(({ icon, accent, bg, value, label, sub }) => (
                    <Col md={3} sm={6} className="mb-3" key={label}>
                        <div style={{
                            border: `1px solid ${accent}22`,
                            borderRadius: 14,
                            padding: '16px 18px',
                            background: '#fff',
                            boxShadow: `0 2px 8px ${accent}12`,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className={`bi ${icon}`} style={{ fontSize: 20, color: accent }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{value}</div>
                                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginTop: 4 }}>{label}</div>
                                {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        </Card>
    );
};

export default AllTimeRecords;
