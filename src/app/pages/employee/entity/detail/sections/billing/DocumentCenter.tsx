import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtIconButton, ToneChip, type SemanticTone } from "@app/modules/common/components/ui";
import { BillingEmptyState, BillingStatusBadge } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import type { ProformaNode } from "@services/proformas";

/**
 * Section 9 — every file this project's billing has produced, in one place.
 *
 * The Proforma and Invoice sections above already expose their own documents;
 * this exists because "give me the PDF" is a different job from "show me the
 * billing position", and doing it by hunting through two tables is the kind of
 * friction that gets a module called unusable.
 *
 * Documents are shown, never generated. Every action routes to the Billing
 * module's own access endpoint, which serves the STORED file and audits the
 * intent — opening a document from here must never re-render it.
 */

export type DocumentIntent = "DOWNLOAD" | "PRINT" | "SHARE";

export interface DocumentCenterProps {
    proformas: ProformaNode[];
    invoices: ProformaNode[];
    onPreview: (id: string) => void;
    onAccess: (id: string, intent: DocumentIntent) => void;
    onDownloadWord: (id: string) => void;
}

const KIND_META: Record<string, { label: string; tone: SemanticTone; icon: string }> = {
    PROFORMA: { label: "Proforma", tone: "cyan", icon: "file-added" },
    TAX_INVOICE: { label: "Tax Invoice", tone: "indigo", icon: "receipt-square" },
};

const DocumentCenter: React.FC<DocumentCenterProps> = ({
    proformas, invoices, onPreview, onAccess, onDownloadWord,
}) => {
    // Newest first, both kinds interleaved — a chronological file list is how
    // people actually look for "the one from last week".
    const documents = [...proformas, ...invoices].sort((a, b) =>
        (b.issueDate ?? b.createdAt ?? "").localeCompare(a.issueDate ?? a.createdAt ?? ""),
    );

    if (documents.length === 0) {
        return (
            <BillingEmptyState
                icon="folder"
                title="No billing documents"
                description="Proformas and tax invoices generated for this project will be collected here."
            />
        );
    }

    return (
        <Stack spacing={0.75}>
            {documents.map((doc) => {
                const meta = KIND_META[doc.kind] ?? {
                    label: doc.kind, tone: "cyan" as const, icon: "document",
                };
                return (
                    <Stack
                        key={doc.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                            px: 1, py: 0.85, borderRadius: "10px",
                            border: "1px solid", borderColor: "divider",
                        }}
                    >
                        <Box sx={{ color: "text.secondary", flexShrink: 0, display: "grid", placeItems: "center" }}>
                            <KTIcon iconName={meta.icon} className="fs-5" />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                                    {doc.documentNumber}
                                </Typography>
                                <ToneChip label={meta.label} tone={meta.tone} />
                                {doc.currentStatus && <BillingStatusBadge status={doc.currentStatus} />}
                            </Stack>
                            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                {formatDate(doc.issueDate)}
                                {doc.versionCount > 1 ? ` · ${doc.versionCount} versions` : ""}
                            </Typography>
                        </Box>

                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                            {formatCurrencyDecimal(Number(doc.grandTotal) || 0)}
                        </Typography>

                        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                            <WtIconButton
                                title="Preview"
                                onClick={() => onPreview(doc.id)}
                                sx={{ width: 28, height: 28, borderRadius: "8px" }}
                            >
                                <KTIcon iconName="eye" className="fs-7" />
                            </WtIconButton>
                            <WtIconButton
                                title="Download PDF"
                                onClick={() => onAccess(doc.id, "DOWNLOAD")}
                                sx={{ width: 28, height: 28, borderRadius: "8px" }}
                            >
                                <KTIcon iconName="file-down" className="fs-7" />
                            </WtIconButton>
                            <WtIconButton
                                title="Download Word"
                                onClick={() => onDownloadWord(doc.id)}
                                sx={{ width: 28, height: 28, borderRadius: "8px" }}
                            >
                                <KTIcon iconName="document" className="fs-7" />
                            </WtIconButton>
                            <WtIconButton
                                title="Print"
                                onClick={() => onAccess(doc.id, "PRINT")}
                                sx={{ width: 28, height: 28, borderRadius: "8px" }}
                            >
                                <KTIcon iconName="printer" className="fs-7" />
                            </WtIconButton>
                        </Stack>
                    </Stack>
                );
            })}
        </Stack>
    );
};

export default DocumentCenter;
