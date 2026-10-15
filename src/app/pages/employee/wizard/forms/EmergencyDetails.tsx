import { useState } from "react";
import { Box, Stack } from "@mui/material";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import { WtFieldFormik, WtCheckboxField } from "@app/modules/common/components/ui";
import { BLOOD_GROUP_OPTIONS } from "@utils/employeeFormat";

const bloodGroupOptions = BLOOD_GROUP_OPTIONS;

function EmergencyDetails({ formikProps }: any) {
  const { values, setFieldValue } = formikProps;

  const familyMembers = Array.isArray(values.familyInfo) ? values.familyInfo : [];
  const firstNamedRelative = familyMembers.find((m: any) => m?.name && String(m.name).trim());

  const [sameAsFamily, setSameAsFamily] = useState(false);

  const handleSameAsFamily = (_: unknown, checked: boolean) => {
    setSameAsFamily(checked);
    if (checked && firstNamedRelative) {
      setFieldValue("emergencyDetails.emergencyContactName", firstNamedRelative.name || "");
      setFieldValue("emergencyDetails.emergencyContactNumber", firstNamedRelative.mobileNumber || "");
    } else {
      setFieldValue("emergencyDetails.emergencyContactName", "");
      setFieldValue("emergencyDetails.emergencyContactNumber", "");
    }
  };

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        <WtFieldFormik
          name="emergencyDetails.bloodGroup"
          label="Blood Group"
          placeholder="Select blood group"
          options={bloodGroupOptions}
          clearable
          fullWidth
        />
        <WtFieldFormik
          name="emergencyDetails.allergies"
          label="Allergies"
          placeholder="Enter any allergies or medical conditions"
          fullWidth
        />
      </Box>

      <Stack spacing={1.5}>
        {firstNamedRelative && (
          <WtCheckboxField
            size="sm"
            checked={sameAsFamily}
            onChange={handleSameAsFamily}
            label="Same as Family Detail"
            sx={{ alignSelf: "flex-start" }}
          />
        )}

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <WtFieldFormik
            name="emergencyDetails.emergencyContactName"
            label="Emergency Contact Name"
            placeholder="Enter emergency contact name"
            fullWidth
          />
          <PhoneNumberInput
            label="Emergency Contact Number"
            isRequired={false}
            formikField="emergencyDetails.emergencyContactNumber"
            formikProps={formikProps}
            placeholder="Enter emergency contact number"
          />
        </Box>
      </Stack>
    </Stack>
  );
}

export default EmergencyDetails;
