import { type ReactNode } from "react";
import {
  FilterSheet as KitFilterSheet,
  FilterSheetButton as KitFilterSheetButton,
  countActiveFilters,
} from "@/ds/patterns/filter-sheet";

/** Count of fields that differ from their reset value — the kit's rule (arrays and objects compare by value). */
export { countActiveFilters };

/**
 * Filter trigger for a table's right-side icon group (MaterialTable's `renderToolbarIconActions`) — the kit
 * button's icon-only form; the count rides on a badge and the button tints while filters are applied.
 */
export function FilterSheetButton({ count, onClick }: { count: number; onClick: () => void }) {
  return <KitFilterSheetButton iconOnly count={count} onClick={onClick} />;
}

export interface FilterSheetProps<T extends object> {
  open: boolean;
  /** Applied filters. The sheet edits a draft copy until Apply. */
  value: T;
  /** Reset target. A field counts as active when it differs from this. */
  empty: T;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  onApply: (next: T) => void;
  /** Fields bound to `draft` / `set`. */
  children: (draft: T, set: <K extends keyof T>(key: K, next: T[K]) => void) => ReactNode;
}

/**
 * Legacy prop names (`onClose`) for the kit Filter Sheet (`@/ds/patterns/filter-sheet`, Storybook
 * "Patterns/Filter Sheet"). The panel, draft / Apply / Reset behaviour and layout live ONLY in the kit;
 * new code imports the kit component directly.
 */
export function FilterSheet<T extends object>({ onClose, ...props }: FilterSheetProps<T>) {
  return <KitFilterSheet {...props} onOpenChange={(open) => !open && onClose()} />;
}
