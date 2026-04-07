// import * as Yup from 'yup';
// import { RootState, store } from '@redux/store';
// import { Field, Form, Formik, FormikValues } from 'formik';
// import { useDispatch, useSelector } from 'react-redux';
// import { errorConfirmation, successConfirmation } from '@utils/modal';
// import { fetchPublicHolidays, fetchConfiguration } from "@services/company";
// import eventBus from "@utils/EventBus";
// import { EVENT_KEYS } from "@constants/eventKeys";
// import { createKpiScore, checkAttendanceMarked, fetchAttendanceDetails, getAllKpiFactors, getAttendanceRequest, saveCheckIn, saveCheckOut, validateTokenInOut, fetchEmployeesOnLeaveToday } from "@services/employee";
// import { saveBtnText, savePersonalAttendance, toggleDisableBtn, toggleOpenModal } from '@redux/slices/attendance';
// import { fetchDayWiseShifts } from '@services/dayWiseShift';
// import dayjs from 'dayjs';
// import { useEffect, useState } from 'react';
// import { getKey } from '@utils/localStorage';
// import { generateDatesForMonth, generateDatesForMonth2, convertToTimeZone } from '@utils/date';
// import { toAbsoluteUrl } from '@metronic/helpers';
// import { transformAttendance } from '../../OverviewView';
// import { distanceInMeters } from '@utils/file';
// import { fetchCompanySettings } from '@services/options';

// import customParseFormat from 'dayjs/plugin/customParseFormat';
// import { fetchAppSettings } from '@redux/slices/appSettings';
// import isSameOrBefore   from 'dayjs/plugin/isSameOrBefore';
// import isSameOrAfter    from 'dayjs/plugin/isSameOrAfter';
// import { AnythingStatus, LoanStatus } from '@constants/statistics';
// import { IAttendanceRequests } from '@models/employee';
// import { KPITestPanel } from './KPITestPanel';
// // import { KPITestPanel } from './KPITestPanel';
// dayjs.extend(customParseFormat);
// dayjs.extend(isSameOrBefore);
// dayjs.extend(isSameOrAfter);

// const attendanceSchema = Yup.object({
//     workingMethodId: Yup.string(),
// });

// let initialState = {
//     workingMethod: '',
// }

// // send checkin api call and checkout call
// function WorkingMethodOptions({sendNotification}: {sendNotification?:any}) {
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
//     // const [showTestPanel, setShowTestPanel] = useState(false);
//     // const [testMode, setTestMode] = useState<{
//     //     enabled: boolean;
//     //     checkinTime?: Date;
//     //     checkoutTime?: Date;
//     //     testDate?: string;
//     // }>({ enabled: false });
//     const dispatch = useDispatch();
//     const { btnText, currentAddress, employeeId, position: { latitude, longitude }, disableBtn, personalAttendance, workingMethodOptions } = useSelector((state: RootState) => {
//         const { employee, attendance } = state;
//         return {
//             personalAttendance: attendance.personalAttendance,
//             employeeId: employee.currentEmployee.id,
//             btnText: attendance.btnText,
//             currentAddress: attendance.currentAddress,
//             position: attendance.position,
//             disableBtn: attendance.disableBtn,
//             workingMethodOptions: attendance.workingMethodOptions
//         }
//     })

//     // App settings - Keep original implementation for non-KPI usage
//     const appSettings = useSelector((state: RootState) => state.appSettings);
//     let totalWorkingHour: number = appSettings.workingHours || 0;
//     let checkinTimeFromStore: string = appSettings.checkinTime || '';
//     let checkoutTimeFromStore: string = appSettings.checkoutTime || '';
//     let graceTimeFromStore = appSettings.graceTime;
//     const appsettings = appSettings;

//     const [allTheFactorDetails, setAllTheFactorDetails] = useState<any>([])
//     const [selectedWorkingMethod, setSelectedWorkingMethod] = useState(workingMethodOptions[0]?.type);
//     const [distanceAllowedFromOfficeInMeters, setDistanceAllowedFromOfficeInMeters] = useState(0);
//     const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('');
//     const allEmpDetails = useSelector((state: RootState) => state.employee.currentEmployee);
//     const branchLatitude = allEmpDetails.branches?.latitude!;
//     const branchLongitude = allEmpDetails.branches?.longitude!;
//     const publicHolidays = useSelector((state: RootState) => state.attendanceStats.publicHolidays);
//     const branchDetails = useSelector((state: RootState) => state.employee?.currentEmployee?.branches);
//     const employeeWorkingAndOffDays = JSON.parse(branchDetails?.workingAndOffDays || '{}');
//     const [yesterdayAttendanceRequest, setYesterdayAttendanceRequest] = useState<IAttendanceRequests>()

//     // Day-wise shift state
//     const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);

//     // Helper function: Get shift for a specific date
//     const getShiftForDate = (date: Date) => {
//         const dayName = dayjs(date).format('dddd'); // "Monday", "Tuesday", etc.
//         return dayWiseShifts.find(s => s.day === dayName) || null;
//     };

//     // Helper function: Convert time string to minutes
//     const timeToMinutes = (timeStr: string): number => {
//         if (!timeStr) return 0;

//         // Handle "9:30 AM" or "6:30 PM" format
//         if (timeStr.includes('AM') || timeStr.includes('PM')) {
//             const parsed = dayjs(timeStr, 'h:mm A');
//             return parsed.hour() * 60 + parsed.minute();
//         }

//         // Handle "1:00 Hrs" format
//         const cleaned = timeStr.replace(' Hrs', '').trim();
//         const [hours, minutes] = cleaned.split(':');
//         return (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
//     };

//     // Helper function: Calculate expected working hours from shift times
//     const calculateExpectedHours = (checkIn: string, checkOut: string, lunchTime: string): number => {
//         if (!checkIn || !checkOut) return 0; // Return 0 if invalid, will use fallback

//         const checkInMin = timeToMinutes(checkIn);
//         const checkOutMin = timeToMinutes(checkOut);
//         const lunchMin = timeToMinutes(lunchTime || "1:00 Hrs");

//         const totalMin = checkOutMin - checkInMin - lunchMin;
//         return totalMin > 0 ? totalMin / 60 : 0; // Convert to hours
//     };

//     // Cleanup old KPI localStorage keys on mount (keeps only today's keys)
//     useEffect(() => {
//         const today = dayjs().format('YYYY-MM-DD');
//         const keysToRemove: string[] = [];

//         for (let i = 0; i < localStorage.length; i++) {
//             const key = localStorage.key(i);
//             if (key?.startsWith('kpi_') && !key.endsWith(today)) {
//                 keysToRemove.push(key);
//             }
//         }

//         keysToRemove.forEach(key => localStorage.removeItem(key));

//         if (keysToRemove.length > 0) {
//             console.log(`Cleaned up ${keysToRemove.length} old KPI localStorage keys`);
//         }
//     }, []);

//     // Helper function: Safe KPI score creation with duplicate prevention
//     const safeCreateKpiScore = async (payload: any, factorName: string, allowUpdate: boolean = false) => {
//         try {
//             // Generate unique key for today's KPI
//             const today = dayjs().format('YYYY-MM-DD');
//             const kpiKey = `kpi_${payload.employeeId}_${payload.factorId}_${today}`;

//             // Check if already created today (prevents duplicates)
//             const alreadyCreated = localStorage.getItem(kpiKey);
//             if (alreadyCreated && !allowUpdate) {
//                 console.log(`向Skipping duplicate KPI for ${factorName} - already created today`);
//                 return;
//             }

//             // Mark as creating (before API call to handle race condition)
//             localStorage.setItem(kpiKey, 'pending');

//             await createKpiScore(payload);

//             // Mark as successfully created
//             localStorage.setItem(kpiKey, 'created');

//             // No cleanup needed - old keys are harmless (each day has unique key with date)

//         } catch (error) {
//             // Remove pending flag on error so user can retry
//             const today = dayjs().format('YYYY-MM-DD');
//             const kpiKey = `kpi_${payload.employeeId}_${payload.factorId}_${today}`;
//             localStorage.removeItem(kpiKey);

//             console.error(`KPI creation failed for ${factorName}:`, error);
//             // Don't throw - let check-in/check-out continue
//         }
//     };

//     // Load day-wise shifts on mount
//     useEffect(() => {
//         async function loadDayWiseShifts() {
//             try {
//                 const response = await fetchDayWiseShifts();
//                 const shifts = response.data || [];
//                 setDayWiseShifts(shifts);
//             } catch (error) {
//                 console.error('❌ Failed to load day-wise shifts:', error);
//                 setDayWiseShifts([]);
//             }
//         }
//         loadDayWiseShifts();
//     }, []);

//     useEffect(() => {
//         if (!employeeId) return;
//         const fetchAttendanceRequests = async () => {
            
//             let yesterDay = new Date()
//             yesterDay.setDate(yesterDay.getDate() - 1);
//             const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, dayjs(yesterDay).format('YYYY-MM-DD'), dayjs(yesterDay).format('YYYY-MM-DD'));
//             if(Array.isArray(attendanceRequests) && attendanceRequests.length>0){
//                 setYesterdayAttendanceRequest(attendanceRequests[0]);
//             }
//         }
//         fetchAttendanceRequests();
//     }, [employeeId])

//     const [isWorkingMethodSelected, setIsWorkingMethodSelected] = useState(false);
//     function parseGraceTime(graceTime: string | null) {
//         if (!graceTime) {
//           return {
//             hours: 0,
//             minutes: 0,
//             seconds: 0,
//           };
//         }
//         // Remove " Hrs" and split by ":"
//         const timePart = graceTime.replace(' Hrs', '').trim();
//         const [hoursStr, minutesStr, secondsStr] = timePart.split(':');
//         return {
//           hours: parseInt(hoursStr, 10) || 0,
//           minutes: parseInt(minutesStr, 10) || 0,
//           seconds: parseInt(secondsStr, 10) || 0,
//         };
//       }

// const handleCheckIn = async (values: any) => {
//     try {
//         // Get today's shift for KPI calculations ONLY (with fallback to app settings)
//         const todaysShift = getShiftForDate(new Date());
//         const kpiCheckinTime = todaysShift?.checkIn || checkinTimeFromStore;
//         const kpiCheckoutTime = todaysShift?.checkOut || checkoutTimeFromStore;
//         const kpiTotalWorkingHour = calculateExpectedHours(kpiCheckinTime, kpiCheckoutTime, appSettings.deductionTime) || totalWorkingHour;

//         // Validate required settings before proceeding
//         if (!totalWorkingHour || !checkinTimeFromStore || !checkoutTimeFromStore) {
//             console.error('❌ ERROR: Missing required app settings');
//             errorConfirmation('System configuration incomplete. Please contact administrator.');
//             return;
//         }

//         if (!allTheFactorDetails || allTheFactorDetails.length === 0) {
//             console.error('❌ ERROR: KPI factors not loaded');
//             errorConfirmation('KPI configuration not found. Please contact administrator.');
//             return;
//         }

//         // Use test time if in test mode, otherwise use current time
//         // const checkinTimeToUse = testMode.enabled && testMode.checkinTime ? testMode.checkinTime : new Date();
//         const checkinTimeToUse = new Date();

//         const payload = {
//             employeeId,
//             checkIn: checkinTimeToUse,
//             latitude,
//             longitude,
//             checkInLocation: currentAddress,
//             workingMethodId: values.workingMethod,
//         }

//         // calculation for Late Attendance Days
//         const todaysAttendanceData = personalAttendance.find((el: any) => el.formattedDate == dayjs().format('DD/MM/YYYY'));
//         const todayCheckin = checkinTimeToUse;
//         const actualCheckIn = dayjs(todayCheckin);

//         // USE KPI CHECK-IN TIME (from day-wise shift or fallback to app settings)
//         const storeCheckIn = dayjs(kpiCheckinTime, 'h:mm A')
//             .year(actualCheckIn.year())
//             .month(actualCheckIn.month())
//             .date(actualCheckIn.date());

//         // Determine which grace time to use based on working method (for KPI calculations only)
//         const isOnSiteCheckIn = values.workingMethod === workingMethodOptions[2]?.id;
//         const graceTimeForKPI = isOnSiteCheckIn && graceTimeOnSite ? graceTimeOnSite : graceTimeFromStore;
//         const { hours, minutes, seconds } = parseGraceTime(graceTimeForKPI.toString());
//         const storeCheckInWithGrace = storeCheckIn
//             .add(hours, 'hour')
//             .add(minutes, 'minute')
//             .add(seconds, 'second');

//         const checkinTimeCheck = storeCheckInWithGrace.isSameOrAfter(actualCheckIn);

//         const lateAttendanceDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'late attendance days');
//         let lateAttendanceDaysWeightage = Number(lateAttendanceDaysFactor?.weightage);
//         const lateAttendanceDaysWeightageType = lateAttendanceDaysFactor?.type;
        
//         if (lateAttendanceDaysWeightageType == "NEGATIVE") {
//             lateAttendanceDaysWeightage = lateAttendanceDaysWeightage * -1;
//         }
//         const lateAttendanceDaysFactorId = lateAttendanceDaysFactor?.id;

//         const lateAttendanceDaysValue = 1;
//         const lateAttendanceDaysScore = lateAttendanceDaysValue * lateAttendanceDaysWeightage;
//         const lateAttendanceDaysPayload = {
//             employeeId,
//             factorId: lateAttendanceDaysFactorId,
//             value: lateAttendanceDaysValue,
//             score: lateAttendanceDaysScore,
//         }

//         const diffMinutesForUserCheckinAndActualCheckin = actualCheckIn.diff(storeCheckInWithGrace, 'minutes');
//         const isLate = diffMinutesForUserCheckinAndActualCheckin > 0;

//         // Check if today is a holiday or weekend
//         const todayFormatted = dayjs().format('DD/MM/YYYY');
//         const todayDayName = dayjs().format('dddd').toLowerCase();
//         const todayHolidays = publicHolidays.filter((el: any) =>
//             dayjs(el.date).format('DD/MM/YYYY') === todayFormatted
//         );
//         let weekendDaysToday = Object.keys(employeeWorkingAndOffDays)
//             .filter((day: any) => employeeWorkingAndOffDays[day] === '0')
//             .map((day: any) => day.toLowerCase());
//         const isTodayHolidayOrWeekend = todayHolidays.length > 0 || weekendDaysToday.includes(todayDayName);

//         if (isTodayHolidayOrWeekend) {
//             // Working on weekend/holiday - Hit Extra Days KPI, skip late KPIs
//             const extraDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'extra days');
//             let extraDaysWeightage = Number(extraDaysFactor?.weightage);
//             const extraDaysWeightageType = extraDaysFactor?.type;

//             if (extraDaysWeightageType === "NEGATIVE") {
//                 if (extraDaysWeightage > 0) {
//                     extraDaysWeightage = extraDaysWeightage * -1;
//                 }
//             }

//             const extraDaysFactorId = extraDaysFactor?.id;
//             const extraDaysValue = 1;
//             const extraDaysScore = extraDaysValue * extraDaysWeightage;

//             const extraDaysPayload = {
//                 employeeId,
//                 factorId: extraDaysFactorId,
//                 value: extraDaysValue.toString(),
//                 score: extraDaysScore.toString(),
//             };

//             await safeCreateKpiScore(extraDaysPayload, 'Extra Days');
//         } else if (isLate) {
//             // USER IS LATE - Process late attendance penalties
//             if (!checkinTimeCheck) {
//                 await safeCreateKpiScore(lateAttendanceDaysPayload, 'Late Attendance Days');
//             }

//             // Total Late Hours Factor
//             const lateCheckinHoursValue = Math.abs(diffMinutesForUserCheckinAndActualCheckin) / 60;
//             const lateHoursFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'total late hours');
//             let lateHoursWeightage = Number(lateHoursFactor?.weightage);
//             const lateHoursWeightageType = lateHoursFactor?.type;

//             if(lateHoursWeightageType=="NEGATIVE"){
//                 lateHoursWeightage = Math.abs(lateHoursWeightage);
//             }

//             const lateHoursFactorId = lateHoursFactor?.id;
//             const lateHoursValue = lateHoursWeightage;
//             const lateHoursScore = lateHoursWeightageType === "NEGATIVE"
//                 ? -1 * lateHoursValue * lateCheckinHoursValue
//                 : lateHoursValue * lateCheckinHoursValue;

//             const lateHoursPayload = {
//                 employeeId,
//                 factorId: lateHoursFactorId,
//                 value: lateCheckinHoursValue.toString(),
//                 score: lateHoursScore.toString(),
//             }

//             await safeCreateKpiScore(lateHoursPayload, 'Total Late Hours');

//         } else {
//             // USER IS ON TIME - Create On Time Attendance KPI
//             const onTimeAttendanceFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'on time attendance days');
//             let onTimeAttendanceWeightage = Number(onTimeAttendanceFactor?.weightage);
//             const onTimeAttendanceWeightageType = onTimeAttendanceFactor?.type;

//             if(onTimeAttendanceWeightageType=="NEGATIVE"){
//                 if(onTimeAttendanceWeightage>0){
//                     onTimeAttendanceWeightage = onTimeAttendanceWeightage*-1;
//                 }
//             }

//             const onTimeAttendanceFactorId = onTimeAttendanceFactor?.id;
//             const onTimeAttendanceValue = 1;
//             const onTimeAttendanceScore = onTimeAttendanceValue * onTimeAttendanceWeightage;

//             const onTimeAttendancePayLoad = {
//                 employeeId,
//                 factorId: onTimeAttendanceFactorId,
//                 value: onTimeAttendanceValue.toString(),
//                 score: onTimeAttendanceScore.toString(),
//             };

//             await safeCreateKpiScore(onTimeAttendancePayLoad, 'On Time Attendance Days');
//         }

//         // Absent days calculation
//         const todayDate = new Date();
//         todayDate.setDate(todayDate.getDate() - 1);
//         const yeaterdayDate = todayDate;
//         const yesterdayDayDate = dayjs(yeaterdayDate).format('DD/MM/YYYY');
        
//         const yesterdayDay = dayjs(yeaterdayDate).format('dddd');

//         // Fetch yesterday's attendance from API to avoid stale client state
//         const yesterdayMonth = dayjs(yeaterdayDate).month() + 1;
//         const yesterdayYear = dayjs(yeaterdayDate).year();
//         const mumbaiTz = 'Asia/Kolkata';
//         let yesterdayAttendance: any = null;
//         try {
//             const { data: { attendance: yesterdayAttendanceData } } = await fetchAttendanceDetails(
//                 employeeId,
//                 yesterdayMonth,
//                 yesterdayYear
//             );
//             console.log("yesterdayAttendanceData from API:", yesterdayAttendanceData);
//             // Raw API data uses checkIn field - convert to Mumbai timezone before comparing
//             yesterdayAttendance = yesterdayAttendanceData?.find((el: any) => {
//                 const checkInDate = dayjs(convertToTimeZone(el.checkIn, mumbaiTz)).format('DD/MM/YYYY');
//                 return checkInDate === yesterdayDayDate;
//             });
//         } catch (error) {
//             console.error('Failed to fetch yesterday attendance:', error);
//             // Fallback to client state if API fails (uses formattedDate from transformed data)
//             yesterdayAttendance = personalAttendance.find((el: any) => {
//                 return dayjs(el.formattedDate).format('DD/MM/YYYY') === yesterdayDayDate;
//             });
//         }
//         console.log("yesterdayDayDate:", yesterdayDayDate);
//         console.log("yesterdayAttendance:", yesterdayAttendance);
        
//         const holidays = publicHolidays.filter((el: any) => {
//             return dayjs(el.date).format('DD/MM/YYYY') == yesterdayDayDate;
//         });


//         let weekendDays = Object.keys(employeeWorkingAndOffDays).filter((day: any) => employeeWorkingAndOffDays[day] === '0');
        
        
//         weekendDays = weekendDays.map((day: any) => day.toLowerCase());

//         const isYesterdayHolidayOrWeekend = holidays.length > 0 || weekendDays.includes(yesterdayDay.toLowerCase());

//         // Check if employee was on leave yesterday
//         let wasOnLeaveYesterday = false;
//         try {
//             const yesterdayDateForAPI = dayjs(yeaterdayDate).format('YYYY-MM-DD');
//             const { data: { employeeLeaveDetails } } = await fetchEmployeesOnLeaveToday(yesterdayDateForAPI);
            
//             wasOnLeaveYesterday = employeeLeaveDetails?.some((leave: any) => {
//                 const leaveEmployeeId = leave?.employee?.id || leave?.employeeId;
//                 return leaveEmployeeId === employeeId;
//             }) || false;
//         } catch (error) {
//             console.error('Failed to check leave status for yesterday:', error);
//             wasOnLeaveYesterday = false;
//         }

//         const absentDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'absent days');
//         let absentDaysWeightage = Number(absentDaysFactor?.weightage);
//         const absentDaysWeightageType = absentDaysFactor?.type;

//         if (absentDaysWeightageType == "NEGATIVE") {
//             absentDaysWeightage = absentDaysWeightage * -1;
//         }
//         const absentDaysFactorId = absentDaysFactor?.id;
//         const absentDaysValue = 1;
//         const absentDaysScore = absentDaysValue * absentDaysWeightage;

//         const absentDaysPayload = {
//             employeeId,
//             factorId: absentDaysFactorId,
//             value: absentDaysValue.toString(),
//             score: absentDaysScore.toString(),
//         }

//         const noRecordExists = !yesterdayAttendance;
//         // Check for missing checkIn/checkOut - raw API data uses null/undefined, not '-NA-' string
//         const checkinNA = !yesterdayAttendance?.checkIn;
//         const checkoutNA = !yesterdayAttendance?.checkOut;
//         const wasYesterdayAbsent = noRecordExists || (checkinNA || checkoutNA);
//         const hasAnyRequest = !!yesterdayAttendanceRequest;

//         // Check if employee was employed yesterday (joined on or before yesterday)
//         const joiningDate = dayjs(allEmpDetails?.dateOfJoining);
//         const wasEmployedYesterday = dayjs(yeaterdayDate).isSameOrAfter(joiningDate, 'day');

//         // Only mark as absent if: no attendance + no request + not holiday/weekend + not on leave + was employed
//         if (wasYesterdayAbsent &&
//             !hasAnyRequest &&
//             !isYesterdayHolidayOrWeekend &&
//             !wasOnLeaveYesterday &&
//             wasEmployedYesterday) {
//             await safeCreateKpiScore(absentDaysPayload, 'Absent Days');
//         }

//         // ----------------------
//         const data = await saveCheckIn(payload);
        
//         const now = new Date();
//         const month = now.getMonth() + 1;
//         const year = now.getFullYear();
//         const dates = generateDatesForMonth(`${year}-${month}-01`);

//         async function fetchAttendance() {
//             const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);
//             const personalAttendance = transformAttendance(dates, attendance);
//             dispatch(savePersonalAttendance(personalAttendance));
//         }

//         await fetchAttendance();
//         if(sendNotification) sendNotification();
//         eventBus.emit(EVENT_KEYS.userRaisedRequestSubmitted);
//         successConfirmation(data.message);
//         dispatch(toggleOpenModal(false));
//     }
//     catch (err: any) {
//         errorConfirmation(err.data.detail);
//     }
// }

//     const handleCheckOut = async (values: any) => {
//         try {
//             // Get today's shift for KPI calculations ONLY (with fallback to app settings)
//             const todaysShift = getShiftForDate(new Date());
//             const kpiCheckinTime = todaysShift?.checkIn || checkinTimeFromStore;
//             const kpiCheckoutTime = todaysShift?.checkOut || checkoutTimeFromStore;
//             const kpiTotalWorkingHour = calculateExpectedHours(kpiCheckinTime, kpiCheckoutTime, appSettings.deductionTime) || totalWorkingHour;

//             // Validate required settings before proceeding
//             if (!totalWorkingHour || !checkinTimeFromStore || !checkoutTimeFromStore) {
//                 console.error('❌ ERROR: Missing required app settings');
//                 errorConfirmation('System configuration incomplete. Please contact administrator.');
//                 return;
//             }

//             if (!allTheFactorDetails || allTheFactorDetails.length === 0) {
//                 console.error('❌ ERROR: KPI factors not loaded');
//                 errorConfirmation('KPI configuration not found. Please contact administrator.');
//                 return;
//             }

//             const date = dayjs().format('DD/MM/YYYY');
//             const now2 = new Date();
//             const month = now2.getMonth() + 1;
//             const year = now2.getFullYear();

//             const dates = generateDatesForMonth2(now2);
//             const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);
//             const personalAttendance = transformAttendance(dates, attendance);
//             dispatch(savePersonalAttendance(personalAttendance));

//             const attendanceRecord = personalAttendance.find((el: any) => el.formattedDate == date);
//             if (!attendanceRecord){
//                 console.error("❌ attendanceRecord is not found hence returning");
//                 return;
//             }

//             // const checkoutTimeToUse = testMode.enabled && testMode.checkoutTime ? testMode.checkoutTime : new Date();
//             const checkoutTimeToUse = new Date();

//             const payload = {
//                 attendanceId: attendanceRecord.id,
//                 latitude: latitude,
//                 longitude: longitude,
//                 checkOut: checkoutTimeToUse,
//                 employeeId,
//                 checkOutLocation: currentAddress,
//                 checkoutWorkingMethodId:values.workingMethod
//             }

//             // Check if today's check-in exists before proceeding
//             const todaysAttendanceForValidation = personalAttendance.find((el: any) => el.formattedDate == dayjs().format('DD/MM/YYYY'));
//             const todayCheckinForValidation = todaysAttendanceForValidation?.checkIn;

//             if (!todayCheckinForValidation) {
//                 console.warn('⚠️ WARNING: No valid check-in found, skipping work-related KPIs');
//             } else {
//                 // working days
//                 const workingDays = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'working days');
//                 let workingDaysWeightage = Number(workingDays?.weightage);
//                 const workingDaysWeightageType = workingDays?.type;

//                 if(workingDaysWeightageType=="NEGATIVE"){
//                     if(workingDaysWeightage>0){
//                         workingDaysWeightage = workingDaysWeightage*-1;
//                     }
//                 }
//                 const workingDaysFactorId = workingDays?.id;
//                 const workingDayValue = 1;
//                 const workingDaysScore = workingDayValue * workingDaysWeightage;

//                 const workingDaysPayload = {
//                     employeeId,
//                     factorId: workingDaysFactorId,
//                     value: workingDayValue.toString(),
//                     score: workingDaysScore.toString(),
//                 }

//                 await safeCreateKpiScore(workingDaysPayload, 'Working Days');
//         // send create api call here for working day factor Id
//         // createKpiScore(workingDaysPayload).then(res=>{
//         // })

//             // calculation for totalworking hours
//             const totalWorkingHours = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'total working hour');
//             let totalWorkingHoursWeightage = Number(totalWorkingHours?.weightage);
//             const totalWorkingHoursWeightageType = totalWorkingHours?.type;

//             if(totalWorkingHoursWeightageType=="NEGATIVE"){
//                 if(totalWorkingHoursWeightage>0){
//                     totalWorkingHoursWeightage = totalWorkingHoursWeightage*-1;
//                 }
//             }
//             const totalWorkingHoursFactorId = totalWorkingHours?.id;

//             const todaysAttendanceData = personalAttendance.find((el: any) => el.formattedDate == dayjs().format('DD/MM/YYYY'));
//             const todayCheckin = todaysAttendanceData?.checkIn;

//             if(!(todayCheckin?.includes("na")|| todayCheckin?.includes("NA")|| !todayCheckin)){
//                 // return;
//             }
//             const checkInTime  = dayjs(todayCheckin, ['h:mm A', 'HH:mm', 'HH:mm:ss']).toDate();
//             const checkOutTime = checkoutTimeToUse;

//             const diffMs = checkOutTime.getTime() - checkInTime.getTime();
//             const diffMinutes = diffMs / (1000 * 60);
//             const diffHours = diffMinutes / 60;
//             const roundedDiffHours = parseFloat(diffHours.toFixed(2));

//             const totalWorkingHoursScore = roundedDiffHours * totalWorkingHoursWeightage;

//             const totalWorkingHoursPayload = {
//                 employeeId,
//                 factorId: totalWorkingHoursFactorId,
//                 value: roundedDiffHours.toString(),
//                 score: totalWorkingHoursScore.toString(),
//             }

//                 await safeCreateKpiScore(totalWorkingHoursPayload, 'Total Working Hours', true); // allowUpdate = true

//             // calculation for extra days (commented out)
//             const today = dayjs().format('DD/MM/YYYY');
//             const isHoliday = publicHolidays.some((el: any) => dayjs(el.date).format('DD/MM/YYYY') === today);

//             const extraDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'extra days');
//             let extraDaysWeightage = Number(extraDaysFactor?.weightage);
//             const extraDaysWeightageType = extraDaysFactor?.type;

//             if(extraDaysWeightageType=="NEGATIVE"){
//                 if(extraDaysWeightage>0){
//                     extraDaysWeightage = extraDaysWeightage*-1;
//                 }
//             }
//             const extraDaysFactorId = extraDaysFactor?.id;
//             const extraDaysValue = extraDaysWeightage
//             const extraDaysScore = extraDaysValue*1

//             const extraDaysPayload = {
//                 employeeId,
//                 factorId: extraDaysFactorId,
//                 value: extraDaysValue.toString(),
//                 score: extraDaysScore.toString(),
//             }

//             // Currently commented out - Extra days logic
//             // if(isHoliday){
//             //     const resForExtraDays = await createKpiScore(extraDaysPayload);
//             // }

//             // calculation for overtime - USE KPI TOTAL WORKING HOUR
//             const totalWorkingHoursFromStore = kpiTotalWorkingHour;

//             const overtimeFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'over time');
//             let overtimeWeightage = Number(overtimeFactor?.weightage);
//             const overtimeWeightageType = overtimeFactor?.type;

//             if(overtimeWeightageType=="NEGATIVE"){
//                 if(overtimeWeightage>0){
//                     overtimeWeightage = overtimeWeightage*-1;
//                 }
//             }

//             const overtimeFactorId = overtimeFactor?.id;
//             const overtimeValue = overtimeWeightage;

//             const expectedWorkingMinutes = Number(totalWorkingHoursFromStore) * 60;
//             const extraMinutes = diffMinutes - expectedWorkingMinutes;
//             const finalExtraHours = extraMinutes > 0 ? parseFloat((extraMinutes / 60).toFixed(2)) : 0;
//             const overtimeScore = overtimeValue*finalExtraHours;

//             const overtimePayload = {
//                 employeeId,
//                 factorId: overtimeFactorId,
//                 value: finalExtraHours.toString(),
//                 score: overtimeScore.toString(),
//             }

//             if(finalExtraHours > 0){
//                 await safeCreateKpiScore(overtimePayload, 'Overtime');
//             }

//             // On Time Attendance verification (not created at checkout, already created at check-in)
//             const actualCheckIn   = dayjs(todayCheckin, 'HH:mm');
//             const actualCheckOut  = dayjs(checkoutTimeToUse);
//             const storeCheckIn    = dayjs(kpiCheckinTime, 'h:mm A');
//             const storeCheckOut   = dayjs(kpiCheckoutTime, 'h:mm A');

//             const { hours, minutes, seconds } = parseGraceTime(graceTimeFromStore.toString());
//             const storeCheckInWithGrace = storeCheckIn
//                 .add(hours, 'hour')
//                 .add(minutes, 'minute')
//                 .add(seconds, 'second');

//             const checkinTimeCheck = storeCheckInWithGrace.isSameOrAfter(actualCheckIn);
//             const checkoutTimeCheck = actualCheckOut.isSameOrAfter(storeCheckOut);

//             const onTimeAttendanceFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'on time attendance days');
//             let onTimeAttendanceWeightage = Number(onTimeAttendanceFactor?.weightage);
//             const onTimeAttendanceWeightageType = onTimeAttendanceFactor?.type;

//             if(onTimeAttendanceWeightageType=="NEGATIVE"){
//                 if(onTimeAttendanceWeightage>0){
//                     onTimeAttendanceWeightage = onTimeAttendanceWeightage*-1;
//                 }
//             }
//             const onTimeAttendanceFactorId = onTimeAttendanceFactor?.id;
//             const onTimeAttendanceValue = onTimeAttendanceWeightage
//             const onTimeAttendanceScore = onTimeAttendanceValue*1

//             const onTimeAttendancePayLoad = {
//                 employeeId,
//                 factorId: onTimeAttendanceFactorId,
//                 value: onTimeAttendanceValue.toString(),
//                 score: onTimeAttendanceScore.toString(),
//             }

//             // Skip creating on-time KPI at checkout since it's already created at check-in

//             // calculation for Attendance Streak: On checkout
//             const attendanceStreakFactor = allTheFactorDetails.find((el:any) => el?.name?.toLowerCase() === 'attendance streak');
//             let attendanceStreakWeightage = Number(attendanceStreakFactor?.weightage);

//             if (attendanceStreakFactor?.type === 'NEGATIVE') attendanceStreakWeightage *= -1;
//             const attendanceStreakFactorId = attendanceStreakFactor?.id;

//             // Prepare holiday and weekend lookup
//             const holidaySet = new Set(
//                 publicHolidays.map((h) => dayjs(h.date).format('DD/MM/YYYY'))
//             );
//             const weekendNames = Object.entries(employeeWorkingAndOffDays)
//                 .filter(([, val]) => val === '0')
//                 .map(([day]) => day.toLowerCase());

//             // Walk backwards from yesterday, skipping holidays and weekends
//             let cursor = dayjs().subtract(1, 'day');
//             let consecutive = 0;
//             let iterations = 0;
//             const MAX_STREAK_DAYS = 365;

//             while (true) {
//                 iterations++;

//                 if (iterations > MAX_STREAK_DAYS) {
//                     break;
//                 }

//                 const formatted = cursor.format('DD/MM/YYYY');
//                 const dayName = cursor.format('dddd').toLowerCase();

//                 // Check if this day's shift is configured as off day
//                 const dayShift = getShiftForDate(cursor.toDate());
//                 const isDayShiftOffDay = dayShift && dayShift.isActive === false;

//                 // If holiday, weekend, or day-wise shift is off day, skip
//                 if (holidaySet.has(formatted) || weekendNames.includes(dayName) || isDayShiftOffDay) {
//                     cursor = cursor.subtract(1, 'day');
//                     continue;
//                 }

//                 // Check if attendance existed
//                 const prevAtt = personalAttendance.find(el => el.formattedDate === formatted);

//                 if (prevAtt && !/NA/i.test(prevAtt.checkIn)) {
//                     consecutive += 1;
//                     cursor = cursor.subtract(1, 'day');
//                     continue;
//                 }
//                 break;
//             }

//             if (consecutive > 0 && attendanceStreakFactor?.id) {
//                 const value = attendanceStreakWeightage;
//                 const score = value * 1;
//                 const payload = {
//                     employeeId,
//                     factorId: attendanceStreakFactorId,
//                     value: value.toString(),
//                     score: score.toString(),
//                 };

//                 await safeCreateKpiScore(payload, 'Attendance Streak');
//             }

//             } // End of valid check-in validation block

//             const res = await saveCheckOut(payload);

//             if (sendNotification) {
//                 sendNotification();
//             }

//             eventBus.emit(EVENT_KEYS.userRaisedRequestSubmitted);
//             successConfirmation(res.data.message);
//             dispatch(toggleOpenModal(false));
//         }
//         catch (err: any) {
//             console.error('❌ CHECK-OUT ERROR:', err?.data?.detail || err?.message || 'Unknown error');
//             errorConfirmation(err.data.detail)
//         }
//     }

//     const handleSubmit = async (values: any, actions: FormikValues) => {
//         // Debounce: Prevent submissions within 5 seconds of each other
//         const now = Date.now();
//         if (now - lastSubmitTime < 5000) {
//             console.log('Please wait before submitting again');
//             return;
//         }
//         setLastSubmitTime(now);

//         setIsSubmitting(true);
//         if (btnText.toLowerCase() === 'check in') await handleCheckIn(values);
//         else if (btnText.toLowerCase() === 'check out') await handleCheckOut(values);
//         setIsSubmitting(false);
//     }

//     useEffect(() => {
//         async function fetchCompanySettingsDetails() {
//             const { data: { appSettings } } = await fetchCompanySettings();

//             setDistanceAllowedFromOfficeInMeters(appSettings?.distanceAllowedInMeters * 6 || 0);
//         }
//         fetchCompanySettingsDetails();
//     }, []);

//     useEffect(() => {
//         async function fetchAllTheFactorDetails() {
//             const { data: { factors } } = await getAllKpiFactors();

//             setAllTheFactorDetails(factors);
//         }

//         fetchAllTheFactorDetails();
//     }, [])

//     useEffect(() => {
//         async function fetchGraceTimeOnSite() {
//             try {
//                 const { data: { configuration } } = await fetchConfiguration('leave management');
//                 const leaveConfig = JSON.parse(configuration.configuration || '{}');
//                 const graceTimeOnSiteStr = leaveConfig?.['Grace Time - On Site'] || '00:30';
//                 setGraceTimeOnSite(graceTimeOnSiteStr.replace(' Hrs', ''));
//             } catch (error) {
//                 console.error('Failed to fetch on-site grace time:', error);
//                 setGraceTimeOnSite('00:30'); // fallback
//             }
//         }

//         fetchGraceTimeOnSite();
//     }, [])

//     useEffect(()=>{
//         const branchLatitudeFinal = parseFloat(Number(branchLatitude).toFixed(6));
//         const branchLongitudeFinal = parseFloat(Number(branchLongitude).toFixed(6));
//         const myLatitudeFinal = parseFloat(Number(latitude).toFixed(6));
//         const myLongitudeFinal = parseFloat(Number(longitude).toFixed(6));
        
//         const dist = distanceInMeters(branchLatitudeFinal, branchLongitudeFinal, myLatitudeFinal, myLongitudeFinal);
//         if(dist>=distanceAllowedFromOfficeInMeters && (selectedWorkingMethod==='Office' || selectedWorkingMethod==='office')){
//             dispatch(toggleDisableBtn(true));
//         }
//         else{
//             dispatch(toggleDisableBtn(false));
//         }

//     },[latitude,longitude,branchLatitude,branchLongitude, selectedWorkingMethod, distanceAllowedFromOfficeInMeters]);

//     useEffect(() => {
//         async function attendanceMarked() {
//             const date = dayjs().format('YYYY/MM/DD');
//             try {
//                 const res = await checkAttendanceMarked(date, employeeId);
//                 if (res.data.attendance) {
//                     const { attendance: { checkIn, checkOut } } = res.data;
//                     if (checkIn) dispatch(saveBtnText('Check out'));
//                     if (checkOut) dispatch(toggleDisableBtn(true));
//                 }
//             }
//             catch (err: any) {
//                 console.error(err);
//             }
//         }

//         async function validateToken() {
//             let lsCheckIn = getKey("check_in_token");
//             if (!lsCheckIn || !employeeId) return;
//             const { data: { isDisabled } } = await validateTokenInOut({ id: employeeId, token: lsCheckIn });
//             if (isDisabled) {
//                 dispatch(toggleDisableBtn(isDisabled));
//                 dispatch(saveBtnText("Check in"));
//                 localStorage.removeItem("check_in_token");
//             }
//         }

//         attendanceMarked();
//         validateToken();
//     }, [employeeId]);

//     if(!workingMethodOptions.length){
//         return (
//             <div className="alert alert-warning" role="alert">
//                 No Working Methods Available.
//             </div>
//         );
//     }
//     return (
//         <>
//             <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={attendanceSchema}>
//                 <Form placeholder={undefined}>
//                     <div className="row">
//                         <div className="col-lg-6">
//                             <Field
//                                 type='radio'
//                                 className='btn-check'
//                                 name='workingMethod'
//                                 value={workingMethodOptions[1]?.id}
//                                 id='working_method_office'
//                                 onClick={() => {
//                                     setSelectedWorkingMethod(workingMethodOptions[1].type);
//                                     setIsWorkingMethodSelected(true);
//                                 }}
//                             />
//                             <label
//                                 className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
//                                 htmlFor='working_method_office'
//                             >
//                                 <span className='location-circle mx-3'>
//                                     <img src={toAbsoluteUrl('media/svg/misc/office.svg')} />
//                                 </span>
//                                 <span className='d-block text-start'>
//                                     <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>Office</span>
//                                 </span>
//                             </label>
//                         </div>
//                         <div className="col-lg-6">
//                             <Field
//                                 type='radio'
//                                 className='btn-check'
//                                 name='workingMethod'
//                                 value={workingMethodOptions[2]?.id}
//                                 id='working_method_on_site'
//                                 onClick={() => {
//                                     setSelectedWorkingMethod(workingMethodOptions[2]?.type);
//                                     setIsWorkingMethodSelected(true);
//                                 }}
//                             />
//                             <label
//                                 className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
//                                 htmlFor='working_method_on_site'
//                             >
//                                 <span className='location-circle mx-3'>
//                                     <img src={toAbsoluteUrl('media/svg/misc/on-site.svg')} />
//                                 </span>
//                                 <span className='d-block text-start'>
//                                     <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>On site</span>
//                                 </span>
//                             </label>
//                         </div>
//                     </div>
//                     <div className="row">
//                         <div className="col-lg-6">
//                             <Field
//                                 type='radio'
//                                 className='btn-check'
//                                 name='workingMethod'
//                                 value={workingMethodOptions[0]?.id}
//                                 id='working_method_remote'
//                                 onClick={() => {
//                                     setSelectedWorkingMethod(workingMethodOptions[0]?.type);
//                                     setIsWorkingMethodSelected(true);
//                                 }}
//                             />
//                             <label
//                                 className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
//                                 htmlFor='working_method_remote'
//                             >
//                                 <span className='location-circle mx-3'>
//                                     <img src={toAbsoluteUrl('media/svg/misc/remote.svg')} />
//                                 </span>
//                                 <span className='d-block text-start'>
//                                     <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>Hybrid</span>
//                                 </span>
//                             </label>
//                         </div>
//                     </div>
//                     <div className="row">
//                         <h6>Location: {currentAddress} </h6>
//                         {/* <h6>Refresh: <img src={toAbsoluteUrl('media/svg/misc/refresh.svg')} /></h6> */}
//                     </div>
//                     <div className="d-flex flex-wrap justify-content-between">
//                         <div>
//                             {/* <button className='btn btn-lg btn-locate-me mx-5'>
//                                 <KTIcon iconName='geolocation' className='fs-10' />
//                                 Locate me
//                                 </button> */}
//                             {disableBtn && (
//                                 <div className="alert alert-warning my-5" role="alert">
//                                     Your current location does not match with your office location.
//                                 </div>
//                             )}
//                             {!isWorkingMethodSelected && (
//                                 <div className="alert alert-warning my-5" style={{backgroundColor: "#FCEDDF", color: '#DD700C', borderColor:'#DD700C'}} role="alert">
//                                     Please select a working method.
//                                 </div>
//                             )}
//                         </div>
//                         <div>
//                             <button className='btn btn-lg btn-primary my-5' disabled={isSubmitting || disableBtn || !allTheFactorDetails?.length || !employeeId || !totalWorkingHour || !checkinTimeFromStore || !checkoutTimeFromStore || !isWorkingMethodSelected}>{btnText}</button>
//                         </div>
//                     </div>
//                 </Form>
//             </Formik>

//             {/* KPI Test Panel Toggle Button - Only show in development */}
//             {/* {process.env.NODE_ENV === 'development' && (    



//                 <button
//                     onClick={() => setShowTestPanel(!showTestPanel)}
//                     style={{
//                         position: 'fixed',
//                         bottom: '20px',
//                         right: '20px',
//                         padding: '10px 20px',
//                         backgroundColor: '#89b4fa',
//                         color: '#1e1e2e',
//                         border: 'none',
//                         borderRadius: '8px',
//                         cursor: 'pointer',
//                         fontWeight: 'bold',
//                         zIndex: 9998,
//                         boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
//                     }}
//                 >
//                     {showTestPanel ? '❌ Close Test Panel' : '🧪 Open Test Panel'}
//                 </button>
//             )} */}

//             {/* KPI Test Panel */}
//              {/* {showTestPanel && (
//                 <KPITestPanel
//                     onRunTest={(testData) => {
//                         setTestMode({
//                             enabled: true,
//                             checkinTime: testData.checkinTime,
//                             checkoutTime: testData.checkoutTime,
//                             testDate: testData.testDate,
//                         });
//                         console.log('✅ Test mode enabled:', testData);
//                     }}
//                     onStopTest={() => {
//                         setTestMode({ enabled: false });
//                         console.log('🛑 Test mode disabled');
//                     }}
//                     onClose={() => {
//                         setShowTestPanel(false);
//                         setTestMode({ enabled: false });
//                         console.log('❌ Test panel closed');
//                     }}
//                 />
//             )} */}
//         </>
//     );
// }

// export default WorkingMethodOptions;
import * as Yup from 'yup';
import { RootState, store } from '@redux/store';
import { Field, Form, Formik, FormikValues } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { fetchPublicHolidays, fetchConfiguration } from "@services/company";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { createKpiScore, checkAttendanceMarked, fetchAttendanceDetails, getAllKpiFactors, getAttendanceRequest, saveCheckIn, saveCheckOut, validateTokenInOut, fetchEmployeesOnLeaveToday } from "@services/employee";
import { saveBtnText, savePersonalAttendance, toggleDisableBtn, toggleOpenModal } from '@redux/slices/attendance';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getKey } from '@utils/localStorage';
import { generateDatesForMonth, generateDatesForMonth2, convertToTimeZone } from '@utils/date';
import { toAbsoluteUrl } from '@metronic/helpers';
import { transformAttendance } from '../../OverviewView';
import { distanceInMeters } from '@utils/file';
import { fetchCompanySettings } from '@services/options';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import { fetchAppSettings } from '@redux/slices/appSettings';
import isSameOrBefore   from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter    from 'dayjs/plugin/isSameOrAfter';
import { AnythingStatus, LoanStatus } from '@constants/statistics';
import { IAttendanceRequests } from '@models/employee';
import { KPITestPanel } from './KPITestPanel';
// import { KPITestPanel } from './KPITestPanel';
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const attendanceSchema = Yup.object({
    workingMethodId: Yup.string(),
});

let initialState = {
    workingMethod: '',
}

// send checkin api call and checkout call
function WorkingMethodOptions({sendNotification}: {sendNotification?:any}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
    const dispatch = useDispatch();
    const { btnText, currentAddress, employeeId, position: { latitude, longitude }, disableBtn, personalAttendance, workingMethodOptions } = useSelector((state: RootState) => {
        const { employee, attendance } = state;
        return {
            personalAttendance: attendance.personalAttendance,
            employeeId: employee.currentEmployee.id,
            btnText: attendance.btnText,
            currentAddress: attendance.currentAddress,
            position: attendance.position,
            disableBtn: attendance.disableBtn,
            workingMethodOptions: attendance.workingMethodOptions
        }
    })

    // App settings - Keep original implementation for non-KPI usage
    const appSettings = useSelector((state: RootState) => state.appSettings);
    let totalWorkingHour: number = appSettings.workingHours || 0;
    let checkinTimeFromStore: string = appSettings.checkinTime || '';
    let checkoutTimeFromStore: string = appSettings.checkoutTime || '';
    let graceTimeFromStore = appSettings.graceTime;
    const appsettings = appSettings;

    const [allTheFactorDetails, setAllTheFactorDetails] = useState<any>([])
    const [selectedWorkingMethod, setSelectedWorkingMethod] = useState(workingMethodOptions[0]?.type);
    const [distanceAllowedFromOfficeInMeters, setDistanceAllowedFromOfficeInMeters] = useState(0);
    const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('');
    const allEmpDetails = useSelector((state: RootState) => state.employee.currentEmployee);
    const branchLatitude = allEmpDetails.branches?.latitude!;
    const branchLongitude = allEmpDetails.branches?.longitude!;
    const publicHolidays = useSelector((state: RootState) => state.attendanceStats.publicHolidays);
    const branchDetails = useSelector((state: RootState) => state.employee?.currentEmployee?.branches);
    const employeeWorkingAndOffDays = JSON.parse(branchDetails?.workingAndOffDays || '{}');
    const [yesterdayAttendanceRequest, setYesterdayAttendanceRequest] = useState<IAttendanceRequests>()

    // Day-wise shift state
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);

    // Helper function: Get shift for a specific date
    const getShiftForDate = (date: Date) => {
        const dayName = dayjs(date).format('dddd'); // "Monday", "Tuesday", etc.
        return dayWiseShifts.find(s => s.day === dayName) || null;
    };

    // Helper function: Convert time string to minutes
    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr) return 0;

        // Handle "9:30 AM" or "6:30 PM" format
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const parsed = dayjs(timeStr, 'h:mm A');
            return parsed.hour() * 60 + parsed.minute();
        }

        // Handle "1:00 Hrs" format
        const cleaned = timeStr.replace(' Hrs', '').trim();
        const [hours, minutes] = cleaned.split(':');
        return (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    };

    // Helper function: Calculate expected working hours from shift times
    const calculateExpectedHours = (checkIn: string, checkOut: string, lunchTime: string): number => {
        if (!checkIn || !checkOut) return 0; // Return 0 if invalid, will use fallback

        const checkInMin = timeToMinutes(checkIn);
        const checkOutMin = timeToMinutes(checkOut);
        const lunchMin = timeToMinutes(lunchTime || "1:00 Hrs");

        const totalMin = checkOutMin - checkInMin - lunchMin;
        return totalMin > 0 ? totalMin / 60 : 0; // Convert to hours
    };

    // Cleanup old KPI localStorage keys on mount (keeps only today's keys)
    useEffect(() => {
        const today = dayjs().format('YYYY-MM-DD');
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('kpi_') && !key.endsWith(today)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        if (keysToRemove.length > 0) {
            console.log(`Cleaned up ${keysToRemove.length} old KPI localStorage keys`);
        }
    }, []);

    // Helper function: Safe KPI score creation with duplicate prevention
    const safeCreateKpiScore = async (payload: any, factorName: string, allowUpdate: boolean = false) => {
        try {
            // Generate unique key for today's KPI
            const today = dayjs().format('YYYY-MM-DD');
            const kpiKey = `kpi_${payload.employeeId}_${payload.factorId}_${today}`;

            // Check if already created today (prevents duplicates)
            const alreadyCreated = localStorage.getItem(kpiKey);
            if (alreadyCreated && !allowUpdate) {
                console.log(`Skipping duplicate KPI for ${factorName} - already created today`);
                return;
            }

            // Mark as creating (before API call to handle race condition)
            localStorage.setItem(kpiKey, 'pending');

            await createKpiScore(payload);

            // Mark as successfully created
            localStorage.setItem(kpiKey, 'created');

        } catch (error) {
            // Remove pending flag on error so user can retry
            const today = dayjs().format('YYYY-MM-DD');
            const kpiKey = `kpi_${payload.employeeId}_${payload.factorId}_${today}`;
            localStorage.removeItem(kpiKey);

            console.error(`KPI creation failed for ${factorName}:`, error);
            // Don't throw - let check-in/check-out continue
        }
    };

    // Load day-wise shifts on mount
    useEffect(() => {
        async function loadDayWiseShifts() {
            try {
                const response = await fetchDayWiseShifts();
                const shifts = response.data || [];
                setDayWiseShifts(shifts);
            } catch (error) {
                console.error('Failed to load day-wise shifts:', error);
                setDayWiseShifts([]);
            }
        }
        loadDayWiseShifts();
    }, []);

    useEffect(() => {
        if (!employeeId) return;
        const fetchAttendanceRequests = async () => {
            
            let yesterDay = new Date()
            yesterDay.setDate(yesterDay.getDate() - 1);
            const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, dayjs(yesterDay).format('YYYY-MM-DD'), dayjs(yesterDay).format('YYYY-MM-DD'));
            if(Array.isArray(attendanceRequests) && attendanceRequests.length>0){
                setYesterdayAttendanceRequest(attendanceRequests[0]);
            }
        }
        fetchAttendanceRequests();
    }, [employeeId])

    const [isWorkingMethodSelected, setIsWorkingMethodSelected] = useState(false);

    function parseGraceTime(graceTime: string | null) {
        if (!graceTime) {
          return {
            hours: 0,
            minutes: 0,
            seconds: 0,
          };
        }
        // Remove " Hrs" and split by ":"
        const timePart = graceTime.replace(' Hrs', '').trim();
        const [hoursStr, minutesStr, secondsStr] = timePart.split(':');
        return {
          hours: parseInt(hoursStr, 10) || 0,
          minutes: parseInt(minutesStr, 10) || 0,
          seconds: parseInt(secondsStr, 10) || 0,
        };
    }

    const handleCheckIn = async (values: any) => {
        try {
            // Get today's shift for KPI calculations ONLY (with fallback to app settings)
            const todaysShift = getShiftForDate(new Date());
            const kpiCheckinTime = todaysShift?.checkIn || checkinTimeFromStore;
            const kpiCheckoutTime = todaysShift?.checkOut || checkoutTimeFromStore;
            const kpiTotalWorkingHour = calculateExpectedHours(kpiCheckinTime, kpiCheckoutTime, appSettings.deductionTime) || totalWorkingHour;

            // Validate required settings before proceeding
            if (!totalWorkingHour || !checkinTimeFromStore || !checkoutTimeFromStore) {
                console.error('ERROR: Missing required app settings');
                errorConfirmation('System configuration incomplete. Please contact administrator.');
                return;
            }

            if (!allTheFactorDetails || allTheFactorDetails.length === 0) {
                console.error('ERROR: KPI factors not loaded');
                errorConfirmation('KPI configuration not found. Please contact administrator.');
                return;
            }

            const checkinTimeToUse = new Date();

            const payload = {
                employeeId,
                checkIn: checkinTimeToUse,
                latitude,
                longitude,
                checkInLocation: currentAddress,
                workingMethodId: values.workingMethod,
            }

            // calculation for Late Attendance Days
            const todaysAttendanceData = personalAttendance.find((el: any) => el.formattedDate == dayjs().format('DD/MM/YYYY'));
            const todayCheckin = checkinTimeToUse;
            const actualCheckIn = dayjs(todayCheckin);

            // USE KPI CHECK-IN TIME (from day-wise shift or fallback to app settings)
            const storeCheckIn = dayjs(kpiCheckinTime, 'h:mm A')
                .year(actualCheckIn.year())
                .month(actualCheckIn.month())
                .date(actualCheckIn.date());

            // Determine which grace time to use based on working method (for KPI calculations only)
            const isOnSiteCheckIn = values.workingMethod === workingMethodOptions[2]?.id;
            const graceTimeForKPI = isOnSiteCheckIn && graceTimeOnSite ? graceTimeOnSite : graceTimeFromStore;
            const { hours, minutes, seconds } = parseGraceTime(graceTimeForKPI.toString());
            const storeCheckInWithGrace = storeCheckIn
                .add(hours, 'hour')
                .add(minutes, 'minute')
                .add(seconds, 'second');

            const checkinTimeCheck = storeCheckInWithGrace.isSameOrAfter(actualCheckIn);

            const lateAttendanceDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'late attendance days');
            const lateAttendanceDaysWeightageType = lateAttendanceDaysFactor?.type;
            const lateAttendanceDaysFactorId = lateAttendanceDaysFactor?.id;

            const diffMinutesForUserCheckinAndActualCheckin = actualCheckIn.diff(storeCheckInWithGrace, 'minutes');
            const isLate = diffMinutesForUserCheckinAndActualCheckin > 0;

            // Check if today is a holiday or weekend
            const todayFormatted = dayjs().format('DD/MM/YYYY');
            const todayDayName = dayjs().format('dddd').toLowerCase();
            const todayHolidays = publicHolidays.filter((el: any) =>
                dayjs(el.date).format('DD/MM/YYYY') === todayFormatted
            );
            let weekendDaysToday = Object.keys(employeeWorkingAndOffDays)
                .filter((day: any) => employeeWorkingAndOffDays[day] === '0')
                .map((day: any) => day.toLowerCase());
            const isTodayHolidayOrWeekend = todayHolidays.length > 0 || weekendDaysToday.includes(todayDayName);

            if (isTodayHolidayOrWeekend) {
                // Working on weekend/holiday - Hit Extra Days KPI, skip late KPIs
                const extraDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'extra days');
                const extraDaysWeightageType = extraDaysFactor?.type;
                const extraDaysFactorId = extraDaysFactor?.id;

                // FIX: Use factor.maxValue with fallback; enforce sign based on type
                const extraDaysMaxValue = Number(extraDaysFactor?.maxValue) || 30;
                const extraDaysRawValue = 1;
                const extraDaysNormalized = Math.min(extraDaysRawValue, extraDaysMaxValue);
                const extraDaysWeight =
                    extraDaysWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(extraDaysFactor?.weightage))
                        : Math.abs(Number(extraDaysFactor?.weightage));
                const extraDaysValue = extraDaysNormalized;
                const extraDaysScore = extraDaysNormalized * extraDaysWeight;

                const extraDaysPayload = {
                    employeeId,
                    factorId: extraDaysFactorId,
                    value: extraDaysValue.toString(),
                    score: extraDaysScore.toString(),
                };

                await safeCreateKpiScore(extraDaysPayload, 'Extra Days');

            } else if (isLate) {
                // USER IS LATE - Process late attendance penalties

                // FIX: Use factor.maxValue with fallback; sign enforced explicitly
                const lateAttendanceDaysMaxValue = Number(lateAttendanceDaysFactor?.maxValue) || 30;
                const lateAttendanceDaysRawValue = 1;
                const lateAttendanceDaysNormalized = Math.min(lateAttendanceDaysRawValue, lateAttendanceDaysMaxValue);
                const lateAttendanceDaysWeight =
                    lateAttendanceDaysWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(lateAttendanceDaysFactor?.weightage))
                        : Math.abs(Number(lateAttendanceDaysFactor?.weightage));
                const lateAttendanceDaysValue = lateAttendanceDaysNormalized;
                const lateAttendanceDaysScore = lateAttendanceDaysNormalized * lateAttendanceDaysWeight;

                const lateAttendanceDaysPayload = {
                    employeeId,
                    factorId: lateAttendanceDaysFactorId,
                    value: lateAttendanceDaysValue,
                    score: lateAttendanceDaysScore,
                }

                if (!checkinTimeCheck) {
                    await safeCreateKpiScore(lateAttendanceDaysPayload, 'Late Attendance Days');
                }

                // Total Late Hours Factor
                const lateCheckinHoursValue = Math.abs(diffMinutesForUserCheckinAndActualCheckin) / 60;
                const lateHoursFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'total late hours');
                const lateHoursWeightageType = lateHoursFactor?.type;
                const lateHoursFactorId = lateHoursFactor?.id;

                // FIX: Cap raw late hours via maxValue; sign enforced explicitly
                const lateHoursMaxValue = Number(lateHoursFactor?.maxValue) || 24;
                const lateHoursNormalized = Math.min(lateCheckinHoursValue, lateHoursMaxValue);
                const lateHoursWeight =
                    lateHoursWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(lateHoursFactor?.weightage))
                        : Math.abs(Number(lateHoursFactor?.weightage));
                const lateHoursValue = lateHoursNormalized;
                const lateHoursScore = lateHoursNormalized * lateHoursWeight;

                const lateHoursPayload = {
                    employeeId,
                    factorId: lateHoursFactorId,
                    value: lateHoursValue.toString(),
                    score: lateHoursScore.toString(),
                }

                await safeCreateKpiScore(lateHoursPayload, 'Total Late Hours');

            } else {
                // USER IS ON TIME - Create On Time Attendance KPI
                const onTimeAttendanceFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'on time attendance days');
                const onTimeAttendanceWeightageType = onTimeAttendanceFactor?.type;
                const onTimeAttendanceFactorId = onTimeAttendanceFactor?.id;

                // FIX: Use factor.maxValue with fallback; sign enforced explicitly
                const onTimeAttendanceMaxValue = Number(onTimeAttendanceFactor?.maxValue) || 30;
                const onTimeAttendanceRawValue = 1;
                const onTimeAttendanceNormalized = Math.min(onTimeAttendanceRawValue, onTimeAttendanceMaxValue);
                const onTimeAttendanceWeight =
                    onTimeAttendanceWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(onTimeAttendanceFactor?.weightage))
                        : Math.abs(Number(onTimeAttendanceFactor?.weightage));
                const onTimeAttendanceValue = onTimeAttendanceNormalized;
                const onTimeAttendanceScore = onTimeAttendanceNormalized * onTimeAttendanceWeight;

                const onTimeAttendancePayLoad = {
                    employeeId,
                    factorId: onTimeAttendanceFactorId,
                    value: onTimeAttendanceValue.toString(),
                    score: onTimeAttendanceScore.toString(),
                };

                await safeCreateKpiScore(onTimeAttendancePayLoad, 'On Time Attendance Days');
            }

            // Absent days calculation
            const todayDate = new Date();
            todayDate.setDate(todayDate.getDate() - 1);
            const yeaterdayDate = todayDate;
            const yesterdayDayDate = dayjs(yeaterdayDate).format('DD/MM/YYYY');
            
            const yesterdayDay = dayjs(yeaterdayDate).format('dddd');

            // Fetch yesterday's attendance from API to avoid stale client state
            const yesterdayMonth = dayjs(yeaterdayDate).month() + 1;
            const yesterdayYear = dayjs(yeaterdayDate).year();
            const mumbaiTz = 'Asia/Kolkata';
            let yesterdayAttendance: any = null;
            try {
                const { data: { attendance: yesterdayAttendanceData } } = await fetchAttendanceDetails(
                    employeeId,
                    yesterdayMonth,
                    yesterdayYear
                );
                console.log("yesterdayAttendanceData from API:", yesterdayAttendanceData);
                yesterdayAttendance = yesterdayAttendanceData?.find((el: any) => {
                    const checkInDate = dayjs(convertToTimeZone(el.checkIn, mumbaiTz)).format('DD/MM/YYYY');
                    return checkInDate === yesterdayDayDate;
                });
            } catch (error) {
                console.error('Failed to fetch yesterday attendance:', error);
                yesterdayAttendance = personalAttendance.find((el: any) => {
                    return dayjs(el.formattedDate).format('DD/MM/YYYY') === yesterdayDayDate;
                });
            }
            console.log("yesterdayDayDate:", yesterdayDayDate);
            console.log("yesterdayAttendance:", yesterdayAttendance);
            
            const holidays = publicHolidays.filter((el: any) => {
                return dayjs(el.date).format('DD/MM/YYYY') == yesterdayDayDate;
            });

            let weekendDays = Object.keys(employeeWorkingAndOffDays).filter((day: any) => employeeWorkingAndOffDays[day] === '0');
            weekendDays = weekendDays.map((day: any) => day.toLowerCase());

            const isYesterdayHolidayOrWeekend = holidays.length > 0 || weekendDays.includes(yesterdayDay.toLowerCase());

            // Check if employee was on leave yesterday
            let wasOnLeaveYesterday = false;
            try {
                const yesterdayDateForAPI = dayjs(yeaterdayDate).format('YYYY-MM-DD');
                const { data: { employeeLeaveDetails } } = await fetchEmployeesOnLeaveToday(yesterdayDateForAPI);
                
                wasOnLeaveYesterday = employeeLeaveDetails?.some((leave: any) => {
                    const leaveEmployeeId = leave?.employee?.id || leave?.employeeId;
                    return leaveEmployeeId === employeeId;
                }) || false;
            } catch (error) {
                console.error('Failed to check leave status for yesterday:', error);
                wasOnLeaveYesterday = false;
            }

            const absentDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'absent days');
            const absentDaysWeightageType = absentDaysFactor?.type;
            const absentDaysFactorId = absentDaysFactor?.id;

            // FIX: Use factor.maxValue with fallback; sign enforced explicitly
            const absentDaysMaxValue = Number(absentDaysFactor?.maxValue) || 30;
            const absentDaysRawValue = 1;
            const absentDaysNormalized = Math.min(absentDaysRawValue, absentDaysMaxValue);
            const absentDaysWeight =
                absentDaysWeightageType === 'NEGATIVE'
                    ? -Math.abs(Number(absentDaysFactor?.weightage))
                    : Math.abs(Number(absentDaysFactor?.weightage));
            const absentDaysValue = absentDaysNormalized;
            const absentDaysScore = absentDaysNormalized * absentDaysWeight;

            const absentDaysPayload = {
                employeeId,
                factorId: absentDaysFactorId,
                value: absentDaysValue.toString(),
                score: absentDaysScore.toString(),
            }

            const noRecordExists = !yesterdayAttendance;
            const checkinNA = !yesterdayAttendance?.checkIn;
            const checkoutNA = !yesterdayAttendance?.checkOut;
            const wasYesterdayAbsent = noRecordExists || (checkinNA || checkoutNA);
            const hasAnyRequest = !!yesterdayAttendanceRequest;

            // Check if employee was employed yesterday (joined on or before yesterday)
            const joiningDate = dayjs(allEmpDetails?.dateOfJoining);
            const wasEmployedYesterday = dayjs(yeaterdayDate).isSameOrAfter(joiningDate, 'day');

            if (wasYesterdayAbsent &&
                !hasAnyRequest &&
                !isYesterdayHolidayOrWeekend &&
                !wasOnLeaveYesterday &&
                wasEmployedYesterday) {
                await safeCreateKpiScore(absentDaysPayload, 'Absent Days');
            }

            // ----------------------
            const data = await saveCheckIn(payload);
            
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const dates = generateDatesForMonth(`${year}-${month}-01`);

            async function fetchAttendance() {
                const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);
                const personalAttendance = transformAttendance(dates, attendance);
                dispatch(savePersonalAttendance(personalAttendance));
            }

            await fetchAttendance();
            if(sendNotification) sendNotification();
            eventBus.emit(EVENT_KEYS.userRaisedRequestSubmitted);
            successConfirmation(data.message);
            dispatch(toggleOpenModal(false));
        }
        catch (err: any) {
            errorConfirmation(err.data.detail);
        }
    }

    const handleCheckOut = async (values: any) => {
        try {
            // Get today's shift for KPI calculations ONLY (with fallback to app settings)
            const todaysShift = getShiftForDate(new Date());
            const kpiCheckinTime = todaysShift?.checkIn || checkinTimeFromStore;
            const kpiCheckoutTime = todaysShift?.checkOut || checkoutTimeFromStore;
            const kpiTotalWorkingHour = calculateExpectedHours(kpiCheckinTime, kpiCheckoutTime, appSettings.deductionTime) || totalWorkingHour;

            // Validate required settings before proceeding
            if (!totalWorkingHour || !checkinTimeFromStore || !checkoutTimeFromStore) {
                console.error('ERROR: Missing required app settings');
                errorConfirmation('System configuration incomplete. Please contact administrator.');
                return;
            }

            if (!allTheFactorDetails || allTheFactorDetails.length === 0) {
                console.error('ERROR: KPI factors not loaded');
                errorConfirmation('KPI configuration not found. Please contact administrator.');
                return;
            }

            const date = dayjs().format('DD/MM/YYYY');
            const now2 = new Date();
            const month = now2.getMonth() + 1;
            const year = now2.getFullYear();

            const dates = generateDatesForMonth2(now2);
            const { data: { attendance } } = await fetchAttendanceDetails(employeeId, month, year);
            const personalAttendance = transformAttendance(dates, attendance);
            dispatch(savePersonalAttendance(personalAttendance));

            const attendanceRecord = personalAttendance.find((el: any) => el.formattedDate == date);
            if (!attendanceRecord){
                console.error("attendanceRecord is not found hence returning");
                return;
            }

            const checkoutTimeToUse = new Date();

            const payload = {
                attendanceId: attendanceRecord.id,
                latitude: latitude,
                longitude: longitude,
                checkOut: checkoutTimeToUse,
                employeeId,
                checkOutLocation: currentAddress,
                checkoutWorkingMethodId:values.workingMethod
            }

            // Check if today's check-in exists before proceeding
            const todaysAttendanceForValidation = personalAttendance.find((el: any) => el.formattedDate == dayjs().format('DD/MM/YYYY'));
            const todayCheckinForValidation = todaysAttendanceForValidation?.checkIn;

            if (!todayCheckinForValidation) {
                console.warn('WARNING: No valid check-in found, skipping work-related KPIs');
            } else {
                // working days
                const workingDays = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'working days');
                const workingDaysWeightageType = workingDays?.type;
                const workingDaysFactorId = workingDays?.id;

                // FIX: Use factor.maxValue with fallback; sign enforced explicitly
                const workingDaysMaxValue = Number(workingDays?.maxValue) || 30;
                const workingDaysRawValue = 1;
                const workingDaysNormalized = Math.min(workingDaysRawValue, workingDaysMaxValue);
                const workingDaysWeight =
                    workingDaysWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(workingDays?.weightage))
                        : Math.abs(Number(workingDays?.weightage));
                const workingDayValue = workingDaysNormalized;
                const workingDaysScore = workingDaysNormalized * workingDaysWeight;

                const workingDaysPayload = {
                    employeeId,
                    factorId: workingDaysFactorId,
                    value: workingDayValue.toString(),
                    score: workingDaysScore.toString(),
                }

                await safeCreateKpiScore(workingDaysPayload, 'Working Days');

                // calculation for totalworking hours
                const totalWorkingHours = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'total working hour');
                const totalWorkingHoursWeightageType = totalWorkingHours?.type;
                const totalWorkingHoursFactorId = totalWorkingHours?.id;

                const todaysAttendanceData = personalAttendance.find((el: any) => el.formattedDate == dayjs().format('DD/MM/YYYY'));
                const todayCheckin = todaysAttendanceData?.checkIn;

                const checkInTime  = dayjs(todayCheckin, ['h:mm A', 'HH:mm', 'HH:mm:ss']).toDate();
                const checkOutTime = checkoutTimeToUse;

                const diffMs = checkOutTime.getTime() - checkInTime.getTime();
                const diffMinutes = diffMs / (1000 * 60);
                const diffHours = diffMinutes / 60;
                const roundedDiffHours = parseFloat(diffHours.toFixed(2));

                // FIX: Cap actual hours via factor.maxValue; sign enforced explicitly
                const totalWorkingHoursMaxValue = Number(totalWorkingHours?.maxValue) || kpiTotalWorkingHour || 8;
                const totalWorkingHoursNormalized = Math.min(roundedDiffHours, totalWorkingHoursMaxValue);
                const totalWorkingHoursWeight =
                    totalWorkingHoursWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(totalWorkingHours?.weightage))
                        : Math.abs(Number(totalWorkingHours?.weightage));
                const totalWorkingHoursScore = totalWorkingHoursNormalized * totalWorkingHoursWeight;

                const totalWorkingHoursPayload = {
                    employeeId,
                    factorId: totalWorkingHoursFactorId,
                    value: totalWorkingHoursNormalized.toString(), // FIX: was roundedDiffHours (uncapped)
                    score: totalWorkingHoursScore.toString(),
                }

                await safeCreateKpiScore(totalWorkingHoursPayload, 'Total Working Hours', true); // allowUpdate = true

                // calculation for extra days (commented out - preserved as-is)
                const today = dayjs().format('DD/MM/YYYY');
                const isHoliday = publicHolidays.some((el: any) => dayjs(el.date).format('DD/MM/YYYY') === today);

                const extraDaysFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'extra days');
                const extraDaysWeightageType = extraDaysFactor?.type;
                const extraDaysFactorId = extraDaysFactor?.id;

                const extraDaysMaxValue = Number(extraDaysFactor?.maxValue) || 30;
                const extraDaysNormalized = Math.min(1, extraDaysMaxValue);
                const extraDaysWeight =
                    extraDaysWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(extraDaysFactor?.weightage))
                        : Math.abs(Number(extraDaysFactor?.weightage));
                const extraDaysValue = extraDaysNormalized;
                const extraDaysScore = extraDaysNormalized * extraDaysWeight;

                const extraDaysPayload = {
                    employeeId,
                    factorId: extraDaysFactorId,
                    value: extraDaysValue.toString(),
                    score: extraDaysScore.toString(),
                }

                // Currently commented out - Extra days logic at checkout preserved
                // if(isHoliday){
                //     const resForExtraDays = await createKpiScore(extraDaysPayload);
                // }

                // calculation for overtime - USE KPI TOTAL WORKING HOUR
                const totalWorkingHoursFromStore = kpiTotalWorkingHour;

                const overtimeFactor = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'over time');
                const overtimeWeightageType = overtimeFactor?.type;
                const overtimeFactorId = overtimeFactor?.id;

                const expectedWorkingMinutes = Number(totalWorkingHoursFromStore) * 60;
                const extraMinutes = diffMinutes - expectedWorkingMinutes;
                const finalExtraHours = extraMinutes > 0 ? parseFloat((extraMinutes / 60).toFixed(2)) : 0;

                // FIX: Cap overtime hours via factor.maxValue; sign enforced explicitly
                const overtimeMaxValue = Number(overtimeFactor?.maxValue) || 4;
                const overtimeNormalized = Math.min(finalExtraHours, overtimeMaxValue);
                const overtimeWeight =
                    overtimeWeightageType === 'NEGATIVE'
                        ? -Math.abs(Number(overtimeFactor?.weightage))
                        : Math.abs(Number(overtimeFactor?.weightage));
                const overtimeValue = overtimeNormalized;
                const overtimeScore = overtimeNormalized * overtimeWeight;

                const overtimePayload = {
                    employeeId,
                    factorId: overtimeFactorId,
                    value: overtimeValue.toString(), // FIX: was finalExtraHours (uncapped)
                    score: overtimeScore.toString(),
                }

                if(finalExtraHours > 0){
                    await safeCreateKpiScore(overtimePayload, 'Overtime');
                }

                // On Time Attendance verification (not created at checkout, already created at check-in)
                const actualCheckIn   = dayjs(todayCheckin, 'HH:mm');
                const actualCheckOut  = dayjs(checkoutTimeToUse);
                const storeCheckIn    = dayjs(kpiCheckinTime, 'h:mm A');
                const storeCheckOut   = dayjs(kpiCheckoutTime, 'h:mm A');

                const { hours, minutes, seconds } = parseGraceTime(graceTimeFromStore.toString());
                const storeCheckInWithGrace = storeCheckIn
                    .add(hours, 'hour')
                    .add(minutes, 'minute')
                    .add(seconds, 'second');

                const checkinTimeCheck = storeCheckInWithGrace.isSameOrAfter(actualCheckIn);
                const checkoutTimeCheck = actualCheckOut.isSameOrAfter(storeCheckOut);

                // Skip creating on-time KPI at checkout since it's already created at check-in

                // calculation for Attendance Streak: On checkout
                const attendanceStreakFactor = allTheFactorDetails.find((el:any) => el?.name?.toLowerCase() === 'attendance streak');
                const attendanceStreakFactorId = attendanceStreakFactor?.id;

                // FIX: sign enforced explicitly
                const attendanceStreakWeight =
                    attendanceStreakFactor?.type === 'NEGATIVE'
                        ? -Math.abs(Number(attendanceStreakFactor?.weightage))
                        : Math.abs(Number(attendanceStreakFactor?.weightage));

                // Prepare holiday and weekend lookup
                const holidaySet = new Set(
                    publicHolidays.map((h) => dayjs(h.date).format('DD/MM/YYYY'))
                );
                const weekendNames = Object.entries(employeeWorkingAndOffDays)
                    .filter(([, val]) => val === '0')
                    .map(([day]) => day.toLowerCase());

                // Walk backwards from yesterday, skipping holidays and weekends
                let cursor = dayjs().subtract(1, 'day');
                let consecutive = 0;
                let iterations = 0;
                const MAX_STREAK_DAYS = 365;

                while (true) {
                    iterations++;

                    if (iterations > MAX_STREAK_DAYS) {
                        break;
                    }

                    const formatted = cursor.format('DD/MM/YYYY');
                    const dayName = cursor.format('dddd').toLowerCase();

                    // Check if this day's shift is configured as off day
                    const dayShift = getShiftForDate(cursor.toDate());
                    const isDayShiftOffDay = dayShift && dayShift.isActive === false;

                    // If holiday, weekend, or day-wise shift is off day, skip
                    if (holidaySet.has(formatted) || weekendNames.includes(dayName) || isDayShiftOffDay) {
                        cursor = cursor.subtract(1, 'day');
                        continue;
                    }

                    // Check if attendance existed
                    const prevAtt = personalAttendance.find(el => el.formattedDate === formatted);

                    if (prevAtt && !/NA/i.test(prevAtt.checkIn)) {
                        consecutive += 1;
                        cursor = cursor.subtract(1, 'day');
                        continue;
                    }
                    break;
                }

                if (consecutive > 0 && attendanceStreakFactor?.id) {
                    // FIX: value = consecutive (actual streak count), was incorrectly set to weightage
                    const attendanceStreakMaxValue = Number(attendanceStreakFactor?.maxValue) || 365;
                    const attendanceStreakNormalized = Math.min(consecutive, attendanceStreakMaxValue);
                    const attendanceStreakScore = attendanceStreakNormalized * attendanceStreakWeight;

                    const streakPayload = {
                        employeeId,
                        factorId: attendanceStreakFactorId,
                        value: attendanceStreakNormalized.toString(), // FIX: was weightage (semantically wrong)
                        score: attendanceStreakScore.toString(),
                    };

                    await safeCreateKpiScore(streakPayload, 'Attendance Streak');
                }

            } // End of valid check-in validation block

            const res = await saveCheckOut(payload);

            if (sendNotification) {
                sendNotification();
            }

            eventBus.emit(EVENT_KEYS.userRaisedRequestSubmitted);
            successConfirmation(res.data.message);
            dispatch(toggleOpenModal(false));
        }
        catch (err: any) {
            console.error('CHECK-OUT ERROR:', err?.data?.detail || err?.message || 'Unknown error');
            errorConfirmation(err.data.detail)
        }
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        // Debounce: Prevent submissions within 5 seconds of each other
        const now = Date.now();
        if (now - lastSubmitTime < 5000) {
            console.log('Please wait before submitting again');
            return;
        }
        setLastSubmitTime(now);

        setIsSubmitting(true);
        if (btnText.toLowerCase() === 'check in') await handleCheckIn(values);
        else if (btnText.toLowerCase() === 'check out') await handleCheckOut(values);
        setIsSubmitting(false);
    }

    useEffect(() => {
        async function fetchCompanySettingsDetails() {
            const { data: { appSettings } } = await fetchCompanySettings();

            setDistanceAllowedFromOfficeInMeters(appSettings?.distanceAllowedInMeters * 6 || 0);
        }
        fetchCompanySettingsDetails();
    }, []);

    useEffect(() => {
        async function fetchAllTheFactorDetails() {
            const { data: { factors } } = await getAllKpiFactors();

            setAllTheFactorDetails(factors);
        }

        fetchAllTheFactorDetails();
    }, [])

    useEffect(() => {
        async function fetchGraceTimeOnSite() {
            try {
                const { data: { configuration } } = await fetchConfiguration('leave management');
                const leaveConfig = JSON.parse(configuration.configuration || '{}');
                const graceTimeOnSiteStr = leaveConfig?.['Grace Time - On Site'] || '00:30';
                setGraceTimeOnSite(graceTimeOnSiteStr.replace(' Hrs', ''));
            } catch (error) {
                console.error('Failed to fetch on-site grace time:', error);
                setGraceTimeOnSite('00:30'); // fallback
            }
        }

        fetchGraceTimeOnSite();
    }, [])

    useEffect(()=>{
        const branchLatitudeFinal = parseFloat(Number(branchLatitude).toFixed(6));
        const branchLongitudeFinal = parseFloat(Number(branchLongitude).toFixed(6));
        const myLatitudeFinal = parseFloat(Number(latitude).toFixed(6));
        const myLongitudeFinal = parseFloat(Number(longitude).toFixed(6));
        
        const dist = distanceInMeters(branchLatitudeFinal, branchLongitudeFinal, myLatitudeFinal, myLongitudeFinal);
        if(dist>=distanceAllowedFromOfficeInMeters && (selectedWorkingMethod==='Office' || selectedWorkingMethod==='office')){
            dispatch(toggleDisableBtn(true));
        }
        else{
            dispatch(toggleDisableBtn(false));
        }

    },[latitude,longitude,branchLatitude,branchLongitude, selectedWorkingMethod, distanceAllowedFromOfficeInMeters]);

    useEffect(() => {
        async function attendanceMarked() {
            const date = dayjs().format('YYYY/MM/DD');
            try {
                const res = await checkAttendanceMarked(date, employeeId);
                if (res.data.attendance) {
                    const { attendance: { checkIn, checkOut } } = res.data;
                    if (checkIn) dispatch(saveBtnText('Check out'));
                    if (checkOut) dispatch(toggleDisableBtn(true));
                }
            }
            catch (err: any) {
                console.error(err);
            }
        }

        async function validateToken() {
            let lsCheckIn = getKey("check_in_token");
            if (!lsCheckIn || !employeeId) return;
            const { data: { isDisabled } } = await validateTokenInOut({ id: employeeId, token: lsCheckIn });
            if (isDisabled) {
                dispatch(toggleDisableBtn(isDisabled));
                dispatch(saveBtnText("Check in"));
                localStorage.removeItem("check_in_token");
            }
        }

        attendanceMarked();
        validateToken();
    }, [employeeId]);

    if(!workingMethodOptions.length){
        return (
            <div className="alert alert-warning" role="alert">
                No Working Methods Available.
            </div>
        );
    }
    return (
        <>
            <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={attendanceSchema}>
                <Form placeholder={undefined}>
                    <div className="row">
                        <div className="col-lg-6">
                            <Field
                                type='radio'
                                className='btn-check'
                                name='workingMethod'
                                value={workingMethodOptions[1]?.id}
                                id='working_method_office'
                                onClick={() => {
                                    setSelectedWorkingMethod(workingMethodOptions[1].type);
                                    setIsWorkingMethodSelected(true);
                                }}
                            />
                            <label
                                className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
                                htmlFor='working_method_office'
                            >
                                <span className='location-circle mx-3'>
                                    <img src={toAbsoluteUrl('media/svg/misc/office.svg')} />
                                </span>
                                <span className='d-block text-start'>
                                    <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>Office</span>
                                </span>
                            </label>
                        </div>
                        <div className="col-lg-6">
                            <Field
                                type='radio'
                                className='btn-check'
                                name='workingMethod'
                                value={workingMethodOptions[2]?.id}
                                id='working_method_on_site'
                                onClick={() => {
                                    setSelectedWorkingMethod(workingMethodOptions[2]?.type);
                                    setIsWorkingMethodSelected(true);
                                }}
                            />
                            <label
                                className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
                                htmlFor='working_method_on_site'
                            >
                                <span className='location-circle mx-3'>
                                    <img src={toAbsoluteUrl('media/svg/misc/on-site.svg')} />
                                </span>
                                <span className='d-block text-start'>
                                    <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>On site</span>
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-lg-6">
                            <Field
                                type='radio'
                                className='btn-check'
                                name='workingMethod'
                                value={workingMethodOptions[0]?.id}
                                id='working_method_remote'
                                onClick={() => {
                                    setSelectedWorkingMethod(workingMethodOptions[0]?.type);
                                    setIsWorkingMethodSelected(true);
                                }}
                            />
                            <label
                                className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
                                htmlFor='working_method_remote'
                            >
                                <span className='location-circle mx-3'>
                                    <img src={toAbsoluteUrl('media/svg/misc/remote.svg')} />
                                </span>
                                <span className='d-block text-start'>
                                    <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>Hybrid</span>
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="row">
                        <h6>Location: {currentAddress} </h6>
                    </div>
                    <div className="d-flex flex-wrap justify-content-between">
                        <div>
                            {disableBtn && (
                                <div className="alert alert-warning my-5" role="alert">
                                    Your current location does not match with your office location.
                                </div>
                            )}
                            {!isWorkingMethodSelected && (
                                <div className="alert alert-warning my-5" style={{backgroundColor: "#FCEDDF", color: '#DD700C', borderColor:'#DD700C'}} role="alert">
                                    Please select a working method.
                                </div>
                            )}
                        </div>
                        <div>
                            <button className='btn btn-lg btn-primary my-5' disabled={isSubmitting || disableBtn || !allTheFactorDetails?.length || !employeeId || !totalWorkingHour || !checkinTimeFromStore || !checkoutTimeFromStore || !isWorkingMethodSelected}>{btnText}</button>
                        </div>
                    </div>
                </Form>
            </Formik>
        </>
    );
}

export default WorkingMethodOptions;