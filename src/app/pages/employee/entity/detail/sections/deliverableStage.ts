import type { PaymentPlanStageDeliverable } from "@models/leads";

export type StageState = "completed" | "inProgress" | "notStarted" | "empty";

/**
 * A stage's state, from its deliverables' task statuses:
 *   empty       no deliverables configured;
 *   completed   every deliverable's task is in a FINAL status (TaskStatus.isFinal);
 *   inProgress  at least one deliverable has a task;
 *   notStarted  deliverables exist but none has a task yet.
 */
export const stageState = (rows: Pick<PaymentPlanStageDeliverable, "taskStatus">[]): StageState => {
  if (rows.length === 0) return "empty";
  if (rows.every((d) => d.taskStatus?.isFinal)) return "completed";
  if (rows.some((d) => d.taskStatus)) return "inProgress";
  return "notStarted";
};
