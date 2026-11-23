import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";

import { Textarea as KitTextarea } from "@/ds/ui/textarea";
import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import { hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      placeholder = "Enter your message",
      rows = 3,
      value,
      onChange,
      className,
      disabled = false,
      label,
      required = false,
      labelClassName,
      error,
      hint,
      id,
      name,
      ...rest
    },
    ref
  ) => {
    const isError = hasFieldError(error);
    const resolvedHint = resolveFieldHint(hint, error);
    const controlId = id ?? name;

    return (
      <Field
        data-invalid={isError || undefined}
        data-disabled={disabled || undefined}
        className="w-full min-w-0"
      >
        {label && (
          <FieldLabel htmlFor={controlId} className={labelClassName}>
            {label}
          </FieldLabel>
        )}

        <KitTextarea
          ref={ref}
          id={controlId}
          name={name}
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={isError || undefined}
          className={cn("min-h-24 resize-y", className)}
          {...rest}
        />

        {resolvedHint &&
          (isError ? (
            <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
          ) : (
            <FieldDescription>{resolvedHint}</FieldDescription>
          ))}
      </Field>
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
