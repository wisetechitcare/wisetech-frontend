import { createBuiltinSchema, type BuiltinSection } from "@app/modules/common/components/FormSchemaManager/builtinSchema";

// ─── Client Branch form: built-in sections & fields ────────────────────────────
// Ids are the Formik names CompaniesBranchForm's `renderBuiltin` switches on.

// Rendered inside the smart address picker as one unit, so they stay in Address.
const ADDRESS = { fixedSection: true } as const;

export const BRANCH_BUILTIN_SECTIONS: BuiltinSection[] = [
  { id: "details", title: "Branch", fields: [
    { id: "companyId", input: "select", label: "Choose Company", required: true, essential: true },
    { id: "name", input: "text", label: "Branch Name", required: true, essential: true },
    { id: "type", input: "select", label: "Type" },
    { id: "contactId", input: "select", label: "Contact Person" },
  ]},
  { id: "contact", title: "Contact Details", fields: [
    { id: "phone", input: "phone", label: "Phone" },
    { id: "phone2", input: "phone", label: "Phone 2" },
    { id: "email", input: "email", label: "Email" },
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
    { id: "googleMapLink", input: "url", label: "Google Map Link", ...ADDRESS },
    { id: "gmbLink", input: "url", label: "Google My Business Link", ...ADDRESS },
  ]},
];

const branchSchema = createBuiltinSchema(BRANCH_BUILTIN_SECTIONS);
export const cloneBranchDefaults = branchSchema.cloneDefaults;
export const mergeBranchSchema = branchSchema.mergeSchema;
