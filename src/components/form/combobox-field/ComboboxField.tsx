import { useId, useMemo } from "react";
import type { FieldError } from "react-hook-form";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/ds/ui/combobox";
import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import {
  FIELD_CHIP_RADIUS,
  FIELD_CONTROL_RADIUS,
  FIELD_MENU_RADIUS,
  hasFieldError,
  resolveFieldHint,
} from "@/components/form/common";
import { SELECT_EMPTY_MESSAGE, SELECT_LOADING_PLACEHOLDER } from "@/lib/constants/common";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  options: ComboboxOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean | FieldError;
  hint?: string;
  className?: string;
}

const byValue = (a: ComboboxOption, b: ComboboxOption) => a.value === b.value;

/**
 * Common ComboBox — searchable multi-select with chips.
 * Same Field chrome as Input / Select Field. Replaces legacy MultiSelect.
 */
const ComboboxField = ({
  id,
  name,
  label,
  required = false,
  options,
  value = [],
  onChange,
  placeholder = "Select options",
  disabled = false,
  loading = false,
  error,
  hint,
  className,
}: ComboboxFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;
  const labelId = `${controlId}-label`;
  const anchor = useComboboxAnchor();
  const isDisabled = disabled || loading;

  const selectedOptions = useMemo(
    () =>
      value
        .map((selectedValue) => options.find((option) => option.value === selectedValue))
        .filter((option): option is ComboboxOption => !!option),
    [options, value]
  );

  return (
    <Field
      data-invalid={isError || undefined}
      data-disabled={isDisabled || undefined}
      data-filled={selectedOptions.length > 0 ? "true" : undefined}
      className={cn("w-full min-w-0", className)}
    >
      {label && <FieldLabel id={labelId}>{label}</FieldLabel>}

      {required && <span className="sr-only" aria-required="true" />}

      <Combobox
        multiple
        items={options}
        value={selectedOptions}
        onValueChange={(next: ComboboxOption[]) =>
          onChange?.(next.map((option) => option.value))
        }
        itemToStringLabel={(option: ComboboxOption | null) => option?.label ?? ""}
        itemToStringValue={(option: ComboboxOption) => option.value}
        isItemEqualToValue={byValue}
        disabled={isDisabled}
        required={required}
      >
        <ComboboxChips
          ref={anchor}
          aria-invalid={isError || undefined}
          className={cn("min-h-11", FIELD_CONTROL_RADIUS)}
        >
          <ComboboxValue>
            {(values: ComboboxOption[]) => (
              <>
                {values.map((option) => (
                  <ComboboxChip key={option.value} className={FIELD_CHIP_RADIUS}>
                    {option.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={controlId}
                  aria-labelledby={label ? labelId : undefined}
                  placeholder={
                    values.length
                      ? ""
                      : loading
                        ? SELECT_LOADING_PLACEHOLDER
                        : placeholder
                  }
                  disabled={isDisabled}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor} className={FIELD_MENU_RADIUS}>
          <ComboboxEmpty>{SELECT_EMPTY_MESSAGE}</ComboboxEmpty>
          <ComboboxList>
            {(option: ComboboxOption) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {resolvedHint &&
        (isError ? (
          <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
        ) : (
          <FieldDescription>{resolvedHint}</FieldDescription>
        ))}
    </Field>
  );
};

ComboboxField.displayName = "ComboboxField";

export default ComboboxField;
