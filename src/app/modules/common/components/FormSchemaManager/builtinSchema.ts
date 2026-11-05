import { IFormField, IFormSection, FormFieldType, BuiltinInputKind } from '@models/company';

/**
 * Built-in sections/fields for a schema-driven form (company, sub-company, branch…), plus the
 * one merge rule every such form uses. A form declares its built-ins; it gets back:
 *
 *  - `cloneDefaults()` — the built-in layout, fresh, for a new record;
 *  - `mergeSchema(saved)` — a record's saved `section_config` laid over the defaults.
 *
 * Saved order, section titles, custom fields/sections and the admin's edits to built-ins
 * (label, required, hidden, info-page, section) are kept. Type and the constraint flags always
 * come from the defaults, so a stale or hand-edited config can't unlock a bespoke widget — and a
 * built-in missing from the saved config goes back to its default home (built-ins are never
 * deleted; see FormSchemaManager).
 */
export type BuiltinField = Pick<IFormField, 'id' | 'label'> &
  Partial<Pick<IFormField, 'required' | 'essential' | 'fixedSection'>> & {
    type?: FormFieldType;
    /** What the field's widget takes (phone, dropdown…). Defaults to its `type`. */
    input?: BuiltinInputKind;
  };
export interface BuiltinSection { id: string; title: string; fields: BuiltinField[] }

const toField = (f: BuiltinField): IFormField => ({
  id: f.id,
  label: f.label,
  type: f.type ?? 'text',
  required: !!f.required,
  isSystem: true,
  fixedType: true, // every built-in has its own widget
  fixedSection: f.fixedSection,
  essential: f.essential,
  inputKind: f.input ?? f.type ?? 'text',
});

export function createBuiltinSchema(builtins: BuiltinSection[]) {
  const cloneDefaults = (): IFormSection[] =>
    builtins.map((s) => ({ id: s.id, title: s.title, isSystem: true, fields: s.fields.map(toField) }));

  function mergeSchema(saved: unknown): IFormSection[] {
    const defaults = cloneDefaults();
    if (!Array.isArray(saved) || saved.length === 0) return defaults;

    const defaultField = new Map<string, { field: IFormField; sectionId: string }>();
    defaults.forEach((s) => s.fields.forEach((f) => defaultField.set(f.id, { field: f, sectionId: s.id })));
    const placed = new Set<string>();

    const result: IFormSection[] = saved.map((sec: any) => {
      const def = defaults.find((d) => d.id === sec.id);
      const fields: IFormField[] = [];
      // Configs saved before built-ins were editable carry no `fixedType` stamp. Their
      // built-in labels/order were never chosen by anyone — use today's defaults instead.
      const legacy = (sec.fields || []).some((f: any) => f?.isSystem && !f.fixedType);
      if (legacy && def) def.fields.forEach((f) => { placed.add(f.id); fields.push(f); });
      (sec.fields || []).forEach((f: any) => {
        if (!f?.isSystem) {
          fields.push({ ...f, isSystem: false, value: f.value ?? '' });
          return;
        }
        if (legacy) return;
        const d = defaultField.get(f.id);
        // Drop built-ins that no longer exist, duplicates, and composite parts saved out of place.
        if (!d || placed.has(f.id) || (d.field.fixedSection && d.sectionId !== sec.id)) return;
        placed.add(f.id);
        fields.push({
          ...d.field,
          label: f.label || d.field.label,
          required: d.field.essential || !!f.required,
          hidden: d.field.essential ? false : !!f.hidden,
          showOnInfoPage: f.showOnInfoPage,
        });
      });
      return def
        ? { ...def, title: sec.title || def.title, showOnInfoPage: sec.showOnInfoPage, fields }
        : { id: sec.id, title: sec.title, isSystem: false, showOnInfoPage: sec.showOnInfoPage, fields };
    });

    // Built-in sections/fields the saved config predates (or lost) go back to their default home.
    defaults.forEach((d) => {
      let target = result.find((s) => s.id === d.id);
      if (!target) result.push((target = { ...d, fields: [] }));
      d.fields.forEach((f) => !placed.has(f.id) && target!.fields.push(f));
    });

    return result;
  }

  return { cloneDefaults, mergeSchema, BUILTIN_IDS: new Set(builtins.map((s) => s.id)) };
}

/**
 * Required CUSTOM fields left empty, as { fieldId: message } — for every schema-driven form.
 *
 * Custom fields only: a built-in keeps its value in Formik, not on `f.value`, so including it
 * reported it empty every time and silently blocked EVERY save (see NewCompanyForm.test).
 * Built-ins are enforced by each form's Yup schema; hidden fields cannot be filled, so never block.
 */
export const missingCustomFields = (sections: IFormSection[]): Record<string, string> => {
  const errs: Record<string, string> = {};
  sections.forEach((sec) =>
    sec.fields.forEach((f) => {
      if (f.isSystem || f.hidden) return;
      if (f.required && !String(f.value ?? '').trim()) errs[f.id] = `${f.label} is required`;
    })
  );
  return errs;
};
