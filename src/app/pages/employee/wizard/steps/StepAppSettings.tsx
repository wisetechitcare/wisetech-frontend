import { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { fetchAllEmployees } from "@services/employee";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import LeaveAllocationStep from "../forms/LeaveAllocationStep";
import AppSettings from "../forms/AppSettings";
import WizardSectionLayout from "./WizardSectionLayout";
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
                <DropDownInput
                    isRequired={false}
                    formikField="reportsToId"
                    inputLabel="Reporting Manager"
                    options={managerOptions}
                />
            </div>
        </div>
    );
}

// ── 2. Financial Config ───────────────────────────────────────────────────────
function FinancialConfig({ formikProps, editMode }: { formikProps: any; editMode: boolean }) {
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
                            isRequired={false}
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

            {/* Professional Fees */}
            <div className="row">
                <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                    <RadioInput
                        formikField="professionalFeesEnabled"
                        inputLabel="Employee Type"
                        radioBtns={[
                            { label: "Contract Based", value: "true" },
                            { label: "Salary Based", value: "false" },
                        ]}
                        isRequired={false}
                    />
                </div>

                {pfEnabled && (
                    <>
                        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                            <RadioInput
                                    formikField="professionalFeesType"
                                    inputLabel="Type"
                                    radioBtns={[
                                        { label: "Fixed", value: "FIXED" },
                                        { label: "Percentage", value: "PERCENTAGE" },
                                    ]}
                                    isRequired={false}
                                />
                            </div>

                            <div className="col-lg-4 col-md-4 col-sm-12">
                                {pfType === "PERCENTAGE" ? (
                                    <TextInput
                                        isRequired={false}
                                        label="Professional Fees %"
                                        formikField="professionalFeesPercentage"
                                    />
                                ) : (
                                    <TextInput
                                        isRequired={false}
                                        label="Professional Fees Amount"
                                        formikField="professionalFeesAmount"
                                        formatter={formatINNumber}
                                        parser={parseINNumber}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </>
        );
}

// ── 5. Privacy Controls ───────────────────────────────────────────────────────
function PrivacyControls() {
    const { values, setFieldValue } = useFormikContext<any>();
    const isHidden: boolean = values.isHiddenFromStaff === true;
    const toggle = () => setFieldValue("isHiddenFromStaff", !isHidden);

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
                <div className="form-check form-switch form-check-custom form-check-solid">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="isHiddenFromStaff"
                        checked={isHidden}
                        onChange={toggle}
                        style={{ width: "3rem", height: "1.5rem", cursor: "pointer" }}
                    />
                </div>
                <div className="text-center mt-1">
                    <span
                        className={`badge ${isHidden ? "badge-light-danger" : "badge-light-success"} fs-8 fw-bold`}
                    >
                        {isHidden ? "Hidden" : "Visible"}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Root component ────────────────────────────────────────────────────────────
function StepAppSettings({ formikProps, editMode, sidebarProfile }: { formikProps: any; editMode: boolean; sidebarProfile?: any }) {
    const [activeSection, setActiveSection] = useState("reporting");

    useEffect(() => {
        if (!formikProps.submitCount) return;
        const errors = formikProps.errors || {};
        if (errors.reportsToId) {
            setActiveSection("reporting");
            return;
        }
        if (errors.ctcInLpa || errors.professionalFeesPercentage || errors.professionalFeesAmount) {
            setActiveSection("financial");
            return;
        }
        if (errors.appRole) {
            setActiveSection("access");
            return;
        }
    }, [formikProps.submitCount, formikProps.errors]);

    const sections = [
        { id: "reporting", title: "Reporting Config", icon: "profile-user" },
        { id: "financial", title: "Financial Config", icon: "wallet" },
        { id: "leaves", title: "Custom Leave Allocation (optional)", icon: "calendar" },
        { id: "access", title: "System Access Settings", icon: "setting-2" },
        { id: "privacy", title: "Privacy Controls", icon: "shield-tick" },
    ];

    const sectionContent: Record<string, any> = {
        reporting: <ReportingConfig />,
        financial: <FinancialConfig formikProps={formikProps} editMode={editMode} />,
        leaves: (
            <>
                <LeaveAllocationStep />
                <div style={{ marginTop: "24px" }}>
                    <MonthlyLeaveLimit />
                </div>
            </>
        ),
        access: <AppSettings />,
        privacy: <PrivacyControls />,
    };

    return (
        <WizardSectionLayout
            sections={sections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            sidebarProfile={sidebarProfile}
        >
            {sectionContent[activeSection]}
        </WizardSectionLayout>
    );
}

export default StepAppSettings;
