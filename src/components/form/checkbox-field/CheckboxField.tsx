import { useId } from "react";
import type { FieldError } from "react-hook-form";

import { Checkbox } from "@/ds/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError as FieldErrorMessage,
  FieldLabel,
} from "@/ds/ui/field";

import { hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export interface CheckboxFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  disabled?: boolean;
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onBlur?: () => void;
}

/**
 * Common Checkbox Field — shadcn/kit Checkbox with the same Field chrome as Input.
 * Label sits beside the box (horizontal), never floating.
 */
const CheckboxField = ({
  id,
  name,
  label,
  required = false,
  labelClassName,
  error,
  hint,
  disabled = false,
  className,
  checked,
  defaultChecked,
  indeterminate = false,
  onCheckedChange,
  onBlur,
}: CheckboxFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;
  const isChecked = checked ?? defaultChecked ?? false;

  return (
    <Field
      orientation="horizontal"
      data-invalid={isError || undefined}
      data-disabled={disabled || undefined}
      data-checked={isChecked || indeterminate ? "true" : undefined}
      className={cn("w-full min-w-0", className)}
      onBlur={onBlur}
    >
      <Checkbox
        id={controlId}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        indeterminate={indeterminate}
        disabled={disabled}
        required={required}
        aria-invalid={isError || undefined}
        aria-required={required || undefined}
        onCheckedChange={(next) => {
          onCheckedChange?.(next === true);
        }}
      />

      {(label || resolvedHint) && (
        <FieldContent>
          {label && (
            <FieldLabel htmlFor={controlId} className={labelClassName}>
              {label}
            </FieldLabel>
          )}

          {resolvedHint &&
            (isError ? (
              <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
            ) : (
              <FieldDescription>{resolvedHint}</FieldDescription>
            ))}
        </FieldContent>
      )}
    </Field>
  );
};

CheckboxField.displayName = "CheckboxField";

export default CheckboxField;
