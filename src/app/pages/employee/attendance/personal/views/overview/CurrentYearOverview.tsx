import { EXTRA_DAYS, LATE_CHECKIN, PRESENT } from '@constants/statistics';
import { Attendance, CustomLeaves } from '@models/employee';
import { RootState, store } from '@redux/store';
import { fetchEmployeeLeaveBalance, fetchEmployeeLeaves } from '@services/employee';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { donutaDataLabel, getWorkingDaysInRange, getWorkingDaysInYear, multipleRadialBarData, totalWorkingTime } from '@utils/statistics';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Image } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { customLeaves, filterLeavesPublicHolidays, handleDatesChange, leavesBalance } from "@utils/statistics";
import { saveLeaves } from '@redux/slices/attendanceStats';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';

interface CurrentYearOverviewProps {
    yearlyStats: Attendance[];
    startDate?: string;
    endDate?: string;
    showLevesColumn?: boolean;
    fiscalYearDisplay?: string;
    fromAdmin?: boolean;
}

const CurrentYearOverview: React.FC<CurrentYearOverviewProps> = ({ yearlyStats, showLevesColumn, startDate, endDate, fiscalYearDisplay, fromAdmin }) => {
    const checkInCheckOut = useSelector((state: RootState) => state.attendance.openModal);
    const holidays = useSelector((state: RootState) => state.attendanceStats.filteredPublicHolidays);  
    const weekends = store.getState().employee.currentEmployee.branches?.workingAndOffDays;
    const leaveManagement = store.getState().featureConfiguration?.leaveManagement;
    const disableLunchTimeDeduction = store.getState().featureConfiguration?.disableLaunchDeductionTime;

    const lunchTime = leaveManagement?.["Lunch Time"];
    const allWeekends = JSON.parse(weekends || "{}");  
    const presentDay = donutaDataLabel(yearlyStats).get(PRESENT);
    const extraDay = donutaDataLabel(yearlyStats).get(EXTRA_DAYS);
    
    
    const totalWorkingDay = getWorkingDaysInRange(dayjs(startDate), dayjs(endDate), true, allWeekends, holidays );

    const selectedEmployeeId = useSelector((state: RootState) => state.employee.selectedEmployee?.id);
    const currentEmployeeId = useSelector((state:RootState) => state?.employee?.currentEmployee?.id);

    const [totalLeavesCount, setTotalLeavesCount] = useState(0);
    const [leaveBalances, setLeaveBalances] = useState<number>(0);
    const [leavesTaken, setLeavesTaken] = useState(0);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);
    const dispatch = useDispatch();

    // const totalMinutes = totalWorkingTime(yearlyStats);
    const totalWorkedTime = calculateTotalDuration(yearlyStats);

    const lateCheckIns = multipleRadialBarData(yearlyStats, dayWiseShifts).get(LATE_CHECKIN);

    useEffect(() => {
        async function fetchLeaves() {
            const employeeId = (selectedEmployeeId && selectedEmployeeId !== '' && fromAdmin) ? selectedEmployeeId : currentEmployeeId;
        
            if (!employeeId) return;
            
            const { data: { leaves } } = await fetchEmployeeLeaves(selectedEmployeeId ?? currentEmployeeId);
            const totalLeaves = await customLeaves(leaves);
            dispatch(saveLeaves(totalLeaves));
            const filteredLeavesHolidays = filterLeavesPublicHolidays(startDate!, endDate!, true);
            setTotalLeavesCount(filteredLeavesHolidays!.customLeaves.length || 0);
        }

        fetchLeaves();

    }, [selectedEmployeeId, checkInCheckOut, startDate, endDate]);

    // Fetch day-wise shifts
    useEffect(() => {
        async function loadDayWiseShifts() {
            try {
                const response = await fetchDayWiseShifts();
                setDayWiseShifts(response.data || []);
            } catch (error) {
                console.error("Error fetching day-wise shifts:", error);
                setDayWiseShifts([]); // Use empty array as fallback
            }
        }
        loadDayWiseShifts();
    }, []);

   const fetchEmployeeLeaveBlance = async () => {
    if(!selectedEmployeeId) return;
    try {
        
        const { data: { leavesSummary } } = await fetchEmployeeLeaveBalance(selectedEmployeeId);
        
        const allLeaveBlanceCount = leavesSummary?.filter((leave:any) => leave.leaveType !== 'Unpaid Leaves').reduce((total:any, leave:any) => total + leave.numberOfDays, 0);
        const leavesTakenCount = leavesSummary?.map((l:any) => l.leaveTaken).reduce((a:any, b:any) => a + b, 0) || 0;
        
        setLeaveBalances(allLeaveBlanceCount);
        setLeavesTaken(leavesTakenCount)
        
    } catch (error) {
        console.error("Error fetching leave balances:", error);
    }
};
    

    useEffect(() => {
        fetchEmployeeLeaveBlance();
    }, [selectedEmployeeId, checkInCheckOut, startDate, endDate]);


    // const totalWorkingDayInYear = useMemo(() => {
    //     return getWorkingDaysInRange(year, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays);
    // }, [year, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays]);

    // const findIsWeekendTrueAndCount = filteredPublicHolidays.filter((holiday: any) => holiday.isWeekend === true).length;
    // const workedOnHolidaOrWeekend = donutaDataLabel(yearlyStats).get(EXTRA_DAYS) || 0;
    // const actualTotalWorkingDayInYear = (totalWorkingDayInYear - findIsWeekendTrueAndCount) + workedOnHolidaOrWeekend;
    

    return (
        <>
            <Card className="p-4 mt-4">
                <h5>Overview for {fiscalYearDisplay}</h5>
                <Row className="text-center mt-3">
                    <Col className='mb-2'>
                        <Card className="border p-4">
                            <div className="d-flex align-items-center">
                                <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border me-3" style={{ width: '50px', height: '50px' }}>
                                    <i className="bi bi-calendar-check fs-2"></i>
                                </div>
                                <div className="text-start">
                                    <div className="fs-4 fw-bold">{!Number.isNaN(presentDay! + extraDay!) ? presentDay! + extraDay! : 0}/{totalWorkingDay}</div>
                                    <div className="text-muted">Working Days</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col>
                        <Card className="border p-4">
                            <div className="d-flex align-items-center">
                                <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border me-3" style={{ width: '50px', height: '50px' }}>
                                    <i className="bi bi-clock fs-2"></i>
                                </div>
                                <div className="text-start">
                                    <div className="fs-4 fw-bold">{totalWorkedTime}</div>
                                    <div className="text-muted">Working Time</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col>
                        <Card className="border p-4">
                            <div className="d-flex align-items-center">
                                <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border me-3" style={{ width: '50px', height: '50px' }}>
                                    <i className="bi bi-calendar2-event fs-2"></i>
                                </div>
                                <div className="text-start">
                                    <div className="fs-4 fw-bold">{lateCheckIns} Days</div>
                                    <div className="text-muted">Late Check-Ins</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    {showLevesColumn && <Col>
                        <Card className="border p-4">
                            <div className="d-flex align-items-center">
                                <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border me-3" style={{ width: '50px', height: '50px' }}>
                                    <i className="bi bi-calendar-event fs-2"></i>
                                </div>
                                <div className="text-start">
                                    <div className="fs-4 fw-bold">{leavesTaken}/{leaveBalances}</div>
                                    <div className="text-muted">Leaves Taken</div>
                                </div>
                            </div>
                        </Card>
                    </Col>}
                </Row>
            </Card>
        </>
    );
}

export default CurrentYearOverview;