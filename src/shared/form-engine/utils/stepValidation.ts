import { getIn } from 'formik';

/** Includes nested Formik errors and callers that return literal dotted paths. */
export function hasStepErrors(errors: unknown, fields: readonly string[]): boolean {
  if (!errors || typeof errors !== 'object') return false;
  return fields.some((field) => Boolean(getIn(errors, field)) ||
    Object.keys(errors).some((key) => key === field || key.startsWith(`${field}.`) || key.startsWith(`${field}[`)));
}

/** A validated section becomes pending again if any of its owned values change. */
export function stepValueSignature(values: unknown, fields: readonly string[]): string {
  return JSON.stringify(fields.map((field) => getIn(values, field)));
}
