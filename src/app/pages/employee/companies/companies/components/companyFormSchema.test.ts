import { describe, expect, it } from "vitest";
import { cloneCompanyDefaults, mergeCompanySchema } from "./companyFormSchema";

const field = (sections: ReturnType<typeof mergeCompanySchema>, id: string) => {
  for (const s of sections) {
    const f = s.fields.find((x) => x.id === id);
    if (f) return { section: s.id, field: f, index: s.fields.indexOf(f) };
  }
  throw new Error(`no field ${id}`);
};

describe("mergeCompanySchema", () => {
  it("keeps admin edits to built-ins: label, required, hidden, order, section", () => {
    const saved = cloneCompanyDefaults();
    const contact = saved.find((s) => s.id === "contact_details")!;
    const gst = saved.find((s) => s.id === "gst")!;
    const fax = contact.fields.find((f) => f.id === "fax")!;
    Object.assign(fax, { label: "Fax No.", required: true });
    contact.fields.find((f) => f.id === "website")!.hidden = true;
    // Move email to the front and into the GST section.
    const email = contact.fields.splice(contact.fields.findIndex((f) => f.id === "email"), 1)[0];
    gst.fields.unshift(email);

    const merged = mergeCompanySchema(JSON.parse(JSON.stringify(saved)));
    expect(field(merged, "fax").field).toMatchObject({ label: "Fax No.", required: true });
    expect(field(merged, "website").field.hidden).toBe(true);
    expect(field(merged, "email")).toMatchObject({ section: "gst", index: 0 });
  });

  it("ignores pre-editable configs (no fixedType stamp) and uses today's defaults", () => {
    const legacy = [{ id: "gst", title: "GST", isSystem: true, fields: [
      { id: "gstDocument", label: "GST Document", type: "file", isSystem: true, required: false },
      { id: "gstNumber", label: "GST Number", type: "text", isSystem: true, required: false },
      { id: "custom-1", label: "Udyam No", type: "text", isSystem: false, required: false },
    ]}];
    const gst = mergeCompanySchema(legacy).find((s) => s.id === "gst")!;
    expect(gst.title).toBe("GST");
    expect(gst.fields.map((f) => f.id)).toEqual(["gstNumber", "panNumber", "gstDocument", "panDocument", "gstAddress", "custom-1"]);
  });

  it("never lets a saved config unlock constraints", () => {
    const saved = cloneCompanyDefaults();
    const name = saved[0].fields.find((f) => f.id === "companyName")!;
    Object.assign(name, { required: false, hidden: true, fixedType: true });
    // Address parts can't leave the picker: a saved copy elsewhere is dropped and re-homed.
    const country = saved.find((s) => s.id === "address")!.fields.find((f) => f.id === "country")!;
    saved.find((s) => s.id === "address")!.fields = saved.find((s) => s.id === "address")!.fields.filter((f) => f.id !== "country");
    saved.find((s) => s.id === "gst")!.fields.push({ ...country, fixedSection: false });

    const merged = mergeCompanySchema(saved);
    expect(field(merged, "companyName").field).toMatchObject({ required: true, hidden: false, essential: true });
    expect(field(merged, "country")).toMatchObject({ section: "address", field: { fixedSection: true } });
  });

  it("re-adds built-ins a saved config predates", () => {
    const saved = cloneCompanyDefaults().map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== "blacklisted") }));
    expect(field(mergeCompanySchema(saved), "blacklisted").section).toBe("others");
  });
});
