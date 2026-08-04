import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Checkbox, CircularProgress, DialogActions, DialogContent,
  MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, ToneChip, toast, alertDialog } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { getProjectStages } from "@services/projectExecution";
import {
  getBillableDeliverables, createBillingRequest, submitBillingRequest,
} from "@services/billingRequest";
import { apiErrorMessage } from "@utils/apiError";

const REMARKS_MAX = 2000;

/**
 * Raise a billing request for completed deliverables in one stage.
 *
 * Ineligible deliverables are shown greyed WITH the reason rather than hidden — "why
 * isn't Site Survey in the list?" is a worse experience than "Site Survey is not
 * completed yet". The same rules are re-checked server-side inside a transaction; this
 * is guidance, not the enforcement.
 */
const NewBillingRequestDialog: React.FC<{
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}> = ({ open, projectId, onClose, onCreated }) => {
  const navigate = useNavigate();
  const [stageId, setStageId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["project-execution", "stages", projectId],
    queryFn: () => getProjectStages(projectId),
    enabled: open && !!projectId,
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["billing-candidates", stageId],
    queryFn: () => getBillableDeliverables(stageId),
    enabled: open && !!stageId,
  });

  useEffect(() => {
    if (!open) return;
    setStageId(""); setSelected(new Set()); setRemarks(""); setError(null);
  }, [open]);

  // Changing stage invalidates the selection — a request covers exactly one stage.
  useEffect(() => { setSelected(new Set()); }, [stageId]);

  const selectable = candidates?.selectable ?? [];
  const blocked = candidates?.blocked ?? [];

  const total = useMemo(
    () =>
      selectable
        .filter((c) => selected.has(c.id))
        .reduce((sum, c) => sum + (Number(c.deliverable?.calculatedAmount) || 0), 0),
    [selectable, selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /** Create then immediately submit — a draft nobody submits helps no one, and the
   *  deliverables stay claimed either way. */
  const save = async (submitNow: boolean) => {
    if (!stageId) { setError("Pick a stage."); return; }
    if (selected.size === 0) { setError("Select at least one deliverable to bill."); return; }

    setSaving(true);
    setError(null);

    // Create and submit are handled as SEPARATE outcomes on purpose. They used to share
    // one try/catch, so a failed submit left the draft alive — silently claiming its
    // deliverables — while the dialog stayed open showing an error. Retrying then failed
    // with "already on another billing request", pointing at a draft the user never knew
    // existed. Once the draft is created it is real, so the dialog always closes and the
    // list always refreshes; only the submit outcome is reported separately.
    let created;
    try {
      created = await createBillingRequest({
        projectStageId: stageId,
        deliverableIds: [...selected],
        remarks: remarks.trim() || null,
      });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not create the billing request."));
      setSaving(false);
      return;
    }
    if (!submitNow) {
      toast({ icon: "success", title: "Billing request saved as draft" });
    } else {
      try {
        await submitBillingRequest(created.id);
        toast({ icon: "success", title: "Billing request submitted for approval" });
      } catch (err: unknown) {
        const data = (err as any)?.response?.data;
        const requesterEmployeeId = data?.meta?.requesterEmployeeId;
        const employeeName = data?.meta?.employeeName || "the employee";

        if (requesterEmployeeId) {
          const confirmed = await Swal.fire({
            icon: "error",
            title: "Approval Chain Required",
            html: `
              <div class="text-start py-2">
                <p class="mb-4 fs-6 text-gray-700">No Billing Request approval chain is configured for <strong>${employeeName}</strong>. Approval chains must be set before submitting requests.</p>
                <div class="bg-light-danger border border-danger border-dashed p-4 rounded d-flex align-items-center">
                  <i class="ki-duotone ki-information-5 fs-2x text-danger me-3"><span class="path1"></span><span class="path2"></span><span class="path3"></span></i>
                  <div class="text-gray-800 fs-7">
                    The billing request has been saved as draft <strong>${created.requestNumber}</strong>. You can configure the approval chain and submit it from the list later.
                  </div>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Configure Now",
            cancelButtonText: "Close",
            buttonsStyling: false,
            customClass: {
              container: 'wt-swal-container',
              popup: 'wt-swal-popup',
              title: 'wt-swal-title text-danger text-start px-6 pt-6',
              htmlContainer: 'wt-swal-html px-6',
              actions: 'wt-swal-actions px-6 pb-6 justify-content-end',
              confirmButton: 'btn btn-danger fw-bold px-6 py-3',
              cancelButton: 'btn btn-light fw-bold px-6 py-3 ms-3',
            }
          });

          if (confirmed.isConfirmed) {
            navigate(`/employees/${requesterEmployeeId}?openSettings=true`);
          }
        } else {
          // The draft survives — say so, and say why it did not go out, so the user can fix
          // the cause and submit it from the list instead of re-creating it. A dialog, not a
          // toast: this needs reading and a 2s toast would vanish before it was.
          await alertDialog({
            icon: "warning",
            title: `Saved as draft ${created.requestNumber} — not submitted`,
            text: `${apiErrorMessage(err, "Could not submit for approval.")} The draft is in the list; submit it from there once this is resolved.`,
          });
        }
      }
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      header={
        <GlassHeader
          title="New Billing Request"
          icon={<KTIcon iconName="dollar" className="fs-2" />}
          onClose={onClose}
        />
      }
    >
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Box sx={{ p: 1.25, borderRadius: "10px", bgcolor: "error.main", color: "error.contrastText" }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{error}</Typography>
            </Box>
          )}

          {stagesLoading ? (
            <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
          ) : (
            <TextField
              select
              label="Stage"
              size="small"
              fullWidth
              value={stageId}
              onChange={(e) => { setStageId(e.target.value); setError(null); }}
              helperText="A billing request covers deliverables from one stage"
            >
              {stages.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: 13 }}>
                  {s.name} — {formatCurrencyDecimal(s.amount)}
                </MenuItem>
              ))}
            </TextField>
          )}

          {stageId && (candidatesLoading ? (
            <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
          ) : (
            <Stack spacing={0.75}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                Completed &amp; billable ({selectable.length})
              </Typography>

              {selectable.length === 0 && (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  Nothing in this stage can be billed yet.
                </Typography>
              )}

              {selectable.map((c) => (
                <Stack
                  key={c.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => toggle(c.id)}
                  sx={{
                    px: 1, py: 0.6, borderRadius: "10px", cursor: "pointer",
                    border: "1px solid", borderColor: selected.has(c.id) ? "primary.main" : "divider",
                    bgcolor: selected.has(c.id) ? "action.selected" : "transparent",
                  }}
                >
                  <Checkbox size="small" checked={selected.has(c.id)} sx={{ p: 0.5 }} />
                  <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>
                    {c.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {Number(c.deliverable?.percentage) || 0}%
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    {formatCurrencyDecimal(Number(c.deliverable?.calculatedAmount) || 0)}
                  </Typography>
                </Stack>
              ))}

              {/* Shown, not hidden — the reason is the useful part. */}
              {blocked.length > 0 && (
                <>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, mt: 1, color: "text.secondary" }}>
                    Not available ({blocked.length})
                  </Typography>
                  {blocked.map((c) => (
                    <Stack
                      key={c.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ px: 1, py: 0.6, borderRadius: "10px", opacity: 0.6 }}
                    >
                      <Typography sx={{ flex: 1, minWidth: 0, fontSize: 12.5, wordBreak: "break-word" }}>
                        {c.name}
                      </Typography>
                      <ToneChip
                        tone="neutral"
                        dense
                        label={
                          c.reason === "NOT_COMPLETED" ? "Not completed"
                            : c.reason === "NOT_BILLABLE" ? "Non-billable"
                            : "Already requested"
                        }
                      />
                    </Stack>
                  ))}
                </>
              )}
            </Stack>
          ))}

          <TextField
            label="Remarks (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={remarks}
            inputProps={{ maxLength: REMARKS_MAX }}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Anything the approvers should know"
          />

          {selected.size > 0 && (
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ px: 1, py: 1, borderRadius: "10px", bgcolor: "action.hover" }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                {selected.size} deliverable{selected.size === 1 ? "" : "s"}
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{formatCurrencyDecimal(total)}</Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={onClose} disabled={saving}>Cancel</WtButton>
        <WtButton ghost onClick={() => void save(false)} disabled={saving || selected.size === 0}>
          Save Draft
        </WtButton>
        <WtButton tone="primary" onClick={() => void save(true)} disabled={saving || selected.size === 0}>
          {saving ? "Saving…" : "Submit for Approval"}
        </WtButton>
      </DialogActions>
    </GlassDialog>
  );
};

export default NewBillingRequestDialog;
