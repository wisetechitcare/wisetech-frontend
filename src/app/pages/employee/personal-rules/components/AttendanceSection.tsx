import React, { useState, useEffect } from 'react';
import { Card, Modal } from 'react-bootstrap';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { fetchConfiguration, fetchCompanyOverview } from '@services/company';
import {
  LEAVE_MANAGEMENT,
  DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
  RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
  DATE_SETTINGS_KEY
} from '@constants/configurations-key';
import { onSiteAndHolidayWeekendSettingsOnOffName } from '@constants/statistics';
import Loader from '@app/modules/common/utils/Loader';
import DailyShiftTimeSection from './DailyShiftTimeSection';
import OtherSettingsSection from './OtherSettingsSection';
import { fetchCompanySettings } from '@services/options';

interface DayWiseShiftData {
  id: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  isActive: boolean;
}

interface AttendanceSectionProps {
  sectionRef?: (el: HTMLDivElement | null) => void;
}

const AttendanceSection: React.FC<AttendanceSectionProps> = ({ sectionRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [dayWiseShifts, setDayWiseShifts] = useState<DayWiseShiftData[]>([]);

  // Time-related settings
  const [lunchTime, setLunchTime] = useState<string>('');
  const [graceTime, setGraceTime] = useState<string>('');
  const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('');
  const [deductionTime, setDeductionTime] = useState<string>('');

  // Other attendance settings
  const [enableLunchDeduction, setEnableLunchDeduction] = useState<boolean>(false);
  const [onSiteHolidayWeekendSettings, setOnSiteHolidayWeekendSettings] = useState<boolean>(false);
  const [allowedDistance, setAllowedDistance] = useState<number>(100);
  const [attendanceRequestLimit, setAttendanceRequestLimit] = useState<number>(2);
  const [restrictAttendanceRequestDays, setRestrictAttendanceRequestDays] = useState<number>(10);
  const [showDataUpToToday, setShowDataUpToToday] = useState<boolean>(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load all required data in parallel
        const [
          shiftsResponse,
          lunchConfigRes,
          leaveManagementConfigRes,
          restrictConfigRes,
          dateConfigRes,
          companySettingsRes,
          companyOverviewRes
        ] = await Promise.all([
          fetchDayWiseShifts(),
          fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY),
          fetchConfiguration(LEAVE_MANAGEMENT),
          fetchConfiguration(RESTRICT_ATTENDANCE_TO_7_DAYS_KEY),
          fetchConfiguration(DATE_SETTINGS_KEY),
          fetchCompanySettings(),
          fetchCompanyOverview()
        ]);

        
        // Process day-wise shifts
        const shifts = shiftsResponse?.data || [];
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedShifts = daysOrder.map(day => {
          const shift = shifts.find((s: any) => s.day.toLowerCase() === day.toLowerCase());
          if (shift) {
            return shift;
          }
          // If day not found in API, create a placeholder with isActive: false (Holiday)
          return {
            id: day.toLowerCase(),
            day: day,
            checkIn: null,
            checkOut: null,
            isActive: false
          };
        });
        setDayWiseShifts(sortedShifts);

        // Parse LEAVE_MANAGEMENT configuration for time-related settings
        const leaveConfig = JSON.parse(leaveManagementConfigRes?.data?.configuration?.configuration || '{}');

        // Parse lunch time
        const lunchTimeStr = leaveConfig?.['Lunch Time'] || '12:30 PM - 1:30 PM';
        setLunchTime(lunchTimeStr);

        // Parse grace times
        const graceTimeStr = leaveConfig?.['Grace Time'] || '00:30';
        const graceTimeOnSiteStr = leaveConfig?.['Grace Time - On Site'] || '00:30';
        setGraceTime(graceTimeStr.replace(' Hrs', ''));
        setGraceTimeOnSite(graceTimeOnSiteStr.replace(' Hrs', ''));

        // Parse deduction time
        const deductionTimeStr = leaveConfig?.['Deduction Time'] || '1:00 Hrs';
        setDeductionTime(deductionTimeStr);

        // Parse lunch deduction config (from separate configuration)
        const lunchConfig = JSON.parse(lunchConfigRes?.data?.configuration?.configuration || '{}');
        const lunchEnabled = lunchConfig?.disableLaunchDeductionTime ?? false;
        setEnableLunchDeduction(lunchEnabled);

        // Parse on-site/holiday/weekend settings (from LEAVE_MANAGEMENT)
        const onSiteValue = leaveConfig?.[onSiteAndHolidayWeekendSettingsOnOffName];
        const onSiteEnabled = onSiteValue === '1' || onSiteValue === 1;
        setOnSiteHolidayWeekendSettings(onSiteEnabled);

        // Parse restrict attendance days config (from separate configuration)
        const restrictConfig = JSON.parse(restrictConfigRes?.data?.configuration?.configuration || '{}');
        let restrictDays = restrictConfig?.restrictAttendanceTo7Days;
        // Handle migration from boolean to number
        if (typeof restrictDays === 'boolean') {
          restrictDays = restrictDays ? 7 : 1;
        } else if (typeof restrictDays !== 'number' || restrictDays < 1) {
          restrictDays = 7;
        }
        setRestrictAttendanceRequestDays(restrictDays);

        // Parse date settings config (from separate configuration)
        const dateConfig = JSON.parse(dateConfigRes?.data?.configuration?.configuration || '{}');
        const dateSettingsEnabled = dateConfig?.useDateSettings ?? false;
        setShowDataUpToToday(dateSettingsEnabled);

        // Get allowed distance from company settings
        const appSettings = companySettingsRes?.data?.appSettings;
        const allowedDistance = appSettings?.distanceAllowedInMeters || 100;
        setAllowedDistance(allowedDistance);

        // Get attendance request limit from company overview
        const companyOverview = companyOverviewRes?.data?.companyOverview?.[0];
        const attendanceLimit = companyOverview?.attendanceRequestRaiseLimit || 2;
        setAttendanceRequestLimit(attendanceLimit);

      } catch (error) {
        console.error('[AttendanceSection] Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return <Loader />;
  }


  return (
    <Card
      ref={sectionRef}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)',
        border: 'none',
        width: '100%'
      }}
    >
      <Card.Body style={{
        padding: '20px 24px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#e9f1fd',
            borderRadius: '434334px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="ki-duotone ki-calendar-8 fs-2">
              <span className="path1"></span>
              <span className="path2"></span>
              <span className="path3"></span>
              <span className="path4"></span>
              <span className="path5"></span>
              <span className="path6"></span>
            </i>
          </div>
          <p style={{
            fontFamily: 'Barlow, sans-serif',
            fontWeight: 600,
            fontSize: '19px',
            letterSpacing: '0.19px',
            color: '#000',
            margin: 0
          }}>
            Attendance
          </p>
        </div>

        {/* Daily Shift Time Section */}
        <DailyShiftTimeSection dayWiseShifts={dayWiseShifts} />

        {/* Divider */}
        <div style={{
          backgroundColor: '#ced3da',
          height: '1px',
          width: '100%',
          margin: '0'
        }} />

        {/* Other Settings Section */}
        <OtherSettingsSection
          lunchTime={lunchTime}
          deductionTime={deductionTime}
          graceTime={graceTime}
          graceTimeOnSite={graceTimeOnSite}
          enableLunchDeduction={enableLunchDeduction}
          onSiteHolidayWeekendSettings={onSiteHolidayWeekendSettings}
          allowedDistance={allowedDistance}
          attendanceRequestLimit={attendanceRequestLimit}
          restrictAttendanceRequestDays={restrictAttendanceRequestDays}
          showDataUpToToday={showDataUpToToday}
          dayWiseShifts={dayWiseShifts}
        />
      </Card.Body>
    </Card>
  );
};

export default AttendanceSection;
