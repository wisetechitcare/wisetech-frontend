import { Bar, Donut, HeatMap, MultipleRadialBar, Polar, ReportsTable, StokedCircle, StatisticsTable, StreakIndicator, TotalWorkingTime } from '@app/modules/common/components/Graphs';
import { EXTRA_DAYS, HOLIDAYS, months } from '@constants/statistics';
import { saveLeaves, savePublicHolidays } from '@redux/slices/attendanceStats';
import { RootState, store } from '@redux/store';
import { fetchAllPublicHolidays, fetchCompanyOverview, fetchConfiguration } from '@services/company';
import { fetchEmployeeLeaves } from '@services/employee';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { barYearlyData, fetchEmpYearlyStatistics, multipleRadialBarData, pieAreaData, pieAreaLabels, donutaDataLabel, totalWorkingTime, getWorkingDaysInYear, yearHeatMap, totalProgressPercent, allStreaksIndicator, customLeaves, getWorkingDaysInRange, formatDisplay, getWorkingDaysInRangeForTotalTime } from '@utils/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Container, Row } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { resourseAndView } from '@models/company';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { shouldShowBranchSetupGuide } from '@utils/shouldShowBranchSetupGuide';
import BranchSetupGuide from './components/BranchSetupGuide';
import { LeaveStatus } from '@constants/attendance';
import { countTotalWeekends } from '@utils/countTotalWeekend';
import { calculateTotalDuration } from '@utils/calculateTotalDuration';
import Loader from '@app/modules/common/utils/Loader';
import { fetchAppSettings } from '@redux/slices/appSettings';
import LazySection from '@app/modules/common/components/LazySection';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const Yearly = ({ year, endDate, fromAdmin = false, resourseAndView, dateSettingsEnabled = false, checkOwnWithOthers = false }: { 
    year: Dayjs, 
    endDate: Dayjs,
    fromAdmin?: boolean, 
    resourseAndView: resourseAndView[],
    dateSettingsEnabled?: boolean,
    checkOwnWithOthers?: boolean
}) => {

    // NOTE: early return moved BELOW all hooks — React rules of hooks forbid returning before hooks
    const currentEmployeeWorkingAndOffDaysStr = useSelector((state: RootState) => state.employee?.currentEmployee?.branches?.workingAndOffDays);
    const selectedEmployeeWorkingAndOffDaysStr = useSelector((state: RootState) => state.employee?.selectedEmployee?.branches?.workingAndOffDays);
    const workingAndOffDaysStr = fromAdmin
        ? (selectedEmployeeWorkingAndOffDaysStr || currentEmployeeWorkingAndOffDaysStr)
        : currentEmployeeWorkingAndOffDaysStr;
    const workingAndOffDays = workingAndOffDaysStr ? JSON.parse(workingAndOffDaysStr) : undefined;
    const showBranchSetupGuide = shouldShowBranchSetupGuide(workingAndOffDays);

    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const dateOfJoining = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
    const weekends = store.getState().employee.currentEmployee.branches?.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");
    const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");
    const [dataLoaded, setDataLoaded] = useState(false);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);

    // Get the original data from Redux store and filter yearly stats according to DateOfJoining
    const yearlyStats = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.yearly.filter((stat: any) => {
            const checkInDate = dayjs(stat.checkIn);
            return checkInDate.isSameOrAfter(dateOfJoining, 'day') && 
                   checkInDate.isSameOrBefore(endDate, 'day');
        });
    });

    const attendance = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.yearlyTable;
    });

    // Filter attendance requests using dateOfJoining
    const yearlyRequestTable = useSelector((state: RootState) => state.attendanceStats.yearlyRequestTable);
    
    const attendanceRequests = useMemo(() => {
        if (!yearlyRequestTable?.length) return [];
        
        return yearlyRequestTable.filter((request: any) => {
            const requestDate = dayjs(request.date);
            return requestDate.isSameOrAfter(dateOfJoining, 'day') && 
                   requestDate.isSameOrBefore(endDate, 'day');
        });
    }, [yearlyRequestTable, dateOfJoining, endDate]);


    const filteredYearlyStats = useMemo(() => {
        if (!yearlyStats?.length) return [];
        
        return yearlyStats.filter((stat: any) => {
            const checkInDate = dayjs(stat.checkIn);
            return checkInDate.isSameOrAfter(year, 'day') && 
                   checkInDate.isSameOrBefore(endDate, 'day');
        });
    }, [yearlyStats, year, endDate]);

    // Filter attendance using dateOfJoining too
    const filteredAttendance = useMemo(() => {
        if (!attendance?.length) return [];
    
        return attendance.filter((day) => {
            const attendanceDate = dayjs(day.date);
            return attendanceDate.isSameOrAfter(year, 'day') && 
                   attendanceDate.isSameOrBefore(endDate, 'day') && 
                   attendanceDate.isSameOrAfter(dateOfJoining, 'day');
        });
    }, [attendance, year, endDate, dateOfJoining]);

    
        
    const filteredLeaves = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredLeaves.filter((leave: any) => 
            dayjs(leave.date).isSameOrAfter(year, 'day') && 
            dayjs(leave.date).isSameOrBefore(endDate, 'day')
        );
    });
    const approvedLeaves = filteredLeaves.filter((leave: any) => leave.status === LeaveStatus.Approved);

    const filteredPublicHolidays = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredPublicHolidays.filter((holiday: any) => 
            dayjs(holiday.date).isSameOrAfter(year, 'day') && 
            dayjs(holiday.date).isSameOrBefore(endDate, 'day')
        );
    });

    // Fetch leaves and public holidays
    const fetchLeavesPublicHolidays = async () => {
        if (!selectedEmployeeId) {
            console.warn("employeeID not found");
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
            
            // fetch statistics with the correct date range
            await fetchEmpYearlyStatistics(year, fromAdmin, {
                startDate: year,
                endDate: endDate
            });
            
            setDataLoaded(true);
        };
        
        loadData();
    }, [selectedEmployeeId, year, endDate, fromAdmin, toggleChange, dispatch, dateOfJoining, dateSettingsEnabled]);

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
                year.format('YYYY-MM-DD'),
                endDate.format('YYYY-MM-DD'),
                filteredPublicHolidays,
                allWeekends
            );
        }, [year, endDate, filteredPublicHolidays, allWeekends]);
        
    // Calculate chart data based on filtered data
    const donutData = useMemo(() => donutaDataLabel(filteredAttendance, filteredLeaves, filteredPublicHolidays, fromAdmin, totalWeekendCount), 
        [filteredAttendance, filteredLeaves, filteredPublicHolidays, fromAdmin, totalWeekendCount]);
    
    const donutLabels: string[] = Array.from(donutData.keys());
    const donutSeries: number[] = Array.from(donutData.values());
    
    const multipleRadialBarLabels: string[] = Array.from(multipleRadialBarData(yearlyStats, dayWiseShifts).keys());
    const multipleRadialBarSeries: number[] = Array.from(multipleRadialBarData(yearlyStats, dayWiseShifts).values());

    const polarLabels: string[] = useMemo(() => pieAreaLabels(filteredYearlyStats), [filteredYearlyStats]);
    const polarSeries: number[] = useMemo(() => pieAreaData(filteredYearlyStats), [filteredYearlyStats]);

    // Calculate working days
    const totalWorkingDayInYear = useMemo(() => {
        return getWorkingDaysInRange(year, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays);
    }, [year, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays]);
    
    const findIsWeekendTrueAndCount = filteredPublicHolidays.filter((holiday: any) => holiday.isWeekend === true).length;
    const workedOnHolidaOrWeekend = donutData.get(EXTRA_DAYS) || 0;
    const actualTotalWorkingDayInYear = (totalWorkingDayInYear - findIsWeekendTrueAndCount) + workedOnHolidaOrWeekend;

    const holidays = donutData.get(HOLIDAYS) || 0;
    const leaves = donutData.get("Leaves") || 0;
    
    const stokedCircleSeries = useMemo(() => 
        [totalProgressPercent(filteredAttendance, actualTotalWorkingDayInYear)],
        [filteredAttendance, actualTotalWorkingDayInYear]
    );

    const barOptions = months;
    const barSeriesData = useMemo(() => barYearlyData(filteredYearlyStats), [filteredYearlyStats]);
    const heatMapSeries = useMemo(() => 
        yearHeatMap(filteredAttendance, year.format('YYYY'), dateSettingsEnabled, fromAdmin, totalWeekendCount),
        [filteredAttendance, year, dateSettingsEnabled, fromAdmin, totalWeekendCount]
    );

    const [hoursPart, minutesPart] = totalWorkingHours.split(" ");
    const hours = parseInt(hoursPart.replace("h", ""), 10) || 0;
    const minutes = parseInt(minutesPart.replace("m", ""), 10) || 0;
    
    // convert everything to minutes
    const totalMinutes = hours * 60 + minutes;
    
    const totalAllowedTimeForOutOffValue = useMemo(() => {
        const days  =  getWorkingDaysInRangeForTotalTime(year, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays) || 0;
        const totalMinutesFinal = days*totalMinutes || 0;
        // convert back to h m format
        const finalHours = Math.floor(totalMinutesFinal / 60);
        const finalMinutes = totalMinutesFinal % 60;
        const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;   
        return totalAllowedTime;
    },
        [year, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays, totalMinutes]
    );
    
    const totalAllowedMinutes = (actualTotalWorkingDayInYear - leaves) * totalMinutes;
    
    // convert back to h m format
    const finalHours = Math.floor(totalAllowedMinutes / 60);
    const finalMinutes = totalAllowedMinutes % 60;
    
    const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;    
    
    const calculateWorkedDays = (attendance: any[]) => {
        return attendance.filter(day => 
            day.checkIn && day.checkIn !== "-NA-" && day.checkIn !== "-" &&
            day.checkOut && day.checkOut !== "-NA-" && day.checkOut !== "-"
        ).length;
    };

    const totalWorkedDays = calculateWorkedDays(filteredAttendance);

    // All hooks have run — safe to conditionally render
    if (showBranchSetupGuide) {
        return <BranchSetupGuide />;
    }

    if (!dataLoaded) {
        return <Loader/>
    }

    return (
        <>
            <Row className='mt-7'>
                <Donut donutLabels={donutLabels} donutSeries={donutSeries} totalDays={actualTotalWorkingDayInYear} />
                <MultipleRadialBar multipleRadialBarLabels={multipleRadialBarLabels} multipleRadialBarSeries={multipleRadialBarSeries} totalWorkingDays={actualTotalWorkingDayInYear} />
                <Polar polarLabels={polarLabels} polarSeries={polarSeries} totalDays={actualTotalWorkingDayInYear} />
                <StokedCircle stokedCircleSeries={stokedCircleSeries} totalWorkedDays={totalWorkedDays} totalDays={actualTotalWorkingDayInYear} />
                <StreakIndicator 
                    currentStreak={allStreaksIndicator(filteredYearlyStats, year.isSame(dayjs(), 'year'))[0].toString()} 
                    lastStreak={allStreaksIndicator(filteredYearlyStats, year.isSame(dayjs(), 'year'))[1].toString()} 
                    totalDays={actualTotalWorkingDayInYear} 
                />
                <TotalWorkingTime totalWorkingTime={calculateTotalDuration(filteredYearlyStats)} totalAllowedTime={totalAllowedTimeForOutOffValue} />
            </Row>

            <Bar barOption={barOptions} barSeriesData={barSeriesData} height={250} totalWorkingTime={calculateTotalDuration(filteredYearlyStats)} totalAllowedTime={totalAllowedTime} />
            <HeatMap heatMapSeries={heatMapSeries} height={350} totalDays={actualTotalWorkingDayInYear} />

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
                    location={filteredYearlyStats}
                    resource={resourseAndView[1].resource}
                    viewOwn={resourseAndView[1].viewOwn}
                    viewOthers={resourseAndView[1].viewOthers}
                    checkOwnWithOthers={checkOwnWithOthers}
                    manualPagination={false}
                    isLoading={false}
                />
            </LazySection>
        </>
    );
}

export default Yearly;