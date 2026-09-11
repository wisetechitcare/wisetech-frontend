import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import { useState } from "react";

function PersonalContactInfo({ formikProps }: { formikProps: any }) {
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
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          {/* Focus events bubble in React, so the wrapper hears the input without the shared
              TextInput growing an onFocus prop for this one field's sake. */}
          <div onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}>
            <TextInput
              isRequired={true}
              label="Personal Email Address"
              formikField="personalEmailId"
              margin="mb-0"
            />
          </div>
          {showEmailWarning && (
            <div className="alert alert-warning d-flex align-items-start py-2 px-3 mt-2 mb-0" role="alert">
              <i className="fa-solid fa-triangle-exclamation me-2 mt-1" />
              <span className="fs-7">
                Changing this address changes where this account's password setup and
                sign-in emails are delivered. The employee signs in with their company
                email, which is not affected.
              </span>
            </div>
          )}
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
