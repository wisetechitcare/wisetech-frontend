import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, CircularProgress, DialogActions, DialogContent, Divider, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton } from "@app/modules/common/components/ui";
import { formatDateTime } from "@utils/dateFormats";
import { getBillingRequest } from "@services/billingRequest";
import { BillingStatusChip, BillingItemsTable, BillingTotals, projectLabel, clientLabel } from "./billingUi";

/**
 * Billing request detail — WHAT is being billed: project, client, stage, the frozen
 * snapshot items and the totals.
 *
 * Deliberately does NOT show the approval chain. "What am I billing" and "where has this
 * got to" are separate questions with separate dialogs — see
 * `BillingApprovalStatusDialog`, which mounts the existing `ApprovalStatusTracker`.
 */
const BillingRequestDetailDialog: React.FC<{
  requestId: string | null;
  onClose: () => void;
}> = ({ requestId, onClose }) => {
  const { data: request, isLoading } = useQuery({
    queryKey: ["billing-request", requestId],
    queryFn: () => getBillingRequest(requestId as string),
    enabled: !!requestId,
  });

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, color: "text.secondary", minWidth: 96 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, wordBreak: "break-word" }}>{value}</Typography>
    </Stack>
  );

  return (
    <GlassDialog
      open={!!requestId}
      onClose={onClose}
      maxWidth="md"
      header={
        <GlassHeader
          title={request ? request.requestNumber : "Billing Request"}
          icon={<KTIcon iconName="dollar" className="fs-2" />}
          onClose={onClose}
        />
      }
    >
      <DialogContent>
        {isLoading || !request ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={26} /></Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <BillingStatusChip status={request.status} />
              {request.proformaGeneratedAt && (
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  Proforma {formatDateTime(request.proformaGeneratedAt)}
                </Typography>
              )}
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              <Row label="Project" value={projectLabel(request)} />
              <Row label="Client" value={clientLabel(request)} />
              <Row label="Stage" value={request.stageName} />
              <Row label="Requested by" value={request.requestedByName ?? "—"} />
              <Row label="Requested" value={request.requestedAt ? formatDateTime(request.requestedAt) : "—"} />
              <Row label="Approved" value={request.approvedAt ? formatDateTime(request.approvedAt) : "—"} />
            </Box>

            {request.remarks && (
              <Box sx={{ p: 1.25, borderRadius: "10px", bgcolor: "action.hover" }}>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 700 }}>Remarks</Typography>
                <Typography sx={{ fontSize: 12.5, mt: 0.25, whiteSpace: "pre-wrap" }}>{request.remarks}</Typography>
              </Box>
            )}

            <Divider />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Deliverables</Typography>
            <BillingItemsTable items={request.items} />
            <BillingTotals request={request} />

          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={onClose}>Close</WtButton>
      </DialogActions>
    </GlassDialog>
  );
};

export default BillingRequestDetailDialog;
