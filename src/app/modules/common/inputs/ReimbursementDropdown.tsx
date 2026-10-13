import { useField } from 'formik';
import { useMemo } from 'react';
import { Box } from '@mui/material';
import { sortOptionsAlphabetically } from '@utils/sortUtils';
import { WtField, WtSelect } from '@app/modules/common/components/ui';

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string;
    options: any;
    formikField: string;
    placeholder?: string;
    handleChange?: (option: any) => void;
    value: any;
}

/**
 * Reimbursement type select — WtField frame + WtSelect with icon labels and wrapping.
 */
function ReimbursementDropdown({
    formikField,
    inputLabel,
    options,
    isRequired,
    placeholder,
    handleChange,
    value,
}: DropDownInputProps) {
    const [, meta] = useField(formikField);
    const hasError = !!(meta.touched && meta.error);
    const errorMessage = hasError ? String(meta.error) : undefined;

    const formatOptionLabel = ({ label, icon }: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {icon && <Box component="img" src={icon} alt="" sx={{ width: 20, height: 20 }} />}
            {label}
        </Box>
    );

    const sortedOptions = useMemo(
        () => sortOptionsAlphabetically(options || []),
        [options],
    );

    return (
        <WtField
            label={inputLabel}
            required={isRequired}
            error={errorMessage}
        >
            <WtSelect
                name={formikField}
                ariaLabel={inputLabel}
                options={sortedOptions}
                onChange={handleChange}
                placeholder={placeholder}
                isClearable
                value={value}
                error={hasError}
                formatOptionLabel={formatOptionLabel}
                allowOptionWrap
            />
        </WtField>
    );
}

export default ReimbursementDropdown;
