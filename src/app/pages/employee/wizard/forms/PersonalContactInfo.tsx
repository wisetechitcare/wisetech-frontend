import { WtFieldFormik, WtPhoneFieldFormik } from "@app/modules/common/components/ui";
import { Alert, Box } from "@mui/material";
import { useState } from "react";
import { checkEmailDomain } from "@utils/emailDomain";

function PersonalContactInfo({
  formikProps,
  softRequired = false,
}: {
  formikProps: any;
  /** Candidate / pre-hire — no hard asterisks on contact fields. */
  softRequired?: boolean;
}) {
  const contactRequired = !softRequired;
  /**
   * Warn before the personal email is edited on an employee who already has one.
   *
   * This address is one of the two the "Set up your account password" mail goes out to
   * (handlers/employees.ts sends to companyEmailId AND users.personalEmailId), so changing
   * it silently redirects where account links land — which is not something anyone expects
   * from a field sitting between a phone number and a LinkedIn URL.
   *
   * Shown on FOCUS rather than after the fact: the point is to be read before the value is
   * touched. It stays up once the value actually differs, so it is still on screen at the
   * moment Save is pressed rather than disappearing with the cursor.
   *
   * Only when there IS a saved address — during first-time onboarding nothing is being
   * changed, and a warning about changes on an empty field is just noise.
   */
  const [emailFocused, setEmailFocused] = useState(false);
  const savedEmail: string = formikProps?.initialValues?.personalEmailId ?? "";
  const emailChanged = (formikProps?.values?.personalEmailId ?? "") !== savedEmail;
  const showEmailWarning = Boolean(savedEmail) && (emailFocused || emailChanged);

  return (
    <>
      {/* Row 1: Email + Personal Phone Number */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2, mb: 3 }}>
        <Box>
          {/* Focus events bubble in React, so the wrapper hears the input without the shared
              TextInput growing an onFocus prop for this one field's sake. */}
          <div
            onFocus={() => setEmailFocused(true)}
            onBlur={() => {
              setEmailFocused(false);
              checkEmailDomain(formikProps?.values?.personalEmailId).then(() =>
                formikProps?.validateField?.("personalEmailId"));
            }}
          >
            <WtFieldFormik
              required={contactRequired}
              label="Personal Email Address"
              name="personalEmailId"
              type="email"
            />
          </div>
          {showEmailWarning && (
            <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
              <span>
                Changing this address changes where this account's password setup and
                sign-in emails are delivered. The employee signs in with their company
                email, which is not affected.
              </span>
            </Alert>
          )}
        </Box>

        <Box>
          <WtPhoneFieldFormik
            label="Personal Phone Number"
            required={contactRequired}
            name="personalPhoneNumber"
            extensionField="personalPhoneNumberExtension"
            placeholder="Phone number"
          />
        </Box>
      </Box>

      {/* Row 2: Alternate Phone Number */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2, mb: 3 }}>
        <Box>
          <WtPhoneFieldFormik
            label="Alternate Phone Number"
            required={false}
            name="alternatePhoneNumber"
            placeholder="Phone number"
          />
        </Box>
      </Box>

      {/* Row 3: Social Profiles */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
        <Box>
          <WtFieldFormik
            required={false}
            label="LinkedIn Profile URL"
            name="linkedInProfileUrl"
          />
        </Box>

        <Box>
          <WtFieldFormik
            required={false}
            label="Instagram Profile URL"
            name="instagramProfileUrl"
          />
        </Box>

        <Box>
          <WtFieldFormik
            required={false}
            label="Facebook Profile URL"
            name="facebookProfileUrl"
          />
        </Box>
      </Box>
    </>
  );
}

export default PersonalContactInfo;
