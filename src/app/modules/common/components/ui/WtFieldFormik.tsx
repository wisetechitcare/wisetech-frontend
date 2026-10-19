import React, { useMemo } from 'react';
import { useField } from 'formik';
import { sortOptionsAlphabetically } from '@utils/sortUtils';
import { WtField, type WtFieldOption, type WtFieldProps } from './WtField';

export type WtFieldFormikProps = Omit<WtFieldProps, 'value' | 'onChange' | 'error' | 'name' | 'options'> & {
    /** Formik field name. */
    name: string;
    /** Accepts readonly option lists (e.g. shared consts). */
    options?: readonly WtFieldOption[];
    /**
     * Called after Formik is updated with the new string value.
     * Prefer this over inventing a second select — keep dependent resets here.
     */
    onValueChange?: (value: string) => void;
    /** Skip alphabetical sort when options are already ordered (e.g. month lists). */
    disableAlphabeticalSort?: boolean;
};

/**
 * Formik-bound WtField — the default labelled select/text control in Formik forms.
 *
 * Plain single-select and searchable select go here (Sandwich floating-label look).
 * Pass `addOption={{ onAdd, label? }}` for “+ Add …” — same contract as WtField.
 * Avatar / colour / smart-sort / CommonModal still use the legacy DropdownInput adapter.
 * Multi-select → MultiSelectWithInlineCreate.
 */
export function WtFieldFormik({
    name,
    options,
    onValueChange,
    disableAlphabeticalSort = false,
    ...rest
}: WtFieldFormikProps) {
    const [field, meta, helpers] = useField(name);
    const error = meta.touched && meta.error ? String(meta.error) : undefined;

    const sortedOptions = useMemo(() => {
        if (!options) return undefined;
        const list = [...options] as WtFieldOption[];
        if (disableAlphabeticalSort) return list;
        return sortOptionsAlphabetically(list) as WtFieldOption[];
    }, [options, disableAlphabeticalSort]);

    return (
        <WtField
            {...rest}
            name={name}
            options={sortedOptions}
            value={field.value ?? ''}
            error={error}
            onChange={(value) => {
                void helpers.setValue(value);
                void helpers.setTouched(true, false);
                if (typeof value === 'string') onValueChange?.(value);
            }}
        />
    );
}

export default WtFieldFormik;
