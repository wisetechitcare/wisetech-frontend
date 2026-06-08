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
    
    return (
        <div className={`d-flex flex-column fv-row ${margin ? margin : ''}`}>
            {label ? <label className='d-flex align-items-center fs-6 form-label mb-2'>
                <span className={`${isRequired ? 'required' : ''}`}>{label}</span>
            </label> : null}

            <Field
                name={formikField}
            >
                {({ field }:{field: any}) => {
                    const getFieldName = (field.name).replace(/\[\d+\]/g, "");
                    const dynamicRegex = employeeOnBardingFormRegexes[getFieldName] || /.*/;
                    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const { value } = e.target;
                        if (dynamicRegex.test(value)) {
                            field.onChange(e);
                        }
                    };
                    
                    return (
                        <textarea
                            {...field}
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