import { useCallback, useEffect, useState, memo } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { RootState } from "@redux/store";
import { fetchAllEmployees, fetchEmployeesOnLeaveToday } from "@services/employee";
import { fetchEmpsAttendance } from "@pages/employee/attendance/admin/views/overview/DailyAttendance";
import { saveTotalEmployeeCount, saveEmployeesAttendance } from "@redux/slices/attendance";
import { Attendance } from "@models/employee";
import { EARLY_CHECKOUT, EXTRA_DAYS, onSiteAndHolidayWeekendSettingsOnOffName, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { donutaDataLabel, multipleRadialBarData } from "@utils/statistics";
import { fetchDayWiseShifts } from "@services/dayWiseShift";
import { fetchConfiguration } from "@services/company";
// import { EARLY_CHECKOUT } from "@constants/statistics";
// import { multipleRadialBarData } from "@utils/statistics";
import dayjs from "dayjs";
import { toAbsoluteUrl } from "@metronic/helpers";
import { Image, Modal, Button, Form, Dropdown, OverlayTrigger, Tooltip, Row, Col, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { hasPermission } from "@utils/authAbac";
import locationIcon from "@metronic/assets/sidepanelicons/location_11383462.png";

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
  avatar?: string | null;
  isActive?: boolean;
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

const DashboardDailyAttendanceOverview = () => {
  const dispatch = useDispatch();
  const [date, setDate] = useState(dayjs());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>([]);
  const [employesLeaveDatas, setEmployesLeaveDatas] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeWithAttendance[]>([]);
  const [showModal, setShowModal] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('none');
  const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);
  const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('');
  const [graceTimeOffice, setGraceTimeOffice] = useState<string>('');
  const [lunchTime, setLunchTime] = useState<string>('');
  const [isOnSiteSettingsOn, setIsOnSiteSettingsOn] = useState<string>('0');

  const { employeePresent, totalEmployee } = useSelector((state: RootState) => ({
    employeePresent: state.attendance.employeesAttendance?.length || 0,
    totalEmployee: state.attendance.totalEmployee || 0,
  }), shallowEqual);

  const appSettings = useSelector((state: RootState) => state.appSettings);
  const graceTimeFromStore = appSettings.graceTime;
  const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);

  const employeesPresentAttendance = useSelector((state: RootState) =>
    state.attendance.employeesAttendance || [], shallowEqual
  );
  const navigate = useNavigate();
  const workingLocationColors = useSelector((state: RootState) => state?.customColors?.workingLocation, shallowEqual);
  // Only check if rolesAndPermissions is loaded, not the entire object
  const rolesAndPermissionsLoaded = useSelector((state: RootState) =>
    state.rolesAndPermissions && Object.keys(state.rolesAndPermissions).length > 0
  );
  const lateEarlyCheckInOut = multipleRadialBarData(attendance, dayWiseShifts) || new Map();

  // Get current employee to access weekend configuration
  const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee, shallowEqual);

  // Extract only the weekendConfig to prevent unnecessary re-renders
  const weekendConfig = currentEmployee?.branches?.workingAndOffDays
    ? JSON.parse(currentEmployee.branches.workingAndOffDays)
    : {};

  // Helper functions for dynamic shift-based calculations
  const getShiftForDate = (date: Date) => {
    const dayName = dayjs(date).format('dddd');
    return dayWiseShifts.find(s => s.day === dayName) || null;
  };

  function parseGraceTime(graceTime: string | null) {
    if (!graceTime) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    const timePart = graceTime.replace(' Hrs', '').trim();
    const [hoursStr, minutesStr, secondsStr] = timePart.split(':');
    return {
      hours: parseInt(hoursStr, 10) || 0,
      minutes: parseInt(minutesStr, 10) || 0,
      seconds: parseInt(secondsStr, 10) || 0,
    };
  }

  const checkIfWeekendOrHoliday = (attendanceDate: Date) => {
    const dayName = dayjs(attendanceDate).format('dddd');
    const isConfiguredWeekend = weekendConfig && weekendConfig[dayName.toLowerCase()] === '0';
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

  // Calculate absent count
  const absentCount = Math.max(0, (totalEmployee || 0) - (employeesOnLeave?.length || 0) - (employeePresent || 0));

  // Modal handlers
  const handleCardClick = (type: ModalType) => {
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
      case 'extra': return 'Extra Day Working';
      case 'absent': return 'Absent Employees';
      default: return '';
    }
  };

  // Search and filter functions
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

  // Sort functions
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
        return sorted;
      default:
        return sorted;
    }
  };

  // Get FULL employees for each category (used by both cards and modals)
  const getAllWorkingEmployees = () => {
    return allEmployees
      .filter(emp => employeesPresentAttendance.some(a => a.employeeId === emp._id))
      .map(emp => ({
        ...emp,
        attendance: attendance.find(a => a.employeeId === emp._id)
      }));
  };

  const getAllLeaveEmployees = () => {
    return employesLeaveDatas;
  };

  const getAllAbsentEmployees = () => {
    const presentEmployeeIds = new Set(
      (employeesPresentAttendance || []).map(a => a.employeeId)
    );

    const safeEmployeesOnLeave = Array.isArray(employeesOnLeave) ? employeesOnLeave : [];
    const onLeaveIds = new Set(
      safeEmployeesOnLeave.map(e => {
        return e?.employee?.id || e?.employeeId || e?.employee?._id || e?.id;
      }).filter(Boolean)
    );

    employesLeaveDatas.forEach(leave => {
      const empId = leave?.employee?.id || leave?.employeeId || leave?.employee?._id;
      if (empId) {
        onLeaveIds.add(empId);
      }
    });

    return (allEmployees || [])
      .filter(emp =>
        emp?._id &&
        !presentEmployeeIds.has(emp._id) &&
        !onLeaveIds.has(emp._id)
      );
  };

  const getAllExtraDayEmployees = () => {
    // Get employees who worked on weekends or holidays
    // Must have BOTH checkIn AND checkOut to count as extra day (matching Overview.tsx logic)
    return allEmployees
      .filter(emp => {
        const empAttendance = attendance.find(a => a.employeeId === emp._id);

        // Must have both checkIn and checkOut
        if (!empAttendance?.checkIn || !empAttendance?.checkOut) return false;

        // Check if this attendance is on a weekend or holiday
        const attendanceDate = new Date(empAttendance.checkIn);
        return checkIfWeekendOrHoliday(attendanceDate);
      })
      .map(emp => ({
        ...emp,
        attendance: attendance.find(a => a.employeeId === emp._id)
      }));
  };

  const getAllLateCheckInEmployees = () => {
    const lateEmployees = allEmployees.filter(emp => {
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

      // Return true if checked in after expected time (shift time + grace time)
      return actualCheckIn.isAfter(expectedCheckIn);
    });

    return lateEmployees.map(emp => ({
      ...emp,
      attendance: attendance.find(a => a.employeeId === emp._id)
    }));
  };

  const getAllEarlyCheckOutEmployees = () => {
    const earlyEmployees = allEmployees.filter(emp => {
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

      // Return true if checked out before expected time
      return actualCheckOut.isBefore(expectedCheckOut);
    });

    return earlyEmployees.map(emp => ({
      ...emp,
      attendance: attendance.find(a => a.employeeId === emp._id)
    }));
  };

  // Modal content generator
  const getModalContent = () => {
    if (!showModal) return null;

    let employees: EmployeeWithAttendance[] = [];
    let additionalInfo: Record<string, string> = {};

    try {
      switch (showModal) {
        case 'working':
          employees = getAllWorkingEmployees();
          break;

        case 'leave':
          const allLeaveData = getAllLeaveEmployees();

          if (allLeaveData.length === 0) {
            return <div className="p-3 text-muted">No employees on leave today</div>;
          }

          const filteredLeaveData = filterLeaveDataBySearch(allLeaveData);
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
                        <td>{employeeData.designations?.role || emp.designations?.role || 'N/A'}</td>
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
          employees = getAllLateCheckInEmployees();

          // Add additional info for late check-ins
          employees.forEach(emp => {
            if (emp.attendance?.checkIn) {
              const attendanceDate = new Date(emp.attendance.checkIn);
              const shift = getShiftForDate(attendanceDate);
              const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

              if (shiftCheckIn) {
                // Use on-site grace time for on-site employees, office grace time for others
                const isOnSite = emp.attendance.workingMethod?.type === 'On-site';
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
                const lateByMinutes = actualCheckIn.diff(expectedCheckIn, 'minute');
                const lateHours = Math.floor(lateByMinutes / 60);
                const lateMins = lateByMinutes % 60;
                additionalInfo[emp._id] = `Late by ${lateHours > 0 ? lateHours + 'h ' : ''}${lateMins}m (Checked in at ${actualCheckIn.format('h:mm A')})`;
              }
            }
          });
          break;

        case 'early':
          employees = getAllEarlyCheckOutEmployees();

          // Add additional info for early check-outs
          employees.forEach(emp => {
            if (emp.attendance?.checkOut) {
              const attendanceDate = new Date(emp.attendance.checkOut);
              const shift = getShiftForDate(attendanceDate);
              const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

              if (shiftCheckOut) {
                const expectedCheckOut = dayjs(emp.attendance.checkOut)
                  .startOf('day')
                  .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
                  .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

                const actualCheckOut = dayjs(emp.attendance.checkOut);
                const earlyByMinutes = expectedCheckOut.diff(actualCheckOut, 'minute');
                const earlyHours = Math.floor(earlyByMinutes / 60);
                const earlyMins = earlyByMinutes % 60;
                additionalInfo[emp._id] = `Early by ${earlyHours > 0 ? earlyHours + 'h ' : ''}${earlyMins}m (Checked out at ${actualCheckOut.format('h:mm A')})`;
              }
            }
          });
          break;

        case 'absent':
          employees = getAllAbsentEmployees();
          break;

        case 'extra':
          employees = getAllExtraDayEmployees();
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

  const incrementDate = useCallback(() => {
    setDate(prevDate => prevDate.add(1, 'day'));
  }, []);

  const decrementDate = useCallback(() => {
    setDate(prevDate => prevDate.subtract(1, 'day'));
  }, []);

  // Convert date to string to prevent unnecessary re-renders
  const dateString = date.format('YYYY-MM-DD');

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
        setGraceTimeOffice('00:30:00');
        setGraceTimeOnSite('00:10:00');
        setLunchTime('1:00 Hrs');
        setIsOnSiteSettingsOn('0');
      }
    }
    fetchTimeConfiguration();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Wait for roles and permissions to be loaded
    if (!rolesAndPermissionsLoaded) {
      return;
    }

    async function fetchEmployeeData() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { employees } } = await fetchAllEmployees();
        const response = await fetchEmployeesOnLeaveToday(dateString);
        const employeesOnLeave = response?.data?.employeesOnLeave || [];
        const employesLeaveData = response?.data?.employeeLeaveDetails || [];
        const allAttendance = await fetchEmpsAttendance(dayjs(dateString));

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
          // Filter only active employees for state
          const activeEmployees = transformedEmployees.filter((emp: any) => emp.isActive !== false);

          // Transform attendance data for Redux
          const transformedAttendance = allAttendance.map((att: any) => ({
            id: att.id,
            employeeId: att.employeeId,
            checkIn: att.checkIn,
            checkOut: att.checkOut,
            date: att.date,
            workingMethod: att.workingMethod
          }));

          setAllEmployees(activeEmployees);
          setEmployeesOnLeave(employeesOnLeave);
          setEmployesLeaveDatas(employesLeaveData);
          setAttendance(allAttendance);
          dispatch(saveTotalEmployeeCount(activeEmployees.length));
          dispatch(saveEmployeesAttendance(transformedAttendance));
        }
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
  }, [dispatch, dateString, rolesAndPermissionsLoaded]);

  // Get data for card previews
  const workingEmployees = getAllWorkingEmployees();
  const leaveEmployees = getAllLeaveEmployees();
  const absentEmployees = getAllAbsentEmployees();
  const extraDayEmployees = getAllExtraDayEmployees();
  const lateCheckInEmployees = getAllLateCheckInEmployees();
  const earlyCheckOutEmployees = getAllEarlyCheckOutEmployees();

  // Calculate extra days count from actual data
  const extraDays = extraDayEmployees.length;

  // Debug logging
  console.log('Dashboard Data:', {
    allEmployees: allEmployees.length,
    employeesPresentAttendance: employeesPresentAttendance.length,
    attendance: attendance.length,
    workingEmployees: workingEmployees.length,
    leaveEmployees: leaveEmployees.length,
    absentEmployees: absentEmployees.length,
    extraDayEmployees: extraDayEmployees.length,
    lateCheckInEmployees: lateCheckInEmployees.length,
    earlyCheckOutEmployees: earlyCheckOutEmployees.length
  });

  if (isLoading && allEmployees.length === 0) {
    return (
      <div className="card border-0 rounded-3 mb-5" style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-0 rounded-3 mb-5" style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}>
        <div className="card-body p-3 p-md-4">
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 rounded-3 mb-5" style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}>
      <div className="card-body p-3 p-md-4">
        {/* Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-3">
          <h5 className="fw-semibold mb-0" style={{ fontFamily: 'Barlow', fontSize: 'clamp(18px, 4vw, 20px)', letterSpacing: '0.2px' }}>
            Daily Attendance Overview
          </h5>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            {hasPermission(resourceNameMapWithCamelCase.employee, (permissionConstToUseWithHasPermission.editOthers || permissionConstToUseWithHasPermission.readOthers)) &&
            <button
              type="button"
              className="btn btn-sm"
              style={{
                borderColor: '#9d4141',
                color: '#9d4141',
                fontFamily: 'Inter',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '6px',
                border: '1px solid #9d4141',
                padding: '8px 18px',
                whiteSpace: 'nowrap',
              }}
              onClick = {() => navigate('/employees/attendance-and-leaves')}
            >
              View all
            </button>
}

            {/* Date Navigation - tabs previous and next */}
            <div>
              <button className="btn btn-sm px-0" onClick={decrementDate}>
                <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous day" />
              </button>
              <span className="mx-1 my-1">{date.format('DD MMM, YYYY')}</span>
              <button className="btn btn-sm px-0" onClick={incrementDate}>
                <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next day" />
              </button>
            </div>
          </div>
        </div>

        {/* Working Employees Summary */}
        <div className="rounded-2 p-3 mb-3" style={{ backgroundColor: '#edf2f9', border: '1px solid #edf2f9', cursor: 'pointer' }} onClick={() => handleCardClick('working')}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa fa-users" style={{ fontSize: '20px', color: '#4a5568' }}></i>
            <div>
              <span style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'Inter' }}>{employeePresent || 0}</span>
              <span style={{ fontSize: '14px', color: '#a6b1c0', fontFamily: 'Inter' }}>/{totalEmployee || 0}</span>
            </div>
            <span style={{ fontSize: '14px', fontFamily: 'Inter', marginLeft: '8px' }}>Working Employees</span>
          </div>
        </div>

        {/* Attendance Cards Grid */}
        <div className="row g-2">
          {/* On Leave Card */}
          <div className="col-lg col-md-6 col-sm-6">
            <div className="border rounded-3 h-100" style={{ borderColor: '#dee5ef', minHeight: '80px', cursor: 'pointer' }}>
              <div className="p-3 rounded-top" style={{ backgroundColor: '#edf2f9' }} onClick={() => handleCardClick('leave')}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="fa fa-calendar-times" style={{ fontSize: '20px', color: '#f59e0b' }}></i>
                  <span style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'Inter' }}>{employesLeaveDatas?.length || 0}</span>
                </div>
                <p className="mb-0" style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'Inter' }}>On Leave</p>
              </div>
              <hr className="m-0" style={{ borderColor: '#d9d9d9' }} />
              <div
                className="p-3"
                style={{
                  maxHeight: '160px',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9d4141 #f0f0f0'
                }}
              >
                <div className="d-flex flex-column gap-2">
                  {leaveEmployees.length > 0 ? (
                    leaveEmployees.map((emp: any, index: number) => {
                      const employeeData = emp.employee || {};
                      const user = employeeData.users || emp.users || {};
                      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                      const avatarSrc = employeeData.avatar || emp.avatar || toAbsoluteUrl('media/avatars/blank.png');

                      return (
                        <div key={emp.id || index} className="d-flex align-items-center gap-2">
                          <Image
                            src={avatarSrc}
                            roundedCircle
                            width="24"
                            height="24"
                            alt={fullName}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = toAbsoluteUrl('media/avatars/blank.png');
                            }}
                          />
                          <span style={{ fontSize: '15px', fontFamily: 'Inter' }}>{fullName || 'Unnamed Employee'}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '14px', fontFamily: 'Inter', color: '#a6b1c0' }}>No employees on leave</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Absent Card */}
          <div className="col-lg col-md-6 col-sm-6">
            <div className="border rounded-3 h-100" style={{ borderColor: '#dee5ef', minHeight: '80px', cursor: 'pointer' }}>
              <div className="p-3 rounded-top" style={{ backgroundColor: '#edf2f9' }} onClick={() => handleCardClick('absent')}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="fa fa-user-times" style={{ fontSize: '20px', color: '#ef4444' }}></i>
                  <span style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'Inter' }}>{absentCount}</span>
                </div>
                <p className="mb-0" style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'Inter' }}>Absent</p>
              </div>
              <hr className="m-0" style={{ borderColor: '#d9d9d9' }} />
              <div
                className="p-3"
                style={{
                  maxHeight: '160px',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9d4141 #f0f0f0'
                }}
              >
                <div className="d-flex flex-column gap-2">
                  {absentEmployees.length > 0 ? (
                    absentEmployees.map((emp, index) => (
                      <div key={emp._id || index} className="d-flex align-items-center gap-2">
                        <Image
                          src={emp.avatar || toAbsoluteUrl('media/avatars/blank.png')}
                          roundedCircle
                          width="24"
                          height="24"
                          alt={`${emp.firstName} ${emp.lastName}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = toAbsoluteUrl('media/avatars/blank.png');
                          }}
                        />
                        <span style={{ fontSize: '15px', fontFamily: 'Inter' }}>{emp.firstName} {emp.lastName}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '14px', fontFamily: 'Inter', color: '#a6b1c0' }}>No absent employees</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Extra Day Working Card */}
          <div className="col-lg col-md-6 col-sm-6">
            <div className="border rounded-3 h-100" style={{ borderColor: '#dee5ef', minHeight: '80px', cursor: 'pointer' }}>
              <div className="p-3 rounded-top" style={{ backgroundColor: '#edf2f9' }} onClick={() => handleCardClick('extra')}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="fa fa-briefcase" style={{ fontSize: '20px', color: '#3b82f6' }}></i>
                  <span style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'Inter' }}>{extraDays || 0}</span>
                </div>
                <p className="mb-0" style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'Inter' }}>Extra Day Working</p>
              </div>
              <hr className="m-0" style={{ borderColor: '#d9d9d9' }} />
              <div
                className="p-3"
                style={{
                  maxHeight: '160px',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9d4141 #f0f0f0'
                }}
              >
                <div className="d-flex flex-column gap-2">
                  {extraDayEmployees.length > 0 ? (
                    extraDayEmployees.map((emp, index) => (
                      <div key={emp._id || index} className="d-flex align-items-center gap-2">
                        <Image
                          src={emp.avatar || toAbsoluteUrl('media/avatars/blank.png')}
                          roundedCircle
                          width="24"
                          height="24"
                          alt={`${emp.firstName} ${emp.lastName}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = toAbsoluteUrl('media/avatars/blank.png');
                          }}
                        />
                        <span style={{ fontSize: '15px', fontFamily: 'Inter' }}>{emp.firstName} {emp.lastName}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '14px', fontFamily: 'Inter', color: '#a6b1c0' }}>No extra day working</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Late Check-in Card */}
          <div className="col-lg col-md-6 col-sm-6">
            <div className="border rounded-3 h-100" style={{ borderColor: '#dee5ef', minHeight: '80px', cursor: 'pointer' }}>
              <div className="p-3 rounded-top" style={{ backgroundColor: '#edf2f9' }} onClick={() => handleCardClick('late')}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="fa fa-clock" style={{ fontSize: '20px', color: '#8b5cf6' }}></i>
                  <span style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'Inter' }}>{lateCheckInsCount}</span>
                </div>
                <p className="mb-0" style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'Inter' }}>Late Check-in</p>
              </div>
              <hr className="m-0" style={{ borderColor: '#d9d9d9' }} />
              <div
                className="p-3"
                style={{
                  maxHeight: '160px',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9d4141 #f0f0f0'
                }}
              >
                <div className="d-flex flex-column gap-2">
                  {lateCheckInEmployees.length > 0 ? (
                    lateCheckInEmployees.map((emp, index) => (
                      <div key={emp._id || index} className="d-flex align-items-center gap-2">
                        <Image
                          src={emp.avatar || toAbsoluteUrl('media/avatars/blank.png')}
                          roundedCircle
                          width="24"
                          height="24"
                          alt={`${emp.firstName} ${emp.lastName}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = toAbsoluteUrl('media/avatars/blank.png');
                          }}
                        />
                        <span style={{ fontSize: '15px', fontFamily: 'Inter' }}>{emp.firstName} {emp.lastName}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '14px', fontFamily: 'Inter', color: '#a6b1c0' }}>No late check-ins</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Early Check-out Card */}
          <div className="col-lg col-md-6 col-sm-6">
            <div className="border rounded-3 h-100" style={{ borderColor: '#dee5ef', minHeight: '80px', cursor: 'pointer' }}>
              <div className="p-3 rounded-top" style={{ backgroundColor: '#edf2f9' }} onClick={() => handleCardClick('early')}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="fa fa-sign-out-alt" style={{ fontSize: '20px', color: '#ec4899' }}></i>
                  <span style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'Inter' }}>{earlyCheckOutsCount}</span>
                </div>
                <p className="mb-0" style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'Inter' }}>Early Check-out</p>
              </div>
              <hr className="m-0" style={{ borderColor: '#d9d9d9' }} />
              <div
                className="p-3"
                style={{
                  maxHeight: '160px',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9d4141 #f0f0f0'
                }}
              >
                <div className="d-flex flex-column gap-2">
                  {earlyCheckOutEmployees.length > 0 ? (
                    earlyCheckOutEmployees.map((emp, index) => (
                      <div key={emp._id || index} className="d-flex align-items-center gap-2">
                        <Image
                          src={emp.avatar || toAbsoluteUrl('media/avatars/blank.png')}
                          roundedCircle
                          width="24"
                          height="24"
                          alt={`${emp.firstName} ${emp.lastName}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = toAbsoluteUrl('media/avatars/blank.png');
                          }}
                        />
                        <span style={{ fontSize: '15px', fontFamily: 'Inter' }}>{emp.firstName} {emp.lastName}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '14px', fontFamily: 'Inter', color: '#a6b1c0' }}>No early check-outs</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
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
    </div>
  );
};

export default memo(DashboardDailyAttendanceOverview);
