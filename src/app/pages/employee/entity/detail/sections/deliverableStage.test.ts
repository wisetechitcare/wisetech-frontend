import { describe, expect, it } from "vitest";
import { stageState } from "./deliverableStage";

const done = { taskStatus: { id: "s1", name: "Task Completed", color: null, isFinal: true } };
const busy = { taskStatus: { id: "s2", name: "Task In Progress", color: null, isFinal: false } };
const none = { taskStatus: null };

describe("stageState", () => {
  it("follows its deliverables' tasks", () => {
    expect(stageState([])).toBe("empty");
    expect(stageState([none, none])).toBe("notStarted");
    expect(stageState([busy, none])).toBe("inProgress");
    expect(stageState([done, none])).toBe("inProgress");
    expect(stageState([done, done])).toBe("completed");
  });
});
