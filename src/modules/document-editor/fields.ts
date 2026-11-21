import type { DocumentProfile, FieldMeta } from "./types";

const titleCase = (key: string) =>
  key.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

/** A field the profile doesn't describe still shows: title-cased, under "Details". */
export const fieldMeta = (profile: DocumentProfile, key: string): FieldMeta =>
  profile.fields?.[key] ?? { label: titleCase(key), group: "Details" };

export const isSectionOff = (profile: DocumentProfile, values: Record<string, string>, key: string) => {
  const sw = profile.requiredSection?.[key];
  return !!sw && /^(no|false|off|0)$/i.test((values[sw] ?? "").trim());
};

/** Editable keys bucketed into their panel groups, in the profile's order. */
export const groupFields = (profile: DocumentProfile, keys: string[]): { group: string; fields: string[] }[] => {
  const order = profile.groupOrder ?? [];
  const rank = (group: string) => (order.indexOf(group) === -1 ? 99 : order.indexOf(group));
  const buckets = new Map<string, string[]>();
  for (const key of keys) {
    const { group } = fieldMeta(profile, key);
    buckets.set(group, [...(buckets.get(group) ?? []), key]);
  }
  return [...buckets.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([group, fields]) => ({ group, fields }));
};

export const groupIcon = (profile: DocumentProfile, group: string) => profile.groupIcons?.[group] ?? "setting-2";

export type AddressSource = "contact" | "company" | "project";

export const ADDRESS_SOURCE_LABELS: Record<AddressSource, string> = {
  contact: "Contact", company: "Company", project: "Project",
};

/** The candidate name+address pairs, read from the document's locked `source_*` reference data (a server-side convention). */
export const addressSourceOptions = (
  mergeData: Record<string, unknown>,
): Record<AddressSource, { name: string; address: string }> => ({
  contact: {
    name: String(mergeData.source_contact_name ?? ""),
    address: String(mergeData.source_contact_address ?? ""),
  },
  company: {
    name: String(mergeData.source_company_name ?? ""),
    address: String(mergeData.source_company_address ?? ""),
  },
  project: {
    name: String(mergeData.source_project_name ?? ""),
    address: String(mergeData.source_project_address ?? ""),
  },
});

/** Every person the "Contact" source can name; falls back to the single `source_contact_*` pair. */
export const contactSourceOptions = (mergeData: Record<string, unknown>): { name: string; address: string }[] => {
  const list = Array.isArray(mergeData.source_contacts)
    ? (mergeData.source_contacts as { name?: unknown; address?: unknown }[])
        .map((c) => ({ name: String(c.name ?? ""), address: String(c.address ?? "") }))
        .filter((c) => c.name.trim())
    : [];
  if (list.length) return list;
  const single = addressSourceOptions(mergeData).contact;
  return single.name.trim() ? [single] : [];
};

/** The addresses the "Company" source offers. */
export const companyAddressOptions = (mergeData: Record<string, unknown>): { label: string; address: string }[] =>
  Array.isArray(mergeData.source_company_addresses)
    ? (mergeData.source_company_addresses as { label?: unknown; address?: unknown }[])
        .map((a) => ({ label: String(a.label ?? ""), address: String(a.address ?? "") }))
        .filter((a) => a.address.trim())
    : [];

/** A company the "Company" source can bill — one per Contact Person company on the project (`source_parties`). */
export interface PartyOption {
  key: string;
  label: string;
  name: string;
  address: string;
  /** "" when the company has no GSTIN on record. */
  gstin: string;
  /** Both address variants, always in this order — `address` is "" when the company has none of that kind. */
  addresses: { label: string; address: string }[];
}

export const partyOptions = (mergeData: Record<string, unknown>): PartyOption[] =>
  Array.isArray(mergeData.source_parties)
    ? (mergeData.source_parties as Record<string, unknown>[])
        .map((p) => ({
          key: String(p.key ?? ""),
          label: String(p.label ?? p.name ?? ""),
          name: String(p.name ?? ""),
          address: String(p.address ?? ""),
          gstin: String(p.gstin ?? ""),
          // Not filtered: the panel shows both and disables the missing one, so it is clear which one prints.
          addresses: [
            { label: "GST Address", address: String(p.gst_address ?? "") },
            { label: "Company Address", address: String(p.company_address ?? "") },
          ],
        }))
        .filter((p) => p.key && p.name.trim())
    : [];

/**
 * Which source the field's current value matches, if any. There is no stored "selected source": it is derived
 * by matching text, so it stays right even when someone types a candidate's name back by hand.
 */
export const activeAddressSource = (
  currentName: string,
  options: Record<AddressSource, { name: string; address: string }>,
  contacts: { name: string }[] = [],
  companies: { name: string }[] = [],
): AddressSource | null => {
  const match = (Object.entries(options) as [AddressSource, { name: string }][])
    .find(([, v]) => v.name.trim() && v.name === currentName);
  if (match) return match[0];
  if (!currentName.trim()) return null;
  if (companies.some((c) => c.name === currentName)) return "company";
  return contacts.some((c) => c.name === currentName) ? "contact" : null;
};
