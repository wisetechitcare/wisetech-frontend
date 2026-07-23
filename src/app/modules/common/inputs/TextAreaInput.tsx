import { Field } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { employeeOnBardingFormRegexes } from "@constants/regex";

interface TextAreaInputProps {
    isRequired: boolean;
    formikField: string;
    readonly?: boolean;
    margin?: string;
    label?: string;
    placeholder?: string;
    rows?: number;
}

function TextAreaInput({ margin, isRequired, label, formikField, readonly, placeholder, rows = 4 }: TextAreaInputProps) {
    const hasEmptyPlaceholder = placeholder === "-";
    // DOM-safe id derived from the Formik path so the <label> links to the textarea.
    const fieldId = `field-${formikField.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

    return (
        <div className={`d-flex flex-column fv-row ${margin ? margin : ''}`}>
            {label ? <label htmlFor={fieldId} className='d-flex align-items-center fs-6 form-label mb-2'>
                <span className={`${isRequired ? 'required' : ''}`}>{label}</span>
            </label> : null}

            <Field
                name={formikField}
            >
                {({ field }:{field: any}) => {
                    const getFieldName = (field.name).replace(/\[\d+\]/g, "");
                    const dynamicRegex = employeeOnBardingFormRegexes[getFieldName] || /.*/;
                    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        // Strip `<`/`>` unconditionally so no field can ever form an HTML/script tag.
                        const value = e.target.value.replace(/[<>]/g, '');
                        if (dynamicRegex.test(value)) {
                            field.onChange({ ...e, target: { ...e.target, value } });
                        }
                    };

                    return (
                        <textarea
                            {...field}
                            id={fieldId}
                            className={`employee__form_wizard__input form-control ${
                                hasEmptyPlaceholder ? "text-center" : ""
                            }`}
                            placeholder={placeholder}
                            readOnly={readonly || hasEmptyPlaceholder}
                            rows={rows}
                            onChange={handleChange}
                        />
                    );
                }}
            </Field>

            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </div>
    );
}

export default TextAreaInput;
