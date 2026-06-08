import { Bar, Donut, Dumbell, HeatMap, MultipleRadialBar, Polar, ReportsTable, StatisticsTable, StokedCircle, StreakIndicator, TotalWorkingTime } from '@app/modules/common/components/Graphs';
import { usePagination } from '@pages/employee/attendance/personal/views/my-attendance/hooks/usePagination';
import { EXTRA_DAYS, HOLIDAYS, monthDays, resourceNameMapWithCamelCase } from '@constants/statistics';
import { saveFilteredPublicHolidays, saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import { RootState, store } from '@redux/store';
import { fetchAllPublicHolidays, fetchCompanyOverview, fetchConfiguration } from '@services/company';
import { fetchEmployeeLeaves } from '@services/employee';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { barMonthlyData, dumbellSeriesMonthlyData, fetchEmpMonthlyStatistics, multipleRadialBarData, pieAreaData, pieAreaLabels, donutaDataLabel, totalWorkingTime, getWorkingDaysInMonth, monthHeatMap, totalProgressPercent, allStreaksIndicator, customLeaves, getWorkingDaysInRange, formatDisplay, getWorkingDaysInRangeForTotalTime, filterLeavesPublicHolidays } from '@utils/statistics';
import { hasPermission } from '@utils/authAbac';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { useCallback, useEffect, useMemo, useState } from 'react';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
import { Container, Row } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { resourseAndView } from '@models/company';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { shouldShowBranchSetupGuide } from '@utils/shouldShowBranchSetupGuide';
import BranchSetupGuide from './components/BranchSetupGuide';
import { LeaveStatus } from '@constants/attendance';
import { countTotalWeekends } from '@utils/countTotalWeekend';
import Loader from '@app/modules/common/utils/Loader';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';
import { fetchAppSettings } from '@redux/slices/appSettings';
import LazySection from '@app/modules/common/components/LazySection';

const Monthly = ({ month, endDate, fromAdmin = false, resourseAndView, dateSettingsEnabled = false, checkOwnWithOthers=false }: { 
    month: Dayjs, 
    endDate: Dayjs,
    fromAdmin?: boolean, 
    resourseAndView: resourseAndView[],
    dateSettingsEnabled?: boolean,
    checkOwnWithOthers?: boolean
}) => {

    // NOTE: early return moved BELOW all hooks — React rules of hooks forbid returning before hooks
    const currentEmployeeWorkingAndOffDaysStr = useSelector((state: RootState) => state.employee?.currentEmployee?.branches?.workingAndOffDays);
    const selectedEmployeeWorkingAndOffDaysStr = useSelector((state: RootState) => state.employee?.selectedEmployee?.branches?.workingAndOffDays);
    // FIX: selectedEmployee may not have branches loaded in Redux when chosen from dropdown —
    // fall back to currentEmployee's branch to avoid false "Branch Setup Required" screen.
    const workingAndOffDaysStr = fromAdmin
        ? (selectedEmployeeWorkingAndOffDaysStr || currentEmployeeWorkingAndOffDaysStr)
        : currentEmployeeWorkingAndOffDaysStr;
    const workingAndOffDays = workingAndOffDaysStr ? JSON.parse(workingAndOffDaysStr) : undefined;
    const showBranchSetupGuide = shouldShowBranchSetupGuide(workingAndOffDays);

    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const dateOfJoining = useSelector((state: RootState) => fromAdmin? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
    // FIX: fall back to currentEmployee branch when selectedEmployee branch not loaded
    const weekends = fromAdmin
        ? (store.getState().employee.selectedEmployee?.branches?.workingAndOffDays
            || store.getState().employee.currentEmployee.branches?.workingAndOffDays)
        : store.getState().employee.currentEmployee.branches?.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");
    const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");
    const [dataLoaded, setDataLoaded] = useState(false);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);

    // Use custom pagination hook
    // const { pagination, setPagination, resetPagination } = usePagination(10);

    // // Reset pagination when month changes
    // useEffect(() => {
    //     resetPagination();
    // }, [month, endDate, resetPagination]);

    // Get raw data from Redux and filter monthly stats according to DateOfJoining
    const monthlyStats = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.monthly.filter((stat: any) => {
            const checkInDate = dayjs(stat.checkIn);
            return checkInDate.isSameOrAfter(dateOfJoining, 'day') && 
                   checkInDate.isSameOrBefore(endDate, 'day');
        });
    });

    const attendance = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        // debugger;
        return attendanceStats.monthlyTable;
    });
    // console.log("debugger:: ",attendance);
    
    const monthyRequestTable = useSelector((state: RootState) => state.attendanceStats.monthyRequestTable);

    const attendanceRequests = useMemo(() => {
        if (!monthyRequestTable?.length) return [];
        
        return monthyRequestTable.filter((request: any) => {
            const requestDate = dayjs(request.date);
            return requestDate.isSameOrAfter(dateOfJoining, 'day') && 
                   requestDate.isSameOrBefore(endDate, 'day');
        });
    }, [monthyRequestTable, dateOfJoining, endDate]);

    const filteredMonthlyStats = useMemo(() => {
        if (!monthlyStats?.length) return [];
        
        return monthlyStats.filter((stat: any) => {
            const checkInDate = dayjs(stat.checkIn);
            return checkInDate.isSameOrAfter(month.startOf('month'), 'day') && 
                   checkInDate.isSameOrBefore(endDate, 'day');
        });
    }, [monthlyStats, month, endDate]);

    const filteredAttendance = useMemo(() => {
        if (!attendance?.length) return [];
        return attendance.filter((day) => {
            const attendanceDate = dayjs(day.date);
            return attendanceDate.isSameOrAfter(month.startOf('month'), 'day') && 
                   attendanceDate.isSameOrBefore(endDate, 'day') && 
                   attendanceDate.isSameOrAfter(dateOfJoining, 'day');
        });
    }, [attendance, month, endDate, dateOfJoining]);

    const filteredLeaves = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredLeaves.filter((leave: any) => 
            dayjs(leave.date).isSameOrAfter(month.startOf('month'), 'day') && 
            dayjs(leave.date).isSameOrBefore(endDate, 'day')
        );
    });

    const approvedLeaves = filteredLeaves.filter((leave: any) => leave.status === LeaveStatus.Approved);   

    const filteredPublicHolidays = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredPublicHolidays.filter((holiday: any) => 
            dayjs(holiday.date).isSameOrAfter(month.startOf('month'), 'day') && 
            dayjs(holiday.date).isSameOrBefore(endDate, 'day')
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
            dispatch(saveLeaves(totalLeaves));
            dispatch(savePublicHolidays(publicHolidays));
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
            await fetchEmpMonthlyStatistics(month, fromAdmin, {
                startDate: month.startOf('month'),
                endDate: dateSettingsEnabled && month.isSame(dayjs(), 'month') 
                    ? endDate 
                    : month.endOf('month')
            });
            
            setDataLoaded(true);
        };
        
        loadData();
    }, [selectedEmployeeId, month, endDate, fromAdmin, toggleChange, dateSettingsEnabled, dispatch]);

    // Fetch working hours configuration
    useEffect(() => {
        const fetchWorkingHours = async () => {
            try {
                const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
                const jsonObject = JSON.parse(configuration.configuration.configuration);
                
                const totalWorkingHoursString = jsonObject["Working time"];
                const workingHoursNumber = parseFloat(totalWorkingHoursString.split(" ")[0]); 
                
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

    useEffect(() => {
        const startDate = dayjs(month).startOf('month').format('YYYY-MM-DD');
        //  const endDate = dayjs().endOf('year').format('YYYY-MM-DD');
        const filteredLeavesHolidays = filterLeavesPublicHolidays(dayjs(startDate).format('YYYY-MM-DD'), dayjs(endDate).format('YYYY-MM-DD'), true, false, true);
        dispatch(saveFilteredPublicHolidays(filteredLeavesHolidays?.publicHolidays));
      }, [dispatch])

    // Memoize totalWeekend count (computed value)
    const totalWeekendCount = useMemo(() => {
        return countTotalWeekends(
            month.format('YYYY-MM-DD'),
            endDate.format('YYYY-MM-DD'),
            filteredPublicHolidays,
            allWeekends
        );
    }, [month, endDate, filteredPublicHolidays, allWeekends]);
  
    // Memoize donutData based on weekend count
    const donutData = useMemo(() => 
        donutaDataLabel(
            filteredAttendance,
            filteredLeaves,
            filteredPublicHolidays,
            fromAdmin,
            totalWeekendCount
        ),
    [filteredAttendance, filteredLeaves, filteredPublicHolidays, fromAdmin, totalWeekendCount]);
    // debugger;
    
    const donutLabels = useMemo(() => Array.from(donutData.keys()), [donutData]);
    const donutSeries = useMemo(() => Array.from(donutData.values()), [donutData]);
    const multiRadialBarData = useMemo(() =>
        multipleRadialBarData(filteredMonthlyStats, dayWiseShifts),
        [filteredMonthlyStats, dayWiseShifts]
    );
    // debugger;
    
    const multipleRadialBarLabels = useMemo(() => 
        Array.from(multiRadialBarData.keys()), 
        [multiRadialBarData]
    );
    
    const multipleRadialBarSeries = useMemo(() => 
        Array.from(multiRadialBarData.values()), 
        [multiRadialBarData]
    );

    const polarLabels = useMemo(() => 
        pieAreaLabels(filteredMonthlyStats), 
        [filteredMonthlyStats]
    );
    
    const polarSeries = useMemo(() => 
        pieAreaData(filteredMonthlyStats), 
        [filteredMonthlyStats]
    ); 

    const dumbellSeriesData = useMemo(() => 
        dumbellSeriesMonthlyData(filteredMonthlyStats), 
        [filteredMonthlyStats]
    );

    const barOption = monthDays;
    const barSeriesData = useMemo(() => 
        barMonthlyData(filteredMonthlyStats), 
        [filteredMonthlyStats]
    );

    const today = dayjs();
    const isCurrentMonth = today.isSame(month, 'month');


    const workingStartDate = month.startOf('month');
    const workingEndDate = (dateSettingsEnabled && isCurrentMonth)
        ? today
        : month.endOf('month');
        
    const totalWorkingDay = useMemo(() => 
        getWorkingDaysInRange(workingStartDate, workingEndDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays),
        [workingStartDate, workingEndDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays]
    );


    // setTotalAllowedMinutesForOutOffValue(totalMinutesForOutOffValue || 0);
    
    const findIsWeekendTrueAndCount = filteredPublicHolidays.filter((holiday: any) => holiday.isWeekend === true).length;
    const workedOnHolidaOrWeekend = donutData.get(EXTRA_DAYS) || 0;
    const actualTotalWorkingDay = (totalWorkingDay - findIsWeekendTrueAndCount) + workedOnHolidaOrWeekend;

    const holidays = donutData.get(HOLIDAYS) || 0;
    const leaves = donutData.get("Leaves") || 0;
    
    const stokedCircleSeries = useMemo(() => 
        [totalProgressPercent(filteredAttendance, actualTotalWorkingDay)],
        [filteredAttendance, actualTotalWorkingDay]
    );

    const heatMapSeries = useMemo(() => 
        monthHeatMap(filteredAttendance, month, dateSettingsEnabled, fromAdmin, totalWeekendCount),
        [filteredAttendance, month, dateSettingsEnabled, fromAdmin, totalWeekendCount]
    );


    const [hoursPart, minutesPart] = totalWorkingHours.split(" ");
    const hours = parseInt(hoursPart.replace("h", ""), 10) || 0;
    const minutes = parseInt(minutesPart.replace("m", ""), 10) || 0;
        
    // convert everything to minutes
    const totalMinutes = hours * 60 + minutes;
    const totalAllowedTimeForOutOffValue = useMemo(() => {

        const days  =  getWorkingDaysInRangeForTotalTime(workingStartDate, workingEndDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays) || 0;
        const totalMinutesFinal = days*totalMinutes || 0;
        // convert back to h m format
        const finalHours = Math.floor(totalMinutesFinal / 60);
        const finalMinutes = totalMinutesFinal % 60;
        const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;   
        return totalAllowedTime;
    },
        [workingStartDate, workingEndDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays, totalMinutes]
    );

    const totalAllowedMinutes = (actualTotalWorkingDay - leaves) * totalMinutes;
    
    // convert back to h m format
    const finalHours = Math.floor(totalAllowedMinutes / 60);
    const finalMinutes = totalAllowedMinutes % 60;
    
    const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;    

    
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

    // All hooks have run — safe to conditionally render
    if (showBranchSetupGuide) {
        return <BranchSetupGuide />;
    }

    if (!dataLoaded) {
        return <Loader />;
    }


    return (
        <>
            <Row className="mt-7">
                <Donut donutLabels={donutLabels} donutSeries={donutSeries} totalDays={actualTotalWorkingDay} />
                <MultipleRadialBar multipleRadialBarLabels={multipleRadialBarLabels} multipleRadialBarSeries={multipleRadialBarSeries} totalWorkingDays={actualTotalWorkingDay} />
                <Polar polarLabels={polarLabels} polarSeries={polarSeries} totalDays={actualTotalWorkingDay} />
                <StokedCircle stokedCircleSeries={stokedCircleSeries} totalWorkedDays={totalWorkedDays} totalDays={actualTotalWorkingDay} />
                <StreakIndicator 
                    currentStreak={allStreaksIndicator(filteredMonthlyStats, isCurrentMonth)[0].toString()} 
                    lastStreak={allStreaksIndicator(filteredMonthlyStats, isCurrentMonth)[1].toString()} 
                    totalDays={actualTotalWorkingDay} />
                <TotalWorkingTime totalWorkingTime={calculateTotalDuration(filteredMonthlyStats)} totalAllowedTime={totalAllowedTimeForOutOffValue} />
            </Row>

            <Dumbell dumbellSeriesData={dumbellSeriesData} height={250} totalWorkedDays={totalWorkedDays} totalDays={actualTotalWorkingDay} />
            <Bar barOption={barOption} barSeriesData={barSeriesData} height={250} totalWorkingTime={calculateTotalDuration(filteredMonthlyStats)} totalAllowedTime={totalAllowedTime} />
            <HeatMap heatMapSeries={heatMapSeries} height={135} totalDays={actualTotalWorkingDay} />

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
                    attendance={filteredAttendance}
                    attendanceRequests={attendanceRequests}
                    fromAdmin={fromAdmin}
                    location={filteredMonthlyStats}
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

export default Monthly;