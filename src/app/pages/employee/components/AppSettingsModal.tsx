import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm, useFormikContext } from "formik";
import * as Yup from "yup";
import { fetchWizardData, updateEmployee, fetchAllEmployees, saveEmployeeAccessSettings } from "@services/employee";
import { fetchRoles } from "@services/roles";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import Loader from "@app/modules/common/utils/Loader";
import ApprovalSettings from "@app/components/ApprovalSettings";
import LeaveAllocationStep from "@app/pages/employee/wizard/forms/LeaveAllocationStep";

// ─── Professional fees helpers (mirror of NewEmployeeWizard) ─────────────────
function readProfessionalFeesEnabled(raw: unknown): "true" | "false" {
    if (raw === null || raw === undefined) return "false";
    if (raw === false || raw === 0 || raw === "0" || raw === "false" || raw === "FALSE") return "false";
    if (raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "TRUE") return "true";
    if (typeof raw === "object" && raw !== null && "data" in (raw as any)) {
        return (raw as any).data?.[0] ? "true" : "false";
    }
    return "false";
}

function buildProfessionalFeesPayload(values: any) {
    const enabled = readProfessionalFeesEnabled(values.professionalFeesEnabled) === "true";
    const type = values.professionalFeesType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    if (!enabled) {
        return { professionalFeesEnabled: false, professionalFeesType: "FIXED" as const, professionalFeesAmount: null, professionalFeesPercentage: null };
    }
    const amt = type === "FIXED" ? (parseFloat(String(values.professionalFeesAmount).replace(/,/g, "")) || null) : null;
    const pct = type === "PERCENTAGE" ? (parseFloat(String(values.professionalFeesPercentage).replace(/,/g, "")) || null) : null;
    return { professionalFeesEnabled: true, professionalFeesType: type, professionalFeesAmount: amt, professionalFeesPercentage: pct };
}

// ─── Section components (all use useFormikContext, identical to wizard) ───────

function GeneralSettings() {
    return (
        <div className="row g-4">
            <div className="col-sm-6">
                <RadioInput
                    formikField="isAdmin"
                    inputLabel="Show App Settings"
                    radioBtns={[{ label: "Yes", value: "1" }, { label: "No", value: "0" }]}
                    isRequired={false}
                />
            </div>
            <div className="col-sm-6">
                <RadioInput
                    formikField="allowOverTime"
                    inputLabel="Allow Overtime"
                    radioBtns={[{ label: "Yes", value: "1" }, { label: "No", value: "0" }]}
                    isRequired={false}
                />
            </div>
        </div>
    );
}

function LeaveSection() {
    return (
        <LeaveAllocationStep />
    );
}

function ApprovalSection({ employeeId }: { employeeId: string }) {
    return <ApprovalSettings employeeId={employeeId} />;
}

function ReportingSection({ managerOptions }: { managerOptions: any[] }) {
    return (
        <div className="row">
            <div className="col-sm-8">
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

function FinancialSection() {
    const { values } = useFormikContext<any>();
    const formatIN = (val: any) => val ? Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(val)) : "";
    const parseIN = (val: string) => val.replace(/,/g, "");
    const pfEnabled = String(values.professionalFeesEnabled) === "true";
    const pfType = values.professionalFeesType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

    return (
        <>
            <div className="row mb-4">
                <div className="col-sm-6">
                    <TextInput
                        isRequired={false}
                        label="CTC"
                        formikField="ctcInLpa"
                        formatter={formatIN}
                        parser={parseIN}
                    />
                </div>
            </div>
            <div className="row g-4">
                <div className="col-sm-6 col-md-4">
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
                        <div className="col-sm-6 col-md-4">
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
                        <div className="col-sm-6 col-md-4">
                            {pfType === "PERCENTAGE" ? (
                                <TextInput isRequired={false} label="Tax Deducted at Source (TDS) %" formikField="professionalFeesPercentage" />
                            ) : (
                                <TextInput isRequired={false} label="Tax Deducted at Source (TDS) Amount" formikField="professionalFeesAmount" formatter={formatIN} parser={parseIN} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function AccessSection({ roleOptions }: { roleOptions: any[] }) {
    return (
        <div className="row g-4">
            <div className="col-sm-6">
                <RadioInput
                    inputLabel="Is Employee Active"
                    isRequired={false}
                    radioBtns={[{ label: "Yes", value: "1" }, { label: "No", value: "0" }]}
                    formikField="isEmployeeActive"
                />
            </div>
            <div className="col-sm-6">
                <DropDownInput
                    isRequired={false}
                    formikField="appRole"
                    inputLabel="App Role"
                    options={roleOptions}
                />
            </div>
        </div>
    );
}

function PrivacySection() {
    const { values, setFieldValue } = useFormikContext<any>();
    const isHidden = values.isHiddenFromStaff === true;
    return (
        <div className="d-flex align-items-start justify-content-between gap-4">
            <div className="flex-grow-1">
                <div className="fw-semibold text-gray-800 fs-6 mb-1">Hide From Staff Directory</div>
                <div className="text-muted fs-7">
                    When enabled, this employee profile will only be visible to Admin users and the employee themselves.
                </div>
            </div>
            <div className="flex-shrink-0 pt-1 text-center">
                <div className="form-check form-switch form-check-custom form-check-solid">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={isHidden}
                        onChange={() => setFieldValue("isHiddenFromStaff", !isHidden)}
                        style={{ width: "3rem", height: "1.5rem", cursor: "pointer" }}
                    />
                </div>
                <span className={`badge mt-1 ${isHidden ? "badge-light-danger" : "badge-light-success"} fs-8 fw-bold`}>
                    {isHidden ? "Hidden" : "Visible"}
                </span>
            </div>
        </div>
    );
}

// ─── Section nav config ───────────────────────────────────────────────────────
const SECTIONS = [
    { id: "general",   label: "General App Settings",              icon: "setting-3"   },
    { id: "leaves",    label: "Leave Allocation",                  icon: "calendar"    },
    { id: "approval",  label: "Approval Workflow",                 icon: "verify"      },
    { id: "reporting", label: "Reporting Config",                  icon: "profile-user" },
    { id: "financial", label: "Financial Config",                  icon: "wallet"      },
    { id: "access",    label: "System Access",                     icon: "setting-2"   },
    { id: "privacy",   label: "Privacy Controls",                  icon: "shield-tick" },
];

// ─── Inner modal content (inside Formik) ─────────────────────────────────────
function ModalContent({
    employeeId, managerOptions, roleOptions, isSubmitting, error, onClose,
}: {
    employeeId: string;
    managerOptions: any[];
    roleOptions: any[];
    isSubmitting: boolean;
    error: string | null;
    onClose: () => void;
}) {
    const [activeSection, setActiveSection] = useState("general");

    const sectionContent: Record<string, React.ReactNode> = {
        general:   <GeneralSettings />,
        leaves:    <LeaveSection />,
        approval:  <ApprovalSection employeeId={employeeId} />,
        reporting: <ReportingSection managerOptions={managerOptions} />,
        financial: <FinancialSection />,
        access:    <AccessSection roleOptions={roleOptions} />,
        privacy:   <PrivacySection />,
    };

    const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label ?? "";

    return (
        <>
            <Modal.Body style={{ padding: 0, display: "flex", minHeight: 480 }}>
                {/* ── Left sidebar ── */}
                <div className="app-settings-sidebar">
                    <div className="app-settings-sidebar-label">SECTIONS</div>
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            className={`app-settings-nav-item${activeSection === s.id ? " active" : ""}`}
                            onClick={() => setActiveSection(s.id)}
                        >
                            <i className={`ki-duotone ki-${s.icon} fs-5 me-2`}>
                                <span className="path1" /><span className="path2" />
                            </i>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* ── Right content ── */}
                <div className="app-settings-content">
                    <div className="app-settings-content-header">
                        <i className={`ki-duotone ki-${SECTIONS.find(s => s.id === activeSection)?.icon} fs-4 me-2`}>
                            <span className="path1" /><span className="path2" />
                        </i>
                        <span>{activeLabel}</span>
                    </div>

                    {error && <div className="alert alert-danger mb-4">{error}</div>}

                    <div>{sectionContent[activeSection]}</div>
                </div>
            </Modal.Body>

            <Modal.Footer style={{ borderTop: "1px solid #f0f0f0", gap: 8 }}>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    disabled={isSubmitting}
                    style={{ borderRadius: 8, padding: "10px 24px", fontWeight: 500, fontSize: 14 }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn"
                    disabled={isSubmitting}
                    style={{ backgroundColor: "#8B4444", border: "none", color: "#fff", borderRadius: 8, padding: "10px 24px", fontWeight: 500, fontSize: 14 }}
                >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
            </Modal.Footer>
        </>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface AppSettingsModalProps {
    show: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    employeeId: string;
}

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ show, onClose, onSuccess, employeeId }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [managerOptions, setManagerOptions] = useState<any[]>([]);
    const [roleOptions, setRoleOptions] = useState<any[]>([]);

    const [initialValues, setInitialValues] = useState<any>({
        // general
        isAdmin: "0",
        allowOverTime: "0",
        // leave
        leaveAllocations: [],
        branchId: "",
        employeeId: "",
        // reporting
        reportsToId: "",
        // financial
        ctcInLpa: "",
        professionalFeesEnabled: "false",
        professionalFeesType: "FIXED",
        professionalFeesAmount: "",
        professionalFeesPercentage: "",
        // access
        isEmployeeActive: "1",
        appRole: "",
        // privacy
        isHiddenFromStaff: false,
        userId: "",
    });

    useEffect(() => {
        if (!show || !employeeId) return;
        setIsLoading(true);
        setError(null);

        Promise.all([
            fetchWizardData(employeeId, false),
            fetchAllEmployees().catch(() => ({ data: { employees: [] } })),
            fetchRoles().catch(() => ({ data: [] })),
        ])
            .then(([wizardRes, empRes, rolesRes]) => {
                const w = wizardRes?.data?.wizardData ?? {};

                setInitialValues({
                    // general
                    isAdmin: w?.isAdmin ? "1" : "0",
                    allowOverTime: w?.allowOverTime ?? "0",
                    // leave
                    leaveAllocations: [],
                    branchId: w?.branchId ?? "",
                    employeeId,
                    // reporting
                    reportsToId: w?.reportsToId ?? "",
                    // financial
                    ctcInLpa: w?.ctcInLpa ?? "",
                    professionalFeesEnabled: readProfessionalFeesEnabled(w?.professionalFeesEnabled ?? (w as any)?.professional_fees_enabled),
                    professionalFeesType: w?.professionalFeesType ?? (w as any)?.professional_fees_type ?? "FIXED",
                    professionalFeesAmount: (() => { const v = w?.professionalFeesAmount ?? (w as any)?.professional_fees_amount; return v != null && v !== "" ? String(v) : ""; })(),
                    professionalFeesPercentage: (() => { const v = (w as any)?.professionalFeesPercentage ?? (w as any)?.professional_fees_percentage; return v != null && v !== "" ? String(v) : ""; })(),
                    // access
                    isEmployeeActive: w?.isActive ? "1" : "0",
                    appRole: w?.roles?.[0]?.id ?? "",
                    // privacy
                    isHiddenFromStaff: w?.isHiddenFromStaff === true,
                    userId: w?.userId ?? "",
                });

                // manager options
                const employees: any[] = empRes?.data?.employees ?? empRes?.data ?? [];
                setManagerOptions(
                    employees
                        .filter((e: any) => e?.id && e.id !== employeeId)
                        .map((e: any) => ({
                            value: e.id,
                            label: `${e.users?.firstName || e.firstName || ""} ${e.users?.lastName || e.lastName || ""}`.trim(),
                        }))
                );

                // role options
                const roles: any[] = rolesRes?.data ?? [];
                setRoleOptions(roles.map((r: any) => ({ value: r.id, label: r.name })));
            })
            .catch((err) => {
                console.error("AppSettingsModal load error:", err);
                setError("Failed to load employee settings");
            })
            .finally(() => setIsLoading(false));
    }, [show, employeeId]);

    const handleSubmit = async (values: any) => {
        setError(null);
        setIsSubmitting(true);
        try {
            const payload: any = {
                id: employeeId,
                isAdmin: values.isAdmin === "1",
                allowOverTime: values.allowOverTime,
                reportsToId: values.reportsToId || null,
                ctcInLpa: values.ctcInLpa || null,
                isActive: values.isEmployeeActive === "1",
                isHiddenFromStaff: values.isHiddenFromStaff === true,
                ...(Array.isArray(values.leaveAllocations) && values.leaveAllocations.length > 0
                    ? { leaveAllocations: values.leaveAllocations }
                    : {}),
                ...buildProfessionalFeesPayload(values),
            };

            const roleId = values.appRole || null;
            const isAdmin = values.isAdmin === "1";

            const oldRoleId = initialValues.appRole || null;
            const oldIsAdmin = initialValues.isAdmin === "1";

            await saveEmployeeAccessSettings(
                employeeId,
                initialValues.userId,
                payload,
                roleId,
                isAdmin,
                oldRoleId,
                oldIsAdmin
            );
            successConfirmation("Settings saved successfully");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.response?.data?.detail || "Failed to save settings";
            setError(msg);
            errorConfirmation(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <Modal show={show} onHide={onClose} centered scrollable dialogClassName="app-settings-modal-wide">
            <Modal.Header closeButton style={{ borderBottom: "1px solid #f0f0f0" }}>
                <Modal.Title style={{ fontWeight: 600, fontSize: 18, color: "#1a1a1a" }}>
                    App Settings
                </Modal.Title>
            </Modal.Header>

            {isLoading ? (
                <Modal.Body style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader />
                </Modal.Body>
            ) : (
                <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
                    <FormikForm>
                        <ModalContent
                            employeeId={employeeId}
                            managerOptions={managerOptions}
                            roleOptions={roleOptions}
                            isSubmitting={isSubmitting}
                            error={error}
                            onClose={onClose}
                        />
                    </FormikForm>
                </Formik>
            )}

            <style>{`
                .app-settings-modal-wide { max-width: min(1100px, 95vw) !important; width: 95vw !important; }
                @media (max-width: 767px) {
                    .app-settings-modal-wide { width: 100vw !important; margin: 0 !important; }
                    .app-settings-modal-wide .modal-content { border-radius: 0 !important; min-height: 100vh; }
                }

                /* Sidebar */
                .app-settings-sidebar {
                    width: 220px;
                    min-width: 220px;
                    background: #f9fafb;
                    border-right: 1px solid #f0f0f0;
                    padding: 20px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .app-settings-sidebar-label {
                    font-size: 10px;
                    font-weight: 700;
                    color: #9ca3af;
                    letter-spacing: .08em;
                    padding: 0 8px 10px;
                }
                .app-settings-nav-item {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    background: none;
                    border: none;
                    text-align: left;
                    padding: 9px 10px;
                    border-radius: 7px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #6b7280;
                    cursor: pointer;
                    transition: background .15s, color .15s;
                }
                .app-settings-nav-item:hover { background: #f0f0f5; color: #374151; }
                .app-settings-nav-item.active { background: #fef2f2; color: #8B4444; font-weight: 600; border-left: 3px solid #8B4444; }

                /* Content panel */
                .app-settings-content {
                    flex: 1;
                    padding: 24px 28px;
                    overflow-y: auto;
                    max-height: calc(100vh - 200px);
                }
                .app-settings-content-header {
                    display: flex;
                    align-items: center;
                    font-size: 15px;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin-bottom: 20px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid #f0f0f0;
                }
                @media (max-width: 600px) {
                    .app-settings-sidebar { display: none; }
                }
            `}</style>
        </Modal>
    );
};

export default AppSettingsModal;
