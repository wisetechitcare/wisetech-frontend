import { describe, expect, it } from "vitest";
import type { PersonRef } from "./types";
import { driveGroupIds, uniquePeopleCount } from "./types";

const p = (personId: string, fullName = personId, memberType: PersonRef["memberType"] = "EMPLOYEE"): PersonRef => ({
  memberType,
  personId,
  fullName,
});

describe("uniquePeopleCount", () => {
  it("counts someone in two groups once", () => {
    expect(uniquePeopleCount([[p("mustafa"), p("asha")], [p("mustafa"), p("ravi")]])).toBe(3);
  });
  it("an individual already in a group adds nobody", () => {
    expect(uniquePeopleCount([[p("mustafa")]], [p("mustafa"), p("zoya")])).toBe(2);
  });
  it("uses the database id, not the name", () => {
    expect(uniquePeopleCount([[p("e1", "Mohd Mobeen"), p("e2", "Mohd Mobeen")]])).toBe(2);
    expect(uniquePeopleCount([[p("7", "A", "EMPLOYEE")], [p("7", "A", "CONTACT")]])).toBe(2);
  });
});

describe("driveGroupIds", () => {
  it("lists every linked group, falling back to the primary for older payloads", () => {
    expect(driveGroupIds({ sourceGroupId: "g1", groupIds: ["g1", "g2"] })).toEqual(["g1", "g2"]);
    expect(driveGroupIds({ sourceGroupId: "g1" })).toEqual(["g1"]);
  });
});
