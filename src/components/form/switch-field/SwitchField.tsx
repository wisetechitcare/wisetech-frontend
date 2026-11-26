import { useId } from "react";

import { Label } from "@/ds/ui/label";
import { Switch } from "@/ds/ui/switch";

import { cn } from "@/lib/utils";

export interface SwitchFieldProps {
  id?: string;
  name?: string;
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Common Switch — kit Switch + Label. Base UI handles toggle and a11y.
 */
const SwitchField = ({
  id,
  name,
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  className,
  size = "default",
}: SwitchFieldProps) => {
  const generatedId = useId();
  const controlId = id ?? name ?? generatedId;

  return (
    <div className={cn("flex w-full min-w-0 items-center gap-3", className)}>
      <Switch
        id={controlId}
        name={name}
        size={size}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={(next) => {
          onCheckedChange?.(next === true);
        }}
      />
      {label ? (
        <Label htmlFor={controlId} className="font-normal">
          {label}
        </Label>
      ) : null}
    </div>
  );
};

SwitchField.displayName = "SwitchField";

export default SwitchField;
