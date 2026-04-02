import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import RadioInput, { RadioButton } from '@app/modules/common/inputs/RadioInput';
import { useConfiguration } from '@hooks/useConfiguration';
import {
  DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
  RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
  DATE_SETTINGS_KEY,
  LEAVE_MANAGEMENT
} from '@constants/configurations-key';
import { onSiteAndHolidayWeekendSettingsOnOffName } from '@constants/statistics';
import {
  fetchConfiguration,
  createNewConfiguration,
  updateConfigurationById,
  fetchCompanyOverview,
  updateCompanyOverview
} from '@services/company';
import { fetchCompanySettings, updateCompanySettings } from '@services/options';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { useDispatch, useSelector } from 'react-redux';
import { setFeatureConfiguration } from '@redux/slices/featureConfiguration';
import Loader from '@app/modules/common/utils/Loader';

interface OtherSettingsValues {
  enableLunchDeduction: string;
  onSiteHolidayWeekendSettings: string;
  allowedDistance: string;
  attendanceRequestLimit: string;
  restrictAttendanceRequestDays: string;
  showDataUpToToday: string;
  monthlyAnnualLeaveLimit: string;
}

const OtherSettings: React.FC = () => {
  const dispatch = useDispatch();
  const featureConfig = useSelector((state: any) => state.featureConfiguration);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Configuration IDs
  const [leaveManagementConfigId, setLeaveManagementConfigId] = useState<string | null>(null);
  const [restrictConfigId, setRestrictConfigId] = useState<string | null>(null);
  const [dateConfigId, setDateConfigId] = useState<string | null>(null);

  // AppSettings ID and CompanyOverview ID
  const [appSettingsId, setAppSettingsId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');

  // Redux update callback for lunch deduction configuration
  const updateReduxConfig = useCallback((lunchValue: boolean) => {
    console.log('[OtherSettings] updateReduxConfig called with lunchValue:', lunchValue);
    dispatch(
      setFeatureConfiguration({
        disableLaunchDeductionTime: lunchValue,
        restrictAttendanceTo7Days: featureConfig.restrictAttendanceTo7Days ?? 1,
        leaveManagement: featureConfig.leaveManagement ?? {},
      })
    );
  }, [dispatch, featureConfig.restrictAttendanceTo7Days, featureConfig.leaveManagement]);

  // Use configuration hook for lunch deduction time (same as Information.tsx)
  const {
    value: disableLunchDeductionTime,
    saving: savingLunchConfig,
    handleToggle: handleLunchToggle,
    loadConfiguration: loadLunchConfig
  } = useConfiguration(
    DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
    'disableLaunchDeductionTime',
    updateReduxConfig
  );

  const toggleOptions: RadioButton[] = [
    { label: 'Off', value: 'off' },
    { label: 'On', value: 'on' }
  ];

  const validationSchema = Yup.object().shape({
    allowedDistance: Yup.number()
      .min(0, 'Distance must be 0 or greater')
      .required('Allowed distance is required'),
    attendanceRequestLimit: Yup.number()
      .min(1, 'Limit must be 1 or greater')
      .required('Attendance request limit is required'),
    restrictAttendanceRequestDays: Yup.number()
      .min(1, 'Minimum required value is 1')
      .max(365, 'Value cannot exceed 365 days')
      .required('Restrict attendance request days is required'),
    monthlyAnnualLeaveLimit: Yup.number()
      .min(1, 'Minimum required value is 1')
      .max(31, 'Cannot exceed 31 days per month')
      .required('Monthly annual leave limit is required'),
  });

  const [initialValues, setInitialValues] = useState<OtherSettingsValues>({
    enableLunchDeduction: 'off',
    onSiteHolidayWeekendSettings: 'off',
    allowedDistance: '100',
    attendanceRequestLimit: '2',
    restrictAttendanceRequestDays: '7',
    showDataUpToToday: 'off',
    monthlyAnnualLeaveLimit: '2',
  });

  const loadAllConfigurations = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[OtherSettings] Starting loadAllConfigurations');

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

      // Parse lunch deduction config manually for initial values
      const lunchConfig = JSON.parse(lunchConfigRes?.data?.configuration?.configuration || '{}');
      // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
      const lunchEnabled = lunchConfig?.disableLaunchDeductionTime ?? lunchConfig?.disableLunchDeductionTime ?? false;
      console.log('[OtherSettings] Parsed lunch config:', lunchEnabled);

      // Also load it in the hook for saving functionality
      await loadLunchConfig();

      // Parse leave management config for on-site/holiday/weekend setting and monthly annual leave limit
      const leaveManagementConfig = JSON.parse(leaveManagementConfigRes?.data?.configuration?.configuration || '{}');
      const onSiteValue = leaveManagementConfig?.[onSiteAndHolidayWeekendSettingsOnOffName];
      const onSiteEnabled = onSiteValue === '1' || onSiteValue === 1;
      const monthlyAnnualLeaveLimit = leaveManagementConfig?.['Number of Annual Leaves allowed per month'] || '2';
      setLeaveManagementConfigId(leaveManagementConfigRes?.data?.configuration?.id || null);

      // Parse restrict attendance days config
      const restrictConfig = JSON.parse(restrictConfigRes?.data?.configuration?.configuration || '{}');
      let restrictDays = restrictConfig?.restrictAttendanceTo7Days;
      // Handle migration from boolean to number
      if (typeof restrictDays === 'boolean') {
        restrictDays = restrictDays ? 7 : 1;
      } else if (typeof restrictDays !== 'number' || restrictDays < 1) {
        restrictDays = 7;
      }
      setRestrictConfigId(restrictConfigRes?.data?.configuration?.id || null);

      // Parse date settings config
      const dateConfig = JSON.parse(dateConfigRes?.data?.configuration?.configuration || '{}');
      const dateSettingsEnabled = dateConfig?.useDateSettings ?? false;
      setDateConfigId(dateConfigRes?.data?.configuration?.id || null);

      // Get app settings (distance)
      const appSettings = companySettingsRes?.data?.appSettings;
      const allowedDistance = appSettings?.distanceAllowedInMeters || 12;
      setAppSettingsId(appSettings?.id || '');

      // Get company overview (attendance request limit)
      const companyOverview = companyOverviewRes?.data?.companyOverview?.[0];
      const attendanceLimit = companyOverview?.attendanceRequestRaiseLimit || 2;
      setCompanyId(companyOverview?.id || '');

      // Set initial values (use manually parsed lunchEnabled, not hook value)
      const newInitialValues = {
        enableLunchDeduction: lunchEnabled ? 'on' : 'off',
        onSiteHolidayWeekendSettings: onSiteEnabled ? 'on' : 'off',
        allowedDistance: allowedDistance.toString(),
        attendanceRequestLimit: attendanceLimit.toString(),
        restrictAttendanceRequestDays: restrictDays.toString(),
        showDataUpToToday: dateSettingsEnabled ? 'on' : 'off',
        monthlyAnnualLeaveLimit: monthlyAnnualLeaveLimit.toString(),
      };
      console.log('[OtherSettings] Setting initial values:', newInitialValues);
      setInitialValues(newInitialValues);

      // Update Redux (use manually parsed lunchEnabled)
      dispatch(
        setFeatureConfiguration({
          disableLaunchDeductionTime: lunchEnabled,
          restrictAttendanceTo7Days: restrictDays,
          leaveManagement: featureConfig.leaveManagement ?? {},
        })
      );

    } catch (error) {
      console.error('Error loading configurations:', error);
      errorConfirmation('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, featureConfig.leaveManagement, loadLunchConfig, disableLunchDeductionTime]);

  useEffect(() => {
    loadAllConfigurations();
  }, []);

  const handleSubmit = async (values: OtherSettingsValues) => {
    try {
      setIsSaving(true);
      console.log('[OtherSettings] handleSubmit called with values:', values);
      console.log('[OtherSettings] Current disableLunchDeductionTime:', disableLunchDeductionTime);
      console.log('[OtherSettings] Form lunch value:', values.enableLunchDeduction);

      // 1. Save lunch deduction time setting using the hook (same as Information.tsx)
      const lunchChecked = values.enableLunchDeduction === 'on';
      console.log('[OtherSettings] Calling handleLunchToggle with checked:', lunchChecked);
      try {
        // Pass true to skip the individual success confirmation
        await handleLunchToggle({ target: { checked: lunchChecked } } as any, true);
        console.log('[OtherSettings] handleLunchToggle completed');
      } catch (error) {
        console.error('[OtherSettings] handleLunchToggle failed:', error);
        throw error; // Re-throw to prevent saving other settings if lunch fails
      }

      // 2. Save on-site/holiday/weekend setting and monthly annual leave limit (stored in LEAVE_MANAGEMENT)
      if (leaveManagementConfigId) {
        const leaveManagementConfigRes = await fetchConfiguration(LEAVE_MANAGEMENT);
        const currentLeaveManagementConfig = JSON.parse(leaveManagementConfigRes?.data?.configuration?.configuration || '{}');

        currentLeaveManagementConfig[onSiteAndHolidayWeekendSettingsOnOffName] = values.onSiteHolidayWeekendSettings === 'on' ? '1' : '0';
        currentLeaveManagementConfig['Number of Annual Leaves allowed per month'] = values.monthlyAnnualLeaveLimit;

        await updateConfigurationById(leaveManagementConfigId, {
          module: LEAVE_MANAGEMENT,
          configuration: currentLeaveManagementConfig,
        });
      } else {
        const leaveManagementPayload = {
          [onSiteAndHolidayWeekendSettingsOnOffName]: values.onSiteHolidayWeekendSettings === 'on' ? '1' : '0',
          'Number of Annual Leaves allowed per month': values.monthlyAnnualLeaveLimit
        };
        const response = await createNewConfiguration({
          module: LEAVE_MANAGEMENT,
          configuration: leaveManagementPayload,
        });
        setLeaveManagementConfigId(response?.data?.configuration?.id || null);
      }

      // 3. Save allowed distance (AppSettings)
      if (appSettingsId) {
        await updateCompanySettings(
          { distanceAllowedInMeters: Number(values.allowedDistance) },
          appSettingsId
        );
      }

      // 4. Save attendance request limit (CompanyOverview)
      if (companyId) {
        await updateCompanyOverview(companyId, {
          attendanceRequestRaiseLimit: values.attendanceRequestLimit,
        });
      }

      // 5. Save restrict attendance days
      const restrictDays = Number(values.restrictAttendanceRequestDays);
      const restrictPayload = { restrictAttendanceTo7Days: restrictDays };
      if (restrictConfigId) {
        await updateConfigurationById(restrictConfigId, {
          module: RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
          configuration: restrictPayload,
        });
      } else {
        const response = await createNewConfiguration({
          module: RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
          configuration: restrictPayload,
        });
        setRestrictConfigId(response?.data?.configuration?.id || null);
      }

      // 6. Save date settings
      const datePayload = { useDateSettings: values.showDataUpToToday === 'on' };
      if (dateConfigId) {
        await updateConfigurationById(dateConfigId, {
          module: DATE_SETTINGS_KEY,
          configuration: datePayload,
        });
      } else {
        const response = await createNewConfiguration({
          module: DATE_SETTINGS_KEY,
          configuration: datePayload,
        });
        setDateConfigId(response?.data?.configuration?.id || null);
      }

      // Update Redux
      dispatch(
        setFeatureConfiguration({
          disableLaunchDeductionTime: values.enableLunchDeduction === 'on',
          restrictAttendanceTo7Days: restrictDays,
          leaveManagement: featureConfig.leaveManagement ?? {},
        })
      );

      successConfirmation('All settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      errorConfirmation('Failed to save settings. Please try again.');
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
          <div style={{ padding: '24px 20px' }}>
            <Card style={{ borderRadius: '12px', border: 'none' }}>
              <Card.Body style={{ padding: '20px 25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Date Settings */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                          marginBottom: '4px'
                        }}>
                          Show Data Up to Today
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#8696ad',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          When ON, shows data only up to today. When OFF, shows the full period (weekly, monthly, yearly).
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <RadioInput
                          formikField="showDataUpToToday"
                          isRequired={false}
                          radioBtns={toggleOptions}
                          customCss="justify-content-end"
                        />
                      </div>
                    </Col>
                  </Row>
                  {/* Enable Lunch Deduction Time */}
                  <Row className="align-items-center gy-2" style={{ minHeight: '32px' }}>
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Enable Lunch Deduction Time
                      </span>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <RadioInput
                        formikField="enableLunchDeduction"
                        isRequired={false}
                        radioBtns={toggleOptions}
                        customCss="justify-content-end"
                      />
                    </Col>
                  </Row>

                  {/* On-site, Holiday & Weekend Settings */}
                  <Row className="align-items-center gy-2" style={{ minHeight: '32px' }}>
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        On-site, Holiday & Weekend Settings for late attendance
                      </span>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <RadioInput
                        formikField="onSiteHolidayWeekendSettings"
                        isRequired={false}
                        radioBtns={toggleOptions}
                        customCss="justify-content-end"
                      />
                    </Col>
                  </Row>

                  {/* Allowed Distance */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Allowed distance in meters from office for checkin (meters)
                      </span>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <div style={{ width: '100%', maxWidth: '137px' }}>
                        <TextInput
                          formikField="allowedDistance"
                          isRequired={true}
                          placeholder="100"
                          inputValidation="numbers"
                        />
                      </div>
                    </Col>
                  </Row>

                  {/* Attendance Request Raise Limit */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Attendance Request Raise Limit
                      </span>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <div style={{ width: '100%', maxWidth: '137px' }}>
                        <TextInput
                          formikField="attendanceRequestLimit"
                          isRequired={true}
                          placeholder="2"
                          inputValidation="numbers"
                        />
                      </div>
                    </Col>
                  </Row>

                  {/* Number of Annual Leaves allowed per month */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        Number of Annual Leaves allowed per month
                      </span>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <div style={{ width: '100%', maxWidth: '137px' }}>
                        <TextInput
                          formikField="monthlyAnnualLeaveLimit"
                          isRequired={true}
                          placeholder="2"
                          inputValidation="numbers"
                        />
                      </div>
                    </Col>
                  </Row>

                  {/* Restrict Attendance Requests (Days) */}
                  <Row className="align-items-center gy-2">
                    <Col xs={12} sm={12} md={8} lg={9}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                          marginBottom: '4px'
                        }}>
                          Restrict Attendance Requests (Days)
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#8696ad',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          Enter number of calendar days to restrict attendance requests
                        </div>
                      </div>
                    </Col>
                    <Col xs={12} sm={12} md={4} lg={3} className="d-flex justify-content-md-end">
                      <div style={{ width: '100%', maxWidth: '137px' }}>
                        <TextInput
                          formikField="restrictAttendanceRequestDays"
                          isRequired={true}
                          placeholder="7"
                          inputValidation="numbers"
                        />
                      </div>
                    </Col>
                  </Row>


                </div>
              </Card.Body>
            </Card>

            {/* Save Button */}
            <Row className="mt-4">
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
                    <span>
                      Saving...
                      <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
                    </span>
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

export default OtherSettings;
