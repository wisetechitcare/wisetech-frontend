import { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { fetchAllEmployees } from "@services/employee";
import { ToneChip, WtChoiceField, WtFieldFormik } from "@app/modules/common/components/ui";
import TextInput from "@app/modules/common/inputs/TextInput";
import MonthYearInput from "@app/modules/common/inputs/MonthYearInput";
// Leave Settings section removed — no longer needed
// import LeaveAllocationStep from "../forms/LeaveAllocationStep";
import AppSettings from "../forms/AppSettings";
import WizardSectionLayout from "./WizardSectionLayout";
import { useSalaryMaster } from "@modules/payroll/hooks/useSalaryComponentNames";
import "./Step2.css";

// ── 1. Reporting Config ───────────────────────────────────────────────────────
function ReportingConfig() {
    const [managerOptions, setManagerOptions] = useState<any[]>([]);

    useEffect(() => {
        async function getManagers() {
            const { data: { employees } } = await fetchAllEmployees();
            const options = employees.map((emp: any) => ({
                value: emp.id,
                label: `${emp.users.firstName} ${emp.users.lastName}`,
            }));
            setManagerOptions(options);
        }
        getManagers();
    }, []);

    return (
        <div className="row">
            <div className="col-lg-6 col-md-6 col-sm-12">
                <WtFieldFormik
                    name="reportsToId"
                    label="Reporting Manager"
                    placeholder="Select reporting manager"
                    options={managerOptions}
                    searchable
                    clearable
                />
            </div>
        </div>
    );
}

// ── 2. Financial Config ───────────────────────────────────────────────────────
function FinancialConfig({ formikProps, editMode }: { formikProps: any; editMode: boolean }) {
    const { resolveComponent } = useSalaryMaster();
    const tds1Comp = resolveComponent('Professional Fees');
    const tds2Comp = resolveComponent('TDS 2');
    const tds1Name = tds1Comp?.shortCode ? tds1Comp.shortCode : tds1Comp?.displayName ? tds1Comp.displayName : 'Tax Deducted at Source (TDS)';
    const tds2Name = tds2Comp?.shortCode ? tds2Comp.shortCode : tds2Comp?.displayName ? tds2Comp.displayName : 'TDS 2';

    const formatINNumber = (val: any) => {
        if (!val) return "";
        return Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(val));
    };
    const parseINNumber = (val: string) => val.replace(/,/g, "");

    const ctcValue = parseFloat(formikProps.values.ctcInLpa || "0");
    const isCTCReadonly = editMode && ctcValue > 0;
    const [showTooltip, setShowTooltip] = useState(false);

    const pfEnabled = String(formikProps.values.professionalFeesEnabled) === "true";
    const pfType =
        formikProps.values.professionalFeesType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    const tds2Enabled = String(formikProps.values.tds2Enabled) === "true";
    const tds2Type =
        formikProps.values.tds2Type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    const retentionEnabled = String(formikProps.values.retentionEnabled) === "true";
    const retentionType =
        formikProps.values.retentionType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

    // Retention start month auto-fills from the joining month the moment HR
    // enables the toggle — stays editable afterwards. Month-only: stored as
    // the first day of the month ('YYYY-MM-01').
    useEffect(() => {
        if (retentionEnabled && !formikProps.values.retentionStartDate && formikProps.values.dateOfJoining) {
            formikProps.setFieldValue("retentionStartDate", `${String(formikProps.values.dateOfJoining).slice(0, 7)}-01`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retentionEnabled]);

    return (
        <>
            {/* CTC */}
            <div className="row mb-4">
                <div className="col-lg-4 col-md-6 col-sm-12">
                    <div
                        className="position-relative"
                        onMouseEnter={() => isCTCReadonly && setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <TextInput
                            isRequired={true}
                            label="CTC"
                            formikField="ctcInLpa"
                            formatter={formatINNumber}
                            parser={parseINNumber}
                            readonly={isCTCReadonly}
                        />
                        {isCTCReadonly && showTooltip && (
                            <div className="tooltip bs-tooltip-top show position-absolute">
                                <div className="tooltip-arrow"></div>
                                <div className="tooltip-inner">
                                    Salary cannot be updated here — use the Increment option in the Salary module.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Professional Fees (TDS1) */}
            <div className="row">
                <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                    <WtChoiceField name="professionalFeesEnabled" label="Employee Type" variant="cards" required options={[
                        { label: "Contract Based", value: "true" },
                        { label: "Salary Based", value: "false" },
                    ]} />
                </div>

                {pfEnabled && (
                    <>
                        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                            <WtChoiceField name="professionalFeesType" label="Type" variant="segmented" required options={[
                                { label: "Fixed", value: "FIXED" },
                                { label: "Percentage", value: "PERCENTAGE" },
                            ]} />
                            </div>

                            <div className="col-lg-4 col-md-4 col-sm-12">
                                {pfType === "PERCENTAGE" ? (
                                    <TextInput
                                        isRequired={true}
                                        label={`${tds1Name} %`}
                                        formikField="professionalFeesPercentage"
                                    />
                                ) : (
                                    <TextInput
                                        isRequired={true}
                                        label={`${tds1Name} Amount`}
                                        formikField="professionalFeesAmount"
                                        formatter={formatINNumber}
                                        parser={parseINNumber}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>

            {/* TDS2 — independent from TDS1 / PTAX */}
            <div className="separator separator-dashed my-6" />
            <div className="row">
                <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                    <WtChoiceField name="tds2Enabled" label={`${tds2Name} (Additional)`} variant="switch" required clearOnDisable={["tds2Type", "tds2Amount", "tds2Percentage"]} />
                </div>

                {tds2Enabled && (
                    <>
                        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                            <WtChoiceField name="tds2Type" label={`${tds2Name} Type`} variant="segmented" required options={[
                                { label: "Fixed", value: "FIXED" },
                                { label: "Percentage", value: "PERCENTAGE" },
                            ]} />
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-12">
                            {tds2Type === "PERCENTAGE" ? (
                                <TextInput
                                    isRequired={true}
                                    label={`${tds2Name} %`}
                                    formikField="tds2Percentage"
                                />
                            ) : (
                                <TextInput
                                    isRequired={true}
                                    label={`${tds2Name} Amount`}
                                    formikField="tds2Amount"
                                    formatter={formatINNumber}
                                    parser={parseINNumber}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Retention (fresher bond) — monthly deduction between start & end dates */}
            <div className="separator separator-dashed my-6" />
            <div className="row">
                <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                    <WtChoiceField name="retentionEnabled" label="Retention (Fresher Bond)" variant="switch" required clearOnDisable={["retentionType", "retentionAmount", "retentionPercentage", "retentionStartDate", "retentionEndDate"]} />
                </div>

                {retentionEnabled && (
                    <>
                        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                            <MonthYearInput
                                formikField="retentionStartDate"
                                inputLabel="Retention Start Month"
                                placeHolder="Auto-filled from joining month"
                                isRequired={true}
                                formikProps={formikProps}
                            />
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-12">
                            <MonthYearInput
                                formikField="retentionEndDate"
                                inputLabel="Retention End Month"
                                placeHolder="Retention End Month"
                                isRequired={true}
                                formikProps={formikProps}
                                minDateField="retentionStartDate"
                            />
                        </div>
                    </>
                )}
            </div>

            {retentionEnabled && (
                <div className="row mt-4">
                    <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                        <WtChoiceField name="retentionType" label="Retention Type" variant="segmented" required options={[
                            { label: "Fixed", value: "FIXED" },
                            { label: "Percentage", value: "PERCENTAGE" },
                        ]} />
                    </div>
                    <div className="col-lg-4 col-md-4 col-sm-12">
                        {retentionType === "PERCENTAGE" ? (
                            <TextInput
                                isRequired={true}
                                label="Retention % (per month)"
                                formikField="retentionPercentage"
                            />
                        ) : (
                            <TextInput
                                isRequired={true}
                                label="Retention Amount (per month)"
                                formikField="retentionAmount"
                                formatter={formatINNumber}
                                parser={parseINNumber}
                            />
                        )}
                    </div>
                </div>
            )}
            </>
        );
}

// ── 4. Reimbursement Config ───────────────────────────────────────────────────
function ReimbursementConfig() {
    return (
        <div className="row">
            <div className="col-lg-6 col-md-6 col-sm-12">
                <TextInput
                    isRequired={false}
                    label="Reimbursement Limit Per Request"
                    formikField="reimbursementLimitPerRequest"
                />
            </div>
        </div>
    );
}

// ── 5. Privacy Controls ───────────────────────────────────────────────────────
function PrivacyControls() {
    const { values } = useFormikContext<any>();
    const isHidden: boolean = values.isHiddenFromStaff === true;

    return (
        <div className="d-flex align-items-start justify-content-between gap-4">
            <div className="flex-grow-1">
                <div className="fw-semibold text-gray-800 fs-6 mb-1">
                    Hide From Staff Directory
                </div>
                <div className="text-muted fs-7">
                    When enabled, this employee profile will only be visible to Admin users
                    and the employee themselves. They retain full access to their own
                    attendance, payroll, and leave — only their discoverability is restricted.
                </div>
            </div>
            <div className="flex-shrink-0 pt-1">
                <WtChoiceField name="isHiddenFromStaff" label="Hide From Staff Directory" variant="switch" />
                <div className="text-center mt-1">
                    <ToneChip dense tone={isHidden ? "danger" : "success"} label={isHidden ? "Hidden" : "Visible"} />
                </div>
            </div>
        </div>
    );
}

// ── Root component ────────────────────────────────────────────────────────────
function StepAppSettings({ formikProps, editMode, sidebarProfile, activeSection, onSectionChange }: { formikProps: any; editMode: boolean; sidebarProfile?: any; activeSection: string; onSectionChange: (id: string) => void }) {
    useEffect(() => {
        if (!formikProps.submitCount) return;
        const errors = formikProps.errors || {};
        if (errors.reportsToId) {
            onSectionChange("reporting");
            return;
        }
        if (errors.ctcInLpa || errors.professionalFeesPercentage || errors.professionalFeesAmount) {
            onSectionChange("financial");
            return;
        }
        if (errors.appRole) {
            onSectionChange("access");
            return;
        }
    }, [formikProps.submitCount, formikProps.errors, onSectionChange]);

    const sections = [
        { id: "reporting", title: "Reporting Config", icon: "profile-user" },
        { id: "financial", title: "Financial Config", icon: "wallet" },
        // Leave Settings section removed — no longer needed
        // { id: "leaves", title: "Custom Leave Allocation (optional)", icon: "calendar" },
        { id: "reimbursement", title: "Reimbursement Config",              icon: "wallet"       },
        { id: "access", title: "System Access Settings", icon: "setting-2" },
        { id: "privacy", title: "Privacy Controls", icon: "shield-tick" },
    ];

    const sectionContent: Record<string, any> = {
        reporting: <ReportingConfig />,
        financial: <FinancialConfig formikProps={formikProps} editMode={editMode} />,
        // Leave Settings section removed — no longer needed
        // leaves: (
        //     <LeaveAllocationStep />
        // ),
        reimbursement: <ReimbursementConfig />,
        access: <AppSettings />,
        privacy: <PrivacyControls />,
    };

    return (
        <WizardSectionLayout
            sections={sections}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            sidebarProfile={sidebarProfile}
        >
            {sectionContent[activeSection]}
        </WizardSectionLayout>
    );
}

export default StepAppSettings;
