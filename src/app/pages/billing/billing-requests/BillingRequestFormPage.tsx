import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Checkbox, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, ToneChip, TRIO, toast } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { apiErrorMessage } from "@utils/apiError";
import {
  getBillableDeliverables, getBillableProjects, createBillingRequest, updateBillingRequest,
  getBillingRequest, submitBillingRequest, type BillableCandidate,
} from "@services/billingRequest";
import {
  BillingPageHeader, BillingLoadingState, BillingEmptyState, BillingSummaryCard,
} from "../components";

const REMARKS_MAX = 2000;

/**
 * Create / edit a billing request.
 *
 * Project → stage(s) → completed deliverables. A request may span SEVERAL stages of one
 * project, so deliverables are grouped by stage and ticked individually rather than the
 * user picking one stage first.
 *
 * Ineligible deliverables are shown greyed WITH the reason instead of hidden — "why isn't
 * Site Survey listed?" is a worse experience than "Site Survey is not completed yet". The
 * same rules are re-checked server-side inside a transaction; this is guidance, not the
 * enforcement.
 */
const BillingRequestFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editing: load the request first, then pin the form to its project.
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["billing-request", id],
    queryFn: () => getBillingRequest(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setProjectId(existing.leadId);
    setSelected(new Set(existing.items.map((i) => i.projectDeliverableId)));
    setRemarks(existing.remarks ?? "");
  }, [existing]);

  // Only projects with something actually billable — offering the rest would be a list of
  // dead ends. Needed only when creating; editing is locked to the request's own project.
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["billing", "billable-projects"],
    queryFn: getBillableProjects,
    enabled: !isEdit,
  });

  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ["billing-candidates", projectId, id ?? "new"],
    // Editing excludes THIS request's own claims, so its current items stay selectable.
    queryFn: () => getBillableDeliverables({ projectId }, id),
    enabled: !!projectId,
  });

  const selectable = candidates?.selectable ?? [];
  const blocked = candidates?.blocked ?? [];

  /** Deliverables grouped by stage — a request may draw from more than one. */
  const byStage = useMemo(() => {
    const groups = new Map<string, { stageName: string; rows: BillableCandidate[] }>();
    for (const row of selectable) {
      const key = (row as { stageId?: string | null }).stageId ?? "unknown";
      const stageName = (row as { stageName?: string | null }).stageName ?? "Stage";
      const group = groups.get(key);
      if (group) group.rows.push(row);
      else groups.set(key, { stageName, rows: [row] });
    }
    return [...groups.entries()];
  }, [selectable]);

  const total = useMemo(
    () =>
      selectable
        .filter((c) => selected.has(c.id))
        .reduce((sum, c) => sum + (Number(c.deliverable?.calculatedAmount) || 0), 0),
    [selectable, selected],
  );

  const selectedStageCount = useMemo(() => {
    const stages = new Set(
      selectable.filter((c) => selected.has(c.id)).map((c) => (c as { stageId?: string | null }).stageId),
    );
    return stages.size;
  }, [selectable, selected]);

  const toggle = (deliverableId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(deliverableId)) next.delete(deliverableId);
      else next.add(deliverableId);
      return next;
    });

  const toggleStage = (rows: BillableCandidate[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = rows.every((r) => next.has(r.id));
      rows.forEach((r) => (allOn ? next.delete(r.id) : next.add(r.id)));
      return next;
    });

  const save = async (submitNow: boolean) => {
    if (!projectId) { setError("Pick a project."); return; }
    if (selected.size === 0) { setError("Select at least one deliverable to bill."); return; }

    setSaving(true);
    setError(null);

    // Save and submit are separate outcomes: once the request exists it is real, so a
    // failed submit must not strand it invisibly — the user is taken to it either way.
    let saved;
    try {
      const payload = {
        projectId,
        deliverableIds: [...selected],
        remarks: remarks.trim() || null,
      };
      saved = isEdit
        ? await updateBillingRequest(id as string, payload)
        : await createBillingRequest(payload);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not save the billing request."));
      setSaving(false);
      return;
    }

    if (submitNow) {
      try {
        await submitBillingRequest(saved.id);
        toast({ icon: "success", title: "Submitted for approval" });
      } catch (err: unknown) {
        toast({
          icon: "warning",
          title: `Saved as ${saved.requestNumber}, not submitted`,
          text: apiErrorMessage(err, "Could not submit for approval."),
        });
      }
    } else {
      toast({ icon: "success", title: isEdit ? "Billing request updated" : "Saved as draft" });
    }

    setSaving(false);
    navigate(`/billing/requests/${saved.id}`);
  };

  if (isEdit && loadingExisting) {
    return <Box sx={{ maxWidth: 1100, mx: "auto" }}><BillingLoadingState rows={4} /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="file-added"
        trio={TRIO.green}
        title={isEdit ? `Edit ${existing?.requestNumber ?? "Billing Request"}` : "New Billing Request"}
        description="Select completed, billable deliverables. They may span several stages of one project."
        action={
          <WtButton
            ghost
            size="small"
            onClick={() => navigate("/billing/requests")}
            startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
            sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
          >
            Cancel
          </WtButton>
        }
      />

      <Stack spacing={1.25}>
        {error && (
          <Box sx={{ p: 1.25, borderRadius: "10px", bgcolor: "error.main", color: "error.contrastText" }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{error}</Typography>
          </Box>
        )}

        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Project</Typography>
          {isEdit ? (
            // Moving a request between projects would invalidate every snapshot on it.
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {existing?.lead?.title || existing?.lead?.prefix || "—"}
              <Typography component="span" sx={{ fontSize: 11.5, color: "text.disabled", ml: 1 }}>
                (cannot be changed)
              </Typography>
            </Typography>
          ) : (
            <TextField
              select
              size="small"
              fullWidth
              value={projectId}
              disabled={loadingProjects}
              onChange={(e) => { setProjectId(e.target.value); setSelected(new Set()); setError(null); }}
              helperText={loadingProjects ? "Loading projects…" : "One request covers one project"}
            >
              {projects.length === 0 && !loadingProjects && (
                <MenuItem value="" disabled sx={{ fontSize: 13 }}>
                  No project has billable deliverables right now
                </MenuItem>
              )}
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id} sx={{ fontSize: 13 }}>
                  {p.title || p.originalProjectPrefix || p.prefix || p.id}
                  {p.clientName ? ` · ${p.clientName}` : ""} — {p.billableCount} billable
                </MenuItem>
              ))}
            </TextField>
          )}
        </GlassCard>

        {projectId && (
          loadingCandidates ? (
            <BillingLoadingState rows={4} />
          ) : selectable.length === 0 && blocked.length === 0 ? (
            <BillingEmptyState
              title="Nothing to bill on this project"
              description="Complete some billable deliverables in the project's Execution tab first."
              icon="information-5"
            />
          ) : (
            <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>
                Completed &amp; billable ({selectable.length})
              </Typography>

              {byStage.map(([stageId, group]) => {
                const allOn = group.rows.every((r) => selected.has(r.id));
                return (
                  <Box key={stageId} sx={{ mb: 1.5 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 0.5, cursor: "pointer" }}
                      onClick={() => toggleStage(group.rows)}
                    >
                      <Checkbox size="small" checked={allOn} sx={{ p: 0.5 }} />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "text.secondary" }}>
                        {group.stageName}
                      </Typography>
                      <ToneChip tone="neutral" label={`${group.rows.length}`} dense />
                    </Stack>

                    <Stack spacing={0.5} sx={{ pl: { xs: 0, sm: 2 } }}>
                      {group.rows.map((c) => (
                        <Stack
                          key={c.id}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          onClick={() => toggle(c.id)}
                          sx={{
                            px: 1, py: 0.6, borderRadius: "10px", cursor: "pointer",
                            border: "1px solid",
                            borderColor: selected.has(c.id) ? "primary.main" : "divider",
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
                    </Stack>
                  </Box>
                );
              })}

              {/* Shown, not hidden — the reason is the useful part. */}
              {blocked.length > 0 && (
                <>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, mt: 1, color: "text.secondary" }}>
                    Not available ({blocked.length})
                  </Typography>
                  <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                    {blocked.map((c) => (
                      <Stack key={c.id} direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5, opacity: 0.6 }}>
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
                  </Stack>
                </>
              )}
            </GlassCard>
          )
        )}

        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
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
        </GlassCard>

        {selected.size > 0 && (
          <BillingSummaryCard
            title="Request Summary"
            rows={[
              { label: "Deliverables", value: selected.size },
              { label: "Stages covered", value: selectedStageCount },
              { label: "Total amount", value: formatCurrencyDecimal(total) },
            ]}
          />
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <WtButton ghost onClick={() => navigate("/billing/requests")} disabled={saving}>
            Cancel
          </WtButton>
          <WtButton ghost onClick={() => void save(false)} disabled={saving || selected.size === 0}>
            {isEdit ? "Save Changes" : "Save Draft"}
          </WtButton>
          <WtButton tone="primary" onClick={() => void save(true)} disabled={saving || selected.size === 0}>
            {saving ? "Saving…" : "Save & Submit"}
          </WtButton>
        </Stack>
      </Stack>
    </Box>
  );
};

export default BillingRequestFormPage;
