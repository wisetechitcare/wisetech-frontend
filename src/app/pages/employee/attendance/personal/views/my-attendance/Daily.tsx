import { Polar, ProgessBar, ReportsTable, StatisticsTable, TotalWorkingTime } from '@app/modules/common/components/Graphs';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { resourseAndView } from '@models/company';
import { RootState } from '@redux/store';
import { fetchConfiguration } from '@services/company';
import { calculateDuration, convertToTimeZone, formatTime } from '@utils/date';
import { shouldShowBranchSetupGuide } from '@utils/shouldShowBranchSetupGuide';
import { currentDayWorkingHours, fetchEmpDailyStatistics, filterLeavesPublicHolidays, formatDisplay, pieAreaData, pieAreaLabels, todayProgressPercent } from '@utils/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { Row } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import BranchSetupGuide from './components/BranchSetupGuide';
import { LeaveStatus } from '@constants/attendance';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';
import { fetchAppSettings } from '@redux/slices/appSettings';
import LazySection from '@app/modules/common/components/LazySection';
import { saveFilteredPublicHolidays } from '@redux/slices/attendanceStats';

const Daily = ({ day, fromAdmin = false, resourseAndView, checkOwnWithOthers = false }: { day: Dayjs, fromAdmin?: boolean, resourseAndView: resourseAndView[], checkOwnWithOthers?: boolean }) => {
    const dispatch = useDispatch<any>();
    // If no working days found or branch return message
    const workingAndOffDaysStr = useSelector((state: RootState) =>state.employee?.currentEmployee?.branches?.workingAndOffDays);
    const workingAndOffDays = workingAndOffDaysStr ? JSON.parse(workingAndOffDaysStr) : undefined;
    if (shouldShowBranchSetupGuide(workingAndOffDays)) {
        return <BranchSetupGuide />;
    }

    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);

    const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");

    const dailyStats = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.daily;
    });
    
    const attendance = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.dailyTable;
    });

    const attendanceRequests = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.dailyRequestTable;
    });
    const filteredLeaves = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredLeaves.filter((leave: any) => 
            dayjs(leave.date).format('YYYY-MM-DD') == day.format('YYYY-MM-DD')
        );
    });
    const approvedLeaves = filteredLeaves.filter((leave: any) => leave.status === LeaveStatus.Approved);

    const mumbaiTz = 'Asia/Kolkata';

    useEffect(() => {
        fetchEmpDailyStatistics(day, fromAdmin);
    }, [selectedEmployeeId, toggleChange, day, fromAdmin]);

    // get working hours
    const fetchWorkingHours = async () => {
        const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
        const jsonObject = JSON.parse(configuration.configuration.configuration);

        const totalWorkingHoursString = jsonObject["Working time"];
        const workingHoursNumber = parseFloat(totalWorkingHoursString.split(" ")[0]);

        setTotalWorkingHours(formatDisplay(totalWorkingHoursString));

    };
    useEffect(() => {
        fetchWorkingHours();
    }, []);



    const progessBarSeries: number[] = [todayProgressPercent(dailyStats)];

    const polarLabels: string[] = pieAreaLabels(dailyStats);
    const polarSeries: number[] = pieAreaData(dailyStats);

    // Calculate total working time and allowed time
    const totalWorkingTime = calculateTotalDuration(dailyStats[0]);
    const totalAllowedTime = `${totalWorkingHours}`; 
    const totalWorkingDay = 1;

    return (
        <>
            <Row className='mt-7' >
                <ProgessBar 
                    progessBarSeries={progessBarSeries}
                    checkIn={dailyStats && dailyStats.length > 0 ? 
                        formatTime(convertToTimeZone(dailyStats[0]?.checkIn, mumbaiTz)) : 
                        'N/A'}
                    checkOut={dailyStats && dailyStats.length > 0 && dailyStats[0]?.checkOut != null ?
                        formatTime(convertToTimeZone(dailyStats[0]?.checkOut, mumbaiTz)) :
                        'N/A'} 
                    totalWorkingHours={totalWorkingTime} 
                    totalAllowedHours={totalAllowedTime} 
                />
                <TotalWorkingTime totalWorkingTime={totalWorkingTime} totalAllowedTime={totalAllowedTime} />
                <Polar polarLabels={polarLabels} polarSeries={polarSeries} totalDays={totalWorkingDay} />
            </Row>

            <LazySection minHeight="300px" rootMargin="200px">
                <h3 className='pt-5 fw-bold font-barlow'>Open Attendance Request</h3>
                <ReportsTable
                    attendanceRequests={attendanceRequests}
                    fromAdmin={fromAdmin}
                    resource={resourseAndView[0].resource}
                    viewOwn={resourseAndView[0].viewOwn}
                    viewOthers={resourseAndView[0].viewOthers}
                    checkOwnWithOthers={checkOwnWithOthers}
                />
            </LazySection>

            <LazySection minHeight="400px" rootMargin="200px">
                <h3 className='pt-8 fw-bold font-barlow'>Report</h3>
                <StatisticsTable
                    approvedLeaves={approvedLeaves}
                    attendance={attendance}
                    attendanceRequests={attendanceRequests}
                    fromAdmin={fromAdmin} location={dailyStats}
                    resource={resourseAndView[1].resource}
                    viewOwn={resourseAndView[1].viewOwn}
                    viewOthers={resourseAndView[1].viewOthers}
                    checkOwnWithOthers={checkOwnWithOthers}
                />
            </LazySection>
        </>
    );
};

export default Daily;
