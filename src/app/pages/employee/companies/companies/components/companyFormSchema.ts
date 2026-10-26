import { IFormField, IFormSection, FormFieldType } from "@models/company";

// ─── CRM Company form: built-in sections & fields ──────────────────────────────
// The company wizard renders every field from this schema (see NewCompanyForm's
// `renderBuiltin`), so admins get the same control over built-ins as on the
// Organization form: rename, require, hide, reorder and move between sections.
// The flags below only fence off what a bespoke widget can't honour.
type BuiltinField = Pick<IFormField, "id" | "label"> &
  Partial<Pick<IFormField, "required" | "essential" | "fixedSection">> & { type?: FormFieldType };
interface BuiltinSection { id: string; title: string; fields: BuiltinField[] }

// Rendered inside the smart address picker as one unit, so they stay in Address.
const ADDRESS = { fixedSection: true } as const;

export const COMPANY_BUILTIN_SECTIONS: BuiltinSection[] = [
  { id: "project_details", title: "Company Profile", fields: [
    { id: "companyName", label: "Company Name", required: true, essential: true },
    { id: "companyTypes", label: "Company Type" },
    { id: "subTypes", label: "Services" },
    { id: "services", label: "Sub-services" },
  ]},
  { id: "references", title: "References", fields: [
    { id: "references", label: "References" },
  ]},
  { id: "contact_details", title: "Contact Details", fields: [
    { id: "phone", label: "Phone" },
    { id: "phone2", label: "Phone 2" },
    { id: "email", label: "Email" },
    { id: "website", label: "Website" },
    { id: "fax", label: "Fax" },
  ]},
  { id: "address", title: "Address", fields: [
    // Same order as the address picker's own layout (ContactAddressSection).
    { id: "country", label: "Country", ...ADDRESS },
    { id: "state", label: "State", ...ADDRESS },
    { id: "city", label: "City", ...ADDRESS },
    { id: "area", label: "Locality", ...ADDRESS },
    { id: "zipCode", label: "Pincode", ...ADDRESS },
    { id: "addressLine1", label: "Formatted Address", ...ADDRESS },
    { id: "latitude", label: "Latitude", ...ADDRESS },
    { id: "longitude", label: "Longitude", ...ADDRESS },
    { id: "googleMapsLink", label: "Google Map Link", ...ADDRESS },
    { id: "gmbProfileUrl", label: "Google My Business Link", ...ADDRESS },
  ]},
  { id: "gst", title: "GST & Statutory", fields: [
    { id: "gstNumber", label: "GST Number" },
    { id: "panNumber", label: "PAN Number" },
    { id: "gstDocument", label: "GST Document", type: "file" },
    { id: "panDocument", label: "PAN Document", type: "file" },
    { id: "gstAddress", label: "GST Address" },
  ]},
  { id: "others", title: "Status & Notes", fields: [
    { id: "status", label: "Status" },
    { id: "blacklisted", label: "Is Blacklisted" },
    { id: "note", label: "Note" },
  ]},
];

const BUILTIN_IDS = new Set(COMPANY_BUILTIN_SECTIONS.map((s) => s.id));

const toField = (f: BuiltinField): IFormField => ({
  id: f.id,
  label: f.label,
  type: f.type ?? "text",
  required: !!f.required,
  isSystem: true,
  fixedType: true, // every built-in has its own widget
  fixedSection: f.fixedSection,
  essential: f.essential,
});

export const cloneCompanyDefaults = (): IFormSection[] =>
  COMPANY_BUILTIN_SECTIONS.map((s) => ({ id: s.id, title: s.title, isSystem: true, fields: s.fields.map(toField) }));

// Merge a company's saved sectionConfig onto the built-in defaults. Saved order, section
// titles, custom fields/sections AND the admin's edits to built-ins (label, required,
// hidden, info-page, section) are kept; type and the constraint flags always come from
// the defaults, so a stale or hand-edited config can't unlock a bespoke widget.
export function mergeCompanySchema(saved: unknown): IFormSection[] {
  const defaults = cloneCompanyDefaults();
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
        fields.push({ ...f, isSystem: false, value: f.value ?? "" });
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

  // Built-in sections/fields the saved config predates go back to their default home.
  defaults.forEach((d) => {
    let target = result.find((s) => s.id === d.id);
    if (!target) result.push((target = { ...d, fields: [] }));
    d.fields.forEach((f) => !placed.has(f.id) && target!.fields.push(f));
  });

  return result;
}

export { BUILTIN_IDS };
