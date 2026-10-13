import React, { useState, useMemo } from 'react';
import { useField } from 'formik';
import { sortOptionsAlphabetically } from '@utils/sortUtils';
import CommonModal from '../components/CommonModal';
import DropdownChevron from './DropdownChevron';
import { WtField, WtSelect } from '@app/modules/common/components/ui';

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

/**
 * Location (country/state) Formik select — WtField frame + WtSelect with prefix filter.
 * Prefer WtFieldFormik when prefix-match is not required.
 * “+ Add” uses the kit `addOption` prop (`placement: 'label'`).
 */
const LocationDropdown = ({
    formikField,
    inputLabel,
    options,
    isRequired,
    placeholder,
    showAddBtn = false,
    functionToCallOnModalSubmit,
    fieldName,
    functionToSetFieldOptions,
    isDisabled = false,
    handleChange,
    value,
}: LocationDropdownProps) => {
    const [, meta] = useField(formikField);
    const [show, setShow] = useState(false);
    const hasError = !!(meta.touched && meta.error);
    const errorMessage = hasError ? String(meta.error) : undefined;

    const sortedOptions = useMemo(
        () => sortOptionsAlphabetically(options || []),
        [options],
    );

    return (
        <>
            <WtField
                label={inputLabel}
                required={isRequired}
                error={errorMessage}
                disabled={isDisabled}
                addOption={showAddBtn ? { onAdd: () => setShow(true), label: 'Add', placement: 'label' } : undefined}
            >
                <WtSelect
                    name={formikField}
                    ariaLabel={inputLabel}
                    isDisabled={isDisabled}
                    options={sortedOptions}
                    onChange={handleChange}
                    placeholder={placeholder}
                    value={value}
                    error={hasError}
                    components={{ DropdownIndicator: DropdownChevron }}
                    filterOption={(option: any, inputValue: string) => {
                        if (!inputValue) return true;
                        return String(option.label)
                            .toLowerCase()
                            .startsWith(inputValue.toLowerCase());
                    }}
                />
            </WtField>
            <CommonModal
                functionToCallOnModalSubmit={functionToCallOnModalSubmit}
                show={show}
                setShow={setShow}
                fieldName={fieldName}
                functionToSetFieldOptions={functionToSetFieldOptions}
            />
        </>
    );
};

export default LocationDropdown;
