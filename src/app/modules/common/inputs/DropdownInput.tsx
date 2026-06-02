import { useMemo, useState } from "react";
import Select from "react-select";
import { useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import CommonModal from "../components/CommonModal";
import { ColourOption, DropdownIndicator, SingleValue } from "./ColorInDropdwon";

interface DropDownInputProps {
  inputLabel: string;
  isRequired?: boolean;
  options: any[];
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
  filterOption?: (option: any, inputValue: string) => boolean;
  enableSmartSort?: boolean;
  smartFilterFunction?: (options: any[], inputValue: string) => any[];
}

function DropDownInput({
  formikField,
  inputLabel,
  options = [],
  isRequired = false,
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
  filterOption,
  enableSmartSort = false,
  smartFilterFunction,
}: DropDownInputProps) {
  const [field, , helpers] = useField(formikField);
  const [show, setShow] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const processedOptions = useMemo(() => {
    if (enableSmartSort && smartFilterFunction && inputValue.trim()) {
      return smartFilterFunction(options, inputValue);
    }
    return options;
  }, [enableSmartSort, smartFilterFunction, options, inputValue]);

  const selectedValue = useMemo(() => {
    if (defaultValue?.length) return defaultValue[0];
    if (propValue !== undefined) {
      return typeof propValue === "object"
        ? propValue
        : options.find((option: any) => option.value === propValue) || null;
    }
    return options.find((option: any) => option.value === field.value) || null;
  }, [defaultValue, field.value, options, propValue]);

  const handleChange = (selectedOption: any) => {
    if (propOnChange) {
      propOnChange(selectedOption);
      return;
    }
    helpers.setValue(selectedOption?.value || "");
  };

  const getCustomStyles = (selectedColor?: string) => ({
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: selectedColor ? `${selectedColor} !important` : provided.borderColor,
      borderWidth: selectedColor ? "1px !important" : provided.borderWidth,
      backgroundColor: selectedColor
        ? `color-mix(in srgb, ${selectedColor} 15%, white) !important`
        : provided.backgroundColor,
      boxShadow: state.isFocused ? `0 0 0 1px ${selectedColor || "#9D4141"}` : provided.boxShadow,
    }),
    indicatorSeparator: (provided: any) => ({
      ...provided,
      backgroundColor: selectedColor
        ? `color-mix(in srgb, ${selectedColor} 30%, transparent)`
        : provided.backgroundColor,
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: selectedColor || provided.color,
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      color: selectedColor ? "#000000" : provided.color,
      "&:hover": {
        color: selectedColor ? "#000000" : provided.color,
      },
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: selectedColor || provided.color,
      "&:hover": {
        color: selectedColor || provided.color,
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      opacity: state.isDisabled ? 0.45 : 1,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      color: state.isDisabled ? "#999" : provided.color,
    }),
  });

  return (
    <>
      <div className="d-flex flex-row justify-content-between">
        <label className={`form-label ${isRequired ? "required" : ""}`}>{inputLabel}</label>
        {showAddBtn && (
          <button
            className="btn btn-sm btn-outline-dark border-dark"
            onClick={(event) => {
              event.preventDefault();
              setShow(true);
            }}
          >
            + Add
          </button>
        )}
      </div>

      <Select
        name={formikField}
        options={enableSmartSort ? processedOptions : options}
        onChange={handleChange}
        onInputChange={(newInputValue) => {
          if (enableSmartSort) setInputValue(newInputValue);
        }}
        placeholder={placeholder}
        isClearable
        isSearchable
        classNamePrefix="react-select"
        className="react-select-styled"
        value={selectedValue}
        isDisabled={disabled}
        components={showColor ? { Option: ColourOption, SingleValue, DropdownIndicator } : undefined}
        styles={showColor ? getCustomStyles(selectedValue?.color) : undefined}
        defaultInputValue={defaultValue}
        filterOption={enableSmartSort ? null : filterOption}
      />

      <HighlightErrors isRequired={isRequired} formikField={formikField} />
      <CommonModal
        functionToCallOnModalSubmit={functionToCallOnModalSubmit}
        show={show}
        setShow={setShow}
        fieldName={fieldName}
        functionToSetFieldOptions={functionToSetFieldOptions}
      />
    </>
  );
}

export default DropDownInput;
