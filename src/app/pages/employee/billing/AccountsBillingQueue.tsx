import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassCard, WtButton, WtIconButton, ListHeader, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  getAccountsBillingQueue, generateProforma, type BillingRequest,
} from "@services/billingRequest";
import BillingRequestDetailDialog from "./BillingRequestDetailDialog";
import { BillingStatusChip, projectLabel, clientLabel } from "./billingUi";

/**
 * Accounts → Billing Queue.
 *
 * Approved billing requests that have no proforma yet — the server filters this, so a
 * draft or an in-approval request can never appear here regardless of what the client
 * asks for.
 *
 * Generating a proforma takes the request out of the queue. Proforma generation itself is
 * a later module; this records the hand-off behind the endpoint that module will fill in.
 */
const AccountsBillingQueue: React.FC = () => {
  const qc = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const queryKey = ["accounts", "billing-queue"];
  const { data: requests = [], isLoading } = useQuery({ queryKey, queryFn: getAccountsBillingQueue });

  const proforma = async (request: BillingRequest) => {
    const confirmed = await confirmDialog({
      icon: "question",
      title: `Generate proforma for ${request.requestNumber}?`,
      text: `${formatCurrencyDecimal(Number(request.totalAmount) || 0)} — this removes it from the queue.`,
    });
    if (!confirmed) return;

    setBusyId(request.id);
    try {
      await generateProforma(request.id);
      toast({ icon: "success", title: "Marked as proforma generated" });
    } catch (err: unknown) {
      toast({
        icon: "error",
        title:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not generate the proforma",
      });
    } finally {
      setBusyId(null);
      void qc.invalidateQueries({ queryKey });
    }
  };

  const queueTotal = requests.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", p: { xs: 1.5, sm: 2 } }}>
      <ListHeader
        title="Billing Queue"
        subtitle={
          isLoading
            ? "Loading…"
            : `${requests.length} approved request${requests.length === 1 ? "" : "s"} awaiting proforma · ${formatCurrencyDecimal(queueTotal)}`
        }
      />

      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
      ) : requests.length === 0 ? (
        <GlassCard preset="section" sx={{ p: 4, textAlign: "center", mt: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Nothing awaiting a proforma</Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
            Billing requests appear here automatically once they clear approval.
          </Typography>
        </GlassCard>
      ) : (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {requests.map((request) => (
            <GlassCard key={request.id} preset="section" sx={{ p: { xs: 1.25, sm: 1.75 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1.25}
              >
                <Box
                  sx={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => setDetailId(request.id)}
                >
                  <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{request.requestNumber}</Typography>
                    <BillingStatusChip status={request.status} />
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25, wordBreak: "break-word" }}>
                    {projectLabel(request)} · {clientLabel(request)}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.25 }}>
                    {request.stageName} · {request.items.length} deliverable
                    {request.items.length === 1 ? "" : "s"} · requested by {request.requestedByName ?? "—"}
                    {request.approvedAt ? ` · approved ${formatDate(request.approvedAt)}` : ""}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ flexShrink: 0, alignSelf: { xs: "stretch", md: "center" } }}
                >
                  <Typography sx={{ fontSize: 16, fontWeight: 700, mr: 0.5 }}>
                    {formatCurrencyDecimal(Number(request.totalAmount) || 0)}
                  </Typography>
                  <WtIconButton
                    title="View"
                    onClick={() => setDetailId(request.id)}
                    sx={{ width: 34, height: 34, borderRadius: "9px" }}
                  >
                    <KTIcon iconName="eye" className="fs-5" />
                  </WtIconButton>
                  <WtButton
                    tone="primary"
                    size="small"
                    disabled={busyId === request.id}
                    onClick={() => void proforma(request)}
                    startIcon={<KTIcon iconName="document" className="fs-6" />}
                    sx={{ minHeight: 34, borderRadius: "9px", fontSize: 12.5, whiteSpace: "nowrap" }}
                  >
                    {busyId === request.id ? "Working…" : "Generate Proforma"}
                  </WtButton>
                </Stack>
              </Stack>
            </GlassCard>
          ))}
        </Stack>
      )}

      <BillingRequestDetailDialog requestId={detailId} onClose={() => setDetailId(null)} />
    </Box>
  );
};

export default AccountsBillingQueue;
