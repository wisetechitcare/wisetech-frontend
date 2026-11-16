import { confirmDialog, toast } from "@app/modules/common/components/ui/feedback";
import { resetBuiltinStatus } from "@services/lead";

/**
 * Built-in statuses (Lead Status, Project Status, PO Status rows carrying a `code`)
 * work like Billing → Configure's status labels: rename / recolour, or restore the
 * default — never delete. The list's default status can't be deleted either.
 */
export type BuiltinStatusKind = "lead-status" | "project-status" | "po-status" | "referral-type";

/** What the chip's second action does for this row. */
export const statusRowAction = (row: { code?: string | null; isDefault?: boolean }): "reset" | "delete" | "none" =>
  row.code ? "reset" : row.isDefault ? "none" : "delete";

export const confirmAndResetStatus = async (
  kind: BuiltinStatusKind, row: { id?: string; name: string }, onDone: () => void,
) => {
  if (!row.id) return;
  const confirmed = await confirmDialog({
    icon: "warning",
    title: "Restore the default?",
    text: `"${row.name}" goes back to its default name and colour. The status stays — the system depends on it, so it can't be deleted.`,
    confirmText: "Restore Default",
  });
  if (!confirmed) return;
  try {
    await resetBuiltinStatus(kind, row.id);
    onDone();
  } catch (error: any) {
    toast({ icon: "error", title: error?.response?.data?.message ?? "Could not restore the default" });
  }
};
