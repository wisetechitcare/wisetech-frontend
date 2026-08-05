import { X } from "lucide-react";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";

function FamilyInfo({ index, formikProps, canRemove, onRemove }: any) {
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
        {canRemove ? (
          <button
            type="button"
            className="btn btn-sm btn-icon btn-light-danger"
            aria-label={`Remove relative ${index + 1}`}
            onClick={onRemove}
          >
            <X size={16} />
          </button>
        ) : (
          <div style={{ width: "20px", height: "20px" }} />
        )}
      </div>

      <div className="d-flex flex-column gap-4">
        {/* Name, Relation, Phone — the three details actually captured for a relative. */}
        <div className="row g-3">
          <div className="col-lg-4 col-md-6 col-sm-12">
            <TextInput
              isRequired={true}
              label="Name"
              margin="mb-0"
              formikField={`${element}.name`}
            />
          </div>

          <div className="col-lg-4 col-md-6 col-sm-12">
            <TextInput
              isRequired={true}
              label="Relation"
              margin="mb-0"
              formikField={`${element}.relationship`}
            />
          </div>

          <div className="col-lg-4 col-md-6 col-sm-12">
            <PhoneNumberInput
              label="Phone"
              isRequired={true}
              formikField={`${element}.mobileNumber`}
              formikProps={formikProps}
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FamilyInfo;
