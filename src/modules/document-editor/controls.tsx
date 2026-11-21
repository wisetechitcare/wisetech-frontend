import React from "react";
import { cn } from "@/ds/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { Tabs, TabsTrigger, ToggleList, TOGGLE_TAB } from "@/ds/ui/tabs";

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

/** A compact kit Select with no floating label — for a toolbar or an inline picker. The trigger shows the option's label. */
export const MiniSelect: React.FC<{
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}> = ({ value, options, onChange, ariaLabel, disabled, className }) => (
  <Select items={options} value={value} onValueChange={(v) => onChange(String(v))} disabled={disabled}>
    <SelectTrigger size="sm" aria-label={ariaLabel} className={className}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/** The kit's pill toggle (Tabs + ToggleList) sized for an inspector: pick one of a few options. `value` null = none picked. */
export const Segmented: React.FC<{
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}> = ({ value, options, onChange, ariaLabel, className }) => (
  <Tabs value={value ?? ""} onValueChange={(v) => onChange(String(v))} className={cn("w-full", className)}>
    <ToggleList aria-label={ariaLabel} className="w-full">
      {options.map((o) => (
        <TabsTrigger
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          title={o.title}
          className={cn(TOGGLE_TAB, "flex-1 px-2 py-1 text-xs")}
        >
          {o.label}
        </TabsTrigger>
      ))}
    </ToggleList>
  </Tabs>
);
