import { Field, useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import  Select  from "react-select"

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string;
    options: any;
    formikField: string;
    placeholder?: string;
    handleChange?: (option: any) => void;
    value:any,
}

function ReimbursementDropdown({ formikField, inputLabel, options, isRequired, placeholder, handleChange, value }: DropDownInputProps) {
    const formatOptionLabel = ({ value, label, icon }: any) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {icon && <img src={icon} alt="" style={{ width: '20px', height: '20px', marginRight: '10px' }} />}
            {label}
        </div>
    );

    return (
        <>
            <label className={`form-label ${isRequired ? 'required' : ''}`}>{inputLabel}</label>
            <Select
                name={formikField}
                options={options}
                onChange={handleChange}
                placeholder={placeholder}
                isClearable
                classNamePrefix="react-select"
                className="react-select-styled"
                value={value}
                formatOptionLabel={formatOptionLabel}
            />
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </>
    );
}

export default ReimbursementDropdown;