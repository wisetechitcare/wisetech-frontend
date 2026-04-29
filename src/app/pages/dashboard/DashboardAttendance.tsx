import { KTCard, KTCardBody, KTIcon } from "@metronic/helpers";
import eventBus from "@utils/EventBus";
import { RootState, store } from "@redux/store";
import { formatDate } from "@utils/date";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Modal } from "react-bootstrap";
import GoogleMaps from '@pages/employee/attendance/personal/views/overview/GoogleMaps';
import { saveCoordinates, saveCurrentAddress, saveWorkingMethodOptions, toggleLocationPermission, toggleOpenModal } from "@redux/slices/attendance";
import { fetchAddressDetails } from "@services/location";
import Timer from "@pages/employee/attendance/personal/views/overview/Timer";
import { fetchWorkingMethods } from "@services/options";
import LeaveOverview from "@pages/employee/attendance/personal/views/overview/LeaveOverview";
import WorkingMethodOptions from "@pages/employee/attendance/personal/views/overview/WorkingMethodOptions";
import dayjs from "dayjs";
import { fetchEmpAttendanceStatistics, fetchEmployeeLeaves, getAllAttendanceRequestById, getAllKpiFactors, getAttendanceRequest } from "@services/employee";
import { fetchAllPublicHolidays, fetchCompanyOverview } from "@services/company";
import { customLeaves, fetchAllCompanySettings, filterLeavesPublicHolidays } from "@utils/statistics";
import { saveFilteredLeaves, saveFilteredPublicHolidays, saveLeaves, savePublicHolidays } from "@redux/slices/attendanceStats";
import { UAParser } from 'ua-parser-js';
import AttendanceOverview from "@pages/employee/attendance/personal/views/overview/AttendanceOverview";
import { fetchAppSettings } from "@redux/slices/appSettings";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { Status } from "@constants/statistics";
import { useNavigate } from "react-router-dom";
import MarkAttendance from "@pages/employee/attendance/personal/views/overview/MarkAttendance";

function DashboardAttendance() {
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
    const [checkInTime, setCheckInTime] = useState('');
    const [checkOutTime, setCheckOutTime] = useState('');
    const [workingMethod, setWorkingMethod] = useState('');
    const [raiseRequest, setRaiseRequest] = useState(false);
    const DateOfJoining = useSelector((state:RootState)=> state?.employee?.currentEmployee?.dateOfJoining);
    const isFirstDay = dayjs().format('YYYY-MM-DD') === dayjs(DateOfJoining).format('YYYY-MM-DD');

    const navigate = useNavigate();

    const handleCheckClick = () => {
        dispatch(toggleOpenModal(true));
    }

    const handleClose = () => {
        dispatch(toggleOpenModal(false));
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
        navigator.geolocation.getCurrentPosition((position) => {
            setLatitudeNew(position?.coords?.latitude);

            setLongitudeNew(position?.coords?.longitude);
            if(position?.coords?.latitude && position?.coords?.longitude){
                dispatch(saveCoordinates({ latitude: position?.coords?.latitude, longitude: position?.coords?.longitude }));
            }
        }, (error) => {
            // console.log("error:: ", error);
        }, { enableHighAccuracy: true } );
    }, [dispatch]);

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
                const isWeekend = workingAndOfDays?.[dayName] === "0";
                const isOffDay = offDaysForTheBranch?.includes(dayName);
                const isHoliday = holidaysDates?.includes(date);
                const isLeave = leavesDates?.includes(date);

                // Check if this date is a public holiday with isWeekend=true
                const holidayObj = publicHolidaysMap.get(date);
                const isHolidayMarkedAsWeekend = holidayObj && holidayObj.isWeekend === true;

                return isWeekend || isOffDay || isHoliday || isLeave || isHolidayMarkedAsWeekend;
            };

            // Helper function to check attendance status for a date
            const checkAttendanceStatus = async (date: string) => {
                const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, date, date);
                const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, date, date);



                // Check if there's a pending request for this date
                const hasPendingRequest = attendanceRequests.some((req: any) => {
                    const isPending = Number(req?.status) == Status.ApprovalNeeded;
                    return isPending;
                });

                // Also check if the request has both checkIn and checkOut filled
                const hasCompleteRequest = attendanceRequests.some((req: any) =>
                    Number(req?.status) == Status.Approved && (req.checkIn !== null && req.checkOut !== null)
                );


                return {
                    hasAttendanceRecord: empAttendanceStatistics.length > 0,
                    hasCheckIn: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkIn !== null,
                    hasCheckOut: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkOut !== null,
                    hasAttendanceRequest: attendanceRequests.length > 0,
                    hasRequestCheckIn: attendanceRequests.length > 0 && attendanceRequests[0].checkIn !== null,
                    hasRequestCheckOut: attendanceRequests.length > 0 && attendanceRequests[0].checkOut !== null,
                    hasPendingRequest: hasPendingRequest || hasCompleteRequest,
                    rawRequests: attendanceRequests
                };
            };

            while (true) {

                if (dayjs(dateToCheck).format('YYYY-MM') !== dayjs().format('YYYY-MM')) {
                    canCheckIn = true;
                    blockingDate = "";
                    break;
                }

                const attendanceStatus = await checkAttendanceStatus(dateToCheck);
                const isNonWorking = isNonWorkingDay(dateToCheck);

                if(dayjs(dateToCheck).isSameOrBefore(dayjs(dateOfJoining))){
                    canCheckIn = true;
                    break;
                }
                if(attendanceStatus?.hasCheckIn && attendanceStatus?.hasCheckOut){
                    canCheckIn = true;
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

                // Safety check to avoid infinite loop
                if (dayjs().diff(dayjs(dateToCheck), 'days') > 30) {
                    break;
                }
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
                setCheckInTime(empAttendanceStatistics[0].checkIn ? dayjs(empAttendanceStatistics[0].checkIn).format('h:mm A') : '');
                setCheckOutTime(empAttendanceStatistics[0].checkOut ? dayjs(empAttendanceStatistics[0].checkOut).format('h:mm A') : '');
                setWorkingMethod(empAttendanceStatistics[0].workingMethod || '');
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


    return (
        <>
          <div className="h-100">
                <MarkAttendance variant="dashboard" />
          </div>
        </>
    );

    // return (
    //     <>
    //       <div 
    //     //   className="py-2 py-md-3"
    //       >
    //         <div className="mb-3 mb-md-4">
    //           <h6 className="fw-semibold mb-3 mb-md-4" style={{
    //             fontFamily: 'Barlow',
    //             fontSize: 'clamp(16px, 4vw, 20px)',
    //             letterSpacing: '0.2px',
    //             lineHeight: '1.3'
    //           }}>
    //             Hello {userName}, Mark your attendance for {formattedDate}
    //           </h6>
    //           <p style={{
    //                           fontSize: 'clamp(11px, 2.3vw, 12px)',
    //                           fontWeight: '400',
    //                           color: '#DD700C',
    //                           fontFamily: 'Inter',
    //                           margin: 0,
    //                           marginBottom: '8px'
    //                         }}>
    //                             Check-in from Desktop/Laptop is not allowed.
    //                         </p>
    //           <button
    //             className="btn w-100 text-white d-flex align-items-center justify-content-between"
    //             style={{
    //               backgroundColor: '#9d4141',
    //               border: '1px solid rgba(255, 255, 255, 0.44)',
    //               borderRadius: '6px',
    //               height: '40px',
    //               fontSize: 'clamp(12px, 2.5vw, 13px)',
    //               fontWeight: '500',
    //               fontFamily: 'Inter',
    //               padding: '0 12px'
    //             }}
    //             onClick={handleCheckClick}
    //             disabled={!(((latitudeNew && longitudeNew)) && isDeviceNotDesktop) || (!previousAttendanceMarked && lengthOfAttendanceHistory > 0 && !isFirstDay)}
    //           >
    //             <div className="d-flex align-items-center gap-2">
    //               <Timer />
    //             </div>
    //             <span>{hasCheckin && hasCheckin !== null || hasCheckin !== "" ? "Check-out" : "Check-in"}</span>
    //           </button>
    //         </div>

    //         {/* Alert Messages */}
    //         <div className="mb-3">
    //             {(() => {
    //                 // 1. Disallow desktop/laptop check-in
    //                 if (!isDeviceNotDesktop) {
    //                     return (
    //                         <>
    //                         {/* <p style={{
    //                           fontSize: 'clamp(11px, 2.3vw, 12px)',
    //                           fontWeight: '400',
    //                           color: '#DD700C',
    //                           fontFamily: 'Inter',
    //                           margin: 0,
    //                         }}>
    //                             Check-in from Desktop/Laptop is not allowed.
    //                         </p> */}
    //                         </>
    //                     );
    //                 }

    //                 // 2. Prompt to enable location
    //                 if (!(latitudeNew && longitudeNew)) {
    //                     return (
    //                         <p style={{
    //                           fontSize: 'clamp(11px, 2.3vw, 12px)',
    //                           fontWeight: '400',
    //                           color: '#DD700C',
    //                           fontFamily: 'Inter',
    //                           margin: 0
    //                         }}>
    //                             Please enable your location to mark attendance.
    //                         </p>
    //                     );
    //                 }

    //                 // 3. Prompt to raise a request for previous day's missing check-out
    //                 if (!previousAttendanceMarked && previousWorkingDay) {
    //                     return (
    //                         <p style={{
    //                           fontSize: 'clamp(11px, 2.3vw, 12px)',
    //                           fontWeight: '400',
    //                           color: '#DD700C',
    //                           fontFamily: 'Inter',
    //                           margin: 0
    //                         }}>
    //                             Please raise an attendance request for the previous day{" "}
    //                             {previousWorkingDay && `(${dayjs(previousWorkingDay).format("DD-MM-YYYY")})`} including check out.
    //                         </p>
    //                     );
    //                 }

    //                 // 4. Show working method message if checked in
    //                 // if (hasCheckin && workingMethod) {
    //                 //     return (
    //                 //         <p style={{
    //                 //           fontSize: 'clamp(12px, 2.5vw, 13px)',
    //                 //           fontWeight: '500',
    //                 //           color: '#94a4bb',
    //                 //           fontFamily: 'Inter',
    //                 //           margin: 0
    //                 //         }}>
    //                 //             You have checked in at {workingMethod}.
    //                 //         </p>
    //                 //     );
    //                 // }
    //                 return null;
    //             })()}
    //         </div>
    //       </div>

    //       {/* Check-in and Check-out Times */}
    //       {/* {(checkInTime || checkOutTime) && (
    //         <div className="d-flex flex-column gap-2 mb-4">
    //           {checkInTime && (
    //             <div className="d-flex align-items-center justify-content-between">
    //               <span style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', fontWeight: '500', fontFamily: 'Inter' }}>
    //                 Check in
    //               </span>
    //               <span style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', fontFamily: 'Inter' }}>
    //                 {checkInTime}
    //               </span>
    //             </div>
    //           )}
    //           {checkOutTime && (
    //             <div className="d-flex align-items-center justify-content-between">
    //               <span style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', fontWeight: '500', fontFamily: 'Inter' }}>
    //                 Check Out
    //               </span>
    //               <span style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', fontFamily: 'Inter' }}>
    //                 {checkOutTime}
    //               </span>
    //             </div>
    //           )}
    //         </div>
    //       )} */}

    //       <AttendanceOverview notificationToggle={notificationToggle} dashboard={false} />

    //       <Modal show={show} onHide={handleClose} centered className='rounded-3 attendance-modal'>
    //           <Modal.Header closeButton></Modal.Header>
    //           <Modal.Body>
    //               <div className="row">
    //                   <div className="col-lg-4">
    //                       <GoogleMaps />
    //                   </div>
    //                   <div className="col-lg-8">
    //                       <h3>Select {btnText.toLowerCase()} location:</h3>
    //                       <WorkingMethodOptions sendNotification={handleNotification}/>
    //                   </div>
    //               </div>
    //           </Modal.Body>
    //       </Modal>
    //     </>
    // );
}

export default DashboardAttendance;
