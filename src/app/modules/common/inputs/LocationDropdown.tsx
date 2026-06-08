import { useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import Select from "react-select";
import { useState } from "react";
import CommonModal from "../components/CommonModal";

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

    return (
        <>
     <div className="d-flex flex-row justify-content-between">
            <label className={`form-label ${isRequired ? 'required' : ''}`}>{inputLabel}</label>
            {showAddBtn && <button className="btn btn-sm border-dark"
            onClick={(e)=>{e.preventDefault(); handleShow();}}
            >+ Add</button>}
        </div>
            <Select
                name={formikField}
                isDisabled={isDisabled}
                options={options}
                onChange={handleChange}
                placeholder={placeholder}
                classNamePrefix={"react-select"}
                className='react-select-styled'
                value={value}
                filterOption={(option, inputValue) => {
                  if (!inputValue) return true;
                  return option.label.toLowerCase().startsWith(inputValue.toLowerCase());
                }}
            />
            
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
             <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </>
    )
}

export default LocationDropdown;