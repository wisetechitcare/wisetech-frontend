import { useEffect, useState } from "react";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { fetchRoles } from "@services/roles";
import RadioInput, { RadioButton } from "@app/modules/common/inputs/RadioInput";
import { useParams } from "react-router-dom";
import ApprovalSettings from "@app/components/ApprovalSettings";

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

            {/* Approval Settings — shared component, loads its own data */}
            {employeeId && (
                <div className="mt-6">
                    <h5 className="mb-4">Approval Settings</h5>
                    <ApprovalSettings employeeId={employeeId} />
                </div>
            )}
        </>
    );
}

export default AppSettings;
