import { useState } from "react";

import dayjs from "dayjs";
import { IReimbursementsUpdate } from "@models/employee";
import { updateReimbursementById } from "@services/employee";
import { successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import ResubmitConfirmDialog from "./ResubmitConfirmDialog";
import EditBanner, { type EditContext } from "./EditBanner";
import { previewResubmission, type ResubmissionPreview } from "@services/reimbursementVersions";
import { ReimbursementFormDialog, type ReimbursementFormValues } from "./ReimbursementFormDialog";

// The schema lives in utils/reimbursementSchema — this file used to carry a third copy
// that made every field optional, so the admin edit path could clear values the other
// two entry points insist on.

interface Props {
  show: boolean;
  onHide: () => void;
  reimbursement: IReimbursementsUpdate | null;
  onSaved: () => void;
  /** Why this edit is happening — rejection or query. Shown as a banner above the form. */
  editContext?: { type: EditContext; reason?: string; queryText?: string; level?: number };
}

function ReimbursementEditModal({ show, onHide, reimbursement, onSaved, editContext }: Props) {
  const [loading, setLoading] = useState(false);

  // Editing a SUBMITTED claim is a resubmission: it creates a new version and restarts approval
  // from level 1. The employee is shown exactly what is changing and what that costs before it
  // happens — the diff comes from the server, so what they confirm is what the write will do.
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<ResubmissionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);


  const cleanValues = (values: any) => Object.fromEntries(
    Object.entries(values).filter(([key, value]) => {
      if (["employee", "employeeId", "reimbursementType", "type", "day", "isActive", "status"].includes(key)) return false;
      if (key === "amount") return true;
      return value !== "";
    }),
  );

  /**
   * Step one: ask the server what this edit would do. Nothing is written yet.
   *
   * An unsubmitted claim has no approvals to lose, so it saves straight through — the
   * confirmation only earns its interruption when there is something at stake.
   */
  const handleSubmit = async (values: any) => {
    if (!reimbursement?.id) return;
    const cleaned = cleanValues(values);

    if (!(reimbursement as any).batchId) {
      await commit(cleaned);
      return;
    }

    setPending(cleaned);
    setPreviewLoading(true);
    try {
      setPreview(await previewResubmission(reimbursement.id.toString(), cleaned));
    } catch {
      // A preview that cannot be computed must not block the edit — fall back to committing,
      // where the server applies the same rule anyway.
      setPreview(null);
      await commit(cleaned);
      setPending(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  /** Step two: the write. The server decides again whether this versions and restarts. */
  const commit = async (cleaned: Record<string, unknown>) => {
    if (!reimbursement?.id) return;
    setLoading(true);
    try {
      const res: any = await updateReimbursementById(reimbursement.id.toString(), cleaned);
      // The server says which it was — "Resubmitted as version 2. Approval has restarted from
      // level 1." or "Nothing about the claim changed". Echoing it avoids a second, drifting copy
      // of the rule on the client.
      successConfirmation(res?.message ?? "Reimbursement updated.");
      eventBus.emit("reimbursementRecords", { records: [] });
      onSaved();
      onHide();
    } catch {
      // error handled by axios interceptor
    } finally {
      setLoading(false);
      setPending(null);
      setPreview(null);
    }
  };

  if (!reimbursement) return null;

  const initialValues: ReimbursementFormValues = {
    expenseDate: reimbursement.expenseDate
      ? dayjs(reimbursement.expenseDate).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    clientTypeId: reimbursement.clientTypeId || "",
    clientCompanyId: reimbursement.clientCompanyId || "",
    // Lead-as-master: batch-created rows carry leadId and a NULL projectId, so seeding from
    // projectId alone blanked the project every time this modal opened on a submitted row.
    projectId: (reimbursement as any).leadId || reimbursement.projectId || "",
    reimbursementTypeId: reimbursement.reimbursementTypeId || "",
    fromLocation: reimbursement.fromLocation || "",
    toLocation: reimbursement.toLocation || "",
    amount: (reimbursement.amount ?? undefined) as number | undefined,
    document: reimbursement.document || "",
    description: reimbursement.description || "",
  };

  return (
    <>
      <ReimbursementFormDialog
        open={show}
        onOpenChange={(next) => { if (!next) onHide(); }}
        mode="edit"
        title="Edit reimbursement request"
        record={reimbursement as any}
        initialValues={initialValues}
        // Same window as a new request: an edit cannot move an expense into a past month or the future.
        minDate={dayjs().startOf("month").format("YYYY-MM-DD")}
        maxDate={dayjs().format("YYYY-MM-DD")}
        submitLabel="Save changes"
        submitting={loading || previewLoading}
        onSubmit={handleSubmit}
        banner={editContext && editContext.type !== "edit" ? (
          <EditBanner
            context={editContext.type}
            rejectionReason={editContext.reason}
            queryText={editContext.queryText}
            level={editContext.level}
          />
        ) : undefined}
      />

      {/* Shown only for a claim that is already in the workflow — an unsubmitted one has no
          approvals to lose, so it saves straight through. */}
      <ResubmitConfirmDialog
        open={!!pending}
        preview={preview}
        loading={previewLoading}
        submitting={loading}
        onCancel={() => { setPending(null); setPreview(null); }}
        onConfirm={() => { if (pending) commit(pending); }}
      />
    </>
  );
}

export default ReimbursementEditModal;
