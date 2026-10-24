import { ChangeEvent, useState } from "react";
import { useFormikContext } from "formik";
import { WtFieldFormik } from "@app/modules/common/components/ui";
import { WtPhoneFieldFormik } from "@app/modules/common/components/ui";
import { Box, Checkbox, FormControlLabel } from "@mui/material";
import { checkEmailDomain } from "@utils/emailDomain";

/**
 * Work email and mobile — both OPTIONAL.
 *
 * A new joiner often has no company address or number issued yet, and holding the
 * whole form hostage to one they don't have simply invited placeholder data. The
 * format rules still apply to anything actually entered.
 *
 * Most small companies reuse the employee's personal contact details here, which
 * meant retyping an email and a number already captured two sections earlier. The
 * checkbox mirrors them across — the same "Same as current address" affordance the
 * Address Details section uses, so it behaves the way the admin already expects:
 * ticking copies, unticking clears what was copied.
 */
function WorkContactInfo({ formikProps }: { formikProps: any }) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<any>();
  const [isSameAsPersonal, setIsSameAsPersonal] = useState(false);

  const personalEmail = String(values?.personalEmailId || "").trim();
  const personalPhone = String(values?.personalPhoneNumber || "").trim();
  const personalExtension = String(values?.personalPhoneNumberExtension || "").trim();

  const handleSameAsPersonal = (e: ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsSameAsPersonal(isChecked);

    const set = (field: string, value: string) => {
      setFieldValue(field, value);
      setFieldTouched(field, true, false);
    };

    if (isChecked) {
      // Only overwrite what there is something to overwrite WITH — a blank personal
      // phone must not wipe a work number the admin already typed.
      if (personalEmail) set("companyEmailId", personalEmail);
      if (personalPhone) {
        set("companyPhoneNumber", personalPhone);
        // The extension belongs to the number; copying one without the other would
        // leave a dialling code pointing at the wrong desk.
        setFieldValue("companyPhoneExtension", personalExtension);
      }
    } else {
      if (personalEmail) set("companyEmailId", "");
      if (personalPhone) {
        set("companyPhoneNumber", "");
        setFieldValue("companyPhoneExtension", "");
      }
    }
  };

  return (
    <>
      {/* Nothing to mirror until the personal section has been filled in. */}
      {(personalEmail || personalPhone) && (
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={isSameAsPersonal} onChange={handleSameAsPersonal} size="small" />}
            label="Same as personal contact details"
          />
        </Box>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <Box
          onBlur={() => checkEmailDomain(values?.companyEmailId).then(() => formikProps?.validateField?.("companyEmailId"))}
        >
          <WtFieldFormik
            required={false}
            label="Work Email Address"
            name="companyEmailId"
            type="email"
          />
        </Box>

        <Box>
          <WtPhoneFieldFormik
            required={false}
            label="Work Mobile Number"
            name="companyPhoneNumber"
            extensionField="companyPhoneExtension"
            defaultCountry="91"
            placeholder="Phone number"
          />
        </Box>
      </Box>
    </>
  );
}

export default WorkContactInfo;
