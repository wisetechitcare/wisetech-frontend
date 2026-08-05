import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { ToneChip, type SemanticTone } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import type { BillingRequest, BillingRequestStatus, BillingRequestItem } from "@services/billingRequest";

/**
 * Shared billing presentation atoms — used by both the project's Billing tab and the
 * Accounts queue so a request looks identical wherever it is shown.
 */

export const STATUS_META: Record<BillingRequestStatus, { label: string; tone: SemanticTone }> = {
    DRAFT: { label: "Draft", tone: "neutral" },
    SUBMITTED: { label: "Submitted", tone: "indigo" },
    PENDING_APPROVAL: { label: "Pending Approval", tone: "warning" },
    APPROVED: { label: "Approved", tone: "success" },
    REJECTED: { label: "Rejected", tone: "danger" },
    CANCELLED: { label: "Cancelled", tone: "neutral" },
    READY_FOR_PROFORMA: { label: "Ready For Proforma", tone: "cyan" },
    // Deprecated alias for READY_FOR_PROFORMA — same tone so old rows read identically.
    SENT_TO_ACCOUNTS: { label: "With Accounts", tone: "cyan" },
    PROFORMA_GENERATED: { label: "Proforma Generated", tone: "success" },
};

export const BillingStatusChip: React.FC<{ status: BillingRequestStatus }> = ({ status }) => {
    const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
    return <ToneChip tone={meta.tone} label={meta.label} dense />;
};

/** Project label, falling back through the identifiers a lead may or may not carry. */
export const projectLabel = (request: BillingRequest): string =>
    request.lead?.title ||
    request.lead?.originalProjectPrefix ||
    request.lead?.prefix ||
    "Project";

export const clientLabel = (request: BillingRequest): string =>
    request.lead?.company?.companyName || "—";

/**
 * The snapshot table.
 *
 * Renders `item.*` exclusively — never the live deliverable — because the whole point of
 * the snapshot is that a later rename or re-slice cannot restate what was approved.
 */
export const BillingItemsTable: React.FC<{ items: BillingRequestItem[] }> = ({ items }) => (
    <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 460 }}>
            <Stack
                direction="row"
                sx={{
                    px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider",
                    fontSize: 11.5, fontWeight: 700, color: "text.secondary", textTransform: "uppercase",
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>Deliverable</Box>
                <Box sx={{ width: 70, textAlign: "right" }}>%</Box>
                <Box sx={{ width: 120, textAlign: "right" }}>Amount</Box>
            </Stack>

            {items.map((item) => (
                <Stack
                    key={item.id}
                    direction="row"
                    alignItems="center"
                    sx={{ px: 1, py: 0.85, borderBottom: "1px solid", borderColor: "divider" }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>
                            {item.name}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" spacing={0.75} sx={{ mt: 0.2 }}>
                            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{item.stageName}</Typography>
                            {item.category && (
                                <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>· {item.category}</Typography>
                            )}
                        </Stack>
                    </Box>
                    <Box sx={{ width: 70, textAlign: "right", fontSize: 12.5 }}>
                        {Number(item.percentage) || 0}%
                    </Box>
                    <Box sx={{ width: 120, textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>
                        {formatCurrencyDecimal(Number(item.calculatedAmount) || 0)}
                    </Box>
                </Stack>
            ))}
        </Box>
    </Box>
);

export const BillingTotals: React.FC<{ request: BillingRequest }> = ({ request }) => (
    <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1, py: 1, borderRadius: "10px", bgcolor: "action.hover", mt: 1 }}
    >
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
            Total ({Number(request.totalPercentage) || 0}% of stage)
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
            {formatCurrencyDecimal(Number(request.totalAmount) || 0)}
        </Typography>
    </Stack>
);
