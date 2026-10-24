import { describe, expect, it } from "vitest";
import type { PersonRef } from "../types";
import { pinNewlySelected } from "./personPickerUtils";

const person = (personId: string, memberType: PersonRef["memberType"] = "CONTACT"): PersonRef => ({
  personId,
  memberType,
  fullName: personId,
});

describe("pinNewlySelected", () => {
  it("keeps new people above search results without duplicating visible people", () => {
    expect(
      pinNewlySelected(
        [person("reza"), person("employee", "EMPLOYEE")],
        [person("aabsar"), person("reza")],
        "CONTACT",
      ).map((item) => item.personId),
    ).toEqual(["aabsar", "reza", "employee"]);
  });
});
