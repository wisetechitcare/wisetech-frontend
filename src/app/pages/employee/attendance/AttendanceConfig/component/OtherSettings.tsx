import { safeJsonParse } from '@utils/safeJson';
import React, { useState, useEffect, useCallback } from 'react';
import { KTIcon } from '@metronic/helpers';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
// Same MUI glass kit as the Sandwich Leave benchmark — single source of truth for the look.
import { WtButton, WtSwitch, GlassSurface, IconBox, TRIO, type Trio } from '@app/modules/common/components/ui';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
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
  restrictAttendanceRequestDays: string;
  showDataUpToToday: string;
  monthlyAnnualLeaveLimit: string;
}

/**
 * One settings row — glass surface, readable type scale, and a control slot on the right.
 * Fully responsive: label + control sit side-by-side on ≥sm and stack cleanly on phones, with the
 * control pinned at flexShrink:0 so it can never be squeezed/shrunk by a long label (the exact bug
 * the old Bootstrap `Col md={8}/md={4}` split produced). Reused for every row so spacing, contrast,
 * and breakpoints stay identical across the whole form.
 */
function SettingRow({ icon, trio, title, desc, control }: {
  icon: string; trio: Trio; title: string; desc?: string; control: React.ReactNode;
}) {
  return (
    <GlassSurface variant="thin" sx={{
      p: { xs: 1.5, sm: 1.75 },
      display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between',
      gap: { xs: 1.25, sm: 2 },
      transition: 'border-color .15s, box-shadow .15s',
      '&:hover': { borderColor: trio.bd },
    }}>
      <Stack direction="row" spacing={1.5} alignItems={desc ? 'flex-start' : 'center'} sx={{ minWidth: 0, flex: 1 }}>
        <IconBox icon={icon} trio={trio} size={38} fs="fs-3" />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.35, letterSpacing: '-0.01em' }}>{title}</Typography>
          {desc && <Typography sx={{ fontSize: 13.5, color: '#55606F', mt: 0.4, lineHeight: 1.55 }}>{desc}</Typography>}
        </Box>
      </Stack>
      <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' }, display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, pl: { xs: 0, sm: 2 } }}>
        {control}
      </Box>
    </GlassSurface>
  );
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

  const validationSchema = Yup.object().shape({
    allowedDistance: Yup.number()
      .min(0, 'Distance must be 0 or greater')
      .required('Allowed distance is required'),
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
      const lunchConfig = safeJsonParse(lunchConfigRes?.data?.configuration?.configuration || '{}');
      // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
      const lunchEnabled = lunchConfig?.disableLaunchDeductionTime ?? lunchConfig?.disableLunchDeductionTime ?? false;
      console.log('[OtherSettings] Parsed lunch config:', lunchEnabled);

      // Also load it in the hook for saving functionality
      await loadLunchConfig();

      // Parse leave management config for on-site/holiday/weekend setting and monthly annual leave limit
      const leaveManagementConfig = safeJsonParse(leaveManagementConfigRes?.data?.configuration?.configuration || '{}');
      const onSiteValue = leaveManagementConfig?.[onSiteAndHolidayWeekendSettingsOnOffName];
      const onSiteEnabled = onSiteValue === '1' || onSiteValue === 1;
      const monthlyAnnualLeaveLimit = leaveManagementConfig?.['Number of Annual Leaves allowed per month'] || '2';
      setLeaveManagementConfigId(leaveManagementConfigRes?.data?.configuration?.id || null);

      // Parse restrict attendance days config
      const restrictConfig = safeJsonParse(restrictConfigRes?.data?.configuration?.configuration || '{}');
      let restrictDays = restrictConfig?.restrictAttendanceTo7Days;
      // Handle migration from boolean to number
      if (typeof restrictDays === 'boolean') {
        restrictDays = restrictDays ? 7 : 1;
      } else if (typeof restrictDays !== 'number' || restrictDays < 1) {
        restrictDays = 7;
      }
      setRestrictConfigId(restrictConfigRes?.data?.configuration?.id || null);

      // Parse date settings config
      const dateConfig = safeJsonParse(dateConfigRes?.data?.configuration?.configuration || '{}');
      const dateSettingsEnabled = dateConfig?.useDateSettings ?? false;
      setDateConfigId(dateConfigRes?.data?.configuration?.id || null);

      // Get app settings (distance)
      const appSettings = companySettingsRes?.data?.appSettings;
      const allowedDistance = appSettings?.distanceAllowedInMeters || 12;
      setAppSettingsId(appSettings?.id || '');

      // Get company overview
      const companyOverview = companyOverviewRes?.data?.companyOverview?.[0];
      setCompanyId(companyOverview?.id || '');

      // Set initial values (use manually parsed lunchEnabled, not hook value)
      const newInitialValues = {
        enableLunchDeduction: lunchEnabled ? 'on' : 'off',
        onSiteHolidayWeekendSettings: onSiteEnabled ? 'on' : 'off',
        allowedDistance: allowedDistance.toString(),
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
        const currentLeaveManagementConfig = safeJsonParse(leaveManagementConfigRes?.data?.configuration?.configuration || '{}');

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

      // 4. Save restrict attendance days
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
      {({ values, setFieldValue }) => (
        <FormikForm>
          <Box sx={{ p: { xs: 1.75, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5 } }}>
            {/* Section 1 — Attendance behaviour toggles */}
            <Stack spacing={{ xs: 1.25, sm: 1.5 }}>
              <SettingRow
                icon="calendar-8" trio={TRIO.blue}
                title="Show Data Up to Today"
                desc="When ON, shows data only up to today. When OFF, shows the full period (weekly, monthly, yearly)."
                control={<WtSwitch tone={TRIO.blue.c} checked={values.showDataUpToToday === 'on'} onChange={(e) => setFieldValue('showDataUpToToday', e.target.checked ? 'on' : 'off')} />}
              />
              <SettingRow
                icon="time" trio={TRIO.amber}
                title="Enable Lunch Deduction Time"
                control={<WtSwitch tone={TRIO.amber.c} checked={values.enableLunchDeduction === 'on'} onChange={(e) => setFieldValue('enableLunchDeduction', e.target.checked ? 'on' : 'off')} />}
              />
              <SettingRow
                icon="shield-tick" trio={TRIO.purple}
                title="On-site, Holiday & Weekend Settings for late attendance"
                control={<WtSwitch tone={TRIO.purple.c} checked={values.onSiteHolidayWeekendSettings === 'on'} onChange={(e) => setFieldValue('onSiteHolidayWeekendSettings', e.target.checked ? 'on' : 'off')} />}
              />
            </Stack>

            {/* Section 2 — Limits & geofencing */}
            <Stack spacing={{ xs: 1.25, sm: 1.5 }}>
              <SettingRow
                icon="geolocation" trio={TRIO.cyan}
                title="Allowed check-in distance from office (meters)"
                control={<Box sx={{ width: { xs: '100%', sm: 160 } }}><TextInput formikField="allowedDistance" isRequired placeholder="100" inputValidation="numbers" /></Box>}
              />
              <SettingRow
                icon="calendar-tick" trio={TRIO.green}
                title="Number of Annual Leaves allowed per month"
                control={<Box sx={{ width: { xs: '100%', sm: 160 } }}><TextInput formikField="monthlyAnnualLeaveLimit" isRequired placeholder="2" inputValidation="numbers" /></Box>}
              />
              <SettingRow
                icon="calendar-remove" trio={TRIO.rose}
                title="Restrict Attendance Requests (Days)"
                desc="Enter number of calendar days to restrict attendance requests."
                control={<Box sx={{ width: { xs: '100%', sm: 160 } }}><TextInput formikField="restrictAttendanceRequestDays" isRequired placeholder="7" inputValidation="numbers" /></Box>}
              />
            </Stack>

            {/* Save */}
            <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, pt: 0.5 }}>
              <WtButton
                type="submit" tone="primary" disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <KTIcon iconName="check-circle" className="fs-3" />}
                sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 200 } }}
              >
                {isSaving ? 'Saving…' : 'Save Settings'}
              </WtButton>
            </Box>
          </Box>
        </FormikForm>
      )}
    </Formik>
  );
};

export default OtherSettings;
