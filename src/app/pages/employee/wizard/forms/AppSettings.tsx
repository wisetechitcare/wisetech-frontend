import { useEffect, useState } from "react";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { fetchRoles } from "@services/roles";
import NumberInput from "@app/modules/common/inputs/NumberInput";
import RadioInput, { RadioButton } from "@app/modules/common/inputs/RadioInput";

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
    const fieldName = 'appRole';
    const [roleOptions, setRoleOptions] = useState([]);

    useEffect(()=>{
        const fetchAllRoles = async ()=>{
            const response = await fetchRoles();
            const rolesData = response?.data;
            setRoleOptions(rolesData.map((role: any) => ({ value: role.id, label: role.name })))
        }
        fetchAllRoles();
    },[])

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
                        isRequired={false}
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
                        isRequired={false}
                        formikField={fieldName}
                        inputLabel="App Role"
                        options={roleOptions}
                    />
                </div>
                <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <NumberInput
                        isRequired={false}
                        formikField="attendanceRequestRaiseLimit"
                        label="Attendance Request Limit"
                        margin="mb-0"
                    />
                </div>
            </div>
        </>
    );
}

export default AppSettings;
