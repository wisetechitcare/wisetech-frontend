import { useField } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { components as RSComponents } from "react-select";
import React, { useState, useMemo } from "react";
import { Box } from "@mui/material";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import CommonModal from "../components/CommonModal";
import { ColourOption, SingleValue, AvatarOption, AvatarSingleValue } from "./ColorInDropdwon";
import DropdownChevron from "./DropdownChevron";
// The kit's select engine — one place owns menu behaviour, theming and a11y.
import { WtSelect } from "@app/modules/common/components/ui/WtSelect";

// Plain react-select renders EVERY option to the DOM, so menus with thousands of
// options (e.g. the full contacts list) are slow to open and scroll. For large lists
// we swap in a windowed MenuList that only renders the visible rows. Small lists keep
// the default rendering so nothing changes for the rest of the app.
const VIRTUALIZE_THRESHOLD = 80;
// Windowing now lives in the kit engine (WtSelect). This threshold is still ours to
// choose per call site, so it is passed through rather than hardcoded there.

/**
 * The option row is clamped to one line, so a long label is ellipsised. Carry the full
 * text in `title` — otherwise the truncated part is simply unreadable, and for project
 * names the part that gets cut is the end, which is where the status sits.
 */
function TitledOption(props: any) {
    return (
        <RSComponents.Option
            {...props}
            innerProps={{
                ...props.innerProps,
                title: typeof props.label === 'string' ? props.label : undefined,
            }}
        />
    );
}

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string | React.ReactNode;
    options: any;
    /**
     * Formik field this writes to. Pass `''` for a FILTER-ONLY dropdown: one that
     * narrows another control but is not part of the record. Without that escape
     * hatch the only way to reuse this component as a filter was to give it a real
     * field name, which then rode along into the submitted payload.
     */
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
    disableAlphabeticalSort?: boolean;
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
    disableAlphabeticalSort = false,
}: DropDownInputProps) {
    // Filter-only mode. useField still runs (hooks cannot be conditional) but against a
    // name nothing reads, and setValue is never called — so Formik's `values` stays clean
    // and the key cannot leak into a submitted payload.
    const isFilterOnly = !formikField;
    const [field, meta, helpers] = useField(formikField || '__filterOnly');
    const [show, setShow] = useState(false);
    const hasError = !!(meta.touched && meta.error);
    const [inputValue, setInputValue] = useState('');
    
    const handleChange = (selectedOption: any) => {
        if (isFilterOnly) {
            propOnChange?.(selectedOption);
            return;
        }
        // `setValue` validates against the values PATCHED with the new selection, so it
        // is the only one of the two that can see what was just chosen.
        helpers.setValue(selectedOption?.value || "");
        // `setTouched(true, true)` used to re-validate here, and Formik's setTouched
        // validates `state.values` — the render-time snapshot, which in this same tick
        // still holds the OLD value. So picking a branch marked the field touched and
        // then evaluated the form as if it were still empty: "Branch is a required
        // field" appeared the instant a branch was chosen, and only cleared on the next
        // interaction, which in turn stamped the same stale error on whatever field was
        // touched next. Mark it touched and let the setValue pass above own validation.
        helpers.setTouched(true, false);
        if (propOnChange) {
            propOnChange(selectedOption);
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
        if (disableAlphabeticalSort) {
            return options || [];
        }
        const listToSort = enableSmartSort ? processedOptions : (options || []);
        return sortOptionsAlphabetically(listToSort);
    }, [disableAlphabeticalSort, enableSmartSort, processedOptions, options]);

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


    const DropdownIndicator = (indicatorProps: any) => (
        <DropdownChevron {...indicatorProps} color={showColor ? selectedValue?.color : undefined} />
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* The label row's height must NOT depend on whether the add button is
                present. As a `btn btn-sm` it stood ~10px taller than a bare label, so a
                dropdown offering "+ Add" pushed its own field below the one beside it
                and the two columns no longer lined up. Sized to the label's own line
                box instead, it costs the row no extra height. */}
            <Box sx={{
                display: 'flex', flexDirection: 'row',
                justifyContent: 'space-between', alignItems: 'center',
                gap: 1, mb: 1,
            }}>
                {/* The asterisk used to be painted by Metronic's `.required::after`.
                    Rendered explicitly now the Bootstrap class is gone, and aria-hidden —
                    requiredness reaches assistive tech through validation, not a glyph. */}
                <Box component="label" sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5, mb: 0,
                    fontSize: 13.5, fontWeight: 500, color: 'text.primary',
                }}>
                    {inputLabel}
                    {isRequired && <Box component="span" aria-hidden sx={{ color: 'error.main' }}>*</Box>}
                </Box>
                {showAddBtn && (
                    <Box
                        component="button"
                        type="button"
                        onClick={(e: React.MouseEvent) => { e.preventDefault(); handleShow(); }}
                        sx={{
                            flexShrink: 0,
                            border: 0,
                            background: 'none',
                            p: 0,
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1.2,
                            color: 'primary.main',
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        + Add
                    </Box>
                )}
            </Box>
            {/* Delegates to the kit engine: portal, auto-flip, bounded + windowed menu,
                theme tokens and ARIA live there. This wrapper keeps only what is genuinely
                its own — the Formik binding, the label row, "+ Add", and the option
                renderers this app already uses (colour dot / avatar / titled row). */}
            <WtSelect
                name={formikField}
                options={sortedOptions}
                value={selectedValue ?? null}
                onChange={handleChange}
                onInputChange={(v: string) => { if (enableSmartSort) setInputValue(v); }}
                defaultInputValue={defaultValue}
                placeholder={placeholder}
                isClearable
                isDisabled={disabled}
                error={hasError}
                accentColor={showColor ? selectedValue?.color : undefined}
                virtualizeThreshold={VIRTUALIZE_THRESHOLD}
                filterOption={enableSmartSort ? null : filterOption}
                components={{
                    DropdownIndicator,
                    ...(!showColor && !showAvatar ? { Option: TitledOption } : {}),
                    ...(showColor ? { Option: ColourOption, SingleValue } : {}),
                    ...(showAvatar ? { Option: AvatarOption, SingleValue: AvatarSingleValue } : {}),
                }}
            />

            {!isFilterOnly && <HighlightErrors isRequired={isRequired} formikField={formikField} />}
            <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions}/>
        </Box>
    )
}


export default DropDownInput;
