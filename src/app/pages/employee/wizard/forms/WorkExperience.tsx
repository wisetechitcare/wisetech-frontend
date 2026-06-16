import DateInput from "@app/modules/common/inputs/DateInput";
import TextInput from "@app/modules/common/inputs/TextInput";

function WorkExperience({ formikProps, index, canRemove, onRemove }: any) {
    const element = `workExpInfo[${index}]`;

    return (
        <>
            <div className={` ${index !== 0 ? 'pt-10' : ''}`}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <p
                    style={{
                        fontFamily: "Inter",
                        fontWeight: 500,
                        fontSize: "14px",
                        color: "#798DB3",
                        textTransform: "uppercase",
                        margin: 0,
                    }}
                >
                    Experience {index + 1}
                </p>
                {canRemove ? (
                    <button
                        type="button"
                        className="btn btn-sm btn-icon btn-light-danger"
                        aria-label={`Remove experience ${index + 1}`}
                        onClick={onRemove}
                    >
                        X
                    </button>
                ) : (
                    <div style={{ width: "20px", height: "20px" }} />
                )}
            </div>
            <div className="row">
                <div className="col-lg-6">
                    <TextInput
                        isRequired={false}
                        label="Company Name"
                        margin="mb-4"
                        formikField={`${element}.companyName`} />
                </div>

                <div className="col-lg-6">
                    <TextInput
                        isRequired={false}
                        label="Job Title"
                        margin="mb-4"
                        formikField={`${element}.jobTitle`} />
                </div>
</div>
            <div className="row">
                <div className="col-lg-6 mb-4">
                    <DateInput
                        formikField={`${element}.fromDate`}
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="From Date"
                        placeHolder="From Date"
                        maxDate={true}/>
                </div>

            {/* <div className="row"> */}
                <div className="col-lg-6 mb-4">
                    <DateInput
                        formikField={`${element}.toDate`}
                        isRequired={false}
                        formikProps={formikProps}
                        inputLabel="To Date"
                        placeHolder="To Date"
                        maxDate={true}/>
                </div>
                </div>
            </div>
        </>
    );
}

export default WorkExperience;
