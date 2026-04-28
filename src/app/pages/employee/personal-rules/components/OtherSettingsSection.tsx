import React from 'react';
import { Row, Col } from 'react-bootstrap';

interface DayWiseShiftData {
  id: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  isActive: boolean;
}

interface OtherSettingsSectionProps {
  // Time-related settings
  lunchTime: string;
  deductionTime: string;
  graceTime: string;
  graceTimeOnSite: string;

  // Other attendance settings
  enableLunchDeduction: boolean;
  onSiteHolidayWeekendSettings: boolean;
  allowedDistance: number;
  attendanceRequestLimit: number;
  restrictAttendanceRequestDays: number;
  showDataUpToToday: boolean;
  dayWiseShifts: DayWiseShiftData[];
}

const OtherSettingsSection: React.FC<OtherSettingsSectionProps> = ({
  lunchTime,
  deductionTime,
  graceTime,
  graceTimeOnSite,
  enableLunchDeduction,
  onSiteHolidayWeekendSettings,
  allowedDistance,
  attendanceRequestLimit,
  restrictAttendanceRequestDays,
  showDataUpToToday,
  dayWiseShifts
}) => {
  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr: string | null): number => {
    if (!timeStr) return 0;

    // Handle both 12-hour (09:30 AM) and 24-hour (09:30) formats
    const timeUpper = timeStr.toUpperCase().trim();
    const has12HourFormat = timeUpper.includes('AM') || timeUpper.includes('PM');

    if (has12HourFormat) {
      const [time, period] = timeUpper.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    } else {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }
  };

  // Get current day of the week
  const getCurrentDayOfWeek = (): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    return days[today.getDay()];
  };

  // Calculate Total Working Time and Total Shift Time for current day
  const calculateTimesForCurrentDay = () => {
    const currentDay = getCurrentDayOfWeek();
    const todayShift = dayWiseShifts.find(shift => shift.day.toLowerCase() === currentDay.toLowerCase());

    // For weekends (Saturday/Sunday) or holidays, return default values
    if (!todayShift || !todayShift.isActive) {
      return {
        totalWorkingTime: '0:00',
        totalShiftTime: '0:00',
        isHoliday: true
      };
    }

    const checkIn = todayShift.checkIn;
    const checkOut = todayShift.checkOut;

    if (!checkIn || !checkOut) {
      return {
        totalWorkingTime: '0:00',
        totalShiftTime: '0:00',
        isHoliday: false
      };
    }

    try {
      // Parse lunch time (format: "12:30 PM - 1:30 PM")
      const [lunchStart, lunchEnd] = lunchTime.split(' - ').map(t => t.trim());

      // Convert times to minutes
      const checkInMinutes = timeToMinutes(checkIn);
      const checkOutMinutes = timeToMinutes(checkOut);
      const lunchStartMinutes = timeToMinutes(lunchStart);
      const lunchEndMinutes = timeToMinutes(lunchEnd);

      // Calculate lunch duration
      const lunchDuration = lunchEndMinutes - lunchStartMinutes;

      // Calculate total shift time (check-out - check-in)
      let totalShiftMinutes = checkOutMinutes - checkInMinutes;
      if (totalShiftMinutes < 0) totalShiftMinutes += 24 * 60; // Handle overnight shifts

      // Calculate working time (total shift - lunch)
      let workingMinutes = totalShiftMinutes - lunchDuration;
      if (workingMinutes < 0) workingMinutes = 0;

      // Format to H:MM
      const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
      };

      return {
        totalWorkingTime: formatTime(workingMinutes),
        totalShiftTime: formatTime(totalShiftMinutes),
        isHoliday: false
      };
    } catch (error) {
      console.error('[OtherSettingsSection] Error calculating times:', error);
      return {
        totalWorkingTime: '0:00',
        totalShiftTime: '0:00',
        isHoliday: false
      };
    }
  };

  const { totalWorkingTime, totalShiftTime, isHoliday } = calculateTimesForCurrentDay();
  const DataRowWithSubtitle: React.FC<{ label: string; subtitle?: string; value: string }> = ({ label, subtitle, value }) => (
    <Row className="g-2 align-items-center mb-2">
      <Col xs={6} sm={8} md={8}>
        <div>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            color: '#000',
            margin: 0
          }}>
            {label}
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            color: '#8998ab',
            margin: 0
          }}>
            {subtitle}
          </p>
        </div>
      </Col>
      <Col xs={6} sm={4} md={4}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '14px',
          color: '#000',
          margin: 0,
          textAlign: 'right',
          wordBreak: 'break-word'
        }}>
          {value}
        </p>
      </Col>
    </Row>
  );

  const DataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <Row className="g-2 align-items-center mb-2">
      <Col xs={6} sm={8} md={8}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: '#000',
          margin: 0
        }}>
          {label}
        </p>
      </Col>
      <Col xs={6} sm={4} md={4}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '14px',
          color: '#000',
          margin: 0,
          textAlign: 'right',
          wordBreak: 'break-word'
        }}>
          {value}
        </p>
      </Col>
    </Row>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <p style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 600,
          fontSize: '16px',
          letterSpacing: '0.16px',
          textTransform: 'uppercase',
          color: '#000',
          margin: 0
        }}>
          Other Settings
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          color: '#8998ab',
          margin: 0
        }}>
          Attendance and time configurations
        </p>
      </div>

      {/* Settings List */}
      <div style={{ maxWidth: '820px' }}>
        {/* Total Working Time and Total Shift Time for Current Day */}
        <DataRow
          label="Total Working Time (Today)"
          value={isHoliday ? 'Holiday' : totalWorkingTime}
        />
        {/* <DataRow
          label="Total Shift Time (Today)"
          value={isHoliday ? 'Holiday' : totalShiftTime}
        /> */}

        {/* Time-related settings with subtitles */}
        <DataRowWithSubtitle
          label="Lunch time"
          // subtitle="Daily lunch break duration"
          value={lunchTime}
        />
        <DataRowWithSubtitle
          label="Deduction Time"
          // subtitle="Time deducted for lunch break"
          value={deductionTime}
        />
        <DataRowWithSubtitle
          label="Grace Time - Office"
          // subtitle="Check-in tolerance period for office"
          value={`${graceTime} Hrs`}
        />
        <DataRowWithSubtitle
          label="Grace Time - On Site"
          // subtitle="Check-in tolerance period for on-site"
          value={`${graceTimeOnSite} Hrs`}
        />

        {/* Other settings without subtitles */}
        <DataRow
          label="Allowed distance in meters from office for checkin"
          value={`${allowedDistance} meters`}
        />
        <DataRow
          label="Attendance Request Raise Limit"
          value={attendanceRequestLimit.toString()}
        />
        <DataRow
          label="Restrict Attendance Requests (Days)"
          value={`${restrictAttendanceRequestDays} days`}
        />
        <DataRow
          label="On-site, Holiday & Weekend Settings for late attendance"
          value={onSiteHolidayWeekendSettings ? 'Enabled' : 'Disabled'}
        />
        <DataRow
          label="Show Data Up to Today"
          value={showDataUpToToday ? 'Enabled' : 'Disabled'}
        />
        <DataRow
          label="Enable Lunch Deduction Time"
          value={enableLunchDeduction ? 'Enabled' : 'Disabled'}
        />
      </div>
    </div>
  );
};

export default OtherSettingsSection;
