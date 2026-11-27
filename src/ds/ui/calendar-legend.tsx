import { cn } from "cn";

import { toneStyle, type Tone } from "@/ds/lib/tone";

export type DayState = {
  tone?: Tone | (string & {});
  pattern?: "solid" | "dashed";
  marker?: boolean;
  label?: string;
};

interface CalendarLegendItem {
  label: string;
  tone?: DayState["tone"];
  pattern?: DayState["pattern"];
  marker?: boolean;
  today?: boolean;
}

interface CalendarLegendProps {
  items: CalendarLegendItem[];
  className?: string;
}

/**
 * The calendar's legend: one row per day state, drawn with the same tones the engine paints, so a legend can
 * never disagree with the grid. `today` draws the today ring.
 */
function CalendarLegend({ items, className }: CalendarLegendProps) {
  return (
    <ul
      data-slot="calendar-legend"
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            style={item.tone ? toneStyle(item.tone) : undefined}
            className={cn(
              "relative size-3.5 shrink-0 overflow-hidden rounded-sm",
              item.today && "ring-2 ring-primary ring-inset",
              item.tone &&
                "bg-[color-mix(in_oklch,var(--tone)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--tone)_28%,transparent)]",
              item.pattern === "dashed" &&
                "shadow-none outline-1 -outline-offset-1 outline-dashed outline-[color-mix(in_oklch,var(--tone)_60%,transparent)]",
              item.marker &&
                "after:absolute after:top-0 after:right-0 after:size-2 after:bg-(--tone) after:[clip-path:polygon(0_0,100%_0,100%_100%)]",
            )}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export { CalendarLegend };
