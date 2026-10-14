import { describe, expect, it } from "vitest";
import { stageState } from "./deliverableStage";

const row = (taskStatus: boolean) => ({
  taskStatus: taskStatus ? { id: "s", name: "Task In Progress", color: null, isFinal: false } : null,
}) as any;

describe("stageState", () => {
  it("follows the stage's progress and tasks", () => {
    expect(stageState({ progress: 0, deliverables: [] })).toBe("empty");
    expect(stageState({ progress: 0, deliverables: [row(false), row(false)] })).toBe("notStarted");
    expect(stageState({ progress: 0, deliverables: [row(true), row(false)] })).toBe("inProgress");
    expect(stageState({ progress: 33, deliverables: [row(false)] })).toBe("inProgress");
    expect(stageState({ progress: 100, deliverables: [row(true)] })).toBe("completed");
  });
});
