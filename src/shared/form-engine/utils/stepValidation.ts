import { getIn } from 'formik';

/** Includes nested Formik errors and callers that return literal dotted paths. */
export function hasStepErrors(errors: unknown, fields: readonly string[]): boolean {
  if (!errors || typeof errors !== 'object') return false;
  return fields.some((field) => Boolean(getIn(errors, field)) ||
    Object.keys(errors).some((key) => key === field || key.startsWith(`${field}.`) || key.startsWith(`${field}[`)));
}

/**
 * Identity and foreign-key fields the wizard fills in itself. A seeded-but-empty
 * education row still carries a `rowId`, and every document row is created with the
 * `documentId` of the type it stands for — so scanning every cell reported those rows
 * as "real content", and Education Details and Upload Documents went green before the
 * user had typed a character or attached a file. A machine key is never evidence that
 * a human filled something in.
 */
const IDENTITY_KEYS = new Set([
  'rowId', 'id', '_id', 'key', 'uuid', 'documentId', 'employeeId',
]);

/** Does a Formik value count as "filled"? Blank strings, empty arrays and seeded rows do not. */
export function hasFilledValue(v: any): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    // An array of objects counts only when at least one row has real content —
    // the wizard seeds blank rows, which must not read as completed.
    return v.some((row) => hasFilledValue(row));
  }
  if (typeof v === 'object') {
    return Object.entries(v).some(([key, cell]) => !IDENTITY_KEYS.has(key) && hasFilledValue(cell));
  }
  return true;
}

/** A validated section becomes pending again if any of its owned values change. */
export function stepValueSignature(values: unknown, fields: readonly string[]): string {
  return JSON.stringify(fields.map((field) => getIn(values, field)));
}

/** First error path inside a Formik error tree, as a dotted path. */
export function firstErrorPath(errors: any, prefix = ''): string | null {
  if (!errors) return null;
  if (typeof errors === 'string') return prefix || null;
  if (Array.isArray(errors)) {
    for (let i = 0; i < errors.length; i += 1) {
      if (errors[i]) return firstErrorPath(errors[i], `${prefix}.${i}`);
    }
    return null;
  }
  if (typeof errors === 'object') {
    const keys = Object.keys(errors);
    if (!keys.length) return null;
    return firstErrorPath(errors[keys[0]], prefix ? `${prefix}.${keys[0]}` : keys[0]);
  }
  return prefix || null;
}

/**
 * First error path that belongs to one of `fields`, in `fields` order. Matches the
 * same two shapes `hasStepErrors` does: a nested Formik tree, and a literal dotted key
 * (`{ 'address.city': 'Required' }`) some validators return.
 */
export function firstErrorPathIn(errors: unknown, fields: readonly string[]): string | null {
  if (!errors || typeof errors !== 'object') return null;
  for (const field of fields) {
    const nested = firstErrorPath(getIn(errors, field), field);
    if (nested) return nested;
    const literal = Object.keys(errors).find((key) =>
      key === field || key.startsWith(`${field}.`) || key.startsWith(`${field}[`));
    if (literal) return literal;
  }
  return null;
}

/** Index of the first step (in the order given) that owns an error, or -1. */
export function firstErroredStepIndex(errors: unknown, steps: ReadonlyArray<{ fields: readonly string[] }>): number {
  return steps.findIndex((step) => hasStepErrors(errors, step.fields));
}

/**
 * Take the user to the thing that is blocking them.
 *
 * Telling someone "complete the required fields in this section" and leaving them to
 * find it is the difference between a form that guides and one that scolds — on a
 * long section the offending field is often off-screen entirely. This resolves the
 * first error to a real DOM node, scrolls it into view and focuses it.
 *
 * `fieldPath` is a Formik path, which may be nested (`addressInfo.presentCity`) or
 * indexed (`familyInfo.0.name`), so several selectors are tried before giving up.
 * The last resort is the section's own inline error text — that is what catches a
 * structural requirement like Approval Settings, which has no single input to blame.
 */
export function focusFieldOrError(fieldPath: string | null): void {
  if (typeof document === 'undefined') return;
  const candidates: string[] = [];
  if (fieldPath) {
    candidates.push(`[name="${fieldPath}"]`);
    // Formik's dotted path vs the bracketed name an array field may render with.
    candidates.push(`[name="${fieldPath.replace(/\.(\d+)\./g, '[$1].')}"]`);
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      candidates.push(`#${CSS.escape(fieldPath)}`);
    }
    candidates.push(`[name^="${fieldPath}"]`);
  }
  // Any inline error currently on screen, in document order.
  candidates.push('[data-required-error]', '.text-danger', "[aria-invalid='true']");

  for (const selector of candidates) {
    let element: HTMLElement | null = null;
    try {
      element = document.querySelector(selector) as HTMLElement | null;
    } catch {
      continue; // A malformed selector must not stop the remaining attempts.
    }
    if (!element) continue;

    element.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    // Only inputs take focus; scrolling an error message into view is enough.
    if (typeof (element as HTMLInputElement).focus === 'function' && element.tagName !== 'DIV') {
      element.focus({ preventScroll: true });
    }
    return;
  }
}
