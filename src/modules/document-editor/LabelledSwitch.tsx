import React from "react";
// Aliased: the lint ban on a raw MUI `Switch` matches any JSX element named `Switch`, and this is the kit's.
import { Switch as KitSwitch } from "@/ds/ui/switch";
import { cn } from "@/ds/lib/utils";

/** A switch with its state in words beside it ("Shown" / "Hidden", "Yes" / "No"). */
const LabelledSwitch: React.FC<{
  checked: boolean;
  disabled: boolean;
  onLabel: string;
  offLabel: string;
  onToggle: (checked: boolean) => void;
  ariaLabel?: string;
}> = ({ checked, disabled, onLabel, offLabel, onToggle, ariaLabel }) => (
  // shrink-0: beside a long hint on a narrow screen the text wraps, the switch never gets squeezed.
  <span className="inline-flex shrink-0 items-center gap-1.5">
    <span className={cn("text-xs font-semibold", checked ? "text-primary" : "text-muted-foreground")}>
      {checked ? onLabel : offLabel}
    </span>
    <KitSwitch size="sm" disabled={disabled} checked={checked} onCheckedChange={onToggle} aria-label={ariaLabel} />
  </span>
);

export default LabelledSwitch;
