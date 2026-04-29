import { Field, useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import Select, { components } from "react-select";
import { useState } from "react";
import CommonModal from "../components/CommonModal";

interface FormikDropdownInputProps {
    isRequired: boolean;
    inputLabel: string;
    options: Array<{
        value: string;
        label: string;
        color?: string;  // Color for the status circle
    }>;
    formikField: string;
    placeholder?: string;
    showAddBtn?: boolean;
    functionToCallOnModalSubmit?: any;
    fieldName?: string;
    functionToSetFieldOptions?: any;
    onChange?: (option: any) => void;
    value?: any;
    disabled?: boolean;
    defaultValue?: any;
    width?: string;  // Custom width for the dropdown
    defaultStatusColor?: string;  // Default color for status circles
    statusCircleSize?: number;  // Size of the status circle in pixels
}

// Custom components for the dropdown
const DropdownIndicator = (props: any) => {
    return (
        <components.DropdownIndicator {...props}>
            <i 
                className={`fas fa-chevron-${props.selectProps.menuIsOpen ? 'up' : 'down'}`}
                style={{ 
                    color: '#3F4254',
                    fontSize: '1rem'
                }}
            />
        </components.DropdownIndicator>
    );
};

// Custom option with status circle
const Option = ({ data, isSelected, statusCircleSize, defaultStatusColor, ...props }: any) => {
    return (
        <components.Option isSelected={isSelected} {...props}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: `${statusCircleSize}px`,
                    height: `${statusCircleSize}px`,
                    borderRadius: '50%',
                    backgroundColor: data.color || defaultStatusColor,
                    flexShrink: 0
                }} />
                {data.label}
            </div>
        </components.Option>
    );
};

// Custom value container with status circle
const SingleValue = ({ data, statusCircleSize, defaultStatusColor, ...props }: any) => {
    return (
        <components.SingleValue {...props}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    width: `${statusCircleSize}px`,
                    height: `${statusCircleSize}px`,
                    borderRadius: '50%',
                    backgroundColor: data.color || defaultStatusColor,
                    flexShrink: 0
                }} />
                {data.label}
            </div>
        </components.SingleValue>
    );
};

function FormikDropdownInput({ 
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
    defaultValue,
    width = '100%',
    defaultStatusColor = '#FFB700',
    statusCircleSize = 8,
}: FormikDropdownInputProps) {
    const [field, , helpers] = useField(formikField);
    const [show, setShow] = useState(false);
    
    const handleChange = (selectedOption: any) => {
        if (propOnChange) {
            propOnChange(selectedOption);
        } else {
            helpers.setValue(selectedOption?.value || "");
        }
    };
    
    const handleShow = () => setShow(true);
    
    let selectedValue;
    if(defaultValue?.length){
        selectedValue = defaultValue[0];
    }

    selectedValue = propValue !== undefined 
        ? propValue 
        : (options ? options.find((option: any) => option.value === field.value) : null);
    
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
                options={options}
                onChange={handleChange}
                placeholder={placeholder}
                isClearable
                classNamePrefix={"react-select"}
                className='react-select-styled'
                value={selectedValue}
                isDisabled={disabled}
                defaultInputValue={defaultValue}
                components={{
                    DropdownIndicator,
                    Option: (props) => (
                        <Option 
                            {...props} 
                            statusCircleSize={statusCircleSize}
                            defaultStatusColor={defaultStatusColor}
                        />
                    ),
                    SingleValue: (props) => (
                        <SingleValue 
                            {...props} 
                            statusCircleSize={statusCircleSize}
                            defaultStatusColor={defaultStatusColor}
                        />
                    )
                }}
                styles={{
                    control: (base) => ({
                        ...base,
                        border: '1px solid #E1E3EA',
                        borderRadius: '8px',
                        minHeight: '42px',
                        width: width,
                        boxShadow: 'none',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        '&:hover': {
                            border: '1px solid #B5B5C3'
                        }
                    }),
                    menu: (base) => ({
                        ...base,
                        borderRadius: '8px',
                        border: '1px solid #E1E3EA',
                        boxShadow: '0px 0px 50px 0px rgba(82, 63, 105, 0.15)',
                        overflow: 'hidden',
                        backgroundColor: 'white'
                    }),
                    option: (base, state) => ({
                        ...base,
                        padding: '10px 16px',
                        backgroundColor: state.isSelected ? '#F5F8FA' : 'white',
                        color: '#3F4254',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: '#F5F8FA'
                        }
                    }),
                    singleValue: (base) => ({
                        ...base,
                        color: '#3F4254'
                    }),
                    placeholder: (base) => ({
                        ...base,
                        color: '#B5B5C3'
                    }),
                    indicatorSeparator: () => ({
                        display: 'none'
                    }),
                    dropdownIndicator: (base) => ({
                        ...base,
                        padding: '8px 8px',
                        color: '#B5B5C3',
                        '&:hover': {
                            color: '#7E8299'
                        }
                    })
                }}
            />
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
            <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </>
    )
}

export default FormikDropdownInput;