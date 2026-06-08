import DateInput from "@app/modules/common/inputs/DateInput";
import TextInput from "app/modules/common/inputs/TextInput";

function FamilyInfo({ index, formikProps }: any) {
  const element = `familyInfo[${index}]`;

  return (
    <div className="d-flex flex-column gap-2">
      {/* Relative header with delete icon */}
      <div className="d-flex justify-content-between align-items-center mb-2">
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
          Relative {index + 1}
        </p>
        <div style={{ width: "20px", height: "20px", cursor: "pointer" }}>
          {/* Add delete icon here if needed */}
        </div>
      </div>

      <div className="d-flex flex-column gap-4">
        {/* Row 1: Name, Relation */}
        <div className="row g-3">
          <div className="col-lg-6 col-md-6 col-sm-12">
            <TextInput
              isRequired={false}
              label="Name"
              margin="mb-0"
              formikField={`${element}.name`}
            />
          </div>

          <div className="col-lg-6 col-md-6 col-sm-12">
            <TextInput
              isRequired={false}
              label="Relation"
              margin="mb-0"
              formikField={`${element}.relationship`}
            />
          </div>
        </div>

        {/* Row 2: Phone, Date of Birth */}
        <div className="row g-3">
          <div className="col-lg-6 col-md-6 col-sm-12">
            <TextInput
              isRequired={false}
              label="Phone"
              margin="mb-0"
              formikField={`${element}.mobileNumber`}
            />
          </div>

          <div className="col-lg-6 col-md-6 col-sm-12">
            <DateInput
              formikField={`${element}.dateOfBirth`}
              isRequired={false}
              formikProps={formikProps}
              inputLabel="Date of Birth"
              placeHolder="Date of Birth"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FamilyInfo;
