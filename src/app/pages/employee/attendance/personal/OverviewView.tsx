import { useEffect, useState, lazy, Suspense } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { ATTENDANCE_STATUS, LEAVE_STATUS, LeaveStatus } from "@constants/attendance";
import { RootState, store } from "@redux/store";
import { Attendance, IAttendance, ILeaves } from "@models/employee";
import { KTCard, KTCardBody } from "@metronic/helpers";
import { fetchAttendanceDetails, fetchEmployeeLeaves, getAttendanceRequest } from "@services/employee";
import { convertToTimeZone, findTimeDifference, formatTime, generateDatesForMonth, getWeekDay, isDateAfterOrSameAsEmployeeOnboardingDate, isDateBeforeOrSameAsCurrDate } from "@utils/date";
import { saveCoordinates, savePersonalAttendance, toggleLocationPermission } from "@redux/slices/attendance";
import { savePersonalLeaves } from "@redux/slices/leaves";
import AttendanceCalendar from "./views/overview/AttendanceCalendar";
import MarkAttendance from "./views/overview/MarkAttendance";
const AttendanceGraphicalOverview = lazy(() => import("./views/overview/AttendanceGraphicalOverview"));
import { customLeaves, filterLeavesPublicHolidays } from "@utils/statistics";
import { saveFilteredLeaves, saveFilteredPublicHolidays, saveLeaves, savePublicHolidays } from "@redux/slices/attendanceStats";
import { fetchAllPublicHolidays, fetchCompanyOverview } from "@services/company";


export interface FormattedDate {
    date: string;
    dbDate: string;
}

interface Cell {
    date: string;
    status: string;
}

interface LeaveResponse {
    id: string;
    employeeId: string;
    dateFrom: string;
    dateTo: string;
    status: number;
    leaveTypeId: string;
    leaveOptions: {
        leaveType: string;
    }
    reason: string | null;
    createdAt?: string;
    updatedAt?: string;
    approvedByEmployee?: {
        users?: {
            firstName?: string;
            lastName?: string;
        };
    };
    rejectedByEmployee?: {
        users?: {
            firstName?: string;
            lastName?: string;
        };
    };
}

//TODO: Pull timezone and date format settings from db
const mumbaiTz = 'Asia/Kolkata';

export const transformAttendance = (dates: FormattedDate[], attendance: Attendance[], leaves: any[] = [], publicHolidays: any[] = []): IAttendance[] => {
    
    const attendanceData: IAttendance[] = dates.map((date: FormattedDate) => {
        const { date: transformedDate, dbDate } = date;
        const employeeDetails = store.getState().employee.currentEmployee;
        const branches: any = (employeeDetails?.branches?.workingAndOffDays);        
        const workingAndOffDays = JSON.parse(branches);        
        const isPastOrPresentDate = isDateBeforeOrSameAsCurrDate(dbDate);
        const isDateOnOrAfterEmployeeOnboardingDate = isDateAfterOrSameAsEmployeeOnboardingDate(dbDate);
        const weekDay = getWeekDay(transformedDate);
        
        const [day, month, year] = dbDate?.split('/') || [];
        const formattedDbDate = day && month && year ? `${year}-${month}-${day}` : '';
        
        // Check if date is a public holiday
        const isPublicHoliday = publicHolidays.some(holiday => {
            const holidayDate = dayjs(holiday.date).format('YYYY-MM-DD');
            // debugger;
            return holidayDate === formattedDbDate && holiday?.isActive;
        });
        
        const isOnLeave = leaves.some(leave => {
            if (leave.statusNumber !== 1) return false;
            
            const leaveStartDate = leave.dateFrom; 
            const leaveEndDate = leave.dateTo;
            
            // If start and end dates are the same (single day leave)
            if (leaveStartDate === leaveEndDate) {
                return formattedDbDate === leaveStartDate;
            }
            
            // For multiple day leaves, use proper range checking
            const startDate = dayjs(leaveStartDate);
            const endDate = dayjs(leaveEndDate);
            const currentDate = dayjs(formattedDbDate);
            
            return currentDate.isSame(startDate) || 
                   currentDate.isSame(endDate) || 
                   (currentDate.isAfter(startDate) && currentDate.isBefore(endDate));
        });
        
        const attendanceRecord = attendance.find((el: Attendance) => {
            const formattedUtcCheckIn = dayjs(convertToTimeZone(el.checkIn, mumbaiTz)).format('DD/MM/YYYY');
            return formattedUtcCheckIn == dbDate;
        });

        const { checkIn = '', checkOut = '', employeeId } = attendanceRecord || {};
        const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND, HOLIDAY } = ATTENDANCE_STATUS;
        const formattedCheckIn = formatTime(convertToTimeZone(checkIn, mumbaiTz));
        const formattedCheckOut = formatTime(convertToTimeZone(checkOut, mumbaiTz));        
        const isWeekend = Object.keys(workingAndOffDays).includes(weekDay.toLowerCase()) && workingAndOffDays[weekDay.toLowerCase()]==="0";

        // Prioritize leave status if the employee is on leave for this day
        if (isOnLeave) {
            return {
                id: attendanceRecord?.id,
                date: transformedDate,
                formattedDate: dbDate,
                day: weekDay,
                employeeId,
                checkIn: checkIn ? formattedCheckIn : '-NA-',
                checkOut: checkOut ? formattedCheckOut : '-NA-',
                duration: findTimeDifference(formattedCheckIn, formattedCheckOut),
                workingMethod: attendanceRecord?.workingMethod?.type || '-NA-',
                status: LEAVE
            }
        }

        // Check for public holiday (for both past and future dates)
        if (isPublicHoliday) {
            return {
                id: attendanceRecord?.id || "-",
                date: transformedDate,
                formattedDate: dbDate,
                day: weekDay,
                employeeId,
                checkIn: checkIn ? formattedCheckIn : '-',
                checkOut: checkOut ? formattedCheckOut : '-',
                duration: checkIn && checkOut ? findTimeDifference(formattedCheckIn, formattedCheckOut) : '',
                workingMethod: attendanceRecord?.workingMethod?.type || '-',
                status: HOLIDAY
            }
        }

        // Handle future dates or dates before employee onboarding
        if (!isPastOrPresentDate || !isDateOnOrAfterEmployeeOnboardingDate) {
            return {
                id: "-",
                day: weekDay,
                date: transformedDate,
                employeeId,
                formattedDate: dbDate,
                checkIn: "-",
                checkOut: "-",
                duration: "",
                workingMethod: '-',
                status: isWeekend ? WEEKEND : '-'
            }
        }

        // Handle regular attendance for past/present dates
        return {
            id: attendanceRecord?.id,
            date: transformedDate,
            formattedDate: dbDate,
            day: weekDay,
            employeeId,
            checkIn: checkIn ? formattedCheckIn : '-NA-',
            checkOut: checkOut ? formattedCheckOut : '-NA-',
            duration: findTimeDifference(formattedCheckIn, formattedCheckOut),
            workingMethod: attendanceRecord?.workingMethod?.type || '-NA-',
            status: checkIn && checkOut
            ? (isWeekend ? WORKING_WEEKEND : PRESENT)
            : checkIn && !checkOut
            ? CHECK_OUT_MISSING
            : !checkIn && checkOut
            ? CHECK_IN_MISSING
            : attendanceRecord?.leaveTrackedId
            ? LEAVE
            : isPublicHoliday
            ? HOLIDAY
            : isWeekend
            ? WEEKEND
            : ABSENT
        }
    });
    
    // Debug summary with month-specific information
    const leaveCount = attendanceData.filter(item => item.status === ATTENDANCE_STATUS.LEAVE).length;
    const month = dates.length > 0 ? dayjs(dates[0].dbDate, 'DD/MM/YYYY').format('MMMM YYYY') : 'Unknown month';
    return attendanceData;
}

export const transformLeaves = (leaves: LeaveResponse[]): ILeaves[] => {
    const leavesData = leaves.map((leave: LeaveResponse) => {
        const dateFrom = dayjs(leave.dateFrom).format('DD MMM, YYYY');
        const dateTo = dayjs(leave.dateTo).format('DD MMM, YYYY');
        const dateFromWeekday = getWeekDay(dateFrom);
        const dateToWeekday = getWeekDay(dateTo);

        return {
            id: leave.id,
            employeeId: leave.employeeId,
            dateFrom: dayjs(leave.dateFrom).format('YYYY-MM-DD'),
            dateTo: dayjs(leave.dateTo).format('YYYY-MM-DD'),
            leaveTypeId: leave.leaveTypeId,
            statusNumber: leave.status,
            date: `${dateFrom} - ${dateTo}`,
            day: `${dateFromWeekday} - ${dateToWeekday}`,
            remark: leave.reason,
            reason: leave.reason, // For LeaveRequestForm compatibility
            status: LEAVE_STATUS[leave.status as LeaveStatus],
            type: leave.leaveOptions.leaveType,
            createdAt: leave.createdAt,
            updatedAt: leave.updatedAt,
            approvedByName: leave.approvedByEmployee?.users ? `${leave.approvedByEmployee.users.firstName || ''} ${leave.approvedByEmployee.users.lastName || ''}`.trim() : '',
            rejectedByName: leave.rejectedByEmployee?.users ? `${leave.rejectedByEmployee.users.firstName || ''} ${leave.rejectedByEmployee.users.lastName || ''}`.trim() : '',
        }
    });

    return leavesData;
}

function OverviewView() {
    const { employeeId, attendance } = useSelector((state: RootState) => {
        const { employee, attendance } = state;
        return {
            employeeId: employee.currentEmployee.id,
            attendance: attendance.personalAttendance,
        }
    });
    const [activeStartDate, setActiveStartDate] = useState(new Date());
    const dispatch = useDispatch();
    const [calendarCells, setCalendarCells] = useState<Cell[]>([]);
    useEffect(() => {
        if (!employeeId || !activeStartDate) return;
        const month = activeStartDate.getMonth() + 1;
        const year = activeStartDate.getFullYear();
        const dates = generateDatesForMonth(`${year}-${month}-01`);
        
        async function fetchData() {
            try {
                // Parallel API calls for better performance
                const [
                    { data: { companyOverview } },
                    { data: { leaves } },
                    { data: { attendance } }
                ] = await Promise.all([
                    fetchCompanyOverview(),
                    fetchEmployeeLeaves(employeeId),
                    fetchAttendanceDetails(employeeId, month, year)
                ]);
                
                const companyId = companyOverview[0].id;
                const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);
                dispatch(savePublicHolidays(publicHolidays));
                const personalLeaves = transformLeaves(leaves);
                dispatch(savePersonalLeaves(personalLeaves));
                let personalAttendance = transformAttendance(dates, attendance, personalLeaves, publicHolidays);
                
                const [startDateDay, startDateMonth, startDateYear] = dates[0]?.dbDate?.split('/') || [];
                const [endDateDay, endDateMonth, endDateYear] = dates[dates.length - 1]?.dbDate?.split('/') || []; // Fix: use last date
                const startDate = startDateDay && startDateMonth && startDateYear
                    ? dayjs(`${startDateYear}-${startDateMonth}-${startDateDay}`).startOf('month').format('YYYY-MM-DD')
                    : dayjs().startOf('month').format('YYYY-MM-DD');
                const endDate = endDateDay && endDateMonth && endDateYear
                    ? dayjs(`${endDateYear}-${endDateMonth}-${endDateDay}`).endOf('month').format('YYYY-MM-DD')
                    : dayjs().endOf('month').format('YYYY-MM-DD');
                
                const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, startDate, endDate);
                let finalRequests = attendanceRequests?.filter((request: any) => request?.status === LeaveStatus.Approved);
                
                    finalRequests = transformAttendance(dates, finalRequests, personalLeaves, publicHolidays).filter(request => request?.id && request?.id != '-');
                    
                    finalRequests = finalRequests?.map((request: any) => ({ 
                        ...request, 
                        status: ATTENDANCE_STATUS.MARKED_PRESENT_VIA_REQUEST_RAISED 
                    }));
                    
                    personalAttendance = personalAttendance?.map((attendanceRecord: any) => {
                    const matchingRequest = finalRequests?.find((request: any) => request?.date == attendanceRecord?.date);
                        if (matchingRequest) {
                            return { ...attendanceRecord, status: matchingRequest?.status };
                        } else {
                            return attendanceRecord;
                        }
                    });
                
                dispatch(savePersonalAttendance(personalAttendance));
                
            } catch (error) {
                console.error('Error in fetchData:', error);
            }
        }
        fetchData();
    }, [employeeId, activeStartDate]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position: any) => {
                const { coords: { latitude, longitude } } = position;
                dispatch(saveCoordinates({ latitude, longitude }));
                dispatch(toggleLocationPermission(true));
            },()=>{ 
                console.warn('Error in fetching ocation from OverviewView.tsx: Unable to retrieve your location')
            },{ 
                enableHighAccuracy: true,
            });
        } else {
            dispatch(toggleLocationPermission(false));
        }
    }, []);

    const checkInCheckOut = useSelector((state: RootState) => state.attendance.openModal);
    const startDate = dayjs(activeStartDate).startOf('year').format('YYYY-MM-DD');
    const endDate = dayjs(activeStartDate).endOf('year').format('YYYY-MM-DD');

    useEffect(() => {
        async function fetchLeavesPublicHolidays() {
            try {
                const { data: { companyOverview } } = await fetchCompanyOverview();
                const companyId = companyOverview[0].id;

                const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
                const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);

                const totalLeaves = await customLeaves(leaves);

                dispatch(saveLeaves(totalLeaves));
                dispatch(savePublicHolidays(publicHolidays));

                const filteredLeavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true);

                dispatch(saveFilteredLeaves(filteredLeavesHolidays?.customLeaves));
                dispatch(saveFilteredPublicHolidays(filteredLeavesHolidays?.publicHolidays));
            } catch (error) {
                console.warn('Error fetching data',error);
            }
        }

        fetchLeavesPublicHolidays();
    }, [employeeId, checkInCheckOut])

    useEffect(() => {
        if(!attendance) return;
        
        setCalendarCells(attendance.map((el: IAttendance) => ({ 
            date: el.formattedDate || "", 
            status: el.status 
        })));
    }, [attendance]);

    return (
        <>
            <h3 className="fw-bold fs-1 mb-4 font-barlow">Overview</h3>
            <div className="row mt-7 align-items-start">
                <div className="col-lg-7 react_calendar__wrapper">
                    <AttendanceCalendar 
                        calendarCells={calendarCells} 
                        activeStartDate={activeStartDate} 
                        setActiveStartDate={setActiveStartDate} 
                    />
                </div>
                
                <div className="col-lg-5">
                    <KTCard className="h-100">
                        <KTCardBody>
                            <MarkAttendance />
                        </KTCardBody>
                    </KTCard>
                </div>
            </div>
            <Suspense fallback={
                <div className="d-flex justify-content-center align-items-center mt-8" style={{ minHeight: '200px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading statistics...</span>
                    </div>
                </div>
            }>
                <AttendanceGraphicalOverview />
            </Suspense>
        </>
    );
}

export default OverviewView;