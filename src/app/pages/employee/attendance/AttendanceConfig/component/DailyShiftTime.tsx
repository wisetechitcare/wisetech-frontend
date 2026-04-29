import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import TimePickerInput from '@app/modules/common/inputs/TimeInput';
import TextInput from '@app/modules/common/inputs/TextInput';
import RadioInput, { RadioButton } from '@app/modules/common/inputs/RadioInput';
import { fetchDayWiseShifts, createDayWiseShift, updateDayWiseShiftById } from '@services/dayWiseShift';
import { fetchConfiguration, updateConfigurationById, createNewConfiguration } from '@services/company';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import Loader from '@app/modules/common/utils/Loader';

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

interface ShiftValues {
  monday_checkIn: string;
  monday_checkOut: string;
  monday_totalWorkingTime: string;
  monday_totalShiftTime: string;
  monday_isHoliday: string;
  tuesday_checkIn: string;
  tuesday_checkOut: string;
  tuesday_totalWorkingTime: string;
  tuesday_totalShiftTime: string;
  tuesday_isHoliday: string;
  wednesday_checkIn: string;
  wednesday_checkOut: string;
  wednesday_totalWorkingTime: string;
  wednesday_totalShiftTime: string;
  wednesday_isHoliday: string;
  thursday_checkIn: string;
  thursday_checkOut: string;
  thursday_totalWorkingTime: string;
  thursday_totalShiftTime: string;
  thursday_isHoliday: string;
  friday_checkIn: string;
  friday_checkOut: string;
  friday_totalWorkingTime: string;
  friday_totalShiftTime: string;
  friday_isHoliday: string;
  saturday_checkIn: string;
  saturday_checkOut: string;
  saturday_totalWorkingTime: string;
  saturday_totalShiftTime: string;
  saturday_isHoliday: string;
  sunday_checkIn: string;
  sunday_checkOut: string;
  sunday_totalWorkingTime: string;
  sunday_totalShiftTime: string;
  sunday_isHoliday: string;
  lunchTimeStart: string;
  lunchTimeEnd: string;
  graceTimeOffice: string;
  graceTimeOnSite: string;
}

interface DayWiseShiftData {
  id: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  isActive: boolean;
}

const DailyShiftTime: React.FC = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dayWiseShifts, setDayWiseShifts] = useState<DayWiseShiftData[]>([]);
  const [leaveManagementConfigId, setLeaveManagementConfigId] = useState<string | null>(null);

  const holidayOptions: RadioButton[] = [
    { label: 'No', value: 'no' },
    { label: 'Yes', value: 'yes' }
  ];

  const validationSchema = Yup.object().shape({
    lunchTimeStart: Yup.string().required('Lunch start time is required'),
    lunchTimeEnd: Yup.string().required('Lunch end time is required'),
    graceTimeOffice: Yup.string().required('Grace time office is required'),
    graceTimeOnSite: Yup.string().required('Grace time on site is required'),
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
    graceTimeOnSite: '00:30',
  });


  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);

        // Load day-wise shifts
        const shiftsResponse = await fetchDayWiseShifts();
        const shifts = shiftsResponse?.data || [];
        
        setDayWiseShifts(shifts);

        // Map API data to form initial values
        const updatedValues = { ...initialValues };
        shifts.forEach((shift: DayWiseShiftData) => {
          const dayKey = shift.day.toLowerCase();

          updatedValues[`${dayKey}_checkIn` as keyof ShiftValues] = to24HourFormat(shift.checkIn || '09:30');
          updatedValues[`${dayKey}_checkOut` as keyof ShiftValues] = to24HourFormat(shift.checkOut || '18:30');
          updatedValues[`${dayKey}_isHoliday` as keyof ShiftValues] = shift.isActive ? 'no' : 'yes';
      });


        // Load LEAVE_MANAGEMENT configuration for lunch and grace times
        try {
          const leaveConfigResponse = await fetchConfiguration(LEAVE_MANAGEMENT);
          const leaveConfig = JSON.parse(leaveConfigResponse?.data?.configuration?.configuration || '{}');
          const configId = leaveConfigResponse?.data?.configuration?.id;

          
          setLeaveManagementConfigId(configId);

          // Parse lunch time (format: "12:30 PM - 1:30 PM") and convert to 24-hour for picker
          const lunchTimeStr = leaveConfig?.['Lunch Time'] || '12:30 PM - 1:30 PM';
          const [lunchStart, lunchEnd] = lunchTimeStr.split(' - ');
          updatedValues.lunchTimeStart = to24HourFormat(lunchStart?.trim() || '12:30 PM');
          updatedValues.lunchTimeEnd = to24HourFormat(lunchEnd?.trim() || '1:30 PM');

          // Parse grace times
          updatedValues.graceTimeOffice = leaveConfig?.['Grace Time'] || '00:30';
          updatedValues.graceTimeOnSite = leaveConfig?.['Grace Time - On Site'] || '00:30';
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
  }, []);

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
      const dayKey = day.toLowerCase();
      const checkIn = values[`${dayKey}_checkIn` as keyof ShiftValues];
      const checkOut = values[`${dayKey}_checkOut` as keyof ShiftValues];
      const isHoliday = values[`${dayKey}_isHoliday` as keyof ShiftValues] === 'yes';

      // Convert to 12-hour format for payload
      const formattedCheckIn = to12HourFormat(checkIn as string);
      const formattedCheckOut = to12HourFormat(checkOut as string);

      const existingShift = dayWiseShifts.find(
        s => s.day.toLowerCase() === dayKey
      );

      const shiftData = {
        day: day,
        checkIn: formattedCheckIn || null,  // backend accepts null too
        checkOut: formattedCheckOut || null,
        isActive: !isHoliday,
      };

      if (existingShift?.id) {
        await updateDayWiseShiftById(existingShift.id, shiftData);
      } else {
        await createDayWiseShift(shiftData);
      }
    }

    // Step 2: Save lunch & grace configuration (unchanged)
    try {
      const leaveConfigResponse = await fetchConfiguration(LEAVE_MANAGEMENT);
      const existingConfig = JSON.parse(
        leaveConfigResponse?.data?.configuration?.configuration || '{}'
      );
      const configId =
        leaveConfigResponse?.data?.configuration?.id || leaveManagementConfigId;

      // Convert lunch times from 24-hour to 12-hour format (without leading zero)
      const lunchStart24 = values.lunchTimeStart;
      const lunchEnd24 = values.lunchTimeEnd;
      const lunchStart = to12HourFormatNoLeadingZero(lunchStart24);
      const lunchEnd = to12HourFormatNoLeadingZero(lunchEnd24);

      const lunchStartMinutes = timeToMinutes(lunchStart);
      const lunchEndMinutes = timeToMinutes(lunchEnd);
      const lunchDuration = lunchEndMinutes - lunchStartMinutes;
      const deductionTimeFormatted = minutesToTimeFormat(lunchDuration);

      const updatedConfig = {
        ...existingConfig,
        'Lunch Time': `${lunchStart} - ${lunchEnd}`,
        'Deduction Time': deductionTimeFormatted,
        'Grace Time': values.graceTimeOffice,
        'Grace Time - On Site': values.graceTimeOnSite,
      };

      if (configId) {
        await updateConfigurationById(configId, {
          module: LEAVE_MANAGEMENT,
          configuration: updatedConfig,
        });
      } else {
        const response = await createNewConfiguration({
          module: LEAVE_MANAGEMENT,
          configuration: updatedConfig,
        });
        setLeaveManagementConfigId(response?.data?.configuration?.id || null);
      }
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
    <Formik
      enableReinitialize
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values }) => (
        <FormikForm placeholder={''}>
          <div style={{
            // backgroundColor: '#f7f9fc',
            padding: '24px 20px',
            // borderRadius: '12px'
          }}>
            {/* <Row className="mb-4">
              <Col>
                <h4 style={{
                  fontFamily: 'Barlow, sans-serif',
                  fontWeight: 600,
                  fontSize: '24px',
                  letterSpacing: '0.24px',
                  marginBottom: 0
                }}>
                  Daily Shift Time
                </h4>
              </Col>
            </Row> */}

            <Card style={{ borderRadius: '12px', border: 'none' }}>
              <Card.Body style={{ padding: '20px 25px' }}>
                {/* Table Header - Only visible on larger screens */}
                <Row className="mb-3 d-none d-lg-flex">
                  <Col lg={2}>
                    <span style={{
                      fontSize: '12px',
                      color: '#8696ad',
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      Day
                    </span>
                  </Col>
                  <Col lg={4}>
                    <Row>
                      <Col lg={6}>
                        <span style={{
                          fontSize: '12px',
                          color: '#8696ad',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          Check-in
                        </span>
                      </Col>
                      <Col lg={6}>
                        <span style={{
                          fontSize: '12px',
                          color: '#8696ad',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          Check-out
                        </span>
                      </Col>
                    </Row>
                  </Col>
                  <Col lg={3}>
                    <Row>
                      <Col lg={6}>
                        <span style={{
                          fontSize: '12px',
                          color: '#8696ad',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          Total Working Time
                        </span>
                      </Col>
                      <Col lg={6}>
                        <span style={{
                          fontSize: '12px',
                          color: '#8696ad',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          Total Shift Time
                        </span>
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Days Rows */}
                {days.map((day) => {
                  const dayKey = day.toLowerCase() as keyof ShiftValues extends `${infer Day}_${string}` ? Day : never;
                  const checkInKey = `${dayKey}_checkIn` as keyof ShiftValues;
                  const checkOutKey = `${dayKey}_checkOut` as keyof ShiftValues;
                  const isHolidayKey = `${dayKey}_isHoliday` as keyof ShiftValues;

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

                  return (
                    <div key={day} style={{ opacity: isHoliday ? 0.4 : 1 }}>
                      {/* Desktop View */}
                      <Row className="mb-3 align-items-center d-none d-lg-flex">
                        <Col lg={2}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: 'Inter, sans-serif'
                          }}>
                            {day}
                          </span>
                        </Col>
                        <Col lg={4}>
                          <Row>
                            <Col lg={6}>
                              <TimePickerInput
                                formikField={`${dayKey}_checkIn`}
                                label=""
                                isRequired={false}
                                placeholder="Check-in"
                              />
                            </Col>
                            <Col lg={6}>
                              <TimePickerInput
                                formikField={`${dayKey}_checkOut`}
                                label=""
                                isRequired={false}
                                placeholder="Check-out"
                              />
                            </Col>
                          </Row>
                        </Col>
                        <Col lg={3}>
                          <Row>
                            <Col lg={6}>
                              <div style={{
                                fontSize: '14px',
                                fontFamily: 'Inter, sans-serif',
                                padding: '10px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                textAlign: 'center'
                              }}>
                                {workingTime}
                              </div>
                            </Col>
                            <Col lg={6}>
                              <div style={{
                                fontSize: '14px',
                                fontFamily: 'Inter, sans-serif',
                                padding: '10px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                textAlign: 'center'
                              }}>
                                {shiftTime}
                              </div>
                            </Col>
                          </Row>
                        </Col>
                      </Row>

                      {/* Mobile/Tablet View */}
                      <div className="d-lg-none mb-4" style={{ borderBottom: '1px solid #e4e6ef', paddingBottom: '16px' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          fontFamily: 'Inter, sans-serif',
                          marginBottom: '12px'
                        }}>
                          {day}
                        </div>
                        <Row className="gy-2">
                          <Col xs={12} sm={6}>
                            <label style={{
                              fontSize: '12px',
                              color: '#8696ad',
                              fontFamily: 'Inter, sans-serif',
                              marginBottom: '4px',
                              display: 'block'
                            }}>
                              Check-in
                            </label>
                            <TimePickerInput
                              formikField={`${dayKey}_checkIn`}
                              label=""
                              isRequired={false}
                              placeholder="Check-in"
                            />
                          </Col>
                          <Col xs={12} sm={6}>
                            <label style={{
                              fontSize: '12px',
                              color: '#8696ad',
                              fontFamily: 'Inter, sans-serif',
                              marginBottom: '4px',
                              display: 'block'
                            }}>
                              Check-out
                            </label>
                            <TimePickerInput
                              formikField={`${dayKey}_checkOut`}
                              label=""
                              isRequired={false}
                              placeholder="Check-out"
                            />
                          </Col>
                          <Col xs={6}>
                            <label style={{
                              fontSize: '12px',
                              color: '#8696ad',
                              fontFamily: 'Inter, sans-serif',
                              marginBottom: '4px',
                              display: 'block'
                            }}>
                              Total Working Time
                            </label>
                            <div style={{
                              fontSize: '14px',
                              fontFamily: 'Inter, sans-serif',
                              padding: '10px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}>
                              {workingTime}
                            </div>
                          </Col>
                          <Col xs={6}>
                            <label style={{
                              fontSize: '12px',
                              color: '#8696ad',
                              fontFamily: 'Inter, sans-serif',
                              marginBottom: '4px',
                              display: 'block'
                            }}>
                              Total Shift Time
                            </label>
                            <div style={{
                              fontSize: '14px',
                              fontFamily: 'Inter, sans-serif',
                              padding: '10px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '4px',
                              textAlign: 'center'
                            }}>
                              {shiftTime}
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  );
                })}

                {/* Divider */}
                <div style={{
                  height: '1px',
                  backgroundColor: '#d2d8e2',
                  margin: '20px 0'
                }} />

                {/* Additional Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Lunch Time */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} lg={2}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Lunch Time
                      </span>
                    </Col>
                    <Col xs={12} lg={4}>
                      <Row className="gy-2">
                        <Col xs={12} sm={6}>
                          <TimePickerInput
                            formikField="lunchTimeStart"
                            label=""
                            isRequired={true}
                            placeholder="Start time"
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <TimePickerInput
                            formikField="lunchTimeEnd"
                            label=""
                            isRequired={true}
                            placeholder="End time"
                          />
                        </Col>
                      </Row>
                    </Col>
                    <Col xs={12} lg={2}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Deduction Time
                      </span>
                    </Col>
                    <Col xs={12} lg={4}>
                      <div style={{
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}>
                        {(() => {
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
                        })()}
                      </div>
                    </Col>
                  </Row>

                  {/* Grace Time - Office */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} lg={2}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Grace Time - Office
                      </span>
                    </Col>
                    <Col xs={12} sm={6} lg={4}>
                      <Row>
                        <Col xs={12} sm={12} lg={6}>
                          <TextInput
                            formikField="graceTimeOffice"
                            isRequired={true}
                            placeholder="00:30"
                          />
                        </Col>
                      </Row>
                    </Col>
                  </Row>

                  {/* Grace Time - On Site */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} lg={2}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Grace Time - On Site
                      </span>
                    </Col>
                    <Col xs={12} sm={6} lg={4}>
                      <Row>
                        <Col xs={12} sm={12} lg={6}>
                          <TextInput
                            formikField="graceTimeOnSite"
                            isRequired={true}
                            placeholder="00:30"
                          />
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>

            {/* Save Button */}
            <Row className="mt-7">
              <Col xs={12}>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-100 w-sm-auto"
                  style={{
                    backgroundColor: '#9d4141',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {isSaving ? (
                    <>
                      Saving...
                      <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </Col>
            </Row>
          </div>
        </FormikForm>
      )}
    </Formik>
  );
};

export default DailyShiftTime;
