import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/ds/lib/utils";

/**
 * Solid colour, white dot, white label, 6px corners — the workflow chip the trackers, the Leads / Projects tables
 * and the Courtesy Desk share, so every workflow column reads as one set.
 *
 * `color` is data (a status colour an admin picked), so it is the one inline style; a chip with no value ("Not
 * billed") falls back to the muted token, so an empty cell still reads as a chip.
 */
export const SolidChip: React.FC<{ label: string; color?: string | null; dropdown?: boolean }> = ({
  label, color, dropdown,
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md py-1 pl-2",
      dropdown ? "pr-1.5" : "pr-2.5",
      !color && "bg-muted-foreground",
    )}
    style={color ? { backgroundColor: color } : undefined}
  >
    <span aria-hidden className="size-2 shrink-0 rounded-full bg-white" />
    <span className="text-xs font-semibold text-white">{label}</span>
    {dropdown && <ChevronDown aria-hidden className="size-3 text-white" />}
  </span>
);
