import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "app/modules/common/inputs/TextInput";

const bloodGroupOptions = [
    { value: 'A_POS', label: 'A+' },
    { value: 'A_NEG', label: 'A-' },
    { value: 'B_POS', label: 'B+' },
    { value: 'B_NEG', label: 'B-' },
    { value: 'AB_POS', label: 'AB+' },
    { value: 'AB_NEG', label: 'AB-' },
    { value: 'O_POS', label: 'O+' },
    { value: 'O_NEG', label: 'O-' },
];

function EmergencyDetails({ formikProps }: any) {
    return (
        <div className="d-flex flex-column gap-4">
  {/* Row 1: Blood Group, Allergies */}
  <div className="row g-3">
    <div className="col-lg-6 col-md-6 col-sm-12">
      <DropDownInput
        isRequired={false}
        formikField="emergencyDetails.bloodGroup"
        inputLabel="Blood Group"
        options={bloodGroupOptions}
      />
    </div>

    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="Allergies"
        formikField="emergencyDetails.allergies"
        placeholder="Enter any allergies or medical conditions"
        margin="mb-0"
      />
    </div>
  </div>

  {/* Row 2: Emergency Contact Name, Emergency Contact Number */}
  <div className="row g-3">
    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="Emergency Contact Name"
        formikField="emergencyDetails.emergencyContactName"
        placeholder="Enter emergency contact name"
        margin="mb-0"
      />
    </div>

    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="Emergency Contact Number"
        formikField="emergencyDetails.emergencyContactNumber"
        placeholder="Enter emergency contact number"
        inputValidation="numbers"
        margin="mb-0"
      />
    </div>
  </div>
</div>

    );
}

export default EmergencyDetails;