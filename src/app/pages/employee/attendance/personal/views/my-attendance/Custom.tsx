import dayjs, { Dayjs } from "dayjs";
import { resourseAndView } from "@models/company";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@redux/store";
import { useEffect, useMemo, useState } from "react";
import { saveLeaves, savePublicHolidays } from "@redux/slices/attendanceStats";
import { fetchCompanyOverview, fetchAllPublicHolidays, fetchConfiguration } from "@services/company";
import { fetchEmployeeLeaves } from "@services/employee";
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { allStreaksIndicator, barYearlyData, customHeatMap, customLeaves, donutaDataLabel, fetchEmpMonthlyStatistics, fetchEmpYearlyStatistics, formatDisplay, getWorkingDaysInRange, getWorkingDaysInRangeForTotalTime, multipleRadialBarData, pieAreaData, pieAreaLabels, totalProgressPercent, totalWorkingTime, yearHeatMap } from "@utils/statistics";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { EXTRA_DAYS, HOLIDAYS, months } from "@constants/statistics";
import { Container, Row } from "react-bootstrap";
import { Bar, Donut, HeatMap, MultipleRadialBar, Polar, ReportsTable, StatisticsTable, StokedCircle, StreakIndicator, TotalWorkingTime } from "@app/modules/common/components/Graphs";
import { shouldShowBranchSetupGuide } from "@utils/shouldShowBranchSetupGuide";
import BranchSetupGuide from "./components/BranchSetupGuide";
import { LeaveStatus } from "@constants/attendance";
import { countTotalWeekends } from "@utils/countTotalWeekend";
import { calculateTotalDuration } from "@utils/calculateTotalDuration";
import Loader from "@app/modules/common/utils/Loader";

export const Custom = ({startDate, endDate, fromAdmin, resourseAndView, dateSettingsEnabled = false, checkOwnWithOthers = false}: {startDate?: Dayjs; endDate?: Dayjs; fromAdmin?: boolean; resourseAndView: resourseAndView[]; dateSettingsEnabled?: boolean; checkOwnWithOthers?: boolean}) => {
    
    // If no working days found or branch return message
    const workingAndOffDaysStr = useSelector((state: RootState) =>state.employee?.currentEmployee?.branches?.workingAndOffDays);
    const workingAndOffDays = workingAndOffDaysStr ? JSON.parse(workingAndOffDaysStr) : undefined;
    if (shouldShowBranchSetupGuide(workingAndOffDays)) {
        return <BranchSetupGuide />;
    }


    // Show warning if required dates are not provided
    if (!startDate || !endDate) {
            console.warn("Missing dates - showing warning");
            return (
                <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <div className="alert alert-warning text-center" role="alert">
                        <h4 className="alert-heading">Missing Date Range</h4>
                        <p className="mb-0">Please provide both start date and end date to view the statistics.</p>
                    </div>
                </Container>
            );
        }
        
     // Rest of component...
    const dispatch = useDispatch();
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee?.id);
    const dateOfJoining = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const weekends = store.getState().employee.currentEmployee.branches?.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");

    // filter yearly stats according to DateOfJoining
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

    const attendanceRequests = useSelector((state: RootState) => {
            const { attendanceStats } = state;
            return attendanceStats.yearlyRequestTable;
        });

    // filter attendance requests according to start date and end date
    const filteredAttendanceRequests = useMemo(() => {
        if (!attendanceRequests?.length) return [];
    
        return attendanceRequests.filter((day) => {
            const attendanceDate = dayjs(day.date);
            return attendanceDate.isSameOrAfter(startDate, 'day') && 
                   attendanceDate.isSameOrBefore(endDate, 'day') && 
                   attendanceDate.isSameOrAfter(dateOfJoining, 'day');
        });
    }, [attendanceRequests, startDate, endDate, dateOfJoining]);

    // filter attendance according to start date and end date
    const filteredAttendance = useMemo(() => {
        if (!attendance?.length) return [];
    
        return attendance.filter((day) => {
            const attendanceDate = dayjs(day.date);
            return attendanceDate.isSameOrAfter(startDate, 'day') && 
                   attendanceDate.isSameOrBefore(endDate, 'day') && 
                   attendanceDate.isSameOrAfter(dateOfJoining, 'day');
        });
    }, [attendance, startDate, endDate, dateOfJoining]);

    const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");
    const [dataLoaded, setDataLoaded] = useState(false);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);

    const year = dayjs(startDate).get('year');

    // filter leaves according to start date and end date
     const filteredLeaves = useSelector((state: RootState) => {
            const { attendanceStats } = state;
            return attendanceStats.filteredLeaves.filter((leave: any) => 
                dayjs(leave.date).isSameOrAfter(startDate, 'day') && 
                dayjs(leave.date).isSameOrBefore(endDate, 'day')
            );
        });
    const approvedLeaves = filteredLeaves.filter((leave: any) => leave.status === LeaveStatus.Approved);

    const filteredPublicHolidays = useSelector((state: RootState) => {
        const { attendanceStats } = state;
        return attendanceStats.filteredPublicHolidays.filter((holiday: any) => 
            dayjs(holiday.date).isSameOrAfter(startDate, 'day') && 
            dayjs(holiday.date).isSameOrBefore(endDate, 'day')
        );
    });

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
    
    
    useEffect(() => {
        if (!selectedEmployeeId) return;
        
        const loadData = async () => {
            setDataLoaded(false);
            
            if (fromAdmin) {
                await fetchLeavesPublicHolidays();
            }
            await fetchEmpYearlyStatistics(startDate, fromAdmin, {
                startDate,
                endDate
            });
            
            
            setDataLoaded(true);
        };
        
        loadData();
    }, [selectedEmployeeId, startDate, endDate, fromAdmin, toggleChange, dateSettingsEnabled]);

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



    // Calculate chart data based on filtered data

      const totalWeekendCount = useMemo(() => {
            return countTotalWeekends(
                startDate.format('YYYY-MM-DD'),
                endDate.format('YYYY-MM-DD'),
                filteredPublicHolidays,
                allWeekends
            );
        }, [startDate, endDate, filteredPublicHolidays, allWeekends]);

        
    const donutData = useMemo(() => donutaDataLabel(filteredAttendance, filteredLeaves, filteredPublicHolidays, fromAdmin, totalWeekendCount), 
        [filteredAttendance, filteredLeaves, filteredPublicHolidays, fromAdmin, totalWeekendCount]);
    
    const donutLabels: string[] = Array.from(donutData.keys());
    const donutSeries: number[] = Array.from(donutData.values());
    
    const multipleRadialBarLabels: string[] = Array.from(multipleRadialBarData(yearlyStats, dayWiseShifts).keys());
    const multipleRadialBarSeries: number[] = Array.from(multipleRadialBarData(yearlyStats, dayWiseShifts).values());

    const polarLabels: string[] = useMemo(() => pieAreaLabels(yearlyStats), [yearlyStats]);
    const polarSeries: number[] = useMemo(() => pieAreaData(yearlyStats), [yearlyStats]);

    // Calculate working days
    const totalWorkingDayInYear = useMemo(() => {
        return getWorkingDaysInRange(startDate, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays);
    }, [startDate, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays]);

    const findIsWeekendTrueAndCount = filteredPublicHolidays.filter((holiday: any) => holiday.isWeekend === true).length;

    const workedOnHolidaOrWeekend = donutData.get(EXTRA_DAYS) || 0;
    const actualTotalWorkingDay = (totalWorkingDayInYear - findIsWeekendTrueAndCount) + workedOnHolidaOrWeekend;
    
    const holidays = donutData.get(HOLIDAYS) || 0;
    const leaves = donutData.get("Leaves") || 0;
    
    const stokedCircleSeries = useMemo(() => 
        [totalProgressPercent(filteredAttendance, actualTotalWorkingDay)],
        [filteredAttendance, actualTotalWorkingDay]
    );

    const barOptions = months;
    const barSeriesData = useMemo(() => barYearlyData(yearlyStats), [yearlyStats]);
    const heatMapSeries = useMemo(() => 
        customHeatMap(filteredAttendance, startDate, endDate, fromAdmin, totalWeekendCount),
        [filteredAttendance, startDate, endDate, fromAdmin, totalWeekendCount]
    );

    const [hoursPart, minutesPart] = totalWorkingHours.split(" ");
    const hours = parseInt(hoursPart.replace("h", ""), 10) || 0;
    const minutes = parseInt(minutesPart.replace("m", ""), 10) || 0;
    
    // convert everything to minutes
    const totalMinutes = hours * 60 + minutes;
    
    const totalAllowedTimeForOutOffValue = useMemo(() => {
        const days  =  getWorkingDaysInRangeForTotalTime(startDate, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays) || 0;
        const totalMinutesFinal = days*totalMinutes || 0;
        // convert back to h m format
        const finalHours = Math.floor(totalMinutesFinal / 60);
        const finalMinutes = totalMinutesFinal % 60;
        const totalAllowedTime = `${finalHours}h ${finalMinutes}m`;   
        return totalAllowedTime;
    },
        [startDate, endDate, dateSettingsEnabled, allWeekends, filteredPublicHolidays, totalMinutes]
    );

    const totalAllowedMinutes = (actualTotalWorkingDay - leaves) * totalMinutes;
    
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

    if (!dataLoaded) {
        return <Loader/>
    }

    return (
        <div>
            <Row className='mt-7'>
                            <Donut donutLabels={donutLabels} donutSeries={donutSeries} totalDays={actualTotalWorkingDay} />
                            <MultipleRadialBar multipleRadialBarLabels={multipleRadialBarLabels} multipleRadialBarSeries={multipleRadialBarSeries} totalWorkingDays={actualTotalWorkingDay} />
                            <Polar polarLabels={polarLabels} polarSeries={polarSeries} totalDays={actualTotalWorkingDay} />
                            <StokedCircle stokedCircleSeries={stokedCircleSeries} totalWorkedDays={totalWorkedDays} totalDays={actualTotalWorkingDay} />
                            <StreakIndicator 
                                currentStreak={allStreaksIndicator(yearlyStats, startDate.isSame(startDate, 'day'))[0].toString()} 
                                lastStreak={allStreaksIndicator(yearlyStats, startDate.isSame(startDate, 'day'))[1].toString()} 
                                totalDays={actualTotalWorkingDay} 
                            />
                            <TotalWorkingTime totalWorkingTime={calculateTotalDuration(yearlyStats)} totalAllowedTime={totalAllowedTimeForOutOffValue} />
                        </Row>
            
                        <Bar barOption={barOptions} barSeriesData={barSeriesData} height={250} totalWorkingTime={calculateTotalDuration(yearlyStats)} totalAllowedTime={totalAllowedTime} />
                        <HeatMap heatMapSeries={heatMapSeries} height={190} totalDays={actualTotalWorkingDay} />
            
                        <h3 className='pt-5 fw-bold font-barlow'>Attendance Request</h3>
                        <ReportsTable 
                            attendanceRequests={filteredAttendanceRequests} 
                            fromAdmin={fromAdmin} 
                            resource={resourseAndView[0].resource} 
                            viewOwn={resourseAndView[0].viewOwn} 
                            viewOthers={resourseAndView[0].viewOthers}
                            checkOwnWithOthers={checkOwnWithOthers} 
                        />
            
                        <h3 className='pt-8 fw-bold font-barlow'>Report</h3>
                        <StatisticsTable 
                            approvedLeaves={approvedLeaves}
                            attendance={filteredAttendance} 
                            attendanceRequests={attendanceRequests} 
                            fromAdmin={fromAdmin} location={yearlyStats}
                            resource={resourseAndView[1].resource} 
                            viewOwn={resourseAndView[1].viewOwn} 
                            viewOthers={resourseAndView[1].viewOthers}
                            checkOwnWithOthers={checkOwnWithOthers} 
                        />
        </div>
    );
};