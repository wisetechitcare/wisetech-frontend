import { createBuiltinSchema, type BuiltinSection } from "@app/modules/common/components/FormSchemaManager/builtinSchema";

// ─── CRM Sub-company form: built-in sections & fields ──────────────────────────
// SubCompanyForm renders every field from this schema (see its `renderBuiltin`), the
// same way the Company form does. Ids are the Formik field names.

// Rendered inside the smart address picker as one unit, so they stay in Address.
const ADDRESS = { fixedSection: true } as const;

export const SUB_COMPANY_BUILTIN_SECTIONS: BuiltinSection[] = [
  { id: "details", title: "Sub-Company Details", fields: [
    { id: "subCompanyName", input: "text", label: "Company Name", required: true, essential: true },
    { id: "mainCompanyId", input: "select", label: "Parent Company", required: true, essential: true },
    { id: "subCompanyTypeId", input: "select", label: "Company Type" },
    { id: "services", input: "multiSelect", label: "Sub-services" },
  ]},
  { id: "contact", title: "Contact Details", fields: [
    { id: "phone", input: "phone", label: "Phone" },
    { id: "phone2", input: "phone", label: "Phone 2" },
    { id: "email", input: "email", label: "Email" },
    { id: "website", input: "url", label: "Website" },
    { id: "fax", input: "text", label: "FAX" },
  ]},
  { id: "address", title: "Address", fields: [
    // Same order as the address picker's own layout (ContactAddressSection).
    { id: "country", input: "select", label: "Country", ...ADDRESS },
    { id: "state", input: "select", label: "State", ...ADDRESS },
    { id: "city", input: "select", label: "City", ...ADDRESS },
    { id: "area", input: "text", label: "Locality", ...ADDRESS },
    { id: "zipCode", input: "text", label: "Pincode", ...ADDRESS },
    { id: "address", input: "text", label: "Formatted Address", ...ADDRESS },
    { id: "latitude", input: "coordinate", label: "Latitude", ...ADDRESS },
    { id: "longitude", input: "coordinate", label: "Longitude", ...ADDRESS },
    { id: "googleMapsLink", input: "url", label: "Google Map Link", ...ADDRESS },
    { id: "gmbProfileUrl", input: "url", label: "Google My Business Link", ...ADDRESS },
  ]},
  { id: "others", title: "Status & Notes", fields: [
    { id: "status", input: "select", label: "Status" },
    { id: "blacklisted", input: "toggle", label: "Is Blacklisted" },
    { id: "note", input: "longText", label: "Note" },
  ]},
];

const subCompanySchema = createBuiltinSchema(SUB_COMPANY_BUILTIN_SECTIONS);
export const cloneSubCompanyDefaults = subCompanySchema.cloneDefaults;
export const mergeSubCompanySchema = subCompanySchema.mergeSchema;
