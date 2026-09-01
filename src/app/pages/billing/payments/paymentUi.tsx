import type { ClientPaymentMethod, AttachmentKind } from "@services/payments";

/**
 * Shared display data for Payment Collection — labels the list, the record
 * dialog and the detail page all read from one place so they cannot drift.
 */

export const PAYMENT_METHOD_LABEL: Record<ClientPaymentMethod, string> = {
    CASH: "Cash",
    CHEQUE: "Cheque",
    NEFT: "NEFT",
    RTGS: "RTGS",
    IMPS: "IMPS",
    UPI: "UPI",
    BANK_TRANSFER: "Bank Transfer",
    ONLINE: "Online",
    OTHER: "Other",
};

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({
    value: value as ClientPaymentMethod,
    label,
}));

/**
 * Which instrument fields make sense for a method. Purely a UI hint — the server
 * never trusts this and stores whatever was sent, because a receipt can carry a
 * bank reference alongside a UTR regardless of the method picked.
 */
export const METHOD_FIELDS: Record<ClientPaymentMethod, ("bank" | "reference" | "transaction" | "utr" | "cheque")[]> = {
    CASH: [],
    CHEQUE: ["bank", "cheque"],
    NEFT: ["bank", "utr", "reference"],
    RTGS: ["bank", "utr", "reference"],
    IMPS: ["bank", "utr", "reference"],
    UPI: ["transaction", "reference"],
    BANK_TRANSFER: ["bank", "reference"],
    ONLINE: ["transaction", "reference"],
    OTHER: ["bank", "reference", "transaction", "utr", "cheque"],
};

export const ATTACHMENT_KIND_LABEL: Record<AttachmentKind, string> = {
    BANK_RECEIPT: "Bank Receipt",
    UTR_SCREENSHOT: "UTR Screenshot",
    CHEQUE_SCAN: "Cheque Scan",
    DEPOSIT_SLIP: "Deposit Slip",
    PAYMENT_ADVICE: "Payment Advice",
    SUPPORTING_DOCUMENT: "Supporting Document",
};

export const ATTACHMENT_KIND_OPTIONS = Object.entries(ATTACHMENT_KIND_LABEL).map(([value, label]) => ({
    value: value as AttachmentKind,
    label,
}));
