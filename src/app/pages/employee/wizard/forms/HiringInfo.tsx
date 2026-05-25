import { useEffect, useState } from "react";
import { fetchAllEmployees } from "@services/employee";
import { createSourceOfHire, fetchSrcOfHire } from "@services/options";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import TextInput from "@app/modules/common/inputs/TextInput";

const formatINNumber = (val: any) => {
    if (!val) return "";
    return Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(val));
};
const parseINNumber = (val: string) => val.replace(/,/g, "");

function HiringInfo({ formikProps }: any) {
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

            <div className="row">
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

            {(() => {
                const pfEnabled = formikProps.values.professionalFeesEnabled === true || (formikProps.values.professionalFeesEnabled as any) === 'true';
                const pfType = formikProps.values.professionalFeesType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
                return (
                    <div className="row mt-4">
                        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                            <RadioInput
                                formikField="professionalFeesEnabled"
                                inputLabel='Professional Fees Enabled'
                                radioBtns={[
                                    { label: "Yes", value: true },
                                    { label: "No", value: false },
                                ]}
                                isRequired={false}
                            />
                        </div>

                        {pfEnabled && (
                            <>
                                <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
                                    <RadioInput
                                        formikField="professionalFeesType"
                                        inputLabel='Type'
                                        radioBtns={[
                                            { label: "Fixed", value: 'FIXED' },
                                            { label: "Percentage", value: 'PERCENTAGE' },
                                        ]}
                                        isRequired={true}
                                    />
                                </div>

                                <div className="col-lg-4 col-md-4 col-sm-12">
                                    {pfType === 'PERCENTAGE' ? (
                                        <TextInput
                                            isRequired={true}
                                            label="Professional Fees %"
                                            formikField="professionalFeesPercentage"
                                        />
                                    ) : (
                                        <TextInput
                                            isRequired={true}
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
                );
            })()}
        </>
    );
}

export default HiringInfo;
