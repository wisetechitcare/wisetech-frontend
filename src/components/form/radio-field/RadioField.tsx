import { useId } from "react";

import { Label } from "@/ds/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ds/ui/radio-group";

import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioFieldProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  label?: string;
}

/**
 * Common Radio Group — kit RadioGroup + Label. Base UI handles selection and a11y.
 */
const RadioField = ({
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  name,
  label,
}: RadioFieldProps) => {
  const generatedId = useId();
  const groupId = name ?? generatedId;
  const labelId = `${groupId}-label`;

  return (
    <div className={cn("grid w-full gap-2", className)}>
      {label ? (
        <p id={labelId} className="text-sm font-medium">
          {label}
        </p>
      ) : null}

      <RadioGroup
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        aria-labelledby={label ? labelId : undefined}
        onValueChange={(next) => {
          onValueChange?.(String(next));
        }}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <div
              key={option.value}
              className={cn(
                "flex min-w-0 gap-2",
                option.description ? "items-start" : "items-center"
              )}
            >
              <RadioGroupItem
                id={optionId}
                value={option.value}
                disabled={option.disabled || disabled}
                className={option.description ? "mt-0.5" : undefined}
              />
              <div className="min-w-0 grid gap-0.5">
                <Label htmlFor={optionId} className="font-normal">
                  {option.label}
                </Label>
                {option.description ? (
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};

RadioField.displayName = "RadioField";

export default RadioField;
