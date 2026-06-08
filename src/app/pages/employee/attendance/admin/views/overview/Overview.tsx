import { EARLY_CHECKOUT, EXTRA_DAYS, LATE_CHECKIN, onSiteAndHolidayWeekendSettingsOnOffName } from "@constants/statistics";
import { toAbsoluteUrl } from "@metronic/helpers";
import { Attendance } from "@models/employee";
import { Employee } from "@redux/slices/employee";
import { saveTotalEmployeeCount } from "@redux/slices/attendance";
import { RootState } from "@redux/store";
import { fetchAllEmployees, fetchEmployeesOnLeaveToday } from "@services/employee";
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { donutaDataLabel, multipleRadialBarData } from "@utils/statistics";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Card, Col, Row, Image, Spinner, Alert, Modal, Button, Form, InputGroup, Dropdown, OverlayTrigger, Tooltip } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmpsAttendance } from "./DailyAttendance";
import locationIcon from "@metronic/assets/sidepanelicons/location_11383462.png";
import { fetchConfiguration } from "@services/company";

type SortOption = 'name-asc' | 'name-desc' | 'checkin-asc' | 'checkin-desc' | 'none';

// Custom Modal Component
interface CustomModalProps {
    show: boolean;
    onHide: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'lg' | 'xl';
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
    sortOption?: SortOption;
    onSortChange?: (value: SortOption) => void;
}

const CustomModal: React.FC<CustomModalProps> = ({
    show,
    onHide,
    title,
    children,
    size = 'lg',
    searchQuery = '',
    onSearchChange,
    sortOption = 'none',
    onSortChange
}) => {
    const getSortLabel = () => {
        switch (sortOption) {
            case 'name-asc': return 'Name (A-Z)';
            case 'name-desc': return 'Name (Z-A)';
            case 'checkin-asc': return 'Check-in (Earliest)';
            case 'checkin-desc': return 'Check-in (Latest)';
            default: return 'Sort By';
        }
    };
    return (
        <Modal
            show={show}
            onHide={onHide}
            size={size}
            centered
            backdrop={true}
            keyboard={true}
            className="fade"
        >
            <Modal.Header closeButton className="border-0 pb-2">
                <div className="w-100 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                    <Modal.Title className="fw-bold fs-3 mb-0">{title}</Modal.Title>
                    <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0" style={{ minWidth: '250px', maxWidth: '500px', width: '100%' }}>
                        {onSortChange && (
                            <Dropdown>
                                <Dropdown.Toggle
                                    size="sm"
                                    style={{
                                        backgroundColor: '#9D4141',
                                        borderColor: '#9D4141',
                                        color: 'white',
                                        whiteSpace: 'nowrap',
                                        height: '35px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <i className="bi bi-filter me-2"></i>
                                    {getSortLabel()}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => onSortChange('name-asc')}>
                                        <i className="bi bi-sort-alpha-down me-2"></i>
                                        Name (A-Z)
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => onSortChange('name-desc')}>
                                        <i className="bi bi-sort-alpha-up me-2"></i>
                                        Name (Z-A)
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => onSortChange('checkin-asc')}>
                                        <i className="bi bi-clock me-2"></i>
                                        Check-in (Earliest)
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => onSortChange('checkin-desc')}>
                                        <i className="bi bi-clock-fill me-2"></i>
                                        Check-in (Latest)
                                    </Dropdown.Item>
                                    {sortOption !== 'none' && (
                                        <>
                                            <Dropdown.Divider />
                                            <Dropdown.Item onClick={() => onSortChange('none')}>
                                                <i className="bi bi-x-circle me-2"></i>
                                                Clear Sort
                                            </Dropdown.Item>
                                        </>
                                    )}
                                </Dropdown.Menu>
                            </Dropdown>
                        )}
                        {onSearchChange && (
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by name..."
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    size="sm"
                                    style={{
                                        borderColor: '#9D4141',
                                        outline: 'none',
                                        boxShadow: 'none',
                                        paddingRight: searchQuery ? '35px' : '12px'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#9D4141';
                                        e.target.style.boxShadow = '0 0 0 0.2rem rgba(157, 65, 65, 0.25)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {searchQuery && (
                                    <Button
                                        size="sm"
                                        onClick={() => onSearchChange('')}
                                        title="Clear search"
                                        style={{
                                            position: 'absolute',
                                            right: '5px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#9D4141',
                                            padding: '2px 6px',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#7d3434';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '#9D4141';
                                        }}
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal.Header>
            <Modal.Body className="" style={{
                maxHeight: '80vh',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#9D4141 #f1f1f1'
            }}>
                <style>
                    {`
                        .modal-body::-webkit-scrollbar {
                            width: 6px;
                        }
                        .modal-body::-webkit-scrollbar-track {
                            background: #f1f1f1;
                            border-radius: 10px;
                        }
                        .modal-body::-webkit-scrollbar-thumb {
                            background: #888;
                            border-radius: 10px;
                        }
                        .modal-body::-webkit-scrollbar-thumb:hover {
                            background: #555;
                        }
                    `}
                </style>
                {children}
            </Modal.Body>
        </Modal>
    );
};

type ModalType = 'working' | 'leave' | 'late' | 'early' | 'extra' | 'absent' | null;

interface EmployeeWithAttendance {
    _id: string;
    firstName: string;
    lastName: string;
    designation?: string;
    avatar?: string | null;  // Changed from profileImage to avatar to match Employee interface
    isActive?: boolean;  // Added to filter inactive employees
    attendance?: Attendance & {
        workingMethod?: {
            id?: string;
            type: string;
            companyId?: string;
        };
        latitude?: number;
        longitude?: number;
        checkInLocation?: string;
    };
}

interface OverviewProps {
    date: any; // dayjs object
}

function Overview({ date }: OverviewProps) {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>([]);
    const [employesLeaveDatas, setEmployesLeaveDatas] = useState<any[]>([]);//employesLeaveData
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [showModal, setShowModal] = useState<ModalType>(null);
    const [allEmployees, setAllEmployees] = useState<EmployeeWithAttendance[]>([]);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortOption, setSortOption] = useState<SortOption>('none');
    const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('');
    const [graceTimeOffice, setGraceTimeOffice] = useState<string>('');
    const [lunchTime, setLunchTime] = useState<string>('');
    const [isOnSiteSettingsOn, setIsOnSiteSettingsOn] = useState<string>('0');

    const { employeePresent, totalEmployee } = useSelector((state: RootState) => ({
        employeePresent: state.attendance.employeesAttendance?.length || 0,
        totalEmployee: state.attendance.totalEmployee || 0,
    }));
    // console.log("employeePresent ====================================>",employeePresent, totalEmployee )

    const employeesPresentAttendance = useSelector((state: RootState) =>
        state.attendance.employeesAttendance || []
    );

    // All these calculations are date-specific because they depend on state
    // updated by useEffect with date dependency (line 803)
    const lateEarlyCheckInOut = multipleRadialBarData(attendance, dayWiseShifts) || new Map();
    const workingLocationColors = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const weekends = getAllWeekends ? JSON.parse(getAllWeekends) : {};
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);
    const appSettings = useSelector((state: RootState) => state.appSettings);
    const graceTimeFromStore = appSettings.graceTime;

    // Helper function: Get shift for a specific date
    const getShiftForDate = (date: Date) => {
        const dayName = dayjs(date).format('dddd'); // "Monday", "Tuesday", etc.
        return dayWiseShifts.find(s => s.day === dayName) || null;
    };

    // Helper function: Parse grace time
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

    // Helper function: Check if date is weekend or holiday
    const checkIfWeekendOrHoliday = (attendanceDate: Date) => {
        const dayName = dayjs(attendanceDate).format('dddd');
        const isConfiguredWeekend = weekends && weekends[dayName.toLowerCase()] === '0';
        const formattedDate = dayjs(attendanceDate).format('DD/MM/YYYY');
        const isPublicHoliday = allHolidays?.some((h: any) =>
            dayjs(h.date).format('DD/MM/YYYY') === formattedDate
        );
        return isConfiguredWeekend || isPublicHoliday;
    };

    // Helper function: Convert time string to minutes
    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr) return 0;
        // Handle format "1:00 Hrs" or "1:00"
        const cleanTime = timeStr.replace(' Hrs', '').trim();
        const [hoursStr, minutesStr] = cleanTime.split(':');
        const hours = parseInt(hoursStr, 10) || 0;
        const minutes = parseInt(minutesStr, 10) || 0;
        return hours * 60 + minutes;
    };

    // Transform attendance data to match the format expected by donutaDataLabel
    const attendanceForDonut = attendance.map(att => ({
        id: att.id,
        date: dayjs(att.checkIn).format('DD MMM YYYY'),
        day: dayjs(att.checkIn).format('dddd'),
        checkIn: att.checkIn,
        checkOut: att.checkOut
    }));

    // Filter leaves and holidays for the selected date
    const currentDateLeaves = useSelector((state: RootState) =>
        state?.attendanceStats?.filteredLeaves?.filter((leave: any) =>
            dayjs(leave.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
        ) || []
    );

    const currentDateHolidays = allHolidays?.filter((holiday: any) =>
        dayjs(holiday.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ) || [];

    // Check if the selected date is a weekend
    const isWeekend = weekends && weekends[date.format('dddd').toLowerCase()] === '0' ? 1 : 0;

    const extraDays = donutaDataLabel(
        attendanceForDonut,
        currentDateLeaves,
        currentDateHolidays,
        false,
        isWeekend
    )?.get(EXTRA_DAYS) || 0;

    // Calculate late check-in count: employees who checked in after (shift check-in time + grace time)
    const lateCheckInsCount = attendance.filter(att => {
        if (!att.checkIn) return false;

        const attendanceDate = new Date(att.checkIn);

        // Get shift for this date
        const shift = getShiftForDate(attendanceDate);
        const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

        if (!shiftCheckIn) return false;

        // Use on-site grace time for on-site employees, office grace time for others
        const workingMethod = att.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
        const isOnSite = workingMethod?.includes("onsite");

        // If on-site settings is ON, skip on-site employees from late check-in
        if (isOnSiteSettingsOn === '1' && isOnSite) return false;
        const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
        const graceTime = parseGraceTime(graceTimeStr);

        // Create expected check-in time with grace period for the attendance date
        const expectedCheckIn = dayjs(att.checkIn)
            .startOf('day')
            .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
            .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
            .add(graceTime.hours, 'hour')
            .add(graceTime.minutes, 'minute')
            .add(graceTime.seconds, 'second');

        const actualCheckIn = dayjs(att.checkIn);

        // Return true if checked in after expected time (shift time + grace time)
        return actualCheckIn.isAfter(expectedCheckIn);
    }).length;

    // Calculate early check-out count: employees who checked out before shift check-out time
    const earlyCheckOutsCount = attendance.filter(att => {
        if (!att.checkOut) return false;

        const attendanceDate = new Date(att.checkOut);

        // If on-site settings is ON, skip on-site employees from early check-out
        const workingMethod = att.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
        const isOnSite = workingMethod?.includes("onsite");
        if (isOnSiteSettingsOn === '1' && isOnSite) return false;

        // Get shift for this date
        const shift = getShiftForDate(attendanceDate);
        const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

        if (!shiftCheckOut) return false;

        // Create expected check-out time for the attendance date
        const expectedCheckOut = dayjs(att.checkOut)
            .startOf('day')
            .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
            .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

        const actualCheckOut = dayjs(att.checkOut);

        // Return true if checked out before expected time
        return actualCheckOut.isBefore(expectedCheckOut);
    }).length;

    // Calculate absent count.
    // employeesOnLeave from the API is a NUMBER (count), not an array — using .length on it gives
    // undefined which silently makes on-leave employees appear as absent.
    // Use employesLeaveDatas (the ARRAY of leave detail objects) for the correct count.
    const absentCount = Math.max(0, (totalEmployee || 0) - (employesLeaveDatas?.length || 0) - (employeePresent || 0));
    // console.log("lateCheckInsCount ====================================>",lateCheckInsCount, lateEarlyCheckInOut ,extraDays,absentCount)

    const handleCardClick = (type: ModalType) => {
        // console.log('Opening modal: ======================>', type, {
        //     totalEmployees: totalEmployee,
        //     present: employeePresent,
        //     onLeave: employeesOnLeave,
        //     attendanceCount: attendance
        // });
        setShowModal(type);
    };

    const handleCloseModal = () => {
        setShowModal(null);
        setSearchQuery('');
        setSortOption('none');
    };

    const getModalTitle = () => {
        switch (showModal) {
            case 'working': return 'Working Employees';
            case 'leave': return 'Employees on Leave';
            case 'late': return 'Late Check-ins';
            case 'early': return 'Early Check-outs';
            case 'absent': return 'Absent Employees';
            default: return '';
        }
    };

    const filterEmployeesBySearch = (employees: EmployeeWithAttendance[]) => {
        if (!searchQuery.trim()) return employees;

        const query = searchQuery.toLowerCase();
        return employees.filter(emp => {
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            return fullName.includes(query);
        });
    };

    const filterLeaveDataBySearch = (leaveData: any[]) => {
        if (!searchQuery.trim()) return leaveData;

        const query = searchQuery.toLowerCase();
        return leaveData.filter(emp => {
            const employeeData = emp.employee || {};
            const user = employeeData.users || emp.users || {};
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            return fullName.includes(query);
        });
    };

    const sortEmployees = (employees: EmployeeWithAttendance[]) => {
        if (sortOption === 'none') return employees;

        const sorted = [...employees];
        switch (sortOption) {
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            case 'checkin-asc':
                return sorted.sort((a, b) => {
                    const timeA = a.attendance?.checkIn ? new Date(a.attendance.checkIn).getTime() : 0;
                    const timeB = b.attendance?.checkIn ? new Date(b.attendance.checkIn).getTime() : 0;
                    return timeA - timeB;
                });
            case 'checkin-desc':
                return sorted.sort((a, b) => {
                    const timeA = a.attendance?.checkIn ? new Date(a.attendance.checkIn).getTime() : 0;
                    const timeB = b.attendance?.checkIn ? new Date(b.attendance.checkIn).getTime() : 0;
                    return timeB - timeA;
                });
            default:
                return sorted;
        }
    };

    const sortLeaveData = (leaveData: any[]) => {
        if (sortOption === 'none') return leaveData;

        const sorted = [...leaveData];
        switch (sortOption) {
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const userA = (a.employee?.users || a.users) || {};
                    const userB = (b.employee?.users || b.users) || {};
                    const nameA = `${userA.firstName || ''} ${userA.lastName || ''}`.toLowerCase();
                    const nameB = `${userB.firstName || ''} ${userB.lastName || ''}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const userA = (a.employee?.users || a.users) || {};
                    const userB = (b.employee?.users || b.users) || {};
                    const nameA = `${userA.firstName || ''} ${userA.lastName || ''}`.toLowerCase();
                    const nameB = `${userB.firstName || ''} ${userB.lastName || ''}`.toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            case 'checkin-asc':
            case 'checkin-desc':
                // Leave data doesn't have check-in times, so just return as-is
                return sorted;
            default:
                return sorted;
        }
    };

    const getModalContent = () => {
        // console.log('Rendering modal content for:', showModal);
        if (!showModal) return null;

        let employees: EmployeeWithAttendance[] = [];
        let additionalInfo: Record<string, string> = {};

        try {
            switch (showModal) {
                case 'working':
                    employees = allEmployees
                        .filter(emp => employeesPresentAttendance.some(a => a.employeeId === emp._id))
                        .map(emp => ({
                            ...emp,
                            attendance: attendance.find(a => a.employeeId === emp._id)
                        } as EmployeeWithAttendance));
                    break;

                case 'leave':
                    // employeesOnLeave is a NUMBER from the API — use the array employesLeaveDatas for length check
                    if ((employesLeaveDatas?.length ?? 0) === 0) {
                        return <div className="p-3 text-muted">No employees on leave today</div>;
                    }

                    const filteredLeaveData = filterLeaveDataBySearch(employesLeaveDatas);
                    const sortedLeaveData = sortLeaveData(filteredLeaveData);

                    if (sortedLeaveData.length === 0) {
                        return <div className="p-3 text-muted">No employees found matching "{searchQuery}"</div>;
                    }

                    return (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Employee</th>
                                        <th>Designation</th>
                                        <th>Leave Type</th>
                                        <th>Duration</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLeaveData.map(emp => {
                                        const employeeData = emp.employee || {};
                                        const user = employeeData.users || emp.users || {};
                                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                                        const avatarSrc = employeeData.avatar || emp.avatar || toAbsoluteUrl('media/avatars/blank.png');
                                        const leaveType = emp.leaveType || 'Leave';
                                        const startDate = emp.duration?.startDate ? dayjs(emp.duration.startDate).format('MMM D, YYYY') : 'N/A';
                                        const endDate = emp.duration?.endDate ? dayjs(emp.duration.endDate).format('MMM D, YYYY') : 'N/A';
                                        const isSameDay = startDate === endDate;
                                        const reason = emp.reason || '';

                                        return (
                                            <tr key={emp.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <Image
                                                            src={avatarSrc}
                                                            roundedCircle
                                                            width="40"
                                                            height="40"
                                                            className="me-3"
                                                            alt={fullName}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = toAbsoluteUrl('media/avatars/blank.png');
                                                            }}
                                                        />
                                                        <div>
                                                            <div className="fw-bold">{fullName || 'Unnamed Employee'}</div>
                                                            <small className="text-muted">{employeeData.employeeCode || emp.employeeCode || ''}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{employeeData.designations?.role || emp.designations?.role || 'N/A'}</td>
                                                <td>
                                                    <span className="badge bg-warning text-dark">
                                                        {leaveType}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-calendar3 me-2"></i>
                                                        {isSameDay ? startDate : `${startDate} to ${endDate}`}
                                                    </div>
                                                </td>
                                                <td>
                                                    {reason && (
                                                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={reason}>
                                                            <i className="bi bi-chat-square-text me-1"></i>
                                                            {reason}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                case 'late':
                    // Late check-in: employees who checked in after (shift check-in time + grace time)
                    const lateCheckInEmployees = allEmployees.filter(emp => {
                        const empAttendance = attendance.find(a => a.employeeId === emp._id);

                        if (!empAttendance?.checkIn) return false;

                        const attendanceDate = new Date(empAttendance.checkIn);

                        // Get shift for this date
                        const shift = getShiftForDate(attendanceDate);
                        const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

                        if (!shiftCheckIn) return false;

                        // Use on-site grace time for on-site employees, office grace time for others
                        const workingMethod = empAttendance.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                        const isOnSite = workingMethod?.includes("onsite");

                        // If on-site settings is ON, skip on-site employees from late check-in
                        if (isOnSiteSettingsOn === '1' && isOnSite) return false;
                        const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
                        const graceTime = parseGraceTime(graceTimeStr);

                        // Create expected check-in time with grace period for the attendance date
                        const expectedCheckIn = dayjs(empAttendance.checkIn)
                            .startOf('day')
                            .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
                            .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
                            .add(graceTime.hours, 'hour')
                            .add(graceTime.minutes, 'minute')
                            .add(graceTime.seconds, 'second');

                        const actualCheckIn = dayjs(empAttendance.checkIn);
                        const isLate = actualCheckIn.isAfter(expectedCheckIn);

                        if (isLate) {
                            const lateByMinutes = actualCheckIn.diff(expectedCheckIn, 'minute');
                            const lateHours = Math.floor(lateByMinutes / 60);
                            const lateMins = lateByMinutes % 60;
                            additionalInfo[emp._id] = `Late by ${lateHours > 0 ? lateHours + 'h ' : ''}${lateMins}m (Checked in at ${actualCheckIn.format('h:mm A')})`;
                        }

                        return isLate;
                    });

                    employees = lateCheckInEmployees.map(emp => ({
                        ...emp,
                        attendance: attendance.find(a => a.employeeId === emp._id)
                    }));

                    break;

                case 'early':
                    // Early check-out: employees who checked out before shift check-out time
                    const earlyCheckOutEmployees = allEmployees.filter(emp => {
                        const empAttendance = attendance.find(a => a.employeeId === emp._id);

                        if (!empAttendance?.checkOut) return false;

                        const attendanceDate = new Date(empAttendance.checkOut);

                        // If on-site settings is ON, skip on-site employees from early check-out
                        const workingMethod = empAttendance.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                        const isOnSite = workingMethod?.includes("onsite");
                        if (isOnSiteSettingsOn === '1' && isOnSite) return false;

                        // Get shift for this date
                        const shift = getShiftForDate(attendanceDate);
                        const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

                        if (!shiftCheckOut) return false;

                        // Create expected check-out time for the attendance date
                        const expectedCheckOut = dayjs(empAttendance.checkOut)
                            .startOf('day')
                            .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
                            .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

                        const actualCheckOut = dayjs(empAttendance.checkOut);
                        const isEarly = actualCheckOut.isBefore(expectedCheckOut);

                        if (isEarly) {
                            const earlyByMinutes = expectedCheckOut.diff(actualCheckOut, 'minute');
                            const earlyHours = Math.floor(earlyByMinutes / 60);
                            const earlyMins = earlyByMinutes % 60;
                            additionalInfo[emp._id] = `Early by ${earlyHours > 0 ? earlyHours + 'h ' : ''}${earlyMins}m (Checked out at ${actualCheckOut.format('h:mm A')})`;
                        }

                        return isEarly;
                    });

                    employees = earlyCheckOutEmployees.map(emp => ({
                        ...emp,
                        attendance: attendance.find(a => a.employeeId === emp._id)
                    }));

                    break;

                case 'absent':
                    try {
                        // console.log('Calculating absent employees with:', {
                        //     allEmployees: allEmployees?.length || 0,
                        //     employeesPresentAttendance: employeesPresentAttendance?.length || 0,
                        //     employeesOnLeave: employeesOnLeave?.length || 0
                        // });

                        const presentEmployeeIds = new Set(
                            (employeesPresentAttendance || []).map(a => a.employeeId)
                        );

                        // Make sure employeesOnLeave is an array and extract employee IDs properly
                        const safeEmployeesOnLeave = Array.isArray(employeesOnLeave) ?
                            employeesOnLeave : [];

                        // Extract employee IDs from leave data - check multiple possible fields
                        const onLeaveIds = new Set(
                            safeEmployeesOnLeave.map(e => {
                                // Try to get employee ID from different possible fields
                                return e?.employee?.id || e?.employeeId || e?.employee?._id || e?.id;
                            }).filter(Boolean)
                        );

                        // Also check employesLeaveDatas for employee IDs
                        employesLeaveDatas.forEach(leave => {
                            const empId = leave?.employee?.id || leave?.employeeId || leave?.employee?._id;
                            if (empId) {
                                onLeaveIds.add(empId);
                            }
                        });

                        employees = (allEmployees || []).filter(emp =>
                            emp?._id &&
                            !presentEmployeeIds.has(emp._id) &&
                            !onLeaveIds.has(emp._id)
                        );

                        // console.log('Absent employees calculation result:', {
                        //     totalEmployees: allEmployees?.length || 0,
                        //     presentCount: presentEmployeeIds.size,
                        //     onLeaveCount: onLeaveIds.size,
                        //     absentCount: employees.length,
                        //     absentEmployees: employees.map(e => `${e.firstName} ${e.lastName}`)
                        // });
                    } catch (error) {
                        console.error('Error calculating absent employees:', error);
                        // Provide empty array if there was an error
                        employees = [];
                    }
                    break;

                case 'extra':
                    // Extra days: Employees who worked on weekends or holidays
                    const extraDayEmployees = allEmployees.filter(emp => {
                        const empAttendance = attendance.find(a => a.employeeId === emp._id);
                        if (!empAttendance?.checkIn || !empAttendance?.checkOut) return false;

                        // Check if the attendance date is a weekend or holiday
                        const attendanceDate = new Date(empAttendance.checkIn);
                        const dayName = dayjs(attendanceDate).format('dddd');

                        // Check if it's a configured weekend
                        const isConfiguredWeekend = weekends && weekends[dayName.toLowerCase()] === '0';

                        // Check if it's a public holiday
                        const formattedDate = dayjs(attendanceDate).format('DD/MM/YYYY');
                        const isPublicHoliday = allHolidays.some((h: any) =>
                            dayjs(h.date).format('DD/MM/YYYY') === formattedDate
                        );

                        return isConfiguredWeekend || isPublicHoliday;
                    });

                    employees = extraDayEmployees.map(emp => ({
                        ...emp,
                        attendance: attendance.find(a => a.employeeId === emp._id)
                    }));

                    break;

                default:
                    return <div className="p-3 text-muted">No data available</div>;
            }

            // Apply search filter and sort for all non-leave modals
            const filteredEmployees = filterEmployeesBySearch(employees);
            const sortedEmployees = sortEmployees(filteredEmployees);

            if (!sortedEmployees || sortedEmployees.length === 0) {
                return <div className="p-3 text-muted">
                    {searchQuery.trim() ? `No employees found matching "${searchQuery}"` : 'No employees found in this category'}
                </div>;
            }

            // All modals use 3-column layout
            return (
                <Row className="g-3">
                    {sortedEmployees.map(emp => (
                        <Col md={4} key={emp._id}>
                            <div className="d-flex align-items-center p-3 rounded" style={{ transition: 'all 0.2s', border: '1px solid #9D4141' }}>
                                <Image
                                    src={emp.avatar || toAbsoluteUrl('media/avatars/blank.png')}
                                    roundedCircle
                                    width={45}
                                    height={45}
                                    className="me-3"
                                    alt={`${emp.firstName || ''} ${emp.lastName || ''}`}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = toAbsoluteUrl('media/avatars/blank.png');
                                    }}
                                />
                                <div className="flex-grow-1">
                                    <div className="fw-bold">{emp.firstName} {emp.lastName}</div>
                                    <div className="text-muted small">{emp.designation || 'No designation'}</div>
                                    {additionalInfo[emp._id] && (
                                        <div className="text-primary small mt-1">
                                            <i className="bi bi-info-circle me-1"></i>
                                            {additionalInfo[emp._id]}
                                        </div>
                                    )}
                                    {!additionalInfo[emp._id] && (emp.attendance?.checkIn || emp.attendance?.checkOut) && (
                                        <div className="d-flex align-items-center gap-2 small mt-1">
                                            {emp.attendance?.checkIn && emp.attendance?.checkOut && (() => {
                                                // Check if weekend/holiday worker
                                                const attendanceDate = new Date(emp.attendance.checkIn);
                                                const isWeekendOrHoliday = checkIfWeekendOrHoliday(attendanceDate);

                                                // Get shift for this date
                                                const shift = getShiftForDate(attendanceDate);
                                                const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;
                                                const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

                                                // Check working method for on-site
                                                const workingMethod = emp.attendance?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                                                const isOnSite = workingMethod?.includes("onsite");

                                                // If on-site settings is ON and employee is on-site, always show green
                                                const skipLateEarlyCheck = (isOnSiteSettingsOn === '1' && isOnSite) || isWeekendOrHoliday;

                                                let isLateCheckIn = false;
                                                let isEarlyCheckOut = false;

                                                if (!skipLateEarlyCheck && shiftCheckIn && shiftCheckOut) {
                                                    // Calculate late check-in
                                                    const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
                                                    const graceTime = parseGraceTime(graceTimeStr);

                                                    const expectedCheckIn = dayjs(emp.attendance.checkIn)
                                                        .startOf('day')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
                                                        .add(graceTime.hours, 'hour')
                                                        .add(graceTime.minutes, 'minute')
                                                        .add(graceTime.seconds, 'second');

                                                    const actualCheckIn = dayjs(emp.attendance.checkIn);
                                                    isLateCheckIn = actualCheckIn.isAfter(expectedCheckIn);

                                                    // Calculate early check-out
                                                    const expectedCheckOut = dayjs(emp.attendance.checkOut)
                                                        .startOf('day')
                                                        .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
                                                        .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

                                                    const actualCheckOut = dayjs(emp.attendance.checkOut);
                                                    isEarlyCheckOut = actualCheckOut.isBefore(expectedCheckOut);
                                                }

                                                return (
                                                    <>
                                                        <span className={isLateCheckIn ? "text-danger" : "text-success"} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            <i className="bi bi-clock me-1"></i>
                                                            {dayjs(emp.attendance.checkIn).format('h:mm A')}
                                                        </span>
                                                        <span className={isEarlyCheckOut ? "text-danger" : "text-success"} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            <i className="bi bi-clock-fill me-1"></i>
                                                            {dayjs(emp.attendance.checkOut).format('h:mm A')}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                            {emp.attendance?.checkIn && !emp.attendance?.checkOut && (() => {
                                                // Check if weekend/holiday worker
                                                const attendanceDate = new Date(emp.attendance.checkIn);
                                                const isWeekendOrHoliday = checkIfWeekendOrHoliday(attendanceDate);

                                                // Get shift for this date
                                                const shift = getShiftForDate(attendanceDate);
                                                const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

                                                // Check working method for on-site
                                                const workingMethod = emp.attendance?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                                                const isOnSite = workingMethod?.includes("onsite");

                                                // If on-site settings is ON and employee is on-site, always show green
                                                const skipLateCheck = (isOnSiteSettingsOn === '1' && isOnSite) || isWeekendOrHoliday;

                                                let isLateCheckIn = false;

                                                if (!skipLateCheck && shiftCheckIn) {
                                                    // Calculate late check-in
                                                    const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
                                                    const graceTime = parseGraceTime(graceTimeStr);

                                                    const expectedCheckIn = dayjs(emp.attendance.checkIn)
                                                        .startOf('day')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
                                                        .add(graceTime.hours, 'hour')
                                                        .add(graceTime.minutes, 'minute')
                                                        .add(graceTime.seconds, 'second');

                                                    const actualCheckIn = dayjs(emp.attendance.checkIn);
                                                    isLateCheckIn = actualCheckIn.isAfter(expectedCheckIn);
                                                }

                                                return (
                                                    <span className={isLateCheckIn ? "text-danger" : "text-success"} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                        <i className="bi bi-clock me-1"></i>
                                                        {dayjs(emp.attendance.checkIn).format('h:mm A')}
                                                    </span>
                                                );
                                            })()}
                                            {showModal === 'working' && emp.attendance?.workingMethod && (
                                                <span
                                                    style={{
                                                        color:
                                                            emp.attendance.workingMethod.type === 'Office' ? workingLocationColors?.officeColor :
                                                            emp.attendance.workingMethod.type === 'Hybrid' ? workingLocationColors?.remoteColor :
                                                            emp.attendance.workingMethod.type === 'On-site' ? workingLocationColors?.onSiteColor : '#6c757d',
                                                        fontWeight: '600',
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {emp.attendance.workingMethod.type}
                                                    {emp.attendance.workingMethod.type === 'On-site' && emp.attendance.checkInLocation && emp.attendance.latitude && emp.attendance.longitude && (
                                                        <OverlayTrigger
                                                            placement="top"
                                                            overlay={
                                                                <Tooltip id={`tooltip-${emp._id}`}>
                                                                    {emp.attendance.checkInLocation}
                                                                </Tooltip>
                                                            }
                                                        >
                                                            <a
                                                                href={`https://www.google.com/maps?q=${emp.attendance.latitude},${emp.attendance.longitude}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    marginLeft: '6px',
                                                                    textDecoration: 'none',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    verticalAlign: 'middle'
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <img
                                                                    src={locationIcon}
                                                                    alt="location"
                                                                    style={{
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        objectFit: 'contain',
                                                                        display: 'block'
                                                                    }}
                                                                />
                                                            </a>
                                                        </OverlayTrigger>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            );

        } catch (err) {
            console.error('Error in getModalContent:', err);
            return <div className="p-3 text-danger">Error loading data. Please try again.</div>;
        }
    };



    useEffect(() => {
        let isMounted = true;

        async function fetchEmployeeData() {
            try {
                setIsLoading(true);
                setError(null);

                const { data: { employees } } = await fetchAllEmployees();
                // Fetch data for the selected date
                const response = await fetchEmployeesOnLeaveToday(date.format('YYYY-MM-DD'));
                const employeesOnLeave = response?.data?.employeesOnLeave || [];
                const employesLeaveData = response?.data?.employeeLeaveDetails || [];
                const allAttendance = await fetchEmpsAttendance(date);
                //     employees:employees,
                //     rawResponse: response,
                //     employesLeaveData:response?.data?.employeeLeaveDetails,
                //     employeesOnLeave: employeesOnLeave,
                //     count: employeesOnLeave.length,
                //     firstItem: employeesOnLeave[0]
                // });


                // console.log('Transforming employees data. Total employees:', employees.length);
                // Transform employees to match EmployeeWithAttendance interface
                const transformedEmployees = employees.map((emp: any) => ({
                    _id: emp.id || '',
                    firstName: emp.users?.firstName || 'Unknown',
                    lastName: emp.users?.lastName || 'Employee',
                    designation: emp.designations?.role || 'No designation',
                    avatar: emp.avatar || null,
                    isActive: emp.isActive ?? true,  // Default to true if not specified
                }));

                if (isMounted) {
                    // console.log('Setting state with data:', {
                    //     allEmployees: transformedEmployees.length,
                    //     employeesOnLeave: employeesOnLeave.length,
                    //     attendance: allAttendance.length
                    // });

                    // Filter only active employees for state
                    const activeEmployees = transformedEmployees.filter((emp: any) => emp.isActive !== false);

                    setAllEmployees(activeEmployees);
                    setEmployeesOnLeave(employeesOnLeave);
                    setEmployesLeaveDatas(employesLeaveData);
                    setAttendance(allAttendance);
                    dispatch(saveTotalEmployeeCount(activeEmployees.length));
                }
                // console.log("employesLeaveData:=============>", employesLeaveData)
            } catch (err) {
                console.error('Error fetching employee data:', err);
                if (isMounted) {
                    setError('Failed to load employee data. Please refresh the page to try again.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchEmployeeData();

        return () => {
            isMounted = false;
        };
    }, [dispatch, date]); // Add date to dependencies

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

    // Fetch grace time for office, on-site, lunch time and on-site settings
    useEffect(() => {
        async function fetchTimeConfiguration() {
            try {
                const { data: { configuration } } = await fetchConfiguration('leave management');
                const leaveConfig = JSON.parse(configuration.configuration || '{}');
                const graceTimeOfficeStr = leaveConfig?.['Grace Time'] || '00:30:00 Hrs';
                const graceTimeOnSiteStr = leaveConfig?.['Grace Time - On Site'] || '00:10:00 Hrs';
                const lunchTimeStr = leaveConfig?.['Lunch Time'] || '1:00 Hrs';
                const onSiteSettingsValue = leaveConfig?.[onSiteAndHolidayWeekendSettingsOnOffName] || '0';
                setGraceTimeOffice(graceTimeOfficeStr.replace(' Hrs', '').trim());
                setGraceTimeOnSite(graceTimeOnSiteStr.replace(' Hrs', '').trim());
                setLunchTime(lunchTimeStr);
                setIsOnSiteSettingsOn(onSiteSettingsValue);
            } catch (error) {
                console.error('Failed to fetch time configuration:', error);
                setGraceTimeOffice('00:30:00'); // fallback
                setGraceTimeOnSite('00:10:00'); // fallback
                setLunchTime('1:00 Hrs'); // fallback
                setIsOnSiteSettingsOn('0'); // fallback
            }
        }
        fetchTimeConfiguration();
    }, []);

    const cardsData = [
        { type: 'working' as const, img: toAbsoluteUrl('media/svg/misc/working-employees.svg'), stat: `${employeePresent || 0}/${totalEmployee || 0}`, label: 'Working employees' },
        { type: 'leave' as const, img: toAbsoluteUrl('media/svg/misc/on-leave.svg'), stat: `${employesLeaveDatas?.length || 0}`, label: 'On Leave' },
        { type: 'late' as const, img: toAbsoluteUrl('media/svg/misc/late.svg'), stat: `${lateCheckInsCount}`, label: 'Late Check-ins' },
        { type: 'early' as const, img: toAbsoluteUrl('media/svg/misc/checkout.svg'), stat: `${earlyCheckOutsCount}`, label: 'Early check-out' },
        { type: 'extra' as const, img: toAbsoluteUrl('media/svg/misc/extra-days.svg'), stat: `${extraDays || 0}`, label: 'Extra Day' },
        { type: 'absent' as const, img: toAbsoluteUrl('media/svg/misc/absent.svg'), stat: `${absentCount}`, label: 'Absent' },
    ];

    // if (isLoading) {
    //     return (
    //         <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
    //             <Spinner animation="border" role="status">
    //                 <span className="visually-hidden">Loading...</span>
    //             </Spinner>
    //         </div>
    //     );
    // }

    if (error) {
        return (
            <Alert variant="danger" className="mt-3">
                {error}
            </Alert>
        );
    }
    // console.log("employesLeaveDatas==================>>>>>>", employesLeaveDatas)
    return (
        <>
            <Row className="g-4 mt-3">
                {cardsData.map((card, index) => (
                    <Col md={4} key={index}>
                        <Card
                            className="text-center border-0 shadow-sm p-1"
                            style={{ borderRadius: '10px', height: '100%', cursor: 'pointer' }}
                            onClick={() => handleCardClick(card.type)}
                        >
                            <Card.Body>
                                <div className="d-flex align-items-center justify-content-start mb-2">
                                    <span className='fs-4 text-gray-800 fw-bold' style={{ marginRight: '8px' }}>
                                        <img src={card.img} alt={card.label} />
                                    </span>
                                    <span className="fs-4 fw-bold" style={{ color: '#1a1a1a' }}>{card.stat || 0}</span>
                                </div>
                                <Card.Text className="fw-semibold text-muted" style={{ fontSize: '1rem', color: '#1a1a1a', textAlign: 'start' }}>
                                    {card.label}
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <CustomModal
                show={showModal !== null}
                onHide={handleCloseModal}
                title={getModalTitle()}
                size="xl"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOption={sortOption}
                onSortChange={setSortOption}
            >
                {getModalContent()}
            </CustomModal>
        </>
    );
}

export default Overview;