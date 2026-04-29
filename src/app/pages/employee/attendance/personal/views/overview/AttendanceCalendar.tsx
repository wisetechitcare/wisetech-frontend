import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Calendar from "react-calendar";
import { convertToTimeZone, findTimeDifference, formatTime, generateDatesForMonth, isDateBeforeOrSameAsCurrDate } from "@utils/date";
import { ATTENDANCE_STATUS } from "@constants/attendance";
import { useDispatch, useSelector } from "react-redux";
import { trackMonthChange } from "@redux/slices/attendance";
import { fetchAttendanceDetails, createUpdateAttendanceRequest, getAttendanceRequest } from "@services/employee";
import { RootState } from "@redux/store";
import { IAttendance } from "@models/employee";
import { checkIfAnyValueIsUndefined, fetchColorAndStoreInSlice } from "@utils/file";
import Modal from "react-bootstrap/Modal";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import TextInput from "@app/modules/common/inputs/TextInput";
import TimePickerInput from "@app/modules/common/inputs/TimeInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { handleSendEmailForResetAttendanceRequestLimit, isValidTime } from '@utils/statistics';
import { fetchCompanyOverview, fetchHolidays, fetchAllPublicHolidays } from "@services/company";
import { fetchWorkingMethods } from "@services/options";
import { fetchEmployeeLeaves } from "@services/employee";
import { getDynamicRolesObject, getDynamicUserRolesObject } from "@utils/dynamicRoles";
import { hasPermission } from "@utils/authAbac";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { permissionConstToUseWithHasPermission, REQUEST_RAISE_DISABLE_MESSAGE, resourceNameMapWithCamelCase } from "@constants/statistics";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { UAParser } from 'ua-parser-js';
import { Form as BootstrapForm } from "react-bootstrap";
import { RESTRICT_ATTENDANCE_TO_7_DAYS_KEY } from "@constants/configurations-key";
import { fetchConfiguration } from "@services/company";
import { setFeatureConfiguration } from "@redux/slices/featureConfiguration";
import { filter, has } from "lodash";
import RaiseRequestForEmployee from "./RaiseRequestForEmployee";
import { validatePreviousDaysAttendance } from "@utils/attendanceValidation";

interface Cell {
    date: string;
    status: string;
}

interface AttendanceCalendarProps {
    calendarCells: Cell[];
    activeStartDate: Date;
    setActiveStartDate: (date: Date) => void;
}

const initialState = {
    id: "",
    checkIn: "",
    checkOut: "",
    remarks: "",
    workingMethodId: "",
};

interface FormValues {
    id: string;
    checkIn: string;
    checkOut: string;
    remarks: string;
    workingMethodId: string;
}

const faqSchema = Yup.object().shape({
    checkIn: Yup.string()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in 24h format HH:mm"),
    checkOut: Yup.string()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in 24h format HH:mm"),
    remarks: Yup.string().required("Remarks are required"),
    workingMethodId: Yup.string().required("Working Method is required"),
});


const mumbaiTz = 'Asia/Kolkata';

function AttendanceCalendar({ calendarCells, activeStartDate, setActiveStartDate }: AttendanceCalendarProps) {

    const dispatch = useDispatch();
    let values = useSelector((state: RootState) => state?.customColors?.attendanceCalendar);
    let holidayColorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);

    const getEmployeeAttendance = useSelector((state: RootState) => state.attendance?.personalAttendance);
    const dateOfjoining = useSelector((state: RootState) => state?.employee?.currentEmployee?.dateOfJoining);

    // Added state for modal and form
    const [show, setShow] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [isIOSMobile, setIsIOSMobile] = useState<boolean>(false);
    const [limitMessage, setlimitMessage] = useState(false);
    const [attendanceData, setAttendanceData] = useState<Record<string, FormValues>>({});
    const [requestType, setRequestType] = useState<'checkin' | 'checkout' | null>(null);
    const [showRequestTypeSelection, setShowRequestTypeSelection] = useState(false);
    const [hasCheckInData, setHasCheckInData] = useState(false);
    const [showAdminRequestModal, setShowAdminRequestModal] = useState(false);
    const [workingMethodOptions, setWorkingMethodOptions] = useState([
        { label: "Hybrid" },
        { label: "Office" },
        { label: "On-site" }
    ]);
    const [restrictionDays, setRestrictionDays] = useState<number>(1);
    // const [holidays, setHolidays] = useState<any[]>([]);
    const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);

    // Validation state for previous days attendance check
    const [canSubmitRequest, setCanSubmitRequest] = useState(true);
    const [validationBlockingDate, setValidationBlockingDate] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    // Loading states for data fetching
    const [isLoadingRestrictionData, setIsLoadingRestrictionData] = useState(false);
    const [restrictionDataLoaded, setRestrictionDataLoaded] = useState(false);

    // Get featureConfiguration from Redux to check if restriction is enabled
    const featureConfig = useSelector((state: RootState) => state.featureConfiguration);

    // Fetch colors from API on component mount to ensure we have the latest colors
    useEffect(() => {
        const loadColors = async () => {
            try {
                await fetchColorAndStoreInSlice();
            } catch (error) {
                console.error('Error loading colors:', error);
            }
        };
        loadColors();
    }, []);

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
    }, [])

    // Update CSS custom properties whenever color values change
    useEffect(() => {
        if (values?.todayColor) {
            document.documentElement.style.setProperty("--react-calendar-today-color", values?.todayColor);
        }
        if (values?.presentColor) {
            document.documentElement.style.setProperty("--present", values?.presentColor);
        }
        if (values?.presentColor) {
            document.documentElement.style.setProperty("--check-in-out-missing", values?.presentColor);
        }
        if (values?.absentColor) {
            document.documentElement.style.setProperty("--absent", values?.absentColor);
        }
        if (values?.onLeaveColor) {
            document.documentElement.style.setProperty("--leave", values?.onLeaveColor);
        }
        if (values?.weekendColor) {
            document.documentElement.style.setProperty("--weekend", values?.weekendColor);
        }
        if (values?.workingWeekendColor) {
            document.documentElement.style.setProperty("--working-weekend", values?.workingWeekendColor);
        }
        if (values?.markedPresentViaRequestRaisedColor) {
            document.documentElement.style.setProperty("--attendance-present-with-request-approved", values?.markedPresentViaRequestRaisedColor);
        }
        if (holidayColorValues?.holidayColor) {
            document.documentElement.style.setProperty("--holiday", holidayColorValues?.holidayColor);
        }
    }, [values, holidayColorValues]);

    // Function to fetch all required data for date restriction
    const fetchRestrictionData = async () => {
        if (!employeeId) return;

        setIsLoadingRestrictionData(true);

        try {
            // Get company info first
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0]?.id;
            const observedIn = 'India'; // Default to India
            if (!companyId) {
                console.error('Company ID not found');
                return;
            }

            // Fetch all data in parallel for better performance
            const [holidaysResponse, publicHolidaysResponse, leavesResponse] = await Promise.all([
                fetchHolidays(companyId).catch(error => {
                    console.error('Error fetching holidays:', error);
                    return { data: { holidays: [] } };
                }),
                fetchAllPublicHolidays(observedIn, companyId).catch(error => {
                    console.error('Error fetching public holidays:', error);
                    return { data: { publicHolidays: [] } };
                }),
                fetchEmployeeLeaves(employeeId).catch(error => {
                    console.error('Error fetching employee leaves:', error);
                    return { data: { leaves: [] } };
                })
            ]);

            // Set the fetched data
            // setHolidays(holidaysResponse?.data?.holidays || []);
            const filteredPublicHolidays = publicHolidaysResponse?.data?.publicHolidays?.length ? publicHolidaysResponse?.data?.publicHolidays.filter((holiday: any) => holiday?.isActive) : [];
            setPublicHolidays(filteredPublicHolidays || []);
            setLeaves(leavesResponse?.data?.leaves || []);
            // debugger;
            setRestrictionDataLoaded(true);
            // debugger;
        } catch (error) {
            console.error('Error fetching restriction data:', error);
            // Set empty arrays as fallback
            // setHolidays([]);
            setPublicHolidays([]);
            setLeaves([]);
        } finally {
            setIsLoadingRestrictionData(false);
        }
    };

    // Fetch restrictAttendanceTo7Days configuration on component mount
    useEffect(() => {
        const loadRestrictAttendanceConfiguration = async () => {
            try {
                const response = await fetchConfiguration(RESTRICT_ATTENDANCE_TO_7_DAYS_KEY);
                const parsed = JSON.parse(response?.data?.configuration?.configuration || '{}');
                let restrictValue = parsed?.restrictAttendanceTo7Days;
                console.log("response:: ", response);

                // Handle migration from boolean to number
                if (typeof restrictValue === 'boolean') {
                    restrictValue = restrictValue ? 7 : 0; // true -> 7 days, false -> disabled
                } else if (typeof restrictValue !== 'number' || restrictValue < 0) {
                    restrictValue = 1; // Default to 1 day
                }
                // debugger;
                setRestrictionDays(restrictValue);
                // Update Redux store with the fetched configuration
                dispatch(setFeatureConfiguration({
                    ...featureConfig,
                    restrictAttendanceTo7Days: restrictValue
                }));
            } catch (error) {
                console.error('Error loading restrict attendance configuration:', error);
                // Set default value in Redux if fetch fails
                dispatch(setFeatureConfiguration({
                    ...featureConfig,
                    restrictAttendanceTo7Days: 0
                }));

            }
        };

        loadRestrictAttendanceConfiguration();
    }, []); // Run only once on component mount

    // Update restriction state when featureConfiguration changes
    // useEffect(() => {
    //     // Check if featureConfiguration is loaded and has the restriction setting
    //     if (featureConfig && typeof featureConfig.restrictAttendanceTo7Days !== 'undefined') {
    //         const newRestrictionValue = featureConfig.restrictAttendanceTo7Days === true;
    //         setIsRestrictionEnabled(newRestrictionValue);
    //         // Reset data loaded state if restriction setting changes
    //         if (newRestrictionValue !== isRestrictionEnabled) {
    //             setRestrictionDataLoaded(false);
    //         }
    //     } else {
    //         setIsRestrictionEnabled(false); // Default to disabled (safer)
    //     }
    // }, [featureConfig?.restrictAttendanceTo7Days]);

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const branchWorkingDays = useSelector((state: RootState) =>
        state.employee.currentEmployee?.branches?.workingAndOffDays
            ? JSON.parse(state.employee.currentEmployee.branches.workingAndOffDays)
            : null
    );
    const [disableRaiseRequest, setDisableRaiseRequest] = useState(false);
    const maxAttendanceRequestLimit = useSelector((state: RootState) => state.employee.currentEmployee.attendanceRequestRaiseLimit);
    const [requestLimitResetLoading, setRequestLimitResetLoading] = useState(false)
    const reportsToId = useSelector((state: RootState) => state.employee.currentEmployee.reportsToId);

    const isWeekendFromConfig = (date: Date): boolean => {
        if (!branchWorkingDays) {
            // Default weekend check (Saturday and Sunday) if no config
            return dayjs(date).day() === 0 || dayjs(date).day() === 6;
        }

        const dayName = dayjs(date).format('dddd').toLowerCase();
        return branchWorkingDays[dayName] === '0';
    }


    const handleMonthChange = async (el: any) => {
        // Convert the Date object to a string before dispatching to Redux
        const dateStr = dayjs(el.activeStartDate).format('YYYY-MM-DD');
        setActiveStartDate(el.activeStartDate);
        dispatch(trackMonthChange(dateStr));
    }

    const getTileClassName = ({ date, view }: any) => {
        const formattedDate = dayjs(date).format('DD/MM/YYYY');
        const isWeekend = isWeekendFromConfig(date);

        if (view === 'month') {
            const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WORKING_WEEKEND, MARKED_PRESENT_VIA_REQUEST_RAISED, HOLIDAY } = ATTENDANCE_STATUS;

            const matchedDate = calendarCells.find((el) => el?.date === formattedDate);

            if (matchedDate) {
                switch (matchedDate.status) {
                    case PRESENT:
                        return 'react__calendar__status__present';
                    case ABSENT:
                        return 'react__calendar__status__absent';
                    case CHECK_IN_MISSING:
                    case CHECK_OUT_MISSING:
                        return 'react__calendar__status__check_in_out_missing';
                    case LEAVE:
                        return 'react__calendar__status__leave';
                    case WORKING_WEEKEND:
                        return 'react__calendar__status__working_on_weekend';
                    case MARKED_PRESENT_VIA_REQUEST_RAISED:
                        return 'react__calendar__status__marked_present_via_request_raised';
                    case HOLIDAY:
                        return 'react__calendar__status__holiday';
                    default:
                        break;
                }
            }

            if (isWeekend) {
                return 'react__calendar__status__weekend';
            }

            return 'react__calendar__status__default';
        }

        return 'react__calendar__status__default';
    };


    // Helper function to check if date is allowed for attendance requests
    const isDateAllowedForRequest = (date: Date): boolean => {
        if (!restrictionDays || restrictionDays <= 0) {
            console.log("Restriction is disabled (0 days)");
            return true; // If restriction is disabled (0) or invalid, allow all dates
        }

        try {
            const selectedDate = dayjs(date);
            const currentDate = dayjs();
            const daysDifference = currentDate.diff(selectedDate, 'day');
            // debugger;
            // Allow requests for dates within the configured number of calendar days
            return daysDifference <= (restrictionDays - 1); // -1 for inclusive counting
        } catch (error) {
            console.error('Error checking if date is allowed:', error);
            return false; // Fail-safe: if we can't determine, deny the request
        }
    };

    // Added handlers for modal and form
    const handleDateClick = async (date: Date) => {
        const formattedDate = dayjs(date).format('YYYY-MM-DD'); // Format to match checkIn date
        const currentDate = dayjs().startOf('day').format('YYYY-MM-DD');
        const dateOfJoining = dayjs(dateOfjoining).format('YYYY-MM-DD');

        if (formattedDate > currentDate) {
            errorConfirmation('Cannot raise request for today or future date');
            return;
        }

        if (formattedDate < dateOfJoining) {
            errorConfirmation('Cannot raise request for before joining date');
            return;
        }

        const parsedDate = dayjs(date);
        if (!parsedDate.isValid()) {
            console.error("Invalid date parsing:", formattedDate);
            return;
        }

        setSelectedDate(formattedDate);

        try {
            const startDate = parsedDate.startOf('month').format('YYYY-MM-DD');
            const endDate = parsedDate.endOf('month').format('YYYY-MM-DD');

            const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startDate, endDate);

            // Find attendance for the selected date
            const existingAttendance = attendanceRequests.find((att: any) => {
                const checkInDate = dayjs(att.checkIn).format('YYYY-MM-DD'); // Extract only the date
                return checkInDate === formattedDate;
            });

            const filterAttendance = getEmployeeAttendance.find((att: any) => {
                if (!att.date) return false;
                const checkInDate = dayjs(att.date).format('YYYY-MM-DD');
                return checkInDate === formattedDate;
            });

            // Check if check-in data exists for this date
            const hasCheckInData = (existingAttendance && existingAttendance.checkIn) ||
                (filterAttendance && filterAttendance.checkIn && filterAttendance.checkIn !== "-NA-");

            // Store check-in availability for modal logic
            setHasCheckInData(hasCheckInData);

            // Always show request type selection modal
            setShowRequestTypeSelection(true);
            setShow(true);

            // Validate previous days attendance (only for self-requests)
            setIsValidating(true);
            try {
                const validationResult = await validatePreviousDaysAttendance({
                    employeeId,
                    selectedDate: formattedDate,
                    dateOfJoining: String(dateOfjoining || ''),
                    workingAndOfDays: branchWorkingDays || {},
                    offDaysForTheBranch: []
                });
                setCanSubmitRequest(validationResult.canRaiseRequest);
                setValidationBlockingDate(validationResult.blockingDate);
            } catch (validationError) {
                console.error('Validation error:', validationError);
                setCanSubmitRequest(true); // Allow on error to not block user
            } finally {
                setIsValidating(false);
            }

            if (existingAttendance) {
                setAttendanceData((prev) => ({
                    ...prev,
                    [formattedDate]: {
                        id: existingAttendance.id || "",
                        checkIn: existingAttendance.checkIn ? dayjs(existingAttendance.checkIn).format('HH:mm') : "",
                        checkOut: existingAttendance.checkOut ? dayjs(existingAttendance.checkOut).format('HH:mm') : "",
                        remarks: existingAttendance.remarks || "",
                        workingMethodId: existingAttendance.workingMethodId || ""
                    }
                }));
            } else if (filterAttendance) {
                // Format check-in time (handle both 'HH:mm:ss' and 'HH:mm' formats)
                let checkInTime = "";
                if (filterAttendance.checkIn && filterAttendance.checkIn !== "-NA-") {
                    try {
                        const timePart = filterAttendance.checkIn.split(' ').pop(); // In case there's a date part
                        if (timePart) {
                            const timeParts = timePart.split(':');
                            if (timeParts.length >= 2) {
                                const hours = timeParts[0].padStart(2, '0');
                                const minutes = timeParts[1].padStart(2, '0');
                                checkInTime = `${hours}:${minutes}`;
                            }
                        }
                    } catch (e) {
                        console.error("Error formatting check-in time:", e);
                        checkInTime = "";
                    }
                }

                // Format check-out time (handle '-NA-' and other formats)
                let checkOutTime = "";
                if (filterAttendance.checkOut && filterAttendance.checkOut !== "-NA") {
                    try {
                        const timePart = filterAttendance.checkOut.split(' ').pop();
                        if (timePart) {
                            const timeParts = timePart.split(':');
                            if (timeParts.length >= 2) {
                                const hours = timeParts[0].padStart(2, '0');
                                const minutes = timeParts[1].padStart(2, '0');
                                checkOutTime = `${hours}:${minutes}`;
                            }
                        }
                    } catch (e) {
                        console.error("Error formatting check-out time:", e);
                        checkOutTime = "";
                    }
                }

                setAttendanceData((prev) => ({
                    ...prev,
                    [formattedDate]: {
                        id: "",
                        checkIn: checkInTime,
                        checkOut: checkOutTime,
                        remarks: "",
                        workingMethodId: ""
                    }
                }));
            } else {
                // Reset form fields if no existing data
                setAttendanceData((prev) => ({
                    ...prev,
                    [formattedDate]: {
                        id: "",
                        checkIn: "",
                        checkOut: "",
                        remarks: "",
                        workingMethodId: ""
                    }
                }));
            }

        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
    };

    // ADD: Handle request type selection (with date restriction check)
    const handleRequestTypeSelection = (type: 'checkin' | 'checkout') => {
        // Check if date is allowed based on restriction days (only for check-in/check-out)
        const isDateAllowed = isDateAllowedForRequest(new Date(selectedDate));

        if (!isDateAllowed) {
            errorConfirmation('You are not allowed to raise an attendance request for this date. Contact admin for assistance.');
            return;
        }

        setRequestType(type);
        setShowRequestTypeSelection(false);
    }

    // Handle raising request for another employee (admin feature)
    const handleRaiseForEmployee = () => {
        setShow(false); // Close current modal
        setShowAdminRequestModal(true); // Open admin modal
    }

    useEffect(() => {
        if (!employeeId || !selectedDate) return;

        const fetchEmployeeRequestRaise = async () => {
            let parsedDate;

            if (selectedDate.includes('/')) {
                parsedDate = dayjs(selectedDate, 'DD/MM/YYYY', true);
            } else {
                parsedDate = dayjs(selectedDate);
            }

            if (!parsedDate.isValid()) {
                console.error("Invalid date parsing:", selectedDate);
                return;
            }
            const startDate = parsedDate.startOf('month').format('YYYY-MM-DD');
            const endDate = parsedDate.endOf('month').format('YYYY-MM-DD');

            const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startDate, endDate);
            if (attendanceRequests?.length === 0) {
                setlimitMessage(false);
            }
            else if (attendanceRequests?.length >= maxAttendanceRequestLimit) {
                setlimitMessage(true);
                setDisableRaiseRequest(true);
            }
        };
        fetchEmployeeRequestRaise();
    }, [selectedDate, employeeId, maxAttendanceRequestLimit]);


    // Fetch restriction data when employeeId is available and restriction is enabled
    // useEffect(() => {
    //     if (employeeId && isRestrictionEnabled && !restrictionDataLoaded && !isLoadingRestrictionData) {
    //         fetchRestrictionData();
    //     }
    // }, [employeeId, isRestrictionEnabled]);


    useEffect(() => {
        async function getWorkingMethods() {
            const { data: { workingMethods } } = await fetchWorkingMethods();
            const workingMethodOptions = workingMethods.map((workingMethod: any) => ({
                value: workingMethod.id,
                label: workingMethod.type,
            }));
            setWorkingMethodOptions(workingMethodOptions);
        }
        getWorkingMethods();
    }, []);


    // ADD: Handle modal close
    const handleClose = () => {
        setShow(false);
        setRequestType(null); // Clear request type on close
        setShowRequestTypeSelection(false); // Reset request type selection
        setCanSubmitRequest(true); // Reset validation
        setValidationBlockingDate(''); // Reset blocking date
        setIsValidating(false); // Reset validating state
    };

    const handleSubmit = async (values: FormValues, actions: FormikHelpers<FormValues>) => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const currentCompanyId = companyOverview[0].id;

            const formattedDate = selectedDate;

            // Prepare the base payload
            const finalPayload: any = {
                employeeId: employeeId,
                workingMethodId: values.workingMethodId,
                companyId: currentCompanyId,
                remarks: values.remarks || "",
                latitude: 0.0,
                longitude: 0.0,
                status: 0, // Default to pending
            };

            // Include the ID if it exists (for updating existing requests)
            if (values.id) {
                finalPayload.id = values.id;
            }

            // Time format and validation using Asia/Kolkata timezone
            if (requestType === 'checkin') {
                if (!values.checkIn || values.checkIn === "") {
                    errorConfirmation('Check In time is required for check-in request');
                    return;
                }
                if (!isValidTime(values.checkIn)) {
                    errorConfirmation('Enter Check In in HH:MM (24 hr format)');
                    return;
                }
                
                finalPayload.checkIn = dayjs.tz(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata").toISOString();
                finalPayload.checkOut = null; // Explicitly null for check-in requests
            } else if (requestType === 'checkout') {
                if (!values.checkOut || values.checkOut === "") {
                    errorConfirmation('Check Out time is required for check-out request');
                    return;
                }
                if (!isValidTime(values.checkOut)) {
                    errorConfirmation('Enter Check Out in HH:MM (24 hr format)');
                    return;
                }

                finalPayload.checkOut = dayjs.tz(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata").toISOString();
                
                // If there's an existing check-in time in Formik, include it as well
                if (values.checkIn && values.checkIn !== "") {
                    if (isValidTime(values.checkIn)) {
                        finalPayload.checkIn = dayjs.tz(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata").toISOString();
                    }
                } else {
                    finalPayload.checkIn = null;
                }
            }

            // Time conflict validation - check against existing attendance data
            // (Keep existing validation logic but use dayjs objects for comparison)
            const existingAttendanceForDate = attendanceData[selectedDate];
            const existingAttendanceRequest = await (async () => {
                try {
                    const startDate = dayjs(selectedDate).format('YYYY-MM-DD');
                    const endDate = dayjs(selectedDate).format('YYYY-MM-DD');
                    const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startDate, endDate);
                    return attendanceRequests.find((att: any) => {
                        const checkInDate = dayjs(att.checkIn || att.checkOut).format('YYYY-MM-DD');
                        return checkInDate === selectedDate;
                    });
                } catch (error) {
                    return null;
                }
            })();

            // Get existing attendance from employee attendance data
            const existingEmployeeAttendance = getEmployeeAttendance.find((att: any) => {
                if (!att.date) return false;
                const checkInDate = dayjs(att.date).format('YYYY-MM-DD');
                return checkInDate === selectedDate;
            });

            // Extract existing times for validation
            let existingCheckInTime = null;
            let existingCheckOutTime = null;

            // Priority: attendanceRequest > attendanceData > employeeAttendance
            if (existingAttendanceRequest) {
                if (existingAttendanceRequest.checkIn) {
                    existingCheckInTime = dayjs(existingAttendanceRequest.checkIn).format('HH:mm');
                }
                if (existingAttendanceRequest.checkOut) {
                    existingCheckOutTime = dayjs(existingAttendanceRequest.checkOut).format('HH:mm');
                }
            } else if (existingAttendanceForDate) {
                existingCheckInTime = existingAttendanceForDate.checkIn || null;
                existingCheckOutTime = existingAttendanceForDate.checkOut || null;
            } else if (existingEmployeeAttendance) {
                if (existingEmployeeAttendance.checkIn && existingEmployeeAttendance.checkIn !== "-NA-") {
                    const timePart = existingEmployeeAttendance.checkIn.split(' ').pop();
                    if (timePart) {
                        const timeParts = timePart.split(':');
                        if (timeParts.length >= 2) {
                            existingCheckInTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                        }
                    }
                }
                if (existingEmployeeAttendance.checkOut && existingEmployeeAttendance.checkOut !== "-NA-") {
                    const timePart = existingEmployeeAttendance.checkOut.split(' ').pop();
                    if (timePart) {
                        const timeParts = timePart.split(':');
                        if (timeParts.length >= 2) {
                            existingCheckOutTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                        }
                    }
                }
            }

            // Validate time conflicts
            if (requestType === 'checkin' && existingCheckOutTime) {
                const newCheckInDateTime = dayjs(`${selectedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
                const existingCheckOutDateTime = dayjs(`${selectedDate} ${existingCheckOutTime}`, "YYYY-MM-DD HH:mm");

                if (newCheckInDateTime.isAfter(existingCheckOutDateTime)) {
                    errorConfirmation(`Check-in time (${values.checkIn}) cannot be after the existing check-out time (${existingCheckOutTime})`);
                    return;
                }
            } else if (requestType === 'checkout' && existingCheckInTime) {
                const newCheckOutDateTime = dayjs(`${selectedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
                const existingCheckInDateTime = dayjs(`${selectedDate} ${existingCheckInTime}`, "YYYY-MM-DD HH:mm");

                if (newCheckOutDateTime.isBefore(existingCheckInDateTime)) {
                    errorConfirmation(`Check-out time (${values.checkOut}) cannot be before the existing check-in time (${existingCheckInTime})`);
                    return;
                }
            }

            setLoading(true);
            await createUpdateAttendanceRequest(finalPayload);
            setLoading(false);
            eventBus.emit(EVENT_KEYS.userRaisedRequestSubmitted);
            successConfirmation('Attendance Request saved successfully');
            setAttendanceData((prev) => ({ ...prev, [selectedDate]: values }));
            setShow(false);
        } catch (err) {
            console.error("Error submitting attendance request:", err);
            setLoading(false);
            errorConfirmation('Attendance Request failed. Please try again later.');
        }
    };

    useEffect(() => {
        const parser = new UAParser();
        const result = parser.getResult();
        setIsIOSMobile(
            result.device.type === 'mobile' &&
            result.os.name === 'iOS'
        );
    }, []);

    const hasOtherEmployeeEditPermissopn = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.editOthers);

    return (
        <>
            <div style={{ position: 'relative' }}>
                <Calendar
                    defaultView="month"
                    defaultActiveStartDate={activeStartDate}
                    onActiveStartDateChange={handleMonthChange}
                    className={'calendar-light'}
                    tileClassName={getTileClassName}
                    showFixedNumberOfWeeks={true}
                    onClickDay={handleDateClick}
                />
                {/* Loading overlay when restriction data is being fetched */}
                {/* {isRestrictionEnabled && isLoadingRestrictionData && (
                    <div 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}
                    >
                        <div className="d-flex flex-column align-items-center">
                            <div className="spinner-border text-primary mb-2" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <small className="text-muted">Please wait, data is getting loaded!...</small>
                        </div>
                    </div>
                )} */}
            </div>

            <div className='d-flex flex-wrap m-3 react_calendar__status__wrapper gap-3'>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_today'></div>Today
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_present'></div>Present
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_missing'></div>Checkin/Checkout missing
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_absent'></div>Absent
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_leave'></div>Leave
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_weekend'></div>Weekend
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_working_weekend'></div>Working Weekend/Holiday
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_marked_present_via_request_raised'></div>Marked Present Via Request Raised
                </div>
                <div className='d-flex react_calendar__status fs-7 text-muted align-items-center'>
                    <div className='react_calendar__status__dot dot_holiday'></div>Holiday
                </div>
            </div>

            {/* Modal form */}
            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {showRequestTypeSelection ?
                            `Select Request Type for ${selectedDate}` :
                            `Raise ${requestType === 'checkin' ? 'Check-In' : 'Check-Out'} Request for ${selectedDate} (24 hr HH:MM)`
                        }
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {showRequestTypeSelection ? (
                        <div className='d-flex flex-column align-items-center'>
                            <h5 className='mb-4'>What type of request would you like to raise?</h5>
                            <div className='d-flex gap-3'>
                                <button
                                    type='button'
                                    className='btn btn-outline-primary px-4 py-2'
                                    style={{ border: "1px solid rgb(175, 16, 16)" }}
                                    onClick={() => handleRequestTypeSelection('checkin')}
                                >
                                    {/* <i className='bi bi-box-arrow-in-right me-2'></i> */}
                                    Check-In Request
                                </button>
                                <button
                                    type='button'
                                    className={`btn px-4 py-2 ${hasCheckInData ? 'btn-outline-primary' : 'btn-outline-primary disabled'}`}
                                    style={hasCheckInData ? { border: "1px solid rgb(175, 16, 16)" } : { border: "1px solid rgb(175, 16, 16)", backgroundColor: "rgb(246, 217, 217)" }}
                                    onClick={() => hasCheckInData && handleRequestTypeSelection('checkout')}
                                    disabled={!hasCheckInData}
                                >
                                    {/* <i className='bi bi-box-arrow-right me-2'></i> */}
                                    Check-Out Request
                                </button>
                            </div>
                            {!hasCheckInData && (
                                <div className='mt-3 text-center'>
                                    <small className='text-muted'>
                                        <i className='bi bi-info-circle me-1'></i>
                                        Since check-in is not present, please create a check-in request first
                                    </small>
                                </div>
                            )}
                            {hasOtherEmployeeEditPermissopn && (
                                <div className='mt-4 pt-3 border-top w-100 text-center'>
                                    <button
                                        type='button'
                                        className='btn btn-outline-primary px-4 py-2'
                                        style={{ border: "1px solid rgb(175, 16, 16)" }}
                                        onClick={handleRaiseForEmployee}
                                    >
                                        Raise Request for Another Employee
                                    </button>
                                    <div className='mt-2'>
                                        <small className='text-muted'>
                                            <i className='bi bi-info-circle me-1'></i>
                                            Use this option to raise attendance request on behalf of another employee
                                        </small>
                                    </div>
                                </div>)}
                        </div>
                    ) : (
                        <Formik initialValues={attendanceData[selectedDate] || initialState} onSubmit={handleSubmit} validationSchema={faqSchema}>
                            {(formikProps) => (
                                <Form className='d-flex flex-column' noValidate placeholder={''}>
                                    {requestType === 'checkin' && <div className="col-lg">
                                        {isIOSMobile ? (
                                            <BootstrapForm.Group controlId="CheckIn" className="mb-3">
                                                <BootstrapForm.Label>Check In *</BootstrapForm.Label>
                                                <BootstrapForm.Control
                                                    type="time"
                                                    value={formikProps.values.checkIn}
                                                    onChange={(e) => {
                                                        formikProps.setFieldValue("checkIn", e.target.value);
                                                    }}
                                                    onBlur={() => formikProps.setFieldTouched("checkIn", true)}
                                                    isInvalid={Boolean(formikProps.errors.checkIn && formikProps.touched.checkIn)}
                                                    className="form-control"
                                                    required
                                                />
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    {formikProps.errors.checkIn}
                                                </BootstrapForm.Control.Feedback>
                                            </BootstrapForm.Group>
                                        ) : (
                                            <TimePickerInput
                                                isRequired={true}
                                                label="Check In"
                                                formikField="checkIn"
                                                placeholder="HH MM"
                                            />
                                        )}
                                    </div>}

                                    {requestType === 'checkout' && <div className="col-lg">
                                        {isIOSMobile ? (
                                            <BootstrapForm.Group controlId="CheckOut" className="mb-3">
                                                <BootstrapForm.Label>Check Out</BootstrapForm.Label>
                                                <BootstrapForm.Control
                                                    type="time"
                                                    value={formikProps.values.checkOut}
                                                    onChange={(e) => {
                                                        formikProps.setFieldValue("checkOut", e.target.value);
                                                    }}
                                                    onBlur={() => formikProps.setFieldTouched("checkOut", true)}
                                                    isInvalid={Boolean(formikProps.errors.checkOut && formikProps.touched.checkOut)}
                                                    className="form-control"
                                                />
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    {formikProps.errors.checkOut}
                                                </BootstrapForm.Control.Feedback>
                                            </BootstrapForm.Group>
                                        ) : (
                                            <TimePickerInput
                                                isRequired={false}
                                                label="Check Out"
                                                formikField="checkOut"
                                                placeholder="HH MM" />
                                        )}
                                    </div>}

                                    <div className="col-lg mt-3">
                                        <TextInput
                                            isRequired={true}
                                            label="Remarks"
                                            formikField="remarks" />
                                    </div>

                                    <div className="col-lg mt-3">
                                        <DropDownInput
                                            isRequired={true}
                                            formikField="workingMethodId"
                                            inputLabel="Working Method"
                                            options={workingMethodOptions} />
                                    </div>
                                    {limitMessage && <div className="alert mt-8" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                        {REQUEST_RAISE_DISABLE_MESSAGE}
                                    </div>}
                                    {/* Validation warning for previous days attendance */}
                                    {!canSubmitRequest && validationBlockingDate && (
                                        <div className="alert mt-3" role="alert" style={{ backgroundColor: "#FCEDDF", color: '#DD700C', borderColor: '#DD700C' }}>
                                            Please raise an attendance request for the previous day ({dayjs(validationBlockingDate).format("DD-MM-YYYY")}) including check-in and check-out before raising request for this date.
                                        </div>
                                    )}
                                    {isValidating && (
                                        <div className="alert mt-3 alert-info" role="alert">
                                            <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true'></span>
                                            Validating previous days attendance...
                                        </div>
                                    )}
                                    <div className='d-flex flex-wrap justify-content-between mt-3'>
                                        <button
                                            type='button'
                                            className='btn btn-primary text-white my-2'
                                            style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                            onClick={() => {
                                                setShowRequestTypeSelection(true);
                                                setRequestType(null);
                                            }}
                                        >
                                            <i className='bi bi-arrow-left me-2 text-white'></i>
                                            Back
                                        </button>
                                        {disableRaiseRequest && <button type='button' className='btn btn-primary my-2' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={requestLimitResetLoading} onClick={async () => await handleSendEmailForResetAttendanceRequestLimit(employeeId, setRequestLimitResetLoading, reportsToId || undefined)}>{requestLimitResetLoading ? "Please Wait..." : "Request Limit Reset"}</button>}
                                        <button type='submit' className='btn btn-primary my-2' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || limitMessage || !canSubmitRequest || isValidating}>
                                            {isValidating ? 'Validating...' : (!loading ? 'Save Changes' : 'Please wait...')}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )}
                        </Formik>
                    )}

                </Modal.Body>
            </Modal>

            {/* Admin Modal to raise request for another employee */}
            <RaiseRequestForEmployee
                show={showAdminRequestModal}
                onHide={() => setShowAdminRequestModal(false)}
                selectedDate={selectedDate}
            />
        </>
    );
}

export default AttendanceCalendar;
