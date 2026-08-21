import { Box } from "@mui/material";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { WtSelect } from "@app/modules/common/components/ui/WtSelect";
import { useMemo } from "react";
import { sortOptionsAlphabetically } from "@utils/sortUtils";

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string;
    options: any;
    formikField: string;
    placeholder?: string;
    handleChange?: (option: any) => void;
    value:any,
}

function ReimbursementDropdown({ formikField, inputLabel, options, isRequired, placeholder, handleChange, value }: DropDownInputProps) {
    const formatOptionLabel = ({ value, label, icon }: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {icon && <Box component="img" src={icon} alt="" sx={{ width: 20, height: 20 }} />}
            {label}
        </Box>
    );

    const sortedOptions = useMemo(() => {
        return sortOptionsAlphabetically(options || []);
    }, [options]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* Asterisk explicit — Metronic's `.required::after` goes with the Bootstrap class. */}
            <Box component="label" sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, mb: 1,
                fontSize: 13.5, fontWeight: 500, color: 'text.primary',
            }}>
                {inputLabel}
                {isRequired && <Box component="span" aria-hidden sx={{ color: 'error.main' }}>*</Box>}
            </Box>
            <WtSelect
                name={formikField}
                options={sortedOptions}
                onChange={handleChange}
                placeholder={placeholder}
                isClearable
                value={value}
                formatOptionLabel={formatOptionLabel}
                // Reimbursement type names are long and wordy; the list is short, so
                // wrapping beats ellipsising here.
                allowOptionWrap
            />
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
        </Box>
    );
}

export default ReimbursementDropdown;
