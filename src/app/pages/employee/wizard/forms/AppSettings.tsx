import { useEffect, useState } from "react";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { fetchRoles } from "@services/roles";
import { Field, useField } from "formik";
import NumberInput from "@app/modules/common/inputs/NumberInput";
import RadioInput, { RadioButton } from "@app/modules/common/inputs/RadioInput";
import { useParams } from "react-router-dom";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { deleteApprovalWorkflowConfig, fetchAllEmployeesSelectedData, fetchApprovalWorkflowConfigs, saveApprovalWorkflowChain } from "@services/employee";
import Select from "react-select";
import { ColourOption, SingleValue, DropdownIndicator } from "@app/modules/common/inputs/ColorInDropdwon";

const showAppSettingsRadioBtn: RadioButton[] = [
    {
        label: 'Yes',
        value: "1",
    },
    {
        label: 'No',
        value: "0",
    }
];

const isEmployeeActiveRadioBtn: RadioButton[] = [
    {
        label: 'Yes',
        value: "1",
    },
    {
        label: 'No',
        value: "0",
    }
];

function AppSettings() {
    const { employeeId } = useParams();
    const fieldName = 'appRole';
    const [roleOptions, setRoleOptions] = useState([]);
    const [field, , helpers] = useField(fieldName);
    const [approverOptions, setApproverOptions] = useState<Array<{ value: string; label: string; avatar?: string | null }>>([]);
    const [isApprovalLoading, setIsApprovalLoading] = useState(false);
    const [isApprovalSaving, setIsApprovalSaving] = useState<Record<string, boolean>>({});
    const [workflowChains, setWorkflowChains] = useState<Record<string, Array<string>>>({
        attendance: ["", "", "", "", ""],
        leave: ["", "", "", "", ""],
        conveyance: ["", "", "", "", ""],
    });
    const [workflowConfigIds, setWorkflowConfigIds] = useState<Record<string, Array<string>>>({
        attendance: ["", "", "", "", ""],
        leave: ["", "", "", "", ""],
        conveyance: ["", "", "", "", ""],
    });

    const approvalModules: Array<{ key: 'attendance' | 'leave' | 'conveyance'; label: string }> = [
        { key: 'attendance', label: 'Attendance' },
        { key: 'leave', label: 'Leave' },
        { key: 'conveyance', label: 'Conveyance' },
    ];

    useEffect(()=>{
        const fetchAllRoles = async ()=>{
            const response = await fetchRoles();
            const rolesData = response?.data;
            setRoleOptions(rolesData.map((role: any) => ({ value: role.id, label: role.name })))
        }
        fetchAllRoles();
    },[])

    useEffect(() => {
        const loadApproverData = async () => {
            if (!employeeId) return;
            setIsApprovalLoading(true);
            try {
                const [employeesRes, workflowsRes] = await Promise.all([
                    fetchAllEmployeesSelectedData(),
                    fetchApprovalWorkflowConfigs(employeeId),
                ]);

                const employeeList = employeesRes?.data?.employees || employeesRes?.data || [];
                const options = employeeList
                    .filter((emp: any) => emp?.id && emp?.id !== employeeId)
                    .map((emp: any) => ({
                        value: String(emp.id),
                        label: `${emp?.users?.firstName || emp?.firstName || ''} ${emp?.users?.lastName || emp?.lastName || ''}`.trim() || emp.id,
                        avatar: emp.avatar ?? null,
                    }))
                    .sort((a: any, b: any) => a.label.localeCompare(b.label));
                setApproverOptions(options);

                const configs = workflowsRes?.data || workflowsRes || [];
                const nextState: Record<string, Array<string>> = {
                    attendance: ["", "", "", "", ""],
                    leave: ["", "", "", "", ""],
                    conveyance: ["", "", "", "", ""],
                };
                const nextIds: Record<string, Array<string>> = {
                    attendance: ["", "", "", "", ""],
                    leave: ["", "", "", "", ""],
                    conveyance: ["", "", "", "", ""],
                };

                configs.forEach((cfg: any) => {
                    if (!cfg?.workflowType || !nextState[cfg.workflowType]) return;
                    const idx = Number(cfg.level) - 1;
                    if (idx >= 0 && idx < 5 && cfg?.isActive) {
                        nextState[cfg.workflowType][idx] = String(cfg.approverId || "");
                        nextIds[cfg.workflowType][idx] = String(cfg.id || "");
                    }
                });

                setWorkflowChains(nextState);
                setWorkflowConfigIds(nextIds);
            } catch (error) {
                console.error("Failed to load approval settings:", error);
            } finally {
                setIsApprovalLoading(false);
            }
        };

        loadApproverData();
    }, [employeeId]);

    const handleLevelChange = (workflowType: 'attendance' | 'leave' | 'conveyance', levelIndex: number, value: string) => {
        setWorkflowChains((prev) => {
            const next = { ...prev };
            next[workflowType] = [...(prev[workflowType] || ["", "", "", "", ""])];
            next[workflowType][levelIndex] = value;
            return next;
        });
    };

    const saveWorkflowType = async (workflowType: 'attendance' | 'leave' | 'conveyance') => {
        if (!employeeId) return;

        const chain = workflowChains[workflowType] || ["", "", "", "", ""];
        if (!chain[0]) {
            errorConfirmation("Level 1 approver is required");
            return;
        }

        const seen = new Set<string>();
        for (let i = 0; i < chain.length; i += 1) {
            const current = chain[i];
            const prev = i === 0 ? current : chain[i - 1];
            if (!prev && current) {
                errorConfirmation("Approval levels must be contiguous without gaps");
                return;
            }
            if (current) {
                if (seen.has(current)) {
                    errorConfirmation("Same approver cannot be selected in multiple levels");
                    return;
                }
                seen.add(current);
            }
        }

        setIsApprovalSaving((prev) => ({ ...prev, [workflowType]: true }));
        try {
            const levels = chain.map((approverId, index) => ({
                level: index + 1,
                approverId: approverId || null,
            }));
            await saveApprovalWorkflowChain(employeeId, workflowType, levels);
            const refreshed = await fetchApprovalWorkflowConfigs(employeeId, workflowType);
            const configs = refreshed?.data || refreshed || [];
            const ids = ["", "", "", "", ""];
            configs.forEach((cfg: any) => {
                const idx = Number(cfg.level) - 1;
                if (idx >= 0 && idx < 5 && cfg?.isActive) ids[idx] = String(cfg.id || "");
            });
            setWorkflowConfigIds((prev) => ({ ...prev, [workflowType]: ids }));
            successConfirmation(`${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)} approval chain saved`);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.response?.data?.detail || "Failed to save approval settings";
            errorConfirmation(msg);
        } finally {
            setIsApprovalSaving((prev) => ({ ...prev, [workflowType]: false }));
        }
    };

    const deleteWorkflowType = async (workflowType: 'attendance' | 'leave' | 'conveyance') => {
        if (!employeeId) return;
        const ids = (workflowConfigIds[workflowType] || []).filter(Boolean);
        if (!ids.length) {
            setWorkflowChains((prev) => ({ ...prev, [workflowType]: ["", "", "", "", ""] }));
            return;
        }

        setIsApprovalSaving((prev) => ({ ...prev, [workflowType]: true }));
        try {
            await Promise.all(ids.map((id) => deleteApprovalWorkflowConfig(id)));
            setWorkflowChains((prev) => ({ ...prev, [workflowType]: ["", "", "", "", ""] }));
            setWorkflowConfigIds((prev) => ({ ...prev, [workflowType]: ["", "", "", "", ""] }));
            successConfirmation(`${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)} approval chain deleted`);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.response?.data?.detail || "Failed to delete approval settings";
            errorConfirmation(msg);
        } finally {
            setIsApprovalSaving((prev) => ({ ...prev, [workflowType]: false }));
        }
    };

    return (
        <>
            {/* Row 1: Show App Settings, Is Employee Active */}
            <div className="row mb-4">
                <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <RadioInput
                        inputLabel="Show App Settings"
                        isRequired={false}
                        radioBtns={showAppSettingsRadioBtn}
                        formikField="isAdmin"
                    />
                </div>
                <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <RadioInput
                        inputLabel="Is Employee Active"
                        isRequired={true}
                        radioBtns={isEmployeeActiveRadioBtn}
                        formikField="isEmployeeActive"
                    />
                </div>
                 <div className="col-lg-4 col-md-6 col-sm-12">
                    <RadioInput
                        formikField="allowOverTime"
                        inputLabel='Allow Over Time'
                        radioBtns={[
                            { label: "Yes", value: '1' },
                            { label: "No", value: '0' },
                        ]}
                        isRequired={false}
                    />
                </div>
            </div>

            {/* Row 2: App Role, Attendance Request Limit */}
            <div className="row">
                <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <DropDownInput
                        isRequired={true}
                        formikField={fieldName}
                        inputLabel="App Role"
                        options={roleOptions}
                    />
                </div>
                <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <NumberInput
                        isRequired={true}
                        formikField="attendanceRequestRaiseLimit"
                        label="Attendance Request Limit"
                        margin="mb-0"
                    />
                </div>
            </div>

            {/* Row 3: Allowed Per Month */}
            <div className="row">
                <div className="col-lg-6 col-md-6 col-sm-12">
                    <div className="position-relative">
                        <NumberInput
                            isRequired={true}
                            formikField="allowedPerMonth"
                            label="Allowed Per Month"
                            margin="mb-0"
                        />
                        <div className="form-text text-muted mt-2">
                            <i className="bi bi-info-circle me-1"></i>
                            <strong>Combined monthly limit</strong> across Annual, Sick, Floater, Casual, and Maternal leaves. Example: If set to 5, employee can take maximum 5 total leaves per month (e.g., 2 Annual + 1 Sick + 1 Casual + 1 Floater = 5).
                        </div>
                    </div>
                </div>
            </div>

            {employeeId && (
                <div className="mt-8">
                    <h5 className="mb-4">Approval Settings</h5>
                    {isApprovalLoading ? (
                        <div className="text-muted">Loading approval settings...</div>
                    ) : (
                        <div className="d-flex flex-column gap-4">
                            {approvalModules.map((module) => (
                                <div key={module.key} className="border rounded p-4">
                                    <div className="row g-4 align-items-end">
                                        <div className="col-12 col-lg-2">
                                            <label className="form-label fw-semibold mb-0">{module.label}</label>
                                        </div>

                                        {[0, 1, 2, 3, 4].map((levelIndex) => (
                                            <div key={`${module.key}-l${levelIndex + 1}`} className="col-12 col-md-6 col-lg-2">
                                                <label className="form-label">Level {levelIndex + 1}</label>
                                                <Select
                                                    options={approverOptions}
                                                    value={approverOptions.find(opt => opt.value === workflowChains[module.key]?.[levelIndex]) || null}
                                                    onChange={(selected) => handleLevelChange(module.key, levelIndex, selected?.value || '')}
                                                    placeholder={levelIndex === 0 ? "Select approver" : "N/A"}
                                                    isClearable
                                                    isSearchable
                                                    components={{ Option: ColourOption, SingleValue, DropdownIndicator }}
                                                    classNamePrefix="react-select"
                                                    className="react-select-styled"
                                                />
                                            </div>
                                        ))}

                                        <div className="col-12 d-flex justify-content-end">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-danger me-2"
                                                onClick={() => deleteWorkflowType(module.key)}
                                                disabled={!!isApprovalSaving[module.key]}
                                            >
                                                Delete Chain
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                onClick={() => saveWorkflowType(module.key)}
                                                disabled={!!isApprovalSaving[module.key]}
                                            >
                                                {isApprovalSaving[module.key] ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </>
    );
}

export default AppSettings;
