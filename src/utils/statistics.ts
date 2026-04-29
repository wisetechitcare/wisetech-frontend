import { Attendance, AttendanceRequest, CustomLeaves, IAttendance, IAttendanceRequests, IEmployeesAttendance, IReimbursementsFetch, IReimbursementTypeCreate, IReimbursementTypeFetch, Leaves } from "@models/employee";
import { attendanceStatsSlice, saveAttendanceRequestRaiseLimit, saveDailyRequestTable, saveDailyStatistics, saveDailyTable, saveFilteredLeaves, saveFilteredPublicHolidays, saveMonthlyRequestTable, saveMonthlyStatistics, saveMonthlyTable, saveWeeklyRequestTable, saveWeeklyStatistics, saveWeeklyTable, saveYearlyRequestTable, saveYearlyStatistics, saveYearlyTable } from "@redux/slices/attendanceStats";
import { RootState, store } from "@redux/store";
import { fetchAllReimbursementsForAllEmployees, fetchAllReimbursementsForEmployee, fetchEmpAttendanceStatistics, fetchEmpKpiStatisticsForDay, fetchEmpKpiStatisticsForPeriod, fetchEmpKpiScoresAllTime, fetchEmployeeLeaves, fetchLoanById, fetchReimbursementsForAllEmployees, fetchReimbursementsForEmployee, getAttendanceRequest, updateReimbursementById, sendAttendanceRequestResetLimit } from "@services/employee";
import dayjs, { Dayjs, ManipulateType } from "dayjs";
import { convertTo12HourFormat, convertToTimeZone, findTimeDifference, getWeekDay, isDateBeforeOrSameAsCurrDate, timeToMinutes } from "./date";
import { ABSENT, CHECK_OUT_MISSING, checkInTime, checkOutTime, EARLY_CHECKIN, EARLY_CHECKOUT, EXTRA_DAYS, HEATMAPLABELS, HOLIDAYS, LATE_CHECKIN, LATE_CHECKOUT, MISSING_CHECKOUT, monthDays, months, ON_LEAVE, onSiteAndHolidayWeekendSettingsOnOffName, PRESENT, TOTAL_ANNUAL_LEAVES, TOTAL_FLOATER_LEAVES, TOTAL_SICK_LEAVES, TOTAL_WORKING_DAYS, totalShiftTimeMins, week, weekDays, WEEKEND } from "@constants/statistics";
import { ATTENDANCE_STATUS, LeaveStatus, LeaveTypes } from "@constants/attendance";
import { IPublicHoliday } from "@models/company";
import { FormattedDate } from "@pages/employee/attendance/personal/OverviewView";
import { createNewReimbursementType, deleteReimbursementTypeById, fetchAllReimbursementTypes, updateCurrReimbursementTypeById } from "@services/options";
import { fetchBranchById, fetchCompanyOverview, fetchConfiguration, fetchPublicHolidays } from "@services/company";
import { DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { fetchCompanySettings } from '@services/options';
import { generateFiscalYearFromGivenYear } from "./file";
import { getAllWeekends } from "./sandwhichConfiguration";
import { errorConfirmation, successConfirmation } from "./modal";
import { some } from "lodash";
import { debug, log } from "node:console";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// functions for fetching statistics for daily, weekly, monthly, yearly ------ starts here -----

export async function fetchEmpDailyStatistics(day: Dayjs, fromAdmin: boolean = false) {
    // Load company timings first so multipleRadialBarData has the data
    await fetchCompanyTimings();

    const employeeId = fromAdmin ? store.getState().employee.selectedEmployee?.id : store.getState().employee.currentEmployee.id;

    const startEndDate = day.format('YYYY-MM-DD');
    const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, startEndDate, startEndDate);
    store.dispatch(saveDailyStatistics(empAttendanceStatistics));

    const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startEndDate, startEndDate);
    const dailyRequestTable = transformAttendanceRequest(attendanceRequests);
    store.dispatch(saveDailyRequestTable(dailyRequestTable));

    const dates = generateDateRange(startEndDate, startEndDate);
    const dailyTable = transformAttendanceInUTC(dates, empAttendanceStatistics, dailyRequestTable);
    store.dispatch(saveDailyTable(dailyTable));
}

export const fetchEmpWeeklyStatistics = async (startWeek: Dayjs, endWeek: Dayjs, fromAdmin: boolean = false) => {
    try {
        // Load company timings first so multipleRadialBarData has the data
        await fetchCompanyTimings();

        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;
        if (!employeeId) {
            console.error("Employee ID not found");
            return;
        }

        const startDate = startWeek.format('YYYY-MM-DD');
        const endDate = endWeek.format('YYYY-MM-DD');

        // Fetch data in parallel
        const [attendanceRes, requestsRes] = await Promise.all([
            fetchEmpAttendanceStatistics(employeeId, startDate, endDate),
            getAttendanceRequest(employeeId, startDate, endDate)
        ]);

        const { data: { empAttendanceStatistics } } = attendanceRes;
        const { data: { attendanceRequests } } = requestsRes;

        // Transform and dispatch
        const weeklyRequestTable = transformAttendanceRequest(attendanceRequests);
        const dates = generateDateRange(startDate, endDate);
        const weeklyTable = transformAttendanceInUTC(dates, empAttendanceStatistics, weeklyRequestTable); // Pass weeklyRequestTable

        // Dispatch updates
        store.dispatch(saveWeeklyRequestTable(weeklyRequestTable));
        store.dispatch(saveWeeklyStatistics(empAttendanceStatistics));
        store.dispatch(saveWeeklyTable(weeklyTable));

        // Filter leaves and holidays
        filterLeavesPublicHolidays(startDate, endDate);

        return { startDate, endDate };
    } catch (error) {
        console.error("Error in fetchEmpWeeklyStatistics:", error);
        throw error;
    }
}

export async function fetchEmpMonthlyStatistics(
    month: Dayjs,
    fromAdmin: boolean = false,
    options?: { startDate?: Dayjs, endDate?: Dayjs }
) {
    try {
        // Load company timings first so multipleRadialBarData has the data
        await fetchCompanyTimings();

        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;
        if (!employeeId) {
            console.error("Employee ID not found");
            return;
        }

        // Use provided options or default to full month
        const startDate = options?.startDate?.format('YYYY-MM-DD') || month.startOf('month').format('YYYY-MM-DD');
        const endDate = options?.endDate?.format('YYYY-MM-DD') || month.endOf('month').format('YYYY-MM-DD');

        // Fetch attendance statistics
        const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(
            employeeId,
            startDate,
            endDate
        );

        const { data: { attendanceRequests } } = await getAttendanceRequest(
            employeeId,
            startDate,
            endDate
        );

        const monthlyRequestTable = transformAttendanceRequest(attendanceRequests);
        store.dispatch(saveMonthlyRequestTable(monthlyRequestTable));
        console.log("debugger:: ", empAttendanceStatistics);
        // debugger;
        store.dispatch(saveMonthlyStatistics(empAttendanceStatistics));

        const dates = generateDateRange(startDate, endDate);

        const monthlyTable = transformAttendanceInUTC(dates, empAttendanceStatistics, monthlyRequestTable); // Pass monthlyRequestTable
        // console.log("MonthlyTable:: ",monthlyTable);
        // console.log("empAttendanceStatistics:: ",empAttendanceStatistics);

        // debugger;
        store.dispatch(saveMonthlyTable(monthlyTable));

        filterLeavesPublicHolidays(startDate, endDate);

        return { startDate, endDate };
    } catch (error) {
        console.error("Error fetching monthly statistics:", error);
        throw error;
    }
}

export async function fetchEmpYearlyStatistics(
    year: Dayjs,
    fromAdmin: boolean = false,
    options?: { startDate?: Dayjs, endDate?: Dayjs, page?: number, limit?: number }
) {
    try {
        // Load company timings first so multipleRadialBarData has the data
        await fetchCompanyTimings();

        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;

        if (!employeeId) {
            console.error("Employee ID not found");
            return;
        }

        let startDate: string;
        let endDate: string;

        if (options?.startDate && options?.endDate) {
            startDate = options.startDate.format('YYYY-MM-DD');
            endDate = options.endDate.format('YYYY-MM-DD');
        } else {
            const fiscalYear = await generateFiscalYearFromGivenYear(year, fromAdmin);
            startDate = fiscalYear.startDate;
            endDate = fiscalYear.endDate;
        }

        // Fetch attendance statistics
        const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(
            employeeId,
            startDate,
            endDate,
            options?.page,
            options?.limit
        );

        // Fetch and transform attendance requests
        const attendanceRequestResponse = await getAttendanceRequest(
            employeeId,
            startDate,
            endDate,
            options?.page,
            options?.limit
        );

        // console.log('getAttendanceRequest response:', attendanceRequestResponse);

        const attendanceRequests = attendanceRequestResponse?.data?.attendanceRequests || [];
        const total = attendanceRequestResponse?.data?.total;
        const pagination = attendanceRequestResponse?.data?.pagination;

        const yearlyRequestTable = transformAttendanceRequest(attendanceRequests);

        store.dispatch(saveYearlyRequestTable(yearlyRequestTable));
        store.dispatch(saveYearlyStatistics(empAttendanceStatistics));

        // Generate date range and transform attendance data
        const dates = generateDateRange(startDate, endDate);
        const yearlyTable = transformAttendanceInUTC(dates, empAttendanceStatistics, yearlyRequestTable); // Pass yearlyRequestTable

        store.dispatch(saveYearlyTable(yearlyTable));

        filterLeavesPublicHolidays(startDate, endDate);

        return {
            startDate,
            endDate,
            attendanceRequests,
            pagination: {
                totalRecords: total || pagination?.totalRecords || attendanceRequests?.length || 0
            }
        };
    } catch (error) {
        console.error("Error fetching yearly statistics:", error);
        throw error;
    }
}

export function filterLeavesPublicHolidays(
    startDate: string,
    endDate: string,
    returnData?: boolean,
    dateSettingsEnabled?: boolean,
    countUnapprovedLeaves?: boolean
): { customLeaves: CustomLeaves[], publicHolidays: IPublicHoliday[] } | void {

    // Determine the actual end date to use
    const actualEndDate = dateSettingsEnabled && dayjs(endDate).isAfter(dayjs())
        ? dayjs().format('YYYY-MM-DD')
        : endDate;


    // Get all leaves from store
    const allLeaves = store.getState().attendanceStats.leaves;
    // debugger;
    // Filter leaves with single, consistent logic
    let leaves: CustomLeaves[] = allLeaves.filter((leave: CustomLeaves) => {
        if (leave.status !== LeaveStatus.Approved && (!countUnapprovedLeaves || leave.status == LeaveStatus.Rejected)) {
            return false;
        }

        const leaveDate = dayjs(leave.date).format('YYYY-MM-DD');
        const isInRange = dayjs(leaveDate).isSameOrBefore(actualEndDate, 'day') &&
            dayjs(leaveDate).isSameOrAfter(startDate, 'day');

        return isInRange;
    });



    // Get all public holidays from store
    const allPublicHolidays = store.getState().attendanceStats.publicHolidays;

    // Filter public holidays with single, consistent logic
    let publicHolidays: IPublicHoliday[] = allPublicHolidays.filter((publicHoliday: IPublicHoliday) => {
        const holidayDate = dayjs(publicHoliday.date).format('YYYY-MM-DD');
        const isInRange = dayjs(holidayDate).isSameOrBefore(actualEndDate, 'day') &&
            dayjs(holidayDate).isSameOrAfter(startDate, 'day');

        return isInRange;
    });


    if (returnData) {
        return {
            customLeaves: leaves,
            publicHolidays: publicHolidays
        };
    } else {
        store.dispatch(saveFilteredLeaves([...leaves]));
        store.dispatch(saveFilteredPublicHolidays([...publicHolidays]));
        return; // Explicit return for clarity
    }
}

// functions for fetching statistics for daily, weekly, monthly, yearly ------ ends here -----

export function parseFlexibleTime(timeStr: string): number | null {
    timeStr = timeStr.trim().toUpperCase();

    // Match 12-hour or 24-hour formats like "1 PM", "1:30 PM", "13:00"
    const timeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/;

    const match = timeRegex.exec(timeStr);
    if (!match) return null;

    let [_, hStr, mStr, meridian] = match;
    let hours = parseInt(hStr, 10);
    let minutes = mStr ? parseInt(mStr, 10) : 0;

    if (meridian) {
        if (meridian === "PM" && hours !== 12) hours += 12;
        if (meridian === "AM" && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
}


export function convertMinutesIntoHrMinFormats(minutes: number): string {
    const leaveManagement = store.getState().featureConfiguration?.leaveManagement;
    const disableLunchTimeDeduction = store.getState().featureConfiguration?.disableLaunchDeductionTime;
    const lunchTime = leaveManagement?.["Lunch Time"];
    const workingTime = leaveManagement?.["Working time"];

    let lunchMinutes = 0;

    if (!lunchTime && disableLunchTimeDeduction === true) {
        console.warn("WARN :: Lunch time is not set but deduction is enabled");
    }

    if (disableLunchTimeDeduction === true && lunchTime && workingTime) {
        // Parse working time minutes
        const workingTimeMinutes = parseFlexibleTime(workingTime.replace(/ Hrs/i, "").trim());

        // Parse lunch start/end
        const [startRaw, endRaw] = lunchTime.replace(/\s*-\s*/, '-').split("-");
        const startMin = parseFlexibleTime(startRaw.replace(/(AM|PM)/i, "").trim());
        const endMin = parseFlexibleTime(endRaw.replace(/(AM|PM)/i, "").trim());

        if (workingTimeMinutes !== null && startMin !== null && endMin !== null) {
            const calculatedLunchMinutes = endMin - startMin;

            // Threshold = (half of working time) + lunch duration
            // const threshold = (workingTimeMinutes / 2) + calculatedLunchMinutes;
            const threshold = (workingTimeMinutes / 2);

            if (minutes >= threshold) {
                lunchMinutes = calculatedLunchMinutes;
                // console.log(`DEBUG :: Deducting ${lunchMinutes} mins because ${minutes} > ${threshold}`);
            } else {
                // console.log(`DEBUG :: Skipping lunch deduction because ${minutes} <= ${threshold}`);
            }
        } else {
            // console.warn("WARN :: Could not parse working time or lunch time");
        }
    } else {
        // console.log("DEBUG :: Lunch deduction disabled or missing configs");
    }

    const effectiveMinutes = minutes - lunchMinutes;
    const hours = Math.floor(effectiveMinutes / 60);
    const mins = effectiveMinutes % 60;

    return `${hours}h : ${mins}m`;
}



export function convertMinutesIntoHrMinFormat(minutes: number): string {
    const hoursDifference = Math.floor(minutes / 60);
    const minutesDifference = Math.abs(minutes % 60);

    const formattedDifference = `${hoursDifference}h : ${minutesDifference}m`;
    return formattedDifference;
}

// convert days into years, month, days
export function convertDaysToYearsMonthsDays(totalDays: number) {
    const years = Math.floor(totalDays / 365);
    const remainingDaysAfterYears = totalDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;

    return `${years} Years, ${months} Months, ${days} Days`;
}

// convert 4:30 in ist eg . 4:30 to 10: 00 ---- +5:30
export function convertToIST(timeStr: string) {
    let [hours, minutes] = timeStr.split(':').map(Number);

    hours += 5;
    minutes += 30;

    if (minutes >= 60) {
        minutes -= 60;
        hours += 1;
    }

    if (hours >= 24) {
        hours -= 24;
    }

    const istHours = String(hours).padStart(2, '0');
    const istMinutes = String(minutes).padStart(2, '0');

    return `${istHours}:${istMinutes}`;
}

// new function to support seconds also
export function convertToISTWithSeconds(timeStr: string) {
    let [hours, minutes, seconds] = timeStr.split(':').map(Number);

    if (seconds === undefined) seconds = 0;

    hours += 5;
    minutes += 30;

    // Adjust for overflow
    if (seconds >= 60) {
        seconds -= 60;
        minutes += 1;
    }

    if (minutes >= 60) {
        minutes -= 60;
        hours += 1;
    }

    if (hours >= 24) {
        hours -= 24;
    }

    const istHours = String(hours).padStart(2, '0');
    const istMinutes = String(minutes).padStart(2, '0');
    const istSeconds = String(seconds).padStart(2, '0');

    return `${istHours}:${istMinutes}:${istSeconds}`;
}


// convert 4:30 in utc eg . 4:30 to 10: 00 ---- +5:30
export function convertToUTC(timeStr: string) {
    if (!timeStr || timeStr === '-NA-') {
        return '00:00';
    }
    let [hours, minutes] = timeStr.split(':').map(Number);

    hours -= 5;
    minutes -= 30;

    if (minutes < 0) {
        minutes += 60;
        hours -= 1;
    }

    if (hours < 0) {
        hours += 24;
    }

    const istHours = String(hours).padStart(2, '0');
    const istMinutes = String(minutes).padStart(2, '0');

    return `${istHours}:${istMinutes}`;
}

const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidTime(timeString: string) {
    return timeRegex.test(timeString);
}

// give date from 2024/12/01 4:59:0
export function convertDateTimeIntoDate(dateTime: Date): string {
    return dateTime.toISOString().split('T')[0];
}

// difference in time from format 7:30 in minutes
export function getTimeDifference(checkIn: string, checkOut: string) {
    if (!checkIn || !checkOut) return 0;
    // Try parsing as dates first
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return Math.floor((end.getTime() - start.getTime()) / 60000);
    }

    // Fallback to HH:mm logic if dates not present
    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let startMin = inH * 60 + inM;
    let endMin = outH * 60 + outM;

    if (endMin < startMin) endMin += 24 * 60;

    return endMin - startMin;
}


// sum for an attendance in 4:50 format.
export function totalMinutes(stats: IAttendance[]): number {
    let totalTime = stats.reduce((accumulator: any, value: IAttendance) => {
        if (value.checkIn != '-' && value.checkIn != '-N/A-' && value.checkOut != '-' && value.checkOut != '-N/A-') {
            const [hours, minutes] = value.duration.split(':').map(time => time.replace(/\D/g, ''));
            const timeInMinutes = (parseInt(hours, 10) * 60) + parseInt(minutes, 10);
            return accumulator + timeInMinutes;
        }
    }, 0);

    return totalTime;
}

// difference between times in format 2024-08-27 10:34:24.121
export function checkInCheckOutDifference(stat: Attendance): number {
    let differenceInMillis = 0;
    if (stat?.checkIn != null) {
        const checkInTime = stat?.checkIn;
        const checkOutTime = stat?.checkOut;

        const checkedInDateTime = new Date(checkInTime);

        const checkInDateOnly = convertDateTimeIntoDate(checkedInDateTime);
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        const todayDateOnly = `${year}-${month}-${day}`;

        let checkedOutDateTime: Date;

        if (checkOutTime == null && checkInDateOnly === todayDateOnly) {
            checkedOutDateTime = new Date(new Date());
        } else if (checkOutTime != null) {
            checkedOutDateTime = new Date(checkOutTime);
        } else {
            checkedOutDateTime = checkedInDateTime;
        }

        differenceInMillis = checkedOutDateTime.getTime() - checkedInDateTime.getTime();
    }

    const differenceInMinutes = Math.floor(differenceInMillis / 60000);
    return differenceInMinutes;
}

// sum for an attendance in 204-03-01 4:50 format
export function totalCheckInCheckOutMinutes(stats: Attendance[], deductionTime?: number, appSettingWorkingHours?: number, checkDeductionLogic?: boolean): number {

    let totalTime = stats.reduce((accumulator: any, value: Attendance) => {
        let differenceInMinutes = 0;

        if (value?.checkIn != null && value?.checkOut != null) {
            differenceInMinutes = checkInCheckOutDifference(value);
            if (checkDeductionLogic && differenceInMinutes >= (((appSettingWorkingHours || 0) / 2) * 60)) {
                differenceInMinutes = differenceInMinutes - (deductionTime || 0);
            }
        }

        // if (value?.checkIn != null && value?.checkOut != null) {
        //     differenceInMinutes = checkInCheckOutDifference(value);
        //     if(checkDeductionLogic && differenceInMinutes > (((appSettingWorkingHours || 0)/2)*60 + (deductionTime|| 0))){
        //         differenceInMinutes = differenceInMinutes - (deductionTime || 0);
        //     }
        // }

        return accumulator + differenceInMinutes;
    }, 0);

    return totalTime;
}

// generate function for date range
export function generateDateRange(startDate: string, endDate: string) {
    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        throw new Error("Start date must be before or equal to the end date.");
    }

    while (start <= end) {
        const dateString = start.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(',', '');

        const dbDate = start.toLocaleDateString('en-GB').replace(/\//g, '/');

        result.push({
            date: dateString,
            dbDate: dbDate
        });

        start.setDate(start.getDate() + 1);
    }

    return result;
}

// generates dates for Attendance type 
export function generateDatesForStatsTable(dates: Attendance[]) {
    return dates.map((attendance) => {
        const date = new Date(attendance.checkIn);

        // Format for 'date' field (01 Oct, 2024)
        const options: any = { day: '2-digit', month: 'short', year: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-GB', options).replace(/ /g, ' ');

        // Format for 'dbDate' field (01/10/2024)
        const dbDate = date.toLocaleDateString('en-GB');

        return {
            date: formattedDate,
            dbDate: dbDate
        };
    });
}

// generates dates in between "2024-07-10T00:00:00.000Z" in this format
export function generateDatesBetween(dateFrom: string, dateTo: string): string[] {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const dates = [];

    while (start <= end) {
        dates.push(new Date(start).toISOString());
        start.setDate(start.getDate() + 1);
    }

    return dates;
}

// convert 2024-08-27 10:34:24.121 into 4:30 format
export function convertToTime(isoDate: string): string {
    const date = new Date(isoDate);

    const time = new Date(date.getTime());

    let hours: any = time.getUTCHours();
    let minutes: any = time.getUTCMinutes();

    minutes = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${minutes}`;
}

// new function to support seconds also
export function convertToTimeWithSeconds(isoDate: string): string {
    const date = new Date(isoDate);

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}


// returns true if time1 is less than time 2 - 7:30 format
export function compareTimes(value: string, comparator: string): boolean | undefined {
    const [valueHours, valueMinutes] = value.split(':').map(Number);
    const [comparatorHours, comparatorMinutes] = comparator.split(':').map(Number);

    if (valueHours < comparatorHours || (valueHours === comparatorHours && valueMinutes < comparatorMinutes)) {
        return true;
    } else if (valueHours > comparatorHours || (valueHours === comparatorHours && valueMinutes > comparatorMinutes)) {
        return false;
    }

    return undefined;
}

export function currentDayWorkingHours(stat: Attendance) {
    const differenceInMinutes = checkInCheckOutDifference(stat);

    const workingHours = convertMinutesIntoHrMinFormat(differenceInMinutes);

    const currentDate = new Date();

    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

    const currentTime = `${hours}:${minutes}`;

    const todayWorkingHours = currentTime > '23:59' ? '0h : 0m' : workingHours;

    return todayWorkingHours;
}

export const getWorkingDaysInRange = (
    start: Dayjs,
    end: Dayjs,
    useCustomSettings: boolean = false,
    weeklyWorkingAndOffDays: Record<string, string> = {},
    filteredPublicHolidays: any[] = []
): number => {
    let workingDayCount = 0;
    let currentDay = start.clone();

    const workingDaysMapWithDay: { [key: number]: string } = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
    };

    const shouldUseCustomSettings = (Object.keys(weeklyWorkingAndOffDays)?.length === 7);

    // Count all configured working days first
    while (currentDay.isSameOrBefore(end, 'day')) {
        const dayOfWeek = currentDay.day();

        if (shouldUseCustomSettings) {
            const dayName = workingDaysMapWithDay[dayOfWeek];
            if (dayName && weeklyWorkingAndOffDays[dayName] === "1") {
                workingDayCount++;
            }
        } else {
            // Default Monday to Friday work week
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workingDayCount++;
            }
        }
        currentDay = currentDay.add(1, 'day');
    }

    // Subtract holidays that fall on working days (following heatmap logic)
    // Only holidays with isWeekend=false reduce working days
    const workingDayHolidays = filteredPublicHolidays.filter((holiday: any) => {
        const holidayDate = dayjs(holiday.date);

        if (
            holidayDate.isSameOrAfter(start, 'day') &&
            holidayDate.isSameOrBefore(end, 'day')
        ) {
            const dayOfWeek = holidayDate.day();
            const dayName = workingDaysMapWithDay[dayOfWeek];

            // Following heatmap logic: only count holidays with isWeekend=false
            if (holiday.isWeekend) {
                return false; // Holiday weekends don't reduce working days
            }

            // Check if holiday falls on a configured working day
            if (shouldUseCustomSettings) {
                return weeklyWorkingAndOffDays[dayName] === "1";
            } else {
                return dayOfWeek >= 1 && dayOfWeek <= 5;
            }
        }
        return false;
    }).length;




    return Math.max(0, workingDayCount - workingDayHolidays);
};

/**
 * 1. while(start<end){
 *  foreach day if that day is weekend from object or any type of holiday the donot increaement count
 * else increaement count     
 * }
 * 
 */
export const getWorkingDaysInRangeForTotalTime = (start: Dayjs,
    end: Dayjs,
    dateSettingsEnabled: boolean = false,
    weeklyWorkingAndOffDays: Record<string, string> = {},
    filteredPublicHolidays: any[] = []) => {
    let newEnd = end;
    if (dateSettingsEnabled) {
        if (dayjs(end).isAfter(dayjs())) {
            newEnd = dayjs();
        }
    }

    let workingDayCount = 0;
    let currentDay = start.clone();

    const workingDaysMapWithDay: { [key: number]: string } = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
    };

    const shouldUseCustomSettings = (Object.keys(weeklyWorkingAndOffDays)?.length === 7);

    while (currentDay.isSameOrBefore(newEnd, 'day')) {
        // check if day is a weekend from json

        let isWeekendToday = false;
        const dayOfWeek = currentDay.day();
        if (shouldUseCustomSettings) {
            const dayName = workingDaysMapWithDay[dayOfWeek];
            if (dayName && weeklyWorkingAndOffDays[dayName] === "0") {
                isWeekendToday = true;
            }
        } else {
            // Default Monday to Friday work week
            if (!(dayOfWeek >= 1 && dayOfWeek <= 5)) {
                isWeekendToday = true;
            }
        }
        let isHolidayToDay = false;
        // else if day is any type of holiday weekend/holiday
        const workingDayHolidays = filteredPublicHolidays.filter((holiday: any) => {
            const holidayDate = dayjs(holiday.date);
            const isHolidayToDay = holidayDate.isSame(currentDay, 'day');
            return isHolidayToDay;
        }).length;

        if (workingDayHolidays) {
            isHolidayToDay = true;
        }

        // else increment count
        if (!isWeekendToday && !isHolidayToDay) {
            workingDayCount++;
        }

        currentDay = currentDay.add(1, 'day');
    }


    return Math.max(0, workingDayCount);

}

export function totalWorkingTime(stats: Attendance[]): string {

    let totalTime = totalCheckInCheckOutMinutes(stats);

    const currentDay = stats.find((stat: Attendance) => {
        const todayCheckIn = stat.checkIn;

        const checkInDate = todayCheckIn.split('T')[0];

        const isToday = checkInDate === dayjs().format('YYYY-MM-DD');

        if (isToday) {
            return stat;
        }
        return undefined;
    });

    if (currentDay != undefined) {
        totalTime = totalTime + checkInCheckOutDifference(currentDay);
    }

    const workingHours = convertMinutesIntoHrMinFormat(totalTime);

    return workingHours;
}

export const countWeekdays = (start: Dayjs, end: Dayjs): number => {
    let count = 0;
    let currentDay = start;

    const workingAndOffDays = store.getState().employee?.currentEmployee?.branches?.workingAndOffDays;
    const weeklyWorkingAndOffDays = JSON.parse(workingAndOffDays || "{}");
    const workingDaysMapWithDay: { [key: number]: string } = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
    };

    const useWorkingAndOffDays = (weeklyWorkingAndOffDays && typeof weeklyWorkingAndOffDays === 'object' && Object.keys(weeklyWorkingAndOffDays)?.length === 7);

    while (currentDay.isBefore(end) || currentDay.isSame(end, 'day')) {
        const dayOfWeek = currentDay.day();
        if (useWorkingAndOffDays) {
            if (workingDaysMapWithDay[dayOfWeek] && weeklyWorkingAndOffDays[workingDaysMapWithDay[dayOfWeek]] === "1") {
                count++;
            }
        } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            count++;
        }
        currentDay = currentDay.add(1, 'day');
    }
    return count;
}

export function getWorkingDaysInMonth(year: string, month: string | number): number {
    let workingDays = 0;
    const daysInMonth = dayjs(`${year}-${month}`).daysInMonth();
    const workingAndOffDays = store.getState().employee?.currentEmployee?.branches?.workingAndOffDays;
    const weeklyWorkingAndOffDays = JSON.parse(workingAndOffDays || "{}");
    const workingDaysMapWithDay: { [key: number]: string } = {
        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday",
    };

    const useWorkingAndOffDays = (weeklyWorkingAndOffDays && typeof (weeklyWorkingAndOffDays) === 'object' && Object.keys(weeklyWorkingAndOffDays)?.length === 7) ? true : false;

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDay = dayjs(`${year}-${month}-${day}`);
        const dayOfWeek: number = currentDay.day();
        if (useWorkingAndOffDays) {
            if (workingDaysMapWithDay[dayOfWeek] && weeklyWorkingAndOffDays && weeklyWorkingAndOffDays[workingDaysMapWithDay[dayOfWeek]] === "1") {
                workingDays++;
            }
        }
        else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            workingDays++;
        }
    }

    return workingDays;
}

export const geAllDaysInAMonth = (year: string, month: string | number): number => {

    const workingDays = dayjs(`${year}-${month}`).daysInMonth();
    return workingDays;
}

export const getAllDaysInAYear = (startDate: Dayjs, endDate: Dayjs): number => {
    let workingDays = 0;
    // 
    while (dayjs(startDate).isSameOrBefore(dayjs(endDate))) {
        workingDays++;
        // dayjs(startDate).add(1, 'day');   
        startDate = dayjs(startDate).add(1, 'day');
    }
    return workingDays;
}

export function getWorkingDaysInYear(year: string) {
    let totalWorkingDays = 0;

    for (let month = 1; month <= 12; month++) {
        totalWorkingDays += getWorkingDaysInMonth(year, month);
    }

    return totalWorkingDays;
}

export function pieAreaLabels(stats: Attendance[]): string[] {
    if (stats.length <= 0) {
        return ['N/A'];
    }

    const label = stats.map((stat: Attendance) => {
        return stat.workingMethod.type;
    });

    return Array.from(new Set(label));
}

export const handleDatesChange = (action: string, type: ManipulateType, setState: React.Dispatch<React.SetStateAction<Dayjs>>) => {
    switch (action) {
        case 'increment':
            setState(state => state.add(1, type));
            return;
        case 'decrement':
            setState(state => state.subtract(1, type));
            return;
        default:
            return;
    }
};

export function pieAreaData(stats: Attendance[]): number[] {
    if (stats.length <= 0) {
        return [0];
    }

    const statMap = new Map<string, number>();

    stats.map((stat: Attendance) => {
        if (!statMap.has(stat.workingMethod.type)) {
            statMap.set(stat.workingMethod.type, 0);
        }

        let value: number | undefined = statMap.get(stat.workingMethod.type);
        statMap.set(stat.workingMethod.type, value! + 1);
    });

    return Array.from(statMap.values());
}

export function todayProgressPercent(stats: Attendance[]): number {
    const todayWorkMins: number = checkInCheckOutDifference(stats[0]);

    if (todayWorkMins >= totalShiftTimeMins) {
        return 100;
    }

    const progressPercent = (todayWorkMins / totalShiftTimeMins) * 100;

    return Math.floor(progressPercent);
}

export function totalProgressPercent(stats: any[], totalWorkingDay: number): number {

    let holidays = donutaDataLabel(stats).get(HOLIDAYS);
    let presents = donutaDataLabel(stats).get(PRESENT);

    if (presents == undefined) {
        return 0;
    }

    const total = totalWorkingDay - holidays!;
    const percentage = (presents! / total) * 100;

    return Math.floor(percentage);
}


export function donutaDataLabel(
    stats: any[],
    filteredLeaves: any[] = [],
    filteredPublicHolidays: any[] = [],
    fromAdmin?: boolean,
    totalWeekend?: number
): Map<string, number> {

    const statMap = new Map<string, number>();

    statMap.set(PRESENT, 0);
    statMap.set(ABSENT, 0);
    statMap.set(ON_LEAVE, filteredLeaves.length);
    statMap.set(EXTRA_DAYS, 0);
    statMap.set(CHECK_OUT_MISSING, 0);

    // Get weekend configuration
    const allWeekends = JSON.parse(
        store.getState().employee.currentEmployee.branches?.workingAndOffDays || "{}"
    );

    // Following heatmap logic:
    // 1. Holidays with isWeekend=true are treated as weekends
    // 2. Holidays with isWeekend=false are treated as pure holidays

    const pureHolidays = filteredPublicHolidays.filter(h => !h.isWeekend);
    const holidayWeekends = filteredPublicHolidays.filter(h => h.isWeekend);

    // Initialize counts - these will be reduced when attendance overrides
    let remainingHolidays = pureHolidays.length;
    let remainingWeekends = totalWeekend ?? 0;

    statMap.set(HOLIDAYS, remainingHolidays);
    statMap.set(WEEKEND, remainingWeekends);

    if (stats.length <= 0) {
        if (filteredLeaves.length > 0 || pureHolidays.length > 0 || holidayWeekends.length > 0) {
            return statMap;
        }
        return new Map<string, number>().set('N/A', 1);
    }

    const joiningRaw = fromAdmin
        ? store.getState().employee.selectedEmployee.dateOfJoining
        : store.getState().employee?.currentEmployee?.dateOfJoining;


    if (!joiningRaw) {
        console.warn("Missing dateOfJoining in employee state");
        return statMap;
    }

    const dateOfJoining = dayjs(joiningRaw);
    if (!dateOfJoining.isValid()) {
        console.error("Invalid dateOfJoining:", joiningRaw);
        return statMap;
    }

    const today = dayjs();

    stats.forEach((stat: any) => {
        const statDate = dayjs(stat.date, "DD MMM YYYY");

        if (statDate.isBefore(dateOfJoining, 'day')) return;

        const weekday = stat?.day?.toLowerCase();
        const statDateFormatted = statDate.format('YYYY-MM-DD');
        let isConfiguredWeekend = allWeekends[weekday] === "0";

        if (!isConfiguredWeekend) {
            const checkInDateFormatted = dayjs(stat.date).format('YYYY-MM-DD');
            // console.log("Checking holiday weekends for date:", checkInDateFormatted, "for stat:", stat);

            const isWeekendFromHoliday = holidayWeekends.some(h => dayjs(h.date).format('YYYY-MM-DD') === checkInDateFormatted);
            if (isWeekendFromHoliday) {
                isConfiguredWeekend = true;
            }
        }

        const isLeaveDay = filteredLeaves.some((leave) => {
            return dayjs(leave.date).format('YYYY-MM-DD') === statDateFormatted;
        });

        // Check if this date is a public holiday
        const matchingHoliday = filteredPublicHolidays.find((holiday) => {
            return dayjs(holiday.date).format('YYYY-MM-DD') === statDateFormatted;
        });
        const isPublicHoliday = !!matchingHoliday;

        const hasValidId = stat.id && stat.id !== undefined && stat.id !== '-' && stat.id !== '';
        const hasCheckIn = stat.checkIn && stat.checkIn !== '' && stat.checkIn !== null && stat.checkIn !== "-NA-";
        const hasCheckOut = stat.checkOut && stat.checkOut !== '' && stat.checkOut !== null && stat.checkOut !== "-NA-";

        // Skip leave days (already counted in ON_LEAVE)
        if (isLeaveDay) {
            return;
        }

        // NEW BUSINESS LOGIC: Attendance on weekend/holiday affects the counts
        if (hasValidId && hasCheckIn && hasCheckOut) {
            // Full attendance
            if (isConfiguredWeekend || isPublicHoliday) {
                statMap.set(EXTRA_DAYS, statMap.get(EXTRA_DAYS)! + 1);

                // Reduce weekend/holiday count since attendance overrode it
                if (isPublicHoliday && matchingHoliday && !matchingHoliday.isWeekend) {
                    remainingHolidays--;
                } else if (isConfiguredWeekend) {
                    remainingWeekends--;
                }
            } else {
                statMap.set(PRESENT, statMap.get(PRESENT)! + 1);
            }
        }
        else if (hasValidId && hasCheckIn && !hasCheckOut) {
            // Partial attendance - always CHECK_OUT_MISSING
            statMap.set(CHECK_OUT_MISSING, statMap.get(CHECK_OUT_MISSING)! + 1);

            // Reduce weekend/holiday count since checkout missing overrode it
            if (isPublicHoliday && matchingHoliday && !matchingHoliday.isWeekend) {
                remainingHolidays--;
            } else if (isConfiguredWeekend) {
                remainingWeekends--;
            }
        }
        else {
            // No attendance - only count as absent if it's a working day and valid stat date
            if (
                !isConfiguredWeekend &&
                !isPublicHoliday &&
                statDate.isSameOrAfter(dateOfJoining, 'day') &&
                statDate.isSameOrBefore(today, 'day')
            ) {
                statMap.set(ABSENT, statMap.get(ABSENT)! + 1);
            }
            // If it's weekend/holiday with no attendance, keep the original count (no reduction)
        }
        // debugger;
    });

    // Update final counts
    statMap.set(HOLIDAYS, Math.max(0, remainingHolidays));
    statMap.set(WEEKEND, Math.max(0, remainingWeekends));


    return statMap;
}

function convertTo24HourFormat(time: string) {
    const [hours, minutesWithPeriod] = time.split(":");
    const [minutes, period] = minutesWithPeriod.split(" ");

    let hours24 = parseInt(hours, 10);

    if (period === "PM" && hours24 !== 12) {
        hours24 += 12;
    } else if (period === "AM" && hours24 === 12) {
        hours24 = 0;
    }

    return `${hours24.toString().padStart(2, "0")}:${minutes}`;
}

let companyTimings = {
    companyCheckIn: '',
    companyCheckOut: '',
    checkInTimeForOnSite: '',
    checkinTimeNewForOnSite: '',
    graceDuration: dayjs.duration(0),
};

let leaveConfigurations: any = {
}

async function fetchCompanyTimings() {
    try {
        const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
        const jsonObject = JSON.parse(configuration.configuration.configuration);

        leaveConfigurations = jsonObject;
        const companyCheckIn = jsonObject["Check-in time"];
        const companyCheckOut = jsonObject["Check-out time"];
        const companyGraceTime = jsonObject['Grace Time'];
        const companyGraceTimeForOnSite = jsonObject['Grace Time - On Site'];
        const graceTimeForAttendancOnSite = jsonObject[onSiteAndHolidayWeekendSettingsOnOffName]

        const graceStr = companyGraceTime?.replace("Hrs", "").trim() || "0";
        const parts = graceStr.split(":").map(Number);
        const onSiteGraceStr = companyGraceTimeForOnSite?.replace("Hrs", "").trim() || "0";

        let graceDuration;
        if (parts.length === 3) {
            graceDuration = dayjs.duration({ hours: parts[0], minutes: parts[1], seconds: parts[2] });
        } else if (parts.length === 2) {
            graceDuration = dayjs.duration({ minutes: parts[0], seconds: parts[1] });
        } else if (parts.length === 1) {
            graceDuration = dayjs.duration({ minutes: parts[0] });
        } else {
            graceDuration = dayjs.duration(0);
        }

        const onSiteGraceParts = onSiteGraceStr.split(":").map(Number);
        let onSiteGraceDuration;
        if (onSiteGraceParts.length === 3) {
            onSiteGraceDuration = dayjs.duration({ hours: onSiteGraceParts[0], minutes: onSiteGraceParts[1], seconds: onSiteGraceParts[2] });
        } else if (onSiteGraceParts.length === 2) {
            onSiteGraceDuration = dayjs.duration({ minutes: onSiteGraceParts[0], seconds: onSiteGraceParts[1] });
        } else if (onSiteGraceParts.length === 1) {
            onSiteGraceDuration = dayjs.duration({ minutes: onSiteGraceParts[0] });
        } else {
            onSiteGraceDuration = dayjs.duration(0);
        }

        // Parse the check-in time and add grace duration
        const checkInTime = dayjs(companyCheckIn, "h:mm A");
        const lateCheckIn = checkInTime.add(graceDuration);
        const lateCheckInForOnSite = lateCheckIn;
        const graceTimeNewOnSite = checkInTime.add(onSiteGraceDuration);
        // Convert to 24-hour format and then to UTC
        const checkInUtcTime = dayjs(`1970-01-01T${lateCheckIn.format("HH:mm")}:00`).utc().format("HH:mm");
        const checkOutUtcTime = dayjs(`1970-01-01T${convertTo24HourFormat(companyCheckOut)}:00`).utc().format("HH:mm");
        const checkInTimeForOnSiteUTC = dayjs(`1970-01-01T${lateCheckInForOnSite.format("HH:mm")}:00`).utc().format("HH:mm");
        const checkinTimeNewForOnSite = dayjs(`1970-01-01T${graceTimeNewOnSite.format("HH:mm")}:00`).utc().format("HH:mm");

        companyTimings = {
            ...companyTimings,
            companyCheckIn: checkInUtcTime !== 'Invalid Date' ? checkInUtcTime : '',
            companyCheckOut: checkOutUtcTime !== 'Invalid Date' ? checkOutUtcTime : '',
            checkInTimeForOnSite: checkInTimeForOnSiteUTC !== 'Invalid Date' ? checkInTimeForOnSiteUTC : '',
            checkinTimeNewForOnSite: checkinTimeNewForOnSite !== 'Invalid Date' ? checkinTimeNewForOnSite : '',
            graceDuration: graceDuration
        };
    } catch (error) {
        console.error("Error fetching company timings:", error);
        // Keep existing companyTimings values if fetch fails
    }
}

// previous implementation
// export function multipleRadialBarData(stats: Attendance[]): Map<string, number> {
//     fetchCompanyTimings();
//     const { companyCheckIn, companyCheckOut, checkInTimeForOnSite } = companyTimings;

//     const statMap = new Map<string, number>();

//     statMap.set(TOTAL_WORKING_DAYS, stats.length);
//     statMap.set(EARLY_CHECKIN, 0);
//     statMap.set(LATE_CHECKIN, 0);
//     statMap.set(EARLY_CHECKOUT, 0);
//     statMap.set(LATE_CHECKOUT, 0);
//     statMap.set(MISSING_CHECKOUT, 0);

//     stats.map((stat: Attendance) => {
//         let checkIn = convertToTime(stat.checkIn);
//         let checkOut = stat.checkOut != null ? convertToTime(stat.checkOut) : null;
//         let isWorkMethodOnSite = false;
//         const workingMethod = stat?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLocaleLowerCase();

//         if(workingMethod?.includes("onsite")){
//             isWorkMethodOnSite = true;
//         }

//         let finalTime = isWorkMethodOnSite ? (checkInTimeForOnSite!='' ? checkInTimeForOnSite: checkInTime): (companyCheckIn!='' ? companyCheckIn : checkInTime) 

//         if (compareTimes(checkIn, checkInTime)) {
//             statMap.set(EARLY_CHECKIN, statMap.get(EARLY_CHECKIN)! + 1);
//         } else {
//             const compareResult = compareTimes(checkIn, finalTime);

//             if(!compareTimes(checkIn, finalTime)){
//                 statMap.set(LATE_CHECKIN, statMap.get(LATE_CHECKIN)! + 1);
//             }
//         }

//         if (checkOut == null) {
//             statMap.set(MISSING_CHECKOUT, statMap.get(MISSING_CHECKOUT)! + 1);
//         } else {
//             if (compareTimes(checkOut, companyCheckOut !== '' ? companyCheckOut : checkOutTime)) {
//                 statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
//             } else {
//                 statMap.set(LATE_CHECKOUT, statMap.get(LATE_CHECKOUT)! + 1);
//             }
//         }
//     });

//     return statMap;
// }

function customTime(workTime: any) {
    if (workTime && (workTime.includes("AM") || workTime.includes("PM"))) {
        // Convert 12-hour to 24-hour format and then to UTC
        const [time, period] = workTime.split(" ");
        const [hours, minutes] = time.split(":");
        let hour24 = parseInt(hours);

        if (period === "PM" && hour24 !== 12) {
            hour24 += 12;
        } else if (period === "AM" && hour24 === 12) {
            hour24 = 0;
        }

        // Create date object and convert to UTC
        const today = new Date();
        const localDateTime = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            hour24,
            parseInt(minutes)
        );
        const utcHour = localDateTime.getUTCHours();
        const utcMinute = localDateTime.getUTCMinutes();

        return `${utcHour.toString().padStart(2, "0")}:${utcMinute
            .toString()
            .padStart(2, "0")}`;
    } else if (workTime) {
        return workTime; // Already in 24-hour format
    }
}

type TimeEntry = {
    check_in: string;
    check_out: string;
    day: string;
    is_active?: boolean
};

type ScheduleRow = {
    day: string;
    check_in: string;
    check_out: string;
    is_active?: boolean;
};

function isDayWiseCheckInCheckOut(checkInDate: string, scheduleRows: ScheduleRow[]): TimeEntry | false {
    const date = new Date(checkInDate);
    if (isNaN(date.getTime())) return false;

    const dayIndex = date.getDay(); // 0 (Sun) to 6 (Sat)
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[dayIndex].toLowerCase();

    // Find the matching row from the DB result (case-insensitive match)
    const matchedRow = scheduleRows.find(row => row.day.toLowerCase() === currentDay);
    if (!matchedRow) return false;

    const checkIn = matchedRow.check_in?.trim().toLowerCase();
    const checkOut = matchedRow.check_out?.trim().toLowerCase();

    if (checkIn && checkOut && matchedRow.is_active) {
        return {
            check_in: matchedRow.check_in,
            check_out: matchedRow.check_out,
            day: matchedRow.day
        };
    }

    return false;
}


export function multipleRadialBarData(stats: Attendance[], dayWiseShifts?: any[]): Map<string, number> {
    fetchCompanyTimings();
    // public holidays and weekends..
    const publicHolidays = store.getState().attendanceStats.publicHolidays;
    let allWeekendsInString = store.getState().employee?.currentEmployee?.branches?.workingAndOffDays || JSON.stringify({})
    let allWeekends = JSON.parse(allWeekendsInString)

    const graceTimeAllowance = leaveConfigurations[onSiteAndHolidayWeekendSettingsOnOffName];
    const onSiteSettingsOn = Number(graceTimeAllowance) > 0 ? true : false;
    const { companyCheckIn, companyCheckOut, checkInTimeForOnSite, checkinTimeNewForOnSite } = companyTimings;
    // console.log("checkinTimeNewForOnSite ==============>",checkinTimeNewForOnSite)

    const statMap = new Map<string, number>();
    const dayMapping: any = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    statMap.set(TOTAL_WORKING_DAYS, stats.length);
    statMap.set(EARLY_CHECKIN, 0);
    statMap.set(LATE_CHECKIN, 0);
    statMap.set(EARLY_CHECKOUT, 0);
    statMap.set(LATE_CHECKOUT, 0);
    statMap.set(MISSING_CHECKOUT, 0);

    // Use day-wise shifts from parameter if provided, otherwise use null
    let schedule = dayWiseShifts && dayWiseShifts.length > 0
        ? dayWiseShifts.map(shift => ({
            day: shift.day.toLowerCase(),
            check_in: shift.checkIn,
            check_out: shift.checkOut,
            is_active: shift.isActive  // Add default value for is_active
        }))
        : null;


    stats.map((stat: Attendance) => {

        let checkIn = convertToTime(stat.checkIn);
        let checkOut = stat.checkOut != null ? convertToTime(stat.checkOut) : null;
        let isWorkMethodOnSite = false;
        const workingMethod = stat?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLocaleLowerCase();
        let isHolidayOrWeekend = false;

        let dayNum = new Date(stat?.checkIn).getDay();
        let dayName = dayMapping[dayNum]?.toLowerCase();

        if ((publicHolidays?.length > 0 && publicHolidays?.some((ele: any) => dayjs(ele?.date).isSame(dayjs(stat?.checkIn), 'day') && !ele?.isDeleted)) || allWeekends?.hasOwnProperty(dayName) && allWeekends[dayName] == "0") {
            isHolidayOrWeekend = true;
        }
        if (workingMethod?.includes("onsite") || isHolidayOrWeekend) {
            isWorkMethodOnSite = true;
        }

        // Check if there's a holiday on this date with from/to times
        const workingHolidayOnThisDate = publicHolidays?.find((holiday: any) =>
            dayjs(holiday?.date).isSame(dayjs(stat?.checkIn), 'day') &&
            !holiday?.isDeleted &&
            holiday?.from && holiday?.from !== '' &&
            holiday?.to && holiday?.to !== ''
        );
        let isDaywiseConfig: TimeEntry | false = isDayWiseCheckInCheckOut(stat?.checkIn, schedule || []);
        // Use holiday's from time as checkInTime if holiday exists with time range
        let actualCheckInTime = checkInTime; // Default to checkInTime format
        let actualCheckOutTime = checkInTime; // Default to checkInTime format

        if (workingHolidayOnThisDate) {
            // Convert holiday time from "1:00 PM" format to UTC format to match checkInTime
            // isHolidayOrWeekend = false
            isWorkMethodOnSite = workingMethod == 'onsite'
            // const workStartTime = workingHolidayOnThisDate.from;
            // const holidayTimeTo = workingHolidayOnThisDate.to;
            actualCheckInTime = customTime(workingHolidayOnThisDate.from)
            actualCheckOutTime = customTime(workingHolidayOnThisDate.to)
        } else if (isDaywiseConfig) {
            isWorkMethodOnSite = workingMethod == 'onsite'
            actualCheckInTime = customTime(isDaywiseConfig.check_in)
            actualCheckOutTime = customTime(isDaywiseConfig.check_out)
        }

        // Apply grace time to actualCheckInTime if it's from custom source (holiday or day-wise shift)
        const { graceDuration } = companyTimings;
        let finalTime
        if (workingHolidayOnThisDate || isDaywiseConfig) {
            // Parse the custom time and add grace duration
            const customCheckInTime = dayjs(`1970-01-01T${actualCheckInTime}:00`);
            const lateCheckInForCustom = customCheckInTime.add(graceDuration);
            finalTime = lateCheckInForCustom.format("HH:mm");
        }
        else {
            finalTime = isWorkMethodOnSite ? (checkInTimeForOnSite != '' ? checkInTimeForOnSite : checkInTime) : (companyCheckIn != '' ? companyCheckIn : checkInTime)
        }
        // Early check-in threshold with grace time based on working method
        // For Office: Check-in time + Grace Time (e.g., 9:30 AM + 40 min = 10:10 AM)
        // For On-Site: Check-in time + Grace Time - On Site (e.g., 9:30 AM + 15 min = 9:45 AM)
        let earlyCheckInThreshold;
        if (workingHolidayOnThisDate || isDaywiseConfig) {
            // For holidays or day-wise shifts, use the custom time with grace
            earlyCheckInThreshold = finalTime;
        } else {
            // For regular days, use grace time based on working method
            earlyCheckInThreshold = isWorkMethodOnSite
                ? (checkinTimeNewForOnSite != '' ? checkinTimeNewForOnSite : checkInTime)  // On-site: check-in + on-site grace
                : (companyCheckIn != '' ? companyCheckIn : checkInTime);  // Office: check-in + default grace
        }

        // console.log("companyCheckIn:: ", companyCheckIn);
        // console.log("companyCheckOut:: ", companyCheckOut);
        // console.log("checkInTimeForOnSite:: ", checkInTimeForOnSite);
        // console.log("checkinTimeNewForOnSite:: ", checkinTimeNewForOnSite);
        // console.log("checkIn:: ", checkIn);
        // console.log("checkInTime:: ", checkInTime);
        // console.log("actualCheckInTime:: ", actualCheckInTime);
        // console.log("holidayOnThisDate:: ", workingHolidayOnThisDate);
        // console.log("isWorkMethodOnSite:: ", isWorkMethodOnSite);
        // console.log("finalTime:: ", finalTime);
        // console.log("earlyCheckInThreshold:: ", earlyCheckInThreshold);
        // debugger
        if (compareTimes(checkIn, earlyCheckInThreshold)) {
            statMap.set(EARLY_CHECKIN, statMap.get(EARLY_CHECKIN)! + 1);
        } else {

            const compareResult = compareTimes(checkIn, finalTime);
            if (compareTimes(checkIn, finalTime) == false) {
                // console.log("settingLateAttendance:::");
                if (!(onSiteSettingsOn && isWorkMethodOnSite) && !isHolidayOrWeekend) {

                    statMap.set(LATE_CHECKIN, statMap.get(LATE_CHECKIN)! + 1);
                }
            }
        }

        if (checkOut == null) {
            statMap.set(MISSING_CHECKOUT, statMap.get(MISSING_CHECKOUT)! + 1);
        } else {
            if (workingHolidayOnThisDate) {
                if (compareTimes(checkOut, actualCheckOutTime)) {
                    if (!(onSiteSettingsOn && isWorkMethodOnSite)) {
                        statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
                    }
                } else {
                    if (compareTimes(checkOut, actualCheckOutTime)) {
                        if (!(onSiteSettingsOn && isWorkMethodOnSite)) {
                            statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
                        }
                    } else {
                        statMap.set(LATE_CHECKOUT, statMap.get(LATE_CHECKOUT)! + 1);
                    }
                }
            } else if (isDaywiseConfig) {
                if (compareTimes(checkOut, actualCheckOutTime)) {
                    if (!(onSiteSettingsOn && isWorkMethodOnSite)) {
                        statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
                    }
                } else {
                    if (compareTimes(checkOut, actualCheckOutTime)) {
                        if (!(onSiteSettingsOn && isWorkMethodOnSite)) {
                            statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
                        }
                    } else {
                        statMap.set(LATE_CHECKOUT, statMap.get(LATE_CHECKOUT)! + 1);
                    }
                }
            } else {
                if (compareTimes(checkOut, companyCheckOut !== '' ? companyCheckOut : checkOutTime)) {
                    if (!(onSiteSettingsOn && isWorkMethodOnSite)) {
                        statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
                    }
                } else {
                    if (compareTimes(checkOut, companyCheckOut !== '' ? companyCheckOut : checkOutTime)) {
                        if (!(onSiteSettingsOn && isWorkMethodOnSite)) {
                            statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
                        }
                    } else {
                        statMap.set(LATE_CHECKOUT, statMap.get(LATE_CHECKOUT)! + 1);
                    }
                }
            }
        }
        // console.log("statMap:: ", statMap);
    });

    return statMap;
}

// export function multipleRadialBarDataForConsideringOnSiteCheckin(stats: Attendance[]): Map<string, number> {
//     fetchCompanyTimings();
//     const graceTimeAllowance = leaveConfigurations[onSiteAndHolidayWeekendSettingsOnOffName];
//     const onSiteSettingsOn = Number(graceTimeAllowance) > 0 ? true : false;
//     const { companyCheckIn, companyCheckOut, checkInTimeForOnSite } = companyTimings;

//     const statMap = new Map<string, number>();

//     statMap.set(TOTAL_WORKING_DAYS, stats.length);
//     statMap.set(EARLY_CHECKIN, 0);
//     statMap.set(LATE_CHECKIN, 0);
//     statMap.set(EARLY_CHECKOUT, 0);
//     statMap.set(LATE_CHECKOUT, 0);
//     statMap.set(MISSING_CHECKOUT, 0);

//     stats.map((stat: Attendance) => {
//         let checkIn = convertToTime(stat.checkIn);
//         let checkOut = stat.checkOut != null ? convertToTime(stat.checkOut) : null;
//         let isWorkMethodOnSite = false;
//         const workingMethod = stat?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLocaleLowerCase();

//         if(workingMethod?.includes("onsite")){
//             isWorkMethodOnSite = true;
//         }

//         let finalTime = isWorkMethodOnSite ? (checkInTimeForOnSite!='' ? checkInTimeForOnSite: checkInTime): (companyCheckIn!='' ? companyCheckIn : checkInTime) 


//         if (compareTimes(checkIn, checkInTime)) {
//             statMap.set(EARLY_CHECKIN, statMap.get(EARLY_CHECKIN)! + 1);
//         } else {
//             const compareResult = compareTimes(checkIn, finalTime);

//             if(!compareTimes(checkIn, finalTime)){
//                 if(!(onSiteSettingsOn && isWorkMethodOnSite)){
//                     statMap.set(LATE_CHECKIN, statMap.get(LATE_CHECKIN)! + 1);
//                 }
//             }
//         }

//         if (checkOut == null) {
//             statMap.set(MISSING_CHECKOUT, statMap.get(MISSING_CHECKOUT)! + 1);
//         } else {
//             if (compareTimes(checkOut, companyCheckOut !== '' ? companyCheckOut : checkOutTime)) {
//                 statMap.set(EARLY_CHECKOUT, statMap.get(EARLY_CHECKOUT)! + 1);
//             } else {
//                 statMap.set(LATE_CHECKOUT, statMap.get(LATE_CHECKOUT)! + 1);
//             }
//         }
//     });

//     return statMap;
// }

export function allStreaksIndicator(stats: Attendance[], isCurrentDate: boolean = true): number[] {
    if (stats.length <= 0) {
        return [0, 0];
    }

    const holidays = store.getState().attendanceStats.filteredPublicHolidays;
    let streak = 0;

    const newStats = stats.filter((stat: Attendance) => stat.checkIn !== null && stat.checkIn !== '' && stat.checkOut !== null && stat.checkOut !== '');

    if (isCurrentDate) {
        newStats.push({
            checkIn: dayjs().format('YYYY-MM-DD'),
            id: "",
            employeeId: "",
            checkOut: "",
            latitude: 0,
            longitude: 0,
            remarks: null,
            leaveTrackedId: null,
            checkInLocation: "",
            workingMethod: {
                type: ""
            }
        });
    }

    let lastAttendance = newStats[newStats.length - 1];

    let streaks: any[] = [];
    let streakArray: any[] = [dayjs(lastAttendance?.checkIn).format('YYYY-MM-DD')];

    for (let index = newStats.length - 1; index > 0; index--) {
        const prevDate = dayjs(newStats[index - 1].checkIn).startOf('day');
        const currentDate = dayjs(newStats[index].checkIn).startOf('day');

        const differenceBetweenPrevToday = currentDate.diff(prevDate, 'day');

        const gapDates = [];

        let isExtraDay = false;

        if (differenceBetweenPrevToday > 1) {
            for (let i = 1; i < differenceBetweenPrevToday; i++) {
                gapDates.push(
                    {
                        date: prevDate.add(i, 'day').format('YYYY-MM-DD'),
                        day: prevDate.add(i, 'day').format('dddd')
                    }
                );
            }

            isExtraDay = gapDates.every((dates) => holidays.some((holiday: any) => dayjs(holiday.date).format('YYYY-MM-DD') === dates.date) || dates.day === 'Saturday' || dates.day === 'Sunday');
        }

        if (isExtraDay) {
            streak = streak + 1;

            streakArray.push(prevDate.format('YYYY-MM-DD'));
        } else if (differenceBetweenPrevToday <= 1) {
            streak = streak + 1;
            streakArray.push(prevDate.format('YYYY-MM-DD'));
        } else {
            streaks.push(Array.from(new Set([...streakArray])));
            streakArray = [prevDate.format('YYYY-MM-DD')];
            streak = 0;
        }
    }

    if (streakArray.length) {
        streaks.push([...streakArray]);
    }

    const finalStreaks = streaks.map((streak) => streak.length);

    const withoutCurrentStreak = finalStreaks.slice(1);

    const currentStreak = isCurrentDate ? finalStreaks[0] - 1 : finalStreaks[0];
    const lastStreak = withoutCurrentStreak.length > 0 ? Math.max(...withoutCurrentStreak) : 0;

    return [currentStreak, lastStreak];
}

export function dumbellSeriesWeeklyData(stats: Attendance[]) {
    const weeklyGeneratedDate = generateDatesForStatsTable(stats);
    const weeklyGeneratedData = transformAttendanceInUTC(weeklyGeneratedDate, stats);

    const data = weekDays.map((day) => ({ x: day, y: [0, 0], checkIn: '', checkOut: '' }));

    weeklyGeneratedData.map((stat: IAttendance) => {
        if (stat.checkOut != "-NA-" || stat.checkOut !== null) {
            const index = data.findIndex(line => stat.day.startsWith(line.x));
            const lineData = data[index];
            lineData.checkIn = stat.checkIn;
            lineData.checkOut = stat.checkOut;
            lineData.y = [timeToMinutes(stat.checkIn), timeToMinutes(stat.checkOut)];
        }
    });

    return data;
}

export function dumbellSeriesMonthlyData(stats: Attendance[]) {
    const monthlyGeneratedDate = generateDatesForStatsTable(stats);
    const monthlyGeneratedData = transformAttendanceInUTC(monthlyGeneratedDate, stats);

    const data = monthDays.map((day) => ({ x: day, y: [0, 0], checkIn: '', checkOut: '' }));

    monthlyGeneratedData.map((stat: IAttendance) => {
        const index = data.findIndex((line) => stat.date.split(' ')[0] === line.x.split(' ')[0]);
        const lineData = data[index];

        lineData.checkIn = stat.checkIn;
        lineData.checkOut = stat.checkOut;

        // Set checkout to -1 if missing
        const isMissingCheckout = stat.checkOut === "-NA-" || !stat.checkOut;
        lineData.y = [
            timeToMinutes(stat.checkIn),
            isMissingCheckout ? -1 : timeToMinutes(stat.checkOut)
        ]
    });

    return data;
}

export function barWeeklyData(stats: Attendance[]) {
    const weeklyGeneratedDate = generateDatesForStatsTable(stats);
    const weeklyGeneratedData = transformAttendanceInUTC(weeklyGeneratedDate, stats);

    const data: number[] = Array(7).fill(0);

    weeklyGeneratedData.map((stat: IAttendance) => {
        if (stat.checkOut != "-NA-") {
            const index = weekDays.findIndex(day => stat.day.startsWith(day));
            data[index] = getTimeDifference(convertToUTC(stat.checkIn), convertToUTC(stat.checkOut));
        }
    });

    return data;
}

function parseFlexibleTimes(timeStr: string): number | null {
    const parts = timeStr.trim().split(":");
    if (parts.length !== 2) return null;

    const [hh, mm] = parts.map(x => parseInt(x, 10));
    if (isNaN(hh) || isNaN(mm)) return null;

    return hh * 60 + mm;
}


export function barMonthlyData(stats: Attendance[]) {
    const leaveManagement = store.getState().featureConfiguration?.leaveManagement;
    const disableLunchTimeDeduction = store.getState().featureConfiguration?.disableLaunchDeductionTime;
    const lunchTime = leaveManagement?.["Lunch Time"];

    const monthlyGeneratedDate = generateDatesForStatsTable(stats);
    const monthlyGeneratedData = transformAttendanceInUTC(monthlyGeneratedDate, stats);

    const data: number[] = Array(31).fill(0);

    monthlyGeneratedData.map((stat: IAttendance) => {
        if (stat.checkOut !== "-NA-") {
            const index = monthDays.findIndex(day => stat.date.split(' ')[0] === day);
            let totalMinutes = getTimeDifference(convertToUTC(stat.checkIn), convertToUTC(stat.checkOut));

            if (disableLunchTimeDeduction === true && lunchTime) {
                const [startRaw, endRaw] = lunchTime.replace(/\s*-\s*/, '-').split("-");
                const startMin = parseFlexibleTimes(startRaw);
                const endMin = parseFlexibleTimes(endRaw);

                if (startMin !== null && endMin !== null) {
                    const lunchMinutes = endMin - startMin;

                    // Only deduct if total working time is reasonable
                    if (totalMinutes > lunchMinutes + 60) {
                        totalMinutes -= lunchMinutes;
                    }
                }
            }

            data[index] = totalMinutes;
        }
    });

    return data;
}


export function barYearlyData(stats: Attendance[]) {
    const yearlyGeneratedDate = generateDatesForStatsTable(stats);
    const yearlyGeneratedData = transformAttendanceInUTC(yearlyGeneratedDate, stats);

    const yearData: number[] = Array(12).fill(0);

    interface YearData {
        index: number,
        data: IAttendance[]
    };

    const yearMap = new Map<string, YearData>();

    months.map(month => yearMap.set(month, {
        index: 0,
        data: []
    }));

    yearlyGeneratedData.map((stat: IAttendance) => {
        if (stat.checkOut != "-NA-") {
            let month = stat.date.split(' ')[1];
            const index = months.findIndex(day => month === day);

            if (stat.checkIn != '-' && stat.checkIn != '-N/A-' && stat.checkOut != '-' && stat.checkOut != '-N/A-') {
                let attendance = yearMap.get(month);
                attendance!.data.push(stat);
                yearData[index] = Math.floor(totalMinutes(attendance!.data) / 60);
            }
        }
    });

    return yearData;
}

export function barDailyData(stats: IEmployeesAttendance[], users: string[]): Map<string, number> {
    const data = new Map<string, number>();

    users.map((user) => {
        data.set(user, 0);
    })

    // Get lunch deduction settings from Redux
    const leaveManagement = store.getState().featureConfiguration?.leaveManagement;
    const disableLunchTimeDeduction = store.getState().featureConfiguration?.disableLaunchDeductionTime;
    const lunchTime = leaveManagement?.["Lunch Time"];
    const appSettingWorkingHours = store.getState().appSettings?.workingHours;

    let lunchMinutesToDeduct = 0;

    if (disableLunchTimeDeduction === true && lunchTime) {
        const [startRaw, endRaw] = lunchTime.replace(/\s*-\s*/, "-").split("-");
        const startParts = startRaw.trim().split(/[\s:]+/);
        const endParts = endRaw.trim().split(/[\s:]+/);

        const parseTime12Hour = (parts: string[]) => {
            let hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            const period = parts[2];

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            return hours * 60 + minutes;
        };

        const startMin = parseTime12Hour(startParts);
        const endMin = parseTime12Hour(endParts);

        if (!isNaN(startMin) && !isNaN(endMin)) {
            lunchMinutesToDeduct = endMin - startMin;
        }
    }

    stats.map((stat: IEmployeesAttendance) => {
        let diffMinutes = 0;

        // Skip if checkIn is not available (absent employee)
        if (!stat.checkIn || stat.checkIn === '-NA-') {
            data.set(stat.name, 0);
            return;
        }

        if (stat.checkOut == "-NA-") {
            const currentTime = new Date();
            const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            diffMinutes = getTimeDifference(convertToUTC(stat.checkIn), convertToUTC(formattedTime));
        } else {
            diffMinutes = getTimeDifference(convertToUTC(stat.checkIn), convertToUTC(stat.checkOut));
        }

        // Apply lunch deduction if enabled and working time is long enough
        if (
            disableLunchTimeDeduction === true &&
            lunchMinutesToDeduct > 0 &&
            diffMinutes > (((appSettingWorkingHours || 0) / 2) * 60 + (lunchMinutesToDeduct || 0))
        ) {
            diffMinutes -= lunchMinutesToDeduct;
        }

        data.set(stat.name, diffMinutes);
    });

    return data;
}

interface HeatMapSeries {
    name: string,
    data: number[]
}

const generatingHeatMapSeries = (
    yearMap: Map<string, IAttendance[]>,
    year: string,
    dateSettingsEnabled?: boolean,
    fromAdmin?: boolean
): HeatMapSeries[] => {
    const series: HeatMapSeries[] = [];
    const today = dayjs();

    // Get weekend configuration
    const weekends = store.getState().employee.currentEmployee.branches.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");

    yearMap.forEach((value, key) => {

        let startDate = dayjs(`${year}-${key}-01`).format('YYYY-MM-DD');
        let endDate = dayjs(`${year}-${key}-${dayjs(`${year}-${key}-01`).daysInMonth()}`).format('YYYY-MM-DD');

        if (dateSettingsEnabled &&
            today.format('YYYY') === year &&
            (today.format('MMM') === key ||
                (today.format('MMM') === "Sep" && key === "Sept"))) {
            endDate = today.format('YYYY-MM-DD');
        }

        const leavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true, dateSettingsEnabled);

        const daysInMonth = dayjs(`${year}-${key}-01`).daysInMonth();
        const data: number[] = Array(31).fill(5);

        const monthDays: string[] = Array.from({ length: daysInMonth }, (_, i) =>
            (i + 1).toString().padStart(2, '0')
        );

        // Apply leaves
        leavesHolidays?.customLeaves.forEach((leave: CustomLeaves) => {
            const index = monthDays.findIndex(day => day === dayjs(leave.date).format('DD'));
            if (index >= 0) {
                data[index] = HEATMAPLABELS.ON_LEAVE;
            }
        });

        // Apply holidays - ADD DETAILED DEBUGGING HERE
        let holidayCount = 0;
        leavesHolidays?.publicHolidays.forEach((holiday: IPublicHoliday) => {
            const index = monthDays.findIndex(day => day === dayjs(holiday.date).format('DD'));
            const holidayDay = dayjs(holiday.date).format('DD');
            const holidayWeekday = dayjs(holiday.date).format('dddd');


            if (holiday.isWeekend === true && index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
                data[index] = HEATMAPLABELS.WEEKEND;
                holidayCount++;
            }

            if (holiday.isWeekend === false && index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
                data[index] = HEATMAPLABELS.HOLIDAY;
                holidayCount++;
            }

            if (index === -1) {
                console.warn("Holiday skipped (not in current month):", holiday.date);
            }
        });


        // Mark weekends BEFORE attendance (can be overridden)
        for (let i = 0; i < daysInMonth; i++) {
            const dateStr = `${year}-${key}-${(i + 1).toString().padStart(2, '0')}`;
            const day = dayjs(dateStr);
            const weekday = day.format('dddd').toLowerCase();
            const isWeekendDay = allWeekends[weekday] === "0";
            const alreadyMarked = data[i] !== 5;


            if (isWeekendDay && !alreadyMarked) {
                data[i] = HEATMAPLABELS.WEEKEND;
            }
        }

        // Check data state after weekend processing

        // Apply attendance
        value.forEach((stat: IAttendance) => {
            const statDate = dayjs(stat.date, 'DD MMM YYYY');
            const index = monthDays.findIndex(day => statDate.format('DD') === day);
            const isInRange = statDate.isSameOrAfter(dayjs(startDate)) && statDate.isSameOrBefore(dayjs(endDate));
            const isUpToToday = statDate.isSameOrBefore(today, 'day');


            if (index >= 0 && isInRange && isUpToToday) {
                const statDateFormatted = statDate.format('YYYY-MM-DD');
                const weekday = stat.day?.toLowerCase();
                const isWeekendDay = allWeekends[weekday] === "0";

                const isLeaveDay = leavesHolidays?.customLeaves.some(leave =>
                    dayjs(leave.date).format('YYYY-MM-DD') === statDateFormatted
                );

                const isPublicHoliday = leavesHolidays?.publicHolidays.some(holiday =>
                    dayjs(holiday.date).format('YYYY-MM-DD') === statDateFormatted
                );

                const hasValidId = stat.id && stat.id !== '-' && stat.id !== '';
                const hasCheckIn = stat.checkIn && stat.checkIn !== '' && stat.checkIn !== null && stat.checkIn !== "-NA-";
                const hasCheckOut = stat.checkOut && stat.checkOut !== '' && stat.checkOut !== null && stat.checkOut !== "-NA-";


                if (isLeaveDay) {
                    return; // Skip, already marked
                }

                // Following donut chart logic exactly
                if (hasValidId && hasCheckIn && hasCheckOut) {
                    // Employee worked - following donut logic
                    if (isWeekendDay || isPublicHoliday) {
                        data[index] = HEATMAPLABELS.EXTRA_DAY;
                    } else {
                        data[index] = HEATMAPLABELS.PRESENT;
                    }
                }
                else if (hasValidId && hasCheckIn && !hasCheckOut) {
                    // Following donut logic: checkout missing is always CHECK_OUT_MISSING
                    // regardless of holiday/weekend status
                    data[index] = HEATMAPLABELS.CHECK_OUT_MISSING;
                }
                else {
                    // No attendance - only count as absent if it's a working day
                    if (!isWeekendDay && !isPublicHoliday) {
                        data[index] = HEATMAPLABELS.ABSENT;
                        // console.log(`Applied ABSENT at index ${index} (was ${data[index]} before)`);
                    } else {
                        // console.log(`Skipping absent marking - is weekend/holiday`);
                    }
                }

                // console.log(`After processing - data[${index}] = ${data[index]}`);
            }
        });

        // Check data state after attendance processing

        // Mark future days as N/A
        if (dateSettingsEnabled &&
            today.format('YYYY') === year &&
            (today.format('MMM') === key ||
                (today.format('MMM') === "Sep" && key === "Sept"))) {

            const todayDay = parseInt(today.format('DD'));
            for (let i = todayDay; i < 31; i++) {
                if (i < daysInMonth) {
                    data[i] = 5;
                }
            }
        }

        // Final summary for this month
        const valueCounts = data.slice(0, daysInMonth).reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        Object.entries(valueCounts).forEach(([value, count]) => {
            const label = Object.entries(HEATMAPLABELS).find(([k, v]) => v === parseInt(value));
        });

        series.push({
            name: key,
            data: data
        });
    });

    return series;
};

export const monthHeatMap = (stats: IAttendance[], monthly: Dayjs, dateSettingsEnabled?: boolean, fromAdmin?: boolean, weekendCount?: number): HeatMapSeries[] => {

    const rawDOJ = fromAdmin ? store.getState().employee.selectedEmployee.dateOfJoining : store.getState().employee?.currentEmployee?.dateOfJoining;
    const dateOfJoining = rawDOJ ? dayjs(rawDOJ) : null;

    const targetMonth = monthly.format('MMM') === "Sep" ? "Sept" : monthly.format('MMM');
    const targetYear = monthly.format('YYYY');

    const monthMap = new Map<string, IAttendance[]>();
    monthMap.set(targetMonth, []);

    stats.forEach((stat) => {
        const statDate = dayjs(stat.date, "DD MMM YYYY");
        if (!statDate.isValid()) return;
        if (dateOfJoining && statDate.isBefore(dateOfJoining, 'day')) return;

        const statMonth = statDate.format('MMM') === "Sep" ? "Sept" : statDate.format('MMM');
        const statYear = statDate.format('YYYY');
        // Only include stats from the selected month & year
        if (statMonth === targetMonth && statYear === targetYear) {
            monthMap.get(targetMonth)?.push(stat);
        }
    });


    const series: HeatMapSeries[] = generatingHeatMapSeries(monthMap, targetYear, dateSettingsEnabled, fromAdmin);
    return series;
};

export const weekHeatMap = (
    stats: IAttendance[],
    startWeek: Dayjs,
    endWeek: Dayjs,
    fromAdmin?: boolean
): HeatMapSeries[] => {
    const today = dayjs();
    const dateOfJoining = fromAdmin
        ? store.getState().employee.selectedEmployee?.dateOfJoining
        : store.getState().employee.currentEmployee?.dateOfJoining;
    const doj = dateOfJoining ? dayjs(dateOfJoining, "YYYY-MM-DD") : null;

    const weekends = store.getState().employee.currentEmployee?.branches?.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");

    const startDate = startWeek.format("YYYY-MM-DD");
    const endDate = endWeek.format("YYYY-MM-DD");

    const leavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true);

    const weekDays: string[] = Array.from({ length: 7 }, (_, i) =>
        startWeek.clone().add(i, "day").format("YYYY-MM-DD")
    );

    const data: number[] = Array(7).fill(5);

    // 1. Mark custom leaves
    leavesHolidays?.customLeaves.forEach((leave) => {
        const index = weekDays.findIndex(
            (day) => day === dayjs(leave.date).format("YYYY-MM-DD")
        );
        if (index >= 0) {
            data[index] = HEATMAPLABELS.ON_LEAVE;
        }
    });

    // 2. Mark holidays and weekend holidays
    leavesHolidays?.publicHolidays.forEach((holiday) => {
        const holidayDate = dayjs(holiday.date);
        if (!holidayDate.isBetween(startWeek, endWeek, "day", "[]")) return;

        const dateStr = holidayDate.format("YYYY-MM-DD");
        const index = weekDays.findIndex((day) => day === dateStr);

        if (index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
            data[index] = holiday.isWeekend
                ? HEATMAPLABELS.WEEKEND
                : HEATMAPLABELS.HOLIDAY;
        }
    });


    // 3. Mark weekends (if not already marked)
    weekDays.forEach((dateStr, i) => {
        const day = dayjs(dateStr);
        const weekday = day.format("dddd").toLowerCase();
        const isWeekend = allWeekends[weekday] === "0";
        const alreadyMarked = data[i] !== 5;

        if (
            day.isSameOrAfter(startWeek, "day") &&
            day.isSameOrBefore(endWeek, "day") &&
            isWeekend &&
            !alreadyMarked
        ) {
            data[i] = HEATMAPLABELS.WEEKEND;
        }
    });


    // 4. Attendance
    stats.forEach((stat) => {
        const statDate = dayjs(stat.date, "DD MMM YYYY");
        const dateStr = statDate.format("YYYY-MM-DD");
        const index = weekDays.findIndex((day) => day === dateStr);

        if (
            index < 0 ||
            !stat.day ||
            (doj && statDate.isBefore(doj, "day")) ||
            statDate.isAfter(today, "day")
        )
            return;

        const weekday = stat.day.toLowerCase();
        const isWeekend = allWeekends[weekday] === "0";

        const isLeaveDay = leavesHolidays?.customLeaves.some(
            (l) => dayjs(l.date).format("YYYY-MM-DD") === dateStr
        );

        const isPublicHoliday = leavesHolidays?.publicHolidays.some(
            (h) => dayjs(h.date).format("YYYY-MM-DD") === dateStr
        );

        const hasValidId = stat.id && stat.id !== "-" && stat.id !== "";
        const hasCheckIn =
            stat.checkIn && stat.checkIn !== "" && stat.checkIn !== "-NA-";
        const hasCheckOut =
            stat.checkOut && stat.checkOut !== "" && stat.checkOut !== "-NA-";

        if (isLeaveDay) return; // Already marked

        if (hasValidId && hasCheckIn && hasCheckOut) {
            data[index] =
                isWeekend || isPublicHoliday
                    ? HEATMAPLABELS.EXTRA_DAY
                    : HEATMAPLABELS.PRESENT;
        } else if (hasValidId && hasCheckIn && !hasCheckOut) {
            data[index] = HEATMAPLABELS.CHECK_OUT_MISSING;
        } else {
            if (!isWeekend && !isPublicHoliday) {
                data[index] = HEATMAPLABELS.ABSENT;
            }
        }
    });

    return [{ name: "Week Days", data }];
};


export const yearHeatMap = (stats: any[], year: string, dateSettingsEnabled?: boolean, fromAdmin?: boolean, totalWeekendCount?: number): HeatMapSeries[] => {
    // const generatedDates = generateDatesForStatsTable(stats);
    // const yearlyGeneratedData = transformAttendanceInUTC(generatedDates, stats);

    const dateOfJoining = fromAdmin ? store.getState().employee.selectedEmployee.dateOfJoining : store.getState().employee?.currentEmployee?.dateOfJoining;
    const doj = dateOfJoining ? dayjs(dateOfJoining, 'YYYY-MM-DD') : null;

    // Create Map to store monthly attendance data
    const yearMap = new Map<string, IAttendance[]>();
    months.forEach(month => yearMap.set(month, []));

    const fiscalYearStart = dayjs(`${year}-04-01`);
    let fiscalYearEnd = dayjs(`${parseInt(year) + 1}-03-31`);

    const today = dayjs();
    const isCurrentFiscalYear = today.isAfter(fiscalYearStart) && today.isBefore(fiscalYearEnd);

    let effectiveEndDate = fiscalYearEnd;
    if (dateSettingsEnabled && isCurrentFiscalYear) {
        effectiveEndDate = today;
    }

    // Filter data based on the appropriate date range
    const filteredStats = stats.filter((stat: IAttendance) => {
        const statDate = dayjs(stat.date, 'DD MMM YYYY');
        if (!statDate.isValid()) return false;
        if (dateOfJoining && statDate.isBefore(doj, 'day')) return false;
        return statDate.isSameOrAfter(fiscalYearStart, 'day') && statDate.isSameOrBefore(effectiveEndDate, 'day');
    });

    // Organize attendance data by month
    filteredStats.forEach((stat: any) => {
        const month = stat.date.split(' ')[1];
        if (months.includes(month)) {
            const monthAttendance = yearMap.get(month) || [];
            monthAttendance.push(stat);
            yearMap.set(month, monthAttendance);
        }
    });

    // Generate heat map series for the fiscal year
    return generatingHeatMapSeriesForFiscalYear(yearMap, year, dateSettingsEnabled, fromAdmin, totalWeekendCount);
};

export const generatingHeatMapSeriesForFiscalYear = (
    yearMap: Map<string, any[]>,
    year: string,
    dateSettingsEnabled?: boolean,
    fromAdmin?: boolean,
    totalWeekendCount?: number
): HeatMapSeries[] => {
    const series: HeatMapSeries[] = [];
    const today = dayjs();

    // Get weekend configuration
    const weekends = store.getState().employee.currentEmployee.branches.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");

    const fiscalMonths = [
        'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
        'Jan', 'Feb', 'Mar'
    ];

    fiscalMonths.forEach(month => {
        const isNextCalendarYear = ['Jan', 'Feb', 'Mar'].includes(month);
        const calendarYear = isNextCalendarYear ? (parseInt(year) + 1).toString() : year;

        let startDate = dayjs(`${calendarYear}-${getNumericMonth(month)}-01`).format('YYYY-MM-DD');
        let endDate = dayjs(`${calendarYear}-${getNumericMonth(month)}-${dayjs(`${calendarYear}-${getNumericMonth(month)}-01`).daysInMonth()}`).format('YYYY-MM-DD');

        if (dateSettingsEnabled) {
            const monthStart = dayjs(`${calendarYear}-${getNumericMonth(month)}-01`);

            if (monthStart.isAfter(today, 'month')) {
                series.push({
                    name: month,
                    data: Array(31).fill(5)
                });
                return;
            }

            if (today.format('YYYY') === calendarYear &&
                (today.format('MMM') === month || (today.format('MMM') === "Sep" && month === "Sept"))) {
                endDate = today.format('YYYY-MM-DD');
            }
        }

        const leavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true, dateSettingsEnabled);
        const daysInMonth = dayjs(`${calendarYear}-${getNumericMonth(month)}-01`).daysInMonth();
        const data: number[] = Array(31).fill(5);

        const monthDays: string[] = Array.from({ length: daysInMonth }, (_, i) =>
            (i + 1).toString().padStart(2, '0')
        );

        // Leaves
        leavesHolidays?.customLeaves.forEach((leave: CustomLeaves) => {
            const index = monthDays.findIndex((day) => day === dayjs(leave.date).format('DD'));
            if (index >= 0) {
                data[index] = HEATMAPLABELS.ON_LEAVE;
            }
        });

        // Apply holidays
        leavesHolidays?.publicHolidays.forEach((holiday: IPublicHoliday) => {
            const index = monthDays.findIndex(day => day === dayjs(holiday.date).format('DD'));
            // If holiday is also a weekend, only mark as WEEKEND if not already marked as ON_LEAVE
            if (holiday.isWeekend === true) {
                if (index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
                    data[index] = HEATMAPLABELS.WEEKEND;
                }
                return;
            }
            // Only mark as holiday if not already marked as leave and isWeekend is false
            if (index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
                data[index] = HEATMAPLABELS.HOLIDAY;
            }
        });
        // After marking holidays, mark weekends (if not already marked)
        for (let i = 0; i < daysInMonth; i++) {
            const dateStr = `${calendarYear}-${getNumericMonth(month)}-${(i + 1).toString().padStart(2, '0')}`;
            const day = dayjs(dateStr);
            const weekday = day.format('dddd').toLowerCase();
            const isWeekendDay = allWeekends[weekday] === "0";
            const alreadyMarked = data[i] !== 5;
            const isHoliday = leavesHolidays?.publicHolidays.some(
                (holiday: IPublicHoliday) => dayjs(holiday.date).format('YYYY-MM-DD') === dateStr && !holiday.isWeekend
            );
            const shouldMarkWeekend = dateSettingsEnabled
                ? (day.isSameOrAfter(dayjs(startDate)) && day.isSameOrBefore(dayjs(endDate)))
                : true;
            // Only mark as weekend if not already marked and not a holiday
            if (isWeekendDay && !alreadyMarked && !isHoliday && shouldMarkWeekend) {
                data[i] = HEATMAPLABELS.WEEKEND;
            }
        }

        // Weekends
        for (let i = 0; i < daysInMonth; i++) {
            const dateStr = `${calendarYear}-${getNumericMonth(month)}-${(i + 1).toString().padStart(2, '0')}`;
            const day = dayjs(dateStr);
            const weekday = day.format('dddd').toLowerCase();
            const isWeekendDay = allWeekends[weekday] === "0";
            const alreadyMarked = data[i] !== 5;

            const shouldMarkWeekend = dateSettingsEnabled
                ? (day.isSameOrAfter(dayjs(startDate)) && day.isSameOrBefore(dayjs(endDate)))
                : true;

            if (isWeekendDay && !alreadyMarked && shouldMarkWeekend) {
                data[i] = HEATMAPLABELS.WEEKEND;
            }
        }

        // Attendance
        const monthAttendance = yearMap.get(month) || [];

        monthAttendance.forEach((stat: IAttendance) => {
            const statDate = dayjs(stat.date, 'DD MMM YYYY');
            const index = monthDays.findIndex(day => statDate.format('DD') === day);
            const isInRange = statDate.isSameOrAfter(dayjs(startDate)) && statDate.isSameOrBefore(dayjs(endDate));
            const isUpToToday = statDate.isSameOrBefore(today, 'day');

            if (index >= 0 && isInRange) {
                const statDateFormatted = statDate.format('YYYY-MM-DD');
                const weekday = stat.day?.toLowerCase();
                const isWeekendDay = allWeekends[weekday] === "0";

                const isLeaveDay = leavesHolidays?.customLeaves.some((leave: CustomLeaves) =>
                    dayjs(leave.date).format('YYYY-MM-DD') === statDateFormatted
                );

                const isHoliday = leavesHolidays?.publicHolidays.some((holiday: IPublicHoliday) =>
                    dayjs(holiday.date).format('YYYY-MM-DD') === statDateFormatted
                );

                const hasValidId = stat.id && stat.id !== '-' && stat.id !== '';
                const hasCheckIn = stat.checkIn && stat.checkIn !== '' && stat.checkIn !== null && stat.checkIn !== "-NA-";
                const hasCheckOut = stat.checkOut && stat.checkOut !== '' && stat.checkOut !== null && stat.checkOut !== "-NA-";

                if (isLeaveDay) return;

                if (hasValidId && hasCheckIn && hasCheckOut) {
                    const isExtraWorkingDay = leavesHolidays?.publicHolidays.some((holiday: IPublicHoliday) =>
                        dayjs(holiday.date).format('YYYY-MM-DD') === statDateFormatted
                    );

                    if (isWeekendDay || isExtraWorkingDay) {
                        data[index] = HEATMAPLABELS.EXTRA_DAY;
                    } else {
                        data[index] = HEATMAPLABELS.PRESENT;
                    }
                } else if (hasValidId && hasCheckIn && !hasCheckOut) {
                    data[index] = HEATMAPLABELS.CHECK_OUT_MISSING;
                } else if (isUpToToday && !isWeekendDay && !isHoliday && !isLeaveDay && (!hasCheckIn || !hasCheckOut)) {
                    data[index] = HEATMAPLABELS.ABSENT;
                }
            }
        });

        // Future days as N/A
        if (dateSettingsEnabled &&
            today.format('YYYY') === calendarYear &&
            (today.format('MMM') === month || (today.format('MMM') === "Sep" && month === "Sept"))) {

            const todayDay = parseInt(today.format('DD'));
            for (let i = todayDay; i < 31; i++) {
                if (i < daysInMonth) {
                    data[i] = 5;
                }
            }
        }

        series.push({
            name: month,
            data: data
        });
    });

    return series;
};

// Helper function to convert month name to numeric month
function getNumericMonth(month: string): string {
    const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sept': '09', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    return monthMap[month] || '01';
}

export const customHeatMap = (stats: IAttendance[], startDate: string | Dayjs, endDate: string | Dayjs, fromAdmin?: boolean, totalWeekendCount?: number): HeatMapSeries[] => {
    // Normalize date inputs
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const today = dayjs();

    // Validate date range
    if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
        console.error('Invalid date range provided');
        return [];
    }

    // Get employee info and weekend configuration
    const rawDOJ = fromAdmin ? store.getState().employee.selectedEmployee.dateOfJoining : store.getState().employee?.currentEmployee?.dateOfJoining;
    const dateOfJoining = rawDOJ ? dayjs(rawDOJ) : null;

    const weekends = store.getState().employee.currentEmployee.branches.workingAndOffDays;
    const allWeekends = JSON.parse(weekends || "{}");

    // Debug: Log weekend configuration

    // Filter stats to only include data within the date range and after DOJ
    const filteredStats = stats.filter((stat: IAttendance) => {
        const statDate = dayjs(stat.date, 'DD MMM YYYY');
        if (!statDate.isValid()) return false;
        if (dateOfJoining && statDate.isBefore(dateOfJoining, 'day')) return false;
        return statDate.isSameOrAfter(start, 'day') && statDate.isSameOrBefore(end, 'day');
    });

    // Group data by months within the date range
    const monthMap = new Map<string, IAttendance[]>();

    // Initialize all months in the range
    let currentMonth = start.startOf('month');
    const endMonth = end.endOf('month');

    while (currentMonth.isSameOrBefore(endMonth, 'month')) {
        const monthKey = currentMonth.format('MMM') === "Sep" ? "Sept" : currentMonth.format('MMM');
        const yearMonthKey = `${currentMonth.format('YYYY')}-${monthKey}`;
        monthMap.set(yearMonthKey, []);
        currentMonth = currentMonth.add(1, 'month');
    }

    // Populate the month map with filtered stats
    filteredStats.forEach((stat: IAttendance) => {
        const statDate = dayjs(stat.date, 'DD MMM YYYY');
        const statMonth = statDate.format('MMM') === "Sep" ? "Sept" : statDate.format('MMM');
        const yearMonthKey = `${statDate.format('YYYY')}-${statMonth}`;

        if (monthMap.has(yearMonthKey)) {
            monthMap.get(yearMonthKey)?.push(stat);
        }
    });

    // Generate series for each month
    const series: HeatMapSeries[] = [];

    monthMap.forEach((monthStats, yearMonthKey) => {
        const [year, month] = yearMonthKey.split('-');
        const monthStart = dayjs(`${year}-${month === 'Sept' ? 'Sep' : month}-01`, 'YYYY-MMM-DD');
        const monthEnd = monthStart.endOf('month');

        // Adjust month boundaries to fit within the requested range
        const actualStart = start.isAfter(monthStart) ? start : monthStart;
        const actualEnd = end.isBefore(monthEnd) ? end : monthEnd;

        // Create data array for the month (31 days max) - Initialize with 5 (default)
        const daysInMonth = monthStart.daysInMonth();
        const data: number[] = Array(31).fill(5);

        // Create monthDays array like working functions
        const monthDays: string[] = Array.from({ length: daysInMonth }, (_, i) =>
            (i + 1).toString().padStart(2, '0')
        );

        // Get leaves and holidays for this month (like in working function)
        const allLeavesHolidays = filterLeavesPublicHolidays(
            actualStart.format('YYYY-MM-DD'),
            actualEnd.format('YYYY-MM-DD'),
            true,
            false // Explicitly disable dateSettingsEnabled
        );

        // 1. Apply leaves FIRST (highest priority)
        allLeavesHolidays?.customLeaves.forEach((leave: CustomLeaves) => {
            const index = monthDays.findIndex(day => day === dayjs(leave.date).format('DD'));
            if (index >= 0) {
                data[index] = HEATMAPLABELS.ON_LEAVE;
            }
        });

        // 2. Apply holidays (exactly like working function)
        allLeavesHolidays?.publicHolidays.forEach((holiday: IPublicHoliday) => {
            const index = monthDays.findIndex(day => day === dayjs(holiday.date).format('DD'));

            // If holiday is also a weekend, only mark as WEEKEND if not already marked as ON_LEAVE
            if (holiday.isWeekend) {
                if (index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
                    data[index] = HEATMAPLABELS.WEEKEND;
                }
                return;
            }

            // Only mark as holiday if not already marked as leave and isWeekend is false
            if (index >= 0 && data[index] !== HEATMAPLABELS.ON_LEAVE) {
                data[index] = HEATMAPLABELS.HOLIDAY;
            }
        });

        // 3. Mark weekends (FIXED LOGIC)
        for (let i = 0; i < daysInMonth; i++) {
            // Create date using monthStart and adding days to avoid format issues
            const day = monthStart.date(i + 1);
            const weekday = day.format('dddd').toLowerCase();

            // Check if this day is configured as a weekend (value should be "0")
            const isWeekendDay = allWeekends[weekday] === "0";

            // Only mark as weekend if not already marked with higher priority items
            const alreadyMarked = data[i] !== 5; // 5 is default value


            if (isWeekendDay && !alreadyMarked) {
                data[i] = HEATMAPLABELS.WEEKEND;
            }
        }

        // 4. Process attendance data for this month (exactly like working function)
        monthStats.forEach((stat: IAttendance) => {
            const statDate = dayjs(stat.date, 'DD MMM YYYY');
            const index = monthDays.findIndex(day => statDate.format('DD') === day);
            const isInRange = statDate.isSameOrAfter(actualStart) && statDate.isSameOrBefore(actualEnd);
            const isUpToToday = statDate.isSameOrBefore(today, 'day');

            if (index >= 0 && isInRange) {
                const statDateFormatted = statDate.format('YYYY-MM-DD');
                const weekday = stat.day?.toLowerCase();
                const isWeekendDay = allWeekends[weekday] === "0";

                const isLeaveDay = allLeavesHolidays?.customLeaves.some((leave: CustomLeaves) =>
                    dayjs(leave.date).format('YYYY-MM-DD') === statDateFormatted
                );

                const isHoliday = allLeavesHolidays?.publicHolidays.some((holiday: IPublicHoliday) =>
                    dayjs(holiday.date).format('YYYY-MM-DD') === statDateFormatted
                );

                const hasValidId = stat.id && stat.id !== undefined && stat.id !== '-' && stat.id !== '';
                const hasCheckIn = stat.checkIn && stat.checkIn !== '' && stat.checkIn !== null && stat.checkIn !== "-NA-";
                const hasCheckOut = stat.checkOut && stat.checkOut !== '' && stat.checkOut !== null && stat.checkOut !== "-NA-";

                if (isLeaveDay) return; // Skip if leave day

                if (hasValidId && hasCheckIn && hasCheckOut) {
                    // Check if it's an extra working day (worked on holiday/weekend)
                    const isExtraWorkingDay = allLeavesHolidays?.publicHolidays.some((holiday: IPublicHoliday) =>
                        dayjs(holiday.date).format('YYYY-MM-DD') === statDateFormatted
                    );

                    if (isWeekendDay || isExtraWorkingDay) {
                        data[index] = HEATMAPLABELS.EXTRA_DAY;
                    } else {
                        data[index] = HEATMAPLABELS.PRESENT;
                    }
                } else if (hasValidId && hasCheckIn && !hasCheckOut) {
                    data[index] = HEATMAPLABELS.CHECK_OUT_MISSING;
                } else if (isUpToToday && !isWeekendDay && !isHoliday && !isLeaveDay && (!hasCheckIn || !hasCheckOut)) {
                    data[index] = HEATMAPLABELS.ABSENT;
                }
            }
        });

        // 5. Handle future days in current month - IMPROVED LOGIC
        if (today.format('YYYY') === year &&
            (today.format('MMM') === month || (today.format('MMM') === "Sep" && month === "Sept"))) {

            const todayDay = parseInt(today.format('DD'));

            // Only process days after today
            for (let i = todayDay; i < daysInMonth && i < 31; i++) {
                const futureDate = monthStart.date(i + 1);
                const futureWeekday = futureDate.format('dddd').toLowerCase();
                const isFutureWeekend = allWeekends[futureWeekday] === "0";

                // For future days, only mark as weekend if it's actually a weekend
                // Don't overwrite holidays or leaves for future days
                if (data[i] === 5) { // Only if not already set
                    if (isFutureWeekend) {
                        data[i] = HEATMAPLABELS.WEEKEND;
                    }
                    // Leave other future days as default (5)
                }
            }
        }

        // 6. Handle days outside the requested range within the month
        for (let i = 0; i < 31; i++) {
            if (i >= daysInMonth) {
                data[i] = 5; // Invalid days in month
                continue;
            }

            const dayDate = monthStart.date(i + 1);
            if (dayDate.isValid() && (dayDate.isBefore(actualStart) || dayDate.isAfter(actualEnd))) {
                // Don't overwrite holidays/leaves that might be outside range but still relevant
                if (data[i] !== HEATMAPLABELS.HOLIDAY && data[i] !== HEATMAPLABELS.ON_LEAVE) {
                    data[i] = 5; // Default/not applicable value
                }
            }
        }

        // Create series entry for this month
        const seriesName = monthMap.size > 12 ? `${month} ${year}` : month;
        const seriesData: HeatMapSeries = {
            name: seriesName,
            data: data
        };

        series.push(seriesData);
    });

    return series;
};

export function leavesBalance(leaves: CustomLeaves[]): Map<string, number> {
    if (leaves.length <= 0) {
        return new Map<string, number>();
    }

    const balanceLeavesMap = new Map<string, number>();

    leaves.map((leave: CustomLeaves) => {
        if (!balanceLeavesMap.has(leave.leaveOptions.leaveType)) {
            balanceLeavesMap.set(leave.leaveOptions.leaveType, 0);
        }

        let value: number | undefined = balanceLeavesMap.get(leave.leaveOptions.leaveType);
        balanceLeavesMap.set(leave.leaveOptions.leaveType, value! + 1);
    });

    return balanceLeavesMap;
}

export const transformAttendanceInUTC = (dates: FormattedDate[], attendance: Attendance[], requests?: any): IAttendance[] => {
    const mumbaiTz = 'Asia/Kolkata';

    const getAllAttnedanceRequest = requests

    const branches = store.getState().employee?.currentEmployee.branches?.workingAndOffDays;
    const workingAndOffDays = JSON.parse(branches || "{}");

    const publicHolidays = store.getState().attendanceStats?.publicHolidays;

    const attendanceData: IAttendance[] = dates.map((date: FormattedDate) => {
        const { date: transformedDate, dbDate } = date;
        // const { date: transformedDate, dbDate: dbDateNew } = date;
        // const dbDate = dayjs(dbDateNew, 'DD/MM/YYYY').format('YYYY-MM-DD')
        const isPastOrPresentDate = isDateBeforeOrSameAsCurrDate(dbDate);
        const weekDay = getWeekDay(transformedDate);
        const formattedDbDate = dayjs(dbDate, 'DD/MM/YYYY').format('YYYY-MM-DD')

        const attendanceRecord = attendance.find((el: Attendance) => {
            const formattedUtcCheckIn = dayjs(convertToTimeZone(el.checkIn, mumbaiTz)).format('DD/MM/YYYY');
            return formattedUtcCheckIn == dbDate;
        });

        const isPublicHoliday = publicHolidays?.some(holiday => {
            const holidayDate = dayjs(holiday.date).format('YYYY-MM-DD');
            return holidayDate === formattedDbDate && !holiday?.isWeekend;
        }) || false;

        const matchingRequest = getAllAttnedanceRequest?.find((req: any) => {
            return req.formattedDate === dbDate;
        });

        const { checkIn = '', checkOut = '', employeeId } = attendanceRecord || {};
        const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND, HOLIDAY, RAISE_REQUEST } = ATTENDANCE_STATUS;
        // console.log("checkIn",checkIn);
        // console.log("checkOut",checkOut);

        const formattedCheckIn = convertToTimeWithSeconds(checkIn);
        const formattedCheckOut = convertToTimeWithSeconds(checkOut);
        // console.log("formattedCheckIn",formattedCheckIn);
        // console.log("formattedCheckOut",formattedCheckOut);

        const isWeekend = Object.keys(workingAndOffDays).includes(weekDay.toLowerCase()) && workingAndOffDays[weekDay.toLowerCase()] === "0" || publicHolidays?.some(holiday => {
            const holidayDate = dayjs(holiday.date).format('YYYY-MM-DD');
            const targetDate = dayjs(transformedDate).format('YYYY-MM-DD');

            return holidayDate === targetDate && holiday?.isWeekend;
        });



        const getTimeDifferenceInMinutes = getTimeDifference(formattedCheckIn, formattedCheckOut);
        //  console.log("getTimeDifferenceInMinutes",getTimeDifferenceInMinutes);

        const getMinutesInHrMinFormat = convertMinutesIntoHrMinFormats(getTimeDifferenceInMinutes);
        // console.log("getMinutesInHrMinFormat",getMinutesInHrMinFormat);

        const isMarkedViaRequest = !!(
            matchingRequest &&
            matchingRequest.status === 1 &&
            attendanceRecord?.checkIn &&
            attendanceRecord?.checkOut
        );

        // debugger;

        if (!isPastOrPresentDate) {
            return {
                id: "-",
                day: weekDay,
                date: transformedDate,
                formattedDate: dbDate,
                employeeId,
                checkIn: "-",
                checkOut: "-",
                duration: "",
                workingMethod: '-',
                status: isWeekend ? 'Weekend' : '-',

            }
        }

        let status;

        if (isMarkedViaRequest) {
            status = RAISE_REQUEST;
        } else if (checkIn && checkOut) {
            status = isWeekend ? WORKING_WEEKEND : PRESENT;
        } else if (checkIn && !checkOut) {
            status = CHECK_OUT_MISSING;
        } else if (!checkIn && checkOut) {
            status = CHECK_IN_MISSING;
        } else if (attendanceRecord?.leaveTrackedId) {
            status = LEAVE;
        } else if (isPublicHoliday) {
            status = HOLIDAY;
        } else if (isWeekend) {
            status = WEEKEND;
        } else {
            status = ABSENT;
        }

        return {
            id: attendanceRecord?.id,
            date: transformedDate,
            formattedDate: dbDate,
            employeeId,
            day: weekDay,
            checkIn: checkIn ? convertTo12HourFormat(convertToISTWithSeconds(formattedCheckIn)) : '-NA-',
            checkOut: checkOut ? convertTo12HourFormat(convertToISTWithSeconds(formattedCheckOut)) : '-NA-',
            duration: checkOut ? getMinutesInHrMinFormat : '-NA-',
            checkOutLatitude: attendanceRecord?.checkOutLatitude,
            checkOutLongitude: attendanceRecord?.checkOutLongitude,
            workingMethod: attendanceRecord?.workingMethod?.type || '-NA-',
            status: status,
            checkInLocation: attendanceRecord?.checkInLocation || '-NA-',
            checkOutLocation: attendanceRecord?.checkOutLocation || '-NA-',
            checkoutWokringMethod: attendanceRecord?.checkoutWorkingMethod?.type || null,
        };
    });

    return attendanceData;
}

export function transformAttendanceRequest(attendance: AttendanceRequest[]): IAttendanceRequests[] {
    const attendanceRequest = attendance.reduce((result: IAttendanceRequests[], attendanceRequest: any) => {
        // For checkout-only requests checkIn is null; use actualCheckIn injected by the
        // backend (the real check-in from the Attendance table) so the admin can see it.
        const checkInSource = attendanceRequest?.checkIn || attendanceRequest?.actualCheckIn || null;
        const formattedCheckIn = checkInSource
            ? convertTo12HourFormat(convertToIST(convertToTime(checkInSource))): "-NA-";
        // console.log("attendanceRequest.checkIn",attendanceRequest.checkIn);

        // console.log("formattedCheckIn", formattedCheckIn);

        const formattedCheckOut = attendanceRequest?.checkOut
            ? convertTo12HourFormat(convertToIST(convertToTime(attendanceRequest.checkOut))): "-NA-";
        // console.log("attendanceRequest?.checkOut",attendanceRequest?.checkOut);

        // console.log("formattedCheckOut", formattedCheckOut);

        // Fall back to checkOut when checkIn is null (checkout-only requests)
        const dateSource = attendanceRequest?.checkIn || attendanceRequest?.checkOut;
        const day = dayjs(dateSource).format("dddd");

        const date = dayjs(dateSource).format("DD MMM YYYY");
        const formattedDate = dayjs(date).format("DD/MM/YYYY");

        let request: IAttendanceRequests = {
            id: attendanceRequest.id,
            date,
            day,
            formattedDate,
            status: attendanceRequest.status,
            employeeId: attendanceRequest.employeeId,
            employeeName: attendanceRequest?.employee?.users?.firstName + ' ' + attendanceRequest?.employee?.users?.lastName,
            employeeCode: attendanceRequest?.employee?.employeeCode,
            checkIn: formattedCheckIn,
            checkOut: formattedCheckOut,
            // For checkout-only requests, rawCheckIn falls back to actualCheckIn (real attendance)
            rawCheckIn: attendanceRequest.checkIn || attendanceRequest.actualCheckIn || null,
            rawCheckOut: attendanceRequest.checkOut,
            workingMethod: attendanceRequest.workingMethod.type,
            remarks: attendanceRequest?.remarks || "",
            latitude: attendanceRequest.latitude,
            longitude: attendanceRequest.longitude,
            workingMethodId: attendanceRequest.workingMethodId,
            approvedById: attendanceRequest.approvedById,
            rejectedById: attendanceRequest.rejectById,
            approvedOrRejectedDate: attendanceRequest.updatedAt,
        }

        result.push(request);

        return result;
    }, []);

    return attendanceRequest;
}

export async function customLeaves(leaves: Leaves[]): Promise<CustomLeaves[]> {
    const customLeaves = leaves.map((leave: Leaves) => {
        if (leave.dateFrom !== leave.dateTo) {
            const dates = generateDatesBetween(leave.dateFrom, leave.dateTo);
            const newCustomLeaves: CustomLeaves[] = [];

            dates.map((date) => {
                let customLeaves: CustomLeaves = {
                    id: leave.id,
                    date: date,
                    employeeId: leave.employeeId,
                    leaveTypeId: leave.leaveTypeId,
                    reason: leave.reason,
                    status: leave.status,
                    leaveOptions: leave.leaveOptions
                }

                newCustomLeaves.push(customLeaves);
            });

            return newCustomLeaves;
        }

        let customLeaves: CustomLeaves = {
            id: leave.id,
            date: leave.dateFrom,
            employeeId: leave.employeeId,
            leaveTypeId: leave.leaveTypeId,
            reason: leave.reason,
            status: leave.status,
            leaveOptions: leave.leaveOptions
        }

        return customLeaves;
    });

    const weekendDays = await getAllWeekends();
    let weekendFilteredLeaves = customLeaves.flat().filter((leave) => {
        return !weekendDays.includes(dayjs(leave.date).day());
    });

    return weekendFilteredLeaves;
}

export async function fetchEmpMonthlyReimbursements(month: Dayjs, empId = store.getState().employee.currentEmployee.id) {
    const startDate = month.startOf('month').format('YYYY-MM-DD');
    const endDate = month.endOf('month').format('YYYY-MM-DD');
    const { data: { reimbursements: empMonthlyReimbursements } } = await fetchReimbursementsForEmployee(empId, startDate, endDate);
    const result: IReimbursementsFetch[] = empMonthlyReimbursements.map((data: IReimbursementsFetch) => {
        const date = new Date(data.expenseDate as string);

        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);

        return {
            ...data,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            type: data?.reimbursementType?.type || "-NA-",
            expenseDate: formattedDate,
            status: (data.status == 0 ? 'Pending' : (data.status == 1 ? 'Approved' : (data.status == 2 ? 'Rejected' : '-')))
        }

    })

    return result;
}

export async function fetchEmpYearlyReimbursements(year: Dayjs, empId = store.getState().employee.currentEmployee.id) {
    // const startDate = (year.startOf('year').format('YYYY-MM-DD'));
    // const endDate = (year.endOf('year').format('YYYY-MM-DD'));

    const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
    const { data: { reimbursements: empYearlyReimbursements } } = await fetchReimbursementsForEmployee(empId, startDate, endDate);
    const result: IReimbursementsFetch[] = empYearlyReimbursements.map((data: IReimbursementsFetch) => {
        const date = new Date(data.expenseDate as string);

        // Format the date
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);

        return {
            ...data,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            type: data?.reimbursementType?.type || "-NA-",
            expenseDate: formattedDate,
            status: (data.status == 0 ? 'Pending' : (data.status == 1 ? 'Approved' : (data.status == 2 ? 'Rejected' : '-')))
        }

    })
    return result;
}

export async function fetchMonthlyReimbursementsOfAllEmp(month: Dayjs) {
    const startDate = month.startOf('month').format('YYYY-MM-DD');
    const endDate = month.endOf('month').format('YYYY-MM-DD');
    const { data: { reimbursements: allEmpMonthlyReimbursements } } = await fetchReimbursementsForAllEmployees(startDate, endDate);
    const result: IReimbursementsFetch[] = allEmpMonthlyReimbursements.map((data: IReimbursementsFetch) => {
        const date = new Date(data.expenseDate as string);

        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);

        return {
            ...data,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            type: data?.reimbursementType?.type || "-NA-",
            ID: data?.employee?.employeeCode,
            name: `${data.employee?.users?.firstName} ${data.employee?.users?.lastName}`,
            expenseDate: formattedDate,
            status: (data.status == 0 ? 'Pending' : (data.status == 1 ? 'Approved' : (data.status == 2 ? 'Rejected' : '-')))
        }

    })

    return result;
}

export async function fetchYearlyReimbursementsOfAllEmp(year: Dayjs) {
    const startDate = (year.startOf('year').format('YYYY-MM-DD'));
    const endDate = (year.endOf('year').format('YYYY-MM-DD'));
    const { data: { reimbursements: empYearlyReimbursements } } = await fetchReimbursementsForAllEmployees(startDate, endDate);
    const result: IReimbursementsFetch[] = empYearlyReimbursements.map((data: IReimbursementsFetch) => {
        const date = new Date(data.expenseDate as string);

        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);

        return {
            ...data,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            type: data?.reimbursementType?.type || "-NA-",
            ID: data.employee?.employeeCode,
            name: `${data.employee?.users?.firstName} ${data.employee?.users?.lastName}`,
            expenseDate: formattedDate,
            status: (data.status == 0 ? 'Pending' : (data.status == 1 ? 'Approved' : (data.status == 2 ? 'Rejected' : '-')))
        }

    })
    return result;
}

export async function fetchAllTimeReimbursementsOfAllEmp() {
    const { data: { reimbursements: allEmpAllTimeReimbursements } } = await fetchAllReimbursementsForAllEmployees();
    const result: IReimbursementsFetch[] = allEmpAllTimeReimbursements.map((data: IReimbursementsFetch) => {
        const date = new Date(data.expenseDate as string);

        // Format the date
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);

        return {
            ...data,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            type: data?.reimbursementType?.type || "-NA-",
            ID: data.employee?.employeeCode,
            name: `${data.employee?.users?.firstName} ${data.employee?.users?.lastName}`,
            expenseDate: formattedDate,
            status: (data.status == 0 ? 'Pending' : (data.status == 1 ? 'Approved' : (data.status == 2 ? 'Rejected' : '-')))
        }

    })
    return result;
}

export async function rejectEmpReimbursementRequestById(reimbursementId: string) {
    const res = await updateReimbursementById(reimbursementId, { status: 2 });
    return res;
}

export async function approveEmpReimbursementRequestById(reimbursementId: string) {
    const res = await updateReimbursementById(reimbursementId, { status: 1 });
    return res;
}

export async function fetchEmpAlltimeReimbursements(empId = store.getState().employee.currentEmployee.id) {
    const { data: { reimbursements: empYearlyReimbursements } } = await fetchAllReimbursementsForEmployee(empId);
    const result: IReimbursementsFetch[] = empYearlyReimbursements.map((data: IReimbursementsFetch) => {
        const date = new Date(data.expenseDate as string);

        // Format the date
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);

        return {
            ...data,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            type: data?.reimbursementType?.type || "-NA-",
            expenseDate: formattedDate,
            status: (data.status == 0 ? 'Pending' : (data.status == 1 ? 'Approved' : (data.status == 2 ? 'Rejected' : '-')))
        }

    })
    return result;
}

export async function createReimbursementType(reimbursementTypeData: IReimbursementTypeCreate) {
    const res = await createNewReimbursementType(reimbursementTypeData);

    if (res.statusCode == 200) return true;
    return false;
}

export async function updateReimbursementTypeById(reimbursementTypeData: IReimbursementTypeCreate, id: string) {
    const res = await updateCurrReimbursementTypeById(reimbursementTypeData, id);

    if (res.statusCode == 200) return true;
    return false;
}

export async function fetchAllReimbursementTypesFromDb() {
    const { data: { reimbursementTypes: reimbursementTypes } } = await fetchAllReimbursementTypes();

    const result: IReimbursementTypeFetch[] = reimbursementTypes.map((data: IReimbursementTypeFetch) => {
        return {
            ...data,
        }
    })
    return result;
}

export async function deleteReimbursementTypeByItsId(reimbursementId: string) {
    const res = await deleteReimbursementTypeById(reimbursementId);
    return res;
}

export interface SalaryCalculations {
    name: string,
    value: string,
    earned: string
}

export function getCountOfMonthsEmployeePresentOrOnLeaveInAYear(stats: Attendance[]) {
    const leaves = store.getState().attendanceStats.filteredLeaves;
    const publicHolidays = store.getState().attendanceStats.filteredPublicHolidays;
    const months = new Set();

    stats.forEach((attendance) => {
        const date = new Date(attendance.checkIn) || new Date(attendance.checkOut);
        const month = date.getMonth() + 1;
        months.add(month);
    });
    leaves.forEach((leave) => {
        const date = new Date(leave?.date);
        const month = date.getMonth() + 1;
        months.add(month);
    });
    publicHolidays.forEach((holiday) => {
        const date = new Date(holiday?.date);
        const month = date.getMonth() + 1;
        months.add(month);
    })

    return months.size;
}

export function salaryCalculations(allowances: Record<string, any>, salary: number, isYearly?: boolean, countOfMonthsEmployeePresentInAYear?: number): SalaryCalculations[] {
    const grossPayFixed: SalaryCalculations[] = [];

    Object.entries(allowances).map(([name, value]) => {
        const earn = value.type == 'percentage' ? ((value.value / 100) * salary).toFixed(2) : value.type == 'number' ? isYearly ? value.value * (countOfMonthsEmployeePresentInAYear || 0) : value.value : 0;

        const obj: SalaryCalculations = {
            name: name,
            value: value.type == 'percentage' ? `${value.value}%` : value.value,
            earned: `₹${earn}`
        };

        grossPayFixed.push(obj);
    });

    return grossPayFixed;
}

export function salaryCalculationsForDays(totalDaysOfMonthOrYearForEmployee: number, totalOverallDaysToConsider: number, allowances: Record<string, any>, salary: number, isYearly?: boolean, countOfMonthsEmployeePresentInAYear?: number, isForTaxes?: boolean, monthsCount?: number): SalaryCalculations[] {

    const grossPayFixed: SalaryCalculations[] = [];
    if (isForTaxes) {
        Object.entries(allowances).map(([name, value]) => {
            let earn = value.type == 'percentage' ? ((value.value / 100) * salary).toFixed(2) : value.type == 'number' ? value.value * (monthsCount || 0) : value.value;
            // earn = ((earn/totalOverallDaysToConsider)*(monthsCount || 0)).toFixed(2);

            const obj: SalaryCalculations = {
                name: name,
                value: value.type == 'percentage' ? `${value.value}%` : value.value,
                earned: `₹${earn}`
            };

            grossPayFixed.push(obj);
        });

        return grossPayFixed;
    }



    Object.entries(allowances).map(([name, value]) => {
        let earn = value.type == 'percentage' ? ((value.value / 100) * salary).toFixed(2) : value.type == 'number' ? isYearly ? value.value * (countOfMonthsEmployeePresentInAYear || 0) : value.value : 0;
        earn = ((earn / totalOverallDaysToConsider) * totalDaysOfMonthOrYearForEmployee).toFixed(2);

        const obj: SalaryCalculations = {
            name: name,
            value: value.type == 'percentage' ? `${value.value}%` : value.value,
            earned: `₹${earn}`
        };

        grossPayFixed.push(obj);
    });

    console.log("allowances:: ", allowances);

    console.log("grossPayFixed:: ", grossPayFixed);

    return grossPayFixed;
}

export async function fetchAllCompanySettings() {
    const { data } = await fetchCompanySettings();
    store.dispatch(saveAttendanceRequestRaiseLimit(data?.appSettings?.attendanceRequestRaiseLimit));
    return data?.appSettings;
}


// Loan Module calculation================================
export async function getCompletionAmountOfLoanByLoanIdAndEndDate(loanId: any) {

    try {
        const { data } = await fetchLoanById(loanId)
        const installmentData = data?.loanInstallments
        let totalAmountPaid = 0
        let endDate = undefined
        installmentData?.forEach((ele: any) => {
            totalAmountPaid += Number(ele?.paidAmount)
        })
        if (data?.deductionMonth) {
            endDate = dayjs(data?.deductionMonth).endOf('month').format('DD MMM YYYY')
        }
        else if (data?.numberOfMonths) {
            if (data?.approvedAt) {
                endDate = dayjs(data?.approvedAt).add(Number(data?.numberOfMonths), 'month').endOf('month').format('DD MMM YYYY')
            }
            else if (data?.createdAt) {
                endDate = dayjs(data?.createdAt).add(Number(data?.numberOfMonths), 'month').endOf('month').format('DD MMM YYYY')
            }
        }

        return { totalAmount: totalAmountPaid || 0, endDate: endDate };
    } catch (error) {
        console.error("error: ", error)
    }
}



export async function fetchEmpDailyKpiStatistics(day: Dayjs, fromAdmin = false) {
    try {
        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;

        if (!employeeId) {
            console.error("Employee ID not found");
            return;
        }

        const formattedDate = day.format("YYYY-MM-DD");

        const data = await fetchEmpKpiStatisticsForDay(employeeId, formattedDate);

        return { date: formattedDate, modules: data.modules };
    } catch (error) {
        console.error("Error fetching daily statistics:", error);
        throw error;
    }
}


export async function fetchEmpWeeklyKpiStatistics(
    startWeek: Dayjs,
    endWeek: Dayjs,
    fromAdmin: boolean = false
) {
    try {
        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;

        if (!employeeId) {
            console.error("Employee ID not found");
            return;
        }

        const startDate = startWeek.format("YYYY-MM-DD");
        const endDate = endWeek.format("YYYY-MM-DD");

        const data = await fetchEmpKpiStatisticsForPeriod(
            employeeId,
            startDate,
            endDate
        );

        return {
            startDate,
            endDate,
            modules: data.modules,
            yourPoints: data.yourPoints,
            rank: data.rank,
            remark: data.remark,
            maxTotal: data.maxTotal,
        };
    } catch (error) {
        console.error("Error fetching weekly statistics:", error);
        throw error;
    }
}

export async function fetchEmpMonthlyKpiStatistics(
    month: Dayjs,
    fromAdmin: boolean = false,
    options?: { startDate?: Dayjs; endDate?: Dayjs }
) {
    try {
        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;

        if (!employeeId) {
            console.error("Employee ID not found");
            return;
        }

        const startDate =
            options?.startDate?.format("YYYY-MM-DD") ||
            month.startOf("month").format("YYYY-MM-DD");
        const endDate =
            options?.endDate?.format("YYYY-MM-DD") ||
            month.endOf("month").format("YYYY-MM-DD");


        const data = await fetchEmpKpiStatisticsForPeriod(
            employeeId,
            startDate,
            endDate
        );

        return {
            startDate,
            endDate,
            modules: data.modules,
            yourPoints: data.yourPoints,
            rank: data.rank,
            remark: data.remark,
            maxTotal: data.maxTotal,
        };
    } catch (error) {
        console.error("Error fetching monthly statistics:", error);
        throw error;
    }
}


export async function fetchEmpYearlyKpiStatistics(
    year: Dayjs,
    fromAdmin: boolean = false,
    options?: { startDate?: Dayjs; endDate?: Dayjs }
): Promise<{
    startDate: string;
    endDate: string;
    modules: any;
    yourPoints?: number;
    rank?: number;
    remark?: string;
    maxTotal?: number;
} | undefined> {
    try {
        const state = store.getState().employee;
        const employeeId = fromAdmin
            ? state.selectedEmployee?.id
            : state.currentEmployee.id;

        if (!employeeId) {
            console.error("Employee ID not found. Unable to fetch KPI statistics.");
            return;
        }

        const { startDate, endDate } =
            options?.startDate && options?.endDate
                ? {
                    startDate: options.startDate.format("YYYY-MM-DD"),
                    endDate: options.endDate.format("YYYY-MM-DD"),
                }
                : await generateFiscalYearFromGivenYear(year, fromAdmin);

        const data = await fetchEmpKpiStatisticsForPeriod(
            employeeId,
            startDate,
            endDate
        );

        return {
            startDate,
            endDate,
            modules: data.modules,
            yourPoints: data.yourPoints,
            rank: data.rank,
            remark: data.remark,
            maxTotal: data.maxTotal,
        };
    } catch (error) {
        console.error("Error fetching yearly statistics:", error);
        throw error;
    }
}

export async function fetchEmpAllTimeKpiStatistics(fromAdmin: boolean = false) {
    try {
        const employeeId = fromAdmin
            ? store.getState().employee.selectedEmployee?.id
            : store.getState().employee.currentEmployee.id;
        if (!employeeId) throw new Error("Employee ID not found");
        const result = await fetchEmpKpiScoresAllTime(employeeId);
        return result;
    } catch (error) {
        console.error("Error fetching All time statistics:", error);
        throw error;
    }
}

// ================================================================================
// format number to currency in INR, 
export const formatNumber = (number: number | string) => {
    return Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(number));
}

// format string to currency in INR
export const formatStringINR = (str: string | number) => {
    const num = parseFloat(str.toString().replace(/[^0-9.-]+/g, '')); // removes ₹, commas, etc.
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// get total weekends in a month
export async function getTotalWeekendDaysInMonth(year: string | number, month: string | number): Promise<number> {
    const weekendDays = await getAllWeekends();
    const { data: { publicHolidays } } = await fetchPublicHolidays(year.toString(), 'India');

    const filteredBasedOnDate = publicHolidays.filter((holiday: IPublicHoliday) => {
        const date = dayjs(holiday?.date);

        return dayjs(date).year() === Number(year) && dayjs(date).month() === Number(month) && holiday?.isWeekend;
    });

    if (weekendDays.length === 0) return 0 + filteredBasedOnDate?.length;

    const y = Number(year);
    const m = Number(month);

    if (isNaN(y) || isNaN(m) || m < 0 || m > 11) {
        console.warn("Invalid year or month");
        return 0;
    }

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let totalWeekendCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(y, m, day);
        const weekday = date.getDay();
        if (weekendDays.includes(weekday)) {
            totalWeekendCount++;
        }
    }

    return totalWeekendCount + filteredBasedOnDate?.length;
}

export async function getTotalWeekendDaysInMonthFilteredByDOJOrCurrentMonthDate(year: string | number, month: string | number, startDateOfMonthOrYear: dayjs.Dayjs): Promise<number> {
    const weekendDays = await getAllWeekends();
    const { data: { publicHolidays } } = await fetchPublicHolidays(year.toString(), 'India');

    const filteredBasedOnDate = publicHolidays.filter((holiday: IPublicHoliday) => {
        const date = dayjs(holiday?.date);
        return dayjs(date).year() === Number(year) && dayjs(date).month() === Number(month) && holiday?.isWeekend && dayjs(date).isSameOrAfter(startDateOfMonthOrYear);
    });

    const y = Number(year);
    const m = Number(month);

    if (isNaN(y) || isNaN(m) || m < 0 || m > 11) {
        console.warn("Invalid year or month");
        return 0;
    }

    // let filteredMonthStartDate = startDateOfMonthOrYear.startOf("month");
    let monthStartDate = dayjs(`${y}-${(m + 1).toString().padStart(2, '0')}-01`).startOf("month");
    let monthEndDate = dayjs(`${y}-${(m + 1).toString().padStart(2, '0')}-01`).endOf("month")
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let totalWeekendCount = 0;

    if (monthEndDate.isBefore(dayjs(startDateOfMonthOrYear))) {
        return 0;
    }

    if (monthEndDate.isSameOrAfter(dayjs())) {
        monthEndDate = dayjs();
    }

    if (monthStartDate.isBefore(startDateOfMonthOrYear)) {
        monthStartDate = startDateOfMonthOrYear;
    }

    const monthStartDate2 = monthStartDate;
    while (monthStartDate.isSameOrBefore(monthEndDate)) {
        const weekday = monthStartDate.day();
        if (weekendDays?.includes(weekday)) {
            totalWeekendCount++;
        }
        monthStartDate = monthStartDate.add(1, 'day');
    }
    const filteredAgain = filteredBasedOnDate.filter((holiday: IPublicHoliday) => {
        const date = dayjs(holiday?.date);
        return dayjs(date).isSameOrAfter(monthStartDate2) && dayjs(date).isSameOrBefore(monthEndDate) && holiday?.isWeekend;
    });

    // for (let day = 1; day <= daysInMonth; day++) {
    //     const date = new Date(y, m, day);
    //     const weekday = date.getDay();
    //     if (weekendDays.includes(weekday)) {
    //         totalWeekendCount++;
    //     }
    // }

    return totalWeekendCount + filteredAgain.length;
}

//  get total weekends in a year
export async function getTotalWeekendsInYear(year: dayjs.Dayjs, isYearly: boolean = false): Promise<number> {
    if (!isYearly) return 0;

    const weekendDays = await getAllWeekends();
    const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);
    const { data: { publicHolidays } } = await fetchPublicHolidays(dayjs(year).year().toString(), 'India');

    const filteredBasedOnDate = publicHolidays.filter((holiday: IPublicHoliday) => {
        const date = holiday?.date;

        return dayjs(date).isSameOrAfter(dayjs(startDate)) && dayjs(date).isSameOrBefore(dayjs(endDate)) && holiday?.isWeekend;
    });

    let totalWeekendCount = 0;

    // Convert string to dayjs objects
    let current = dayjs(startDate);
    const end = dayjs(endDate);
    const filteredAgain = filteredBasedOnDate.filter((holiday: IPublicHoliday) => {
        const date = dayjs(holiday?.date);
        return dayjs(date).isSameOrAfter(current) && dayjs(date).isSameOrBefore(end) && holiday?.isWeekend;
    });

    while (current.isSameOrBefore(end, 'day')) {
        const weekday = current.day();
        if (weekendDays.includes(weekday)) {
            totalWeekendCount++;
        }
        current = current.add(1, 'day');
    }
    return totalWeekendCount + filteredAgain?.length || 0;
}


export async function getTotalWeekendsInYearFilteredByDOJOrCurrentYearDate(year: dayjs.Dayjs, isYearly: boolean = false, startDateOfMonthOrYear: dayjs.Dayjs): Promise<number> {
    if (!isYearly) return 0;
    if (!startDateOfMonthOrYear) return 0;
    const weekendDays = await getAllWeekends();

    const { data: { publicHolidays } } = await fetchPublicHolidays(dayjs(year).year().toString(), 'India');


    const { startDate, endDate } = await generateFiscalYearFromGivenYear(year);

    let totalWeekendCount = 0;

    // Convert string to dayjs objects
    let current = dayjs(startDate);
    const end = dayjs(endDate).isSameOrBefore(dayjs()) ? dayjs(endDate) : dayjs();

    const filteredBasedOnDate = publicHolidays.filter((holiday: IPublicHoliday) => {
        const date = holiday?.date;

        return dayjs(date).isSameOrAfter(dayjs(current)) && dayjs(date).isSameOrBefore(dayjs(end)) && holiday?.isWeekend;
    });

    while (current.isSameOrBefore(end)) {
        if (current.isSameOrAfter(dayjs(startDateOfMonthOrYear))) {
            const weekday = current.day();
            if (weekendDays.includes(weekday)) {
                totalWeekendCount++;
            }
        }
        current = current.add(1, 'day');
    }


    return totalWeekendCount + filteredBasedOnDate.length || 0;
}

// get total count of days in a month
export async function getTotalDaysInMonth(year: string | number, month: string | number): Promise<number> {
    const y = Number(year);
    const m = Number(month);

    if (isNaN(y) || isNaN(m) || m < 0 || m > 11) {
        console.warn("Invalid year or month");
        return 0;
    }

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return daysInMonth;
}

// get total count of days in a year
export async function getTotalDaysInYear(year: string | number): Promise<number> {
    const y = Number(year);
    if (isNaN(y)) {
        console.warn("Invalid year");
        return 0;
    }

    // Check if it's a leap year
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    return isLeap ? 366 : 365;
}


// input: "2025-06-17T17:22:52.975Z" output: 05:22 PM, 17 Jun, 2025
// export const formatDateFromISTString = (dateString: string | undefined | null): string => {
//     if (!dateString) return '-';
//     try {
//         const cleaned = dateString.replace(/Z$/, '');
//         return dayjs(cleaned).format('DD MMM YYYY, hh:mm A');
//     } catch (e) {
//         return '-';
//     }
// };

dayjs.extend(utc);
dayjs.extend(timezone);

export const formatDateFromISTString = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    try {
        // Parse as UTC, convert to IST for display
        return dayjs.utc(dateString).tz('Asia/Kolkata').format('DD MMM YYYY, hh:mm A');
    } catch (e) {
        return '-';
    }
};

export const handleSendEmailForResetAttendanceRequestLimit = async (employeeId: string, setRequestLimitResetLoading: React.Dispatch<React.SetStateAction<boolean>>, reportsToId?: string) => {
    setRequestLimitResetLoading(true);
    const res = await sendAttendanceRequestResetLimit({ employeeId: employeeId, reportsToId: reportsToId });

    if (!res.hasError) {
        successConfirmation('Request sent successfully');
    }
    else {
        errorConfirmation('Request failed. Try again later.');
    }
    setRequestLimitResetLoading(false);
};



// export const markWeekendOrHoliday = ( attendance: any[], allWeekends: any, allHolidays: any[]): (any & { isWeekendOrHoliday: boolean })[] => {
//     // Prepare holiday date strings in "YYYY-MM-DD"
//     const holidayDates = new Set(
//       allHolidays.map(h => new Date(h.date).toISOString().split("T")[0])
//     );

//     const allWeekendsJson = JSON.parse(allWeekends);

//     return attendance.map(entry => {
//       const dayKey = entry.day?.toLowerCase() || '';

//       const isWeekend = allWeekendsJson[dayKey] === "0";

//       const entryDate = entry?.date ? new Date(entry.date) : dayjs().toDate();

//       const formattedDate = dayjs(entryDate).format("YYYY-MM-DD");

//       const isHoliday = holidayDates.has(formattedDate);      
//       return {
//         ...entry,
//         isWeekendOrHoliday: isWeekend || isHoliday,
//       };
//     });
//   }

export function formatDisplay(input: string): string {
    // Already in correct format
    if (input.includes("h") && input.includes("m")) {
        return input;
    }

    // Convert "8:30 Hrs" → "8h 30m"
    if (input.includes(":") && input.includes("Hrs")) {
        const [h, m] = input.replace("Hrs", "").trim().split(":");
        return `${h}h ${m}m`;
    }

    // Convert "8.5 Hrs" → "8h 30m"
    if (input.includes("Hrs")) {
        const num = parseFloat(input.replace("Hrs", "").trim());
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h}h ${m}m`;
    }

    return input;
}


export const markWeekendOrHoliday = (attendance: any[], allWeekends: any, allHolidays: any[]): (any & { isWeekendOrHoliday: boolean })[] => {
    // Prepare holiday date strings in "YYYY-MM-DD"
    const allHolidaysWithoutWeeknd = allHolidays?.filter(data => !data?.isWeekend)
    const holidayDates = new Set(
        allHolidaysWithoutWeeknd.map(h => new Date(h.date).toISOString().split("T")[0])
    );

    // const weekndsList = holidayDates?.filter()

    const allWeekendsJson = JSON.parse(allWeekends);

    const alternateWeekends = allHolidays?.filter(data => data?.isWeekend)

    return attendance.map(entry => {
        const dayKey = entry.day?.toLowerCase() || '';

        const isWeekend = allWeekendsJson[dayKey] == "0" || alternateWeekends?.some(data => dayjs(data?.date).isSame(dayjs(entry?.date), 'day'));
        //   const isWeekend = allWeekendsJson[dayKey] === "0" || alternateWeekends?.some(data=>data?.date === entry?.date);

        const entryDate = entry?.date ? new Date(entry.date) : dayjs().toDate();

        const formattedDate = dayjs(entryDate).format("YYYY-MM-DD");

        const isHoliday = holidayDates.has(formattedDate);

        return {
            ...entry,
            isWeekendOrHoliday: isHoliday || isWeekend,
            ...(isHoliday && { status: "Holiday" })
        };
    });
}


export const markWeekendOrHolidayForReportsTable = (attendance: any[], allWeekends: any, allHolidays: any[]): (any & { isWeekendOrHoliday: boolean })[] => {
    // Prepare holiday date strings in "YYYY-MM-DD"
    const allHolidaysWithoutWeeknd = allHolidays?.filter(data => !data?.isWeekend)
    const holidayDates = new Set(
        allHolidaysWithoutWeeknd.map(h => new Date(h.date).toISOString().split("T")[0])
    );

    // const weekndsList = holidayDates?.filter()

    const allWeekendsJson = JSON.parse(allWeekends);

    const alternateWeekends = allHolidays?.filter(data => data?.isWeekend)

    return attendance.map(entry => {
        const dayKey = entry.day?.toLowerCase() || '';

        const isWeekend = allWeekendsJson[dayKey] == "0" || alternateWeekends?.some(data => dayjs(data?.date).isSame(dayjs(entry?.date), 'day'));
        //   const isWeekend = allWeekendsJson[dayKey] === "0" || alternateWeekends?.some(data=>data?.date === entry?.date);

        const entryDate = entry?.date ? new Date(entry.date) : dayjs().toDate();

        const formattedDate = dayjs(entryDate).format("YYYY-MM-DD");

        const isHoliday = holidayDates.has(formattedDate);
        //   const entryNew = entry;
        //   console.log("Entry:::: ",entryNew);

        //   debugger;
        return {
            ...entry,
            isWeekendOrHoliday: isHoliday || isWeekend,
            ...(isHoliday && { status: "Holiday" })
        };
    });
}

// Calculate total time for a project
export const calculateProjectTotalTime = (timesheets: any = []) => {
    // Ensure it's always an array
    const normalizedTimesheets = Array.isArray(timesheets)
        ? timesheets
        : timesheets
            ? [timesheets]
            : [];

    let totalMs = 0;
    normalizedTimesheets.forEach((timesheet) => {
        if (timesheet?.startTime && timesheet?.endTime) {
            const diff =
                new Date(timesheet.endTime).getTime() -
                new Date(timesheet.startTime).getTime();
            if (diff > 0) totalMs += diff;
        }
    });

    const hrs = Math.floor(totalMs / (1000 * 60 * 60));
    const mins = Math.floor((totalMs / (1000 * 60)) % 60);
    const secs = Math.floor((totalMs / 1000) % 60);
    return `${hrs}h ${mins}m ${secs}s`;
};