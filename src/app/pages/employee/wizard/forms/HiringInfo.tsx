import { useEffect, useState } from "react";
import { fetchAllEmployees } from "@services/employee";
import { createSourceOfHire, fetchSrcOfHire } from "@services/options";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import RejoinHistory from "./RejoinHistory";
import AddAnotherBtn from "@app/modules/common/utils/AddAnotherBtn";

function HiringInfo({ formikProps, rejoinRows = [], onAddRejoin, onRemoveRejoin }: any) {
    const [srcOfHireOptions, setSrcOfHireOptions] = useState([]);
    const [referredByOptions, setReferredByOptions] = useState([]);
    const [rerender, setRerender] = useState(false);

    useEffect(() => {
        async function getSrcOfHire() {
            const { data: { srcOfHire } } = await fetchSrcOfHire();
            const options = srcOfHire.map((s: any) => ({ value: s.id, label: s.source }));
            setSrcOfHireOptions(options);
        }

        async function getReferredBy() {
            const { data: { employees } } = await fetchAllEmployees();
            const options = employees.map((emp: any) => ({
                value: emp.id,
                label: `${emp.users.firstName} ${emp.users.lastName}`,
            }));
            setReferredByOptions(options);
        }

        getSrcOfHire();
        getReferredBy();
    }, [rerender]);

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
                        options={referredByOptions}
                    />
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <DateInput
                        formikField="dateOfJoining"
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="Date Of Joining"
                        placeHolder="Date Of Joining"
                        maxDate={true}
                    />
                </div>

                <div className="col-lg-4 col-md-6 col-sm-12">
                    <DateInput
                        formikField="dateOfExit"
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="Date Of Exit"
                        placeHolder="Date Of Exit"
                    />
                </div>
            </div>

            <div className="ob-repeating-section">
                {rejoinRows.map((_: any, index: number) => (
                    <div key={`rejoinHistory-${index}`}>
                        <RejoinHistory formikProps={formikProps} index={index} onRemove={onRemoveRejoin} />
                    </div>
                ))}
                <AddAnotherBtn onClick={onAddRejoin} />
            </div>
        </>
    );
}

export default HiringInfo;
