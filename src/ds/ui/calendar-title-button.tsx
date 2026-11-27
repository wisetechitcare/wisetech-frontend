import type { ReactNode } from "react";
import { Button } from "react-aria-components";

interface CalendarTitleButtonProps {
  label: string;
  onPress: () => void;
  children: ReactNode;
}

function CalendarTitleButton({ label, onPress, children }: CalendarTitleButtonProps) {
  return (
    <Button
      slot={null}
      data-slot="calendar-title"
      aria-label={label}
      onPress={onPress}
      className="relative flex items-center rounded-lg px-2 py-1 text-sm font-semibold outline-none select-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
      <svg
        viewBox="0 0 6 6"
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 size-1.5 fill-primary"
      >
        <polygon points="6,0 6,6 0,6" />
      </svg>
    </Button>
  );
}

export { CalendarTitleButton };
