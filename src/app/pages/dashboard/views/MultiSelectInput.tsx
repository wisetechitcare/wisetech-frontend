import React, { useState, useMemo, useEffect } from 'react';
import { sortOptionsAlphabetically } from '@utils/sortUtils';
import { WtField, WtSelect } from '@app/modules/common/components/ui';

type OptionType = {
    value: string;
    label: string;
    id?: string;
    color?: string;
};

interface MultiSelectInputProps {
    margin?: string;
    isRequired?: boolean;
    label: string;
    formikField: string;
    readonly?: boolean;
    placeholder: string;
    options: any[];
    value: any;
    onChange: (field: string, value: any, shouldValidate?: boolean) => void;
    optionValueKey?: string;
    optionLabelKeys?: string[];
    colorKey?: string;
}

/**
 * Colour-aware multi-select — WtField frame + WtSelect (kit engines only).
 * Prefer MultiSelectWithInlineCreate when “+ Add” / parent create is needed.
 */
function MultiSelectInput({
    isRequired,
    label,
    formikField,
    readonly,
    placeholder,
    options,
    value,
    onChange,
    optionValueKey = 'id',
    optionLabelKeys = ['firstName', 'lastName'],
    colorKey = 'color',
}: MultiSelectInputProps) {
    const [selectedOptions, setSelectedOptions] = useState<OptionType[]>([]);

    const getColorFromPath = (obj: any, path: string) =>
        path.split('.').reduce((current, key) => current?.[key], obj);

    const formattedOptions = useMemo(() => {
        if (!Array.isArray(options)) return [];

        let result: OptionType[];
        if (options.length > 0 && 'label' in options[0] && 'value' in options[0]) {
            result = options;
        } else {
            result = options.map((opt) => {
                const color = getColorFromPath(opt, colorKey) || opt[colorKey];
                return {
                    value: opt[optionValueKey],
                    label: optionLabelKeys.map((k) => opt[k]).join(' '),
                    color,
                    id: opt[optionValueKey],
                };
            });
        }

        return sortOptionsAlphabetically(result);
    }, [options, optionValueKey, optionLabelKeys, colorKey]);

    useEffect(() => {
        if (!Array.isArray(value) || value.length === 0) {
            setSelectedOptions([]);
            return;
        }

        if ('label' in value[0] && 'value' in value[0]) {
            setSelectedOptions(value);
        } else {
            setSelectedOptions(
                value.map((opt: any) => {
                    const color = getColorFromPath(opt, colorKey) || opt[colorKey];
                    return {
                        value: opt[optionValueKey],
                        label: optionLabelKeys.map((k) => opt[k]).join(' '),
                        id: opt[optionValueKey],
                        color,
                    };
                }),
            );
        }
    }, [value, optionValueKey, optionLabelKeys, colorKey]);

    const handleChange = (newValue: OptionType[] | null) => {
        const updatedSelected = [...(newValue || [])].map((item) => ({
            ...item,
            id: item.value,
        }));
        setSelectedOptions(updatedSelected);
        onChange(formikField, updatedSelected);
    };

    return (
        <WtField label={label} required={isRequired} disabled={readonly}>
            <WtSelect
                name={formikField}
                ariaLabel={label}
                isMulti
                options={formattedOptions}
                placeholder={placeholder}
                value={selectedOptions}
                onChange={handleChange}
                isDisabled={readonly}
                optionVariant="colour"
            />
        </WtField>
    );
}

export default MultiSelectInput;
