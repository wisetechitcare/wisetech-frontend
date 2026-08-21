import { Field, useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import  Select  from "react-select"
import { useMemo } from "react";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import { FLOATING_MENU_BEHAVIOUR, MENU_PORTAL_STYLE } from "./selectMenuProps";

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

    const customStyles = {
        option: (provided: any) => ({
            ...provided,
            whiteSpace: 'normal',
            lineHeight: '1.4',
            height: 'auto',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
        }),
    };

    return (
        <div className="d-flex flex-column fv-row">
            <label className={`form-label ${isRequired ? 'required' : ''}`}>{inputLabel}</label>
            {/* Behaviour-only spread: this call site passes its own `styles`, so the portal
                z-index is merged in rather than spreading FLOATING_MENU_PROPS, which would
                drop one or the other depending on prop order. See selectMenuProps.ts. */}
            <Select
                {...FLOATING_MENU_BEHAVIOUR}
                name={formikField}
                options={sortedOptions}
                onChange={handleChange}
                placeholder={placeholder}
                isClearable
                classNamePrefix="react-select"
                className="react-select-styled"
                value={value}
                formatOptionLabel={formatOptionLabel}
                styles={{ ...customStyles, ...MENU_PORTAL_STYLE }}
            />
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </div>
    );
}

export default ReimbursementDropdown;
