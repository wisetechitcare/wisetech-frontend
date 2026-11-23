import { forwardRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldError } from "react-hook-form";

import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import { FIELD_CONTROL_RADIUS, hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      name,
      placeholder = " ",
      value,
      onChange,
      className,
      autoComplete,
      min,
      max,
      step,
      disabled = false,
      label,
      required = false,
      labelClassName,
      error,
      hint,
      id,
      ...rest
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const isPasswordField = type === "password";
    const inputType = isPasswordField && showPassword ? "text" : type;
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

        <div
          data-slot="input"
          className={cn(
            "relative flex h-11 w-full items-center border shadow-theme-xs dark:bg-gray-900",
            FIELD_CONTROL_RADIUS,
            disabled &&
              "cursor-not-allowed border-gray-300 bg-gray-100 opacity-40 dark:border-gray-700 dark:bg-gray-800",
            !disabled &&
              isError &&
              "border-error-500 focus-within:border-error-300 focus-within:ring-3 focus-within:ring-error-500/20 dark:border-error-500",
            !disabled &&
              !isError &&
              "border-gray-300 bg-transparent focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/20 dark:border-gray-700 dark:focus-within:border-brand-800",
            className
          )}
        >
          <input
            ref={ref}
            id={controlId}
            type={inputType}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            aria-invalid={isError || undefined}
            className={cn(
              "h-full w-full appearance-none border-0 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30",
              isPasswordField && "pr-11",
              disabled && "cursor-not-allowed text-gray-500 dark:text-gray-400",
              !disabled && isError && "dark:text-error-400"
            )}
            {...rest}
          />

          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors duration-200 hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>

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

Input.displayName = "Input";

export default Input;
