import TextInput from "@app/modules/common/inputs/TextInput";
import PhoneInputField from "@app/modules/common/inputs/PhoneInput";

function WorkContactInfo() {
  return (
    <>
      <div className="row">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={false}
            label="Work Email Address"
            formikField="companyEmailId"
          />
        </div>

        <div className="col-lg-6 col-md-6 col-sm-12">
          <PhoneInputField
            isRequired={false}
            label="Work Mobile Number"
            formikField="companyPhoneNumber"
            extensionField="companyPhoneExtension"
            defaultCountry="91"
          />
        </div>
      </div>
    </>
  );
}

export default WorkContactInfo;
