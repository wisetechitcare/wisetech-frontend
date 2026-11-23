import type { FieldError } from "react-hook-form";

export function resolveFieldHint(
  hint?: string,
  error?: boolean | FieldError
): string | undefined {
  return hint ?? (typeof error === "object" && error ? error.message : undefined);
}

export function hasFieldError(error?: boolean | FieldError): boolean {
  return typeof error === "boolean" ? error : Boolean(error);
}
