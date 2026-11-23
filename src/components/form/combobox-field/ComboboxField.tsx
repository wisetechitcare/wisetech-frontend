import { useId } from "react";
import type { FieldError } from "react-hook-form";

import {
  SearchSelect,
  type SearchSelectOption,
} from "@/ds/patterns/search-select";

import { hasFieldError, resolveFieldHint } from "@/components/form/common";

export type ComboboxOption = SearchSelectOption;

export interface ComboboxFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  error?: boolean | FieldError;
  hint?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  emptyText?: string;
  clearable?: boolean;
  options: ComboboxOption[];
  value?: string | null;
  onChange?: (value: string | null, option: ComboboxOption | null) => void;
  onBlur?: () => void;
  onCreate?: (label: string) => void | Promise<void>;
  createLabel?: (query: string) => string;
  limit?: number;
}

/**
 * Searchable dropdown for forms — same usage props as Input Field.
 * Built on kit SearchSelect (Combobox + floating label). Use this for any
 * dropdown / search pick (branch, category, country list, etc.).
 */
const ComboboxField = ({
  id,
  name,
  label = "Select",
  required = false,
  error,
  hint,
  disabled = false,
  className,
  placeholder = "Search…",
  emptyText,
  clearable = true,
  options,
  value = null,
  onChange,
  onBlur,
  onCreate,
  createLabel,
  limit,
}: ComboboxFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;

  return (
    <SearchSelect
      id={controlId}
      label={label}
      value={value}
      onValueChange={(next, option) => onChange?.(next, option)}
      options={options}
      placeholder={placeholder}
      emptyText={emptyText}
      hint={!isError ? resolvedHint : undefined}
      error={isError ? resolvedHint : undefined}
      required={required}
      disabled={disabled}
      clearable={clearable}
      onBlur={onBlur}
      onCreate={onCreate}
      createLabel={createLabel}
      limit={limit}
      className={className}
    />
  );
};

ComboboxField.displayName = "ComboboxField";

export default ComboboxField;
