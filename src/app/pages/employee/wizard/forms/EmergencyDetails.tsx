import { useState } from "react";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";

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
  const { values, setFieldValue } = formikProps;

  // The first family member that has a name — used to autofill the emergency contact so the user
  // doesn't retype details already entered under Family Details.
  const familyMembers = Array.isArray(values.familyInfo) ? values.familyInfo : [];
  const firstNamedRelative = familyMembers.find((m: any) => m?.name && String(m.name).trim());

  const [sameAsFamily, setSameAsFamily] = useState(false);

  const handleSameAsFamily = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSameAsFamily(checked);
    if (checked && firstNamedRelative) {
      setFieldValue("emergencyDetails.emergencyContactName", firstNamedRelative.name || "");
      setFieldValue("emergencyDetails.emergencyContactNumber", firstNamedRelative.mobileNumber || "");
    } else {
      // Unchecking clears the copied values (matches the "Same as current address" behaviour).
      setFieldValue("emergencyDetails.emergencyContactName", "");
      setFieldValue("emergencyDetails.emergencyContactNumber", "");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
  {/* Row 1: Blood Group, Allergies */}
  <div className="row g-3">
    <div className="col-lg-6 col-md-6 col-sm-12">
      <DropDownInput
        isRequired={false}
        formikField="emergencyDetails.bloodGroup"
        inputLabel="Blood Group"
        placeholder="Select blood group"
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
        maxWords={40}
      />
    </div>
  </div>

  {/* Emergency contact group — the "Same as Family Detail" checkbox sits directly above the
      name/number row (tightly coupled) so it reads as a lead-in to those fields rather than a
      floating band that leaves an uneven empty gap in the right column. */}
  <div className="d-flex flex-column gap-3">
    {firstNamedRelative && (
      <label className="form-check form-check-sm form-check-custom form-check-solid m-0 align-self-start">
        <input
          className="form-check-input"
          type="checkbox"
          checked={sameAsFamily}
          onChange={handleSameAsFamily}
        />
        <span className="form-check-label">Same as Family Detail</span>
      </label>
    )}

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
        <PhoneNumberInput
          label="Emergency Contact Number"
          isRequired={false}
          formikField="emergencyDetails.emergencyContactNumber"
          formikProps={formikProps}
          placeholder="Enter emergency contact number"
        />
      </div>
    </div>
  </div>
</div>

    );
}

export default EmergencyDetails;
