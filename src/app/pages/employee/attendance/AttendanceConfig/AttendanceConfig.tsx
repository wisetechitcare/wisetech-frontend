import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Modal } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import DailyShiftTime from './component/DailyShiftTime';
import OtherSettings from './component/OtherSettings';
import LeaveTypesBalance from './component/LeaveTypesBalance';
import SandwichLeave from '@pages/company/settings/SandwhichLeave';
import Appearance from './component/Appearance';
import AddonLeavesAllowanceCard from '@app/modules/common/components/AddonLeavesAllowanceCard';
import {
  fetchConfiguration,
  fetchCompanyOverview
} from '@services/company';
import { fetchCompanySettings } from '@services/options';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import {
  DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
  RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
  DATE_SETTINGS_KEY,
  LEAVE_MANAGEMENT
} from '@constants/configurations-key';
import { onSiteAndHolidayWeekendSettingsOnOffName } from '@constants/statistics';
import Loader from '@app/modules/common/utils/Loader';
import Rules from '../personal/views/information/Rules';

interface OtherSettingsData {
  enableLunchDeduction: boolean;
  onSiteHolidayWeekendSettings: boolean;
  allowedDistance: number;
  attendanceRequestLimit: number;
  restrictAttendanceRequestDays: number;
  showDataUpToToday: boolean;
  monthlyAnnualLeaveLimit: number;
}

const AttendanceConfig: React.FC = () => {
  const [showDailyShiftModal, setShowDailyShiftModal] = useState(false);
  const [showOtherSettingsModal, setShowOtherSettingsModal] = useState(false);
  const [showSandwichLeaveModal, setShowSandwichLeaveModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showAddonLeavesModal, setShowAddonLeavesModal] = useState(false);
  const [showLeaveTypesModal, setShowLeaveTypesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [otherSettingsKey, setOtherSettingsKey] = useState(0); // Key to force remount
  const [dailyShiftKey, setDailyShiftKey] = useState(0); // Key to force remount for daily shift
  const [otherSettingsData, setOtherSettingsData] = useState<OtherSettingsData>({
    enableLunchDeduction: false,
    onSiteHolidayWeekendSettings: false,
    allowedDistance: 12,
    attendanceRequestLimit: 2,
    restrictAttendanceRequestDays: 7,
    showDataUpToToday: false,
    monthlyAnnualLeaveLimit: 2,
  });
  const [dailyShiftData, setDailyShiftData] = useState<any[]>([]);
  const [lunchTime, setLunchTime] = useState<string>('12:30 pm - 1:30 pm');
  const [deductionTime, setDeductionTime] = useState<string>('1:00 Hrs');
  const [graceTimeOffice, setGraceTimeOffice] = useState<string>('00:30');
  const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('00:30');

  const handleOpenDailyShiftModal = () => {
    setDailyShiftKey(prev => prev + 1); // Force remount and reload data
    setShowDailyShiftModal(true);
  };

  const handleCloseDailyShiftModal = () => {
    setShowDailyShiftModal(false);
    // Reload data after closing modal to get updated values
    loadDailyShiftData();
  };

  const handleOpenOtherSettingsModal = () => {
    setOtherSettingsKey(prev => prev + 1); // Increment key to force remount and reload data
    setShowOtherSettingsModal(true);
  };

  const handleCloseOtherSettingsModal = () => {
    setShowOtherSettingsModal(false);
    // Reload data after closing modal to get updated values
    loadOtherSettingsData();
  };

  // Helper function to convert 24h time to 12h format
  const formatTime12h = (time24: string | null): string => {
    if (!time24 || time24 === null) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to calculate shift duration in hours
const calculateShiftDuration = (checkIn: string, checkOut: string): string => {
  if (!checkIn || !checkOut) return '00:00';

  // Helper to parse both "14:30" and "02:30 PM"
  const parseToMinutes = (time: string): number => {
    const is12HourFormat = time.toUpperCase().includes('AM') || time.toUpperCase().includes('PM');

    let [hoursStr, rest] = time.split(':');
    let minutesStr = rest;
    let ampm = '';

    if (is12HourFormat) {
      // Example: "02:30 PM" → hoursStr="02", rest="30 PM"
      const parts = rest.trim().split(' ');
      minutesStr = parts[0];
      ampm = parts[1]?.toUpperCase();
    }

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;

    if (is12HourFormat) {
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
  };

  const inTotalMinutes = parseToMinutes(checkIn);
  const outTotalMinutes = parseToMinutes(checkOut);

  let durationMinutes = outTotalMinutes - inTotalMinutes;
  if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight shifts

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};


  const loadDailyShiftData = useCallback(async () => {
    try {
      const [dayWiseShiftsRes, leaveManagementRes] = await Promise.all([
        fetchDayWiseShifts(),
        fetchConfiguration(LEAVE_MANAGEMENT)
      ]);

      // Parse day-wise shifts
      const shifts = dayWiseShiftsRes?.data || [];
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      // Sort shifts by day order and format for display
      const sortedShifts = daysOrder.map(day => {
        const shift = shifts.find((s: any) => s.day.toLowerCase() === day.toLowerCase());
        if (shift && shift.isActive) {
          return {
            day,
            checkIn: (shift.checkIn),
            checkOut: (shift.checkOut),
            total: calculateShiftDuration(shift.checkIn, shift.checkOut),
            isHoliday: false
          };
        }
        return {
          day,
          checkIn: '',
          checkOut: '',
          total: '',
          isHoliday: true
        };
      });

      setDailyShiftData(sortedShifts);

      // Parse LEAVE_MANAGEMENT config for lunch and grace times
      const leaveConfig = JSON.parse(leaveManagementRes?.data?.configuration?.configuration || '{}');
      const lunchTimeStr = leaveConfig?.['Lunch Time'] || '12:30 PM - 1:30 PM';
      const deductionTimeStr = leaveConfig?.['Deduction Time'] || '1:00 Hrs';
      const graceTimeOfficeStr = leaveConfig?.['Grace Time'] || '00:30';
      const graceTimeOnSiteStr = leaveConfig?.['Grace Time - On Site'] || '00:30';

      setLunchTime(lunchTimeStr);
      setDeductionTime(deductionTimeStr);
      setGraceTimeOffice(graceTimeOfficeStr);
      setGraceTimeOnSite(graceTimeOnSiteStr);

    } catch (error) {
      console.error('Error loading daily shift data:', error);
    }
  }, []);

  const loadOtherSettingsData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [
        lunchConfigRes,
        leaveManagementConfigRes,
        restrictConfigRes,
        dateConfigRes,
        companySettingsRes,
        companyOverviewRes
      ] = await Promise.all([
        fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY),
        fetchConfiguration(LEAVE_MANAGEMENT),
        fetchConfiguration(RESTRICT_ATTENDANCE_TO_7_DAYS_KEY),
        fetchConfiguration(DATE_SETTINGS_KEY),
        fetchCompanySettings(),
        fetchCompanyOverview()
      ]);

      // Parse lunch deduction config
      const lunchConfig = JSON.parse(lunchConfigRes?.data?.configuration?.configuration || '{}');
      const lunchEnabled = lunchConfig?.disableLaunchDeductionTime ?? false;

      // Parse leave management config for on-site/holiday/weekend setting and monthly annual leave limit
      const leaveManagementConfig = JSON.parse(leaveManagementConfigRes?.data?.configuration?.configuration || '{}');
      const onSiteValue = leaveManagementConfig?.[onSiteAndHolidayWeekendSettingsOnOffName];
      const onSiteEnabled = onSiteValue === '1' || onSiteValue === 1;
      const monthlyAnnualLeaveLimit = leaveManagementConfig?.['Number of Annual Leaves allowed per month'] || '2';

      // Parse restrict attendance days config
      const restrictConfig = JSON.parse(restrictConfigRes?.data?.configuration?.configuration || '{}');
      let restrictDays = restrictConfig?.restrictAttendanceTo7Days;
      // Handle migration from boolean to number
      if (typeof restrictDays === 'boolean') {
        restrictDays = restrictDays ? 7 : 1;
      } else if (typeof restrictDays !== 'number' || restrictDays < 1) {
        restrictDays = 7;
      }

      // Parse date settings config
      const dateConfig = JSON.parse(dateConfigRes?.data?.configuration?.configuration || '{}');
      const dateSettingsEnabled = dateConfig?.useDateSettings ?? false;

      // Get app settings (distance)
      const appSettings = companySettingsRes?.data?.appSettings;
      const allowedDistance = appSettings?.distanceAllowedInMeters || 12;

      // Get company overview (attendance request limit)
      const companyOverview = companyOverviewRes?.data?.companyOverview?.[0];
      const attendanceLimit = companyOverview?.attendanceRequestRaiseLimit || 2;

      // Update state
      setOtherSettingsData({
        enableLunchDeduction: lunchEnabled,
        onSiteHolidayWeekendSettings: onSiteEnabled,
        allowedDistance: allowedDistance,
        attendanceRequestLimit: attendanceLimit,
        restrictAttendanceRequestDays: restrictDays,
        showDataUpToToday: dateSettingsEnabled,
        monthlyAnnualLeaveLimit: Number(monthlyAnnualLeaveLimit),
      });

    } catch (error) {
      console.error('Error loading other settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOtherSettingsData();
    loadDailyShiftData();
  }, [loadOtherSettingsData, loadDailyShiftData]);

  const handleOpenSandwichLeaveModal = () => {
    setShowSandwichLeaveModal(true);
  };

  const handleCloseSandwichLeaveModal = (visible: boolean) => {
    setShowSandwichLeaveModal(visible);
  };

  const handleOpenAppearanceModal = () => {
    setShowAppearanceModal(true);
  };

  const handleCloseAppearanceModal = (visible: boolean) => {
    setShowAppearanceModal(visible);
  };

  const handleOpenAddonLeavesModal = () => {
    setShowAddonLeavesModal(true);
  };

  const handleCloseAddonLeavesModal = () => {
    setShowAddonLeavesModal(false);
  };

  const handleOpenLeaveTypesModal = () => {
    setShowLeaveTypesModal(true);
  };

  const handleCloseLeaveTypesModal = () => {
    setShowLeaveTypesModal(false);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div style={{ backgroundColor: '#f7f9fc', padding: '16px 20px' }}>
        <h4 style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 600,
          fontSize: '24px',
          letterSpacing: '0.24px',
          marginBottom: '16px'
        }}>
          Configuration
        </h4>

        {/* First Row - Daily Shift Time & Other Settings */}
        <Row className="mb-3 g-3">
          {/* Daily Shift Time Card */}
          <Col xs={12} md={6}>
            <Card style={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)'
            }}>
              <Card.Body style={{ padding: '24px' }}>
                {/* Header with Configure Button */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#e9f1fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <KTIcon iconName="calendar" className="fs-2 text-primary" />
                    </div>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Daily Shift Time
                    </span>
                  </div>
                  <button
                    onClick={handleOpenDailyShiftModal}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #9d4141',
                      color: '#9d4141',
                      borderRadius: '6px',
                      padding: '8px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    Configure
                  </button>
                </div>

                {/* Days Table */}
                <div className="mb-3">
                  <div className="d-none d-md-flex justify-content-between mb-2">
                    <span style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>Day</span>
                    <div className="d-flex justify-content-between" style={{ width: '257px' }}>
                      <span style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>Check-in</span>
                      <span style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>Check-out</span>
                      <span style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>Total Shift Time</span>
                    </div>
                  </div>

                  {/* Days */}
                  {dailyShiftData.map((item) => (
                    <div key={item.day}>
                      {/* Desktop View */}
                      <div className="d-none d-md-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>{item.day}</span>
                        {item.isHoliday ? (
                          <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', width: '95px', textAlign: 'right' }}>Holiday</span>
                        ) : (
                          <div className="d-flex justify-content-between" style={{ width: '257px' }}>
                            <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', width: '112px' }}>{item.checkIn}</span>
                            <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', width: '106px' }}>{item.checkOut}</span>
                            <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', textAlign: 'right' }}>{item.total}</span>
                          </div>
                        )}
                      </div>
                      {/* Mobile View */}
                      <div className="d-md-none mb-3" style={{ borderBottom: '1px solid #e4e6ef', paddingBottom: '8px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{item.day}</span>
                          {item.isHoliday && <span style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>Holiday</span>}
                        </div>
                        {!item.isHoliday && (
                          <div style={{ fontSize: '12px', fontFamily: 'Inter, sans-serif', color: '#8696ad' }}>
                            <div className="d-flex justify-content-between mb-1">
                              <span>Check-in:</span>
                              <span style={{ color: '#000' }}>{item.checkIn}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-1">
                              <span>Check-out:</span>
                              <span style={{ color: '#000' }}>{item.checkOut}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span>Total:</span>
                              <span style={{ color: '#000' }}>{item.total}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lunch, Deduction & Grace Times */}
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Lunch time</span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>{lunchTime}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Deduction Time</span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>{deductionTime}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Grace Time - Office</span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>{graceTimeOffice}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Grace Time - On Site</span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>{graceTimeOnSite}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Other Settings Card */}
          <Col xs={12} md={6}>
            <Card style={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
              height: '100%'
            }}>
              <Card.Body style={{ padding: '20px 16px' }}>
                {/* Header with Configure Button */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#e9f1fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <KTIcon iconName="setting-2" className="fs-2 text-primary" />
                    </div>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Other Settings
                    </span>
                  </div>
                  <button
                    onClick={handleOpenOtherSettingsModal}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #9d4141',
                      color: '#9d4141',
                      borderRadius: '6px',
                      padding: '8px 20px',
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    Configure
                  </button>
                </div>

                {/* Settings List */}
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      Show Data Up to Today
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.showDataUpToToday ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      Enable Lunch Deduction Time
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.enableLunchDeduction ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      On-site, Holiday & Weekend Settings for late attendance
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.onSiteHolidayWeekendSettings ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      Allowed distance in meters from office for checkin
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.allowedDistance} meters
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      Restrict Attendance Requests (Days)
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.restrictAttendanceRequestDays} days
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      Attendance Request Raise Limit
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.attendanceRequestLimit}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                      Number of Annual Leaves allowed per month
                    </span>
                    <span style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      {otherSettingsData.monthlyAnnualLeaveLimit}
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className='mb-4'>
          <Rules fromAdmin={true}  title={'Default Shift Rules'} hideGeneralSettings={true}/>
        </div>

        {/* Second Row - Other Configuration Cards */}
        <Row className="mb-3 g-3">
          <Col xs={12} md={6}>
            <Card
              onClick={handleOpenSandwichLeaveModal}
              style={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer'
              }}>
              <Card.Body className="d-flex justify-content-between align-items-center" style={{ padding: '20px 16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>
                    Sandwich Rules
                  </div>
                  <div style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>
                    Configure sandwich leave scenarios for payroll
                  </div>
                </div>
                <KTIcon iconName="right" className="fs-3 text-danger" />
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card
              onClick={handleOpenAppearanceModal}
              style={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer'
              }}>
              <Card.Body className="d-flex justify-content-between align-items-center" style={{ padding: '20px 16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>
                    Appearance Settings
                  </div>
                  <div style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>
                    Customize colors for attendance, leaves, and charts
                  </div>
                </div>
                <KTIcon iconName="right" className="fs-3 text-danger" />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Third Row - Leave Types and Addon Leaves */}
        <Row className="g-3">
          <Col xs={12} md={6}>
            <Card
              onClick={handleOpenLeaveTypesModal}
              style={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer'
              }}>
              <Card.Body className="d-flex justify-content-between align-items-center" style={{ padding: '20px 16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>
                    Leave Types and Balance
                  </div>
                  <div style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>
                    Configure leave types and their balance for each branch
                  </div>
                </div>
                <KTIcon iconName="right" className="fs-3 text-danger" />
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card
              onClick={handleOpenAddonLeavesModal}
              style={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer'
              }}>
              <Card.Body className="d-flex justify-content-between align-items-center" style={{ padding: '20px 16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>
                    Addon Leaves Allowance
                  </div>
                  <div style={{ fontSize: '12px', color: '#8696ad', fontFamily: 'Inter, sans-serif' }}>
                    Configure additional leave days based on employee experience
                  </div>
                </div>
                <KTIcon iconName="right" className="fs-3 text-danger" />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Daily Shift Time Modal */}
      <Modal
        show={showDailyShiftModal}
        onHide={handleCloseDailyShiftModal}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>Daily Shift Time</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0', backgroundColor: '#f7f9fc' }}>
          {/* Add key prop to force remount when modal opens, ensuring fresh data is loaded */}
          <DailyShiftTime key={dailyShiftKey} />
        </Modal.Body>
      </Modal>

      {/* Other Settings Modal */}
      <Modal
        show={showOtherSettingsModal}
        onHide={handleCloseOtherSettingsModal}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>Other Attendance and Leaves Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0', backgroundColor: '#f7f9fc' }}>
          {/* Add key prop to force remount when modal opens, ensuring fresh data is loaded */}
          <OtherSettings key={otherSettingsKey} />
        </Modal.Body>
      </Modal>

      {/* Sandwich Leave Modal */}
      {/* originalSandwich */}
      <Modal
        show={showSandwichLeaveModal}
        onHide={() => handleCloseSandwichLeaveModal(false)}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>Sandwich Leave Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0', backgroundColor: '#f7f9fc' }}>
          <SandwichLeave showSandWhichLeaveModal={handleCloseSandwichLeaveModal} />
        </Modal.Body>
      </Modal>

      {/* Appearance Settings Modal */}
      <Modal
        show={showAppearanceModal}
        onHide={() => handleCloseAppearanceModal(false)}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>Appearance Settings</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0', backgroundColor: '#f7f9fc' }}>
          <Appearance />
        </Modal.Body>
      </Modal>

      {/* Addon Leaves Allowance Modal */}
      <Modal
        show={showAddonLeavesModal}
        onHide={handleCloseAddonLeavesModal}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>Addon Leaves Allowance</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px', backgroundColor: '#f7f9fc' }}>
          <AddonLeavesAllowanceCard />
        </Modal.Body>
      </Modal>

      {/* Leave Types and Balance Modal */}
      <Modal
        show={showLeaveTypesModal}
        onHide={handleCloseLeaveTypesModal}
        size="xl"
        centered
      >
        <Modal.Header style={{ padding: '20px', backgroundColor: '#f7f9fc', border: 'none' }} closeButton>
          <Modal.Title style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'Barlow, sans-serif', letterSpacing: '0.24px' }}>Leave Types and Balance</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0', backgroundColor: '#f7f9fc' }}>
          <LeaveTypesBalance />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AttendanceConfig;
