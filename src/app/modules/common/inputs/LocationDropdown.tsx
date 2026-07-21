import { useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import Select from "react-select";
import { useState, useMemo } from "react";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import CommonModal from "../components/CommonModal";
import DropdownChevron from "./DropdownChevron";

interface LocationDropdownProps {
    isRequired: boolean;
    isDisabled?: boolean;
    inputLabel: string;
    options: any;
    formikField: string;
    placeholder?: string;
    showAddBtn?: boolean;
    handleChange?: (option: any) => void;
    value: any;
    onInputChange?: (newValue: string) => void;
    functionToCallOnModalSubmit?: any;
    fieldName?: string;
    functionToSetFieldOptions?: any;
}

const LocationDropdown = ({ formikField, inputLabel, options, isRequired, placeholder, showAddBtn = false,functionToCallOnModalSubmit, fieldName, functionToSetFieldOptions,isDisabled = false, handleChange, value }: LocationDropdownProps) => {
    
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);

    const sortedOptions = useMemo(() => {
        return sortOptionsAlphabetically(options || []);
    }, [options]);

    return (
        <div className="d-flex flex-column fv-row">
     <div className="d-flex flex-row justify-content-between align-items-center mb-2">
            <label className={`d-flex align-items-center fs-6 form-label mb-0 ${isRequired ? 'required' : ''}`}>{inputLabel}</label>
            {showAddBtn && <button className="btn btn-sm border-dark"
            onClick={(e)=>{e.preventDefault(); handleShow();}}
            >+ Add</button>}
        </div>
            <Select
                name={formikField}
                isDisabled={isDisabled}
                options={sortedOptions}
                onChange={handleChange}
                placeholder={placeholder}
                classNamePrefix={"react-select"}
                className='react-select-styled'
                value={value}
                // Portal the menu to <body> so it renders above (and escapes the
                // overflow of) any modal/dialog it's used inside.
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
                components={{ DropdownIndicator: DropdownChevron }}
                filterOption={(option, inputValue) => {
                  if (!inputValue) return true;
                  return option.label.toLowerCase().startsWith(inputValue.toLowerCase());
                }}
            />
            
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
             <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </div>
    )
}

export default LocationDropdown;