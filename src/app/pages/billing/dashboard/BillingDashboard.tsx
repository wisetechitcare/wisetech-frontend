import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { GlassCard, TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { listBillingRequests, type BillingRequest } from "@services/billingRequest";
import {
  BillingStatsCard, BillingStatusBadge, BillingPageHeader, BillingEmptyState, BillingLoadingState,
} from "../components";
import { BILLING_BASE } from "../constants/billingNav";

/**
 * Billing dashboard.
 *
 * The tiles that CAN be real are real — they are derived from the billing-request data
 * that already exists, so the dashboard is honest from day one. Tiles belonging to
 * modules that do not exist yet (proformas, payments, invoices, revenue) render a "—"
 * with a "not yet" hint rather than a fabricated number: a made-up figure on a finance
 * dashboard is worse than an empty one.
 */

const DASH = "—";

const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["billing-requests", "all"],
    queryFn: () => listBillingRequests(),
  });

  const stats = useMemo(() => {
    const by = (fn: (r: BillingRequest) => boolean) => requests.filter(fn);
    const sum = (rows: BillingRequest[]) => rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

    const drafts = by((r) => r.status === "DRAFT");
    const pendingApproval = by((r) => r.status === "PENDING_APPROVAL" || r.status === "SUBMITTED");
    const readyForProforma = by((r) => r.status === "APPROVED" || r.status === "SENT_TO_ACCOUNTS");
    const proformad = by((r) => r.status === "PROFORMA_GENERATED");

    return {
      drafts: drafts.length,
      pendingApproval: pendingApproval.length,
      pendingApprovalValue: sum(pendingApproval),
      readyForProforma: readyForProforma.length,
      readyForProformaValue: sum(readyForProforma),
      proformad: proformad.length,
      requestedValue: sum(requests),
    };
  }, [requests]);

  const recent = useMemo(
    () => [...requests].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 6),
    [requests],
  );

  const go = (path: string) => () => navigate(`${BILLING_BASE}/${path}`);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="chart-simple"
        title="Billing Dashboard"
        description="Where money is in the pipeline, from request to invoice."
        trio={TRIO.purple}
      />

      {/* AutoGrid-style responsive tiles: fill wide screens, collapse to one column. */}
      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          mb: 2,
        }}
      >
        <BillingStatsCard
          label="Draft Requests" icon="file" trio={TRIO.blue}
          value={stats.drafts} loading={isLoading}
          hint="Not yet submitted" onClick={go("requests")}
        />
        <BillingStatsCard
          label="Pending Approval" icon="time" trio={TRIO.amber}
          value={stats.pendingApproval} loading={isLoading}
          hint={formatCurrencyDecimal(stats.pendingApprovalValue)} onClick={go("requests")}
        />
        <BillingStatsCard
          label="Ready For Proforma" icon="delivery" trio={TRIO.green}
          value={stats.readyForProforma} loading={isLoading}
          hint={formatCurrencyDecimal(stats.readyForProformaValue)} onClick={go("accounts")}
        />
        <BillingStatsCard
          label="Total Requested" icon="dollar" trio={TRIO.purple}
          value={formatCurrencyDecimal(stats.requestedValue)} loading={isLoading}
          hint="Across all billing requests"
        />
        {/* Below: owned by modules that do not exist yet. Shown so the shape of the
            finished dashboard is visible, but never with invented figures. */}
        <BillingStatsCard label="Pending Payments" icon="wallet" trio={TRIO.amber} value={DASH} hint="Payments module pending" />
        <BillingStatsCard label="Collected" icon="check-circle" trio={TRIO.green} value={DASH} hint="Payments module pending" />
        <BillingStatsCard label="Outstanding" icon="information-5" trio={TRIO.rose} value={DASH} hint="Invoices module pending" />
        <BillingStatsCard label="Invoices Generated" icon="receipt-square" trio={TRIO.blue} value={stats.proformad || DASH} hint="Proformas raised so far" />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" },
        }}
      >
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1.25 }}>Recent Billing Activity</Typography>
          {isLoading ? (
            <BillingLoadingState rows={4} />
          ) : recent.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              No billing requests yet.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {recent.map((r) => (
                <Stack
                  key={r.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={go("requests")}
                  sx={{
                    px: 1, py: 0.85, borderRadius: "10px", cursor: "pointer",
                    border: "1px solid", borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.requestNumber}</Typography>
                      <BillingStatusBadge status={r.status} />
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary", wordBreak: "break-word" }}>
                      {r.lead?.title || r.lead?.prefix || "—"} · {r.stageName}
                    </Typography>
                  </Box>
                  <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {formatCurrencyDecimal(Number(r.totalAmount) || 0)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                      {formatDate(r.requestedAt ?? r.createdAt)}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </GlassCard>

        <Stack spacing={1.25}>
          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1 }}>Recent Payments</Typography>
            <BillingEmptyState
              title="Payments not implemented yet"
              description="This panel activates with the Payments module."
              icon="wallet"
            />
          </GlassCard>
          <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1 }}>Recent Invoices</Typography>
            <BillingEmptyState
              title="Tax invoices not implemented yet"
              description="This panel activates with the Invoices module."
              icon="receipt-square"
            />
          </GlassCard>
        </Stack>
      </Box>
    </Box>
  );
};

export default BillingDashboard;
