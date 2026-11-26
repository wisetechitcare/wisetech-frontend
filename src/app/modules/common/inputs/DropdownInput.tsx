/**
 * Formik single-select on the kit Combobox (src/ds/ui/combobox). Owns only the Formik binding,
 * the label row, "+ Add" → CommonModal, and the colour / avatar option rows.
 */
import { useField, useFormikContext, type FormikValues } from "formik";
import HighlightErrors from "../../errors/components/HighlightErrors";
import React, { useState, useMemo } from "react";
import { Box } from "@mui/material";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import CommonModal from "../components/CommonModal";
import { WtAddOptionButton } from "@app/modules/common/components/ui/WtAddOption";
import { useUnsavedChangesRegistration } from "../components/ui/UnsavedChangesProvider";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/ds/ui/combobox";
import { InputGroupAddon } from "@/ds/ui/input-group";
import { PersonCell } from "@/ds/patterns/person";

// ponytail: rendering is capped instead of windowed (react-select virtualised past 80); typing narrows
// the list. Raise the cap or add windowing if users need to scroll through thousands.
const RENDER_LIMIT = 200;

type Option = { value: any; label: any; color?: string; avatar?: string | null };

interface DropDownInputProps {
    isRequired: boolean;
    inputLabel: string | React.ReactNode;
    options: any;
    /**
     * Formik field this writes to. Pass `''` for a FILTER-ONLY dropdown: one that
     * narrows another control but is not part of the record, so the key never rides
     * along into the submitted payload.
     */
    formikField: string;
    placeholder?: string;
    showAddBtn?: boolean;
    /**
     * "+ Add" in the label row that runs the CALLER's create flow (its own modal) instead of the built-in one. Keeps
     * the action in the label row, so a field with it lines up with one without — a link under the field does not.
     */
    onAddClick?: () => void;
    functionToCallOnModalSubmit?: any;
    fieldName?: string;
    functionToSetFieldOptions?: any;
    onChange?: (option: any) => void;
    value?: any;
    disabled?: boolean;
    showColor?: boolean;
    /** Render each option with its avatar (`option.avatar`, else initials). */
    showAvatar?: boolean;
    defaultValue?: any;
    /** react-select signature: `(option{label,value,data}, inputValue) => boolean`. */
    filterOption?: (option: any, inputValue: any) => boolean;
    enableSmartSort?: boolean;
    smartFilterFunction?: (options: any[], inputValue: string) => any[];
    disableAlphabeticalSort?: boolean;
}

const labelText = (o: Option | null) => (o == null ? "" : typeof o.label === "string" ? o.label : String(o.label ?? ""));

function ColorDot({ color }: { color?: string }) {
    return <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: color || "var(--muted-foreground)" }} />;
}

function DropDownInput({
    formikField,
    inputLabel,
    options,
    isRequired,
    placeholder,
    showAddBtn = false,
    onAddClick,
    functionToCallOnModalSubmit,
    fieldName,
    functionToSetFieldOptions,
    onChange: propOnChange,
    value: propValue,
    disabled = false,
    showColor = false,
    showAvatar = false,
    filterOption,
    enableSmartSort = false,
    smartFilterFunction,
    disableAlphabeticalSort = false,
}: DropDownInputProps) {
    // Filter-only mode: useField still runs (hooks cannot be conditional) against a name nothing
    // reads, and setValue is never called, so Formik's `values` stays clean.
    const isFilterOnly = !formikField;
    const [field, meta, helpers] = useField(formikField || "__filterOnly");
    const { dirty } = useFormikContext<FormikValues>();
    useUnsavedChangesRegistration(dirty && !isFilterOnly);
    const [show, setShow] = useState(false);
    const hasError = !!(meta.touched && meta.error);
    const [inputValue, setInputValue] = useState("");

    const handleChange = (selectedOption: Option | null) => {
        if (isFilterOnly) {
            propOnChange?.(selectedOption);
            return;
        }
        // setValue validates against the values patched with the new selection; setTouched(…, true)
        // would validate the render-time snapshot (old value) and flash "required" on a fresh pick.
        helpers.setValue(selectedOption?.value || "");
        helpers.setTouched(true, false);
        propOnChange?.(selectedOption);
    };

    const items: Option[] = useMemo(() => {
        const base: Option[] = enableSmartSort && smartFilterFunction && inputValue.trim()
            ? smartFilterFunction(options || [], inputValue)
            : options || [];
        return disableAlphabeticalSort ? base : sortOptionsAlphabetically(base);
    }, [enableSmartSort, smartFilterFunction, options, inputValue, disableAlphabeticalSort]);

    const selected: Option | null =
        propValue !== undefined
            ? typeof propValue === "object"
                ? propValue
                : (options || []).find((o: Option) => o.value === propValue) ?? null
            : (options || []).find((o: Option) => o.value === field.value) ?? null;

    const filter = enableSmartSort
        ? () => true // smartFilterFunction already narrowed `items`
        : filterOption
            ? (o: Option, q: string) => filterOption({ label: o.label, value: o.value, data: o }, q)
            : undefined;

    const ariaLabel = typeof inputLabel === "string" ? inputLabel : undefined;
    const select = (
        <Combobox
            items={items}
            value={selected}
            onValueChange={handleChange}
            onInputValueChange={(v: string) => { if (enableSmartSort) setInputValue(v); }}
            itemToStringLabel={labelText}
            isItemEqualToValue={(a: Option, b: Option) => a?.value === b?.value}
            filter={filter}
            limit={RENDER_LIMIT}
            disabled={disabled}
        >
            <ComboboxInput
                name={formikField || undefined}
                aria-label={ariaLabel}
                aria-invalid={hasError || undefined}
                placeholder={placeholder ?? "Select…"}
                disabled={disabled}
                showClear={!!selected}
                className="w-full"
            >
                {showColor && selected && (
                    <InputGroupAddon align="inline-start"><ColorDot color={selected.color} /></InputGroupAddon>
                )}
            </ComboboxInput>
            <ComboboxContent>
                <ComboboxEmpty>No matches.</ComboboxEmpty>
                <ComboboxList>
                    {(o: Option) => (
                        <ComboboxItem key={String(o.value)} value={o} title={labelText(o)}>
                            {showAvatar ? (
                                <PersonCell name={labelText(o)} avatarUrl={o.avatar ?? undefined} />
                            ) : (
                                <>
                                    {showColor && <ColorDot color={o.color} />}
                                    <span className="truncate">{o.label}</span>
                                </>
                            )}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );

    return (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
            {/* The label row's height must not depend on "+ Add", or paired columns stop lining up. */}
            <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1, minHeight: 22 }}>
                <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0, fontSize: 13.5, fontWeight: 500, color: "text.primary" }}>
                    {inputLabel}
                    {isRequired && <Box component="span" aria-hidden sx={{ color: "error.main" }}>*</Box>}
                </Box>
                {onAddClick
                    ? <WtAddOptionButton label="Add" onAdd={onAddClick} disabled={disabled} />
                    : showAddBtn && <WtAddOptionButton label="Add" onAdd={() => setShow(true)} disabled={disabled} />}
            </Box>
            {select}

            {!isFilterOnly && <HighlightErrors isRequired={isRequired} formikField={formikField} />}
            <CommonModal functionToCallOnModalSubmit={functionToCallOnModalSubmit} show={show} setShow={setShow} fieldName={fieldName} functionToSetFieldOptions={functionToSetFieldOptions} />
        </Box>
    );
}

export default DropDownInput;
