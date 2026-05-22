import TextInput from "@app/modules/common/inputs/TextInput";
import HighlightErrors from "@app/modules/errors/components/HighlightErrors";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

function PersonalContactInfo({ formikProps }: { formikProps: any }) {
  const hasError = !!(
    formikProps.touched.personalPhoneNumber && formikProps.errors.personalPhoneNumber
  );

  // react-phone-input-2 value = dialCode + number (no + prefix, digits only)
  const combinedValue =
    (formikProps.values.personalPhoneNumberExtension || "91") +
    (formikProps.values.personalPhoneNumber || "");

  return (
    <>
      {/* Row 1: Email + Personal Phone Number */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={true}
            label="Personal Email Address"
            formikField="personalEmailId"
            margin="mb-0"
          />
        </div>

        <div className="col-lg-6 col-md-6 col-sm-12">
          <label className="d-flex align-items-center fs-6 form-label mb-2">
            <span className="required">Personal Phone Number</span>
          </label>

          <div className={`ph-wrap${hasError ? " ph-error" : ""}`}>
            <PhoneInput
              country="in"
              value={combinedValue}
              onChange={(value: string, countryData: any) => {
                const dc = countryData.dialCode || "91";
                const num = value.startsWith(dc) ? value.slice(dc.length) : value;
                formikProps.setFieldValue("personalPhoneNumberExtension", dc);
                formikProps.setFieldValue("personalPhoneNumber", num.replace(/\D/g, ""));
              }}
              onBlur={() => formikProps.setFieldTouched("personalPhoneNumber", true)}
              placeholder="Phone number"
              countryCodeEditable={false}
              inputProps={{ name: "personalPhoneNumber" }}
            />
          </div>

          <HighlightErrors isRequired={true} formikField="personalPhoneNumber" />
        </div>
      </div>

      {/* Row 2: Alternate Phone Number */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12">
          <TextInput
            isRequired={false}
            label="Alternate Phone Number"
            formikField="alternatePhoneNumber"
            margin="mb-0"
          />
        </div>
      </div>

      <style>{`
        /* Outer wrapper provides the border and height */
        .ph-wrap {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          background: #fff;
          transition: border-color 0.15s ease;
          height: 44px;
          display: flex;
          align-items: stretch;
        }
        .ph-wrap:hover { border-color: #b5b5c3; }
        .ph-error { border-color: #f1416c !important; }

        /* Library container fills the wrapper */
        .ph-wrap .react-tel-input {
          font-family: inherit;
          width: 100%;
          position: relative;
        }

        /* Number input: remove library border, let wrapper supply it */
        .ph-wrap .react-tel-input .form-control {
          width: 100% !important;
          height: 44px !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          background: transparent !important;
          font-size: 0.925rem !important;
          color: #3f4254 !important;
          font-family: inherit !important;
          border-radius: 0 8px 8px 0 !important;
          /* 56px flag button + 6px gap */
          padding-left: 62px !important;
        }

        /* Flag dropdown button */
        .ph-wrap .react-tel-input .flag-dropdown {
          border: none !important;
          border-right: 1px solid #dee2e6 !important;
          background: transparent !important;
          border-radius: 8px 0 0 8px !important;
          height: 44px !important;
          top: 0 !important;
        }

        .ph-wrap .react-tel-input .selected-flag {
          background: transparent !important;
          border-radius: 8px 0 0 8px !important;
          padding: 0 8px 0 12px !important;
          height: 44px !important;
          width: 56px !important;
          display: flex !important;
          align-items: center !important;
        }

        .ph-wrap .react-tel-input .selected-flag:hover,
        .ph-wrap .react-tel-input .flag-dropdown.open .selected-flag {
          background: rgba(0, 0, 0, 0.03) !important;
        }

        /* Dropdown list */
        .ph-wrap .react-tel-input .country-list {
          border-radius: 10px !important;
          border: 1px solid #e4e6ef !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
          width: 290px !important;
          max-height: 220px !important;
          font-family: inherit !important;
          margin-top: 2px !important;
        }

        .ph-wrap .react-tel-input .country-list .country {
          padding: 8px 14px !important;
          font-size: 0.875rem !important;
          color: #3f4254 !important;
        }

        .ph-wrap .react-tel-input .country-list .country:hover,
        .ph-wrap .react-tel-input .country-list .country.highlight {
          background: #f5f8ff !important;
        }

        .ph-wrap .react-tel-input .country-list .dial-code {
          color: #a1a5b7 !important;
          font-size: 0.8rem !important;
          font-weight: 500 !important;
        }

        .ph-wrap .react-tel-input .country-list .country-name {
          font-size: 0.875rem !important;
          color: #3f4254 !important;
        }
      `}</style>

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
            label="Instgram Profile URL"
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
