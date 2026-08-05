import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, WtIconButton, toast, confirmDialog } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { apiErrorMessage } from "@utils/apiError";
import {
  getAccountsBillingQueue, generateProforma, type BillingRequest,
} from "@services/billingRequest";
import {
  BillingTable, BillingStatusBadge, BillingPageHeader, type BillingColumn,
} from "../components";
import BillingRequestDetailDialog from "../../employee/billing/BillingRequestDetailDialog";

/**
 * Accounts → Billing Queue.
 *
 * Approved billing requests with no proforma yet. The FILTER IS SERVER-SIDE, so a draft
 * or an in-approval request can never appear here regardless of what the client asks for.
 *
 * "Generate Proforma" currently records the hand-off and takes the request out of the
 * queue — the Proforma module will plug in behind the same endpoint without this page
 * changing.
 */
const AccountsQueuePage: React.FC = () => {
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
      confirmText: "Generate",
    });
    if (!confirmed) return;

    setBusyId(request.id);
    try {
      await generateProforma(request.id);
      toast({ icon: "success", title: "Marked as proforma generated" });
    } catch (err: unknown) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not generate the proforma") });
    } finally {
      setBusyId(null);
      void qc.invalidateQueries({ queryKey });
    }
  };

  const projectName = (r: BillingRequest) =>
    r.lead?.title || r.lead?.originalProjectPrefix || r.lead?.prefix || "—";
  const clientName = (r: BillingRequest) => r.lead?.company?.companyName || "—";

  const columns: BillingColumn<BillingRequest>[] = [
    {
      key: "number",
      header: "Billing Request",
      width: 150,
      searchValue: (r) => r.requestNumber,
      render: (r) => <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.requestNumber}</Typography>,
    },
    {
      key: "project",
      header: "Project",
      searchValue: (r) => projectName(r),
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{projectName(r)}</Typography>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{r.stageName}</Typography>
        </Box>
      ),
    },
    {
      key: "client",
      header: "Client",
      width: 180,
      searchValue: (r) => clientName(r),
      render: (r) => <Typography sx={{ fontSize: 12.5 }}>{clientName(r)}</Typography>,
    },
    {
      key: "approved",
      header: "Approved",
      width: 120,
      render: (r) => <Typography sx={{ fontSize: 12 }}>{formatDate(r.approvedAt)}</Typography>,
    },
    {
      key: "amount",
      header: "Amount",
      width: 140,
      align: "right",
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
          {formatCurrencyDecimal(Number(r.totalAmount) || 0)}
        </Typography>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 150,
      render: (r) => <BillingStatusBadge status={r.status} />,
    },
  ];

  const actions = (r: BillingRequest) => (
    <>
      <WtIconButton title="View" onClick={() => setDetailId(r.id)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
        <KTIcon iconName="eye" className="fs-6" />
      </WtIconButton>
      <WtButton
        tone="primary"
        size="small"
        disabled={busyId === r.id}
        onClick={() => void proforma(r)}
        sx={{ minHeight: 30, borderRadius: "8px", fontSize: 11.5, px: 1, whiteSpace: "nowrap" }}
      >
        {busyId === r.id ? "…" : "Proforma"}
      </WtButton>
    </>
  );

  const queueTotal = requests.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
      <BillingPageHeader
        icon="delivery"
        title="Accounts Queue"
        description={
          isLoading
            ? "Loading…"
            : `${requests.length} approved request${requests.length === 1 ? "" : "s"} awaiting proforma · ${formatCurrencyDecimal(queueTotal)}`
        }
        action={
          <Stack alignItems="flex-end">
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>Total in queue</Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{formatCurrencyDecimal(queueTotal)}</Typography>
          </Stack>
        }
      />

      <BillingTable
        rows={requests}
        columns={columns}
        getRowId={(r) => r.id}
        loading={isLoading}
        actions={actions}
        onRowClick={(r) => setDetailId(r.id)}
        searchPlaceholder="Search by request no, project or client…"
        emptyTitle="Nothing awaiting a proforma"
        emptyDescription="Billing requests appear here automatically once they clear approval."
      />

      <BillingRequestDetailDialog requestId={detailId} onClose={() => setDetailId(null)} />
    </Box>
  );
};

export default AccountsQueuePage;
