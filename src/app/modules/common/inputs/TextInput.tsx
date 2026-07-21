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
  isRequired: boolean;
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
  maxLength?: number;
  /** Caps input to this many words, truncating extra words as the user types (not just
   *  characters) — e.g. "30 to 40 words" style limits. */
  maxWords?: number;
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
  maxLength,
  maxWords,
}: TextInputProps) {
  const [validationError, setValidationError] = useState<string>("");

  // DOM-safe id derived from the Formik path (which may contain dots/brackets like
  // "familyInfo[0].mobileNumber") so the <label> can be programmatically linked to the input.
  const fieldId = `field-${formikField.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <div className={`d-flex flex-column fv-row ${margin ?? ""}`}>
      {label && (
        <label htmlFor={fieldId} className="d-flex align-items-center fs-6 form-label mb-2">
          <span className={isRequired ? "required" : ""}>{label}</span>
        </label>
      )}

      <div className={prefix || suffix ? "input-group" : ""}>
        {prefix && <span className="input-group-text">{prefix}</span>}

        <Field name={formikField}>
          {({ field, form, meta }: { field: any; form: any; meta: any }) => {
            const fieldBaseName = field.name.replace(/\[\d+\]/g, "");
            const dynamicRegex = employeeOnBardingFormRegexes[fieldBaseName] || /.*/;
            const displayValue = formatter ? formatter(field.value) : field.value;
            const isInvalid = !!(meta.touched && meta.error);

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              // Neutralize newlines/tabs (e.g. pasted content) only. Trimming and
              // space-collapsing are deferred to blur so spaces can be typed
              // normally — trimming on every keystroke eats trailing spaces.
              // `<`/`>` are stripped unconditionally (not just for fields with a specific
              // regex) so no field — typed or pasted — can ever form an HTML/script tag.
              let raw = e.target.value.replace(/[\n\r\t]/g, ' ').replace(/[<>]/g, '');

              if (maxWords) {
                const words = raw.split(/\s+/).filter(Boolean);
                if (words.length > maxWords) {
                  raw = words.slice(0, maxWords).join(' ') + (/\s$/.test(raw) ? ' ' : '');
                }
              }

              const parsedValue = parser ? parser(raw) : raw;

              // Prevent negative values for number type inputs
              if (type === "number" && parsedValue !== "" && !isNaN(parsedValue)) {
                const numValue = parseFloat(parsedValue);
                if (numValue < 0) {
                  return;
                }
              }

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

            // On blur: collapse runs of whitespace and trim the edges, then commit
            // the cleaned value. Keeps Formik's own onBlur (touched) intact.
            const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
              field.onBlur(e);
              const current = typeof field.value === "string" ? field.value : "";
              const cleaned = current.replace(/\s+/g, " ").trim();

              // Reset negative values to empty for number type inputs
              if (type === "number" && cleaned !== "" && !isNaN(cleaned)) {
                const numValue = parseFloat(cleaned);
                if (numValue < 0) {
                  form.setFieldValue(field.name, "");
                  return;
                }
              }

              if (cleaned !== current) {
                form.setFieldValue(field.name, parser ? parser(cleaned) : cleaned);
              }
            };

            return (
              <input
                {...field}
                id={fieldId}
                type={type}
                value={displayValue ?? ""}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder ?? ""}
                readOnly={readonly}
                disabled={readonly}
                maxLength={maxLength}
                defaultValue={defaultValue}
                className={`form-control${isInvalid ? " is-invalid" : ""}`}
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

      <HighlightErrors isRequired={isRequired} formikField={formikField} />
    </div>
  );
}

export default TextInput;
