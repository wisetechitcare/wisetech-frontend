import { Field, useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import  Select  from "react-select"
import { useMemo } from "react";
import { sortOptionsAlphabetically } from "@utils/sortUtils";

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

    const sortedOptions = useMemo(() => {
        return sortOptionsAlphabetically(options || []);
    }, [options]);

    return (
        <div className="d-flex flex-column fv-row">
            <label className={`form-label ${isRequired ? 'required' : ''}`}>{inputLabel}</label>
            <Select
                name={formikField}
                options={sortedOptions}
                onChange={handleChange}
                placeholder={placeholder}
                isClearable
                classNamePrefix="react-select"
                className="react-select-styled"
                value={value}
                formatOptionLabel={formatOptionLabel}
            />
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </div>
    );
}

export default ReimbursementDropdown;