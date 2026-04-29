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
import { fetchCompanyOverview } from "@services/company";
import { fetchWorkingMethods } from "@services/options";
import { getDynamicRolesObject, getDynamicUserRolesObject } from "@utils/dynamicRoles";
import { hasPermission } from "@utils/authAbac";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { REQUEST_RAISE_DISABLE_MESSAGE } from "@constants/statistics";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
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
  checkIn: "",
  checkOut: "",
  remarks: "",
  workingMethodId: "",
};

interface FormValues {
  checkIn: string;
  checkOut: string;
  remarks: string;
  workingMethodId: string;
}

const faqSchema = Yup.object().shape({
  checkIn: Yup.string(),
  checkOut: Yup.string(),
  remarks: Yup.string().required("Remarks are required"),
  workingMethodId: Yup.string().required("Working Method is required"),
});


const mumbaiTz = 'Asia/Kolkata';

function AttendanceCalendar({ calendarCells , activeStartDate, setActiveStartDate}: AttendanceCalendarProps) {
    const dispatch = useDispatch();
    let values = useSelector((state: RootState) => state?.customColors?.attendanceCalendar);
    let holidayColorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);
    // console.log("values",values);
    
    const getEmployeeAttendance = useSelector((state: RootState) => state.attendance?.personalAttendance);
    const dateOfjoining = useSelector((state:RootState)=> state?.employee?.currentEmployee?.dateOfJoining);
    // console.log("dateOfJoining",dayjs(dateOfjoining).format('YYYY-MM-DD'));
    
    
    // Added state for modal and form
    const [show, setShow] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [limitMessage, setlimitMessage] = useState(false);
    const [attendanceData, setAttendanceData] = useState<Record<string, FormValues>>({});
    const [requestType, setRequestType] = useState<'checkin' | 'checkout' | null>(null);
    const [showRequestTypeSelection, setShowRequestTypeSelection] = useState(false);
    const [hasCheckInData, setHasCheckInData] = useState(false);
    const [workingMethodOptions, setWorkingMethodOptions] = useState([
        { label: "Hybrid" },
        { label: "Office" },
        { label: "On-site" }
    ]);

    if(checkIfAnyValueIsUndefined(values)){
        fetchColorAndStoreInSlice().then((res) => {
            // console.log("res: ", res);
        })
    }
    useEffect(()=>{
        dispatch(fetchRolesAndPermissions() as any);
    },[])
   
    if(values?.todayColor) document.documentElement.style.setProperty("--react-calendar-today-color", values?.todayColor);
    if(values?.presentColor) document.documentElement.style.setProperty("--present", values?.presentColor);
    if(values?.presentColor) document.documentElement.style.setProperty("--check-in-out-missing", values?.presentColor);
    if(values?.absentColor) document.documentElement.style.setProperty("--absent", values?.absentColor);
    if(values?.onLeaveColor) document.documentElement.style.setProperty("--leave", values?.onLeaveColor);
    if(values?.weekendColor) document.documentElement.style.setProperty("--weekend", values?.weekendColor);
    if(values?.workingWeekendColor) document.documentElement.style.setProperty("--working-weekend", values?.workingWeekendColor);
    if(values?.markedPresentViaRequestRaisedColor) document.documentElement.style.setProperty("--attendance-present-with-request-approved", values?.markedPresentViaRequestRaisedColor);
    if(holidayColorValues?.holidayColor) document.documentElement.style.setProperty("--holiday", holidayColorValues?.holidayColor);
    
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
    

    // Added handlers for modal and form
   const handleDateClick = async (date: Date) => {
    const formattedDate = dayjs(date).format('YYYY-MM-DD'); // Format to match checkIn date
    const currentDate = dayjs().startOf('day').format('YYYY-MM-DD');
    const dateOfJoining = dayjs(dateOfjoining).format('YYYY-MM-DD');

    if (formattedDate === currentDate || formattedDate > currentDate) {
        errorConfirmation('Cannot raise request for today or future date');
        return;
    }

    if(formattedDate < dateOfJoining){
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

        const filterAttendance = getEmployeeAttendance.find((att:any)=>{
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

        if (existingAttendance) {
            setAttendanceData((prev) => ({
                ...prev,
                [formattedDate]: {
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

    // ADD: Handle request type selection
    const handleRequestTypeSelection = (type: 'checkin' | 'checkout') => {
        setRequestType(type);
        setShowRequestTypeSelection(false);
    }

   useEffect(() => {
    if ( !employeeId || !selectedDate) return;

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
        if( attendanceRequests?.length === 0){
            setlimitMessage(false);
        }
        else if(attendanceRequests?.length >= maxAttendanceRequestLimit) {
            setlimitMessage(true);
            setDisableRaiseRequest(true);
        }
    };
        fetchEmployeeRequestRaise();
    }, [selectedDate, employeeId, maxAttendanceRequestLimit]);
    


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
    };

   const handleSubmit = async (values: FormValues, actions: FormikHelpers<FormValues>) => {
    try {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        const currentCompanyId = companyOverview[0].id;
        
        // ... (rest of the code remains the same)
        const updatedValues: {
            checkIn?: string;
            checkOut?: string;
            remarks: string;
            workingMethodId: string;
            latitude: number;
            longitude: number;
            status: number;
            companyId: string;
            employeeId: string;
        } = {
            ...values,
            latitude: 0,
            longitude: 0,
            status: 0,
            companyId: currentCompanyId,
            employeeId: employeeId
        };
        
        const formattedDate = selectedDate;
        
        // Validate time formats
        let checkInDateTime, checkOutDateTime;
        let checkInUTC, checkOutUTC;

        // Validate based on request type
        if (requestType === 'checkin') {
            if (!values.checkIn || values.checkIn === "") {
                errorConfirmation('Check In time is required for check-in request');
                return;
            }
            if (!isValidTime(values.checkIn)) {
                errorConfirmation('Enter Check In in HH:MM(24 hr format)');
                return;
            }
            checkInDateTime = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
            const checkInDateObject = new Date(checkInDateTime.toString());
            checkInUTC = checkInDateObject.toISOString();
            updatedValues.checkIn = checkInUTC;
            // Remove checkout for checkin requests
            updatedValues.checkOut = undefined;
        } else if (requestType === 'checkout') {
            if (!values.checkOut || values.checkOut === "") {
                errorConfirmation('Check Out time is required for check-out request');
                return;
            }
            if (!isValidTime(values.checkOut)) {
                errorConfirmation('Enter Check Out in HH:MM(24 hr format)');
                return;
            }
            checkOutDateTime = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
            const checkOutDateObject = new Date(checkOutDateTime.toString());
            checkOutUTC = checkOutDateObject.toISOString();
            updatedValues.checkOut = checkOutUTC;
            // Remove checkin for checkout requests
            updatedValues.checkIn = undefined;
        }

        // Time conflict validation - check against existing attendance data
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
                // Handle time format from employee attendance (might include seconds)
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
            // Check if new check-in time is after existing check-out time
            const newCheckInTime = dayjs(`${selectedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm");
            const existingCheckOutDateTime = dayjs(`${selectedDate} ${existingCheckOutTime}`, "YYYY-MM-DD HH:mm");
            
            if (newCheckInTime.isAfter(existingCheckOutDateTime)) {
                errorConfirmation(`Check-in time (${values.checkIn}) cannot be after the existing check-out time (${existingCheckOutTime})`);
                return;
            }
        } else if (requestType === 'checkout' && existingCheckInTime) {
            // Check if new check-out time is before existing check-in time
            const newCheckOutTime = dayjs(`${selectedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm");
            const existingCheckInDateTime = dayjs(`${selectedDate} ${existingCheckInTime}`, "YYYY-MM-DD HH:mm");
            
            if (newCheckOutTime.isBefore(existingCheckInDateTime)) {
                errorConfirmation(`Check-out time (${values.checkOut}) cannot be before the existing check-in time (${existingCheckInTime})`);
                return;
            }
        }

        setLoading(true);
        await createUpdateAttendanceRequest(updatedValues);
        setLoading(false);
        eventBus.emit(EVENT_KEYS.userRaisedRequestSubmitted);
        successConfirmation('Attendance Request created successfully');
        setAttendanceData((prev) => ({ ...prev, [selectedDate]: values }));
        setShow(false);
    } catch (err) {
        console.log("Error:", err);
        setLoading(false);
        errorConfirmation('Attendance Request failed. Please try again later.');
    }
};

    return (
        <>
            <Calendar
                defaultView="month"
                defaultActiveStartDate={activeStartDate}
                onActiveStartDateChange={handleMonthChange}
                className={'calendar-light'}
                tileClassName={getTileClassName}
                showFixedNumberOfWeeks={true}
                onClickDay={handleDateClick}
            />

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
                                    style={{border: "1px solid rgb(175, 16, 16)" }}
                                    onClick={() => handleRequestTypeSelection('checkin')}
                                >
                                    {/* <i className='bi bi-box-arrow-in-right me-2'></i> */}
                                    Check-In Request
                                </button>
                                <button 
                                    type='button' 
                                    className={`btn px-4 py-2 ${hasCheckInData ? 'btn-outline-primary' : 'btn-outline-primary disabled'}`}
                                    style={hasCheckInData ? {border: "1px solid rgb(175, 16, 16)" } : {border: "1px solid rgb(175, 16, 16)", backgroundColor: "rgb(246, 217, 217)"}}
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
                        </div>
                    ) : (
                        <Formik initialValues={attendanceData[selectedDate] || initialState} onSubmit={handleSubmit} validationSchema={faqSchema}>
                            {(formikProps) => (
                                <Form className='d-flex flex-column' noValidate placeholder={''}>
                                    {requestType === 'checkin' && (
                                        <div className="col-lg">
                                            <TimePickerInput
                                                isRequired={true}
                                                label="Check In"
                                                margin="mb-7"
                                                formikField="checkIn"
                                                placeholder="HH MM"/>
                                        </div>
                                    )}

                                    {requestType === 'checkout' && (
                                        <div className="col-lg">
                                            <TimePickerInput
                                                isRequired={true}
                                                label="Check Out"
                                                margin="mb-7"
                                                formikField="checkOut"
                                                placeholder="HH MM" />
                                        </div>
                                    )}

                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Remarks"
                                            margin="mb-7"
                                            formikField="remarks" />
                                    </div>

                                    <div className="col-lg">
                                        <DropDownInput
                                            isRequired={true}
                                            formikField="workingMethodId"
                                            inputLabel="Working Method"
                                            options={workingMethodOptions} />
                                    </div>
                                    
                                    {limitMessage && <div className="alert mt-8" role="alert" style={{backgroundColor: "#FCEDDF", color: '#DD700C', borderColor:'#DD700C'}}>
                                        {REQUEST_RAISE_DISABLE_MESSAGE}
                                    </div>}
                                    
                                    <div className='d-flex justify-content-between mt-8'>
                                        <button 
                                            type='button' 
                                            className='btn btn-primary text-white'
                                            style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                            onClick={() => {
                                                setShowRequestTypeSelection(true);
                                                setRequestType(null);
                                            }}
                                        >
                                            <i className='bi bi-arrow-left me-2 text-white'></i>
                                            Back to Selection
                                        </button>
                                        
                                        <div className='d-flex gap-2'>
                                            {disableRaiseRequest && <button type='button' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={requestLimitResetLoading} onClick={async ()=> await handleSendEmailForResetAttendanceRequestLimit(employeeId, setRequestLimitResetLoading, reportsToId || undefined)}>{requestLimitResetLoading ? "Please Wait..." : "Request To Reset Attendance Raise Limit"}</button>}
                                            <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || limitMessage}>
                                                {!loading && 'Save Changes'}
                                                {loading && (
                                                    <span className='indicator-progress' style={{ display: 'block' }}>
                                                        Please wait...{' '}
                                                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </Form>
                            )}
                        </Formik>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}
 