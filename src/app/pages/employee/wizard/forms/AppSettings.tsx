import { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { fetchRoles } from "@services/roles";
import RadioInput, { RadioButton } from "@app/modules/common/inputs/RadioInput";
import { useParams } from "react-router-dom";
import ApprovalSettings, { emptyApprovalChains } from "@app/components/ApprovalSettings";

const showAppSettingsRadioBtn: RadioButton[] = [
    { label: 'Yes', value: "1" },
    { label: 'No', value: "0" },
];

const isEmployeeActiveRadioBtn: RadioButton[] = [
    { label: 'Yes', value: "1" },
    { label: 'No', value: "0" },
];

function AppSettings() {
    const { employeeId } = useParams<{ employeeId: string }>();
    const { values, touched, setFieldValue } = useFormikContext<any>();
    const fieldName = 'appRole';
    const [roleOptions, setRoleOptions] = useState<any[]>([]);

    useEffect(() => {
        const fetchAllRoles = async () => {
            const response = await fetchRoles();
            const rolesData = response?.data;
            setRoleOptions(rolesData.map((role: any) => ({ value: role.id, label: role.name })));
        };
        fetchAllRoles();
    }, []);

    return (
        <>
            {/* Row 1: Show App Settings, Is Employee Active, Allow Over Time */}
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
                        inputLabel="Allow Over Time"
                        radioBtns={[
                            { label: "Yes", value: '1' },
                            { label: "No", value: '0' },
                        ]}
                        isRequired={false}
                    />
                </div>
            </div>

            {/* Row 2: App Role */}
            <div className="row mb-4">
                <div className="col-lg-6 col-md-6 col-sm-12">
                    <DropDownInput
                        isRequired={true}
                        formikField={fieldName}
                        inputLabel="App Role"
                        options={roleOptions}
                    />
                </div>
            </div>

            {/* Approval Settings — shared component, loads its own data.
                Required: an employee with no Level 1 approver has nowhere to route
                their attendance/leave/reimbursement requests, so every chain needs
                one.

                This used to render ONLY when `employeeId` existed, i.e. never during
                onboarding — so a brand-new employee was created with no approval
                chains at all and nobody was told. The chains now ride along in the
                form and the wizard writes them straight after the employee is
                created; in edit mode the component keeps saving row by row as before. */}
            <div className="mt-6">
                <h5 className="mb-1 required">Approval Settings</h5>
                <div className="text-muted fs-7 mb-4">
                    {employeeId
                        ? "Each request type needs a Level 1 approver. Set one and press Save on that row."
                        : "Each request type needs a Level 1 approver. These are saved with the employee."}
                </div>
                {employeeId ? (
                    <ApprovalSettings employeeId={employeeId} />
                ) : (
                    <ApprovalSettings
                        value={values.approvalChains ?? emptyApprovalChains()}
                        onChange={(next) => setFieldValue("approvalChains", next)}
                        // Errors appear once the section has been touched — which the
                        // wizard does when a blocked Continue is attempted. Arriving on
                        // an empty section is not skipping it.
                        showErrors={Boolean(touched?.approvalChains)}
                    />
                )}
            </div>
        </>
    );
}

export default AppSettings;
