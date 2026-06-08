import { Field } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { employeeOnBardingFormRegexes } from "@constants/regex";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    isRequired: boolean;
    formikField: string;
    readonly?: boolean;
    margin?: string;
    label?: string;
    placeholder?: string;
    defaultValue?: any;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
}

function NumberInput({
    margin,
    isRequired,
    label,
    formikField,
    readonly,
    placeholder,
    defaultValue,
    prefix,
    suffix,
    min,
    max,
    step,
}: NumberInputProps) {
    const hasEmptyPlaceholder = placeholder === "-";

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
                    {({ field }: { field: any }) => {
                        const getFieldName = field.name.replace(/\[\d+\]/g, "");
                        const dynamicRegex = employeeOnBardingFormRegexes[getFieldName] || /.*/;

                        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                            const { value } = e.target;                            
                            // Allow empty value or value matching regex (if any)
                            if (!value || dynamicRegex.test(value)) {
                                field.onChange(e);
                            }
                        };

                        return (
                            <input
                                {...field}
                                type="number"
                                min={min}
                                max={max}
                                step={step}
                                className={`employee__form_wizard__input form-control ${
                                    hasEmptyPlaceholder ? "text-center" : ""
                                }`}
                                placeholder={label || placeholder}
                                readOnly={readonly || hasEmptyPlaceholder}
                                defaultValue={defaultValue}
                                onChange={handleChange}
                            />
                        );
                    }}
                </Field>

                {suffix && (
                    <span className="input-group-text">{suffix}</span>
                )}
            </div>

            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </div>
    );
}

export default NumberInput;