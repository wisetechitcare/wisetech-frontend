import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassDialog, GlassHeader, WtButton, WtDateField, toast,
} from "@app/modules/common/components/ui";
import dayjs from "dayjs";
import { formatCurrencyDecimal } from "@utils/currency";
import { DATE_FORMATS } from "@utils/dateFormats";
import { recordPayment, uploadAttachments, type ClientPaymentMethod } from "@services/payments";
import { METHOD_FIELDS, PAYMENT_METHOD_OPTIONS } from "./paymentUi";

/**
 * Record one receipt.
 *
 * Every payment is its own transaction — this dialog records ONE and closes.
 * There is no "add another line" grid, because the module never assumes a
 * single payment: recording payment 2 of 3 is opening this dialog again against
 * the same collection, which now has a smaller outstanding amount.
 */

export interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  operationId: string;
  operationNumber: string;
  outstandingAmount: number;
}

const emptyForm = {
  amount: "", paymentDate: "", method: "" as ClientPaymentMethod | "",
  bankName: "", referenceNumber: "", transactionNumber: "", utrNumber: "",
  chequeNumber: "", chequeDate: "", remarks: "",
};

const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  open, onClose, operationId, operationNumber, outstandingAmount,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [confirmOverpay, setConfirmOverpay] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const amount = Number(form.amount) || 0;
  // Compared in paise to avoid a float showing "exceeds" on an exact match.
  const exceeds = Math.round(amount * 100) > Math.round(outstandingAmount * 100);
  const fields = form.method ? METHOD_FIELDS[form.method] : [];

  const record = useMutation({
    mutationFn: async () => {
      const result = await recordPayment(operationId, {
        amount,
        paymentDate: form.paymentDate,
        method: form.method as ClientPaymentMethod,
        bankName: form.bankName || undefined,
        referenceNumber: form.referenceNumber || undefined,
        transactionNumber: form.transactionNumber || undefined,
        utrNumber: form.utrNumber || undefined,
        chequeNumber: form.chequeNumber || undefined,
        chequeDate: form.chequeDate || undefined,
        remarks: form.remarks || undefined,
        allowOverpayment: exceeds ? confirmOverpay : undefined,
      });
      if (files.length) {
        await uploadAttachments(operationId, files, { transactionId: result.transaction.id });
      }
      return result;
    },
    onSuccess: () => {
      toast({ icon: "success", title: "Payment recorded" });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment", operationId] });
      setForm(emptyForm);
      setFiles([]);
      setConfirmOverpay(false);
      onClose();
    },
    onError: (error: any) =>
      toast({ icon: "error", title: error?.response?.data?.message ?? "Could not record the payment" }),
  });

  const canSubmit =
    amount > 0 && !!form.paymentDate && !!form.method && (!exceeds || confirmOverpay);

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      header={
        <GlassHeader
          title="Record Payment"
          subtitle={`${operationNumber} · Outstanding ${formatCurrencyDecimal(outstandingAmount)}`}
          icon={<KTIcon iconName="dollar" className="fs-1" />}
          onClose={onClose}
        />
      }
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small" fullWidth required sx={{ flex: 1 }}
            type="number" label="Payment Amount" value={form.amount}
            onChange={(event) => set("amount")(event.target.value)}
            InputLabelProps={{ shrink: true }}
            error={amount > 0 && exceeds && !confirmOverpay}
            helperText={exceeds ? "Exceeds outstanding — mark as overpayment to proceed" : undefined}
          />
          <WtDateField
            label="Payment Date" required
            value={form.paymentDate}
            onChange={set("paymentDate")}
            maxDate={dayjs().format(DATE_FORMATS.WIRE)}
            sx={{ flex: 1 }}
          />
        </Stack>

        <TextField
          select size="small" fullWidth required label="Payment Mode"
          value={form.method}
          onChange={(event) => set("method")(event.target.value)}
          InputLabelProps={{ shrink: true }}
        >
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>{option.label}</MenuItem>
          ))}
        </TextField>

        {exceeds && (
          <Box
            sx={{
              p: 1.25, borderRadius: "10px", fontSize: 12,
              bgcolor: "warning.main", color: "warning.contrastText", opacity: 0.9,
            }}
          >
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox" checked={confirmOverpay}
                onChange={(event) => setConfirmOverpay(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              This amount exceeds the outstanding balance. Record it as an overpayment.
            </label>
          </Box>
        )}

        {/* Instrument fields — shown per method, but the server accepts and stores
            whatever is sent regardless of which ones a UI hint hid. */}
        {fields.includes("bank") && (
          <TextField
            size="small" fullWidth label="Bank Name" value={form.bankName}
            onChange={(event) => set("bankName")(event.target.value)} InputLabelProps={{ shrink: true }}
          />
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {fields.includes("reference") && (
            <TextField
              size="small" fullWidth sx={{ flex: 1 }} label="Reference Number" value={form.referenceNumber}
              onChange={(event) => set("referenceNumber")(event.target.value)} InputLabelProps={{ shrink: true }}
            />
          )}
          {fields.includes("transaction") && (
            <TextField
              size="small" fullWidth sx={{ flex: 1 }} label="Transaction Number" value={form.transactionNumber}
              onChange={(event) => set("transactionNumber")(event.target.value)} InputLabelProps={{ shrink: true }}
            />
          )}
        </Stack>
        {fields.includes("utr") && (
          <TextField
            size="small" fullWidth label="UTR Number" value={form.utrNumber}
            onChange={(event) => set("utrNumber")(event.target.value)} InputLabelProps={{ shrink: true }}
          />
        )}
        {fields.includes("cheque") && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small" fullWidth sx={{ flex: 1 }} label="Cheque Number" value={form.chequeNumber}
              onChange={(event) => set("chequeNumber")(event.target.value)} InputLabelProps={{ shrink: true }}
            />
            <WtDateField
              label="Cheque Date" value={form.chequeDate} onChange={set("chequeDate")}
              sx={{ flex: 1 }}
            />
          </Stack>
        )}

        <TextField
          size="small" fullWidth multiline minRows={2} label="Remarks"
          value={form.remarks} onChange={(event) => set("remarks")(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Supporting Documents</Typography>
          <WtButton
            component="label" ghost size="small"
            startIcon={<KTIcon iconName="paper-clip" className="fs-6" />}
            sx={{ minHeight: 34, fontSize: 12.5 }}
          >
            Attach files
            <input
              type="file" multiple hidden
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </WtButton>
          {files.length > 0 && (
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.5 }}>
              {files.map((f) => f.name).join(", ")}
            </Typography>
          )}
        </Box>

        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <WtButton ghost size="small" onClick={onClose} sx={{ minHeight: 36, fontSize: 13 }}>
            Cancel
          </WtButton>
          <WtButton
            tone="primary" size="small"
            disabled={!canSubmit || record.isPending}
            onClick={() => record.mutate()}
            sx={{ minHeight: 36, fontSize: 13 }}
          >
            {record.isPending ? "Recording…" : "Record Payment"}
          </WtButton>
        </Stack>
      </Stack>
    </GlassDialog>
  );
};

export default RecordPaymentDialog;
