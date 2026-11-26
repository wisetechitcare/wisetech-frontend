import { useId } from "react";
import type { FieldError } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError as FieldErrorMessage,
  FieldLabel,
} from "@/ds/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/ds/ui/input-otp";

import { hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export enum OtpLength {
  THREE = 3,
  SIX = 6,
}

export interface OtpFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  disabled?: boolean;
  className?: string;
  length?: OtpLength;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  onBlur?: () => void;
}

function digitSlotClassName(isError: boolean): string {
  return cn(
    "relative flex size-12 items-center justify-center rounded-4xl border border-input bg-input/40 text-base font-semibold tabular-nums shadow-none transition-colors outline-none md:text-sm",
    "first:rounded-4xl first:border-l last:rounded-4xl border-x border-y",
    "data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:bg-background data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50",
    isError &&
      "border-destructive data-[active=true]:border-destructive data-[active=true]:ring-destructive/20 dark:data-[active=true]:ring-destructive/40",
  );
}

const OtpField = ({
  id,
  name,
  label,
  required = false,
  labelClassName,
  error,
  hint,
  disabled = false,
  className,
  length = OtpLength.SIX,
  value,
  onChange,
  onComplete,
  onBlur,
}: OtpFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;
  const slotClass = digitSlotClassName(isError);
  const indices = Array.from({ length }, (_, index) => index);
  const splitAt = length === OtpLength.SIX ? 3 : null;

  return (
    <Field
      data-invalid={isError || undefined}
      data-disabled={disabled || undefined}
      className={cn("w-full min-w-0 gap-2", className)}
      onBlur={onBlur}
    >
      {label && (
        <FieldLabel htmlFor={controlId} className={labelClassName}>
          {label}
        </FieldLabel>
      )}

      {required && <span className="sr-only" aria-required="true" />}

      <InputOTP
        id={controlId}
        name={name}
        maxLength={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        aria-invalid={isError || undefined}
        containerClassName={cn(
          "flex w-auto! max-w-full items-center gap-2.5",
          disabled && "opacity-50",
        )}
        className="disabled:cursor-not-allowed"
      >
        <InputOTPGroup className="flex items-center gap-2 rounded-none">
          {indices.slice(0, splitAt ?? length).map((index) => (
            <InputOTPSlot key={index} index={index} className={slotClass} />
          ))}
        </InputOTPGroup>
        {splitAt !== null && (
          <>
            <InputOTPSeparator className="text-muted-foreground" />
            <InputOTPGroup className="flex items-center gap-2 rounded-none">
              {indices.slice(splitAt).map((index) => (
                <InputOTPSlot key={index} index={index} className={slotClass} />
              ))}
            </InputOTPGroup>
          </>
        )}
      </InputOTP>

      {resolvedHint &&
        (isError ? (
          <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
        ) : (
          <FieldDescription>{resolvedHint}</FieldDescription>
        ))}
    </Field>
  );
};

OtpField.displayName = "OtpField";

export default OtpField;
