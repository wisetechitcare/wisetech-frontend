import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, ToneChip, toast } from "@app/modules/common/components/ui";
import {
  updateOperationStatus,
  setProjectBillingFields,
  type BillingOperationStatus,
  type ProjectBillingPatch,
  type ProjectOverviewRow,
} from "@services/billingOperations";
import { BillingStatusBadge, useBillingLabels, BILLING_LABEL_GROUP } from "../components";

/**
 * The Billing Tracker's three editable workflow columns.
 *
 * Stage, Status and Bill Payment are the Configure catalogue's three groups —
 * Payment Stage, Billing Status and Bill Payment Status — so every chip and every
 * menu entry here is rendered by code through `BillingStatusBadge`, and renaming or
 * recolouring one in Billing → Configure changes it in all of them at once.
 *
 * EACH COLUMN HAS A REAL SOURCE AND A HAND-SET FALLBACK, and the real one always
 * wins. Status: a billing operation. Stage: the operation's, else derived from the
 * status. Bill Payment: arithmetic over what has been collected against an issued
 * bill. The hand-set value only fills the gap while the Billing module has no data
 * for this project, and the server refuses to write it once it does — so the two
 * can never both be read, and the sheet cannot contradict the ledger.
 *
 * WHY EDITABLE HERE AT ALL: with no approved billing requests yet, every row is
 * "Not billed" and the sheet cannot be worked. These dropdowns are how it gets
 * filled in until the project billing page takes over.
 */

/** Menu value for "clear it" — not a code, so it cannot collide with one. */
const CLEAR = "__CLEAR__";

// ─── the shared control ──────────────────────────────────────────────────────

interface EditableChipProps {
  /** The code to display, or null for the placeholder. */
  value: string | null;
  /** Shown when there is no value — "Not billed", "—". */
  placeholder: string;
  choices: Array<{ value: string; label: string }>;
  /** Configure's DEFAULT for this group: highlighted when nothing is set yet. */
  defaultCode?: string;
  /** Menu heading, e.g. "SET STATUS". */
  heading: string;
  /** What the chip means, and why it can or cannot be changed. */
  hint: string;
  /** Label for the entry that clears the value. Omitted = not clearable. */
  clearLabel?: string;
  /** True when a real source owns this column, so it is read-only. */
  locked: boolean;
  busy: boolean;
  onPick: (value: string | null) => void;
}

const EditableChip: React.FC<EditableChipProps> = ({
  value, placeholder, choices, defaultCode, heading, hint, clearLabel, locked, busy, onPick,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const editable = !locked && choices.length > 0;

  // The row navigates to the project on click. Every control here has to stop
  // that, or picking a value also leaves the page you picked it on.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  // Nothing set yet: point at Configure's default so the common choice is one
  // click away. Highlighting only — it is never applied on its own.
  const highlighted = value ?? defaultCode;

  return (
    <>
      <Tooltip title={hint} placement="top">
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          onClick={(e) => {
            stop(e);
            if (editable) setAnchor(e.currentTarget);
          }}
          sx={{
            minWidth: 0,
            width: "fit-content",
            cursor: editable ? "pointer" : "default",
            borderRadius: "8px",
            px: editable ? 0.5 : 0,
            mx: editable ? -0.5 : 0,
            "&:hover": editable ? { backgroundColor: "action.hover" } : undefined,
          }}
        >
          {value ? (
            <BillingStatusBadge status={value} />
          ) : (
            <ToneChip tone="neutral" label={placeholder} dense />
          )}
          {editable && <KTIcon iconName="down" className="fs-8 text-muted" />}
        </Stack>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={stop}
        slotProps={{ paper: { sx: { minWidth: 210, maxHeight: 380, borderRadius: "12px" } } }}
      >
        <Typography sx={{ px: 1.75, py: 0.75, fontSize: 11, fontWeight: 700, color: "text.secondary" }}>
          {heading}
        </Typography>
        {choices.map((choice) => (
          <MenuItem
            key={choice.value}
            onClick={() => { setAnchor(null); onPick(choice.value); }}
            disabled={busy}
            selected={choice.value === highlighted}
            sx={{ py: 0.75 }}
          >
            <BillingStatusBadge status={choice.value} />
          </MenuItem>
        ))}
        {clearLabel && value && (
          <MenuItem
            onClick={() => { setAnchor(null); onPick(null); }}
            disabled={busy}
            sx={{ py: 0.75 }}
          >
            <ToneChip tone="neutral" label={clearLabel} dense />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

/**
 * The write, shared by all three columns.
 *
 * One PATCH per change, carrying only the field that changed — the server leaves
 * an omitted key alone, so setting the stage cannot blank the status. The row is
 * refetched rather than patched in place because stage, the bill and every money
 * column are downstream of what was just set.
 */
const useTrackerPatch = (leadId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProjectBillingPatch) => setProjectBillingFields(leadId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing-project-overview"] }),
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not save that" }),
  });
};

// ─── Status ──────────────────────────────────────────────────────────────────

/** The server refuses these two without a reason; the UI asks rather than letting it 400. */
const NEEDS_REASON: BillingOperationStatus[] = ["ON_HOLD", "CANCELLED"];

export const TrackerStatusCell: React.FC<{ row: ProjectOverviewRow }> = ({ row }) => {
  const labels = useBillingLabels();
  const queryClient = useQueryClient();
  const patch = useTrackerPatch(row.leadId);

  const [pending, setPending] = useState<BillingOperationStatus | null>(null);
  const [reason, setReason] = useState("");

  const { operationId, status, allowedTransitions, statusSource } = row;
  const workflowOwned = statusSource === "OPERATION" && !!operationId;

  // A workflow row offers its legal moves; a row the Billing module has not
  // reached offers the whole configured list, because it is not mid-anything.
  const choices = workflowOwned
    ? allowedTransitions.map((code) => ({ value: code, label: labels.label(code) }))
    : labels.options(BILLING_LABEL_GROUP.STATUS);

  const transition = useMutation({
    mutationFn: (input: { status: BillingOperationStatus; reason: string }) =>
      updateOperationStatus(operationId!, { status: input.status, reason: input.reason }),
    onSuccess: (_data, input) => {
      toast({ icon: "success", title: `Moved to ${labels.label(input.status)}` });
      setPending(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["billing-project-overview"] });
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the status" }),
  });

  const pick = (value: string | null) => {
    if (!workflowOwned) {
      patch.mutate({ status: value as BillingOperationStatus | null });
      return;
    }
    const next = value as BillingOperationStatus;
    // The reason is a WORKFLOW rule — the server demands one for a real hold or
    // cancellation. A hand-set row has no operation to explain, so it just saves.
    if (NEEDS_REASON.includes(next)) {
      setPending(next);
      return;
    }
    transition.mutate({ status: next, reason: "" });
  };

  const hint = workflowOwned
    ? "Billed through an approved request — only the moves its workflow allows are offered."
    : status
      ? "Set on the tracker. The real status takes over once this project is billed through an approved request."
      : "Nothing billed against this project yet. Pick a status to track it here.";

  return (
    <>
      <EditableChip
        value={status}
        placeholder="Not billed"
        choices={choices}
        defaultCode={labels.defaultCode(BILLING_LABEL_GROUP.STATUS)}
        heading={workflowOwned ? "MOVE TO" : "SET STATUS"}
        hint={hint}
        clearLabel={workflowOwned ? undefined : "Not billed"}
        locked={false}
        busy={patch.isPending || transition.isPending}
        onPick={pick}
      />

      <GlassDialog
        open={!!pending}
        onClose={() => { setPending(null); setReason(""); }}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth
        header={
          <GlassHeader
            title={pending === "CANCELLED" ? "Cancel this billing" : "Put this billing on hold"}
            subtitle={row.projectNumber ?? row.projectName ?? undefined}
            onClose={() => { setPending(null); setReason(""); }}
          />
        }
      >
        <Box sx={{ p: 2.5 }}>
          <TextField
            autoFocus fullWidth multiline minRows={3} size="small" label="Reason"
            placeholder={
              pending === "CANCELLED" ? "Why is this being cancelled?" : "Why is this going on hold?"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 1 }}>
            This is recorded on the operation's activity trail, so whoever picks the row up next
            can see why it stopped.
          </Typography>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            <WtButton ghost size="small" onClick={() => { setPending(null); setReason(""); }}>
              Cancel
            </WtButton>
            <WtButton
              size="small"
              tone={pending === "CANCELLED" ? "danger" : "primary"}
              disabled={!reason.trim() || transition.isPending}
              onClick={() => transition.mutate({ status: pending!, reason: reason.trim() })}
            >
              {pending === "CANCELLED" ? "Cancel billing" : "Put on hold"}
            </WtButton>
          </Stack>
        </Box>
      </GlassDialog>
    </>
  );
};

// ─── Stage ───────────────────────────────────────────────────────────────────

export const TrackerStageCell: React.FC<{ row: ProjectOverviewRow }> = ({ row }) => {
  const labels = useBillingLabels();
  const patch = useTrackerPatch(row.leadId);
  const { stage, stageSource } = row;
  const locked = stageSource === "OPERATION";

  const hint = locked
    ? "Billed through an approved request — the stage follows the operation's status and cannot be set here."
    : stageSource === "MANUAL"
      ? "Set on the tracker, so it no longer follows the status. Clear it to go back to following."
      : "Follows the status through the four bands. Set one here to override that.";

  return (
    <EditableChip
      value={stage}
      placeholder="Not billed"
      choices={labels.options(BILLING_LABEL_GROUP.STAGE)}
      defaultCode={labels.defaultCode(BILLING_LABEL_GROUP.STAGE)}
      heading="SET STAGE"
      hint={hint}
      // Clearing does not blank the column — it returns it to following the
      // status, which is what the label has to say or the entry reads as "delete".
      clearLabel={stageSource === "MANUAL" ? "Follow the status" : undefined}
      locked={locked}
      busy={patch.isPending}
      onPick={(value) => patch.mutate({ stage: value as ProjectBillingPatch["stage"] })}
    />
  );
};

// ─── Bill Payment ────────────────────────────────────────────────────────────

export const TrackerBillPaymentCell: React.FC<{ row: ProjectOverviewRow }> = ({ row }) => {
  const labels = useBillingLabels();
  const patch = useTrackerPatch(row.leadId);
  const { billPaymentStatus, billPaymentSource } = row;
  const locked = billPaymentSource === "BILL";

  const hint = locked
    ? "Counted from what has been collected against the issued bill, so it is not set by hand."
    : billPaymentSource === "MANUAL"
      ? "Set on the tracker. Once a bill is issued, the amount actually collected takes over."
      : "No bill issued yet. Pick a state to track it here.";

  return (
    <EditableChip
      value={billPaymentStatus}
      placeholder="—"
      choices={labels.options(BILLING_LABEL_GROUP.BILL_PAYMENT)}
      defaultCode={labels.defaultCode(BILLING_LABEL_GROUP.BILL_PAYMENT)}
      heading="SET BILL PAYMENT"
      hint={hint}
      clearLabel={billPaymentSource === "MANUAL" ? "Clear" : undefined}
      locked={locked}
      busy={patch.isPending}
      onPick={(value) =>
        patch.mutate({ billPaymentStatus: value as ProjectBillingPatch["billPaymentStatus"] })
      }
    />
  );
};
