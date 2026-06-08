import { useEffect, useState } from "react";
import { fetchAllEmployees } from "@services/employee";
import { createEmployeeStatus, createSourceOfHire, fetchEmployeeStatus, fetchSrcOfHire } from "@services/options";
import DropDownInput from "app/modules/common/inputs/DropdownInput";
import DateInput from "app/modules/common/inputs/DateInput";
import TextInput from "app/modules/common/inputs/TextInput";

function HiringInfo({ formikProps, editMode }: any) {
    const [srcOfHireOptions, setSrcOfHireOptions] = useState([]);
    const [referredByOptions, setReferredByOptions] = useState([]);
    const [employeeStatusOptions, setEmployeeStatusOptions] = useState([]);
    const [rerender, setRerender] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    useEffect(() => {
        async function getEmployeeStatus() {
            const { data: { employeeStatus } } = await fetchEmployeeStatus();
            const options = employeeStatus.map((empstat: any) => ({ value: empstat.id, label: empstat.status }));
            setEmployeeStatusOptions(options);
        }

        async function getSrcOfHire() {
            const { data: { srcOfHire } } = await fetchSrcOfHire();
            const options = srcOfHire.map((srcOfHire: any) => ({ value: srcOfHire.id, label: srcOfHire.source }));
            setSrcOfHireOptions(options);
        }

        async function getReferredBy() {
            const { data: { employees } } = await fetchAllEmployees();
            const options = employees.map((emp: any) => {
                const { id, users } = emp;
                const employeeName = `${users.firstName} ${users.lastName}`
                return { value: id, label: employeeName }
            });
            setReferredByOptions(options);
        }

        getEmployeeStatus();
        getSrcOfHire();
        getReferredBy();
    }, [rerender]);

    const formatINNumber = (val: any) => {
        if (!val) return "";
        return Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
        }).format(Number(val));
      };
      
      const parseINNumber = (val: string) => val.replace(/,/g, "");

    // Check if CTC should be readonly
    const ctcValue = parseFloat(formikProps.values.ctcInLpa || '0');
    const isCTCReadonly = editMode && ctcValue > 0;

    return (
        <>
            <div className="row mb-4">
                <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <DropDownInput
                        isRequired={false}
                        formikField="sourceOfHireId"
                        inputLabel="Source Of Hire"
                        options={srcOfHireOptions}
                        showAddBtn={true}
                        functionToCallOnModalSubmit={createSourceOfHire}
                        fieldName="srcOfHires"
                        functionToSetFieldOptions={setRerender}
                        />
                </div>

                <div className="col-lg-6 col-md-6 col-sm-12">
                    <DropDownInput
                        isRequired={false}
                        formikField="referredById"
                        inputLabel="Referred By"
                        options={referredByOptions} />
                </div>

                {/* <div className="col-lg-4 mb-4">
                    <DropDownInput
                        isRequired={false}
                        formikField="employeeStatusId"
                        inputLabel="Employee Status"
                        options={employeeStatusOptions}
                        showAddBtn={true}
                        functionToCallOnModalSubmit={createEmployeeStatus}
                        fieldName="employeeStatus"
                        functionToSetFieldOptions={setRerender}
                    />
                </div> */}
            </div>

            <div className="row">
                <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <DateInput
                        formikField="dateOfJoining"
                        isRequired={true}
                        formikProps={formikProps}
                        inputLabel="Date Of Joining"
                        placeHolder="Date Of Joining"
                        maxDate={true} />
                </div>

                <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <DateInput
                        formikField="dateOfExit"
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="Date Of Exit"
                        placeHolder="Date Of Exit" />
                </div>

                <div className="col-lg-4 col-md-6 col-sm-12">
                    <div 
                        className="position-relative"
                        onMouseEnter={() => isCTCReadonly && setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <TextInput
                            isRequired={false}
                            label={"CTC"}
                            formikField="ctcInLpa"
                            formatter={formatINNumber}
                            parser={parseINNumber}
                            readonly={isCTCReadonly}
                        />
                        {isCTCReadonly && showTooltip && (
                            <div 
                                className="tooltip bs-tooltip-top show position-absolute"
                                // style={{
                                //     top: '',
                                //     left: '50%',
                                //     transform: 'translateX(-50%)',
                                //     zIndex: 1000,
                                //     whiteSpace: 'nowrap'
                                // }}
                            >
                                <div className="tooltip-arrow"></div>
                                <div className="tooltip-inner">
                                    Salary Cannot be updated from here, please update it from increment option in salary module
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default HiringInfo;