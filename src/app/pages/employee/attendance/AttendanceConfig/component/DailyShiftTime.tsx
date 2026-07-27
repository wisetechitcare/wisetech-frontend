import { safeJsonParse } from '@utils/safeJson';
import React, { useState, useEffect } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
// Same MUI glass kit as the Sandwich Leave benchmark — layout primitives, buttons, canonical toggle.
import { WtButton, WtSwitch, GlassSurface, IconBox, TRIO, T } from '@app/modules/common/components/ui';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import TimePickerInput from '@app/modules/common/inputs/TimeInput';
import TextInput from '@app/modules/common/inputs/TextInput';
import { fetchDayWiseShifts, createDayWiseShift, updateDayWiseShiftById } from '@services/dayWiseShift';
import { fetchConfiguration, createNewConfiguration } from '@services/company';
import {
  LEAVE_MANAGEMENT,
  ENFORCE_ONSITE_DEADLINE_KEY,
  GRACE_TIME_ON_SITE_KEY,
} from '@constants/configurations-key';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import Loader from '@app/modules/common/utils/Loader';
import dayjs, { Dayjs } from 'dayjs';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Helper function to convert time string "HH:MM AM/PM" to minutes
const timeToMinutes = (timeStr: string | null): number => {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Helper function to convert minutes to "H:MM Hrs" format
const minutesToTimeFormat = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')} Hrs`;
};

type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type HolidayValue = 'no' | 'yes';

interface ShiftValues {
  monday_checkIn: string;
  monday_checkOut: string;
  monday_totalWorkingTime: string;
  monday_totalShiftTime: string;
  monday_isHoliday: HolidayValue;
  tuesday_checkIn: string;
  tuesday_checkOut: string;
  tuesday_totalWorkingTime: string;
  tuesday_totalShiftTime: string;
  tuesday_isHoliday: HolidayValue;
  wednesday_checkIn: string;
  wednesday_checkOut: string;
  wednesday_totalWorkingTime: string;
  wednesday_totalShiftTime: string;
  wednesday_isHoliday: HolidayValue;
  thursday_checkIn: string;
  thursday_checkOut: string;
  thursday_totalWorkingTime: string;
  thursday_totalShiftTime: string;
  thursday_isHoliday: HolidayValue;
  friday_checkIn: string;
  friday_checkOut: string;
  friday_totalWorkingTime: string;
  friday_totalShiftTime: string;
  friday_isHoliday: HolidayValue;
  saturday_checkIn: string;
  saturday_checkOut: string;
  saturday_totalWorkingTime: string;
  saturday_totalShiftTime: string;
  saturday_isHoliday: HolidayValue;
  sunday_checkIn: string;
  sunday_checkOut: string;
  sunday_totalWorkingTime: string;
  sunday_totalShiftTime: string;
  sunday_isHoliday: HolidayValue;
  lunchTimeStart: string;
  lunchTimeEnd: string;
  graceTimeOffice: string;
  graceTimeOnSite: string;
  enforceOnsiteDeadline: boolean;
}

interface DayWiseShiftData {
  id: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  isActive: boolean;
  companyId?: string | null;
  branchId?: string | null;
}

interface DailyShiftTimeProps {
  // The entity being configured: org default (companyId = root org) or a branch override (branchId).
  scope?: { companyId?: string; branchId?: string };
}

// ── Presentational atoms (module-scope; no state) ──────────────────────────
const pickerLabelSx = { fontSize: 12, fontWeight: 600, color: '#55606F', mb: 0.4, display: 'block' } as const;
const settingLabelSx = { fontSize: 14, fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' } as const;
const bulkPickerSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px', fontSize: 13.5, backgroundColor: '#fff',
    '& fieldset': { borderColor: '#d9dee6' },
    '&:hover fieldset': { borderColor: '#1E3A8A' },
    '&.Mui-focused fieldset': { borderColor: '#1E3A8A' },
  },
} as const;

/** A compact computed-time readout (Working / Shift / Deduction). */
function TimeStat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ borderRadius: '10px', backgroundColor: '#f6f8fb', border: '1px solid #eceff3', px: 1, py: 0.85, textAlign: 'center' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#8a94a6', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{value}</Typography>
    </Box>
  );
}

const DailyShiftTime: React.FC<DailyShiftTimeProps> = ({ scope }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dayWiseShifts, setDayWiseShifts] = useState<DayWiseShiftData[]>([]);
  const [leaveManagementConfigId, setLeaveManagementConfigId] = useState<string | null>(null);
  const [bulkCheckIn, setBulkCheckIn] = useState<Dayjs | null>(null);
  const [bulkCheckOut, setBulkCheckOut] = useState<Dayjs | null>(null);

  const validationSchema = Yup.object().shape({
    lunchTimeStart: Yup.string().required('Lunch start time is required'),
    lunchTimeEnd: Yup.string().required('Lunch end time is required'),
    graceTimeOffice: Yup.string().required('Grace time office is required'),
    enforceOnsiteDeadline: Yup.boolean(),
    graceTimeOnSite: Yup.string().when('enforceOnsiteDeadline', {
      is: true,
      then: (schema) => schema.required('Grace time on site is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
  });

  const [initialValues, setInitialValues] = useState<ShiftValues>({
    monday_checkIn: '09:30',
    monday_checkOut: '18:30',
    monday_totalWorkingTime: '8:00',
    monday_totalShiftTime: '9:00',
    monday_isHoliday: 'no',

    tuesday_checkIn: '09:30',
    tuesday_checkOut: '18:30',
    tuesday_totalWorkingTime: '8:00',
    tuesday_totalShiftTime: '9:00',
    tuesday_isHoliday: 'no',

    wednesday_checkIn: '09:30',
    wednesday_checkOut: '18:30',
    wednesday_totalWorkingTime: '8:00',
    wednesday_totalShiftTime: '9:00',
    wednesday_isHoliday: 'no',

    thursday_checkIn: '09:30',
    thursday_checkOut: '18:30',
    thursday_totalWorkingTime: '8:00',
    thursday_totalShiftTime: '9:00',
    thursday_isHoliday: 'no',

    friday_checkIn: '09:30',
    friday_checkOut: '18:30',
    friday_totalWorkingTime: '8:00',
    friday_totalShiftTime: '9:00',
    friday_isHoliday: 'no',

    saturday_checkIn: '09:30',
    saturday_checkOut: '18:30',
    saturday_totalWorkingTime: '8:00',
    saturday_totalShiftTime: '9:00',
    saturday_isHoliday: 'no',

    sunday_checkIn: '09:30',
    sunday_checkOut: '18:30',
    sunday_totalWorkingTime: '8:00',
    sunday_totalShiftTime: '9:00',
    sunday_isHoliday: 'yes',

    lunchTimeStart: '12:30',
    lunchTimeEnd: '13:30',
    graceTimeOffice: '00:30',
    graceTimeOnSite: '11:00',
    enforceOnsiteDeadline: true,
  });


  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);

        // Load day-wise shifts for the selected scope (branch override → org → global).
        const shiftsResponse = await fetchDayWiseShifts(scope);
        const shifts = shiftsResponse?.data || [];
        
        setDayWiseShifts(shifts);

        // Map API data to form initial values
        const updatedValues = { ...initialValues };
        shifts.forEach((shift: any) => {
          const dayKey = shift.day.toLowerCase() as WeekdayKey;
          // The API returns snake_case (check_in/check_out/is_active); accept camelCase too.
          const checkIn = shift.check_in ?? shift.checkIn;
          const checkOut = shift.check_out ?? shift.checkOut;
          const isActive = shift.is_active ?? shift.isActive;

          updatedValues[`${dayKey}_checkIn`] = to24HourFormat(checkIn || '09:30');
          updatedValues[`${dayKey}_checkOut`] = to24HourFormat(checkOut || '18:30');
          updatedValues[`${dayKey}_isHoliday`] = isActive ? 'no' : 'yes';
      });


        // Load LEAVE_MANAGEMENT configuration for lunch and grace times (scoped).
        try {
          const leaveConfigResponse = await fetchConfiguration(LEAVE_MANAGEMENT, undefined, undefined, scope);
          const leaveConfig = safeJsonParse(leaveConfigResponse?.data?.configuration?.configuration || '{}');
          const configId = leaveConfigResponse?.data?.configuration?.id;

          
          setLeaveManagementConfigId(configId);

          // Parse lunch time (format: "12:30 PM - 1:30 PM") and convert to 24-hour for picker
          const lunchTimeStr = leaveConfig?.['Lunch Time'] || '12:30 PM - 1:30 PM';
          const [lunchStart, lunchEnd] = lunchTimeStr.split(' - ');
          updatedValues.lunchTimeStart = to24HourFormat(lunchStart?.trim() || '12:30 PM');
          updatedValues.lunchTimeEnd = to24HourFormat(lunchEnd?.trim() || '1:30 PM');

          // Parse grace times
          updatedValues.graceTimeOffice = leaveConfig?.['Grace Time'] || '00:30';
          const onsiteGrace = leaveConfig?.[GRACE_TIME_ON_SITE_KEY];
          updatedValues.graceTimeOnSite =
            onsiteGrace !== undefined && onsiteGrace !== null && String(onsiteGrace).trim() !== ''
              ? String(onsiteGrace)
              : '11:00';

          const enforceRaw = leaveConfig?.[ENFORCE_ONSITE_DEADLINE_KEY];
          if (typeof enforceRaw === 'boolean') {
            updatedValues.enforceOnsiteDeadline = enforceRaw;
          } else if (enforceRaw !== undefined && enforceRaw !== null) {
            const lowered = String(enforceRaw).trim().toLowerCase();
            updatedValues.enforceOnsiteDeadline = !(
              lowered === 'false' || lowered === '0' || lowered === 'no'
            );
          } else {
            updatedValues.enforceOnsiteDeadline = true;
          }
        } catch (error) {
          console.error('[DailyShiftTime] Error loading LEAVE_MANAGEMENT config:', error);
        }

        
        setInitialValues(updatedValues);
      } catch (error) {
        console.error('[DailyShiftTime] Error loading data:', error);
        errorConfirmation('Failed to load shift configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
    // Reload whenever the configured entity (org/branch) changes.
  }, [scope?.companyId, scope?.branchId]);

const to12HourFormat = (time: string): string => {
  if (!time) return "";
  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12; // convert 0 or 12 → 12
  return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
};

// Convert "13:00" to "1:00 PM" (without leading zero)
const to12HourFormatNoLeadingZero = (time: string): string => {
  if (!time) return "";
  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12; // convert 0 or 12 → 12
  return `${hour}:${minute} ${ampm}`;
};

// Convert "09:30 AM" or "06:45 PM" to "09:30" or "18:45"
const to24HourFormat = (time: string): string => {
  if (!time) return "";
  const [timePart, period] = time.trim().split(" ");
  if (!period) return timePart; // already 24-hour

  let [hours, minutes] = timePart.split(":").map(Number);
  const isPM = period.toUpperCase() === "PM";

  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};


const handleSubmit = async (values: ShiftValues) => {
  try {
    setIsSaving(true);

    // Step 1: Save each day's shift to dayWiseShift table
    for (const day of days) {
      const dayKey = day.toLowerCase() as WeekdayKey;
      const checkIn = values[`${dayKey}_checkIn`];
      const checkOut = values[`${dayKey}_checkOut`];
      const isHoliday = values[`${dayKey}_isHoliday`] === 'yes';

      // Convert to 12-hour format for payload
      const formattedCheckIn = to12HourFormat(checkIn as string);
      const formattedCheckOut = to12HourFormat(checkOut as string);

      // Only update a row that belongs to THIS exact scope; otherwise create a scoped row
      // so an inherited/global row is never overwritten.
      const sc = { companyId: scope?.companyId ?? null, branchId: scope?.branchId ?? null };
      const existingShift = dayWiseShifts.find(
        s => s.day.toLowerCase() === dayKey
          && (s.companyId ?? null) === sc.companyId
          && (s.branchId ?? null) === sc.branchId
      );

      const shiftData = {
        day: day,
        checkIn: formattedCheckIn || null,  // backend accepts null too
        checkOut: formattedCheckOut || null,
        isActive: !isHoliday,
        companyId: sc.companyId,
        branchId: sc.branchId,
      };

      if (existingShift?.id) {
        await updateDayWiseShiftById(existingShift.id, shiftData);
      } else {
        await createDayWiseShift(shiftData);
      }
    }

    // Step 2: Save lunch & grace configuration (unchanged)
    try {
      const leaveConfigResponse = await fetchConfiguration(LEAVE_MANAGEMENT, undefined, undefined, scope);
      const existingConfig = safeJsonParse(
        leaveConfigResponse?.data?.configuration?.configuration || '{}'
      );

      // Convert lunch times from 24-hour to 12-hour format (without leading zero)
      const lunchStart24 = values.lunchTimeStart;
      const lunchEnd24 = values.lunchTimeEnd;
      const lunchStart = to12HourFormatNoLeadingZero(lunchStart24);
      const lunchEnd = to12HourFormatNoLeadingZero(lunchEnd24);

      const lunchStartMinutes = timeToMinutes(lunchStart);
      const lunchEndMinutes = timeToMinutes(lunchEnd);
      const lunchDuration = lunchEndMinutes - lunchStartMinutes;
      const deductionTimeFormatted = minutesToTimeFormat(lunchDuration);

      // Derive the representative "Check-in time" / "Check-out time" for the config from the
      // grid (first non-holiday day). The day-wise table holds per-day overrides, but several
      // consumers — the frontend attendance display (fetchCompanyTimings) and the salary
      // baseline checkinTime — read these single config fields. Keeping them in sync with the
      // grid is what makes a shift-time change actually reach attendance + payroll.
      let repCheckIn: string | undefined;
      let repCheckOut: string | undefined;
      for (const day of days) {
        const dk = day.toLowerCase() as WeekdayKey;
        if (values[`${dk}_isHoliday`] === 'yes') continue;
        const ci = values[`${dk}_checkIn`] as string;
        const co = values[`${dk}_checkOut`] as string;
        if (ci) repCheckIn = to12HourFormatNoLeadingZero(ci);
        if (co) repCheckOut = to12HourFormatNoLeadingZero(co);
        if (repCheckIn) break;
      }

      const updatedConfig = {
        ...existingConfig,
        ...(repCheckIn ? { 'Check-in time': repCheckIn } : {}),
        ...(repCheckOut ? { 'Check-out time': repCheckOut } : {}),
        'Lunch Time': `${lunchStart} - ${lunchEnd}`,
        'Deduction Time': deductionTimeFormatted,
        'Grace Time': values.graceTimeOffice,
        [ENFORCE_ONSITE_DEADLINE_KEY]: values.enforceOnsiteDeadline,
        [GRACE_TIME_ON_SITE_KEY]: values.enforceOnsiteDeadline
          ? values.graceTimeOnSite
          : null,
      };

      // Upsert the config for THIS exact scope. The backend finds-or-creates the row for
      // the given companyId/branchId — it NEVER edits an inherited/global row, so editing
      // one org/branch can't change another's config.
      const response = await createNewConfiguration({
        module: LEAVE_MANAGEMENT,
        configuration: updatedConfig,
        companyId: scope?.companyId,
        branchId: scope?.branchId,
      } as any);
      setLeaveManagementConfigId(response?.data?.configuration?.id || null);
    } catch (error) {
      console.error('[DailyShiftTime] Error saving LEAVE_MANAGEMENT config:', error);
    }

    successConfirmation('Shift configuration saved successfully!');
    // window.location.reload();
  } catch (error) {
    console.error('[DailyShiftTime] Error saving shift configuration:', error);
    errorConfirmation('Failed to save shift configuration');
  } finally {
    setIsSaving(false);
  }
};


  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
    <Formik
      enableReinitialize
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue, resetForm }) => (
        <FormikForm>
          <Box sx={{ p: { xs: 1.75, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>

                {/* Bulk Apply — set check-in/out once and push to weekdays or all days */}
                <GlassSurface variant="thin" radius={14} sx={{
                  p: { xs: 1.5, sm: 1.75 }, display: 'flex', flexDirection: { xs: 'column', lg: 'row' },
                  alignItems: { xs: 'stretch', lg: 'center' }, gap: { xs: 1.5, lg: 2 },
                  border: `1px dashed ${TRIO.blue.bd}`, backgroundColor: TRIO.blue.bg,
                }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
                    <IconBox icon="magic-star" trio={TRIO.blue} size={34} fs="fs-4" />
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>Apply to all</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0, width: { xs: '100%', lg: 'auto' } }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <MobileTimePicker
                          value={bulkCheckIn}
                          onChange={(val) => setBulkCheckIn(val)}
                          slotProps={{ textField: { placeholder: 'Check-in', size: 'small', fullWidth: true, sx: bulkPickerSx } }}
                        />
                      </LocalizationProvider>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <MobileTimePicker
                          value={bulkCheckOut}
                          onChange={(val) => setBulkCheckOut(val)}
                          slotProps={{ textField: { placeholder: 'Check-out', size: 'small', fullWidth: true, sx: bulkPickerSx } }}
                        />
                      </LocalizationProvider>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                    <WtButton ghost onClick={() => {
                      const ci = bulkCheckIn?.format('HH:mm');
                      const co = bulkCheckOut?.format('HH:mm');
                      weekdays.forEach(d => { if (ci) setFieldValue(`${d}_checkIn`, ci); if (co) setFieldValue(`${d}_checkOut`, co); });
                    }} sx={{ minHeight: 38, fontSize: 13, px: 1.75 }}>Weekdays</WtButton>
                    <WtButton ghost onClick={() => {
                      const ci = bulkCheckIn?.format('HH:mm');
                      const co = bulkCheckOut?.format('HH:mm');
                      allDays.forEach(d => { if (ci) setFieldValue(`${d}_checkIn`, ci); if (co) setFieldValue(`${d}_checkOut`, co); });
                    }} sx={{ minHeight: 38, fontSize: 13, px: 1.75 }}>All days</WtButton>
                    <WtButton ghost onClick={() => resetForm()} sx={{ minHeight: 38, fontSize: 13, px: 1.75 }}>Reset</WtButton>
                  </Stack>
                </GlassSurface>

                {/* Per-day schedule — responsive card grid (replaces the old dual desktop-table / mobile-card views) */}
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {days.map((day) => {
                  const dayKey = day.toLowerCase() as WeekdayKey;
                  const checkInKey = `${dayKey}_checkIn` as `${WeekdayKey}_checkIn`;
                  const checkOutKey = `${dayKey}_checkOut` as `${WeekdayKey}_checkOut`;
                  const isHolidayKey = `${dayKey}_isHoliday` as `${WeekdayKey}_isHoliday`;

                  const isHoliday = values[isHolidayKey] === 'yes';

                  // Calculate Total Shift Time and Total Working Time dynamically
                  const calculateTimes = () => {
                    try {
                      const checkIn = values[checkInKey] as string;
                      const checkOut = values[checkOutKey] as string;
                      const lunchStart = values.lunchTimeStart;
                      const lunchEnd = values.lunchTimeEnd;

                      if (!checkIn || !checkOut || !lunchStart || !lunchEnd) {
                        return { shiftTime: '0:00', workingTime: '0:00' };
                      }

                      // Convert times to minutes
                      const checkInMinutes = timeToMinutes(checkIn);
                      const checkOutMinutes = timeToMinutes(checkOut);
                      const lunchStartMinutes = timeToMinutes(lunchStart);
                      const lunchEndMinutes = timeToMinutes(lunchEnd);

                      // Calculate lunch duration
                      const lunchDuration = lunchEndMinutes - lunchStartMinutes;

                      // Calculate total shift time (check-out - check-in)
                      let totalShiftMinutes = checkOutMinutes - checkInMinutes;
                      if (totalShiftMinutes < 0) totalShiftMinutes += 24 * 60; // Handle overnight

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
                        shiftTime: formatTime(totalShiftMinutes),
                        workingTime: formatTime(workingMinutes)
                      };
                    } catch (error) {
                      return { shiftTime: '0:00', workingTime: '0:00' };
                    }
                  };

                  const { shiftTime, workingTime } = calculateTimes();

                  const trio = isHoliday ? TRIO.slate : TRIO.blue;

                  return (
                    <Grid item xs={12} sm={6} lg={4} key={day}>
                      <GlassSurface variant="thin" sx={{
                        p: { xs: 1.5, sm: 1.75 }, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25,
                        borderTop: `3.5px solid ${trio.c}`, opacity: isHoliday ? 0.6 : 1,
                        transition: 'opacity .2s, box-shadow .2s, transform .2s',
                        '&:hover': { boxShadow: T.shadow.cardHover, transform: 'translateY(-2px)' },
                        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em' }}>{day}</Typography>
                          {isHoliday && (
                            <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: TRIO.slate.c, backgroundColor: TRIO.slate.bg, border: `1px solid ${TRIO.slate.bd}`, px: 1, py: '2px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Off day</Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography component="label" sx={pickerLabelSx}>Check-in</Typography>
                            <TimePickerInput formikField={`${dayKey}_checkIn`} label="" isRequired={false} placeholder="Check-in" />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography component="label" sx={pickerLabelSx}>Check-out</Typography>
                            <TimePickerInput formikField={`${dayKey}_checkOut`} label="" isRequired={false} placeholder="Check-out" />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 'auto' }}>
                          <TimeStat label="Working" value={workingTime} />
                          <TimeStat label="Shift" value={shiftTime} />
                        </Box>
                      </GlassSurface>
                    </Grid>
                  );
                })}
                </Grid>

                {/* Lunch, deduction & grace settings */}
                <GlassSurface variant="thin" radius={16} sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} md={7}>
                      <Typography sx={settingLabelSx}>Lunch Time</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 0.75 }}>
                        <TimePickerInput formikField="lunchTimeStart" label="" isRequired={true} placeholder="Start time" />
                        <TimePickerInput formikField="lunchTimeEnd" label="" isRequired={true} placeholder="End time" />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Typography sx={settingLabelSx}>Deduction Time</Typography>
                      <Box sx={{ mt: 0.75 }}>
                        <TimeStat label="Auto-derived" value={(() => {
                          try {
                            const lunchStart = values.lunchTimeStart;
                            const lunchEnd = values.lunchTimeEnd;
                            if (lunchStart && lunchEnd) {
                              const lunchStartMinutes = timeToMinutes(lunchStart);
                              const lunchEndMinutes = timeToMinutes(lunchEnd);
                              const lunchDuration = lunchEndMinutes - lunchStartMinutes;
                              return minutesToTimeFormat(lunchDuration > 0 ? lunchDuration : 0);
                            }
                            return '0:00 Hrs';
                          } catch {
                            return '0:00 Hrs';
                          }
                        })()} />
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ height: '1px', backgroundColor: T.color.line }} />

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5} md={4}>
                      <Typography sx={settingLabelSx}>Grace Time — Office</Typography>
                    </Grid>
                    <Grid item xs={12} sm={7} md={4}>
                      <TextInput formikField="graceTimeOffice" isRequired={true} placeholder="00:30" />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5} md={4} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <WtSwitch
                        checked={values.enforceOnsiteDeadline}
                        onChange={(e) => setFieldValue('enforceOnsiteDeadline', e.target.checked)}
                        title={values.enforceOnsiteDeadline ? 'On-site check-ins use the deadline below' : 'Off: on-site check-ins are always on time'}
                      />
                      <Typography sx={settingLabelSx}>Grace Time — On Site</Typography>
                    </Grid>
                    {values.enforceOnsiteDeadline && (
                      <Grid item xs={12} sm={7} md={4}>
                        <TextInput formikField="graceTimeOnSite" isRequired={true} placeholder="11:00" />
                      </Grid>
                    )}
                  </Grid>
                </GlassSurface>

            {/* Save Button */}
            <Box sx={{ mt: 3.5, display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
              <WtButton
                type="submit" tone="primary" disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <KTIcon iconName="check-circle" className="fs-3" />}
                sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 220 } }}
              >
                {isSaving ? 'Saving…' : 'Save Shift Configuration'}
              </WtButton>
            </Box>
          </Box>
        </FormikForm>
      )}
    </Formik>
    </>
  );
};

export default DailyShiftTime;
