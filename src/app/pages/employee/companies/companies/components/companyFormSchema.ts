import { IFormSection, FormFieldType } from "@models/company";

// ─── CRM Company form: built-in sections & fields ──────────────────────────────
// These mirror the company Add/Edit form's hardcoded built-in fields so they show
// up (read-only) in the FormSchemaManager — admins can see the existing structure,
// rename sections, and add their own custom sections/fields. The built-in fields
// themselves are rendered by the form; the manager lists them for reference.
interface BuiltinField { id: string; label: string; type?: FormFieldType }
interface BuiltinSection { id: string; title: string; fields: BuiltinField[] }

export const COMPANY_BUILTIN_SECTIONS: BuiltinSection[] = [
  { id: "project_details", title: "PROJECT DETAILS", fields: [
    { id: "companyName", label: "Company Name" },
    { id: "companyTypes", label: "Company Type" },
    { id: "services", label: "Services" },
  ]},
  { id: "references", title: "REFERENCES", fields: [
    { id: "references", label: "References" },
  ]},
  { id: "contact_details", title: "CONTACT DETAILS", fields: [
    { id: "phone", label: "Phone" },
    { id: "phone2", label: "Phone 2" },
    { id: "fax", label: "FAX" },
    { id: "email", label: "Email" },
    { id: "website", label: "Website" },
  ]},
  { id: "address", title: "ADDRESS", fields: [
    { id: "addressLine1", label: "Address" },
    { id: "country", label: "Country" },
    { id: "state", label: "State" },
    { id: "city", label: "City" },
    { id: "area", label: "Locality" },
    { id: "zipCode", label: "Zip Code" },
    { id: "googleMapsLink", label: "Google Map Link" },
    { id: "gmbProfileUrl", label: "Google Business Link" },
    { id: "latitude", label: "Latitude" },
    { id: "longitude", label: "Longitude" },
  ]},
  { id: "gst", title: "GST & STATUTORY DETAILS", fields: [
    { id: "gstNumber", label: "GST Number" },
    { id: "gstDocument", label: "GST Document", type: "file" },
    { id: "panNumber", label: "PAN Number" },
    { id: "panDocument", label: "PAN Document", type: "file" },
    { id: "gstAddress", label: "GST Address" },
  ]},
  { id: "others", title: "OTHERS", fields: [
    { id: "status", label: "Status" },
    { id: "note", label: "Note" },
  ]},
];

const BUILTIN_IDS = new Set(COMPANY_BUILTIN_SECTIONS.map((s) => s.id));

export const cloneCompanyDefaults = (): IFormSection[] =>
  COMPANY_BUILTIN_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    isSystem: true,
    fields: s.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: (f.type ?? "text") as FormFieldType,
      required: false,
      isSystem: true,
    })),
  }));

// Merge a company's saved sectionConfig onto the built-in defaults: built-in system
// fields always come from the defaults; saved order, section titles and admin-added
// custom fields/sections are preserved.
export function mergeCompanySchema(saved: unknown): IFormSection[] {
  const defaults = cloneCompanyDefaults();
  if (!Array.isArray(saved) || saved.length === 0) return defaults;

  const result: IFormSection[] = [];
  const usedSaved = new Set<string>();

  saved.forEach((sec: any) => {
    usedSaved.add(sec.id);
    const def = defaults.find((d) => d.id === sec.id);
    const customFields = (sec.fields || [])
      .filter((f: any) => !f.isSystem)
      .map((f: any) => ({ ...f, isSystem: false, value: f.value ?? "" }));

    if (def) {
      // Built-in section: keep the canonical system fields, append saved custom fields.
      result.push({
        ...def,
        title: sec.title || def.title,
        showOnInfoPage: sec.showOnInfoPage,
        fields: [...def.fields, ...customFields],
      });
    } else {
      // Admin-created custom section.
      result.push({
        id: sec.id,
        title: sec.title,
        isSystem: false,
        showOnInfoPage: sec.showOnInfoPage,
        fields: customFields,
      });
    }
  });

  // Append any built-in section the saved config didn't include yet.
  defaults.forEach((d) => {
    if (!usedSaved.has(d.id)) result.push(d);
  });

  return result;
}

export { BUILTIN_IDS };
