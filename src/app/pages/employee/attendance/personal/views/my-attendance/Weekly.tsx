import { Bar, Donut, Dumbell, HeatMap, MultipleRadialBar, Polar, ReportsTable, StatisticsTable, StreakIndicator, TotalWorkingTime } from '@app/modules/common/components/Graphs';
import { usePagination } from '@pages/employee/attendance/personal/views/my-attendance/hooks/usePagination';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { weekDays, HOLIDAYS, EXTRA_DAYS } from '@constants/statistics';
import { resourseAndView } from '@models/company';
import { saveFilteredPublicHolidays, saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { RootState, store } from '@redux/store';
import { fetchAllPublicHolidays, fetchCompanyOverview, fetchConfiguration } from '@services/company';
import { fetchEmployeeLeaves } from '@services/employee';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { errorConfirmation } from '@utils/modal';
import { shouldShowBranchSetupGuide } from '@utils/shouldShowBranchSetupGuide';
import {
    barWeeklyData,
    dumbellSeriesWeeklyData,
    fetchEmpWeeklyStatistics,
    multipleRadialBarData,
    pieAreaData,
    pieAreaLabels,
    donutaDataLabel,
    totalWorkingTime,
    customLeaves,
    weekHeatMap,
    allStreaksIndicator,
    countWeekdays,
    getWorkingDaysInRange,
    formatDisplay,
    getWorkingDaysInRangeForTotalTime,
    filterLeavesPublicHolidays
} from '@utils/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Col, Row, Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import BranchSetupGuide from './components/BranchSetupGuide';
import { LeaveStatus } from '@constants/attendance';
import { countTotalWeekends } from '@utils/countTotalWeekend';
import Loader from '@app/modules/common/utils/Loader';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';
import { fetchAppSettings } from '@redux/slices/appSettings';
import LazySection from '@app/modules/common/components/LazySection';

const Weekly = ({ 
    startWeek, 
    endWeek, 
    fromAdmin = false, 
    resourseAndView, 
    dateSettingsEnabled = false,
    checkOwnWithOthers = false 
}: { 
    startWeek: Dayjs, 
    endWeek: Dayjs, 
    fromAdmin?: boolean, 
    resourseAndView: resourseAndView[],
    dateSettingsEnabled?: boolean,
    checkOwnWithOthers?: boolean
}) => {

    // If no working days found or branch return message
    const workingAndOffDaysStr = useSelector((state: RootState) =>state.employee?.currentEmployee?.branches?.workingAndOffDays);
    const workingAndOffDays = workingAndOffDaysStr ? JSON.parse(workingAndOffDaysStr) : undefined;
    if (shouldShowBranchSetupGuide(workingAndOffDays)) {
        return <BranchSetupGuide />;
    }

    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const dateOfJoining = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
    const weekends = store.getState().employee.currentEmployee.branches?.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");
    const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");
    const [dataLoaded, setDataLoaded] = useState(false);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);

    // Use custom pagination hook
    // const { pagination, setPagination, resetPagination } = usePagination(10);

    // // Reset pagination when week changes
    // useEffect(() => {
    //     resetPagination();
    // }, [startWeek, endWeek, resetPagination]);

    // Get raw data from Redux
    const weeklyStats = useSelector((state: RootState) => state.attendanceStats.weekly);
    const attendance = useSelector((state: RootState) => state.attendanceStats.weeklyTable);
    const attendanceRequests = useSelector((state: RootState) => state.attendanceStats.weeklyRequestTable.filter((request: any) => {
        const requestDate = dayjs(request.date);
        return requestDate.isSameOrAfter(dateOfJoining, 'day') && 
               requestDate.isSameOrBefore(endWeek, 'day');
    }));


    const today = dayjs();
    const isCurrentWeek = today.isAfter(startWeek, 'day') && today.isBefore(endWeek, 'day') || 
                          today.isSame(startWeek, 'day') || today.isSame(endWeek, 'day');
    
    const effectiveEndDate = useMemo(() => {
        if (dateSettingsEnabled && isCurrentWeek) {
            return today;
        }
        return endWeek;
    }, [dateSettingsEnabled, isCurrentWeek, today, endWeek]);
    
    // Apply consistent filtering to all date-dependent data
    const filteredWeeklyStats = useMemo(() => {
        if (!weeklyStats?.length) return [];
        
        return weeklyStats.filter((stat: any) => {
            const checkInDate = dayjs(stat.checkIn);
            return checkInDate.isSameOrAfter(startWeek, 'day') && 
                   checkInDate.isSameOrBefore(effectiveEndDate, 'day');
        });
    }, [weeklyStats, startWeek, effectiveEndDate]);

    // In FilteredWeekely stats include data from attendance like checkin and checkin 
//     const data : any = [];
//     attendance.map((day: any) => {
//         if(day.checkIn === '-' && day.checkOut == '-' ){
//             data.push({
//                 employeeId:day.employeeId,
//                 day: day.date,
//                 checkIn: day.checkIn,
//                 checkOut: day.checkOut,
//                 status: day.status,
//                 date:day.date,
//                 duration: day.duration
//             })
//         }
//     })

    const filteredAttendance = useMemo(() => {
        if (!attendance?.length) return [];
        
        return attendance.filter((day: any) => {
            const attendanceDate = dayjs(day.date);
            return attendanceDate.isSameOrAfter(startWeek, 'day') && 
                   attendanceDate.isSameOrBefore(effectiveEndDate, 'day') && 
                   attendanceDate.isSameOrAfter(dateOfJoining, 'day');
        });
    }, [attendance, startWeek, effectiveEndDate, dateOfJoining]);

    const filteredLeaves = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredLeaves.filter((leave: any) => 
            dayjs(leave.date).isSameOrAfter(startWeek, 'day') && 
            dayjs(leave.date).isSameOrBefore(effectiveEndDate, 'day')
        );
    });

    const approvedLeaves = filteredLeaves.filter((leave: any) => leave.status === LeaveStatus.Approved);

    const filteredPublicHolidays = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredPublicHolidays.filter((holiday: any) => 
            dayjs(holiday.date).isSameOrAfter(startWeek, 'day') && 
            dayjs(holiday.date).isSameOrBefore(effectiveEndDate, 'day')
        );
    });

    // Fetch leaves and public holidays
    const fetchLeavesPublicHolidays = async () => {
        if (!selectedEmployeeId) {
            console.error("employeeID not found");
            return;
        }
        
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            
            const { data: { leaves } } = await fetchEmployeeLeaves(selectedEmployeeId);
            const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);

            const totalLeaves = await customLeaves(leaves);
            
            const today = dayjs();
            const isCurrentWeek = today.isAfter(startWeek, 'day') && today.isBefore(endWeek, 'day') || 
                                  today.isSame(startWeek, 'day') || today.isSame(endWeek, 'day');
            const effectiveEndDate = dateSettingsEnabled && isCurrentWeek ? today : endWeek;
                
            // Always filter by date range
            const filteredLeaves = totalLeaves.filter((leave) => 
                dayjs(leave.date).isSameOrBefore(effectiveEndDate, 'day') && 
                dayjs(leave.date).isSameOrAfter(startWeek, 'day')
            );
            
            const filteredHolidays = publicHolidays.filter((holiday: any) => 
                dayjs(holiday.date).isSameOrBefore(effectiveEndDate, 'day') && 
                dayjs(holiday.date).isSameOrAfter(startWeek, 'day')
            );
            
            dispatch(saveLeaves(filteredLeaves));
            dispatch(savePublicHolidays(filteredHolidays));
        } catch (error) {
            console.error("Error fetching leaves and holidays:", error);
        }
    };

    // Data fetching effect
    useEffect(() => {
        if (!selectedEmployeeId) return;
        
        const loadData = async () => {
            setDataLoaded(false);
            
            if (fromAdmin) {
                await fetchLeavesPublicHolidays();
            }
            
            // Fetch statistics with the correct date range
            const today = dayjs();
            const isCurrentWeek = today.isAfter(startWeek, 'day') && today.isBefore(endWeek, 'day') || 
                                  today.isSame(startWeek, 'day') || today.isSame(endWeek, 'day');
            const effectiveEndDate = dateSettingsEnabled && isCurrentWeek ? today : endWeek;
            
            // Pass the correct date range to fetchEmpWeeklyStatistics
            await fetchEmpWeeklyStatistics(startWeek, effectiveEndDate, fromAdmin);
            
            setDataLoaded(true);
        };
        
        loadData();
    }, [selectedEmployeeId, startWeek, endWeek, fromAdmin, toggleChange, dateSettingsEnabled]);

    // Fetch working hours configuration
    useEffect(() => {
        const fetchWorkingHours = async () => {
            try {
                const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
                const jsonObject = JSON.parse(configuration.configuration.configuration);
                
                const totalWorkingHoursString = jsonObject["Working time"];
                // const workingHoursNumber = parseFloat(totalWorkingHoursString.split(" ")[0]); 
                
                setTotalWorkingHours(formatDisplay(totalWorkingHoursString));
            } catch (error) {
                console.error("Error fetching working hours:", error);
                setTotalWorkingHours("0h 0m"); // Default fallback
            }
        };
        
        fetchWorkingHours();
    }, []);

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

     // Memoize totalWeekend count (computed value)
        const totalWeekendCount = useMemo(() => {
            return countTotalWeekends(
                startWeek.format('YYYY-MM-DD'),
                endWeek.format('YYYY-MM-DD'),
                filteredPublicHolidays,
                allWeekends
            );
        }, [startWeek, endWeek, filteredPublicHolidays, allWeekends]);
        
    // Calculate total working days and holidays for the week
    const totalWorkingDay = useMemo(() => 
        getWorkingDaysInRange(startWeek, endWeek, dateSettingsEnabled, allWeekends, filteredPublicHolidays),
        [startWeek, endWeek, dateSettingsEnabled, allWeekends, filteredPublicHolidays]
    );


    const findIsWeekendTrueAndCount = filteredPublicHolidays.filter((holiday: any) => holiday.isWeekend === true).length;
    

    // Memoize all chart data calculations
    const donutData = useMemo(() => 
        donutaDataLabel(filteredAttendance, filteredLeaves, filteredPublicHolidays, fromAdmin, totalWeekendCount), 
        [filteredAttendance, filteredLeaves, filteredPublicHolidays,fromAdmin, totalWeekendCount]
    );

    const workedOnHolidaOrWeekend = donutData.get(EXTRA_DAYS) || 0;
    const actualTotalWorkingDay = (totalWorkingDay - findIsWeekendTrueAndCount) + workedOnHolidaOrWeekend;
    
    const donutLabels = useMemo(() => Array.from(donutData.keys()), [donutData]);
    const donutSeries = useMemo(() => Array.from(donutData.values()), [donutData]);

    const multiRadialBarData = useMemo(() =>
        multipleRadialBarData(filteredWeeklyStats, dayWiseShifts),
        [filteredWeeklyStats, dayWiseShifts]
    );
    
    const multipleRadialBarLabels = useMemo(() => 
        Array.from(multiRadialBarData.keys()), 
        [multiRadialBarData]
    );
    
    const multipleRadialBarSeries = useMemo(() => 
        Array.from(multiRadialBarData.values()), 
        [multiRadialBarData]
    );

    const polarLabels = useMemo(() => 
        pieAreaLabels(filteredWeeklyStats), 
        [filteredWeeklyStats]
    );
    
    const polarSeries = useMemo(() => 
        pieAreaData(filteredWeeklyStats), 
        [filteredWeeklyStats]
    );

    const dumbellSeriesData = useMemo(() => 
        dumbellSeriesWeeklyData(filteredWeeklyStats), 
        [filteredWeeklyStats]
    );

    const barOption = weekDays;
    const barSeriesData = useMemo(() => 
        barWeeklyData(filteredWeeklyStats), 
        [filteredWeeklyStats]
    );

    const heatMapSeries = useMemo(() => 
        weekHeatMap(filteredAttendance, startWeek, effectiveEndDate, fromAdmin), 
        [filteredAttendance, startWeek, effectiveEndDate, fromAdmin]
    );

    const holidays = donutData.get(HOLIDAYS) || 0;
    const leaves = donutData.get("Leaves") || 0;

    // const totalWorkingHours = "8h 30m";

    const [hoursPart, minutesPart] = totalWorkingHours.split(" ");
    const hours = parseInt(hoursPart.replace("h", ""), 10) || 0;
    const minutes = parseInt(minutesPart.replace("m", ""), 10) || 0;
    
    // convert everything to minutes
    const totalMinutes = hours * 60 + minutes;

    const totalAllowedTimeForOutOffValue = useMemo(() => {
        const days  =  getWorkingDaysInRangeForTotalTime(startWeek, endWeek, dateSettingsEnabled, allWeekends, filteredPublicHolidays) || 0;
        const totalMinutesFinal = days*totalMinutes || 0;
        // convert back to h m format
        const finalHours = Math.floor(totalMinutesFinal / 60);
        const finalMinutes = totalMinutesFinal % 60;
        const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;   
        return totalAllowedTime;
    },
        [startWeek, endWeek, dateSettingsEnabled, allWeekends, filteredPublicHolidays, totalMinutes]
    );
    
    const totalAllowedMinutes = (actualTotalWorkingDay - leaves) * totalMinutes;
    
    // convert back to h m format
    const finalHours = Math.floor(totalAllowedMinutes / 60);
    const finalMinutes = totalAllowedMinutes % 60;
    
    const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;
    
    useEffect(() => {
        //  const endDate = dayjs().endOf('year').format('YYYY-MM-DD');
        const filteredLeavesHolidays = filterLeavesPublicHolidays(dayjs(startWeek).format('YYYY-MM-DD'), dayjs(endWeek).format('YYYY-MM-DD'), true, false, true);
        dispatch(saveFilteredPublicHolidays(filteredLeavesHolidays?.publicHolidays));

        }, [dispatch])

    const calculateWorkedDays = (attendance: any[]) => {
        return attendance.filter((day) => 
            day.checkIn && day.checkIn !== "-NA-" && day.checkIn !== "-" &&
            day.checkOut && day.checkOut !== "-NA-" && day.checkOut !== "-"
        ).length;
    };

    const totalWorkedDays = useMemo(() => 
        calculateWorkedDays(filteredAttendance),
        [filteredAttendance]
    );

    if (!dataLoaded) {
        return <Loader/>
    }

    return (
        <>
            <Row className="mt-7">
                <Donut donutLabels={donutLabels} donutSeries={donutSeries} totalDays={actualTotalWorkingDay} />
                <MultipleRadialBar multipleRadialBarLabels={multipleRadialBarLabels} multipleRadialBarSeries={multipleRadialBarSeries} totalWorkingDays={actualTotalWorkingDay} />
                <Polar polarLabels={polarLabels} polarSeries={polarSeries} totalDays={actualTotalWorkingDay} />
                
                
                <Col md={4} className="mb-4">
                    <Dumbell dumbellSeriesData={dumbellSeriesData} cardHeight={true} height={220} totalWorkedDays={totalWorkedDays} totalDays={actualTotalWorkingDay} />
                </Col>
                <Col md={4} className="mb-4">
                    <Bar barOption={barOption} barSeriesData={barSeriesData} cardHeight={true} height={220} totalWorkingTime={calculateTotalDuration(filteredWeeklyStats)} totalAllowedTime={totalAllowedTime} />
                </Col>
                {/* <StreakIndicator 
                    currentStreak={allStreaksIndicator(filteredWeeklyStats, dayjs().format('MM') === startWeek.format('MM'))[0].toString()} 
                    lastStreak={allStreaksIndicator(filteredWeeklyStats, dayjs().format('MM') === endWeek.format('MM'))[1].toString()}  
                    totalDays={actualTotalWorkingDay}
                />                 */}
                <TotalWorkingTime totalWorkingTime={calculateTotalDuration(filteredWeeklyStats)} totalAllowedTime={totalAllowedTimeForOutOffValue} />
                
                <Col md={12} className="mb-4">
                    <HeatMap heatMapSeries={heatMapSeries} height={135} totalDays={actualTotalWorkingDay} />
                </Col>
            </Row>

            <LazySection minHeight="300px" rootMargin="200px">
                <h3 className='pt-4 fw-bold font-barlow'>Open Attendance Request</h3>
                <ReportsTable
                    resource={resourseAndView[0].resource}
                    attendanceRequests={attendanceRequests}
                    fromAdmin={fromAdmin}
                    viewOwn={resourseAndView[0].viewOwn}
                    viewOthers={resourseAndView[0].viewOthers}
                    checkOwnWithOthers={checkOwnWithOthers}
                />
            </LazySection>

            <LazySection minHeight="400px" rootMargin="200px">
                <h3 className='pt-8 fw-bold font-barlow'>Report</h3>
                <StatisticsTable
                    approvedLeaves={approvedLeaves}
                    attendance={filteredAttendance}
                    attendanceRequests={attendanceRequests}
                    fromAdmin={fromAdmin}
                    location={filteredWeeklyStats}
                    resource={resourseAndView[1].resource}
                    viewOwn={resourseAndView[1].viewOwn}
                    viewOthers={resourseAndView[1].viewOthers}
                    checkOwnWithOthers={checkOwnWithOthers}
                    manualPagination={false}
                    // rowCount={filteredAttendance.length}
                    // onPaginationChange={setPagination}
                    // paginationState={pagination}
                    isLoading={false}
                />
            </LazySection>
        </>
    );
};

export default Weekly;