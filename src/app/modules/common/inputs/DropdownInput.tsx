import { Field, useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import  Select  from "react-select";
import { useState, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import CommonModal from "../components/CommonModal";
import { ColourOption, SingleValue, DropdownIndicator, AvatarOption, AvatarSingleValue } from "./ColorInDropdwon";

// Plain react-select renders EVERY option to the DOM, so menus with thousands of
// options (e.g. the full contacts list) are slow to open and scroll. For large lists
// we swap in a windowed MenuList that only renders the visible rows. Small lists keep
// the default rendering so nothing changes for the rest of the app.
const VIRTUALIZE_THRESHOLD = 80;
const OPTION_ROW_HEIGHT = 40; // fits the avatar/colour option rows (25px icon + padding)

function VirtualizedMenuList(props: any) {
    const { options, children, maxHeight, getValue } = props;
    // react-select passes a single element (e.g. "No options") when there's nothing to list.
    if (!Array.isArray(children)) return children;

    const selected = (getValue && getValue()) || [];
    const selectedIndex = selected.length
        ? options.findIndex((o: any) => o.value === selected[0]?.value)
        : -1;
    const initialOffset = selectedIndex > 0 ? selectedIndex * OPTION_ROW_HEIGHT : 0;
    const height = Math.min(maxHeight, children.length * OPTION_ROW_HEIGHT);

    return (
        <List
            height={height}
            itemCount={children.length}
            itemSize={OPTION_ROW_HEIGHT}
            initialScrollOffset={initialOffset}
            width="100%"
        >
            {({ index, style }: any) => <div style={style}>{children[index]}</div>}
        </List>
    );
}

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string | React.ReactNode;
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
    /** Render each option with a SmartAvatar (real photo, else the same
     *  deterministic gradient + initials the Contacts page uses) instead of
     *  a plain label. Expects each option to carry an `avatar` (image URL). */
    showAvatar?: boolean;
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
    showAvatar = false,
    defaultValue,
    filterOption, // Added: Custom filter function
    enableSmartSort = false, // Added: Smart sorting flag
    smartFilterFunction, // Added: Smart filter and sort function
}: DropDownInputProps) {
    const [field, meta, helpers] = useField(formikField);
    const [show, setShow] = useState(false);
    const hasError = !!(meta.touched && meta.error);
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

    // Centralized case-insensitive alphabetical sorting
    const sortedOptions = useMemo(() => {
        const listToSort = enableSmartSort ? processedOptions : (options || []);
        return sortOptionsAlphabetically(listToSort);
    }, [enableSmartSort, processedOptions, options]);

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
    const getCustomStyles = (selectedColor?: string) => ({
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
        menuPortal: (provided: any) => ({
            ...provided,
            zIndex: 9999,
        }),
        menu: (provided: any) => ({
            ...provided,
            zIndex: 9999,
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
            options={sortedOptions}
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
            className={`react-select-styled ${hasError ? "is-invalid" : ""}`}
            value={selectedValue}
            isDisabled={disabled}
            components={{
                ...(sortedOptions.length > VIRTUALIZE_THRESHOLD ? { MenuList: VirtualizedMenuList } : {}),
                ...(showColor ? {
                    Option: ColourOption,
                    SingleValue,
                    DropdownIndicator,
                } : {}),
                ...(showAvatar ? {
                    Option: AvatarOption,
                    SingleValue: AvatarSingleValue,
                } : {}),
            }}
            styles={getCustomStyles(showColor ? selectedValue?.color : undefined)}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
            defaultInputValue={defaultValue}
            filterOption={enableSmartSort ? null : filterOption} // Disable built-in filtering when using smart sort
        />

            <HighlightErrors isRequired={isRequired} formikField={formikField} />
            <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </>
    )
}


export default DropDownInput;
