import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, Divider, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassCard, WtButton, ToneChip, TRIO, toast,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import {
  getBillingOperation, getOperationActivity, updateOperationStatus, addOperationNote,
  type BillingOperationStatus,
} from "@services/billingOperations";
import {
  BillingPageHeader, BillingStatusBadge, BillingTimeline, BillingLoadingState,
  BillingEmptyState, type BillingTimelineStep,
} from "../components";
import { DueChip, Figure, PanelTitle, STAGE_LABEL } from "./operationUi";

/**
 * One billing operation, end to end.
 *
 * MONITORING, NOT EDITING. Project, client, deliverables and amounts are rendered
 * read-only here — they belong to the modules that produced them, and a finance
 * workspace that lets you retype an approved figure is how reconciliation breaks.
 * The one thing this page can change is the workflow status, and even that goes
 * through the server's transition map rather than a free-form select.
 */

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={1} sx={{ minWidth: 0, py: 0.35 }}>
    <Typography sx={{ fontSize: 12, color: "text.secondary", minWidth: 132, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>
      {value ?? "—"}
    </Typography>
  </Stack>
);

const BillingOperationDetailPage: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [move, setMove] = useState<{ status: string; reason: string }>({ status: "", reason: "" });
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["billing-operation", id],
    queryFn: () => getBillingOperation(id),
    enabled: !!id,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["billing-operation", id, "activity"],
    queryFn: () => getOperationActivity(id),
    enabled: !!id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["billing-operation", id] });
    queryClient.invalidateQueries({ queryKey: ["billing-operations"] });
  };

  const transition = useMutation({
    mutationFn: () =>
      updateOperationStatus(id, {
        status: move.status as BillingOperationStatus,
        reason: move.reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast({ icon: "success", title: "Status updated" });
      setMove({ status: "", reason: "" });
      refresh();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the status" }),
  });

  const saveNote = useMutation({
    mutationFn: () => addOperationNote(id, { body: note }),
    onSuccess: () => { toast({ icon: "success", title: "Note added" }); setNote(""); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not add the note" }),
  });

  if (isLoading || !data) {
    return <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}><BillingLoadingState rows={4} /></Box>;
  }

  const { operation, project, client, financial, workflowTimeline, documents, notes } = data;

  // Hold and cancel need a reason; the server enforces it, the form asks for it.
  const reasonRequired = move.status === "ON_HOLD" || move.status === "CANCELLED";

  const activitySteps: BillingTimelineStep[] = activity.map((event, index) => ({
    key: event.id,
    label: event.message,
    state: event.type === "CANCELLED" ? "failed" : index === 0 ? "current" : "done",
    at: event.createdAt,
    detail: event.actorName ?? undefined,
  }));

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="chart-simple"
        trio={TRIO.blue}
        title={operation.operationNumber}
        description={`${project?.name ?? "—"} · ${operation.requestNumber} · ${STAGE_LABEL[operation.stage]} stage`}
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <BillingStatusBadge status={operation.status} dense={false} />
            <WtButton
              ghost size="small"
              onClick={() => navigate("/billing/operations")}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              All Operations
            </WtButton>
            <WtButton
              ghost size="small"
              onClick={() => navigate(`/billing/accounts/${operation.billingRequestId}`)}
              startIcon={<KTIcon iconName="eye" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              View Request
            </WtButton>
          </Stack>
        }
      />

      {operation.holdReason && (
        <GlassCard sx={{ p: 1.5, mb: 2, borderLeft: (t) => `3px solid ${t.palette.warning.main}` }}>
          <Typography sx={{ fontSize: 12.5 }}>
            <b>On hold</b> — {operation.holdReason}
          </Typography>
        </GlassCard>
      )}
      {operation.cancelReason && (
        <GlassCard sx={{ p: 1.5, mb: 2, borderLeft: (t) => `3px solid ${t.palette.error.main}` }}>
          <Typography sx={{ fontSize: 12.5 }}>
            <b>Cancelled</b> — {operation.cancelReason}
          </Typography>
        </GlassCard>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(320px, 380px)" },
        }}
      >
        {/* ── Left column: summaries, tabs ──────────────────────────────────── */}
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: "grid", gap: 2,
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            <GlassCard sx={{ p: 2 }}>
              <PanelTitle icon="abstract-26" title="Project" />
              <Row label="Project" value={project?.name} />
              <Row label="Project No" value={project?.number} />
              <Row label="Start" value={project?.startDate ? formatDate(project.startDate) : "—"} />
              <Row label="End" value={project?.endDate ? formatDate(project.endDate) : "—"} />
              <Row label="Project Manager" value={operation.projectManagerName} />
            </GlassCard>

            <GlassCard sx={{ p: 2 }}>
              <PanelTitle icon="profile-circle" title="Client" />
              <Row label="Client" value={client?.companyName} />
              <Row label="GSTIN" value={client?.gstNumber} />
              <Row label="Email" value={client?.email} />
              <Row label="Phone" value={client?.phone} />
              <Row
                label="Location"
                value={[client?.city, client?.state].filter(Boolean).join(", ") || "—"}
              />
            </GlassCard>
          </Box>

          <GlassCard sx={{ p: 0 }}>
            <Tabs
              value={tab}
              onChange={(_event, next) => setTab(next)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 42, "& .MuiTab-root": { minHeight: 42, fontSize: 12.5, textTransform: "none" } }}
            >
              <Tab label="Workflow" />
              <Tab label={`Activity (${activity.length})`} />
              <Tab label="Documents" />
              <Tab label={`Notes (${notes.length})`} />
              <Tab label="Billing Request" />
            </Tabs>
            <Divider />

            <Box sx={{ p: 2 }}>
              {tab === 0 && <BillingTimeline steps={workflowTimeline} />}

              {tab === 1 && (
                activitySteps.length
                  ? <BillingTimeline steps={activitySteps} dense />
                  : <BillingEmptyState title="No activity yet" description="Status changes and notes appear here." icon="time" />
              )}

              {tab === 2 && (
                <Stack spacing={1}>
                  {/* Derived from the modules that own each document, so a slot can
                      never claim something exists after it was cancelled. */}
                  {documents.map((doc) => (
                    <Stack
                      key={doc.kind}
                      direction="row" alignItems="center" spacing={1.5}
                      sx={{
                        p: 1.25, borderRadius: "10px",
                        border: (t) => `1px solid ${t.palette.divider}`,
                        opacity: doc.available ? 1 : 0.6,
                      }}
                    >
                      <KTIcon iconName={doc.available ? "document" : "file-added"} className="fs-4" />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{doc.label}</Typography>
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                          {doc.documentNumber ?? "Not created yet"}
                          {doc.createdAt ? ` · ${formatDate(doc.createdAt)}` : ""}
                        </Typography>
                      </Box>
                      <BillingStatusBadge status={doc.status} />
                    </Stack>
                  ))}
                </Stack>
              )}

              {tab === 3 && (
                <Stack spacing={1.5}>
                  <TextField
                    size="small" fullWidth multiline minRows={2}
                    label="Add a note" value={note}
                    onChange={(event) => setNote(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Box>
                    <WtButton
                      tone="primary" size="small"
                      disabled={!note.trim() || saveNote.isPending}
                      onClick={() => saveNote.mutate()}
                      sx={{ minHeight: 34, borderRadius: "10px", fontSize: 12.5 }}
                    >
                      {saveNote.isPending ? "Saving…" : "Add Note"}
                    </WtButton>
                  </Box>
                  <Divider />
                  {notes.map((entry) => (
                    <Box key={entry.id} sx={{ py: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, whiteSpace: "pre-line" }}>{entry.body}</Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        {formatDateTime(entry.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                  {!notes.length && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>No notes yet.</Typography>
                  )}
                </Stack>
              )}

              {tab === 4 && (
                <Stack spacing={0.5}>
                  <Row label="Request No" value={operation.requestNumber} />
                  <Row label="Approved" value={operation.approvedAt ? formatDate(operation.approvedAt) : "—"} />
                  <Row label="Request Amount" value={formatCurrencyDecimal(Number(operation.requestAmount))} />
                  <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 1 }}>
                    Deliverables and approval history are on the billing request itself — this
                    page reads them, it does not own them.
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <WtButton
                      ghost size="small"
                      onClick={() => navigate(`/billing/requests/${operation.billingRequestId}`)}
                      sx={{ minHeight: 32, fontSize: 12.5 }}
                    >
                      Open Billing Request
                    </WtButton>
                  </Box>
                </Stack>
              )}
            </Box>
          </GlassCard>
        </Stack>

        {/* ── Right column: money, due, workflow action ─────────────────────── */}
        <Stack spacing={2} sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="dollar" title="Financial Summary" />
            <Stack spacing={0.5}>
              <Figure label="Contract Value" value={formatCurrencyDecimal(financial.contractValue)} />
              <Figure label="Billing Request" value={formatCurrencyDecimal(financial.billingRequestAmount)} />
              <Figure label="Tax" value={formatCurrencyDecimal(financial.taxAmount)} hint="Set by the Proforma module" />
              <Divider sx={{ my: 0.75 }} />
              <Figure label="Total" value={formatCurrencyDecimal(financial.totalAmount)} strong />
              <Figure
                label="Collected" value={formatCurrencyDecimal(financial.collectedAmount)}
                hint="Set by the Payment module" tone="success"
              />
              <Figure
                label="Outstanding" value={formatCurrencyDecimal(financial.outstandingAmount)}
                strong tone={operation.due.state === "OVERDUE" ? "danger" : "default"}
              />
              <Divider sx={{ my: 0.75 }} />
              <Figure label="Already Billed" value={formatCurrencyDecimal(financial.alreadyBilled)} hint="Earlier requests on this project" />
              <Figure label="Remaining Contract" value={formatCurrencyDecimal(financial.remainingContractValue)} />
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="calendar" title="Due Tracking" action={<DueChip due={operation.due} />} />
            <Stack spacing={0.5}>
              <Row label="Issue Date" value={operation.issueDate ? formatDate(operation.issueDate) : "—"} />
              <Row label="Expected Payment" value={operation.expectedPaymentDate ? formatDate(operation.expectedPaymentDate) : "—"} />
              <Row label="Due Date" value={operation.dueDate ? formatDate(operation.dueDate) : "—"} />
              <Row label="Payment Terms" value={`${operation.paymentTermsDays} days`} />
              <Row
                label={operation.due.state === "OVERDUE" ? "Days Overdue" : "Days Remaining"}
                value={
                  operation.due.state === "OVERDUE" ? operation.due.daysOverdue
                    : operation.due.daysRemaining ?? "—"
                }
              />
            </Stack>
            {data.pendingNotifications.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.5 }}>
                  Reminders this would raise (nothing is sent yet):
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {data.pendingNotifications.map((trigger) => (
                    <ToneChip key={trigger} tone="neutral" label={trigger.replace(/_/g, " ")} dense />
                  ))}
                </Stack>
              </Box>
            )}
          </GlassCard>

          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="arrow-right" title="Advance Workflow" />
            {operation.allowedTransitions.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                This operation is {operation.statusLabel.toLowerCase()} and can no longer be moved.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {/* The options come from the server's transition map, so the form can
                    only ever offer a move the service would accept. */}
                <TextField
                  select size="small" fullWidth label="Move to"
                  value={move.status}
                  onChange={(event) => setMove({ status: event.target.value, reason: "" })}
                  InputLabelProps={{ shrink: true }}
                >
                  {operation.allowedTransitions.map((option) => (
                    <MenuItem key={option.status} value={option.status} sx={{ fontSize: 12.5 }}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                {reasonRequired && (
                  <TextField
                    size="small" fullWidth multiline minRows={2} required
                    label="Reason" value={move.reason}
                    onChange={(event) => setMove((prev) => ({ ...prev, reason: event.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    helperText="Required — it is written to the activity log."
                  />
                )}
                <WtButton
                  tone="primary" size="small"
                  disabled={!move.status || (reasonRequired && !move.reason.trim()) || transition.isPending}
                  onClick={() => transition.mutate()}
                  sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
                >
                  {transition.isPending ? "Updating…" : "Update Status"}
                </WtButton>
              </Stack>
            )}
          </GlassCard>
        </Stack>
      </Box>
    </Box>
  );
};

export default BillingOperationDetailPage;
