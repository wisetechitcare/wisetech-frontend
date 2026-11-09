import { useField } from 'formik';

/**
 * The ONE seam between the form engine and the design-system fields.
 *
 * Kit fields (`SearchSelect`, `Input`, `DatePicker`, `NumberField`, `ImageField`…) are plain controlled
 * components: value in, change out, an `error` to show. This maps a Formik field onto exactly that, so a
 * screen never hand-wires `touched && errors[name]` again — the copy-pasted line that drifted between forms.
 *
 * The target stack is react-hook-form + zod (docs/DESIGN_SYSTEM_DECISION.md). Moving a form there replaces
 * this hook's body with `useController` and leaves every field call site alone.
 *
 * `error` is shown only once the field was touched or a submit was attempted — never while someone is still
 * on their first pass through an empty form.
 */
export function useFormField<T = unknown>(name: string) {
  const [field, meta, helpers] = useField<T>(name);
  const error = meta.touched && meta.error ? String(meta.error) : undefined;
  return {
    name,
    value: field.value,
    /** Sets the value and validates. */
    setValue: (value: T) => {
      void helpers.setValue(value, true);
    },
    /** Marks the field touched (call on blur) so its error can show. */
    onBlur: () => {
      void helpers.setTouched(true, true);
    },
    error,
    invalid: !!error,
  };
}
