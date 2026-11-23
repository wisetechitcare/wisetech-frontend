import { useId } from "react";
import type { FieldError } from "react-hook-form";

import { PersonPicker, type PersonOption } from "@/ds/patterns/person-picker";
import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import { hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export type { PersonOption };

export interface PersonPickerFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  people: PersonOption[];
  /** Chosen person ids. */
  value?: string[];
  onChange?: (ids: string[]) => void;
  multiple?: boolean;
  onBlur?: () => void;
}

const PersonPickerField = ({
  id,
  name,
  label,
  required = false,
  labelClassName,
  error,
  hint,
  disabled = false,
  className,
  placeholder,
  people,
  value = [],
  onChange,
  multiple = false,
  onBlur,
}: PersonPickerFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;
  const labelId = `${controlId}-label`;

  return (
    <Field
      data-invalid={isError || undefined}
      data-disabled={disabled || undefined}
      data-filled={value.length > 0 ? "true" : undefined}
      className={cn("w-full min-w-0", className)}
      onBlur={onBlur}
    >
      {label && (
        <FieldLabel
          id={labelId}
          htmlFor={multiple ? undefined : controlId}
          className={labelClassName}
        >
          {label}
        </FieldLabel>
      )}

      {required && <span className="sr-only" aria-required="true" />}

      <PersonPicker
        id={controlId}
        people={people}
        value={value}
        onChange={(ids) => onChange?.(ids)}
        multiple={multiple}
        placeholder={placeholder}
        disabled={disabled}
        invalid={isError}
        aria-labelledby={multiple && label ? labelId : undefined}
      />

      {resolvedHint &&
        (isError ? (
          <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
        ) : (
          <FieldDescription>{resolvedHint}</FieldDescription>
        ))}
    </Field>
  );
};

PersonPickerField.displayName = "PersonPickerField";

export default PersonPickerField;
