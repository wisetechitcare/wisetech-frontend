import type { FieldError } from "react-hook-form";
import type { CountryIso2 } from "react-international-phone";

import { PhoneField as KitPhoneField } from "@/ds/patterns/phone-field";
import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import { FIELD_CONTROL_RADIUS, hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export enum DefaultPhoneCountry {
  IN = "in",
}

export interface PhoneFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
  defaultCountry?: CountryIso2;
  onChange?: (
    phone: string,
    country: { iso2: string; dialCode: string; name: string }
  ) => void;
  onBlur?: () => void;
}

const PhoneField = ({
  id,
  name,
  label,
  required = false,
  labelClassName,
  error,
  hint,
  disabled = false,
  className,
  value,
  defaultCountry = DefaultPhoneCountry.IN,
  onChange,
  onBlur,
}: PhoneFieldProps) => {
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name;

  return (
    <Field
      data-invalid={isError || undefined}
      data-disabled={disabled || undefined}
      data-filled="true"
      className={cn("w-full min-w-0", className)}
      onBlur={onBlur}
    >
      {label && (
        <FieldLabel htmlFor={controlId} className={labelClassName}>
          {label}
        </FieldLabel>
      )}

      {required && <span className="sr-only" aria-required="true" />}

      <KitPhoneField
        id={controlId}
        value={value}
        defaultCountry={defaultCountry}
        disabled={disabled}
        invalid={isError}
        onChange={onChange}
        className={cn(
          FIELD_CONTROL_RADIUS,
          isError && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
        )}
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

PhoneField.displayName = "PhoneField";

export default PhoneField;
