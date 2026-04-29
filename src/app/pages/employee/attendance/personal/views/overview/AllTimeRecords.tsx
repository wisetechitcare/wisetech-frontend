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

    

    return (
        <Card className="p-4">
            <h5>All time Records</h5>
            <Row className="text-center mt-3">
                <Col md={3} className='mb-3'>
                    <Card className="border p-4">
                        <div className="d-flex flex-column text-start">
                            <i className="bi bi-clock fs-2 mb-2"></i>
                            <div className="fs-4 fw-bold">{totalWorkedTime}</div>
                            <div className="text-muted">Total Working Time</div>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                Joined {joiningDate}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col md={3} className='mb-3'>
                    <Card className="border p-4">
                        <div className="d-flex flex-column text-start">
                            <i className="bi bi-calendar-check fs-2 mb-2"></i>
                            <div className="fs-4 fw-bold">{records.totalExtraWorkingDays} Days</div>
                            <div className="text-muted">Total Extra Working Days</div>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {convertDaysToYearsMonthsDays(records.totalExtraWorkingDays)}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col md={3} className='mb-3'>
                    <Card className="border p-4">
                        <div className="d-flex flex-column text-start">
                            <i className="bi bi-calendar2-x fs-2 mb-2"></i>
                            <div className="fs-4 fw-bold">{records.leaveDays} Days</div>
                            <div className="text-muted">Total Leave Days</div>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {convertDaysToYearsMonthsDays(records.leaveDays)}
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col md={3} className='mb-3'>
                    <Card className="border p-4">
                        <div className="d-flex flex-column text-start">
                            <i className="bi bi-calendar2-event fs-2 mb-2"></i>
                            <div className="fs-4 fw-bold">{records.lateDays} Days</div>
                            <div className="text-muted">Total Late Check-Ins</div>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {convertDaysToYearsMonthsDays(records.lateDays)}
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Card>
    );
};

export default AllTimeRecords;
