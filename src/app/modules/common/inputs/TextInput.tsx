import { useField, useFormikContext, type FormikValues } from "formik";
import { useState, type ChangeEvent } from "react";
import { employeeOnBardingFormRegexes } from "@constants/regex";
import { WtField } from "../components/ui";
import { useUnsavedChangesRegistration } from "../components/ui/UnsavedChangesProvider";

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
  /** `above` puts the label on its own line, matching DropDownInput and DateInput in the same row. */
  labelPlacement?: "floating" | "above";
  placeholder?: string;
  inputTypeNumber?: boolean;
  defaultValue?: unknown;
  prefix?: string;
  suffix?: string;
  formatter?: (value: unknown) => string;
  parser?: (value: string) => unknown;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  inputValidation?: SimpleInputType;
  type?: "text" | "number" | "email" | "tel" | "password";
  maxLength?: number;
  maxWords?: number;
}

function TextInput({
  isRequired,
  label,
  labelPlacement,
  formikField,
  readonly,
  placeholder,
  prefix,
  suffix: _suffix,
  formatter,
  parser,
  inputValidation,
  type = "text",
  onChange,
  maxLength,
  maxWords,
}: TextInputProps) {
  const [validationError, setValidationError] = useState<string>();
  const { dirty } = useFormikContext<FormikValues>();
  const [field, meta, helpers] = useField(formikField);
  useUnsavedChangesRegistration(dirty);

  const fieldBaseName = field.name.replace(/\[\d+\]/g, "");
  const dynamicRegex = employeeOnBardingFormRegexes[fieldBaseName] || /.*/;
  const displayValue = formatter ? formatter(field.value) : field.value;
  const invalid = Boolean(meta.touched && meta.error);

  const handleChange = (value: string) => {
    let raw = value.replace(/[\n\r\t]/g, " ").replace(/[<>]/g, "");
    if (maxWords) {
      const words = raw.split(/\s+/).filter(Boolean);
      if (words.length > maxWords) raw = words.slice(0, maxWords).join(" ") + (/\s$/.test(raw) ? " " : "");
    }

    const parsedValue = parser ? parser(raw) : raw;
    if (type === "number" && parsedValue !== "" && !Number.isNaN(Number(parsedValue)) && Number(parsedValue) < 0) return;

    if (inputValidation) {
      const pattern = SIMPLE_PATTERNS[inputValidation];
      if (raw && !pattern.test(raw)) {
        setValidationError(ERROR_MESSAGES[inputValidation]);
        return;
      }
      setValidationError(undefined);
    }

    if (!parsedValue || dynamicRegex.test(String(parsedValue))) {
      void helpers.setValue(parsedValue);
      onChange?.({ target: { value: raw, name: field.name } } as ChangeEvent<HTMLInputElement>);
    }
  };

  const handleBlur = () => {
    void helpers.setTouched(true);
    const current = typeof field.value === "string" ? field.value : "";
    const cleaned = current.replace(/\s+/g, " ").trim();
    if (cleaned !== current) void helpers.setValue(parser ? parser(cleaned) : cleaned);
  };

  return (
    <WtField
      name={field.name}
      label={label}
      labelPlacement={labelPlacement}
      value={displayValue ?? ""}
      onChange={handleChange}
      onBlur={handleBlur}
      required={isRequired}
      disabled={readonly}
      placeholder={placeholder}
      type={type}
      prefix={prefix}
      maxLength={maxLength}
      error={invalid ? String(meta.error) : validationError}
    />
  );
}

export default TextInput;
