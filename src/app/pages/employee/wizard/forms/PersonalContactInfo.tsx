import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";

function PersonalContactInfo({ formikProps }: { formikProps: any }) {
  return (
    <>
      {/* Row 1: Email + Personal Phone Number */}
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
          <PhoneNumberInput
            label="Personal Phone Number"
            isRequired={true}
            formikField="personalPhoneNumber"
            formikProps={formikProps}
            extensionField="personalPhoneNumberExtension"
            placeholder="Phone number"
          />
        </div>
      </div>

      {/* Row 2: Alternate Phone Number */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12">
          <PhoneNumberInput
            label="Alternate Phone Number"
            isRequired={false}
            formikField="alternatePhoneNumber"
            formikProps={formikProps}
            placeholder="Phone number"
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
            label="Instagram Profile URL"
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
