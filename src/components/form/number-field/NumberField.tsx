import { forwardRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";
import type { FieldError } from "react-hook-form";

import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import { hasFieldError, resolveFieldHint } from "@/components/form/common";
import { cn } from "@/lib/utils";

export interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  showSteppers?: boolean;
}

const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      name,
      placeholder = " ",
      value,
      defaultValue,
      onChange,
      className,
      min,
      max,
      step = 1,
      disabled = false,
      label,
      required = false,
      labelClassName,
      error,
      hint,
      showSteppers = true,
      id,
      ...rest
    },
    ref
  ) => {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== undefined ? String(defaultValue) : ""
    );
    const currentValue = isControlled ? String(value ?? "") : internalValue;
    const isError = hasFieldError(error);
    const resolvedHint = resolveFieldHint(hint, error);
    const numericStep = Number(step) || 1;
    const controlId = id ?? name;

    const emitChange = (nextValue: string) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      onChange?.({
        target: { value: nextValue, name: name ?? "" },
        currentTarget: { value: nextValue, name: name ?? "" },
      } as ChangeEvent<HTMLInputElement>);
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }
      onChange?.(event);
    };

    const adjustValue = (direction: 1 | -1) => {
      if (disabled) {
        return;
      }

      const parsed = currentValue === "" ? 0 : Number(currentValue);
      const base = Number.isFinite(parsed) ? parsed : 0;
      let next = base + direction * numericStep;

      if (min !== undefined && next < Number(min)) {
        next = Number(min);
      }
      if (max !== undefined && next > Number(max)) {
        next = Number(max);
      }

      emitChange(String(next));
    };

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
            "relative flex h-11 w-full items-center rounded-lg border shadow-theme-xs dark:bg-gray-900",
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
            type="number"
            name={name}
            placeholder={placeholder}
            value={currentValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            required={required}
            aria-invalid={isError || undefined}
            className={cn(
              "h-full w-full appearance-none border-0 bg-transparent px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30",
              showSteppers && "pr-20",
              disabled && "cursor-not-allowed text-gray-500 dark:text-gray-400",
              !disabled && isError && "dark:text-error-400"
            )}
            {...rest}
          />

          {showSteppers && (
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                disabled={disabled}
                aria-label="Decrease value"
                onClick={() => adjustValue(-1)}
                className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 hover:text-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Increase value"
                onClick={() => adjustValue(1)}
                className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 hover:text-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Plus className="size-4" />
              </button>
            </div>
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

NumberField.displayName = "NumberField";

export default NumberField;
