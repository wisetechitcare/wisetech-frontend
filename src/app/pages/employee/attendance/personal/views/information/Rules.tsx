import { safeJsonParse } from '@utils/safeJson';
import { KTIcon } from '@metronic/helpers';
import { fetchConfiguration, updateConfigurationById, createNewConfiguration } from '@services/company';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton, IconBox, Spinner, TRIO } from '@app/modules/common/components/ui/tw';
import { Form, Formik, FormikValues } from 'formik';
import TextInput from '@app/modules/common/inputs/TextInput';
import { successConfirmation } from '@utils/modal';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import RadioInput from '@app/modules/common/inputs/RadioInput';
import { onSiteAndHolidayWeekendSettingsOnOffName } from '@constants/statistics';

const ruleSchema = Yup.object({
    name: Yup.string().required().label('Rule'),
    value: Yup.string().required().label('To Follow'),
});

let initialState = {
    name: "",
    value: "",
};

export const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
};

const Rules = ({ fromAdmin = false, title , hideGeneralSettings, scope, readOnly = false}: { fromAdmin?: boolean, title?: string, hideGeneralSettings?: boolean, scope?: { companyId?: string; branchId?: string }, readOnly?: boolean }) => {
    const [configuration, setConfiguration] = useState({});

    // Per-org config: an explicit scope (from the Configure page's org/branch selector) wins;
    // otherwise default to the viewed employee's own org so this editor is NEVER global. This is
    // what stops "Default Shift Rules" and "Daily Shift Time" from writing two different rows.
    const currentEmployeeCompanyId = useSelector((state: RootState) => state.employee?.currentEmployee?.companyId);
    const currentEmployeeBranchId = useSelector((state: RootState) => state.employee?.currentEmployee?.branchId);
    const effectiveScope = {
        companyId: scope?.companyId ?? currentEmployeeCompanyId,
        branchId: scope?.branchId ?? (scope?.companyId ? undefined : currentEmployeeBranchId),
    };
    const isScoped = Boolean(effectiveScope.companyId || effectiveScope.branchId);

    // Write the scoped row (find-or-create by company/branch) so an inherited/global row is never
    // overwritten; fall back to legacy by-id update only when there is no scope at all.
    const saveConfig = async (payload: { module: string; configuration: any }) => {
        if (isScoped) {
            await createNewConfiguration({
                ...payload,
                companyId: effectiveScope.companyId,
                branchId: effectiveScope.branchId,
            } as any);
        } else {
            await updateConfigurationById(ruleId, payload);
        }
    };

    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [show, setShow] = useState(false);

    const [ruleId, setRuleId] = useState('');

    const [oldValue, setOldValue] = useState({ name: undefined, value: '' });

    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    }

    const handleEdit = (rule: any) => {
        setShow(true);
        initialState = {
            name: rule.name,
            value: rule.value
        };
        setEditMode(true);
        setOldValue(rule);
    }

    const handleDelete = async (rule: any) => {
        const config: any = configuration;
        delete config[rule.name];

        const payload = {
            module: LEAVE_MANAGEMENT,
            configuration: config
        };

        await saveConfig(payload);
        successConfirmation('Rule deleted successfully');
        fetchLeaveConfiguration();
    }

    const handleNew = () => {
        setShow(true);
        setEditMode(false);
        initialState = {
            name: '',
            value: ''
        }
        setOldValue({ name: undefined, value: '' });
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        let config: any = configuration;
        
        if (oldValue.name !== undefined) {
            const keys = Object.keys(config);
            const position = keys.indexOf(oldValue.name);

            const entries = Object.entries(config);
            entries.splice(position, 1, [values.name, values.value]);

            config = Object.fromEntries(entries);
        }

        config[values.name] = values.value;

        const payload = {
            module: LEAVE_MANAGEMENT,
            configuration: config
        };

        try {
            setLoading(true);
            if (editMode) {
                await saveConfig(payload);
                setLoading(false);
                successConfirmation('Rule updated successfully');
                fetchLeaveConfiguration();
                setShow(false);
                setEditMode(false);
                return;
            }

            await saveConfig(payload);
            setLoading(false);
            successConfirmation('Rule created successfully');
            fetchLeaveConfiguration();
            setShow(false);
        } catch (err) {
            setLoading(false);
        }
    }


    const minutesToTimeFormat = (totalMinutes: number): string => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')} Hrs`;
    };

    async function fetchLeaveConfiguration() {
        const { data: { configuration } } = await fetchConfiguration('leave management', undefined, undefined, isScoped ? effectiveScope : undefined);
        const jsonObject = safeJsonParse(configuration?.configuration);

        // Parse check-in and check-out times
        const checkInTime = jsonObject["Check-in time"];
        const checkOutTime = jsonObject["Check-out time"];
        const lunchTime = jsonObject["Lunch Time"];
        const deductionTime = jsonObject["Deduction Time"];

        // Parse lunch time (assuming format "1:00 PM - 1:30 PM")
        const [lunchStart, lunchEnd] = lunchTime.split(' - ');
        const lunchStartTime = timeToMinutes(lunchStart);
        const lunchEndTime = timeToMinutes(lunchEnd);
        const lunchDuration = lunchEndTime - lunchStartTime;

        // Parse work times
        const checkInMinutes = timeToMinutes(checkInTime);
        const checkOutMinutes = timeToMinutes(checkOutTime);

        // Calculate total shift time (check-out - check-in)
        let totalShiftMinutes = checkOutMinutes - checkInMinutes;
        if (totalShiftMinutes < 0) totalShiftMinutes += 24 * 60; // Handle overnight shifts

        // Calculate working time (total shift - lunch)
        let workingMinutes = totalShiftMinutes - lunchDuration;
        if (workingMinutes < 0) workingMinutes = 0;

        // Update the configuration with calculated values
        const updatedConfig = {
            ...jsonObject,
            "Working time": minutesToTimeFormat(workingMinutes),
            "Total Shift time": minutesToTimeFormat(totalShiftMinutes),
            "Deduction Time": minutesToTimeFormat(lunchDuration)
        };

        setConfiguration(updatedConfig);
        setRuleId(configuration?.id);
    }


    useEffect(() => {
        fetchLeaveConfiguration();
    }, [effectiveScope.companyId, effectiveScope.branchId]);

    const ruleEntries = Object.entries(configuration).filter(([name]) => {
        if (hideGeneralSettings) {
            return name !== 'Number of Annual Leaves allowed per month' && name !== onSiteAndHolidayWeekendSettingsOnOffName;
        }
        return true;
    });

    return (
        <>
            <GlassCard preset="section" className="h-full p-4 sm:p-6 flex flex-col">
                <div className="grow">
                    <div className="flex items-center gap-3 mb-4">
                        <IconBox icon="note-2" trio={TRIO.blue} size={44} fs="fs-1" />
                        <span className="font-bold text-[16px] text-slate-900">{title ? title : 'Attendance and Leave Rules'}</span>
                    </div>
                    <div className="flex flex-col">
                        {ruleEntries.map(([name, value], i) => (
                            <div key={name}>
                                {i > 0 && <hr className="m-0 border-t border-slate-200" />}
                                <div className="flex items-center justify-between gap-2 py-2.5">
                                    <span className="font-bold text-[13.5px] text-slate-900">{name}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[13.5px] text-slate-500 font-semibold">
                                            {name == onSiteAndHolidayWeekendSettingsOnOffName ? (String(value) == '1' ? 'On' : 'Off') : String(value)}
                                        </span>
                                        {fromAdmin && !readOnly && (
                                            <WtIconButton title="Edit rule" color={TRIO.blue.c} onClick={() => handleEdit({ name, value })} size={30}>
                                                <KTIcon iconName="pencil" className="fs-5" />
                                            </WtIconButton>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <GlassDialog open={show} onClose={handleClose} maxWidth="sm" fullWidth>
                <GlassHeader
                    title="Attendance and Leave Rules"
                    icon={<KTIcon iconName="note-2" className="fs-1 text-white" />}
                    onClose={handleClose}
                />
                <div className="p-4 sm:p-6">
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={ruleSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form'>
                                    <div className="col-lg">
                                        <TextInput isRequired={true} label="Rule" margin="mb-7" formikField="name" readonly={true} />
                                    </div>
                                    {initialState?.name == onSiteAndHolidayWeekendSettingsOnOffName ?
                                    <div className="row px-3 my-3">
                                        <div className="col-lg-12 fv-row">
                                            <RadioInput
                                                isRequired={true}
                                                formikField="value"
                                                radioBtns={[
                                                    { label: 'On', value: '1' },
                                                    { label: 'Off', value: '0' },
                                                ]}
                                            />
                                        </div>
                                    </div> :
                                    <div className="col-lg">
                                        <TextInput isRequired={true} label="To Follow" margin="mb-7" formikField="value" />
                                        {editMode && (
                                            <div className="mt-2 p-2.5 rounded-[10px] text-[12.5px] leading-normal border" style={{ backgroundColor: TRIO.amber.bg, borderColor: TRIO.amber.bd, color: '#8a5a1e' }}>
                                                Please edit while keeping the same format as the previous input for "To Follow".
                                            </div>
                                        )}
                                    </div>}

                                    <div className="flex justify-end mt-4">
                                        <WtButton type="submit" disabled={loading || !formikProps.isValid}
                                            startIcon={loading ? <Spinner size={14} color="#fff" /> : undefined}
                                            className="w-full sm:w-auto">
                                            {loading ? 'Please wait…' : 'Save Changes'}
                                        </WtButton>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </div>
            </GlassDialog>
        </>
    )
}

export default Rules;