import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { fetchAllEmployees } from "@services/employee";
import { fetchSrcOfHire } from "@services/options";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import RejoinHistory from "./RejoinHistory";
import AddAnotherBtn from "@app/modules/common/utils/AddAnotherBtn";
import ReferrerInput from "./ReferrerInput";

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
                    {/* No "+ Add" here any more. Creating a master-list entry from
                        inside the form meant the list could be appended to while hiring
                        somebody but never corrected or pruned; it is maintained in
                        Employees → Configure → Sources of Hire alongside every other
                        onboarding dropdown. */}
                    <DropDownInput
                        isRequired={false}
                        formikField="sourceOfHireId"
                        inputLabel="Source Of Hire"
                        placeholder="Select source of hire"
                        options={srcOfHireOptions}
                    />
                </div>

                <div className="col-lg-6 col-md-6 col-sm-12">
                    {/* Pick a colleague OR type anyone else. A referral often comes
                        from outside the company, and `referredById` is a foreign key
                        that can only ever name staff — a free-typed name is stored in
                        `referredByName` instead. */}
                    <ReferrerInput formikProps={formikProps} options={referredByOptions} />
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
                    <DateInput
                        formikField="dateOfJoining"
                        isRequired={true}
                        formikProps={formikProps}
                        inputLabel="Date Of Joining"
                        placeHolder="Date Of Joining"
                        maxDate={true}
                    />
                    {/* Same amber as the draft-restored notice — Metronic's `text-warning`
                        (#FFC700) is a signal yellow that belongs to none of this form's
                        palette, and bare coloured text read as an error rather than a
                        note. Tinted panel, left accent bar, brand-consistent tones. */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            mt: 1,
                            px: 1.25,
                            py: 1,
                            border: "1px solid rgba(245, 166, 35, 0.4)",
                            borderLeft: "3px solid #f59e0b",
                            borderRadius: "8px",
                            bgcolor: "#fffbeb",
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            color: "#78350f",
                        }}
                    >
                        <Box
                            component="i"
                            className="bi bi-exclamation-triangle-fill"
                            aria-hidden
                            sx={{ flexShrink: 0, mt: "1px", fontSize: 13, color: "#b45309" }}
                        />
                        <span>
                            Please review the Date of Joining once — it drives payroll and leave
                            calculations.
                        </span>
                    </Box>
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
