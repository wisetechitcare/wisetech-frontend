import React from "react";
import { Stack, Tooltip, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton } from "@app/modules/common/components/ui";
import type { WorkspaceCapabilities, WorkspaceReadiness } from "@services/projectBilling";

/**
 * Section 11 — start any billing action from the project.
 *
 * A button is enabled only when BOTH are true:
 *   - `readiness`     — the WORK permits it (server-computed, mirroring the gate
 *                       the owning module enforces on write)
 *   - `capabilities`  — the CALLER may perform it (server-computed from their
 *                       permissions)
 *
 * Keeping those separate is deliberate: "you can't do this yet" and "you aren't
 * allowed to do this" are different problems and the tooltip says which. A single
 * merged boolean would tell a project manager their approved request isn't ready
 * when the truth is they lack the finance grant.
 *
 * None of these buttons WRITE. Each navigates into the Billing module carrying a
 * return context, so the work is done where its rules live and the user lands
 * back here afterwards.
 */

export interface QuickAction {
    key: string;
    label: string;
    icon: string;
    /** Business-rule gate. False → disabled with `notReadyReason`. */
    ready: boolean;
    /** Permission gate. False → disabled with a "not permitted" tooltip. */
    permitted: boolean;
    notReadyReason: string;
    onClick: () => void;
    primary?: boolean;
}

export interface QuickActionsProps {
    readiness: WorkspaceReadiness;
    capabilities: WorkspaceCapabilities;
    onRaiseRequest: () => void;
    onGenerateProforma: () => void;
    onRecordPayment: () => void;
    onGenerateInvoice: () => void;
    onOpenBilling: () => void;
    onOpenReports: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
    readiness, capabilities,
    onRaiseRequest, onGenerateProforma, onRecordPayment, onGenerateInvoice,
    onOpenBilling, onOpenReports,
}) => {
    const actions: QuickAction[] = [
        {
            key: "raise",
            label: "Raise Billing Request",
            icon: "plus",
            ready: true,
            permitted: capabilities.canRaiseRequest,
            notReadyReason: "",
            onClick: onRaiseRequest,
            primary: true,
        },
        {
            key: "proforma",
            label: "Generate Proforma",
            icon: "file-added",
            ready: readiness.canGenerateProforma,
            permitted: capabilities.canGenerate,
            notReadyReason: "No approved billing request is waiting for a proforma.",
            onClick: onGenerateProforma,
        },
        {
            key: "payment",
            label: "Record Payment",
            icon: "wallet",
            ready: readiness.canRecordPayment,
            permitted: capabilities.canRecordPayment,
            notReadyReason: "A proforma must be issued before a payment can be recorded.",
            onClick: onRecordPayment,
        },
        {
            key: "invoice",
            label: "Generate Invoice",
            icon: "receipt-square",
            ready: readiness.canGenerateInvoice,
            permitted: capabilities.canGenerate,
            notReadyReason: "A payment must be fully collected and verified first.",
            onClick: onGenerateInvoice,
        },
        {
            key: "billing",
            label: "Open Billing Module",
            icon: "exit-right-corner",
            ready: true,
            permitted: true,
            notReadyReason: "",
            onClick: onOpenBilling,
        },
        {
            key: "reports",
            label: "Financial Report",
            icon: "chart-simple",
            ready: readiness.hasBilling,
            permitted: true,
            notReadyReason: "Nothing has been billed on this project yet.",
            onClick: onOpenReports,
        },
    ];

    return (
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.25 }}>Quick Actions</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {actions.map((action) => {
                    const disabled = !action.ready || !action.permitted;
                    const reason = !action.permitted
                        ? "You do not have permission for this action."
                        : action.notReadyReason;

                    const button = (
                        <WtButton
                            key={action.key}
                            size="small"
                            ghost={!action.primary}
                            tone={action.primary ? "primary" : undefined}
                            disabled={disabled}
                            onClick={action.onClick}
                            startIcon={<KTIcon iconName={action.icon} className="fs-7" />}
                            sx={{ minHeight: 34, borderRadius: "10px", fontSize: 12.5 }}
                        >
                            {action.label}
                        </WtButton>
                    );

                    // A disabled MUI button swallows pointer events, so the tooltip
                    // needs a wrapper element to hang off — otherwise the one case
                    // where the explanation matters is the one case it never shows.
                    return disabled && reason ? (
                        <Tooltip key={action.key} title={reason}>
                            <span>{button}</span>
                        </Tooltip>
                    ) : (
                        button
                    );
                })}
            </Stack>
        </GlassCard>
    );
};

export default QuickActions;
