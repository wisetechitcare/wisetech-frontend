import { describe, expect, it } from "vitest";
import { cloneSubCompanyDefaults, mergeSubCompanySchema } from "./subCompanyFormSchema";

describe("subCompanyFormSchema", () => {
  it("defaults carry the name as an essential, required built-in", () => {
    const name = cloneSubCompanyDefaults()[0].fields.find((f) => f.id === "subCompanyName");
    expect(name).toMatchObject({ isSystem: true, required: true, essential: true });
  });

  it("keeps a saved custom field and re-adds a missing built-in", () => {
    const saved = cloneSubCompanyDefaults().map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== "fax") }));
    saved[1].fields.push({ id: "custom-1", label: "Udyam No", type: "text", required: true, isSystem: false, value: "UD-1" });

    const contact = mergeSubCompanySchema(JSON.parse(JSON.stringify(saved))).find((s) => s.id === "contact")!;
    expect(contact.fields.find((f) => f.id === "custom-1")).toMatchObject({ isSystem: false, value: "UD-1", required: true });
    expect(contact.fields.at(-1)?.id).toBe("fax");
  });

  it("shows each built-in by what its widget takes, and a saved config cannot relabel it", () => {
    const field = (secs: ReturnType<typeof cloneSubCompanyDefaults>, id: string) =>
      secs.flatMap((s) => s.fields).find((f) => f.id === id);
    const defaults = cloneSubCompanyDefaults();
    expect(field(defaults, "phone")?.inputKind).toBe("phone");
    expect(field(defaults, "blacklisted")?.inputKind).toBe("toggle");
    expect(field(defaults, "services")?.inputKind).toBe("multiSelect");
    const saved = defaults.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f, inputKind: "text" as const })) }));
    expect(field(mergeSubCompanySchema(saved), "phone")?.inputKind).toBe("phone");
  });
});
