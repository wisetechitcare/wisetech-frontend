import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, WtIconButton, TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { listBillingRequests, type BillingRequest } from "@services/billingRequest";
import {
  BillingStatusBadge, BillingSummaryCard, BillingTimeline, BillingPageHeader,
  BillingEmptyState, BillingLoadingState, type BillingTimelineStep,
} from "@pages/billing/components";
import NewBillingRequestDialog from "@pages/employee/billing/NewBillingRequestDialog";
import BillingRequestDetailDialog from "@pages/employee/billing/BillingRequestDetailDialog";

/**
 * Project → Billing.
 *
 * A CONSUMER of the Billing module, not a copy of it. Billing is its own top-level ERP
 * module and owns every list, queue and document; this tab only shows what this project's
 * billing looks like — summary, timeline and linked documents — and links across.
 *
 * The single exception is "New Request": raising one needs a project, a stage and that
 * stage's completed deliverables, so it is started from here. Everything after that
 * (tracking, submitting, withdrawing, the accounts queue) lives in /billing.
 */
const BillingSection: React.FC<{ lead?: any }> = ({ lead }) => {
  const projectId = lead?.id as string | undefined;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const queryKey = ["billing-requests", projectId];
  const { data: requests = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listBillingRequests({ projectId }),
    enabled: !!projectId,
  });

  const summary = useMemo(() => {
    const sum = (rows: BillingRequest[]) => rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const inApproval = requests.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "SUBMITTED");
    const withAccounts = requests.filter((r) => r.status === "APPROVED" || r.status === "SENT_TO_ACCOUNTS");
    const proformad = requests.filter((r) => r.status === "PROFORMA_GENERATED");
    return {
      total: sum(requests),
      inApproval: sum(inApproval),
      withAccounts: sum(withAccounts),
      proformad: sum(proformad),
      count: requests.length,
    };
  }, [requests]);

  /** The project's billing life, newest first — read from Billing, stored nowhere here. */
  const timeline: BillingTimelineStep[] = useMemo(
    () =>
      [...requests]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .flatMap<BillingTimelineStep>((r) => {
          const steps: BillingTimelineStep[] = [
            {
              key: `${r.id}-raised`,
              label: `${r.requestNumber} raised · ${formatCurrencyDecimal(Number(r.totalAmount) || 0)}`,
              state: "done",
              at: r.requestedAt ?? r.createdAt,
              detail: r.requestedByName ?? undefined,
            },
          ];
          if (r.status === "REJECTED") {
            steps.push({ key: `${r.id}-rejected`, label: "Rejected", state: "failed", at: r.rejectedAt });
          } else if (r.approvedAt) {
            steps.push({ key: `${r.id}-approved`, label: "Approved", state: "done", at: r.approvedAt });
          } else if (r.status === "PENDING_APPROVAL") {
            steps.push({ key: `${r.id}-approval`, label: "Awaiting approval", state: "current" });
          }
          if (r.proformaGeneratedAt) {
            steps.push({ key: `${r.id}-proforma`, label: "Proforma generated", state: "done", at: r.proformaGeneratedAt });
          } else if (r.status === "APPROVED" || r.status === "SENT_TO_ACCOUNTS") {
            steps.push({ key: `${r.id}-queue`, label: "With Accounts, awaiting proforma", state: "current" });
          }
          return steps;
        }),
    [requests],
  );

  if (!projectId) {
    return (
      <GlassCard preset="section" sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No project loaded.</Typography>
      </GlassCard>
    );
  }

  return (
    <Stack spacing={1.5}>
      <BillingPageHeader
        icon="dollar"
        trio={TRIO.green}
        title="Billing"
        description="This project's billing, read from the Billing module."
        action={
          <Stack direction="row" spacing={1}>
            <WtButton
              ghost
              size="small"
              onClick={() => navigate("/billing/requests")}
              startIcon={<KTIcon iconName="exit-right-corner" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              Open Billing
            </WtButton>
            <WtButton
              tone="primary"
              size="small"
              onClick={() => setShowNew(true)}
              startIcon={<KTIcon iconName="plus" className="fs-6" />}
              sx={{ minHeight: 36, borderRadius: "10px", fontSize: 13 }}
            >
              New Request
            </WtButton>
          </Stack>
        }
      />

      {isLoading ? (
        <BillingLoadingState rows={3} />
      ) : requests.length === 0 ? (
        <BillingEmptyState
          title="Nothing billed on this project yet"
          description="Complete some billable deliverables in the Execution tab, then raise a billing request."
          icon="dollar"
          actionLabel="New Request"
          onAction={() => setShowNew(true)}
        />
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.25,
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          }}
        >
          <Stack spacing={1.25}>
            <BillingSummaryCard
              title="Billing Summary"
              rows={[
                { label: "Requests raised", value: summary.count },
                { label: "Total requested", value: formatCurrencyDecimal(summary.total) },
                { label: "In approval", value: formatCurrencyDecimal(summary.inApproval) },
                { label: "With Accounts", value: formatCurrencyDecimal(summary.withAccounts) },
                { label: "Proforma generated", value: formatCurrencyDecimal(summary.proformad) },
              ]}
            />

            <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Linked Billing Documents</Typography>
              <Stack spacing={0.75}>
                {requests.map((r) => (
                  <Stack
                    key={r.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      px: 1, py: 0.75, borderRadius: "10px",
                      border: "1px solid", borderColor: "divider",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.requestNumber}</Typography>
                        <BillingStatusBadge status={r.status} />
                      </Stack>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary", wordBreak: "break-word" }}>
                        {r.stageName} · {formatDate(r.requestedAt ?? r.createdAt)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {formatCurrencyDecimal(Number(r.totalAmount) || 0)}
                    </Typography>
                    <WtIconButton
                      title="View"
                      onClick={() => setDetailId(r.id)}
                      sx={{ width: 30, height: 30, borderRadius: "8px", flexShrink: 0 }}
                    >
                      <KTIcon iconName="eye" className="fs-6" />
                    </WtIconButton>
                  </Stack>
                ))}
              </Stack>
            </GlassCard>
          </Stack>

          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.25 }}>Billing Timeline</Typography>
            <BillingTimeline steps={timeline} />
          </GlassCard>
        </Box>
      )}

      <NewBillingRequestDialog
        open={showNew}
        projectId={projectId}
        onClose={() => setShowNew(false)}
        onCreated={() => qc.invalidateQueries({ queryKey })}
      />
      <BillingRequestDetailDialog requestId={detailId} onClose={() => setDetailId(null)} />
    </Stack>
  );
};

export default BillingSection;
