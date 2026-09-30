import type { BoardStage } from "@services/projectExecution";

export type StageState = "completed" | "inProgress" | "notStarted" | "empty";

/**
 * A stage's state, from its deliverables:
 *   empty       no deliverables;
 *   completed   the stage is at 100% (every deliverable done);
 *   inProgress  some progress, or a task already exists for a deliverable;
 *   notStarted  deliverables exist but no work has begun.
 */
export const stageState = (stage: Pick<BoardStage, "progress" | "deliverables">): StageState => {
  if (stage.deliverables.length === 0) return "empty";
  if (stage.progress >= 100) return "completed";
  if (stage.progress > 0 || stage.deliverables.some((d) => d.taskStatus)) return "inProgress";
  return "notStarted";
};
