import React from "react";
import { Box, Chip, Divider, Stack, Tooltip, Typography } from "@mui/material";
import { WtButton } from "@app/modules/common/components/ui";
import { BillingStatusBadge } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { sectionLabel } from "@pages/billing/configure/TaxRateSections";
import type { ProjectBillingRow } from "@services/bills";

/**
 * One bill, expanded: its two documents, its TDS position, and its money.
 *
 * WHY A PANEL and not more columns — the row answers "where is this deliverable",
 * which is a scan. This answers "what exactly is going on with it", which is a
 * read: a proforma's revision count, whether the client has actually deposited
 * the TDS it withheld, what the certificate reference was. Putting that in
 * columns made every row three lines tall and the Actions cell so narrow that
 * "Cancel" wrapped to two lines.
 *
 * The TDS card is absent, not empty, when no TDS applies — a card reading "—"
 * invites the question it was meant to answer.
 */

/**
 * A flex COLUMN, so each card's action can be pushed to its own bottom edge with
 * `mt: auto`. The cards carry different numbers of rows — a proforma has issue,
 * due, revisions and its invoice number; a tax invoice has two — so without this
 * the buttons land at whatever height their own content happens to end at, and
 * the row reads as ragged.
 */
const CARD_SX = {
    flex: "1 1 260px",
    minWidth: 240,
    display: "flex",
    flexDirection: "column",
    borderRadius: "10px",
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
    p: 1.5,
};

/** Every card action sits on the card's bottom edge, so they line up. */
const CARD_ACTION_SX = { mt: "auto", pt: 1.25, minHeight: 30, fontSize: 12 };

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography
        sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "text.secondary",
            mb: 1,
        }}
    >
        {children}
    </Typography>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.3, gap: 2 }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>{value}</Typography>
    </Stack>
);

/** A step that has not happened yet, said plainly rather than left blank. */
const NotYet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>{children}</Typography>
);

const BillDetailPanel: React.FC<{
    row: ProjectBillingRow;
    canRecordPayment: boolean;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    busy?: boolean;
}> = ({ row, canRecordPayment, onOpenDocument, onToggleTds, busy }) => {
    const bill = row.bill;

    if (!bill) {
        return (
            <Box sx={{ px: 2, py: 1.5 }}>
                <NotYet>
                    {row.blockMessage ?? "No bill has been raised against this deliverable yet."}
                </NotYet>
            </Box>
        );
    }

    const tdsSection = sectionLabel(bill.tdsSectionCode);

    return (
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.75, bgcolor: "action.hover" }}>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} alignItems="stretch">
                {/* ── proforma ──────────────────────────────────────────────── */}
                <Box sx={CARD_SX}>
                    <Heading>Proforma</Heading>
                    {bill.proformaNumber ? (
                        <>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                                    {bill.proformaNumber}
                                </Typography>
                                <BillingStatusBadge status={bill.proformaStatus} />
                            </Stack>
                            <Row label="Issued" value={bill.proformaDate ? formatDate(bill.proformaDate) : "Not yet"} />
                            <Row label="Due" value={bill.dueDate ? formatDate(bill.dueDate) : "—"} />
                            {bill.proformaVersions > 1 && (
                                <Row
                                    label="Revisions"
                                    value={`v${bill.proformaVersions} — revised ${bill.proformaVersions - 1}×`}
                                />
                            )}
                            {bill.invoiceNumber && (
                                <Row label="Invoiced as" value={bill.invoiceNumber} />
                            )}
                            <WtButton
                                size="small" ghost fullWidth
                                onClick={() => onOpenDocument(bill.proformaDocumentId!, bill.proformaStatus)}
                                sx={CARD_ACTION_SX}
                            >
                                {bill.proformaStatus === "DRAFT" ? "Edit & finalise" : "Open proforma"}
                            </WtButton>
                        </>
                    ) : (
                        <NotYet>Not raised yet. Raising it is what asks the client for the money.</NotYet>
                    )}
                </Box>

                {/* ── tax invoice ───────────────────────────────────────────── */}
                <Box sx={CARD_SX}>
                    <Heading>Tax Invoice</Heading>
                    {bill.invoiceNumber ? (
                        <>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                                    {bill.invoiceNumber}
                                </Typography>
                                <BillingStatusBadge status={bill.invoiceStatus} />
                            </Stack>
                            <Row label="Issued" value={bill.invoiceDate ? formatDate(bill.invoiceDate) : "Not yet"} />
                            {/* The two are separate legal instruments with separate
                                number series, so they are cross-referenced rather
                                than merged — an audit asks what was requested AND
                                what was declared, and needs both to answer. */}
                            {bill.proformaNumber && (
                                <Row label="Raised against" value={bill.proformaNumber} />
                            )}
                            <WtButton
                                size="small" ghost fullWidth
                                onClick={() => onOpenDocument(bill.invoiceDocumentId!, bill.invoiceStatus)}
                                sx={CARD_ACTION_SX}
                            >
                                {bill.invoiceStatus === "DRAFT" ? "Edit & finalise" : "Open tax invoice"}
                            </WtButton>
                        </>
                    ) : (
                        <NotYet>
                            Raised once the proforma is fully paid — it books the output GST, so it
                            follows the money rather than leading it.
                        </NotYet>
                    )}
                </Box>

                {/* ── TDS, only when the client actually withholds some ──────── */}
                {bill.tdsAmount > 0 && (
                    <Box sx={{ ...CARD_SX, borderColor: bill.tdsDeposited ? "success.light" : "warning.light" }}>
                        <Heading>TDS withheld by the client</Heading>
                        <Row
                            label="Category"
                            value={bill.tdsSectionName ?? "—"}
                        />
                        <Row
                            label="Rate"
                            value={`${tdsSection ? `${tdsSection} · ` : ""}${bill.tdsRate}%`}
                        />
                        <Row label="Amount" value={formatCurrencyDecimal(bill.tdsAmount)} />
                        {bill.tdsDeposited && bill.tdsDepositedAt && (
                            <Row label="Deposited" value={formatDate(bill.tdsDepositedAt)} />
                        )}
                        {bill.tdsReference && <Row label="Reference" value={bill.tdsReference} />}

                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Chip
                                size="small"
                                label={bill.tdsDeposited ? "Deposited" : "Not yet deposited"}
                                sx={{
                                    height: 24, fontSize: 11, fontWeight: 600, borderRadius: "6px",
                                    bgcolor: bill.tdsDeposited ? "success.light" : "warning.light",
                                    color: bill.tdsDeposited ? "success.dark" : "warning.dark",
                                }}
                            />
                            <Tooltip
                                title={
                                    bill.tdsDeposited
                                        ? "Clear this if the client's deposit turns out not to have gone through."
                                        : "Withholding and depositing are two separate acts — only the deposit gets you the credit."
                                }
                            >
                                <span>
                                    <WtButton
                                        size="small" ghost
                                        disabled={!canRecordPayment || busy}
                                        onClick={() => onToggleTds(bill.id, !bill.tdsDeposited)}
                                        sx={{ minHeight: 28, fontSize: 12, whiteSpace: "nowrap" }}
                                    >
                                        {bill.tdsDeposited ? "Mark not deposited" : "Mark deposited"}
                                    </WtButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Box>
                )}

                {/* ── the money, end to end ─────────────────────────────────── */}
                <Box sx={CARD_SX}>
                    <Heading>{bill.billNumber}</Heading>
                    <Row label="Deliverable value" value={formatCurrencyDecimal(bill.amount)} />
                    <Row
                        label={`GST ${bill.gstRate}%`}
                        value={formatCurrencyDecimal(bill.gstAmount)}
                    />
                    <Row label="Bill total" value={formatCurrencyDecimal(bill.totalAmount)} />
                    {bill.tdsAmount > 0 && (
                        <Row label={`Less TDS ${bill.tdsRate}%`} value={`− ${formatCurrencyDecimal(bill.tdsAmount)}`} />
                    )}
                    <Divider sx={{ my: 0.75 }} />
                    <Row label="Client pays" value={formatCurrencyDecimal(bill.expectedAmount)} />
                    <Row label={`Received (${bill.paymentCount})`} value={formatCurrencyDecimal(bill.receivedAmount)} />
                    <Row
                        label="Still due"
                        value={
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: bill.outstandingAmount > 0 ? "error.main" : "success.main",
                                }}
                            >
                                {formatCurrencyDecimal(bill.outstandingAmount)}
                            </Typography>
                        }
                    />
                </Box>
            </Stack>
        </Box>
    );
};

export default BillDetailPanel;
