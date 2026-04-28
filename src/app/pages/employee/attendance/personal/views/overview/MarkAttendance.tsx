import { KTIcon } from "@metronic/helpers";
import eventBus from "@utils/EventBus";
import { RootState, store } from "@redux/store";
import { formatDate } from "@utils/date";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Modal } from "react-bootstrap";
import GoogleMaps from './GoogleMaps';
import { saveCoordinates, saveCurrentAddress, saveWorkingMethodOptions, toggleLocationPermission, toggleOpenModal } from "@redux/slices/attendance";
import { fetchAddressDetails } from "@services/location";
import Timer from "./Timer";
import { fetchWorkingMethods } from "@services/options";
import LeaveOverview from "./LeaveOverview";
import WorkingMethodOptions from "./WorkingMethodOptions";
import dayjs from "dayjs";
import { fetchEmpAttendanceStatistics, fetchEmployeeLeaves, getAllAttendanceRequestById, getAllKpiFactors, getAttendanceRequest } from "@services/employee";
import { fetchAllPublicHolidays, fetchCompanyOverview } from "@services/company";
import { customLeaves, fetchAllCompanySettings, filterLeavesPublicHolidays } from "@utils/statistics";
import { saveFilteredLeaves, saveFilteredPublicHolidays, saveLeaves, savePublicHolidays } from "@redux/slices/attendanceStats";
import { UAParser } from 'ua-parser-js';
import AttendanceOverview from "./AttendanceOverview";
import { fetchAppSettings } from "@redux/slices/appSettings";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { Status } from "@constants/statistics";

interface MarkAttendanceProps {
    variant?: 'default' | 'dashboard';
}

function MarkAttendance({ variant = 'default' }: MarkAttendanceProps) {
    const isDashboard = variant === 'dashboard';
    const dispatch = useDispatch();
    const formattedDate = formatDate(new Date());
    const { position: { latitude, longitude }, userName, btnText, locationEnabled, show } = useSelector((state: RootState) => {
        const { auth, attendance } = state;
        return {
            show: attendance.openModal,
            position: attendance.position,
            userName: auth.currentUser.firstName,
            btnText: attendance.btnText,
            locationEnabled: attendance.locationEnabled,
        }
    });
    const [latitudeNew, setLatitudeNew] = useState(0)
    const [longitudeNew, setLongitudeNew] = useState(0)
    const workingAndOfDaysDetails = useSelector((state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays);
    const workingAndOfDays = useMemo(() => {
        return JSON.parse(workingAndOfDaysDetails || "{}");
      }, [workingAndOfDaysDetails]);

    const [offDaysForTheBranch, setOffDaysForTheBranch] = useState<string[]>([]);
    const dateOfJoining = useSelector((state:RootState)=> state?.employee?.currentEmployee?.dateOfJoining);
    const [previousWorkingDay, setPreviousWorkingDay] = useState("");
    const [toggle, setToggle] = useState(true);
    const [isDeviceNotDesktop, setIsDeviceNotDesktop] = useState(false);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [lengthOfAttendanceHistory, setLengthOfAttendanceHistory] = useState(5);
    const [previousAttendanceMarked, setPreviousAttendanceMarked] = useState(false);
    const [todayLeaveHoliday, setTodayLeaveHoliday] = useState(false);
    const [hasCheckin, setHasCheckin] = useState('');
    const [raiseRequest, setRaiseRequest] = useState(false);
    const DateOfJoining = useSelector((state:RootState)=> state?.employee?.currentEmployee?.dateOfJoining);
    const isFirstDay = dayjs().format('YYYY-MM-DD') === dayjs(DateOfJoining).format('YYYY-MM-DD');
    const [isLocationLoading, setIsLocationLoading] = useState(false);


    const handleCheckClick = () => {
        // Prevent multiple clicks
        if (isLocationLoading) return;

        setIsLocationLoading(true);

        // Fetch fresh location every time modal opens
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Update coordinates in Redux
                dispatch(saveCoordinates({ latitude, longitude }));
                setLatitudeNew(latitude);
                setLongitudeNew(longitude);

                // Fetch and update current address
                try {
                    const { data: { address } } = await fetchAddressDetails(latitude, longitude);
                    dispatch(saveCurrentAddress(address));
                } catch (error) {
                    console.error("Error fetching address:", error);
                }

                // Open modal after location is updated
                dispatch(toggleOpenModal(true));
                setIsLocationLoading(false);
            },
            (error) => {
                console.error("Location error:", error);
                setIsLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // Don't use cached position - always fetch fresh
            }
        );
    }

    const handleClose = () => {
        dispatch(toggleOpenModal(false));
        setIsLocationLoading(false);
    }

    useEffect(() => {
        if(Object.keys(workingAndOfDays).length != 7) {
            return;
        }
        let offdaysData = Object.keys(workingAndOfDays).filter(day => workingAndOfDays[day] === "0");
        offdaysData = offdaysData.map(day => day.toLowerCase());
        setOffDaysForTheBranch(prev => [...prev, ...offdaysData]);
        
    }, [workingAndOfDays]);
      
    useEffect(() => {
        const parser = new UAParser();
        const result = parser.getResult();
        const type = result.device.type;
        if (type === 'mobile' || type === 'tablet') {
            setIsDeviceNotDesktop(true);
        } else {
            setIsDeviceNotDesktop(false);
        }
    }, []);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitudeNew(position?.coords?.latitude);
                setLongitudeNew(position?.coords?.longitude);
                if(position?.coords?.latitude && position?.coords?.longitude){
                    dispatch(saveCoordinates({
                        latitude: position?.coords?.latitude,
                        longitude: position?.coords?.longitude
                    }));
                }
            },
            (error) => {
                console.error("Initial location fetch error:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // Don't use cached position
            }
        );
    }, [dispatch]);

// Simplified and clearer attendance marking logic based on your requirements
/**
function shouldRaiseRequest(date){
    if (date passed is date of joining of current employee) return false;
    if (checkin and checkout for today) return false;

    if (checkin){
        do checkout no matter what:
        // message: you have checked in on date
        return true;
    }
    else if (today is holiday/leave/weekend)
    {
        check for previous day
        return shouldRaiseRequest(date-1);
    }
    else{
        return true;
    }
}
// fetch attendanceHistory, holidays, weekends, leaves
 * 
 */
useEffect(() => {
    if(!employeeId) {
        console.warn("employeeid not found");
        return;
    };
    if(!dateOfJoining) {
        console.warn("dateOfJoining not found");
        return;
    }

    async function checkPreviousAttendanceAndSetStateNew() {
        setPreviousWorkingDay("");
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;

            // Get leaves and holidays data
            const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
            const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);
            
            const totalLeaves = await customLeaves(leaves);
            dispatch(saveLeaves(totalLeaves));
            dispatch(savePublicHolidays(publicHolidays));

            const startDate = dayjs().startOf('year').format('YYYY-MM-DD');
            const endDate = dayjs().endOf('year').format('YYYY-MM-DD');
            const filteredLeavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true, false, true);
            
            dispatch(saveFilteredLeaves(filteredLeavesHolidays?.customLeaves));
            dispatch(saveFilteredPublicHolidays(filteredLeavesHolidays?.publicHolidays));

            const leavesDates = filteredLeavesHolidays?.customLeaves.map((leave) => 
                dayjs(leave.date).format('YYYY-MM-DD')
            );
            
            // debugger;
            const holidaysDates = filteredLeavesHolidays?.publicHolidays.map((holiday) => 
                dayjs(holiday.date).format('YYYY-MM-DD')
            );
            
            // Store the original public holidays to check isWeekend property
            const publicHolidaysMap = new Map();
            publicHolidays.forEach((holiday: any) => {
                const formattedDate = dayjs(holiday.date).format('YYYY-MM-DD');
                publicHolidaysMap.set(formattedDate, holiday);
            });

            // Start checking from yesterday
            let dateToCheck = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            let canCheckIn = false;
            let blockingDate = '';

            // Helper function to check if a date is weekend/holiday/leave
            const isNonWorkingDay = (date: string) => {
                const dayName = dayjs(date).format('dddd').toLowerCase();
                // Fix: workingAndOfDays is an object, not an array - use property access instead of includes
                const isWeekend = workingAndOfDays?.[dayName] === "0";
                const isOffDay = offDaysForTheBranch?.includes(dayName);
                const isHoliday = holidaysDates?.includes(date);
                const isLeave = leavesDates?.includes(date);
                
                // Check if this date is a public holiday with isWeekend=true
                const holidayObj = publicHolidaysMap.get(date);
                const isHolidayMarkedAsWeekend = holidayObj && holidayObj.isWeekend === true;
                let res = isWeekend || isOffDay || isHoliday || isLeave || isHolidayMarkedAsWeekend;
                // debugger;
                return res;
            };

            // Helper function to check attendance status for a date
            const checkAttendanceStatus = async (date: string) => {
                const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, date, date);
                const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, date, date);

                // Check if there's a pending request for this date
                // Expanded status check to include more possible statuses
                const hasPendingRequest = attendanceRequests.some((req: any) => {
                    // Fix: Ensure req.status is a string before calling toLowerCase()
                    // const status = typeof req.status === 'string' ? req.status.toLowerCase() : '';
                    const isPending = Number(req?.status) == Status.ApprovalNeeded;
                    return isPending;
                });

                // Also check if the request has both checkIn and checkOut filled
                const hasCompleteRequest = attendanceRequests.some((req: any) => 
                    Number(req?.status) == Status.Approved && (req.checkIn !== null && req.checkOut !== null)
                );
                let tempObj = {
                    hasAttendanceRecord: empAttendanceStatistics.length > 0,
                    hasCheckIn: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkIn !== null,
                    hasCheckOut: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkOut !== null,
                    hasAttendanceRequest: attendanceRequests.length > 0,
                    hasRequestCheckIn: attendanceRequests.length > 0 && attendanceRequests[0].checkIn !== null,
                    hasRequestCheckOut: attendanceRequests.length > 0 && attendanceRequests[0].checkOut !== null,
                    hasPendingRequest: hasPendingRequest || hasCompleteRequest, // Allow if pending OR complete
                    rawRequests: attendanceRequests // For debugging
                };
                // debugger;
                return {
                    hasAttendanceRecord: empAttendanceStatistics.length > 0,
                    hasCheckIn: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkIn !== null,
                    hasCheckOut: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkOut !== null,
                    hasAttendanceRequest: attendanceRequests.length > 0,
                    hasRequestCheckIn: attendanceRequests.length > 0 && attendanceRequests[0].checkIn !== null,
                    hasRequestCheckOut: attendanceRequests.length > 0 && attendanceRequests[0].checkOut !== null,
                    hasPendingRequest: hasPendingRequest || hasCompleteRequest, // Allow if pending OR complete
                    rawRequests: attendanceRequests // For debugging
                };
            };

            // Check previous days until we find a working day or determine if check-in should be blocked
            /**
             * date = dayJs()-1;
            while (true){
                if (date passed is date of joining of current employee) return false;
                if (checkin and checkout for date) return false;

                if (checkin){
                    do checkout no matter what:
                    // message: you have checked in on date
                    return true;
                }
                else if (checkout){
                    do checkin no matter what:
                    // message: you have checked in on date
                    return true;
                }
                else if (today is holiday/leave/weekend)
                {
                    check for previous day
                    return shouldRaiseRequest(date-1);
                }
                else{
                    return true;
                }
            }
            // fetch attendanceHistory, holidays, weekends, leaves
            * 
            */
            // iterate until you find previous working day with check and checkout marked with attendance
            
            while (true) {

                if (dayjs(dateToCheck).format('YYYY-MM') !== dayjs().format('YYYY-MM')) {
                    canCheckIn = true;
                    blockingDate = "";
                    break;
                }
                
                const attendanceStatus = await checkAttendanceStatus(dateToCheck);
                const isNonWorking = isNonWorkingDay(dateToCheck);
                // debugger;
                if(dayjs(dateToCheck).isSameOrBefore(dayjs(dateOfJoining))){
                    canCheckIn = true;
                    setPreviousWorkingDay("");
                    break;
                }
                if(attendanceStatus?.hasCheckIn && attendanceStatus?.hasCheckOut){
                    canCheckIn = true;
                    setPreviousWorkingDay("");
                    break;
                }
                if(attendanceStatus?.hasRequestCheckIn && attendanceStatus?.hasRequestCheckOut){
                    blockingDate = dateToCheck;
                    canCheckIn = false;
                    dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
                    continue;
                }
                
                if(isNonWorking){
                    if(attendanceStatus?.hasCheckIn || attendanceStatus?.hasRequestCheckIn){
                        canCheckIn = false;
                        blockingDate = dateToCheck;
                        break;
                    }
                    else if(attendanceStatus?.hasCheckOut || attendanceStatus?.hasRequestCheckOut){
                        canCheckIn = false;
                        blockingDate = dateToCheck;
                        break;
                    }
                    else{
                        blockingDate = dateToCheck;
                        canCheckIn = false;
                        dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
                        continue;
                    }
                }

                if(attendanceStatus?.hasCheckIn || attendanceStatus?.hasRequestCheckIn){
                    canCheckIn = false;
                    blockingDate = dateToCheck;
                    break;
                }
                else if(attendanceStatus?.hasCheckOut || attendanceStatus?.hasRequestCheckOut){
                    canCheckIn = false;
                    blockingDate = dateToCheck;
                    break;
                }
                else if(!isNonWorking){
                    canCheckIn = false;
                    blockingDate = dateToCheck;
                    break;
                }

                dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');

                // // Rule 1: Regular Working Day
                // if (!isNonWorking) {
                    
                //     // Rule 1a: Check-in exists but checkout is missing
                //     if (attendanceStatus.hasCheckIn && !attendanceStatus.hasCheckOut) {
                //         // Unless there's already a pending request for this date
                //         if (!attendanceStatus.hasPendingRequest) {
                //             canCheckIn = false;
                //             blockingDate = dateToCheck;
                //             break;
                //         } else {
                //         }
                //     }
                //     // Rule 1b: There's a request with check-in but no checkout
                //     else if (attendanceStatus.hasRequestCheckIn && !attendanceStatus.hasRequestCheckOut) {
                //         // Unless there's already a pending request for this date
                //         if (!attendanceStatus.hasPendingRequest) {
                //             canCheckIn = false;
                //             blockingDate = dateToCheck;
                //             break;
                //         } else {
                //         }
                //     }
                //     // Rule 1c: ABSENT on working day - no attendance record AND no request at all
                //     else if (!attendanceStatus.hasAttendanceRecord && !attendanceStatus.hasAttendanceRequest) {
                //         // User must raise a request for this absent working day
                //         canCheckIn = false;
                //         blockingDate = dateToCheck;
                //         break;
                //     }
                //     // Rule 1d: Working day is complete (has both check-in and check-out)
                //     else if (attendanceStatus.hasCheckIn && attendanceStatus.hasCheckOut) {
                //         break; // This working day is complete, stop checking
                //     }
                //     // Rule 1e: Working day has complete request (both check-in and check-out in request)
                //     else if (attendanceStatus.hasRequestCheckIn && attendanceStatus.hasRequestCheckOut) {
                //         break; // This working day has complete request, stop checking
                //     }
                //     // Rule 1f: Working day has valid pending request covering the absence/incomplete attendance
                //     else if (attendanceStatus.hasPendingRequest) {
                //         break; // This working day has pending request, stop checking
                //     }
                //     // If we reach here, something is wrong - continue to be safe
                //     else {
                //     }
                // }
                // // Rule 2: Weekend / Holiday / Leave Day
                // else {
                //     // If no record at all, continue to next day (no problem)
                //     if (!attendanceStatus.hasAttendanceRecord && !attendanceStatus.hasAttendanceRequest) {
                //         // Continue to previous day - no action needed
                //     }
                //     // If check-in exists but checkout missing on this weekend/holiday/leave day
                //     else if (attendanceStatus.hasCheckIn && !attendanceStatus.hasCheckOut) {
                //         // User must raise a request for THIS specific date (the weekend/holiday/leave day)
                //         // Unless there's already a pending request for this exact date
                //         if (!attendanceStatus.hasPendingRequest) {
                //             canCheckIn = false;
                //             blockingDate = dateToCheck; // This is the weekend/holiday/leave date that needs a request
                //             break;
                //         } else {
                //         }
                //     }
                //     // If there's a request with check-in but no checkout on this weekend/holiday/leave day
                //     else if (attendanceStatus.hasRequestCheckIn && !attendanceStatus.hasRequestCheckOut) {
                //         // User must raise a request for THIS specific date (the weekend/holiday/leave day)
                //         // Unless there's already a pending request for this exact date
                //         if (!attendanceStatus.hasPendingRequest) {
                //             canCheckIn = false;
                //             blockingDate = dateToCheck; // This is the weekend/holiday/leave date that needs a request
                //             break;
                //         } else {
                //         }
                //     }
                // }

                // dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
                
                // Safety check to avoid infinite loop
                // if (dayjs().diff(dayjs(dateToCheck), 'days') > 30) {
                //     break;
                // }
                
            }

            // Set the state based on our analysis
            setPreviousAttendanceMarked(canCheckIn);
            if (!canCheckIn) {
                setPreviousWorkingDay(blockingDate);
            }

            // Check if today is a holiday (for display purposes)
            const today = dayjs().format('YYYY-MM-DD');
            const isTodayHoliday = holidaysDates?.includes(today);
            setTodayLeaveHoliday(!isTodayHoliday);

        } catch (error) {
            console.error('Error checking previous attendance:', error);
            // On error, allow check-in to avoid blocking user unnecessarily
            setPreviousAttendanceMarked(true);
        }
    }

    // // Only run if we have the necessary data
    // if (Object.keys(workingAndOfDays).length === 7 && offDaysForTheBranch.length > 0) {
    // }
    checkPreviousAttendanceAndSetStateNew();

    // Fetch other required data
    fetchAllCompanySettings();
    
    if (locationEnabled) {
        async function fetchAddress() {
            const { data: { address } } = await fetchAddressDetails(latitude, longitude);
            dispatch(saveCurrentAddress(address));
        }
        fetchAddress();
    }

    async function getAllWorkingMethods() {
        const { data: { workingMethods } } = await fetchWorkingMethods();
        dispatch(saveWorkingMethodOptions(workingMethods));
    }
    getAllWorkingMethods();

}, [latitude, longitude, locationEnabled, dispatch, employeeId, offDaysForTheBranch, raiseRequest, workingAndOfDays, dateOfJoining]);

// previous implementation logic: uncomment this if anything breaks..
// useEffect(() => {
//     async function checkPreviousAttendanceAndSetState() {
//         try {
//             const { data: { companyOverview } } = await fetchCompanyOverview();
//             const companyId = companyOverview[0].id;

//             // Get leaves and holidays data
//             const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
//             const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);
            
//             const totalLeaves = await customLeaves(leaves);
//             dispatch(saveLeaves(totalLeaves));
//             dispatch(savePublicHolidays(publicHolidays));

//             const startDate = dayjs().startOf('year').format('YYYY-MM-DD');
//             const endDate = dayjs().endOf('year').format('YYYY-MM-DD');
//             const filteredLeavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true, false, true);
            
//             dispatch(saveFilteredLeaves(filteredLeavesHolidays?.customLeaves));
//             dispatch(saveFilteredPublicHolidays(filteredLeavesHolidays?.publicHolidays));

//             const leavesDates = filteredLeavesHolidays?.customLeaves.map((leave) => 
//                 dayjs(leave.date).format('YYYY-MM-DD')
//             );
            
//             const holidaysDates = filteredLeavesHolidays?.publicHolidays.map((holiday) => 
//                 dayjs(holiday.date).format('YYYY-MM-DD')
//             );
            
//             // Store the original public holidays to check isWeekend property
//             const publicHolidaysMap = new Map();
//             publicHolidays.forEach((holiday: any) => {
//                 const formattedDate = dayjs(holiday.date).format('YYYY-MM-DD');
//                 publicHolidaysMap.set(formattedDate, holiday);
//             });

//             // Start checking from yesterday
//             let dateToCheck = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
//             let canCheckIn = true;
//             let blockingDate = '';

//             // Helper function to check if a date is weekend/holiday/leave
//             const isNonWorkingDay = (date: string) => {
//                 const dayName = dayjs(date).format('dddd').toLowerCase();
//                 // Fix: workingAndOfDays is an object, not an array - use property access instead of includes
//                 const isWeekend = workingAndOfDays?.[dayName] === "0";
//                 const isOffDay = offDaysForTheBranch?.includes(dayName);
//                 const isHoliday = holidaysDates?.includes(date);
//                 const isLeave = leavesDates?.includes(date);
                
//                 // Check if this date is a public holiday with isWeekend=true
//                 const holidayObj = publicHolidaysMap.get(date);
//                 const isHolidayMarkedAsWeekend = holidayObj && holidayObj.isWeekend === true;
                
//                 return isWeekend || isOffDay || isHoliday || isLeave || isHolidayMarkedAsWeekend;
//             };

//             // Helper function to check attendance status for a date
//             const checkAttendanceStatus = async (date: string) => {
//                 const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, date, date);
//                 const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, date, date);
                
//                 // Debug logging
                
//                 // Check if there's a pending request for this date
//                 // Expanded status check to include more possible statuses
//                 const hasPendingRequest = attendanceRequests.some((req: any) => {
//                     // Fix: Ensure req.status is a string before calling toLowerCase()
//                     const status = typeof req.status === 'string' ? req.status.toLowerCase() : '';
//                     const isPending = ['pending', 'submitted', 'in_review', 'approved', 'processing'].includes(status);
//                     return isPending;
//                 });

//                 // Also check if the request has both checkIn and checkOut filled
//                 const hasCompleteRequest = attendanceRequests.some((req: any) => 
//                     req.checkIn !== null && req.checkOut !== null
//                 );


//                 return {
//                     hasAttendanceRecord: empAttendanceStatistics.length > 0,
//                     hasCheckIn: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkIn !== null,
//                     hasCheckOut: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkOut !== null,
//                     hasAttendanceRequest: attendanceRequests.length > 0,
//                     hasRequestCheckIn: attendanceRequests.length > 0 && attendanceRequests[0].checkIn !== null,
//                     hasRequestCheckOut: attendanceRequests.length > 0 && attendanceRequests[0].checkOut !== null,
//                     hasPendingRequest: hasPendingRequest || hasCompleteRequest, // Allow if pending OR complete
//                     rawRequests: attendanceRequests // For debugging
//                 };
//             };

//             // Check previous days until we find a working day or determine if check-in should be blocked
//             while (true) {
                
//                 const attendanceStatus = await checkAttendanceStatus(dateToCheck);
//                 const isNonWorking = isNonWorkingDay(dateToCheck);

 
//                 // Rule 1: Regular Working Day
//                 if (!isNonWorking) {
                    
//                     // Rule 1a: Check-in exists but checkout is missing
//                     if (attendanceStatus.hasCheckIn && !attendanceStatus.hasCheckOut) {
//                         // Unless there's already a pending request for this date
//                         if (!attendanceStatus.hasPendingRequest) {
//                             canCheckIn = false;
//                             blockingDate = dateToCheck;
//                             break;
//                         } else {
//                             console.log('Pending request found, allowing check-in');
//                         }
//                     }
//                     // Rule 1b: There's a request with check-in but no checkout
//                     else if (attendanceStatus.hasRequestCheckIn && !attendanceStatus.hasRequestCheckOut) {
//                         console.log('Found incomplete request on working day');
//                         // Unless there's already a pending request for this date
//                         if (!attendanceStatus.hasPendingRequest) {
//                             console.log('No pending request found, blocking check-in');
//                             canCheckIn = false;
//                             blockingDate = dateToCheck;
//                             break;
//                         } else {
//                             console.log('Pending request found, allowing check-in');
//                         }
//                     }
//                     // Rule 1c: ABSENT on working day - no attendance record AND no request at all
//                     else if (!attendanceStatus.hasAttendanceRecord && !attendanceStatus.hasAttendanceRequest) {
//                         console.log('User was ABSENT on working day - no record at all');
//                         // User must raise a request for this absent working day
//                         console.log('No request found for absent working day, blocking check-in');
//                         canCheckIn = false;
//                         blockingDate = dateToCheck;
//                         break;
//                     }
//                     // Rule 1d: Working day is complete (has both check-in and check-out)
//                     else if (attendanceStatus.hasCheckIn && attendanceStatus.hasCheckOut) {
//                         console.log('Working day is complete, stopping check');
//                         break; // This working day is complete, stop checking
//                     }
//                     // Rule 1e: Working day has complete request (both check-in and check-out in request)
//                     else if (attendanceStatus.hasRequestCheckIn && attendanceStatus.hasRequestCheckOut) {
//                         console.log('Working day has complete request, stopping check');
//                         break; // This working day has complete request, stop checking
//                     }
//                     // Rule 1f: Working day has valid pending request covering the absence/incomplete attendance
//                     else if (attendanceStatus.hasPendingRequest) {
//                         console.log('Working day has pending request, stopping check');
//                         break; // This working day has pending request, stop checking
//                     }
//                     // If we reach here, something is wrong - continue to be safe
//                     else {
//                         console.log('Unexpected working day state, continuing check');
//                     }
//                 }
//                 // Rule 2: Weekend / Holiday / Leave Day
//                 else {
//                     console.log(`Processing non-working day: ${dateToCheck}`);
//                     // If no record at all, continue to next day (no problem)
//                     if (!attendanceStatus.hasAttendanceRecord && !attendanceStatus.hasAttendanceRequest) {
//                         console.log('No record found, continuing to previous day');
//                         // Continue to previous day - no action needed
//                     }
//                     // If check-in exists but checkout missing on this weekend/holiday/leave day
//                     else if (attendanceStatus.hasCheckIn && !attendanceStatus.hasCheckOut) {
//                         console.log('Found incomplete check-in on non-working day');
//                         // User must raise a request for THIS specific date (the weekend/holiday/leave day)
//                         // Unless there's already a pending request for this exact date
//                         if (!attendanceStatus.hasPendingRequest) {
//                             console.log('No pending request found for non-working day, blocking check-in');
//                             canCheckIn = false;
//                             blockingDate = dateToCheck; // This is the weekend/holiday/leave date that needs a request
//                             break;
//                         } else {
//                             console.log('Pending request found for non-working day, allowing check-in');
//                         }
//                     }
//                     // If there's a request with check-in but no checkout on this weekend/holiday/leave day
//                     else if (attendanceStatus.hasRequestCheckIn && !attendanceStatus.hasRequestCheckOut) {
//                         console.log('Found incomplete request on non-working day');
//                         // User must raise a request for THIS specific date (the weekend/holiday/leave day)
//                         // Unless there's already a pending request for this exact date
//                         if (!attendanceStatus.hasPendingRequest) {
//                             console.log('No pending request found for incomplete request on non-working day, blocking check-in');
//                             canCheckIn = false;
//                             blockingDate = dateToCheck; // This is the weekend/holiday/leave date that needs a request
//                             break;
//                         } else {
//                             console.log('Pending request found for incomplete request on non-working day, allowing check-in');
//                         }
//                     }
//                 }

//                 // Move to previous day (limit to reasonable range, e.g., 30 days)
//                 dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
                
//                 // Safety check to avoid infinite loop
//                 if (dayjs().diff(dayjs(dateToCheck), 'days') > 30) {
//                     break;
//                 }
//             }

//             // Set the state based on our analysis
//             console.log(`Final result: canCheckIn=${canCheckIn}, blockingDate=${blockingDate}`);
//             setPreviousAttendanceMarked(canCheckIn);
//             if (!canCheckIn) {
//                 setPreviousWorkingDay(blockingDate);
//             }

//             // Check if today is a holiday (for display purposes)
//             const today = dayjs().format('YYYY-MM-DD');
//             const isTodayHoliday = holidaysDates?.includes(today);
//             setTodayLeaveHoliday(!isTodayHoliday);

//         } catch (error) {
//             console.error('Error checking previous attendance:', error);
//             // On error, allow check-in to avoid blocking user unnecessarily
//             setPreviousAttendanceMarked(true);
//         }
//     }

//     // Only run if we have the necessary data
//     if (Object.keys(workingAndOfDays).length === 7 && offDaysForTheBranch.length > 0) {
//         checkPreviousAttendanceAndSetState();
//     }

//     // Fetch other required data
//     fetchAllCompanySettings();
    
//     if (locationEnabled) {
//         async function fetchAddress() {
//             const { data: { address } } = await fetchAddressDetails(latitude, longitude);
//             dispatch(saveCurrentAddress(address));
//         }
//         fetchAddress();
//     }

//     async function getAllWorkingMethods() {
//         const { data: { workingMethods } } = await fetchWorkingMethods();
//         dispatch(saveWorkingMethodOptions(workingMethods));
//     }
//     getAllWorkingMethods();

// }, [latitude, longitude, locationEnabled, dispatch, employeeId, offDaysForTheBranch, raiseRequest, workingAndOfDays]);

// Helper function to get user-friendly message about why check-in is blocked

const getBlockingMessage = async () => {
    if (!previousAttendanceMarked && previousWorkingDay) {
        const dayName = dayjs(previousWorkingDay).format('dddd').toLowerCase();
        const isWeekend = ['saturday', 'sunday'].includes(dayName);
        const isOffDay = offDaysForTheBranch?.includes(dayName);
        
        // Check if it's a holiday or leave day (you'll need to pass these arrays to this function)
        // const isHoliday = holidaysDates?.includes(previousWorkingDay);
        // const isLeave = leavesDates?.includes(previousWorkingDay);
        
        const isNonWorkingDay = isWeekend || isOffDay; // || isHoliday || isLeave;
        
        // Check what type of issue we have
        const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, previousWorkingDay, previousWorkingDay);
        const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, previousWorkingDay, previousWorkingDay);
        
        const hasAttendanceRecord = empAttendanceStatistics.length > 0;
        const hasAttendanceRequest = attendanceRequests.length > 0;
        const hasCheckIn = hasAttendanceRecord && empAttendanceStatistics[0].checkIn !== null;
        const hasCheckOut = hasAttendanceRecord && empAttendanceStatistics[0].checkOut !== null;
        
        if (isNonWorkingDay) {
            return `You have an incomplete check-in on ${dayjs(previousWorkingDay).format("DD-MM-YYYY")} (${dayjs(previousWorkingDay).format("dddd")}). Please raise an attendance request for this specific date including check-out before marking today's attendance.`;
        } else {
            // Working day scenarios
            if (!hasAttendanceRecord && !hasAttendanceRequest) {
                // Absent on working day
                return `You were absent on ${dayjs(previousWorkingDay).format("DD-MM-YYYY")} (${dayjs(previousWorkingDay).format("dddd")}). Please raise an attendance request for this working day before marking today's attendance.`;
            } else if (hasCheckIn && !hasCheckOut) {
                // Incomplete checkout on working day
                return `You have incomplete checkout for ${dayjs(previousWorkingDay).format("DD-MM-YYYY")} (working day). Please complete checkout or raise an attendance request including check-out.`;
            } else {
                // Generic working day issue
                return `Please resolve attendance for ${dayjs(previousWorkingDay).format("DD-MM-YYYY")} (working day) by raising an attendance request.`;
            }
        }
    }
    return '';
};
    const fetchAttendanceData = useCallback(async () => {
        if(!employeeId) return;
        const { data : { attendance } } = await getAllAttendanceRequestById(employeeId);
        if(attendance?.length === 0){
            setLengthOfAttendanceHistory(0);
        }else if(attendance?.length === 1){
            if(!attendance[0]?.checkOut && attendance[0]?.checkIn){
                const formattedDateFromHistory = dayjs(attendance[0]?.date).format('YYYY-MM-DD');                    
                const formattedDateToday = dayjs().format('YYYY-MM-DD');           
                if(formattedDateFromHistory === formattedDateToday){
                    setLengthOfAttendanceHistory(0);
                }
            }
        }
    }, [employeeId]);

    // Rerun this useEffect when user raises a request, to update the attendance history, using eventBus
    useEventBus(EVENT_KEYS.userRaisedRequestSubmitted, () => {
        setRaiseRequest(true);
    });
    
    useEffect(()=>{
        if(raiseRequest){
            fetchAttendanceData();
            setRaiseRequest(false);
        }
    },[raiseRequest]);



    useEffect(()=>{
        dispatch(fetchAppSettings() as any)
    },[])

    const [notificationToggle, setNotificationToggle] = useState(false);
    const handleNotification = () => {
      setNotificationToggle(prev => !prev);
    };

    // checkin checkout for today
    useEffect(()=>{
        const fetchData = async () => {
            const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD'));
            if(empAttendanceStatistics.length > 0){
                setHasCheckin(empAttendanceStatistics[0].checkIn);
            }
        }
        fetchData();
    },[employeeId])


    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position: any) => {
                const { coords: { latitude, longitude } } = position;
                dispatch(saveCoordinates({ latitude, longitude }));
                dispatch(toggleLocationPermission(true));
            },()=>{
                console.warn('Error in fetching location from OverviewView.tsx: Unable to retrieve your location')
            },{ 
                enableHighAccuracy: true,
            });
        } else {
            dispatch(toggleLocationPermission(false));
        }
    }, []);
    
    //  thisisforattendance

    return (
        <div className={isDashboard ? "d-flex flex-column h-100" : "mb-10 "}>
            {isDashboard ? (
                <span>

                <h5
                    className="fw-semibold mb-2"
                    style={{ fontSize: 'clamp(15px, 3.5vw, 18px)', fontFamily: 'Barlow', lineHeight: '1.3' }}
                >
                    Hello {userName}, mark attendance for today, {formattedDate}
                </h5>
                </span>
            ) : (
                <>
                    <h4 className="text-uppercase text-black-50 mb-4 fs-3">Hello, {userName}!</h4>
                    <h3 className="fw-bold fs-2 mb-4 font-barlow">Mark attendance for today, {formattedDate}</h3>
                </>
            )}

            <div>
                {(() => {
                    // 1. Disallow desktop/laptop check-in
                    if (!isDeviceNotDesktop) {
                        return (
                            <div
                                className="alert"
                                role="alert"
                                style={{
                                    backgroundColor: "#FCEDDF",
                                    color: "#DD700C",
                                    borderColor: "#DD700C",
                                    ...(isDashboard && { fontSize: 'clamp(11px, 2.5vw, 13px)' })
                                }}
                            >
                                Check-in from Desktop/Laptop is not allowed.
                            </div>
                        );
                    }

                    // 2. Prompt to enable location
                    if (!(latitudeNew && longitudeNew)) {
                        return (
                            <div
                                className="alert"
                                role="alert"
                                style={{
                                    backgroundColor: "#FCEDDF",
                                    color: "#DD700C",
                                    borderColor: "#DD700C",
                                    ...(isDashboard && { fontSize: 'clamp(11px, 2.5vw, 13px)' })
                                }}
                            >
                                Please enable your location to mark attendance.
                            </div>
                        );
                    }

                    // 3. Prompt to raise a request for previous day's missing check-out
                    if (!previousAttendanceMarked && previousWorkingDay) {
                        return (
                            <div
                                className="alert"
                                role="alert"
                                style={{
                                    backgroundColor: "#FCEDDF",
                                    color: "#DD700C",
                                    borderColor: "#DD700C",
                                    ...(isDashboard && { fontSize: 'clamp(11px, 2.5vw, 13px)' })
                                }}
                            >
                                Please raise an attendance request for the previous day{" "}
                                {previousWorkingDay && `(${dayjs(previousWorkingDay).format("DD-MM-YYYY")})`} including check out.
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>


            <div className={isDashboard ? "py-1 rounded-3 mb-2" : "py-1 rounded-3 mb-4"}>
                <button
                    className={`d-flex justify-content-between align-items-center bg-primary btn btn-primary w-100 ${isDashboard ? 'fs-6' : 'btn-lg fs-5'}`}
                    onClick={handleCheckClick}
                    disabled={isLocationLoading || !(((latitudeNew && longitudeNew)) && isDeviceNotDesktop) || (!previousAttendanceMarked && lengthOfAttendanceHistory > 0 && !isFirstDay)}
                    >
                    <div className="d-flex justify-content-center">
                        <Timer />
                    </div>
                        <div className="d-flex align-items-center gap-2">
                            {hasCheckin && hasCheckin !== null && hasCheckin !== "" ? "Mark Checkout" : "Mark Attendance"}
                            {isLocationLoading && (
                                <span className='spinner-border spinner-border-sm' role='status' aria-hidden='true'></span>
                            )}
                        </div>
                </button>
            </div>

            {/* <LeaveOverview /> */}
            <div className={isDashboard ? "flex-grow-1" : ""}>
                <AttendanceOverview notificationToggle={notificationToggle} dashboard={!isDashboard} />
            </div>

            <Modal show={show} onHide={handleClose} centered className='rounded-3 attendance-modal'>
                <Modal.Header closeButton></Modal.Header>
                <Modal.Body>
                    <div className="row">
                        <div className="col-lg-4">
                            <GoogleMaps />
                        </div>
                        <div className="col-lg-8">
                            <h3>Select {btnText.toLowerCase()} location:</h3>
                            <WorkingMethodOptions sendNotification={handleNotification}/>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default MarkAttendance;