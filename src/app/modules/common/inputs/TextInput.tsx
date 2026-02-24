import { Field } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { employeeOnBardingFormRegexes } from "@constants/regex";
import { useState } from "react";

// Simple validation types
type SimpleInputType = 'numbers' | 'numbers-space' | 'letters' | 'letters-space' | 'alphanumeric' | 'decimal';

// Simple regex patterns
const SIMPLE_PATTERNS = {
    'numbers': /^[0-9]*$/,
    'numbers-space': /^[0-9\s]*$/,
    'letters': /^[a-zA-Z]*$/,
    'letters-space': /^[a-zA-Z\s]*$/,
    'alphanumeric': /^[a-zA-Z0-9\s]*$/,
    'decimal': /^[0-9]*\.?[0-9]*$/,
};

// Generic error messages
const ERROR_MESSAGES = {
    'numbers': 'Input Type Should Be Number',
    'numbers-space': 'Input Type Should Be Number',
    'letters': 'Input Type Should Be Letters',
    'letters-space': 'Input Type Should Be Letters',
    'alphanumeric': 'Input Type Should Be Letters and Numbers',
    'decimal': 'Input Type Should Be Number',
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
    onChange?: (e: any) => void;
    
    // Simple validation (optional)
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
    inputTypeNumber = false,
    defaultValue,
    prefix,
    suffix,
    formatter, 
    parser,
    inputValidation,
    type = "text",
    onChange,

}: TextInputProps) {
    const hasEmptyPlaceholder = placeholder === "-";
    const [validationError, setValidationError] = useState<string>('');

    return (
        <div className={`d-flex flex-column fv-row ${margin ? margin : ''}`}>
            {label ? (
                <label className='d-flex align-items-center fs-6 form-label mb-2'>
                    <span className={`${isRequired ? 'required' : ''}`}>{label}</span>
                </label>
            ) : null}

            <div className={prefix || suffix ? "input-group" : ""}>
                {prefix && (
                    <span className="input-group-text">{prefix}</span>
                )}

                <Field name={formikField}>
                    {({ field, form }: { field: any, form: any }) => {
                        const getFieldName = field.name.replace(/\[\d+\]/g, "");
                        const dynamicRegex = employeeOnBardingFormRegexes[getFieldName] || /.*/;

                        const displayValue = formatter ? formatter(field.value) : field.value;

                        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                            let value = e.target.value;
                            const parsedValue = parser ? parser(value) : value;

                            // Simple validation check (optional)
                            if (inputValidation) {
                                const pattern = SIMPLE_PATTERNS[inputValidation];
                                if (value && !pattern.test(value)) {
                                    setValidationError(ERROR_MESSAGES[inputValidation]);
                                    return; // Don't update field if validation fails
                                } else {
                                    setValidationError('');
                                }
                            }

                            // Legacy validation (existing behavior)
                            if (!parsedValue || dynamicRegex.test(parsedValue)) {

                                form.setFieldValue(field.name, parsedValue);
                                // Call the parent's onChange handler if provided
                                if (onChange) {
                                    onChange(e);
                                }
                            }
                        };

                        return (
                            <input
                                {...field}
                                type={type}
                                className={`employee__form_wizard__input form-control ${
                                    hasEmptyPlaceholder ? "text-center" : ""
                                } ${validationError ? "is-invalid" : ""}`}
                                placeholder={label || placeholder}
                                readOnly={readonly || hasEmptyPlaceholder}
                                onChange={handleChange}
                                value={displayValue} 
                            />
                        );
                    }}
                </Field>

                {suffix && (
                    <span className="input-group-text">{suffix}</span>
                )}
            </div>

            {/* Simple validation error */}
            {validationError && (
                <div className="text-danger mt-1 fs-7">
                    {validationError}
                </div>
            )}

            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </div>
    );
}

export default TextInput;
