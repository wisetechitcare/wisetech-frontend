import React from "react";
import { Box } from "@mui/material";
import { TRIO } from "@app/modules/common/components/ui";
import { BillingStatsCard } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import type { ProjectFinancials } from "@services/projectBilling";

/**
 * Section 1 — the project's financial position at a glance.
 *
 * Every tile is a DRILL-DOWN: clicking opens the Billing module already filtered
 * to this project and the slice the tile counts. That is the whole point of the
 * card — a number you cannot get behind is a number nobody trusts.
 *
 * No arithmetic happens here. Each value arrives computed by the module that owns
 * it (see `projectWorkspaceService`); this file only formats and labels.
 */

export interface FinancialOverviewProps {
    financial: ProjectFinancials;
    loading?: boolean;
    /** Opens a Billing module list, pre-filtered to this project. */
    onDrillDown: (target: "requests" | "proformas" | "payments" | "invoices", filter?: string) => void;
}

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ financial, loading, onDrillDown }) => {
    const money = (value: number) => formatCurrencyDecimal(value);

    /**
     * Contract value can legitimately be zero (commercials not captured yet), and
     * a percentage of nothing is not 0% — it is unknown. Saying "—" is honest;
     * saying "0%" reads as "nothing has been billed", which is a different claim.
     */
    const billedPercent =
        financial.contractValue > 0
            ? `${Math.round((financial.requestedTotal / financial.contractValue) * 100)}% of contract`
            : "Contract value not set";

    const tiles = [
        {
            label: "Contract Value",
            value: money(financial.contractValue),
            icon: "briefcase",
            trio: TRIO.blue,
            hint: `${financial.requestCount} billing request${financial.requestCount === 1 ? "" : "s"}`,
            onClick: () => onDrillDown("requests"),
        },
        {
            label: "Approved Billing",
            value: money(financial.approvedBilling),
            icon: "check-circle",
            trio: TRIO.green,
            hint: billedPercent,
            onClick: () => onDrillDown("requests", "APPROVED"),
        },
        {
            label: "Proforma Generated",
            value: money(financial.proformaValue),
            icon: "document",
            trio: TRIO.cyan,
            hint: "Issued to client",
            onClick: () => onDrillDown("proformas"),
        },
        {
            label: "Collected",
            value: money(financial.collected),
            icon: "wallet",
            trio: TRIO.green,
            hint: `${financial.collectionPercentage}% of billed`,
            onClick: () => onDrillDown("payments"),
        },
        {
            label: "Outstanding",
            value: money(financial.outstanding),
            icon: "time",
            trio: financial.outstanding > 0 ? TRIO.amber : TRIO.green,
            hint: financial.outstanding > 0 ? "Awaiting collection" : "Nothing outstanding",
            onClick: () => onDrillDown("payments", "outstanding"),
        },
        {
            label: "Invoice Value",
            value: money(financial.invoiceValue),
            icon: "receipt-square",
            trio: TRIO.purple,
            hint: `GST ${money(financial.gstAmount)}`,
            onClick: () => onDrillDown("invoices"),
        },
        {
            label: "Remaining Billing",
            value: money(financial.remainingContractValue),
            icon: "chart-simple",
            trio: TRIO.blue,
            hint: "Contract not yet raised",
            onClick: () => onDrillDown("requests"),
        },
        {
            label: "Collection %",
            value: `${financial.collectionPercentage}%`,
            icon: "percentage",
            trio: financial.collectionPercentage >= 100 ? TRIO.green : TRIO.amber,
            hint: `${money(financial.collected)} of ${money(financial.operationTotal)}`,
            onClick: () => onDrillDown("payments"),
        },
    ];

    return (
        <Box
            sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
            }}
        >
            {tiles.map((tile) => (
                <BillingStatsCard
                    key={tile.label}
                    label={tile.label}
                    value={tile.value}
                    icon={tile.icon}
                    trio={tile.trio}
                    hint={tile.hint}
                    loading={loading}
                    onClick={tile.onClick}
                />
            ))}
        </Box>
    );
};

export default FinancialOverview;
