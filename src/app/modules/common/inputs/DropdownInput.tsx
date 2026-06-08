import { Field, useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import  Select  from "react-select";
import { useState, useMemo } from "react";
import CommonModal from "../components/CommonModal";
import { ColourOption, SingleValue, DropdownIndicator } from "./ColorInDropdwon";

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string;
    options: any;
    formikField: string;
    placeholder?: string;
    showAddBtn?: boolean;
    functionToCallOnModalSubmit?: any;
    fieldName?: string;
    functionToSetFieldOptions?: any;
    onChange?: (option: any) => void;
    value?: any;
    disabled?: boolean;
    showColor?: boolean;
    defaultValue?: any;
    filterOption?: (option: any, inputValue: any) => boolean; // Added: Support for custom filtering
    enableSmartSort?: boolean; // Added: Enable smart priority-based sorting
    smartFilterFunction?: (options: any[], inputValue: string) => any[]; // Added: Smart filter and sort function
}

function DropDownInput({ 
    formikField, 
    inputLabel, 
    options, 
    isRequired, 
    placeholder, 
    showAddBtn = false, 
    functionToCallOnModalSubmit, 
    fieldName, 
    functionToSetFieldOptions,
    onChange: propOnChange,
    value: propValue,
    disabled = false,
    showColor = false,
    defaultValue,
    filterOption, // Added: Custom filter function
    enableSmartSort = false, // Added: Smart sorting flag
    smartFilterFunction, // Added: Smart filter and sort function
}: DropDownInputProps) {
    const [field, , helpers] = useField(formikField);
    const [show, setShow] = useState(false);
    const [inputValue, setInputValue] = useState('');
    
    const handleChange = (selectedOption: any) => {
        // console.log("handleChange called with:", selectedOption);
        if (propOnChange) {
            propOnChange(selectedOption);
        } else {
            helpers.setValue(selectedOption?.value || "");
        }
    };
    
    const handleShow = () => setShow(true);

    // Smart filtering and sorting of options
    const processedOptions = useMemo(() => {
        if (enableSmartSort && smartFilterFunction && inputValue.trim()) {
            return smartFilterFunction(options || [], inputValue);
        }
        return options || [];
    }, [enableSmartSort, smartFilterFunction, options, inputValue]);

    // Use propValue if provided, otherwise use formik field value
    let selectedValue;


    if(defaultValue?.length){
        selectedValue = defaultValue[0];
    }

    selectedValue = propValue !== undefined
        ? propValue
        : (options ? options.find((option: any) => option.value === field.value) : null);


    // console.log("options:", options);
    // console.log("field.value:", field.value);
    // console.log("propValue:", propValue);
    // console.log("selectedValue passed to <Select />:", selectedValue);
    selectedValue =
  propValue !== undefined
    ? (typeof propValue === "object"
        ? propValue
        : options.find((option: any) => option.value === propValue)
      )
    : options.find((option: any) => option.value === field.value) || null;

    // Custom styles for react-select with color support
    const getCustomStyles = (selectedColor: string) => ({
        control: (provided: any, state: any) => ({
            ...provided,
            borderColor: selectedColor ? `${selectedColor} !important` : provided.borderColor,
            borderWidth: selectedColor ? '1px !important' : provided.borderWidth,
            backgroundColor: selectedColor ? `color-mix(in srgb, ${selectedColor} 15%, white) !important` : provided.backgroundColor,
            boxShadow: state.isFocused
            ? `0 0 0 1px ${selectedColor || '#9D4141'}`
            : provided.boxShadow,
        }),

        indicatorSeparator: (provided: any) => ({
            ...provided,
            backgroundColor: selectedColor ? `color-mix(in srgb, ${selectedColor} 30%, transparent)` : provided.backgroundColor,
        }),
        singleValue: (provided: any) => ({
            ...provided,
            color: selectedColor ? selectedColor : provided.color,
            fontWeight: provided.fontWeight,
        }),
        placeholder: (provided: any) => ({
            ...provided,
        }),
        clearIndicator: (provided: any) => ({
            ...provided,
            color: selectedColor ? '#000000' : provided.color,
            '&:hover': {
                color: selectedColor ? '#000000' : provided.color,
            }
        }),
        dropdownIndicator: (provided: any) => ({
            ...provided,
            color: selectedColor ? selectedColor : provided.color,
            '&:hover': {
                color: selectedColor ? selectedColor : provided.color,
            }
        }),
        // Visually distinguish inactive (disabled) options
        option: (provided: any, state: any) => ({
            ...provided,
            opacity: state.isDisabled ? 0.45 : 1,
            // fontStyle: state.isDisabled ? 'italic' : provided.fontStyle,
            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
            color: state.isDisabled ? '#999' : provided.color,
        }),
    });

    
    return (
        <>
            <div className="d-flex flex-row justify-content-between">
                <label className={`form-label ${isRequired ? 'required' : ''}`}>{inputLabel}</label>
                {showAddBtn && <button className="btn btn-sm btn-outline-dark border-dark"
                onClick={(e)=>{e.preventDefault(); handleShow();}}
                >+ Add</button>}
            </div>
        <Select
            name={formikField}
            options={enableSmartSort ? processedOptions : options}
            onChange={handleChange}
            onInputChange={(newInputValue) => {
                if (enableSmartSort) {
                    setInputValue(newInputValue);
                }
            }}
            placeholder={placeholder}
            isClearable
            isSearchable={true} // Added: Ensure searchable is enabled
            classNamePrefix="react-select"
            className="react-select-styled"
            value={selectedValue}
            isDisabled={disabled}
            components={showColor ? {
                Option: ColourOption,
                SingleValue,
                DropdownIndicator
            } : undefined}
            styles={showColor ? getCustomStyles(selectedValue?.color) : undefined}
            defaultInputValue={defaultValue}
            filterOption={enableSmartSort ? null : filterOption} // Disable built-in filtering when using smart sort
        />

            <HighlightErrors isRequired={isRequired} formikField={formikField} />
            <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </>
    )
}


export default DropDownInput;