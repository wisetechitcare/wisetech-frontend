import TextInput from "app/modules/common/inputs/TextInput";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

function PersonalContactInfo({ formikProps }: { formikProps: any }) {
  return (
    <>
      {/* Row 1: Email + Country Code */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={true}
            label="Personal Email Address"
            formikField="personalEmailId"
            margin="mb-0"
          />
        </div>

        <div className="col-lg-6 col-md-6 col-sm-12">
          <label className="d-flex align-items-center fs-6 form-label mb-2">
            <span>Country Code</span>
          </label>
          <PhoneInput
            country={"in"}
            value={formikProps.values.personalPhoneNumberExtension}
            onChange={(phone) =>
              formikProps.setFieldValue("personalPhoneNumberExtension", phone)
            }
            inputStyle={{
              width: "100%",
              fontSize: "14px",
              height: "48px",
              paddingLeft: "50px",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              backgroundColor: "#fff",
            }}
            buttonStyle={{
              border: "1px solid #dee2e6",
              borderRadius: "8px 0 0 8px",
              backgroundColor: "#f8f9fa",
            }}
            containerStyle={{
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Row 2: Phone Numbers */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={true}
            label="Personal Phone Number"
            formikField="personalPhoneNumber"
            margin="mb-0"
          />
        </div>

        <div className="col-lg-6 col-md-6 col-sm-12">
          <TextInput
            isRequired={false}
            label="Alternate Phone Number"
            formikField="alternatePhoneNumber"
            margin="mb-0"
          />
        </div>
      </div>

      {/* Row 3: Social Profiles */}
      <div className="row">
        <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={false}
            label="LinkedIn Profile URL"
            formikField="linkedInProfileUrl"
            margin="mb-0"
          />
        </div>

        <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={false}
            label="Instgram Profile URL"
            formikField="instagramProfileUrl"
            margin="mb-0"
          />
        </div>

        <div className="col-lg-4 col-md-6 col-sm-12">
          <TextInput
            isRequired={false}
            label="Facebook Profile URL"
            formikField="facebookProfileUrl"
            margin="mb-0"
          />
        </div>
      </div>
    </>
  );
}

export default PersonalContactInfo;
