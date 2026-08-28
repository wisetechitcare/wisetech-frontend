import React, { useState } from "react";
import { Stack, Typography, Menu, MenuItem, Chip } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton, WtIconButton } from "@app/modules/common/components/ui";
import {
    BillingTable, BillingStatusBadge, BillingEmptyState,
    type BillingColumn,
} from "@pages/billing/components";
import ProformaTreeRow, { type VersionAction } from "@pages/billing/proformas/ProformaTreeRow";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import type { BillingRequest } from "@services/billingRequest";
import type { ProformaNode, ProformaVersion } from "@services/proformas";
import type { WorkspacePayment } from "@services/projectBilling";

/**
 * Sections 4–7 — the project's billing records, one table per kind.
 *
 * Every table is `BillingTable` (search, sort, paging, empty and loading states
 * already solved) with a column set. Proformas are the exception: they need
 * revisions grouped under their document, which `ProformaTreeRow` already does
 * for the Proforma Repository — so that component is reused verbatim rather than
 * a second grouping implementation being written here.
 *
 * No row is edited from this file. Actions either open a document (the Billing
 * module's own access endpoint) or navigate into Billing carrying a return
 * context, so the user lands back on this tab.
 */

const money = (value: unknown) => formatCurrencyDecimal(Number(value) || 0);

/** A section wrapper: title, count, and an "open the full module" escape hatch. */
export const WorkspaceSection: React.FC<{
    title: string;
    count: number;
    icon: string;
    onOpenAll?: () => void;
    openAllLabel?: string;
    children: React.ReactNode;
}> = ({ title, count, icon, onOpenAll, openAllLabel = "Open in Billing", children }) => (
    <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 1.5 }}
        >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                <KTIcon iconName={icon} className="fs-5" />
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{title}</Typography>
                <Chip label={count} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
            </Stack>
            {onOpenAll && (
                <WtButton
                    ghost
                    size="small"
                    onClick={onOpenAll}
                    startIcon={<KTIcon iconName="exit-right-corner" className="fs-7" />}
                    sx={{ minHeight: 30, borderRadius: "8px", fontSize: 12, flexShrink: 0 }}
                >
                    {openAllLabel}
                </WtButton>
            )}
        </Stack>
        {children}
    </GlassCard>
);

/** A trailing "…" menu. Kept local — the Billing module has no shared one. */
const RowMenu: React.FC<{ items: { label: string; icon: string; onClick: () => void; disabled?: boolean }[] }> = ({
    items,
}) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
        <>
            <WtIconButton
                title="Actions"
                onClick={(event) => {
                    event.stopPropagation();
                    setAnchor(event.currentTarget);
                }}
                sx={{ width: 28, height: 28, borderRadius: "8px" }}
            >
                <KTIcon iconName="dots-vertical" className="fs-7" />
            </WtIconButton>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                slotProps={{ paper: { sx: { width: 210 } } }}
            >
                {items.map((item) => (
                    <MenuItem
                        key={item.label}
                        dense
                        disabled={item.disabled}
                        sx={{ fontSize: 12.5 }}
                        onClick={(event) => {
                            event.stopPropagation();
                            setAnchor(null);
                            item.onClick();
                        }}
                    >
                        <KTIcon iconName={item.icon} className="fs-6 me-2" />
                        {item.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

// ─── Section 4: Billing Requests ─────────────────────────────────────────────

export const RequestsTable: React.FC<{
    rows: BillingRequest[];
    onOpen: (id: string) => void;
}> = ({ rows, onOpen }) => {
    const columns: BillingColumn<BillingRequest>[] = [
        {
            key: "requestNumber",
            header: "Request",
            width: 130,
            render: (r) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{r.requestNumber}</Typography>,
            searchValue: (r) => r.requestNumber,
            sortValue: (r) => r.requestNumber,
        },
        {
            key: "stage",
            header: "Stage / Deliverables",
            render: (r) => (
                <Stack sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5 }}>
                        {r.stageName ?? `${new Set(r.items.map((i) => i.stageName)).size} stages`}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        {r.items.length} deliverable{r.items.length === 1 ? "" : "s"}
                    </Typography>
                </Stack>
            ),
            searchValue: (r) => `${r.stageName ?? ""} ${r.items.map((i) => i.name).join(" ")}`,
        },
        {
            key: "amount",
            header: "Amount",
            width: 120,
            align: "right",
            render: (r) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{money(r.totalAmount)}</Typography>,
            sortValue: (r) => Number(r.totalAmount) || 0,
        },
        {
            key: "requestedBy",
            header: "Requested By",
            width: 150,
            render: (r) => (
                <Typography sx={{ fontSize: 12 }}>{r.requestedByName ?? "—"}</Typography>
            ),
            searchValue: (r) => r.requestedByName,
        },
        {
            key: "status",
            header: "Status",
            width: 150,
            render: (r) => <BillingStatusBadge status={r.status} />,
            sortValue: (r) => r.status,
        },
        {
            key: "createdAt",
            header: "Raised",
            width: 110,
            render: (r) => (
                <Typography sx={{ fontSize: 12 }}>{formatDate(r.requestedAt ?? r.createdAt)}</Typography>
            ),
            sortValue: (r) => r.requestedAt ?? r.createdAt,
        },
    ];

    return (
        <BillingTable
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(r) => onOpen(r.id)}
            searchPlaceholder="Search request, stage or deliverable…"
            emptyTitle="No billing requests"
            emptyDescription="Raise one against a completed, billable deliverable."
            minWidth={880}
            actions={(r) => (
                <RowMenu
                    items={[
                        { label: "View request", icon: "eye", onClick: () => onOpen(r.id) },
                        { label: "Open in Billing", icon: "exit-right-corner", onClick: () => onOpen(r.id) },
                    ]}
                />
            )}
        />
    );
};

// ─── Section 5: Proformas (revisions grouped) ────────────────────────────────

export const ProformaList: React.FC<{
    rows: ProformaNode[];
    onOpen: (id: string, versionId?: string) => void;
    onAction: (documentId: string, action: VersionAction, version: ProformaVersion) => void;
}> = ({ rows, onOpen, onAction }) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    if (rows.length === 0) {
        return (
            <BillingEmptyState
                icon="file-added"
                title="No proformas generated"
                description="A proforma is generated from the Accounts Queue once a billing request is approved."
            />
        );
    }

    return (
        <Stack spacing={1}>
            {rows.map((node) => (
                <ProformaTreeRow
                    key={node.id}
                    node={node}
                    expanded={expanded.has(node.id)}
                    onToggle={() =>
                        setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            return next;
                        })
                    }
                    onOpen={(versionId) => onOpen(node.id, versionId)}
                    onAction={(action, version) => onAction(node.id, action, version)}
                />
            ))}
        </Stack>
    );
};

// ─── Section 6: Payment Collection ───────────────────────────────────────────

export const PaymentsTable: React.FC<{
    rows: WorkspacePayment[];
    onOpen: (id: string) => void;
}> = ({ rows, onOpen }) => {
    const columns: BillingColumn<WorkspacePayment>[] = [
        {
            key: "operationNumber",
            header: "Collection",
            width: 130,
            render: (p) => (
                <Stack sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{p.operationNumber}</Typography>
                    {p.proformaNumber && (
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{p.proformaNumber}</Typography>
                    )}
                </Stack>
            ),
            searchValue: (p) => `${p.operationNumber} ${p.proformaNumber ?? ""}`,
            sortValue: (p) => p.operationNumber,
        },
        {
            key: "totalAmount",
            header: "Billed",
            width: 110,
            align: "right",
            render: (p) => <Typography sx={{ fontSize: 12.5 }}>{money(p.totalAmount)}</Typography>,
            sortValue: (p) => Number(p.totalAmount) || 0,
        },
        {
            key: "collected",
            header: "Collected",
            width: 110,
            align: "right",
            render: (p) => (
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "success.main" }}>
                    {money(p.collectedAmount)}
                </Typography>
            ),
            sortValue: (p) => Number(p.collectedAmount) || 0,
        },
        {
            key: "outstanding",
            header: "Outstanding",
            width: 115,
            align: "right",
            render: (p) => (
                <Typography
                    sx={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: Number(p.outstandingAmount) > 0 ? "warning.main" : "text.secondary",
                    }}
                >
                    {money(p.outstandingAmount)}
                </Typography>
            ),
            sortValue: (p) => Number(p.outstandingAmount) || 0,
        },
        {
            key: "paymentStatus",
            header: "Payment",
            width: 140,
            render: (p) => <BillingStatusBadge status={p.paymentStatus} />,
            sortValue: (p) => p.paymentStatus,
        },
        {
            key: "verification",
            header: "Verification",
            width: 130,
            render: (p) => <BillingStatusBadge status={p.verificationStatus} />,
            sortValue: (p) => p.verificationStatus,
        },
        {
            key: "lastPaymentAt",
            header: "Last Receipt",
            width: 115,
            render: (p) => <Typography sx={{ fontSize: 12 }}>{formatDate(p.lastPaymentAt)}</Typography>,
            sortValue: (p) => p.lastPaymentAt ?? "",
        },
    ];

    return (
        <BillingTable
            rows={rows}
            columns={columns}
            getRowId={(p) => p.id}
            onRowClick={(p) => onOpen(p.id)}
            searchPlaceholder="Search collection or proforma…"
            emptyTitle="No payments yet"
            emptyDescription="A collection appears once its proforma has been issued to the client."
            minWidth={980}
            actions={(p) => (
                <RowMenu
                    items={[
                        { label: "View payment", icon: "eye", onClick: () => onOpen(p.id) },
                        { label: "Open in Billing", icon: "exit-right-corner", onClick: () => onOpen(p.id) },
                    ]}
                />
            )}
        />
    );
};

// ─── Section 7: Tax Invoices ─────────────────────────────────────────────────

export const InvoicesTable: React.FC<{
    rows: ProformaNode[];
    onOpen: (id: string) => void;
    onDocumentAction: (id: string, intent: "DOWNLOAD" | "PRINT" | "SHARE") => void;
    onDownloadWord: (id: string) => void;
}> = ({ rows, onOpen, onDocumentAction, onDownloadWord }) => {
    const columns: BillingColumn<ProformaNode>[] = [
        {
            key: "documentNumber",
            header: "Invoice",
            width: 140,
            render: (d) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{d.documentNumber}</Typography>,
            searchValue: (d) => d.documentNumber,
            sortValue: (d) => d.documentNumber,
        },
        {
            key: "issueDate",
            header: "Invoice Date",
            width: 115,
            render: (d) => <Typography sx={{ fontSize: 12 }}>{formatDate(d.issueDate)}</Typography>,
            sortValue: (d) => d.issueDate,
        },
        {
            key: "subtotal",
            header: "Taxable",
            width: 110,
            align: "right",
            render: (d) => <Typography sx={{ fontSize: 12.5 }}>{money(d.subtotal)}</Typography>,
            sortValue: (d) => Number(d.subtotal) || 0,
        },
        {
            key: "taxTotal",
            header: "GST",
            width: 100,
            align: "right",
            render: (d) => <Typography sx={{ fontSize: 12.5 }}>{money(d.taxTotal)}</Typography>,
            sortValue: (d) => Number(d.taxTotal) || 0,
        },
        {
            key: "grandTotal",
            header: "Total",
            width: 120,
            align: "right",
            render: (d) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{money(d.grandTotal)}</Typography>,
            sortValue: (d) => Number(d.grandTotal) || 0,
        },
        {
            key: "status",
            header: "Status",
            width: 140,
            render: (d) => <BillingStatusBadge status={d.currentStatus ?? d.status} />,
            sortValue: (d) => d.currentStatus ?? d.status,
        },
    ];

    return (
        <BillingTable
            rows={rows}
            columns={columns}
            getRowId={(d) => d.id}
            onRowClick={(d) => onOpen(d.id)}
            searchPlaceholder="Search invoice number…"
            emptyTitle="No tax invoices"
            emptyDescription="An invoice is generated once its payment is fully collected and verified."
            minWidth={900}
            actions={(d) => (
                <RowMenu
                    items={[
                        { label: "Preview", icon: "eye", onClick: () => onOpen(d.id) },
                        { label: "Download PDF", icon: "file-down", onClick: () => onDocumentAction(d.id, "DOWNLOAD") },
                        { label: "Download Word", icon: "file-down", onClick: () => onDownloadWord(d.id) },
                        { label: "Print", icon: "printer", onClick: () => onDocumentAction(d.id, "PRINT") },
                        { label: "Copy share link", icon: "link", onClick: () => onDocumentAction(d.id, "SHARE") },
                        { label: "Open Repository", icon: "exit-right-corner", onClick: () => onOpen(d.id) },
                    ]}
                />
            )}
        />
    );
};
