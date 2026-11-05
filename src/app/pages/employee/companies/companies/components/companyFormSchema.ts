import { createBuiltinSchema, type BuiltinSection } from "@app/modules/common/components/FormSchemaManager/builtinSchema";

// ─── CRM Company form: built-in sections & fields ──────────────────────────────
// The company wizard renders every field from this schema (see NewCompanyForm's
// `renderBuiltin`), so admins get the same control over built-ins as on the
// Organization form: rename, require, hide, reorder and move between sections.
// The flags below only fence off what a bespoke widget can't honour.

// Rendered inside the smart address picker as one unit, so they stay in Address.
const ADDRESS = { fixedSection: true } as const;

export const COMPANY_BUILTIN_SECTIONS: BuiltinSection[] = [
  { id: "project_details", title: "Company Profile", fields: [
    { id: "companyName", input: "text", label: "Company Name", required: true, essential: true },
    { id: "companyTypes", input: "multiSelect", label: "Company Type" },
    { id: "subTypes", input: "multiSelect", label: "Services" },
    { id: "services", input: "multiSelect", label: "Sub-services" },
  ]},
  { id: "references", title: "References", fields: [
    { id: "references", input: "referenceList", label: "References" },
  ]},
  { id: "contact_details", title: "Contact Details", fields: [
    { id: "phone", input: "phone", label: "Phone" },
    { id: "phone2", input: "phone", label: "Phone 2" },
    { id: "email", input: "email", label: "Email" },
    { id: "website", input: "url", label: "Website" },
    { id: "fax", input: "text", label: "Fax" },
  ]},
  { id: "address", title: "Address", fields: [
    // Same order as the address picker's own layout (ContactAddressSection).
    { id: "country", input: "select", label: "Country", ...ADDRESS },
    { id: "state", input: "select", label: "State", ...ADDRESS },
    { id: "city", input: "select", label: "City", ...ADDRESS },
    { id: "area", input: "text", label: "Locality", ...ADDRESS },
    { id: "zipCode", input: "text", label: "Pincode", ...ADDRESS },
    { id: "addressLine1", input: "text", label: "Formatted Address", ...ADDRESS },
    { id: "latitude", input: "coordinate", label: "Latitude", ...ADDRESS },
    { id: "longitude", input: "coordinate", label: "Longitude", ...ADDRESS },
    { id: "googleMapsLink", input: "url", label: "Google Map Link", ...ADDRESS },
    { id: "gmbProfileUrl", input: "url", label: "Google My Business Link", ...ADDRESS },
  ]},
  { id: "gst", title: "GST & Statutory", fields: [
    { id: "gstNumber", input: "text", label: "GST Number" },
    { id: "panNumber", input: "text", label: "PAN Number" },
    { id: "gstDocument", input: "file", label: "GST Document", type: "file" },
    { id: "panDocument", input: "file", label: "PAN Document", type: "file" },
    { id: "gstAddress", input: "text", label: "GST Address" },
  ]},
  { id: "others", title: "Status & Notes", fields: [
    { id: "status", input: "select", label: "Status" },
    { id: "blacklisted", input: "toggle", label: "Is Blacklisted" },
    { id: "note", input: "longText", label: "Note" },
  ]},
];

// The default + merge rule is shared with every schema-driven form (sub-company, branch…).
const companySchema = createBuiltinSchema(COMPANY_BUILTIN_SECTIONS);
export const cloneCompanyDefaults = companySchema.cloneDefaults;
export const mergeCompanySchema = companySchema.mergeSchema;
const BUILTIN_IDS = companySchema.BUILTIN_IDS;

export { BUILTIN_IDS };
