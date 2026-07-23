import { safeJsonParse } from '@utils/safeJson';
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassCard, WtButton, Spinner } from "@app/modules/common/components/ui/tw";
import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Rules from "../personal/views/information/Rules";
import Faqs from "../personal/views/information/Faqs";
import { LEAVE_ATTENDANCE_KEY, DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT, RESTRICT_ATTENDANCE_TO_7_DAYS_KEY } from "@constants/configurations-key";
import AddonLeavesAllowanceCard from "@app/modules/common/components/AddonLeavesAllowanceCard";
import { useConfiguration } from "@hooks/useConfiguration";
import { fetchConfiguration, fetchCompanyOverview, updateCompanyOverview, createNewConfiguration, updateConfigurationById } from "@services/company";
import { setFeatureConfiguration } from "@redux/slices/featureConfiguration";
import Loader from "@app/modules/common/utils/Loader";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import FaqsMainPage from "@pages/company/organisationInfo/faqs/FaqsMainPage";
import TextInput from "@app/modules/common/inputs/TextInput";
import { Formik, Form } from "formik";
import * as Yup from "yup";

const Information = () => {
    
    const fromAdmin = true;
    const dispatch = useDispatch();
    const featureConfig = useSelector((state: any) => state.featureConfiguration);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string>("");
    const [lunchDeductionTimeValue, setLunchDeductionTimeValue] = useState<boolean>(false);
    const [isSavingLunchConfig, setIsSavingLunchConfig] = useState(false);
    const [restrictToNDaysValue, setRestrictToNDaysValue] = useState<number>(1);
    const [isSavingRestrictConfig, setIsSavingRestrictConfig] = useState(false);

    const updateReduxConfig = useCallback((lunchValue: boolean) => {
        dispatch(
            setFeatureConfiguration({
                disableLaunchDeductionTime: lunchValue,
                leaveManagement: featureConfig.leaveManagement ?? {},
            })
        );
    }, [dispatch, featureConfig.leaveManagement]);

    const updateReduxRestrictConfig = useCallback((restrictValue: number) => {
        dispatch(
            setFeatureConfiguration({
                disableLaunchDeductionTime: featureConfig.disableLaunchDeductionTime ?? false,
                restrictAttendanceTo7Days: restrictValue,
                leaveManagement: featureConfig.leaveManagement ?? {},
            })
        );
    }, [dispatch, featureConfig.disableLaunchDeductionTime, featureConfig.leaveManagement]);

    const {
        value: disableLunchDeductionTime,
        saving,
        handleToggle,
        loadConfiguration: loadLunchConfig
    } = useConfiguration(
        DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
        'disableLaunchDeductionTime',
        updateReduxConfig
    );

    // Custom configuration management for number-based restriction
    const [restrictAttendanceTo7Days, setRestrictAttendanceTo7Days] = useState<number>(1);
    const [savingRestrictConfig, setSavingRestrictConfig] = useState(false);
    const [restrictConfigId, setRestrictConfigId] = useState<string | null>(null);
    
    const loadRestrictConfig = async () => {
        try {
            const response = await fetchConfiguration(RESTRICT_ATTENDANCE_TO_7_DAYS_KEY);
            const parsed = safeJsonParse(response?.data?.configuration?.configuration || '{}');
            let restrictValue = parsed?.restrictAttendanceTo7Days;
            
            // Handle migration from boolean to number
            if (typeof restrictValue === 'boolean') {
                restrictValue = restrictValue ? 7 : 0; // true -> 7 days, false -> disabled
            } else if (typeof restrictValue !== 'number' || restrictValue < 0) {
                restrictValue = 1; // Default to 1 day
            }
            
            setRestrictAttendanceTo7Days(restrictValue);
            setRestrictConfigId(response?.data?.configuration?.id || null);
            updateReduxRestrictConfig(restrictValue);
            return restrictValue;
        } catch (error) {
            console.error('Error loading restriction config:', error);
            setRestrictAttendanceTo7Days(1);
            updateReduxRestrictConfig(1);
            return 1;
        }
    };

    const handleLunchDeductionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('[Information] Toggle changed to:', e.target.checked);
        setLunchDeductionTimeValue(e.target.checked);
    };

    const handleSaveLunchConfig = async () => {
        try {
            setIsSavingLunchConfig(true);
            console.log('[Information] Saving lunch config with value:', lunchDeductionTimeValue);
            console.log('[Information] Hook value (disableLunchDeductionTime):', disableLunchDeductionTime);
            await handleToggle({ target: { checked: lunchDeductionTimeValue } } as any);
            console.log('[Information] Save successful, value is now:', lunchDeductionTimeValue);
            successConfirmation("Lunch deduction time setting saved successfully!");
        } catch (error) {
            console.error("Failed to save lunch deduction time setting:", error);
            errorConfirmation("Failed to save lunch deduction time setting.");
        } finally {
            setIsSavingLunchConfig(false);
        }
    };

    const handleRestrictDaysChange = (value: number) => {
        setRestrictToNDaysValue(value);
    };

    const handleSaveRestrictConfig = async () => {
        if (restrictToNDaysValue <= 0) {
            errorConfirmation("Minimum required value is 1");
            return;
        }
        
        try {
            setIsSavingRestrictConfig(true);
            
            const payload = { restrictAttendanceTo7Days: restrictToNDaysValue };
            
            if (restrictConfigId) {
                await updateConfigurationById(restrictConfigId, {
                    module: RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
                    configuration: payload,
                });
            } else {
                const response = await createNewConfiguration({
                    module: RESTRICT_ATTENDANCE_TO_7_DAYS_KEY,
                    configuration: payload,
                });
                setRestrictConfigId(response?.data?.configuration?.id || null);
            }
            
            setRestrictAttendanceTo7Days(restrictToNDaysValue);
            updateReduxRestrictConfig(restrictToNDaysValue);
            
            successConfirmation("Attendance restriction setting saved successfully!");
        } catch (error) {
            console.error("Failed to save attendance restriction setting:", error);
            errorConfirmation("Failed to save attendance restriction setting.");
        } finally {
            setIsSavingRestrictConfig(false);
        }
    };

    useEffect(() => {
        const loadConfigurations = async () => {
            try {
                setIsLoading(true);
                console.log('[Information] Loading configurations...');
                const [lunchConfigRes, __, leaveManagementRes, companyOverviewRes] = await Promise.all([
                    fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY),
                    loadRestrictConfig(),
                    fetchConfiguration(LEAVE_MANAGEMENT),
                    fetchCompanyOverview(),
                ]);

                // Parse lunch deduction config manually for initial values
                const lunchConfig = safeJsonParse(lunchConfigRes?.data?.configuration?.configuration || '{}');
                // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
                const lunchEnabled = lunchConfig?.disableLaunchDeductionTime ?? lunchConfig?.disableLunchDeductionTime ?? false;
                console.log('[Information] Parsed lunch config:', lunchEnabled);

                // Also load it in the hook for saving functionality
                await loadLunchConfig();
                console.log('[Information] After loadLunchConfig, disableLunchDeductionTime:', disableLunchDeductionTime);

                const parsedLeaveMgmt = safeJsonParse(
                    leaveManagementRes?.data?.configuration?.configuration || "{}"
                );

                // Load company overview data
                const companyOverview = companyOverviewRes?.data?.companyOverview?.[0];
                if (companyOverview) {
                    setCompanyId(companyOverview.id);
                }

                // Set the initial lunch value directly from parsed config
                setLunchDeductionTimeValue(lunchEnabled);
                console.log('[Information] Set lunchDeductionTimeValue to:', lunchEnabled);

                dispatch(
                    setFeatureConfiguration({
                        disableLaunchDeductionTime: lunchEnabled,
                        restrictAttendanceTo7Days: Number(restrictAttendanceTo7Days),
                        leaveManagement: parsedLeaveMgmt ?? {},
                    })
                );
            } catch (error) {
                console.error("Error loading configuration:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadConfigurations();
    }, [dispatch]);

    // NOTE: We don't need a sync useEffect here anymore!
    // The initial value is set directly in loadConfigurations from the API response.
    // The hook (useConfiguration) is only used for saving, not for displaying the value.
    // When you save via handleToggle, it updates the backend and that's it.
    // When you come back to this page, loadConfigurations fetches fresh data and sets lunchDeductionTimeValue.

    useEffect(() => {
        setRestrictToNDaysValue(restrictAttendanceTo7Days);
    }, [restrictAttendanceTo7Days]);

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div className="flex flex-col gap-4">
            <GlassCard preset="section" className="p-4 sm:p-5">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                    <label htmlFor="disable-lunch-deduction" className="font-semibold text-slate-900">
                        Enable Lunch Deduction Time
                    </label>
                    <div className="flex gap-3 items-center">
                        <div className="form-check form-switch">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="disable-lunch-deduction"
                                checked={lunchDeductionTimeValue}
                                onChange={handleLunchDeductionToggle}
                                disabled={isSavingLunchConfig}
                            />
                        </div>
                        <WtButton onClick={handleSaveLunchConfig} disabled={isSavingLunchConfig}
                            startIcon={isSavingLunchConfig ? <Spinner size={14} color="#fff" /> : undefined}
                            className="min-w-[80px]">
                            Save
                        </WtButton>
                    </div>
                </div>
            </GlassCard>

            <GlassCard preset="section" className="p-4 sm:p-5">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <div className="font-semibold text-slate-900">Restrict Attendance Requests (Days)</div>
                        <div className="text-[12.5px] text-slate-500">Enter number of calendar days to restrict attendance requests</div>
                    </div>
                    <Formik
                        initialValues={{ restrictDays: restrictToNDaysValue }}
                        enableReinitialize={true}
                        validationSchema={Yup.object({
                            restrictDays: Yup.number()
                                .min(1, "Value must be 1 or greater")
                                .max(365, "Value cannot exceed 365 days")
                                .required("Required")
                        })}
                        onSubmit={() => {}}
                    >
                        {(formik) => (
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="w-[125px]">
                                    <TextInput
                                        isRequired={true}
                                        formikField="restrictDays"
                                        type="number"
                                        inputValidation="numbers"
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value) || 0;
                                            formik.setFieldValue('restrictDays', value);
                                            handleRestrictDaysChange(value);
                                        }}
                                        placeholder="Enter days"
                                    />
                                </div>
                                <WtButton onClick={handleSaveRestrictConfig}
                                    disabled={isSavingRestrictConfig || formik.values.restrictDays < 1}
                                    startIcon={isSavingRestrictConfig ? <Spinner size={14} color="#fff" /> : undefined}
                                    className="min-w-[80px]">
                                    Save
                                </WtButton>
                            </div>
                        )}
                    </Formik>
                </div>
            </GlassCard>

            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="md:basis-7/12 md:grow min-w-0">
                    <Rules fromAdmin={fromAdmin} />
                </div>
                <div className="md:basis-5/12 md:grow min-w-0">
                    <Faqs fromAdmin={fromAdmin} typeKey={LEAVE_ATTENDANCE_KEY} />
                </div>
            </div>

            <AddonLeavesAllowanceCard />
        </div>
    );
}

export default Information;
