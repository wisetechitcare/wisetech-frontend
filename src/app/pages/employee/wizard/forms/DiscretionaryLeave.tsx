import { useFormikContext } from "formik";
import RadioInput, { RadioButton } from "app/modules/common/inputs/RadioInput";
import TextInput from "app/modules/common/inputs/TextInput";

const discretionaryLeaveOptions: RadioButton[] = [
    { label: "No", value: "false" },
    { label: "Yes", value: "true" }
];

const DiscretionaryLeave = () => {
    const { values } = useFormikContext<any>();
    const isEnabled = values.discretionaryLeaveBoolean === "true" || values.discretionaryLeaveBoolean === true;

    return (
        <div style={{ marginBottom: '20px' }}>
            <div className="row">
                <div className="col-md-6">
                    <RadioInput
                        isRequired={false}
                        inputLabel="Enable Discretionary Leave"
                        radioBtns={discretionaryLeaveOptions}
                        formikField="discretionaryLeaveBoolean"
                    />
                </div>

                {isEnabled && (
                    <div className="col-md-6">
                        <TextInput
                            isRequired={false}
                            label="Discretionary Leave Balance"
                            formikField="discretionaryLeaveBalance"
                            placeholder="Enter leave balance"
                            inputValidation="numbers"
                            type="number"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default DiscretionaryLeave;