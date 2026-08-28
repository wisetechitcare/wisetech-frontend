import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReturnContext } from "@hooks/useReturnContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Divider, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, ToneChip, TRIO, toast } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import {
  getPayment, uploadAttachments, getAttachmentLink, deleteAttachment,
  type PaymentTransaction, type AttachmentKind,
} from "@services/payments";
import { BillingPageHeader, BillingStatusBadge, BillingTimeline, BillingLoadingState } from "../components";
import { openDocument } from "@services/documents";
import { DueChip, Figure, PanelTitle } from "../operations/operationUi";
import { PAYMENT_METHOD_LABEL, ATTACHMENT_KIND_OPTIONS } from "./paymentUi";
import RecordPaymentDialog from "./RecordPaymentDialog";
import VerifyPaymentDialog from "./VerifyPaymentDialog";

/**
 * One payment collection, end to end.
 *
 * MONITORING for everything except the two things this workspace exists to do:
 * record a receipt and verify one. Project, client, billing request and
 * proforma data are read-only — they belong to the modules that produced them.
 */

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={1} sx={{ minWidth: 0, py: 0.35 }}>
    <Typography sx={{ fontSize: 12, color: "text.secondary", minWidth: 132, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>{value ?? "—"}</Typography>
  </Stack>
);

const PaymentDetailPage: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  // Falls back to this page\'s own parent when nobody handed us an origin,
  // so arriving from the Billing list behaves exactly as it always did.
  const back = useReturnContext({ pathname: "/billing/payments", label: "All Payments" });
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [recordOpen, setRecordOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<PaymentTransaction | null>(null);
  const [attachmentKind, setAttachmentKind] = useState<AttachmentKind>("SUPPORTING_DOCUMENT");

  const { data, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => getPayment(id),
    enabled: !!id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payment", id] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const upload = useMutation({
    mutationFn: (files: File[]) => uploadAttachments(id, files, { kind: attachmentKind }),
    onSuccess: () => { toast({ icon: "success", title: "Attachment uploaded" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not upload the file" }),
  });

  const openAttachment = useMutation({
    mutationFn: (attachmentId: string) => getAttachmentLink(id, attachmentId),
    onSuccess: (url) => window.open(url, "_blank", "noopener"),
    onError: () => toast({ icon: "error", title: "Could not open that attachment" }),
  });

  const removeAttachment = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(id, attachmentId),
    onSuccess: () => { toast({ icon: "success", title: "Attachment removed" }); refresh(); },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not remove the attachment" }),
  });

  /**
   * Find-or-create the tax invoice for this collection and go straight to its
   * editor — the same pattern the Accounts Queue uses for Generate Proforma.
   * The server refuses this before the collection is fully paid and verified
   * (`resolveTaxInvoice`'s gate); the button below is disabled for the same
   * reason so the refusal is rare, not the normal path.
   */
  const generateInvoice = useMutation({
    mutationFn: () => openDocument({ kind: "TAX_INVOICE", subjectId: id }),
    onSuccess: (payload) => navigate(`/billing/proformas/${payload.document.id}/edit`),
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not open the tax invoice" }),
  });

  if (isLoading || !data) {
    return <Box sx={{ maxWidth: 1700, mx: "auto", pb: 4 }}><BillingLoadingState rows={4} /></Box>;
  }

  const { collection, project, client, billingRequest, proforma, transactions, attachments, financial, timeline } = data;

  return (
    <Box sx={{ maxWidth: 1700, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="dollar"
        trio={TRIO.green}
        title={collection.operationNumber}
        description={`${project?.name ?? "—"} · ${collection.requestNumber}${proforma ? ` · ${proforma.documentNumber}` : ""}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <BillingStatusBadge status={collection.paymentStatus} dense={false} />
            <BillingStatusBadge status={collection.verificationStatus} dense={false} />
            {data.readyForInvoice && <ToneChip tone="success" label="Ready for Invoice" dense={false} />}
            <WtButton
              ghost size="small"
              onClick={back.goBack}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              {back.label}
            </WtButton>
            <WtButton
              tone="primary" size="small"
              disabled={Number(collection.outstandingAmount) <= 0 && collection.paymentStatus !== "PENDING"}
              onClick={() => setRecordOpen(true)}
              startIcon={<KTIcon iconName="plus" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Record Payment
            </WtButton>
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid", gap: 2, alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(320px, 380px)" },
        }}
      >
        {/* ── Left: summaries + tabs ─────────────────────────────────────────── */}
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
            <GlassCard sx={{ p: 2 }}>
              <PanelTitle icon="abstract-26" title="Project" />
              <Row label="Project" value={project?.name} />
              <Row label="Project No" value={project?.number} />
              <Row label="Billing Request" value={billingRequest?.requestNumber} />
              <Row label="Proforma" value={proforma?.documentNumber} />
            </GlassCard>

            <GlassCard sx={{ p: 2 }}>
              <PanelTitle icon="profile-circle" title="Client" />
              <Row label="Client" value={client?.companyName} />
              <Row label="GSTIN" value={client?.gstNumber} />
              <Row label="Email" value={client?.email} />
              <Row label="Phone" value={client?.phone} />
            </GlassCard>
          </Box>

          <GlassCard sx={{ p: 0 }}>
            <Tabs
              value={tab} onChange={(_event, next) => setTab(next)}
              variant="scrollable" scrollButtons="auto"
              sx={{ minHeight: 42, "& .MuiTab-root": { minHeight: 42, fontSize: 12.5, textTransform: "none" } }}
            >
              <Tab label={`Payment History (${transactions.length})`} />
              <Tab label="Timeline" />
              <Tab label={`Attachments (${attachments.length})`} />
              <Tab label="Notes" />
            </Tabs>
            <Divider />

            <Box sx={{ p: 2 }}>
              {tab === 0 && (
                <Stack spacing={1}>
                  {transactions.map((transaction) => (
                    <Box
                      key={transaction.id}
                      sx={{
                        p: 1.5, borderRadius: "10px",
                        border: (t) => `1px solid ${t.palette.divider}`,
                        opacity: transaction.countsTowardCollection ? 1 : 0.55,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" useFlexGap>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{transaction.paymentNumber}</Typography>
                            <BillingStatusBadge status={transaction.status} />
                            {transaction.isOverpayment && <ToneChip tone="indigo" label="Overpayment" dense />}
                          </Stack>
                          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                            {PAYMENT_METHOD_LABEL[transaction.method]} · {formatDate(transaction.paymentDate)}
                            {transaction.utrNumber ? ` · UTR ${transaction.utrNumber}` : ""}
                            {transaction.chequeNumber ? ` · Cheque ${transaction.chequeNumber}` : ""}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                            Recorded by {transaction.recordedByName ?? "—"} · Received by {transaction.receivedByName ?? "—"}
                          </Typography>
                          {transaction.remarks && (
                            <Typography sx={{ fontSize: 11.5, mt: 0.5, whiteSpace: "pre-line" }}>{transaction.remarks}</Typography>
                          )}
                          {transaction.verificationNote && (
                            <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.5 }}>
                              Verification note: {transaction.verificationNote}
                            </Typography>
                          )}
                        </Box>
                        <Stack alignItems="flex-end" spacing={0.5}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                            {formatCurrencyDecimal(Number(transaction.amount))}
                          </Typography>
                          {transaction.status === "RECORDED" && (
                            <WtButton
                              ghost size="small" onClick={() => setVerifyTarget(transaction)}
                              sx={{ minHeight: 26, fontSize: 11 }}
                            >
                              Verify
                            </WtButton>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                  {!transactions.length && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      No payments recorded yet.
                    </Typography>
                  )}
                </Stack>
              )}

              {tab === 1 && <BillingTimeline steps={timeline} />}

              {tab === 2 && (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <TextField
                      select size="small" label="Kind" value={attachmentKind}
                      onChange={(event) => setAttachmentKind(event.target.value as AttachmentKind)}
                      InputLabelProps={{ shrink: true }} sx={{ minWidth: 190 }}
                    >
                      {ATTACHMENT_KIND_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                    <WtButton
                      component="label" ghost size="small" disabled={upload.isPending}
                      startIcon={<KTIcon iconName="paper-clip" className="fs-6" />}
                      sx={{ minHeight: 34, fontSize: 12.5 }}
                    >
                      {upload.isPending ? "Uploading…" : "Upload"}
                      <input
                        type="file" multiple hidden
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          if (files.length) upload.mutate(files);
                          event.target.value = "";
                        }}
                      />
                    </WtButton>
                  </Stack>
                  <Stack spacing={0.75}>
                    {attachments.map((attachment) => (
                      <Stack
                        key={attachment.id} direction="row" alignItems="center" spacing={1.25}
                        sx={{ p: 1.1, borderRadius: "10px", border: (t) => `1px solid ${t.palette.divider}` }}
                      >
                        <KTIcon iconName="document" className="fs-4" />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>{attachment.fileName}</Typography>
                          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                            {attachment.kind.replace(/_/g, " ")} · {formatDateTime(attachment.createdAt)}
                          </Typography>
                        </Box>
                        <WtButton ghost size="small" onClick={() => openAttachment.mutate(attachment.id)} sx={{ minHeight: 28, fontSize: 11.5 }}>
                          View
                        </WtButton>
                        <WtButton
                          ghost size="small" onClick={() => removeAttachment.mutate(attachment.id)}
                          sx={{ minHeight: 28, fontSize: 11.5, color: "error.main" }}
                        >
                          Remove
                        </WtButton>
                      </Stack>
                    ))}
                    {!attachments.length && (
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>No attachments yet.</Typography>
                    )}
                  </Stack>
                </Stack>
              )}

              {tab === 3 && (
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Notes and status changes are recorded on the Billing Operation's own activity
                  log — open it from Billing Operations for the full trail.
                </Typography>
              )}
            </Box>
          </GlassCard>
        </Stack>

        {/* ── Right: financial + outstanding + due ───────────────────────────── */}
        <Stack spacing={2} sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="dollar" title="Financial Summary" />
            <Stack spacing={0.5}>
              <Figure label="Contract Value" value={formatCurrencyDecimal(financial.contractValue ?? 0)} />
              <Figure label="Billing Request" value={formatCurrencyDecimal(financial.billingRequestAmount)} />
              <Figure label="Proforma Amount" value={formatCurrencyDecimal(financial.proformaAmount)} />
              <Divider sx={{ my: 0.75 }} />
              <Figure label="Total Payable" value={formatCurrencyDecimal(financial.totalAmount)} strong />
              <Figure label="Collected" value={formatCurrencyDecimal(financial.collectedAmount)} tone="success" />
              <Figure
                label="Outstanding" value={formatCurrencyDecimal(financial.outstandingAmount)}
                strong tone={collection.due.state === "OVERDUE" ? "danger" : "default"}
              />
              <Box sx={{ pt: 0.5 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Collection Progress</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{Math.round(financial.collectionPercentage)}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, financial.collectionPercentage)}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              <Divider sx={{ my: 0.75 }} />
              <Figure label="Already Billed" value={formatCurrencyDecimal(financial.alreadyBilled ?? 0)} />
              <Figure label="Remaining Contract" value={formatCurrencyDecimal(financial.remainingContractValue ?? 0)} />
            </Stack>
          </GlassCard>

          <GlassCard sx={{ p: 2 }}>
            <PanelTitle icon="calendar" title="Due Tracking" action={<DueChip due={collection.due} />} />
            <Stack spacing={0.5}>
              <Row label="Due Date" value={collection.dueDate ? formatDate(collection.dueDate) : "—"} />
              <Row label="Payment Age" value={collection.paymentAge !== null ? `${collection.paymentAge} days` : "—"} />
              <Row label="Collection Days" value={collection.collectionDays !== null ? `${collection.collectionDays} days` : "—"} />
              <Row
                label={collection.due.state === "OVERDUE" ? "Days Overdue" : "Days Remaining"}
                value={collection.due.state === "OVERDUE" ? collection.due.daysOverdue : collection.due.daysRemaining ?? "—"}
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
            <PanelTitle icon="receipt-cutoff" title="Tax Invoice" />
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: data.readyForInvoice ? 1.25 : 0 }}>
              {data.readyForInvoice
                ? "This collection is fully paid and verified — ready for invoicing."
                : "Invoicing unlocks once the collection is Fully Paid AND Verified."}
            </Typography>
            {data.readyForInvoice && (
              <WtButton
                tone="primary" size="small" fullWidth
                disabled={generateInvoice.isPending}
                onClick={() => generateInvoice.mutate()}
                startIcon={<KTIcon iconName="receipt-cutoff" className="fs-6" />}
                sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
              >
                {generateInvoice.isPending ? "Opening…" : "Generate Tax Invoice"}
              </WtButton>
            )}
          </GlassCard>
        </Stack>
      </Box>

      <RecordPaymentDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        operationId={collection.id}
        operationNumber={collection.operationNumber}
        outstandingAmount={Number(collection.outstandingAmount)}
      />
      <VerifyPaymentDialog
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        operationId={collection.id}
        transaction={verifyTarget}
      />
    </Box>
  );
};

export default PaymentDetailPage;
