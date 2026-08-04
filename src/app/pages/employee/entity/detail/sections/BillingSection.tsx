import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassCard, WtButton, WtIconButton, IconBox, TRIO, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  listBillingRequests, submitBillingRequest, deleteBillingRequest,
  type BillingRequest,
} from "@services/billingRequest";
import NewBillingRequestDialog from "@pages/employee/billing/NewBillingRequestDialog";
import BillingRequestDetailDialog from "@pages/employee/billing/BillingRequestDetailDialog";
import { BillingStatusChip } from "@pages/employee/billing/billingUi";

/**
 * Project → Billing.
 *
 * A team lead's billing requests for this project. They can raise a request against
 * completed, billable deliverables and submit it for approval — and nothing more. There is
 * no proforma or invoice action here by design: after approval the request moves itself to
 * the Accounts queue, which is where those actions live.
 *
 * Approve / reject / send back are NOT here either — they belong to the existing Approval
 * Inbox, which handles every workflow type generically.
 */
const BillingSection: React.FC<{ lead?: any }> = ({ lead }) => {
  const projectId = lead?.id as string | undefined;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const queryKey = ["billing-requests", projectId];
  const { data: requests = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listBillingRequests({ projectId }),
    enabled: !!projectId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey });

  const submit = async (request: BillingRequest) => {
    try {
      await submitBillingRequest(request.id);
      toast({ icon: "success", title: "Submitted for approval" });
    } catch (err: unknown) {
      // The most common failure is "no approval chain configured", which is actionable —
      // surface the server's sentence rather than a generic one.
      toast({
        icon: "error",
        title:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not submit the billing request",
      });
    }
    refresh();
  };

  const remove = async (request: BillingRequest) => {
    const confirmed = await confirmDialog({
      icon: "warning",
      title: `Delete ${request.requestNumber}?`,
      text: "Its deliverables become available to bill again.",
    });
    if (!confirmed) return;
    try {
      await deleteBillingRequest(request.id);
      toast({ icon: "success", title: "Billing request deleted" });
    } catch (err: unknown) {
      toast({
        icon: "error",
        title:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not delete the billing request",
      });
    }
    refresh();
  };

  if (!projectId) {
    return (
      <GlassCard preset="section" sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No project loaded.</Typography>
      </GlassCard>
    );
  }

  const totalRequested = requests.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.25}
        sx={{ px: 0.5 }}
      >
        <IconBox icon="dollar" trio={TRIO.green} size={38} fs="fs-3" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 16 }, lineHeight: 1.3 }}>
            Billing Requests
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
            Request billing for completed deliverables. Approved requests move to Accounts automatically.
          </Typography>
        </Box>
        <WtButton
          tone="primary"
          size="small"
          onClick={() => setShowNew(true)}
          startIcon={<KTIcon iconName="plus" className="fs-6" />}
          sx={{ flexShrink: 0, minHeight: 36, borderRadius: "10px", fontSize: 13 }}
        >
          New Request
        </WtButton>
      </Stack>

      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={26} /></Stack>
      ) : requests.length === 0 ? (
        <GlassCard preset="section" sx={{ p: 3, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>No billing requests yet</Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
            Complete some billable deliverables in the Execution tab, then raise a request here.
          </Typography>
        </GlassCard>
      ) : (
        <>
          <Stack spacing={1}>
            {requests.map((request) => {
              const editable = request.status === "DRAFT" || request.status === "REJECTED";
              return (
                <GlassCard key={request.id} preset="section" sx={{ p: { xs: 1.25, sm: 1.75 } }}>
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    <Box
                      sx={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => setDetailId(request.id)}
                    >
                      <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{request.requestNumber}</Typography>
                        <BillingStatusChip status={request.status} />
                      </Stack>
                      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
                        {request.stageName} · {request.items.length} deliverable
                        {request.items.length === 1 ? "" : "s"} · {Number(request.totalPercentage) || 0}%
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.25 }}>
                        {request.requestedByName ?? "—"}
                        {request.requestedAt ? ` · ${formatDate(request.requestedAt)}` : ""}
                      </Typography>
                    </Box>

                    <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                        {formatCurrencyDecimal(Number(request.totalAmount) || 0)}
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <WtIconButton
                          title="View"
                          onClick={() => setDetailId(request.id)}
                          sx={{ width: 32, height: 32, borderRadius: "9px" }}
                        >
                          <KTIcon iconName="eye" className="fs-6" />
                        </WtIconButton>
                        {editable && (
                          <>
                            <WtIconButton
                              title="Submit for approval"
                              onClick={() => void submit(request)}
                              sx={{ width: 32, height: 32, borderRadius: "9px" }}
                            >
                              <KTIcon iconName="send" className="fs-6" />
                            </WtIconButton>
                            <WtIconButton
                              title="Delete"
                              color="#C0392B"
                              onClick={() => void remove(request)}
                              sx={{ width: 32, height: 32, borderRadius: "9px" }}
                            >
                              <KTIcon iconName="trash" className="fs-6" />
                            </WtIconButton>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                </GlassCard>
              );
            })}
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ px: 1.5, py: 1, borderRadius: "10px", bgcolor: "action.hover" }}
          >
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
              {requests.length} request{requests.length === 1 ? "" : "s"}
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {formatCurrencyDecimal(totalRequested)}
            </Typography>
          </Stack>
        </>
      )}

      <NewBillingRequestDialog
        open={showNew}
        projectId={projectId}
        onClose={() => setShowNew(false)}
        onCreated={refresh}
      />
      <BillingRequestDetailDialog requestId={detailId} onClose={() => setDetailId(null)} />
    </Stack>
  );
};

export default BillingSection;
