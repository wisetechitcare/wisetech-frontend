import type { FieldError } from "react-hook-form";

/** Pill shape — same as kit Input / Person Picker (rounded-4xl). */
export const FIELD_CONTROL_RADIUS = "rounded-4xl";
/** Dropdown / popover menus. */
export const FIELD_MENU_RADIUS = "rounded-2xl";
/** Selected chips inside Combobox / multi pickers. */
export const FIELD_CHIP_RADIUS = "rounded-4xl";
/** Multi-line text areas (soft pill, not capsule). */
export const FIELD_TEXTAREA_RADIUS = "rounded-2xl";

export function resolveFieldHint(
  hint?: string,
  error?: boolean | FieldError
): string | undefined {
  return hint ?? (typeof error === "object" && error ? error.message : undefined);
}

export function hasFieldError(error?: boolean | FieldError): boolean {
  return typeof error === "boolean" ? error : Boolean(error);
}
