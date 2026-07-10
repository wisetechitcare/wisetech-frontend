import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";

function WorkContactInfo({ formikProps }: { formikProps: any }) {
  return (
    <>
      <div className="row">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={true}
            label="Work Email Address"
            formikField="companyEmailId"
          />
        </div>

        <div className="col-lg-6 col-md-6 col-sm-12">
          <PhoneNumberInput
            isRequired={true}
            label="Work Mobile Number"
            formikField="companyPhoneNumber"
            formikProps={formikProps}
            extensionField="companyPhoneExtension"
            defaultCountry="91"
            placeholder="Phone number"
          />
        </div>
      </div>
    </>
  );
}

export default WorkContactInfo;
