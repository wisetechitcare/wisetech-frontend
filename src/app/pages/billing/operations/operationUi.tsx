import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { ToneChip, TRIO, type Trio } from "@app/modules/common/components/ui";
import type { DueInfo, BillingOperationStage } from "@services/billingOperations";

/**
 * Shared presentation for Billing Operations.
 *
 * Kept out of the two pages so the list and the detail header cannot disagree
 * about what "overdue" looks like — the single most important signal on either
 * screen.
 */

/** Stage → accent, so the list reads as three coloured bands rather than 15 chips. */
export const STAGE_TRIO: Record<BillingOperationStage, Trio> = {
    PROFORMA: TRIO.blue,
    PAYMENT: TRIO.amber,
    INVOICE: TRIO.cyan,
    CLOSED: TRIO.green,
};

export const STAGE_LABEL: Record<BillingOperationStage, string> = {
    PROFORMA: "Proforma",
    PAYMENT: "Payment",
    INVOICE: "Invoice",
    CLOSED: "Closed",
};

/**
 * The due position, as one chip.
 *
 * SETTLED and NONE render as muted text rather than a chip: a paid operation
 * should not compete for attention with an overdue one, and a chip for "no due
 * date" is noise on every row that has not been sent yet.
 */
export const DueChip: React.FC<{ due: DueInfo; dueDate?: string | null }> = ({ due }) => {
    if (due.state === "SETTLED") {
        return <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>Settled</Typography>;
    }
    if (due.state === "NONE") {
        return <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>—</Typography>;
    }
    if (due.state === "OVERDUE") {
        return (
            <ToneChip
                tone="danger"
                label={`${due.daysOverdue}d overdue`}
                dense
            />
        );
    }
    if (due.state === "DUE_TODAY") return <ToneChip tone="warning" label="Due today" dense />;
    return <ToneChip tone="neutral" label={`${due.daysRemaining}d left`} dense />;
};

/** A labelled figure. Used across the financial summary and the detail header. */
export const Figure: React.FC<{
    label: string;
    value: React.ReactNode;
    hint?: string;
    strong?: boolean;
    tone?: "default" | "danger" | "success";
}> = ({ label, value, hint, strong, tone = "default" }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ gap: 2, minWidth: 0 }}>
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{label}</Typography>
            {hint && <Typography sx={{ fontSize: 10.5, color: "text.disabled" }}>{hint}</Typography>}
        </Box>
        <Typography
            sx={{
                fontSize: strong ? 14.5 : 13,
                fontWeight: strong ? 700 : 600,
                flexShrink: 0,
                color:
                    tone === "danger" ? "error.main" : tone === "success" ? "success.main" : "text.primary",
            }}
        >
            {value}
        </Typography>
    </Stack>
);

/** Section title with an icon, matching the rest of the Billing module. */
export const PanelTitle: React.FC<{ icon: string; title: string; action?: React.ReactNode }> = ({
    icon, title, action,
}) => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <KTIcon iconName={icon} className="fs-5" />
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, flex: 1, minWidth: 0 }}>{title}</Typography>
        {action}
    </Stack>
);
