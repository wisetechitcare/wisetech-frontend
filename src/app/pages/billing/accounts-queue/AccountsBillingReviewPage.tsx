import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, ToneChip, TRIO, toast } from "@app/modules/common/components/ui";
import ApprovalStatusTracker from "@pages/approvals/ApprovalStatusTracker";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import {
  getAccountsQueueItem, getBillingRequestHistory, type AccountsQueueItem,
} from "@services/billingRequest";
import {
  BillingPageHeader, BillingStatusBadge, BillingSummaryCard, BillingTimeline,
  BillingLoadingState, BillingEmptyState, BillingStatsCard, type BillingTimelineStep,
} from "../components";

/**
 * Accounts Billing Review — READ ONLY.
 *
 * What Accounts needs before converting a request to a proforma: what is being billed,
 * who signed it off, and where the project stands financially. There is deliberately no
 * edit control anywhere on this page, and the backend route it reads has no write path.
 *
 * The approval chain is the EXISTING `ApprovalStatusTracker` mounted by instance id — no
 * approval actions, because the decision is already made.
 */

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 12, color: "text.secondary", minWidth: 124, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>{value}</Typography>
  </Stack>
);

const projectName = (r: AccountsQueueItem) =>
  r.lead?.title || r.lead?.originalProjectPrefix || r.lead?.prefix || "—";

const AccountsBillingReviewPage: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: request, isLoading } = useQuery({
    queryKey: ["accounts", "billing-queue", id],
    queryFn: () => getAccountsQueueItem(id),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["billing-request", id, "history"],
    queryFn: () => getBillingRequestHistory(id),
    enabled: !!id,
  });

  if (isLoading || !request) {
    return <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}><BillingLoadingState rows={4} /></Box>;
  }

  const fin = request.financials;

  /** Stage-level rollup, built from the frozen items so it matches what was approved. */
  const stageSummary = (() => {
    const map = new Map<string, { count: number; amount: number; percentage: number }>();
    for (const item of request.items) {
      const key = item.stageName || "—";
      const entry = map.get(key) ?? { count: 0, amount: 0, percentage: 0 };
      entry.count += 1;
      entry.amount += Number(item.calculatedAmount) || 0;
      entry.percentage += Number(item.percentage) || 0;
      map.set(key, entry);
    }
    return [...map.entries()];
  })();

  const activitySteps: BillingTimelineStep[] = history.map((entry, index) => ({
    key: entry.id,
    label: entry.message,
    state: entry.type === "REJECTED" || entry.type === "CANCELLED"
      ? "failed"
      : index === history.length - 1 ? "current" : "done",
    at: entry.createdAt,
    detail: entry.actorName ?? undefined,
  }));

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="delivery"
        trio={TRIO.cyan}
        title={request.requestNumber}
        description={`${projectName(request)} · approved ${formatDate(request.approvedAt)}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <BillingStatusBadge status={request.status} dense={false} />
            <WtButton
              ghost size="small"
              onClick={() => navigate("/billing/accounts")}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Back to Queue
            </WtButton>
            {/* Disabled until the Proforma module ships. */}
            <WtButton
              tone="primary" size="small" disabled
              title="Proforma generation arrives in the next phase"
              onClick={() => toast({ icon: "info", title: "Proforma generation is not implemented yet" })}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Generate Proforma
            </WtButton>
          </Stack>
        }
      />

      {/* Project-level position — the context that tells Accounts whether this request
          makes sense before they convert it. */}
      <Box
        sx={{
          display: "grid", gap: 1.25, mb: 2,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <BillingStatsCard label="This Request" icon="dollar" trio={TRIO.green}
          value={formatCurrencyDecimal(fin.thisRequestAmount)} hint={`${request.items.length} deliverables`} />
        <BillingStatsCard label="Contract Value" icon="abstract-26" trio={TRIO.blue}
          value={formatCurrencyDecimal(fin.projectContractValue)} hint="Project total" />
        <BillingStatsCard label="Already Billed" icon="check-circle" trio={TRIO.purple}
          value={formatCurrencyDecimal(fin.alreadyBilled)} hint="Raised before this request" />
        <BillingStatsCard
          label="Remaining Value" icon="information-5"
          trio={fin.projectRemainingValue < 0 ? TRIO.rose : TRIO.amber}
          value={formatCurrencyDecimal(fin.projectRemainingValue)}
          // Negative means the project has been over-billed — worth seeing, not hiding.
          hint={fin.projectRemainingValue < 0 ? "Over-billed — check before converting" : "Not yet billed"}
        />
      </Box>

      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", lg: "1.5fr 1fr" } }}>
        <Stack spacing={1.25}>
          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Project &amp; Client</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0.75 }}>
              <Row label="Project" value={projectName(request)} />
              <Row label="Client" value={request.lead?.company?.companyName || "—"} />
              <Row label="Requested by" value={request.requestedByName ?? "—"} />
              <Row label="Requested" value={request.requestedAt ? formatDate(request.requestedAt) : "—"} />
              <Row label="Approved by" value={request.approvedByName ?? "—"} />
              <Row label="Approved" value={request.approvedAt ? formatDateTime(request.approvedAt) : "—"} />
            </Box>
            {request.remarks && (
              <Box sx={{ mt: 1.25, p: 1.25, borderRadius: "10px", bgcolor: "action.hover" }}>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 700 }}>Remarks</Typography>
                <Typography sx={{ fontSize: 12.5, mt: 0.25, whiteSpace: "pre-wrap" }}>{request.remarks}</Typography>
              </Box>
            )}
          </GlassCard>

          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Stage Summary</Typography>
            <Stack spacing={0.5}>
              {stageSummary.map(([stage, s]) => (
                <Stack
                  key={stage}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ px: 1, py: 0.7, borderRadius: "10px", border: "1px solid", borderColor: "divider" }}
                >
                  <Typography sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, wordBreak: "break-word" }}>
                    {stage}
                  </Typography>
                  <ToneChip tone="neutral" label={`${s.count} item${s.count === 1 ? "" : "s"}`} dense />
                  <Typography sx={{ fontSize: 12, color: "text.secondary", width: 60, textAlign: "right" }}>
                    {Math.round(s.percentage * 1000) / 1000}%
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, width: 110, textAlign: "right" }}>
                    {formatCurrencyDecimal(s.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </GlassCard>

          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Deliverables</Typography>
              <ToneChip tone="neutral" label="Snapshot at request time" dense />
            </Stack>
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 540 }}>
                <Stack
                  direction="row"
                  sx={{
                    px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider",
                    fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>Deliverable</Box>
                  <Box sx={{ width: 140 }}>Stage</Box>
                  <Box sx={{ width: 70, textAlign: "right" }}>%</Box>
                  <Box sx={{ width: 120, textAlign: "right" }}>Amount</Box>
                </Stack>
                {request.items.map((item) => (
                  <Stack
                    key={item.id}
                    direction="row"
                    alignItems="center"
                    sx={{ px: 1, py: 0.85, borderBottom: "1px solid", borderColor: "divider" }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>
                        {item.name}
                      </Typography>
                      {item.category && (
                        <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>{item.category}</Typography>
                      )}
                    </Box>
                    <Box sx={{ width: 140, fontSize: 11.5, color: "text.secondary", pr: 1 }}>{item.stageName}</Box>
                    <Box sx={{ width: 70, textAlign: "right", fontSize: 12.5 }}>
                      {Number(item.percentage) || 0}%
                    </Box>
                    <Box sx={{ width: 120, textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>
                      {formatCurrencyDecimal(Number(item.calculatedAmount) || 0)}
                    </Box>
                  </Stack>
                ))}
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between" sx={{ px: 1 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                Total ({Number(request.totalPercentage) || 0}%)
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                {formatCurrencyDecimal(Number(request.totalAmount) || 0)}
              </Typography>
            </Stack>
          </GlassCard>
        </Stack>

        <Stack spacing={1.25}>
          <BillingSummaryCard
            title="Financial Summary"
            rows={[
              { label: "Total deliverables", value: request.items.length },
              { label: "Total percentage", value: `${Number(request.totalPercentage) || 0}%` },
              { label: "Total amount", value: formatCurrencyDecimal(Number(request.totalAmount) || 0) },
              { label: "Already billed", value: formatCurrencyDecimal(fin.alreadyBilled) },
              { label: "Billed incl. this", value: formatCurrencyDecimal(fin.billedTotal) },
              { label: "Contract value", value: formatCurrencyDecimal(fin.projectContractValue) },
              { label: "Remaining billable", value: formatCurrencyDecimal(fin.projectRemainingValue) },
            ]}
          />

          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Approval</Typography>
            {request.approvalInstanceId ? (
              // Existing component, mounted read-only: the decision is already made, so
              // no approval actions are offered here.
              <ApprovalStatusTracker instanceId={request.approvalInstanceId} showAuditLog />
            ) : (
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                No approval instance recorded.
              </Typography>
            )}
          </GlassCard>

          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.25 }}>Activity</Typography>
            {activitySteps.length === 0 ? (
              <BillingEmptyState title="No activity recorded" icon="time" />
            ) : (
              <BillingTimeline steps={activitySteps} dense />
            )}
          </GlassCard>
        </Stack>
      </Box>
    </Box>
  );
};

export default AccountsBillingReviewPage;
