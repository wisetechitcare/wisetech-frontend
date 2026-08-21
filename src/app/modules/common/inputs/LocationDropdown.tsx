import { useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { WtSelect } from "@app/modules/common/components/ui/WtSelect";
import { useState, useMemo } from "react";
import { Box } from "@mui/material";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import CommonModal from "../components/CommonModal";
import DropdownChevron from "./DropdownChevron";

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

    const sortedOptions = useMemo(() => {
        return sortOptionsAlphabetically(options || []);
    }, [options]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
     <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            {/* Asterisk rendered explicitly — it came from Metronic's `.required::after`,
                which disappears with the Bootstrap class. */}
            <Box component="label" sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, mb: 0,
                fontSize: 13.5, fontWeight: 500, color: 'text.primary',
            }}>
                {inputLabel}
                {isRequired && <Box component="span" aria-hidden sx={{ color: 'error.main' }}>*</Box>}
            </Box>
            {showAddBtn && (
                <Box component="button" type="button"
                    onClick={(e: React.MouseEvent) => { e.preventDefault(); handleShow(); }}
                    sx={{
                        flexShrink: 0, border: 0, background: 'none', p: 0,
                        fontSize: 12, fontWeight: 600, lineHeight: 1.2,
                        color: 'primary.main', cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                    }}
                >+ Add</Box>
            )}
        </Box>
            <WtSelect
                name={formikField}
                isDisabled={isDisabled}
                options={sortedOptions}
                onChange={handleChange}
                placeholder={placeholder}
                value={value}
                components={{ DropdownIndicator: DropdownChevron }}
                // Prefix match, not substring: country/state lists are long and
                // alphabetical, so typing "in" should reach India rather than every
                // name that merely contains "in".
                filterOption={(option: any, inputValue: string) => {
                    if (!inputValue) return true;
                    return String(option.label).toLowerCase().startsWith(inputValue.toLowerCase());
                }}
            />
            
            <HighlightErrors isRequired={isRequired} formikField={formikField} />
             <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </Box>
    )
}

export default LocationDropdown;