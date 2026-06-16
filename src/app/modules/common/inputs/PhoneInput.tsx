import React from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useFormikContext } from "formik";

interface Props {
  label: string;
  formikField: string;
  isRequired?: boolean;
  extensionField?: string;
  defaultCountry?: string;
}

const PhoneInputField: React.FC<Props> = ({
  label,
  formikField,
  isRequired,
  extensionField,
  defaultCountry = "91",
}) => {
  const { setFieldValue, values, errors, touched, setFieldTouched } = useFormikContext<Record<string, any>>();
  const error = errors[formikField];
  const isTouched = touched[formikField];

  const currentValue = values[formikField] || "";
  const currentExtension = extensionField ? values[extensionField] || defaultCountry : "";
  const combinedValue = extensionField
    ? `${currentExtension}${currentValue}`
    : currentValue;

  return (
    <div style={{ width: "100%" }}>
      <label style={{ fontWeight: 500 }}>
        {label} {isRequired && <span style={{ color: "#e74c3c" }}>*</span>}
      </label>

      <div className="ph-wrap">
        <PhoneInput
          country="in"
          value={combinedValue}
          onChange={(value: string, countryData: any) => {
            const dialCode = countryData?.dialCode || defaultCountry;
            const cleanedValue = value.startsWith(dialCode) ? value.slice(dialCode.length) : value;
            const digits = cleanedValue.replace(/\D/g, "");

            if (extensionField) {
              setFieldValue(extensionField, dialCode);
            }
            setFieldValue(formikField, digits);
          }}
          onBlur={() => setFieldTouched(formikField, true)}
          countryCodeEditable={false}
          placeholder="Phone number"
          inputProps={{ name: formikField, required: isRequired }}
          specialLabel=""
        />
      </div>

      {isTouched && error && (
        <div style={{ color: "#e74c3c", fontSize: 12, marginTop: 2 }}>{error as string}</div>
      )}

      <style>{`
        .ph-wrap {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          background: #fff;
          transition: border-color 0.15s ease;
          height: 44px;
          display: flex;
          align-items: stretch;
        }

        .ph-wrap:hover {
          border-color: #b5b5c3;
        }

        .ph-wrap .react-tel-input {
          font-family: inherit;
          width: 100%;
          position: relative;
        }

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
          padding-left: 62px !important;
        }

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
    </div>
  );
};

export default PhoneInputField;
