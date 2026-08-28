import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, ToneChip, toast } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { verifyPayment, type PaymentTransaction } from "@services/payments";
import { PAYMENT_METHOD_LABEL } from "./paymentUi";

/**
 * Verify, reject or cancel ONE receipt.
 *
 * Per-transaction because that is where the evidence lives — a UTR either
 * appears on the bank statement or it does not. The collection's own
 * verification status is derived server-side from every receipt underneath it,
 * so this dialog never has to decide the collection's status itself.
 */

export interface VerifyPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  operationId: string;
  transaction: PaymentTransaction | null;
}

const VerifyPaymentDialog: React.FC<VerifyPaymentDialogProps> = ({
  open, onClose, operationId, transaction,
}) => {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const decide = useMutation({
    mutationFn: (decision: "VERIFIED" | "REJECTED" | "CANCELLED") =>
      verifyPayment(operationId, transaction!.id, decision, note.trim() || undefined),
    onSuccess: (_result, decision) => {
      toast({ icon: "success", title: `Payment ${decision.toLowerCase()}` });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment", operationId] });
      setNote("");
      onClose();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not update the verification" }),
  });

  if (!transaction) return null;
  const reasonRequired = note.trim().length === 0;

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      header={
        <GlassHeader
          title={`Verify ${transaction.paymentNumber}`}
          subtitle={`${PAYMENT_METHOD_LABEL[transaction.method]} · ${formatDate(transaction.paymentDate)}`}
          icon={<KTIcon iconName="shield-tick" className="fs-1" />}
          onClose={onClose}
        />
      }
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Amount</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
              {formatCurrencyDecimal(Number(transaction.amount))}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Current status</Typography>
            <ToneChip tone="neutral" label={transaction.status} dense />
          </Box>
          {transaction.utrNumber && (
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary" }}>UTR</Typography>
              <Typography sx={{ fontSize: 12.5 }}>{transaction.utrNumber}</Typography>
            </Box>
          )}
          {transaction.referenceNumber && (
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Reference</Typography>
              <Typography sx={{ fontSize: 12.5 }}>{transaction.referenceNumber}</Typography>
            </Box>
          )}
          {transaction.chequeNumber && (
            <Box>
              <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Cheque No.</Typography>
              <Typography sx={{ fontSize: 12.5 }}>{transaction.chequeNumber}</Typography>
            </Box>
          )}
          <Box>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Received By</Typography>
            <Typography sx={{ fontSize: 12.5 }}>{transaction.receivedByName ?? "—"}</Typography>
          </Box>
        </Box>

        <TextField
          size="small" fullWidth multiline minRows={2}
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="Required when rejecting or cancelling. Optional when verifying."
        />

        <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap" useFlexGap>
          <WtButton
            ghost size="small" disabled={reasonRequired || decide.isPending}
            onClick={() => decide.mutate("CANCELLED")}
            sx={{ minHeight: 36, fontSize: 13 }}
          >
            Cancel Entry
          </WtButton>
          <WtButton
            ghost size="small" disabled={reasonRequired || decide.isPending}
            onClick={() => decide.mutate("REJECTED")}
            sx={{ minHeight: 36, fontSize: 13, color: "error.main" }}
          >
            Reject
          </WtButton>
          <WtButton
            tone="primary" size="small" disabled={decide.isPending}
            onClick={() => decide.mutate("VERIFIED")}
            sx={{ minHeight: 36, fontSize: 13 }}
          >
            {decide.isPending ? "Saving…" : "Verify"}
          </WtButton>
        </Stack>
      </Stack>
    </GlassDialog>
  );
};

export default VerifyPaymentDialog;
