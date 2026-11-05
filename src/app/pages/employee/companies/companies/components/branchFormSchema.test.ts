import { describe, expect, it } from "vitest";
import { cloneBranchDefaults, mergeBranchSchema } from "./branchFormSchema";

describe("branchFormSchema", () => {
  it("defaults carry the branch name as a required, essential built-in", () => {
    const name = cloneBranchDefaults()[0].fields.find((f) => f.id === "name");
    expect(name).toMatchObject({ isSystem: true, required: true, essential: true });
  });

  it("keeps a saved custom field and re-adds a built-in the saved config lacks", () => {
    const saved = cloneBranchDefaults();
    const contact = saved.find((s) => s.id === "contact")!;
    contact.fields = contact.fields.filter((f) => f.id !== "phone2");
    contact.fields.push({ id: "custom-1", label: "Extension", type: "text", isSystem: false, required: false, value: "42" });

    const merged = mergeBranchSchema(JSON.parse(JSON.stringify(saved)));
    const ids = merged.find((s) => s.id === "contact")!.fields.map((f) => f.id);
    expect(ids).toEqual(["phone", "email", "custom-1", "phone2"]);
    expect(merged.find((s) => s.id === "contact")!.fields[2]).toMatchObject({ isSystem: false, value: "42" });
  });
});
