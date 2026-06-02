import { Field } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { employeeOnBardingFormRegexes } from "@constants/regex";
import { useState } from "react";

type SimpleInputType =
  | "numbers"
  | "numbers-space"
  | "letters"
  | "letters-space"
  | "alphanumeric"
  | "decimal"
  | "signed-decimal";

const SIMPLE_PATTERNS: Record<SimpleInputType, RegExp> = {
  numbers: /^[0-9]*$/,
  "numbers-space": /^[0-9\s]*$/,
  letters: /^[a-zA-Z]*$/,
  "letters-space": /^[a-zA-Z\s]*$/,
  alphanumeric: /^[a-zA-Z0-9\s]*$/,
  decimal: /^[0-9]*\.?[0-9]*$/,
  "signed-decimal": /^-?[0-9]*\.?[0-9]*$/,
};

const ERROR_MESSAGES: Record<SimpleInputType, string> = {
  numbers: "Input Type Should Be Number",
  "numbers-space": "Input Type Should Be Number",
  letters: "Input Type Should Be Letters",
  "letters-space": "Input Type Should Be Letters",
  alphanumeric: "Input Type Should Be Letters and Numbers",
  decimal: "Input Type Should Be Number",
  "signed-decimal": "Input Type Should Be Number",
};


interface TextInputProps {
  isRequired?: boolean;
  formikField: string;
  readonly?: boolean;
  margin?: string;
  label?: string;
  placeholder?: string;
  inputTypeNumber?: boolean;
  defaultValue?: any;
  prefix?: string;
  suffix?: string;
  formatter?: (value: any) => string;
  parser?: (value: string) => any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputValidation?: SimpleInputType;
  type?: string;
}

function TextInput({
  margin,
  isRequired,
  label,
  formikField,
  readonly,
  placeholder,
  inputTypeNumber: _inputTypeNumber = false,
  defaultValue,
  prefix,
  suffix,
  formatter,
  parser,
  inputValidation,
  type = "text",
  onChange,
}: TextInputProps) {
  const [validationError, setValidationError] = useState<string>("");

  return (
    <div className={`d-flex flex-column fv-row ${margin ?? ""}`}>
      {label && (
        <label className="d-flex align-items-center fs-6 form-label mb-2">
          <span className={isRequired ? "required" : ""}>{label}</span>
        </label>
      )}

      <div className={prefix || suffix ? "input-group" : ""}>
        {prefix && <span className="input-group-text">{prefix}</span>}

        <Field name={formikField}>
          {({ field, form }: { field: any; form: any }) => {
            const fieldBaseName = field.name.replace(/\[\d+\]/g, "");
            const dynamicRegex = employeeOnBardingFormRegexes[fieldBaseName] || /.*/;
            const displayValue = formatter ? formatter(field.value) : field.value;

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value;
              const parsedValue = parser ? parser(raw) : raw;

              if (inputValidation) {
                const pattern = SIMPLE_PATTERNS[inputValidation];
                if (raw && !pattern.test(raw)) {
                  setValidationError(ERROR_MESSAGES[inputValidation]);
                  return;
                }
                setValidationError("");
              }

              if (!parsedValue || dynamicRegex.test(parsedValue)) {
                form.setFieldValue(field.name, parsedValue);
                onChange?.(e);
              }
            };

            return (
              <input
                {...field}
                type={type}
                value={displayValue ?? ""}
                onChange={handleChange}
                placeholder={placeholder ?? ""}
                readOnly={readonly}
                disabled={readonly}
                defaultValue={defaultValue}
                className="form-control"
                style={{ height: 44 }}
              />
            );
          }}
        </Field>

        {suffix && <span className="input-group-text">{suffix}</span>}
      </div>

      {validationError && (
        <div className="text-danger mt-1 fs-7">{validationError}</div>
      )}

      <HighlightErrors isRequired={Boolean(isRequired)} formikField={formikField} />
    </div>
  );
}

export default TextInput;
