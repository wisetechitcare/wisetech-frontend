/**
 * Display metadata for merge fields.
 *
 * Presentation only — it never decides what is editable. That comes from the
 * template's `fieldPolicy` on the server, so a field added to a template shows up
 * here automatically with a title-cased label rather than silently disappearing
 * from the panel.
 */

export interface FieldMeta {
  label: string;
  group: string;
  multiline?: boolean;
  hint?: string;
}

const GROUP_ORDER = ["Scope & Classification", "References", "Bank Details", "Signatory", "Details"];

const META: Record<string, FieldMeta> = {
  service_description: {
    label: "Scope of Service",
    group: "Scope & Classification",
    multiline: true,
    hint: "The Particular line printed above the SAC code.",
  },
  sac_code: { label: "SAC Code", group: "Scope & Classification" },
  sac_description: { label: "SAC Description", group: "Scope & Classification" },
  subtotal_label: { label: "Subtotal Label", group: "Scope & Classification" },

  work_order_no: { label: "Work Order No.", group: "References", hint: "The client's PO / work order reference." },
  work_order_date: { label: "Work Order Dated", group: "References" },
  our_ref_no: { label: "Our Ref. No", group: "References" },
  ref_date: { label: "Ref. Dated", group: "References" },

  bank_account_name: { label: "Account Name", group: "Bank Details" },
  bank_account_number: { label: "Bank Account Number", group: "Bank Details" },
  bank_name: { label: "Bank Name", group: "Bank Details", multiline: true },
  bank_ifsc: { label: "Bank IFSC Code", group: "Bank Details" },
  bank_branch: { label: "Branch", group: "Bank Details" },

  signatory_line: { label: "Signed For", group: "Signatory", hint: 'Prints above the stamp, e.g. "For …Pvt. Ltd."' },
};

const titleCase = (key: string) =>
  key.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

export const fieldMeta = (key: string): FieldMeta =>
  META[key] ?? { label: titleCase(key), group: "Details" };

/** Editable keys bucketed into their panel sections, in a stable printed order. */
export const groupFields = (keys: string[]): { group: string; fields: string[] }[] => {
  const buckets = new Map<string, string[]>();
  for (const key of keys) {
    const { group } = fieldMeta(key);
    buckets.set(group, [...(buckets.get(group) ?? []), key]);
  }
  return [...buckets.entries()]
    .sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a[0]);
      const bi = GROUP_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([group, fields]) => ({ group, fields }));
};
