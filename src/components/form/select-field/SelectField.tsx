import { useId, useMemo } from "react";
import type { FieldError } from "react-hook-form";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/ds/ui/combobox";
import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ds/ui/select";

import {
  FIELD_CONTROL_RADIUS,
  FIELD_MENU_RADIUS,
  hasFieldError,
  resolveFieldHint,
} from "@/components/form/common";
import {
  SELECT_CREATABLE_EMPTY_MESSAGE,
  SELECT_EMPTY_MESSAGE,
  SELECT_LOADING_PLACEHOLDER,
  SELECT_SEARCH_PLACEHOLDER,
} from "@/lib/constants/common";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onOptionSelect?: (option: SelectOption) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  creatable?: boolean;
  /** When true, type in the field to filter — no separate search box. */
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
}

const byValue = (a: SelectOption, b: SelectOption) => a.value === b.value;

interface SelectControlProps {
  controlId: string;
  labelId: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onOptionSelect?: (option: SelectOption) => void;
  placeholder: string;
  disabled: boolean;
  loading: boolean;
  isError: boolean;
  required: boolean;
  triggerClassName?: string;
  ariaLabel?: string;
}

function SimpleSelectControl({
  controlId,
  options,
  value,
  onValueChange,
  onOptionSelect,
  placeholder,
  disabled,
  loading,
  isError,
  required,
  triggerClassName,
  ariaLabel,
}: SelectControlProps) {
  const isDisabled = disabled || loading;

  return (
    <Select
      items={options.map((option) => ({ value: option.value, label: option.label }))}
      value={value || null}
      onValueChange={(next) => {
        if (typeof next !== "string") {
          return;
        }
        const option = options.find((item) => item.value === next);
        onValueChange?.(next);
        if (option) {
          onOptionSelect?.(option);
        }
      }}
      disabled={isDisabled}
    >
      <SelectTrigger
        id={controlId}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-invalid={isError || undefined}
        aria-required={required || undefined}
        className={cn(
          "h-11 w-full min-w-0 data-[size=default]:h-11",
          FIELD_CONTROL_RADIUS,
          triggerClassName
        )}
      >
        <SelectValue placeholder={loading ? SELECT_LOADING_PLACEHOLDER : placeholder} />
      </SelectTrigger>
      <SelectContent className={FIELD_MENU_RADIUS}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SearchableSelectControl({
  controlId,
  options,
  value,
  onValueChange,
  onOptionSelect,
  placeholder,
  disabled,
  loading,
  isError,
  required,
  triggerClassName,
  ariaLabel,
}: SelectControlProps) {
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );
  const isDisabled = disabled || loading;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next: SelectOption | null) => {
        onValueChange?.(next?.value ?? "");
        if (next) {
          onOptionSelect?.(next);
        }
      }}
      itemToStringLabel={(option: SelectOption | null) => option?.label ?? ""}
      itemToStringValue={(option: SelectOption) => option.value}
      isItemEqualToValue={byValue}
      disabled={isDisabled}
      required={required}
    >
      <ComboboxInput
        id={controlId}
        placeholder={loading ? SELECT_LOADING_PLACEHOLDER : placeholder || SELECT_SEARCH_PLACEHOLDER}
        showClear={!!selected && !isDisabled}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-invalid={isError || undefined}
        className={cn("h-11 w-full", FIELD_CONTROL_RADIUS, triggerClassName)}
      />
      <ComboboxContent className={FIELD_MENU_RADIUS}>
        <ComboboxEmpty>{SELECT_EMPTY_MESSAGE}</ComboboxEmpty>
        <ComboboxList>
          {(option: SelectOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function CreatableSelectControl({
  controlId,
  options,
  value,
  onValueChange,
  onOptionSelect,
  placeholder,
  disabled,
  loading,
  isError,
  required,
  triggerClassName,
  ariaLabel,
}: SelectControlProps) {
  const selected = useMemo(
    () => options.find((option) => option.label === value || option.value === value) ?? null,
    [options, value]
  );
  const isDisabled = disabled || loading;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next: SelectOption | null) => {
        if (!next) {
          onValueChange?.("");
          return;
        }
        onValueChange?.(next.label);
        onOptionSelect?.(next);
      }}
      itemToStringLabel={(option: SelectOption | null) => option?.label ?? ""}
      itemToStringValue={(option: SelectOption) => option.value}
      isItemEqualToValue={byValue}
      disabled={isDisabled}
      required={required}
      onInputValueChange={(query: string) => {
        onValueChange?.(query);
      }}
    >
      <ComboboxInput
        id={controlId}
        placeholder={loading ? SELECT_LOADING_PLACEHOLDER : placeholder}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-invalid={isError || undefined}
        className={cn("h-11 w-full", FIELD_CONTROL_RADIUS, triggerClassName)}
      />
      <ComboboxContent className={FIELD_MENU_RADIUS}>
        <ComboboxEmpty>{SELECT_CREATABLE_EMPTY_MESSAGE}</ComboboxEmpty>
        <ComboboxList>
          {(option: SelectOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/**
 * Common Select Field — same Field chrome as Input.
 * Searchable mode filters by typing in the field (no separate search box).
 */
const SelectField = ({
  id,
  name,
  label,
  required = false,
  labelClassName,
  error,
  hint,
  options,
  value,
  onValueChange,
  onOptionSelect,
  placeholder = "Select an option",
  disabled = false,
  loading = false,
  creatable = false,
  searchable = true,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
}: SelectFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;
  const labelId = `${controlId}-label`;
  const hasValue = Boolean(value);

  const controlProps: SelectControlProps = {
    controlId,
    labelId,
    options,
    value,
    onValueChange,
    onOptionSelect,
    placeholder,
    disabled,
    loading,
    isError,
    required,
    triggerClassName,
    ariaLabel: ariaLabel ?? label,
  };

  return (
    <Field
      data-invalid={isError || undefined}
      data-disabled={disabled || loading || undefined}
      data-filled={hasValue ? "true" : undefined}
      className={cn("w-full min-w-0", className)}
    >
      {label && (
        <FieldLabel id={labelId} htmlFor={controlId} className={labelClassName}>
          {label}
        </FieldLabel>
      )}

      {required && <span className="sr-only" aria-required="true" />}

      {creatable ? (
        <CreatableSelectControl {...controlProps} />
      ) : searchable ? (
        <SearchableSelectControl {...controlProps} />
      ) : (
        <SimpleSelectControl {...controlProps} />
      )}

      {resolvedHint &&
        (isError ? (
          <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
        ) : (
          <FieldDescription>{resolvedHint}</FieldDescription>
        ))}
    </Field>
  );
};

SelectField.displayName = "SelectField";

export default SelectField;
