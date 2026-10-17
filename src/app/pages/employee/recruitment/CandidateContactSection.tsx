import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useFormikContext } from "formik";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import {
  FORM_SPACE, FormSection, InlineNotice, TRIO, WtFieldFormik,
} from "@app/modules/common/components/ui";
import { checkEmailDomain } from "@utils/emailDomain";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import type { CandidateFormValues } from "./candidateProfile";

/**
 * Candidate Contact leaf — kit fields (recruitment-local).
 * Phones keep shared PhoneNumberInput until a kit phone lands (deferred shared debt).
 * Does not render PersonalContactInfo (TextInput path).
 */
export function CandidateContactSection({
  formikProps,
  softRequired = true,
}: OnboardingSectionsProps) {
  const { values, validateField } = useFormikContext<CandidateFormValues>();
  const contactRequired = !softRequired;

  const [emailFocused, setEmailFocused] = useState(false);
  const savedEmail = String(formikProps?.initialValues?.personalEmailId ?? "");
  const emailChanged = String(values.personalEmailId ?? "") !== savedEmail;
  const showEmailWarning = Boolean(savedEmail) && (emailFocused || emailChanged);

  return (
    <Stack spacing={FORM_SPACE.stackGap}>
      <InlineNotice icon="information-5">
        Email or phone is required to save this candidate — at least one must be filled in.
      </InlineNotice>

      <FormSection tone={TRIO.blue} icon="sms" title="Email & phone" desc="At least one of email or personal phone.">
        <Stack spacing={FORM_SPACE.fieldGap} sx={{ pt: FORM_SPACE.fieldGap / 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={FORM_SPACE.fieldGap}>
            <Box
              sx={{ flex: 1, minWidth: 0 }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => {
                setEmailFocused(false);
                void checkEmailDomain(values.personalEmailId).then(() => {
                  void validateField("personalEmailId");
                });
              }}
            >
              <WtFieldFormik
                name="personalEmailId"
                label="Personal Email Address"
                required={contactRequired}
                fullWidth
                type="email"
              />
              {showEmailWarning && (
                <Typography
                  role="alert"
                  sx={{
                    mt: 1, fontSize: 12.5, color: "warning.dark",
                    bgcolor: "warning.light", borderRadius: 1, px: 1.25, py: 1,
                  }}
                >
                  Changing this address changes where password setup and sign-in emails
                  are delivered. Company email sign-in is not affected.
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PhoneNumberInput
                label="Personal Phone Number"
                isRequired={contactRequired}
                formikField="personalPhoneNumber"
                formikProps={formikProps}
                extensionField="personalPhoneNumberExtension"
                placeholder="Phone number"
              />
            </Box>
          </Stack>

          <Box sx={{ maxWidth: { md: "50%" } }}>
            <PhoneNumberInput
              label="Alternate Phone Number"
              isRequired={false}
              formikField="alternatePhoneNumber"
              formikProps={formikProps}
              placeholder="Phone number"
            />
          </Box>
        </Stack>
      </FormSection>

      <FormSection tone={TRIO.cyan} icon="share" title="Social profiles" desc="Optional links for sourcing context.">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={FORM_SPACE.fieldGap}
          sx={{ pt: FORM_SPACE.fieldGap / 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <WtFieldFormik name="linkedInProfileUrl" label="LinkedIn Profile URL" fullWidth />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <WtFieldFormik name="instagramProfileUrl" label="Instagram Profile URL" fullWidth />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <WtFieldFormik name="facebookProfileUrl" label="Facebook Profile URL" fullWidth />
          </Box>
        </Stack>
      </FormSection>
    </Stack>
  );
}

export default CandidateContactSection;
