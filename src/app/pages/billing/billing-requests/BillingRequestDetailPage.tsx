import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, ToneChip, TRIO } from "@app/modules/common/components/ui";
import ApprovalStatusTracker from "@pages/approvals/ApprovalStatusTracker";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import {
  getBillingRequest, getBillingRequestHistory, type BillingRequest,
} from "@services/billingRequest";
import {
  BillingStatusBadge, BillingPageHeader, BillingSummaryCard, BillingTimeline,
  BillingLoadingState, BillingEmptyState, type BillingTimelineStep,
} from "../components";

/**
 * Billing Request detail.
 *
 * A page, not a dialog: it is deep-linkable from the project's Billing tab, the approval
 * inbox and the accounts queue, and it holds more than a modal comfortably shows.
 *
 * Three separate sources, none duplicating another:
 *   - the request + its frozen items, from Billing;
 *   - the approval chain, from the EXISTING `ApprovalStatusTracker`;
 *   - the activity trail, from the request's own append-only log.
 */

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 12, color: "text.secondary", minWidth: 116, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>{value}</Typography>
  </Stack>
);

const projectName = (r: BillingRequest) =>
  r.lead?.title || r.lead?.originalProjectPrefix || r.lead?.prefix || "—";

const BillingRequestDetailPage: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: request, isLoading } = useQuery({
    queryKey: ["billing-request", id],
    queryFn: () => getBillingRequest(id),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["billing-request", id, "history"],
    queryFn: () => getBillingRequestHistory(id),
    enabled: !!id,
  });

  if (isLoading || !request) {
    return (
      <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
        <BillingLoadingState rows={4} />
      </Box>
    );
  }

  // Stages present in the snapshot — a request may span more than one.
  const stageNames = [...new Set(request.items.map((i) => i.stageName).filter(Boolean))];

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
        icon="file-added"
        trio={TRIO.green}
        title={request.requestNumber}
        description={`${projectName(request)} · ${request.items.length} deliverable${request.items.length === 1 ? "" : "s"}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <BillingStatusBadge status={request.status} dense={false} />
            <WtButton
              ghost
              size="small"
              onClick={() => navigate("/billing/requests")}
              startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Back
            </WtButton>
          </Stack>
        }
      />

      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", lg: "1.5fr 1fr" } }}>
        <Stack spacing={1.25}>
          {/* Project + client + who raised it */}
          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Project Summary</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0.75 }}>
              <Row label="Project" value={projectName(request)} />
              <Row label="Client" value={request.lead?.company?.companyName || "—"} />
              <Row
                label={stageNames.length > 1 ? "Stages" : "Stage"}
                value={stageNames.length ? stageNames.join(", ") : request.stageName || "—"}
              />
              <Row label="Requested by" value={request.requestedByName ?? "—"} />
              <Row label="Requested" value={request.requestedAt ? formatDate(request.requestedAt) : "—"} />
              <Row label="Approved" value={request.approvedAt ? formatDate(request.approvedAt) : "—"} />
            </Box>
            {request.remarks && (
              <Box sx={{ mt: 1.25, p: 1.25, borderRadius: "10px", bgcolor: "action.hover" }}>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 700 }}>Remarks</Typography>
                <Typography sx={{ fontSize: 12.5, mt: 0.25, whiteSpace: "pre-wrap" }}>{request.remarks}</Typography>
              </Box>
            )}
          </GlassCard>

          {/* The frozen snapshot — rendered from item.*, never the live deliverable. */}
          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Deliverables</Typography>
              <ToneChip tone="neutral" label="Snapshot at request time" dense />
            </Stack>
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 520 }}>
                <Stack
                  direction="row"
                  sx={{
                    px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider",
                    fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>Deliverable</Box>
                  <Box sx={{ width: 130 }}>Stage</Box>
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
                    <Box sx={{ width: 130, fontSize: 11.5, color: "text.secondary", pr: 1 }}>{item.stageName}</Box>
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
          </GlassCard>

          {/* Downstream documents — placeholders until those modules exist. */}
          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Linked Documents</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              <ToneChip
                tone={request.proformaGeneratedAt ? "success" : "neutral"}
                label={request.proformaGeneratedAt ? `Proforma ${formatDate(request.proformaGeneratedAt)}` : "Proforma — pending"}
                dense
              />
              <ToneChip tone="neutral" label="Payment — not implemented" dense />
              <ToneChip tone="neutral" label="Tax invoice — not implemented" dense />
            </Stack>
          </GlassCard>
        </Stack>

        <Stack spacing={1.25}>
          <BillingSummaryCard
            title="Financial Summary"
            rows={[
              { label: "Deliverables", value: request.items.length },
              { label: "Total percentage", value: `${Number(request.totalPercentage) || 0}%` },
              ...(request.stageName
                ? [{ label: "Stage amount", value: formatCurrencyDecimal(Number(request.stageAmount) || 0) }]
                : []),
              { label: "Total amount", value: formatCurrencyDecimal(Number(request.totalAmount) || 0) },
            ]}
          />

          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Approval</Typography>
            {request.approvalInstanceId ? (
              <ApprovalStatusTracker instanceId={request.approvalInstanceId} showAuditLog />
            ) : (
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                Not submitted for approval yet.
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

          <Typography sx={{ fontSize: 11, color: "text.disabled", px: 0.5 }}>
            Created {formatDateTime(request.createdAt)}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default BillingRequestDetailPage;
