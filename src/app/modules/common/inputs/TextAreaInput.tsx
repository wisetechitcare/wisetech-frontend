import { useId } from "react";
import { useField, useFormikContext, type FormikValues } from "formik";
import { employeeOnBardingFormRegexes } from "@constants/regex";
import { useUnsavedChangesRegistration } from "../components/ui/UnsavedChangesProvider";
import { Field, FieldError, FieldLabel } from "@/ds/ui/field";
import { Textarea } from "@/ds/ui/textarea";

interface TextAreaInputProps {
    isRequired: boolean;
    formikField: string;
    readonly?: boolean;
    margin?: string;
    label?: string;
    placeholder?: string;
    rows?: number;
}

function TextAreaInput({ isRequired, label, formikField, readonly, placeholder, rows = 4 }: TextAreaInputProps) {
    const { dirty } = useFormikContext<FormikValues>();
    useUnsavedChangesRegistration(dirty);
    const [field, meta] = useField(formikField);
    const id = useId();
    const hasEmptyPlaceholder = placeholder === "-";
    const errorText = meta.touched && meta.error ? String(meta.error) : undefined;
    const dynamicRegex = employeeOnBardingFormRegexes[field.name.replace(/\[\d+\]/g, "")] || /.*/;

    return (
        <Field data-invalid={errorText ? true : undefined}>
            {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
            <Textarea
                {...field}
                value={field.value ?? ""}
                id={id}
                placeholder={placeholder}
                readOnly={readonly || hasEmptyPlaceholder}
                required={isRequired}
                aria-invalid={errorText ? true : undefined}
                // `field-sizing-content` ignores `rows`, so the row count becomes the minimum height.
                style={{ minHeight: `${rows * 1.5 + 1.5}em` }}
                className={hasEmptyPlaceholder ? "text-center" : undefined}
                onChange={(e) => {
                    // Strip `<`/`>` unconditionally so no field can ever form an HTML/script tag.
                    const value = e.target.value.replace(/[<>]/g, "");
                    if (dynamicRegex.test(value)) field.onChange({ ...e, target: { ...e.target, name: field.name, value } });
                }}
            />
            {errorText && <FieldError>{errorText}</FieldError>}
        </Field>
    );
}

export default TextAreaInput;
