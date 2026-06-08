import TextInput from "app/modules/common/inputs/TextInput";

function WorkContactInfo() {

return (
  <>
    <div className="row">
      <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
        <TextInput
          isRequired={true}
          label="Work Email Address"
          formikField="companyEmailId"
        />
      </div>

      <div className="col-lg-4 col-md-6 col-sm-12 mb-3 mb-lg-0">
        <TextInput
          isRequired={false}
          label="Extension"
          formikField="companyPhoneExtension"
        />
      </div>

      <div className="col-lg-4 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Work Mobile Number"
          formikField="companyPhoneNumber"
        />
      </div>
    </div>
  </>
);

}

export default WorkContactInfo;